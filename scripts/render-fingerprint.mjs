// ============================================================
// File:        scripts/render-fingerprint.mjs
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// THE RENDER PATH'S OWN FINGERPRINT: one hash over the SEQUENCE OF DRAW CALLS the game makes, at
// fixed frames across ten tracks. It exists because "the picture did not change" has always been an
// ARGUMENT on this branch, and the camera fingerprint deliberately cannot make it a measurement —
// it covers what the DIRECTOR decides and stops at the edge of the canvas.
//
// WHAT IT DRIVES: `renderRaceFrame()`, the real drawing sequence the browser runs, through a
// recording stand-in for the 2D context. Not a copy of that sequence — the same function, so the
// instrument cannot drift away from the thing it measures.
//
// WHAT IS IN THE HASH: every drawing operation, in order, with its rounded arguments — which sprite
// at which position and size, which text where, which fill style, every save/restore/transform, and
// every gradient with its colour stops. Order is part of it: two layers swapped is a different
// frame even when every argument is identical.
//
// WHAT IS DELIBERATELY EXCLUDED, and why:
//   - `measureText` QUESTIONS. Measuring is not a mark on the canvas, and the answer already shows
//     up in the `fillText` that follows. Hashing the questions would make the fingerprint sensitive
//     to how often the layout asks rather than to what it draws.
//   - The background IMAGE bitmap. `bgImagePath` is null here, so the background takes its
//     procedural-gradient branch. Covered as a gradient; not covered as artwork.
//   - The config-fingerprint badge's live values, pinned below. They encode which config the RUN
//     used, which is already the thing this whole script holds fixed; letting them vary would make
//     the hash report its own inputs back at itself.
//
// WHAT IT IS BLIND TO. Three things, MEASURED rather than assumed — the first two were expected,
// the third was found by the sensitivity proof and is the honest limit of this instrument:
//   1. THE RASTERISER. If `fillRect` started painting the wrong pixels, this would not know.
//   2. THE ARTWORK. Sprites are recorded by identity, not content. Redraw a rocket and the hash
//      does not move. The owner's eye is the right instrument for that.
//   3. THE SPRITE BLIT ITSELF. `drawImage` is called ZERO times in this harness: node has no
//      `Image`, so the sprite cache never fills and `racerType.drawRacer` takes its PROCEDURAL
//      fallback branch — a real shipped path (it is what the first frames of every race draw
//      before sprites arrive), but not the steady-state picture. What IS covered for a racer is
//      everything around the body: position, angle, scale, dim alpha, highlight rings, name tags,
//      and the order of all of it. That is what a refactor breaks; the blit is not.
//      Also not exercised: PARTICLES and SURFACE TRAILS. Both draw from buffers the component's
//      loop fills, so in this harness both are empty and their two layers are no-ops. Discovered
//      by a sabotage that swapped them and did NOT move the hash. Named fix in the report.
//
// Usage:
//   node scripts/render-fingerprint.mjs             # the hash, plus a per-track breakdown
//   node scripts/render-fingerprint.mjs --quiet     # just the combined hash
//   node scripts/render-fingerprint.mjs --ops=<track>  # dump the call stream for one track
// ============================================================

import { createHash } from "node:crypto";
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
const { renderRaceFrame } = await import(
  u("client/src/screens/RaceScreen/renderRaceFrame.js")
);
const { attachRenderState, attachRacerRenderState, stepFocusFade } =
  await import(u("client/src/screens/RaceScreen/renderState.js"));
const { PHASE } = await import(u("client/src/screens/RaceScreen/racePhase.js"));
const { createRecordingContext } = await import(
  u("client/src/modules/parity/recordingContext.js")
);
const { DEFAULT_TRACK_LIGHTS, sampleBoundaryAtInterval, LIGHT_SPACING_PX } =
  await import(u("client/src/modules/trackLights.js"));
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
// CAMERA-REPRO-1 made the director's dice per-race. Pinned here for the same reason the world seed
// is: an unpinned die means the SHOT varies between runs and the hash is noise, not a measurement.
const CAM_SEED = 1439767152;
const QUIET = process.argv.includes("--quiet");
const OPS_FOR = (process.argv.find((a) => a.startsWith("--ops=")) ?? "").slice(
  6,
);

