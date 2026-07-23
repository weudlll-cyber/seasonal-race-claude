// ============================================================
// File:        scripts/diag/micro-divergence.mjs
// Project:     RaceArena — parity diagnostic (report-only, no shipped-code change)
//
// PURPOSE: localize the residual browser↔sim micro-divergence on searound / manta / 40 / seed 1.
//
// METHOD: the per-frame FORCES are shared (FORCE-PARITY), so any residual divergence lives in the
// INPUT DERIVATIONS the two engines compute before the shared step. The single suspected seam is the
// CLOSED-TRACK DURATION MODEL: for a "60 s" Quick-Test the browser derives finishT from the setting
// (60 → 2 laps) but derives race_baseSpeed + the re-roll schedule + the plan duration from the
// NOMINAL duration `estimatedSecondsPerLap·laps ≈ 28 s`; the sim uses the raw setting (60 s) for all
// of those. So we drive the SHARED runSingleRace TWICE with the SAME seed/grid but two duration
// inputs — Run A = sim-native (targetSeconds 60, plan 60 000 ms), Run B = browser-faithful
// (targetSeconds 28, plan 28 000 ms) — and diff. Because both runs use the identical shared loop,
// every difference is attributable to the duration inputs alone (no from-scratch mirror, no
// reimplementation risk). Run A is validated against the committed step-2a acceptance order.
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
import { lapsFromDuration, estimatedSecondsPerLap } from '../../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG as DYN,
  DEFAULT_RACE_BEHAVIOR_CONFIG as BEH,
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

const DUR_SETTING = 60;
const finishT = lapsFromDuration(DUR_SETTING); // 2 laps — identical on both sides
const nominalTargetDur = estimatedSecondsPerLap(spd) * lapsFromDuration(DUR_SETTING);
const quickClosedDuration = Math.round(nominalTargetDur); // browser's targetDuration

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

function run(seed, targetSeconds, planDurMs) {
  const raceRng = makeRaceRng(seed).physics;
  const rowLayout = computeEvenRowLayout(N, totalRows, raceRng);
  const planRacers = rowLayout.assignments
    .map((a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex }))
    .sort((x, y) => x.index - y.index);
  const plan = createRacePlan(planRacers, finishT, planDurMs, planConfig(), seed);
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
    displaySize, bodyFillX, bodyFillY, finishT, targetSeconds, seed, nRacers: N,
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
  // ranking of racer indices by t at this checkpoint (1 = furthest)
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

console.log('=== searound / manta / 40 — duration-model A/B diff (Run A = sim --dur=60, Run B = browser-faithful) ===');
console.log(`geometry: pathLengthPx=${pathLengthPx} width=${geometricTrackWidth} rows=${totalRows} isOpen=${isOpen}`);
console.log(`finishT=${finishT} (both).  nominalTargetDur=${nominalTargetDur.toFixed(3)}  quickClosedDuration(browser targetDuration)=${quickClosedDuration}`);
console.log(`Run A: targetSeconds=60  planDurMs=60000     Run B: targetSeconds=${quickClosedDuration}  planDurMs=${quickClosedDuration * 1000}\n`);

for (const seed of SEEDS) {
  const A = run(seed, 60, 60000);
  const B = run(seed, quickClosedDuration, quickClosedDuration * 1000);
  const ordA = orderByFinish(A.finish), ordB = orderByFinish(B.finish);
  const gridSame =
    JSON.stringify(A.result.map((r) => [r.racerIndex, r.startRowIndex, r.indexInRow]).sort()) ===
    JSON.stringify(B.result.map((r) => [r.racerIndex, r.startRowIndex, r.indexInRow]).sort());
  const marginA = A.finish[ordA[1]].timeMs - A.finish[ordA[0]].timeMs;
  const medRatio = A.finish[ordA[19]].timeMs / B.finish[ordB[19]].timeMs;
  const top5overlap = ordA.slice(0, 5).filter((i) => ordB.slice(0, 5).includes(i)).length;
  console.log(`--- seed ${seed} ---  t0 grid identical:${gridSame}  median-time ratio A/B: ${medRatio.toFixed(3)}`);
  console.log(`  Run A top5: ${ordA.slice(0, 5).map((i) => NAMES[i]).join(', ')}   (winner margin ${marginA.toFixed(2)}s)`);
  console.log(`  Run B top5: ${ordB.slice(0, 5).map((i) => NAMES[i]).join(', ')}`);
  console.log(`  winner A=${NAMES[ordA[0]]}  winner B=${NAMES[ordB[0]]}  winner robust:${ordA[0] === ordB[0]}  top-5 set overlap:${top5overlap}/5`);

  if (seed === 1) {
    // Checkpoint stream diff (per-racer t rank at each 5 s of physicsTs)
    console.log('  checkpoint diff (rank agreement of the t-ordering, A vs B):');
    console.log('   physicsTs | A order==B order? | Spearman(A,B)');
    const cpsAll = [...new Set([...A.cps.keys(), ...B.cps.keys()])].sort((a, b) => a - b);
    for (const ts of cpsAll) {
      const a = A.cps.get(ts), b = B.cps.get(ts);
      if (!a || !b) { console.log(`   ${String(ts).padStart(7)} | (only ${a ? 'A' : 'B'} still racing — B finished first, it is 2.14× faster)`); continue; }
      const ra = rankVectorAt(a), rb = rankVectorAt(b);
      console.log(`   ${String(ts).padStart(7)} |        ${JSON.stringify(ra) === JSON.stringify(rb) ? 'yes' : 'NO '}        |   ${spearman(ra, rb).toFixed(4)}`);
    }
  }
  console.log('');
}
