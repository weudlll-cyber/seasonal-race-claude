// ============================================================
// File:        scripts/diag/start-formation.mjs
// Project:     RaceArena — START-FORMATION-1
//
// WHAT THIS ANSWERS: why the start formation is readable on some tracks and not on others. The
// owner's eye found two defects at the gun — a neighbouring SPRITE covering a name, and on
// river-run the labels overlapping EACH OTHER with no sprite involved — and observed that
// river-run and space-sprint are almost the same size and both open yet look completely
// different. So track topology is not the explanation, and a diagnosis has to produce the number
// that IS.
//
// WHY IT DRIVES THE REAL CODE. It builds the race through `createRaceFromIdentity`, runs the real
// `CameraDirector.updateCountdown` to the end of the countdown, and reads the real
// `computeRenderDisplayScale` and `tagFontScreenPx`. The same construction `render-fingerprint.mjs`
// uses, at ITS frame 0 — the start formation at the gun. A reconstruction of the layout would be a
// second implementation with no test, which is the defect class this project has already paid for.
//
// TEXT WIDTH IS THE ONE THING IT CANNOT ASK THE REAL CODE FOR, because node has no canvas. It uses
// the Helvetica-Bold advance-width table (AFM units per 1000 em), which is what Arial Bold — the
// `bold Npx sans-serif` the browser resolves on this machine — shares its metrics with. Stated
// rather than hidden: every label width below is that table, not a browser measurement.
//
// IT MEASURES, IT DOES NOT GATE. Nothing here is a fingerprint and nothing here is minted.
//
// Usage:
//   node scripts/diag/start-formation.mjs              # the four tracks the owner watched
//   node scripts/diag/start-formation.mjs --all        # all ten
//   node scripts/diag/start-formation.mjs --racers=20  # override the per-track maximum
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD, DEFAULT_RACE_DEFAULTS } =
  await import(u("client/src/modules/storage/defaults.js"));
const { EditorShape } = await import(
  u("client/src/modules/track-editor/EditorShape.js")
);
const { CameraDirector } = await import(
  u("client/src/modules/camera/CameraDirector.js")
);
const { createRaceFromIdentity } = await import(
  u("client/src/modules/raceCore.js")
);
const { normalSpeedFrom } = await import(
  u("client/src/modules/durationModel.js")
);
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u("client/src/modules/rowLayout.js")
);
const { computeRenderDisplayScale, getEffectiveMaxTargetScreenPx } =
  await import(u("client/src/modules/autoSpriteScale.js"));
