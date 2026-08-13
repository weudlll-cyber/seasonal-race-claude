// ============================================================
// File:        scripts/resolve-converge-truth.mjs
// Project:     RaceArena — RESOLVE-CONVERGE-1
//
// WHAT THIS MEASURES: how often `resolveCamera`'s widening loop RUNS, and how often running it
// achieves the thing it exists to achieve. The loop's second guarantee is "the target is within the
// inner-frame percentage if physically possible", and it pursues that by stepping the zoom down 10%
// at a time. This script asks, per frame of a whole race on every track: did it step, and did the
// target end up inside the inner frame.
//
//   FUTILE  = it stepped and the target is STILL outside — width was paid and nothing was bought.
//   PAID    = it stepped and the target came inside — the loop did its job.
//   QUIET   = it did not step.
//
// IT MEASURES THE REAL FUNCTION, NOT A COPY. There is no reimplementation of the loop in here. The
// harness reconstructs the exact arguments `_setTrackTargets` passed and calls the shipped
// `resolveCamera` with them. That reconstruction is CHECKED on every frame: the cam.zoom it derives
// must equal the `targetZoom` the director actually set, and a frame where it does not is counted
// and reported as UNVERIFIED rather than silently folded into a total. So the before/after
// comparison is taken by running THIS script on the two trees, not by keeping an old loop alive
// beside the new one — a harness that measures a copy is the failure mode this repo has hit six
// times, and it is what the `_framingProbe` on `_setTargets` exists to prevent.
//
// WHERE THE INPUTS COME FROM. `_framingProbe` (CAMERA-ANCHOR-TRUTH-1 §4a) records the pan target
// after both bias steps and the `guaranteed` cam.zoom for the frame, which are exactly the two
// arguments `_setTrackTargets` receives; the projection, the world bounds and `innerFramePct` are
// fields on the director. Nothing here needs a new probe.
//
// WHAT IT IS BLIND TO: whether the picture is GOOD. A shot can be honestly resolved and still be
// the wrong shot. This answers only "did the loop converge, and what width did it deliver".
//
// Usage:
//   node scripts/resolve-converge-truth.mjs                  # all ten tracks, whole race
//   node scripts/resolve-converge-truth.mjs --seeds=9,2814   # more than one race per track
//   node scripts/resolve-converge-truth.mjs --only=ice-track --frames --seed=9
//                                                            # the per-frame table across the ending
//   node scripts/resolve-converge-truth.mjs --runin-off      # inert where `runInShot` does not exist
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/racerNames.js")).href
);
const { resolveCamera } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/camera/resolveCamera.js")).href
);

const argOf = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ONLY = argOf("only", null);
const FRAMES = process.argv.includes("--frames");
const RUNIN_OFF = process.argv.includes("--runin-off");
const SEEDS = argOf("seeds", argOf("seed", "9"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));

const CW = 1280;
const CH = 720;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
// `runInShot` exists only where the run-in has landed; setting it on a tree without the key is a
// no-op, which is what makes this flag safe to pass on either tree.
const CAMERA_CONFIG = RUNIN_OFF
  ? { ...DEFAULT_CAMERA_CONFIG, runInShot: false }
  : DEFAULT_CAMERA_CONFIG;

/** The width the camera delivers, as a fraction of the world. 1.0 = the whole world is on screen. */
const widthFrac = (proj, camZoom, worldW) =>
  Math.min(1, proj.visibleWorldW(camZoom, CW) / worldW);

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const q = (arr, p) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

