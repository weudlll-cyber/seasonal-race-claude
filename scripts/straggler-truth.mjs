// ============================================================
// File:        scripts/straggler-truth.mjs
// Project:     RaceArena — STRAGGLER-TRUTH-1
//
// WHAT THIS MEASURES: phase 6 of the ending — the wait for the stragglers — which is the one phase
// `docs/ENDING-PHASES.md` describes with numbers that nothing in the repository backs. That audit
// (2026-08-14) flagged two claims rather than correcting them, said the instrument to settle them
// did not exist, and estimated it at about thirty lines. This is it.
//
// THE TWO CLAIMS, and they are different kinds of question:
//   "~2.9 s at 20 racers"      — how long phase 6 LASTS: the interval between the winner's crossing
//                                and the last racer's. A duration, and the field size is obviously
//                                part of it, which is why this runs at 20 AND 40.
//   "the zoom-out starts ~1.4 s
//    before it ends"           — the one that matters, because it is the claim that the ending does
//                                not begin before the race is over. A separate measurement recorded
//                                4.4–5.9 s, which contradicts it outright.
//
// AND THE PHASE'S OWN QUESTION, which neither number asks: what does the ending DO about the racers
// still on the course? A duration says nothing about whether they are in the picture while they run.
//
// ── STRAGGLER-TRUTH-2 CORRECTED HOW THAT LAST QUESTION IS ANSWERED, AND IT IS THE WHOLE POINT ────
//
// The first version counted from the WINNER'S CROSSING and reported a headline sampled on the FIRST
// FRAME of FINISH_OVERVIEW. Both are inside the shot that is still CLOSING — the photo-finish /
// drama shot, which frames the winner by design — so it reported "27 of 29 unfinished racers off the
// canvas" about the tightest instant of the move and read as though it described the ending. The
// owner tested the ending on 2026-08-22 and it is correct; the counting was right and the WINDOW
// was wrong.
//
// So the window is now the SETTLED shot: from `zoom-out began + finishOverviewZoomOutDurationMs`,
// which is the config's own answer for when the move is over, to the last crossing. And it counts
// EVERY racer in shot, not only the unfinished ones — the screen shows finished racers running out
// past the line, they are most of the picture, and a count that omits them cannot agree with what a
// viewer sees.
//
// IT MEASURES AND CHANGES NOTHING. No camera value is written; every number is read off the
// director and the race state the driver already produces. If the numbers say the ending is wrong,
// that is a finding for the owner and not a repair.
//
// THE SIGNALS, and why these:
//   the crossings   `st.finishedCount` rising. The race's own count, not a reconstruction from `t`.
//   the zoom-out    `cd._inFinishMode` turning true. That latch IS FINISH_OVERVIEW beginning — the
//                   same one the director's four framing sites read — so this cannot drift from the
//                   thing it is timing.
//
// Usage:
//   node scripts/straggler-truth.mjs                                  # the four default runs
//   node scripts/straggler-truth.mjs --track=dirt-oval --racers=40
//   node scripts/straggler-truth.mjs --seed=9 --json=out.json
// ============================================================

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const SEED = Number(argOf("seed") ?? 9);
const JSON_OUT = argOf("json") ?? null;
// ENDING-VISIBILITY-BISECT-1: the SAME measure, printed per frame instead of summarised. The
// summary path below is untouched — this only exposes what it was already counting, plus the
// camera centre's distance along the track from the finish line, which the summary never asked for.
const FRAMES = process.argv.includes("--frames");
const EVERY_MS = Number(argOf("every") ?? 250);
const CW = 1280;
const CH = 720;

// One CLOSED track and one OPEN one, at both field sizes. The pair is the one this week's camera
// work used throughout, so a reader can hold these numbers beside those.
const RUNS = argOf("track")
  ? [{ track: argOf("track"), racers: Number(argOf("racers") ?? 20) }]
  : [
      { track: "dirt-oval", racers: 20 },
      { track: "dirt-oval", racers: 40 },
      { track: "river-run", racers: 20 },
      { track: "river-run", racers: 40 },
    ];

/** The median of a list, or null when the list is empty. */
function med(a) {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
}

