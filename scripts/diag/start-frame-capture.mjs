// ============================================================
// File:        scripts/diag/start-frame-capture.mjs
// Project:     RaceArena — RUNIN-START-1 (report-only, changes nothing)
//
// WHERE IS THE FIELD ON SCREEN SHORTLY AFTER THE START, and which term put it there.
//
// The owner reported on 2026-08-17 that on `feat/runin-hold` the whole field sits against the RIGHT
// edge of the canvas a few seconds into a dirt-oval Quick Test, with the leader off screen. The
// start was never in scope for any of the run-in work, so the first question is not "why" but
// "WHEN" — which is why this prints the same frames at whatever director is in the tree, so the
// three commits can be compared by swapping one file and running it again.
//
// IT RECONSTRUCTS NOTHING. Screen positions come from `cd._proj.toScreen` with the zoom and offsets
// the director DELIVERED, and the term that decided the width is read off `cd._framingProbe`. The
// only arithmetic here is "is that inside the canvas rectangle".
//
// Usage:
//   node scripts/diag/start-frame-capture.mjs
//   node scripts/diag/start-frame-capture.mjs --track=luger-hill --seed=9 --at=500,1000,2000
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

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const TRACK = argOf("track") ?? "dirt-oval";
const SEED = Number(argOf("seed") ?? 9);
// Quick Test fills the field to 20 on the setup screen, which is the race he was looking at.
const RACERS = Number(argOf("racers") ?? 20);
const AT = (argOf("at") ?? "500,1000,1500,2000,3000,5000,8000").split(",").map(Number);
const VERBOSE = process.argv.includes("--verbose");
const fmt = (v) => (v === undefined ? "?" : Number.isFinite(v) ? v.toFixed(3) : "inf");
const CW = 1280;
const CH = 720;

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`start-frame-capture: track ${TRACK} not found.`);
  process.exit(2);
}

const identity = resolveIdentity({
  racers: RACERS,
  raceSeed: SEED,
  racerType: TRACK_DEFAULT_RACER,
  roster: resolveNameSet(DEFAULT_NAME_SET),
  note: "RUNIN-START-1 start-frame capture",
});
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

console.log(
  `${TRACK}, seed ${SEED}, ${RACERS} racers — the field on screen shortly after the start\n` +
    `canvas ${CW}x${CH}; "onscreen" counts racers whose centre is inside it\n`,
);
console.log(
  `${"at ms".padStart(6)}  ${"hud".padEnd(13)} ${"zoom".padStart(7)} ${"offX".padStart(8)} ` +
    `${"field x".padStart(15)}  ${"leader x".padStart(9)} ${"on".padStart(5)}  ${"binding".padEnd(20)} ${"ceilings.line"}`,
);

let nextIdx = 0;
runRace(
  race,
  identity,
  DEFAULT_CAMERA_CONFIG,
  ({ cd, st, ts, raceStart }) => {
    if (nextIdx >= AT.length) return false; // done — stop the run early
    const ms = ts - raceStart;
    if (ms < AT[nextIdx]) return;
    nextIdx++;

    let onScreen = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let leader = null;
    let leaderT = -1;
    for (const r of st.racers) {
      const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
      if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) onScreen++;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (r.t > leaderT) {
        leaderT = r.t;
        leader = p;
      }
    }
    const pr = cd._framingProbe ?? {};
    const lineC = pr.ceilings?.line;
    if (VERBOSE) {
      // THE ANCHOR, in the director's own three recorded stages (CAMERA-ANCHOR-TRUTH-1 §4a):
      // where the pan was aimed, what the forward bias did to it, and what the lateral guarantee
      // did after that. Printed as WORLD points, beside the delivered camera, so "which term
      // placed the anchor" is read rather than inferred.
      const scr = (pt) =>
        pt ? cd._proj.toScreen(pt, cd.zoom, cd.offsetX, cd.offsetY) : null;
      const a = scr(pr.anchorPoint);
      const b = scr(pr.afterBias);
      const c = scr(pr.afterLateral);
      console.log(
        `        anchor screen x: aimed ${a ? a.x.toFixed(0) : "—"} -> afterBias ` +
          `${b ? b.x.toFixed(0) : "—"} -> afterLateral ${c ? c.x.toFixed(0) : "—"}   ` +
          `ceilings state ${pr.ceilings?.state?.toFixed(3)} guarantee ${fmt(pr.ceilings?.guarantee)} ` +
          `company ${fmt(pr.ceilings?.company)} field ${fmt(pr.ceilings?.field)} ` +
          `-> guaranteed ${pr.guaranteed?.toFixed(3)}`,
      );
    }
    console.log(
      `${String(Math.round(ms)).padStart(6)}  ${String(cd.hudState).padEnd(13)} ` +
        `${cd.zoom.toFixed(4).padStart(7)} ${cd.offsetX.toFixed(0).padStart(8)} ` +
        `${`${minX.toFixed(0)}..${maxX.toFixed(0)}`.padStart(15)}  ` +
        `${leader.x.toFixed(0).padStart(9)} ${String(onScreen).padStart(2)}/${st.racers.length}  ` +
        `${String(pr.binding ?? "?").padEnd(20)} ` +
        `${lineC === undefined ? "?" : Number.isFinite(lineC) ? `FINITE ${lineC.toFixed(4)}` : "Infinity"}`,
    );
  },
  { slowmo: true },
);
