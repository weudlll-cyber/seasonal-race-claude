// ============================================================
// File:        param-sweep-full.mjs
// Path:        scripts/param-sweep-full.mjs
// Project:     RaceArena
// Description: Autonomous full 8-parameter sweep for lateral physics.
//              Finds the globally optimal combination of all 8 parameters.
//
// Phase 1: 1000 combos × 10 races × 3 tracks
// Phase 2: Top 10 survivors × 100 races × 3 tracks
//
// Hard cutoffs (eliminate immediately):
//   outcomeReached < 1.0   — all simulated races must complete
//   natOvt < 1.0           — all position changes must be natural
//
// Optimization priority (after cutoffs):
//   P2: racePlanSuccessRate maximized  (primary, target >= 90%)
//   P3: zigzagScore minimized, lateralSpeedScore minimized
//   P4: brakeRate minimized, stableOvertakes maximized, overlapRate minimized
//
// Usage:
//   node scripts/param-sweep-full.mjs            -- full run (~1000 combos)
//   node scripts/param-sweep-full.mjs --quick    -- sanity check (9 combos, 3 races)
//   node scripts/param-sweep-full.mjs --phase1only
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── Simulation imports ────────────────────────────────────────────────────────
import {
  runSingleRace,
  computeFairnessStats,
  computeFinishT,
  RACER_CONFIGS,
  makePRNG,
} from './sim-fairness.mjs';

import { EditorShape }                         from '../client/src/modules/track-editor/EditorShape.js';
import { computeRacerLayout, computeEvenRowLayout } from '../client/src/modules/rowLayout.js';
import { computeSpeedScaleFactor }             from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG }           from '../client/src/modules/autoSpriteScale.js';
import { createRacePlan, createTrajectoryController } from '../client/src/modules/racePlanner.js';

// ── CLI args ──────────────────────────────────────────────────────────────────
const IS_QUICK    = process.argv.includes('--quick');
const PHASE1_ONLY = process.argv.includes('--phase1only');

// ── Constants ─────────────────────────────────────────────────────────────────
const GLOBAL_SEED          = 42;
const PHASE1_RACES         = IS_QUICK ? 3  : 10;
const PHASE2_RACES         = IS_QUICK ? 10 : 100;
const PHASE2_TOP_N         = 10;
const DURATION_SEC         = 60;
const PHASE1_N_COMBOS      = IS_QUICK ? 9 : 1000;
const PHASE1_TIME_BUDGET_MS = 4 * 3600 * 1000;  // 4 h hard cap
const RACE_PLAN_BONUS      = 2.0;  // matches DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier

const OUT_DIR     = join(ROOT, 'client/tmp');
const LOG_FILE    = join(OUT_DIR, 'sweep-full-progress.log');
const REPORT_FILE = join(OUT_DIR, 'full-sweep-report.md');

// Tracks: open (Space Sprint, Luger Hill 50R) + closed (Dirt Oval 40R)
const TRACK_SPECS = [
  { trackId: 'space-sprint', racerType: 'rocket', nRacers: 50, label: 'Space Sprint' },
  { trackId: 'luger-hill', racerType: 'luge',   nRacers: 50, label: 'Luger Hill'  },
  { trackId: 'dirt-oval',    racerType: 'horse',  nRacers: 40, label: 'Dirt Oval'   },
];

// Hard cutoff values
const HC_OUTCOME = 1.0;   // fraction of races that must complete (all)
const HC_NAT_OVT = 1.0;   // fraction of overtakes that must be natural (all)
const HC_NAT_OVT_RELAXED = 0.90; // fallback if 0 survivors with strict cutoff

// Primary metric target
const TARGET_RPS = 0.90;

// ── Parameter definitions (CC-chosen ranges) ─────────────────────────────────
// Ranges cover ≈ ±50–100% around current defaults.
// lateralDamping hard-capped at 0.49 (code constraint: must stay < 0.5).
const PARAM_DEFS = {
  lateralForce:                { lo: 0.006, hi: 0.024, def: 0.014 },
  lateralDamping:              { lo: 0.22,  hi: 0.49,  def: 0.45  },
  homeForceStrength:           { lo: 0.015, hi: 0.065, def: 0.040 },
  homeForceReductionOnOverlap: { lo: 0.02,  hi: 0.45,  def: 0.15  },
  avoidanceDistance:           { lo: 0.07,  hi: 0.28,  def: 0.15  },
  speedBrakeFactor:            { lo: 0.87,  hi: 0.995, def: 0.98  },
  speedBrakeTThreshold:        { lo: 0.003, hi: 0.018, def: 0.008 },
  speedBrakeYThreshold:        { lo: 0.05,  hi: 0.22,  def: 0.12  },
};

const PARAM_KEYS = Object.keys(PARAM_DEFS);
const BASELINE   = Object.fromEntries(PARAM_KEYS.map(k => [k, PARAM_DEFS[k].def]));