function measure({ track, racers }) {
  const geo = loadTracks({ only: track })[0];
  if (!geo) throw new Error(`straggler-truth: no such track: ${track}`);
  const identity = resolveIdentity({
    racers,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "STRAGGLER-TRUTH-1 phase 6",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

  let firstCrossMs = null;
  let lastCrossMs = null;
  let zoomOutMs = null;
  let prevFinished = 0;
  let prevFinishMode = false;
  // Phase 6 is "after the winner, before the last man" — so these are only collected there.
  let stillRunningAtZoomOut = null;
  let offScreenAtZoomOut = null;
  let minUnfinishedOnScreen = Infinity;
  let unfinishedFrames = 0;
  let unfinishedOffFrames = 0;
  // THE SETTLED SHOT — the window this instrument now reports on. `finishOverviewZoomOutDurationMs`
  // is the config's own statement of how long the pull-back takes, so the boundary is read and not
  // chosen.
  let settledFrom = null;
  let settledFrames = 0;
  // A MEDIAN, NOT A MINIMUM, and the reason is the same mistake one level down: the last frames of
  // the phase are degenerate — one racer left on the course and the finishers already run out past
  // the frame — so a minimum always finds the tail and describes nothing a viewer watches.
  const settledUnfinIn = [];
  const settledUnfinTotal = [];
  const settledAllIn = [];
  const frames = [];
  let nextFrameAt = 0;
  // The finish line as a WORLD POINT, so "where is the camera relative to the line" is a distance
  // and not an impression. `finishT` is a track parameter; the shape turns it into a place.
  const lineAt = (t) => race.shape.getPosition(((t % 1) + 1) % 1, 0);

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, ts, raceStart }) => {
      const ms = ts - raceStart;
      if (st.finishedCount > prevFinished) {
        if (firstCrossMs === null) firstCrossMs = ms;
        lastCrossMs = ms;
        prevFinished = st.finishedCount;
      }
      if (!prevFinishMode && cd._inFinishMode) {
        prevFinishMode = true;
        zoomOutMs = ms;
      }
      // Inside phase 6 only: the winner is home and somebody is still out there.
      if (firstCrossMs === null || st.finishedCount >= st.racers.length) return;
      const unfinished = st.racers.filter((r) => !r.finishRank);
      if (unfinished.length === 0) return;
      let on = 0;
      for (const r of unfinished) {
        const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
        if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) on++;
      }
      unfinishedFrames++;
      if (on < unfinished.length) unfinishedOffFrames++;
      if (on < minUnfinishedOnScreen) minUnfinishedOnScreen = on;
      if (zoomOutMs === ms && stillRunningAtZoomOut === null) {
        stillRunningAtZoomOut = unfinished.length;
        offScreenAtZoomOut = unfinished.length - on;
      }
      // ── THE SETTLED SHOT: what the viewer calls "the ending" ──────────────────────────────
      if (zoomOutMs !== null && settledFrom === null) {
        settledFrom = zoomOutMs + (DEFAULT_CAMERA_CONFIG.finishOverviewZoomOutDurationMs ?? 0);
      }
      if (settledFrom !== null && ms >= settledFrom) {
        let allOn = 0;
        for (const r of st.racers) {
          const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
          if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) allOn++;
        }
        settledFrames++;
        settledUnfinIn.push(on);
        settledUnfinTotal.push(unfinished.length);
        settledAllIn.push(allOn);
      }
      if (FRAMES && ms >= nextFrameAt) {
        nextFrameAt = ms + EVERY_MS;
        const ex = cd._proj.effX(cd.zoom);
        const ey = cd._proj.effY(cd.zoom);
        const cam = { x: (CW / 2 - cd.offsetX) / ex, y: (CH / 2 - cd.offsetY) / ey };
        const line = lineAt(st.finishT);
        // The rearmost unfinished racer, because "does the camera reach the people still running"
        // is a question about the BACK of the field, not about the average.
        const rear = unfinished.reduce((b, r) => (r.t < b.t ? r : b), unfinished[0]);
        frames.push({
          ms: Math.round(ms),
          zoomedOut: zoomOutMs !== null && ms >= zoomOutMs,
          unfinished: unfinished.length,
          on,
          camFromLine: Math.hypot(cam.x - line.x, cam.y - line.y),
          rearFromLine: Math.hypot(rear.x - line.x, rear.y - line.y),
          zoom: cd.zoom,
        });
      }
    },
    { slowmo: true },
  );

  return {
    track,
    racers,
    open: race.shape.isOpen,
    firstCrossMs,
    lastCrossMs,
    // PHASE 6's OWN LENGTH: winner home -> field home.
    phase6Ms: lastCrossMs !== null && firstCrossMs !== null ? lastCrossMs - firstCrossMs : null,
    zoomOutMs,
    // POSITIVE means the zoom-out began BEFORE the last man was home, i.e. the ending overlapped
    // the race. This is the number the audit called the one that matters.
    zoomOutLeadMs: zoomOutMs !== null && lastCrossMs !== null ? lastCrossMs - zoomOutMs : null,
    stillRunningAtZoomOut,
    offScreenAtZoomOut,
    settledFrom,
    settledFrames,
    settledUnfinInMed: med(settledUnfinIn),
    settledUnfinTotMed: med(settledUnfinTotal),
    settledAllInMed: med(settledAllIn),
    frames,
    minUnfinishedOnScreen: minUnfinishedOnScreen === Infinity ? null : minUnfinishedOnScreen,
    unfinishedFrames,
    unfinishedOffFrames,
  };
}

