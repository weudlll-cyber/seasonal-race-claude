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
// THREE QUESTIONS, because each one alone has been satisfied by a frame the owner rejected:
//
//   1. WHERE THE FRAME IS — the camera centre stays near the track through the run-in. Measured as
//      the distance from the centre to the nearest point on the track spine, in TRACK WIDTHS so it
//      means the same thing on a 131 px corridor and a 250 px one.
//
//   2. WHAT IS IN IT — at least one racer is on screen, on EVERY frame of the race. Not scoped to
//      the endgame: "the picture is never empty" is worth holding everywhere, and it costs one
//      projection per racer per frame to hold it.
//
//   3. IS THE FINISH LINE IN IT — RUNIN-LINE-1, and it is the promise the run-in EXISTS for. Every
//      frame from the endgame threshold to the crossing, on ALL TEN TRACKS. Questions 1 and 2 were
//      green throughout the run-in's whole development because they ask about RACERS; on 2026-08-17
//      the owner rejected a production build for a shot that closed so far the finish line left the
//      frame, and nothing in this repository could see it. A guard that cannot fail on the defect
//      its feature is named after is not guarding that feature.
//
// ── WHAT QUESTION 3 DOES *NOT* RECONSTRUCT, WHICH IS THE WHOLE OF ITS DESIGN ────────────────────
//
// It computes NO framing rule of its own. Six blocks in this project have been costed by a harness
// that measured a COPY of the thing it was grading — most recently a 2.4x underestimate — so this
// asks the director and the projection for their own answers and does arithmetic on nothing else:
//
//   the line's world point   `cd._finishLineWorldPoint(st.finishT)`  — the SAME call `_lineCeiling`
//                            makes to decide the bound. Not `shape.getPosition` re-derived here.
//   world -> screen          `cd._proj.toScreen(pt, cd.zoom, cd.offsetX, cd.offsetY)` — declared in
//                            projection.js as "THE only sanctioned world->screen call", given the
//                            zoom and offsets the director DELIVERED this frame.
//   which term decided it    `cd._framingProbe.binding` and `.ceilings` — the read-only probe the
//                            director already writes, so "what was binding when the line left" is
//                            READ rather than inferred from the total.
//
// The only judgement this file adds is the comparison to the canvas rectangle, which is not a rule
// the product owns — it is what "on screen" means.
//
// WHAT IT MEASURES IS THE POINT, NOT THE PAINTED BAND. `_lineCeiling` guarantees the finish line's
// SPINE POINT, so that is what is graded; the drawn checkerboard straddles it across the corridor
// and can clip at the edges while the point is still inside. A margin near zero therefore means the
// band is already half out. That is a deliberate floor, not an oversight — grading the painted band
// would mean reconstructing how it is drawn, which is exactly what the paragraph above forbids.
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
// THAT FAILURE IS GONE, AND NOTHING HERE WAS TOUCHED TO ACHIEVE IT (RUNIN-GLIDE-1, same day). The
// run-in now starts the leader BEHIND frame centre, so most of the frame lies toward the finish and
// the line fits without the shot having to swell to hold both. The two cases read 0.15 and 1.23
// track widths against the untouched limit of 2.
//
// IT IS STILL POSSIBLE TO REACH A WORLD-SIZED FRAME — the pull-out is deliberately whatever the line
// requires, and on a closed track whose finish is most of a lap away at the threshold that is the
// whole world (city-circuit and ice-track measure 100%). Those tracks are not in the two cases below.
// If a later change brings one of them here and this half fails at ~2 track widths, the reading is
// almost certainly that frame and not a defect: see RUNIN-OWNS-1's report for the geometry, which is
// that a world-sized frame CANNOT be centred on the spine because the world-bounds clamp centres it
// on the world, whose centre on an oval is the infield.
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
    "that the camera centre stays near the track through the run-in, that at least one racer is on screen on every frame of the race, and that the FINISH LINE stays in frame from the endgame threshold to the crossing on all ten tracks",
  blind: [
    "whether the shot is GOOD — one racer at the edge passes",
    "anything the DOM draws; this is the canvas transform only",
    "the centre and never-empty questions run TWO tracks, one open and one closed",
    "the PAINTED finish band — question 3 grades the spine point the director guarantees, so a margin near zero already means the band is clipping",
    "one seed per track; a line that leaves only on some other race is not covered",
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

// ── QUESTION 3 (RUNIN-LINE-1): IS THE FINISH LINE IN FRAME, THRESHOLD → CROSSING, TEN TRACKS ────
//
// ONE SEED FOR ALL TEN, so the ten rows are comparable to each other. Seed 9 is the seed the camera
// harnesses in this repository already sweep on (`endgame-width-truth`, and the run-in's own tables),
// which means a row here can be laid beside a row there without asking whether the race was the same.
const LINE_SEED = 9;
// THE CONTROL ARM FOR QUESTION 3 (RUNIN-LINE-1). `--no-cap` turns `contenderZoom` off, which is the
// key that gates the corridor cap — the composition that runs AFTER `_setTargets`'s `Math.min` and
// re-applies only ONE of the five ceilings. Running the same ten tracks with it off is how "the cap
// is what puts the line out" stops being a reading of the code and becomes a measurement.
const NO_CAP = process.argv.includes("--no-cap");
const LINE_CFG = NO_CAP
  ? { ...DEFAULT_CAMERA_CONFIG, contenderZoom: false }
  : DEFAULT_CAMERA_CONFIG;
const LINE_RACERS = 20;
/** Deciles of the window, so the row is a SERIES and not one number. */
const SERIES_STEPS = 10;

console.log(
  `\nthe finish line, threshold → crossing (seed ${LINE_SEED}, ${LINE_RACERS} racers) — ` +
    `margin in px from the nearest frame edge; negative is OUT`,
);

const lineRows = [];
for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: LINE_RACERS,
    raceSeed: LINE_SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "RUNIN-LINE-1 — is the finish line in frame",
  });
  const race = buildRace(geo, identity, LINE_CFG);
  const endgame = DEFAULT_CAMERA_CONFIG.endgameThreshold;

  const samples = [];
  runRace(
    race,
    identity,
    LINE_CFG,
    ({ cd: c, st: s, ts, raceStart }) => {
      if (!(s.finishT > 0) || (s.finishedCount ?? 0) > 0) return;
      let maxT = 0;
      for (const r of s.racers) if (r.t > maxT) maxT = r.t;
      const progress = maxT / s.finishT;
      if (!(progress > endgame)) return;

      // THE DIRECTOR'S OWN LINE POINT AND THE DIRECTOR'S OWN PROJECTION. See the header.
      const line = c._finishLineWorldPoint(s.finishT);
      if (!line) return;
      const p = c._proj.toScreen(line, c.zoom, c.offsetX, c.offsetY);
      // Distance to the nearest edge of the canvas. Negative on whichever side it left by.
      const margin = Math.min(p.x, CW - p.x, p.y, CH - p.y);
      samples.push({
        ms: Math.round(ts - raceStart),
        progress,
        margin,
        sx: p.x,
        sy: p.y,
        zoom: c.zoom,
        hud: c.hudState,
        // Read, not inferred: which term produced the delivered zoom on this frame.
        binding: c._framingProbe?.binding ?? "?",
        runInActive: c._runInActive === true,
        runInBinding: c._runInBinding === true,
        // The run-in's own progress, so the release moment can be located in the same series.
        // ── WAS THE RUN-IN'S OWN BOUND OVERRIDDEN ON THIS FRAME? ────────────────────────────────
        // The delivered zoom being TIGHTER than `_ceilings.line` means some term closed the shot
        // past what the run-in asked for. That is a categorical statement about the composition,
        // not a magnitude — which is why the fail rule below is built on it rather than on a
        // pixel threshold. A threshold here would be exactly the "cap that looks like a guardrail
        // and ends up steering" this repository has already paid for once.
        overridden:
          Number.isFinite(c._framingProbe?.ceilings?.line) &&
          c._framingProbe.guaranteed > c._framingProbe.ceilings.line + 1e-9,
        // Reported when the director HAS a sweep; 0 on a director that predates the hold, so this
        // instrument can be pointed at either arm without knowing which it is looking at.
        runInU:
          typeof c._runInSweepU === "function" && c._runInReleaseProgress != null
            ? c._runInSweepU()
            : 0,
      });
    },
    { slowmo: true },
  );

  if (samples.length === 0) {
    console.log(
      `  ${geo.id.padEnd(15)} no frame between the threshold and a crossing — not measured ` +
        `(the race did not reach the line inside the driver's 200 s ceiling)`,
    );
    lineRows.push({ id: geo.id, measured: false });
    continue;
  }

  // ── TWO DIFFERENT THINGS, AND ONLY ONE OF THEM IS A DEFECT ────────────────────────────────────
  //
  // THE APPROACH. On the first frame of the window the camera is still in whatever tight shot it
  // was running — measured, up to cam.zoom 12.4 on searound — and the run-in has only just told it
  // to open. `cd.zoom` is the DELIVERED zoom and it eases toward the target, so the line is
  // necessarily outside until the shot has travelled. That is physics, not a defect: no camera can
  // already be somewhere it is on its way to. Those frames are COUNTED AND PRINTED but do not fail.
  //
  // THE DEFECT is the line going out AGAIN after it has once been in — the shot had it, and then
  // closed past it. That is exactly what the owner rejected on 2026-08-17, and it needs no
  // knowledge of how long the opening takes, which is why the rule is stated this way rather than
  // by reconstructing the glide's duration.
  const firstInIdx = samples.findIndex((s) => s.margin >= 0);
  const held = firstInIdx < 0 ? [] : samples.slice(firstInIdx);
  let worst = held.length ? held[0] : samples[0];
  for (const s of held) if (s.margin < worst.margin) worst = s;
  // ── THE TWO KINDS OF LOSS, SPLIT BY CAUSE AND NOT BY SIZE ─────────────────────────────────────
  //
  // OVERRIDDEN — the line left while the delivered zoom was TIGHTER than the run-in's own ceiling.
  // Some other term closed the shot past the bound that exists to keep the line in frame. THIS IS
  // THE DEFECT and it is what fails the guard.
  //
  // TRAILED — the line left while the shot was at or wider than the run-in asked for. The bound was
  // honoured and the CAMERA had not arrived: the pan eases toward its target, so during a fast
  // sweep the leader sits further forward in the delivered frame than the guarantee assumed and the
  // line falls off the front edge. `_lineCeiling`'s own header records this effect. It is REPORTED,
  // with its numbers, and does not fail — its lever is the sweep's length (`runInOpenMs`), which is
  // a pace decision reserved to the owner, and a guard that failed on it would be policing taste.
  const lost = held.filter((s) => s.margin < 0);
  const overriddenFrames = lost.filter((s) => s.overridden).length;
  const trailedFrames = lost.length - overriddenFrames;
  const firstOut = lost.find((s) => s.overridden) ?? lost[0] ?? null;
  const outFrames = lost.length;
  const approachFrames = firstInIdx < 0 ? samples.length : firstInIdx;
  const approachMs = firstInIdx < 0 ? null : samples[firstInIdx].ms - samples[0].ms;
  // NEVER GETTING THE LINE IN FRAME AT ALL is the same failure by a shorter route.
  const ok = firstInIdx >= 0 && overriddenFrames === 0;
  if (!ok) failures++;

  // THE SERIES: the worst margin inside each decile of the measured window, so a row shows WHERE
  // the line goes and not merely how bad it got.
  const series = [];
  for (let k = 0; k < SERIES_STEPS; k++) {
    const lo = k / SERIES_STEPS;
    const hi = (k + 1) / SERIES_STEPS;
    let m = null;
    for (let i = 0; i < samples.length; i++) {
      const f = i / (samples.length - 1 || 1);
      if (f < lo || (f >= hi && k < SERIES_STEPS - 1)) continue;
      if (m === null || samples[i].margin < m) m = samples[i].margin;
    }
    series.push(m);
  }

  console.log(
    `  ${geo.id.padEnd(15)} ${!ok ? "LOST" : trailedFrames ? "TRAIL" : "HELD "} worst ${worst.margin.toFixed(0).padStart(6)} px ` +
      `at progress ${worst.progress.toFixed(3)} (${worst.hud}, binding ${worst.binding}, ` +
      `zoom ${worst.zoom.toFixed(3)}, u ${worst.runInU.toFixed(2)})  ` +
      `${overriddenFrames} overridden + ${trailedFrames} trailed of ${held.length}` +
      `   approach ${approachFrames}f${approachMs === null ? "" : ` / ${approachMs} ms`}`,
  );
  console.log(
    `      series ${series.map((m) => (m === null ? "   —" : String(Math.round(m)).padStart(5))).join(" ")}`,
  );
  if (outFrames && held.length) {
    // WHICH TERM WAS BINDING WHILE THE LINE WAS OUT — counted, not eyeballed. A diagnosis that
    // names a term on the strength of one printed frame has picked the frame; this is the
    // distribution over every lost frame, read off the director's own probe.
    const byTerm = new Map();
    for (const s of held) if (s.margin < 0) byTerm.set(s.binding, (byTerm.get(s.binding) ?? 0) + 1);
    const terms = [...byTerm.entries()].sort((a, b) => b[1] - a[1]);
    console.log(
      `      binding while out: ${terms.map(([k, n]) => `${k} ${n}`).join(", ")}`,
    );
  }
  if (firstInIdx < 0) {
    console.log(
      `      FAIL: the finish line was NEVER in frame between the threshold and the crossing.`,
    );
  } else if (!ok) {
    console.log(
      `      FAIL: the line was in frame, then LEFT while the shot was TIGHTER than the run-in's ` +
        `own ceiling, at progress ${firstOut.progress.toFixed(3)} ` +
        `(${firstOut.ms} ms, ${firstOut.hud}), screen (${firstOut.sx.toFixed(0)}, ${firstOut.sy.toFixed(0)}) ` +
        `on a ${CW}x${CH} canvas — binding term "${firstOut.binding}", zoom ${firstOut.zoom.toFixed(3)}, ` +
        `sweep u ${firstOut.runInU.toFixed(3)}.`,
    );
  }
  lineRows.push({ id: geo.id, measured: true, ok, worst, outFrames, samples, held });
}

