// ============================================================
// File:        scripts/finish-band-truth.mjs
// Project:     RaceArena — FINISH-READABLE-2
//
// THE QUESTION, and it is the owner's. He judged the finish marking on a production build on
// 2026-08-12, on dirt-oval and garden-path, and rejected it: too faint to find at all. So: how big
// is the finish marking ON SCREEN at the shots he actually watches, how much area does it paint on each of the ten
// tracks, and — because the band is being put back ACROSS the racing surface — is it drawn UNDER the
// racers or over them?
//
// ── WHAT IT MEASURES, all three off ONE real rendered frame per shot ────────────────────────────
//
// 1. THE THREE SHOTS ARE MEASURED, NOT ASSUMED. A real seeded race is run per track and the camera's
//    own effective zoom is recorded on every frame. The WIDEST OVERVIEW is the minimum, the MID-RACE
//    shot the median, the TIGHTEST ENDGAME shot the maximum inside the endgame window. Sizes are then
//    reported at those three, because "he cannot see it" is a claim about the widest one.
//
// 2. AREA IS COMPUTED IN SCREEN SPACE, through the recorder's own transform stack. A world-space area
//    says nothing about whether a person can see the mark; FINISH-READABLE-1 measured world px² and
//    shipped a 9 px band on that basis, which is the mistake this instrument exists to stop.
//
// 3. ORDER IS RECORDED. Every operation carries the index it was issued at, so "the band is under the
//    racers" is a comparison between two integers rather than a claim about the source.
//
// Usage:
//   node scripts/finish-band-truth.mjs                      # ten tracks, the table
//   node scripts/finish-band-truth.mjs --only=dirt-oval --dump
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const argOf = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = argOf("only", null);
const DUMP = process.argv.includes("--dump");

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { EditorShape } = await import(u("client/src/modules/track-editor/EditorShape.js"));
const { CameraDirector } = await import(u("client/src/modules/camera/CameraDirector.js"));
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u("client/src/modules/raceCore.js")
);
const { normalSpeedFrom } = await import(u("client/src/modules/durationModel.js"));
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u("client/src/modules/rowLayout.js")
);
const { renderRaceFrame } = await import(u("client/src/screens/RaceScreen/renderRaceFrame.js"));
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
const N = 20;
const SEED = 5601;
const CAM_SEED = 1439767152;

/**
 * A recording context that tracks the TRANSFORM and computes SCREEN-SPACE polygon area.
 *
 * The transform stack is the same idea `check-ending-frame.mjs` needed for the same reason: the
 * renderer draws the world inside a transform, so a coordinate handed to `lineTo` is not a screen
 * coordinate and an area computed from it is not a screen area.
 */
