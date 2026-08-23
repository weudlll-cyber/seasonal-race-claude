// ============================================================
// File:        scripts/pan-lag-account.mjs
// Project:     RaceArena — PAN-LAG-ACCOUNT-1
//
// THE DELIVERABLE IS A CLOSED ACCOUNT, not another finding. Every screen pixel of pan lag is
// attributed either to the smoother the director is running or to a RESIDUAL, and the two sum to the
// measured lag exactly — by construction, not by fitting.
//
// HOW THE ACCOUNT CLOSES. Each frame the pan is one of four branches in `update()`:
//   follow   offset += (target - offset) * lf        — a first-order smoother
//   glide    offset  = start + (target - start) * e  — a smoothstep over a duration
//   snap     offset  = target                        — cut / lead-change / t-space lerp
//   (t-space is a snap: `offset = target` exactly, so its lag is zero by construction)
// For every frame the harness computes the ONE-STEP-AHEAD prediction from the ACTUAL previous
// delivered offset and this frame's actual target and lerp factor:
//     sim = prevDelivered + (target - prevDelivered) * lf
// then
//     measuredLag = delivered - target
//     explained   = sim       - target      <- what the smoother MUST produce, given where it was
//     residual    = delivered - sim         <- what the smoother cannot produce
// and `measuredLag = explained + residual` identically. A one-step prediction is used rather than a
// free-running simulation on purpose: it isolates per-frame model error instead of accumulating it,
// so the residual is a property of the frame and not of the run's history.
//
// THE TIME CONSTANT IS READ FROM THE VALUE IN FORCE, never from the defaults table:
// `_lerpFactorForState(state)` with the director's own `_lerpPhase`, converted back to seconds by
// inverting the module's own formula, lf = 1 - 0.1^(1/(tc*60)).
//
// IT CHANGES NOTHING: every field read is one the director already maintains.
//
// Usage:
//   node scripts/pan-lag-account.mjs                 # ten tracks, both sizes, both arms
//   node scripts/pan-lag-account.mjs --tracks=garden-path
//   node scripts/pan-lag-account.mjs --json
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "./lib/raceDriver.mjs";
// ONE HOME (ONE-HOME-FIVE-MORE-1, 2026-08-23): `HIS` and `setPath` were a PRIVATE COPY here.
// ONE-HOME-THREE-TRUTHS-1 gave the arm a home in `lib/hisArm.mjs` but recorded the duplication as
// "exactly two" and converted two files; it was SEVEN. This file was one of the five it missed.
// The copy removed here was verified byte-identical to the home before it was deleted.
import { HIS, setPath } from "./lib/hisArm.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280;
const CH = 720;
const SEED = 9;
const FPS = 60;
const JSON_OUT = process.argv.includes("--json");
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const ROSTER = QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

const hisConfig = () => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [path, v] of HIS) setPath(cfg, path, v);
  return cfg;
};

/** Invert the module's own lf formula: lf = 1 - 0.1^(1/(tc*FPS)). */
const lfToTc = (lf) =>
  lf > 0 && lf < 1 ? Math.log(0.1) / (FPS * Math.log(1 - lf)) : NaN;

const med = (a) => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const p95 = (a) => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(0.95 * b.length))] : NaN; };
const mean = (a) => { const b = a.filter(Number.isFinite); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : NaN; };

