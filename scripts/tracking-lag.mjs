// ============================================================
// File:        scripts/tracking-lag.mjs
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1 §4c
//
// THE QUESTION: OVERVIEW carries trackingTC 1.5 and entryTC 1.5 where every other state carries
// 0.25 and 0.8. Neither value has a reason in the code. Is the slow OVERVIEW worth keeping?
//
// THE METRIC is the one this project already uses for the tracking lag (CAMERA_DIRECTOR.md §6,
// "5.8–7.9 pp in LEADER, 25.2 pp in OVERVIEW"): PERCENTAGE POINTS of frame. The framing rule says
// the anchor should sit at a chosen fraction along the frame's motion axis — `leaderForwardFrac`
// for a FORWARD state, 0.5 for a CENTRED one. Where it ACTUALLY sits is the inverse of
// `anchorScreenPoint`:
//
//     actualFrac = 0.5 + ((P − centre) · û) / frameExtentAlong(û)
//     lag_pp     = |intendedFrac − actualFrac| × 100
//
// So the number means "the subject is this many points of the frame away from where the framing
// rule put him". It is a LAG rather than an error because the camera is lerping toward the right
// answer the whole time; a large number means it has not arrived.
//
// Usage:
//   node scripts/tracking-lag.mjs                       # the shipped defaults
//   node scripts/tracking-lag.mjs --overview-tc=0.25,0.8  # OVERVIEW made as quick as the rest
//   node scripts/tracking-lag.mjs --overview-tc=1.5,0.25  # slow ENTRY kept, slow TRACKING dropped
// ============================================================

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from './lib/raceDriver.mjs';
import { DEFAULT_CAMERA_CONFIG } from '../client/src/modules/storage/defaults.js';
import { frameExtentAlong } from '../client/src/modules/camera/frameGeometry.js';
import { framingFor, POSITION } from '../client/src/modules/camera/framingRule.js';

const tcArg = process.argv.find((a) => a.startsWith('--overview-tc='));
const OVERRIDE = tcArg ? tcArg.split('=')[1].split(',').map(Number) : null;

const IDENTITY = resolveIdentity({
  racers: 40,
  raceSeed: 5601,
  cameraSeed: 1439767152,
  racerType: TRACK_DEFAULT_RACER,
  seconds: 60,
  note: 'the CAMERA-ANCHOR-TRUTH-1 measurement context',
});

const median = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p95 = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.round(0.95 * (s.length - 1)))];
};

// The camera config, with OVERVIEW's two time constants optionally overridden. Deep-copied so the
// shipped defaults object is never mutated.
function cameraConfig() {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CAMERA_CONFIG));
  if (OVERRIDE) {
    const prof = cfg.cameraStateProfiles?.OVERVIEW ?? cfg.stateProfiles?.OVERVIEW;
    if (!prof) throw new Error('cannot find the OVERVIEW profile to override');
    prof.trackingTC = OVERRIDE[0];
    prof.entryTC = OVERRIDE[1];
  }
  return cfg;
}

function measureTrack(geo, cfg) {
  const race = buildRace(geo, IDENTITY, cfg);
  const { cd, st } = race;

  const byState = new Map();

  runRace(race, IDENTITY, cfg, () => {
    const p = cd._framingProbe;
    if (!p || !p.point || !(cd.zoom > 0) || cd.lerpPhase !== 'tracking') {
      return;
    }
    const hs = cd._headingScreen(p.t);
    const hlen = hs ? Math.hypot(hs.x, hs.y) : 0;
    if (!(hlen > 0)) {
      return;
    }
    const ux = hs.x / hlen;
    const uy = hs.y / hlen;
    const framing = framingFor(cd.state);
    const intended = framing.position === POSITION.FORWARD ? (cd._leaderForwardFrac ?? 0.5) : 0.5;
    const sxPix = p.point.x * cd._proj.effX(cd.zoom) + cd.offsetX;
    const syPix = p.point.y * cd._proj.effY(cd.zoom) + cd.offsetY;
    const chord = frameExtentAlong(ux, uy, p.frameW, p.frameH);
    if (!(chord > 0)) {
      return;
    }
    const along = (sxPix - p.frameW / 2) * ux + (syPix - p.frameH / 2) * uy;
    const actual = 0.5 + along / chord;
    const lagPp = Math.abs(intended - actual) * 100;
    if (!byState.has(cd.state)) byState.set(cd.state, []);
    byState.get(cd.state).push(lagPp);
  });
  return byState;
}

const geos = loadTracks();

const cfg = cameraConfig();
const prof = cfg.cameraStateProfiles?.OVERVIEW ?? cfg.stateProfiles?.OVERVIEW;
console.log(
  `TRACKING LAG (percentage points of frame, tracking phase only) — OVERVIEW trackingTC=${prof.trackingTC} entryTC=${prof.entryTC}\n`
);
console.log(formatIdentity(IDENTITY));

const pooled = new Map();
for (const geo of geos) {
  const byState = measureTrack(geo, cfg);
  for (const [s, arr] of byState) {
    if (!pooled.has(s)) pooled.set(s, []);
    pooled.get(s).push(...arr);
  }
}

console.log('state              frames    median pp    p95 pp');
const order = [...pooled.keys()].sort();
for (const s of order) {
  const a = pooled.get(s);
  console.log(
    `  ${s.padEnd(16)} ${String(a.length).padStart(7)}   ${median(a).toFixed(2).padStart(8)}  ${p95(a).toFixed(2).padStart(8)}`
  );
}
const ov = pooled.get('OVERVIEW') ?? [];
const others = order.filter((s) => s !== 'OVERVIEW').flatMap((s) => pooled.get(s));
console.log(
  `\n  OVERVIEW median ${median(ov).toFixed(2)} pp vs every other state pooled ${median(others).toFixed(2)} pp` +
    `  (ratio ${(median(ov) / median(others)).toFixed(2)}x)`
);
