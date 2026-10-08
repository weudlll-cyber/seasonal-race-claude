// ============================================================
// File:        pointsRule.js
// Path:        server/src/races/pointsRule.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (the owner's decision of 2026-10-04)
// Description: THE POINTS RULE of the period evaluation, stored ON THE SERVER.
//
// ── WHY ON THE SERVER ───────────────────────────────────────────────────────────────────────────
// The owner decided on 2026-10-04 that the points rule is SERVER-WIDE: one rule, stored here,
// readable by every signed-in user and editable by admins only. It used to be a Dev Screen setting
// in each browser's storage, which meant two people evaluating the same month could see two
// different tables. Now there is one rule and everybody's table agrees.
//
// ONE RULE FOR THE WHOLE SERVER, not one per team — his word was "server-wide". Admin-only editing
// is enforced by `ROUTE_POLICY` in `server/src/auth/guards.js`, not here.
//
// ── THE SHAPE ───────────────────────────────────────────────────────────────────────────────────
// `{ pointsEnabled, pointsPerPlace }`. `pointsPerPlace[0]` is 1st place; a place beyond the list
// scores 0. It ships OFF with an empty ladder: the commission (2026-09-25) adopted no numbers, so the
// evaluation shows plain counts until an admin sets a rule.
// ============================================================

import { join } from 'node:path';
import { createJsonSettingStore } from '../../utils/jsonSettingStore.js';
import { DATA_ROOT } from '../dataPaths.js';

export const DEFAULT_POINTS_RULE = Object.freeze({ pointsEnabled: false, pointsPerPlace: [] });

/** No field is larger than 80 racers; a ladder longer than this is a mistake, not a rule. */
const POINTS_LADDER_MAX = 100;
const POINTS_VALUE_MAX = 1_000_000;

/**
 * Check a rule sent by a client. Returns the rule to store, or an `error` sentence for the person.
 *
 * @param {unknown} body
 * @returns {{ rule?: {pointsEnabled: boolean, pointsPerPlace: number[]}, error?: string }}
 */
export function validatePointsRule(body) {
  if (!body || typeof body !== 'object') return { error: 'A points rule is an object.' };
  const { pointsEnabled, pointsPerPlace } = body;
  if (typeof pointsEnabled !== 'boolean') {
    return { error: '"pointsEnabled" must be true or false.' };
  }
  if (!Array.isArray(pointsPerPlace) || pointsPerPlace.length > POINTS_LADDER_MAX) {
    return { error: `"pointsPerPlace" must be a list of at most ${POINTS_LADDER_MAX} numbers.` };
  }
  for (const p of pointsPerPlace) {
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > POINTS_VALUE_MAX) {
      return {
        error: `Every place's points must be a number from 0 to ${POINTS_VALUE_MAX.toLocaleString('en')}.`,
      };
    }
  }
  return { rule: { pointsEnabled, pointsPerPlace: [...pointsPerPlace] } };
}

/**
 * The stored rule, in one file. A missing file is the default; so is an unreadable one, said once
 * in the log — the evaluation must still answer, and the default shows plain counts, never wrong
 * points.
 *
 * @param {string} [filePath]
 */
export function createPointsRuleStore(filePath = join(DATA_ROOT, 'period-points-rule.json')) {
  return createJsonSettingStore({
    filePath,
    validate: (raw) => validatePointsRule(raw).rule ?? null,
    fallback: () => ({ ...DEFAULT_POINTS_RULE, pointsPerPlace: [] }),
    tag: 'points-rule',
    name: 'points rule',
  });
}
