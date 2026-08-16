// ============================================================
// File:        scripts/diag/width-authority.mjs
// Project:     RaceArena — WHY-SO-WIDE-1 (report-only, changes nothing)
//
// WHICH TERM ACTUALLY SETS THE WIDTH, frame by frame, through the run-in.
//
// RUNIN-ANCHOR-2 concluded that on ice-track the run-in opens onto a world-sized frame and
// `resolveCamera`'s world-bounds clamp then decides the picture. THE OWNER'S SCREENSHOT
// CONTRADICTS THAT: just after the shot opens, a substantial part of the course is OUTSIDE the
// frame — which is not what a world-sized frame looks like. So the recorded explanation is in
// doubt, and every conclusion drawn from it with it.
//
// This prints every term side by side so the question is answered by reading rather than by
// inference. It RECONSTRUCTS NOTHING:
//
//   the five ceilings      `cd._framingProbe.ceilings` — state / guarantee / company / field / line
//   the corridor cap       `cd._framingProbe.corridorCap` (a zoom FLOOR, i.e. a width CEILING)
//   the winner             `cd._framingProbe.binding` — the director's own answer
//   the world-bounds clamp `cd._resolveProbe` — `requested` vs `resolved`, plus the two flags
//                          `resolveCamera` sets when it adapts or clamps the zoom
//   width                  `cd._proj.visibleWorldW(camZoom)` — the projection's own conversion
//
// EVERY TERM IS REPORTED AS THE WIDTH IT ASKS FOR, in world px, because that is the quantity the
// question is about. A ceiling on zoom is a FLOOR on width, so the widest demand wins the Math.min.
//
// Usage:
//   node scripts/diag/width-authority.mjs                       # ice-track, the owner's frame
//   node scripts/diag/width-authority.mjs --track=seatrack
//   node scripts/diag/width-authority.mjs --track=ice-track --dump   # every frame
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
const TRACK = argOf("track") ?? "ice-track";
const SEED = Number(argOf("seed") ?? 9);
const RACERS = Number(argOf("racers") ?? 20);
const DUMP = process.argv.includes("--dump");
const CW = 1280;
const CH = 720;

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`width-authority: track ${TRACK} not found.`);
  process.exit(2);
}
const identity = resolveIdentity({
  racers: RACERS,
  raceSeed: SEED,
  racerType: TRACK_DEFAULT_RACER,
  roster: resolveNameSet(DEFAULT_NAME_SET),
  note: "WHY-SO-WIDE-1 width authority",
});
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
const { shape } = race;

const frames = [];
runRace(
  race,
  identity,
  DEFAULT_CAMERA_CONFIG,
  ({ cd, st, ts, raceStart }) => {
    if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
    if (!cd._runInComposingNow) return;
    const pr = cd._framingProbe;
    const rp = cd._resolveProbe;
    if (!pr || !rp) return;
    const proj = cd._proj;
    // A ceiling on zoom is a floor on WIDTH. Infinity zoom -> zero width demand -> "asks nothing".
    const widthOf = (camZoom) =>
      Number.isFinite(camZoom) && camZoom > 0 ? proj.visibleWorldW(camZoom, CW) : null;

    const line = cd._finishLineWorldPoint(st.finishT);
    let leader = null;
    let leaderT = -1;
    let lastT = Infinity;
    let last = null;
    for (const r of st.racers) {
      if (r.t > leaderT) {
        leaderT = r.t;
        leader = r;
      }
      if (r.t < lastT) {
        lastT = r.t;
        last = r;
      }
    }
    frames.push({
      ms: Math.round(ts - raceStart),
      hud: cd.hudState,
      glide: cd._lerpPhase === "glide",
      binding: pr.binding,
      w: {
        state: widthOf(pr.ceilings.state),
        guarantee: widthOf(pr.ceilings.guarantee),
        company: widthOf(pr.ceilings.company),
        field: widthOf(pr.ceilings.field),
        line: widthOf(pr.ceilings.line),
        corridorCap: widthOf(pr.corridorCap),
      },
      delivered: widthOf(cd.zoom),
      target: widthOf(cd.targetZoom),
      // THE WORLD-BOUNDS CLAMP, read off `resolveCamera`'s own probe rather than inferred.
      clampAdapted: rp.wasZoomAdapted === true,
      clampClamped: rp.wasClamped === true,
      requested: widthOf(rp.requested),
      resolved: widthOf(rp.resolved),
      worldW: proj.worldW,
      lineOnScreen: (() => {
        if (!line) return false;
        const p = proj.toScreen(line, cd.zoom, cd.offsetX, cd.offsetY);
        return p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH;
      })(),
      leaderToLineT: line ? Math.abs(st.finishT - leaderT) : null,
      leaderToLastT: leaderT - lastT,
      leaderT,
      lastT,
      pathLen: shape.getTotalLength ? shape.getTotalLength() : null,
    });
  },
  { slowmo: true },
);

