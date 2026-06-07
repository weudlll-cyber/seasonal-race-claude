import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { applyRacerBehavior, initRacerBehavior } = await import(
  pathToFileURL(path.resolve('client/src/modules/raceBehavior.js'))
);

const track = require(path.resolve('server/data/tracks/dirt-oval.json'));

const NUM_RACERS = 20;
const NUM_FRAMES = 1800;
const BASE_SPEED_MIN = 0.00096;
const BASE_SPEED_MAX = 0.00113;
const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
const REROLL_INTERVAL_FRAMES = 58;
const REROLL_VARIATION_PERCENT = 58;
const DRAFTING_BOOST = 1.04;
const DRAFTING_MAX_DISTANCE = 80;
const TRACE_PATH = path.resolve('docs/diagnose/free-lane-force-attribution-trace.ndjson');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shortestArcDeltaT(a, b) {
  let d = Math.abs(a - b);
  if (d > 0.5) d = 1 - d;
  return d;
}

const rand = mulberry32(98051);
const center = track.centerPoints;
if (!Array.isArray(center) || center.length < 3) {
  throw new Error('dirt-oval centerPoints missing/invalid');
}

const segLengths = [];
let pathLengthPx = 0;
for (let i = 0; i < center.length; i++) {
  const a = center[i];
  const b = center[(i + 1) % center.length];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  segLengths.push(len);
  pathLengthPx += len;
}

const worldWidth = Number(track.worldWidth) || 1536;
const trackWidthPx = Math.max(120, Math.min(260, worldWidth * 0.12));
const spriteWorldSizePx = 54;

function sampleCenterline(t) {
  let s = ((t % 1) + 1) % 1;
  s *= pathLengthPx;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const len = segLengths[i];
    if (s <= acc + len || i === segLengths.length - 1) {
      const a = center[i];
      const b = center[(i + 1) % center.length];
      const u = len > 0 ? (s - acc) / len : 0;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      return { x, y, angle };
    }
    acc += len;
  }
  return { x: center[0].x, y: center[0].y, angle: 0 };
}

const behaviorConfig = {
  enabled: true,
  startSpreadRange: 0.95,
  runoutZone: 0.05,
  homeForceStrength: 0.04,
  comfortThreshold: 0.7,
  softRepulsionStrength: 0.1,
  avoidanceDistance: 0.35,
  tWeight: 2.0,
  yWeight: 1.0,
  lateralForce: 0.01,
  maxLateral: 0.95,
  speedBrakeYThreshold: 0.2,
  speedBrakeTThreshold: 0.015,
  speedBrakeFactor: 0.95,
  draftingMaxDistance: DRAFTING_MAX_DISTANCE,
  draftingConeAngle: 30,
  draftingBoost: DRAFTING_BOOST,
};

const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
const halfWidth = spreadRange * (REROLL_VARIATION_PERCENT / 100);

const racers = [];
for (let i = 0; i < NUM_RACERS; i++) {
  const frac = i / (NUM_RACERS - 1);
  const baseSpeed = BASE_SPEED_MIN + (BASE_SPEED_MAX - BASE_SPEED_MIN) * frac;
  const r = {
    index: i,
    id: `r${i}`,
    name: `R${i}`,
    t: i * 0.001,
    x: 0,
    y: 0,
    angle: 0,
    physicalY: 0,
    finished: false,
    avoidanceActive: false,
    draftingBoostActive: false,
    spreadFactor: baseSpeed / BASE_SPEED_MEAN,
    baseSpeed,
    nextRerollFrame: Math.floor(rand() * REROLL_INTERVAL_FRAMES),
    frameSizePx: spriteWorldSizePx,
    trackWidthPx,
    pathLengthPx,
  };
  initRacerBehavior(r);
  // 4 staggered start lines like compact row layout
  r.physicalY = ((i % 4) - 1.5) * 0.11;
  racers.push(r);
}

function updatePositions() {
  for (const r of racers) {
    const p = sampleCenterline(r.t);
    const nx = -Math.sin(p.angle);
    const ny = Math.cos(p.angle);
    const lateralOffsetPx = r.physicalY * (trackWidthPx / 2);
    r.x = p.x + nx * lateralOffsetPx;
    r.y = p.y + ny * lateralOffsetPx;
    r.angle = p.angle;
  }
}

fs.mkdirSync(path.dirname(TRACE_PATH), { recursive: true });
const out = fs.createWriteStream(TRACE_PATH, { flags: 'w' });

globalThis.__FREE_LANE_FORCE_ATTRIB_TRACE = true;
globalThis.__FREE_LANE_FORCE_ATTRIB_FRAME = 0;
globalThis.__FREE_LANE_FORCE_ATTRIB_LOGGER = (payload) => {
  out.write(`${JSON.stringify(payload)}\n`);
};

for (let frame = 0; frame < NUM_FRAMES; frame++) {
  for (const r of racers) {
    if (frame >= r.nextRerollFrame) {
      const jitter = (rand() - 0.5) * 2 * halfWidth;
      const minSf = BASE_SPEED_MIN / BASE_SPEED_MEAN;
      const maxSf = BASE_SPEED_MAX / BASE_SPEED_MEAN;
      r.spreadFactor = Math.max(minSf, Math.min(maxSf, r.spreadFactor + jitter));
      r.baseSpeed = BASE_SPEED_MEAN * r.spreadFactor;
      r.nextRerollFrame += REROLL_INTERVAL_FRAMES;
    }

    const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1;
    const brake = r.avoidanceActive ? behaviorConfig.speedBrakeFactor : 1;
    r.t += r.baseSpeed * boost * brake;
  }

  updatePositions();
  applyRacerBehavior(racers, behaviorConfig);
}

await new Promise((resolve) => out.end(resolve));

delete globalThis.__FREE_LANE_FORCE_ATTRIB_TRACE;
delete globalThis.__FREE_LANE_FORCE_ATTRIB_FRAME;
delete globalThis.__FREE_LANE_FORCE_ATTRIB_LOGGER;

console.log(`Trace geschrieben: ${TRACE_PATH}`);

// Compact post-run diagnostics in terminal
const overlapsByFrame = new Map();
for (const line of fs.readFileSync(TRACE_PATH, 'utf8').split(/\r?\n/)) {
  if (!line) continue;
  const row = JSON.parse(line);
  if (!overlapsByFrame.has(row.frame)) overlapsByFrame.set(row.frame, 0);
  if (row.isOverlapping) overlapsByFrame.set(row.frame, overlapsByFrame.get(row.frame) + 1);
}
let overlapFrames = 0;
for (const [, c] of overlapsByFrame.entries()) {
  if (c > 0) overlapFrames++;
}
console.log(`Frames mit Overlap: ${overlapFrames}/${NUM_FRAMES}`);
