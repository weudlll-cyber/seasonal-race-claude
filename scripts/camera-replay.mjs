// ============================================================
// File:        scripts/camera-replay.mjs
// Project:     RaceArena — CAMERA-REPRO-1 (Part B): stand in a marked moment.
//
// Takes ONE marker line (the thing the owner copies with M during a race) and reproduces that
// race, headless and deterministically, up to the exact frame he marked. Then it says what it
// found — and, just as importantly, whether it actually landed where the marker said.
//
// WHAT IS EXACT AND WHAT IS NOT — read this before trusting a number below:
//   • The RACE is exact. It runs through raceCore.createRaceFromIdentity/stepRacePhysics — the
//     same functions RaceScreen runs — off the same seed, so every racer's t/x/y at the marked
//     physics millisecond is bit-for-bit what the owner saw. The marker carries a WITNESS (leader
//     name, leader t, the field's t-sum) and this script checks it. If the witness fails, the
//     script says REPRODUCTION FAILED and nothing downstream is worth reading.
//   • The CAMERA is close, not exact. The director is driven by wall-clock frame times, and a
//     browser's rAF cadence is not reproducible. This replay drives it at a canonical 60 fps. The
//     camera's own dice ARE reproduced (the marker carries the seed the browser drew). So state
//     and framing normally agree; sub-pixel pan and zoom drift. The script prints the marker's
//     camera values next to its own so the disagreement is visible instead of assumed.
//
// The two pictures it writes say the same thing:
//   *-OWNER.png   world positions (exact) drawn with the camera values FROM THE MARKER
//                 → this is his frame, in framing form. It does not depend on camera replay at all.
//   *-REPLAY.png  the same world drawn with the camera this replay reconstructed
//                 → the difference between the two IS the camera drift, made visible.
//
// Usage:
//   node scripts/camera-replay.mjs --marker="RA-MARK1 {…}"
//   node scripts/camera-replay.mjs --marker-file=<path>      (file containing the line)
//   node scripts/camera-replay.mjs                            (reads the line from stdin)
// Options:
//   --out=<dir>      where the PNGs go (default: <repo>/client/tmp/camera-replay)
//   --window=<n>     also print the n frames before and after the mark (default 8)
//   --no-png         skip the pictures, print numbers only
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(p).href;

// ── Client modules — the REAL ones the browser runs. ─────────────────────────────────────────
const { parseMarkerLine, applyConfigDiff, isReplayable } = await import(
  u(join(ROOT, 'client/src/modules/camera/cameraMarker.js'))
);
const { DEFAULT_CONFIG_WORLD } = await import(u(join(ROOT, 'client/src/modules/storage/defaults.js')));
const { CameraDirector } = await import(u(join(ROOT, 'client/src/modules/camera/CameraDirector.js')));
const { OPEN_TRACK_BASE_ZOOM } = await import(u(join(ROOT, 'client/src/modules/camera/projection.js')));
const { effectiveZoom } = await import(u(join(ROOT, 'client/src/modules/camera/openTrackCamera.js')));
const { EditorShape } = await import(u(join(ROOT, 'client/src/modules/track-editor/EditorShape.js')));
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u(join(ROOT, 'client/src/modules/raceCore.js'))
);
const { normalSpeedFrom, MIN_LAPS } = await import(u(join(ROOT, 'client/src/modules/durationModel.js')));
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u(join(ROOT, 'client/src/modules/rowLayout.js'))
);
// racer-types warms sprite images at import time; headless there is no Image, and it says so 31
// times. The failures are cosmetic (this replay draws no sprites) — mute the boot, not the module.
const { getRacerType, applyTunableOverride } = await (async () => {
  const realError = console.error;
  console.error = (...a) => {
    if (!String(a[0] ?? '').startsWith('[warmup]')) realError(...a);
  };
  try {
    return await import(u(join(ROOT, 'client/src/modules/racer-types/index.js')));
  } finally {
    console.error = realError;
  }
})();
const { lerp, lerpAngle } = await import(u(join(ROOT, 'client/src/utils/mathUtils.js')));
const { Frame } = await import(u(join(ROOT, 'scripts/lib/pngFrame.mjs')));