const {
  tagFontScreenPx,
  formationNeedsStagger,
  labelStaggerStep,
  assignLabelLevels,
} = await import(u("client/src/screens/RaceScreen/nameTagLayout.js"));
const { effectiveZoom } = await import(
  u("client/src/modules/camera/openTrackCamera.js")
);
const { OPEN_TRACK_BASE_ZOOM } = await import(
  u("client/src/modules/camera/CameraDirector.js")
);
const { QUICK_TEST_NAMES } = await import(
  u("client/src/modules/racerNames.js")
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
// THE OWNER'S RULE, and it is the only honest field size for this question: test the FULL grid a
// track can be asked to hold — 40 on a closed track, 100 on an open one — because that is when the
// formation is at its tightest and a label overlap either happens or provably cannot. A 40-racer
// open track is a half-empty grid and answers a question nobody asked. Read from the shipped
// defaults rather than typed here, so the two cannot drift apart.
const N_OVERRIDE =
  Number(
    (process.argv.find((a) => a.startsWith("--racers=")) ?? "").slice(9),
  ) || 0;
const racersFor = (isOpen) =>
  N_OVERRIDE ||
  (isOpen
    ? DEFAULT_RACE_DEFAULTS.maxPlayersOpen
    : DEFAULT_RACE_DEFAULTS.maxPlayersClosed);
const SEED = 5601;
const CAM_SEED = 1439767152;
const ALL = process.argv.includes("--all");
/** The four tracks the owner watched, in the order he named them. */
const WATCHED = ["ice-track", "river-run", "seatrack", "space-sprint"];

/** Helvetica-Bold advance widths, AFM units per 1000 em. Arial Bold shares these. */
const ADV = {
  " ": 278,
  "(": 333,
  ")": 333,
  A: 722,
  B: 722,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 556,
  K: 722,
  L: 611,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  a: 556,
  b: 611,
  c: 556,
  d: 611,
  e: 556,
  f: 333,
  g: 611,
  h: 611,
  i: 278,
  j: 278,
  k: 556,
  l: 278,
  m: 889,
  n: 611,
  o: 611,
  p: 611,
  q: 611,
  r: 389,
  s: 556,
  t: 333,
  u: 611,
  v: 556,
  w: 778,
  x: 556,
  y: 556,
  z: 500,
};
for (let d = 0; d <= 9; d++) ADV[String(d)] = 556;
const textWidth = (s, fontPx) => {
  let em = 0;
  for (const ch of String(s)) em += ADV[ch] ?? 600;
  return (em / 1000) * fontPx;
};

/** Same padding and geometry constants the drawn label uses (racerRendering.drawNameTag). */
const BOX_PAD_X = 8;
const BOX_H_FACTOR = 1.18;
const BOX_OFFSET_FACTOR = 2.0;

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

function measure(geo, nRequested) {
  const shape = new EditorShape(geo);
  const N = nRequested ?? racersFor(shape.isOpen);
  const TW = geo.width ?? shape.getActualTrackWidth();
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const rt = RT.getRacerType(geo.defaultRacerTypeId ?? "horse");
  const ds = rt.config.displaySize;
  const bfX = rt.config.bodyFillX;
  const bfY = rt.config.bodyFillY;
  const bfN = Math.min(bfX, bfY);
  const bfL = Math.max(bfX, bfY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const layout = computeRacerLayout(effW, N, ds, W.autoScaleConfig);
  const pss = layout.spriteSize;
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
  built.config.computePositions();
  // The names are real, because the label width is the whole question. Same roster, same order.
  st.racers.forEach((r, i) => {
    r.name = QUICK_TEST_NAMES[i % QUICK_TEST_NAMES.length];
  });

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
  const RAW = 1000 / 60;
  const cdMs = DEFAULT_CAMERA_CONFIG.countdownDurationMs ?? 4000;
  let ts = 0;
  let cam = null;
  while (ts < cdMs) {
    cam = cd.updateCountdown(st.racers, ts, ts, cdMs, CW, CH);
    ts += RAW;
  }

  const bsX = CW / geo.worldWidth;
  const bsY = CH / geo.worldHeight;
  const effX = shape.isOpen
    ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM)
    : cam.zoom * bsX;
  const effY = shape.isOpen ? effX : cam.zoom * bsY;

  const displayScale = computeRenderDisplayScale(
    ds,
    br.bodyNarrow / ds,
    effX,
    getEffectiveMaxTargetScreenPx(
      rt.config?.maxTargetScreenPx,
      DEFAULT_CAMERA_CONFIG.maxTargetScreenPx,
    ),
    DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac,
    CH,
  );
  const fontPx = tagFontScreenPx(DEFAULT_CAMERA_CONFIG.nameTagFrameFrac, CH);
  const boxH = fontPx * BOX_H_FACTOR;
  const offsetAbove = fontPx * BOX_OFFSET_FACTOR;

  // WHAT `displayScale` ACTUALLY IS, and it is not the size: `SpriteRacerType._drawBody` states it —
  // "the visible narrow body equals displaySize × displaySizeScale in world pixels". So that product
  // is the body ACROSS the heading; the body ALONG it is that times bodyFillLong/bodyFillNarrow, and
  // the sprite FRAME (what the row layout reserves) is the narrow body divided by bodyFillNarrow.
  // Three different numbers that a careless reading collapses into one.
  const bodyNarrowWorld = ds * displayScale;
  const bodyLongWorld = bodyNarrowWorld * (bfL / bfN);
  const frameWorld = bodyNarrowWorld / bfN;

  // Every racer's label box and drawn sprite box, in SCREEN px, exactly where they land.
  const items = st.racers.map((r) => {
    const sx = r.x * effX + cam.offsetX;
    const sy = r.y * effY + cam.offsetY;
    const w = textWidth(r.name, fontPx) + BOX_PAD_X;
    const along = frameWorld * bfX;
    const across = frameWorld * bfY;
    const ca = Math.abs(Math.cos(r.angle ?? 0));
    const sa = Math.abs(Math.sin(r.angle ?? 0));
    const halfWx = 0.5 * (along * ca + across * sa) * effX;
    const halfHy = 0.5 * (along * sa + across * ca) * effY;
    return {
      index: r.index,
      name: r.name,
      sx,
      sy,
      label: {
        left: sx - w / 2,
        right: sx + w / 2,
        top: sy - offsetAbove - boxH,
        bottom: sy - offsetAbove,
      },
      frameW: frameWorld * effX,
      frameH: frameWorld * effY,
      bodyW: 2 * halfWx,
      bodyH: 2 * halfHy,
    };
  });

  // ── DEFECT A, as the owner restated it: a name tag must never be covered BY A RACER. Not "at
  // the start formation" and not "by a later one" — ever, by any of them. So this counts a name
  // whose box is touched by ANY racer's drawn body, and separately by one drawn LATER, which is
  // the subset the old single-pass order actually put on screen. After the two-pass fix the second
  // number stops meaning anything about the picture; the first is the standing requirement, and it
  // is a LAYOUT question that stage 3 owns.
  let coveredByAny = 0;
  let coveredByLater = 0;
  for (let i = 0; i < items.length; i++) {
    const L = items[i].label;
    let any = false;
    let later = false;
    for (let j = 0; j < items.length; j++) {
      if (j === i) continue;
      const s = items[j];
      const box = {
        left: s.sx - s.bodyW / 2,
        right: s.sx + s.bodyW / 2,
        top: s.sy - s.bodyH / 2,
        bottom: s.sy + s.bodyH / 2,
      };
      if (
        box.left < L.right &&
        box.right > L.left &&
        box.top < L.bottom &&
        box.bottom > L.top
      ) {
        any = true;
        if (j > i) later = true;
      }
    }
    if (any) coveredByAny++;
    if (later) coveredByLater++;
  }

  // ── DEFECT B: label-on-label. Every unordered pair that overlaps at all — AND which START ROW
  // each half of the pair came from, because that is what names the mechanism. Two labels in the
  // SAME row are separated by the lateral spacing across the corridor; two in NEIGHBOURING rows are
  // separated by the row gap along the track. They are different numbers with different owners, and
  // guessing which one binds is how a fix lands on the wrong knob.
  const rowOf = new Map();
  for (const a of built.meta.assignmentByRacer.values())
    rowOf.set(a.racerIndex, a.rowIndex);
  // ── LABEL-STAGGER-1 VERIFICATION. The decision comes from the SHIPPED function, never a copy, so
  // this cannot certify a rule the game does not actually run. The boxes are then moved the way the
  // renderer moves them — row parity, one step — and re-tested. Two numbers matter: does it fire
  // only where an overlap existed, and is nothing left once it has.
  const staggerFires = formationNeedsStagger(items.map((i) => i.label));
  const step = labelStaggerStep(fontPx);
  let pairOverlapsAfter = 0;
  const afterByRowDist = new Map();
  {
    const levelOf = staggerFires
      ? assignLabelLevels(
          items.map((i) => ({ index: i.index, ...i.label })),
          rowOf,
          step,
          Number(process.env.RA_LEVELS || 2),
        )
      : null;
    const moved = items.map((i) => {
      const d = (staggerFires ? (levelOf.get(i.index) ?? 0) : 0) * step;
      return {
        left: i.label.left,
        right: i.label.right,
        top: i.label.top - d,
        bottom: i.label.bottom - d,
      };
    });
    for (let i = 0; i < moved.length; i++)
      for (let j = i + 1; j < moved.length; j++) {
        const a2 = moved[i];
        const b2 = moved[j];
        if (
          Math.min(a2.right, b2.right) > Math.max(a2.left, b2.left) &&
          Math.min(a2.bottom, b2.bottom) > Math.max(a2.top, b2.top)
        ) {
          pairOverlapsAfter++;
          const rd = Math.abs(
            (rowOf.get(items[i].index) ?? 0) - (rowOf.get(items[j].index) ?? 0),
          );
          afterByRowDist.set(rd, (afterByRowDist.get(rd) ?? 0) + 1);
          if (
            process.env.RA_PROBE &&
            geo.id === "river-run" &&
            N === 72 &&
            pairOverlapsAfter <= 3
          ) {
            console.error(
              `PROBE rows ${rowOf.get(items[i].index)}/${rowOf.get(items[j].index)} ` +
                `fires=${staggerFires} step=${step.toFixed(2)} ` +
                `A[${a2.top.toFixed(1)},${a2.bottom.toFixed(1)}] B[${b2.top.toFixed(1)},${b2.bottom.toFixed(1)}] ` +
                `Ax[${a2.left.toFixed(1)},${a2.right.toFixed(1)}] Bx[${b2.left.toFixed(1)},${b2.right.toFixed(1)}]`,
            );
          }
        }
      }
  }

  let pairOverlaps = 0;
  let sameRowPairs = 0;
  let crossRowPairs = 0;
  let labelsHit = new Set();
  let worstFrac = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].label;
      const b = items[j].label;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0 && oy > 0) {
        pairOverlaps++;
        if (rowOf.get(items[i].index) === rowOf.get(items[j].index))
          sameRowPairs++;
        else crossRowPairs++;
        labelsHit.add(i);
        labelsHit.add(j);
        const area = (a.right - a.left) * (a.bottom - a.top);
        worstFrac = Math.max(worstFrac, (ox * oy) / area);
      }
    }
  }

  // Lateral spacing: adjacent racers WITHIN the front row, along the row, in screen px.
  const rows = new Map();
  for (const a of built.meta.assignmentByRacer.values()) {
    if (!rows.has(a.rowIndex)) rows.set(a.rowIndex, []);
    rows.get(a.rowIndex).push(a);
  }
  const front = (rows.get(0) ?? [])
    .slice()
    .sort((p, q) => p.indexInRow - q.indexInRow);
  const gaps = [];
  const gapsX = [];
  const gapsY = [];
  for (let k = 1; k < front.length; k++) {
    const A = items[front[k - 1].racerIndex];
    const B = items[front[k].racerIndex];
    gaps.push(Math.hypot(B.sx - A.sx, B.sy - A.sy));
    gapsX.push(Math.abs(B.sx - A.sx));
    gapsY.push(Math.abs(B.sy - A.sy));
  }
  const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const meanGap = mean(gaps);
  // WHICH WAY THE ROW RUNS ON SCREEN decides which budget binds. Labels are axis-aligned boxes: two
  // of them miss each other if they are separated horizontally by their widths OR vertically by one
  // box height. A row running down the screen is cheap; a row running across it is not.
  const meanGapX = mean(gapsX);
  const meanGapY = mean(gapsY);
  const rowTiltDeg = (Math.atan2(meanGapY, meanGapX) * 180) / Math.PI;

  // How much of the frame the whole formation occupies.
  const xs = items.map((i) => i.sx);
  const ys = items.map((i) => i.sy);
  const bbW = Math.max(...xs) - Math.min(...xs);
  const bbH = Math.max(...ys) - Math.min(...ys);

  const widest = Math.max(...items.map((i) => i.label.right - i.label.left));
  const meanLabel =
    items.reduce((s, i) => s + (i.label.right - i.label.left), 0) /
    items.length;

  return {
    id: geo.id,
    open: shape.isOpen,
    racerType: geo.defaultRacerTypeId,
    worldW: geo.worldWidth,
    worldH: geo.worldHeight,
    trackWidthPx: TW,
    displaySizeCfg: ds,
    bodyFillX: bfX,
    bodyFillY: bfY,
    rowCount: layout.rowCount,
    racersPerRow: layout.racersPerRow,
    frontRowSize: front.length,
    spriteWorldPx: pss,
    bodyNarrowRef: br.bodyNarrow,
    camZoom: cam.zoom,
    effX,
    effY,
    displayScale,
    nRacers: N,
    spriteScreenW: frameWorld * effX,
    bodyScreenW: bodyNarrowWorld * effX,
    bodyLongScreen: bodyLongWorld * effX,
    fontPx,
    meanLabelW: meanLabel,
    widestLabelW: widest,
    meanGap,
    meanGapX,
    meanGapY,
    rowTiltDeg,
    boxH,
    minGap: gaps.length ? Math.min(...gaps) : 0,
    gapOverLabel: meanLabel > 0 ? meanGap / meanLabel : 0,
    // The honest headroom: 1.0 means the neighbour's label sits exactly at the collision boundary.
    // Whichever axis is cheaper wins, because either separation alone keeps the boxes apart.
    // THE HONEST HEADROOM, in screen px of clear air. Two axis-aligned boxes miss each other if
    // EITHER separation is positive, so the readable one is the larger. Negative on both = overlap.
    clearX: meanGapX - meanLabel,
    clearY: meanGapY - boxH,
    bbW,
    bbH,
    frameFracW: bbW / CW,
    frameFracH: bbH / CH,
    coveredByAny,
    coveredByLater,
    coveredPct: (100 * coveredByAny) / items.length,
    coveredLaterPct: (100 * coveredByLater) / items.length,
    pairOverlaps,
    sameRowPairs,
    crossRowPairs,
    labelsHitPct: (100 * labelsHit.size) / items.length,
    worstFrac,
    staggerFires,
    pairOverlapsAfter,
    afterByRowDist: [...afterByRowDist.entries()].sort((x, y) => x[0] - y[0]),
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id && (ALL || WATCHED.includes(j.id))) geos.push(j);
}
geos.sort((a, b) =>
  ALL
    ? a.id.localeCompare(b.id)
    : WATCHED.indexOf(a.id) - WATCHED.indexOf(b.id),
);

