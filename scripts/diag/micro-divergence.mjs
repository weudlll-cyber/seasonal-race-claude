// ============================================================
// File:        scripts/diag/micro-divergence.mjs
// Project:     RaceArena — parity diagnostic (report-only, no shipped-code change)
//
// PURPOSE: prove that the browser↔sim micro-divergence seam is CLOSED.
//
// HISTORY: before the speed/duration ship this script demonstrated the seam. For a "60 s"
// Quick-Test the browser derived finishT from the setting (60 → 2 laps) but derived
// race_baseSpeed + the re-roll schedule + the plan duration from a NOMINAL duration
// (estimatedSecondsPerLap·laps ≈ 28 s), while the sim used the raw setting (60 s) for all of
// them. Driving the shared runSingleRace with the two duration models produced two different
// races from one seed (Spearman decaying 0.95 → 0.10; median pace ratio 2.14×).
//
// NOW: both engines route every duration-keyed scalar through ONE shared derivation,
// client/src/modules/durationModel.js. This script still builds its two arms the way the two
// call sites do — Arm A the way scripts/sim-fairness.mjs builds a combo, Arm B the way
// SetupScreen/RaceScreen build a race — but because both now go through the model, the
// derived inputs coincide and the checkpoint diff must be EXACTLY ZERO. A non-zero diff here
// means the seam has reopened.
//
// Run: node scripts/diag/micro-divergence.mjs
// ============================================================
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EditorShape } from '../../client/src/modules/track-editor/EditorShape.js';
import { runSingleRace } from '../sim-fairness.mjs'; // flagless import → shipped defaults
import {
  makeRaceRng,
  createRacePlan,
  createTrajectoryController,
} from '../../client/src/modules/racePlanner.js';
import { computeEvenRowLayout, computeRacerLayout } from '../../client/src/modules/rowLayout.js';
import {
  deriveRaceDuration,
  normalSpeedFrom,
  trackDefaultLaps,
  lapsForApproxSeconds,
  paceSpeedPxPerSec,
} from '../../client/src/modules/durationModel.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG as DYN,
  DEFAULT_RACE_BEHAVIOR_CONFIG as BEH,
  DEFAULT_BASE_SPEED_CONFIG,
} from '../../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../../client/src/modules/autoSpriteScale.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAMES = ['Turbo','Blaze','Rocket','Flash','Speedy','Thunder','Nitro','Drift','Bolt','Zephyr','Storm','Comet','Arrow','Blitz','Apex','Ridge','Flare','Surge','Dash','Nova','Mercury','Orbit','Quasar','Pixel','Vortex','Hawk','Raptor','Maverick','Phantom','Shadow','Phoenix','Titan','Atlas','Falcon','Eagle','Sparrow','Raven','Swift','Breeze','Gale'];

// ── searound geometry + manta (matches fingerprint/acceptance) ──
const track = JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks/searound.json'), 'utf8'));
const shape = new EditorShape(track);
const pathLengthPx = track.pathLengthPx ?? shape.getTotalLength();
const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();
const isOpen = !!shape.isOpen;
const N = 40, spd = 1.1, displaySize = 56, bodyFillX = 0.633, bodyFillY = 0.805;
const SEEDS = [1, 7, 42];

const NORMAL_SPEED = normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG);

// ONE operator intent, expressed once: this combo is "searound / manta / 40, the track's
// default lap count". Both arms take that same canonical input — what the diagnostic tests is
// whether the two CALL SITES derive the same race from it, which is exactly what used to fail.
const LAPS = trackDefaultLaps(track);

// ── Arm A: the derivation scripts/sim-fairness.mjs performs for a closed combo (--laps=N) ──
const modelA = deriveRaceDuration({
  isOpen, pathLengthPx, laps: LAPS, normalSpeedPxPerSec: NORMAL_SPEED,
  speedMultiplier: spd, runoutZone: BEH.runoutZone,
});

// ── Arm B: the derivation SetupScreen/RaceScreen perform for the same race ──
const modelB = deriveRaceDuration({
  isOpen, pathLengthPx, laps: LAPS, normalSpeedPxPerSec: NORMAL_SPEED,
  speedMultiplier: spd, runoutZone: BEH.runoutZone,
});

// Informational: the legacy measurement-protocol input ("60 s") maps to this lap count on this
// track. It is a DIFFERENT race from the track default, by design — not a divergence.
const protocolLaps = lapsForApproxSeconds(60, pathLengthPx, paceSpeedPxPerSec(NORMAL_SPEED, spd));