const CANVAS_W = 1280;
const CANVAS_H = 720;

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const m = argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const has = (k) => argv.includes(`--${k}`);
const OUT_DIR = arg('out', join(ROOT, 'client/tmp/camera-replay'));
const WINDOW = Number(arg('window', '8'));
const WRITE_PNG = !has('no-png');

async function readMarkerLine() {
  const inline = arg('marker', null);
  if (inline) return inline;
  const file = arg('marker-file', null);
  if (file) return readFileSync(file, 'utf8');
  const positional = argv.find((a) => !a.startsWith('--'));
  if (positional && existsSync(positional)) return readFileSync(positional, 'utf8');
  if (positional) return positional;
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

// ── Track geometry ────────────────────────────────────────────────────────────────────────────
// The browser reads geometry out of localStorage, which this process cannot see. The same
// geometry is on disk twice: the server's LIVE data root (what the owner's browser was actually
// served, edits included) and the committed seed snapshot. Live first, seeds as fallback, and if
// the id is in neither we say so rather than replaying a different track.
function resolveGeometry(geometryId) {
  const dirs = [join(ROOT, 'server/data/tracks'), join(ROOT, 'server/seeds/tracks')];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      let json;
      try {
        json = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      } catch {
        continue;
      }
      if (json.geometryId === geometryId || json.id === geometryId) {
        // trackLoader.js re-keys the server payload before caching it; mirror that so the shape
        // this script builds is the shape the browser built.
        return { geometry: { ...json, id: json.geometryId ?? json.id }, source: join(dir, file) };
      }
    }
  }
  throw new Error(
    `track geometry ${geometryId} not found in server/data/tracks or server/seeds/tracks — ` +
      `this replay would otherwise run a DIFFERENT track. Start the API once so it seeds its data ` +
      `root, or export the geometry from the Track Editor into server/data/tracks/.`
  );
}

