// ============================================================
// File:        sim-race-visual.mjs
// Path:        scripts/sim-race-visual.mjs
// Project:     RaceArena
// Created:     2026-05-16
// Description: Headless race simulation + PNG burst capture.
//              Runs the same race logic as the browser (no parallel impl),
//              renders track + racer positions to PNG using pure Node.js
//              (no npm deps beyond what is already in the repo).
//              Produces two image sets per frame:
//                - __world.png  : flat world-space view (no camera transform)
//                - __camera.png : camera-view at 1280×720 (same as browser)
//
// Usage:
//   node scripts/sim-race-visual.mjs [--tracks=space-sprint,dirt-oval]
//                                    [--seeds=1,2,3,4,5]
//                                    [--burstLen=20]
//                                    [--out=client/tmp/sim-frames]
//
// Output:  <out>/<track-id>/seed_<S>__burst_<B>__frame_<F>__world.png
//                           seed_<S>__burst_<B>__frame_<F>__camera.png
// ============================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dir     = dirname(__filename);
const ROOT      = join(__dir, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}
const TRACKS   = argVal('tracks', 'space-sprint,dirt-oval').split(',').map((s) => s.trim());
const SEEDS    = argVal('seeds',  '1,2,3,4,5').split(',').map(Number);
const BURST_LEN = Number(argVal('burstLen', '20'));
const OUT_BASE  = join(ROOT, argVal('out', 'client/tmp/sim-frames'));

// ── Import game modules (same code the browser uses) ─────────────────────────
import { EditorShape }      from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeRacersPerRow,
} from '../client/src/modules/rowLayout.js';
import {
  deriveRaceDuration,
  normalSpeedFrom,
  trackDefaultLaps,
  trackDefaultSeconds,
  paceSpeedPxPerSec,
} from '../client/src/modules/durationModel.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_CAMERA_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { CameraDirector, OPEN_TRACK_BASE_ZOOM } from '../client/src/modules/camera/CameraDirector.js';
import { effectiveZoom } from '../client/src/modules/camera/openTrackCamera.js';

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
// Replaces Math.random so simulations are deterministic per seed.
function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t  = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── PNG writer (pure Node.js — uses built-in zlib.deflateSync) ───────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

/**
 * Encode a pixel buffer to PNG bytes.
 * @param {number}     w   image width in px
 * @param {number}     h   image height in px
 * @param {Uint8Array} buf RGBA bytes, row-major
 */
function encodePng(w, h, buf) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr    = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w,  0);
  ihdr.writeUInt32BE(h,  4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowBytes = w * 3;
  const raw      = Buffer.allocUnsafe(h * (rowBytes + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const pi = (y * w + x) * 4;
      const di = y * (rowBytes + 1) + 1 + x * 3;
      raw[di]     = buf[pi];
      raw[di + 1] = buf[pi + 1];
      raw[di + 2] = buf[pi + 2];
    }
  }
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Rasteriser helpers ────────────────────────────────────────────────────────
function setPixel(buf, w, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(buf.length / 4 / w)) return;
  const i = (y * w + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
}

function drawLine(buf, W, H, x0, y0, x1, y1, r, g, b) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    setPixel(buf, W, x0, y0, r, g, b);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx)  { err += dx; y0 += sy; }
  }
}

function fillCircle(buf, W, H, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) setPixel(buf, W, Math.round(cx + dx), Math.round(cy + dy), r, g, b);
    }
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// ── Build world→canvas transform from track bounding box ─────────────────────
function buildTransform(shape, IMG_W, IMG_H, pad = 20) {
  const { minX, maxX, minY, maxY } = shape.getBoundingBox();
  const tw = maxX - minX, th = maxY - minY;
  const scale = Math.min((IMG_W - 2 * pad) / tw, (IMG_H - 2 * pad) / th);
  const offX  = pad + (IMG_W - 2 * pad - tw * scale) / 2 - minX * scale;
  const offY  = pad + (IMG_H - 2 * pad - th * scale) / 2 - minY * scale;
  return {
    wx: (x) => Math.round(x * scale + offX),
    wy: (y) => Math.round(y * scale + offY),
    scale,
  };
}

// ── Render one frame ──────────────────────────────────────────────────────────
const RACER_COLORS = [
  '#ff6b35','#4fc3f7','#a5d6a7','#ffcc02','#ce93d8',
  '#f48fb1','#80cbc4','#ffab40','#90caf9','#ef9a9a',
];

