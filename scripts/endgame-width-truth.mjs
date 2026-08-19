// ============================================================
// File:        scripts/endgame-width-truth.mjs
// Project:     RaceArena — ENDGAME-WIDTH-1
//
// THE QUESTION: through the endgame — from the moment the wide shot opens to the crossing — WHICH of
// the five ceilings actually sets the width, and what would the shot be if its framing subjects were
// only the finish line, the leader and the racers still in with a chance?
//
// IT CHANGES NOTHING AND MEASURES THE LIVE DIRECTOR. `_framingProbe` already records every ceiling,
// the delivered zoom and the term that produced it; it is written by the director each frame and
// read by nothing in the camera. This harness reads it. No camera code is touched.
//
// THE CONTENDER DEFINITION IS THE DIRECTOR'S OWN, NOT ONE INVENTED HERE: `_abreastContenders`, the
// rule the run-in already uses to pin the photo-finish framing pair. Two geometric conditions, both
// built from quantities the RACE puts on a racer — nearly level with the leader (along-track gap no
// more than one body length, `pairContact`'s own touch distance) and on a free lane (no body
// overlapping across the track ahead of him). No threshold, gap or rank cut is added.
//
// THE CANDIDATE WIDTH IS THE DIRECTOR'S OWN ARITHMETIC TOO: `contenderGuarantee` from
// framingRule.js, called with {finish line, leader, contenders} and the same frame size, axis,
// inner-frame fraction and body padding the director used on that frame.
//
// WHAT IT CANNOT DO, stated rather than papered over: it computes a ZOOM sufficient to contain the
// subject set. It does NOT model where the pan would put that set, so it cannot prove the finish
// line stays in frame under the candidate. For TODAY's shot the pan is known and the line is
// measured exactly. See the report.
//
// Usage:
//   node scripts/endgame-width-truth.mjs                     # both arms, the shipped track pair
//   node scripts/endgame-width-truth.mjs --tracks=space-sprint
//   node scripts/endgame-width-truth.mjs --json
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { computeBodyNarrowRef } = await import(u("client/src/modules/rowLayout.js"));
const { getEffectiveMaxTargetScreenPx } = await import(u("client/src/modules/autoSpriteScale.js"));
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM, projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);
const { contenderGuarantee, framingFor } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);

const CW = 1280;
const CH = 720;
const SEED = 9;
const JSON_OUT = process.argv.includes("--json");
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const ROSTER = QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

// HIS SUPPORTED TARGETS: open tracks 100 racers, closed 40.
const FIELD_FOR = (isOpen) => (isOpen ? 100 : 40);
const TRACKS = TRACK_ARG ? TRACK_ARG.split(",") : ["space-sprint", "dirt-oval", "city-circuit"];

const HIS = [
  ["cameraStateProfiles.OVERVIEW.trackingTC", 1.5],
  ["highlightHeroes", true],
  ["battlePulkThresholdT", 0.001],
  ["outcomePhaseThreshold", 0.65],
  ["battleCooldownMs", 20000],
  ["battleWeight", 0],
  ["finishPauseMs", 4000],
  ["winnerCardMs", 4000],
  ["corridorCapArriveMs", 5000],
  ["labelNamesWhenRoom", true],
  ["minRacersVisible", 8],
];
function setPath(o, path, v) {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
}
const hisConfig = () => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [path, v] of HIS) setPath(cfg, path, v);
  return cfg;
};

const TERMS = ["state", "guarantee", "company", "field", "line"];

