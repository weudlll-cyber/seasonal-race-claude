// ============================================================
// File:        openRounds.js
// Path:        server/src/website/openRounds.js
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7a (OWNER-4, the owner's decision of 2026-11-11)
// Created:     2026-11-12
// Description: GET <base>/api/public/open-rounds — the open registrations the director marked
//              "Show on the website", in the website's open-rounds contract, so the website shows
//              them on its home page and games page. WEBSITE MODE ONLY: app.js mounts it there and
//              nowhere else, so standalone answers the API's own 404.
//
// ── THE WEBSITE'S CONTRACT, FOLLOWED EXACTLY (seasonal-entertainment docs/OPEN-ROUNDS.md) ──────
// `:19` public, no login, JSON, Cache-Control max-age=30. `:20-34` `{ version: 1, rounds: [{ id,
// title, kind, startsAt, signupClosesAt, players, maxPlayers, joinUrl }] }`. `:35` at most 20,
// only rounds open now that the host marked, no personal data. Its checker
// (server/src/games/openRoundsContract.js:19-40) drops a round whose text is too long or empty,
// whose time does not end in `Z`, whose count is out of range, whose joinUrl is not https on the
// status URL's origin, or whose sign-up has closed. Bingo serves the same contract
// (apps/server/src/http/routes/openRounds.ts:77-85), which this follows where the race has a
// choice. The morning sheet (reports/night/MORNING-WEBSITE-EXTRAS-1.md) has the facts with lines.
//
// ── WHAT A ROUND CARRIES, FIELD BY FIELD ───────────────────────────────────────────────────────
//   id              the registration's public CODE — it is in the join link anyway, so it reveals
//                   nothing the link does not; the internal id stays inside (as toPublicView).
//   title           the event name and the track ("Spring Cup — Dirt Oval"), or the track alone;
//                   cut to 80.
//   kind            "Seasonal Race", the race's name on the website (its docs/EMBED.md:49).
//   startsAt        null: a registration has no start time — the director starts the race.
//   signupClosesAt  the deadline, ISO 8601 UTC ("…Z").
//   players         names registered so far; maxPlayers its places.
//   joinUrl         the join page: the public origin (RA_PUBLIC_ORIGIN — https://<site> in website
//                   mode) + the base path + /join/<code>. Without a public origin, https:// and the
//                   request's own host, as Bingo does (openRounds.ts:81).
// NEVER a player's name, an entry, an external id, the team or who opened it: the store's
// `openRoundsForWebsite` hands out nothing else, and the test asserts the exact keys.
//
// ── RATE-LIMITED LIKE THE JOIN LINK ────────────────────────────────────────────────────────────
// Its own instance of the join route's limiter (rateLimit.js `createJoinLimiter`, 60 a minute per
// address — Bingo's number too). The website itself asks once a minute.
// ============================================================

import express from 'express';
import { createJoinLimiter } from '../auth/rateLimit.js';
import { getDefaultRegistrationStore } from '../routes/registrations.js';
import { resolvePublicOrigin, resolveBasePath } from '../runtimeConfig.js';

/** The contract's version (docs/OPEN-ROUNDS.md:21). */
export const OPEN_ROUNDS_VERSION = 1;
/** The race's name on the website (its docs/EMBED.md:49 and docs/GAME-INTEGRATION.md:29). */
export const ROUND_KIND = 'Seasonal Race';
/** The contract's longest title (docs/OPEN-ROUNDS.md:25). */
const TITLE_MAX = 80;

/** One round of the contract from one registration the store listed. */
export function roundOf(reg, joinBase) {
  const title = reg.eventName ? `${reg.eventName} — ${reg.trackName}` : reg.trackName;
  return {
    id: reg.code,
    title: title.slice(0, TITLE_MAX),
    kind: ROUND_KIND,
    startsAt: null,
    signupClosesAt: reg.closesAt,
    players: reg.taken,
    maxPlayers: reg.capacity,
    joinUrl: `${joinBase}/join/${reg.code}`,
  };
}

/**
 * @param {{ store?: object, limiter?: Function, env?: object }} [deps] tests pass their own
 */
export function createOpenRoundsRouter({ store, limiter = createJoinLimiter(), env } = {}) {
  const router = express.Router();
  router.get('/', limiter, (req, res) => {
    const origin = resolvePublicOrigin(env) ?? `https://${req.hostname}`;
    const joinBase = `${origin}${resolveBasePath(env)}`;
    const rounds = (store ?? getDefaultRegistrationStore())
      .openRoundsForWebsite()
      .map((reg) => roundOf(reg, joinBase));
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ version: OPEN_ROUNDS_VERSION, rounds });
  });
  return router;
}