function measureTrack(geo, cfg, arm, N) {
  const identity = resolveIdentity({
    racers: N, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER, seconds: 60,
    canvasW: CW, canvasH: CH, roster: ROSTER,
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const bsY = CH / (geo.worldHeight || CH);

  let prevOffX = null;
  let prevOffY = null;
  let prevTx = null;
  let prevTy = null;
  let prevPhase = null;
  let prevState = null;
  let prevAnchor = null;

  const rows = [];
  const entryStarts = [];       // what began each entry phase
  let runInFrames = 0;
  let runInEntryFrames = 0;
  const runInTcs = [];
  let maxProgress = 0;
  let sawRunIn = false;
  let sawWindow = false;
  const endgame = [];             // the endgame decomposition — see THE SEPARATION below

  runRace(race, identity, cfg, ({ ts, raceStart }) => {
    const state = cd.state;
    const phase = cd._lerpPhase;
    const lf = cd._lerpFactorForState(state);
    const tc = lfToTc(lf);
    const effX = shape.isOpen ? effectiveZoom(cd.zoom, OPEN_TRACK_BASE_ZOOM) : cd.zoom * bsX;
    const tx = cd.targetOffsetX;
    const ty = cd.targetOffsetY;
    const ox = cd.offsetX;
    const oy = cd.offsetY;

    // ZOOM LAG, measured beside the pan because LINE-VISIBLE-1's figure conflated the two: it
    // compared a world point's screen position between the target frame and the delivered frame, and
    // a zoom difference multiplies that point's distance from the camera centre. A point far from
    // centre therefore shows a huge displacement from a small zoom difference. The two are separated
    // here so each can be named.
    const tz = cd.targetZoom;
    const zoomRatio = tz > 0 && cd.zoom > 0 ? cd.zoom / tz : NaN;

    const leaderT = st.racers.reduce((m, r) => Math.max(m, r.t), 0);
    const progress = st.finishT > 0 ? leaderT / st.finishT : 0;
    if (progress > maxProgress) maxProgress = progress;
    // The run-in's WINDOW, from the two things it is made of — recomputed here only to answer the
    // garden-path question; the director's own `_runInActive` is read beside it.
    const windowOpen = progress > (cfg.endgameThreshold ?? 0.95) && st.finishedCount === 0;
    if (windowOpen) sawWindow = true;
    if (cd._framingProbe?.runInActive) {
      sawRunIn = true;
      runInFrames++;
      // THE SEPARATION. LINE-VISIBLE-1 reported a single "lag" for the finish line's screen
      // displacement between the target frame and the delivered frame. That quantity is the sum of
      // TWO errors, and they are different levers:
      //   PAN-only   — same (delivered) zoom, differing offsets: |offset - targetOffset|
      //   ZOOM-only  — same (delivered) offset, differing zoom:  |c * (eff - targetEff)|
      // The zoom term is multiplied by the line's distance from the camera centre, so a 1 % zoom
      // error at a line 800 world px away is worth far more screen pixels than the whole pan lag.
      // They also partly CANCEL, which is why the total is often smaller than either part.
      const pt = cd._framingProbe.point;
      if (pt && tz > 0 && Number.isFinite(tz)) {
        const effY = shape.isOpen ? effX : cd.zoom * bsY;
        const tEffX = shape.isOpen ? effectiveZoom(tz, OPEN_TRACK_BASE_ZOOM) : tz * bsX;
        const tEffY = shape.isOpen ? tEffX : tz * bsY;
        endgame.push({
          total: Math.hypot(ox + pt.x * effX - (tx + pt.x * tEffX), oy + pt.y * effY - (ty + pt.y * tEffY)),
          panOnly: Math.hypot(ox - tx, oy - ty),
          zoomOnly: Math.hypot(pt.x * (effX - tEffX), pt.y * (effY - tEffY)),
          zoomRatio,
        });
      }
      if (phase === "entry") runInEntryFrames++;
      if (Number.isFinite(tc)) runInTcs.push(tc);
    }

    if (phase !== prevPhase && phase === "entry") {
      entryStarts.push({
        tSec: +((ts - raceStart) / 1000).toFixed(2),
        state,
        stateChanged: state !== prevState,
        anchorChanged: cd.anchorRacerIndex !== prevAnchor,
      });
    }

    if (prevOffX !== null && Number.isFinite(tx) && Number.isFinite(ty)) {
      // The one-step prediction from where the pan ACTUALLY was.
      const simX = prevOffX + (tx - prevOffX) * lf;
      const simY = prevOffY + (ty - prevOffY) * lf;
      const measured = Math.hypot(ox - tx, oy - ty);
      const explained = Math.hypot(simX - tx, simY - ty);
      const residual = Math.hypot(ox - simX, oy - simY);
      const targetStep = Math.hypot(tx - prevTx, ty - prevTy);
      // A SNAP is a frame the pan landed exactly on its target; those have no lag by construction.
      const snapped = measured < 1e-6;
      rows.push({
        tSec: +((ts - raceStart) / 1000).toFixed(2),
        state, phase, lf, tc,
        effX,
        measured, explained, residual,
        measuredWorld: effX > 0 ? measured / effX : NaN,
        residualWorld: effX > 0 ? residual / effX : NaN,
        targetStep,
        targetSpeedWorld: effX > 0 ? (targetStep * FPS) / effX : NaN,
        snapped,
        zoomRatio,
        glide: phase === "glide",
        progress,
      });
    }
    prevOffX = ox; prevOffY = oy; prevTx = tx; prevTy = ty;
    prevPhase = phase; prevState = state; prevAnchor = cd.anchorRacerIndex;
  });

  // A STEP is a target jump far outside the ordinary frame-to-frame motion of this race.
  const steps = rows.map((r) => r.targetStep).filter(Number.isFinite);
  const stepThreshold = 8 * (med(steps) || 1);
  for (const r of rows) r.isStep = r.targetStep > stepThreshold;
  // Frames within 30 of a step are still settling from it.
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].isStep) continue;
    for (let k = i; k < Math.min(rows.length, i + 30); k++) rows[k].afterStep = true;
  }

  return {
    track: geo.id, isOpen: shape.isOpen, racers: N, arm,
    rows, entryStarts,
    runInFrames, runInEntryFrames, runInTcs, endgame,
    maxProgress, sawRunIn, sawWindow,
    endgameThreshold: cfg.endgameThreshold ?? 0.95,
    finishT: st.finishT,
  };
}

