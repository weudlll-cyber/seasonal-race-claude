// ============================================================
// File:        scripts/corridor-truth.mjs
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1 §4a
//
// THE QUESTION: the corridor guarantee promises the full track corridor stays in frame. Does it?
//
// It sizes the shot by dividing by `frameExtentAlong` — the frame's chord THROUGH ITS CENTRE. But a
// FORWARD-framed anchor (LEADER / OVERVIEW at leaderForwardFrac) is not at the centre, and the room
// perpendicular to the heading through the anchor's REAL position is generally smaller than that
// chord. If so the ceiling is too PERMISSIVE and the shot is allowed tighter than the corridor fits.
//
// WHAT IT MEASURES, per frame, only on frames where the CORRIDOR guarantee is the binding kind
// (LEADER_ZOOM / COMEBACK_ZOOM / OVERVIEW — the PAIR states are entitled to go tighter):
//
//   deliveredCorridors = (2 · min(roomPlus, roomMinus) / scalePerp) / trackWidthPx
//
// i.e. how many track widths actually fit across the track, centred on where the anchor really sits.
// The guarantee's promise is deliveredCorridors >= 1. Below 1 the promise is broken.
//
// It reads the director's own `_framingProbe` — the inputs the live frame used — rather than
// recomputing the anchor choice, because a harness that measures a COPY is the failure mode this
// repo has already paid for six times.
//
// Usage:  node scripts/corridor-truth.mjs [--json]
// ============================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u('client/src/modules/storage/defaults.js')
);
const { EditorShape } = await import(u('client/src/modules/track-editor/EditorShape.js'));
const { CameraDirector } = await import(u('client/src/modules/camera/CameraDirector.js'));
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u('client/src/modules/raceCore.js')
);
const { normalSpeedFrom } = await import(u('client/src/modules/durationModel.js'));
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u('client/src/modules/rowLayout.js')
);
const { roomFromPointAlong } = await import(u('client/src/modules/camera/frameGeometry.js'));
const { framingFor, GUARANTEE, POSITION, anchorScreenPoint } = await import(
  u('client/src/modules/camera/framingRule.js')
);
const RT = await (async () => {
  const re = console.error;
  console.error = () => {};
  try {
    return await import(u('client/src/modules/racer-types/index.js'));
  } finally {
    console.error = re;
  }
})();

const CW = 1280;
const CH = 720;
const N = 40;
const SEED = 5601;
const CAM_SEED = 1439767152;
const JSON_OUT = process.argv.includes('--json');

const dir = existsSync(join(ROOT, 'server/data/tracks'))
  ? join(ROOT, 'server/data/tracks')
  : join(ROOT, 'server/seeds/tracks');

const median = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};

