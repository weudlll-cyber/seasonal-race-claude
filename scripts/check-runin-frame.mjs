// ============================================================
// File:        scripts/check-runin-frame.mjs
// Project:     RaceArena — RUNIN-FRAME-1
//
// WHAT THIS GUARDS: that the camera is pointed at the race.
//
// It exists because FINISH-FRAMED-1 shipped a measurement that could not see its own defect. That
// block asked "is the finish line in frame" and "what is the zoom at the crossing", and both were
// satisfied by a frame aimed at empty ground with the line in the corner. The owner found it with
// his eyes: 81 frames with not one racer on screen and the centre 10.9 track widths off the spine.
//
// TWO QUESTIONS, because one of them alone is what went wrong:
//
//   1. WHERE THE FRAME IS — the camera centre stays near the track through the run-in. Measured as
//      the distance from the centre to the nearest point on the track spine, in TRACK WIDTHS so it
//      means the same thing on a 131 px corridor and a 250 px one.
//
//   2. WHAT IS IN IT — at least one racer is on screen, on EVERY frame of the race. Not scoped to
//      the endgame: "the picture is never empty" is worth holding everywhere, and it costs one
//      projection per racer per frame to hold it.
//
// THE TWO HALVES ARE NOT EQUALLY STRONG, and it is worth knowing which one to trust.
//
// THE "NEVER EMPTY" HALF HAS NO THRESHOLD AT ALL. Zero racers on screen is a defect by inspection,
// it needs no number, and it is the half that actually caught FINISH-FRAMED-1: 51 frames against 0.
// If only one of these two survives a later review, keep this one.
//
// THE CENTRE HALF CARRIES A THRESHOLD, AND ITS MARGIN IS THIN TODAY. On master, where the run-in
// defect does not exist, both tracks sit at 0.09 and 0.11 track widths — comfortably inside the
// limit of 2. But on `feat/finish-framed`, the branch this guard was written against, searound came
// in at 2.07 against that same limit of 2: a fail by four hundredths. That is close enough that the
// number is doing tuning work rather than only defect-detection work, and it is recorded here
// rather than quietly widened.
//
// RE-CHECKED AT THE FINISHED REPAIR (RUNIN-OWNS-1, 2026-08-12). It left Searound near 2 again —
// 2.07 — and the limit has NOT been raised. Here is the wander, understood:
//
//   AT THAT FRAME THE CAMERA IS SHOWING 99% x 99% OF THE WORLD, with all 20 racers on screen and
//   the finish line in frame. The run-in opens the shot until the finish is visible, and on a
//   closed track the finish can be most of a lap away, so "the line in frame" becomes "the world in
//   frame". A world-sized frame CANNOT be centred on the spine: `resolveCamera`'s world-bounds
//   clamp centres it on the WORLD, and an oval's world centre is its infield. The two requirements
//   are geometrically exclusive at that width — this is not a camera pointed away from the race, it
//   is a camera showing all of it.
//
// THAT FAILURE IS GONE, AND NOTHING HERE WAS TOUCHED TO ACHIEVE IT (RUNIN-MINIMAL-1, same day).
// The run-in now opens only as far as the line needs and does not engage until the line fits inside
// OVERVIEW's width, so the world-sized frame no longer happens: the widest it reaches is 19-21% of
// the world and the two cases read 0.40 and 0.09 track widths. The limit of 2 stands untouched and
// unwidened, which is the outcome to want — the guard was reading a real property of the shot, the
// shot changed, and the reading changed with it.
//
// Why 2 and not something larger: a healthy run-in holds 0.1, and the original excursion reached
// 10.9. A limit in that gap catches a camera pointed at nothing without policing framing taste.
//
// WHAT IT DOES NOT COVER: whether the shot is GOOD. A frame containing one racer at the edge passes
// both questions. Framing quality is the owner's eye and the in-frame-share measurements; this is
// the floor beneath them.
//
// Usage:
//   node scripts/check-runin-frame.mjs           # both tracks
//   node scripts/check-runin-frame.mjs --verbose # per-track detail
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

export const GUARD = {
  id: "check-runin-frame",
  covers:
    "that the camera centre stays near the track through the run-in, and that at least one racer is on screen on every frame of the race",
  blind: [
    "whether the shot is GOOD — one racer at the edge passes",
    "anything the DOM draws; this is the canvas transform only",
    "tracks other than the two it runs, one open and one closed",
  ],
  dirs: ["client/src/modules/camera/"],
  files: [
    "client/src/modules/storage/defaults.js",
    "client/src/screens/RaceScreen/index.jsx",
  ],
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/racerNames.js")).href
);

const VERBOSE = process.argv.includes("--verbose");
// THE CONTROL ARM. Runs the same two races with `finishLineFraming` off, so the threshold can be
// shown to DISCRIMINATE rather than merely to be satisfied — a limit nobody has seen both fail and
// pass is a guess. INERT ON MASTER TODAY: the key does not exist here yet, so this flag changes
// nothing until `feat/finish-framed` lands, at which point it becomes the before/after lever.
const CONTROL = process.argv.includes("--control");
const CW = 1280;
const CH = 720;
/** Track widths. See the header: a defect line, not a tuning knob. */
const MAX_CENTRE_OFF_TW = 2;
const SPINE_SAMPLES = 2000;

