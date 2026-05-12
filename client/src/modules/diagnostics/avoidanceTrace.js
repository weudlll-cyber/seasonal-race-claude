// ============================================================
// File:        avoidanceTrace.js
// Path:        client/src/modules/diagnostics/avoidanceTrace.js
// Project:     RaceArena
// Description: Headless avoidance/drafting trace tool. Etappe-23-Pattern:
//              diag: commit — will be removed together with the B+A fix PR.
//
// Usage:  node src/modules/diagnostics/avoidanceTrace.js  (from client/ dir)
//         node src/modules/diagnostics/avoidanceTrace.js post  (post-fix run)
// Outputs: ../../docs/diagnose/avoidance-trace.{json,md}
//          or avoidance-trace-post-fix.{json,md} when "post" arg is passed
// ============================================================

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { EditorShape } from '../track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG, DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// ── Configuration ─────────────────────────────────────────────────────────
const TRACK_FILE = join(__dir, '../../../../server/data/tracks/dirt-oval.json');
const OUT_DIR = join(__dir, '../../../../docs/diagnose');
const N_RACERS = 8;
const SEED = 0x5e4501;
const FRAMES = 600; // 10 s @ 60 fps
const FPS = 60;

// Sprite world-pixel estimate — used only for threshold labels.
// Recompute manually if track geometry changes substantially.
const SPRITE_WORLD_PX = 60;

// Forward-adjacency window: racers within this many pixels along leader's
// heading direction are considered "longitudinally adjacent."
const ADJ_FORWARD_PX = 2 * SPRITE_WORLD_PX; // 120 px = 2 sprite lengths

const suffix = process.argv[2] === 'post' ? '-post-fix' : '';

// ── Mulberry32 deterministic PRNG ─────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Load track & shape ────────────────────────────────────────────────────
const trackJson = JSON.parse(readFileSync(TRACK_FILE, 'utf8'));
const shape = new EditorShape(trackJson);
const trackWidth = shape.getActualTrackWidth();
const totalLen = shape.getTotalLength();

console.log(`[avoidanceTrace] Track : ${trackJson.name}`);
console.log(
  `[avoidanceTrace] Width : ${trackWidth.toFixed(0)} px  Length : ${totalLen.toFixed(0)} px`
);
console.log(
  `[avoidanceTrace] Sprite: ${SPRITE_WORLD_PX} px (estimate)  AdjFwd: ${ADJ_FORWARD_PX} px`
);

// ── Initialize racers ─────────────────────────────────────────────────────
const rng = mulberry32(SEED);
const spread = DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange; // 0.95
const sMin = DEFAULT_BASE_SPEED_CONFIG.min;
const sMax = DEFAULT_BASE_SPEED_CONFIG.max;

const racers = Array.from({ length: N_RACERS }, (_, i) => {
  const r = {
    index: i,
    finished: false,
    // Assign a deterministic speed within the default range
    baseSpeed: sMin + rng() * (sMax - sMin),
    // Start racers closely grouped: 2 % track spacing
    t: i * 0.02 + rng() * 0.005, // slight jitter to break symmetry
    physicalY: 0,
    x: 0,
    y: 0,
    angle: 0,
    avoidanceActive: false,
    draftingBoostActive: false,
  };
  initRacerBehavior(r);
  // Override physicalY: spread evenly across [-spread, +spread]
  r.physicalY = N_RACERS <= 1 ? 0 : -spread + (2 * spread * i) / (N_RACERS - 1);
  return r;
});

// ── Aggregation ───────────────────────────────────────────────────────────
const config = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };

let totalPairFrames = 0;
let adjPairFrames = 0;

// Lateral buckets — [0]: all pair-frames, [1]: adjacent pair-frames only
const buckets = {
  halfSprite: [0, 0],
  oneSprite: [0, 0],
  twoSprite: [0, 0],
};

// Episode tracking: key = "i-j", value = { startFrame }
const openEpisodes = new Map();
const closedEpisodes = []; // { pair, startFrame, durationFrames }