console.log(
  `straggler-truth — phase 6 of the ending, seed ${SEED}\n` +
    `  phase6: winner home -> field home. lead: how long BEFORE the last crossing the zoom-out\n` +
    `  began (positive = the ending overlapped the race).\n` +
    `  THE SETTLED SHOT is the window that describes the ending — from the pull-back's own\n` +
    `  duration being up, to the last crossing. Before it the shot is still CLOSING and framing the\n` +
    `  winner, which is what STRAGGLER-TRUTH-1 sampled and mis-read.\n` +
    `  unfinMin: the fewest unfinished racers in shot on any settled frame, of how many were left.\n` +
    `  allMin: the fewest racers of ANY kind in shot — finished racers run out past the line and are\n` +
    `  most of the picture, so a count that omits them cannot agree with the screen.\n`,
);
console.log(
  `${"track".padEnd(12)} ${"n".padStart(3)} ${"kind".padEnd(7)} ${"phase6".padStart(8)} ` +
    `${"lead".padStart(8)} ${"unfin".padStart(9)} ${"inShot".padStart(8)} ${"settled".padStart(8)}`,
);

const out = [];
for (const run of RUNS) {
  const r = measure(run);
  out.push(r);
  console.log(
    `${r.track.padEnd(12)} ${String(r.racers).padStart(3)} ${(r.open ? "open" : "closed").padEnd(7)} ` +
      `${`${(r.phase6Ms / 1000).toFixed(2)}s`.padStart(8)} ` +
      `${`${(r.zoomOutLeadMs / 1000).toFixed(2)}s`.padStart(8)} ` +
      `${`${r.settledUnfinInMed ?? "-"}/${r.settledUnfinTotMed ?? "-"}`.padStart(9)} ` +
      `${`${r.settledAllInMed ?? "-"}/${r.racers}`.padStart(8)} ` +
      `${`${r.settledFrames}f`.padStart(8)}`,
  );
  if (FRAMES) {
    console.log(
      `      ${"ms".padStart(6)} ${"phase".padEnd(9)} ${"unfin".padStart(6)} ${"on".padStart(4)} ` +
        `${"camFromLine".padStart(12)} ${"rearFromLine".padStart(13)} ${"zoom".padStart(7)}`,
    );
    for (const f of r.frames) {
      console.log(
        `      ${String(f.ms).padStart(6)} ${(f.zoomedOut ? "zoom-out" : "pre").padEnd(9)} ` +
          `${String(f.unfinished).padStart(6)} ${String(f.on).padStart(4)} ` +
          `${f.camFromLine.toFixed(0).padStart(12)} ${f.rearFromLine.toFixed(0).padStart(13)} ` +
          `${f.zoom.toFixed(4).padStart(7)}`,
      );
    }
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(out.map(({ frames, ...r }) => r), null, 1));
  console.log(`\nwrote ${JSON_OUT}`);
}
