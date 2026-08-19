// ============================================================
// File:        scripts/sprite-size-truth.mjs
// Project:     RaceArena — SPRITE-SIZE-OVERVIEW-1
//
// THE QUESTION: the owner saw two OVERVIEW frames on space-sprint. In one the field is spread, the
// sprites are small and the start numbers are legible. In the other a WIDER piece of the world is on
// screen — and the sprites are LARGER, piled on top of each other, carrying names. A wider shot with
// bigger sprites cannot also be following the zoom, so something else sets the size.
//
// IT DRIVES THE REAL PATH. `scripts/lib/raceDriver.mjs` builds and runs the race — the same loop
// every other harness here uses — and `renderRaceFrame` draws each sampled frame into a recording
// context. Every sizing term below is READ BACK from what that function returned, not recomputed:
// a harness that measures a copy is the failure this repo has already paid for six times.
//
// WHAT IT MEASURES, per sampled frame:
//
//   zoom / worldPx     the delivered zoom, and how much world is across the frame
//   prop               displaySize x displaySizeScale x effZoomX — the size BEFORE any bound
//   floor / ceil       `minDrawnFrameFrac` x canvasH, and the effective `maxTargetScreenPx`
//   binding            which of the three the drawn size actually came from
//   drawnW / drawnH    the sprite's drawn size in canvas px, on both axes
//   gapMed / gapMin    centre-to-centre distance between adjacent racers along the field's own
//                      screen axis, MINUS the drawn width — so "piled up" is a number, and a
//                      negative one means the sprites overlap
//   lbl / name / num   how many labels are drawn, and in which form, from the layout's own answer
//
// A CAVEAT THAT BELONGS BESIDE THE LABEL NUMBERS RATHER THAN IN A FOOTNOTE. `createRecordingContext`
// measures text synthetically — `length x px x 0.55` — because node has no font. So a label WIDTH
// here is the layout algorithm's width, not a browser's, and the name-vs-number counts are what that
// algorithm decides given those widths. The MECHANISM is exact; the threshold would shift a little
// under real metrics. Every number below that depends on it is marked.
//
// Usage:
//   node scripts/sprite-size-truth.mjs           # OVERVIEW frames
//   node scripts/sprite-size-truth.mjs --all     # every sampled frame
//   node scripts/sprite-size-truth.mjs --json
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
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
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { renderRaceFrame } = await import(u("client/src/screens/RaceScreen/renderRaceFrame.js"));
const { attachRenderState, attachRacerRenderState } = await import(
  u("client/src/screens/RaceScreen/renderState.js")
);
const { createRecordingContext } = await import(u("client/src/modules/parity/recordingContext.js"));
const { DEFAULT_TRACK_LIGHTS, sampleBoundaryAtInterval, LIGHT_SPACING_PX } = await import(
  u("client/src/modules/trackLights.js")
);
const { QUICK_TEST_NAMES_MIXED } = await import(u("client/src/modules/racerNames.js"));
const { assignRaceNumbers } = await import(u("client/src/modules/raceNumbers.js"));
const { createLabelFormHold } = await import(u("client/src/screens/RaceScreen/labelFormHold.js"));
const { labelBoxWidth, tagFontScreenPx } = await import(
  u("client/src/screens/RaceScreen/nameTagLayout.js")
);
const { raceNumberLabel } = await import(u("client/src/modules/raceNumbers.js"));
const { getEffectiveMaxTargetScreenPx } = await import(u("client/src/modules/autoSpriteScale.js"));
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u("client/src/modules/rowLayout.js")
);

const CW = 1280;
const CH = 720;
const TRACK = "space-sprint";
const ALL = process.argv.includes("--all");
// THE LABEL ARM. `labelNamesWhenRoom` ships FALSE, so under the shipped default every label on the
// track is a start NUMBER and the name form is never offered. The owner saw NAMES, which means the
// key is TRUE in his stored config — a stored key beats defaults.js per key, forever. Both arms are
// measurable so the report can say what each one costs rather than guessing which he is running.
const NAMES_ARM = process.argv.includes("--names");
const JSON_OUT = process.argv.includes("--json");
const EVERY = 30; // sample every 30 frames ~ 0.5 s
// SHIP-CEREMONY-FIX-1 PART 3: the field size, and the floor sweep.
//
// THE SWEEP IS EXACT RATHER THAN SAMPLED, and that is worth stating because it looks too cheap.
// `minDrawnFrameFrac` is DRAWING-ONLY — CAMERA-MIN-DRAW-1 pins every state zoom byte-identical with
// the floor off, at the default and at an absurd 0.9 — so changing it cannot change the race, the
// camera, or where any racer is on screen. `computeRenderDisplayScale` reduces to
// drawn = clamp(proportional, floor, ceiling). So ONE race per field size gives the exact drawn size
// and the exact neighbour gaps for EVERY floor value, evaluated afterwards from the same frames.
// Running one race per floor would produce identical camera output and take four times as long.
const RACERS = Number((process.argv.find((a) => a.startsWith("--racers=")) ?? "").slice(9)) || 60;
const FLOOR_SWEEP = process.argv.includes("--floor-sweep");