const r2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const rows = geos.map((g) => measure(g));

console.log(
  `START FORMATION at the gun — ${rows.length} tracks at the FULL grid ` +
    `(closed ${DEFAULT_RACE_DEFAULTS.maxPlayersClosed}, open ${DEFAULT_RACE_DEFAULTS.maxPlayersOpen})` +
    `${N_OVERRIDE ? ` OVERRIDDEN to ${N_OVERRIDE}` : ""}, seed ${SEED}, camSeed ${CAM_SEED}, ${CW}x${CH}\n`,
);

const cols = [
  ["track", (r) => r.id, 15],
  ["open", (r) => (r.open ? "yes" : "no"), 5],
  ["N", (r) => String(r.nRacers), 5],
  ["type", (r) => r.racerType, 11],
  ["TW", (r) => String(r.trackWidthPx), 5],
  ["dispSz", (r) => String(r.displaySizeCfg), 7],
  ["fillX", (r) => r2(r.bodyFillX), 6],
  ["rows", (r) => String(r.rowCount), 5],
  ["per row", (r) => String(r.frontRowSize), 8],
  ["sprite w.px", (r) => r2(r.spriteWorldPx), 12],
  ["camZoom", (r) => r2(r.camZoom), 8],
  ["eff px/w", (r) => r2(r.effX), 9],
];
console.log("── GEOMETRY: what the layout and the camera decide ──");
console.log(cols.map(([h, , w]) => h.padEnd(w)).join(""));
for (const r of rows)
  console.log(cols.map(([, f, w]) => String(f(r)).padEnd(w)).join(""));

