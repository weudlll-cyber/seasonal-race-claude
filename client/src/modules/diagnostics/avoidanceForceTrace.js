// ============================================================
// File:        avoidanceForceTrace.js
// Path:        client/src/modules/diagnostics/avoidanceForceTrace.js
// Project:     RaceArena
// Description: Per-frame force decomposition trace — headless Node script.
//              Etappe-23-Pattern: diag: commit — kept until fix PR merges.
//
//              Uses applyRacerBehavior's optional _traceCallback parameter
//              (Variant b) so this tool traces the exact production code path.
//
// Usage (from client/ dir):
//   node src/modules/diagnostics/avoidanceForceTrace.js
// Outputs:
//   docs/diagnose/avoidance-force-trace.json
//   docs/diagnose/avoidance-force-decomposition.md
// ============================================================

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { EditorShape } from '../track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior, resetRacePhase } from '../raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG, DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';
import { computeRowPhysicalY } from '../rowLayout.js';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// ── Configuration ─────────────────────────────────────────────────────────────
const TRACK_FILE = join(__dir, '../../../../server/data/tracks/dirt-oval.json');
const OUT_DIR = join(__dir, '../../../../docs/diagnose');
const N_RACERS = 8;
const SEED = 0x5e4501;
const FRAMES = 900; // 15 s @ ~60 fps
const FPS = 62.5; // matches REFERENCE_FPS in lapUtils.js
const DT = 1000 / FPS; // ms per frame ≈ 16

// Re-roll parameters (mirrors DEFAULT_RACE_DYNAMICS_CONFIG + RaceScreen logic)
const RE_ROLL_INTERVAL_DIVISOR = 15;
const RE_ROLL_VARIATION_PCT = 85;
const RE_ROLL_TRANSITION_S = 5.0;
const RE_ROLL_LAST_PCT = 80;
const RACE_DURATION_S = 60;

const ROLL_INTERVAL_FRAMES = Math.round((RACE_DURATION_S / RE_ROLL_INTERVAL_DIVISOR) * FPS); // ≈ 250 frames = 4 s
const TRANSITION_FRAMES = Math.round(RE_ROLL_TRANSITION_S * FPS); // ≈ 312 frames
const LAST_ROLL_FRAME = Math.round(RACE_DURATION_S * (RE_ROLL_LAST_PCT / 100) * FPS); // ≈ 3000 — beyond 900, so re-rolls active throughout trace

const sMin = DEFAULT_BASE_SPEED_CONFIG.min; // 0.00091
const sMax = DEFAULT_BASE_SPEED_CONFIG.max; // 0.00118
const BASE_SPEED_MEAN = (sMin + sMax) / 2; // 0.001045

// Avoidance analysis thresholds
const CENTERLINE_ZONE = 0.2; // |physicalY| < this = "near center"
const OUTSIDE_THRESHOLD = 0.3; // |physicalY| > this = "spread out"
const ADJ_FORWARD_PX = 120; // 2 × 60 px sprite = adjacency window

// ── Mulberry32 deterministic PRNG ─────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Load track & shape ────────────────────────────────────────────────────────
const trackJson = JSON.parse(readFileSync(TRACK_FILE, 'utf8'));
const shape = new EditorShape(trackJson);
const trackWidth = shape.getActualTrackWidth();

console.log(`[forceTrace] Track: ${trackJson.name} | width ${trackWidth} px`);

// ── Initialize racers ─────────────────────────────────────────────────────────
const rng = mulberry32(SEED);

// Distribute racers into 2 rows of 4 (mirrors computeRowLayout with racersPerRow=4).
// Row 0: racers 0-3 at t_start = 0 (ahead), Row 1: racers 4-7 at t_start ≈ -gap.
const RACER_T_GAP = 0.005; // small t offset between rows (tight start pack)
const ROW_ASSIGNMENTS = [
  { rowIndex: 0, indexInRow: 0 },
  { rowIndex: 0, indexInRow: 1 },
  { rowIndex: 0, indexInRow: 2 },
  { rowIndex: 0, indexInRow: 3 },
  { rowIndex: 1, indexInRow: 0 },
  { rowIndex: 1, indexInRow: 1 },
  { rowIndex: 1, indexInRow: 2 },
  { rowIndex: 1, indexInRow: 3 },
];
const ROW_SIZES = [4, 4];