// THE SAMPLED FRAMES, and why these. Fixed indices, never events: "at the third lead change" is not
// reproducible, "at frame 600" is. Every race is driven for exactly RUN_FRAMES so the sample points
// exist on every track regardless of how long that track's race actually lasts.
//   0    the START FORMATION at the gun — the densest thing on screen, every name tag shown, and
//        the frame the owner looks at first
//   90   1.5 s in: the field is moving but still packed, and the tag-all window is still open
//   600  10 s: past the post-start hold, so the camera has begun choosing shots
//   1500 25 s: mid-race, field spread, battles plausible
//   2400 40 s
//   3300 55 s: late, and on the shorter tracks past the finish, so the FINISHED overlay is covered
const RUN_FRAMES = 3400;
const SAMPLE_AT = [0, 90, 600, 1500, 2400, 3300];

// Pinned so the badge reports the run's own fixed config rather than varying with it.
const CFG_BADGE = { hashShort: 'renderfp0', raceCount: 0, cosmeticCount: 0 };
// BUILD-TRUTH-1: a FIXED build identity, never the live one. The badge draws the real commit in the
// browser, but this hash must be a change detector for the DRAWING, not a counter that moves on every
// commit. A synthetic value keeps the new pill covered (its position, font and layout are hashed)
// while leaving the hash stable across commits — which is the whole point of the instrument.
const BUILD_BADGE = { commit: 'renderfp', branch: 'renderfp', dirty: false };

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