function recorder() {
  const ops = [];
  const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let m = { ...ID };
  const stack = [];
  let pts = [];
  let raw = [];
  let n = 0;
  const mul = (p, q) => ({
    a: p.a * q.a + p.c * q.b,
    b: p.b * q.a + p.d * q.b,
    c: p.a * q.c + p.c * q.d,
    d: p.b * q.c + p.d * q.d,
    e: p.a * q.e + p.c * q.f + p.e,
    f: p.b * q.e + p.d * q.f + p.f,
  });
  const toScreen = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
  /** Shoelace, on the SCREEN-space points. */
  const area = (p) => {
    if (p.length < 3) return 0;
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      s += p[i].x * q.y - q.x * p[i].y;
    }
    return Math.abs(s) / 2;
  };
  const noop = () => {};
  const ctx = {
    ops,
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "10px sans-serif",
    globalAlpha: 1,
    textAlign: "left",
    textBaseline: "alphabetic",
    canvas: { width: CW, height: CH },
    /** An exact boundary marker, pushed by the wrapped racerType.drawRacer. */
    mark() { ops.push({ n: n++, kind: "racer-mark" }); },
    beginPath() { pts = []; raw = []; },
    closePath: noop,
    moveTo(x, y) { pts.push(toScreen(x, y)); raw.push({ x, y }); },
    lineTo(x, y) { pts.push(toScreen(x, y)); raw.push({ x, y }); },
    rect(x, y, w, h) {
      pts = [toScreen(x, y), toScreen(x + w, y), toScreen(x + w, y + h), toScreen(x, y + h)];
    },
    arc(x, y, r) {
      const c = toScreen(x, y);
      const e = toScreen(x + r, y);
      ops.push({ n: n++, kind: "arc", x: c.x, y: c.y, r: Math.hypot(e.x - c.x, e.y - c.y),
                 style: ctx.fillStyle, rx: x, ry: y });
      pts = [];
    },
    arcTo: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop, clip: noop,
    roundRect(x, y, w, h) { this.rect(x, y, w, h); },
    setLineDash: noop, clearRect: noop, strokeRect: noop, putImageData: noop,
    fill() {
      if (pts.length >= 3) {
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        ops.push({
          n: n++, kind: "fill", area: area(pts), style: ctx.fillStyle, pts: pts.length,
          cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2,
          w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
          rx: raw.reduce((a, p) => a + p.x, 0) / raw.length,
          ry: raw.reduce((a, p) => a + p.y, 0) / raw.length,
        });
      }
      pts = []; raw = [];
    },
    stroke() {
      if (pts.length >= 2) {
        // A stroke's visible thickness is lineWidth scaled by the transform.
        const sc = Math.hypot(m.a, m.b);
        ops.push({ n: n++, kind: "stroke", style: ctx.strokeStyle, wpx: ctx.lineWidth * sc,
                   len: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) });
      }
      pts = [];
    },
    fillRect(x, y, w, h) {
      const p = [toScreen(x, y), toScreen(x + w, y), toScreen(x + w, y + h), toScreen(x, y + h)];
      ops.push({ n: n++, kind: "fillRect", area: area(p), style: ctx.fillStyle,
                 cx: (p[0].x + p[2].x) / 2, cy: (p[0].y + p[2].y) / 2 });
    },
    fillText(t, x, y) {
      // The rendered CAP HEIGHT on screen: the font size times the transform's Y scale.
      const px = parseFloat(String(ctx.font).match(/([\d.]+)px/)?.[1] ?? "0");
      const sc = Math.hypot(m.c, m.d);
      const p = toScreen(x, y);
      ops.push({ n: n++, kind: "text", text: String(t), screenPx: px * sc, x: p.x, y: p.y });
    },
    strokeText: noop,
    drawImage(img, ...a) {
      // Both signatures; the last two arguments are always the destination size.
      const dw = a.length >= 8 ? a[6] : a[2];
      const dh = a.length >= 8 ? a[7] : a[3];
      const dx = a.length >= 8 ? a[4] : a[0];
      const dy = a.length >= 8 ? a[5] : a[1];
      const p = toScreen(dx ?? 0, dy ?? 0);
      ops.push({ n: n++, kind: "sprite", x: p.x, y: p.y,
                 w: (dw ?? 0) * Math.hypot(m.a, m.b), h: (dh ?? 0) * Math.hypot(m.c, m.d) });
    },
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8,
                           actualBoundingBoxDescent: 2 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
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
  };
  return ctx;
}

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

function loadGeos() {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (j.id && (!ONLY || j.id === ONLY)) out.push(j);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function buildRace(geo) {
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
    requestedSeconds: 60, nRacers: N, racePlanSeed: SEED, racePlanEnabledFlag: true,
    physicalSpriteSize: pss, drawnBodyWidthRefPx: bodyRef, bodyFillNarrow: bfN, bodyFillLong: bfL,
    constSpeedActive: false,
  });
  const st = attachRenderState(built.state);
  attachRacerRenderState(st.racers);
  const cd = new CameraDirector(geo.worldWidth, geo.worldHeight, shape.isOpen,
                                DEFAULT_CAMERA_CONFIG, bodyRef, shape, TW);
  cd.setRandomSeed(CAM_SEED);
  built.config.computePositions();
  return { geo, shape, TW, rt, ds, bodyRef, br, st, cd, raceCfg: built.config, meta: built.meta };
}

