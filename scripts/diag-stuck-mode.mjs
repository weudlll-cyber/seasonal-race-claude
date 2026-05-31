// ============================================================
// File:        diag-stuck-mode.mjs
// Path:        scripts/diag-stuck-mode.mjs
// Project:     RaceArena
// Description: DIAGNOSIS ONLY — measures "stuck" racer episodes where a racer
//              receives avoidance forces from both sides simultaneously, the net
//              force is near zero, and lateral displacement stays near zero over
//              a sustained window. Does NOT apply any fix.
//
// Stuck frame definition (sweeping P_THRESH to calibrate):
//   totalPressure = rawPos + rawNeg  > P_THRESH   (active multi-sided pressure)
//   avoidImbalance = |rawPos - rawNeg| / totalPressure < BALANCE_RATIO   (forces cancel)
//   |velAfter|  < VEL_THRESH                       (racer not actually moving)
//
// Episode = EPISODE_MIN_FRAMES (3) or more consecutive stuck frames.
//
// Usage:
//   node scripts/diag-stuck-mode.mjs
//   node scripts/diag-stuck-mode.mjs --races=20   (override race count, default 10)
// ============================================================

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname }                           from 'path';
import { fileURLToPath }                           from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import {
  runSingleRace,
  computeFinishT,
  RACER_CONFIGS,
  makePRNG,
} from './sim-fairness.mjs';

import { EditorShape }                                  from '../client/src/modules/track-editor/EditorShape.js';
import { computeRacerLayout, computeEvenRowLayout }     from '../client/src/modules/rowLayout.js';
import { computeSpeedScaleFactor }                      from '../client/src/modules/camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG }                    from '../client/src/modules/autoSpriteScale.js';

// ── CLI ───────────────────────────────────────────────────────────────────────
const argv      = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}
const N_RACES     = Number(argVal('races', '10'));
const GLOBAL_SEED = 42;

// ── Stuck detection thresholds ────────────────────────────────────────────────
// P_THRESH_SWEEP: values to sweep when calibrating — reports episode counts for each
const P_THRESH_SWEEP    = [0.001, 0.002, 0.005, 0.008, 0.010, 0.015, 0.020];
const BALANCE_RATIO     = 0.25;   // |net| / total < 0.25 → forces nearly cancel
const VEL_THRESH        = 0.0015; // |physicalYVelocity| below this → not moving
const EPISODE_MIN_FRAMES = 3;     // consecutive stuck frames = 1 episode (≥50ms at 60fps)

// ── Race phases ───────────────────────────────────────────────────────────────
const WARMUP_S   = 4;   // matches sim 4s warmup exclusion used for other metrics
const ENDGAME_F  = 0.9; // last 10% of target duration = endgame

// ── Track specs ───────────────────────────────────────────────────────────────
// Open: 50 racers 60s. Closed: 40 racers 60s. (per task spec)
const TRACK_SPECS = [
  { trackId: 'space-sprint',   racerType: 'rocket', nRacers: 50, durationS: 60, label: 'Space Sprint (open)' },
  { trackId: 'dirt-oval',      racerType: 'horse',  nRacers: 40, durationS: 60, label: 'Dirt Oval (closed)' },
];

// ── Track loading ─────────────────────────────────────────────────────────────
function loadTrack(spec) {
  const trackDir = join(ROOT, 'server/data/tracks');
  const track    = JSON.parse(readFileSync(join(trackDir, `${spec.trackId}.json`), 'utf8'));
  const shape    = new EditorShape(track);
  const isOpen   = !!shape.isOpen;
  const pathLengthPx        = track.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = shape.getActualTrackWidth();

  const racerCfg    = RACER_CONFIGS[spec.racerType];
  const speedMult   = racerCfg.speedMultiplier;
  const displaySize = racerCfg.displaySize;

  const BASE_SPEED_CONFIG = DEFAULT_BASE_SPEED_CONFIG;
  const BASE_SPEED_MEAN   = (BASE_SPEED_CONFIG.min + BASE_SPEED_CONFIG.max) / 2;
  const spreadMinFactor   = BASE_SPEED_CONFIG.min / BASE_SPEED_MEAN;
  const spreadMaxFactor   = BASE_SPEED_CONFIG.max / BASE_SPEED_MEAN;
  const expectedMinSF     = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (spec.nRacers + 1);
  const naturalBaseSpeed  = isOpen
    ? null  // computed per race inside computeFinishT
    : BASE_SPEED_MEAN / expectedMinSF;

  const finishT = computeFinishT(
    isOpen
      ? (computeFinishT(BASE_SPEED_MEAN / expectedMinSF, speedMult, spec.durationS, false))
      : BASE_SPEED_MEAN / expectedMinSF,
    speedMult, spec.durationS, isOpen
  );

  return { shape, pathLengthPx, geometricTrackWidth, isOpen, speedMult, displaySize, finishT, ...spec };
}