const rows = [];
let unverifiedTotal = 0;

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: 20,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "RESOLVE-CONVERGE-1 survey",
    });
    const race = buildRace(geo, identity, CAMERA_CONFIG);
    const { cd, shape } = race;
    const proj = cd._proj;
    const worldW = geo.worldWidth;
    const endgame = CAMERA_CONFIG.endgameThreshold;

    let total = 0;
    let unverified = 0;
    let prevProbe = null;
    let quiet = 0;
    let futile = 0;
    let paid = 0;
    let futileClamped = 0;
    const futileDelivered = [];
    const futileRequested = [];
    const futileStates = new Map();
    const perFrame = [];

    runRace(
      race,
      identity,
      CAMERA_CONFIG,
      ({ cd: d, st: s, ts, raceStart }) => {
        total++;
        const fp = d._framingProbe;
        // `_setTargets` writes a FRESH object every frame, so identity is the freshness test: a
        // probe carried over from last frame would reproduce last frame's `targetZoom` and pass the
        // self-check below while being no evidence about this one.
        if (!fp || !fp.point || fp === prevProbe) {
          unverified++;
          return;
        }
        prevProbe = fp;
        // THE REAL CALL, with the arguments `_setTrackTargets` used this frame.
        const minEffZoom = proj.minEffX();
        const r = resolveCamera({
          targetWorld: fp.afterLateral ?? fp.point,
          desiredEffZoom: proj.effX(fp.guaranteed),
          worldBounds: d._worldBounds,
          frameSize: { width: fp.frameW, height: fp.frameH },
          innerFramePct: d._innerFramePct,
          minEffZoom,
        });
        const derived = proj.camZoomForEffX(r.effectiveZoom);
        // THE SELF-CHECK. If the reconstruction is not the resolve the director made, this frame is
        // not evidence about anything and is counted apart.
        if (Math.abs(derived - d.targetZoom) > 1e-9) {
          unverified++;
          return;
        }
        const requested = widthFrac(proj, proj.clampCamZoom(fp.guaranteed), worldW);
        const delivered = widthFrac(proj, derived, worldW);
        if (!r.wasZoomAdapted) quiet++;
        else if (r.targetInInnerFrame) paid++;
        else {
          futile++;
          if (r.wasClamped) futileClamped++;
          futileDelivered.push(delivered);
          futileRequested.push(requested);
          futileStates.set(d.state, (futileStates.get(d.state) ?? 0) + 1);
        }
        if (FRAMES) {
          let maxT = 0;
          for (const rr of s.racers) if (rr.t > maxT) maxT = rr.t;
          const prog = s.finishT > 0 ? maxT / s.finishT : 0;
          if (prog > endgame) {
            perFrame.push({
              ms: Math.round(ts - raceStart),
              prog,
              state: d.state,
              hud: d.hudState,
              requested,
              delivered,
              adapted: r.wasZoomAdapted,
              clamped: r.wasClamped,
              inFrame: r.targetInInnerFrame,
            });
          }
        }
      },
      { slowmo: true },
    );

    unverifiedTotal += unverified;
    rows.push({
      track: geo.id,
      open: shape.isOpen,
      seed: raceSeed,
      total,
      unverified,
      quiet,
      paid,
      futile,
      futileClamped,
      futileDelivered,
      futileRequested,
      futileStates,
      identity,
    });

    if (FRAMES) {
      console.log(
        `\n── ${geo.id} seed ${raceSeed} — every frame past the endgame threshold ──`,
      );
      console.log(
        "  prog   ms      state           requested  delivered  adapted clamped inFrame",
      );
      for (const f of perFrame) {
        console.log(
          `  ${f.prog.toFixed(3)}  ${String(f.ms).padStart(6)}  ${String(f.state).padEnd(15)} ` +
            `${pct(f.requested).padStart(8)}  ${pct(f.delivered).padStart(9)}  ` +
            `${String(f.adapted).padEnd(7)} ${String(f.clamped).padEnd(7)} ${f.inFrame}`,
        );
      }
    }
  }
}

console.log(
  `\ntrack           seed   frames   quiet    PAID   FUTILE  futile%  delivered on futile (min/med/max)  requested (med)`,
);
let tTotal = 0;
let tQuiet = 0;
let tPaid = 0;
let tFutile = 0;
let tFutileClamped = 0;
const allFutileDelivered = [];
const allFutileRequested = [];
const allFutileStates = new Map();
for (const r of rows) {
  tTotal += r.total;
  tQuiet += r.quiet;
  tPaid += r.paid;
  tFutile += r.futile;
  tFutileClamped += r.futileClamped;
  allFutileDelivered.push(...r.futileDelivered);
  allFutileRequested.push(...r.futileRequested);
  for (const [k, v] of r.futileStates)
    allFutileStates.set(k, (allFutileStates.get(k) ?? 0) + v);
  const d = r.futileDelivered;
  const shot = d.length
    ? `${pct(Math.min(...d))} / ${pct(q(d, 0.5))} / ${pct(Math.max(...d))}`
    : "—";
  console.log(
    `${r.track.padEnd(15)} ${String(r.seed).padStart(4)} ${String(r.total).padStart(7)} ` +
      `${String(r.quiet).padStart(7)} ${String(r.paid).padStart(7)} ${String(r.futile).padStart(8)} ` +
      `${(r.total ? (100 * r.futile) / r.total : 0).toFixed(1).padStart(7)}%  ${shot.padStart(28)}  ` +
      `${r.futileRequested.length ? pct(q(r.futileRequested, 0.5)) : "—"}`,
  );
}
const shotAll = allFutileDelivered.length
  ? `${pct(Math.min(...allFutileDelivered))} / ${pct(q(allFutileDelivered, 0.5))} / ${pct(Math.max(...allFutileDelivered))}`
  : "—";
console.log(
  `${"ALL".padEnd(15)} ${"".padStart(4)} ${String(tTotal).padStart(7)} ` +
    `${String(tQuiet).padStart(7)} ${String(tPaid).padStart(7)} ${String(tFutile).padStart(8)} ` +
    `${(tTotal ? (100 * tFutile) / tTotal : 0).toFixed(1).padStart(7)}%  ${shotAll.padStart(28)}  ` +
    `${allFutileRequested.length ? pct(q(allFutileRequested, 0.5)) : "—"}`,
);
console.log(
  `\nfutile frames clamped to the world bounds: ${tFutileClamped} of ${tFutile}` +
    (tFutile ? ` (${((100 * tFutileClamped) / tFutile).toFixed(1)}%)` : ""),
);
if (allFutileStates.size) {
  console.log(
    `futile frames by camera state: ` +
      [...allFutileStates.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(", "),
  );
}
console.log(
  `frames the harness could not verify (stale or mismatched reconstruction): ${unverifiedTotal} ` +
    `— counted in the frames column and in nothing else`,
);
if (rows.length) console.log(formatIdentity(rows[0].identity));
