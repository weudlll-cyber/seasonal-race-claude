// ============================================================
// File:        scripts/diag/line-ceiling-terms.mjs
// Project:     RaceArena — RUNIN-CEILING-1 (report-only, changes nothing)
//
// TERM BY TERM: what does `_lineCeiling` actually compute, and which axis decides?
//
// RUNIN-BACK-1 left an arithmetic puzzle. On ice-track at the owner's frame the line is 874 world px
// ahead, the leader sits at the mirror with two thirds of the frame ahead of him, and the delivered
// frame is 2668 px wide — about double what showing an 874 px gap appears to need.
//
// IT CALLS THE PRODUCT'S OWN FUNCTIONS with the director's own inputs — `anchorScreenPoint` and
// `roomFromPointAlong` imported from framingRule/frameGeometry, the anchor and line from the live
// director, the scales from its projection. Nothing here re-implements the rule; it prints the
// intermediates `pointGuarantee` computes and never exposes.
//
// Usage:
//   node scripts/diag/line-ceiling-terms.mjs                    # ice-track at the owner's frame
//   node scripts/diag/line-ceiling-terms.mjs --track=luger-hill
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
const { anchorScreenPoint, DEFAULT_INNER_FRAME_PCT } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { roomFromPointAlong, frameExtentAlong } = await import(
  u("client/src/modules/camera/frameGeometry.js")
);

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const TRACK = argOf("track") ?? "ice-track";
const SEED = Number(argOf("seed") ?? 9);
const CW = 1280;
const CH = 720;

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`line-ceiling-terms: track ${TRACK} not found.`);
  process.exit(2);
}
const identity = resolveIdentity({
  racers: 20,
  raceSeed: SEED,
  racerType: TRACK_DEFAULT_RACER,
  roster: resolveNameSet(DEFAULT_NAME_SET),
  note: "RUNIN-CEILING-1 term-by-term",
});
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

let shot = null;
runRace(
  race,
  identity,
  DEFAULT_CAMERA_CONFIG,
  ({ cd, st, ts, raceStart }) => {
    if (shot) return false;
    if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
    if (!cd._runInComposingNow || cd._lerpPhase === "glide") return;
    const line = cd._finishLineWorldPoint(st.finishT);
    const pr = cd._framingProbe;
    if (!line || !pr?.point) return;
    const p = cd._proj.toScreen(line, cd.zoom, cd.offsetX, cd.offsetY);
    if (!(p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH)) return;
    shot = { cd, st, ms: Math.round(ts - raceStart), line, anchor: pr.point, p };
  },
  { slowmo: true },
);

if (!shot) {
  console.log(`${TRACK}: no settled frame with the line in shot.`);
  process.exit(0);
}

const { cd, st, ms, line, anchor } = shot;
const proj = cd._proj;
const pct = cd._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
const at = anchorScreenPoint(CW, CH, cd._forwardFracNow(), cd._headingScreen(cd._framingProbe.t));

// The two components of the anchor->line vector, IN SCREEN PX AT cam.zoom = 1. This is exactly what
// `pointGuarantee` calls `sx`/`sy`.
const sx = (line.x - anchor.x) * proj.axisX;
const sy = (line.y - anchor.y) * proj.axisY;
const needed = Math.hypot(sx, sy);
const room = roomFromPointAlong(at.x, at.y, sx, sy, CW, CH, pct);
const ceiling = room / needed;

// WHICH SIDE OF THE RECTANGLE THE RAY LEAVES BY — the whole question. `roomFromPointAlong` takes the
// min of the two, and whichever is smaller is the axis that decided.
const ux = sx / needed;
const uy = sy / needed;
const marginX = (CW * (1 - pct)) / 2;
const marginY = (CH * (1 - pct)) / 2;
const toX = ux > 0 ? (CW - marginX - at.x) / ux : ux < 0 ? (marginX - at.x) / ux : Infinity;
const toY = uy > 0 ? (CH - marginY - at.y) / uy : uy < 0 ? (marginY - at.y) / uy : Infinity;

