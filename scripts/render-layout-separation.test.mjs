// ============================================================
// render-layout-separation.test.mjs — CANVAS-SCALE-1 (what survived it)
//
// Run: node --test scripts/render-layout-separation.test.mjs
//
// THE ONE CLAIM: `renderRaceFrame` is told the layout size EXPLICITLY, and `RaceScreen/index.jsx`
// tells it the 1280x720 REFERENCE the whole draw path works in — never `canvas.width/height`.
//
// WHY THIS IS WORTH A TEST WHEN IT IS A NO-OP TODAY. The backing store happens to equal the
// reference, so the two were the same number and the wrong one passed unnoticed. That is a
// COINCIDENCE, not a rule. The renderer spends `canvasW`/`canvasH` on LAYOUT — the name-tag font,
// the minimum drawn racer size, the label layout's screen box, the minimap and the HUD's right
// column — so the day anything resizes the store, layout in backing-store pixels moves the picture's
// CONTENT while looking like a resolution change. Silent, and visible only to an eye that already
// knows what the labels used to be.
//
// The block that found it built a render-scale slider on top, MEASURED it at under 1 ms of a 16.7 ms
// frame, and the owner dropped it. The separation stays; the slider does not. See
// reports/evolution/CANVAS-SCALE-1.md for the measurement that decided it.
//
// BOTH HALVES ARE HERE, and one without the other proves nothing:
//   1. the two arguments really DO drive layout — hand the renderer a different size and the draw
//      call stream changes. Without this, "we pass the reference" is a claim about a value nobody
//      uses.
//   2. the call site really DOES pass the reference — read as text, because that is where the wrong
//      value was, and no behavioural test on `renderRaceFrame` can see what its caller hands it.
//
// R7: what breaks if this file is deleted — `canvasW: canvas.width` comes back, stays green because
// the numbers agree today, and ships the day the canvas is ever resized.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { createRecordingContext } = await import(
  u("client/src/modules/parity/recordingContext.js")
);
const { renderRaceFrame } = await import(
  u("client/src/screens/RaceScreen/renderRaceFrame.js")
);
const { PHASE } = await import(u("client/src/screens/RaceScreen/racePhase.js"));
const { DEFAULT_CAMERA_CONFIG, DEFAULT_TRACK_LIGHTS } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { REFERENCE_CANVAS_W, REFERENCE_CANVAS_H } = await import(
  u("client/src/modules/camera/projection.js")
);
const { sampleBoundaryAtInterval, LIGHT_SPACING_PX } = await import(
  u("client/src/modules/trackLights.js")
);
const { attachRenderState, attachRacerRenderState } = await import(
  u("client/src/screens/RaceScreen/renderState.js")
);
const { QUICK_TEST_NAMES_MIXED: HARNESS_NAMES } = await import(
  u("client/src/modules/racerNames.js")
);
const { assignRaceNumbers } = await import(
  u("client/src/modules/raceNumbers.js")
);
const { loadTracks, resolveIdentity, buildRace, runRace } = await import(
  u("scripts/lib/raceDriver.mjs")
);

const SCREEN_SRC = readFileSync(
  join(ROOT, "client/src/screens/RaceScreen/index.jsx"),
  "utf8",
);

// A mid-race frame rather than the start grid: at the gun every racer sits on one row and the label
// layout — the layer most sensitive to the layout size — has almost nothing to decide.
const TRACK = "mountainstreet";
const FRAME = 240;

// ── One mid-race frame, drawn at a given LAYOUT size ─────────────────────────────────────────────

const geo = loadTracks({ only: TRACK })[0];
assert.ok(geo, `track ${TRACK} not found — this test measures nothing without it`);

const identity = resolveIdentity({
  racers: 40,
  note: "CANVAS-SCALE-1 layout separation",
});
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

