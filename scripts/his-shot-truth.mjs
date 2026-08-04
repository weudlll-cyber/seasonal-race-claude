// ============================================================
// File:        scripts/his-shot-truth.mjs
// Project:     RaceArena — NIGHT-1 stage C3 / B2
//
// THE QUESTION: with the OWNER'S OWN SETTINGS, how much world does each shot actually show, and how
// much does it BREATHE (min -> max) as the heading swings through a lap?
//
// The unit is the one his marker used and the one `zoomUnit.visibleWorldPx` defines: canvasH divided
// by (camZoom x axisY) — world px visible across the frame's height. His 21:59 marker read
// tz = 1.11662 on an open track, i.e. 720 / (1.11662 x 1.5) = 429.8 px, so this measures exactly the
// number he has already seen.
//
// Race context is his: seed 5601, n = 65, boarder, 60 s, cam seed 882944666.
//
// Usage:  node scripts/his-shot-truth.mjs [--defaults] [--track=mountainstreet]
//         --defaults  run the shipped defaults arm instead of his settings
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
const { visibleWorldPx } = await import(u('client/src/modules/camera/zoomUnit.js'));
const { computeRenderDisplayScale, getEffectiveMaxTargetScreenPx } = await import(
  u('client/src/modules/autoSpriteScale.js')
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
const N = 65;
const SEED = 5601;
const CAM_SEED = 882944666;
const RACER_TYPE = 'boarder';
const SECONDS = 60;

const USE_DEFAULTS = process.argv.includes('--defaults');
// ARM B — THE OWNER'S UNIT: 1.0 means "this track's own road width", not the fixed 300 reference.
// It needs NO code change: `referenceWidthFor` returns max(referenceCorridorPx, trackWidthPx), so
// setting referenceCorridorPx to the track's own width IS his unit, expressed in the shipped config.
const OWNER_UNIT = process.argv.includes('--owner-unit');
const trackArg = process.argv.find((a) => a.startsWith('--track='));
const ONLY = trackArg ? trackArg.split('=')[1] : null;

/** The owner's settings as of 2026-08-04. A measurement fixture — nothing here is written anywhere. */
const HIS_TOP = {
  minRacersVisible: 5,
  minDrawnFrameFrac: 0.04,
  battleWeight: 0.05,
  overviewWeight: 0.5,
  overviewTargetCount: 3,
};
const HIS_CORRIDORS = {
  LEADER_ZOOM: 1.0,
  OVERVIEW: 2.0,
  BATTLE_ZOOM: 1.2,
  COMEBACK_ZOOM: 1.25,
  LEAD_CHANGE: 1.0,
  PHOTO_FINISH: 0.35,
};

function cameraConfig() {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CAMERA_CONFIG));
  if (USE_DEFAULTS) return cfg;
  Object.assign(cfg, HIS_TOP);
  for (const [state, v] of Object.entries(HIS_CORRIDORS)) {
    if (cfg.cameraStateProfiles[state]) cfg.cameraStateProfiles[state].visibleCorridors = v;
  }
  return cfg;
}

