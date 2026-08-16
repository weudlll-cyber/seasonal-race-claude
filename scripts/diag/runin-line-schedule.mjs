// ============================================================
// File:        scripts/diag/runin-line-schedule.mjs
// Project:     RaceArena — RUNIN-SCHEDULE-1 (report-only, changes nothing)
//
// WHERE THE EVEN SCHEDULE WANTS TO PUT THE FINISH LINE.
//
// `_lineCeiling` is `room / needed` — the tightest zoom that still fits the line, reached by putting
// the line exactly ON the edge of the subject's region. Put it at a SHARE `s` of that room instead
// and the zoom is `s * room / needed`, so
//
//     SHARE  =  scheduled zoom / `_lineCeiling`
//
// The share and the zoom are the same number said two ways. THAT MAKES THIS THE DECIDING NUMBER OF
// THE BLOCK: a share at or below 1 is a placement the run-in is entitled to make and the promise
// holds; a share above 1 is the schedule asking for the line OUTSIDE the region it exists to keep it
// inside. It is read from the director's own `_runInLineShare`, computed nowhere else.
//
// Usage:
//   node scripts/diag/runin-line-schedule.mjs
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

const SEED = 9;

console.log(
  `THE LINE'S PLACE IN FRAME, ten tracks, seed ${SEED}.\n` +
    `share 1.00 = the line ON the edge of the subject's region; 0 = the line on the leader.\n` +
    `A share ABOVE 1 is the schedule asking for the line OUT of frame — the block's fail condition.\n`,
);
console.log(
  `${"track".padEnd(15)} ${"frames".padStart(6)} ${"share@20".padStart(9)} ${"@50".padStart(6)} ` +
    `${"@80".padStart(6)} ${"MAX".padStart(6)} ${"over 1".padStart(9)} ${"mono".padStart(5)}`,
);

let anyOver = 0;
for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "RUNIN-SCHEDULE-1 line share",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

  const shares = [];
  let mono = true;
  let prev = null;
  let raised = 0;
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st }) => {
      if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
      if (!cd._runInComposingNow || cd._lerpPhase === "glide") return;
      const s = cd._runInLineShare;
      if (!Number.isFinite(s)) return;
      // The line travels INWARD from the edge, so a share that rises is the line moving back out.
      if (prev !== null && s > prev + 1e-6) mono = false;
      prev = s;
      shares.push(s);
      raised = cd._runInSpeedRaised;
    },
    { slowmo: true },
  );

  if (shares.length === 0) {
    console.log(`${geo.id.padEnd(15)} not measured — no close observed before a crossing`);
    continue;
  }
  const q = (f) => shares[Math.max(0, Math.min(shares.length - 1, Math.round(f * (shares.length - 1))))];
  const max = Math.max(...shares);
  const over = shares.filter((x) => x > 1).length;
  if (over > 0) anyOver++;
  console.log(
    `${geo.id.padEnd(15)} ${String(shares.length).padStart(6)} ${q(0.2).toFixed(2).padStart(9)} ` +
      `${q(0.5).toFixed(2).padStart(6)} ${q(0.8).toFixed(2).padStart(6)} ${max.toFixed(2).padStart(6)} ` +
      `${((100 * over) / shares.length).toFixed(1).padStart(8)}% ${(mono ? "yes" : "NO").padStart(5)}` +
      `  accel fired ${raised}`,
  );
}
console.log(
  `\n${anyOver} track(s) need the line outside the frame at some point in the close. ` +
    `The block's fail condition is ANY.`,
);