function trackHash(geo, wantOps) {
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
  // The SAME render-state definition the component uses, so the harness cannot invent a frame
  // shape the browser never produces.
  const st = attachRenderState(built.state);
  attachRacerRenderState(st.racers);
  const raceCfg = built.config;
  const meta = built.meta;

  const cd = new CameraDirector(
    geo.worldWidth,
    geo.worldHeight,
    shape.isOpen,
    DEFAULT_CAMERA_CONFIG,
    bodyRef,
    shape,
    TW,
  );
  cd.setRandomSeed(CAM_SEED);
  if (meta.racePlanEnabled && meta.rpPlanInfo?.b1Indices) {
    cd.updateRacePlan(meta.rpPlanInfo.b1Indices);
  }
  raceCfg.computePositions();

  const bsX = CW / geo.worldWidth;
  const bsY = CH / geo.worldHeight;
  // Same derivation the component uses: 800 edge samples, then one light every LIGHT_SPACING_PX.
  const { outer: edgeOuter, inner: edgeInner } = shape.getEdgePoints(800);
  const cachedLightPts = {
    outer: sampleBoundaryAtInterval(edgeOuter, LIGHT_SPACING_PX),
    inner: sampleBoundaryAtInterval(edgeInner, LIGHT_SPACING_PX),
  };
  const trackLightsConfig = geo.trackLights ?? DEFAULT_TRACK_LIGHTS;
  const raceData = {
    eventName: geo.name ?? geo.id,
    trackName: geo.id,
    subtitle: "",
  };

  const sample = new Set(SAMPLE_AT);
  const rec = createRecordingContext({
    width: CW,
    height: CH,
    keepOps: !!wantOps,
  });

  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;
  const cdMs = DEFAULT_CAMERA_CONFIG.countdownDurationMs ?? 4000;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, cdMs, CW, CH);
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;
  st.phase = PHASE.RACING;
  st.raceStart = raceStart;
  st.countdownStart = 0;
  const focusFadeMs = DEFAULT_CAMERA_CONFIG.battleSlowmoFadeDuration * 1000;

  let tagIncumbents = null;
  const leaderDiag = { snapshots: [], frozen: false };
  let drawn = 0;
  for (let frame = 0; frame < RUN_FRAMES; frame++) {
    accum += RAW;
    let steps = 0;
    while (accum >= FIXED_DT && steps++ < 2) {
      stepRacePhysics(st, raceCfg);
      accum -= FIXED_DT;
    }
    const cam = cd.update(
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

    // The BATTLE focus fade, by the component's own rule — without it the darkening never engages
    // and the fingerprint would be blind to exactly the effect the camera fingerprint cannot see.
    stepFocusFade(st, cd.hudState === "BATTLE_ZOOM", RAW, focusFadeMs);
    if (st.phase === PHASE.RACING && st.finishedCount >= N)
      st.phase = PHASE.FINISHED;

    if (sample.has(frame)) {
      // The frame marker keeps two sampled frames from hashing identically by accident, so a
      // fingerprint that "did not move" cannot be a sampler that silently stopped sampling.
      rec.fillText("##frame", frame, 0);
      const out = renderRaceFrame(rec, {
        ts,
        st,
        cam,
        shape,
        raceData,
        isOpenTrack: shape.isOpen,
        bsX,
        bsY,
        worldWidth: geo.worldWidth,
        worldHeight: geo.worldHeight,
        openTrackHW: shape.isOpen ? TW / 2 : 0,
        bgImagePath: null,
        bgCanvasReady: false,
        effects: [],
        cachedLightPts,
        trackLightsConfig,
        racerType: rt,
        cameraConfig: DEFAULT_CAMERA_CONFIG,
        camera: {
          hudState: cd.hudState,
          comebackLockedRacerIndex: cd.comebackLockedRacerIndex,
          detectBattleGroup: (racers) => cd.detectBattleGroup(racers),
        },
        displaySize: ds,
        displaySizeScale: br.bodyNarrow / ds,
        assignmentByRacer: meta.assignmentByRacer ?? new Map(),
        showRpStartRow: false,
        showRpMinimapBadges: false,
        rpPlanInfo: meta.rpPlanInfo ?? null,
        renderAlpha: 1,
        interpolationEnabled: false,
        tagIncumbents,
        // The BATTLE-DIAG marker buffer. Same shape the component's ref starts at; it is a
        // developer overlay that accumulates and then freezes, so it must be per-track (a shared
        // one would freeze after the first track and change what later tracks draw).
        leaderDiag,
        cfgBadge: CFG_BADGE,
        buildBadge: BUILD_BADGE,
        racePlanActive: true,
        racePlanSeed: SEED,
        gapRerollDevMarker: false,
        canvasW: CW,
        canvasH: CH,
      });
      tagIncumbents = out.tagShown;
      drawn++;
    }
    ts += RAW;
  }

  return {
    hash: rec.digest(),
    ops: rec.opCount,
    drawn,
    opsList: wantOps ? rec.ops : null,
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

if (OPS_FOR) {
  const geo = geos.find((g) => g.id === OPS_FOR);
  if (!geo) {
    console.error(
      `no such track: ${OPS_FOR} (have: ${geos.map((g) => g.id).join(", ")})`,
    );
    process.exit(1);
  }
  const { opsList } = trackHash(geo, true);
  for (const line of opsList) console.log(line);
  process.exit(0);
}

const combined = createHash("sha256");
const rows = [];
for (const geo of geos) {
  const { hash, ops, drawn } = trackHash(geo, false);
  combined.update(geo.id + ":" + hash + "\n");
  rows.push({ id: geo.id, hash, ops, drawn });
}
const COMBINED = combined.digest("hex").slice(0, 16);

if (QUIET) {
  console.log(COMBINED);
} else {
  console.log(
    `RENDER ${COMBINED} (seed=${SEED} camSeed=${CAM_SEED}, ${geos.length} tracks, ${N} racers, ` +
      `frames [${SAMPLE_AT.join(", ")}] of ${RUN_FRAMES})`,
  );
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(16)} ${r.hash}  ${r.ops} ops / ${r.drawn} frames`,
    );
  }
  console.log(
    "\n  Covers the DRAW CALL SEQUENCE — sprites, text, styles, transforms, order.\n" +
      "  Blind to the rasteriser and to the artwork itself (sprites are hashed by identity).",
  );
}