function renderFrame(shape, racers, transform, IMG_W, IMG_H, frameLabel) {
  const buf = new Uint8Array(IMG_W * IMG_H * 4);
  // Dark background
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    buf[i * 4]     = 18;
    buf[i * 4 + 1] = 12;
    buf[i * 4 + 2] = 30;
    buf[i * 4 + 3] = 255;
  }
  const { wx, wy } = transform;
  const N_SEG = 300;

  // Draw outer boundary (grey)
  for (let i = 0; i < N_SEG; i++) {
    const t0 = i / N_SEG, t1 = (i + 1) / N_SEG;
    if (shape.isOpen && t1 > 1) continue;
    const idx0 = shape._idx(t0), idx1 = shape._idx(t1);
    const o0 = shape._outer[idx0], o1 = shape._outer[idx1];
    const inn0 = shape._inner[idx0], inn1 = shape._inner[idx1];
    drawLine(buf, IMG_W, IMG_H, wx(o0.x), wy(o0.y), wx(o1.x), wy(o1.y), 90, 80, 110);
    drawLine(buf, IMG_W, IMG_H, wx(inn0.x), wy(inn0.y), wx(inn1.x), wy(inn1.y), 90, 80, 110);
  }
  // Draw centreline (dim green)
  for (let i = 0; i < N_SEG; i++) {
    const t0 = i / N_SEG, t1 = (i + 1) / N_SEG;
    if (shape.isOpen && t1 > 1) continue;
    const p0 = shape.getPosition(t0, 0), p1 = shape.getPosition(t1, 0);
    drawLine(buf, IMG_W, IMG_H, wx(p0.x), wy(p0.y), wx(p1.x), wy(p1.y), 40, 80, 50);
  }

  // Draw racers
  for (const r of racers) {
    const cx = wx(r.x), cy = wy(r.y);
    const color = r.color ?? RACER_COLORS[r.index % RACER_COLORS.length];
    const [cr, cg, cb] = hexToRgb(color);
    const rad = Math.max(4, Math.round(transform.scale * 18));
    // White halo so overlapping racers stay distinct
    fillCircle(buf, IMG_W, IMG_H, cx, cy, rad + 1, 200, 200, 200);
    fillCircle(buf, IMG_W, IMG_H, cx, cy, rad, cr, cg, cb);
  }

  return encodePng(IMG_W, IMG_H, buf);
}

// ── Camera-view render ────────────────────────────────────────────────────────
// Renders the same 1280×720 that the browser shows.
// cam: {zoom, offsetX, offsetY} from CameraDirector.update()
// effZoom: cam.zoom * bsX (closed) or effectiveZoom(cam.zoom) (open)
// Transform: scrX = worldX * effZoom + cam.offsetX
const CAM_W = 1280;
const CAM_H = 720;

function renderCameraFrame(shape, racers, cam, ez) {
  const buf = new Uint8Array(CAM_W * CAM_H * 4);
  // Dark background
  for (let i = 0; i < CAM_W * CAM_H; i++) {
    buf[i * 4]     = 14;
    buf[i * 4 + 1] = 8;
    buf[i * 4 + 2] = 22;
    buf[i * 4 + 3] = 255;
  }
  // world → screen helper (inline for speed)
  const sx = (wx) => wx * ez + cam.offsetX;
  const sy = (wy) => wy * ez + cam.offsetY;

  const N_SEG = 400;
  // Track edges
  for (let i = 0; i < N_SEG; i++) {
    const t0 = i / N_SEG, t1 = (i + 1) / N_SEG;
    if (shape.isOpen && t1 > 1) continue;
    const idx0 = shape._idx(t0), idx1 = shape._idx(t1);
    const o0 = shape._outer[idx0], o1 = shape._outer[idx1];
    const inn0 = shape._inner[idx0], inn1 = shape._inner[idx1];
    drawLine(buf, CAM_W, CAM_H, sx(o0.x), sy(o0.y), sx(o1.x), sy(o1.y), 80, 70, 100);
    drawLine(buf, CAM_W, CAM_H, sx(inn0.x), sy(inn0.y), sx(inn1.x), sy(inn1.y), 80, 70, 100);
  }
  // Centreline
  for (let i = 0; i < N_SEG; i++) {
    const t0 = i / N_SEG, t1 = (i + 1) / N_SEG;
    if (shape.isOpen && t1 > 1) continue;
    const p0 = shape.getPosition(t0, 0), p1 = shape.getPosition(t1, 0);
    drawLine(buf, CAM_W, CAM_H, sx(p0.x), sy(p0.y), sx(p1.x), sy(p1.y), 35, 65, 45);
  }
  // Racers — fixed screen-space radius so they stay recognisable at any zoom
  for (const r of racers) {
    const cx = sx(r.x), cy = sy(r.y);
    // Skip if completely off-screen
    if (cx < -20 || cx > CAM_W + 20 || cy < -20 || cy > CAM_H + 20) continue;
    const color = r.color ?? RACER_COLORS[r.index % RACER_COLORS.length];
    const [cr, cg, cb] = hexToRgb(color);
    fillCircle(buf, CAM_W, CAM_H, cx, cy, 8, 200, 200, 200); // white halo
    fillCircle(buf, CAM_W, CAM_H, cx, cy, 6, cr, cg, cb);
  }
  // Screen-edge border so we know where the canvas ends
  for (let x = 0; x < CAM_W; x++) {
    setPixel(buf, CAM_W, x, 0, 80, 80, 80);
    setPixel(buf, CAM_W, x, CAM_H - 1, 80, 80, 80);
  }
  for (let y = 0; y < CAM_H; y++) {
    setPixel(buf, CAM_W, 0, y, 80, 80, 80);
    setPixel(buf, CAM_W, CAM_W - 1, y, 80, 80, 80);
  }

  return encodePng(CAM_W, CAM_H, buf);
}

