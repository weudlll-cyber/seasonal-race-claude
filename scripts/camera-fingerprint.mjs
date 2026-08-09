// ============================================================
// File:        scripts/camera-fingerprint.mjs
// Project:     RaceArena — CAMERA-HYGIENE-1
//
// THE CAMERA'S OWN FINGERPRINT: one hash over everything the camera decides, across ten tracks and
// every frame of a seeded race. It exists because hygiene has an unusual and very good acceptance
// test — a refactor that tidies code must not move the picture, and unlike a tuning change that is
// PROVABLE rather than arguable.
//
// WHAT IT HASHES, per frame: the camera state, the lerp phase, the anchor, the zoom, both offsets,
// the camera's track parameter, and the resolved targets. Rounded to 1e-6 so IEEE noise in an
// unchanged expression cannot register as a change, but nothing coarser — a refactor that alters a
// zoom by a thousandth has altered the picture and must say so.
//
// WHAT IT DOES NOT COVER, stated so nobody over-trusts it: the RENDER path. Sprite scale, name-tag
// layout and the drawing itself are not in this hash, because they are not the director's output.
// A change to those must be argued another way.
//
// Usage:
//   node scripts/camera-fingerprint.mjs            # the hash, plus a per-track breakdown
//   node scripts/camera-fingerprint.mjs --quiet    # just the combined hash
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
const __t0 = Date.now();
process.on("exit", () => {
  // NIGHT-TOOLS-1: MACHINE-READABLE, because a human string has to be re-parsed by
  // whatever generates the ceremony's cost column, and a parser of prose is the defect
  // that column already had. `scripts/gen-ceremony-costs.mjs` reads exactly this token.
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)
`);
});

import { createHash } from "node:crypto";
import { isCheap, cheapTracks, cheapBanner, cheapHash, refuseCheapQuiet } from "./lib/cheapMode.mjs";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

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
const RT = await (async () => {
  const re = console.error;
  console.error = () => {};
  try {
    return await import(u("client/src/modules/racer-types/index.js"));
  } finally {
    console.error = re;
  }
})();

const CW = 1280;
const CH = 720;
const N = 40;
const SEED = 5601;
const CAM_SEED = 1439767152;
const QUIET = process.argv.includes("--quiet");
// VERIFY-COST-2: --cheap runs ONE track so a wiring or formatting check costs seconds. The hash
// it prints is NOT the fingerprint and is shaped so it cannot be mistaken for one.
refuseCheapQuiet();
const CHEAP = isCheap();
// CAMERA-COMPANY-ONLY-1 probe. Off by default, so the DEFAULT invocation — the one the ceremony and
// every gate use — is untouched. With it, the hash is a PROBE VALUE, not a baseline.
const COMPANY_ONLY = process.argv.includes("--company-only");
const CAM_CFG = COMPANY_ONLY
  ? { ...DEFAULT_CAMERA_CONFIG, companyOnlyFraming: true }
  : DEFAULT_CAMERA_CONFIG;

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

const r6 = (v) =>
  v == null || !Number.isFinite(v)
    ? "n"
    : (Math.round(v * 1e6) / 1e6).toString();

function trackHash(geo) {
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

  const h = createHash("sha256");
  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;
  // START-BOARD-2: the countdown has no length of its own any more — it is the SUM of the
  // ceremony beats, one of which scales with the field. The director is asked, so this harness
  // cannot drift from the game the way a second copy of a duration would.
  const cdMs = cd.ceremonySchedule(st.racers).totalMs;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, CW, CH);
    h.update(`c|${r6(cd.zoom)}|${r6(cd.offsetX)}|${r6(cd.offsetY)}\n`);
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;
  let frames = 0;
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
    h.update(
      [
        cd.state,
        cd.lerpPhase,
        cd.anchorRacerLabel ?? "-",
        r6(cd.zoom),
        r6(cd.offsetX),
        r6(cd.offsetY),
        r6(cd.targetZoom),
        r6(cd.targetOffsetX),
        r6(cd.targetOffsetY),
        r6(cd.camT),
      ].join("|") + "\n",
    );
    frames++;
    ts += RAW;
  }
  return { hash: h.digest("hex").slice(0, 16), frames };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));
const RUN_GEOS = CHEAP ? cheapTracks(geos, (g) => g.id) : geos;
if (CHEAP) console.log(cheapBanner("camera", `One track (${RUN_GEOS[0].id}) of ${geos.length}.`));

const combined = createHash("sha256");
const rows = [];
for (const geo of RUN_GEOS) {
  const { hash, frames } = trackHash(geo);
  combined.update(geo.id + ":" + hash + "\n");
  rows.push({ id: geo.id, hash, frames });
}
// The cheap hash carries a prefix so it CANNOT match the 16-hex shape the record and the
// containment guard expect. A cheap run must be unable to impersonate a measurement.
const COMBINED = CHEAP
  ? cheapHash(combined.digest("hex"))
  : combined.digest("hex").slice(0, 16);

if (QUIET) {
  console.log(COMBINED);
} else {
  console.log(
    `CAMERA ${COMBINED} (seed=${SEED} camSeed=${CAM_SEED}, ${RUN_GEOS.length} tracks, ${N} racers, ` +
      `${COMPANY_ONLY ? "PROBE: companyOnlyFraming=true — NOT a baseline" : "default config"})`,
  );
  for (const r of rows)
    console.log(`  ${r.id.padEnd(16)} ${r.hash}  ${r.frames} frames`);
  console.log(
    "\n  Covers the DIRECTOR only — state, phase, anchor, zoom, offsets, camT, targets.\n" +
      "  Not the render path (sprite scale, name-tag layout, drawing).",
  );
  if (CHEAP) console.log(cheapBanner("camera", `One track (${RUN_GEOS[0].id}) of ${geos.length}.`));
}
