// ============================================================
// File:        scripts/finish-pair-truth.mjs
// Project:     RaceArena — FINISH-PAIR-1
//
// WHAT THIS MEASURES: how many times the PICTURE REVERSES DIRECTION across the finish, so the
// owner's "forward, back, forward, back" becomes a number instead of a description — and so the
// switch that fixes it (`photoFinishContenderFraming`) can be argued from both positions.
//
// THE METRIC. A fixed world landmark — the finish line itself — is projected to canvas pixels every
// frame, and the run of frames it travels in is split wherever that motion REVERSES (the dot product
// with the current run direction goes negative). Runs shorter than `--min` screen pixels are folded
// away as noise. Two runs is a healthy ending: the shot carries forward across the line, then the
// camera pulls back to the lookback point. Four or five is the defect.
//
// WHY A LANDMARK AND NOT THE CAMERA CENTRE: what the eye calls a jump is the picture moving, and the
// picture can move while the centre sits still (the zoom is changing) or sit still while the centre
// moves. Projecting one fixed world point through the SAME numbers the renderer consumes settles it.
//
// TWO THINGS THIS RUN NEEDS THAT NO OTHER HARNESS HERE ASKS FOR, both opt-in on the shared driver:
//   • THE ROSTER. A racer's name is an engine input (`stablePairBit`). Nameless, seed 2814 is a
//     DIFFERENT RACE and the defect does not appear at all.
//   • SLOW MOTION. RaceScreen halves the physics clock during the shot while the camera keeps
//     wall-clock. At full speed the defect does not reproduce either — the shot is over before the
//     framing can chase each swap.
// Both are why the camera fingerprint and finish-motion-truth are blind to this class of defect.
//
// READ-ONLY. It drives the real director through the shared race driver (ONE-DRIVER-1) and writes
// nothing back; it cannot move a fingerprint.
//
// Usage:
//   node scripts/finish-pair-truth.mjs                  # every track, both positions of the switch
//   node scripts/finish-pair-truth.mjs --only=searound  # the owner's race
//   node scripts/finish-pair-truth.mjs --detail         # every turning point, world AND screen px
//   node scripts/finish-pair-truth.mjs --min=60         # screen px a run must reach to count
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/racerNames.js")).href
);

const argVal = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit === undefined ? d : hit.slice(k.length + 3);
};
const ONLY = argVal("only", null);
const MIN = Number(argVal("min", 60));
const DETAIL = process.argv.includes("--detail");

// The owner's race, and the reason each number is what it is.
const IDENTITY = resolveIdentity({
  racers: 20,
  raceSeed: 2814,
  racerType: TRACK_DEFAULT_RACER,
  roster: resolveNameSet(DEFAULT_NAME_SET),
  note: "the owner's reported ending — Searound, Quick Test, 20 racers, seed 2814",
});

/** Direction runs of the picture: split wherever the landmark's screen motion reverses. */
function reversalRuns(points, min) {
  const raw = [];
  let cur = null;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const m = Math.hypot(dx, dy);
    if (m < 1e-6) continue;
    if (cur && cur.ux * dx + cur.uy * dy > 0) {
      cur.to = i;
      cur.sx += dx;
      cur.sy += dy;
      const n = Math.hypot(cur.sx, cur.sy);
      cur.ux = cur.sx / n;
      cur.uy = cur.sy / n;
    } else {
      cur = { from: i - 1, to: i, sx: dx, sy: dy, ux: dx / m, uy: dy / m };
      raw.push(cur);
    }
  }
  // Fold noise runs away, then re-merge neighbours that now point the same way.
  const out = [];
  for (const s of raw.filter((r) => Math.hypot(r.sx, r.sy) >= min)) {
    const p = out[out.length - 1];
    if (p && p.ux * s.ux + p.uy * s.uy > 0) {
      p.to = s.to;
      p.sx += s.sx;
      p.sy += s.sy;
      const n = Math.hypot(p.sx, p.sy);
      p.ux = p.sx / n;
      p.uy = p.sy / n;
    } else out.push({ ...s });
  }
  return out.map((s) => ({ ...s, mag: Math.hypot(s.sx, s.sy) }));
}