// ── Race easing (copied from index.jsx — no import possible from JSX) ─────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── One full simulation run ───────────────────────────────────────────────────
/**
 * Run one deterministic race simulation, capturing a burst of frames.
 *
 * @param {object} track        Track JSON from server/data/tracks/
 * @param {number} seed         PRNG seed
 * @param {number} burstIndex   0-based burst index (controls capture start frame)
 * @param {number} burstLen     Frames per burst
 * @returns {{ frames: { png: Buffer, label: string }[], label: string }}
 */
function runSimulation(track, seed, burstIndex, burstLen) {
  // ── Seeded PRNG injection ──
  const rng = makePRNG(seed + burstIndex * 1000);
  Math.random = rng; // deterministic for this run

  // ── Config (defaults — no localStorage) ──
  const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
  const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  const behaviorConfig  = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const rowConfig       = { ...DEFAULT_ROW_LAYOUT_CONFIG };
  const dynamicsConfig  = { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const cameraConfig    = { ...DEFAULT_CAMERA_CONFIG };

  // ── Track & shape ──
  const shape              = new EditorShape(track);
  const isOpen             = shape.isOpen;
  const pathLengthPx       = track.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();
  const nRacers    = 20;
  const worldWidth = track.worldWidth ?? 1280;
  const worldHeight = track.worldHeight ?? 720;
  const bsX        = CAM_W / worldWidth;   // closed-track scale factor (canvas→world)

  // THE canonical derivation — the same shared call the browser and sim-fairness make.
  // This renderer models no racer type, so it runs at multiplier 1.0; the pace helper is used
  // anyway so the clamp and the derivation read the same definition of "pace" as everywhere else.
  const visualSpeedMultiplier = 1.0;
  const visualPaceSpeed = paceSpeedPxPerSec(normalSpeedFrom(), visualSpeedMultiplier);
  const durationModel = deriveRaceDuration({
    isOpen,
    pathLengthPx,
    laps: trackDefaultLaps(track),
    requestedSeconds: trackDefaultSeconds(
      track,
      pathLengthPx,
      visualPaceSpeed,
      behaviorConfig.runoutZone ?? 0.05
    ),
    normalSpeedPxPerSec: normalSpeedFrom(),
    speedMultiplier: visualSpeedMultiplier,
    runoutZone: behaviorConfig.runoutZone ?? 0.05,
  });
  const finishT        = durationModel.finishT;
  const race_baseSpeed = durationModel.raceBaseSpeed;
  const targetDuration = durationModel.realizedDurationSec;

  // ── Row layout ──
  const displaySize = 36; // reference sprite size in world pixels
  const rowGapPx    = displaySize * rowConfig.rowGapMultiplier;
  const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
  const effectiveWidth  = geometricTrackWidth * behaviorConfig.startSpreadRange;
  const racersPerRow    = computeRacersPerRow(effectiveWidth, displaySize);
  const rowLayout       = computeRowLayout(nRacers, racersPerRow);
  const rowSizeByRow    = new Map();
  for (const a of rowLayout.assignments) {
    rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
  }
  const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

  // ── Re-roll schedule ──
  const rollCount    = Math.max(2, Math.floor(targetDuration / dynamicsConfig.reRollIntervalDivisor));
  const rollInterval = ((dynamicsConfig.reRollLastPositionPercent / 100) * targetDuration * 1000) / rollCount;
  const lastRollDeadline = targetDuration * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

  // ── Racer init ──
  const racers = Array.from({ length: nRacers }, (_, i) => {
    const assignment   = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
    const rowSize      = rowSizeByRow.get(assignment.rowIndex) ?? 1;
    const speedBonus   = computeSpeedBonus(assignment.rowIndex, rowGapPx, pathLengthPx, rowConfig.speedBonusFactor, finishT, isOpen, rowLayout.totalRows);
    const tStart       = isOpen
      ? (rowLayout.totalRows - assignment.rowIndex) * deltaT_per_row
      : -(assignment.rowIndex * deltaT_per_row);
    const spreadFactor = (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
    const speedBonusMult = 1 + speedBonus;
    const rollJitter   = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
    const r = {
      index:              i,
      name:               `R${i + 1}`,
      t:                  tStart,
      spreadFactor,
      speedBonusMult,
      baseSpeed:          race_baseSpeed * spreadFactor * speedBonusMult,
      spreadFactorPrev:   spreadFactor,
      spreadFactorTarget: spreadFactor,
      transitionStartTime: 0,
      transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
      nextRollTime:       rollInterval + rollJitter, // relative; converted to absolute when racing starts
      color:              RACER_COLORS[i % RACER_COLORS.length],
      finished:           false,
      finishRank:         null,
      runoutDecay:        1,
      x: 0, y: 0, angle: 0,
      spriteWorldSizePx:      displaySize,
      geometricTrackWidthPx:  geometricTrackWidth,
      pathLengthPx,
    };
    initRacerBehavior(r);
    r.physicalY = computeRowPhysicalY(assignment.indexInRow, rowSize, behaviorConfig.startSpreadRange);
    return r;
  });

  // computePositions: t → world x,y
  const tPos = (t) => ((t % 1) + 1) % 1;
  function computePositions() {
    for (const r of racers) {
      const t = isOpen ? Math.min(r.t, 1) : tPos(r.t);
      const p = shape.getPosition(t, r.physicalY / 2);
      r.x = p.x; r.y = p.y; r.angle = p.angle;
    }
  }

  // ── CameraDirector — same constructor call as index.jsx ──────────────────
  const camDir         = new CameraDirector(
    worldWidth,
    worldHeight,
    isOpen,
    cameraConfig,
    displaySize, // referenceSpriteSize
    shape        // EditorShape for arc-length pan targets
  );

  // ── Simulate: frames advance at fixed 60fps (dt = 16ms) ──────────────────
  const DT           = 1000 / 60;          // ms per frame
  const BURST_STARTS = [120, 165, 210, 255, 300]; // race-frames where each burst begins
  const captureStart = BURST_STARTS[burstIndex] ?? 120;
  const captureEnd   = captureStart + burstLen;
  const totalFrames  = captureEnd + 1;
  let   raceTs       = 0; // time since RACING start, in ms

  // Convert nextRollTime from relative offset to absolute (mirror the COUNTDOWN→RACING transition)
  for (const r of racers) r.nextRollTime += 0; // race starts at ts=0

  computePositions();

  const captured = [];

  // ── Image dimensions ──
  const { minX, maxX, minY, maxY } = shape.getBoundingBox();
  const bboxW = maxX - minX, bboxH = maxY - minY;
  const aspect = bboxW / bboxH;
  const IMG_W  = Math.min(1400, Math.max(800, Math.round(900 * aspect)));
  const IMG_H  = Math.min(900,  Math.max(400, Math.round(IMG_W / aspect)));
  const transform = buildTransform(shape, IMG_W, IMG_H);

  for (let frame = 0; frame < totalFrames; frame++) {
    raceTs += DT;

    // ── Per-racer t-update (mirrors index.jsx RACING loop) ─────────────────
    for (const r of racers) {
      if (!r.finished) {
        if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
          const spreadRange  = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
          const halfWidth    = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
          const newTarget    = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth)
          );
          r.spreadFactorPrev    = r.spreadFactor;
          r.spreadFactorTarget  = newTarget;
          r.transitionStartTime = raceTs;
          const jOff            = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime        = raceTs + rollInterval + jOff;
        }
        const elapsed = raceTs - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const prog    = elapsed / r.transitionDuration;
          r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(prog);
          r.baseSpeed    = race_baseSpeed * r.spreadFactor * r.speedBonusMult;
        }
      }

      const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
      const brake = r.avoidanceActive     ? behaviorConfig.speedBrakeFactor : 1.0;
      if (!r.finished) {
        r.t = Math.min(r.t + r.baseSpeed * boost * brake * (DT / 16), finishT + 0.001);
      } else {
        r.runoutDecay *= 0.97;
        r.t += r.baseSpeed * r.runoutDecay * (DT / 16);
      }

      r.vt = race_baseSpeed > 0 && !r.finished ? (r.baseSpeed * boost * brake) / race_baseSpeed : 0;
    }

    computePositions();
    applyRacerBehavior(racers, behaviorConfig, undefined);

    // Finish check
    for (const r of racers) {
      if (!r.finished && r.t >= finishT) {
        r.finished    = true;
        r.finishRank  = racers.filter((x) => x.finished).length;
      }
    }

    // ── Camera update (same call as index.jsx line 1133) ───────────────────
    const raceState = {
      raceElapsed:   raceTs,
      finishedCount: racers.filter((r) => r.finished).length,
      winner:        racers.find((r) => r.finishRank === 1) ?? null,
      finishT,
    };
    const cam  = camDir.update(racers, raceTs, raceState, CAM_W, CAM_H, DT);
    // Effective zoom (mirrors index.jsx frameEffZoom)
    const ez   = isOpen ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM) : cam.zoom * bsX;

    // Capture?
    if (frame >= captureStart && frame < captureEnd) {
      const localF  = frame - captureStart;
      const ts_s    = (raceTs / 1000).toFixed(2);
      const world   = renderFrame(shape, racers, transform, IMG_W, IMG_H, `f${frame}`);
      const camera  = renderCameraFrame(shape, racers, cam, ez);
      captured.push({ world, camera, frame, localF, ts_s, camState: camDir.hudState ?? camDir.state });
    }
  }

  return { frames: captured, racerCount: nRacers, captureStart, captureEnd };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const BURST_LABELS = ['burst_1','burst_2','burst_3','burst_4','burst_5'];
