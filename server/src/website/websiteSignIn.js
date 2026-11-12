// ============================================================
// File:        websiteSignIn.js
// Path:        server/src/website/websiteSignIn.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: GET <base>/auth/website — the ONE place the website's identity headers are read.
//              The website's proxy sets them on this route only; everywhere else they are ignored,
//              because nothing else reads them. Mounted only when RA_MODE=website (app.js).
//
// ── WHO IS BELIEVED ────────────────────────────────────────────────────────────────────────────
// Only a request whose TCP peer is in RA_WEBSITE_TRUSTED_PROXIES AND that carries the proxy secret
// (websiteConfig.js). Anything else is 403 with no detail — a caller that is not the proxy learns
// nothing about which proof it failed.
//
// ── THE MAPPING, RECOMPUTED ON EVERY SIGN-IN (the brief's rule) ────────────────────────────────
//   website role admin            → race admin
//   X-Acting-User-Can-Host: true  → race operator (a director)
//   any other member              → a player identity only: NO user record
//   X-Acting-Guest: true          → no identity at all
// Nothing maps above admin. Directors and admins get an ordinary user record keyed website:<id>
// (usersStore.js `upsertWebsiteUser`), so every guard treats them like a local director. A locked
// or deleted member is refused. A role different from last time bumps the identity's epoch, which
// ends that member's older sessions everywhere (identityStore.js).
//
// ── HEADERS NOT USED (decided, on the sheet) ───────────────────────────────────────────────────
// X-Acting-User-Email-Verified and X-Acting-User-Steps are accepted and NOT used: the mapping above
// needs neither, and storing what nothing reads would be personal data kept for no purpose.
// ============================================================

import { SESSION_FIELDS } from './websiteSession.js';

/** The headers, lower-cased as Node presents them. */
export const HEADERS = Object.freeze({
  secret: 'x-ra-proxy-secret',
  guest: 'x-acting-guest',
  id: 'x-acting-user-id',
  name: 'x-acting-user',
  roles: 'x-acting-user-roles',
  canHost: 'x-acting-user-can-host',
});

const WEBSITE_ROLE_NAMES = new Set(['member', 'organiser', 'admin']);
const ID_PATTERN = /^[A-Za-z0-9_.:@-]{1,128}$/;
const DISPLAY_NAME_MAX = 60;

/**
 * A header's text as the proxy meant it. Node reads header bytes as latin1; a UTF-8 display name
 * ("Zoë") therefore arrives as mojibake, and is decoded back when the bytes are valid UTF-8.
 */
function headerText(value) {
  if (typeof value !== 'string') return '';
  const utf8 = Buffer.from(value, 'latin1').toString('utf8');
  return utf8.includes('�') ? value : utf8;
}

const isTrue = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase() === 'true';

/**
 * Read the identity headers. Returns { guest: true }, a member, or null when they are malformed.
 * @param {Record<string, string|undefined>} headers
 */
export function readIdentityHeaders(headers) {
  if (isTrue(headers[HEADERS.guest])) return { guest: true };
  const websiteUserId = String(headers[HEADERS.id] ?? '').trim();
  if (!ID_PATTERN.test(websiteUserId)) return null;
  const displayName = headerText(headers[HEADERS.name]).trim().slice(0, DISPLAY_NAME_MAX);
  if (!displayName) return null;
  const roles = String(headers[HEADERS.roles] ?? '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter((r) => WEBSITE_ROLE_NAMES.has(r));
  return {
    guest: false,
    websiteUserId,
    displayName,
    roles,
    canHost: isTrue(headers[HEADERS.canHost]),
  };
}

/**
 * The race role for a member — never above admin.
 * @returns {'admin'|'operator'|'player'}
 */
export function mapWebsiteRole({ roles, canHost }) {
  if (roles.includes('admin')) return 'admin';
  if (canHost) return 'operator';
  return 'player';
}

/**
 * Where to send the browser afterwards: `returnTo` if it is a path under the base path on THIS
 * origin, otherwise the base path itself. Anything with a scheme, a host, a backslash or that leaves
 * the base path is refused — an open redirect through a sign-in is the classic phishing aid.
 */
export function safeReturnTo(raw, basePath) {
  const home = `${basePath}/`;
  if (
    typeof raw !== 'string' ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\')
  ) {
    return home;
  }
  let url;
  try {
    url = new URL(raw, 'http://race.invalid');
  } catch {
    return home;
  }
  if (url.origin !== 'http://race.invalid') return home;
  const path = url.pathname;
  if (basePath && path !== basePath && !path.startsWith(home)) return home;
  return `${path}${url.search}${url.hash}`;
}

/**
 * The route handler.
 * @param {{ config: object, identities: object, users: object, basePath: string }} deps
 */
export function createWebsiteSignIn({ config, identities, users, basePath }) {
  return function websiteSignIn(req, res, next) {
    // ★ THE TWO PROOFS, BOTH, BEFORE A SINGLE IDENTITY HEADER IS LOOKED AT.
    if (
      !config.isTrustedPeer(req.socket?.remoteAddress) ||
      !config.secretMatches(req.headers[HEADERS.secret])
    ) {
      return res.status(403).type('text/plain').send('Forbidden');
    }
    const who = readIdentityHeaders(req.headers);
    if (!who) return res.status(400).type('text/plain').send('Bad request');
    const target = safeReturnTo(req.query.returnTo, basePath);

    const finish = (fill) =>
      req.session.regenerate((err) => {
        if (err) return next(err);
        fill(req.session);
        req.session.save((err2) => (err2 ? next(err2) : res.redirect(303, target)));
      });

    // A guest has no identity: whatever this browser was signed in as ends here.
    if (who.guest) return finish(() => {});

    const known = identities.get(who.websiteUserId);
    if (known && (known.locked || known.deleted)) {
      return res
        .status(403)
        .type('text/plain')
        .send('This Seasonal Entertainment account cannot sign in to the race.');
    }

    const role = mapWebsiteRole(who);
    const identity = identities.recordSignIn({
      websiteUserId: who.websiteUserId,
      displayName: who.displayName,
      role,
    });
    const member = { websiteUserId: identity.websiteUserId, displayName: identity.displayName };

    if (role === 'player') {
      return finish((s) => {
        s[SESSION_FIELDS.member] = member;
        s[SESSION_FIELDS.epoch] = identity.epoch;
      });
    }
    return users
      .upsertWebsiteUser({ ...member, role, team: config.team })
      .then((record) =>
        finish((s) => {
          s.userId = record.id;
          s.sessionEpoch = record.sessionEpoch ?? 0;
          s[SESSION_FIELDS.member] = member;
          s[SESSION_FIELDS.epoch] = identity.epoch;
        })
      )
      .catch(next);
  };
}
