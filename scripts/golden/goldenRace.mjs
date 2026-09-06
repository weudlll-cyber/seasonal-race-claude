// ============================================================
// File:        scripts/golden/goldenRace.mjs
// Project:     RaceArena — GOLDEN-RACES-1
//
// WHAT THIS OWNS: running ONE fully-pinned race and returning its outcome — the finishing order and
// each racer's finishing time. Nothing else.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO:
//   - It does NOT contain a race loop. `client/src/modules/raceCore.js` → `runRaceHeadless` is the
//     REAL RaceScreen core, headless, and it is reused. Writing a second runner is the one thing
//     this file must never become: a golden race run by its own engine tests nothing.
//   - It does NOT read a seed file, a config file, a default, the clock, the environment or any
//     stored setting. Every input arrives in the race definition. See THE PINNING RULE below.
//   - It does NOT decide whether an outcome is correct. That is the check's job, and re-recording
//     is a separate command that needs the owner's word.
//
// ── ★ THE PINNING RULE, AND WHY IT IS THE WHOLE POINT ───────────────────────────────────────────
// REPEAT-REFUSE-5 established why the existing world fingerprint cannot serve as a "did the race
// change" signal: `scripts/fingerprint-default.mjs` reads each track's `defaultRacerTypeId` from
// `server/seeds/tracks/*.json`, so editing a seed moves it while the simulation is untouched — and
// it moved once already, on 2026-09-02, as an instrument correction whose diff contained no engine
// file. Re-verified at source for this piece: that read is still there, at
// `scripts/fingerprint-default.mjs:182-196`.
//
// So a golden race depends on NOTHING outside its own definition. Every value the engine reads is
// stated in the fixture: the geometry, the track width, the racer's tuned values, every config
// object, the roster names, the seed, the laps or the duration. A change to a shipped seed, a
// shipped default or a stored setting cannot move a golden race, because a golden race never asks
// any of them anything.
//
// ── WHAT THAT COSTS, STATED PLAINLY ─────────────────────────────────────────────────────────────
// A pinned config is a config that stops following `defaults.js`. If the owner changes a shipped
// default, the golden races WILL be selected (defaults.js is inside the engine closure) and they
// WILL pass, because they run their own frozen numbers. **They test the ENGINE, not the shipped
// world.** That gap is real and is covered by the instrument this piece must not touch:
// `fingerprint-default.mjs` hashes the shipped defaults across ten tracks and is blind to
// everything a golden race pins. The two are complementary and neither replaces the other.
//
// ── WHY THE NAMES ARE PART OF THE RACE ──────────────────────────────────────────────────────────
// A racer's NAME is physics: `stablePairBit` hashes it to break avoidance symmetry, so renaming a
// racer changes who wins. The roster is therefore pinned by name and in order, exactly like the
// seed, and `runRaceHeadless` is given the named racers before it steps.
// ============================================================

import { createRaceFromIdentity, stepRacePhysics } from '../../client/src/modules/raceCore.js';
import { applyRaceActionStage } from '../../client/src/modules/raceActionStage.js';
import { EditorShape } from '../../client/src/modules/track-editor/EditorShape.js';
import {
  computeRacerLayout,
  computeBodyNarrowRef,
} from '../../client/src/modules/rowLayout.js';

/**
 * Run one pinned race.
 *
 * The stepping loop here is `runRaceHeadless`'s, reproduced for ONE reason and no other: the racers
 * must be given their pinned NAMES between `createRaceFromIdentity` and the first step, because the
 * name is a physics input and `runRaceHeadless` takes no roster. `realArm` in
 * `scripts/parity/goldenRunner.mjs` does exactly this and says so in the same words. Everything that
 * decides the race — the init, the per-step advance, the finish accounting — is the shared core's.
 *
 * @param {object} race a golden race definition (see fixtures/races.json)
 * @returns {{results: Array<{name: string, rank: number, finishTimeSec: number|null}>,
 *            realizedDurationSec: number, frames: number}}
 */
