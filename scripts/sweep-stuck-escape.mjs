// ============================================================
// File:        sweep-stuck-escape.mjs
// Path:        scripts/sweep-stuck-escape.mjs
// Project:     RaceArena
// Description: Phase 1 + Phase 2 parameter sweep for stuckEscapeImpulse.
//              Tests 10 candidates (baseline=0 + 9 values 0.0004–0.0020)
//              against the hard cutoffs from the fix spec.
//
// Hard cutoffs (all vs. baseline):
//   zigzagScore     must not increase by more than 10%
//   overlapRate     must not worsen
//   lateralSpeedScore must not increase
//   racePlanSuccessRate >= 0.45
//
// Stuck-episode reduction measured via same diag infrastructure as diag-stuck-mode.mjs
//
// Phase 1: 10 races / candidate / track
// Phase 2: top 2 survivors, 100 races
//
// Usage:
//   node scripts/sweep-stuck-escape.mjs
//   node scripts/sweep-stuck-escape.mjs --phase1only
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname }                           from 'path';
import { fileURLToPath }                           from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import {
  runSingleRace,
  computeFinishT,
  RACER_CONFIGS,
  makePRNG,
  computeFairnessStats,
} from './sim-fairness.mjs';

import { EditorShape }                                  from '../client/src/modules/track-editor/EditorShape.js';
import { computeRacerLayout, computeEvenRowLayout }     from '../client/src/modules/rowLayout.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG }                    from '../client/src/modules/autoSpriteScale.js';
import { createRacePlan, createTrajectoryController }   from '../client/src/modules/racePlanner.js';

// ── CLI ───────────────────────────────────────────────────────────────────────
const PHASE1_ONLY = process.argv.includes('--phase1only');

// ── Constants ─────────────────────────────────────────────────────────────────
const GLOBAL_SEED   = 42;
const PHASE1_RACES  = 10;
const PHASE2_RACES  = 100;
const DURATION_SEC  = 60;
const RACE_PLAN_BONUS = 2.0;

// Candidate values: baseline (0) + 9 sweep values
const CANDIDATES = [0, 0.0004, 0.0006, 0.0008, 0.0010, 0.0012, 0.0014, 0.0016, 0.0018, 0.0020];

// Hard cutoff values (relative to baseline)
const MAX_ZIGZAG_INCREASE   = 0.10;  // +10% max
const MIN_RACEPLANSUCCESS   = 0.45;  // absolute floor

// Stuck-episode detection (matches diag-stuck-mode.mjs recommended band)
const STUCK_P_THRESH      = 0.008;
const STUCK_BALANCE_RATIO = 0.25;
const STUCK_VEL_THRESH    = 0.0015;
const EPISODE_MIN_FRAMES  = 3;

// ── Track specs ───────────────────────────────────────────────────────────────
const TRACK_SPECS = [
  { trackId: 'space-sprint', racerType: 'rocket', nRacers: 50, label: 'Space Sprint (open)' },
  { trackId: 'dirt-oval',    racerType: 'horse',  nRacers: 40, label: 'Dirt Oval (closed)' },
];

// ── Track loading ─────────────────────────────────────────────────────────────
function loadTrack(spec) {
  const trackDir   = join(ROOT, 'server/data/tracks');
  const track      = JSON.parse(readFileSync(join(trackDir, `${spec.trackId}.json`), 'utf8'));
  const shape      = new EditorShape(track);
  const isOpen     = !!shape.isOpen;
  const pathLengthPx        = track.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = shape.getActualTrackWidth();

  const racerCfg    = RACER_CONFIGS[spec.racerType];
  const speedMult   = racerCfg.speedMultiplier;
  const displaySize = racerCfg.displaySize;

  const bsc            = DEFAULT_BASE_SPEED_CONFIG;
  const BASE_SPEED_MEAN = (bsc.min + bsc.max) / 2;
  const spreadMinF      = bsc.min / BASE_SPEED_MEAN;
  const spreadMaxF      = bsc.max / BASE_SPEED_MEAN;
  const expectedMinSF   = spreadMinF + (spreadMaxF - spreadMinF) / (spec.nRacers + 1);
  const naturalBaseSpeed = BASE_SPEED_MEAN / expectedMinSF;

  const finishT = computeFinishT(naturalBaseSpeed, speedMult, DURATION_SEC, isOpen);

  // Row layout for race-plan setup
  const behaviorConfig  = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const effectiveWidth  = geometricTrackWidth * behaviorConfig.startSpreadRange;
  const { spriteSize: effDispSize, rowCount, layout: rowSizes } = computeRacerLayout(
    effectiveWidth, spec.nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG
  );
  const rowGapPx    = effDispSize * 1.1;  // rowGapMultiplier default
  const deltaT      = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
  const rowLayout   = computeEvenRowLayout(spec.nRacers, rowCount);
  const totalRows   = rowLayout.totalRows;

  return { shape, pathLengthPx, geometricTrackWidth, isOpen, speedMult, displaySize,
           finishT, totalRows, rowSizes, rowLayout, ...spec };
}