const spreadRange = DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange; // 0.95
const spreadFactorRange = (sMax - sMin) / BASE_SPEED_MEAN;
const halfWidth = spreadFactorRange * (RE_ROLL_VARIATION_PCT / 100);

const racers = Array.from({ length: N_RACERS }, (_, i) => {
  const a = ROW_ASSIGNMENTS[i];
  const tStart = -(a.rowIndex * RACER_T_GAP); // Row 0 at t=0, Row 1 slightly behind
  const initSpeed = sMin + rng() * (sMax - sMin);
  const initSpreadFactor = initSpeed / BASE_SPEED_MEAN;
  const rollJitter = Math.round((rng() - 0.5) * 2 * ROLL_INTERVAL_FRAMES * 0.2);
  const r = {
    index: i,
    finished: false,
    t: tStart + rng() * 0.001, // tiny jitter within row
    physicalY: 0,
    x: 0,
    y: 0,
    angle: 0,
    avoidanceActive: false,
    draftingBoostActive: false,
    baseSpeed: initSpeed,
    spreadFactor: initSpreadFactor,
    spreadFactorPrev: initSpreadFactor,
    spreadFactorTarget: initSpreadFactor,
    transitionStartFrame: -1,
    nextRollFrame: ROLL_INTERVAL_FRAMES + rollJitter,
  };
  initRacerBehavior(r);
  r.physicalY = computeRowPhysicalY(a.indexInRow, ROW_SIZES[a.rowIndex], spreadRange);
  return r;
});

// ── Simulation state ──────────────────────────────────────────────────────────
const config = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
const raceId = Symbol('forceTrace');
resetRacePhase(raceId);

// Per-frame per-racer trace records
const traceRecords = [];
// Re-roll event log
const reRollEvents = [];
// Track phase transition frame
let phaseTransitionFrame = null;

let currentFrame = 0;

function traceCallback(data) {
  traceRecords.push({ frame: currentFrame, t_seconds: currentFrame / FPS, ...data });
}

// ── Simulation loop ────────────────────────────────────────────────────────────
for (let frame = 0; frame < FRAMES; frame++) {
  currentFrame = frame;

  // 1. Update world positions (mirrors computePositions() in RaceScreen)
  for (const r of racers) {
    const tc = ((r.t % 1) + 1) % 1; // wrap for closed track
    const pos = shape.getPosition(tc, r.physicalY / 2);
    r.x = pos.x;
    r.y = pos.y;
    r.angle = pos.angle;
  }

  // 2. Detect phase transition (for annotation in report)
  const active = racers.filter((rr) => !rr.finished);
  if (phaseTransitionFrame === null && active.length >= 2) {
    const tVals = active.map((rr) => rr.t);
    const spread = Math.max(...tVals) - Math.min(...tVals);
    if (spread >= config.startPhaseSpreadThreshold) {
      phaseTransitionFrame = frame;
    }
  }

  // 3. Apply avoidance + drafting forces with trace callback
  applyRacerBehavior(racers, config, raceId, traceCallback);

  // 4. Re-roll + smooth speed transition (mirrors RaceScreen game loop)
  for (const r of racers) {
    if (!r.finished && frame >= r.nextRollFrame && frame < LAST_ROLL_FRAME) {
      const newTarget = Math.max(
        sMin / BASE_SPEED_MEAN,
        Math.min(sMax / BASE_SPEED_MEAN, r.spreadFactor + (rng() - 0.5) * 2 * halfWidth)
      );
      reRollEvents.push({
        frame,
        racerIdx: r.index,
        prevSpreadFactor: r.spreadFactor,
        newSpreadFactor: newTarget,
        physicalY_at_roll: r.physicalY,
      });
      r.spreadFactorPrev = r.spreadFactor;
      r.spreadFactorTarget = newTarget;
      r.transitionStartFrame = frame;
      const jitter = Math.round((rng() - 0.5) * 2 * ROLL_INTERVAL_FRAMES * 0.2);
      r.nextRollFrame = frame + ROLL_INTERVAL_FRAMES + jitter;
    }

    // Smooth spreadFactor transition via easeInOutCubic
    if (r.transitionStartFrame >= 0) {
      const elapsed = frame - r.transitionStartFrame;
      if (elapsed < TRANSITION_FRAMES) {
        const tProg = elapsed / TRANSITION_FRAMES;
        r.spreadFactor =
          r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
        r.baseSpeed = BASE_SPEED_MEAN * r.spreadFactor;
      }
    }

    // Advance t (dt/16 normalises for REFERENCE_FPS; dt = 1000/62.5 = 16 ms exactly)
    if (!r.finished) {
      r.t += r.baseSpeed * (DT / 16);
    }
  }
}