// The render-only state the COMPONENT attaches, attached here for the same reason
// `render-fingerprint.mjs` attaches it: a harness that skips an input the browser always supplies is
// measuring a frame the game never draws. Names and race numbers matter most — the label layer is
// exactly what the layout size moves, and a nameless, numberless field draws empty label boxes.
attachRenderState(race.st);
attachRacerRenderState(race.st.racers);
race.st.racers.forEach((r, i) => {
  r.name = HARNESS_NAMES[i % HARNESS_NAMES.length];
});
const harnessNumbers = assignRaceNumbers(race.st.racers.length, identity.raceSeed);
race.st.racers.forEach((r) => {
  r.raceNumber = harnessNumbers[r.index] ?? null;
});

// The RACE cannot see any of this — nothing in the engine or the director reads a canvas size — so it
// is driven once and the same state is drawn repeatedly.
let camAt = null;
let tsAt = 0;
let raceStartAt = 0;
runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd, ts, raceStart, frame }) => {
  if (frame === FRAME) {
    // `runRace` does not hand the caller `cd.update`'s return value, and it does not need to: that
    // return is these three fields off the director itself (CameraDirector.js:1126).
    camAt = { zoom: cd.zoom, offsetX: cd.offsetX, offsetY: cd.offsetY };
    tsAt = ts;
    raceStartAt = raceStart;
    return false;
  }
});
assert.ok(camAt && Number.isFinite(camAt.zoom), "no camera at the sampled frame");

const { shape, st, meta, racerType, displaySize, trackWidthPx } = race;
st.phase = PHASE.RACING;
st.raceStart = raceStartAt;
// The component's loop owns these buffers, not the engine, so a driven race has neither. Empty, and
// therefore NOT covered here — the same blindness `render-fingerprint.mjs` states for itself. Both
// layers draw inside the one world-space transform and carry no canvas-size dependency of their own;
// what would be uncovered is a future particle layer that grew one.
st.dustParticles ??= [];
st.burstParticles ??= [];

const edge = shape.getEdgePoints(800);
const cachedLightPts = {
  outer: sampleBoundaryAtInterval(edge.outer, LIGHT_SPACING_PX),
  inner: sampleBoundaryAtInterval(edge.inner, LIGHT_SPACING_PX),
};

const bsX = REFERENCE_CANVAS_W / geo.worldWidth;
const bsY = REFERENCE_CANVAS_H / geo.worldHeight;

// DRAWING A FRAME IS NOT READ-ONLY, and finding that out was the first real result of writing this
// harness: `racerRendering.js` appends the racer's current position to `r.trail` as it paints it. So
// the second draw of "the same" state draws forty more trail dots than the first, and a harness that
// did not know would have reported a difference and blamed whatever it was varying. The trails are
// restored before each draw, which is what makes two draws comparable at all.
const TRAILS = race.st.racers.map((r) => r.trail.map((p) => ({ ...p })));

/**
 * Draw the sampled frame with a given LAYOUT size and return the recorded call stream's digest.
 *
 * @param {number} canvasW  what `renderRaceFrame` is told the frame is, in reference pixels
 * @param {number} canvasH
 */
function drawDigest(canvasW = REFERENCE_CANVAS_W, canvasH = REFERENCE_CANVAS_H) {
  race.st.racers.forEach((r, i) => {
    r.trail = TRAILS[i].map((p) => ({ ...p }));
  });
  const rec = createRecordingContext({ width: canvasW, height: canvasH });
  rec.clearRect(0, 0, canvasW, canvasH);
  renderRaceFrame(rec, {
    st,
    cam: camAt,
    ts: tsAt,
    shape,
    raceData: { eventName: geo.name ?? geo.id, trackName: geo.id, subtitle: "" },
    isOpenTrack: shape.isOpen,
    bsX,
    bsY,
    worldWidth: geo.worldWidth,
    worldHeight: geo.worldHeight,
    openTrackHW: shape.isOpen ? trackWidthPx / 2 : 0,
    bgImagePath: null,
    bgCanvasReady: false,
    effects: [],
    cachedLightPts,
    trackLightsConfig: geo.trackLights ?? DEFAULT_TRACK_LIGHTS,
    racerType,
    cameraConfig: DEFAULT_CAMERA_CONFIG,
    camera: { hudState: "FOLLOW", comebackLockedRacerIndex: null },
    displaySize,
    displaySizeScale: race.bodyRef / displaySize,
    assignmentByRacer: meta.assignmentByRacer ?? new Map(),
    showRpStartRow: false,
    showRpMinimapBadges: false,
    rpPlanInfo: meta.rpPlanInfo ?? null,
    renderAlpha: 1,
    interpolationEnabled: false,
    tagIncumbents: null,
    tagWideForms: null,
    tagFormHold: null,
    leaderDiag: { snapshots: [], frozen: false },
    cfgBadge: "cfg",
    buildBadge: "build",
    racePlanActive: true,
    racePlanSeed: identity.raceSeed,
    gapRerollDevMarker: false,
    canvasW,
    canvasH,
  });
  return { digest: rec.digest(), ops: rec.opCount };
}