/** One open track and one closed one, at the races the defect was found on. */
const CASES = [
  {
    track: "luger-hill",
    raceSeed: 9,
    note: "OPEN — where FINISH-FRAMED-1's excursion was found",
  },
  {
    track: "searound",
    raceSeed: 2814,
    note: "CLOSED — the owner's reported race",
  },
];

let failures = 0;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

for (const c of CASES) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: c.raceSeed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: c.note,
  });
  const geo = loadTracks({ only: c.track })[0];
  if (!geo) {
    console.log(`check-runin-frame: track ${c.track} not found — skipped.`);
    continue;
  }
  const cameraConfig = CONTROL
    ? { ...DEFAULT_CAMERA_CONFIG, finishLineFraming: false }
    : DEFAULT_CAMERA_CONFIG;
  const race = buildRace(geo, identity, cameraConfig);
  const { shape, st, trackWidthPx } = race;
  const bsX = shape.isOpen ? 1.5 : CW / geo.worldWidth;
  const bsY = shape.isOpen ? 1.5 : CH / geo.worldHeight;

  // The spine, sampled once. Distance to it is what "off the track" means.
  const spine = [];
  for (let i = 0; i <= SPINE_SAMPLES; i++)
    spine.push(shape.getPosition(i / SPINE_SAMPLES, 0));
  const offSpine = (x, y) => {
    let best = Infinity;
    for (let i = 0; i <= SPINE_SAMPLES; i++) {
      const d = (spine[i].x - x) ** 2 + (spine[i].y - y) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };

  const endgame = DEFAULT_CAMERA_CONFIG.endgameThreshold;
  let worstOff = { tw: 0 };
  let emptyFrames = 0;
  let firstEmpty = null;
  let runInFrames = 0;
  let totalFrames = 0;

  runRace(
    race,
    identity,
    cameraConfig,
    ({ cd, st: s, ts, raceStart }) => {
      totalFrames++;
      // ── QUESTION 2: never empty. Every frame of the race, not just the run-in. ──
      let onScreen = 0;
      for (const r of s.racers) {
        const sx = r.x * cd.zoom * bsX + cd.offsetX;
        const sy = r.y * cd.zoom * bsY + cd.offsetY;
        if (sx >= 0 && sx <= CW && sy >= 0 && sy <= CH) {
          onScreen++;
          break; // one is enough
        }
      }
      if (onScreen === 0) {
        emptyFrames++;
        if (firstEmpty === null)
          firstEmpty = { ms: Math.round(ts - raceStart), hud: cd.hudState };
      }
      // ── QUESTION 1: the centre stays near the track, through the run-in. ──
      let maxT = 0;
      for (const r of s.racers) if (r.t > maxT) maxT = r.t;
      if (s.finishT > 0 && maxT / s.finishT > endgame) {
        runInFrames++;
        const cx = (CW / 2 - cd.offsetX) / (cd.zoom * bsX);
        const cy = (CH / 2 - cd.offsetY) / (cd.zoom * bsY);
        const tw = offSpine(cx, cy) / trackWidthPx;
        if (tw > worstOff.tw) {
          worstOff = {
            tw,
            ms: Math.round(ts - raceStart),
            hud: cd.hudState,
            zoom: cd.zoom,
          };
        }
      }
    },
    { slowmo: true },
  );

  const centreOk = worstOff.tw <= MAX_CENTRE_OFF_TW;
  const emptyOk = emptyFrames === 0;
  if (!centreOk || !emptyOk) failures++;

  console.log(
    `${c.track.padEnd(12)} ${(shape.isOpen ? "open" : "closed").padEnd(7)} ` +
      `centre worst ${worstOff.tw.toFixed(2)} TW ${centreOk ? "OK " : "FAIL"}   ` +
      `empty frames ${String(emptyFrames).padStart(4)} ${emptyOk ? "OK " : "FAIL"}   ` +
      `(${runInFrames} run-in of ${totalFrames})`,
  );
  if (!centreOk) {
    console.log(
      `  FAIL: the camera centre reached ${worstOff.tw.toFixed(2)} track widths off the spine ` +
        `at ${worstOff.ms} ms (${worstOff.hud}, zoom ${worstOff.zoom?.toFixed(3)}), limit ${MAX_CENTRE_OFF_TW}.`,
    );
  }
  if (!emptyOk) {
    console.log(
      `  FAIL: ${emptyFrames} frame(s) with NO racer on screen, first at ${firstEmpty.ms} ms (${firstEmpty.hud}).`,
    );
  }
  if (VERBOSE) console.log(`  ${formatIdentity(identity)}`);
}

if (failures > 0) {
  console.log(
    `\ncheck-runin-frame: ${failures} case(s) failed. A camera pointed away from the race is a\n` +
      `defect however good the framing numbers look — see the header for why this guard exists.`,
  );
  process.exit(1);
}
console.log(
  "check-runin-frame: the camera is pointed at the race on both tracks. PASS",
);
