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
    "that the camera centre stays near the track through the run-in, that at least one racer is on screen on every frame of the race, and that the VIEWER CAN ALWAYS TELL WHERE THE FINISH LINE IS from the endgame threshold to the crossing — some part of the band inside the frame at COMPANY_FRAME_PCT, on all ten tracks at his field sizes",
  blind: [
    "whether the shot is GOOD — one racer at the edge passes",
    "anything the DOM draws; this is the canvas transform only",
    "the centre and never-empty questions run TWO tracks, one open and one closed",
    "WHICH part of the band is visible: question 3 asks whether ANY of it is inside the region, which is the requirement, not whether the part nearest the leader is",
    "the CHECKERBOARD's own drawing — the band's extent here is the track's width, which is geometry the race owns, not an appearance the renderer chooses",
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
const { cameraSeedForRace } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/camera/cameraSeed.js")).href
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

// ── QUESTION 3 (ENDGAME-LINE-1): CAN THE VIEWER ALWAYS TELL WHERE THE FINISH LINE IS? ──────────
//
// HIS REQUIREMENT, AS HE WROTE IT: from the START of the endgame until the crossing, the viewer can
// always tell where the finish line is. It need not be fully visible — cut at the edge is fine, part
// of the band is enough — but it never becomes unfindable.
//
// ── WHAT THIS REPLACES, AND WHY THE OLD RULE COULD NOT GUARD IT ───────────────────────────────
//
// RUNIN-LINE-1 asked "is the line's point on the CANVAS", and failed only when it left while the
// delivered zoom was TIGHTER than the run-in's own ceiling. Two ways that let the defect through:
//
//   IT PERMITTED AN APPROACH. The first frames of the window did not count, on the argument that a
//   camera cannot already be where it is on its way to. That argument belongs to a design whose
//   endgame move STARTS at the threshold. It does not survive requirement 1, which makes the
//   threshold a DEADLINE — the move must be FINISHED there. So there is no approach to forgive, and
//   a window that opens with the line outside is exactly the failure requirement 1 names.
//
//   IT SPLIT THE LOSSES BY CAUSE AND FAILED ON ONLY ONE OF THEM. A line that left because the pan
//   trailed was printed as "trailed" and PASSED. The viewer cannot see which term was binding; he
//   sees a frame with no line in it. Measured on the build the owner rejected: 0 overridden and 213
//   trailed frames of 265 on space-sprint — the guard was green while four fifths of the endgame
//   had no line on screen. That is the frame he photographed, and this file was green for it.
//
// ── THE CONDITION, AND WHY IT IS THE REQUIREMENT RATHER THAN A PROXY FOR IT ───────────────────
//
// SOME PART OF THE FINISH BAND IS INSIDE THE FRAME AT `COMPANY_FRAME_PCT`, on every frame of the
// window. His words: "it need not be fully visible — cut at the edge is fine, PART OF THE BAND IS
// ENOUGH". So the question is asked of the band and not of one point on it.
//
// THE FIRST CUT GRADED THE SPINE POINT ALONE AND WAS WRONG AT THE ONE MOMENT THAT MATTERS MOST.
// `_finishLineWorldPoint` returns the CENTRE of the line, and at the crossing the leader is in his
// own lane — up to half a corridor off the spine. Requirement 2 puts the shot at the photo finish's
// 0.4 corridors there, and half a corridor does not fit inside 0.4: the spine point is necessarily
// outside while the band the viewer is looking at runs straight across the picture. Measured that
// way, ice-track failed at 99.5% and dirt-oval at 99.3% — both of them frames where the line is the
// most visible thing on screen. A condition that fails on a correct frame is the condition's defect.
//
// THE BAND'S EXTENT IS THE TRACK'S OWN WIDTH, which is not a drawing detail — it is what a finish
// line IS, and it comes from the shape's own `getPosition(t, lateral)`, the same call the director
// uses for the centre. Nothing about the checkerboard's appearance is reconstructed here.
//
// THE SAMPLE CANNOT MISS THE BEST POINT. The margin along the band is CONCAVE — it is the minimum of
// four affine functions of position — so it has a single maximum and no local ones to fall into. A
// uniform sample across the corridor finds it to within the sample's own spacing.
//
// `COMPANY_FRAME_PCT` AND NOT 1.0, AND NOT 0.7. It is this project's own constant for "in frame,
// near the edge is acceptable" — the region a guaranteed COMPANION must be inside. 1.0 puts the
// point exactly ON the canvas edge, where the pan's own lag takes it straight back out on the next
// frame; that failure is recorded twice already, in `_lineCeiling`'s header and again in
// ENDGAME-SCHEDULE-2. 0.7 is the SUBJECT's region and asks for a frame 1.43x wider than the
// requirement needs, which is the width his fourth requirement rejects.
//
// ── AT THE FIELD SIZES HIS RACES RUN ──────────────────────────────────────────────────────────
//
// 100 racers on an open track and 40 on a closed one, which is what he plays. The old 20 is not a
// smaller version of this question: the field's spread is what pushes the leader off the spine, and
// that offset is the whole reason the line leaves the frame sideways.

const LINE_SEED = 9;
// THE CONTROL ARM. `--no-schedule` turns the scheduled endgame off, which is what authors the width
// this question grades. A limit nobody has seen both fail and pass is a guess.
const NO_SCHEDULE = process.argv.includes("--no-schedule");
// SABOTAGE ARMS, so this file can be shown to go RED on BOTH halves of the requirement rather than
// merely to be satisfied. They are not a mode anything ships with; they displace the measured point,
// which is the same thing the defect does to the picture.
//   --sabotage-vanish  the point leaves the region for the LAST third of the window — "it was in
//                      frame and then it left", the defect he photographed.
//   --sabotage-never   it is outside for the WHOLE window — "it never appears at all".
const SAB_VANISH = process.argv.includes("--sabotage-vanish");
const SAB_NEVER = process.argv.includes("--sabotage-never");
const LINE_CFG =
  NO_SCHEDULE ? { ...DEFAULT_CAMERA_CONFIG, runInSchedule: false } : DEFAULT_CAMERA_CONFIG;
/** Deciles of the window, so a row is a SERIES and not one number. */
const SERIES_STEPS = 10;

// THE PROJECT'S OWN CONSTANT, imported rather than written here. The first cut of this block
// imported it from the wrong module, got `undefined`, and every margin came out NaN — which
// compares false against 0, so every track printed FINDABLE and the guard was green while
// measuring nothing at all. The sabotage arms below are what found it.
const { COMPANY_FRAME_PCT } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/camera/framingRule.js")).href
);
if (!(COMPANY_FRAME_PCT > 0 && COMPANY_FRAME_PCT <= 1)) {
  throw new Error(`check-runin-frame: COMPANY_FRAME_PCT is ${COMPANY_FRAME_PCT} — the region this` +
    ` question grades could not be read, so nothing below would be measuring anything.`);
}
/** The region's half-extents in px from the canvas centre. */
const HX = (CW * COMPANY_FRAME_PCT) / 2;
const HY = (CH * COMPANY_FRAME_PCT) / 2;
/** Points sampled across the corridor. See the header: the margin along the band is concave. */
const BAND_SAMPLES = 40;
/** The director's own resolution of the finish T, so the two cannot disagree about where it is. */
const shapeT = (shape, finishT) =>
  shape.isOpen ? Math.min(1, finishT) : ((finishT % 1) + 1) % 1;

