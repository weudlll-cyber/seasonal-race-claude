// ============================================================
// File:        diag-classification-trace.mjs
// Path:        scripts/diag-classification-trace.mjs
// Project:     RaceArena
// Created:     2026-05-13 (Etappe-23 diagnostic pattern)
// Description: Per-frame trace of right-of-way classification for persistent
//              racing-phase clusters. Extends the PR #88 sim: 600-frame burn-in
//              to spread the field, then 600-frame measurement with full tracing
//              of classification rule, slot-search outcome, and EMA delta.
//              Production raceBehavior.js is not modified.
//
// Run from repo root:
//   node scripts/diag-classification-trace.mjs
//
// Outputs:
//   docs/diagnose/classification-trace-data.ndjson  (per-frame per-pair records)
//   docs/diagnose/classification-summary.json        (aggregate analysis)
// ============================================================

import { createWriteStream, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const behaviorUrl = pathToFileURL(resolve(ROOT, 'client/src/modules/raceBehavior.js')).href;
const { applyRacerBehavior, initRacerBehavior } = await import(behaviorUrl);

// ── Constants (mirrored from raceBehavior.js — must stay in sync) ─────────────
const LATERAL_STABLE_THRESH = 0.005;
const SPEED_DIFF_THRESH = 0.00005;
const MAX_LATERAL = 0.95;

// ── Oval geometry (same as PR #88 sim) ───────────────────────────────────────
const CX = 640, CY = 360, RX = 400, RY = 200;
const OVAL_PERIMETER_PX = Math.PI * (3 * (RX + RY) - Math.sqrt((3 * RX + RY) * (RX + 3 * RY)));

function ovalPos(t, physicalY, corridorHalf) {
  const angle = t * Math.PI * 2;
  const trackX = CX + RX * Math.cos(angle);
  const trackY = CY + RY * Math.sin(angle);
  const txRaw = -RX * Math.sin(angle) * Math.PI * 2;
  const tyRaw = RY * Math.cos(angle) * Math.PI * 2;
  const len = Math.sqrt(txRaw * txRaw + tyRaw * tyRaw);
  const nx = -tyRaw / len;
  const ny = txRaw / len;
  return {
    x: trackX + physicalY * corridorHalf * nx,
    y: trackY + physicalY * corridorHalf * ny,
    angle: Math.atan2(tyRaw, txRaw),
  };
}

function recompute(racers, corridorHalf) {
  for (const r of racers) {
    const pos = ovalPos(r.t, r.physicalY, corridorHalf);
    r.x = pos.x; r.y = pos.y; r.angle = pos.angle;
  }
}

// ── Hitbox overlap detection ──────────────────────────────────────────────────
function pairOverlaps(rA, rB, safetyMarginPx) {
  const mid = (rA.angle + rB.angle) * 0.5;
  const cosM = Math.cos(mid), sinM = Math.sin(mid);
  const dx = rB.x - rA.x, dy = rB.y - rA.y;
  const ls = Math.abs(dx * cosM + dy * sinM);
  const lats = Math.abs(-dx * sinM + dy * cosM);
  const wAvg = (rA.visibleWidthPx + rB.visibleWidthPx) * 0.5;
  const lAvg = (rA.visibleLengthPx + rB.visibleLengthPx) * 0.5;
  return { overlapping: ls < lAvg + safetyMarginPx && lats < wAvg + safetyMarginPx, ls, lats };
}

// ── Racer factory ─────────────────────────────────────────────────────────────
function makeRacer(index, t, physicalY, corridorHalf) {
  const BASE_MIN = 0.00091, BASE_MAX = 0.00118;
  const speed = BASE_MIN + Math.random() * (BASE_MAX - BASE_MIN);
  const pos = ovalPos(t, physicalY, corridorHalf);
  const HITBOX = 19.5; // fallback: referenceSpriteSize(26) * 0.75
  const r = {
    index, t, x: pos.x, y: pos.y, angle: pos.angle,
    physicalY, baseSpeed: speed, finished: false,
    visibleWidthPx: HITBOX, visibleLengthPx: HITBOX,
  };
  initRacerBehavior(r);
  r.physicalY = physicalY;
  r.targetPhysicalY = physicalY;
  r.prevPhysicalY = physicalY;
  return r;
}

// Make clustered start (8 per row, user-confirmed for dirt-oval)
function makeCluster(N, corridorHalf) {
  const HITBOX = 19.5;
  const spriteSize = HITBOX / 0.75;
  const rowGapPx = spriteSize * 1.5;
  const deltaT = rowGapPx / OVAL_PERIMETER_PX;
  const RACERS_PER_ROW = 8;
  const SPREAD = 0.95;

  return Array.from({ length: N }, (_, i) => {
    const rowIndex = Math.floor(i / RACERS_PER_ROW);
    const indexInRow = i % RACERS_PER_ROW;
    const rowSize = Math.min(RACERS_PER_ROW, N - rowIndex * RACERS_PER_ROW);
    const t = -(rowIndex * deltaT);
    const py = rowSize <= 1 ? 0 :
      -SPREAD + (2 * SPREAD * indexInRow) / (rowSize - 1);
    return makeRacer(i, t, py, corridorHalf);
  });
}

// ── Right-of-way classification (mirrors raceBehavior.js rules a/b/c/d) ─────
function aIsTrailer(rA, rB) {
  return rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
}

function classifyPair(rA, rB) {
  const latSpeedA = rA.prevPhysicalY !== undefined
    ? Math.abs(rA.physicalY - rA.prevPhysicalY) : 0;
  const latSpeedB = rB.prevPhysicalY !== undefined
    ? Math.abs(rB.physicalY - rB.prevPhysicalY) : 0;
  const aStable = latSpeedA <= LATERAL_STABLE_THRESH;
  const bStable = latSpeedB <= LATERAL_STABLE_THRESH;

  let yielder, keeper, rule;

  if (aStable && !bStable) {
    yielder = rB; keeper = rA; rule = 'a_lineHolder';
  } else if (bStable && !aIsTrailer(rA, rB)) {
    // B stable, A is leader (not trailer) and presumably moving → A yields
    // Note: code comment in raceBehavior.js is misleading here
    yielder = rA; keeper = rB; rule = 'a_leaderMoving';
  } else {
    const aTrailer = aIsTrailer(rA, rB);
    const trailer = aTrailer ? rA : rB;
    const leader = aTrailer ? rB : rA;
    if ((trailer.baseSpeed ?? 0) > (leader.baseSpeed ?? 0) + SPEED_DIFF_THRESH) {
      yielder = trailer; keeper = leader; rule = 'b_fasterFromBehind';
    } else {
      yielder = latSpeedA <= latSpeedB ? rB : rA;
      keeper = yielder === rA ? rB : rA;
      rule = 'c_calmerHolds';
    }
  }

  // Schutz-Regel (d): if keeper is moving more than yielder → swap
  let schutzeSwapped = false;
  if (keeper.prevPhysicalY !== undefined) {
    const keeperLat = Math.abs(keeper.physicalY - keeper.prevPhysicalY);
    const yielderLat = Math.abs(yielder.physicalY - yielder.prevPhysicalY);
    if (keeperLat > yielderLat * 2 && keeperLat > LATERAL_STABLE_THRESH) {
      [yielder, keeper] = [keeper, yielder];
      schutzeSwapped = true;
    }
  }

  return {
    rule, schutzeSwapped,
    yielder_id: yielder.index, keeper_id: keeper.index,
    latSpeedA, latSpeedB, aStable, bStable,
    bothStable: aStable && bStable,
  };
}

// ── Simulation ────────────────────────────────────────────────────────────────
const N = 20;
const BURN_IN = 600;   // 10s @60fps — let field spread
const TRACE_FRAMES = 900; // 15s @60fps — measurement phase
const PERSISTENT_THRESH = 10; // pairs overlapping >10 consecutive frames → "cluster"
const CORRIDOR = 60;   // user-confirmed: dirt-oval max 8/row
const SAFETY = 3;

const CFG = {
  enabled: true, safetyMarginPx: SAFETY, lookAheadFrames: 3,
  slotSearchRadiusPx: 60, lateralReturnSpeed: 0.2, speedBrakeFactor: 0.95,
  draftingMaxDistance: 110, draftingConeAngle: 30, draftingBoost: 1.1,
  corridorHalfWidthPx: CORRIDOR,
};

console.log(`Burn-in: ${BURN_IN} frames…`);
const racers = makeCluster(N, CORRIDOR);
recompute(racers, CORRIDOR);

for (let f = 0; f < BURN_IN; f++) {
  // Production order: advance t first (with boost/brake), then positions, then behavior
  for (const r of racers) {
    const boost = r.draftingBoostActive ? CFG.draftingBoost : 1.0;
    const brake = r.avoidanceActive ? CFG.speedBrakeFactor : 1.0;
    r.t = (r.t + r.baseSpeed * boost * brake) % 1;
  }
  recompute(racers, CORRIDOR);
  applyRacerBehavior(racers, CFG);
  recompute(racers, CORRIDOR);
}

console.log(`Trace phase: ${TRACE_FRAMES} frames…`);

// Per-pair state tracking
const pairState = new Map(); // key → {streak, totalOverlapFrames}
const pairKey = (a, b) => `${Math.min(a, b)}_${Math.max(a, b)}`;

const allRecords = []; // all overlapping-pair trace records

// Aggregate stats for hypothesis testing
const classificationCounts = {
  'a_lineHolder': 0, 'a_leaderMoving': 0, 'b_fasterFromBehind': 0,
  'c_calmerHolds': 0, 'schutz_swapped': 0,
};
const slotOutcomeCounts = { found: 0, fallback: 0, unchanged: 0 };
let totalOverlapPairFrames = 0;
let framesWithAnyOverlap = 0;
let maxSimultaneousOverlaps = 0;

for (let f = 0; f < TRACE_FRAMES; f++) {
  // Advance t and positions (production order, with boost/brake)
  for (const r of racers) {
    const boost = r.draftingBoostActive ? CFG.draftingBoost : 1.0;
    const brake = r.avoidanceActive ? CFG.speedBrakeFactor : 1.0;
    r.t = (r.t + r.baseSpeed * boost * brake) % 1;
  }
  recompute(racers, CORRIDOR);

  // ── Pre-call: classify all overlapping pairs ─────────────────────────────
  const preState = new Map(racers.map(r => [r.index, {
    physicalY: r.physicalY,
    targetPhysicalY: r.targetPhysicalY,
    avoidanceActive: r.avoidanceActive,
    prevPhysicalY: r.prevPhysicalY,
  }]));

  const overlapping = [];
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const rA = racers[i], rB = racers[j];
      if (rA.finished || rB.finished) continue;
      const { overlapping: isOvlp, ls, lats } = pairOverlaps(rA, rB, SAFETY);
      if (!isOvlp) continue;
      const cls = classifyPair(rA, rB);
      overlapping.push({ rA_id: rA.index, rB_id: rB.index, cls, ls, lats });
    }
  }

  // ── Run production behavior ───────────────────────────────────────────────
  applyRacerBehavior(racers, CFG);
  recompute(racers, CORRIDOR);

  // ── Post-call: measure outcomes ──────────────────────────────────────────
  const postState = new Map(racers.map(r => [r.index, {
    physicalY: r.physicalY,
    targetPhysicalY: r.targetPhysicalY,
    avoidanceActive: r.avoidanceActive,
  }]));

  const frameOvlpCount = overlapping.length;
  if (frameOvlpCount > 0) framesWithAnyOverlap++;
  if (frameOvlpCount > maxSimultaneousOverlaps) maxSimultaneousOverlaps = frameOvlpCount;
  totalOverlapPairFrames += frameOvlpCount;

  // Track pairs and build records
  const activeKeys = new Set();
  for (const { rA_id, rB_id, cls, ls, lats } of overlapping) {
    const key = pairKey(rA_id, rB_id);
    activeKeys.add(key);
    if (!pairState.has(key)) pairState.set(key, { streak: 0, totalOverlapFrames: 0, firstSeen: f });
    const ps = pairState.get(key);
    ps.streak++;
    ps.totalOverlapFrames++;

    // Slot outcome inference (using pre/post physicalY and avoidanceActive)
    // For the pair: check the YIELDER's outcome
    const yielderPre = preState.get(cls.yielder_id);
    const yielderPost = postState.get(cls.yielder_id);
    const targetDelta = Math.abs(yielderPost.targetPhysicalY - yielderPre.physicalY);
    let slotOutcome;
    if (yielderPost.avoidanceActive) {
      slotOutcome = 'fallback';
    } else if (targetDelta > 0.025) {
      slotOutcome = 'found';
    } else {
      slotOutcome = 'unchanged'; // yielder not processed (resolved.has blocked it, or not in collision)
    }

    // EMA delta for both
    const emaDeltaYielder = yielderPost.physicalY - yielderPre.physicalY;
    const keeperPre = preState.get(cls.keeper_id);
    const keeperPost = postState.get(cls.keeper_id);
    const emaDeltaKeeper = keeperPost.physicalY - keeperPre.physicalY;

    // Aggregate stats
    classificationCounts[cls.rule] = (classificationCounts[cls.rule] ?? 0) + 1;
    if (cls.schutzeSwapped) classificationCounts.schutz_swapped++;
    slotOutcomeCounts[slotOutcome]++;

    allRecords.push({
      f, key, rA_id, rB_id,
      ls: +ls.toFixed(2), lats: +lats.toFixed(2),
      rule: cls.rule, schutzeSwapped: cls.schutzeSwapped,
      bothStable: cls.bothStable, aStable: cls.aStable, bStable: cls.bStable,
      latSpeedA: +cls.latSpeedA.toFixed(6), latSpeedB: +cls.latSpeedB.toFixed(6),
      yielder_id: cls.yielder_id, keeper_id: cls.keeper_id,
      slotOutcome,
      targetDelta: +targetDelta.toFixed(5),
      emaDeltaYielder: +emaDeltaYielder.toFixed(6),
      emaDeltaKeeper: +emaDeltaKeeper.toFixed(6),
      physYYielder: +yielderPre.physicalY.toFixed(4),
      physYKeeper: +keeperPre.physicalY.toFixed(4),
      targetYYielder: +yielderPost.targetPhysicalY.toFixed(4),
      streak: ps.streak,
    });
  }

  // Reset streak for pairs that are no longer overlapping
  for (const [key, ps] of pairState) {
    if (!activeKeys.has(key)) ps.streak = 0;
  }
}