const all = loadTracks().filter((g) => (TRACK_ARG ? TRACK_ARG.split(",").includes(g.id) : true));
const out = [];
for (const geo of all) {
  const probe = buildRace(
    geo,
    resolveIdentity({ racers: 2, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER, seconds: 60, canvasW: CW, canvasH: CH, roster: ROSTER }),
    DEFAULT_CAMERA_CONFIG
  );
  const big = probe.shape.isOpen ? 100 : 40;
  for (const N of [20, big]) {
    out.push(measureTrack(geo, hisConfig(), "his", N));
    out.push(measureTrack(geo, structuredClone(DEFAULT_CAMERA_CONFIG), "shipped", N));
  }
}

const pct = (n, d) => (d > 0 ? ((100 * n) / d).toFixed(0) + "%" : "—");

if (JSON_OUT) {
  console.log(JSON.stringify(out.map((r) => ({ ...r, rows: undefined, rowCount: r.rows.length })), null, 1));
} else {
  console.log("PAN-LAG-ACCOUNT-1 — every screen pixel of pan lag, attributed");
  console.log(`seed ${SEED}, ${CW}x${CH}; measured = explained + residual, identically, per frame`);
  console.log("");
  console.log("THE ACCOUNT — whole race, per track (medians in SCREEN px unless said otherwise)");
  console.log("track            n    arm      frames  snap%  glide%  medLag  medExpl  medResid  p95Resid  medLagWorld  zoomRatio(med/p95dev)");
  for (const r of out) {
    const f = r.rows;
    if (!f.length) { console.log(`${r.track.padEnd(16)}${String(r.racers).padStart(4)}  ${r.arm.padEnd(8)} — no frames`); continue; }
    const follow = f.filter((x) => !x.snapped && !x.glide);
    const share = mean(follow.map((x) => (x.measured > 1e-9 ? x.residual / x.measured : 0)));
    console.log(
      [
        r.track.padEnd(16), String(r.racers).padStart(4), "  " + r.arm.padEnd(8),
        String(f.length).padStart(6),
        pct(f.filter((x) => x.snapped).length, f.length).padStart(6),
        pct(f.filter((x) => x.glide).length, f.length).padStart(7),
        med(follow.map((x) => x.measured)).toFixed(0).padStart(8),
        med(follow.map((x) => x.explained)).toFixed(0).padStart(9),
        med(follow.map((x) => x.residual)).toFixed(1).padStart(10),
        p95(follow.map((x) => x.residual)).toFixed(1).padStart(10),
        med(follow.map((x) => x.measuredWorld)).toFixed(0).padStart(13),
        med(follow.map((x) => x.zoomRatio)).toFixed(3).padStart(12) +
          " / " + p95(follow.map((x) => Math.abs(1 - x.zoomRatio))).toFixed(3),
      ].join("")
    );
  }
  console.log("");
  console.log("PER STATE — pooled over all tracks, his config, follow frames only");
  const byState = {};
  for (const r of out.filter((x) => x.arm === "his")) {
    for (const x of r.rows) {
      if (x.snapped || x.glide) continue;
      (byState[x.state] ??= []).push(x);
    }
  }
  console.log("state          frames   medTc  entry%   medLag  medExpl  medResid  p95Resid  afterStep%");
  for (const [k, v] of Object.entries(byState).sort((a, b) => b[1].length - a[1].length)) {
    console.log(
      [
        k.padEnd(15), String(v.length).padStart(6),
        med(v.map((x) => x.tc)).toFixed(2).padStart(8),
        pct(v.filter((x) => x.phase === "entry").length, v.length).padStart(7),
        med(v.map((x) => x.measured)).toFixed(0).padStart(9),
        med(v.map((x) => x.explained)).toFixed(0).padStart(9),
        med(v.map((x) => x.residual)).toFixed(1).padStart(10),
        p95(v.map((x) => x.residual)).toFixed(1).padStart(10),
        pct(v.filter((x) => x.afterStep).length, v.length).padStart(11),
      ].join("")
    );
  }
  console.log("");
  console.log("Q1 — THE ENDGAME'S TIME CONSTANT, and how many entry phases a race starts");
  console.log("track            n    arm      runIn frames  entry%  medTc in run-in   entry phases/race  (state-change / anchor-change)");
  for (const r of out) {
    if (!r.runInFrames) { console.log(`${r.track.padEnd(16)}${String(r.racers).padStart(4)}  ${r.arm.padEnd(8)} — NO RUN-IN FRAMES`); continue; }
    const sc = r.entryStarts.filter((e) => e.stateChanged).length;
    const ac = r.entryStarts.filter((e) => !e.stateChanged && e.anchorChanged).length;
    console.log(
      [
        r.track.padEnd(16), String(r.racers).padStart(4), "  " + r.arm.padEnd(8),
        String(r.runInFrames).padStart(12),
        pct(r.runInEntryFrames, r.runInFrames).padStart(8),
        med(r.runInTcs).toFixed(2).padStart(17),
        String(r.entryStarts.length).padStart(19),
        `   (${sc} / ${ac})`,
      ].join("")
    );
  }
  console.log("");
  console.log("THE ENDGAME, PAN SEPARATED FROM ZOOM — the finish line's screen displacement, medians in px");
  console.log("track            n    arm      frames   TOTAL   PAN-only  ZOOM-only  zoomRatio");
  for (const r of out) {
    if (!r.endgame.length) { console.log(`${r.track.padEnd(16)}${String(r.racers).padStart(4)}  ${r.arm.padEnd(8)}     0    (no endgame — never reaches the window)`); continue; }
    console.log(
      r.track.padEnd(16) + String(r.racers).padStart(4) + "  " + r.arm.padEnd(8) +
      String(r.endgame.length).padStart(6) +
      med(r.endgame.map((x) => x.total)).toFixed(0).padStart(8) +
      med(r.endgame.map((x) => x.panOnly)).toFixed(0).padStart(10) +
      med(r.endgame.map((x) => x.zoomOnly)).toFixed(0).padStart(11) +
      med(r.endgame.map((x) => x.zoomRatio)).toFixed(3).padStart(11)
    );
  }
  console.log("");
  console.log("Q2 — GARDEN-PATH: why no endgame frames");
  console.log("track            n    arm      finishT   maxProgress   threshold   window opened?  runIn active?");
  for (const r of out) {
    console.log(
      [
        r.track.padEnd(16), String(r.racers).padStart(4), "  " + r.arm.padEnd(8),
        String(r.finishT).padStart(7),
        r.maxProgress.toFixed(4).padStart(14),
        String(r.endgameThreshold).padStart(12),
        (r.sawWindow ? "yes" : "NO").padStart(16),
        (r.sawRunIn ? "yes" : "NO").padStart(15),
      ].join("")
    );
  }
}