export function runGoldenRace(race, sharedConfigs) {
  const { track, racer, field, plan } = race;
  // ONE pinned world for both races, passed in rather than copied into each definition: two copies
  // of one config block is a second home, and the two would drift the first time somebody edited
  // one of them. A race may still differ in track, racer, field, seed, laps and stage.
  const configs = sharedConfigs;

  // The geometry, from the fixture's own numbers. `getPosition` — the only shape method the engine
  // calls (raceCore.js:385) — uses the CENTER spline and the declared width, so those are what the
  // fixture pins. Inner and outer are handed the same points: EditorShape builds splines from them,
  // and nothing on the race path reads either.
  const shape = new EditorShape({
    closed: !track.isOpen,
    width: track.trackWidthPx,
    centerPoints: track.centerPoints,
    innerPoints: track.centerPoints,
    outerPoints: track.centerPoints,
  });

  const behaviorConfig = { ...configs.behavior, isOpen: track.isOpen };

  // ★ THE ACTION STAGE IS APPLIED, not merely recorded. The stage is a race input the owner sets
  // (RACE-ACTION-CONTROL-1) and it overrides two dynamics keys, so a fixture that named a stage
  // without applying it would be claiming an input it never used. `configs.dynamics` is therefore
  // the PRE-stage base, exactly as `loadRaceDynamicsConfig()` is on the real path.
  const dynamicsConfig = applyRaceActionStage(configs.dynamics, plan.raceActionStage);
  const effectiveWidth = track.trackWidthPx * behaviorConfig.startSpreadRange;

  // Sprite geometry is DERIVED by the engine's own auto-scale from pinned inputs, rather than
  // pinned as numbers: the derivation is engine behaviour and belongs under test. What it is not
  // allowed to do is read `DEFAULT_AUTO_SCALE_CONFIG` — the fixture carries its own copy.
  const { spriteSize: physicalSpriteSize } = computeRacerLayout(
    effectiveWidth,
    field.names.length,
    racer.displaySize,
    configs.autoScale,
  );
  const bodyFillNarrow = Math.min(racer.bodyFillX, racer.bodyFillY);
  const bodyFillLong = Math.max(racer.bodyFillX, racer.bodyFillY);
  const bodyRef = computeBodyNarrowRef(
    Math.min(285, effectiveWidth),
    field.names.length,
    racer.displaySize,
    bodyFillNarrow,
    configs.autoScale,
  );

  const { state, config, meta } = createRaceFromIdentity({
    shape,
    isOpenTrack: track.isOpen,
    pathLengthPx: track.pathLengthPx,
    trackWidthPx: track.trackWidthPx,
    speedMultiplier: racer.speedMultiplier,
    baseSpeedConfig: configs.baseSpeed,
    behaviorConfig,
    rowConfig: configs.rowLayout,
    dynamicsConfig,
    normalSpeedPxPerSec: configs.baseSpeed.normalSpeedPxPerSec,
    laps: track.isOpen ? 1 : plan.laps,
    requestedSeconds: track.isOpen ? plan.requestedSeconds : 0,
    nRacers: field.names.length,
    racePlanSeed: plan.seed,
    racePlanEnabledFlag: plan.racePlanEnabled,
    physicalSpriteSize,
    drawnBodyWidthRefPx: bodyRef.bodyNarrow,
    bodyFillNarrow,
    bodyFillLong,
  });

  // ★ THE NAMES, BEFORE THE FIRST STEP. A name is physics; a race stepped without them is a
  // different race.
  for (let i = 0; i < state.racers.length; i++) state.racers[i].name = field.names[i];

  config.computePositions();

  const nRacers = state.racers.length;
  const maxTime = Math.max(meta.realizedDurationSec * 3, 600) * 1000;
  let frames = 0;
  while (state.finishedCount < nRacers && state.physicsTs < maxTime) {
    stepRacePhysics(state, config);
    frames++;
  }

  // Unfinished racers rank after the finishers by progress — the same rule `runRaceHeadless` and
  // the sim apply, so a race that times out still has a stable order rather than an arbitrary one.
  const dnf = state.racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  for (let k = 0; k < dnf.length; k++) dnf[k].finishRank = state.finishedCount + 1 + k;

  const results = state.racers
    .map((r) => ({
      name: r.name,
      rank: r.finishRank,
      // Seconds, from a strict FIXED_DT multiple, so the value is exact rather than rounded.
      finishTimeSec: r.finishTimeMs == null ? null : r.finishTimeMs / 1000,
    }))
    .sort((a, b) => a.rank - b.rank);

  return { results, realizedDurationSec: meta.realizedDurationSec, frames };
}