function measure(geo, contenderFraming) {
  const cameraConfig = { ...DEFAULT_CAMERA_CONFIG, photoFinishContenderFraming: contenderFraming };
  const race = buildRace(geo, IDENTITY, cameraConfig);
  const { shape, st } = race;
  const axisX = shape.isOpen ? 1.5 : IDENTITY.canvasW / geo.worldWidth;
  const axisY = shape.isOpen ? 1.5 : IDENTITY.canvasH / geo.worldHeight;
  const finishNormT = shape.isOpen ? Math.min(1, st.finishT) : ((st.finishT % 1) + 1) % 1;
  const landmark = shape.getPosition(finishNormT, 0);

  const frames = [];
  let firstCross = null;
  runRace(
    race,
    IDENTITY,
    cameraConfig,
    ({ cd, st: s, ts, raceStart, frame }) => {
      if (firstCross === null && s.finishedCount >= 1) firstCross = frame;
      frames.push({
        frame,
        ms: Math.round(ts - raceStart),
        finished: s.finishedCount,
        state: cd.state,
        hud: cd.hudState,
        zoom: cd.zoom,
        x: landmark.x * cd.zoom * axisX + cd.offsetX,
        y: landmark.y * cd.zoom * axisY + cd.offsetY,
      });
    },
    { slowmo: true }
  );

  // Measure from 90 frames before the first crossing: the approach is part of the ending.
  // NO CROSSING, NO MEASUREMENT. The shared driver stops a run at 200 s of race clock; a track whose
  // race is longer than that (garden-path needs ~270 s at 20 racers) never reaches its finish here,
  // and measuring "the ending" of a race that has no ending would silently report the reversals of
  // ordinary mid-race camera work as if they were the defect. Say so instead.
  if (firstCross === null) return { unmeasured: true, isOpen: shape.isOpen };
  const start = Math.max(0, firstCross - 90);
  const window = frames.slice(start);
  return { runs: reversalRuns(window, MIN), window, firstCross, frames, isOpen: shape.isOpen };
}

const tracks = loadTracks({ only: ONLY });
console.log(formatIdentity(IDENTITY));
console.log(
  `Reversals of the picture across the finish (runs >= ${MIN} screen px). ` +
    `TWO is healthy: carry forward across the line, then pull back.\n`
);
console.log("track            open    ON (shipped)   OFF (pre-fix)   verdict");
let worstOn = 0;
const unmeasured = [];
for (const geo of tracks) {
  const on = measure(geo, true);
  const off = measure(geo, false);
  if (on.unmeasured) {
    unmeasured.push(geo.id);
    console.log(
      `${geo.id.padEnd(16)} ${(on.isOpen ? "open" : "closed").padEnd(7)} ` +
        `${"—".padEnd(14)} ${"—".padEnd(15)} NOT MEASURED (race exceeds the driver's 200 s ceiling)`
    );
    continue;
  }
  worstOn = Math.max(worstOn, on.runs.length);
  const verdict = on.runs.length <= 2 ? (off.runs.length > 2 ? "FIXED" : "was already clean") : "STILL LURCHING";
  console.log(
    `${geo.id.padEnd(16)} ${(on.isOpen ? "open" : "closed").padEnd(7)} ` +
      `${String(on.runs.length).padEnd(14)} ${String(off.runs.length).padEnd(15)} ${verdict}`
  );
  if (DETAIL) {
    for (const [label, r] of [["ON ", on], ["OFF", off]]) {
      console.log(`    ${label} turning points:`);
      for (const s of r.runs) {
        const a = r.window[s.from];
        const b = r.window[s.to];
        console.log(
          `      f${a.frame}→${b.frame}  ${a.ms}→${b.ms} ms  ${s.mag.toFixed(0)} screen px  ` +
            `zoom ${a.zoom.toFixed(2)}→${b.zoom.toFixed(2)}  ${a.state}/${a.hud}→${b.state}/${b.hud}`
        );
      }
    }
  }
}
console.log(
  `\nWorst ON: ${worstOn} reversals. ` +
    (worstOn <= 2 ? "Every measured track is a two-motion ending." : "At least one track still lurches.")
);
if (unmeasured.length) {
  console.log(
    `NOT COVERED: ${unmeasured.join(", ")} — the race is longer than the shared driver's 200 s\n` +
      `ceiling, so it has no finish to measure here. Stated rather than silently counted as clean.`
  );
}
process.exitCode = worstOn <= 2 ? 0 : 1;