// ── Race construction — RaceScreen's own derivation, transcribed ───────────────────────────────
// Every line below mirrors client/src/screens/RaceScreen/index.jsx race-init. Where the browser
// reads a loader (loadBaseSpeedConfig etc.) this reads the same block out of the reconstructed
// config world, which is defaults + the marker's diff.
function buildRace(marker, world, geometry) {
  const race = marker.race;
  const shape = new EditorShape(geometry);
  const isOpenTrack = shape.isOpen;
  const trackWidthPx = geometry.width ?? shape.getActualTrackWidth();
  const worldWidth = race.ww ?? 1280;
  const worldHeight = race.wh ?? 720;
  const pathLengthPx = geometry.pathLengthPx ?? 0;

  const baseSpeedConfig = world.baseSpeedConfig;
  const behaviorConfig = { ...world.raceBehaviorConfig, isOpen: isOpenTrack };
  const rowConfig = world.rowLayoutConfig;
  const dynamicsConfig = world.raceDynamicsConfig;
  const autoScaleConfig = world.autoScaleConfig;

  // Racer-type overrides the owner had set — applied to the live type config exactly as the
  // browser's boot does, so speedMultiplier / body geometry match his world.
  for (const [id, fields] of Object.entries(marker.cfg?.types ?? {})) {
    for (const [field, value] of Object.entries(fields ?? {})) {
      if (field === 'isActive') continue;
      applyTunableOverride(id, field, value);
    }
  }
  const racerType = getRacerType(race.type ?? 'horse');
  const speedMultiplier = racerType.getSpeedMultiplier();
  const displaySize = racerType.config.displaySize;
  const _bfNarrowRaw = Math.min(racerType.config.bodyFillX, racerType.config.bodyFillY);
  const _bfLongRaw = Math.max(racerType.config.bodyFillX, racerType.config.bodyFillY);
  const bodyFillNarrow = Number.isFinite(_bfNarrowRaw) && _bfNarrowRaw > 0 ? _bfNarrowRaw : 1.0;
  const bodyFillLong = Number.isFinite(_bfLongRaw) && _bfLongRaw > 0 ? _bfLongRaw : 1.0;
  const effectiveWidth = trackWidthPx * behaviorConfig.startSpreadRange;
  const nRacers = race.n;

  let physicalSpriteSize = displaySize;
  let displaySizeScale = 1;
  if (autoScaleConfig.enabled) {
    const hasDisplaySizeOverride = 'displaySize' in (marker.cfg?.types?.[race.type] ?? {});
    if (!hasDisplaySizeOverride) {
      physicalSpriteSize = computeRacerLayout(
        effectiveWidth,
        nRacers,
        displaySize,
        autoScaleConfig
      ).spriteSize;
      const W_REF = Math.min(285, effectiveWidth);
      const bodyRef = computeBodyNarrowRef(
        W_REF,
        nRacers,
        displaySize,
        bodyFillNarrow,
        autoScaleConfig
      );
      displaySizeScale = bodyRef.bodyNarrow / displaySize;
    }
  }
  const drawnBodyWidthRefPx = displaySize * displaySizeScale;

  const built = createRaceFromIdentity({
    shape,
    isOpenTrack,
    pathLengthPx,
    trackWidthPx,
    speedMultiplier,
    baseSpeedConfig,
    behaviorConfig,
    rowConfig,
    dynamicsConfig,
    normalSpeedPxPerSec: normalSpeedFrom(baseSpeedConfig),
    laps: race.laps ?? MIN_LAPS,
    requestedSeconds: race.durSec ?? 60,
    nRacers,
    racePlanSeed: race.seed ?? 0,
    racePlanEnabledFlag: !!race.plan,
    physicalSpriteSize,
    drawnBodyWidthRefPx,
    bodyFillNarrow,
    bodyFillLong,
    constSpeedActive: false,
  });

  // Names are render-only in the browser (coats/labels hash the name; the physics stream never
  // reads it), so attaching them here changes nothing and makes the output readable.
  const names = race.names ?? null;
  built.state.racers.forEach((r, i) => {
    r.name = names?.[i] ?? `#${i}`;
  });

  return {
    ...built,
    shape,
    isOpenTrack,
    worldWidth,
    worldHeight,
    drawnBodyWidthRefPx,
  };
}

