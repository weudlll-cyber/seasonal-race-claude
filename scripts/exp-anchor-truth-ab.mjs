// ============================================================
// File:        scripts/exp-anchor-truth-ab.mjs
// Project:     RaceArena — ANCHOR-TRUTH-EYE-1 (read-only measurement)
//
// THE QUESTION: docs/CAMERA_DIRECTOR.md §8.1 records an open eye-test debt on CAMERA-ANCHOR-TRUTH-1.
// Before spending the owner's time on a sitting, HOW FAR APART are the two camera paths? A
// fingerprint says "different"; it cannot say "different enough to see".
//
// ── WHY THIS IS NOT A NEW INSTRUMENT ────────────────────────────────────────────────────────────
//
// It drives the race and the director EXACTLY as `scripts/camera-fingerprint.mjs` does — the same
// N, the same race seed, the same camera seed, the same construction — and then, instead of hashing
// `state | zoom | offsetX | offsetY | …`, it writes them out. The comparison is expressed in the two
// units this project already has for the camera:
//
//   canvas px and PERCENTAGE POINTS OF FRAME — `scripts/tracking-lag.mjs`'s unit, because
//     `offsetX` is a canvas-px pan offset (projection.js `toScreen`), so a difference in it is
//     literally how far the picture slid on screen.
//   cam.zoom, as a percentage of the shipped zoom — the fingerprint's own quantity.
//
// No new metric is invented. The one derived number is THE SHOT-CENTRE DISPLACEMENT: take the world
// point at the centre of arm A's frame, ask where arm B puts it on screen, and report the distance.
// That folds a zoom difference and a pan difference into the one thing a viewer actually sees —
// how far the picture moved — and it is still measured in points of frame.
//
// ── THE TWO REGIMES ─────────────────────────────────────────────────────────────────────────────
//
// The anchor work is about FOLLOWING and SWITCHING, and those differ between a tight pack and a
// torn-apart field. Every frame carries the field spread, and the comparison is reported for the
// tight half and the torn half separately, split at each track's own median so both halves are
// populated on every track and no threshold has to be defended.
//
// Usage:
//   node scripts/exp-anchor-truth-ab.mjs --out=<file.json> [--overview-tc=1.5,1.5]
//   node scripts/exp-anchor-truth-ab.mjs --compare=<A.json>,<B.json> [--label=…]
// ============================================================

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const arg = (k) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : null;
};
const OUT = arg("out");
const COMPARE = arg("compare");
const TC = arg("overview-tc");
const LABEL = arg("label") ?? "";

// The reference canvas, declared HERE rather than beside the driver: compare mode runs before the
// driver's own block and would otherwise read these in their temporal dead zone.
const CW = 1280;
const CH = 720;

// ── COMPARE MODE ────────────────────────────────────────────────────────────────────────────────
if (COMPARE) {
  const [fa, fb] = COMPARE.split(",");
  const A = JSON.parse(readFileSync(fa, "utf8"));
  const B = JSON.parse(readFileSync(fb, "utf8"));
  compare(A, B);
  process.exit(0);
}
if (!OUT) {
  console.error(
    "usage: --out=<file.json> [--overview-tc=a,b]   |   --compare=<A.json>,<B.json>",
  );
  process.exit(2);
}

// ── THE DRIVER, mirrored from camera-fingerprint.mjs ─────────────────────────────────────────────
const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { EditorShape } = await import(
  u("client/src/modules/track-editor/EditorShape.js")
);
const { CameraDirector } = await import(
  u("client/src/modules/camera/CameraDirector.js")
);
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u("client/src/modules/raceCore.js")
);
const { normalSpeedFrom } = await import(
  u("client/src/modules/durationModel.js")
);
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u("client/src/modules/rowLayout.js")
);
const { projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);
const RT = await (async () => {
  const re = console.error;
  console.error = () => {};
  try {
    return await import(u("client/src/modules/racer-types/index.js"));
  } finally {
    console.error = re;
  }
})();

