// ============================================================
// File:        scripts/lib/raceDriver.mjs
// Project:     RaceArena — ONE-DRIVER-1
//
// WHAT THIS IS FOR: building and running one seeded race for a MEASUREMENT harness, and returning the
// RACE IDENTITY it ran so the harness can print it. One driver, so four scripts cannot drift apart
// while their numbers are read side by side.
//
// WHY THE IDENTITY IS THE POINT, not the deduplication. The four callers were never identical and
// were not meant to be: `his-shot-truth` runs the OWNER'S real race context (n=65, boarder, his
// camera seed) taken from his marker, while the other three run n=40 on each track's own default
// racer. That is correct. The defect was that nothing SAID so where the numbers are read — NIGHT-1
// put a figure measured at n=65 beside figures measured at n=40. So this module has no hidden
// defaults: every value a run depends on is named in the identity, and the identity comes back out.
//
// THE COUNTDOWN, decided rather than picked. Two callers took it from `DEFAULT_CAMERA_CONFIG`, two
// from the config actually being run. **The config being run wins.** A measurement harness exists to
// run a race under a GIVEN config, and the countdown is part of that config: reading the default
// while running a modified one would desynchronise the warm-up from the thing under test. These
// scripts override camera settings routinely (`--overview-tc`, the owner's settings, a per-track
// reference width), so the wrong source is a live hazard rather than a theoretical one. It has not
// bitten only because nobody has yet overridden that one key — the two sources agree today, which is
// why switching to it reproduces every prior number exactly.
//
// WHAT THIS IS NOT FOR: the fingerprint instruments. `camera-fingerprint.mjs` and
// `render-fingerprint.mjs` also build races and are deliberately NOT ported. They are the gate this
// refactor is measured against, and a tool that changes in the same commit it is meant to validate
// cannot validate it — that circularity is the exact failure this module's own header warns about.
// `camera-replay.mjs` is likewise left alone: it takes its identity from the owner's marker rather
// than from constants, so it has no drift to fix and it is his live repro tool.
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CONFIG_WORLD } = await import(
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
  // The racer-type registry logs to stderr on load; silenced here so a harness's output is its own.
  const re = console.error;
  console.error = () => {};
  try {
    return await import(u("client/src/modules/racer-types/index.js"));
  } finally {
    console.error = re;
  }
})();

export { RT, DEFAULT_CONFIG_WORLD };

/** The racer-type sentinel meaning "whatever this track declares as its own default". */
export const TRACK_DEFAULT_RACER = "track-default";

/**
 * The RACE IDENTITY — everything that makes two runs comparable or not.
 *
 * There are NO hidden defaults: a caller that omits a field gets the value below AND sees it in the
 * returned identity, so an omission can never silently differ between two harnesses.
 */
export function resolveIdentity(partial = {}) {
  return {
    racers: partial.racers ?? 40,
    raceSeed: partial.raceSeed ?? 5601,
    cameraSeed: partial.cameraSeed ?? 1439767152,
    // A racer-type id, or TRACK_DEFAULT_RACER to take each track's own `defaultRacerTypeId`.
    racerType: partial.racerType ?? TRACK_DEFAULT_RACER,
    seconds: partial.seconds ?? 60,
    canvasW: partial.canvasW ?? 1280,
    canvasH: partial.canvasH ?? 720,
    // A free-text note naming WHY this identity is what it is; printed with the rest.
    note: partial.note ?? "",
  };
}

/** The one line every harness prints. It carries exactly the values that make two runs incomparable. */
export function formatIdentity(id) {
  const parts = [
    `n=${id.racers}`,
    `raceSeed=${id.raceSeed}`,
    `camSeed=${id.cameraSeed}`,
    `racer=${id.racerType}`,
    `${id.seconds}s`,
    `${id.canvasW}x${id.canvasH}`,
  ];
  return `RACE IDENTITY: ${parts.join(" · ")}${id.note ? `  (${id.note})` : ""}`;
}

/**
 * A track's corridor width, WITHOUT building a race.
 *
 * Exposed because a caller may need it to shape the camera config before `buildRace` constructs the
 * director — `his-shot-truth --owner-unit` sets `referenceCorridorPx` to each track's own width, and
 * doing that after construction would silently do nothing.
 */
export function trackWidthOf(geo) {
  return geo.width ?? new EditorShape(geo).getActualTrackWidth();
}

/** Every track geometry, sorted by id. Prefers the owner's live data dir over the shipped seeds. */
export function loadTracks({ only = null } = {}) {
  const dir = existsSync(join(ROOT, "server/data/tracks"))
    ? join(ROOT, "server/data/tracks")
    : join(ROOT, "server/seeds/tracks");
  const geos = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (j.id && (!only || j.id === only)) geos.push(j);
  }
  geos.sort((a, b) => a.id.localeCompare(b.id));
  return geos;
}

/**
 * Build one race + camera for a track under an identity and a camera config.
 *
 * @returns everything a harness needs to drive and interpret the run, including `trackWidthPx`,
 *   the resolved racer type, and the drawn-body reference the camera was constructed with.
 */
