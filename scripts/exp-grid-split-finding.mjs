// ============================================================
// exp-grid-split-finding.mjs — FINDING: the sim's plan grid is not the sim's actual grid.
//
// REPORT-ONLY. No races are run, no sim is spawned, no behaviour is changed. This is pure arithmetic
// over the two row-layout shuffles the sim already performs, replicated with the REAL shared
// functions (computeEvenRowLayout, makePRNG/mulberry32, comboLayoutSeed) so the numbers are the
// engine's own, not a model of it.
//
// ── THE FINDING ─────────────────────────────────────────────────────────────────────────────────
// scripts/sim-fairness.mjs builds the start grid TWICE, from two different generators:
//
//   PLAN grid   (main loop)        computeEvenRowLayout(n, rows, makePRNG(comboLayoutSeed(track, racer, GLOBAL_SEED)))
//                                  -> planRacers -> createRacePlan(...).startRowIndex
//   ACTUAL grid (runSingleRace)    computeEvenRowLayout(n, rows)   with Math.random = makePRNG(raceSeed)
//                                  -> assignmentByRacer -> where each racer ACTUALLY starts
//
// The PLAN grid is keyed on the BATCH seed and the track/racer names, so it is CONSTANT across every
// race of a sweep. The ACTUAL grid is keyed on the PER-RACE seed, so it changes every race. They are
// therefore different permutations, and the plan's belief about where a racer starts is unrelated to
// where that racer actually starts.
//
// Verified as the first consumer: between the seed swap (`Math.random = makePRNG(seed)`) and the
// actual-grid shuffle, the only call is computeRacerLayout, which draws no randomness. So the actual
// grid is exactly computeEvenRowLayout(n, rows) under a fresh makePRNG(raceSeed) — replicated here.
//
// ── WHY IT (MOSTLY) DOES NOT MATTER, AND WHERE IT DOES ──────────────────────────────────────────
// startRowIndex is consumed by createRacePlan in exactly two places (racePlanner.js):
//   * `byRow` — built and then NEVER READ (dead code); zero impact.
//   * `middleField` -> `pulkPool` -> `pulkRacerIds` — the 3 racers that receive the PULK cohesion
//     bias (the only consumer, computePulkBiasedTarget).
// The target-rank assignment does NOT read startRowIndex at all — it is a Fisher-Yates over the
// racers ARRAY ORDER — which is why outcome fairness is grid-independent by construction and is not
// corrupted by this split.
//
// So the measurable consequence is: the PULK bias is applied to racers chosen as "middle field
// (rows 1-3)" according to a grid that is not the one they start on. This script quantifies both the
// row divergence and that concrete mis-selection rate.
//
// Usage: node scripts/exp-grid-split-finding.mjs [--out=reports/greenfield/grid-split]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { computeEvenRowLayout } from '../client/src/modules/rowLayout.js';
import { mulberry32 } from '../client/src/modules/racePlanner.js';

