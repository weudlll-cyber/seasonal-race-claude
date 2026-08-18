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
//
// START-CONTRADICTION-1 added --anchors: the per-frame table the owner's CAM DIAG cannot show —
// the field centroid, the pan target the director RESOLVED, the delivered camera centre, the
// leader, and WHICH CODE PATH supplied the anchor. The path is DERIVED and shown with its residual
// so the naming is checkable rather than asserted: `_camT` decides the entry-phase branch, and the
// two candidate anchors are compared against what the framing probe actually recorded.
//
//   node scripts/diag/start-frame-capture.mjs --anchors --track=dirt-oval --seed=9 --ms=1500
//   node scripts/diag/start-frame-capture.mjs --anchors --config=path/to/cameraConfig.json
// ============================================================

import { readFileSync } from "node:fs";
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
const ANCHORS = process.argv.includes("--anchors");
// START-OVERSHOOT-1: the exact decomposition of the camera centre's motion into the two terms that
// can move it. It is an IDENTITY, not a model — zoomTerm + panTerm equals the observed step by
// construction — so what it establishes is which of the two is LARGE, not that the sum is right.
const DECOMPOSE = process.argv.includes("--decompose");
const ANCHOR_MS = Number(argOf("ms") ?? 1500);
const EVERY_MS = Number(argOf("every") ?? 100);
// THE CONFIG SOURCE, made explicit because it is the first thing START-CONTRADICTION-1 had to
// establish. Absent, this harness builds from DEFAULT_CAMERA_CONFIG — NOT from a stored browser
// config. A JSON file here is merged OVER the defaults, exactly as the browser loader does.
const CONFIG_PATH = argOf("config") ?? null;
const fmt = (v) => (v === undefined ? "?" : Number.isFinite(v) ? v.toFixed(3) : "inf");
const CW = 1280;
const CH = 720;

const CONFIG = CONFIG_PATH
  ? { ...DEFAULT_CAMERA_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, "utf8")) }
  : DEFAULT_CAMERA_CONFIG;

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
const race = buildRace(geo, identity, CONFIG);

