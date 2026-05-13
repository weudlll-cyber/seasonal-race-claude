// ============================================================
// File:        diag-collision-real-loop.mjs
// Path:        scripts/diag-collision-real-loop.mjs
// Project:     RaceArena
// Created:     2026-05-13 (Etappe-23 diagnostic pattern)
// Description: Node-based simulation comparing the 20-racer unit-test
//              configuration against realistic browser parameters. Quantifies
//              why <1% overlap in tests but visible stacking in the browser.
//              User-confirmed: max 8 racers per row → corridorHalf ≈ 60 px.
//
// Run from repo root:
//   node scripts/diag-collision-real-loop.mjs
//
// Output: docs/diagnose/collision-real-loop-trace.json
// ============================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Import the real slot-based behavior module ────────────────────────────────
const behaviorUrl = pathToFileURL(resolve(ROOT, 'client/src/modules/raceBehavior.js')).href;
const { applyRacerBehavior, initRacerBehavior } = await import(behaviorUrl);

// ── Oval geometry ─────────────────────────────────────────────────────────────
const CX = 640, CY = 360, RX = 400, RY = 200;
// Ramanujan perimeter approximation: ≈1938 px
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

function recomputePositions(racers, corridorHalf) {
  for (const r of racers) {
    const pos = ovalPos(r.t, r.physicalY, corridorHalf);
    r.x = pos.x; r.y = pos.y; r.angle = pos.angle;
  }
}

// ── Overlap check (same formula as countOverlaps in raceBehavior.test.js) ────
function countOverlaps(racers, safetyMarginPx) {
  let count = 0;
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const rA = racers[i], rB = racers[j];
      if (rA.finished || rB.finished) continue;
      const mid = (rA.angle + rB.angle) * 0.5;
      const cosM = Math.cos(mid), sinM = Math.sin(mid);
      const dx = rB.x - rA.x, dy = rB.y - rA.y;
      const ls = Math.abs(dx * cosM + dy * sinM);
      const lats = Math.abs(-dx * sinM + dy * cosM);
      const wAvg = (rA.visibleWidthPx + rB.visibleWidthPx) * 0.5;
      const lAvg = (rA.visibleLengthPx + rB.visibleLengthPx) * 0.5;
      if (ls < lAvg + safetyMarginPx && lats < wAvg + safetyMarginPx) count++;
    }
  }
  return count;
}

// ── Racer factory ─────────────────────────────────────────────────────────────
function makeRacer(index, t, physicalY, hitboxW, hitboxL, corridorHalf, speed) {
  const pos = ovalPos(t, physicalY, corridorHalf);
  const r = {
    index, t,
    x: pos.x, y: pos.y, angle: pos.angle,
    physicalY,
    baseSpeed: speed ?? (0.001 + index * 0.000005),
    finished: false,
    visibleWidthPx: hitboxW,
    visibleLengthPx: hitboxL,
  };
  initRacerBehavior(r);
  r.physicalY = physicalY;
  r.targetPhysicalY = physicalY;
  r.prevPhysicalY = physicalY;
  return r;
}

// SPREAD: evenly distributed around oval (like unit test)
function makeSpreads(N, hitboxW, hitboxL, corridorHalf, realisticSpeeds = false) {
  const BASE_MEAN = 0.001045;
  const BASE_MIN = 0.00091, BASE_MAX = 0.00118;
  return Array.from({ length: N }, (_, i) => {
    const t = i / N;
    const py = ((i % 5) - 2) * 0.3;
    const speed = realisticSpeeds
      ? BASE_MIN + Math.random() * (BASE_MAX - BASE_MIN)
      : 0.001 + i * 0.000005;
    return makeRacer(i, t, py, hitboxW, hitboxL, corridorHalf, speed);
  });
}

