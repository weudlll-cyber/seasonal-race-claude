// ============================================================
// canvas-scale-invariance.test.mjs — CANVAS-SCALE-1
//
// Run: node --test scripts/canvas-scale-invariance.test.mjs
//
// THE CLAIM UNDER TEST, in one sentence: turning the render scale down changes how many pixels the
// race is drawn INTO and nothing else — a racer at a given world position still lands on the same
// CSS-pixel coordinate, and so does every other mark on the canvas.
//
// WHY THAT IS THE CLAIM AND NOT A WEAKER ONE. The canvas element's CSS box does not depend on the
// backing store: `.race-canvas` is `width:100%; height:auto`, so the browser stretches whatever
// store it is given onto the same box. A reference pixel therefore maps to a FIXED CSS-pixel
// position at every scale, and "same reference coordinate" and "same CSS-pixel coordinate" are the
// same statement. This test works in reference pixels because that is the space the code has.
//
// HOW IT IS PROVEN, rather than argued. It reproduces exactly what `RaceScreen/index.jsx` does —
// size the store to `round(1280*s) x round(720*s)`, apply a base transform of exactly `s`, then call
// the REAL `renderRaceFrame` with the REFERENCE size — against a context that tracks the full
// current transformation matrix. Every coordinate-bearing operation is captured in DEVICE space and
// divided back by `s`. If the two streams for two different `s` agree, then every mark the frame
// makes is at the same place, the same size, in the same order, at both scales.
//
// WHAT IT COVERS THAT A POSITION-ONLY TEST WOULD NOT. A racer's position survives naively — it comes
// out of `translate`/`scale` from the camera, which never sees a canvas size. The things that do NOT
// survive naively are the ones the renderer sizes from `canvasH`: the name-tag FONT, the minimum
// drawn racer size, the label layout's screen box, the minimap and the HUD column. Those are exactly
// what the two sabotages below break, and they are why this test compares the whole stream.
//
// THE SABOTAGES ARE PART OF THE TEST, not a comment about it. A scale-invariance test that cannot
// fail proves nothing, and both wirings it rejects are wirings this repository actually had or could
// plausibly have had:
//   1. handing the renderer the BACKING STORE size instead of the reference — what the code did
//      before this block, and the reason the slider would have changed the picture's CONTENT;
//   2. sizing the store down WITHOUT the matching base transform — the obvious cheap version, which
//      does not rescale the picture, it crops it.
//
// R7: what breaks if this file is deleted — the render scale silently becomes a picture control, and
// the first sign of it is the owner reporting that the labels got smaller when he moved the slider.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
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
const { RENDER_SCALE_MIN, RENDER_SCALE_MAX, DEFAULT_FRAME_TIMING_CONFIG } =
  await import(u("client/src/modules/frameTimingConfig.js"));
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

// The measurement track for this block, and a mid-race frame rather than the start grid: at the gun
// every racer sits on one row and the label layout has almost nothing to decide.
const TRACK = "mountainstreet";
const FRAME = 240;

// ── A recording context that also knows WHERE it is drawing ──────────────────────────────────────
//
// `createRecordingContext` records the ARGUMENTS of each call, which is the right thing for the
// render fingerprint (it wants "the same sequence") and the wrong thing here: an argument of `10`
// means a different place depending on the matrix in force. So this wraps it and composes the same
// matrix a real 2D context would, capturing each operation's anchor point in DEVICE pixels.

/** m2 applied after m1 — canvas order, i.e. what `ctx.translate` etc. do to the current matrix. */
function mul(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Operations whose first two numeric arguments are a point in the current user space. */
const POINT_OPS = [
  "fillRect",
  "strokeRect",
  "clearRect",
  "fillText",
  "strokeText",
  "moveTo",
  "lineTo",
  "arc",
  "arcTo",
  "ellipse",
  "rect",
  "roundRect",
  "quadraticCurveTo",
  "bezierCurveTo",
];

function ctmContext(width, height) {
  const rec = createRecordingContext({ width, height, keepOps: true });
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  /** One entry per captured operation: its name, its device-space anchor, and its scale. */
  const marks = [];
  const at = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

  const wrap = (name, fn) => {
    const inner = rec[name].bind(rec);
    rec[name] = (...args) => {
      fn(args);
      return inner(...args);
    };
  };

  wrap("save", () => stack.push(m.slice()));
  wrap("restore", () => {
    if (stack.length) m = stack.pop();
  });
  wrap("translate", ([x, y]) => {
    m = mul(m, [1, 0, 0, 1, x, y]);
  });
  wrap("scale", ([x, y]) => {
    m = mul(m, [x, 0, 0, y, 0, 0]);
  });
  wrap("rotate", ([a]) => {
    m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
  });
  wrap("transform", (a) => {
    m = mul(m, a);
  });
  wrap("setTransform", (a) => {
    m = a.slice(0, 6);
  });
  wrap("resetTransform", () => {
    m = [1, 0, 0, 1, 0, 0];
  });

  for (const name of POINT_OPS) {
    wrap(name, (args) => {
      const [x, y] = at(args[0] ?? 0, args[1] ?? 0);
      // The matrix's own scale travels with the point: a mark in the right PLACE at the wrong SIZE
      // is still a changed picture, and the font size rides on this.
      marks.push([name, x, y, m[0], m[3]]);
    });
  }
  wrap("drawImage", (args) => {
    // drawImage's destination is its LAST four (or two) numeric arguments; the leading argument is
    // the image. Taking the last-but-three/last-but-two covers both the 3-arg and 9-arg forms.
    const n = args.length;
    const dx = n >= 9 ? args[5] : args[1];
    const dy = n >= 9 ? args[6] : args[2];
    const [x, y] = at(dx ?? 0, dy ?? 0);
    marks.push(["drawImage", x, y, m[0], m[3]]);
  });

  // `cullBounds` in the surface-effect generators asks for this; nothing in this harness reaches it
  // today, but a context that would throw the moment something did is a trap for the next reader.
  rec.getTransform = () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });

  return { rec, marks };
}