// Burst start race-frames: [120, 165, 210, 255, 300] → 2.0s, 2.75s, 3.5s, 4.25s, 5.0s at 60fps

console.log(`\n=== sim-race-visual ===`);
console.log(`Tracks  : ${TRACKS.join(', ')}`);
console.log(`Seeds   : ${SEEDS.join(', ')}`);
console.log(`Bursts  : ${SEEDS.length} (one per seed), ${BURST_LEN} frames each`);
console.log(`Output  : ${OUT_BASE}\n`);

const trackDataDir = join(ROOT, 'server/data/tracks');

for (const trackId of TRACKS) {
  const trackPath = join(trackDataDir, `${trackId}.json`);
  if (!existsSync(trackPath)) {
    console.error(`  [SKIP] Track not found: ${trackPath}`);
    continue;
  }
  const track   = JSON.parse(readFileSync(trackPath, 'utf8'));
  const trackDir = join(OUT_BASE, trackId);
  mkdirSync(trackDir, { recursive: true });

  console.log(`── ${track.name} (${trackId}) ──`);
  console.log(`   closed=${!track.closed ? 'false (open)' : 'true'} | pathLengthPx=${Math.round(track.pathLengthPx)} | worldW=${track.worldWidth}`);

  for (let bi = 0; bi < SEEDS.length; bi++) {
    const seed       = SEEDS[bi];
    const burstLabel = BURST_LABELS[bi] ?? `burst_${bi + 1}`;
    process.stdout.write(`   seed=${seed} ${burstLabel}: `);

    const { frames, captureStart } = runSimulation(track, seed, bi, BURST_LEN);
    const startSec = (captureStart / 60).toFixed(2);

    for (const { world, camera, localF, camState } of frames) {
      const base = `seed_${seed}__${burstLabel}__frame_${String(localF).padStart(2, '0')}`;
      writeFileSync(join(trackDir, `${base}__world.png`),  world);
      writeFileSync(join(trackDir, `${base}__camera.png`), camera);
      process.stdout.write('.');
    }
    console.log(` done (race-frames ${captureStart}–${captureStart + BURST_LEN - 1}, t=${startSec}s)`);
  }

  console.log(`   → ${SEEDS.length * BURST_LEN * 2} PNGs (${SEEDS.length * BURST_LEN}×world + ${SEEDS.length * BURST_LEN}×camera) in ${trackDir}\n`);
}

console.log('Done. Open the PNG files to inspect racer positions.');