// ── Simulation loop ────────────────────────────────────────────────────────
for (let frame = 0; frame < FRAMES; frame++) {
  // 1. Update world positions from current t + physicalY
  for (const r of racers) {
    const pos = shape.getPosition(r.t, r.physicalY / 2);
    r.x = pos.x;
    r.y = pos.y;
    r.angle = pos.angle;
  }

  // 2. Apply avoidance + drafting forces (mutates physicalY, sets avoidanceActive)
  applyRacerBehavior(racers, config);

  // 3. Advance t (with brake + boost, dt=16 ms → dt/16=1)
  for (const r of racers) {
    if (r.finished) continue;
    const boost = r.draftingBoostActive ? config.draftingBoost : 1.0;
    const brake = r.avoidanceActive ? config.speedBrakeFactor : 1.0;
    r.t = (((r.t + r.baseSpeed * boost * brake) % 1) + 1) % 1; // wrap closed track
  }

  // 4. Per-pair measurement
  for (let i = 0; i < N_RACERS; i++) {
    for (let j = i + 1; j < N_RACERS; j++) {
      totalPairFrames++;

      const rA = racers[i];
      const rB = racers[j];

      // Project in leader-local coordinates (higher t = leader)
      const leader = rA.t >= rB.t ? rA : rB;
      const follower = rA.t >= rB.t ? rB : rA;
      const dx = follower.x - leader.x;
      const dy = follower.y - leader.y;
      const fwd = dx * Math.cos(leader.angle) + dy * Math.sin(leader.angle);
      const lat = Math.abs(-dx * Math.sin(leader.angle) + dy * Math.cos(leader.angle));
      const fwdAbs = Math.abs(fwd);

      const isAdj = fwdAbs < ADJ_FORWARD_PX;
      if (isAdj) adjPairFrames++;

      if (lat < 0.5 * SPRITE_WORLD_PX) {
        buckets.halfSprite[0]++;
        if (isAdj) buckets.halfSprite[1]++;
      }
      if (lat < 1.0 * SPRITE_WORLD_PX) {
        buckets.oneSprite[0]++;
        if (isAdj) buckets.oneSprite[1]++;
      }
      if (lat < 2.0 * SPRITE_WORLD_PX) {
        buckets.twoSprite[0]++;
        if (isAdj) buckets.twoSprite[1]++;
      }

      // Visual-overlap episode: both axes within one sprite
      const key = `${i}-${j}`;
      const inOverlap = lat < SPRITE_WORLD_PX && fwdAbs < SPRITE_WORLD_PX;
      if (inOverlap) {
        if (!openEpisodes.has(key)) openEpisodes.set(key, { pair: [i, j], startFrame: frame });
      } else {
        if (openEpisodes.has(key)) {
          const ep = openEpisodes.get(key);
          closedEpisodes.push({
            pair: ep.pair,
            startFrame: ep.startFrame,
            durationFrames: frame - ep.startFrame,
          });
          openEpisodes.delete(key);
        }
      }
    }
  }
}

// Close any episodes still open at end of simulation
for (const ep of openEpisodes.values()) {
  closedEpisodes.push({
    pair: ep.pair,
    startFrame: ep.startFrame,
    durationFrames: FRAMES - ep.startFrame,
  });
}

// ── Compute summary statistics ─────────────────────────────────────────────
function pct(n, d) {
  return d === 0 ? '0.0' : ((100 * n) / d).toFixed(1);
}
function sec(frames) {
  return (frames / FPS).toFixed(2);
}

const epDursSec = closedEpisodes.map((e) => e.durationFrames / FPS);
const avgDurSec =
  epDursSec.length > 0
    ? (epDursSec.reduce((a, b) => a + b, 0) / epDursSec.length).toFixed(2)
    : '0.00';
const maxDurSec = epDursSec.length > 0 ? Math.max(...epDursSec).toFixed(2) : '0.00';

const stats = {
  config: {
    track: trackJson.name,
    nRacers: N_RACERS,
    seed: SEED,
    frames: FRAMES,
    durationSec: FRAMES / FPS,
    spriteWorldPx: SPRITE_WORLD_PX,
    adjForwardPx: ADJ_FORWARD_PX,
    trackWidthPx: Math.round(trackWidth),
    trackLengthPx: Math.round(totalLen),
    suffix,
  },
  aggregate: {
    totalPairFrames,
    adjPairFrames,
    adjPct: parseFloat(pct(adjPairFrames, totalPairFrames)),
    latHalf_all: buckets.halfSprite[0],
    latHalf_adj: buckets.halfSprite[1],
    latHalfPct_adj: parseFloat(pct(buckets.halfSprite[1], adjPairFrames)),
    latOne_all: buckets.oneSprite[0],
    latOne_adj: buckets.oneSprite[1],
    latOnePct_adj: parseFloat(pct(buckets.oneSprite[1], adjPairFrames)),
    latTwo_all: buckets.twoSprite[0],
    latTwo_adj: buckets.twoSprite[1],
    latTwoPct_adj: parseFloat(pct(buckets.twoSprite[1], adjPairFrames)),
  },
  episodes: {
    count: closedEpisodes.length,
    avgDurSec: parseFloat(avgDurSec),
    maxDurSec: parseFloat(maxDurSec),
    list: closedEpisodes.map((e) => ({
      pair: e.pair,
      startSec: parseFloat(sec(e.startFrame)),
      durationSec: parseFloat(sec(e.durationFrames)),
    })),
  },
};