test("the frame drawn here is a real frame, not an empty canvas", () => {
  const { ops } = drawDigest();
  // A floor, not a pin: it exists so a harness that silently stopped drawing cannot pass the checks
  // below by comparing nothing to nothing (Lesson 187).
  assert.ok(ops > 500, `only ${ops} operations — the harness is not drawing the race`);
});

test("the harness is deterministic — the same layout size twice draws the same stream", () => {
  // Without this, every check below could pass or fail for a reason that has nothing to do with the
  // layout size. It is not a formality: the trail mutation above made it false on the first run.
  assert.equal(drawDigest().digest, drawDigest().digest);
});

test("canvasW/canvasH really DO drive layout — a different size draws a different picture", () => {
  // The non-vacuity half. If this passed, "the call site hands over the reference" would be a claim
  // about a value the renderer ignores, and the guard below would be theatre.
  const reference = drawDigest().digest;
  for (const [w, h] of [
    [Math.round(REFERENCE_CANVAS_W * 0.5), Math.round(REFERENCE_CANVAS_H * 0.5)],
    [REFERENCE_CANVAS_W * 2, REFERENCE_CANVAS_H * 2],
  ]) {
    assert.notEqual(
      drawDigest(w, h).digest,
      reference,
      `${w}x${h} drew the same stream as the reference — the layout size reaches nothing, ` +
        `so nothing below is worth guarding`,
    );
  }
});

test("THE GUARD: RaceScreen hands renderRaceFrame the REFERENCE, not the backing store", () => {
  // Read as text, and it has to be: no behavioural test on `renderRaceFrame` can see what its caller
  // decides to pass. This is where the wrong value lived.
  const call = SCREEN_SRC.slice(SCREEN_SRC.indexOf("renderRaceFrame(ctx, {"));
  assert.ok(call.length > 0, "the renderRaceFrame call site was not found — this file moved");
  assert.match(
    call,
    /canvasW:\s*CANVAS_W\b/,
    "canvasW must be the reference constant",
  );
  assert.match(
    call,
    /canvasH:\s*CANVAS_H\b/,
    "canvasH must be the reference constant",
  );
  assert.doesNotMatch(
    call,
    /canvas(W|H):\s*canvas\.(width|height)/,
    "canvasW/canvasH must not read the BACKING STORE — that is the coupling this file exists for",
  );
});

test("...and those constants ARE the reference — a drifted copy would defeat the guard", () => {
  // `RaceScreen/index.jsx` declares its own CANVAS_W/CANVAS_H rather than importing the projection's.
  // The guard above would pass just as happily against a drifted pair, so the pair is checked.
  const w = /^const CANVAS_W = (\d+);$/m.exec(SCREEN_SRC);
  const h = /^const CANVAS_H = (\d+);$/m.exec(SCREEN_SRC);
  assert.ok(w && h, "RaceScreen no longer declares CANVAS_W / CANVAS_H as plain constants");
  assert.equal(Number(w[1]), REFERENCE_CANVAS_W);
  assert.equal(Number(h[1]), REFERENCE_CANVAS_H);
});