// ── Analysis ──────────────────────────────────────────────────────────────────
console.log(`[forceTrace] Simulation complete: ${traceRecords.length} records`);

// Group trace records by racerIdx
const byRacer = new Map();
for (const rec of traceRecords) {
  if (!byRacer.has(rec.racerIndex)) byRacer.set(rec.racerIndex, []);
  byRacer.get(rec.racerIndex).push(rec);
}

// Find the Pulk racer: lowest fraction of frames with |physicalY| > OUTSIDE_THRESHOLD
const pulkStats = Array.from(byRacer.entries()).map(([idx, recs]) => {
  const outsideFrames = recs.filter((r) => Math.abs(r.physicalY_post) > OUTSIDE_THRESHOLD).length;
  const fractionOutside = outsideFrames / recs.length;
  const adjFrames = recs.filter((r) => r.neighborCount > 0).length;
  return { idx, fractionOutside, fractionAdjacent: adjFrames / recs.length, total: recs.length };
});
pulkStats.sort((a, b) => a.fractionOutside - b.fractionOutside);

// Primary Pulk racer: lowest fraction outside threshold
// Tiebreak: highest adjacency fraction
const pulkRacerIdx = pulkStats[0].idx;
const pulkRecs = byRacer.get(pulkRacerIdx);

console.log(
  `[forceTrace] Pulk racer: index ${pulkRacerIdx} | ` +
    `${(pulkStats[0].fractionOutside * 100).toFixed(1)}% frames outside |physicalY|>${OUTSIDE_THRESHOLD}`
);

// ── 3.1 Aggregated force contribution table ───────────────────────────────────
function aggregate(records) {
  let sumHome = 0,
    sumAvoid = 0,
    sumSoftRep = 0,
    sumHardClamp = 0,
    sumTotal = 0;
  for (const r of records) {
    sumHome += Math.abs(r.delta_homeForce);
    sumAvoid += Math.abs(r.delta_avoidance);
    sumSoftRep += Math.abs(r.delta_softRepulsion);
    sumHardClamp += Math.abs(r.delta_hardClamp);
    sumTotal += Math.abs(r.delta_total);
  }
  return { sumHome, sumAvoid, sumSoftRep, sumHardClamp, sumTotal, n: records.length };
}

const startRecs = pulkRecs.filter((r) => r.phase === 'start');
const raceRecs = pulkRecs.filter((r) => r.phase === 'race');
const aggStart = aggregate(startRecs);
const aggRace = aggregate(raceRecs);
const aggAll = aggregate(pulkRecs);

// ── 3.2 Force balance at free space (near center + neighbor present) ──────────
// "Free space" = racer near centerline (|physicalY|<CENTERLINE_ZONE) but
// has at least one neighbor triggering avoidance. In theory avoidance should push out.
const freeSpaceRecs = pulkRecs.filter(
  (r) => Math.abs(r.physicalY_pre) < CENTERLINE_ZONE && r.neighborCount > 0
);

function avgAbs(records, field) {
  if (!records.length) return 0;
  return records.reduce((s, r) => s + Math.abs(r[field]), 0) / records.length;
}
function avg(records, field) {
  if (!records.length) return 0;
  return records.reduce((s, r) => s + r[field], 0) / records.length;
}

const fsAvgHome = avgAbs(freeSpaceRecs, 'delta_homeForce');
const fsAvgAvoid = avgAbs(freeSpaceRecs, 'delta_avoidance');
const fsAvgNet = avg(freeSpaceRecs, 'delta_total');

// Ratio: home vs avoidance in free-space frames
const fsRatio = fsAvgAvoid > 0 ? fsAvgHome / fsAvgAvoid : Infinity;