// THE OWNER'S CONTEXT: space-sprint, seed 9, 60 racers. The ROSTER is passed because a racer's NAME
// is an engine input — `stablePairBit` hashes it — so a nameless field runs a different race at the
// same seed, and this is a reproduction of something he watched rather than a self-consistent hash.
const IDENTITY = resolveIdentity({
  racers: RACERS,
  raceSeed: 9,
  racerType: TRACK_DEFAULT_RACER,
  seconds: 60,
  canvasW: CW,
  canvasH: CH,
  roster: QUICK_TEST_NAMES_MIXED,
  note: "SPRITE-SIZE-OVERVIEW-1 — the owner's two OVERVIEW frames",
});

const CAM_CFG = NAMES_ARM
  ? { ...DEFAULT_CAMERA_CONFIG, labelNamesWhenRoom: true }
  : DEFAULT_CAMERA_CONFIG;

const geo = loadTracks({ only: TRACK })[0];
if (!geo) throw new Error(`track ${TRACK} not found`);

const race = buildRace(geo, IDENTITY, CAM_CFG);
const { shape, trackWidthPx: TW, racerType: rt, displaySize: ds, st, cd, meta } = race;

assignRaceNumbers(st.racers);
attachRenderState(st);
attachRacerRenderState(st.racers);

// The two long-parked candidates that live in THIS arithmetic, computed both ways so the report can
// say whether either BINDS rather than whether it exists.
const W = DEFAULT_CONFIG_WORLD;
const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
const effW = TW * behaviorConfig.startSpreadRange;
const brCapped = computeBodyNarrowRef(Math.min(285, effW), IDENTITY.racers, ds, bfN, W.autoScaleConfig);
const brUncapped = computeBodyNarrowRef(effW, IDENTITY.racers, ds, bfN, W.autoScaleConfig);
const displaySizeScale = brCapped.bodyNarrow / ds;
const physicalSpriteSize = computeRacerLayout(effW, IDENTITY.racers, ds, W.autoScaleConfig).spriteSize;

const bsX = CW / (geo.worldWidth || CW);
const bsY = CH / (geo.worldHeight || CH);
const trackLightsConfig = { ...DEFAULT_TRACK_LIGHTS };
const { outer: edgeOuter, inner: edgeInner } = shape.getEdgePoints(800);
const cachedLightPts = {
  outer: sampleBoundaryAtInterval(edgeOuter, LIGHT_SPACING_PX),
  inner: sampleBoundaryAtInterval(edgeInner, LIGHT_SPACING_PX),
};
const raceData = { eventName: geo.name ?? geo.id, trackName: geo.id, subtitle: "" };

let tagIncumbents = null;
let tagWideForms = null;
// ONE PER RACE, MUTATED IN PLACE — the same object RaceScreen holds in a ref. Passing null here (as
// this harness first did) makes `nextWideForms` empty on every frame, so every label reports as a
// NUMBER and the label question cannot be asked at all. The hold is also why EVERY frame is
// rendered below rather than only the sampled ones: the entitlement is earned over 1200 ms of
// continuously clear geometry, and a harness that skipped 29 frames in 30 would be feeding it a
// different history from the one the browser feeds it.
const tagFormHold = createLabelFormHold();
const leaderDiag = { snapshots: [], frozen: false };

const frameArgs = (cam, ts) => ({
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
  ceremonyBrand: null,
  effects: [],
  cachedLightPts,
  trackLightsConfig,
  racerType: rt,
  cameraConfig: CAM_CFG,
  camera: {
    hudState: cd.hudState,
    anchorRacerIndex: cd.anchorRacerIndex,
    comebackLockedRacerIndex: cd.comebackLockedRacerIndex,
    detectBattleGroup: (racers) => cd.detectBattleGroup(racers),
  },
  displaySize: ds,
  displaySizeScale,
  assignmentByRacer: meta.assignmentByRacer ?? new Map(),
  showRpStartRow: false,
  showRpMinimapBadges: false,
  rpPlanInfo: meta.rpPlanInfo ?? null,
  renderAlpha: 1,
  interpolationEnabled: false,
  tagIncumbents,
  tagWideForms,
  tagFormHold,
  leaderDiag,
  cfgBadge: null,
  buildBadge: null,
  racePlanActive: true,
  racePlanSeed: IDENTITY.raceSeed,
  gapRerollDevMarker: false,
  canvasW: CW,
  canvasH: CH,
  ts,
});

