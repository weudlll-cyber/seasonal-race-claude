// ============================================================
// File:        join.js
// Path:        server/src/routes/join.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: /api/join/:code — the PUBLIC side of player registration: the page behind the join
//              link (client /join/<code>) reads what a player needs and registers a name. No sign-in.
//
//              GET  /:code      the event, the track, places left, the state, the deadline — and,
//                               for a device that has registered, its own name and number
//              POST /:code      register { name }
//
// ── ★ WHY THIS IS PUBLIC, AND WHAT KEEPS IT NARROW ─────────────────────────────────────────────
// A player at the venue has no account and must not need one (the owner's decisions of 2026-10-20).
// So both routes are on PUBLIC_PATHS (guards.js), as a PATTERN that admits exactly
// `/api/join/<22 URL-safe characters>` and nothing under or beside it. What a caller holding a code
// can do is bounded by this file and by the store:
//   · read the public view (`registrationStore.publicInfo`) — never another player's name, the
//     director, the team or the registration's id;
//   · add ONE name, under the player-name rules, while the registration is open and has a place.
// The code is 128 random bits, so it cannot be guessed; the link is the permission.
//
// ── ONE REGISTRATION PER DEVICE, BY A COOKIE ───────────────────────────────────────────────────
// A successful registration sets `ra_join` — httpOnly, SameSite=Lax, its path THIS code's path, so
// every registration has its own and no other route ever receives it. Its value is the entry's id
// (random, 122 bits). A second attempt from the same device is answered "You are already registered
// as <name>"; when the director has removed that name the cookie names nothing and the device may
// register again. It is a courtesy against double sign-ups, not a security boundary: a player who
// clears cookies can register a second name, and the director sees and removes it. There is NO
// per-IP cap on entries, because at a venue every phone may share one address.
//
// ── THE LIMITS IN FRONT ────────────────────────────────────────────────────────────────────────
// `joinLimiter` (rateLimit.js) on POST only — GET is read every few seconds by the page's countdown
// and is as unlimited as every other read — and a 1 KB body limit mounted before the app's 1 MB parser
// (app.js) — a name is at most 32 characters.
//
// ── WEBSITE-EMBED-1 piece 4: MEMBERS JOIN AS THEMSELVES (OWNER-1, OWNER-6) ──────────────────────
// In website mode a member signed in through the website (website/websiteSession.js) joins with
// their website display name, as source 'website' keyed by their website id — one entry per
// ACCOUNT, by the table's own UNIQUE (registration, external id), not per device. A guest may join
// only a registration opened for 'anyone' (or one opened before website mode, which says nothing),
// with today's name form; a 'members' registration answers 403 MEMBERS_ONLY to a guest's name.
// Capacity, the deadline and the duplicate-name rule are the store's, unchanged. In standalone mode
// none of this runs: both routes are exactly what they were.
// ============================================================

import express from 'express';
import { getDefaultRegistrationStore } from './registrations.js';
import { resolveCookieSecure, cookieBasePath } from '../auth/cookiePolicy.js';
import { joinLimiter } from '../auth/rateLimit.js';
import { unknownFields, unknownFieldsMessage } from '../../utils/recordFields.js';
import { siteMode } from '../website/websiteConfig.js';
import { currentWebsiteMember } from '../website/websiteSession.js';

/** The device cookie's name; its path makes it per registration. */
export const JOIN_COOKIE = 'ra_join';
/** Longer than any registration can stay open (30 days), so it outlives the window. */
const COOKIE_MAX_AGE_MS = 31 * 24 * 60 * 60 * 1000;

const JOIN_FIELDS = new Set(['name']);

/** The store's refusals as statuses; the message is the store's, written for the player. */
const REFUSAL_STATUS = {
  NOT_FOUND: 404,
  CLOSED: 409,
  FULL: 409,
  DUPLICATE_NAME: 409,
  DUPLICATE_EXTERNAL_ID: 409,
  INVALID_NAME: 400,
};