const cols2 = [
  ["track", (r) => r.id, 15],
  ["frame scr", (r) => r2(r.spriteScreenW), 10],
  ["body scr", (r) => r2(r.bodyScreenW), 9],
  ["gap scr", (r) => r2(r.meanGap), 8],
  ["gap dx", (r) => r2(r.meanGapX), 7],
  ["gap dy", (r) => r2(r.meanGapY), 7],
  ["tilt°", (r) => r2(r.rowTiltDeg), 6],
  ["label w", (r) => r2(r.meanLabelW), 8],
  ["box h", (r) => r2(r.boxH), 6],
  ["clear dx", (r) => r2(r.clearX), 9],
  ["clear dy", (r) => r2(r.clearY), 9],
  ["form %W", (r) => r2(100 * r.frameFracW), 8],
  ["form %H", (r) => r2(100 * r.frameFracH), 8],
];
console.log(
  "\n── READABILITY: screen px. headroom < 1 means neighbouring labels must overlap ──\n" +
    "   (tilt 0° = the start row runs ACROSS the screen, 90° = straight DOWN it)",
);
console.log(cols2.map(([h, , w]) => h.padEnd(w)).join(""));
for (const r of rows)
  console.log(cols2.map(([, f, w]) => String(f(r)).padEnd(w)).join(""));