/**
 * How close the racers actually are on screen: for each racer, the distance to its NEAREST
 * neighbour in canvas pixels, minus the drawn size. Negative means the two drawn bodies overlap.
 *
 * NEAREST NEIGHBOUR IN 2D, not adjacency along one axis. The first version of this projected every
 * racer onto the field's principal axis and measured consecutive gaps, which conflates two racers
 * side by side ACROSS the track with two behind each other ALONG it — and reported everything as
 * overlapping because it was measuring the wrong distance. "Piled up" is a 2D fact.
 *
 * Only racers whose centre is ON the canvas are counted: a racer off-screen cannot be part of a
 * pile the owner is looking at, and including them drags the median toward the stragglers.
 */
function gaps(cam, zx, zy, drawnW) {
  // zx/zy are the effZoomX/effZoomY `renderRaceFrame` RETURNED for this frame — the same world->
  // screen scale the sprites were drawn with. Recomputing them here would be a second authority on
  // the projection, and the whole point of this harness is that there is one.
  const all = st.racers.map((r) => ({ x: cam.offsetX + r.x * zx, y: cam.offsetY + r.y * zy }));
  const pts = all.filter((p) => p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH);
  if (pts.length < 2) return { median: NaN, min: NaN, onScreen: pts.length, overlapping: 0 };
  const nn = [];
  for (let i = 0; i < pts.length; i++) {
    let best = Infinity;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < best) best = d;
    }
    nn.push(best - drawnW);
  }
  const sorted = [...nn].sort((a, b) => a - b);
  return {
    median: sorted[sorted.length >> 1],
    min: sorted[0],
    onScreen: pts.length,
    overlapping: nn.filter((d) => d < 0).length,
    // The CENTRE-to-centre distances, before the drawn width is subtracted. They depend only on the
    // camera and the field, so the floor sweep re-uses them for every candidate floor.
    centres: nn.map((d) => d + drawnW),
  };
}

const rows = [];
const floorPx = (DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac ?? 0) * CH;
const ceilPx = getEffectiveMaxTargetScreenPx(
  rt?.config?.maxTargetScreenPx,
  DEFAULT_CAMERA_CONFIG.maxTargetScreenPx
);

runRace(race, IDENTITY, CAM_CFG, ({ ts, raceStart, frame }) => {
  // EVERY frame is rendered, because the label layout is STATEFUL: `tagIncumbents` gives an
  // already-drawn label first claim on its pixels, and `tagFormHold` earns a name over 1200 ms of
  // continuously clear geometry. Sampling the RENDER as well as the record would hand both of them
  // a history the browser never produces. Only the ROW is sampled.
  const cam = { zoom: cd.zoom, offsetX: cd.offsetX, offsetY: cd.offsetY };
  const rec = createRecordingContext({ width: CW, height: CH });
  const out = renderRaceFrame(rec, frameArgs(cam, ts));
  tagIncumbents = out.tagShown;
  tagWideForms = out.tagWideForms;
  if (frame % EVERY !== 0) return;

  const { effZoomX, effZoomY, displayScale } = out;
  const drawnW = ds * displayScale * effZoomX;
  const drawnH = ds * displayScale * effZoomY;
  const prop = ds * displaySizeScale * effZoomX;
  const binding = prop < floorPx ? "FLOOR" : ceilPx > 0 && prop > ceilPx ? "CEILING" : "none";
  const g = gaps(cam, effZoomX, effZoomY, drawnW);
  // Is the FINISH GATE on screen? The owner named it as what tells his two frames apart, so it is
  // measured rather than inferred from the zoom.
  const fp = shape.getPosition(Math.max(0, Math.min(1, st.finishT)), 0);
  const fx = cam.offsetX + fp.x * effZoomX;
  const fy = cam.offsetY + fp.y * effZoomY;
  const finishOnScreen = fx >= 0 && fx <= CW && fy >= 0 && fy <= CH;
  const shown = out.tagShown ? out.tagShown.size : 0;
  const names = out.tagWide ? out.tagWide.size : 0;
  // THE LABEL WIDTHS, in canvas px, for the racers that actually carry a label this frame. Both
  // forms are measured on every frame regardless of which one is drawn, so the two can be compared
  // at the same zoom — which is the whole of the second question. The metric is the recorder's
  // synthetic one (length x px x 0.55); see the header.
  const fontPx = tagFontScreenPx(CAM_CFG.nameTagFrameFrac, CH);
  const measure = (t) => labelBoxWidth(String(t).length * fontPx * 0.55);
  const labelled = st.racers.filter((r) => out.tagShown?.has(r.index));
  const numW = labelled.map((r) => measure(raceNumberLabel(r.raceNumber)));
  const nameW = labelled.map((r) => measure(r.name ?? ""));
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : NaN);

  rows.push({
    frame,
    tSec: +((ts - raceStart) / 1000).toFixed(2),
    state: cd.state,
    hudState: cd.hudState,
    zoom: +cam.zoom.toFixed(5),
    effZoomX: +effZoomX.toFixed(5),
    worldPx: Math.round(CW / effZoomX),
    prop: +prop.toFixed(2),
    floorPx: +floorPx.toFixed(2),
    ceilPx,
    binding,
    displayScale: +displayScale.toFixed(5),
    drawnW: +drawnW.toFixed(2),
    drawnH: +drawnH.toFixed(2),
    gapMed: +g.median.toFixed(2),
    gapMin: +g.min.toFixed(2),
    onScreen: g.onScreen,
    overlapping: g.overlapping,
    centres: g.centres,
    finishOnScreen,
    labels: shown,
    names,
    numbers: shown - names,
    numberLabelPx: +med(numW).toFixed(2),
    nameLabelPx: +med(nameW).toFixed(2),
    maxNameLabelPx: +(nameW.length ? Math.max(...nameW) : NaN).toFixed(2),
    progress: +(st.racers.reduce((m, r) => Math.max(m, r.t), 0) / st.finishT).toFixed(3),
  });
});