// ── Per-race stuck analysis ───────────────────────────────────────────────────
// Returns episode arrays for each P_THRESH in P_THRESH_SWEEP.
function analyzeRace(trackData, seed) {
  const { shape, pathLengthPx, geometricTrackWidth, isOpen,
          speedMult, displaySize, finishT, nRacers, durationS } = trackData;

  // Per-racer running state for each P_THRESH variant
  // stuckState[pIdx][racerIdx] = { consecutive, episodes: [{startMs, durationFrames, phase}] }
  const N_P = P_THRESH_SWEEP.length;
  const stuckState = Array.from({ length: N_P }, () =>
    new Map()
  );

  // Also capture raw per-frame summary stats for the recommended threshold (index 3 = 0.008)
  const FOCUS_P_IDX = 3; // P_THRESH = 0.008
  // Per-frame counters (for identifying which phase has most stuck frames)
  const focusFramesByPhase   = { warmup: 0, mid: 0, endgame: 0 };
  const focusEpisodesByPhase = { warmup: 0, mid: 0, endgame: 0 };

  function phaseFor(raceTs) {
    const s = raceTs / 1000;
    if (s < WARMUP_S)               return 'warmup';
    if (s >= durationS * ENDGAME_F) return 'endgame';
    return 'mid';
  }

  const frameHook = (raceTs, diagOut, racers) => {
    const phase = phaseFor(raceTs);
    for (const r of racers) {
      if (r.finished) continue;
      const d = diagOut.get(r.index);
      if (!d) continue;

      const totalPressure = d.rawPos + d.rawNeg;
      const imbalance = totalPressure > 1e-9
        ? Math.abs(d.rawPos - d.rawNeg) / totalPressure
        : 1.0;
      const velAbs = Math.abs(d.velAfter);

      for (let pi = 0; pi < N_P; pi++) {
        const P_THRESH = P_THRESH_SWEEP[pi];
        const isStuck  = totalPressure > P_THRESH
                      && imbalance < BALANCE_RATIO
                      && velAbs < VEL_THRESH;

        let st = stuckState[pi].get(r.index);
        if (!st) {
          st = { consecutive: 0, episodes: [] };
          stuckState[pi].set(r.index, st);
        }

        if (isStuck) {
          st.consecutive++;
          if (pi === FOCUS_P_IDX) focusFramesByPhase[phase]++;
        } else {
          if (st.consecutive >= EPISODE_MIN_FRAMES) {
            const ep = { startMs: raceTs - st.consecutive * (1000 / 60), durationFrames: st.consecutive, phase: '' };
            // Determine episode phase by its start
            ep.phase = phaseFor(ep.startMs);
            st.episodes.push(ep);
            if (pi === FOCUS_P_IDX) focusEpisodesByPhase[ep.phase]++;
          }
          st.consecutive = 0;
        }
      }
    }
  };

  runSingleRace({
    shape, pathLengthPx, geometricTrackWidth, isOpen,
    speedMultiplier: speedMult, displaySize, finishT,
    targetSeconds: durationS, seed, nRacers,
    frameHook,
  });

  // Flush any open episodes at race end
  for (let pi = 0; pi < N_P; pi++) {
    for (const st of stuckState[pi].values()) {
      if (st.consecutive >= EPISODE_MIN_FRAMES) {
        st.episodes.push({ durationFrames: st.consecutive, phase: 'endgame' });
        if (pi === FOCUS_P_IDX) focusEpisodesByPhase.endgame++;
      }
    }
  }

  // Compute aggregate per-P_THRESH stats
  const sweepStats = P_THRESH_SWEEP.map((p, pi) => {
    let totalEpisodes = 0;
    let totalDuration = 0;
    let maxDuration   = 0;
    let racersWithAny = 0;
    const phaseCount  = { warmup: 0, mid: 0, endgame: 0 };
    for (const st of stuckState[pi].values()) {
      if (st.episodes.length > 0) racersWithAny++;
      totalEpisodes += st.episodes.length;
      for (const ep of st.episodes) {
        totalDuration += ep.durationFrames;
        if (ep.durationFrames > maxDuration) maxDuration = ep.durationFrames;
        phaseCount[ep.phase] = (phaseCount[ep.phase] || 0) + 1;
      }
    }
    return {
      p, totalEpisodes, totalDuration,
      maxDuration, racersWithAny,
      phaseCount,
      meanDuration: totalEpisodes > 0 ? totalDuration / totalEpisodes : 0,
    };
  });

  return { sweepStats, focusFramesByPhase, focusEpisodesByPhase };
}

