// ============================================================
// File:        scripts/company-bind-truth.mjs
// Project:     RaceArena — MIN-RACERS-5
//
// THE QUESTION THE OWNER CANNOT ANSWER BY EYE: how OFTEN does the company guarantee actually do
// anything, and what does it cost the shot? He can see that a particular frame is too wide; he
// cannot see that the guarantee bound on 4% of frames rather than 40%.
//
// WHAT IS MEASURED, and the second number is the one to read:
//   CAPPED   some ceiling held the shot wider than the state asked for (`guaranteed < stateZoom`).
//            Read straight off the director's own probe. It does not say WHICH ceiling.
//   CHANGED  the share of frames whose zoom DIFFERS from the same race with the guarantee OFF.
//            This is the honest headline: it is the share of frames where this setting, and nothing
//            else, changed the picture. Off is `minRacersVisible = 1`, which the ceiling short-
//            circuits to Infinity, so the arms differ in exactly one thing.
//
// WHY NOT ASK THE CEILING DIRECTLY. A first version called `_companyCeiling` again after the frame
// and counted the frames where it was the smallest term. It reported 0 % on both tracks while the
// camera fingerprint plainly moved — because by the time the harness calls it, `update()` has
// already advanced `this.state` and `this._proj`, so the recomputed ceiling is not the one the frame
// used. The differential below cannot be wrong that way: it compares two real runs.
//
// IT READS THE REAL PATH, IT DOES NOT REBUILD IT. `CameraDirector._framingProbe` is written every
// frame with the framing inputs that frame actually used, and is read by nothing in the camera —
// it exists so a harness measures the real decision instead of a reconstruction of it, which is the
// failure this repo has paid for six times. READ-ONLY: no engine file is edited and nothing here can
// move a fingerprint.
//
// Usage:
//   node scripts/company-bind-truth.mjs
//   node scripts/company-bind-truth.mjs --tracks=searound,river-run --arms=1,3,5 --racers=40
// ============================================================

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

// The two tracks the benches already use: searound is CLOSED and bunches the field into a repeating
// pack; river-run is OPEN and strings it out. The pack/spread contrast is the whole argument here.
const TRACKS = (arg("tracks", "searound,river-run") || "")
  .split(",")
  .filter(Boolean);
// 1 disables the guarantee (`<= 1` returns Infinity), so it is the control arm.
const ARMS = (arg("arms", "1,3,5") || "").split(",").map(Number);
const RACERS = Number(arg("racers", "40"));
const SEED = Number(arg("seed", "5601"));
const CW = 1280;
const CH = 720;

const pct = (s, p) =>
  s[Math.min(s.length - 1, Math.floor(((s.length - 1) * p) / 100))];

function runArm(geo, minRacersVisible) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: "track-default",
    seconds: 60,
    canvasW: CW,
    canvasH: CH,
    note: `MIN-RACERS-5 minRacersVisible=${minRacersVisible}`,
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  cameraConfig.minRacersVisible = minRacersVisible;
  const race = buildRace(geo, identity, cameraConfig);

  let frames = 0;
  let capped = 0;
  const zooms = [];
  const trace = [];

  runRace(race, identity, cameraConfig, ({ cd }) => {
    const p = cd._framingProbe;
    if (!p) return;
    frames++;
    zooms.push(p.guaranteed);
    trace.push(p.guaranteed);
    if (p.guaranteed < p.stateZoom) capped++;
  });

  const sorted = [...zooms].sort((a, b) => a - b);
  return {
    minRacersVisible,
    frames,
    cappedPct: frames ? (100 * capped) / frames : 0,
    zoomP5: pct(sorted, 5),
    zoomMed: pct(sorted, 50),
    zoomP95: pct(sorted, 95),
    trace,
  };
}

/** Share of frames whose zoom differs from the OFF arm, and the largest widening it caused. */
function diffVsOff(arm, off) {
  const n = Math.min(arm.trace.length, off.trace.length);
  let changed = 0;
  let widestRatio = 1;
  for (let i = 0; i < n; i++) {
    const a = arm.trace[i];
    const b = off.trace[i];
    if (Math.abs(a - b) > 1e-9) changed++;
    if (b > 0 && b / a > widestRatio) widestRatio = b / a;
  }
  return {
    comparedFrames: n,
    changedPct: n ? (100 * changed) / n : 0,
    widestRatio,
  };
}

console.log(
  formatIdentity(
    resolveIdentity({ racers: RACERS, raceSeed: SEED, note: "MIN-RACERS-5" }),
  ),
);
console.log(
  "\nCAPPED  = some ceiling held the shot wider than the state asked for\n" +
    "CHANGED = zoom differs from the FIRST arm listed (the baseline for this run)\n" +
    "widest  = largest single-frame widening vs that baseline, as a ratio\n",
);
console.log(
  "track        minRacers   frames   CAPPED%   CHANGED%   widest   zoom p5 / median / p95",
);
for (const id of TRACKS) {
  const geo = loadTracks({ only: id })[0];
  if (!geo) {
    console.error(`no such track: ${id}`);
    continue;
  }
  const results = ARMS.map((a) => runArm(geo, a));
  const off = results.find((r) => r.minRacersVisible <= 1) ?? results[0];
  for (const r of results) {
    const d = r === off ? { changedPct: 0, widestRatio: 1 } : diffVsOff(r, off);
    console.log(
      `${id.padEnd(12)} ${String(r.minRacersVisible).padStart(9)}   ${String(r.frames).padStart(6)}   ` +
        `${r.cappedPct.toFixed(1).padStart(7)}   ${d.changedPct.toFixed(1).padStart(8)}   ` +
        `${d.widestRatio.toFixed(3).padStart(6)}   ` +
        `${r.zoomP5.toFixed(4)} / ${r.zoomMed.toFixed(4)} / ${r.zoomP95.toFixed(4)}`,
    );
  }
}