// CLUSTERED: row-layout like real race start (user-confirmed 8 per row on dirt-oval)
function makeCluster(N, hitboxW, hitboxL, corridorHalf, racersPerRowOverride, realisticSpeeds = false) {
  const spreadRange = 0.95;
  const spriteSize = hitboxW / 0.75;
  const effectiveWidth = corridorHalf * 2 * spreadRange;
  const racersPerRow = racersPerRowOverride ??
    Math.max(1, Math.floor((2 * effectiveWidth) / Math.max(1, spriteSize)));
  const rowGapPx = spriteSize * 1.5;
  const deltaT = rowGapPx / OVAL_PERIMETER_PX;
  const BASE_MIN = 0.00091, BASE_MAX = 0.00118;

  const racers = [];
  for (let i = 0; i < N; i++) {
    const rowIndex = Math.floor(i / racersPerRow);
    const indexInRow = i % racersPerRow;
    const rowSize = Math.min(racersPerRow, N - rowIndex * racersPerRow);
    const t = -(rowIndex * deltaT);
    const py = rowSize <= 1 ? 0 :
      -spreadRange + (2 * spreadRange * indexInRow) / (rowSize - 1);
    const speed = realisticSpeeds
      ? BASE_MIN + Math.random() * (BASE_MAX - BASE_MIN)
      : 0.001 + i * 0.000005;
    racers.push(makeRacer(i, t, py, hitboxW, hitboxL, corridorHalf, speed));
  }
  return racers;
}

// ── Simulation runner ─────────────────────────────────────────────────────────
function runSim({ name, N, FRAMES, cfg, placeFn, corridorHalf, safetyMarginPx, addDrift }) {
  const racers = placeFn();
  recomputePositions(racers, corridorHalf);

  const perFrameOverlaps = [];
  let overlapFrames = 0, framesWithAvoidance = 0, totalOverlapPairs = 0, maxOverlaps = 0;
  const resolveByFrame = null; // track when overlaps first drop to 0

  // Per-second summary for long sims
  const perSecondOvlp = [];
  let secOverlap = 0;
  const FPS = 60;

  for (let frame = 0; frame < FRAMES; frame++) {
    applyRacerBehavior(racers, cfg);
    recomputePositions(racers, corridorHalf);

    if (addDrift) {
      for (const r of racers) {
        r.physicalY = Math.max(-0.92, Math.min(0.92, r.physicalY + (Math.random() - 0.5) * 0.04));
      }
      recomputePositions(racers, corridorHalf);
    }

    // t advance: each racer uses its own baseSpeed
    for (const r of racers) {
      r.t = (r.t + r.baseSpeed) % 1;
    }
    recomputePositions(racers, corridorHalf);

    const overlaps = countOverlaps(racers, safetyMarginPx);
    perFrameOverlaps.push(overlaps);
    if (overlaps > 0) { overlapFrames++; secOverlap++; }
    if (overlaps > maxOverlaps) maxOverlaps = overlaps;
    totalOverlapPairs += overlaps;
    if (racers.some((r) => r.avoidanceActive)) framesWithAvoidance++;

    if ((frame + 1) % FPS === 0) {
      perSecondOvlp.push(secOverlap);
      secOverlap = 0;
    }
  }

  const firstCleanFrame = perFrameOverlaps.findIndex((v) => v === 0);

  return {
    name,
    params: {
      N, FRAMES, corridorHalfWidthPx: corridorHalf,
      lateralReturnSpeed: cfg.lateralReturnSpeed,
      slotSearchRadiusPx: cfg.slotSearchRadiusPx,
      lookAheadFrames: cfg.lookAheadFrames,
      safetyMarginPx,
      addDrift: addDrift ?? false,
    },
    overlapRateTotal: overlapFrames / FRAMES,
    overlapRateFirst60: perFrameOverlaps.slice(0, 60).filter((v) => v > 0).length / Math.min(60, FRAMES),
    overlapFrames,
    maxOverlapsInFrame: maxOverlaps,
    framesWithAvoidance,
    avgOverlapPairsPerFrame: (totalOverlapPairs / FRAMES).toFixed(2),
    firstCleanFrameAfterStart: firstCleanFrame >= 0 ? firstCleanFrame : 'never',
    perSecondOverlapFrames: perSecondOvlp,
    // First 120 frames in full, then every 10th frame
    perFrameSample: [
      ...perFrameOverlaps.slice(0, 120),
      ...perFrameOverlaps.slice(120).filter((_, i) => i % 10 === 0),
    ],
  };
}

// ── Config templates ──────────────────────────────────────────────────────────
const BASE_CFG = {
  enabled: true, speedBrakeFactor: 0.95,
  draftingMaxDistance: 110, draftingConeAngle: 30, draftingBoost: 1.1,
};

// Unit-test config (as used in passing test)
const CFG_TEST = { ...BASE_CFG,
  safetyMarginPx: 3, lookAheadFrames: 2, slotSearchRadiusPx: 80,
  lateralReturnSpeed: 1.0, corridorHalfWidthPx: 60,
};