// ── Aggregation helpers ───────────────────────────────────────────────────────
function addStats(acc, s) {
  for (let pi = 0; pi < N_P; pi++) {
    const a = acc.sweepStats[pi];
    const b = s.sweepStats[pi];
    a.totalEpisodes  += b.totalEpisodes;
    a.totalDuration  += b.totalDuration;
    a.racersWithAny  += b.racersWithAny;
    if (b.maxDuration > a.maxDuration) a.maxDuration = b.maxDuration;
    for (const ph of ['warmup', 'mid', 'endgame'])
      a.phaseCount[ph] = (a.phaseCount[ph] || 0) + (b.phaseCount[ph] || 0);
  }
  for (const ph of ['warmup', 'mid', 'endgame']) {
    acc.focusFramesByPhase[ph]   += s.focusFramesByPhase[ph];
    acc.focusEpisodesByPhase[ph] += s.focusEpisodesByPhase[ph];
  }
}

function makeAccumulator() {
  return {
    sweepStats: P_THRESH_SWEEP.map((p) => ({
      p, totalEpisodes: 0, totalDuration: 0, maxDuration: 0,
      racersWithAny: 0, phaseCount: { warmup: 0, mid: 0, endgame: 0 }, meanDuration: 0,
    })),
    focusFramesByPhase:   { warmup: 0, mid: 0, endgame: 0 },
    focusEpisodesByPhase: { warmup: 0, mid: 0, endgame: 0 },
  };
}