// ── The replay loop — RaceScreen's rAF loop, driven at a canonical 60 fps ──────────────────────
function replayTo(marker, built, cameraConfig, frameTimingConfig) {
  const { state: st, config: raceCfg, meta, shape, isOpenTrack, worldWidth, worldHeight } = built;
  const bsX = CANVAS_W / worldWidth;
  const bsY = CANVAS_H / worldHeight;
  const cd = new CameraDirector(
    worldWidth,
    worldHeight,
    isOpenTrack,
    cameraConfig,
    built.drawnBodyWidthRefPx,
    shape
  );
  // THE reason a camera replay is possible at all: the director's own dice, replayed.
  cd.setRandomSeed(marker.cam?.seed ?? 0);
  if (meta.racePlanEnabled && meta.rpPlanInfo?.b1Indices) cd.updateRacePlan(meta.rpPlanInfo.b1Indices);

  const RAW_DT = 1000 / 60;
  const countdownMs = cameraConfig.countdownDurationMs ?? 4000;
  const interpolate = !!frameTimingConfig.renderInterpolation;
  const targetPts = marker.moment.pts;

  raceCfg.computePositions();

  let ts = 0;
  // COUNTDOWN: the camera is already live here and its state at GO depends on it, so the replay
  // runs it too rather than starting the clock at the green light.
  while (ts < countdownMs) {
    cd.updateCountdown(st.racers, ts, ts, countdownMs, CANVAS_W, CANVAS_H);
    ts += RAW_DT;
  }
  const raceStart = ts;
  st.physicsTs = 0;
  let physicsAccum = 0;
  let slowmoActive = false;
  let slowmoStartWallTs = 0;
  let slowmoIsPhotoFinish = false;
  let slowmoFadeProgress = 0;
  let cameraPlanDelivered = false;
  let rpPhase = null;
  const renderBuf = [];
  const trace = [];

  const maxWallMs = Math.max(meta.realizedDurationSec * 3, 600) * 1000;
  let hit = null;

  while (ts - raceStart < maxWallMs) {
    // ── slow-motion (BATTLE / PHOTO_FINISH) — it scales physics time, so the replay needs it to
    // keep physics ms and wall ms in the same relation the browser had.
    const hud = cd.hudState;
    const isBattleZoom = hud === 'BATTLE_ZOOM';
    const isPhotoFinish = hud === 'PHOTO_FINISH';
    const isSlowmoState = isBattleZoom || isPhotoFinish;
    const smFactor = isPhotoFinish
      ? (cameraConfig.photoFinishSlowmoFactor ?? 0.5)
      : (cameraConfig.battleSlowmoFactor ?? 0.5);
    const smMinDurMs = (cameraConfig.battleSlowmoMinDuration ?? 2.0) * 1000;
    const smFadeDurMs = (cameraConfig.battleSlowmoFadeDuration ?? 0.3) * 1000;
    if (isSlowmoState && !slowmoActive) {
      slowmoActive = true;
      slowmoStartWallTs = ts;
      slowmoIsPhotoFinish = isPhotoFinish;
    }
    if (!isSlowmoState && slowmoActive) {
      if (slowmoIsPhotoFinish || ts - slowmoStartWallTs >= smMinDurMs) {
        slowmoActive = false;
        slowmoIsPhotoFinish = false;
      }
    }
    const fadeStep = smFadeDurMs > 0 ? RAW_DT / smFadeDurMs : Infinity;
    slowmoFadeProgress = slowmoActive
      ? Math.min(1, slowmoFadeProgress + fadeStep)
      : Math.max(0, slowmoFadeProgress - fadeStep);
    physicsAccum += RAW_DT * (1.0 - (1.0 - smFactor) * slowmoFadeProgress);

    let steps = 0;
    while (physicsAccum >= FIXED_DT && steps++ < 2) {
      stepRacePhysics(st, raceCfg);
      if (meta.racePlanController && !cameraPlanDelivered) {
        const cp = meta.racePlanController.getCameraPlan?.();
        if (cp) {
          cd.setCameraPlan(cp);
          cameraPlanDelivered = true;
        }
      }
      if (meta.racePlanController && st.racers.some((r) => !r.finished)) {
        rpPhase = meta.racePlanController.getPhase(st.physicsTs, st.raceProgress);
      }
      physicsAccum -= FIXED_DT;
    }
    const renderAlpha = Math.min(1, physicsAccum / FIXED_DT);

    let renderRacers = st.racers;
    if (interpolate) {
      while (renderBuf.length < st.racers.length) renderBuf.push({});
      renderBuf.length = st.racers.length;
      for (let i = 0; i < st.racers.length; i++) {
        const r = st.racers[i];
        Object.assign(renderBuf[i], r);
        renderBuf[i].t = lerp(r._prevT ?? r.t, r.t, renderAlpha);
        renderBuf[i].x = lerp(r._prevX ?? r.x, r.x, renderAlpha);
        renderBuf[i].y = lerp(r._prevY ?? r.y, r.y, renderAlpha);
        renderBuf[i].angle = lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha);
      }
      renderRacers = renderBuf;
    }

    const cam = cd.update(
      renderRacers,
      ts,
      {
        raceElapsed: ts - raceStart,
        finishedCount: st.finishedCount,
        winner: st.racers.find((r) => r.finishRank === 1) ?? null,
        finishT: st.finishT,
        isOutcomePhase: rpPhase === 'OUTCOME',
        physicsRacers: st.racers,
      },
      CANVAS_W,
      CANVAS_H,
      RAW_DT
    );
    const effZoomX = isOpenTrack ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM) : cam.zoom * bsX;
    const effZoomY = isOpenTrack ? effZoomX : cam.zoom * bsY;
    const row = {
      pts: st.physicsTs,
      cms: ts - raceStart,
      st: cd.hudState,
      lp: cd.lerpPhase,
      op: cd.observerPhase,
      z: cam.zoom,
      ox: cam.offsetX,
      oy: cam.offsetY,
      tz: cd.targetZoom,
      tox: cd.targetOffsetX,
      toy: cd.targetOffsetY,
      ct: cd.camT,
      ezx: effZoomX,
      ezy: effZoomY,
      anchor: cd.anchorRacerLabel,
    };
    trace.push(row);
    if (trace.length > 4 * WINDOW + 4) trace.shift();

    if (hit === null && st.physicsTs >= targetPts) {
      hit = { row, frames: trace.length };
      // Keep going for WINDOW more frames so the trace shows what happened NEXT.
      if (WINDOW <= 0) break;
    }
    if (hit !== null && row.pts >= hit.row.pts + WINDOW * FIXED_DT) break;
    if (st.finishedCount >= st.racers.length) break;
    // Advance the wall clock. The director's whole state machine — minimum holds, state caps,
    // cooldowns, the OVERVIEW schedule, raceElapsed — runs on THIS clock, not on physics time.
    // Leaving it frozen advances the world while the camera stands still, which looks exactly like
    // "the camera never leaves OVERVIEW" and is indistinguishable from a camera bug.
    ts += RAW_DT;
  }

  return { cd, hit, trace, bsX };
}