const N = 40;
const SEED = 5601;
const CAM_SEED = 1439767152;

/** The camera config, with OVERVIEW's time constants optionally overridden — tracking-lag's flag. */
function cameraConfig() {
  if (!TC) return DEFAULT_CAMERA_CONFIG;
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CAMERA_CONFIG));
  const prof = cfg.cameraStateProfiles?.OVERVIEW ?? cfg.stateProfiles?.OVERVIEW;
  if (!prof) throw new Error("cannot find the OVERVIEW profile to override");
  const [t, e] = TC.split(",").map(Number);
  prof.trackingTC = t;
  prof.entryTC = e;
  return cfg;
}
const CAM_CFG = cameraConfig();

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

function runTrack(geo) {
  const shape = new EditorShape(geo);
  const TW = geo.width ?? shape.getActualTrackWidth();
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const rt = RT.getRacerType(geo.defaultRacerTypeId ?? "horse");
  const ds = rt.config.displaySize;
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const bfL = Math.max(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const pss = computeRacerLayout(effW, N, ds, W.autoScaleConfig).spriteSize;
  const br = computeBodyNarrowRef(
    Math.min(285, effW),
    N,
    ds,
    bfN,
    W.autoScaleConfig,
  );
  const bodyRef = ds * (br.bodyNarrow / ds);
  const built = createRaceFromIdentity({
    shape,
    isOpenTrack: shape.isOpen,
    pathLengthPx: geo.pathLengthPx ?? 0,
    trackWidthPx: TW,
    speedMultiplier: rt.getSpeedMultiplier(),
    baseSpeedConfig: W.baseSpeedConfig,
    behaviorConfig,
    rowConfig: W.rowLayoutConfig,
    dynamicsConfig: W.raceDynamicsConfig,
    normalSpeedPxPerSec: normalSpeedFrom(W.baseSpeedConfig),
    laps: shape.isOpen ? 1 : 2,
    requestedSeconds: 60,
    nRacers: N,
    racePlanSeed: SEED,
    racePlanEnabledFlag: true,
    physicalSpriteSize: pss,
    drawnBodyWidthRefPx: bodyRef,
    bodyFillNarrow: bfN,
    bodyFillLong: bfL,
    constSpeedActive: false,
  });
  const st = built.state;
  const raceCfg = built.config;
  const meta = built.meta;
  const cd = new CameraDirector(
    geo.worldWidth,
    geo.worldHeight,
    shape.isOpen,
    CAM_CFG,
    bodyRef,
    shape,
    TW,
  );
  cd.setRandomSeed(CAM_SEED);
  if (meta.racePlanEnabled && meta.rpPlanInfo?.b1Indices) {
    cd.updateRacePlan(meta.rpPlanInfo.b1Indices);
  }
  raceCfg.computePositions();
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, shape.isOpen);

  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;
  const cdMs = cd.ceremonySchedule(st.racers).totalMs;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, CW, CH);
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;

  // Per frame: what the fingerprint hashes, plus the field spread that decides the regime.
  const state = [];
  const zoom = [];
  const ox = [];
  const oy = [];
  const spread = [];
  while (st.finishedCount < N && ts - raceStart < 200000) {
    accum += RAW;
    let steps = 0;
    while (accum >= FIXED_DT && steps++ < 2) {
      stepRacePhysics(st, raceCfg);
      accum -= FIXED_DT;
    }
    cd.update(
      st.racers,
      ts,
      {
        raceElapsed: ts - raceStart,
        finishedCount: st.finishedCount,
        winner: st.racers.find((r) => r.finishRank === 1) ?? null,
        finishT: st.finishT,
        isOutcomePhase: false,
        physicsRacers: st.racers,
      },
      CW,
      CH,
      RAW,
    );
    // THE REGIME: how torn apart the field is, as the leader-to-last progress gap. Racers who have
    // finished are excluded — they are no longer part of the pack the camera is trying to hold.
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of st.racers) {
      if (r.finished) continue;
      if (r.t < lo) lo = r.t;
      if (r.t > hi) hi = r.t;
    }
    state.push(cd.state);
    zoom.push(cd.zoom);
    ox.push(cd.offsetX);
    oy.push(cd.offsetY);
    spread.push(Number.isFinite(hi - lo) ? hi - lo : 0);
    ts += RAW;
  }
  return {
    id: geo.id,
    axisX: proj.axisX,
    axisY: proj.axisY,
    state,
    zoom,
    ox,
    oy,
    spread,
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

const tracks = [];
for (const geo of geos) {
  const t = runTrack(geo);
  tracks.push(t);
  console.log(`  ${t.id.padEnd(16)} ${t.state.length} frames`);
}
// A hash of the dump, so two runs of the SAME arm can be shown to be identical rather than assumed.
const h = createHash("sha256");
for (const t of tracks)
  h.update(`${t.id}|${t.zoom.join(",")}|${t.ox.join(",")}|${t.oy.join(",")}\n`);
writeFileSync(
  OUT,
  JSON.stringify({
    arm: TC ? `overview-tc=${TC}` : "shipped-config",
    seed: SEED,
    camSeed: CAM_SEED,
    n: N,
    dumpHash: h.digest("hex").slice(0, 16),
    tracks,
  }),
);
console.log(`\nwritten: ${OUT}`);

// ── THE COMPARISON ──────────────────────────────────────────────────────────────────────────────
function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Share of frames whose difference exceeds `t` points of frame — the "how often" behind a median. */
function share(a, t) {
  if (!a.length) return 0;
  return (100 * a.filter((x) => x > t).length) / a.length;
}
function p95(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.round(0.95 * (s.length - 1)))];
}