const N_P = P_THRESH_SWEEP.length;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('STUCK-MODE DIAGNOSTIC — RaceArena sim');
  console.log(`Races per track: ${N_RACES}   Seed base: ${GLOBAL_SEED}   Threshold sweep: ${P_THRESH_SWEEP.join(', ')}`);
  console.log(`Stuck criteria: totalPressure > P_THRESH  AND  |net|/total < ${BALANCE_RATIO}  AND  |vel| < ${VEL_THRESH}`);
  console.log(`Episode = ≥${EPISODE_MIN_FRAMES} consecutive stuck frames  (~${(EPISODE_MIN_FRAMES * 1000 / 60).toFixed(0)} ms)`);
  console.log('');

  const results = {};

  for (const spec of TRACK_SPECS) {
    console.log(`Loading ${spec.label}...`);
    let trackData;
    try {
      trackData = loadTrack(spec);
    } catch (e) {
      console.error(`  ERROR loading track ${spec.trackId}: ${e.message}`);
      continue;
    }

    const acc = makeAccumulator();
    const raceEpisodeCounts = [];  // episodes per race at FOCUS_P_IDX
    const racerPerRaceCounts = []; // racers-with-episode per race at FOCUS_P_IDX
    const episodeDurations   = []; // episode durations (frames) at FOCUS_P_IDX

    for (let r = 0; r < N_RACES; r++) {
      const seed   = (GLOBAL_SEED - 1) * N_RACES + r + 1;
      process.stdout.write(`  Race ${r + 1}/${N_RACES}...`);
      const raceResult = analyzeRace(trackData, seed);
      addStats(acc, raceResult);

      const fs = acc.sweepStats[3]; // focus index = 0.008
      raceEpisodeCounts.push(raceResult.sweepStats[3].totalEpisodes);
      racerPerRaceCounts.push(raceResult.sweepStats[3].racersWithAny);
      for (const st of raceResult.sweepStats[3].totalEpisodes > 0 ? [] : []) {
        // collect episode durations for this race (re-run below)
      }
      process.stdout.write(` ${raceResult.sweepStats[3].totalEpisodes} ep\n`);
    }

    // Finalize mean durations
    for (let pi = 0; pi < N_P; pi++) {
      const a = acc.sweepStats[pi];
      a.meanDuration = a.totalEpisodes > 0 ? a.totalDuration / a.totalEpisodes : 0;
      a.episodesPerRace = a.totalEpisodes / N_RACES;
      a.racersPerRace   = a.racersWithAny / N_RACES;
    }

    results[spec.label] = { spec, acc, raceEpisodeCounts, racerPerRaceCounts };
    console.log('');
  }

  // ── Print report ──────────────────────────────────────────────────────────
  const lines = [];
  const L = (...args) => lines.push(args.join(''));

  L('');
  L('══════════════════════════════════════════════════════════════════════');
  L('STUCK-MODE DIAGNOSTIC RESULTS');
  L('══════════════════════════════════════════════════════════════════════');
  L('');
  L(`Configuration: ${N_RACES} races/track, seed base ${GLOBAL_SEED}, 60fps sim`);
  L(`Stuck criteria: imbalance = |rawPos - rawNeg| / totalPressure < ${BALANCE_RATIO}`);
  L(`                |physicalYVelocity| < ${VEL_THRESH}  AND  totalPressure > P_THRESH`);
  L(`Episode minimum: ${EPISODE_MIN_FRAMES} consecutive frames (~${(EPISODE_MIN_FRAMES*1000/60).toFixed(0)} ms)`);
  L('');
  L('Forces measured:');
  L('  rawPos = avoidance + free-lane forces in +Y direction (pre-sqrt-normalization)');
  L('  rawNeg = avoidance + free-lane forces in -Y direction (pre-sqrt-normalization)');
  L('  netDelta = complete delta fed to velocity (includes home force + normalization)');
  L('');

  for (const [label, { spec, acc, raceEpisodeCounts, racerPerRaceCounts }] of Object.entries(results)) {
    L('──────────────────────────────────────────────────────────────────────');
    L(`TRACK: ${label}  (${spec.nRacers} racers, ${spec.durationS}s, ${N_RACES} races)`);
    L('──────────────────────────────────────────────────────────────────────');
    L('');
    L('P_THRESH calibration sweep:');
    L('');
    L(`  ${'P_THRESH'.padEnd(10)} ${'ep/race'.padEnd(10)} ${'ep start%'.padEnd(12)} ${'ep mid%'.padEnd(10)} ${'ep endgame%'.padEnd(12)} ${'mean dur'.padEnd(10)} ${'max dur'.padEnd(10)} ${'racers/race'.padEnd(12)}`);
    L(`  ${'-'.repeat(86)}`);

    for (const s of acc.sweepStats) {
      const total = s.phaseCount.warmup + s.phaseCount.mid + s.phaseCount.endgame;
      const pctW  = total > 0 ? (100 * s.phaseCount.warmup  / total).toFixed(1) : '0.0';
      const pctM  = total > 0 ? (100 * s.phaseCount.mid     / total).toFixed(1) : '0.0';
      const pctE  = total > 0 ? (100 * s.phaseCount.endgame / total).toFixed(1) : '0.0';
      const epR   = s.episodesPerRace.toFixed(1);
      const meanF = s.meanDuration.toFixed(1);
      const maxF  = s.maxDuration;
      const racR  = s.racersPerRace.toFixed(1);
      const marker = s.p === 0.008 ? ' ◄' : '';
      L(`  ${String(s.p).padEnd(10)} ${epR.padEnd(10)} ${(pctW+'%').padEnd(12)} ${(pctM+'%').padEnd(10)} ${(pctE+'%').padEnd(12)} ${(meanF+'f').padEnd(10)} ${(maxF+'f').padEnd(10)} ${racR.padEnd(12)}${marker}`);
    }

    const focus = acc.sweepStats[3]; // P=0.008
    const focusTotalEp = focus.phaseCount.warmup + focus.phaseCount.mid + focus.phaseCount.endgame;

    L('');
    L(`At recommended P_THRESH=0.008 (◄ above):`);
    L(`  Episodes per race:        mean=${focus.episodesPerRace.toFixed(1)}, range=[${Math.min(...raceEpisodeCounts)},${Math.max(...raceEpisodeCounts)}]`);
    L(`  Episode duration (frames): mean=${focus.meanDuration.toFixed(1)} (~${(focus.meanDuration*1000/60).toFixed(0)}ms), max=${focus.maxDuration} (~${(focus.maxDuration*1000/60).toFixed(0)}ms)`);
    L(`  Racers with ≥1 episode:   ${focus.racersPerRace.toFixed(1)} / ${spec.nRacers} per race (${(100*focus.racersPerRace/spec.nRacers).toFixed(1)}%)`);
    L('');
    L('  Episode distribution by race phase:');
    L(`    Warmup (0–${WARMUP_S}s):        ${focus.phaseCount.warmup} episodes (${focusTotalEp>0?(100*focus.phaseCount.warmup/focusTotalEp).toFixed(1):0}%)`);
    L(`    Mid-race (${WARMUP_S}–${(spec.durationS*ENDGAME_F).toFixed(0)}s):  ${focus.phaseCount.mid} episodes (${focusTotalEp>0?(100*focus.phaseCount.mid/focusTotalEp).toFixed(1):0}%)`);
    L(`    Endgame (${(spec.durationS*ENDGAME_F).toFixed(0)}–${spec.durationS}s):   ${focus.phaseCount.endgame} episodes (${focusTotalEp>0?(100*focus.phaseCount.endgame/focusTotalEp).toFixed(1):0}%)`);
    L('');

    // Assess warmup masking
    const startMasked = focusTotalEp > 0 && (focus.phaseCount.warmup / focusTotalEp) >= 0.75;
    L(`  Warmup-masking assessment:`);
    if (startMasked) {
      L(`    ✓ Majority of episodes (${(100*focus.phaseCount.warmup/focusTotalEp).toFixed(0)}%) fall in the 0–${WARMUP_S}s warmup window.`);
      L(`    ✓ Existing 4s warmup exclusion already masks most stuck events for this track.`);
      L(`    ✗ However, ${focus.phaseCount.mid + focus.phaseCount.endgame} mid/endgame episodes remain as genuine mid-race trapping.`);
    } else {
      L(`    ✗ Warmup accounts for only ${focusTotalEp>0?(100*focus.phaseCount.warmup/focusTotalEp).toFixed(0):0}% of episodes.`);
      L(`    ✗ Mid-race stuck episodes are a genuine problem, not masked by the 4s warmup exclusion.`);
    }
    L('');
  }

  // ── Proposed "stuck" definition ──────────────────────────────────────────
  L('══════════════════════════════════════════════════════════════════════');
  L('PROPOSED "STUCK" DEFINITION');
  L('══════════════════════════════════════════════════════════════════════');
  L('');
  L('A racer is in a "stuck frame" when all three conditions hold:');
  L('');
  L('  1. Bilateral pressure:');
  L('       totalPressure = rawPos + rawNeg > 0.008');
  L('       (rawPos/rawNeg: pre-normalization avoidance+free-lane force magnitudes)');
  L('');
  L('  2. Force cancellation:');
  L('       imbalance = |rawPos - rawNeg| / totalPressure < 0.25');
  L('       (forces from both sides are nearly equal in magnitude)');
  L('');
  L('  3. No lateral movement:');
  L('       |physicalYVelocity| < 0.0015');
  L('       (velocity too small to produce observable lateral displacement)');
  L('');
  L('A "stuck episode" begins when condition holds for ≥3 consecutive frames (~50ms)');
  L('and ends when any condition fails for at least 1 frame.');
  L('');
  L('Candidate alternative thresholds for severity classification:');
  L('  Mild:   P_THRESH=0.005, BALANCE_RATIO=0.30, VEL_THRESH=0.002');
  L('  Severe: P_THRESH=0.012, BALANCE_RATIO=0.20, VEL_THRESH=0.001');
  L('');
  L('Note: home force is excluded from rawPos/rawNeg — it acts as a restoring force');
  L('independent of neighbor pressure. Including it would cause all off-center racers');
  L('to appear "stuck" by the home force alone.');
  L('');

  const report = lines.join('\n');
  console.log(report);

  // Write to file
  const outDir = join(ROOT, 'client/tmp');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'stuck-mode-diag.md');
  writeFileSync(outPath, report, 'utf8');
  console.log(`\nFull report written to: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