/** One cookie's value from the request, without a parser dependency. */
function readCookie(req, name) {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(part.slice(at + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** "You're in! You are number N of M." — the one sentence, on success and on a revisit. */
function youAre(own) {
  return {
    name: own.name,
    number: own.number,
    capacity: own.capacity,
    message: `You're in! You are number ${own.number} of ${own.capacity}.`,
  };
}

export function createJoinRouter({ store, limiter = joinLimiter } = {}) {
  const router = express.Router();
  const resolveStore = () => store ?? getDefaultRegistrationStore();
  const secure = resolveCookieSecure(process.env.NODE_ENV === 'production');

  // GET /:code — the public view, plus this device's own entry when its cookie names one.
  router.get('/:code', (req, res) => {
    const info = resolveStore().publicInfo(req.params.code);
    if (!info) return res.status(404).json({ error: 'This registration link is not valid.' });
    if (siteMode() === 'website') {
      // Website mode: who is looking (a signed-in member, or nobody), and their own entry — the
      // account's, or this device's for a guest who typed a name on an 'anyone' registration.
      const member = currentWebsiteMember(req);
      const own =
        (member && resolveStore().ownWebsiteEntry(req.params.code, member.websiteUserId)) ||
        resolveStore().ownEntry(req.params.code, readCookie(req, JOIN_COOKIE));
      return res.json({
        ...info,
        you: own ? youAre(own) : null,
        member: member ? { displayName: member.displayName } : null,
      });
    }
    const own = resolveStore().ownEntry(req.params.code, readCookie(req, JOIN_COOKIE));
    return res.json({ ...info, you: own ? youAre(own) : null });
  });

  // POST /:code — register one name from this device.
  router.post('/:code', limiter, (req, res) => {
    const unknown = unknownFields(req.body, JOIN_FIELDS);
    if (unknown.length) {
      return res.status(400).json({ error: unknownFieldsMessage(unknown, 'A registration') });
    }
    const { code } = req.params;
    if (siteMode() === 'website') {
      const member = currentWebsiteMember(req);
      if (member) return joinAsMember(res, code, member);
      // A guest's typed name is welcome only where the director said "Anyone with the link".
      if (resolveStore().websiteAccessOf(code) === 'members') {
        return res.status(403).json({
          error: 'This race is for Seasonal Entertainment members. Sign in to join.',
          code: 'MEMBERS_ONLY',
        });
      }
    }
    const already = resolveStore().ownEntry(code, readCookie(req, JOIN_COOKIE));
    if (already) {
      return res.status(409).json({
        error: `You are already registered as ${already.name}.`,
        code: 'ALREADY_REGISTERED',
        you: youAre(already),
      });
    }
    try {
      const added = resolveStore().addEntry(code, { name: req.body.name, source: 'public' });
      res.cookie(JOIN_COOKIE, added.entry.id, {
        httpOnly: true,
        sameSite: 'lax',
        // 'auto' is decided per request by trust-proxy for the session cookie; here it means
        // "Secure when this request arrived over HTTPS".
        secure: secure === 'auto' ? req.secure : secure,
        // Under a base path (WEBSITE-EMBED-1) the API is below it, so the cookie must be too, or the
        // browser never sends it back; at "/" this is exactly the old "/api/join/<code>".
        path: `${cookieBasePath()}/api/join/${code}`,
        maxAge: COOKIE_MAX_AGE_MS,
      });
      const own = resolveStore().ownEntry(code, added.entry.id);
      return res.status(201).json({ you: youAre(own) });
    } catch (err) {
      const status = REFUSAL_STATUS[err.code];
      if (!status) throw err;
      return res.status(status).json({ error: err.message, code: err.code });
    }
  });

  /** A signed-in website member joins as themselves: their display name, keyed by their id. */
  function joinAsMember(res, code, member) {
    const already = resolveStore().ownWebsiteEntry(code, member.websiteUserId);
    if (already) {
      return res.status(409).json({
        error: `You are already registered as ${already.name}.`,
        code: 'ALREADY_REGISTERED',
        you: youAre(already),
      });
    }
    try {
      resolveStore().addEntry(code, {
        name: member.displayName,
        source: 'website',
        externalId: member.websiteUserId,
      });
      return res
        .status(201)
        .json({ you: youAre(resolveStore().ownWebsiteEntry(code, member.websiteUserId)) });
    } catch (err) {
      const status = REFUSAL_STATUS[err.code];
      if (!status) throw err;
      return res.status(status).json({ error: err.message, code: err.code });
    }
  }

  return router;
}

export default createJoinRouter();
