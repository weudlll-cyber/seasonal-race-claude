// ============================================================
// File:        scripts/edge-crossing.mjs
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1 §4b
//
// THE QUESTION: the guarantees compare CENTRE POINTS. A racer whose centre is inside the frame can
// still be DRAWN with half his body outside it. How often does that actually happen to a GUARANTEED
// subject — the anchor, and both contenders in a pair state?
//
// This is a DIAGNOSIS-FIRST measurement with a pre-registered stop: if the before-number is already
// ~0, nothing ships for §4b and that is reported as a refuted hypothesis. `pairGuarantee` already
// takes `_drawnBodyWidthRefPx` as padding and `COMPANY_FRAME_PCT` 0.9 was sized against exactly this
// failure, so the honest prior is that the work is already done and a second margin would be the
// second pair of braces the owner has ruled against.
//
// A subject COUNTS AS CROSSING when its centre is inside the frame but centre ± half a drawn body
// reaches past the frame edge, measured on the real screen axes at the live camera.
//
// Reads the director's own `_framingProbe`, like corridor-truth.mjs, so it measures the live path.
//
// Usage:  node scripts/edge-crossing.mjs
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

const dir = existsSync(join(ROOT, 'server/data/tracks'))
  ? join(ROOT, 'server/data/tracks')
  : join(ROOT, 'server/seeds/tracks');

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

  const byState = new Map();
  let checked = 0;
  let crossing = 0;
  let centreOut = 0;
  let worstOverhangPct = 0;

  const halfBody = bodyRef / 2; // world px

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
    if (!p || !(cd.zoom > 0)) {
      ts += RAW;
      continue;
    }
    // Every GUARANTEED subject this frame: the anchor, plus both contenders in a pair state.
    const subs = [p.point, ...(Array.isArray(p.pair) ? p.pair : [])].filter(
      (s) => s && Number.isFinite(s.x) && Number.isFinite(s.y)
    );
    const effX = cd._proj.effX(cd.zoom);
    const effY = cd._proj.effY(cd.zoom);
    for (const s of subs) {
      // World -> screen using the live camera transform (offsets are already screen px).
      const sxPix = s.x * effX + cd.offsetX;
      const syPix = s.y * effY + cd.offsetY;
      const hbX = halfBody * effX;
      const hbY = halfBody * effY;
      const centreIn = sxPix >= 0 && sxPix <= p.frameW && syPix >= 0 && syPix <= p.frameH;
      checked++;
      if (!centreIn) {
        centreOut++;
        continue; // a centre already outside is not the point-vs-nose defect; counted separately
      }
      const over = Math.max(
        0 - (sxPix - hbX),
        sxPix + hbX - p.frameW,
        0 - (syPix - hbY),
        syPix + hbY - p.frameH
      );
      if (over > 0) {
        crossing++;
        const pctOver = (100 * over) / Math.min(p.frameW, p.frameH);
        if (pctOver > worstOverhangPct) worstOverhangPct = pctOver;
        if (!byState.has(cd.state)) byState.set(cd.state, 0);
        byState.set(cd.state, byState.get(cd.state) + 1);
      }
    }
    ts += RAW;
  }

  return {
    id: geo.id,
    checked,
    crossing,
    centreOut,
    crossPct: checked ? (100 * crossing) / checked : 0,
    centreOutPct: checked ? (100 * centreOut) / checked : 0,
    worstOverhangPct,
    byState: [...byState.entries()],
  };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

console.log(
  'EDGE CROSSING — a GUARANTEED subject drawn with part of its body past the frame edge\n'
);
console.log(
  'track            subject-frames   crossing%   worst overhang (% of short side)   centre-already-out%'
);
let totC = 0;
let totN = 0;
for (const geo of geos) {
  const r = measureTrack(geo);
  totC += r.crossing;
  totN += r.checked;
  console.log(
    `  ${r.id.padEnd(15)} ${String(r.checked).padStart(9)}   ${r.crossPct.toFixed(2).padStart(7)}%   ` +
      `${r.worstOverhangPct.toFixed(2).padStart(10)}%                        ${r.centreOutPct.toFixed(2)}%` +
      (r.byState.length ? `   states: ${r.byState.map(([s, n]) => `${s}=${n}`).join(' ')}` : '')
  );
}
console.log(
  `\n  OVERALL: ${totC} crossing of ${totN} guaranteed-subject frames = ${((100 * totC) / totN).toFixed(3)}%`
);
console.log(
  '  PRE-REGISTERED STOP: if this is ~0, §4b ships NOTHING — pairGuarantee already pads by the\n' +
    '  drawn body and COMPANY_FRAME_PCT 0.9 was sized against this exact failure.'
);