// ── Identify persistent clusters ──────────────────────────────────────────────
const persistentPairs = [];
for (const [key, ps] of pairState) {
  if (ps.totalOverlapFrames >= PERSISTENT_THRESH) {
    const [aId, bId] = key.split('_').map(Number);
    const pairRecords = allRecords.filter(r => r.key === key);

    // Aggregates for this pair
    const ruleDist = {};
    let slotFound = 0, slotFallback = 0, slotUnchanged = 0;
    let emaSumYielder = 0, emaSumKeeper = 0;
    let bothStableCount = 0;
    let maxStreak = 0;

    for (const rec of pairRecords) {
      ruleDist[rec.rule] = (ruleDist[rec.rule] ?? 0) + 1;
      if (rec.slotOutcome === 'found') slotFound++;
      else if (rec.slotOutcome === 'fallback') slotFallback++;
      else slotUnchanged++;
      emaSumYielder += Math.abs(rec.emaDeltaYielder);
      emaSumKeeper += Math.abs(rec.emaDeltaKeeper);
      if (rec.bothStable) bothStableCount++;
      if (rec.streak > maxStreak) maxStreak = rec.streak;
    }

    // Sample: 30 consecutive frames from the longest streak
    const longestStreakStart = pairRecords.reduce((best, r, i) => {
      return r.streak > (pairRecords[best]?.streak ?? 0) ? i : best;
    }, 0);
    const sampleStart = Math.max(0, longestStreakStart - 29);
    const sample = pairRecords.slice(sampleStart, sampleStart + 30);

    persistentPairs.push({
      key, rA_id: aId, rB_id: bId,
      totalOverlapFrames: ps.totalOverlapFrames,
      firstSeenFrame: ps.firstSeen,
      maxConsecutiveStreak: maxStreak,
      classification: ruleDist,
      slotOutcome: { found: slotFound, fallback: slotFallback, unchanged: slotUnchanged },
      slotFoundRate: +(slotFound / pairRecords.length).toFixed(3),
      fallbackRate: +(slotFallback / pairRecords.length).toFixed(3),
      unchangedRate: +(slotUnchanged / pairRecords.length).toFixed(3),
      bothStableRate: +(bothStableCount / pairRecords.length).toFixed(3),
      avgAbsEmaDeltaYielder: +(emaSumYielder / pairRecords.length).toFixed(6),
      avgAbsEmaDeltaKeeper: +(emaSumKeeper / pairRecords.length).toFixed(6),
      sampleFrames: sample,
    });
  }
}