function measureTrack(geo) {
  const shape = new EditorShape(geo);
  const TW = geo.width ?? shape.getActualTrackWidth();
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const rt = RT.getRacerType(geo.defaultRacerTypeId ?? 'horse');
  const ds = rt.config.displaySize;
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const bfL = Math.max(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const pss = computeRacerLayout(effW, N, ds, W.autoScaleConfig).spriteSize;
  const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
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
  const raceCfg = built.config;
  const meta = built.meta;
  const cd = new CameraDirector(
    geo.worldWidth,
    geo.worldHeight,
    shape.isOpen,
    DEFAULT_CAMERA_CONFIG,
    bodyRef,
    shape,
    TW
  );
  cd.setRandomSeed(CAM_SEED);
  if (meta.racePlanEnabled && meta.rpPlanInfo?.b1Indices) {
    cd.updateRacePlan(meta.rpPlanInfo.b1Indices);
  }
  raceCfg.computePositions();

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

  const delivered = [];
  const deliveredTarget = [];
  const byState = new Map();
  let broken = 0;
  let total = 0;
  let brokenT = 0;
  let totalT = 0;

  while (st.finishedCount < N && ts - raceStart < 200000) {
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
      RAW
    );

    const p = cd._framingProbe;
    const framing = framingFor(cd.state);
    // Only frames the CORRIDOR guarantee is responsible for. A PAIR state is entitled to go tighter
    // than one corridor by design — counting it would manufacture a defect that is not there.
    if (p && framing.guarantee === GUARANTEE.CORRIDOR && cd.zoom > 0) {
      const h = cd._headingAt(p.t);
      const len = h ? Math.hypot(h.x, h.y) : 0;
      if (len > 0) {
        const perp = { x: -h.y / len, y: h.x / len };
        const { axisX, axisY } = cd._proj;
        // Screen direction of the world perpendicular, and screen px per world px along it.
        const sx = perp.x * axisX;
        const sy = perp.y * axisY;
        const scalePerp = cd.zoom * Math.hypot(sx, sy);
        if (scalePerp > 0) {
          const at = anchorScreenPoint(
            p.frameW,
            p.frameH,
            framing.position === POSITION.FORWARD ? cd._leaderForwardFrac : null,
            cd._headingScreen(p.t)
          );
          const inner = cd._innerFramePct ?? 1;
          const roomPlus = roomFromPointAlong(at.x, at.y, sx, sy, p.frameW, p.frameH, inner);
          const roomMinus = roomFromPointAlong(at.x, at.y, -sx, -sy, p.frameW, p.frameH, inner);
          const halfWorld = Math.min(roomPlus, roomMinus) / scalePerp;
          const corridors = (2 * halfWorld) / TW;
          delivered.push(corridors);
          if (!byState.has(cd.state)) byState.set(cd.state, []);
          byState.get(cd.state).push(corridors);
          total++;
          if (corridors < 1) broken++;
          // The SHOT THE GUARANTEE SIZED, before the live zoom lerps toward it. Splitting the two
          // separates "the guarantee is wrong" from "the camera has not got there yet" — the
          // residual after §4a should be the tracking lag (§4c), and this is how we know.
          const scaleTarget = cd.targetZoom * Math.hypot(sx, sy);
          if (scaleTarget > 0) {
            const cT = (2 * (Math.min(roomPlus, roomMinus) / scaleTarget)) / TW;
            deliveredTarget.push(cT);
            totalT++;
            if (cT < 1) brokenT++;
          }
        }
      }
    }
    ts += RAW;
  }

  return {
    id: geo.id,
    open: shape.isOpen,
    frames: total,
    medianCorridors: median(delivered),
    p05: pct(delivered, 5),
    p95: pct(delivered, 95),
    brokenPromisePct: total ? (100 * broken) / total : 0,
    medianTarget: median(deliveredTarget),
    brokenTargetPct: totalT ? (100 * brokenT) / totalT : 0,
    byState: [...byState.entries()].map(([s, a]) => ({
      state: s,
      n: a.length,
      median: median(a),
      brokenPct: (100 * a.filter((v) => v < 1).length) / a.length,
    })),
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

const rows = geos.map(measureTrack);
const meds = rows.map((r) => r.medianCorridors).filter(Number.isFinite);
const spread = Math.max(...meds) / Math.min(...meds);
const allBroken =
  rows.reduce((s, r) => s + (r.brokenPromisePct * r.frames) / 100, 0) /
  rows.reduce((s, r) => s + r.frames, 0);

if (JSON_OUT) {
  console.log(JSON.stringify({ rows, spread, brokenPct: 100 * allBroken }, null, 2));
} else {
  console.log(
    'CORRIDOR TRUTH — delivered track widths across, on CORRIDOR-guarantee frames only\n'
  );
  console.log(
    'track            open  frames   median   p05    p95   broken%   | TARGET median  TARGET broken%'
  );
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(15)} ${String(r.open).padEnd(5)} ${String(r.frames).padStart(6)}  ` +
        `${r.medianCorridors.toFixed(3)}  ${r.p05.toFixed(3)}  ${r.p95.toFixed(3)}   ` +
        `${r.brokenPromisePct.toFixed(1).padStart(5)}%   |  ${r.medianTarget.toFixed(3)}        ${r.brokenTargetPct.toFixed(1).padStart(5)}%`
    );
  }
  console.log(
    `\n  SPREAD ACROSS TRACKS (max median / min median) = ${spread.toFixed(3)}x   ` +
      `(the owner's "same amount of world on every track" wants 1.000x)`
  );
  console.log(
    `  PROMISE BROKEN on ${(100 * allBroken).toFixed(1)}% of corridor frames overall (LIVE zoom)`
  );
  const allBrokenT =
    rows.reduce((s, r) => s + (r.brokenTargetPct * r.frames) / 100, 0) /
    rows.reduce((s, r) => s + r.frames, 0);
  const spreadT = (() => {
    const m = rows.map((r) => r.medianTarget).filter(Number.isFinite);
    return Math.max(...m) / Math.min(...m);
  })();
  console.log(
    `  ON THE SHOT THE GUARANTEE SIZED (target zoom): broken ${(100 * allBrokenT).toFixed(1)}%, spread ${spreadT.toFixed(3)}x` +
      ` — the gap between this and the line above IS the tracking lag`
  );
  const mtn = rows.find((r) => r.id.includes('mountain'));
  if (mtn) {
    console.log(
      `\n  MOUNTAINSTREET on its own: median ${mtn.medianCorridors.toFixed(3)} corridors, ` +
        `promise broken ${mtn.brokenPromisePct.toFixed(1)}% of frames`
    );
    for (const s of mtn.byState) {
      console.log(
        `     ${s.state.padEnd(16)} n=${String(s.n).padStart(5)}  median ${s.median.toFixed(3)}  broken ${s.brokenPct.toFixed(1)}%`
      );
    }
  }
}