const cols3 = [
  ["track", (r) => r.id, 15],
  [
    "A: name under sprite",
    (r) => `${r.coveredByLater}/${r.nRacers}  (${r2(r.coveredPct)}%)`,
    22,
  ],
  ["B: pairs", (r) => String(r.pairOverlaps), 10],
  ["same row", (r) => String(r.sameRowPairs), 10],
  ["cross row", (r) => String(r.crossRowPairs), 11],
  ["B: labels hit %", (r) => r2(r.labelsHitPct), 16],
  ["worst overlap", (r) => r2(100 * r.worstFrac) + "%", 14],
];
console.log("\n── THE TWO DEFECTS, counted ──");
console.log(cols3.map(([h, , w]) => h.padEnd(w)).join(""));
for (const r of rows)
  console.log(cols3.map(([, f, w]) => String(f(r)).padEnd(w)).join(""));

// ── THE SWEEP ────────────────────────────────────────────────────────────────────────────────────
// THE OWNER'S ACCEPTANCE, in his words: there must be NO overlap at ANY racer count. So a single
// field size — even the maximum — is the wrong instrument. The maximum is not the worst case: the
// row count is a STAIRCASE (`ceil(N / racersPerRow)`), so adding one racer can open a whole new row
// and RELAX the spacing, and the tightest formation sits just BELOW each step, not at the top of the
// range. This walks every count from 2 to the track's maximum and reports where the floor actually
// is, which is the only form of the question that can be answered "never".
const SWEEP_MIN = 2;
const sweeps = geos.map((geo) => {
  const shape = new EditorShape(geo);
  const max = N_OVERRIDE || racersFor(shape.isOpen);
  const points = [];
  for (let n = SWEEP_MIN; n <= max; n++) points.push(measure(geo, n));
  const overlapping = points.filter((p) => p.pairOverlaps > 0);
  // The binding case: the least clear air on the axis that is actually keeping the boxes apart.
  const clearOf = (p) => Math.max(p.clearX, p.clearY);
  const tightest = points.reduce((a, b) => (clearOf(b) < clearOf(a) ? b : a));
  const worstA = points.reduce((a, b) => (b.coveredPct > a.coveredPct ? b : a));
  return { id: geo.id, max, points, overlapping, tightest, worstA, clearOf };
});