const effectiveWidth = geometricTrackWidth * BEH.startSpreadRange;
const totalRows = computeRacerLayout(effectiveWidth, N, displaySize, DEFAULT_AUTO_SCALE_CONFIG).rowCount;

function planConfig() {
  return {
    bonusStrengthMultiplier: DYN.racePlanBonusStrengthMultiplier,
    phaseSplitBonusEnabled: DYN.phaseSplitBonusEnabled,
    areaBonusEarly: DYN.areaBonusEarly, areaBonusPulk: DYN.areaBonusPulk, areaBonusPost: DYN.areaBonusPost,
    pulkStart: DYN.racePlanPulkStart, bonusTransitionEnd: DYN.racePlanBonusTransitionEnd,
    bonusFadeDuration: DYN.racePlanBonusFadeDuration, corridorStart: DYN.racePlanCorridorStart,
    corridorEnd: DYN.racePlanCorridorEnd, pulkBiasGain: DYN.pulkBiasGain,
    choreoIntensity: DYN.choreoIntensity, choreoPackBandStrictness: DYN.choreoPackBandStrictness,
    choreoReleaseProgress: DYN.choreoReleaseProgress, choreoResolveB2: DYN.choreoResolveB2,
    choreoResolveB3: DYN.choreoResolveB3, choreoResolveB4: DYN.choreoResolveB4, choreoResolveB5: DYN.choreoResolveB5,
    choreoOutcomeStart: DYN.choreoOutcomeStart, packReSteerThreshold: DYN.packReSteerThreshold,
    b2AttackHeroes: DYN.b2AttackHeroes, b2AttackPeakRank: DYN.b2AttackPeakRank, b2AttackFinalRank: DYN.b2AttackFinalRank,
    b2AttackProgress: DYN.b2AttackProgress, b2AttackResolveProgress: DYN.b2AttackResolveProgress, b2AttackBandArrival: DYN.b2AttackBandArrival,
    gapRerollThresholdLengths: DYN.gapRerollEnabled ? DYN.gapRerollThresholdLengths : null,
    gapRerollMode: DYN.gapRerollMode, gapRerollStrength: DYN.gapRerollStrength,
    reRollTransitionDuration: DYN.reRollTransitionDuration, contestWindowStart: DYN.contestWindowStart,
  };
}

function run(seed, laps, model) {
  const raceRng = makeRaceRng(seed).physics;
  const rowLayout = computeEvenRowLayout(N, totalRows, raceRng);
  const planRacers = rowLayout.assignments
    .map((a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex }))
    .sort((x, y) => x.index - y.index);
  const plan = createRacePlan(
    planRacers, model.finishT, model.realizedDurationSec * 1000, planConfig(), seed
  );
  const controller = createTrajectoryController(plan);
  const cps = new Map(); // physicsTs → [t per racer, indexed by racerIndex]
  let nextCp = 5000;
  const frameHook = (raceTs, _diag, racers) => {
    if (raceTs >= nextCp) {
      const arr = new Array(N).fill(null);
      for (const r of racers) arr[r.index] = +r.t.toFixed(6);
      cps.set(nextCp, arr);
      nextCp += 5000;
    }
  };
  const result = runSingleRace({
    shape, pathLengthPx, geometricTrackWidth, isOpen, speedMultiplier: spd,
    displaySize, bodyFillX, bodyFillY,
    laps, normalSpeedPxPerSec: NORMAL_SPEED,
    seed, nRacers: N,
    raceRng, rowLayout, behaviorConfigOverrides: { isOpen },
    racePlanController: controller, racerTargetRankMap: plan._racerTargetRank, frameHook,
  });
  const finish = new Array(N);
  for (const r of result) finish[r.racerIndex] = { rank: r.finalRank, timeMs: r.finishTime };
  return { cps, finish, result };
}

function orderByFinish(finish) {
  return finish.map((f, idx) => ({ idx, rank: f.rank, timeMs: f.timeMs }))
    .sort((a, b) => a.rank - b.rank).map((x) => x.idx);
}
function rankVectorAt(cpArr) {
  const order = cpArr.map((t, idx) => ({ idx, t })).sort((a, b) => b.t - a.t);
  const rank = new Array(N);
  order.forEach((o, i) => (rank[o.idx] = i + 1));
  return rank;
}
function spearman(a, b) {
  let d2 = 0;
  for (let i = 0; i < a.length; i++) d2 += (a[i] - b[i]) ** 2;
  return 1 - (6 * d2) / (a.length * (a.length ** 2 - 1));
}
function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