persistentPairs.sort((a, b) => b.totalOverlapFrames - a.totalOverlapFrames);

// ── Write NDJSON trace ────────────────────────────────────────────────────────
const outDir = resolve(ROOT, 'docs/diagnose');
mkdirSync(outDir, { recursive: true });

// Filter to only persistent pairs' records to keep file manageable
const persistentKeys = new Set(persistentPairs.map(p => p.key));
const persistentRecords = allRecords.filter(r => persistentKeys.has(r.key));

const ndjsonPath = resolve(outDir, 'classification-trace-data.ndjson');
const ws = createWriteStream(ndjsonPath, 'utf8');
for (const rec of persistentRecords) ws.write(JSON.stringify(rec) + '\n');
ws.end();

// ── Write summary JSON ────────────────────────────────────────────────────────
const summary = {
  meta: {
    generated: new Date().toISOString(),
    burnInFrames: BURN_IN,
    traceFrames: TRACE_FRAMES,
    persistentThresholdFrames: PERSISTENT_THRESH,
    N, corridorHalf: CORRIDOR, safetyMarginPx: SAFETY,
    lateralReturnSpeed: CFG.lateralReturnSpeed,
    slotSearchRadiusPx: CFG.slotSearchRadiusPx,
    hitboxPx: 19.5,
  },
  overallStats: {
    framesWithAnyOverlap,
    overlapRate: +(framesWithAnyOverlap / TRACE_FRAMES).toFixed(3),
    maxSimultaneousOverlapPairs: maxSimultaneousOverlaps,
    totalOverlapPairFrames,
    uniqueOverlappingPairs: pairState.size,
    persistentPairsFound: persistentPairs.length,
  },
  classificationDistribution: classificationCounts,
  slotOutcomeDistribution: slotOutcomeCounts,
  persistentClusters: persistentPairs,
};