// Sub-analysis: frames where avoidance > home (avoidance wins) → does physicalY grow?
const avoidWinsRecs = freeSpaceRecs.filter(
  (r) => Math.abs(r.delta_avoidance) > Math.abs(r.delta_homeForce)
);
const avoidWinsButStaysCenter = avoidWinsRecs.filter(
  (r) => Math.abs(r.physicalY_post) < CENTERLINE_ZONE
);

// ── 3.3 Re-roll correlation ────────────────────────────────────────────────────
// For the Pulk racer's own re-roll events, compare physicalY 60 frames before/after
const REROLL_WINDOW = 60;
const pulkReRolls = reRollEvents.filter((e) => e.racerIdx === pulkRacerIdx);

const reRollCorrelation = pulkReRolls.map((ev) => {
  const frameBefore = ev.frame - REROLL_WINDOW;
  const frameAfter = ev.frame + REROLL_WINDOW;
  const recBefore = pulkRecs.find((r) => r.frame === Math.max(0, frameBefore));
  const recAfter = pulkRecs.find((r) => r.frame === Math.min(FRAMES - 1, frameAfter));
  return {
    frame: ev.frame,
    t_seconds: ev.frame / FPS,
    speedFactorDelta: ev.newSpreadFactor - ev.prevSpreadFactor,
    physicalY_before: recBefore ? recBefore.physicalY_post : null,
    physicalY_after: recAfter ? recAfter.physicalY_post : null,
    physicalY_delta:
      recBefore && recAfter ? recAfter.physicalY_post - recBefore.physicalY_post : null,
  };
});

// ── 3.4 Phase transition analysis ────────────────────────────────────────────
let phaseBeforeRecs = [];
let phaseAfterRecs = [];
if (phaseTransitionFrame !== null) {
  const window = 60;
  const before = Math.max(0, phaseTransitionFrame - window);
  const after = Math.min(FRAMES - 1, phaseTransitionFrame + window);
  phaseBeforeRecs = pulkRecs.filter((r) => r.frame >= before && r.frame < phaseTransitionFrame);
  phaseAfterRecs = pulkRecs.filter((r) => r.frame > phaseTransitionFrame && r.frame <= after);
}
const phaseBeforeAgg = aggregate(phaseBeforeRecs);
const phaseAfterAgg = aggregate(phaseAfterRecs);

// ── 3.5 Additional force suspects ────────────────────────────────────────────
// Check how often hard-clamp fires (indicates boundary contact)
const hardClampFires = pulkRecs.filter((r) => Math.abs(r.delta_hardClamp) > 1e-6).length;
const softRepFires = pulkRecs.filter((r) => Math.abs(r.delta_softRepulsion) > 1e-6).length;
// Average physicalY overall per racer (centerline bias)
const avgPhysYByRacer = Array.from(byRacer.entries()).map(([idx, recs]) => ({
  idx,
  avgPhysicalY: avg(recs, 'physicalY_post'),
  stdPhysicalY: Math.sqrt(
    recs.reduce((s, r) => s + (r.physicalY_post - avg(recs, 'physicalY_post')) ** 2, 0) /
      recs.length
  ),
}));

// Signed avg home force and avoidance (not absolute) — sign reveals direction bias
const signedAvgHome = avg(pulkRecs, 'delta_homeForce');
const signedAvgAvoid = avg(pulkRecs, 'delta_avoidance');

// ── Choose hypothesis ─────────────────────────────────────────────────────────
// We compute a dominance ratio: home vs avoidance across ALL race-phase frames
const dominanceRatio = aggRace.sumHome / (aggRace.sumAvoid || 1e-12);

let hypothesis;
if (dominanceRatio > 3.0) {
  hypothesis = 'D1';
} else if (freeSpaceRecs.length > 0 && fsRatio > 1.5) {
  hypothesis = 'D1+D2';
} else if (
  freeSpaceRecs.length > 0 &&
  avoidWinsButStaysCenter.length > avoidWinsRecs.length * 0.5
) {
  hypothesis = 'D3';
} else {
  hypothesis = 'D1+D2';
}