console.log(
  `${TRACK}, seed ${SEED}, ${RACERS} racers — the field on screen shortly after the start\n` +
    `canvas ${CW}x${CH}; "onscreen" counts racers whose centre is inside it\n`,
);
// ── START-CONTRADICTION-1: the anchor table ────────────────────────────────────────────────────
if (ANCHORS) {
  console.log(
    `CONFIG SOURCE: ${CONFIG_PATH ?? "DEFAULT_CAMERA_CONFIG (no stored config — this harness has no browser storage)"}
` +
      `  start-window keys as RESOLVED: postStartHoldMs=${CONFIG.postStartHoldMs} ` +
      `OVERVIEW.minStateHold=${CONFIG.cameraStateProfiles?.OVERVIEW?.minStateHold} ` +
      `leaderForwardFrac=${CONFIG.leaderForwardFrac} ` +
      `startHandoverOnLeaderMark=${CONFIG.startHandoverOnLeaderMark}
` +
      `  START_PHASE_DURATION is a hard constant in CameraDirector.js and no config key can move it.
`,
  );
  if (DECOMPOSE) {
    console.log(
      `${"ms".padStart(5)} ${"camX".padStart(7)} ${"tgtX".padStart(7)} ${"cam-tgt".padStart(8)}  ` +
        `${"dCamX".padStart(8)} ${"zoomTerm".padStart(9)} ${"panTerm".padStart(8)}  ` +
        `${"zoom".padStart(7)} ${"dz".padStart(8)} ${"anchor".padStart(7)} ${"corr?".padStart(6)} ${"binding"}`,
    );
  } else {
    console.log(
      `${"ms".padStart(5)} ${"anchor path".padEnd(24)} ${"resid".padStart(6)}  ` +
        `${"field centroid".padStart(15)} ${"pan target".padStart(15)} ${"camera centre".padStart(15)} ` +
        `${"leader".padStart(15)}  ${"cam-tgt".padStart(9)} ${"lag(px)".padStart(9)} ${"pan%".padStart(5)} ${"panRef".padStart(7)} ${"zoom".padStart(6)} camT`,
    );
  }
  let prevCamX = null;
  let prevEffX = null;
  let prevZoom = null;
  // THE FRAME BEFORE THE FIRST RACING FRAME. Without it the table cannot show the step INTO frame 0,
  // and that is exactly the transition this block was asked to find. The countdown runs inside
  // runRace and is unreachable from outside it, which is what the hook is for.
  let lastCeremony = null;
  let nextAt = 0;
  runRace(
    race,
    identity,
    CONFIG,
    ({ cd, st, ts, raceStart }) => {
      const ms = ts - raceStart;
      if (ms > ANCHOR_MS) return false;
      if (ms < nextAt) return;
      nextAt += EVERY_MS;

      // The field's centroid, computed here exactly as getPanTarget('OVERVIEW', …) computes it.
      const cx = st.racers.reduce((a, r) => a + r.x, 0) / st.racers.length;
      const cy = st.racers.reduce((a, r) => a + r.y, 0) / st.racers.length;
      const leader = st.racers.reduce((b, r) => (r.t > b.t ? r : b), st.racers[0]);

      // What the director RESOLVED, read off its own probe — not reconstructed.
      const a = cd._framingProbe?.anchorPoint ?? null;
      const dTo = (p) => (a && p ? Math.hypot(a.x - p.x, a.y - p.y) : NaN);
      // The two candidate paths, DERIVED and then CHECKED against the probe by residual.
      const dCentroid = dTo({ x: cx, y: cy });
      const onLine = cd._shape ? cd._shape.getPosition(((leader.t % 1) + 1) % 1, 0) : null;
      const dLeaderLine = dTo(onLine);
      let path;
      if (cd._camT !== null) path = "entry T-space (camT)";
      else if (ms < 3000) path = "start-phase centroid";
      else path = "subject: leader on line";
      const resid = path === "start-phase centroid" ? dCentroid : dLeaderLine;

      // The camera centre in WORLD units, the same arithmetic the CAM DIAG overlay uses.
      const ex = cd._proj.effX(cd.zoom);
      const ey = cd._proj.effY(cd.zoom);
      const camX = (1280 / 2 - cd.offsetX) / ex;
      const camY = (720 / 2 - cd.offsetY) / ey;
      const lagX = cd.targetOffsetX - cd.offsetX;
      const lagY = cd.targetOffsetY - cd.offsetY;
      const panPct = cd.panProgress;

      if (DECOMPOSE) {
        // Where the world centre WOULD be if the offset had not changed at all this frame: the
        // camera zooms about the WORLD ORIGIN, so camX scales with effX_prev / effX_now.
        if (prevCamX === null && lastCeremony) {
          prevCamX = lastCeremony.camX;
          prevEffX = lastCeremony.ex;
          prevZoom = lastCeremony.zoom;
          console.log(
            `${"cer".padStart(5)} ${lastCeremony.camX.toFixed(0).padStart(7)} ${"—".padStart(7)} ` +
              `${"—".padStart(8)}  ${"—".padStart(8)} ${"—".padStart(9)} ${"—".padStart(8)}  ` +
              `${lastCeremony.zoom.toFixed(4).padStart(7)} ${"—".padStart(8)} ${"—".padStart(7)} ` +
              `${"—".padStart(6)} (last ceremony frame)`,
          );
        }
        const zoomOnly = prevCamX === null ? camX : (prevCamX * prevEffX) / ex;
        const zoomTerm = prevCamX === null ? 0 : zoomOnly - prevCamX;
        const panTerm = prevCamX === null ? 0 : camX - zoomOnly;
        const dCam = prevCamX === null ? 0 : camX - prevCamX;
        // The zoom-about-the-anchor correction fires only when `_focusAnchorRacer` is non-null.
        const anchorIdx = cd._anchorRacerIndex;
        console.log(
          `${String(Math.round(ms)).padStart(5)} ${camX.toFixed(0).padStart(7)} ` +
            `${(a ? a.x.toFixed(0) : "—").padStart(7)} ${(a ? (camX - a.x).toFixed(0) : "—").padStart(8)}  ` +
            `${dCam.toFixed(1).padStart(8)} ${zoomTerm.toFixed(1).padStart(9)} ${panTerm.toFixed(1).padStart(8)}  ` +
            `${cd.zoom.toFixed(4).padStart(7)} ${(prevZoom === null ? 0 : cd.zoom - prevZoom).toFixed(4).padStart(8)} ` +
            `${String(anchorIdx ?? "null").padStart(7)} ${(anchorIdx == null ? "SKIP" : "on").padStart(6)} ${cd._framingProbe?.binding ?? "?"}`,
        );
        prevCamX = camX;
        prevEffX = ex;
        prevZoom = cd.zoom;
        return;
      }
      console.log(
        `${String(Math.round(ms)).padStart(5)} ${path.padEnd(24)} ${resid.toFixed(1).padStart(6)}  ` +
          `${`(${cx.toFixed(0)},${cy.toFixed(0)})`.padStart(15)} ` +
          `${(a ? `(${a.x.toFixed(0)},${a.y.toFixed(0)})` : "—").padStart(15)} ` +
          `${`(${camX.toFixed(0)},${camY.toFixed(0)})`.padStart(15)} ` +
          `${`(${leader.x.toFixed(0)},${leader.y.toFixed(0)})`.padStart(15)}  ` +
          `${(a ? (camX - a.x).toFixed(0) : "—").padStart(9)} ` +
          `${`${lagX.toFixed(0)},${lagY.toFixed(0)}`.padStart(9)} ` +
          `${(panPct * 100).toFixed(0).padStart(4)}% ${cd._transitionStartOffsetX.toFixed(0).padStart(7)} ${cd.zoom.toFixed(3).padStart(6)} ${cd._camT === null ? "null" : cd._camT.toFixed(4)}`,
      );
    },
    {
      slowmo: true,
      onCountdownFrame: ({ cd }) => {
        const ex = cd._proj.effX(cd.zoom);
        lastCeremony = { camX: (1280 / 2 - cd.offsetX) / ex, zoom: cd.zoom, ex };
      },
    },
  );
  process.exit(0);
}

console.log(
  `${"at ms".padStart(6)}  ${"hud".padEnd(13)} ${"zoom".padStart(7)} ${"offX".padStart(8)} ` +
    `${"field x".padStart(15)}  ${"leader x".padStart(9)} ${"on".padStart(5)}  ${"binding".padEnd(20)} ${"ceilings.line"}`,
);

let nextIdx = 0;
runRace(
  race,
  identity,
  CONFIG,
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
