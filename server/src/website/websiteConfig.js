// ============================================================
// File:        websiteConfig.js
// Path:        server/src/website/websiteConfig.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: THE ONE HOME for website mode's settings: whether this install runs inside the
//              Seasonal Entertainment website (RA_MODE), which peer and which secret it believes
//              (RA_WEBSITE_TRUSTED_PROXIES, RA_WEBSITE_PROXY_SECRET_FILE), and the team its
//              directors land in (RA_WEBSITE_TEAM). Read ONCE at start; judged before anything
//              listens (index.js), so a website-mode install with no secret or no trusted network
//              refuses to start instead of starting with a door nobody can check.
//
// ── EVERYTHING IS OFF UNLESS RA_MODE=website ───────────────────────────────────────────────────
// Unset (or `standalone`) — every existing install — this module reads no file, and nothing that
// depends on it changes behaviour: `siteMode()` is 'standalone' and `websiteConfig()` is null.
//
// ── THE TWO PROOFS, BOTH REQUIRED ──────────────────────────────────────────────────────────────
// The identity headers are believed only when (1) the TCP peer — `req.socket.remoteAddress`, NOT
// `req.ip`, which `X-Forwarded-For` can steer — is inside a configured network, AND (2) the request
// carries the shared secret. The app runs in Docker, so the peer is the compose network's gateway;
// the network alone would admit anything else on that host, the secret alone would admit anyone who
// learnt it. Compared timing-safe, over SHA-256 digests so the lengths always match.
//
// ★ THE SECRET IS NEVER LOGGED, never put in an error message and never returned: only its digest is
// kept in memory, and a missing or empty file is reported by the FILE's name.
// ============================================================

import { readFileSync } from 'node:fs';
import { BlockList, isIP } from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';
import { loadFeedConfig } from './accountFeed.js';

/** The two modes; anything else is refused at start. */
export const SITE_MODES = ['standalone', 'website'];

/** The team website directors land in unless RA_WEBSITE_TEAM says otherwise (OWNER-2). */
export const DEFAULT_WEBSITE_TEAM = 'Seasonal Entertainment';

/**
 * 'standalone' (the default, every existing install) or 'website'. Throws on any other value: a
 * typo here must not silently run the wrong mode.
 * @param {object} [env]
 * @returns {'standalone'|'website'}
 */
export function resolveSiteMode(env = process.env) {
  const raw = env.RA_MODE;
  if (raw === undefined || String(raw).trim() === '') return 'standalone';
  const mode = String(raw).trim().toLowerCase();
  if (!SITE_MODES.includes(mode)) {
    throw new Error(
      `RA_MODE is set but unusable: ${JSON.stringify(raw)}. Use "standalone" or "website".`
    );
  }
  return mode;
}

/** "::ffff:172.18.0.1" → "172.18.0.1": Node reports an IPv4 peer on a dual-stack socket this way. */
export function normalizePeerAddress(address) {
  if (typeof address !== 'string') return '';
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  return mapped ? mapped[1] : address;
}

/**
 * Parse the comma-separated CIDR list ("172.18.0.0/16, 127.0.0.1"); a bare address is one host.
 * @returns {{ list: BlockList, entries: string[] }}
 * @throws with the offending entry named
 */
export function parseTrustedProxies(raw) {
  const list = new BlockList();
  const entries = String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const [address, prefixText, extra] = entry.split('/');
    const family = isIP(address);
    const max = family === 6 ? 128 : 32;
    const prefix = prefixText === undefined ? max : Number(prefixText);
    if (!family || extra !== undefined || !Number.isInteger(prefix) || prefix < 0 || prefix > max) {
      throw new Error(
        `RA_WEBSITE_TRUSTED_PROXIES holds ${JSON.stringify(entry)}, which is not an address or a ` +
          'CIDR network (e.g. 172.18.0.0/16 or 127.0.0.1).'
      );
    }
    list.addSubnet(address, prefix, family === 6 ? 'ipv6' : 'ipv4');
  }
  return { list, entries };
}

const digest = (text) => createHash('sha256').update(text, 'utf8').digest();

/** The secret file's text, trimmed; refused (by the FILE's name, never its content) if unusable. */
function readSecret(secretFile, readFile) {
  let text;
  try {
    text = readFile(secretFile).trim();
  } catch (err) {
    throw new Error(
      `RA_WEBSITE_PROXY_SECRET_FILE ${secretFile} cannot be read (${err.code ?? 'error'}).`,
      { cause: err }
    );
  }
  if (!text) throw new Error(`RA_WEBSITE_PROXY_SECRET_FILE ${secretFile} is empty.`);
  return text;
}

/**
 * Read and judge website mode's settings. `null` in standalone mode (no file is read).
 *
 * @param {object} [env]
 * @param {{ readFile?: (path: string) => string }} [io] tests pass their own reader
 * @returns {null | {
 *   team: string,
 *   feed: { url: string, token: string, intervalMs: number },
 *   trustedProxies: string[],
 *   isTrustedPeer: (address: string) => boolean,
 *   secretMatches: (value: unknown) => boolean,
 * }}
 * @throws with a message naming the setting (never the secret) when website mode is incomplete
 */
export function loadWebsiteConfig(
  env = process.env,
  { readFile = (p) => readFileSync(p, 'utf8') } = {}
) {
  if (resolveSiteMode(env) !== 'website') return null;

  const secretFile = String(env.RA_WEBSITE_PROXY_SECRET_FILE ?? '').trim();
  if (!secretFile) {
    throw new Error(
      'RA_MODE=website needs RA_WEBSITE_PROXY_SECRET_FILE: the path of a file (mode 0600) holding ' +
        'the secret the website proxy sends in X-Ra-Proxy-Secret.'
    );
  }
  // The plain secret lives only inside this call; only its digest leaves it.
  const secretDigest = digest(readSecret(secretFile, readFile));

  const { list, entries } = parseTrustedProxies(env.RA_WEBSITE_TRUSTED_PROXIES);
  if (entries.length === 0) {
    throw new Error(
      'RA_MODE=website needs RA_WEBSITE_TRUSTED_PROXIES: the network(s) the website proxy connects ' +
        'from, comma-separated CIDRs (in Docker, the compose network, e.g. 172.18.0.0/16).'
    );
  }

  const team = String(env.RA_WEBSITE_TEAM ?? '').trim() || DEFAULT_WEBSITE_TEAM;
  // Piece 3b: the account-changes feed is REQUIRED in website mode — without it a deleted member's
  // name would stay in open registrations, and a locked one would keep their sessions.
  const feed = loadFeedConfig(env, { readFile });
  return {
    team,
    feed,
    trustedProxies: entries,
    isTrustedPeer(address) {
      const peer = normalizePeerAddress(address);
      const family = isIP(peer);
      if (!family) return false;
      return list.check(peer, family === 6 ? 'ipv6' : 'ipv4');
    },
    secretMatches(value) {
      if (typeof value !== 'string' || value === '') return false;
      return timingSafeEqual(digest(value), secretDigest);
    },
  };
}

// ── The process's own answer, read once ─────────────────────────────────────────────────────────
let cached;

/** The mode of THIS process. */
export function siteMode() {
  return resolveSiteMode(process.env);
}

/** THIS process's website settings (null in standalone), read once and kept. */
export function websiteConfig() {
  if (cached === undefined) cached = loadWebsiteConfig(process.env);
  return cached;
}