// ── Print summary ─────────────────────────────────────────────────────────
console.log(`\n[avoidanceTrace] === Results (${FRAMES} frames, ${N_RACERS} racers) ===`);
console.log(
  `  Adjacent pair-frames : ${adjPairFrames} / ${totalPairFrames}  (${pct(adjPairFrames, totalPairFrames)}%)`
);
console.log(
  `  Lat < 0.5 sprite (adj): ${buckets.halfSprite[1]}  (${pct(buckets.halfSprite[1], adjPairFrames)}% of adj)`
);
console.log(
  `  Lat < 1.0 sprite (adj): ${buckets.oneSprite[1]}   (${pct(buckets.oneSprite[1], adjPairFrames)}% of adj)`
);
console.log(
  `  Visual-overlap episodes: ${closedEpisodes.length}  avg ${avgDurSec}s  max ${maxDurSec}s`
);

// ── Write outputs ─────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = join(OUT_DIR, `avoidance-trace${suffix}.json`);
const mdPath = join(OUT_DIR, `avoidance-trace${suffix}.md`);

writeFileSync(jsonPath, JSON.stringify(stats, null, 2));
console.log(`[avoidanceTrace] JSON → ${jsonPath}`);

// ── Markdown report ────────────────────────────────────────────────────────
const md = `# Avoidance Trace Report${suffix ? ' — Post-Fix' : ''}

**Datum:** ${new Date().toISOString().slice(0, 10)}
**Track:** ${trackJson.name} (${stats.config.trackWidthPx} px wide, ${stats.config.trackLengthPx} px total length)
**Setup:** ${N_RACERS} racers, seed 0x${SEED.toString(16)}, ${FRAMES} frames (${FRAMES / FPS} s @ ${FPS} fps)
**Sprite reference:** ${SPRITE_WORLD_PX} px world size · Forward-adjacency window: ${ADJ_FORWARD_PX} px

---

## Forward-Adjacency Summary

| Metric | Value |
|---|---|
| Total pair-frames | ${totalPairFrames} |
| Adjacent pair-frames (fwd < ${ADJ_FORWARD_PX} px) | ${adjPairFrames} |
| **Adjacency rate** | **${pct(adjPairFrames, totalPairFrames)}%** |

## Lateral Overlap Buckets

| Threshold | All pair-frames | % of all | Adjacent pair-frames | % of adjacent |
|---|---|---|---|---|
| < 0.5 × sprite (${0.5 * SPRITE_WORLD_PX} px) | ${buckets.halfSprite[0]} | ${pct(buckets.halfSprite[0], totalPairFrames)}% | ${buckets.halfSprite[1]} | **${pct(buckets.halfSprite[1], adjPairFrames)}%** |
| < 1.0 × sprite (${SPRITE_WORLD_PX} px) | ${buckets.oneSprite[0]} | ${pct(buckets.oneSprite[0], totalPairFrames)}% | ${buckets.oneSprite[1]} | **${pct(buckets.oneSprite[1], adjPairFrames)}%** |
| < 2.0 × sprite (${2 * SPRITE_WORLD_PX} px) | ${buckets.twoSprite[0]} | ${pct(buckets.twoSprite[0], totalPairFrames)}% | ${buckets.twoSprite[1]} | **${pct(buckets.twoSprite[1], adjPairFrames)}%** |

## Visual-Overlap Episodes

An episode is a contiguous sequence of frames where a specific racer pair has both
lateral distance < ${SPRITE_WORLD_PX} px AND forward distance < ${SPRITE_WORLD_PX} px.

| Metric | Value |
|---|---|
| Episode count | ${closedEpisodes.length} |
| Average duration | ${avgDurSec} s |
| Maximum duration | ${maxDurSec} s |

### Episode Detail

| Pair | Start (s) | Duration (s) |
|---|---|---|
${stats.episodes.list.map((e) => `| [${e.pair[0]}, ${e.pair[1]}] | ${e.startSec.toFixed(2)} | ${e.durationSec.toFixed(2)} |`).join('\n')}

---

*Generated by avoidanceTrace.js — Etappe-23-Pattern diagnostic tool*
`;

writeFileSync(mdPath, md);
console.log(`[avoidanceTrace] MD  → ${mdPath}`);