// ── THE FLOOR SWEEP (SHIP-CEREMONY-FIX-1 PART 3) ────────────────────────────────────────────────
//
// Two shots, chosen by a RULE rather than by a timestamp so the pair is reproducible:
//   WIDE   the widest OVERVIEW frame of the race — the most world on screen, where the floor's
//          over-scale is largest and where the owner's complaint lives.
//   RACING the MEDIAN LEADER_ZOOM frame by world width — the reference shot, the picture the owner
//          approved at 0.75 corridors and the one a lowered floor must not spoil.
if (FLOOR_SWEEP) {
  const pick = (state, how) => {
    const rows2 = rows.filter((r) => r.state === state && r.centres && r.centres.length > 1);
    if (!rows2.length) return null;
    const byWidth = [...rows2].sort((a, b) => a.worldPx - b.worldPx);
    return how === "widest" ? byWidth[byWidth.length - 1] : byWidth[byWidth.length >> 1];
  };
  // The widest OVERVIEW of the whole race is the START GRID, which is the exact frame
  // CAMERA-MIN-DRAW-1 calibrated the floor on — at 20 racers. It is reported, and so is the widest
  // MID-RACE overview separately, because the owner's complaint is about the second and the floor's
  // number was chosen against the first.
  const midRace = (() => {
    const rows2 = rows.filter(
      (r) => r.state === "OVERVIEW" && r.tSec > 10 && r.centres && r.centres.length > 1
    );
    if (!rows2.length) return null;
    return [...rows2].sort((a, b) => a.worldPx - b.worldPx)[rows2.length - 1];
  })();
  const shots = [
    ["START (widest OVERVIEW of all)", pick("OVERVIEW", "widest")],
    ["WIDE  (widest OVERVIEW after 10 s)", midRace],
    ["RACING(median LEADER_ZOOM)", pick("LEADER_ZOOM", "median")],
  ].filter(([, r]) => r);

  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : NaN);
  // 0 turns the floor OFF entirely; the others bracket the shipped 0.045.
  const FLOORS = [0, 0.015, 0.025, 0.035, 0.045];

  console.log(`FLOOR SWEEP — ${TRACK}, seed ${IDENTITY.raceSeed}, ${RACERS} racers, ${CW}x${CH}`);
  console.log(`displaySize ${ds} · displaySizeScale ${displaySizeScale.toFixed(5)} · ceiling ${ceilPx} px`);
  console.log("");
  for (const [label, r] of shots) {
    console.log(`${label}  t=${r.tSec}s  zoom ${r.zoom}  world ${r.worldPx} px  ${r.onScreen} racers on screen`);
    console.log("   floor    floorPx   drawnW   binding    gapMed    gapMin   overlapping   labelFits(num/name)");
    for (const f of FLOORS) {
      const fPx = f * CH;
      const drawn = Math.min(Math.max(r.prop, fPx), ceilPx > 0 ? Math.max(ceilPx, fPx) : Infinity);
      const gaps2 = r.centres.map((c) => c - drawn);
      const bind = r.prop < fPx ? "FLOOR" : "none";
      const gm = med(gaps2);
      // Does a label fit in the space the sprites leave? The centre-to-centre distance minus the
      // drawn sprite is what a label has to live in.
      const room = med(r.centres) - drawn;
      console.log(
        [
          String(f).padStart(8),
          fPx.toFixed(1).padStart(10),
          drawn.toFixed(1).padStart(9),
          bind.padStart(9),
          gm.toFixed(1).padStart(10),
          Math.min(...gaps2).toFixed(1).padStart(10),
          `${gaps2.filter((d) => d < 0).length}/${gaps2.length}`.padStart(14),
          `   ${room >= r.numberLabelPx ? "num YES" : "num no "} ${room >= r.nameLabelPx ? "name YES" : "name no "}`,
        ].join("")
      );
    }
    console.log(`   label widths at this zoom: number ${r.numberLabelPx.toFixed(1)} px, name ${r.nameLabelPx.toFixed(1)} px (median)`);
    console.log("");
  }
  process.exit(0);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ track: TRACK, identity: IDENTITY, rows }, null, 2));
} else {
  console.log(`SPRITE-SIZE-TRUTH — ${TRACK}, ${CW}x${CH}  [labelNamesWhenRoom=${CAM_CFG.labelNamesWhenRoom}]`);
  console.log(formatIdentity(IDENTITY));
  console.log("");
  console.log("THE TERMS THAT DO NOT CHANGE FROM FRAME TO FRAME");
  console.log(`  racer type            ${geo.defaultRacerTypeId}`);
  console.log(`  displaySize           ${ds} world px`);
  console.log(`  displaySizeScale      ${displaySizeScale.toFixed(5)}  (bodyNarrow ${brCapped.bodyNarrow.toFixed(3)})`);
  console.log(`  physicalSpriteSize    ${physicalSpriteSize.toFixed(3)}`);
  console.log(`  FLOOR minDrawnFrameFrac ${DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac} x ${CH} = ${floorPx.toFixed(1)} screen px`);
  console.log(`  CEILING maxTargetScreenPx ${ceilPx} screen px`);
  console.log(
    `  THE 285 CAP           effW ${effW.toFixed(1)} px -> reference ${Math.min(285, effW).toFixed(1)} px; ` +
      `bodyNarrow capped ${brCapped.bodyNarrow.toFixed(4)} vs uncapped ${brUncapped.bodyNarrow.toFixed(4)} -> ` +
      `${brCapped.bodyNarrow === brUncapped.bodyNarrow ? "DOES NOT BIND" : "BINDS"}`
  );
  console.log("");
  console.log(
    " t(s)  prog   state          zoom    worldPx    prop   floor  binding   drawnW   gapMed   gapMin   on  ovl  lbl  name   num   numPx  namePx"
  );
  const table = ALL ? rows : rows.filter((r) => r.state === "OVERVIEW");
  for (const r of table) {
    console.log(
      [
        String(r.tSec).padStart(5),
        r.progress.toFixed(2).padStart(7),
        "  ",
        r.state.padEnd(13),
        String(r.zoom).padStart(8),
        String(r.worldPx).padStart(9),
        r.prop.toFixed(1).padStart(8),
        r.floorPx.toFixed(1).padStart(8),
        r.binding.padStart(9),
        r.drawnW.toFixed(1).padStart(9),
        r.gapMed.toFixed(1).padStart(9),
        r.gapMin.toFixed(1).padStart(9),
        String(r.onScreen).padStart(5),
        String(r.overlapping).padStart(5),
        (r.finishOnScreen ? "  yes" : "   no").padStart(6),
        String(r.labels).padStart(5),
        String(r.names).padStart(6),
        String(r.numbers).padStart(6),
        r.numberLabelPx.toFixed(1).padStart(8),
        r.nameLabelPx.toFixed(1).padStart(8),
      ].join("")
    );
  }
  console.log("");
  const ov = rows.filter((r) => r.state === "OVERVIEW");
  console.log(
    `${rows.length} frames sampled (every ${EVERY}), ${ov.length} in OVERVIEW; ` +
      `${rows.filter((r) => r.binding === "FLOOR").length} of all sampled frames are FLOOR-bound`
  );
}
