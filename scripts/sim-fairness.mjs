// ============================================================
// File:        sim-fairness.mjs
// Path:        scripts/sim-fairness.mjs
// Project:     RaceArena
// Created:     2026-05-17
// Description: Headless fairness simulation — tests whether start-row
//              position affects win probability across all tracks and
//              racer types, with speedBonusMult (catch-up) fully active.
//
//              Key design choices:
//              - baseSpeed uses the N-calibrated natural formula identical
//                to the browser race engine (BASE_SPEED_MEAN / expectedMinSF)
//              - finishT is SHIFTED (not speed) to create 30s / 120s races:
//                  finishT = naturalSpeed × REFERENCE_FPS × targetSeconds
//                This keeps speedBonusMult meaningful and comparable across
//                racer types and durations.
//              - speedBonusMult is always applied (that's what we're testing).
//              - No PNG output, no camera, no rendering — pure physics.
//
// Usage:
//   node scripts/sim-fairness.mjs [--races=50] [--racers=40]
//                                  [--out=client/tmp]
//
// Output:
//   <out>/fairness-data.json   — machine-readable raw data
//   <out>/fairness-report.md   — human-readable Markdown report
// ============================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = join(__dir, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}
const N_RACES = Number(argVal('races', '50'));
const N_RACERS = Number(argVal('racers', '40'));
const OUT_DIR = join(ROOT, argVal('out', 'client/tmp'));

// ── Game modules (same code the browser uses) ─────────────────────────────────
import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeRacersPerRow,
} from '../client/src/modules/rowLayout.js';
import { REFERENCE_FPS } from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
export function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Speed transition easing (mirrors index.jsx) ───────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Racer type configs ────────────────────────────────────────────────────────
// speedMultiplier and displaySize sourced from the respective *RacerType.js files.
// displaySize affects racersPerRow (track capacity) and avoidance pixel distances.
export const RACER_CONFIGS = {
  horse:     { speedMultiplier: 1.00, displaySize: 40 },
  duck:      { speedMultiplier: 0.85, displaySize: 36 },
  snail:     { speedMultiplier: 0.30, displaySize: 35 },
  elephant:  { speedMultiplier: 0.60, displaySize: 44 },
  giraffe:   { speedMultiplier: 0.90, displaySize: 48 },
  snake:     { speedMultiplier: 0.75, displaySize: 36 },
  dragon:    { speedMultiplier: 1.10, displaySize: 50 },
  f1:        { speedMultiplier: 1.20, displaySize: 38 },
  rocket:    { speedMultiplier: 1.25, displaySize: 40 },
  buggy:     { speedMultiplier: 0.95, displaySize: 38 },
  motorbike: { speedMultiplier: 1.05, displaySize: 36 },
  plane:     { speedMultiplier: 1.15, displaySize: 42 },
};

// ── Duration variants (seconds) ───────────────────────────────────────────────
export const DURATION_VARIANTS = [30, 120];

// ── Compute adjusted finishT ──────────────────────────────────────────────────
/**
 * Returns the finishT (t-space target) for a race of targetSeconds duration.
 * baseSpeed stays at the natural N-calibrated value; only the finish line moves.
 *
 * For open tracks finishT is capped at (1 - runoutZone) since the track
 * has a physical end. The effective race will then be shorter than targetSeconds
 * for fast types on short open tracks — still valid, just recorded as-is.
 *
 * @param {number} naturalBaseSpeed  race_baseSpeed (N-calibrated, before speedMultiplier)
 * @param {number} speedMultiplier   racer-type factor
 * @param {number} targetSeconds
 * @param {boolean} isOpen
 * @param {number} [runoutZone=0.05]
 * @returns {number}
 */
export function computeFinishT(naturalBaseSpeed, speedMultiplier, targetSeconds, isOpen, runoutZone = 0.05) {
  const ft = naturalBaseSpeed * speedMultiplier * REFERENCE_FPS * targetSeconds;
  return isOpen ? Math.min(ft, 1.0 - runoutZone) : ft;
}

