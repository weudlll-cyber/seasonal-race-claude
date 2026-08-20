// ============================================================
// File:        scripts/diag/camera-determinism.mjs
// Project:     RaceArena — CAMERA-NONDETERMINISM-1 (report-only, changes nothing)
//
// DOES THE SAME SEED GIVE THE SAME CAMERA?
//
// ── WHY NO EXISTING INSTRUMENT COULD ANSWER THIS ─────────────────────────────────────────────
//
// Every harness in this project runs the driver at a FIXED 60 Hz. A dependence on frame rate,
// dropped frames or wall-clock time is invisible to all of them BY CONSTRUCTION — not because
// anyone chose to ignore it, but because the variable was never varied. `runRace` now takes
// `hooks.frameMs`, and this file is the first caller to use it.
//
// ── THE RACE IS THE CLOCK, NOT THE FRAME ─────────────────────────────────────────────────────
//
// The physics advances on a fixed-step accumulator; the CAMERA advances on wall-clock frames. So
// two runs at different frame rates take the SAME sequence of physics steps and sample it at
// different moments. Comparing them frame-by-frame would compare different race states and prove
// nothing. Everything below is therefore indexed by PHYSICS STEP COUNT — the race's own clock —
// and a divergence at a matched step count means the camera did something different at the same
// point of the same race.
//
// ── WHAT COUNTS AS A DIVERGENCE ──────────────────────────────────────────────────────────────
//
// Zoom is compared in ln (a scale is perceived logarithmically); the centre in screen px. The
// thresholds are for REPORTING the first visible divergence, not for judging pass/fail — the raw
// maxima are printed beside them, so a reader can apply any threshold they like.
//
// Usage:
//   node scripts/diag/camera-determinism.mjs
//   node scripts/diag/camera-determinism.mjs --track=space-sprint --racers=100 --seed=9
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
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280;
const CH = 720;
const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const TRACK = ARG("track", "space-sprint");
const SEED = Number(ARG("seed", "9"));
const RACERS = Number(ARG("racers", "100"));

const HIS = [
  ["cameraStateProfiles.OVERVIEW.trackingTC", 1.5],
  ["highlightHeroes", true],
  ["battlePulkThresholdT", 0.001],
  ["outcomePhaseThreshold", 0.65],
  ["battleCooldownMs", 20000],
  ["battleWeight", 0],
  ["finishPauseMs", 4000],
  ["winnerCardMs", 4000],
  ["corridorCapArriveMs", 5000],
  ["labelNamesWhenRoom", true],
  ["minRacersVisible", 8],
];
const setPath = (o, path, v) => {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
};
const hisConfig = () => {
  const c = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [k, v] of HIS) setPath(c, k, v);
  return c;
};

// ── THE FRAME CLOCKS UNDER TEST ─────────────────────────────────────────────────────────────
// A and A' are the SAME clock: if they differ, nothing else in this file means anything.
const F60 = 1000 / 60;
const CLOCKS = [
  ["A  60Hz", () => F60],
  ["A' 60Hz (control)", () => F60],
  ["B  30Hz", () => 1000 / 30],
  ["C  jitter 12/22ms", (f) => (f % 2 ? 12 : 22)],
  ["D  60Hz, 1 frame in 37 takes 50ms", (f) => (f % 37 === 0 ? 50 : F60)],
  ["E  ramp 60Hz->20Hz", (f) => F60 + Math.min(33, f * 0.02)],
];

function trajectory(geo, frameMs, cameraSeed = 1439767152) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    canvasW: CW,
    canvasH: CH,
    cameraSeed,
    note: "CAMERA-NONDETERMINISM-1",
  });
  const cfg = hisConfig();
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);

  // One entry per PHYSICS STEP: the camera as it stood the first time the race reached that step.
  const byStep = new Map();
  runRace(
    race,
    identity,
    cfg,
    ({ cd: c, st: s, physicsSteps }) => {
      if (byStep.has(physicsSteps)) return;
      let maxT = 0;
      for (const r of s.racers) if (r.t > maxT) maxT = r.t;
      byStep.set(physicsSteps, {
        step: physicsSteps,
        progress: s.finishT > 0 ? maxT / s.finishT : 0,
        lnW: Math.log(CW / effOf(c.zoom)),
        offX: c.offsetX,
        offY: c.offsetY,
        state: c.state,
        composing: !!c._runInComposingNow,
        runInProgress: c._runInProgress ?? -1,
        binding: c._framingProbe?.binding ?? "?",
        anchorX: c._framingProbe?.anchorPoint?.x ?? NaN,
      });
    },
    { frameMs }
  );
  return byStep;
}

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`no such track: ${TRACK}`);
  process.exit(1);
}

console.log(`CAMERA-NONDETERMINISM-1 — ${TRACK}, seed ${SEED}, ${RACERS} racers, his config`);
console.log(`Indexed by PHYSICS STEP (the race's own clock), not by frame.\n`);

