// ============================================================
// File:        raceActionStage.js
// Path:        client/src/modules/raceActionStage.js
// Project:     RaceArena
// Created:     2026-08-24
// Description: RACE-ACTION-CONTROL-1 — the host's three-stage "Race Action" selector: normalise a
//              stored stage id, and apply the stage a race was started with to the dynamics config
//              the engine reads.
// ============================================================

import {
  RACE_ACTION_STAGES,
  RACE_ACTION_STAGE_IDS,
  DEFAULT_RACE_DEFAULTS,
} from './storage/defaults.js';

// MIRRORS-BY-REFERENCE (LESSONS L207): the fallback READS the shipped default instead of copying it,
// so "the default is quiet" is stated in exactly one place — defaults.js.
export const FALLBACK_RACE_ACTION_STAGE = DEFAULT_RACE_DEFAULTS.raceActionStage;

/**
 * The stage id this value means, with everything unrecognised reading as the shipped default.
 *
 * THE UNRECOGNISED CASE IS THE POINT, not defensive padding. Three real inputs land here and all
 * three must read as the shipped stage rather than throw or run something else:
 *   - a race stored BEFORE this change, whose payload has no `raceActionStage` at all;
 *   - a stored `raceDefaults` blob from before the key existed;
 *   - a stage id from a future build that this build does not have.
 * A race that cannot say which stage it ran is a race that ran the shipped configuration, because
 * that is what every race before this control ran.
 *
 * @param {unknown} stage
 * @returns {'quiet'|'medium'|'wild'}
 */
export function normalizeRaceActionStage(stage) {
  return RACE_ACTION_STAGE_IDS.includes(stage) ? stage : FALLBACK_RACE_ACTION_STAGE;
}

/**
 * The two contest strengths this stage runs at. A fresh object every call — callers spread it into
 * a config and must never be able to mutate the table.
 *
 * @param {unknown} stage
 * @returns {{pulkChallengerBoost: number, pulkLeaderBrake: number}}
 */
export function raceActionStageValues(stage) {
  return { ...RACE_ACTION_STAGES[normalizeRaceActionStage(stage)] };
}

/**
 * The dynamics config the engine should run for a race started at `stage`.
 *
 * THE STAGE WINS OVER THE STORED SLIDER VALUES FOR ITS TWO KEYS, and that is a decision with a
 * cost, so it is written down here rather than left to be inferred from the code.
 *
 * WHY THE STAGE WINS. The stage is stored with the race so that a replay is unambiguous — and it can
 * only carry that meaning if the stage is a COMPLETE statement of the race's action configuration.
 * A stage that deferred to whatever the sliders happened to hold would tell a later reader nothing:
 * "wild" would name a different race on every install. It is also what makes the specified property
 * "the three stages are the only reachable combinations" true; deferring to the sliders would make
 * the reachable set unbounded.
 *
 * WHAT IT COSTS. An admin who moves the `pulkChallengerBoost` or `pulkLeaderBrake` slider in the
 * (admin-tier) Race Tuning section does not see that value in a race. The sliders are deliberately
 * left in place and untouched — they still drive the sim, the harnesses and the exported world — but
 * on the browser race path these two keys now have one author, which is the whole point. Every other
 * key in the dynamics config is untouched by the stage and the sliders own them exactly as before.
 *
 * QUIET IS NOT A NO-OP, and the difference only shows on a TUNED install: quiet pins the two keys to
 * their shipped values. On the shipped configuration — an untouched install, and the production
 * build the owner judges — quiet is byte-identical to what ran before this control existed, which is
 * what the four fingerprints prove.
 *
 * @param {object} dynamicsConfig - the resolved config from loadRaceDynamicsConfig()
 * @param {unknown} stage
 * @returns {object} a new config; the input is never mutated
 */
export function applyRaceActionStage(dynamicsConfig, stage) {
  return { ...dynamicsConfig, ...raceActionStageValues(stage) };
}