// ── Single race simulation ────────────────────────────────────────────────────
/**
 * Run one deterministic race and return per-racer results.
 *
 * @param {object} p
 * @param {object}  p.shape                EditorShape instance (or compatible mock)
 * @param {number}  p.pathLengthPx
 * @param {number}  p.geometricTrackWidth  inner→outer width in world pixels
 * @param {boolean} p.isOpen
 * @param {number}  p.speedMultiplier      racer-type factor
 * @param {number}  p.displaySize          sprite size in world pixels
 * @param {number}  p.finishT              adjusted finish line in t-space
 * @param {number}  p.targetSeconds        used for re-roll scheduling
 * @param {number}  p.seed                 PRNG seed
 * @param {number}  p.nRacers
 * @returns {Array<{racerIndex,startRowIndex,indexInRow,finalT,finalRank,finishTime}>}
 */
export function runSingleRace({
  shape,
  pathLengthPx,
  geometricTrackWidth,
  isOpen,
  speedMultiplier,
  displaySize,
  finishT,
  targetSeconds,
  seed,
  nRacers,
}) {
  const rng = makePRNG(seed);
  const savedRandom = Math.random;
  Math.random = rng;

  try {
    const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
    const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
    const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
    const behaviorConfig  = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
    const rowConfig       = { ...DEFAULT_ROW_LAYOUT_CONFIG };
    const dynamicsConfig  = { ...DEFAULT_RACE_DYNAMICS_CONFIG };

    // N-calibrated natural base speed — independent of finishT.
    // Mirrors the formula in sim-race-visual.mjs and index.jsx.
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const race_baseSpeed  = BASE_SPEED_MEAN / expectedMinSF;

    // Row layout
    const rowGapPx       = displaySize * rowConfig.rowGapMultiplier;
    const deltaT         = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
    const effectiveWidth = geometricTrackWidth * behaviorConfig.startSpreadRange;
    const racersPerRow   = computeRacersPerRow(effectiveWidth, displaySize);
    const rowLayout      = computeRowLayout(nRacers, racersPerRow);

    const rowSizeByRow = new Map();
    for (const a of rowLayout.assignments) {
      rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
    }
    const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

    // Re-roll schedule keyed to targetSeconds (the intended race length).
    const rollCount        = Math.max(2, Math.floor(targetSeconds / dynamicsConfig.reRollIntervalDivisor));
    const rollInterval     = ((dynamicsConfig.reRollLastPositionPercent / 100) * targetSeconds * 1000) / rollCount;
    const lastRollDeadline = targetSeconds * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

    // Init racers
    const racers = Array.from({ length: nRacers }, (_, i) => {
      const assignment    = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
      const rowSize       = rowSizeByRow.get(assignment.rowIndex) ?? 1;
      const speedBonus    = computeSpeedBonus(
        assignment.rowIndex, rowGapPx, pathLengthPx, rowConfig.speedBonusFactor,
        finishT, isOpen, rowLayout.totalRows
      );
      // Open track: front row has the largest positive tStart (assembly area).
      // Closed track: row 0 starts at 0, rear rows at negative t (behind start).
      const tStart = isOpen
        ? (rowLayout.totalRows - assignment.rowIndex) * deltaT
        : -(assignment.rowIndex * deltaT);
      const spreadFactor  = (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
      const speedBonusMult = 1 + speedBonus;
      const rollJitter    = (Math.random() - 0.5) * 2 * rollInterval * 0.2;

      const r = {
        index:               i,
        name:                `R${i + 1}`,
        t:                   tStart,
        spreadFactor,
        speedBonusMult,
        baseSpeed:           race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult,
        spreadFactorPrev:    spreadFactor,
        spreadFactorTarget:  spreadFactor,
        transitionStartTime: 0,
        transitionDuration:  dynamicsConfig.reRollTransitionDuration * 1000,
        nextRollTime:        rollInterval + rollJitter,
        finished:            false,
        finishRank:          null,
        finishTime:          null,
        startRowIndex:       assignment.rowIndex,
        indexInRow:          assignment.indexInRow,
        runoutDecay:         1,
        x: 0, y: 0, angle:   0,
        spriteWorldSizePx:      displaySize,
        geometricTrackWidthPx:  geometricTrackWidth,
        pathLengthPx,
      };
      initRacerBehavior(r);
      r.physicalY = computeRowPhysicalY(
        assignment.indexInRow, rowSize, behaviorConfig.startSpreadRange
      );
      return r;
    });

    // World position helper
    const tPos = (t) => ((t % 1) + 1) % 1;
    function computePositions() {
      for (const r of racers) {
        const tNorm = isOpen ? Math.min(r.t, 1) : tPos(r.t);
        const p = shape.getPosition(tNorm, r.physicalY / 2);
        r.x = p.x; r.y = p.y; r.angle = p.angle;
      }
    }

    const DT          = 1000 / 60; // ms per frame at 60 fps
    const maxTime     = Math.max(targetSeconds * 3, 600) * 1000; // safety cap: 3× or 10 min
    let raceTs        = 0;
    let finishedCount = 0;

    // Mixing-quota: fraction of Row-1 racers that have overtaken at least one Row-0
    // racer in t-space by the time avoidanceWarmupMs elapses.
    let mixingQuota    = null;
    let warmupMeasured = false;

    computePositions();

    while (finishedCount < nRacers && raceTs < maxTime) {
      raceTs += DT;

      // Speed re-rolls
      for (const r of racers) {
        if (r.finished) continue;
        if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
          const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
          const halfWidth   = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
          const newTarget   = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(
              BASE_SPEED_MAX / BASE_SPEED_MEAN,
              r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth
            )
          );
          r.spreadFactorPrev    = r.spreadFactor;
          r.spreadFactorTarget  = newTarget;
          r.transitionStartTime = raceTs;
          const jOff = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime = raceTs + rollInterval + jOff;
        }
        const elapsed = raceTs - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const prog = elapsed / r.transitionDuration;
          r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(prog);
          r.baseSpeed    = race_baseSpeed * speedMultiplier * r.spreadFactor * r.speedBonusMult;
        }
      }

      // Advance t (mirrors index.jsx RACING loop — DT/16 calibration matches REFERENCE_FPS=62.5)
      const effectiveBrakeFactor = computeEffectiveBrakeFactor(behaviorConfig, isOpen, raceTs);
      for (const r of racers) {
        if (!r.finished) {
          const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
          const brake = r.avoidanceActive     ? effectiveBrakeFactor : 1.0;
          r.t += r.baseSpeed * boost * brake * (DT / 16);
        }
      }

      // Mixing-quota snapshot: taken at the first frame at or after avoidanceWarmupMs
      if (!warmupMeasured && isOpen && raceTs >= behaviorConfig.avoidanceWarmupMs) {
        const row0Ts   = racers.filter((r) => r.startRowIndex === 0 && !r.finished).map((r) => r.t);
        const row1     = racers.filter((r) => r.startRowIndex === 1);
        const minRow0T = row0Ts.length > 0 ? Math.min(...row0Ts) : Infinity;
        const mixed    = row1.filter((r) => r.t > minRow0T).length;
        mixingQuota    = row1.length > 0 ? mixed / row1.length : null;
        warmupMeasured = true;
      }

      computePositions();
      applyRacerBehavior(racers, behaviorConfig, undefined);

      // Finish check
      for (const r of racers) {
        if (!r.finished && r.t >= finishT) {
          r.finished   = true;
          finishedCount++;
          r.finishRank = finishedCount;
          r.finishTime = raceTs / 1000;
        }
      }
    }

    // DNF: rank unfinished by current t-position (higher = better)
    const dnf = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
    for (let k = 0; k < dnf.length; k++) {
      dnf[k].finishRank = finishedCount + 1 + k;
    }

    const results = racers.map((r) => ({
      racerIndex:    r.index,
      startRowIndex: r.startRowIndex,
      indexInRow:    r.indexInRow,
      finalT:        r.t,
      finalRank:     r.finishRank,
      finishTime:    r.finishTime,
    }));
    // Attach mixing-quota as a non-iterable property so for..of / .length are unaffected.
    results.mixingQuota = mixingQuota;
    return results;
  } finally {
    Math.random = savedRandom;
  }
}