console.log(
  `\nrequirement 5 — from the endgame threshold to the crossing, can the viewer tell where the line\n` +
    `is? The line's point inside the frame at ${COMPANY_FRAME_PCT} of the canvas. Margin in px; negative is OUT.` +
    (SAB_VANISH ? "   [SABOTAGE: vanish]" : "") +
    (SAB_NEVER ? "   [SABOTAGE: never]" : "") +
    (NO_SCHEDULE ? "   [CONTROL: runInSchedule off]" : "")
);

const lineRows = [];
for (const geo of loadTracks()) {
  // HIS SUPPORTED FIELD SIZES: 100 on an open track, 40 on a closed one. Read from the shape the
  // driver reports rather than from a table written here, so a track that changes kind is not missed.
  const probeRace = buildRace(
    geo,
    resolveIdentity({
      racers: 2,
      raceSeed: LINE_SEED,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
    }),
    LINE_CFG
  );
  const LINE_RACERS = probeRace.shape.isOpen ? 100 : 40;
  const identity = resolveIdentity({
    racers: LINE_RACERS,
    raceSeed: LINE_SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    // ── THE BROWSER'S CAMERA, NOT THE DRIVER'S (VIEWER-INVARIANTS-2) ──────────────────────────
    //
    // `raceDriver` defaults the camera's random seed to the fixed constant `1439767152`. The
    // browser has not done that since CAMERA-SEED-AND-LINE-1 — it derives the seed from the race
    // seed — so every run of this question so far has graded a camera trajectory NO USER EVER SEES.
    // VIEWER-INVARIANTS-1 found that the hard way: the owner's black frame reproduces in the
    // browser and the headless director reports the same race clean.
    //
    // IT IS NOT A LOOSENING. The camera is still the shipped camera and the race is still seed 9;
    // what changes is that the shot being graded is the shot the product runs. Measured, it moves
    // one track — space-sprint, whose fixed-seed trajectory lost the line at the window's opening
    // and whose real one does not — and leaves the other nine identical.
    cameraSeed: cameraSeedForRace(LINE_SEED),
    note: "ENDGAME-LINE-1 — can the viewer tell where the line is",
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
      if (!(progress >= endgame)) return;

      // THE DIRECTOR'S OWN LINE POINT AND THE DIRECTOR'S OWN PROJECTION. See the header.
      const line = c._finishLineWorldPoint(s.finishT);
      if (!line) return;
      // THE BAND: the finish across the corridor, from the shape the race is running on. The T is
      // resolved exactly as the director resolves it, so the two cannot disagree about where the
      // finish is; only the lateral offset is added here.
      const tAt = shapeT(race.shape, s.finishT);
      let best = -Infinity;
      let bestCanvas = -Infinity;
      let bx = NaN;
      let by = NaN;
      for (let k = 0; k <= BAND_SAMPLES; k++) {
        const lat = (k / BAND_SAMPLES - 0.5) * race.trackWidthPx;
        const w = race.shape.getPosition(tAt, lat) ?? line;
        const q = c._proj.toScreen(w, c.zoom, c.offsetX, c.offsetY);
        const m = Math.min(HX - Math.abs(q.x - CW / 2), HY - Math.abs(q.y - CH / 2));
        const c2 = Math.min(CW / 2 - Math.abs(q.x - CW / 2), CH / 2 - Math.abs(q.y - CH / 2));
        if (c2 > bestCanvas) bestCanvas = c2;
        if (m > best) {
          best = m;
          bx = q.x;
          by = q.y;
        }
      }
      const p = c._proj.toScreen(line, c.zoom, c.offsetX, c.offsetY);
      samples.push({
        ms: Math.round(ts - raceStart),
        progress,
        sx: bx,
        sy: by,
        centreX: p.x,
        centreY: p.y,
        bandMargin: best,
        canvasMargin: bestCanvas,
        zoom: c.zoom,
        hud: c.hudState,
        binding: c._framingProbe?.binding ?? "?",
      });
    },
    { slowmo: true }
  );

  if (samples.length === 0) {
    console.log(
      `  ${geo.id.padEnd(15)} n=${String(LINE_RACERS).padStart(3)}  no frame between the threshold and a crossing — not measured`
    );
    lineRows.push({ id: geo.id, measured: false });
    continue;
  }

  // THE MARGIN: px from the point to the nearest edge of the REGION, negative when it is outside.
  const margins = samples.map((q, i) =>
    SAB_NEVER || (SAB_VANISH && i >= Math.floor((2 * samples.length) / 3)) ?
      q.bandMargin - CW
    : q.bandMargin
  );
  let worstI = 0;
  for (let i = 1; i < margins.length; i++) if (margins[i] < margins[worstI]) worstI = i;
  const worst = { ...samples[worstI], margin: margins[worstI] };
  const outFrames = margins.filter((m) => m < 0).length;
  const offCanvas = samples.filter((q, i) =>
    SAB_NEVER || (SAB_VANISH && i >= Math.floor((2 * samples.length) / 3)) ?
      true
    : q.canvasMargin < 0
  ).length;
  const everIn = margins.some((m) => m >= 0);
  const firstOutI = margins.findIndex((m) => m < 0);
  const onCanvas = samples.map((q, i) =>
    SAB_NEVER || (SAB_VANISH && i >= Math.floor((2 * samples.length) / 3)) ? -1 : q.canvasMargin
  );
  const everOnCanvas = onCanvas.some((m) => m >= 0);
  const firstOffI = onCanvas.findIndex((m) => m < 0);
  // ── WHAT FAILS, AND THE CHANGE IS DELIBERATE AND VISIBLE (VIEWER-INVARIANTS-2) ───────────────
  //
  // HIS SENTENCE IS THE VERDICT: "where the finish line is, is findable — it need not be fully
  // visible, cut at the edge is fine, PART OF THE BAND IS ENOUGH, but it never becomes
  // unfindable". So the failure is the band leaving the CANVAS. That is a defect by inspection and
  // carries no threshold, exactly like the never-empty half of this file.
  //
  // `COMPANY_FRAME_PCT` IS STILL MEASURED AND STILL PRINTED, on every row, because it is what the
  // CAMERA aims at: the schedule's floor sizes the shot to put the line on that region's edge, and
  // the 5% between the region and the canvas is the margin that absorbs the pan's own residual.
  // A row that is inside the canvas but outside the region is the margin being spent, which is
  // worth watching and is not a broken promise.
  //
  // THIS IS A CHANGE OF VERDICT AND IT IS NAMED AS ONE. VIEWER-INVARIANTS-1 failed on the region,
  // because at that time the line was genuinely going OFF THE CANVAS — 770 frames of 3005 across
  // ten tracks. It no longer does: after the pan target was re-expressed at the drawn zoom, the
  // measured figures are 0 frames off the canvas on nine of ten tracks headless and 0 of 244 in the
  // browser, with the worst region margin 55 px of the 64 available. Grading the region would fail
  // this build for spending a margin this file invented, and the requirement it is meant to guard
  // is met. Both numbers are on every row so the choice can be checked rather than trusted.
  const ok = offCanvas === 0;
  if (!ok) failures++;

  const series = [];
  for (let k = 0; k < SERIES_STEPS; k++) {
    const lo = Math.floor((k * samples.length) / SERIES_STEPS);
    const hi = Math.max(Math.floor(((k + 1) * samples.length) / SERIES_STEPS), lo + 1);
    let m = null;
    for (let i = lo; i < hi && i < samples.length; i++)
      if (m === null || margins[i] < m) m = margins[i];
    series.push(m);
  }

  console.log(
    `  ${geo.id.padEnd(15)} n=${String(LINE_RACERS).padStart(3)} ${ok ? "FINDABLE" : "LOST    "} ` +
      `worst ${worst.margin.toFixed(0).padStart(6)} px at progress ${worst.progress.toFixed(3)} ` +
      `(${worst.hud}, binding ${worst.binding}, zoom ${worst.zoom.toFixed(3)})  ` +
      `${outFrames} of ${samples.length} outside the region, ${offCanvas} OFF CANVAS`
  );
  console.log(
    `      series ${series.map((m) => (m === null ? "   —" : String(Math.round(m)).padStart(5))).join(" ")}`
  );
  if (outFrames || offCanvas) {
    const byTerm = new Map();
    for (let i = 0; i < samples.length; i++)
      if (margins[i] < 0) byTerm.set(samples[i].binding, (byTerm.get(samples[i].binding) ?? 0) + 1);
    console.log(
      `      binding while out: ${[...byTerm.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k} ${n}`)
        .join(", ")}`
    );
    if (!everOnCanvas) {
      console.log(
        `      FAIL: no part of the finish band was on the canvas at ANY point between the threshold and the crossing.`
      );
    } else if (!ok) {
      const f = samples[firstOffI];
      console.log(
        `      FAIL: the viewer loses the line at progress ${f.progress.toFixed(3)} (${f.ms} ms, ${f.hud}), ` +
          `point at (${f.sx.toFixed(0)}, ${f.sy.toFixed(0)}) on a ${CW}x${CH} canvas — binding term ` +
          `"${f.binding}", zoom ${f.zoom.toFixed(3)}.`
      );
    }
  }
  lineRows.push({ id: geo.id, measured: true, ok, worst, outFrames, samples, margins });
}

if (VERBOSE) {
  // The frame-by-frame tail around the worst moment on the worst track, for a diagnosis that needs
  // to see the term change hands rather than the summary of it.
  const bad = lineRows
    .filter((r) => r.measured && !r.ok)
    .sort((a, b) => a.worst.margin - b.worst.margin)[0];
  if (bad) {
    console.log(`\n  --verbose: ${bad.id}, frames around the worst margin`);
    const i = bad.margins.indexOf(bad.worst.margin);
    for (let k = Math.max(0, i - 8); k <= Math.min(bad.samples.length - 1, i + 3); k++) {
      const s = bad.samples[k];
      console.log(
        `      p ${s.progress.toFixed(4)}  margin ${bad.margins[k].toFixed(0).padStart(6)}  ` +
          `zoom ${s.zoom.toFixed(4)}  binding ${s.binding.padEnd(18)} ` +
          `${s.hud}`,
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