// ── Rendering ─────────────────────────────────────────────────────────────────────────────────
const COL = {
  edge: [88, 78, 108],
  center: [40, 80, 50],
  racer: [90, 170, 220],
  leader: [255, 210, 60],
  halo: [235, 235, 235],
  frame: [70, 70, 70],
  inner: [140, 60, 60],
  anchor: [90, 230, 120],
};

/**
 * Draw ONE camera frame: the track under the given camera, every racer where it actually is, the
 * inner-frame guide rectangle, and a cross on the leader. Everything here is projected with the
 * SAME offset/zoom pair that is being tested — nothing is recomputed from other inputs.
 */
function renderCameraFrame(shape, racers, cam, innerFramePct) {
  const f = new Frame(CANVAS_W, CANVAS_H);
  const sx = (wx) => wx * cam.ezx + cam.ox;
  const sy = (wy) => wy * cam.ezy + cam.oy;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    if (shape.isOpen && t1 > 1) continue;
    const i0 = shape._idx(t0);
    const i1 = shape._idx(t1);
    const o0 = shape._outer[i0];
    const o1 = shape._outer[i1];
    const n0 = shape._inner[i0];
    const n1 = shape._inner[i1];
    f.line(sx(o0.x), sy(o0.y), sx(o1.x), sy(o1.y), COL.edge);
    f.line(sx(n0.x), sy(n0.y), sx(n1.x), sy(n1.y), COL.edge);
    const p0 = shape.getPosition(t0, 0);
    const p1 = shape.getPosition(t1, 0);
    f.line(sx(p0.x), sy(p0.y), sx(p1.x), sy(p1.y), COL.center);
  }
  let leader = null;
  for (const r of racers) if (!leader || r.t > leader.t) leader = r;
  for (const r of racers) {
    const cx = sx(r.x);
    const cy = sy(r.y);
    if (cx < -30 || cx > CANVAS_W + 30 || cy < -30 || cy > CANVAS_H + 30) continue;
    f.circle(cx, cy, 8, COL.halo);
    f.circle(cx, cy, 6, r === leader ? COL.leader : COL.racer);
  }
  if (leader) f.cross(sx(leader.x), sy(leader.y), 22, COL.leader);
  // The inner-frame guide: the region the director is supposed to hold its anchor inside.
  const mx = ((1 - innerFramePct) / 2) * CANVAS_W;
  const my = ((1 - innerFramePct) / 2) * CANVAS_H;
  f.rect(mx, my, CANVAS_W - mx, CANVAS_H - my, COL.inner);
  f.rect(0, 0, CANVAS_W - 1, CANVAS_H - 1, COL.frame);
  return f.toPng();
}