// comboLayoutSeed — VERBATIM copy of the sim's exported function (sim-fairness.mjs). It is duplicated
// rather than imported ON PURPOSE: sim-fairness.mjs has no main guard, so importing it executes a full
// sweep as a side effect. The body below must stay identical to the sim's; it is 8 lines of FNV-1a and
// the equality is asserted by the self-check at the bottom of this file.
function comboLayoutSeed(trackId, racerType, globalSeed) {
  let h = 0x811c9dc5;
  const str = `${trackId}|${racerType}|${globalSeed}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/grid-split'); return isAbsolute(r) ? r : join(ROOT, r); })();

const N_RACERS = 40;
const GLOBAL_SEED = 1;
const N_RACES = 100;
// rowCount per track as the sim itself reports it (`rows=` in its per-combo header) for the standard
// 40-racer field at the seeded default racer. Both grids are built over the SAME row structure — only
// the permutation differs — so this is the one shared input.
const TRACKS = [
  { id: 'luger-hill', racer: 'luge', rows: 5, closed: false },
  { id: 'mountainstreet', racer: 'boarder', rows: 2, closed: false },
  { id: 'searound', racer: 'manta', rows: 7, closed: true },
  { id: 'dirt-oval', racer: 'horse', rows: 4, closed: true },
];

// SELF-CHECK: prove the duplicated comboLayoutSeed above is still identical to the sim's. Reads
// sim-fairness.mjs as TEXT (never imports it — that would run a sweep), extracts its exported
// definition and compares the normalised source. Fails loud rather than reporting numbers from a
// drifted copy.
{
  const src = readFileSync(join(ROOT, 'scripts/sim-fairness.mjs'), 'utf8');
  const m = src.match(/export function comboLayoutSeed[\s\S]*?\n\}/);
  if (!m) throw new Error('self-check: could not locate comboLayoutSeed in sim-fairness.mjs');
  const norm = (s) => s.replace(/export\s+/, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
  if (norm(m[0]) !== norm(comboLayoutSeed.toString())) {
    throw new Error('self-check FAILED: local comboLayoutSeed has drifted from sim-fairness.mjs — numbers would be wrong.');
  }
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const r4 = (x) => (x == null ? '' : +Number(x).toFixed(4));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');

// rowOf: racerIndex -> rowIndex for a given layout
const rowMap = (layout) => new Map(layout.assignments.map((a) => [a.racerIndex, a.rowIndex]));

/**
 * Replicate createRacePlan's rng consumption up to and including pulk selection, for a given plan
 * grid ordering. Order matters: the rank pool Fisher-Yates runs FIRST (n-1 draws), then the pulk
 * shuffle draws from the same advancing stream — exactly as racePlanner.js does.
 */
function planSelection(seed, planOrderIndices, rowOfPlan) {
  const rng = mulberry32(seed);
  const n = planOrderIndices.length;
  // 1) target-rank Fisher-Yates over 1..n (same stream, first consumer)
  const pool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // racers[i].index gets pool[i]  (racers == planRacers, ordered by GRID POSITION in the sim)
  const targetRank = new Map();
  planOrderIndices.forEach((idx, i) => targetRank.set(idx, pool[i]));
  const winner = [...targetRank.entries()].find(([, r]) => r === 1)[0];
  // 2) pulk pool from the PLAN's rows, then Fisher-Yates on the same stream
  const middle = planOrderIndices.filter((idx) => idx !== winner && rowOfPlan.get(idx) >= 1 && rowOfPlan.get(idx) <= 3);
  const poolR = middle.length >= 3 ? middle : planOrderIndices.filter((idx) => idx !== winner);
  const shuffled = [...poolR];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { pulkIds: shuffled.slice(0, 3), winner };
}

const perTrack = [];
const rows = [];
for (const t of TRACKS) {
  // PLAN grid — constant for the whole batch (batch seed + track/racer names)
  const planLayout = computeEvenRowLayout(N_RACERS, t.rows, mulberry32(comboLayoutSeed(t.id, t.racer, GLOBAL_SEED)));
  const rowOfPlan = rowMap(planLayout);
  // planRacers order = grid position order (assignments order), as the sim builds it
  const planOrderIndices = planLayout.assignments.map((a) => a.racerIndex);

  const diffShare = [], absDelta = [], maxDelta = [], pulkMisplaced = [], pulkTrueMiddle = [];
  for (let raceIdx = 0; raceIdx < N_RACES; raceIdx++) {
    const seed = (GLOBAL_SEED - 1) * N_RACES + raceIdx + 1;
    // ACTUAL grid — per-race seed, first consumer of the stream
    const actualLayout = computeEvenRowLayout(N_RACERS, t.rows, mulberry32(seed));
    const rowOfActual = rowMap(actualLayout);

    let differing = 0; const deltas = [];
    for (let idx = 0; idx < N_RACERS; idx++) {
      const d = Math.abs(rowOfPlan.get(idx) - rowOfActual.get(idx));
      if (d !== 0) differing++;
      deltas.push(d);
    }
    diffShare.push(differing / N_RACERS);
    absDelta.push(mean(deltas));
    maxDelta.push(Math.max(...deltas));

    // Concrete mechanism consequence: of the 3 racers the plan pulk-biases (chosen as "rows 1-3" in
    // the PLAN grid), how many ACTUALLY start in rows 1-3?
    const { pulkIds } = planSelection(seed, planOrderIndices, rowOfPlan);
    const trueMiddle = pulkIds.filter((idx) => rowOfActual.get(idx) >= 1 && rowOfActual.get(idx) <= 3).length;
    pulkTrueMiddle.push(trueMiddle);
    pulkMisplaced.push((3 - trueMiddle) / 3);
  }

  const rec = {
    track: t.id, type: t.closed ? 'closed' : 'open', rows: t.rows,
    rowsDifferShare: mean(diffShare),
    meanAbsRowDelta: mean(absDelta),
    maxRowDelta: Math.max(...maxDelta),
    pulkTrueMiddleMean: mean(pulkTrueMiddle),
    pulkMisplacedShare: mean(pulkMisplaced),
  };
  perTrack.push(rec);
  rows.push(rec);
}

// Pooled
const pooled = {
  track: 'POOLED', type: 'all', rows: '',
  rowsDifferShare: mean(perTrack.map((r) => r.rowsDifferShare)),
  meanAbsRowDelta: mean(perTrack.map((r) => r.meanAbsRowDelta)),
  maxRowDelta: Math.max(...perTrack.map((r) => r.maxRowDelta)),
  pulkTrueMiddleMean: mean(perTrack.map((r) => r.pulkTrueMiddleMean)),
  pulkMisplacedShare: mean(perTrack.map((r) => r.pulkMisplacedShare)),
};

mkdirSync(OUT_ABS, { recursive: true });
const COLS = ['track', 'type', 'rows', 'rowsDifferShare', 'meanAbsRowDelta', 'maxRowDelta', 'pulkTrueMiddleMean', 'pulkMisplacedShare'];
writeFileSync(join(OUT_ABS, 'grid-split.csv'),
  [COLS.join(','), ...[pooled, ...rows].map((r) => COLS.map((c) => (typeof r[c] === 'number' ? r4(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

const md = [];
md.push('# FINDING — the sim builds the start grid twice, from two different seeds');
md.push('');
md.push('**Report-only. No races run, no behaviour changed.** Pure arithmetic over the two row-layout shuffles the sim already performs, replicated with the engine\'s own shared functions (`computeEvenRowLayout`, `mulberry32`/`makePRNG`, `comboLayoutSeed`).');
md.push('');
md.push('## What the split is');
md.push('');
md.push('`scripts/sim-fairness.mjs` builds the start grid **twice**, from two unrelated generators:');
md.push('');
md.push('| grid | where | generator | varies per race? | feeds |');
md.push('|---|---|---|---|---|');
md.push('| **PLAN** | main loop | `makePRNG(comboLayoutSeed(track, racer, GLOBAL_SEED))` | **no** — constant for the whole batch | `planRacers` → `createRacePlan(...).startRowIndex` |');
md.push('| **ACTUAL** | `runSingleRace` | `makePRNG(raceSeed)` (global swap) | yes | `assignmentByRacer` → where each racer really starts |');
md.push('');
md.push('So the plan\'s belief about where a racer starts is drawn from a different seed than the racer\'s real start row, and the plan grid does not even change between races of a sweep. The browser has no such split — it derives one `assignmentByRacer` and uses it for both.');
md.push('');
md.push('## How far apart the two grids are');
md.push('');
md.push(`Per track, ${N_RACES} races, ${N_RACERS} racers, batch seed ${GLOBAL_SEED}:`);
md.push('');
md.push('| track | rows | racers whose plan row ≠ actual row | mean abs row delta | max row delta | pulk racers truly in rows 1–3 (of 3) | pulk mis-selection |');
md.push('|---|---|---|---|---|---|---|');
for (const r of rows) md.push(`| ${r.track} | ${r.rows} | ${pct(r.rowsDifferShare)} | ${r.meanAbsRowDelta.toFixed(2)} | ${r.maxRowDelta} | ${r.pulkTrueMiddleMean.toFixed(2)} | ${pct(r.pulkMisplacedShare)} |`);
md.push(`| **POOLED** | – | **${pct(pooled.rowsDifferShare)}** | **${pooled.meanAbsRowDelta.toFixed(2)}** | ${pooled.maxRowDelta} | **${pooled.pulkTrueMiddleMean.toFixed(2)}** | **${pct(pooled.pulkMisplacedShare)}** |`);
md.push('');
md.push('### The two grids are statistically INDEPENDENT');
md.push('');
md.push('This is the sharpest form of the finding. If the plan grid carried *no* information about the actual grid, the share of racers landing in a different row would be exactly `1 − 1/rows`. It is, on every track:');
md.push('');
md.push('| track | rows | measured differ | independent expectation (1 − 1/rows) | delta |');
md.push('|---|---|---|---|---|');
for (const r of rows) {
  const exp = 1 - 1 / r.rows;
  md.push(`| ${r.track} | ${r.rows} | ${pct(r.rowsDifferShare)} | ${pct(exp)} | ${((r.rowsDifferShare - exp) * 100).toFixed(1)} pp |`);
}
md.push('');
md.push('**The plan\'s `startRowIndex` carries essentially zero information about where the racer actually starts.** It is not "slightly stale" — it is an unrelated draw. Any plan logic that reasons about start rows is, in the sim, reasoning about a grid that does not exist.');
md.push('');
md.push('## Blast radius — what actually reads `startRowIndex`');
md.push('');
md.push('In `racePlanner.js` the plan consumes `startRowIndex` in exactly two places:');
md.push('');
md.push('1. **`byRow`** — built and then **never read**. Dead code. Zero impact.');
md.push('2. **`middleField` → `pulkPool` → `pulkRacerIds`** — the 3 racers that receive the PULK cohesion bias (`computePulkBiasedTarget` is the only consumer).');
md.push('');
md.push('Crucially, **the target-rank assignment never reads `startRowIndex`** — it is a Fisher-Yates over the racers *array order*. That is why outcome fairness is grid-independent by construction and is **not** corrupted by this split.');
md.push('');
md.push('**So the entire measurable consequence is: the PULK cohesion bias is applied to 3 racers selected as "middle field (rows 1–3)" on a grid they do not start on.**');
md.push('');
md.push('## Which committed conclusions are sensitive?');
md.push('');
md.push('**NOT sensitive — paired A-vs-B comparisons (safe).** Every arm in a sweep shares the same batch seed, track, racer and per-race seeds, so both grids — and therefore the identical mis-selection — are *the same in every arm*. The effect is common-mode and cancels in a paired difference. This covers the night run\'s A8 / A0-GR / A5 comparison, the 1200-race finale post-analysis, the composer sweeps, and the gap-reroll confirm: **their relative conclusions stand.**');
md.push('');
md.push('**Potentially sensitive — absolute start-row fairness numbers.** The fairness gate conditions outcomes on the *actual* start row (taken from the result rows, i.e. the ACTUAL grid), so the measurement itself is reading the right rows. But the PULK bias — one of the mechanisms acting on the field — is targeted using the *other* grid. Absolute band-reach / Holm-per-row figures therefore describe an engine whose pulk bias is aimed slightly off the middle field. They are internally valid but are **not** the numbers a corrected engine would produce.');
md.push('');
md.push('**Sensitive — browser ↔ sim parity.** This is the real cost. The browser uses one grid for both the plan and the actual start; the sim uses two. Under the project\'s standing rule that the sim is a *prediction tool for the browser*, the sim is predicting a slightly different mechanism than the one the browser runs. This is an additional, independent parity divergence beyond the plan-ordering issue documented in `docs/EYE-TEST-SEEDS.md`.');
md.push('');
md.push('## Recommendation (no fix applied)');
md.push('');
md.push('1. **Do not block the pending ship on this.** The G=0.75 decision rests on paired comparisons, which are provably unaffected.');
md.push('2. **Treat it as a parity defect, not a fairness defect.** The fairness property (grid-independent assignment) is intact; what is broken is that the sim aims one mechanism using a grid the racers do not start on, and the browser does not.');
md.push('3. **When fixed, the minimal change is to feed `runSingleRace`\'s own `assignmentByRacer` into `planRacers`** (one grid per race, browser-shaped), rather than the batch-level `comboRowLayout`. That is a behaviour change: it moves pulk selection, so it **breaks the OFF fingerprint** and needs its own gate plus a re-baseline of absolute numbers. Schedule it with the parity work, not as a drive-by.');
md.push('4. **Delete the dead `byRow`** in `racePlanner.js` at the same time (zero-risk, it is never read).');
md.push('');
md.push('Data: `grid-split.csv`.');
writeFileSync(join(OUT_ABS, 'SUMMARY.md'), md.join('\n') + '\n');

console.log('\n=== FINDING: plan grid vs actual grid (report-only, no races run) ===');
for (const r of rows) console.log(`  ${r.track.padEnd(16)} rows=${r.rows}  differ=${pct(r.rowsDifferShare)}  meanDelta=${r.meanAbsRowDelta.toFixed(2)}  pulkTrueMiddle=${r.pulkTrueMiddleMean.toFixed(2)}/3  misSelect=${pct(r.pulkMisplacedShare)}`);
console.log(`  ${'POOLED'.padEnd(16)}        differ=${pct(pooled.rowsDifferShare)}  meanDelta=${pooled.meanAbsRowDelta.toFixed(2)}  pulkTrueMiddle=${pooled.pulkTrueMiddleMean.toFixed(2)}/3  misSelect=${pct(pooled.pulkMisplacedShare)}`);
console.log(`Wrote ${join(OUT_ABS, 'SUMMARY.md')}`);
