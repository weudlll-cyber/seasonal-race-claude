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
//   4. THE CEREMONY'S DOM. The brand card and the corner logo are React components, not canvas, so
//      no fingerprint of draw calls can ever see them. RENDER-SAMPLER-CEREMONY turns the brand ON
//      so the BRAND BEAT exists and its canvas — the venue shot, held — is sampled; the CARD on top
//      of it is still nobody's measurement but the owner's eye.
//
// WHERE IT SAMPLES THE CEREMONY, and this was a blind spot for one whole ship: the countdown points
// are DERIVED from the schedule (`scripts/lib/ceremonySamples.mjs`), one per beat. They used to be
// five typed milliseconds, and CEREMONY-OPENING moved the starters board past the last of them —
// so the board, the settled beat and the digits were outside the instrument and the hash said
// nothing about it. Proven both ways: the heading text changed under the OLD points is
// byte-identical, and under the new ones it moves.
//
// Usage:
//   node scripts/render-fingerprint.mjs             # the hash, plus a per-track breakdown
//   node scripts/render-fingerprint.mjs --quiet     # just the combined hash
//   node scripts/render-fingerprint.mjs --ops=<track>  # dump the call stream for one track
//   node scripts/render-fingerprint.mjs --phases    # where each camera phase begins, per track
//   node scripts/render-fingerprint.mjs --coverage  # what each sample point CATCHES, per track
//
// COST: ~77 s, up from ~28 s (FINISH-WINDOW-1). Almost all of the increase is the longer RUN — the
// frame loop to 5600 alone costs ~71 s, and the ten extra DRAWN frames add only ~7 s. So if this
// ever needs to get cheaper, the loop is where to spend, not the sample count: the frames between
// the samples are the expensive part and only exist to advance the race to the next one.
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "render-fingerprint",
  covers:
    "the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms and layer order",
  blind: [
    "the rasteriser and the artwork — it records calls, not pixels",
    "the sprite blit itself: node has no Image, so the racer body falls back to its procedural branch",
  ],
  dirs: [],
  files: [],
  reach: [
    "client/src/screens/RaceScreen/renderRaceFrame.js",
    "client/src/modules/camera/CameraDirector.js",
    "client/src/modules/raceCore.js",
    "client/src/modules/storage/defaults.js",
    "client/src/modules/parity/recordingContext.js",
  ],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

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
import {
  isCheap,
  cheapTracks,
  cheapBanner,
  cheapHash,
  refuseCheapQuiet,
} from "./lib/cheapMode.mjs";
import { ceremonySamplePoints } from "./lib/ceremonySamples.mjs";
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
// The board's fade length, from the module that owns it, so the sampler's board-fade point cannot
// drift from the ramp it is aiming at.
const { BOARD_FADE_MS } = await import(
  u("client/src/modules/camera/startCeremony.js")
);
const { createRecordingContext } = await import(
  u("client/src/modules/parity/recordingContext.js")
);
const { DEFAULT_TRACK_LIGHTS, sampleBoundaryAtInterval, LIGHT_SPACING_PX } =
  await import(u("client/src/modules/trackLights.js"));