// ── Report helpers ────────────────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s ?? '—').padEnd(n);
const num = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : '—');

function compareRow(label, markerVal, replayVal, tol) {
  const both = typeof markerVal === 'number' && typeof replayVal === 'number';
  const delta = both ? replayVal - markerVal : null;
  const ok =
    both ? Math.abs(delta) <= tol : String(markerVal ?? '') === String(replayVal ?? '');
  return `  ${pad(label, 16)} ${pad(both ? num(markerVal) : markerVal, 14)} ${pad(
    both ? num(replayVal) : replayVal,
    14
  )} ${pad(delta === null ? '' : (delta >= 0 ? '+' : '') + num(delta), 12)} ${ok ? 'match' : 'DIFF'}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────────
const marker = parseMarkerLine(await readMarkerLine());

console.log('CAMERA-REPRO-1 replay');
console.log(`  marker taken at ${marker.at ?? '?'} on build ${marker.build ?? '?'}`);
console.log(
  `  race    ${marker.race.track ?? '?'} · ${marker.race.n} × ${marker.race.type} · seed ${marker.race.seed}`
);
console.log(
  `  moment  physicsTs=${marker.moment.pts} ms (${((marker.moment.prog ?? 0) * 100).toFixed(1)}% of race) · cameraSeed=${marker.cam?.seed ?? 0}`
);
console.log(
  `  logs    frameLog=${marker.moment.log?.frame ? 'ON' : 'off'} detourLog=${marker.moment.log?.detour ? 'ON' : 'off'}`
);

if (!isReplayable(marker)) {
  console.error(
    '\nSTOP — this race ran with racePlanSeed 0 (unseeded). Its physics came from an unseeded\n' +
      'Math.random and CANNOT be reproduced by anything, including this script. Mark a Quick Test\n' +
      'race (which always draws and records a seed) to get a replayable moment.'
  );
  process.exit(2);
}

const { geometry, source } = resolveGeometry(marker.race.geo);
console.log(`  track   ${source}`);

const world = applyConfigDiff(DEFAULT_CONFIG_WORLD, marker.cfg?.diff ?? {});
const diffCount = Object.values(marker.cfg?.diff ?? {}).reduce(
  (n, block) => n + Object.keys(block).length,
  0
);
console.log(`  config  defaults + ${diffCount} off-default key(s) from the marker · fp ${marker.cfg?.fp ?? '?'}`);

const built = buildRace(marker, world, geometry);
const { hit, trace, bsX } = replayTo(marker, built, world.cameraConfig, world.frameTimingConfig);

if (!hit) {
  console.error(`\nFAILED — the replay never reached physicsTs ${marker.moment.pts}.`);
  process.exit(1);
}

// ── The witness: did we reproduce HIS race? ───────────────────────────────────────────────────
const st = built.state;
let leader = null;
let tSum = 0;
for (const r of st.racers) {
  tSum += r.t;
  if (!leader || r.t > leader.t) leader = r;
}
const w = marker.world;
const nameOk = (leader?.name ?? null) === (w.leader ?? null);
const tOk = Math.abs(leader.t - (w.lt ?? 0)) < 1e-6;
const sumOk = Math.abs(tSum - (w.tsum ?? 0)) < 1e-4;

console.log('\nWITNESS — is this the same race, at the same moment?');
console.log(`  leader name   marker ${pad(w.leader, 14)} replay ${pad(leader?.name, 14)} ${nameOk ? 'match' : 'DIFF'}`);
console.log(`  leader t      marker ${pad(num(w.lt, 6), 14)} replay ${pad(num(leader.t, 6), 14)} ${tOk ? 'match' : 'DIFF'}`);
console.log(`  field t-sum   marker ${pad(num(w.tsum, 6), 14)} replay ${pad(num(tSum, 6), 14)} ${sumOk ? 'match' : 'DIFF'}`);

// Per-racer check. The leader alone is a weak witness — an authored plan pins the front-runner, so
// it can match while the field behind it does not. Name the racers that differ; a witness that only
// says "failed" leaves the next person exactly where they started.
let vecOk = true;
if (Array.isArray(w.tvec)) {
  const byIndex = new Map(st.racers.map((r) => [r.index, r]));
  const off = [];
  for (let i = 0; i < w.tvec.length; i++) {
    const mine = byIndex.get(i);
    const d = mine ? mine.t - w.tvec[i] : NaN;
    if (!(Math.abs(d) < 1e-4)) off.push({ i, name: mine?.name ?? `#${i}`, marker: w.tvec[i], replay: mine?.t, d });
  }
  vecOk = off.length === 0;
  console.log(
    `  per-racer t   ${w.tvec.length - off.length} of ${w.tvec.length} racers match to 1e-4` +
      (vecOk ? '' : ` — ${off.length} DIFFER:`)
  );
  for (const o of off.slice(0, 12)) {
    console.log(
      `      #${String(o.i).padStart(2)} ${pad(o.name, 10)} marker ${pad(num(o.marker, 5), 10)} replay ${pad(
        num(o.replay, 5),
        10
      )} Δ ${(o.d >= 0 ? '+' : '') + num(o.d, 5)}`
    );
  }
  if (off.length > 12) console.log(`      … and ${off.length - 12} more`);
} else {
  console.log('  per-racer t   not in this marker (line was too long — tsum is the only field witness)');
}