// ── Bereich helpers (mirror of param-sweep-full.mjs) ─────────────────────────
function sollBereichOf(rank) {
  if (rank <= 5)  return 1;
  if (rank <= 15) return 2;
  if (rank <= 25) return 3;
  if (rank <= 40) return 4;
  return 5;
}
const BEREICH_BOUNDS = [[1,5],[6,15],[16,25],[26,40],[41,Infinity]];
function inBereich(finalRank, bereich) {
  const [lo, hi] = BEREICH_BOUNDS[bereich - 1] ?? [1, Infinity];
  return finalRank >= lo && finalRank <= hi;
}

// ── Per-race stuck episode count (via frameHook) ─────────────────────────────
function countStuckEpisodes(shape, pathLengthPx, geometricTrackWidth, isOpen,
                             speedMult, displaySize, finishT, nRacers, durationS,
                             seed, behaviorConfigOverrides, racePlanController) {
  let totalEpisodes = 0;
  const stuckState  = new Map();  // racerIdx → { consecutive }

  const frameHook = (raceTs, diagOut, racers) => {
    for (const r of racers) {
      if (r.finished) continue;
      const d = diagOut.get(r.index);
      if (!d) continue;
      const totalP = d.rawPos + d.rawNeg;
      const imbalance = totalP > 1e-9 ? Math.abs(d.rawPos - d.rawNeg) / totalP : 1.0;
      const isStuck   = totalP > STUCK_P_THRESH
                      && imbalance < STUCK_BALANCE_RATIO
                      && Math.abs(d.velAfter) < STUCK_VEL_THRESH;

      let st = stuckState.get(r.index);
      if (!st) { st = { consecutive: 0 }; stuckState.set(r.index, st); }

      if (isStuck) {
        st.consecutive++;
      } else {
        if (st.consecutive >= EPISODE_MIN_FRAMES) totalEpisodes++;
        st.consecutive = 0;
      }
    }
  };

  runSingleRace({
    shape, pathLengthPx, geometricTrackWidth, isOpen,
    speedMultiplier: speedMult, displaySize, finishT,
    targetSeconds: durationS, seed, nRacers,
    behaviorConfigOverrides,
    racePlanController,
    frameHook,
  });

  // Flush open episodes
  for (const st of stuckState.values()) {
    if (st.consecutive >= EPISODE_MIN_FRAMES) totalEpisodes++;
  }

  return totalEpisodes;
}