// ── Logging ───────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(LOG_FILE, `=== param-sweep-full.mjs — ${new Date().toISOString()} ===\n`);

function log(msg) {
  const ts   = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

function formatMs(ms) {
  if (ms < 60_000)      return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3_600_000)   return `${(ms / 60_000).toFixed(1)}min`;
  return `${(ms / 3_600_000).toFixed(2)}h`;
}

function r4(v) { return Math.round(v * 10000) / 10000; }

// ── Combo generation ──────────────────────────────────────────────────────────
function generateCombos(targetN) {
  const rng    = makePRNG(9999);  // fixed seed so combos are reproducible
  const combos = [];

  // 1 — Baseline (current defaults)
  combos.push({ ...BASELINE, _type: 'baseline' });

  // OAT — for each parameter, sweep 8 evenly-spaced values [lo, hi], skip the default
  for (const key of PARAM_KEYS) {
    const { lo, hi, def } = PARAM_DEFS[key];
    const nVals = 8;
    for (let i = 0; i < nVals; i++) {
      const v = r4(lo + (i / (nVals - 1)) * (hi - lo));
      if (Math.abs(v - def) < 1e-8) continue;
      combos.push({ ...BASELINE, [key]: v, _type: `oat_${key}` });
    }
  }

  // LHS — Latin Hypercube Sampling to fill the remaining budget
  const remaining = Math.max(0, targetN - combos.length);
  if (remaining > 0) {
    // Stratified permutations per dimension
    const strata = PARAM_KEYS.map(() => {
      const arr = Array.from({ length: remaining }, (_, i) => i);
      for (let i = remaining - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    for (let i = 0; i < remaining; i++) {
      const combo = { _type: 'lhs' };
      PARAM_KEYS.forEach((key, ki) => {
        const { lo, hi } = PARAM_DEFS[key];
        const u = (strata[ki][i] + rng()) / remaining;
        combo[key] = r4(lo + u * (hi - lo));
      });
      combos.push(combo);
    }
  }

  return combos;
}

// ── Track loading ─────────────────────────────────────────────────────────────
function loadTracks() {
  const dir = join(ROOT, 'server/data/tracks');
  return TRACK_SPECS.map(spec => {
    const track  = JSON.parse(readFileSync(join(dir, `${spec.trackId}.json`), 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx        = track.pathLengthPx ?? shape.getTotalLength();
    const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();

    const BS      = DEFAULT_BASE_SPEED_CONFIG;
    const BSMean  = (BS.min + BS.max) / 2;
    const sfMin   = BS.min / BSMean;
    const sfMax   = BS.max / BSMean;
    const expMinSF      = sfMin + (sfMax - sfMin) / (spec.nRacers + 1);
    const raceBaseSpeed = BSMean / expMinSF;

    const trackSsf  = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
    const naturalBase = isOpen ? BSMean / trackSsf : raceBaseSpeed;
    const { speedMultiplier, displaySize } = RACER_CONFIGS[spec.racerType];
    const finishT = computeFinishT(naturalBase, speedMultiplier, DURATION_SEC, isOpen);

    const bCfg        = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const effWidth    = geometricTrackWidth * bCfg.startSpreadRange;
    const layout      = computeRacerLayout(effWidth, spec.nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    const totalRows   = layout.rowCount;
    const rowSizes    = layout.layout;
    const comboRowLayout = computeEvenRowLayout(spec.nRacers, totalRows);

    return {
      ...spec,
      shape, isOpen, pathLengthPx, geometricTrackWidth,
      speedMultiplier, displaySize,
      finishT, totalRows, rowSizes, comboRowLayout,
    };
  });
}

// ── Race-plan bereich helpers ─────────────────────────────────────────────────
function sollBereichOf(rank) {
  if (rank <= 5)  return 1;
  if (rank <= 15) return 2;
  if (rank <= 25) return 3;
  if (rank <= 40) return 4;
  return 5;
}

// [lo, hi] inclusive for each bereich
const BEREICH_BOUNDS = [[1,5],[6,15],[16,25],[26,40],[41,Infinity]];

function inBereich(finalRank, bereich) {
  const [lo, hi] = BEREICH_BOUNDS[bereich - 1] ?? [1, Infinity];
  return finalRank >= lo && finalRank <= hi;
}

// ── Single track run ──────────────────────────────────────────────────────────
function runComboOnTrack(trackData, comboParams, nRaces) {
  const {
    shape, isOpen, pathLengthPx, geometricTrackWidth,
    nRacers, speedMultiplier, displaySize,
    finishT, totalRows, rowSizes, comboRowLayout,
    trackId, label,
  } = trackData;

  let totalRacerSlots = 0;
  let totalRPSHits    = 0;
  let sumNatOvt       = 0;
  let sumOutcome      = 0;

  const raceResults = [];

  for (let raceIdx = 0; raceIdx < nRaces; raceIdx++) {
    const seed = (GLOBAL_SEED - 1) * nRaces + raceIdx + 1;

    // Build race plan
    const planRacers = comboRowLayout.assignments.map(a => ({
      index: a.racerIndex, startRowIndex: a.rowIndex,
    }));
    const plan = createRacePlan(
      planRacers, finishT, DURATION_SEC * 1000,
      { bonusStrengthMultiplier: RACE_PLAN_BONUS },
      seed,
    );
    const racePlanController = createTrajectoryController(plan);
    const targetRankMap = plan._racerTargetRank; // Map<racerIndex, targetRank>

    const result = runSingleRace({
      shape,
      pathLengthPx,
      geometricTrackWidth,
      isOpen,
      speedMultiplier,
      displaySize,
      finishT,
      targetSeconds: DURATION_SEC,
      seed,
      nRacers,
      behaviorConfigOverrides: comboParams,
      racePlanController,
    });
    raceResults.push(result);

    // racePlanSuccessRate: fraction of racers landing in their target bereich
    if (targetRankMap && targetRankMap.size > 0) {
      for (const r of result) {
        const targetRank = targetRankMap.get(r.racerIndex);
        if (targetRank == null) continue;
        const bereich = sollBereichOf(targetRank);
        totalRacerSlots++;
        if (inBereich(r.finalRank, bereich)) totalRPSHits++;
      }
    }

    sumNatOvt += (result.naturalness?.naturalOvertakeFraction ?? 1);
    sumOutcome += (result.outcomeReached ? 1 : 0);
  }

  const avg = fn => raceResults.reduce((s, r) => s + (fn(r) ?? 0), 0) / nRaces;
  const stats = computeFairnessStats(raceResults, totalRows, rowSizes);

  return {
    trackId, trackLabel: label, isOpen, stats,
    metrics: {
      racePlanSuccessRate:     totalRacerSlots > 0 ? totalRPSHits / totalRacerSlots : 0,
      naturalOvertakeFraction: sumNatOvt / nRaces,
      outcomeReached:          sumOutcome / nRaces,
      zigzagScore:             avg(r => r.liteZigzagScore),
      lateralSpeedScore:       avg(r => r.liteLatSpeedScore),
      brakeRate:               avg(r => r.liteBrakeRate),
      stableOvertakes:         avg(r => r.liteStableOvertakes),
      overlapRate:             avg(r => r.liteOverlapRate),
      pValue:                  stats.pValue,
    },
  };
}

// ── Hard cutoffs ──────────────────────────────────────────────────────────────
function checkCutoffs(trackResults, natOvtThreshold = HC_NAT_OVT) {
  for (const tr of trackResults) {
    const m = tr.metrics;
    if (m.outcomeReached < HC_OUTCOME)
      return `outcomeReached=${m.outcomeReached.toFixed(2)}@${tr.trackLabel}`;
    if (m.naturalOvertakeFraction < natOvtThreshold)
      return `natOvt=${m.naturalOvertakeFraction.toFixed(3)}@${tr.trackLabel}`;
  }
  return null;
}

// ── Composite score (lower = better) ─────────────────────────────────────────
// P2 (weight 10): racePlanSuccessRate — maximize → negate
// P3 (weights 5, 3): zigzag, lateralSpeedScore — minimize
// P4 (weights 2, 2, 1): brakeRate minimize, stableOvt maximize, overlapRate minimize
// Normalization divides by expected range so weights reflect true priority.
function scoreCombo(trackResults) {
  const n    = trackResults.length;
  const avgM = key => trackResults.reduce((s, tr) => s + (tr.metrics[key] ?? 0), 0) / n;

  const rps    = avgM('racePlanSuccessRate');
  const zigzag = avgM('zigzagScore');
  const latSpd = avgM('lateralSpeedScore');
  const brake  = avgM('brakeRate');
  const stable = avgM('stableOvertakes');
  const overlap = avgM('overlapRate');
  const pMin   = Math.min(...trackResults.map(tr => tr.metrics.pValue));

  // Lower score = better
  const score = -10 * rps                                // P2: maximize
              + 5  * Math.min(1, zigzag / 0.003)         // P3a
              + 3  * Math.min(1, latSpd / 0.003)         // P3b
              + 2  * Math.min(1, brake  / 0.5)           // P4a
              - 2  * Math.min(1, stable / 0.5)           // P4b maximize
              + 1  * Math.min(1, overlap / 0.1)          // P4c
              - 0.3 * Math.min(1, pMin / 0.05);          // fairness tiebreaker

  return { score, rps, zigzag, latSpd, brake, stable, overlap, pMin };
}

// ── Phase runner ──────────────────────────────────────────────────────────────
function runPhase(combos, tracks, nRaces, label, timeBudgetMs, natOvtThreshold = HC_NAT_OVT) {
  log(`\n${'═'.repeat(72)}`);
  log(`${label} — ${combos.length} combos × ${nRaces} races × ${tracks.length} tracks`);
  log(`Seeds: ${(GLOBAL_SEED-1)*nRaces+1}–${(GLOBAL_SEED-1)*nRaces+nRaces}  natOvtCutoff=${natOvtThreshold}`);
  log(`${'═'.repeat(72)}`);

  const results    = [];
  const phaseStart = Date.now();
  let survivors    = 0;

  for (let ci = 0; ci < combos.length; ci++) {
    const elapsed = Date.now() - phaseStart;
    if (timeBudgetMs && elapsed > timeBudgetMs) {
      log(`\n⏰ Time budget (${formatMs(timeBudgetMs)}) reached at combo ${ci}/${combos.length}. Stopping early.`);
      break;
    }

    const { _type, ...comboParams } = combos[ci];
    let trackResults;
    try {
      trackResults = tracks.map(t => runComboOnTrack(t, comboParams, nRaces));
    } catch (err) {
      log(`[${String(ci+1).padStart(4)}/${combos.length}] ERROR: ${err.message.slice(0,80)}`);
      results.push({ params: comboParams, type: _type, trackResults: null, survived: false, failReason: 'error', scoreData: null });
      continue;
    }

    const failReason = checkCutoffs(trackResults, natOvtThreshold);
    const survived   = !failReason;
    if (survived) survivors++;
    const scoreData  = survived ? scoreCombo(trackResults) : null;
    results.push({ params: comboParams, type: _type, trackResults, survived, failReason, scoreData });

    const icon    = survived ? '✅' : '❌';
    const avgRps  = trackResults.reduce((s, tr) => s + tr.metrics.racePlanSuccessRate, 0) / trackResults.length;
    const m0      = trackResults[0].metrics;
    const pct     = ((ci + 1) / combos.length * 100).toFixed(1);
    const eta     = ci > 4 ? ` ETA:${formatMs((elapsed / (ci + 1)) * (combos.length - ci - 1))}` : '';
    const scoreStr = scoreData ? `score=${scoreData.score.toFixed(3)}` : `FAIL:${(failReason ?? '').slice(0, 35)}`;
    if (survived || (ci + 1) % 25 === 0 || ci < 3) {
      log(`[${String(ci+1).padStart(4)}/${combos.length}] ${icon} ${pct}%${eta}  rps=${(avgRps*100).toFixed(1)}%  zig=${m0.zigzagScore.toFixed(5)}  brk=${(m0.brakeRate*100).toFixed(1)}%  ${scoreStr}`);
    }
  }

  const totalElapsed = Date.now() - phaseStart;
  log(`\n${label} done in ${formatMs(totalElapsed)}. Survivors: ${survivors}/${results.length}`);
  return results;
}

// ── Dynamic adjustment ────────────────────────────────────────────────────────
function detectBoundaryIssues(top10) {
  log('\n── Dynamic Adjustment: Boundary Detection ──');
  const issues = [];
  for (const key of PARAM_KEYS) {
    const { lo, hi } = PARAM_DEFS[key];
    const vals   = top10.map(r => r.params[key]);
    const mean   = vals.reduce((s, v) => s + v, 0) / vals.length;
    const relPos = (mean - lo) / (hi - lo);
    if (relPos < 0.18) {
      log(`  ⚠️  ${key}: top-10 mean=${mean.toFixed(4)} — near LOW boundary (relPos=${relPos.toFixed(2)})`);
      issues.push({ key, dir: 'LOW', mean, lo, hi });
    } else if (relPos > 0.82) {
      log(`  ⚠️  ${key}: top-10 mean=${mean.toFixed(4)} — near HIGH boundary (relPos=${relPos.toFixed(2)})`);
      issues.push({ key, dir: 'HIGH', mean, lo, hi });
    } else {
      log(`  ✓  ${key}: mean=${mean.toFixed(4)} relPos=${relPos.toFixed(2)}`);
    }
  }
  return issues;
}

function makeExtensionCombos(issues, n) {
  if (issues.length === 0 || n === 0) return [];
  const rng = makePRNG(7777);
  const ext = [];
  for (let i = 0; i < n; i++) {
    const combo = { _type: 'extension' };
    for (const key of PARAM_KEYS) {
      const issue = issues.find(iss => iss.key === key);
      const { lo, hi } = PARAM_DEFS[key];
      if (issue) {
        const range  = hi - lo;
        const extend = 0.35 * range;
        if (issue.dir === 'LOW') {
          const newLo = Math.max(0.0001, lo - extend);
          const newHi = lo + 0.15 * range;
          combo[key]  = r4(newLo + rng() * (newHi - newLo));
        } else {
          const newLo = hi - 0.15 * range;
          const newHi = Math.min(0.9999, hi + extend);
          combo[key]  = r4(newLo + rng() * (newHi - newLo));
        }
        if (key === 'lateralDamping') combo[key] = Math.min(0.49, combo[key]);
        if (key === 'speedBrakeFactor') combo[key] = Math.max(0.70, Math.min(0.999, combo[key]));
      } else {
        combo[key] = r4(lo + rng() * (hi - lo));
      }
    }
    ext.push(combo);
  }
  log(`Generated ${ext.length} extension combos targeting boundary regions.`);
  return ext;
}

// ── Sensitivity analysis ──────────────────────────────────────────────────────
function computeSensitivity(p1Results) {
  const survivors = p1Results.filter(r => r.survived && r.scoreData);
  if (survivors.length < 4) return {};

  const result = {};
  for (const key of PARAM_KEYS) {
    const vals   = survivors.map(r => r.params[key]).sort((a, b) => a - b);
    const median = vals[Math.floor(vals.length / 2)];
    const lo     = survivors.filter(r => r.params[key] <  median);
    const hi     = survivors.filter(r => r.params[key] >= median);
    const avgScore = (arr) => arr.length ? arr.reduce((s, r) => s + r.scoreData.score, 0) / arr.length : 0;
    const loScore  = avgScore(lo);
    const hiScore  = avgScore(hi);
    result[key] = {
      delta:       Math.abs(hiScore - loScore),
      preference:  loScore < hiScore ? 'LOW' : 'HIGH',
      loScore, hiScore,
    };
  }
  return result;
}

// ── Report ────────────────────────────────────────────────────────────────────
function writeReport({ p1Results, p2Results, sensitivity, boundaryIssues, runDate, natOvtRelaxed }) {
  const lines = [];

  lines.push('# RaceArena — Full 8-Parameter Sweep Report');
  lines.push('');
  lines.push(`**Date:** ${runDate}  `);
  lines.push(`**Branch:** feat/lateral-velocity  `);
  lines.push(`**Seed:** ${GLOBAL_SEED} (reproducible)  `);
  lines.push(`**Phase 1:** ${p1Results.length} combos × ${PHASE1_RACES} races × 3 tracks  `);
  lines.push(`**Phase 2:** Top ${PHASE2_TOP_N} × ${PHASE2_RACES} races × 3 tracks  `);
  lines.push(`**Race Plan:** ON (bonusStrengthMultiplier=${RACE_PLAN_BONUS})  `);
  if (natOvtRelaxed) {
    lines.push(`**natOvt cutoff:** relaxed to 0.90 (strict 1.0 yielded 0 survivors)  `);
  }
  lines.push('');

  // Parameter ranges table
  lines.push('## Parameter Ranges Explored');
  lines.push('');
  lines.push('| Parameter | Range | Default | Expansion |');
  lines.push('|-----------|-------|---------|-----------|');
  for (const [key, { lo, hi, def }] of Object.entries(PARAM_DEFS)) {
    const issue = boundaryIssues.find(i => i.key === key);
    const expNote = issue ? `⚠️ extends ${issue.dir}` : '—';
    lines.push(`| \`${key}\` | [${lo}, ${hi}] | ${def} | ${expNote} |`);
  }
  lines.push('');

  // Phase 1 summary
  const p1Surv  = p1Results.filter(r => r.survived);
  const byType  = {};
  for (const r of p1Results) {
    const k = r.type?.startsWith('oat') ? 'oat' : (r.type ?? 'unknown');
    byType[k] = (byType[k] ?? 0) + 1;
  }

  lines.push('---');
  lines.push('');
  lines.push('## Phase 1 — Exploration');
  lines.push('');
  lines.push(`**Combos tested:** ${p1Results.length}  `);
  const typeBreakdown = Object.entries(byType).map(([k, n]) => `${n} ${k}`).join(', ');
  lines.push(`**Breakdown:** ${typeBreakdown}  `);
  lines.push(`**Survived hard cutoffs:** ${p1Surv.length}  `);
  lines.push('');

  if (p1Surv.length > 0) {
    const sorted = [...p1Surv].sort((a, b) => a.scoreData.score - b.scoreData.score);
    lines.push('### Top 30 Phase 1 Survivors');
    lines.push('');
    lines.push('| # | rps% | zigzag | latSpd | brake% | stableOvt | overlap% | p(min) | score | type |');
    lines.push('|---|------|--------|--------|--------|-----------|----------|--------|-------|------|');
    sorted.slice(0, 30).forEach((r, i) => {
      const s = r.scoreData;
      lines.push(
        `| ${i+1} | ${(s.rps*100).toFixed(1)} | ${s.zigzag.toFixed(5)} | ${s.latSpd.toFixed(5)} | ${(s.brake*100).toFixed(1)} | ${s.stable.toFixed(3)} | ${(s.overlap*100).toFixed(2)} | ${s.pMin.toFixed(3)} | ${s.score.toFixed(3)} | ${r.type} |`
      );
    });
    if (sorted.length > 30) lines.push(`*…and ${sorted.length - 30} more survivors*`);
    lines.push('');
  }

  // Elimination breakdown
  const elimReasons = {};
  for (const r of p1Results.filter(r => !r.survived && r.failReason)) {
    const k = r.failReason.split('=')[0].split('@')[0];
    elimReasons[k] = (elimReasons[k] ?? 0) + 1;
  }
  lines.push('### Elimination Breakdown (Phase 1)');
  lines.push('');
  for (const [k, n] of Object.entries(elimReasons).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${k}**: ${n} combos (${(n / p1Results.length * 100).toFixed(1)}%)`);
  }
  lines.push('');

  // Dynamic adjustments
  lines.push('---');
  lines.push('');
  lines.push('## Dynamic Adjustments');
  lines.push('');
  if (boundaryIssues.length === 0) {
    lines.push('No boundary issues detected. Top-10 clusters are well within explored ranges.');
  } else {
    lines.push(`${boundaryIssues.length} boundary issue(s) detected and addressed:`);
    lines.push('');
    for (const iss of boundaryIssues) {
      lines.push(`- **\`${iss.key}\`**: top-10 mean=${iss.mean.toFixed(4)} clusters near ${iss.dir} boundary (range [${iss.lo}, ${iss.hi}]) — extension combos added`);
    }
  }
  lines.push('');

  // Phase 2
  lines.push('---');
  lines.push('');
  lines.push(`## Phase 2 — Confirmation (${PHASE2_RACES} races/combo)`);
  lines.push('');

  if (!p2Results || p2Results.length === 0) {
    lines.push('*No Phase 2 results (no Phase 1 survivors or --phase1only flag).*');
  } else {
    const p2Surv   = p2Results.filter(r => r.survived);
    const p2Sorted = [...p2Surv].sort((a, b) => a.scoreData.score - b.scoreData.score);

    lines.push('### All Phase 2 Results');
    lines.push('');
    lines.push('| # | rps% | zigzag | latSpd | brake% | stableOvt | overlap% | p(min) | fair? | score |');
    lines.push('|---|------|--------|--------|--------|-----------|----------|--------|-------|-------|');
    p2Results.forEach((r, i) => {
      if (!r.survived || !r.scoreData) {
        lines.push(`| ${i+1} | — | — | — | — | — | — | — | ❌ FAIL: ${r.failReason?.slice(0,30)} | — |`);
        return;
      }
      const s    = r.scoreData;
      const fair = s.pMin >= 0.05 ? '✅' : '⚠️';
      lines.push(
        `| ${i+1} | ${(s.rps*100).toFixed(1)} | ${s.zigzag.toFixed(5)} | ${s.latSpd.toFixed(5)} | ${(s.brake*100).toFixed(1)} | ${s.stable.toFixed(3)} | ${(s.overlap*100).toFixed(2)} | ${s.pMin.toFixed(3)} | ${fair} | ${s.score.toFixed(3)} |`
      );
    });
    lines.push('');

    // Per-track detail for top 5
    lines.push('### Phase 2 Per-Track Detail (Top 5)');
    lines.push('');
    p2Sorted.slice(0, 5).forEach((r, rank) => {
      lines.push(`#### #${rank+1} — score ${r.scoreData.score.toFixed(4)}`);
      lines.push('');
      lines.push('**Parameters:**');
      lines.push('```');
      for (const [k, v] of Object.entries(r.params)) {
        const d = PARAM_DEFS[k]?.def;
        const mark = d != null && Math.abs(v - d) > 1e-8 ? ` ← changed (default: ${d})` : '  (default)';
        lines.push(`  ${k.padEnd(32)} = ${v}${mark}`);
      }
      lines.push('```');
      lines.push('');
      lines.push('| Track | rps% | zigzag | latSpd | brake% | stableOvt | overlap% | p-value | fair? |');
      lines.push('|-------|------|--------|--------|--------|-----------|----------|---------|-------|');
      for (const tr of r.trackResults ?? []) {
        const m = tr.metrics;
        lines.push(
          `| ${tr.trackLabel} | ${(m.racePlanSuccessRate*100).toFixed(1)} | ${m.zigzagScore.toFixed(5)} | ${m.lateralSpeedScore.toFixed(5)} | ${(m.brakeRate*100).toFixed(1)} | ${m.stableOvertakes.toFixed(3)} | ${(m.overlapRate*100).toFixed(2)} | ${m.pValue.toFixed(3)} | ${m.pValue>=0.05?'✅':'⚠️'} |`
        );
      }
      lines.push('');
    });

    // Winner
    if (p2Sorted.length > 0) {
      const win = p2Sorted[0];
      const ws  = win.scoreData;
      lines.push('---');
      lines.push('');
      lines.push('## Winner — Single Best Combination');
      lines.push('');
      lines.push(`**racePlanSuccessRate (avg):** ${(ws.rps*100).toFixed(2)}%  `);
      lines.push(`**Score:** ${ws.score.toFixed(4)}  `);
      lines.push(`**p-value (min across tracks):** ${ws.pMin.toFixed(3)}  `);
      lines.push(`**Fair on all tracks:** ${ws.pMin >= 0.05 ? 'YES ✅' : 'NO ⚠️ (at least one track p<0.05)'}  `);
      lines.push('');
      lines.push('### Recommended Parameter Values');
      lines.push('');
      lines.push('> **Note:** For reference only. Do NOT apply to `defaults.js` — analysis only.');
      lines.push('');
      lines.push('```javascript');
      for (const [k, v] of Object.entries(win.params)) {
        const d = PARAM_DEFS[k]?.def;
        lines.push(`  ${k}: ${v},  // default: ${d}`);
      }
      lines.push('```');
      lines.push('');
    }
  }

  // Sensitivity analysis
  lines.push('---');
  lines.push('');
  lines.push('## Parameter Sensitivity Analysis');
  lines.push('');
  lines.push('Based on Phase 1 survivors. **Δscore** = |mean score (low half) − mean score (high half)|.');
  lines.push('Higher Δ = more influential. **Preference** = which half of the range scores better.');
  lines.push('');
  lines.push('| Rank | Parameter | Δscore | Preference | Implication |');
  lines.push('|------|-----------|--------|------------|-------------|');
  const sensSorted = Object.entries(sensitivity).sort((a, b) => b[1].delta - a[1].delta);
  sensSorted.forEach(([key, { delta, preference, loScore, hiScore }], i) => {
    const { lo, hi } = PARAM_DEFS[key];
    const mid    = r4((lo + hi) / 2);
    const implication = preference === 'LOW'
      ? `lower values (< ${mid}) improve score`
      : `higher values (> ${mid}) improve score`;
    lines.push(`| ${i+1} | \`${key}\` | ${delta.toFixed(3)} | **${preference}** | ${implication} |`);
  });
  lines.push('');

  // Boundary warnings
  if (boundaryIssues.length > 0) {
    lines.push('### Boundary Warnings — Consider Extending Ranges');
    lines.push('');
    for (const iss of boundaryIssues) {
      const { lo, hi } = PARAM_DEFS[iss.key];
      const range = hi - lo;
      if (iss.dir === 'LOW') {
        lines.push(`- **\`${iss.key}\`**: optimum near lo=${lo} → next sweep could try lo=${r4(Math.max(0.0001, lo - 0.3*range))}`);
      } else {
        lines.push(`- **\`${iss.key}\`**: optimum near hi=${hi} → next sweep could try hi=${r4(hi + 0.3*range)}`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Generated by `scripts/param-sweep-full.mjs` — Autonomous 8-parameter sweep, feat/lateral-velocity*');

  writeFileSync(REPORT_FILE, lines.join('\n'));
  log(`Report written → ${REPORT_FILE}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const wallStart = Date.now();
  const runDate   = new Date().toISOString().slice(0, 10);

  log('╔══════════════════════════════════════════════════════════════════════╗');
  log('║  RaceArena — Autonomous Full 8-Parameter Sweep                      ║');
  log('╠══════════════════════════════════════════════════════════════════════╣');
  log(`║  Start: ${new Date().toISOString().padEnd(61)}║`);
  log(`║  Mode:  ${(IS_QUICK ? 'QUICK' : 'FULL (1000 combos, 10R P1, 100R P2)').padEnd(61)}║`);
  log('╚══════════════════════════════════════════════════════════════════════╝');

  // Load tracks
  log('\nLoading tracks...');
  let tracks;
  try {
    tracks = loadTracks();
  } catch (err) {
    log(`ERROR loading tracks: ${err.message}`);
    process.exit(1);
  }
  for (const t of tracks) {
    log(`  ${t.label.padEnd(14)} (${t.trackId.padEnd(12)})  isOpen=${String(t.isOpen).padEnd(5)}  path=${Math.round(t.pathLengthPx)}px  width=${Math.round(t.geometricTrackWidth)}px  rows=${t.totalRows}  finishT=${t.finishT.toFixed(4)}`);
  }

  // Generate combos
  log('\nGenerating Phase 1 combos...');
  const p1Combos = generateCombos(PHASE1_N_COMBOS);
  const oatCount = p1Combos.filter(c => c._type?.startsWith('oat')).length;
  const lhsCount = p1Combos.filter(c => c._type === 'lhs').length;
  log(`  ${p1Combos.length} total: 1 baseline + ${oatCount} OAT + ${lhsCount} LHS`);

  // ── Phase 1 ──────────────────────────────────────────────────────────────
  let p1Results = runPhase(p1Combos, tracks, PHASE1_RACES, 'PHASE 1', PHASE1_TIME_BUDGET_MS);

  let p1Survivors  = p1Results.filter(r => r.survived);
  let natOvtRelaxed = false;

  // If strict natOvt=1.0 eliminated everything, relax to 0.90 and re-score
  if (p1Survivors.length === 0) {
    log('\nWARNING: 0 survivors with natOvt=1.0. Race plan likely causes unnatural overtakes.');
    log('Relaxing natOvt cutoff to 0.90 and re-evaluating...');
    natOvtRelaxed = true;
    p1Survivors = p1Results.filter(r => {
      if (!r.trackResults) return false;
      return r.trackResults.every(tr =>
        tr.metrics.outcomeReached >= HC_OUTCOME &&
        tr.metrics.naturalOvertakeFraction >= HC_NAT_OVT_RELAXED
      );
    }).map(r => ({ ...r, survived: true, scoreData: scoreCombo(r.trackResults), failReason: null }));
    p1Results = p1Results.map(r => {
      const relaxed = p1Survivors.find(s => s.params === r.params);
      return relaxed ?? r;
    });
    log(`  Survivors with relaxed natOvt>=0.90: ${p1Survivors.length}`);
  }

  const sortedSurvivors = [...p1Survivors].sort((a, b) => a.scoreData.score - b.scoreData.score);

  log(`\nPhase 1 top-5 survivors:`);
  sortedSurvivors.slice(0, 5).forEach((r, i) => {
    const s = r.scoreData;
    log(`  #${i+1}: rps=${(s.rps*100).toFixed(1)}%  score=${s.score.toFixed(3)}  type=${r.type}`);
  });

  // ── Dynamic adjustment ────────────────────────────────────────────────────
  let allBoundaryIssues = [];
  if (!PHASE1_ONLY && sortedSurvivors.length >= 5) {
    const top10 = sortedSurvivors.slice(0, Math.min(10, sortedSurvivors.length));
    allBoundaryIssues = detectBoundaryIssues(top10);

    if (allBoundaryIssues.length > 0) {
      const extCombos = makeExtensionCombos(allBoundaryIssues, IS_QUICK ? 3 : 200);
      if (extCombos.length > 0) {
        const extResults = runPhase(
          extCombos, tracks, PHASE1_RACES,
          'PHASE 1 — EXTENSION',
          30 * 60 * 1000,  // 30 min budget for extension
          natOvtRelaxed ? HC_NAT_OVT_RELAXED : HC_NAT_OVT,
        );
        const extSurv = extResults.filter(r => r.survived);
        log(`\nExtension survivors: ${extSurv.length}/${extCombos.length}`);
        p1Results.push(...extResults);
        sortedSurvivors.push(...extSurv);
        sortedSurvivors.sort((a, b) => a.scoreData.score - b.scoreData.score);
      }
    }
  } else if (sortedSurvivors.length < 5) {
    log(`Only ${sortedSurvivors.length} survivors — skipping boundary detection (need ≥5).`);
  }

  // ── Phase 2 ──────────────────────────────────────────────────────────────
  let p2Results = [];
  if (!PHASE1_ONLY && sortedSurvivors.length > 0) {
    const top10     = sortedSurvivors.slice(0, Math.min(PHASE2_TOP_N, sortedSurvivors.length));
    const p2Combos  = top10.map(r => ({ ...r.params, _type: r.type }));

    log(`\nTop ${top10.length} survivors proceeding to Phase 2:`);
    top10.forEach((r, i) => {
      const s = r.scoreData;
      log(`  #${i+1}: rps=${(s.rps*100).toFixed(1)}%  score=${s.score.toFixed(3)}`);
    });

    p2Results = runPhase(
      p2Combos, tracks, PHASE2_RACES,
      'PHASE 2',
      2 * 3600 * 1000,  // 2 h budget
      natOvtRelaxed ? HC_NAT_OVT_RELAXED : HC_NAT_OVT,
    );
  } else if (!PHASE1_ONLY) {
    log('\nNo survivors — Phase 2 skipped.');
  }

  // ── Sensitivity analysis ─────────────────────────────────────────────────
  log('\nComputing parameter sensitivity...');
  const sensitivity = computeSensitivity(p1Results);
  const sensSorted  = Object.entries(sensitivity).sort((a, b) => b[1].delta - a[1].delta);
  log('  Rank  Parameter                          Δscore  Prefer');
  sensSorted.forEach(([k, { delta, preference }], i) => {
    log(`  ${String(i+1).padStart(2)}.   ${k.padEnd(35)}${delta.toFixed(3).padStart(7)}  ${preference}`);
  });

  // ── Write report ──────────────────────────────────────────────────────────
  log('\nWriting report...');
  writeReport({ p1Results, p2Results, sensitivity, boundaryIssues: allBoundaryIssues, runDate, natOvtRelaxed });

  const totalMs = Date.now() - wallStart;
  log('\n╔══════════════════════════════════════════════════════════════════════╗');
  log(`║  SWEEP COMPLETE in ${formatMs(totalMs).padEnd(51)}║`);
  log(`║  Report: ${REPORT_FILE.slice(-60).padEnd(61)}║`);
  log(`║  Log:    ${LOG_FILE.slice(-60).padEnd(61)}║`);
  log('╚══════════════════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  appendFileSync(LOG_FILE, `\nFATAL ERROR: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