const witnessOk = nameOk && tOk && sumOk && vecOk;
console.log(`  → ${witnessOk ? 'REPRODUCED — the world below is the world he saw.' : 'REPRODUCTION FAILED — do not trust anything below.'}`);

// ── The camera: how close did the reconstruction land? ────────────────────────────────────────
const s = marker.shot;
const h = hit.row;
console.log('\nCAMERA at the marked frame        marker         replay         delta');
console.log(compareRow('state', s.st, h.st, 0));
console.log(compareRow('lerpPhase', s.lp, h.lp, 0));
console.log(compareRow('observerPhase', s.op, h.op, 0));
console.log(compareRow('anchor', s.anchor, h.anchor, 0));
console.log(compareRow('zoom', s.z, h.z, 0.02));
console.log(compareRow('offsetX px', s.ox, h.ox, 20));
console.log(compareRow('offsetY px', s.oy, h.oy, 20));
console.log(compareRow('targetZoom', s.tz, h.tz, 0.02));
console.log(compareRow('targetOffX px', s.tox, h.tox, 20));
console.log(compareRow('targetOffY px', s.toy, h.toy, 20));
console.log(compareRow('camT', s.ct, h.ct, 0.01));
console.log(compareRow('effZoomX', s.ezx, h.ezx, 0.02));
console.log(compareRow('effZoomY', s.ezy, h.ezy, 0.02));
console.log(
  `  (tolerances: state/anchor exact; zoom ±0.02; pan ±20 px. The camera is a wall-clock follower —\n` +
    `   see the header of this file for why exact pan equality is not on offer.)`
);

// ── The moment in context ─────────────────────────────────────────────────────────────────────
if (WINDOW > 0) {
  console.log(`\nTRACE — ${WINDOW} frames either side of the mark (▶ = the marked frame)`);
  console.log('    physicsTs  state            lerp      zoom     offsetX    offsetY   anchor');
  for (const r of trace) {
    if (Math.abs(r.pts - h.pts) > WINDOW * FIXED_DT) continue;
    console.log(
      `  ${r.pts === h.pts ? '▶' : ' '} ${pad(r.pts, 10)} ${pad(r.st, 16)} ${pad(r.lp, 9)} ${pad(
        num(r.z, 4),
        8
      )} ${pad(num(r.ox, 1), 10)} ${pad(num(r.oy, 1), 10)} ${r.anchor ?? '—'}`
    );
  }
}