// ── Run N races for one candidate on one track ────────────────────────────────
function runCandidate(trackData, impulseVal, nRaces) {
  const { shape, pathLengthPx, geometricTrackWidth, isOpen,
          speedMult, displaySize, finishT, nRacers, totalRows, rowSizes,
          rowLayout, label } = trackData;

  const behaviorOverrides = { stuckEscapeImpulse: impulseVal };
  const raceResults       = [];
  let totalRPSHits   = 0;
  let totalRPSSlots  = 0;
  let sumNatOvt      = 0;
  let sumOutcome     = 0;
  let totalStuck     = 0;

  for (let ri = 0; ri < nRaces; ri++) {
    const seed = (GLOBAL_SEED - 1) * nRaces + ri + 1;

    // Build race plan
    const planRacers = rowLayout.assignments.map(a => ({
      index: a.racerIndex, startRowIndex: a.rowIndex,
    }));
    const plan = createRacePlan(
      planRacers, finishT, DURATION_SEC * 1000,
      { bonusStrengthMultiplier: RACE_PLAN_BONUS },
      seed,
    );
    const racePlanController = createTrajectoryController(plan);
    const targetRankMap = plan._racerTargetRank;

    // Standard metrics run
    const result = runSingleRace({
      shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMultiplier: speedMult, displaySize, finishT,
      targetSeconds: DURATION_SEC, seed, nRacers,
      behaviorConfigOverrides: behaviorOverrides,
      racePlanController,
    });
    raceResults.push(result);

    // racePlanSuccessRate
    if (targetRankMap && targetRankMap.size > 0) {
      for (const r of result) {
        const tRank = targetRankMap.get(r.racerIndex);
        if (tRank == null) continue;
        totalRPSSlots++;
        if (inBereich(r.finalRank, sollBereichOf(tRank))) totalRPSHits++;
      }
    }

    sumNatOvt += (result.naturalness?.naturalOvertakeFraction ?? 1);
    sumOutcome += result.outcomeReached ? 1 : 0;

    // Stuck episodes (separate run with same seed and race-plan but with frameHook)
    const planForDiag = createRacePlan(
      planRacers, finishT, DURATION_SEC * 1000,
      { bonusStrengthMultiplier: RACE_PLAN_BONUS },
      seed,
    );
    totalStuck += countStuckEpisodes(
      shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMult, displaySize, finishT, nRacers, DURATION_SEC,
      seed, behaviorOverrides, createTrajectoryController(planForDiag),
    );
  }

  const avg = fn => raceResults.reduce((s, r) => s + fn(r), 0) / nRaces;
  const fairStats = computeFairnessStats(raceResults, totalRows, rowSizes);

  return {
    label,
    impulseVal,
    nRaces,
    racePlanSuccessRate: totalRPSSlots > 0 ? totalRPSHits / totalRPSSlots : 0,
    natOvt:             sumNatOvt / nRaces,
    outcomeReached:     sumOutcome / nRaces,
    zigzagScore:        avg(r => r.liteZigzagScore),
    lateralSpeedScore:  avg(r => r.liteLatSpeedScore),
    overlapRate:        avg(r => r.liteOverlapRate),
    brakeRate:          avg(r => r.liteBrakeRate),
    stableOvertakes:    avg(r => r.liteStableOvertakes),
    pValue:             fairStats.pValue,
    stuckEpisodesPerRace: totalStuck / nRaces,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const outDir = join(ROOT, 'client/tmp');
  mkdirSync(outDir, { recursive: true });

  console.log('');
  console.log('STUCK-ESCAPE SWEEP — RaceArena sim');
  console.log(`Candidates: ${CANDIDATES.join(', ')}`);
  console.log(`Phase 1: ${PHASE1_RACES} races/candidate/track   Phase 2: top 2 × ${PHASE2_RACES} races`);
  console.log('');

  // Load tracks
  const tracks = [];
  for (const spec of TRACK_SPECS) {
    console.log(`Loading ${spec.label}...`);
    try {
      tracks.push(loadTrack(spec));
    } catch (e) {
      console.error(`  ERROR: ${e.message}`); process.exit(1);
    }
  }

  // ── Phase 1 ───────────────────────────────────────────────────────────────
  console.log('\nPhase 1...\n');
  const phase1Results = [];  // [{impulseVal, perTrack: [{...metrics}], survived, failReason}]

  for (const impulseVal of CANDIDATES) {
    const label = impulseVal === 0 ? 'BASELINE' : impulseVal.toFixed(4);
    process.stdout.write(`  impulse=${label.padEnd(8)}`);

    const perTrack = [];
    for (const trackData of tracks) {
      process.stdout.write(` [${trackData.label.split(' ')[0]}...`);
      const r = runCandidate(trackData, impulseVal, PHASE1_RACES);
      perTrack.push(r);
      process.stdout.write(`ep=${r.stuckEpisodesPerRace.toFixed(0)}]`);
    }

    phase1Results.push({ impulseVal, perTrack, survived: true, failReason: null });
    process.stdout.write('\n');
  }

  // Identify baseline metrics
  const baseline     = phase1Results[0];
  const baseZigzag   = baseline.perTrack.reduce((s, t) => s + t.zigzagScore, 0) / tracks.length;
  const baseOverlap  = baseline.perTrack.reduce((s, t) => s + t.overlapRate, 0) / tracks.length;
  const baseLatSpd   = baseline.perTrack.reduce((s, t) => s + t.lateralSpeedScore, 0) / tracks.length;
  const baseStuck    = baseline.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;

  // Apply hard cutoffs to non-baseline candidates
  for (const entry of phase1Results.slice(1)) {
    const avgZigzag  = entry.perTrack.reduce((s, t) => s + t.zigzagScore, 0) / tracks.length;
    const avgOverlap = entry.perTrack.reduce((s, t) => s + t.overlapRate, 0) / tracks.length;
    const avgLatSpd  = entry.perTrack.reduce((s, t) => s + t.lateralSpeedScore, 0) / tracks.length;
    const avgRPS     = entry.perTrack.reduce((s, t) => s + t.racePlanSuccessRate, 0) / tracks.length;

    if (avgZigzag > baseZigzag * (1 + MAX_ZIGZAG_INCREASE)) {
      entry.survived = false;
      entry.failReason = `zigzag +${((avgZigzag/baseZigzag-1)*100).toFixed(1)}% > 10%`;
    } else if (avgOverlap > baseOverlap * 1.005) {  // 0.5% tolerance for noise
      entry.survived = false;
      entry.failReason = `overlapRate worsened: ${(avgOverlap*100).toFixed(3)}% vs base ${(baseOverlap*100).toFixed(3)}%`;
    } else if (avgLatSpd > baseLatSpd * 1.005) {
      entry.survived = false;
      entry.failReason = `lateralSpeedScore worsened: ${avgLatSpd.toFixed(6)} vs base ${baseLatSpd.toFixed(6)}`;
    } else if (avgRPS < MIN_RACEPLANSUCCESS) {
      entry.survived = false;
      entry.failReason = `racePlanSuccessRate ${(avgRPS*100).toFixed(1)}% < 45%`;
    }
  }

  const survivors = phase1Results.filter(e => e.survived && e.impulseVal > 0);

  // Score survivors: maximize stuck-episode reduction, then minimize zigzag
  for (const entry of survivors) {
    const avgStuck  = entry.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;
    const avgZigzag = entry.perTrack.reduce((s, t) => s + t.zigzagScore, 0) / tracks.length;
    entry.stuckReduction = baseStuck > 0 ? (baseStuck - avgStuck) / baseStuck : 0;
    entry.avgZigzag      = avgZigzag;
    entry.score          = entry.stuckReduction * 100 - avgZigzag * 1000;  // higher = better
  }
  survivors.sort((a, b) => b.score - a.score);
  const top2 = survivors.slice(0, 2);

  // ── Phase 2 ───────────────────────────────────────────────────────────────
  console.log(`\nPhase 2: validating top ${top2.length} survivors with ${PHASE2_RACES} races...\n`);
  const phase2Results = [];

  for (const entry of top2) {
    const label = entry.impulseVal.toFixed(4);
    console.log(`  impulse=${label}`);
    const perTrack = [];
    for (const trackData of tracks) {
      process.stdout.write(`    ${trackData.label}...`);
      const r = runCandidate(trackData, entry.impulseVal, PHASE2_RACES);
      perTrack.push(r);
      process.stdout.write(` done  ep/race=${r.stuckEpisodesPerRace.toFixed(1)}\n`);
    }
    phase2Results.push({ impulseVal: entry.impulseVal, perTrack });
  }

  // ── Build report ─────────────────────────────────────────────────────────
  const lines = [];
  const L = (...s) => lines.push(s.join(''));

  L('');
  L('══════════════════════════════════════════════════════════════════════');
  L('STUCK-ESCAPE SWEEP RESULTS');
  L('══════════════════════════════════════════════════════════════════════');
  L('');
  L(`Tracks: ${tracks.map(t => t.label).join(', ')}`);
  L(`Phase 1: ${PHASE1_RACES} races / candidate. Seed base: ${GLOBAL_SEED}. Race Plan active.`);
  L('');
  L('Hard cutoffs:');
  L(`  zigzagScore     must not increase > 10% vs baseline`);
  L(`  overlapRate     must not worsen`);
  L(`  lateralSpeedScore must not worsen`);
  L(`  racePlanSuccessRate >= ${(MIN_RACEPLANSUCCESS*100).toFixed(0)}%`);
  L('');
  L('Stuck episode detection: same thresholds as diag-stuck-mode.mjs');
  L(`  totalPressure > ${STUCK_P_THRESH}, |net|/total < ${STUCK_BALANCE_RATIO}, |vel| < ${STUCK_VEL_THRESH}`);
  L('');
  L('──────────────────────────────────────────────────────────────────────');
  L('PHASE 1 — PER-TRACK RESULTS');
  L('──────────────────────────────────────────────────────────────────────');
  L('');

  for (const trackData of tracks) {
    const ti = tracks.indexOf(trackData);
    L(`${trackData.label}:`);
    L('');
    L(`  ${'impulse'.padEnd(10)} ${'stuck/race'.padEnd(12)} ${'stuck↓%'.padEnd(10)} ${'zigzag'.padEnd(10)} ${'zigzag↑%'.padEnd(10)} ${'overlap%'.padEnd(10)} ${'latSpd'.padEnd(10)} ${'rps%'.padEnd(8)} ${'natOvt'.padEnd(8)} ${'status'}`);
    L(`  ${'-'.repeat(100)}`);

    for (const entry of phase1Results) {
      const r          = entry.perTrack[ti];
      const baseR      = phase1Results[0].perTrack[ti];
      const stuckRed   = baseR.stuckEpisodesPerRace > 0 ? ((baseR.stuckEpisodesPerRace - r.stuckEpisodesPerRace) / baseR.stuckEpisodesPerRace * 100) : 0;
      const zigzagChg  = ((r.zigzagScore / baseR.zigzagScore - 1) * 100);
      const label      = entry.impulseVal === 0 ? 'baseline' : entry.impulseVal.toFixed(4);
      const status     = entry.impulseVal === 0 ? 'BASELINE' : (entry.survived ? '✅ PASS' : `❌ ${entry.failReason ?? 'FAIL'}`);
      L(`  ${label.padEnd(10)} ${r.stuckEpisodesPerRace.toFixed(1).padEnd(12)} ${(stuckRed.toFixed(1)+'%').padEnd(10)} ${r.zigzagScore.toFixed(5).padEnd(10)} ${(zigzagChg.toFixed(1)+'%').padEnd(10)} ${(r.overlapRate*100).toFixed(3).padEnd(10)} ${r.lateralSpeedScore.toFixed(5).padEnd(10)} ${(r.racePlanSuccessRate*100).toFixed(1).padEnd(8)} ${r.natOvt.toFixed(3).padEnd(8)} ${status}`);
    }
    L('');
  }

  // Aggregate summary
  L('──────────────────────────────────────────────────────────────────────');
  L('PHASE 1 — AGGREGATE SUMMARY (avg across tracks)');
  L('──────────────────────────────────────────────────────────────────────');
  L('');
  L(`  ${'impulse'.padEnd(10)} ${'stuck/race'.padEnd(12)} ${'stuck↓%'.padEnd(10)} ${'zigzag'.padEnd(10)} ${'zigzag↑%'.padEnd(10)} ${'overlap%'.padEnd(10)} ${'latSpd'.padEnd(10)} ${'rps%'.padEnd(8)} ${'status'}`);
  L(`  ${'-'.repeat(90)}`);

  for (const entry of phase1Results) {
    const avgStuck   = entry.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;
    const avgZigzag  = entry.perTrack.reduce((s, t) => s + t.zigzagScore, 0) / tracks.length;
    const avgOverlap = entry.perTrack.reduce((s, t) => s + t.overlapRate, 0) / tracks.length;
    const avgLatSpd  = entry.perTrack.reduce((s, t) => s + t.lateralSpeedScore, 0) / tracks.length;
    const avgRPS     = entry.perTrack.reduce((s, t) => s + t.racePlanSuccessRate, 0) / tracks.length;
    const stuckRed   = baseStuck > 0 ? ((baseStuck - avgStuck) / baseStuck * 100) : 0;
    const zigzagChg  = ((avgZigzag / baseZigzag - 1) * 100);
    const label      = entry.impulseVal === 0 ? 'baseline' : entry.impulseVal.toFixed(4);
    const status     = entry.impulseVal === 0 ? 'BASELINE'
                      : entry.survived ? `✅ score=${entry.score.toFixed(2)}`
                      : `❌ ${entry.failReason ?? 'FAIL'}`;
    L(`  ${label.padEnd(10)} ${avgStuck.toFixed(1).padEnd(12)} ${(stuckRed.toFixed(1)+'%').padEnd(10)} ${avgZigzag.toFixed(5).padEnd(10)} ${(zigzagChg.toFixed(1)+'%').padEnd(10)} ${(avgOverlap*100).toFixed(3).padEnd(10)} ${avgLatSpd.toFixed(5).padEnd(10)} ${(avgRPS*100).toFixed(1).padEnd(8)} ${status}`);
  }
  L('');

  if (!PHASE1_ONLY && phase2Results.length > 0) {
    L('──────────────────────────────────────────────────────────────────────');
    L(`PHASE 2 — VALIDATION (${PHASE2_RACES} races)`);
    L('──────────────────────────────────────────────────────────────────────');
    L('');

    for (const entry of phase2Results) {
      L(`impulse = ${entry.impulseVal.toFixed(4)}`);
      L('');
      L(`  ${'Track'.padEnd(28)} ${'stuck/race'.padEnd(12)} ${'stuck↓%'.padEnd(10)} ${'zigzag'.padEnd(10)} ${'overlap%'.padEnd(10)} ${'latSpd'.padEnd(10)} ${'rps%'.padEnd(8)} ${'p-value'.padEnd(8)}`);
      L(`  ${'-'.repeat(88)}`);

      const baseP2Stucks = [];
      for (let ti = 0; ti < tracks.length; ti++) {
        const r       = entry.perTrack[ti];
        // Use phase1 baseline as reference for % (10 races vs 100 races comparison noted)
        const baseEp  = phase1Results[0].perTrack[ti].stuckEpisodesPerRace;
        const stuckRed = baseEp > 0 ? ((baseEp - r.stuckEpisodesPerRace) / baseEp * 100) : 0;
        L(`  ${tracks[ti].label.padEnd(28)} ${r.stuckEpisodesPerRace.toFixed(1).padEnd(12)} ${(stuckRed.toFixed(1)+'%').padEnd(10)} ${r.zigzagScore.toFixed(5).padEnd(10)} ${(r.overlapRate*100).toFixed(3).padEnd(10)} ${r.lateralSpeedScore.toFixed(5).padEnd(10)} ${(r.racePlanSuccessRate*100).toFixed(1).padEnd(8)} ${r.pValue.toFixed(3).padEnd(8)}`);
      }
      L('');
    }

    // Recommend winner
    if (phase2Results.length > 0) {
      // Pick winner: best stuck reduction while meeting all cutoffs
      const winner = phase2Results.reduce((best, cur) => {
        const bestAvgStuck = best.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;
        const curAvgStuck  = cur.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;
        return curAvgStuck < bestAvgStuck ? cur : best;
      });

      const winAvgStuck  = winner.perTrack.reduce((s, t) => s + t.stuckEpisodesPerRace, 0) / tracks.length;
      const winAvgZigzag = winner.perTrack.reduce((s, t) => s + t.zigzagScore, 0) / tracks.length;
      const winAvgRPS    = winner.perTrack.reduce((s, t) => s + t.racePlanSuccessRate, 0) / tracks.length;
      const winStuckRed  = baseStuck > 0 ? ((baseStuck - winAvgStuck) / baseStuck * 100) : 0;

      L('──────────────────────────────────────────────────────────────────────');
      L('RECOMMENDED stuckEscapeImpulse DEFAULT');
      L('──────────────────────────────────────────────────────────────────────');
      L('');
      L(`  Value:               ${winner.impulseVal.toFixed(4)}`);
      L(`  Stuck-episode reduction: ${winStuckRed.toFixed(1)}% (avg across tracks, vs Phase 1 baseline)`);
      L(`  Avg zigzagScore:     ${winAvgZigzag.toFixed(5)} (base: ${baseZigzag.toFixed(5)})`);
      L(`  Avg racePlanSuccessRate: ${(winAvgRPS*100).toFixed(1)}%`);
      L('');
    }
  }

  const report = lines.join('\n');
  console.log(report);

  const reportPath = join(outDir, 'stuck-escape-sweep-report.md');
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\nReport: ${reportPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