console.log(`${TRACK}, seed ${SEED} — _lineCeiling term by term, at ${ms} ms (${cd.hudState})\n`);
console.log(`INPUTS`);
console.log(`  anchor (world)        (${anchor.x.toFixed(1)}, ${anchor.y.toFixed(1)})`);
console.log(`  line   (world)        (${line.x.toFixed(1)}, ${line.y.toFixed(1)})`);
console.log(
  `  world gap             dx ${(line.x - anchor.x).toFixed(1)}  dy ${(line.y - anchor.y).toFixed(1)}` +
    `   straight ${Math.hypot(line.x - anchor.x, line.y - anchor.y).toFixed(1)} world px`,
);
console.log(`  projection scales     axisX ${proj.axisX.toFixed(5)}   axisY ${proj.axisY.toFixed(5)}`);
console.log(`  world                 ${Math.round(proj.worldW)} x ${Math.round(proj.worldH)}`);
console.log(`  frame                 ${CW} x ${CH}   innerFramePct ${pct}`);
console.log(`  forward frac          ${cd._forwardFracNow()?.toFixed(4)}`);
console.log(`  anchor on screen      (${at.x.toFixed(1)}, ${at.y.toFixed(1)})`);
console.log(`\nINTERMEDIATES (screen px at cam.zoom = 1)`);
console.log(`  sx = dx * axisX       ${sx.toFixed(2)}`);
console.log(`  sy = dy * axisY       ${sy.toFixed(2)}`);
console.log(`  needed = hypot(sx,sy) ${needed.toFixed(2)}`);
console.log(`  unit direction        (${ux.toFixed(4)}, ${uy.toFixed(4)})`);
console.log(`  room to the X sides   ${toX === Infinity ? "never" : toX.toFixed(2)}`);
console.log(`  room to the Y sides   ${toY === Infinity ? "never" : toY.toFixed(2)}`);
console.log(
  `  room = min of those   ${room.toFixed(2)}   <-- DECIDED BY THE ${toY < toX ? "VERTICAL (Y)" : "HORIZONTAL (X)"} SIDES`,
);
console.log(`  ceiling = room/needed ${ceiling.toFixed(5)}  cam.zoom   <-- what the LINE needs NOW`);
// THE HOLD. RUNIN-HOLD-1 captures the ceiling on the ENGAGEMENT frame and holds it while the hold
// lasts, so what `_setTargets` receives is not the live value above but the value from the frame the
// window opened — when the line was at its furthest.
console.log(
console.log(`\nWHAT THAT MEANS FOR THE PICTURE`);
console.log(
  `  visible world at that zoom   ${Math.round(proj.visibleWorldW(ceiling, CW))} x ` +
    `${Math.round(proj.visibleWorldH(ceiling, CH))} world px`,
);
console.log(`  delivered zoom / width       ${cd.zoom.toFixed(5)} / ${Math.round(proj.visibleWorldW(cd.zoom, CW))} world px`);
// THE COUNTERFACTUAL: what would the ceiling be if the ray left by the OTHER pair of sides?
const other = toY < toX ? toX : toY;
if (Number.isFinite(other)) {
  console.log(
    `\n  IF THE OTHER AXIS DECIDED: room ${other.toFixed(2)} -> ceiling ${(other / needed).toFixed(5)} ` +
      `-> ${Math.round(proj.visibleWorldW(other / needed, CW))} world px wide ` +
      `(a factor of ${(other / room).toFixed(2)} tighter)`,
  );
}
let maxT = 0;
let minT = Infinity;
for (const r of st.racers) {
  if (r.t > maxT) maxT = r.t;
  if (r.t < minT) minT = r.t;
}
console.log(
  `\n  field spans ${Math.round((maxT - minT) * (race.shape.getTotalLength?.() ?? 0))} world px along the track`,
);