// HARNESS-NAMES-1: the roster comes from racerNames.js, the ONE home, rather than a list typed here.
// A second copy of a name list is the exact bug that file's own header was written about — and in
// this project a racer's NAME is an engine input, so a divergent copy is not a tidiness problem.
const { QUICK_TEST_NAMES_MIXED: HARNESS_NAMES } = await import(
  u("client/src/modules/racerNames.js")
);
const { assignRaceNumbers } = await import(
  u("client/src/modules/raceNumbers.js")
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
// CAMERA-REPRO-1 made the director's dice per-race. Pinned here for the same reason the world seed
// is: an unpinned die means the SHOT varies between runs and the hash is noise, not a measurement.
const CAM_SEED = 1439767152;
const QUIET = process.argv.includes("--quiet");
// VERIFY-COST-2: --cheap runs ONE track with EVERY sample point, so a wiring or formatting check
// costs seconds while still exercising each code path the instrument has. Fewer sample points on
// all ten tracks would be the wrong trade: it would stop exercising the thing being checked.
refuseCheapQuiet();
const CHEAP = isCheap();
const OPS_FOR = (process.argv.find((a) => a.startsWith("--ops=")) ?? "").slice(
  6,
);

// FINISH-WINDOW-1 diagnostic. Reports, per track, the frame at which each camera phase FIRST
// appears and when the race actually ends — the numbers the sample points below have to be chosen
// against. It runs THIS harness's own loop rather than a copy of it, because a sampler chosen
// against a reconstruction of the run is exactly how the window came to miss the ending in the
// first place. Hashing is skipped; the hash path is untouched when the flag is absent.
//   node scripts/render-fingerprint.mjs --phases            # at the shipped RUN_FRAMES
//   node scripts/render-fingerprint.mjs --phases --frames=6000
const PHASES = process.argv.includes("--phases");
// FINISH-WINDOW-1: what each SAMPLE point actually catches, per track. The sample points are fixed
// indices and the finish moves around, so "the window now covers the ending" is a claim that has to
// be measured per track rather than reasoned about — this prints the matrix the report quotes.
const COVERAGE = process.argv.includes("--coverage");
// THE COUNTDOWN SAMPLE POINTS ARE NO LONGER TYPED. They are derived per track from the schedule the
// game computes, by `scripts/lib/ceremonySamples.mjs` — read that file for why, and for what the
// midpoint rule buys. Held here after the first track so the summary can print the window covered.
//
// WHAT IT REPLACED, and it is the whole case: `[0, 1500, 2400, 3800, 4900]`, re-picked by
// START-BOARD-2 against a ceremony whose board ran 3400–4600. CEREMONY-OPENING moved the board to
// 5000–11000 and every one of the five points fell before it, so the starters board, the settled
// beat and the digits were outside the instrument entirely. Nothing said so — the numbers were
// still numbers and the hash was still a hash.
let cdSamplesSeen = null;

// The brand the harness opens with. Only its TRUTHINESS reaches the canvas path, and the card is
// DOM — so this is a marker that a brand beat exists, not a picture. Named rather than inlined so
// the two places that must agree about it (the director and the frame arguments) read one value.
const HARNESS_BRAND = { id: "render-fingerprint", name: "RaceArena", logo: true };

const FRAMES_OVERRIDE = Number(
  (process.argv.find((a) => a.startsWith("--frames=")) ?? "").slice(9),
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
//
// FINISH-WINDOW-1 EXTENDED THE RUN TO REACH THE ENDING. The run stopped at 3400 while the finish
// sits at frames 3330–5587 depending on the track, so this instrument had NEVER seen the photo
// finish, the drama pulse, the zoom-out or the lookback framing — the region where FINISH-MOTION-1
// found a 2708 px jump and three false comments that had survived every refactor. It could not
// confirm that block, and said so.
//
// THE EXTENSION IS ADDITIVE, and that was proved rather than asserted: raising RUN_FRAMES to 5600
// with the original six sample points reproduced `73ba53ba9fea12c7` exactly, so frames 0–3300 sample
// the same moments they always did and the hash move below is attributable purely to the new points.
//
// THE NEW POINTS ARE FIXED INDICES, never events — same rule as the originals, and it is why they
// look arbitrary. A fixed index cannot mean "the crossing" on every track, because the finish
// arrives at frame 3330 on luger-hill and 5063 on dirt-oval. They are chosen against the MEASURED
// phase map (`--phases`) so that each track gets its finish shot, its zoom-out and its resting frame
// covered by SOME point; `--coverage` prints what each point actually catches on each track, and the
// report states plainly which behaviours are covered and which are not.
//   3450 the fast group's photo finish (luger, mountainstreet, river-run, seatrack, space-sprint)
//   3580 the fast group mid zoom-out
//   3650 searound's photo finish, which starts later than the rest of that group
//   3900 the fast group AT REST on the lookback point; searound mid zoom-out
//   4300 ice-track's photo finish
//   4520 ice-track mid zoom-out; city-circuit's photo finish
//   4750 city-circuit mid zoom-out; ice-track at rest
//   5100 dirt-oval's photo finish; city-circuit at rest
//   5300 dirt-oval mid zoom-out
//   5450 dirt-oval at rest — the last track to finish, and the reason the run ends at 5600
const RUN_FRAMES = 5600;
const SAMPLE_AT = [
  0, 90, 600, 1500, 2400, 3300, 3450, 3580, 3650, 3900, 4300, 4520, 4750, 5100,
  5300, 5450,
];

// Pinned so the badge reports the run's own fixed config rather than varying with it.
const CFG_BADGE = { hashShort: "renderfp0", raceCount: 0, cosmeticCount: 0 };
// BUILD-TRUTH-1: a FIXED build identity, never the live one. The badge draws the real commit in the
// browser, but this hash must be a change detector for the DRAWING, not a counter that moves on every
// commit. A synthetic value keeps the new pill covered (its position, font and layout are hashed)
// while leaving the hash stable across commits — which is the whole point of the instrument.
const BUILD_BADGE = { commit: "renderfp", branch: "renderfp", dirty: false };

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
  // HARNESS-NAMES-1: THE RACERS GET REAL NAMES, and until this line they had none.
  //
  // `labelOf` falls back to `r.name ?? ''`, so every label box in this harness was 8 px of padding
  // and nothing else — a geometry the game cannot produce, because a racer always has a name. The
  // consequence was not that labels were missing; it was that any rule CONDITIONAL ON LABEL
  // GEOMETRY misfired here. Measured with a probe that marks a formation whose labels overlap: on
  // the nameless harness it moved all TEN per-track hashes; with real names it moves only the
  // tracks whose labels actually overlap. The instrument could say that something changed and not
  // where — and it is the instrument that must certify the race-number work, which is entirely a
  // label change.
  //
  // THE MIXED ROSTER, because a label instrument wants the extremes: 2 to 23 characters with the
  // lengths interleaved, so adjacent racers differ and both the widest and the narrowest pairings a
  // real field can contain are exercised. `current` is 4-8 and would under-state every width;
  // `long` is uniformly wide and would never produce a narrow pair.
  //
  // BY RACER INDEX, modulo the roster, so the same racer takes the same name on every run and on
  // every track. A measuring instrument that varies between runs is not an instrument.
  st.racers.forEach((r, i) => {
    r.name = HARNESS_NAMES[i % HARNESS_NAMES.length];
  });
  // RACE-NUMBERS-1: and the NUMBER, because that is what the track label now draws. Without this the
  // harness would go straight back to measuring EMPTY label boxes — the exact defect HARNESS-NAMES-1
  // was created to end, re-created one block later by a change that had nothing to do with it. The
  // rule the harness keeps failing is simple: every input the component sets, it must set too.
  //
  // Through the same shipped function and the same seed, so the instrument draws the numbers the
  // game would draw rather than a plausible-looking substitute.
  const harnessNumbers = assignRaceNumbers(st.racers.length, SEED);
  st.racers.forEach((r) => {
    r.raceNumber = harnessNumbers[r.index] ?? null;
  });
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
  // RENDER-SAMPLER-CEREMONY: THE BRAND IS TURNED ON, DELIBERATELY, AND IT IS THE ONLY WAY TO SAMPLE
  // ITS BEAT. `ceremonyScheduleFor` gives the BRAND beat zero length unless somebody says a brand
  // card is opening this race, so with the director left alone the beat does not exist and there is
  // nothing to sample — the harness would not be blind to it, it would be absent.
  //
  // The honest limits, so nobody reads more into this than it says. The brand CARD is DOM
  // (CeremonyBrandCard.jsx) and no canvas fingerprint can ever see it. What the brand beat puts on
  // the CANVAS is the venue shot, held — `ceremonyZoom` returns the venue zoom for BRAND and VENUE
  // alike — so this point pins that the camera does not move under the card, and pins the 2500 ms
  // shift every later beat inherits. The unbranded opening differs only by that shift, and the
  // derived sample points follow it, so nothing about it goes unmeasured.
  cd.setCeremonyBrandActive(true);
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

  let tagIncumbents = null;
  const leaderDiag = { snapshots: [], frozen: false };
  let drawn = 0;
  let drawnCountdown = 0;

  // ONE description of a frame, for BOTH windows. The countdown pass and the racing pass must
  // hand `renderRaceFrame` the same thirty-odd arguments, and two copies of that list is how an
  // instrument comes to measure two slightly different things and report one hash.
  // `cam`, `ts` and `tagIncumbents` are the only parts that differ per frame, so they are the
  // only parts a caller supplies.
  const frameArgs = (cam) => ({
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
    // Its PRESENCE is what adds the BRAND beat, and it must agree with the director above or the
    // renderer would compute its board alpha and its digits against a schedule the camera is not
    // using. Only `!!ceremonyBrand` is read here; the card itself is DOM and is drawn elsewhere.
    ceremonyBrand: HARNESS_BRAND,
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

  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;
  // START-BOARD-2: the countdown has no length of its own any more — it is the SUM of the
  // ceremony beats, one of which scales with the field. The director is asked, so this harness
  // cannot drift from the game the way a second copy of a duration would.
  const cdSchedule = cd.ceremonySchedule(st.racers);
  const cdMs = cdSchedule.totalMs;
  // RENDER-SAMPLER-CEREMONY: ONE POINT PER BEAT, DERIVED. See scripts/lib/ceremonySamples.mjs.
  const cdPoints = ceremonySamplePoints(cdSchedule, BOARD_FADE_MS);
  cdSamplesSeen ??= cdPoints;
  // START-BOARD-1 EXTENDED THE WINDOW BACKWARDS, TO BEFORE THE GUN, and it is the same defect
  // FINISH-WINDOW-1 repaired at the other end: this harness set `st.phase = RACING` and rendered
  // its first frame AT the gun, so it had never drawn a single COUNTDOWN frame. Everything the
  // ceremony puts on screen — the venue shot, the push, the countdown digits, and now the runners'
  // board — was outside the instrument entirely. A new overlay that draws for three seconds of
  // every race could have shipped without moving this hash by one bit.
  //
  // ELAPSED TIMES, never events — the same rule the racing points follow. What changed is where
  // they come from: they are the midpoint of each beat of THIS race's schedule, so a beat that moves
  // takes its sample point with it and a beat that appears gets one. The five typed milliseconds
  // this replaced had drifted entirely out of the board by the time anybody looked.
  st.phase = PHASE.COUNTDOWN;
  st.countdownStart = 0;
  let cdIdx = 0;
  while (ts < cdMs) {
    const cdCam = cd.updateCountdown(st.racers, ts, ts, CW, CH);
    if (
      !PHASES &&
      !COVERAGE &&
      cdIdx < cdPoints.length &&
      ts >= cdPoints[cdIdx].ms
    ) {
      // A marker in the SAME shape the racing frames use, with its own prefix so a countdown frame
      // and a racing frame can never hash alike by accident. It carries the BEAT rather than the
      // millisecond: the beat is what the point means, and a beat that stops being sampled at all
      // takes its marker out of the stream — which is a moved hash rather than a silent hole.
      rec.fillText("##cd:" + cdPoints[cdIdx].beat, 0, 0);
      renderRaceFrame(rec, {
        ...frameArgs(cdCam),
        ts,
        tagIncumbents: null,
      });
      cdIdx++;
      drawnCountdown++;
    }
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;
  st.phase = PHASE.RACING;
  st.raceStart = raceStart;
  st.countdownStart = 0;
  const focusFadeMs = DEFAULT_CAMERA_CONFIG.battleSlowmoFadeDuration * 1000;

  const runFrames =
    PHASES && FRAMES_OVERRIDE > 0 ? FRAMES_OVERRIDE : RUN_FRAMES;
  const phaseFirstSeen = new Map();
  const sampleState = new Map();
  let firstCrossingFrame = -1;
  let allHomeFrame = -1;
  for (let frame = 0; frame < runFrames; frame++) {
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

    if (PHASES || COVERAGE) {
      if (!phaseFirstSeen.has(cd.hudState))
        phaseFirstSeen.set(cd.hudState, frame);
      if (firstCrossingFrame < 0 && st.finishedCount >= 1)
        firstCrossingFrame = frame;
      if (allHomeFrame < 0 && st.finishedCount >= N) allHomeFrame = frame;
      if (COVERAGE && sample.has(frame)) {
        // `moving` distinguishes a frame DURING the zoom-out from one at rest on the lookback
        // point — the difference the window exists to be able to see.
        const moving = Math.abs(cd.zoom - cd.targetZoom) > 1e-4;
        sampleState.set(
          frame,
          cd.hudState === "FINISH_OVERVIEW"
            ? moving
              ? "FIN_OV/move"
              : "FIN_OV/rest"
            : cd.hudState,
        );
      }
    }

    if (!PHASES && !COVERAGE && sample.has(frame)) {
      // The frame marker keeps two sampled frames from hashing identically by accident, so a
      // fingerprint that "did not move" cannot be a sampler that silently stopped sampling.
      rec.fillText("##frame", frame, 0);
      const out = renderRaceFrame(rec, {
        ...frameArgs(cam),
        ts,
        tagIncumbents,
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
    drawnCountdown,
    opsList: wantOps ? rec.ops : null,
    phases:
      PHASES || COVERAGE
        ? {
            phaseFirstSeen,
            sampleState,
            firstCrossingFrame,
            allHomeFrame,
            runFrames,
          }
        : null,
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));
const RUN_GEOS = CHEAP ? cheapTracks(geos, (g) => g.id) : geos;
if (CHEAP)
  console.log(
    cheapBanner(
      "render",
      `One track (${RUN_GEOS[0].id}) of ${geos.length}, all sample points.`,
    ),
  );

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

if (COVERAGE) {
  const late = SAMPLE_AT.filter((f) => f >= 3300);
  console.log(
    `SAMPLE COVERAGE — what each late sample point actually catches (${geos.length} tracks)`,
  );
  console.log(
    `  ${"track".padEnd(16)}${late.map((f) => String(f).padStart(14)).join("")}`,
  );
  const tally = { shot: 0, move: 0, rest: 0, none: 0 };
  for (const geo of RUN_GEOS) {
    const { phases } = trackHash(geo, false);
    const cells = late.map((f) =>
      (phases.sampleState.get(f) ?? "—").padStart(14),
    );
    const seen = late.map((f) => phases.sampleState.get(f) ?? "");
    const hasShot = seen.some((v) => v === "PHOTO_FINISH" || v === "FINISH");
    const hasMove = seen.some((v) => v === "FIN_OV/move");
    const hasRest = seen.some((v) => v === "FIN_OV/rest");
    if (hasShot) tally.shot++;
    if (hasMove) tally.move++;
    if (hasRest) tally.rest++;
    if (!hasShot && !hasMove && !hasRest) tally.none++;
    console.log(
      `  ${geo.id.padEnd(16)}${cells.join("")}   ${hasShot ? "shot " : "     "}${hasMove ? "move " : "     "}${hasRest ? "rest" : ""}`,
    );
  }
  console.log(
    `\n  tracks with the finish SHOT sampled: ${tally.shot}/${geos.length}` +
      `   mid-MOVE: ${tally.move}/${geos.length}` +
      `   AT REST: ${tally.rest}/${geos.length}` +
      `   nothing: ${tally.none}/${geos.length}`,
  );
  process.exit(0);
}

if (PHASES) {
  const want = ["PHOTO_FINISH", "FINISH", "FINISH_OVERVIEW"];
  console.log(
    `PHASE MAP — where the ending sits in THIS harness's run (${geos.length} tracks, ${N} racers, seed ${SEED})`,
  );
  console.log(
    `  ${"track".padEnd(16)} ${"1st cross".padStart(9)} ${want
      .map((w) => w.padStart(15))
      .join("")} ${"all home".padStart(9)}`,
  );
  for (const geo of RUN_GEOS) {
    const { phases } = trackHash(geo, false);
    const at = (k) =>
      phases.phaseFirstSeen.has(k)
        ? String(phases.phaseFirstSeen.get(k)).padStart(15)
        : "—".padStart(15);
    console.log(
      `  ${geo.id.padEnd(16)} ${String(phases.firstCrossingFrame).padStart(9)} ` +
        want.map(at).join("") +
        ` ${String(phases.allHomeFrame).padStart(9)}`,
    );
  }
  console.log(
    "\n  -1 = never reached inside the run. Frame indices, not seconds.",
  );
  process.exit(0);
}

const combined = createHash("sha256");
const rows = [];
// BOTH SIDES: the countdown window is this chain's (START-BOARD-1), the RUN_GEOS reduction is
// master's cheap mode (VERIFY-COST-2). They are independent and neither replaces the other.
for (const geo of RUN_GEOS) {
  const { hash, ops, drawn, drawnCountdown } = trackHash(geo, false);
  combined.update(geo.id + ":" + hash + "\n");
  rows.push({ id: geo.id, hash, ops, drawn, drawnCountdown });
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
    `RENDER ${COMBINED} (seed=${SEED} camSeed=${CAM_SEED}, ${RUN_GEOS.length} tracks, ${N} racers, ` +
      `countdown [${(cdSamplesSeen ?? []).map((p) => `${p.beat}@${Math.round(p.ms)}`).join(", ")}] ` +
        `+ frames [${SAMPLE_AT.join(", ")}] of ${RUN_FRAMES})`,
  );
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(16)} ${r.hash}  ${r.ops} ops / ${r.drawnCountdown}+${r.drawn} frames`,
    );
  }
  console.log(
    "\n  Covers the DRAW CALL SEQUENCE — sprites, text, styles, transforms, order.\n" +
      "  The window starts BEFORE the gun, and the countdown points are DERIVED from the ceremony\n" +
      "  schedule — one per beat, at its midpoint, plus one inside the board's fade. A beat that\n" +
      "  moves takes its sample with it; a beat that appears gets one.\n" +
      "  Blind to the rasteriser and to the artwork itself (sprites are hashed by identity) — so\n" +
      "  on the board it sees every portrait's geometry and order, and no coat: `Image` does not\n" +
      "  exist in Node, so every sprite here takes drawRacer's procedural fallback.",
  );
}