// ── One mid-race frame, drawn at a given render scale ────────────────────────────────────────────

const geo = loadTracks({ only: TRACK })[0];
assert.ok(geo, `track ${TRACK} not found — this test measures nothing without it`);

const identity = resolveIdentity({
  racers: 40,
  note: "CANVAS-SCALE-1 invariance",
});
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

// The render-only state the COMPONENT attaches, attached here for the same reason
// `render-fingerprint.mjs` attaches it: a harness that skips an input the browser always supplies is
// measuring a frame the game never draws. Names and race numbers matter most — the label layer is
// exactly what the sabotages break, and a nameless, numberless field draws empty label boxes.
attachRenderState(race.st);
attachRacerRenderState(race.st.racers);
race.st.racers.forEach((r, i) => {
  r.name = HARNESS_NAMES[i % HARNESS_NAMES.length];
});
const harnessNumbers = assignRaceNumbers(race.st.racers.length, identity.raceSeed);
race.st.racers.forEach((r) => {
  r.raceNumber = harnessNumbers[r.index] ?? null;
});

// Drive the shared race once and keep the camera of the frame under test. The RACE is identical at
// every render scale by construction — nothing in the engine or the director can see the backing
// store — so it is run once and the same state is drawn repeatedly.
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
// layers draw inside the one world-space transform, so they carry no canvas-size dependency of their
// own; what would be uncovered is a future particle layer that grew one.
st.dustParticles ??= [];
st.burstParticles ??= [];

const edge = shape.getEdgePoints(800);
const cachedLightPts = {
  outer: sampleBoundaryAtInterval(edge.outer, LIGHT_SPACING_PX),
  inner: sampleBoundaryAtInterval(edge.inner, LIGHT_SPACING_PX),
};

const bsX = REFERENCE_CANVAS_W / geo.worldWidth;
const bsY = REFERENCE_CANVAS_H / geo.worldHeight;

/**
 * Draw the sampled frame and return its device-space marks divided back by `s`.
 *
 * @param {number} s          the render scale
 * @param {object} [sabotage] `storeAsReference` hands the renderer the backing-store size (the
 *   pre-block wiring); `noBaseTransform` sizes the store down and forgets the transform.
 */
// DRAWING A FRAME IS NOT READ-ONLY, and finding that out was the first real result of writing this
// test: `racerRendering.js` appends the racer's current position to `r.trail` as it paints it. So the
// second draw of "the same" state draws forty more trail dots than the first, and a naive harness
// would have reported a difference at every scale and blamed the scale. The trails are therefore
// restored before each draw, which is what makes the arms comparable at all.
const TRAILS = race.st.racers.map((r) => r.trail.map((p) => ({ ...p })));
function restoreDrawState() {
  race.st.racers.forEach((r, i) => {
    r.trail = TRAILS[i].map((p) => ({ ...p }));
  });
}

function marksInReferenceSpace(s, sabotage = {}) {
  restoreDrawState();
  const storeW = Math.round(REFERENCE_CANVAS_W * s);
  const storeH = Math.round(REFERENCE_CANVAS_H * s);
  const { rec, marks } = ctmContext(storeW, storeH);

  // Exactly what the rAF loop does, in the same order.
  if (!sabotage.noBaseTransform) rec.setTransform(s, 0, 0, s, 0, 0);
  rec.clearRect(0, 0, REFERENCE_CANVAS_W, REFERENCE_CANVAS_H);

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
    canvasW: sabotage.storeAsReference ? storeW : REFERENCE_CANVAS_W,
    canvasH: sabotage.storeAsReference ? storeH : REFERENCE_CANVAS_H,
  });

  // Back to reference space. The base transform is EXACTLY `s`, so this is the inverse of the only
  // thing the render scale is allowed to have done.
  return marks.map(([name, x, y, sx, sy]) => [name, x / s, y / s, sx / s, sy / s]);
}