export function buildRace(geo, identity, cameraConfig) {
  const shape = new EditorShape(geo);
  const trackWidthPx = geo.width ?? shape.getActualTrackWidth();
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const racerTypeId =
    identity.racerType === TRACK_DEFAULT_RACER
      ? (geo.defaultRacerTypeId ?? "horse")
      : identity.racerType;
  const rt = RT.getRacerType(racerTypeId);
  const ds = rt.config.displaySize;
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const bfL = Math.max(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = trackWidthPx * behaviorConfig.startSpreadRange;
  const pss = computeRacerLayout(
    effW,
    identity.racers,
    ds,
    W.autoScaleConfig,
  ).spriteSize;
  const br = computeBodyNarrowRef(
    Math.min(285, effW),
    identity.racers,
    ds,
    bfN,
    W.autoScaleConfig,
  );
  const bodyRef = ds * (br.bodyNarrow / ds);

  const built = createRaceFromIdentity({
    shape,
    isOpenTrack: shape.isOpen,
    pathLengthPx: geo.pathLengthPx ?? 0,
    trackWidthPx,
    speedMultiplier: rt.getSpeedMultiplier(),
    baseSpeedConfig: W.baseSpeedConfig,
    behaviorConfig,
    rowConfig: W.rowLayoutConfig,
    dynamicsConfig: W.raceDynamicsConfig,
    normalSpeedPxPerSec: normalSpeedFrom(W.baseSpeedConfig),
    laps: shape.isOpen ? 1 : 2,
    requestedSeconds: identity.seconds,
    nRacers: identity.racers,
    racePlanSeed: identity.raceSeed,
    racePlanEnabledFlag: true,
    physicalSpriteSize: pss,
    drawnBodyWidthRefPx: bodyRef,
    bodyFillNarrow: bfN,
    bodyFillLong: bfL,
    constSpeedActive: false,
  });

  const cd = new CameraDirector(
    geo.worldWidth,
    geo.worldHeight,
    shape.isOpen,
    cameraConfig,
    bodyRef,
    shape,
    trackWidthPx,
  );
  cd.setRandomSeed(identity.cameraSeed);
  if (built.meta.racePlanEnabled && built.meta.rpPlanInfo?.b1Indices) {
    cd.updateRacePlan(built.meta.rpPlanInfo.b1Indices);
  }
  built.config.computePositions();

  return {
    shape,
    trackWidthPx,
    racerTypeId,
    racerType: rt,
    displaySize: ds,
    bodyRef,
    st: built.state,
    raceCfg: built.config,
    meta: built.meta,
    cd,
  };
}

/**
 * Drive the countdown and then the race, calling `onFrame` once per rendered frame.
 *
 * The loop is the one all four harnesses already ran: a 60 Hz frame clock, at most two fixed physics
 * steps per frame, and a 200 s wall-clock ceiling so a stuck race cannot hang a sweep.
 *
 * TWO ADDITIVE HOOKS, for harnesses that measure a WINDOW rather than a race. `onCountdownFrame`
 * sees the ceremony (the frame before the gun is the reference every start-window measurement is
 * expressed against, and it is unreachable from outside because the countdown runs in here), and an
 * `onFrame` that returns exactly `false` stops the loop. Both are opt-in: an existing caller returns
 * `undefined` and passes no countdown hook, so it runs the identical loop it always ran. The
 * alternative was a second frame loop in the window harness, and two loops disagreeing about dt or
 * the physics-step cap is precisely the drift this one driver exists to prevent.
 *
 * @param {(ctx: {cd, st, ts, raceStart, frame}) => void|false} onFrame  called AFTER cd.update();
 *   return `false` to stop the run
 * @param {{onCountdownFrame?: (ctx: {cd, st, ts, elapsed, countdownMs}) => void}} [hooks]
 */
export function runRace(race, identity, cameraConfig, onFrame, hooks = {}) {
  const { st, raceCfg, cd } = race;
  const { canvasW: CW, canvasH: CH } = identity;
  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;

  // THE COUNTDOWN SOURCE, decided in this file's header: the config being RUN, not the shipped
  // default. A harness that overrides camera settings must warm up under the settings it measures.
  // START-BOARD-2: the countdown has no length of its own any more — it is the SUM of the
  // ceremony beats, one of which scales with the field. The director is asked, so this harness
  // cannot drift from the game the way a second copy of a duration would.
  const cdMs = cd.ceremonySchedule(st.racers).totalMs;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, CW, CH);
    hooks.onCountdownFrame?.({ cd, st, ts, elapsed: ts, countdownMs: cdMs });
    ts += RAW;
  }

  const raceStart = ts;
  st.physicsTs = 0;
  let frame = 0;
  while (st.finishedCount < identity.racers && ts - raceStart < 200000) {
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
    const verdict = onFrame({ cd, st, ts, raceStart, frame });
    frame++;
    ts += RAW;
    if (verdict === false) break;
  }
  return { frames: frame, endTs: ts };
}