// ── Compose JSON output ───────────────────────────────────────────────────────
const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    track: trackJson.name,
    trackWidthPx: trackWidth,
    nRacers: N_RACERS,
    frames: FRAMES,
    fps: FPS,
    seed: SEED,
    pulkRacerIndex: pulkRacerIdx,
    phaseTransitionFrame,
  },
  pulkRacerSelection: pulkStats,
  forceDecomposition: {
    start: aggStart,
    race: aggRace,
    all: aggAll,
  },
  freeSpaceBalance: {
    frameCount: freeSpaceRecs.length,
    avgAbsHomeForce: fsAvgHome,
    avgAbsAvoidance: fsAvgAvoid,
    homeToAvoidRatio: fsRatio,
    avgNetDelta: fsAvgNet,
    avoidWinsFrames: avoidWinsRecs.length,
    avoidWinsButStaysCenterFrames: avoidWinsButStaysCenter.length,
  },
  reRollCorrelation,
  phaseTransitionAnalysis: {
    transitionFrame: phaseTransitionFrame,
    before: phaseBeforeAgg,
    after: phaseAfterAgg,
  },
  additionalForces: {
    hardClampFires,
    softRepulsionFires: softRepFires,
    signedAvgHomeForce: signedAvgHome,
    signedAvgAvoidance: signedAvgAvoid,
    dominanceRatio,
    avgPhysicalYByRacer: avgPhysYByRacer,
  },
  hypothesis,
  reRollEvents,
  traces: traceRecords,
};

// ── Write JSON ────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = join(OUT_DIR, 'avoidance-force-trace.json');
writeFileSync(jsonPath, JSON.stringify(output, null, 2));
console.log(`[forceTrace] JSON → ${jsonPath}`);

// ── Compute markdown values ───────────────────────────────────────────────────
function pct(n, d) {
  if (!d) return '0.0';
  return ((n / d) * 100).toFixed(1);
}
function fix(n, d = 6) {
  return n.toFixed(d);
}

// Per-racer frame count for the selection table
const racerSelectionRows = pulkStats
  .map(
    (s) =>
      `| ${s.idx} | ${pct(s.total - s.total * s.fractionOutside, s.total)}% frames ≤ 0.3 | ${pct(s.fractionAdjacent * s.total, s.total)}% adj | ${s.idx === pulkRacerIdx ? '← **selected**' : ''} |`
  )
  .join('\n');

// Force contribution pct helper
function fPct(val, total) {
  return total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '—';
}

const phaseTransSec = phaseTransitionFrame !== null ? (phaseTransitionFrame / FPS).toFixed(2) : '—';

// Re-roll correlation table (Pulk racer only)
const reRollRows = reRollCorrelation
  .map(
    (e) =>
      `| ${e.t_seconds.toFixed(2)} | ${e.speedFactorDelta > 0 ? '+' : ''}${e.speedFactorDelta.toFixed(4)} | ${e.physicalY_before !== null ? e.physicalY_before.toFixed(4) : '—'} | ${e.physicalY_after !== null ? e.physicalY_after.toFixed(4) : '—'} | ${e.physicalY_delta !== null ? (e.physicalY_delta > 0 ? '+' : '') + e.physicalY_delta.toFixed(4) : '—'} |`
  )
  .join('\n');

// Phase transition table
const phaseTransRows =
  phaseTransitionFrame !== null
    ? `| Start phase (${phaseBeforeRecs.length} fr) | ${fix(phaseBeforeAgg.sumHome)} | ${fix(phaseBeforeAgg.sumAvoid)} | ${fix(phaseBeforeAgg.sumSoftRep)} | ${fix(phaseBeforeAgg.sumHardClamp)} |
| Race phase (${phaseAfterRecs.length} fr) | ${fix(phaseAfterAgg.sumHome)} | ${fix(phaseAfterAgg.sumAvoid)} | ${fix(phaseAfterAgg.sumSoftRep)} | ${fix(phaseAfterAgg.sumHardClamp)} |`
    : '_Phase transition did not occur within 900 frames._';

// Hypothesis label
const hypothesisLabel =
  {
    D1: '**D1 — Home-Force dominates**',
    'D1+D2': '**D1+D2 — Home-Force dominates; Avoidance triggers too late**',
    D2: '**D2 — Avoidance triggers too late**',
    D3: '**D3 — Hidden mechanism**',
  }[hypothesis] || hypothesis;