// ── The real driver ─────────────────────────────────────────────────────────────────────────────
function measureTrack(geo, cfg, arm) {
  // The field size depends on whether the track is open, which `buildRace` reports — so the race is
  // built once at a provisional size purely to read `shape.isOpen`, then rebuilt at the real one.
  const probeRace = buildRace(
    geo,
    resolveIdentity({ racers: 2, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER, seconds: 60, canvasW: CW, canvasH: CH, roster: ROSTER }),
    cfg
  );
  const N = FIELD_FOR(probeRace.shape.isOpen);

  const identity = resolveIdentity({
    racers: N,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    seconds: 60,
    canvasW: CW,
    canvasH: CH,
    roster: ROSTER,
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, trackWidthPx: TW, racerType: rt, displaySize: ds, st, cd } = race;

  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
  const displaySizeScale = br.bodyNarrow / ds;
  const worldBody = ds * displaySizeScale;

  const bsX = CW / (geo.worldWidth || CW);
  const bsY = CH / (geo.worldHeight || CH);
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, shape.isOpen);
  const floorPx = (cfg.minDrawnFrameFrac ?? 0) * CH;
  const ceilPx = getEffectiveMaxTargetScreenPx(rt?.config?.maxTargetScreenPx, cfg.maxTargetScreenPx);

  const zoomToWidth = (z) => {
    if (!(z > 0) || !Number.isFinite(z)) return Infinity;
    const effX = shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX;
    return effX > 0 ? CW / effX : Infinity;
  };

  const frames = [];
  runRace(race, identity, cfg, ({ ts, raceStart }) => {
    const p = cd._framingProbe;
    if (!p) return;
    const inEndgame = p.runInActive === true;
    const crossed = st.finishedCount > 0;
    if (!inEndgame || crossed) return;

    const zoom = cd.zoom;
    const effX = shape.isOpen ? effectiveZoom(zoom, OPEN_TRACK_BASE_ZOOM) : zoom * bsX;
    const effY = shape.isOpen ? effX : zoom * bsY;
    const worldPx = effX > 0 ? CW / effX : Infinity;

    // The contender set, by the director's own rule.
    const ordered = [...st.racers].sort((a, b) => b.t - a.t);
    const contenders = cd._abreastContenders(ordered);
    const leader = ordered[0];

    // The finish line's world point, the same one the world's gate is drawn at.
    const ft = shape.isOpen ? Math.max(0, Math.min(1, st.finishT)) : ((st.finishT % 1) + 1) % 1;
    const linePt = shape.getPosition(ft, 0);

    // THE CANDIDATE: the director's own contenderGuarantee over {line, leader, contenders}.
    const framing = framingFor(cd.state);
    const pts = [
      { x: linePt.x, y: linePt.y },
      { x: leader.x, y: leader.y },
      ...contenders.map((r) => ({ x: r.x, y: r.y })),
    ];
    const candZoom = contenderGuarantee(
      pts,
      proj.axisX,
      proj.axisY,
      p.frameW,
      p.frameH,
      framing?.innerFramePct ?? 1,
      cd._drawnBodyWidthRefPx ?? 0
    );

    // Racers in frame TODAY (exact — the pan is known).
    const inFrameToday = st.racers.filter((r) => {
      const sx = cd.offsetX + r.x * effX;
      const sy = cd.offsetY + r.y * effY;
      return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
    }).length;
    // RACERS IN FRAME UNDER THE CANDIDATE. The pan is NOT modelled — the director would choose it —
    // so the frame is centred on the midpoint of the subject set's own extent, which is the most
    // neutral assumption available and is stated as such in the report. It is an ESTIMATE; today's
    // count beside it is exact, because today's pan is known.
    let inFrameCand = null;
    if (Number.isFinite(candZoom) && candZoom > 0) {
      const cEffX = shape.isOpen ? effectiveZoom(candZoom, OPEN_TRACK_BASE_ZOOM) : candZoom * bsX;
      const cEffY = shape.isOpen ? cEffX : candZoom * bsY;
      const cx = (Math.min(...pts.map((q) => q.x)) + Math.max(...pts.map((q) => q.x))) / 2;
      const cy = (Math.min(...pts.map((q) => q.y)) + Math.max(...pts.map((q) => q.y))) / 2;
      const offX = CW / 2 - cx * cEffX;
      const offY = CH / 2 - cy * cEffY;
      inFrameCand = st.racers.filter((r) => {
        const sx = offX + r.x * cEffX;
        const sy = offY + r.y * cEffY;
        return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
      }).length;
    }

    const lineSx = cd.offsetX + linePt.x * effX;
    const lineSy = cd.offsetY + linePt.y * effY;
    const lineInFrameToday = lineSx >= 0 && lineSx <= CW && lineSy >= 0 && lineSy <= CH;

    frames.push({
      tSec: +((ts - raceStart) / 1000).toFixed(2),
      progress: +(leader.t / st.finishT).toFixed(4),
      state: cd.state,
      binding: p.binding,
      guaranteed: p.guaranteed,
      widthNow: worldPx,
      demands: Object.fromEntries(TERMS.map((k) => [k, zoomToWidth(p.ceilings[k])])),
      corridorCap: p.corridorCap == null ? null : zoomToWidth(p.corridorCap),
      capBound: !!p.capBound,
      contenders: contenders.length,
      candWidth: zoomToWidth(candZoom),
      inFrameToday,
      inFrameCand,
      lineInFrameToday,
      onScreenOf: N,
    });
  });

  return { track: geo.id, isOpen: shape.isOpen, racers: N, arm, worldBody, floorPx, ceilPx, frames };
}