console.log(
  `\n── THE SWEEP: every racer count from ${SWEEP_MIN} to the track maximum ──`,
);
const cols4 = [
  ["track", (s) => s.id, 15],
  ["N tested", (s) => `${SWEEP_MIN}..${s.max}`, 10],
  [
    "counts WITH overlap",
    (s) => `${s.overlapping.length}/${s.points.length}`,
    20,
  ],
  [
    "first N",
    (s) => (s.overlapping.length ? String(s.overlapping[0].nRacers) : "—"),
    8,
  ],
  ["tightest at N", (s) => String(s.tightest.nRacers), 14],
  ["its clear air", (s) => r2(s.clearOf(s.tightest)) + " px", 14],
];
console.log(cols4.map(([h, , w]) => h.padEnd(w)).join(""));
for (const s of sweeps)
  console.log(cols4.map(([, f, w]) => String(f(s)).padEnd(w)).join(""));

for (const s of sweeps) {
  if (!s.overlapping.length) continue;
  const list = s.overlapping.map((p) => p.nRacers);
  console.log(
    `\n  ${s.id}: labels overlap at N = ${list.join(", ")}` +
      `\n    worst: N=${s.overlapping.reduce((a, b) => (b.labelsHitPct > a.labelsHitPct ? b : a)).nRacers}` +
      ` → ${r2(s.overlapping.reduce((a, b) => (b.labelsHitPct > a.labelsHitPct ? b : a)).labelsHitPct)}% of labels hit`,
  );
}