// ── Statistics ────────────────────────────────────────────────────────────────
/**
 * Aggregate fairness statistics over a series of races.
 *
 * @param {Array<Array<{startRowIndex,finalRank}>>} raceResults  one entry per race
 * @param {number} totalRows
 * @returns {{ nRaces, totalRows, rowStats, chiSq, df, pValue }}
 */
export function computeFairnessStats(raceResults, totalRows) {
  const nRaces     = raceResults.length;
  const winsByRow  = new Array(totalRows).fill(0);
  const ranksByRow = Array.from({ length: totalRows }, () => []);

  for (const race of raceResults) {
    const winner = race.reduce((best, r) => (r.finalRank < best.finalRank ? r : best));
    if (winner.startRowIndex < totalRows) winsByRow[winner.startRowIndex]++;
    for (const r of race) {
      if (r.startRowIndex < totalRows) ranksByRow[r.startRowIndex].push(r.finalRank);
    }
  }

  const rowStats = Array.from({ length: totalRows }, (_, rowIdx) => {
    const ranks   = ranksByRow[rowIdx];
    const n       = ranks.length;
    const wins    = winsByRow[rowIdx];
    const avgRank = n > 0 ? ranks.reduce((s, v) => s + v, 0) / n : null;
    const variance =
      n > 1 ? ranks.reduce((s, v) => s + (v - avgRank) ** 2, 0) / (n - 1) : 0;
    return {
      rowIndex: rowIdx,
      wins,
      winRate:  wins / nRaces,
      n,
      avgRank,
      stdRank:  Math.sqrt(variance),
    };
  });

  // Chi-square goodness-of-fit: H0 = all rows equally likely to win
  const expected = nRaces / totalRows;
  const chiSq    = winsByRow.reduce((s, obs) => s + (obs - expected) ** 2 / expected, 0);
  const df       = totalRows - 1;
  const pValue   = chiSqPValue(chiSq, df);

  return { nRaces, totalRows, rowStats, chiSq, df, pValue };
}