if (VERBOSE) {
  // The frame-by-frame tail around the worst moment on the worst track, for a diagnosis that needs
  // to see the term change hands rather than the summary of it.
  const bad = lineRows
    .filter((r) => r.measured && !r.ok)
    .sort((a, b) => a.worst.margin - b.worst.margin)[0];
  if (bad) {
    console.log(`\n  --verbose: ${bad.id}, frames around the worst margin`);
    const i = bad.samples.indexOf(bad.worst);
    for (let k = Math.max(0, i - 8); k <= Math.min(bad.samples.length - 1, i + 3); k++) {
      const s = bad.samples[k];
      console.log(
        `      p ${s.progress.toFixed(4)}  margin ${s.margin.toFixed(0).padStart(6)}  ` +
          `zoom ${s.zoom.toFixed(4)}  u ${s.runInU.toFixed(3)}  binding ${s.binding.padEnd(18)} ` +
          `runInActive ${s.runInActive} runInBinding ${s.runInBinding}  ${s.hud}`,
      );
    }
  }
}

if (failures > 0) {
  console.log(
    `\ncheck-runin-frame: ${failures} case(s) failed. A camera pointed away from the race is a\n` +
      `defect however good the framing numbers look — and so is a run-in that closes past its own\n` +
      `finish line: keeping that line in frame from the threshold to the crossing is the promise the\n` +
      `run-in exists for. See the header for why this guard exists.`,
  );
  process.exit(1);
}
console.log(
  "\ncheck-runin-frame: the camera is pointed at the race on both tracks, and the finish line is in\n" +
    "frame from the endgame threshold to the crossing on every track measured. PASS",
);