// ── LABEL-STAGGER-1: the acceptance table. Three questions, and all three must come out clean.
console.log(
  `\n── LABEL-STAGGER-1: does the rule fire only where needed, and does it work? ──`,
);
const cols6 = [
  ["track", (s) => s.id, 15],
  ["counts", (s) => `${SWEEP_MIN}..${s.max}`, 9],
  [
    "overlapped before",
    (s) => String(s.points.filter((p) => p.pairOverlaps > 0).length),
    19,
  ],
  [
    "rule fires",
    (s) => String(s.points.filter((p) => p.staggerFires).length),
    12,
  ],
  [
    "fires w/o need",
    (s) =>
      String(
        s.points.filter((p) => p.staggerFires && p.pairOverlaps === 0).length,
      ),
    16,
  ],
  [
    "misses",
    (s) =>
      String(
        s.points.filter((p) => !p.staggerFires && p.pairOverlaps > 0).length,
      ),
    8,
  ],
  [
    "OVERLAP LEFT",
    (s) => String(s.points.filter((p) => p.pairOverlapsAfter > 0).length),
    14,
  ],
  [
    "first fires at",
    (s) => {
      const f = s.points.find((p) => p.staggerFires);
      return f ? String(f.nRacers) : "never";
    },
    14,
  ],
];
console.log(cols6.map(([h, , w]) => h.padEnd(w)).join(""));
for (const s of sweeps)
  console.log(cols6.map(([, f, w]) => String(f(s)).padEnd(w)).join(""));
{
  const tot = (fn) =>
    sweeps.reduce((a, s) => a + s.points.filter(fn).length, 0);
  console.log(
    `\n  TOTALS — fired where NOT needed: ${tot((p) => p.staggerFires && p.pairOverlaps === 0)}` +
      `   missed a real overlap: ${tot((p) => !p.staggerFires && p.pairOverlaps > 0)}` +
      `   overlap remaining after the rule: ${tot((p) => p.pairOverlapsAfter > 0)}`,
  );
  // A rule that switched on and off between adjacent field sizes would look unstable to anyone who
  // changes the roster by one. Reported because it is worth knowing BEFORE he sees it, not after.
  for (const s of sweeps) {
    const flips = [];
    for (let k = 1; k < s.points.length; k++)
      if (s.points[k].staggerFires !== s.points[k - 1].staggerFires)
        flips.push(`${s.points[k - 1].nRacers}->${s.points[k].nRacers}`);
    if (flips.length > 1)
      console.log(
        `  ${s.id}: the rule TOGGLES ${flips.length} times — ${flips.join(", ")}`,
      );
    else if (flips.length === 1)
      console.log(`  ${s.id}: switches on once, at ${flips[0]}`);
  }
  // WHAT IS LEFT OVER, classified by how many rows apart the two labels are. This is the number that
  // decides whether two levels can ever be enough: a residual at row distance 2 is two labels the
  // parity put back on the SAME level, and no choice of step fixes that.
  for (const s of sweeps) {
    const agg = new Map();
    for (const p of s.points)
      for (const [d, c] of p.afterByRowDist) agg.set(d, (agg.get(d) ?? 0) + c);
    if (agg.size)
      console.log(
        `  RESIDUAL ${s.id}: overlapping pairs by ROW DISTANCE -> ` +
          [...agg.entries()]
            .sort((x, y) => x[0] - y[0])
            .map(([d, c]) => `${d}:${c}`)
            .join("  "),
      );
  }
}

console.log(
  `\n── DEFECT A ACROSS THE SWEEP: the worst count for names under sprites ──`,
);
const cols5 = [
  ["track", (s) => s.id, 15],
  ["worst at N", (s) => String(s.worstA.nRacers), 12],
  [
    "names covered",
    (s) =>
      `${s.worstA.coveredByLater}/${s.worstA.nRacers} (${r2(s.worstA.coveredPct)}%)`,
    22,
  ],
  [
    "at the maximum",
    (s) => r2(s.points[s.points.length - 1].coveredPct) + "%",
    16,
  ],
];
console.log(cols5.map(([h, , w]) => h.padEnd(w)).join(""));
for (const s of sweeps)
  console.log(cols5.map(([, f, w]) => String(f(s)).padEnd(w)).join(""));

console.log(
  "\n  A = a name whose box is touched by ANY racer's drawn body. The owner's requirement is that a\n" +
    "  name tag is NEVER covered by a racer, so this is the standing number; the draw order (now\n" +
    "  fixed) only decided which of them the viewer actually SAW.\n" +
    "  B = label-on-label overlap, no sprite involved. Label widths are the Helvetica-Bold table,\n" +
    "  not a browser measurement — see the file header.",
);