const OPEN_BASE = 1.5;
const effOf = (race, cam) => {
  const { geo, shape } = race;
  const bsX = shape.isOpen ? OPEN_BASE : CW / geo.worldWidth;
  const bsY = shape.isOpen ? OPEN_BASE : CH / geo.worldHeight;
  const x = shape.isOpen ? cam.zoom * OPEN_BASE : cam.zoom * bsX;
  return { effZoomX: x, effZoomY: shape.isOpen ? x : cam.zoom * bsY, bsX, bsY };
};

function renderAt(race, cam, ts) {
  const { geo, shape, TW, rt, ds, br, st, cd, meta } = race;
  const { bsX, bsY } = effOf(race, cam);
  const rec = recorder();
  // ── THE RACER BOUNDARY IS MARKED EXACTLY, NOT INFERRED ──────────────────────────────────────
  //
  // Two earlier versions of this check guessed at which ops belonged to a racer — first by arc
  // radius (which flagged the track LIGHTS) and then by world position (which flagged a track light
  // that happened to sit within a body of a racer near the edge, on all five open tracks). Both
  // reported the band drawn over the racers, and both were wrong.
  //
  // `drawRacers` reaches every racer through exactly one call — `racerType.drawRacer` — and the
  // racer type is a PARAMETER of the frame rather than an import, so it can be wrapped. Every draw
  // after the first marker is a racer's, by construction, and no heuristic is involved.
  const rtProxy = Object.create(rt);
  rtProxy.drawRacer = function (...args) {
    rec.mark();
    return rt.drawRacer.apply(rt, args);
  };
  renderRaceFrame(rec, {
    ts, st, cam, shape, raceData: { racers: st.racers }, isOpenTrack: shape.isOpen,
    bsX, bsY, worldWidth: geo.worldWidth, worldHeight: geo.worldHeight,
    openTrackHW: shape.isOpen ? TW / 2 : 0,
    bgImagePath: null, bgCanvasReady: false, ceremonyBrand: null, effects: [],
    cachedLightPts: (() => { const { outer, inner } = shape.getEdgePoints(800); return { outer, inner }; })(),
    trackLightsConfig: geo.trackLights ?? {}, racerType: rtProxy,
    cameraConfig: DEFAULT_CAMERA_CONFIG,
    camera: { hudState: cd.hudState, comebackLockedRacerIndex: null, detectBattleGroup: () => [] },
    displaySize: ds, displaySizeScale: br.bodyNarrow / ds,
    assignmentByRacer: meta.assignmentByRacer ?? new Map(),
    showRpStartRow: false, showRpMinimapBadges: false, showFinishedSplash: false,
    rpPlanInfo: null, renderAlpha: 1, interpolationEnabled: false, tagIncumbents: null,
    leaderDiag: null,
    cfgBadge: { hashShort: "bandtruth", raceCount: 0, cosmeticCount: 0 },
    buildBadge: { commit: "bandtruth", branch: "bandtruth", dirty: false },
    racePlanActive: false, racePlanSeed: SEED,
    gapRerollDevMarker: false, canvasW: CW, canvasH: CH,
  });
  return rec;
}

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const rows = [];
for (const geo of loadGeos()) {
  const race = buildRace(geo);
  const { st, cd, raceCfg } = race;
  const RAW = 1000 / 60;
  let ts = 0, accum = 0;
  let cam = { zoom: 1, offsetX: 0, offsetY: 0 };
  const frames = [];
  const endgame = DEFAULT_CAMERA_CONFIG.endgameThreshold;
  while (st.finishedCount < N && ts < 200000) {
    accum += RAW;
    let steps = 0;
    while (accum >= FIXED_DT && steps++ < 2) { stepRacePhysics(st, raceCfg); accum -= FIXED_DT; }
    cam = cd.update(st.racers, ts, {
      raceElapsed: ts, finishedCount: st.finishedCount,
      winner: st.racers.find((r) => r.finishRank === 1) ?? null, finishT: st.finishT,
      isOutcomePhase: false, physicsRacers: st.racers,
    }, CW, CH, RAW);
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    frames.push({ ts, cam: { ...cam }, prog: st.finishT > 0 ? maxT / st.finishT : 0 });
    ts += RAW;
  }
  if (!frames.length) { rows.push({ id: geo.id, empty: true }); continue; }

  // THE THREE SHOTS, taken from the race rather than chosen.
  const byZoom = [...frames].sort((a, b) => a.cam.zoom - b.cam.zoom);
  const endFrames = frames.filter((f) => f.prog > endgame);
  const shots = {
    widest: byZoom[0],
    mid: byZoom[Math.floor(byZoom.length / 2)],
    tightest: endFrames.length
      ? endFrames.reduce((a, b) => (b.cam.zoom > a.cam.zoom ? b : a))
      : byZoom[byZoom.length - 1],
  };

  const out = { id: geo.id, open: race.shape.isOpen, TW: race.TW, shots: {} };
  for (const [name, f] of Object.entries(shots)) {
    const rec = renderAt(race, f.cam, f.ts);
    const { effZoomX, effZoomY } = effOf(race, f.cam);
    // The BAND: the checker fills. They are the only #fff/#222 fills in the frame, and they are
    // identified by STYLE rather than by position so a moved band is still found.
    const checkers = rec.ops.filter(
      (o) => o.kind === "fill" && (o.style === "#fff" || o.style === "#151515"),
    );
    // ── BAND vs POSTS, and the band's DEPTH, both derived rather than assumed ────────────────────
    // The band spans the corridor exactly, so `sum(bandArea) = corridorPx * depthPx` and the depth
    // falls out of the painted area without this instrument needing to know a single constant from
    // the source. The band is the MODAL quad area — it is the biggest group of identical quads by
    // construction; the posts are the other group.
    const groups = new Map();
    for (const c of checkers) {
      const k = c.area.toFixed(3);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    const ranked = [...groups.values()].sort((a, b) => b.length - a.length);
    const bandQuads = ranked[0] ?? [];
    const postQuads = ranked.slice(1).flat();
    const bandArea = bandQuads.reduce((a, c) => a + c.area, 0);
    const postArea = postQuads.reduce((a, c) => a + c.area, 0);
    const label = rec.ops.filter((o) => o.kind === "text" && o.text === "FINISH");
    // Every op from the first `drawRacer` marker onward belongs to a racer.
    const sprites = rec.ops.filter((o) => o.kind === "racer-mark");
    const gold = rec.ops.filter((o) => o.kind === "stroke" && o.style === "#ffd700");
    // The corridor's own width ON SCREEN — the reference every size below is chosen against, and
    // the number that makes "he cannot see it" quantitative rather than a matter of taste.
    const pA = race.shape.getPosition(0, 0.5);
    const pB = race.shape.getPosition(0, -0.5);
    const corridorPx = Math.hypot((pA.x - pB.x) * effZoomX, (pA.y - pB.y) * effZoomY);
    out.shots[name] = {
      zoom: f.cam.zoom, effZoomX, effZoomY, prog: f.prog, corridorPx,
      quads: checkers.length,
      bandQuads: bandQuads.length,
      bandArea, postArea,
      totalArea: bandArea + postArea,
      // DEPTH: the band spans the corridor exactly, so area / corridorPx IS the along-track depth.
      depthPx: corridorPx > 0 ? bandArea / corridorPx : 0,
      postDepthPx: corridorPx > 0 && postQuads.length ? postArea / (postQuads.length ? Math.max(...postQuads.map((q) => Math.max(q.w, q.h))) * 2 : 1) : 0,
      checkerPx: bandQuads.length ? med(bandQuads.map((c) => Math.min(c.w, c.h))) : 0,
      spanPx: corridorPx,
      labelPx: label.length ? label[0].screenPx : 0,
      goldPx: gold.length ? gold[0].wpx : 0,
      // ORDER: the band must be issued BEFORE anything that draws a racer.
      lastBandOp: checkers.length ? Math.max(...checkers.map((c) => c.n)) : -1,
      firstBandOp: checkers.length ? Math.min(...checkers.map((c) => c.n)) : -1,
      firstRacerOp: sprites.length ? Math.min(...sprites.map((s) => s.n)) : -1,
      firstRacerOpObj: sprites.length ? sprites.reduce((a, b) => (b.n < a.n ? b : a)) : null,
      ops: rec.ops.length,
    };
    if (name === "tightest" && out.shots[name].firstRacerOp >= 0 &&
        out.shots[name].lastBandOp > out.shots[name].firstRacerOp) {
      const o = out.shots[name].firstRacerOpObj;
      console.log(`  [order] ${geo.id}: band ops ${out.shots[name].firstBandOp}..${out.shots[name].lastBandOp}; ` +
        `first "racer" op ${o.n} = ${JSON.stringify(o).slice(0, 150)}`);
    }
    if (DUMP && name === "tightest") {
      console.log(`\n── ${geo.id}, TIGHTEST shot: op stream around the finish ──`);
      for (const o of rec.ops.slice(0, 40))
        console.log(`  ${String(o.n).padStart(4)} ${o.kind.padEnd(9)} ${JSON.stringify(o).slice(0, 130)}`);
      console.log(`  … ${rec.ops.length} ops total`);
    }
  }
  rows.push(out);
}

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "—");
console.log(
  "\nTHE FINISH MARKING ON SCREEN — one real rendered frame per shot, area in SCREEN px²\n",
);
console.log(
  "track            open  corridor |        WIDEST OVERVIEW         |         MID-RACE           |       TIGHTEST ENDGAME      | under",
);
console.log(
  "                                |  zoom  depth  span  label quads |  zoom  depth  span  label |  zoom  depth  span  label   | racers",
);
for (const r of rows) {
  if (r.empty) { console.log(`${r.id.padEnd(15)}  (no frames)`); continue; }
  const s = r.shots;
  const cell = (k) =>
    `${s[k].effZoomX.toFixed(2).padStart(5)} ${f1(s[k].depthPx).padStart(6)} ${f1(s[k].spanPx).padStart(6)} ${f1(s[k].labelPx).padStart(5)}`;
  const under = s.tightest.firstRacerOp < 0
    ? "n/a"
    : s.tightest.lastBandOp < s.tightest.firstRacerOp ? "YES" : "**NO**";
  console.log(
    `${r.id.padEnd(15)} ${(r.open ? "open" : "clsd").padEnd(5)} ${String(r.TW).padStart(6)}  |` +
      ` ${cell("widest")} ${String(s.widest.quads).padStart(5)} |` +
      ` ${cell("mid")} |` +
      ` ${cell("tightest")}  | ${under}`,
  );
}
console.log(
  "\ndepth = the band's along-track size on screen (px); span = its across-track size; " +
    "label = the FINISH text's rendered height.",
);