if (frames.length === 0) {
  console.log(`width-authority: ${TRACK} — no composing frame before a crossing.`);
  process.exit(0);
}

const fmt = (v) => (v === null ? "     —" : String(Math.round(v)).padStart(6));
console.log(
  `${TRACK}, seed ${SEED}, ${RACERS} racers — the WIDTH each term asks for, in world px.\n` +
    `World is ${Math.round(frames[0].worldW)} px wide. A ceiling on zoom is a FLOOR on width, so the\n` +
    `WIDEST demand wins. "clamp" is resolveCamera: A = it adapted the zoom, C = it clamped.\n`,
);

if (DUMP) {
  console.log(
    `${"ms".padStart(6)} ${"state".padStart(6)} ${"guar".padStart(6)} ${"comp".padStart(6)} ` +
      `${"field".padStart(6)} ${"line".padStart(6)} ${"cap".padStart(6)} | ${"deliv".padStart(6)} ` +
      `${"req".padStart(6)} ${"resv".padStart(6)} clamp  binding`,
  );
  for (const f of frames) {
    console.log(
      `${String(f.ms).padStart(6)} ${fmt(f.w.state)} ${fmt(f.w.guarantee)} ${fmt(f.w.company)} ` +
        `${fmt(f.w.field)} ${fmt(f.w.line)} ${fmt(f.w.corridorCap)} | ${fmt(f.delivered)} ` +
        `${fmt(f.requested)} ${fmt(f.resolved)} ${(f.clampAdapted ? "A" : "-") + (f.clampClamped ? "C" : "-")}     ${f.binding}`,
    );
  }
}

// ── WHO WINS, OVER THE WHOLE STRETCH ────────────────────────────────────────────────────────────
const byTerm = new Map();
for (const f of frames) byTerm.set(f.binding, (byTerm.get(f.binding) ?? 0) + 1);
console.log(`frames from the phase opening to the crossing: ${frames.length}`);
console.log(
  `  binding: ${[...byTerm.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n} (${Math.round((100 * n) / frames.length)}%)`)
    .join(", ")}`,
);
const adapted = frames.filter((f) => f.clampAdapted).length;
const clamped = frames.filter((f) => f.clampClamped).length;
console.log(
  `  resolveCamera adapted the zoom on ${adapted}/${frames.length} frames, clamped on ${clamped}.`,
);

// ── THE OWNER'S FRAME: just after the opening, with the line visible ─────────────────────────────
const shot = frames.find((f) => !f.glide && f.lineOnScreen) ?? frames.find((f) => !f.glide);
if (shot) {
  const arc = (dt) => (shot.pathLen ? Math.round(dt * shot.pathLen) : null);
  console.log(
    `\nTHE OWNER'S FRAME — first settled frame with the line in shot, at ${shot.ms} ms (${shot.hud}):`,
  );
  console.log(
    `  leader -> line     ${String(arc(shot.leaderToLineT)).padStart(6)} world px along the track ` +
      `(t ${shot.leaderT.toFixed(4)} -> ${(shot.leaderT + shot.leaderToLineT).toFixed(4)})`,
  );
  console.log(
    `  leader -> LAST     ${String(arc(shot.leaderToLastT)).padStart(6)} world px along the track ` +
      `(t ${shot.lastT.toFixed(4)})`,
  );
  console.log(
    `  frame is           ${String(Math.round(shot.delivered)).padStart(6)} world px wide, of a ` +
      `${Math.round(shot.worldW)} px world  (${Math.round((100 * shot.delivered) / shot.worldW)}% of it)`,
  );
  console.log(
    `  each term asks for: state ${fmt(shot.w.state)}  guarantee ${fmt(shot.w.guarantee)}  ` +
      `company ${fmt(shot.w.company)}  field ${fmt(shot.w.field)}  line ${fmt(shot.w.line)}  ` +
      `cap ${fmt(shot.w.corridorCap)}`,
  );
  console.log(
    `  WINNER: ${shot.binding}   |   resolveCamera: requested ${fmt(shot.requested)} -> resolved ` +
      `${fmt(shot.resolved)}, adapted ${shot.clampAdapted}, clamped ${shot.clampClamped}`,
  );
}