writeFileSync(resolve(outDir, 'classification-summary.json'), JSON.stringify(summary, null, 2));

// ── Print summary ─────────────────────────────────────────────────────────────
console.log('\n=== OVERALL STATS ===');
console.log(`Overlap rate: ${(framesWithAnyOverlap / TRACE_FRAMES * 100).toFixed(1)}% of ${TRACE_FRAMES} frames`);
console.log(`Max simultaneous overlap pairs: ${maxSimultaneousOverlaps}`);
console.log(`Unique pairs that ever overlapped: ${pairState.size}`);
console.log(`Persistent pairs (≥${PERSISTENT_THRESH} frames): ${persistentPairs.length}`);

console.log('\n=== CLASSIFICATION DISTRIBUTION (all overlap frames) ===');
const total = Object.values(classificationCounts).reduce((s, v) => s + v, 0) - classificationCounts.schutz_swapped;
for (const [rule, cnt] of Object.entries(classificationCounts)) {
  if (rule === 'schutz_swapped') continue;
  console.log(`  ${rule.padEnd(22)}: ${cnt} (${(cnt/total*100).toFixed(1)}%)`);
}
console.log(`  schutz_rule_d_swaps  : ${classificationCounts.schutz_swapped}`);

console.log('\n=== SLOT OUTCOME DISTRIBUTION ===');
const totalSlots = Object.values(slotOutcomeCounts).reduce((s, v) => s + v, 0);
for (const [outcome, cnt] of Object.entries(slotOutcomeCounts)) {
  console.log(`  ${outcome.padEnd(12)}: ${cnt} (${(cnt/totalSlots*100).toFixed(1)}%)`);
}

console.log(`\n=== TOP PERSISTENT CLUSTERS (${persistentPairs.length} found) ===`);
for (const p of persistentPairs.slice(0, 10)) {
  console.log(
    `  Pair ${p.key}: ${p.totalOverlapFrames}f total, streak=${p.maxConsecutiveStreak}`,
    `slotFound=${(p.slotFoundRate*100).toFixed(0)}%`,
    `fallback=${(p.fallbackRate*100).toFixed(0)}%`,
    `unchanged=${(p.unchangedRate*100).toFixed(0)}%`,
    `bothStable=${(p.bothStableRate*100).toFixed(0)}%`,
    `top_rule=${Object.entries(p.classification).sort((a,b)=>b[1]-a[1])[0]?.[0]}`,
    `ema=${(p.avgAbsEmaDeltaYielder*1000).toFixed(2)}e-3`,
  );
}

console.log(`\nTrace: ${ndjsonPath}`);
console.log(`Summary: ${resolve(outDir, 'classification-summary.json')}`);