// ── What is on screen ─────────────────────────────────────────────────────────────────────────
// Screen positions under the MARKER's own camera — the honest answer to "was the leader in frame".
const inner = world.cameraConfig.cameraStateProfiles?.[s.st]?.innerFramePct ?? 0.7;
const mx = ((1 - inner) / 2) * CANVAS_W;
const my = ((1 - inner) / 2) * CANVAS_H;
const onScreen = st.racers
  .map((r) => ({ r, x: r.x * s.ezx + s.ox, y: r.y * s.ezy + s.oy }))
  .sort((a, b) => b.r.t - a.r.t);
const inCanvas = onScreen.filter((p) => p.x >= 0 && p.x <= CANVAS_W && p.y >= 0 && p.y <= CANVAS_H);
const lead = onScreen[0];
console.log('\nON SCREEN under the marker\'s own camera');
console.log(`  racers in the 1280×720 frame : ${inCanvas.length} of ${st.racers.length}`);
console.log(
  `  leader ${lead.r.name} at (${lead.x.toFixed(0)}, ${lead.y.toFixed(0)}) — ` +
    `${lead.x >= 0 && lead.x <= CANVAS_W && lead.y >= 0 && lead.y <= CANVAS_H ? 'in frame' : 'OFF FRAME'}` +
    `, ${lead.x >= mx && lead.x <= CANVAS_W - mx && lead.y >= my && lead.y <= CANVAS_H - my ? 'inside' : 'OUTSIDE'} the inner-${Math.round(inner * 100)} region`
);

// ── Pictures ──────────────────────────────────────────────────────────────────────────────────
if (WRITE_PNG) {
  mkdirSync(OUT_DIR, { recursive: true });
  const tag = `${marker.race.track ?? 'track'}-seed${marker.race.seed}-${marker.moment.pts}ms`.replace(
    /[^\w.-]+/g,
    '_'
  );
  const ownerPng = join(OUT_DIR, `${tag}-OWNER.png`);
  const replayPng = join(OUT_DIR, `${tag}-REPLAY.png`);
  writeFileSync(
    ownerPng,
    renderCameraFrame(built.shape, st.racers, { ox: s.ox, oy: s.oy, ezx: s.ezx, ezy: s.ezy }, inner)
  );
  writeFileSync(
    replayPng,
    renderCameraFrame(built.shape, st.racers, { ox: h.ox, oy: h.oy, ezx: h.ezx, ezy: h.ezy }, inner)
  );
  console.log('\nPICTURES');
  console.log(`  ${ownerPng}`);
  console.log('    exact world positions drawn with the camera FROM THE MARKER — his frame.');
  console.log(`  ${replayPng}`);
  console.log('    same world, camera as this replay reconstructed it — the difference is the drift.');
  console.log(
    '  Both are FRAMING views (track outline, racer dots, leader cross, inner-frame guide).\n' +
      '  No sprites, no background: what they answer is where things sat in the viewport.'
  );
}

if (marker.moment.log?.detour) {
  console.log(
    `\nDETOUR LOG — it was ON in that session. Its window frames now carry a \`ts\` field on the same\n` +
      `clock as this marker's moment.cms=${num(marker.moment.cms, 0)} ms, so the [RA CAMERA DETOUR] line\n` +
      `whose frames bracket that value is the one describing this moment.`
  );
} else {
  console.log(
    '\nDETOUR LOG — it was OFF in that session, so there is no per-transition WHAT to go with this\n' +
      'WHERE. Turn on Dev Screen → Camera Advanced → cameraDetourLog before the next eye-test if the\n' +
      'question is why the camera moved, not just where it was.'
  );
}

process.exit(witnessOk ? 0 : 3);