const geos = loadTracks().filter((g) => TRACKS.includes(g.id));
const out = [];
for (const geo of geos) {
  out.push(measureTrack(geo, hisConfig(), "his"));
  out.push(measureTrack(geo, structuredClone(DEFAULT_CAMERA_CONFIG), "shipped"));
}

const pct = (n, d) => (d > 0 ? ((100 * n) / d).toFixed(0) + "%" : "—");
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : NaN);

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 1));
} else {
  console.log(`ENDGAME-WIDTH-1 — the endgame window, from the wide shot opening to the crossing`);
  console.log(`seed ${SEED}, ${CW}x${CH}; open tracks ${FIELD_FOR(true)} racers, closed ${FIELD_FOR(false)}`);
  console.log("");
  for (const r of out) {
    const f = r.frames;
    if (!f.length) {
      console.log(`${r.track} (${r.arm}) — NO endgame frames captured (runInActive never true)`);
      continue;
    }
    const widest = f.reduce((a, b) => (b.widthNow > a.widthNow ? b : a));
    console.log(`── ${r.track} · ${r.racers} racers · ${r.arm} · ${f.length} endgame frames · body ${r.worldBody.toFixed(2)} world px`);
    // Q1: who binds
    const counts = {};
    for (const x of f) counts[x.binding] = (counts[x.binding] ?? 0) + 1;
    const rank = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    console.log(`   BINDING SHARE: ${rank.map(([k, v]) => `${k} ${pct(v, f.length)}`).join("   ")}`);
    console.log(`   at the WIDEST moment (t=${widest.tSec}s, prog ${widest.progress}, width ${Math.round(widest.widthNow)} px, binding ${widest.binding}):`);
    console.log(
      `     demands: ` +
        TERMS.map((k) => `${k} ${Number.isFinite(widest.demands[k]) ? Math.round(widest.demands[k]) : "—"}`).join("  ") +
        (widest.corridorCap != null ? `  corridor-cap ${Math.round(widest.corridorCap)}` : "")
    );
    // Q2/Q3 at three moments
    const at = (frac) => f[Math.min(f.length - 1, Math.floor(frac * (f.length - 1)))];
    console.log("     moment        width now   candidate   contenders   inFrame now   inFrame cand   line now");
    for (const [label, x] of [["opening", at(0)], ["mid-endgame", at(0.5)], ["crossing", at(1)]]) {
      console.log(
        `     ${label.padEnd(13)}${String(Math.round(x.widthNow)).padStart(9)}` +
          `${(Number.isFinite(x.candWidth) ? String(Math.round(x.candWidth)) : "—").padStart(12)}` +
          `${String(x.contenders).padStart(13)}` +
          `${`${x.inFrameToday}/${x.onScreenOf}`.padStart(14)}` +
          `${(x.inFrameCand == null ? "—" : `${x.inFrameCand}/${x.onScreenOf}`).padStart(15)}` +
          `${(x.lineInFrameToday ? "yes" : "NO").padStart(11)}`
      );
    }
    const lineLost = f.filter((x) => !x.lineInFrameToday).length;
    console.log(`   finish line in frame TODAY on ${f.length - lineLost} of ${f.length} endgame frames (${pct(lineLost, f.length)} lost)`);
    const candMed = med(f.map((x) => x.candWidth).filter(Number.isFinite));
    const nowMed = med(f.map((x) => x.widthNow));
    console.log(`   median width: now ${Math.round(nowMed)} px   candidate ${Number.isFinite(candMed) ? Math.round(candMed) : "—"} px`);
    const over = (w) => (r.floorPx * w) / (r.worldBody * CW);
    console.log(`   over-scale at the widest: now ${over(widest.widthNow).toFixed(2)}x   candidate ${Number.isFinite(widest.candWidth) ? over(widest.candWidth).toFixed(2) + "x" : "—"}`);
    console.log("");
  }
}
