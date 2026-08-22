// ============================================================
// File:        scripts/diag/runin-forward-reach.mjs
// Project:     RaceArena — RUNIN-AHEAD-1 (report-only, changes nothing)
//
// HOW FAR PAST THE FINISH LINE DOES THE FRAME REACH, and how many racers are in shot.
//
// The owner accepted the run-in's shape on 2026-08-17 and rejected what the frame shows: while the
// shot closes it reaches well PAST the line onto empty track and then comes back. There is nothing
// to see beyond the line, and that room should go to the racers BEHIND the leader instead. This is
// the before/after instrument for that change, and it reports BOTH halves — the reach and the
// count — because a change that removes the overshoot without putting more of the field in shot did
// not do what it was asked to do.
//
// ── IT RECONSTRUCTS NOTHING ────────────────────────────────────────────────────────────────────
//
//   the line's world point   `cd._finishLineWorldPoint(st.finishT)` — the same call `_lineCeiling`
//                            and `check-runin-frame`'s question 3 make.
//   world -> screen          `cd._proj.toScreen(...)` with the zoom and offsets DELIVERED.
//   the heading              `cd._headingScreen(t)` — the director's own screen-space heading.
//   room to the frame edge   `roomFromPointAlong` — the product's own helper, the one the lateral
//                            guarantee measures its room with. Not a rectangle intersection
//                            written again here.
//
// "REACH BEYOND THE LINE" is therefore: stand on the line's screen position, look along the
// leader's heading, and ask the product how far it is to the edge of the frame. Positive means the
// frame carries that many screen pixels of track the race has already finished with.
//
// Usage:
//   node scripts/diag/runin-forward-reach.mjs                    # ten tracks at the shipped default
//   node scripts/diag/runin-forward-reach.mjs --threshold=0.95   # the value the owner is judging at
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { inFrame } from "../lib/frameBox.mjs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { roomFromPointAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const THRESHOLD = argOf("threshold") ? Number(argOf("threshold")) : null;
const SEED = Number(argOf("seed") ?? 9);
const RACERS = Number(argOf("racers") ?? 20);
const CW = 1280;
const CH = 720;

const CFG = THRESHOLD
  ? { ...DEFAULT_CAMERA_CONFIG, endgameThreshold: THRESHOLD }
  : DEFAULT_CAMERA_CONFIG;

/** The phase opening plus three points through the close — the four the brief asks for. */
const POINTS = ["open", "25%", "50%", "75%"];

console.log(
  `the frame's reach PAST the finish line, and the field in shot — seed ${SEED}, ${RACERS} racers,\n` +
    `endgameThreshold ${CFG.endgameThreshold}. "beyond" is screen px of track past the line that the\n` +
    `frame still carries; "in shot" counts racers whose centre is on the canvas.\n`,
);
console.log(
  `${"track".padEnd(15)} ${POINTS.map((p) => `${p.padStart(5)}: beyond in state `).join(" ")}` +
    `
(* = the forward cap was live on that frame)`,
);

for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "RUNIN-AHEAD-1 forward reach",
  });
  const race = buildRace(geo, identity, CFG);

  // Collected first, sampled after: the four points are fractions of the composing window, and the
  // window's length is not known until it has ended.
  const frames = [];
  runRace(
    race,
    identity,
    CFG,
    ({ cd, st }) => {
      if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
      if (!cd._runInComposingNow) return;
      const line = cd._finishLineWorldPoint(st.finishT);
      const heading = cd._headingScreen(cd._framingProbe?.t ?? 0);
      if (!line || !heading) return;
      const L = cd._proj.toScreen(line, cd.zoom, cd.offsetX, cd.offsetY);
      // Standing ON the line, looking the way the race is going: how much frame is left?
      const beyond = roomFromPointAlong(L.x, L.y, heading.x, heading.y, CW, CH);
      let inShot = 0;
      for (const r of st.racers) {
        const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
        if (inFrame(p, CW, CH)) inShot++;
      }
      // WHY, not just how much: the state running (the cap only applies where the framing has a
      // FORWARD look at all) and whether the cap actually bound this frame.
      frames.push({
        beyond,
        inShot,
        hud: cd.hudState,
        capBit: cd._runInForwardCap !== null && cd._runInForwardCap > 0,
      });
    },
    { slowmo: true },
  );

  if (frames.length === 0) {
    console.log(`${geo.id.padEnd(15)} not measured — no composing frame before a crossing`);
    continue;
  }
  const at = (f) => frames[Math.min(frames.length - 1, Math.round(f * (frames.length - 1)))];
  const cells = [0, 0.25, 0.5, 0.75].map((f) => {
    const s = at(f);
    return `${String(Math.round(s.beyond)).padStart(7)} ${String(s.inShot).padStart(2)} ${(s.hud ?? "?").slice(0, 6).padEnd(6)}${s.capBit ? "*" : " "}`;
  });
  console.log(`${geo.id.padEnd(15)} ${cells.join("   ")}`);
}