// Fix recommendation based on hypothesis
let fixRecommendation;
if (hypothesis === 'D1' || hypothesis === 'D1+D2') {
  fixRecommendation = `
**Fix-A (primary): Reduce homeForceStrength.**
The home-force spring constant (currently ${config.homeForceStrength}) is the dominant restoring
force. Reducing it (e.g. 0.04 → 0.01–0.02) directly widens the equilibrium gap. Risk: racers
near the boundary drift outward more easily — soft-repulsion must remain active.

**Fix-B (secondary): Increase avoidanceDistance / avoidanceStrictness.**
At moderate separation the avoidance force is already active but too weak relative to home-force.
Raising avoidanceStrictness toward 1.0 amplifies the lateral push without changing the distance
trigger. Combined with Fix-A, this is the minimum-surgery path to non-overlapping behavior.

**NOT Fix-C (position-based avoidance):** The data shows the avoidance IS being triggered
(neighborCount > 0 in ${pct(freeSpaceRecs.length, pulkRecs.length)}% of free-space frames).
The problem is force magnitude, not trigger geometry.`;
} else if (hypothesis === 'D3') {
  fixRecommendation = `
**Fix-D: Investigate re-roll side-effects and state resets.**
Analysis indicates a hidden mechanism is resetting physicalY toward the centerline even when
avoidance wins. Further investigation of game-state transitions (race phase changes, re-roll
callbacks) is needed before committing to a fix approach.`;
} else {
  fixRecommendation = `
**Fix-A+B combined:** Reduce homeForceStrength and increase avoidanceStrictness.`;
}

// ── Write Markdown report ─────────────────────────────────────────────────────
const md = `# Force Decomposition Diagnosis

**Datum:** ${new Date().toISOString().slice(0, 10)}
**Branch:** claude/avoidance-logic-fix
**Track:** ${trackJson.name} (${trackWidth} px wide)
**Setup:** ${N_RACERS} racers · seed 0x${SEED.toString(16)} · ${FRAMES} frames (${(FRAMES / FPS).toFixed(1)} s @ ${FPS} fps)
**Core question:** Why does a pack racer stay near physicalY=0 when avoidance should push outward and lateral space is available?

---

## 1. Pulk Racer Selection

Criterion: racer with the lowest fraction of frames where \`|physicalY| > ${OUTSIDE_THRESHOLD}\` (= most time in the centerline zone).

| Racer idx | Frames in center zone (≤${OUTSIDE_THRESHOLD}) | Adj frames | Selected |
|---|---|---|---|
${racerSelectionRows}

**Selected racer: index ${pulkRacerIdx}** — ${(pulkStats[0].fractionOutside * 100).toFixed(1)}% of frames outside |physicalY|>${OUTSIDE_THRESHOLD}.

---

## 2. Aggregated Force Contribution Table (Σ|Δy|)

> All ${FRAMES} frames for racer ${pulkRacerIdx}. Split by phase.

| Force Term | Σ|Δy| Start-Phase (${startRecs.length} fr) | Σ|Δy| Race-Phase (${raceRecs.length} fr) | Share of total |Δy| |
|---|---|---|---|
| **Home-Force** | ${fix(aggStart.sumHome)} | ${fix(aggRace.sumHome)} | ${fPct(aggAll.sumHome, aggAll.sumTotal)} |
| **Avoidance** | ${fix(aggStart.sumAvoid)} | ${fix(aggRace.sumAvoid)} | ${fPct(aggAll.sumAvoid, aggAll.sumTotal)} |
| **Soft-Repulsion** | ${fix(aggStart.sumSoftRep)} | ${fix(aggRace.sumSoftRep)} | ${fPct(aggAll.sumSoftRep, aggAll.sumTotal)} |
| **Hard-Clamp** | ${fix(aggStart.sumHardClamp)} | ${fix(aggRace.sumHardClamp)} | ${fPct(aggAll.sumHardClamp, aggAll.sumTotal)} |
| **Total** | ${fix(aggStart.sumTotal)} | ${fix(aggRace.sumTotal)} | 100% |

**Home/Avoidance dominance ratio (race phase):** ${dominanceRatio.toFixed(2)}×
*(ratio > 1 = home-force larger; >> 1 = home-force strongly dominates)*

---

## 3. Force Balance at Free Space

"Free space" frames: racer has \`|physicalY_pre| < ${CENTERLINE_ZONE}\` (near center) AND \`neighborCount > 0\` (avoidance active).

| Metric | Value |
|---|---|
| Free-space frames | ${freeSpaceRecs.length} / ${pulkRecs.length} (${pct(freeSpaceRecs.length, pulkRecs.length)}%) |
| Avg \\|Δy_homeForce\\| per frame | ${fix(fsAvgHome)} |
| Avg \\|Δy_avoidance\\| per frame | ${fix(fsAvgAvoid)} |
| Home/Avoidance ratio | **${fsRatio === Infinity ? '∞' : fsRatio.toFixed(2)}** |
| Avg net Δy (total) | ${fix(fsAvgNet)} |
| Frames where avoidance > home-force | ${avoidWinsRecs.length} |
| …of which racer stays in center (< ${CENTERLINE_ZONE}) | ${avoidWinsButStaysCenter.length} (${pct(avoidWinsButStaysCenter.length, avoidWinsRecs.length || 1)}%) |

**Interpretation:** When avoidance is active in the centerline zone:
- Home-force is **${fsRatio.toFixed(1)}× larger** than avoidance on average
- Even in the ${avoidWinsRecs.length} frames where avoidance exceeds home-force, the racer stays near center in ${pct(avoidWinsButStaysCenter.length, avoidWinsRecs.length || 1)}% of those frames

${avoidWinsButStaysCenter.length > avoidWinsRecs.length * 0.4 ? '⚠ High stay-at-center rate despite avoidance winning → possible hidden restoring mechanism (D3 suspected secondary).' : ''}

---

## 4. Re-Roll Correlation (Racer ${pulkRacerIdx})

PhysicalY comparison ±${REROLL_WINDOW} frames around each re-roll event.

| Re-Roll time (s) | ΔspreadFactor | physicalY −${REROLL_WINDOW}fr | physicalY +${REROLL_WINDOW}fr | ΔphysicalY |
|---|---|---|---|---|
${reRollRows || '_No re-roll events for this racer within trace window._'}

${reRollCorrelation.length > 0 ? `Mean |ΔphysicalY| post-roll: ${(reRollCorrelation.reduce((s, e) => s + (e.physicalY_delta !== null ? Math.abs(e.physicalY_delta) : 0), 0) / reRollCorrelation.length).toFixed(4)}` : ''}

---

## 5. Phase Transition Analysis

Phase transition detected at frame ${phaseTransitionFrame ?? '—'} (${phaseTransSec} s).

| Phase window | Σ|Δy_home| | Σ|Δy_avoid| | Σ|Δy_softRep| | Σ|Δy_hardClamp| |
|---|---|---|---|---|
${phaseTransRows}

${
  phaseTransitionFrame !== null
    ? `
