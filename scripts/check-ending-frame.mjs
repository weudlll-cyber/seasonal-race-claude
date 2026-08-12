// ============================================================
// File:        scripts/check-ending-frame.mjs
// Project:     RaceArena — ENDING-PICTURE-1
//
// WHAT THIS GUARDS: that nothing covers the race picture while the ending is running.
//
// The ending is a designed sequence — the settled finish shot, the winner card, the hold, then the
// podium. For four months a full-canvas `rgba(0,0,0,0.48)` scrim reading "RACE FINISHED! / Loading
// results…" was drawn over every frame of it, and NOTHING noticed: the camera fingerprint stops at
// the last crossing, the render fingerprint samples frames only up to it, and no test rendered a
// FINISHED frame at all. The owner found it with his eyes.
//
// THE METRIC, and why it is this one. A cover-up is a fill that spans the whole canvas, so the
// guard renders one real FINISHED frame through `renderRaceFrame` with a RECORDING context and
// asserts the draw list contains no `fillRect` covering the full 1280x720. That is the shape of the
// defect rather than a name — a differently-worded splash, or a different colour, fails it too.
//
// WHAT IT DOES NOT COVER, stated so nobody over-trusts it: DOM overlays. The winner card and the
// state pill are React, not canvas, and this guard records canvas calls only — `overlayGeometry`
// is the instrument for those. It also asks nothing about WHAT is drawn, only that the picture is
// not hidden.
//
// Usage:
//   node scripts/check-ending-frame.mjs              # one track, the cheap default
//   node scripts/check-ending-frame.mjs --sabotage   # prove it can fail
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const GUARD = {
  id: "check-ending-frame",
  covers:
    "that no canvas draw covers the whole race picture while the phase is FINISHED — the window the ending's hold, winner card and podium all run in",
  blind: [
    "DOM overlays: the winner card and the state pill are React, not canvas calls",
    "WHAT is drawn — it asks only that the picture is not hidden",
    "every frame before the last crossing, which is the render fingerprint's question",
  ],
  dirs: ["client/src/screens/RaceScreen/drawing/"],
  files: [
    "client/src/screens/RaceScreen/renderRaceFrame.js",
    "client/src/screens/RaceScreen/index.jsx",
    "client/src/modules/storage/defaults.js",
  ],
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const SABOTAGE = process.argv.includes("--sabotage");

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { EditorShape } = await import(u("client/src/modules/track-editor/EditorShape.js"));
const { CameraDirector } = await import(u("client/src/modules/camera/CameraDirector.js"));
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u("client/src/modules/raceCore.js")
);
const { normalSpeedFrom } = await import(u("client/src/modules/durationModel.js"));
const { computeRacerLayout, computeBodyNarrowRef } = await import(u("client/src/modules/rowLayout.js"));
const { renderRaceFrame } = await import(u("client/src/screens/RaceScreen/renderRaceFrame.js"));
const { PHASE } = await import(u("client/src/screens/RaceScreen/racePhase.js"));
const { attachRenderState, attachRacerRenderState } = await import(
  u("client/src/screens/RaceScreen/renderState.js")
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
const N = 12; // enough for a real field; the guard asks a question that does not scale with it

/**
 * A recording 2D context that TRACKS THE TRANSFORM, because "covers the picture" is a claim about
 * SCREEN space and the renderer draws most of the frame in world space.
 *
 * The first version of this guard ignored the matrix and immediately flagged `fillRect(0, 0, 3072,
 * 2047)` — the track's own background, drawn inside the world transform, which is not a cover-up at
 * all. The discriminator that matters is: a full-canvas fill made while the transform is IDENTITY,
 * i.e. after the world has been drawn and restored. That is exactly where a scrim goes and exactly
 * where nothing else belongs.
 */
function recorder() {
  const fills = [];
  const noop = () => {};
  const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let m = { ...ID };
  const stack = [];
  const mul = (p, q) => ({
    a: p.a * q.a + p.c * q.b,
    b: p.b * q.a + p.d * q.b,
    c: p.a * q.c + p.c * q.d,
    d: p.b * q.c + p.d * q.d,
    e: p.a * q.e + p.c * q.f + p.e,
    f: p.b * q.e + p.d * q.f + p.f,
  });
  const isIdentity = () =>
    Math.abs(m.a - 1) < 1e-9 && Math.abs(m.d - 1) < 1e-9 &&
    Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 &&
    Math.abs(m.e) < 1e-9 && Math.abs(m.f) < 1e-9;
  const ctx = {
    fills,
    // Everything the renderer may call. Only fillRect is inspected; the rest must merely not throw.
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, ellipse: noop, rect: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop, clearRect: noop, strokeRect: noop,
    fillText: noop, strokeText: noop, drawImage: noop, putImageData: noop, setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    canvas: { width: CW, height: CH },
    save() { stack.push({ ...m }); },
    restore() { if (stack.length) m = stack.pop(); },
    translate(x, y) { m = mul(m, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    scale(x, y) { m = mul(m, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    rotate(r) {
      const cs = Math.cos(r), sn = Math.sin(r);
      m = mul(m, { a: cs, b: sn, c: -sn, d: cs, e: 0, f: 0 });
    },
    transform(a, b, c, d, e, f) { m = mul(m, { a, b, c, d, e, f }); },
    setTransform(a, b, c, d, e, f) { m = { a, b, c, d, e, f }; },
    resetTransform() { m = { ...ID }; },
    fillRect(x, y, w, h) {
      fills.push({ x, y, w, h, style: ctx.fillStyle, identity: isIdentity() });
    },
  };
  return ctx;
}

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");
const geo = JSON.parse(
  readFileSync(
    join(dir, readdirSync(dir).filter((f) => f.endsWith(".json")).sort()[0]),
    "utf8"
  )
);

const shape = new EditorShape(geo);
const TW = geo.width ?? shape.getActualTrackWidth();
const W = DEFAULT_CONFIG_WORLD;
const bc = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
const rt = RT.getRacerType(geo.defaultRacerTypeId ?? "horse");
const ds = rt.config.displaySize;
const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
const bfL = Math.max(rt.config.bodyFillX, rt.config.bodyFillY);
const effW = TW * bc.startSpreadRange;
const pss = computeRacerLayout(effW, N, ds, W.autoScaleConfig).spriteSize;
const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
const bodyRef = ds * (br.bodyNarrow / ds);
const built = createRaceFromIdentity({
  shape, isOpenTrack: shape.isOpen, pathLengthPx: geo.pathLengthPx ?? 0, trackWidthPx: TW,
  speedMultiplier: rt.getSpeedMultiplier(), baseSpeedConfig: W.baseSpeedConfig, behaviorConfig: bc,
  rowConfig: W.rowLayoutConfig, dynamicsConfig: W.raceDynamicsConfig,
  normalSpeedPxPerSec: normalSpeedFrom(W.baseSpeedConfig), laps: shape.isOpen ? 1 : 2,
  requestedSeconds: 60, nRacers: N, racePlanSeed: 5601, racePlanEnabledFlag: true,
  physicalSpriteSize: pss, drawnBodyWidthRefPx: bodyRef, bodyFillNarrow: bfN, bodyFillLong: bfL,
  constSpeedActive: false,
});
// The renderer expects the RENDER half of the state (particle buffers, per-racer render fields),
// which `createRaceFromIdentity` deliberately does not add — RaceScreen attaches it. Same two calls
// the component and `render-fingerprint.mjs` make.
const st = attachRenderState(built.state);
attachRacerRenderState(st.racers);
const raceCfg = built.config;
const cd = new CameraDirector(geo.worldWidth, geo.worldHeight, shape.isOpen, DEFAULT_CAMERA_CONFIG, bodyRef, shape, TW);
cd.setRandomSeed(1439767152);
raceCfg.computePositions();

// Run to the last crossing, then put the state in the phase the ending lives in.
const RAW = 1000 / 60;
let ts = 0;
let accum = 0;
let cam = { zoom: 1, offsetX: 0, offsetY: 0 };
while (st.finishedCount < N && ts < 600000) {
  accum += RAW;
  let steps = 0;
  while (accum >= FIXED_DT && steps++ < 2) { stepRacePhysics(st, raceCfg); accum -= FIXED_DT; }
  cam = cd.update(st.racers, ts, {
    raceElapsed: ts, finishedCount: st.finishedCount,
    winner: st.racers.find((r) => r.finishRank === 1) ?? null, finishT: st.finishT,
    isOutcomePhase: false, physicsRacers: st.racers,
  }, CW, CH, RAW);
  ts += RAW;
}
st.phase = PHASE.FINISHED;

const rec = recorder();
renderRaceFrame(rec, {
  ts, st, cam, shape, raceData: { racers: st.racers }, isOpenTrack: shape.isOpen,
  bsX: shape.isOpen ? 1.5 : CW / geo.worldWidth,
  bsY: shape.isOpen ? 1.5 : CH / geo.worldHeight,
  worldWidth: geo.worldWidth, worldHeight: geo.worldHeight,
  openTrackHW: shape.isOpen ? TW / 2 : 0,
  bgImagePath: null, bgCanvasReady: false, ceremonyBrand: null, effects: [],
  // The lights are derived the same way the component derives them; `null` is not an accepted
  // shape here (drawTrackLights reads `.outer` unguarded) and a guard that passes a shape the
  // renderer cannot take would be testing its own stub.
  cachedLightPts: (() => {
    const { outer, inner } = shape.getEdgePoints(800);
    return { outer, inner };
  })(),
  trackLightsConfig: geo.trackLights ?? {}, racerType: rt,
  cameraConfig: DEFAULT_CAMERA_CONFIG,
  camera: { hudState: cd.hudState, comebackLockedRacerIndex: null, detectBattleGroup: () => [] },
  displaySize: ds, displaySizeScale: br.bodyNarrow / ds,
  assignmentByRacer: built.meta.assignmentByRacer ?? new Map(),
  showRpStartRow: false, showRpMinimapBadges: false,
  // THE KEY UNDER TEST. `--sabotage` turns the retired splash back on, which is exactly the
  // behaviour this guard exists to refuse, so a green run proves the check can go red.
  showFinishedSplash: SABOTAGE,
  rpPlanInfo: null, renderAlpha: 1, interpolationEnabled: false, tagIncumbents: null,
  leaderDiag: null,
  // The HUD pills read these unguarded; same fixed shapes `render-fingerprint.mjs` passes.
  cfgBadge: { hashShort: "endingfp0", raceCount: 0, cosmeticCount: 0 },
  buildBadge: { commit: "endingfp", branch: "endingfp", dirty: false },
  racePlanActive: false, racePlanSeed: 5601,
  gapRerollDevMarker: false, canvasW: CW, canvasH: CH,
});

// A cover-up is a fill spanning the whole canvas AT THE IDENTITY TRANSFORM — screen space, after the
// world has been drawn. Tolerance of 1 px so a rounded edge is not a miss.
const covering = rec.fills.filter(
  (f) => f.identity && f.x <= 1 && f.y <= 1 && f.w >= CW - 1 && f.h >= CH - 1
);

console.log(
  `check-ending-frame: ${geo.id}, one FINISHED frame, ${rec.fills.length} fillRect call(s) recorded.`
);
if (covering.length > 0) {
  for (const f of covering) {
    console.log(
      `FAIL: a fill covers the whole picture while the ending is running — ` +
        `fillRect(${f.x}, ${f.y}, ${f.w}, ${f.h}) style=${JSON.stringify(f.style)}`
    );
  }
  console.log(
    "The ending is a designed sequence (settled shot, winner card, hold, podium). Nothing may be\n" +
      "drawn over all of it. If a cover-up is genuinely wanted, it belongs in the screen transition,\n" +
      "which already fades to black."
  );
  process.exit(1);
}
console.log("check-ending-frame: nothing covers the race picture during the ending. PASS");
if (SABOTAGE) {
  console.log(
    "SABOTAGE RAN AND THE GUARD STILL PASSED — that is itself a failure: the check cannot go red."
  );
  process.exit(1);
}