// Browser defaults (DEFAULT_RACE_BEHAVIOR_CONFIG)
const CFG_BROWSER = { ...BASE_CFG,
  safetyMarginPx: 3, lookAheadFrames: 3, slotSearchRadiusPx: 60,
  lateralReturnSpeed: 0.2, corridorHalfWidthPx: 60,
};

const N = 20, FRAMES = 900; // 15s at 60fps
const HITBOX_TEST = 24;     // test fixture value
// Browser: fallback hitbox = referenceSpriteSize * 0.75.
// Horse: displaySize=40, autoScale factor at trackWidth≈120, N=20:
//   scale = clamp(120/20/23, 0.65, 2.5) = clamp(0.26, 0.65, 2.5) = 0.65 (minimum)
//   referenceSpriteSize = 40 * 0.65 = 26px
//   fallbackHitbox = 26 * 0.75 = 19.5px
const HITBOX_BROWSER = 19.5;
const CORRIDOR = 60; // user-confirmed: ≈60px for dirt-oval (max 8 per row)

const scenarios = [
  // 1. Exact test params + spread placement → should reproduce <1%
  runSim({
    name: '1_test_spread_instant_ema',
    N, FRAMES,
    cfg: CFG_TEST,
    placeFn: () => makeSpreads(N, HITBOX_TEST, HITBOX_TEST, CORRIDOR),
    corridorHalf: CORRIDOR, safetyMarginPx: 3, addDrift: true,
  }),

  // 2. Browser params + clustered start + tiny speed diff (isolates placement effect)
  runSim({
    name: '2_browser_clustered_tiny_speeds',
    N, FRAMES,
    cfg: CFG_BROWSER,
    placeFn: () => makeCluster(N, HITBOX_BROWSER, HITBOX_BROWSER, CORRIDOR, 8, false),
    corridorHalf: CORRIDOR, safetyMarginPx: 3,
  }),

  // 3. Browser params + clustered + realistic speed variation (closest to real race)
  runSim({
    name: '3_browser_clustered_realistic_speeds',
    N, FRAMES,
    cfg: CFG_BROWSER,
    placeFn: () => makeCluster(N, HITBOX_BROWSER, HITBOX_BROWSER, CORRIDOR, 8, true),
    corridorHalf: CORRIDOR, safetyMarginPx: 3,
  }),

  // 4. Isolate EMA: clustered + instant EMA → is EMA even the issue?
  runSim({
    name: '4_clustered_instant_ema_realistic_speeds',
    N, FRAMES,
    cfg: { ...CFG_BROWSER, lateralReturnSpeed: 1.0 },
    placeFn: () => makeCluster(N, HITBOX_BROWSER, HITBOX_BROWSER, CORRIDOR, 8, true),
    corridorHalf: CORRIDOR, safetyMarginPx: 3,
  }),

  // 5. Isolate EMA: spread + real EMA → what does EMA cost on spread field?
  runSim({
    name: '5_spread_real_ema_realistic_speeds',
    N, FRAMES,
    cfg: CFG_BROWSER,
    placeFn: () => makeSpreads(N, HITBOX_BROWSER, HITBOX_BROWSER, CORRIDOR, true),
    corridorHalf: CORRIDOR, safetyMarginPx: 3, addDrift: true,
  }),

  // 6. Best-case browser: wider search radius + instant EMA + clustered realistic
  runSim({
    name: '6_browser_best_case_wider_search',
    N, FRAMES,
    cfg: { ...CFG_BROWSER, slotSearchRadiusPx: 80, lateralReturnSpeed: 0.5 },
    placeFn: () => makeCluster(N, HITBOX_BROWSER, HITBOX_BROWSER, CORRIDOR, 8, true),
    corridorHalf: CORRIDOR, safetyMarginPx: 3,
  }),
];

// ── Initial geometry analysis ─────────────────────────────────────────────────
function analyzeRow(N, hitboxW, corridorHalf, racersPerRow, spreadRange = 0.95, safety = 3) {
  const rowSize0 = Math.min(racersPerRow, N);
  const lateralStep = rowSize0 <= 1 ? Infinity :
    (2 * spreadRange * corridorHalf) / (rowSize0 - 1);
  const minLat = hitboxW + safety;
  const maxFit = Math.floor((2 * spreadRange * corridorHalf) / minLat) + 1;
  const overflowRacers = Math.max(0, rowSize0 - maxFit);
  const rowGapPx = (hitboxW / 0.75) * 1.5;
  const longSepBetweenRows = rowGapPx;
  const minLong = hitboxW * 0.5 + hitboxW * 0.5 + safety * (1 + 3); // lookAhead=3
  return {
    racersPerRow, rowSize0, lateralStepPx: lateralStep, minLatPx: minLat,
    maxFitLaterally: maxFit, overflowRacers,
    rowLongSepPx: rowGapPx.toFixed(1),
    minLongAvoidancePx: minLong,
    interRowCollision: longSepBetweenRows < minLong,
  };
}