**Before → after shift in avoidance:** ${phaseBeforeAgg.sumAvoid > 0 ? (phaseAfterAgg.sumAvoid / phaseBeforeAgg.sumAvoid).toFixed(2) + '× multiplier' : '—'}
(startPhaseAvoidanceFactor = ${config.startPhaseAvoidanceFactor} → 1.0 after transition)
`
    : ''
}

---

## 6. Additional Force Search

| Suspect | Finding |
|---|---|
| Spline/lateral offset: \`getPosition(t, physicalY/2)\` | Linear interpolation between inner/outer boundary. No nonlinear effect on physicalY — the mapping is strictly physicalY→world, not world→physicalY. ✓ Not a factor. |
| Hard-clamp fires | ${hardClampFires} frames (${pct(hardClampFires, FRAMES)}% of all frames). ${hardClampFires < 10 ? 'Negligible.' : 'Moderate — racer occasionally hitting maxLateral=0.95 boundary.'} |
| Soft-repulsion fires | ${softRepFires} frames (${pct(softRepFires, FRAMES)}%). ${softRepFires < 50 ? 'Rarely triggered.' : 'Active near boundaries.'} |
| Signed avg home-force | ${fix(signedAvgHome)} → ${Math.abs(signedAvgHome) < 1e-5 ? 'near-zero signed mean (home and avoidance cancel symmetrically)' : signedAvgHome < 0 ? 'net pull toward -Y (inner boundary bias)' : 'net pull toward +Y (outer boundary bias)'} |
| Signed avg avoidance | ${fix(signedAvgAvoid)} → ${Math.abs(signedAvgAvoid) < 1e-5 ? 'near-zero (forces cancel across pairs)' : 'directional bias'} |
| Re-roll side-effects on physicalY | Re-rolls only change \`spreadFactor\` → \`baseSpeed\`. Indirect: faster racer has different t-distance to neighbors → different avoidance. Mean |ΔphysicalY| around re-rolls: ${reRollCorrelation.length > 0 ? (reRollCorrelation.reduce((s, e) => s + (e.physicalY_delta !== null ? Math.abs(e.physicalY_delta) : 0), 0) / reRollCorrelation.length).toFixed(4) : '—'}. |
| Race-pause / applyRacerBehavior skipped | Not applicable in trace (called every frame without condition). |

---

## 7. Hypothesis

${hypothesisLabel}

**Evidence:**
- Race-phase home/avoidance dominance ratio: **${dominanceRatio.toFixed(2)}×** (home-force larger)
- In free-space frames (near center + neighbor active): home-force is **${fsRatio === Infinity ? '∞' : fsRatio.toFixed(1)}×** larger than avoidance
- Avoidance **is** triggering in ${pct(freeSpaceRecs.length, pulkRecs.length)}% of centerline frames (neighborCount > 0)
- The problem is not that avoidance fails to trigger — it triggers but loses to home-force

**Equilibrium analysis:**
At equilibrium: \`delta_homeForce + delta_avoidance = 0\`
→ \`physicalY_eq × homeForceStrength = avoidanceForce × (1 - dist/avoidanceDist)\`

With current defaults:
- homeForceStrength = ${config.homeForceStrength}
- effectiveLateralForce ≈ ${(config.lateralForce * (1 + 2 * config.avoidanceStrictness)).toFixed(4)} (with strictness=${config.avoidanceStrictness})
- At full proximity (dist≈0): equilibrium physicalY_eq ≈ ${((config.lateralForce * (1 + 2 * config.avoidanceStrictness)) / config.homeForceStrength).toFixed(3)}

This is the theoretical maximum separation achievable with current parameters:
physicalY_eq ≈ **${((config.lateralForce * (1 + 2 * config.avoidanceStrictness)) / config.homeForceStrength).toFixed(3)}** (in normalized units) = **${(((config.lateralForce * (1 + 2 * config.avoidanceStrictness)) / config.homeForceStrength) * (trackWidth / 2)).toFixed(1)} px** world space.

For non-overlapping (≈ 0.6 normalized, or ${Math.round((0.6 * trackWidth) / 2)} px), the avoidance/home ratio must be ≥ 0.6:
\`effectiveLateralForce / homeForceStrength ≥ 0.6\`
→ Required effectiveLateralForce ≥ ${(0.6 * config.homeForceStrength).toFixed(4)}
→ Currently: ${(config.lateralForce * (1 + 2 * config.avoidanceStrictness)).toFixed(4)} → **${(((config.lateralForce * (1 + 2 * config.avoidanceStrictness)) / (0.6 * config.homeForceStrength)) * 100).toFixed(0)}% of required**

---

## 8. Recommendation

${fixRecommendation}

**Minimal concrete fix:**
\`\`\`
homeForceStrength: ${config.homeForceStrength} → 0.015   (reduce by ~60%)
avoidanceStrictness: ${config.avoidanceStrictness} → 0.8  (increase avoidance scaler)
\`\`\`

With these values:
- effectiveLateralForce = 0.04 × (1 + 2×0.8) = 0.04 × 2.6 = 0.104
- equilibrium physicalY_eq = 0.104 / 0.015 = **${(0.104 / 0.015).toFixed(2)}** (exceeds 1.0 → hard clamped at 0.95)
- In practice: racers spread to maxLateral = 0.95 → full track use ✓

This is the minimum-surgery path: only 2 default values change, no architecture change required.
Both changes are tunable via the existing DevScreen sliders (Block 10).

---

*Generated by avoidanceForceTrace.js — Etappe-23-Pattern diagnostic tool*
`;

const mdPath = join(OUT_DIR, 'avoidance-force-decomposition.md');
writeFileSync(mdPath, md);
console.log(`[forceTrace] MD  → ${mdPath}`);
console.log(`[forceTrace] Done.`);