// Wilson-Hilferty chi-square p-value approximation (upper tail)
function chiSqPValue(x, k) {
  if (k <= 0 || x < 0) return 1;
  const mu  = 1 - 2 / (9 * k);
  const sig = Math.sqrt(2 / (9 * k));
  const z   = ((x / k) ** (1 / 3) - mu) / sig;
  return 1 - normalCDF(z);
}

// Abramowitz & Stegun normal CDF approximation (max error 7.5e-8)
function normalCDF(z) {
  const t    = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? phi : 1 - phi;
}

// ── Report generation ─────────────────────────────────────────────────────────
function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }
function fmtN(v, d = 2) { return v != null ? v.toFixed(d) : '—'; }
function sigLabel(p) {
  if (p < 0.001) return '*** (p<0.001)';
  if (p < 0.01)  return '** (p<0.01)';
  if (p < 0.05)  return '* (p<0.05)';
  return 'n.s.';
}
function fairLabel(p, rowStats) {
  if (p >= 0.05) return '✅ Fair';
  // Is front row over- or under-performing?
  const row0Rate = rowStats[0]?.winRate ?? 0;
  const expected = 1 / rowStats.length;
  if (row0Rate > expected + 0.05) return '⚠️ Front-Bias';
  if (row0Rate < expected - 0.05) return '⚠️ Rear-Bias';
  return '⚠️ Unequal';
}

