// ============================================================
// File:        shortKey.js
// Path:        server/src/races/shortKey.js
// Project:     RaceArena — RACE-HISTORY-4
// Created:     2026-09-06
// Description: THE GENERATOR for a race's short key, and nothing else.
//
//              The alphabet, the length and the reader live in `client/src/modules/raceShortKey.js`
//              and are IMPORTED here rather than restated — both sides must agree about what a key
//              is, and two copies of an alphabet is the silent-divergence shape that module's
//              header describes. This file adds only what a browser has no business carrying: a
//              cryptographic random source.
//
// ── ★ WHAT A KEY IS NOT: A PERMISSION ───────────────────────────────────────────────────────────
// Knowing a key grants nothing. `GET /api/races/:key` requires a session like every other route,
// and the TEAM it searches is read from that session — so a key belonging to another team answers
// NOT FOUND, exactly as a key that was never issued does. The two are deliberately
// indistinguishable: "forbidden" would confirm that the race exists, which is the one thing a
// person outside the team should not learn from a name they were not given.
//
// ── ★ WHY IT IS NOT SEQUENTIAL ──────────────────────────────────────────────────────────────────
// A counter tells anyone holding one key how many races exist, roughly when each ran, and exactly
// which keys to try next. The key is drawn from `crypto.randomInt`, so one key says nothing about
// any other — and uniqueness is therefore a property to be CHECKED rather than assumed, which is
// what the UNIQUE column and the retry loop in `raceStore.js` are for.
// ============================================================

import { randomInt } from 'node:crypto';
import { SHORT_KEY_ALPHABET, SHORT_KEY_LENGTH } from '../../../client/src/modules/raceShortKey.js';

/** A fresh key. Random, never derived from the race — two identical races get two different keys. */
export function generateShortKey() {
  let out = '';
  for (let i = 0; i < SHORT_KEY_LENGTH; i++) {
    out += SHORT_KEY_ALPHABET[randomInt(SHORT_KEY_ALPHABET.length)];
  }
  return out;
}
