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
// So this also counts, every frame of phase 6, how many unfinished racers are on the canvas.
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
    minUnfinishedOnScreen: minUnfinishedOnScreen === Infinity ? null : minUnfinishedOnScreen,
    unfinishedFrames,
    unfinishedOffFrames,
  };
}

console.log(
  `straggler-truth — phase 6 of the ending, seed ${SEED}\n` +
    `  phase6: winner home -> field home. lead: how long BEFORE the last crossing the zoom-out\n` +
    `  began (positive = the ending overlapped the race). running/off: unfinished racers, and how\n` +
    `  many of them were off canvas, on the frame the zoom-out started. offFrames: frames of phase 6\n` +
    `  with at least one unfinished racer outside the picture.\n`,
);
console.log(
  `${"track".padEnd(12)} ${"n".padStart(3)} ${"kind".padEnd(7)} ${"phase6".padStart(8)} ` +
    `${"lead".padStart(8)} ${"running".padStart(8)} ${"off".padStart(4)} ${"minOn".padStart(6)} ` +
    `${"offFrames".padStart(12)}`,
);

const out = [];
for (const run of RUNS) {
  const r = measure(run);
  out.push(r);
  const pct = r.unfinishedFrames ? (100 * r.unfinishedOffFrames) / r.unfinishedFrames : 0;
  console.log(
    `${r.track.padEnd(12)} ${String(r.racers).padStart(3)} ${(r.open ? "open" : "closed").padEnd(7)} ` +
      `${`${(r.phase6Ms / 1000).toFixed(2)}s`.padStart(8)} ` +
      `${`${(r.zoomOutLeadMs / 1000).toFixed(2)}s`.padStart(8)} ` +
      `${String(r.stillRunningAtZoomOut ?? "-").padStart(8)} ` +
      `${String(r.offScreenAtZoomOut ?? "-").padStart(4)} ` +
      `${String(r.minUnfinishedOnScreen ?? "-").padStart(6)} ` +
      `${`${r.unfinishedOffFrames}/${r.unfinishedFrames} (${pct.toFixed(0)}%)`.padStart(12)}`,
  );
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
  console.log(`\nwrote ${JSON_OUT}`);
}