function compare(A, B) {
  console.log(`\nARM A: ${A.arm}  (dump ${A.dumpHash})`);
  console.log(`ARM B: ${B.arm}  (dump ${B.dumpHash})`);
  if (A.dumpHash === B.dumpHash) {
    console.log(
      "\n  THE TWO DUMPS ARE IDENTICAL. Whatever was varied did not reach the camera path.\n",
    );
  }
  console.log(
    `\n${"track".padEnd(16)} ${"regime".padEnd(6)} ${"frames".padStart(6)} ` +
      `${"stateΔ%".padStart(8)} ${"centre pp med".padStart(14)} ${"pp p95".padStart(7)} ${"pp max".padStart(7)} ` +
      `${"zoom% med".padStart(10)} ${"zoom% p95".padStart(10)}`,
  );
  const pooled = { all: [], tight: [], torn: [] };
  const pooledZ = { all: [], tight: [], torn: [] };
  let stateDiffAll = 0;
  let framesAll = 0;
  // POOLED BY CAMERA STATE TOO. A median over every frame hides a change confined to one shot: a
  // difference that only exists in OVERVIEW is invisible in a pooled median and obvious on screen.
  const byState = new Map();

  for (const ta of A.tracks) {
    const tb = B.tracks.find((t) => t.id === ta.id);
    if (!tb) continue;
    const n = Math.min(ta.state.length, tb.state.length);
    const cut = median(ta.spread.slice(0, n));
    const rows = { all: [], tight: [], torn: [] };
    const zrows = { all: [], tight: [], torn: [] };
    const sdiff = { all: 0, tight: 0, torn: 0 };
    const cnt = { all: 0, tight: 0, torn: 0 };

    for (let i = 0; i < n; i++) {
      // THE SHOT CENTRE, as a world point under arm A, seen through arm B's camera.
      const wx = (CW / 2 - ta.ox[i]) / (ta.zoom[i] * ta.axisX);
      const wy = (CH / 2 - ta.oy[i]) / (ta.zoom[i] * ta.axisY);
      const sxB = wx * tb.zoom[i] * tb.axisX + tb.ox[i];
      const syB = wy * tb.zoom[i] * tb.axisY + tb.oy[i];
      // In POINTS OF FRAME on each axis, then combined — tracking-lag.mjs's unit.
      const ppx = (100 * (sxB - CW / 2)) / CW;
      const ppy = (100 * (syB - CH / 2)) / CH;
      const pp = Math.hypot(ppx, ppy);
      const zpct = (100 * Math.abs(tb.zoom[i] - ta.zoom[i])) / ta.zoom[i];
      const bucket = ta.spread[i] <= cut ? "tight" : "torn";
      if (!byState.has(ta.state[i])) byState.set(ta.state[i], []);
      byState.get(ta.state[i]).push(pp);
      for (const k of ["all", bucket]) {
        rows[k].push(pp);
        zrows[k].push(zpct);
        cnt[k]++;
        if (ta.state[i] !== tb.state[i]) sdiff[k]++;
      }
    }
    for (const k of ["all", "tight", "torn"]) {
      pooled[k].push(...rows[k]);
      pooledZ[k].push(...zrows[k]);
    }
    stateDiffAll += sdiff.all;
    framesAll += cnt.all;

    for (const k of ["all", "tight", "torn"]) {
      console.log(
        `${(k === "all" ? ta.id : "").padEnd(16)} ${k.padEnd(6)} ${String(cnt[k]).padStart(6)} ` +
          `${((100 * sdiff[k]) / (cnt[k] || 1)).toFixed(1).padStart(8)} ` +
          `${median(rows[k]).toFixed(2).padStart(14)} ${p95(rows[k]).toFixed(2).padStart(7)} ` +
          `${Math.max(...rows[k], 0).toFixed(2).padStart(7)} ` +
          `${median(zrows[k]).toFixed(2).padStart(10)} ${p95(zrows[k]).toFixed(2).padStart(10)}`,
      );
    }
  }

  console.log(
    `\nPOOLED over every track — the shot centre moves this many POINTS OF FRAME between the arms:`,
  );
  for (const k of ["all", "tight", "torn"]) {
    console.log(
      `  ${k.padEnd(6)} n=${String(pooled[k].length).padStart(6)}  ` +
        `median ${median(pooled[k]).toFixed(2)} pp   p95 ${p95(pooled[k]).toFixed(2)} pp   ` +
        `max ${Math.max(...pooled[k], 0).toFixed(2)} pp   |   ` +
        `zoom median ${median(pooledZ[k]).toFixed(2)}%  p95 ${p95(pooledZ[k]).toFixed(2)}%  ` +
        `| frames over 1/5/10 pp: ${share(pooled[k], 1).toFixed(1)}% / ${share(pooled[k], 5).toFixed(1)}% / ${share(pooled[k], 10).toFixed(1)}%`,
    );
  }
  console.log(`\nBY CAMERA STATE — where the difference actually lives:`);
  for (const [s, xs] of [...byState].sort((a, b) => b[1].length - a[1].length)) {
    console.log(
      `  ${String(s).padEnd(16)} n=${String(xs.length).padStart(6)}  ` +
        `median ${median(xs).toFixed(2)} pp   p95 ${p95(xs).toFixed(2)} pp   max ${Math.max(...xs, 0).toFixed(2)} pp   ` +
        `| frames over 1/5/10 pp: ${share(xs, 1).toFixed(1)}% / ${share(xs, 5).toFixed(1)}% / ${share(xs, 10).toFixed(1)}%`,
    );
  }
  console.log(
    `\n  the two arms are in a DIFFERENT camera state on ${((100 * stateDiffAll) / (framesAll || 1)).toFixed(1)}% ` +
      `of ${framesAll} frames${LABEL ? `  (${LABEL})` : ""}\n`,
  );
}