function buildReport(allResults, runDate) {
  const lines = [];

  lines.push('# RaceArena — Fairness Simulation Report');
  lines.push('');
  lines.push(`**Datum:** ${runDate}  `);
  lines.push(`**Rennen pro Kombination:** ${N_RACES}  `);
  lines.push(`**Teilnehmer pro Rennen:** ${N_RACERS}  `);
  lines.push(`**Distanz-Varianten:** 30s / 120s  `);
  lines.push(`**Catch-Up (speedBonusFactor):** ${DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor}  `);
  lines.push(`**PRNG:** mulberry32, Seeds 1–${N_RACES}  `);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Overview table ──
  lines.push('## Übersicht — Win-Rate pro Startreihe');
  lines.push('');
  lines.push('Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  ');
  lines.push('Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  ');
  lines.push('`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  ');
  lines.push('');

  lines.push(
    '| Track | Racer | Dist | Reihen | Erwart. | ' +
    'R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |'
  );
  lines.push(
    '|-------|-------|------|--------|---------|' +
    '-----------|------------|-------------|-----|--------|--------|'
  );

  const FAIR_THRESHOLD = 0.05;
  const unfairCombos = [];
  const fairCombos   = [];

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, stats } = res;
    const { totalRows, rowStats, chiSq, pValue } = stats;
    const expected = 1 / totalRows;
    const r0 = rowStats[0];
    const r1 = rowStats[1];
    const rRest = rowStats.slice(2);
    const restWinRate = rRest.length > 0
      ? rRest.reduce((s, r) => s + r.wins, 0) / (N_RACES * rRest.length || 1)
      : '—';

    const verdict = fairLabel(pValue, rowStats);
    lines.push(
      `| ${trackName} | ${racerType} | ${durationSec}s | ${totalRows} | ${fmtPct(expected)} | ` +
      `${r0 ? fmtPct(r0.winRate) : '—'} | ` +
      `${r1 ? fmtPct(r1.winRate) : '—'} | ` +
      `${typeof restWinRate === 'number' ? fmtPct(restWinRate) : restWinRate} | ` +
      `${fmtN(chiSq, 1)} | ${sigLabel(pValue)} | ${verdict} |`
    );

    if (pValue < FAIR_THRESHOLD) unfairCombos.push(res);
    else fairCombos.push(res);
  }
  lines.push('');

  // ── Per-combination detail sections ──
  lines.push('---');
  lines.push('');
  lines.push('## Detail-Auswertung pro Kombination');
  lines.push('');

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, finishT, stats } = res;
    const { nRaces, totalRows, rowStats, chiSq, df, pValue } = stats;
    const expected = 1 / totalRows;

    lines.push(`### ${trackName} × ${racerType} × ${durationSec}s`);
    lines.push('');
    lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`);
    lines.push(`- **Reihen:** ${totalRows} à max. ${Math.ceil(N_RACERS / totalRows)} Racer`);
    lines.push(`- **Erwartete Win-Rate (fair):** ${fmtPct(expected)}`);
    lines.push(`- **Chi²(${df}):** ${fmtN(chiSq, 2)} — ${sigLabel(pValue)}`);
    lines.push('');

    lines.push('| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |');
    lines.push('|-------|-------|----------|------------|--------|--------|');
    for (const rs of rowStats) {
      const delta = rs.winRate - expected;
      const sign  = delta >= 0 ? '+' : '';
      lines.push(
        `| Row ${rs.rowIndex} | ${rs.wins} | ${fmtPct(rs.winRate)} | ` +
        `${sign}${fmtPct(delta)} | ${fmtN(rs.avgRank, 1)} | ${fmtN(rs.stdRank, 1)} |`
      );
    }
    lines.push('');
  }

  // ── Mixing-Quote (nur Open Tracks) ──
  const openResults = allResults.filter((r) => r.isOpen && r.avgMixingQuota != null);
  if (openResults.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)');
    lines.push('');
    lines.push(
      'Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer ' +
      'im t-Raum überholt haben. Zielbereich: **60–95 %**.'
    );
    lines.push('');
    lines.push('| Track | Racer | Dist | Mixing-Quote | Bewertung |');
    lines.push('|-------|-------|------|-------------|-----------|');
    for (const res of openResults) {
      const q     = res.avgMixingQuota;
      const pct   = fmtPct(q);
      const label = q < 0.60 ? '⚠️ Zu wenig Mixing' : q > 0.95 ? '⚠️ Zu viel Mixing' : '✅ OK';
      lines.push(`| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${pct} | ${label} |`);
    }
    lines.push('');
  }

  // ── Gesamtauswertung ──
  lines.push('---');
  lines.push('');
  lines.push('## Gesamtauswertung');
  lines.push('');
  lines.push(`**Getestete Kombinationen:** ${allResults.length}  `);
  lines.push(`**Davon statistisch fair (p≥0.05):** ${fairCombos.length}  `);
  lines.push(`**Davon statistisch unfair (p<0.05):** ${unfairCombos.length}  `);
  lines.push('');

  if (unfairCombos.length === 0) {
    lines.push('**Befund:** Keine Kombination zeigt statistisch signifikante Unfairness. ✅');
  } else {
    lines.push('**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**');
    lines.push('');
    for (const res of unfairCombos) {
      const { trackName, racerType, durationSec, stats } = res;
      const { rowStats, pValue } = stats;
      const r0Rate = rowStats[0]?.winRate ?? 0;
      const expRate = 1 / rowStats.length;
      const bias = r0Rate > expRate ? `Row 0 zu oft (${fmtPct(r0Rate)} statt ${fmtPct(expRate)})` :
                   r0Rate < expRate ? `Row 0 zu selten (${fmtPct(r0Rate)} statt ${fmtPct(expRate)})` :
                   'mittlere Reihen bevorzugt';
      lines.push(`- **${trackName} × ${racerType} × ${durationSec}s:** ${bias} — ${sigLabel(pValue)}`);
    }
  }
  lines.push('');

  // ── Empfehlung ──
  lines.push('---');
  lines.push('');
  lines.push('## Empfehlung');
  lines.push('');

  // Analyze patterns
  const frontBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    return (rs[0]?.winRate ?? 0) > 1 / rs.length + 0.05;
  });
  const rearBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    return (rs[0]?.winRate ?? 0) < 1 / rs.length - 0.05;
  });
  const shortUnfair = unfairCombos.filter((r) => r.durationSec === 30);
  const longUnfair  = unfairCombos.filter((r) => r.durationSec === 120);

  lines.push('### Front-Row-Vorteil (Row 0 gewinnt zu oft)');
  if (frontBias.length === 0) {
    lines.push('Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.');
  } else {
    for (const r of frontBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)');
  if (rearBias.length === 0) {
    lines.push('Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.');
  } else {
    for (const r of rearBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Catch-Up-Mechanismus (speedBonusFactor = 1.0)');
  if (unfairCombos.length === 0) {
    lines.push(
      'Der Catch-Up-Mechanismus wirkt auf allen getesteten Tracks und Racer-Typen ausreichend. ' +
      'Kein statistisch signifikanter Reihen-Bias nachweisbar.'
    );
  } else {
    if (shortUnfair.length > longUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **kurzen Rennen (30s)** auf (${shortUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Der Catch-Up-Mechanismus benötigt Renndauer zum Wirken — bei sehr kurzen Rennen ist die Ausgleichswirkung begrenzt.'
      );
    } else if (longUnfair.length > shortUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **langen Rennen (120s)** auf (${longUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Das deutet auf akkumulierende Effekte hin, die den Bonus langfristig aus dem Gleichgewicht bringen.'
      );
    } else {
      lines.push(
        `Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen ` +
        `(${shortUnfair.length} × 30s, ${longUnfair.length} × 120s).`
      );
    }
  }
  lines.push('');
  lines.push('*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*');
  lines.push('');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('sim-fairness.mjs') ||
   process.argv[1].replace(/\\/g, '/').endsWith('scripts/sim-fairness.mjs'));

if (isMain) {
  const trackDataDir = join(ROOT, 'server/data/tracks');
  const trackFiles = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit', 'mogcvuipw2y5'];

  console.log('\n=== sim-fairness — RaceArena Fairness Simulation ===');
  console.log(`Rennen pro Kombination : ${N_RACES}`);
  console.log(`Teilnehmer pro Rennen  : ${N_RACERS}`);
  console.log(`Racer-Typen            : ${Object.keys(RACER_CONFIGS).length}`);
  console.log(`Tracks                 : ${trackFiles.length}`);
  console.log(
    `Gesamt-Rennen          : ${N_RACES} × ${Object.keys(RACER_CONFIGS).length} × ${trackFiles.length} × ${DURATION_VARIANTS.length} = ` +
    `${N_RACES * Object.keys(RACER_CONFIGS).length * trackFiles.length * DURATION_VARIANTS.length}`
  );
  console.log(`Output                 : ${OUT_DIR}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
  const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
  const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
  const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (N_RACERS + 1);
  const race_baseSpeed  = BASE_SPEED_MEAN / expectedMinSF;

  const allResults = [];
  const rawData    = [];
  const startTime  = Date.now();

  for (const trackId of trackFiles) {
    const trackPath = join(trackDataDir, `${trackId}.json`);
    if (!existsSync(trackPath)) {
      console.warn(`  [SKIP] Track nicht gefunden: ${trackPath}`);
      continue;
    }
    const track  = JSON.parse(readFileSync(trackPath, 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx       = track.pathLengthPx ?? shape.getTotalLength();
    const geometricTrackWidth = shape.getActualTrackWidth();
    const trackName = track.name ?? trackId;

    console.log(`── ${trackName} (${trackId}) — open=${isOpen} path=${Math.round(pathLengthPx)}px width=${Math.round(geometricTrackWidth)}px`);

    for (const [racerType, cfg] of Object.entries(RACER_CONFIGS)) {
      const { speedMultiplier, displaySize } = cfg;

      for (const durationSec of DURATION_VARIANTS) {
        const finishT = computeFinishT(race_baseSpeed, speedMultiplier, durationSec, isOpen);

        // Compute row count for this track/racer combo (for stats aggregation)
        const rowGapPx     = displaySize * DEFAULT_ROW_LAYOUT_CONFIG.rowGapMultiplier;
        const effectiveWidth = geometricTrackWidth * DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
        const racersPerRow = computeRacersPerRow(effectiveWidth, displaySize);
        // Estimate totalRows from layout (deterministic, seed-independent for count)
        const totalRows = Math.ceil(N_RACERS / Math.max(1, racersPerRow));

        process.stdout.write(
          `   ${racerType.padEnd(10)} ${durationSec}s  finishT=${finishT.toFixed(3)}  rows=${totalRows}  `
        );

        const raceResults   = [];
        const mixingQuotas  = [];
        for (let raceIdx = 0; raceIdx < N_RACES; raceIdx++) {
          const seed   = raceIdx + 1;
          const result = runSingleRace({
            shape,
            pathLengthPx,
            geometricTrackWidth,
            isOpen,
            speedMultiplier,
            displaySize,
            finishT,
            targetSeconds: durationSec,
            seed,
            nRacers: N_RACERS,
          });
          raceResults.push(result);
          if (result.mixingQuota != null) mixingQuotas.push(result.mixingQuota);

          // Collect raw data
          for (const r of result) {
            rawData.push({
              trackId,
              trackName,
              racerType,
              durationSec,
              finishT,
              seed,
              raceIdx,
              ...r,
            });
          }
        }

        const stats = computeFairnessStats(raceResults, totalRows);
        const avgMixingQuota = mixingQuotas.length > 0
          ? mixingQuotas.reduce((s, v) => s + v, 0) / mixingQuotas.length
          : null;
        allResults.push({ trackId, trackName, racerType, durationSec, finishT, isOpen, stats, avgMixingQuota });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`χ²=${stats.chiSq.toFixed(1)} p=${stats.pValue.toFixed(3)} [${elapsed}s]`);
      }
    }
    console.log('');
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSimulation abgeschlossen in ${totalElapsed}s`);

  // Write JSON
  const jsonPath = join(OUT_DIR, 'fairness-data.json');
  writeFileSync(jsonPath, JSON.stringify({ meta: { nRaces: N_RACES, nRacers: N_RACERS, durationVariants: DURATION_VARIANTS }, results: allResults, rawData }, null, 2));
  console.log(`JSON → ${jsonPath}`);

  // Write Markdown report
  const runDate = new Date().toISOString().slice(0, 10);
  const report  = buildReport(allResults, runDate);
  const mdPath  = join(OUT_DIR, 'fairness-report.md');
  writeFileSync(mdPath, report);
  console.log(`Bericht → ${mdPath}`);

  // Print quick summary
  const unfair = allResults.filter((r) => r.stats.pValue < 0.05);
  console.log(`\n=== Zusammenfassung ===`);
  console.log(`Kombinationen gesamt : ${allResults.length}`);
  console.log(`Fair (p≥0.05)        : ${allResults.length - unfair.length}`);
  console.log(`Unfair (p<0.05)      : ${unfair.length}`);
  if (unfair.length > 0) {
    console.log('\nUnfaire Kombinationen:');
    for (const r of unfair) {
      const r0 = r.stats.rowStats[0];
      const exp = 1 / r.stats.totalRows;
      console.log(`  ${r.trackName} × ${r.racerType} × ${r.durationSec}s  Row0=${fmtPct(r0?.winRate ?? 0)} (erw. ${fmtPct(exp)})  p=${r.stats.pValue.toFixed(3)}`);
    }
  }
}