// ── HOW MUCH IT ACTUALLY PAINTS ────────────────────────────────────────────────────────────────
// The depth says how thick the mark is; this says how much of the picture it occupies, which is the
// number that answers whether the marking can be found at all. Reported at the WIDEST overview,
// because that is the shot his rejection was about.
const CANVAS = CW * CH;
console.log("\nPAINTED AREA at the WIDEST overview — screen px2, and the share of the canvas\n");
console.log("track            band  +  posts  =  total    of canvas | MID total | TIGHT total | quads w/m/t");
for (const r of rows) {
  if (r.empty) continue;
  const s2 = r.shots;
  console.log(
    `${r.id.padEnd(15)} ${f1(s2.widest.bandArea).padStart(7)} +${f1(s2.widest.postArea).padStart(7)} =` +
      `${f1(s2.widest.totalArea).padStart(9)}  ${((100 * s2.widest.totalArea) / CANVAS).toFixed(3)}% |` +
      `${f1(s2.mid.totalArea).padStart(10)} |${f1(s2.tightest.totalArea).padStart(12)} |` +
      ` ${s2.widest.quads}/${s2.mid.quads}/${s2.tightest.quads}`,
  );
}

const anyOver = rows.filter(
  (r) => !r.empty && r.shots.tightest.firstRacerOp >= 0 &&
         r.shots.tightest.lastBandOp > r.shots.tightest.firstRacerOp,
);
console.log(
  anyOver.length
    ? `\nFAIL: the band is drawn OVER the racers on ${anyOver.length} track(s): ${anyOver.map((r) => r.id).join(", ")}`
    : `\nORDERING: the last band op precedes the first racer op on every track that draws racers — ` +
      `the band is UNDER them.`,
);