// Initial overlap count at frame 0 (before any avoidance runs)
function empiricalInitial(N, hitboxW, corridorHalf, racersPerRow) {
  const racers = makeCluster(N, hitboxW, hitboxW, corridorHalf, racersPerRow, false);
  recomputePositions(racers, corridorHalf);
  return countOverlaps(racers, 3);
}

const rowAnalysis = {
  test_hitbox24_corridor60_row7: analyzeRow(N, 24, 60, 7),
  browser_hitbox195_corridor60_row8: analyzeRow(N, 19.5, 60, 8),
};
const initialOverlaps = {
  test_hitbox24_corridor60_row7: empiricalInitial(N, 24, 60, 7),
  browser_hitbox195_corridor60_row8: empiricalInitial(N, 19.5, 60, 8),
};

// ── Print summary ─────────────────────────────────────────────────────────────
console.log('\n=== SCENARIO RESULTS (15s = 900 frames @ 60fps) ===\n');
console.log(
  'Scenario'.padEnd(42), 'TotalOvlp', 'First60f', 'MaxPairs', 'AvoidFrms', 'FirstClean'
);
console.log('-'.repeat(95));
for (const s of scenarios) {
  console.log(
    s.name.padEnd(42),
    `${(s.overlapRateTotal * 100).toFixed(1)}%`.padEnd(10),
    `${(s.overlapRateFirst60 * 100).toFixed(1)}%`.padEnd(9),
    String(s.maxOverlapsInFrame).padEnd(9),
    `${((s.framesWithAvoidance / FRAMES) * 100).toFixed(1)}%`.padEnd(10),
    s.firstCleanFrameAfterStart,
  );
}

console.log('\n=== PER-SECOND OVERLAP FRAME COUNT (scenario 3 — real browser) ===');
const s3 = scenarios[2];
console.log('Sec:', s3.perSecondOverlapFrames.map((v, i) => `${i + 1}s:${v}`).join('  '));

console.log('\n=== ROW PLACEMENT GEOMETRY ===');
for (const [k, a] of Object.entries(rowAnalysis)) {
  console.log(`\n${k}:`);
  console.log(`  racers/row=${a.racersPerRow}, row0size=${a.rowSize0}`);
  console.log(`  lateralStep=${a.lateralStepPx.toFixed(1)}px  minLat=${a.minLatPx.toFixed(1)}px`);
  console.log(`  max fit laterally=${a.maxFitLaterally}  overflow=${a.overflowRacers} racers`);
  console.log(`  row gap=${a.rowLongSepPx}px  minLong(avoidance)=${a.minLongAvoidancePx}px`);
  console.log(`  inter-row collision: ${a.interRowCollision}`);
  console.log(`  empirical overlaps at frame 0: ${initialOverlaps[k]} pairs`);
}

// ── Write JSON trace ──────────────────────────────────────────────────────────
const out = {
  meta: {
    generated: new Date().toISOString(),
    ovalPerimeterPx: Math.round(OVAL_PERIMETER_PX),
    N, FRAMES,
    note: [
      'Horse hitbox uses fallback formula (visibleWidthPx = referenceSpriteSize * 0.75).',
      'In browser, OffscreenCanvas scans actual sprite pixels — real hitbox may differ ±5px.',
      'corridorHalf=60 is ESTIMATED based on user-confirmed max 8 racers per row.',
      'Actual value = geometricTrackWidthPx / 2; user should confirm from browser console.',
    ].join(' '),
    racePhaseStartFrame: 240,
    userConfirmed: 'max 8 racers per row on dirt-oval track',
  },
  rowPlacementAnalysis: rowAnalysis,
  empiricalInitialOverlapPairs: initialOverlaps,
  scenarios,
};

const outDir = resolve(ROOT, 'docs/diagnose');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'collision-real-loop-trace.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nTrace written to: ${outPath}`);