/**
 * Compare two mark streams.
 *
 * It reports WHERE as well as how much, because "the streams differ" is a fact nobody can act on:
 * the first divergence names the layer, and the layer is the diagnosis.
 *
 * @returns {{worst: number, where: string}} `worst` is Infinity when the streams are not comparable.
 */
function compareMarks(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i][0] !== b[i][0]) {
      return { worst: Infinity, where: `op #${i}: ${a[i][0]} vs ${b[i][0]}` };
    }
  }
  if (a.length !== b.length) {
    const longer = a.length > b.length ? a : b;
    return {
      worst: Infinity,
      where: `${a.length} vs ${b.length} ops; first extra is ${longer[n]?.[0]} at #${n}`,
    };
  }
  let worst = 0;
  let where = "identical";
  for (let i = 0; i < a.length; i++) {
    for (let k = 1; k < 5; k++) {
      const d = Math.abs(a[i][k] - b[i][k]);
      if (d > worst) {
        worst = d;
        where = `op #${i} ${a[i][0]}: ${a[i].slice(1).join(",")} vs ${b[i].slice(1).join(",")}`;
      }
    }
  }
  return { worst, where };
}

// Float division by `s` is not bit-exact, so the tolerance is a float tolerance and nothing more:
// a sub-nanometre disagreement on a 1280-pixel canvas is arithmetic, a changed layout is not.
const FLOAT_TOL = 1e-6;

const SCALES = [1.0, 0.85, 0.7, 0.5, RENDER_SCALE_MIN];

test("the shipped default is 1.0 — a lower one would be a picture change nobody has seen", () => {
  assert.equal(DEFAULT_FRAME_TIMING_CONFIG.renderScale, RENDER_SCALE_MAX);
  assert.equal(RENDER_SCALE_MAX, 1.0);
});

test("the frame drawn at 1.0 is a real frame, not an empty canvas", () => {
  const base = marksInReferenceSpace(1.0);
  // The number is a floor, not a pin: it exists so a harness that silently stopped drawing cannot
  // pass every invariance check below by comparing nothing to nothing (Lesson 187).
  assert.ok(
    base.length > 500,
    `only ${base.length} marks — the harness is not drawing the race`
  );
  assert.ok(
    base.some(([n]) => n === "fillText"),
    "no text drawn — the label layer, which is what the sabotages break, did not run"
  );
});

test("the harness is deterministic — the same scale twice draws the same stream", () => {
  // Without this, every check below could pass or fail for a reason that has nothing to do with the
  // render scale. It is not a formality: the trail mutation above made it false on the first run.
  const { worst, where } = compareMarks(
    marksInReferenceSpace(1.0),
    marksInReferenceSpace(1.0)
  );
  assert.equal(worst, 0, `two identical draws disagree — ${where}`);
});

test("every mark lands in the same reference-pixel place, at the same size, at every scale", () => {
  const base = marksInReferenceSpace(1.0);
  for (const s of SCALES.slice(1)) {
    const { worst, where } = compareMarks(base, marksInReferenceSpace(s));
    assert.ok(
      worst <= FLOAT_TOL,
      `render scale ${s}: worst disagreement ${worst} reference px ` +
        `(tolerance ${FLOAT_TOL}) — ${where}`
    );
  }
});

test("SABOTAGE — handing the renderer the backing store instead of the reference is caught", () => {
  const base = marksInReferenceSpace(1.0);
  for (const s of SCALES.slice(1)) {
    const broken = marksInReferenceSpace(s, { storeAsReference: true });
    assert.ok(
      compareMarks(base, broken).worst > FLOAT_TOL,
      `render scale ${s}: the store-as-reference wiring changed nothing this test can see — ` +
        `the invariance check above is not proving what it claims`
    );
  }
});

test("SABOTAGE — a smaller store with no base transform crops the picture, and is caught", () => {
  const base = marksInReferenceSpace(1.0);
  for (const s of SCALES.slice(1)) {
    // No base transform means device space IS reference space, so the division below undoes nothing
    // real; the marks come back magnified by 1/s, which is the crop expressed as numbers.
    const broken = marksInReferenceSpace(s, { noBaseTransform: true });
    assert.ok(
      compareMarks(base, broken).worst > FLOAT_TOL,
      `render scale ${s}: a missing base transform was invisible — this test cannot see a crop`
    );
  }
});