const runs = CLOCKS.map(([name, fn]) => [name, trajectory(geo, fn)]);
const [, base] = runs[0];

console.log(
  "clock                        steps  1st diverge @step  (progress)   maxΔzoom(ln)   maxΔcentre(px)   state differs"
);
for (const [name, tr] of runs) {
  let first = null;
  let maxZ = 0;
  let maxC = 0;
  let stateDiff = 0;
  let compared = 0;
  for (const [step, a] of base) {
    const b = tr.get(step);
    if (!b) continue;
    compared++;
    const dz = Math.abs(a.lnW - b.lnW);
    const dc = Math.hypot(a.offX - b.offX, a.offY - b.offY);
    if (a.state !== b.state) stateDiff++;
    if (dz > maxZ) maxZ = dz;
    if (dc > maxC) maxC = dc;
    // "Visible" divergence: one screen pixel at the frame edge, or one screen pixel of centre.
    if (first === null && (dz * (CW / 2) > 1 || dc > 1)) first = a;
  }
  console.log(
    [
      name.padEnd(28),
      String(tr.size).padStart(6),
      (first ? String(first.step) : "-").padStart(18),
      (first ? first.progress.toFixed(4) : "-").padStart(12),
      maxZ.toFixed(6).padStart(15),
      maxC.toFixed(1).padStart(17),
      String(stateDiff).padStart(15),
    ].join("")
  );
}

// ── THE CAMERA'S OWN SEED, AT A FIXED FRAME RATE ────────────────────────────────────────────
//
// `RaceScreen` draws a FRESH camera seed from `Math.random()` for every race (index.jsx:595) and
// hands it to `setRandomSeed`. The director rolls dice with it at three sites: whether to take a
// candidate state, WHICH state to cut to, and the OVERVIEW schedule's jitter. So the race seed and
// the camera seed are two different seeds, and only one of them is reproducible.
//
// This section holds the frame clock at a constant 60 Hz and varies ONLY the camera seed, which is
// what a viewer does by pressing Start twice.
{
  console.log("");
  console.log("SAME RACE SEED, FIXED 60 Hz, DIFFERENT CAMERA SEEDS — what pressing Start twice does");
  const seeds = [1439767152, 1439767152, 7, 123456789, 2024];
  const base2 = trajectory(geo, () => F60, seeds[0]);
  console.log("cameraSeed        steps  1st diverge @step  (progress)   maxDzoom(ln)   maxDcentre(px)   state differs");
  for (const sd of seeds) {
    const tr = trajectory(geo, () => F60, sd);
    let first = null, maxZ = 0, maxC = 0, stateDiff = 0;
    for (const [step, a] of base2) {
      const b = tr.get(step);
      if (!b) continue;
      const dz = Math.abs(a.lnW - b.lnW);
      const dc = Math.hypot(a.offX - b.offX, a.offY - b.offY);
      if (a.state !== b.state) stateDiff++;
      if (dz > maxZ) maxZ = dz;
      if (dc > maxC) maxC = dc;
      if (first === null && (dz * (CW / 2) > 1 || dc > 1)) first = a;
    }
    console.log(
      [
        String(sd).padEnd(18),
        String(tr.size).padStart(6),
        (first ? String(first.step) : "-").padStart(18),
        (first ? first.progress.toFixed(4) : "-").padStart(12),
        maxZ.toFixed(6).padStart(15),
        maxC.toFixed(1).padStart(17),
        String(stateDiff).padStart(15),
      ].join("")
    );
  }
}

// ── THE FIRST DIVERGING FRAME, IN FULL ──────────────────────────────────────────────────────
// A maximum tells nobody what happened. This prints both sides of the earliest divergence against
// the 60 Hz run, with every field that could have caused it.
for (const [name, tr] of runs.slice(1)) {
  let firstStep = null;
  for (const [step, a] of base) {
    const b = tr.get(step);
    if (!b) continue;
    const dz = Math.abs(a.lnW - b.lnW);
    const dc = Math.hypot(a.offX - b.offX, a.offY - b.offY);
    if (dz * (CW / 2) > 1 || dc > 1) {
      firstStep = step;
      break;
    }
  }
  if (firstStep === null) {
    console.log(`\n${name}: no divergence over ${tr.size} matched steps.`);
    continue;
  }
  const a = base.get(firstStep);
  const b = tr.get(firstStep);
  console.log(`\n${name} — first divergence at physics step ${firstStep} (progress ${a.progress.toFixed(4)})`);
  console.log("  field            60Hz                    this clock");
  for (const k of ["lnW", "offX", "offY", "state", "composing", "runInProgress", "binding", "anchorX"]) {
    const av = typeof a[k] === "number" ? a[k].toFixed(6) : String(a[k]);
    const bv = typeof b[k] === "number" ? b[k].toFixed(6) : String(b[k]);
    console.log(`  ${k.padEnd(16)}${av.padEnd(24)}${bv}${av !== bv ? "   <-- DIFFERS" : ""}`);
  }
}