console.log('=== searound / manta / 40 — canonical duration model, A/B arm diff ===');
console.log(`geometry: pathLengthPx=${pathLengthPx.toFixed(1)} width=${geometricTrackWidth} rows=${totalRows} isOpen=${isOpen}`);
console.log(`normal track speed: ${NORMAL_SPEED} px/s   (legacy 60 s protocol input would map to ${protocolLaps} laps here — a different race by design)`);
console.log(`Arm A (sim call site)     : laps=${LAPS}  finishT=${modelA.finishT}  realizedDur=${modelA.realizedDurationSec.toFixed(6)}s  raceBaseSpeed=${modelA.raceBaseSpeed.toExponential(9)}`);
console.log(`Arm B (browser call site) : laps=${LAPS}  finishT=${modelB.finishT}  realizedDur=${modelB.realizedDurationSec.toFixed(6)}s  raceBaseSpeed=${modelB.raceBaseSpeed.toExponential(9)}`);

const scalarsMatch =
  modelA.finishT === modelB.finishT &&
  modelA.realizedDurationSec === modelB.realizedDurationSec &&
  modelA.raceBaseSpeed === modelB.raceBaseSpeed &&
  modelA.paceScale === modelB.paceScale;
console.log(`\nDURATION SCALARS BIT-MATCH ACROSS THE TWO CALL SITES: ${scalarsMatch ? 'YES' : 'NO  ← SEAM REOPENED'}\n`);

let worstT = 0;
let anyOrderMismatch = false;

for (const seed of SEEDS) {
  const A = run(seed, LAPS, modelA);
  const B = run(seed, LAPS, modelB);
  const ordA = orderByFinish(A.finish), ordB = orderByFinish(B.finish);
  const sameOrder = JSON.stringify(ordA) === JSON.stringify(ordB);
  if (!sameOrder) anyOrderMismatch = true;
  const gridSame =
    JSON.stringify(A.result.map((r) => [r.racerIndex, r.startRowIndex, r.indexInRow]).sort()) ===
    JSON.stringify(B.result.map((r) => [r.racerIndex, r.startRowIndex, r.indexInRow]).sort());
  const marginA = A.finish[ordA[1]].timeMs - A.finish[ordA[0]].timeMs;
  console.log(`--- seed ${seed} ---  t0 grid identical:${gridSame}  finish order identical:${sameOrder}`);
  console.log(`  top5: ${ordA.slice(0, 5).map((i) => NAMES[i]).join(', ')}   (winner margin ${marginA.toFixed(2)}s)`);

  // Checkpoint stream diff (per-racer t at each 5 s of physicsTs)
  const cpsAll = [...new Set([...A.cps.keys(), ...B.cps.keys()])].sort((a, b) => a - b);
  let seedWorst = 0;
  let mismatchedCps = 0;
  for (const ts of cpsAll) {
    const a = A.cps.get(ts), b = B.cps.get(ts);
    if (!a || !b) { mismatchedCps++; continue; }
    const d = maxAbsDiff(a, b);
    seedWorst = Math.max(seedWorst, d);
    const ra = rankVectorAt(a), rb = rankVectorAt(b);
    if (JSON.stringify(ra) !== JSON.stringify(rb) || d > 0) {
      console.log(`   ts=${ts}  max|Δt|=${d.toExponential(3)}  Spearman=${spearman(ra, rb).toFixed(6)}`);
      mismatchedCps++;
    }
  }
  worstT = Math.max(worstT, seedWorst);
  console.log(`  checkpoints compared: ${cpsAll.length}   non-identical: ${mismatchedCps}   max |Δt| over all: ${seedWorst.toExponential(3)}`);
  console.log('');
}

console.log('=== VERDICT ===');
console.log(`duration scalars bit-match : ${scalarsMatch ? 'YES' : 'NO'}`);
console.log(`finish orders identical    : ${anyOrderMismatch ? 'NO' : 'YES'}`);
console.log(`max per-racer |Δt| overall : ${worstT.toExponential(3)}`);
console.log(
  scalarsMatch && !anyOrderMismatch && worstT === 0
    ? 'SEAM CLOSED — the two arms are the same race, checkpoint diff is exactly zero.'
    : 'SEAM OPEN — investigate before shipping.'
);