const dir = existsSync(join(ROOT, 'server/data/tracks'))
  ? join(ROOT, 'server/data/tracks')
  : join(ROOT, 'server/seeds/tracks');

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function measure(geo, cfgIn) {
  const cfg = JSON.parse(JSON.stringify(cfgIn));
  const shape = new EditorShape(geo);
  const TW = geo.width ?? shape.getActualTrackWidth();
  if (OWNER_UNIT) cfg.referenceCorridorPx = TW;
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const rt = RT.getRacerType(RACER_TYPE);
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
    requestedSeconds: SECONDS,
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
    cfg,
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
  const cdMs = cfg.countdownDurationMs ?? 4000;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, cdMs, CW, CH);
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;

  const byState = new Map();
  const bindByState = new Map();
  // B1 — the PRICE: how big is a racer actually drawn, as a percentage of frame height?
  const drawnPct = [];
  let floorBound = 0;
  let drawnN = 0;
  const dsScale = br.bodyNarrow / ds;

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
    if (p && cd.targetZoom > 0 && cd.lerpPhase === 'tracking') {
      // The shot the camera is AIMING at, so the tracking lag does not blur the reading.
      const px = visibleWorldPx(cd.targetZoom, cd._proj.axisY, CH);
      if (Number.isFinite(px)) {
        if (!byState.has(cd.state)) byState.set(cd.state, []);
        byState.get(cd.state).push(px);
        // Did the GUARANTEE decide this frame, or the owner's own setting?
        const bound = p.guaranteed < p.stateZoom - 1e-9;
        if (!bindByState.has(cd.state)) bindByState.set(cd.state, [0, 0]);
        const b = bindByState.get(cd.state);
        b[0] += bound ? 1 : 0;
        b[1] += 1;
      }
    }
    // B1 sample, on the same frames
    if (cd.zoom > 0) {
      const frameEffZoom = cd._proj.effX(cd.zoom);
      const maxTarget = getEffectiveMaxTargetScreenPx(
        rt.config?.maxTargetScreenPx,
        cfg.maxTargetScreenPx
      );
      const scale = computeRenderDisplayScale(
        ds,
        dsScale,
        frameEffZoom,
        maxTarget,
        cfg.minDrawnFrameFrac,
        CH
      );
      const px = ds * scale * frameEffZoom;
      if (Number.isFinite(px) && px > 0) {
        drawnPct.push((100 * px) / CH);
        drawnN++;
        const proportional = ds * dsScale * frameEffZoom;
        if (proportional < (cfg.minDrawnFrameFrac ?? 0) * CH) floorBound++;
      }
    }
    ts += RAW;
  }
  return {
    id: geo.id,
    open: shape.isOpen,
    TW,
    byState,
    bindByState,
    drawnPct,
    floorPct: drawnN ? (100 * floorBound) / drawnN : 0,
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (j.id && (!ONLY || j.id === ONLY)) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

const cfg = cameraConfig();
console.log(
  `VISIBLE WORLD PX (canvasH / (camZoom x axisY)) — ${USE_DEFAULTS ? 'SHIPPED DEFAULTS' : "THE OWNER'S SETTINGS"}` +
    (OWNER_UNIT
      ? '  ·  ARM B: HIS UNIT (1.0 = this track own width)'
      : '  ·  ARM A: shipped unit (fixed 300 reference)')
);
console.log(`seed ${SEED}, n=${N}, ${RACER_TYPE}, ${SECONDS}s, camSeed ${CAM_SEED}\n`);
console.log(
  'track            TW   state             frames    min      median      max     breath   guarantee binds'
);
const B1 = [];
for (const geo of geos) {
  const r = measure(geo, cfg);
  B1.push(r);
  const states = [...r.byState.keys()].sort();
  for (const s of states) {
    const a = r.byState.get(s);
    const mn = Math.min(...a);
    const mx = Math.max(...a);
    const [bound, tot] = r.bindByState.get(s) ?? [0, 1];
    console.log(
      `  ${r.id.padEnd(15)} ${String(r.TW).padStart(3)}  ${s.padEnd(16)} ${String(a.length).padStart(6)}  ` +
        `${mn.toFixed(1).padStart(7)}  ${med(a).toFixed(1).padStart(8)}  ${mx.toFixed(1).padStart(8)}  ` +
        `${(mx / mn).toFixed(3).padStart(6)}x   ${((100 * bound) / tot).toFixed(1).padStart(5)}%`
    );
  }
}

console.log('\nB1 - DRAWN RACER HEIGHT as % of frame height (the price)\n');
console.log('track            TW    min%     median%    max%     floor binds');
const meds = [];
for (const r of B1) {
  if (!r.drawnPct.length) continue;
  const mn = Math.min(...r.drawnPct);
  const mx = Math.max(...r.drawnPct);
  const m = med(r.drawnPct);
  meds.push({ id: r.id, m });
  console.log(
    '  ' + r.id.padEnd(15) + String(r.TW).padStart(3) + ' ' + mn.toFixed(2).padStart(7) +
    '  ' + m.toFixed(2).padStart(8) + '  ' + mx.toFixed(2).padStart(7) + '   ' +
    r.floorPct.toFixed(1).padStart(6) + '%'
  );
}
if (meds.length) {
  meds.sort((a, b) => a.m - b.m);
  const lo = meds[0];
  const hi = meds[meds.length - 1];
  console.log('\n  SMALLEST racer: ' + lo.id + ' at ' + lo.m.toFixed(2) + '% of frame height');
  console.log('  BIGGEST  racer: ' + hi.id + ' at ' + hi.m.toFixed(2) + '%');
  console.log('  SPREAD across tracks = ' + (hi.m / lo.m).toFixed(3) + 'x');
}
