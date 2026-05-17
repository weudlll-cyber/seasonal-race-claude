// Diagnostic: forward-fraction anomaly comparison Space Sprint vs Dirt Oval
import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeRowLayout, computeRowPhysicalY, computeSpeedBonus, computeRacersPerRow,
} from '../client/src/modules/rowLayout.js';
import { computeRaceBaseSpeed } from '../client/src/modules/raceBaseSpeed.js';
import { lapsFromDuration, REFERENCE_FPS } from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG, DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { readFileSync } from 'fs';

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const N_RACERS = 15;
const DT = 16;
const WARMUP = 800;
const MEASURE = 600;

async function runTrack(trackId) {
  Math.random = mulberry32(42);
  const data = JSON.parse(readFileSync(`./server/data/tracks/${trackId}.json`, 'utf8'));
  const shape = new EditorShape(data);
  const pathLengthPx = shape.getTotalLength();
  const trackWidth = shape.getActualTrackWidth();
  const isOpen = !data.closed;
  const duration = data.defaultDuration ?? 60;
  const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const rowCfg = { ...DEFAULT_ROW_LAYOUT_CONFIG };
  const dynCfg = { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const finishT = isOpen ? 1.0 - (cfg.runoutZone ?? 0.05) : lapsFromDuration(duration);
  const BSC = DEFAULT_BASE_SPEED_CONFIG;
  const mean = (BSC.min + BSC.max) / 2;
  const spreadMin = BSC.min / mean, spreadMax = BSC.max / mean;
  const expectedMinSF = spreadMin + (spreadMax - spreadMin) / (N_RACERS + 1);
  const targetDuration = finishT / (mean * REFERENCE_FPS);
  const race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration * expectedMinSF);
  const displaySize = 36;
  const rowGapPx = displaySize * rowCfg.rowGapMultiplier;
  const deltaT = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
  const effectiveW = trackWidth * cfg.startSpreadRange;
  const racersPerRow = computeRacersPerRow(effectiveW, displaySize);
  const rowLayout = computeRowLayout(N_RACERS, racersPerRow);
  const rollCount = Math.max(2, Math.floor(targetDuration / dynCfg.reRollIntervalDivisor));
  const rollInterval =
    ((dynCfg.reRollLastPositionPercent / 100) * targetDuration * 1000) / rollCount;
  const lastRollDeadline =
    targetDuration * 1000 * (dynCfg.reRollLastPositionPercent / 100);
  const rowSizeByRow = new Map();
  for (const a of rowLayout.assignments)
    rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
  const assignByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

  const racers = Array.from({ length: N_RACERS }, (_, i) => {
    const a = assignByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
    const rowSize = rowSizeByRow.get(a.rowIndex) ?? 1;
    const speedBonus = computeSpeedBonus(a.rowIndex, rowGapPx, pathLengthPx, rowCfg.speedBonusFactor);
    const tStart = isOpen
      ? (rowLayout.totalRows - a.rowIndex) * deltaT
      : -(a.rowIndex * deltaT);
    const sf = (BSC.min + Math.random() * (BSC.max - BSC.min)) / mean;
    const r = {
      index: i, name: `R${i + 1}`, t: tStart,
      spreadFactor: sf, speedBonusMult: 1 + speedBonus,
      baseSpeed: race_baseSpeed * sf * (1 + speedBonus),
      spreadFactorPrev: sf, spreadFactorTarget: sf,
      transitionStartTime: 0,
      transitionDuration: dynCfg.reRollTransitionDuration * 1000,
      nextRollTime: rollInterval + (Math.random() - 0.5) * 2 * rollInterval * 0.2,
      finished: false, finishRank: null, runoutDecay: 1,
      x: 0, y: 0, angle: 0,
      spriteWorldSizePx: displaySize,
      geometricTrackWidthPx: trackWidth,
      pathLengthPx,
    };
    initRacerBehavior(r);
    r.physicalY = computeRowPhysicalY(a.indexInRow, rowSize, cfg.startSpreadRange);
    return r;
  });

  const tPos = (t) => ((t % 1) + 1) % 1;
  function computePositions() {
    for (const r of racers) {
      const t = isOpen ? Math.min(r.t, 1) : tPos(r.t);
      const p = shape.getPosition(t, r.physicalY / 2);
      r.x = p.x; r.y = p.y; r.angle = p.angle;
    }
  }
  function stepRacer(r, raceTs) {
    if (!r.finished) {
      if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
        const hw = ((BSC.max - BSC.min) / mean) * (dynCfg.reRollVariationPercent / 100);
        const nt = Math.max(
          BSC.min / mean,
          Math.min(BSC.max / mean, r.spreadFactor + (Math.random() - 0.5) * 2 * hw),
        );
        r.spreadFactorPrev = r.spreadFactor;
        r.spreadFactorTarget = nt;
        r.transitionStartTime = raceTs;
        r.nextRollTime = raceTs + rollInterval + (Math.random() - 0.5) * 2 * rollInterval * 0.2;
      }
      const el = raceTs - r.transitionStartTime;
      if (el < r.transitionDuration)
        r.spreadFactor =
          r.spreadFactorPrev +
          (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(el / r.transitionDuration);
      r.baseSpeed = race_baseSpeed * r.spreadFactor * r.speedBonusMult;
      const boost = r.draftingBoostActive ? cfg.draftingBoost : 1;
      const brake = r.avoidanceActive ? cfg.speedBrakeFactor : 1;
      r.t = Math.min(r.t + r.baseSpeed * boost * brake * (DT / 16), finishT + 0.001);
      if (r.t >= finishT && !r.finished) {
        r.finished = true;
        r.finishRank = racers.filter((x) => x.finished).length;
      }
    }
  }

  computePositions();
  let raceTs = 0;
  for (let f = 0; f < WARMUP; f++) {
    raceTs += DT;
    for (const r of racers) stepRacer(r, raceTs);
    computePositions();
    applyRacerBehavior(racers, cfg, undefined);
  }

  // Measurement
  const stats = racers.map((r) => ({ name: r.name, total: 0, anom25: 0, anom10: 0 }));
  // Track avoidance trigger frequency
  let avoidPairCount = 0;
  const pairChecks = [];

  for (let f = 0; f < MEASURE; f++) {
    raceTs += DT;
    const px = racers.map((r) => r.x);
    const py = racers.map((r) => r.y);
    for (const r of racers) stepRacer(r, raceTs);
    computePositions();

    // Count avoidance pairs triggered this frame
    const active = racers.filter((r) => !r.finished);
    let pairs = 0;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        let dT = Math.abs(active[i].t - active[j].t);
        if (dT > 0.5) dT = 1 - dT;
        const dY = active[i].physicalY - active[j].physicalY;
        const dist = Math.sqrt((dT * cfg.tWeight) ** 2 + (dY * cfg.yWeight) ** 2);
        if (dist < cfg.avoidanceDistance) pairs++;
      }
    }
    avoidPairCount += pairs;
    pairChecks.push(pairs);

    applyRacerBehavior(racers, cfg, undefined);

    for (const r of racers) {
      if (r.finished) continue;
      const dx = r.x - px[r.index];
      const dy = r.y - py[r.index];
      const sp = Math.sqrt(dx * dx + dy * dy);
      if (sp < 0.1) continue;
      const fwd = Math.abs(dx) / sp;
      stats[r.index].total++;
      if (fwd < 0.25) stats[r.index].anom25++;
      if (fwd < 0.10) stats[r.index].anom10++;
    }
  }

  const totalFrames = stats.reduce((a, b) => a + b.total, 0);
  const totalAnom25 = stats.reduce((a, b) => a + b.anom25, 0);
  const totalAnom10 = stats.reduce((a, b) => a + b.anom10, 0);
  const avgPairs = avoidPairCount / MEASURE;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TRACK: ${trackId}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`pathLength: ${pathLengthPx.toFixed(0)} px   trackWidth: ${trackWidth.toFixed(0)} px`);
  console.log(`lateralForce in world px/frame: ${(cfg.lateralForce * trackWidth / 2).toFixed(2)} px`);
  console.log(`lateralHalfSpan (overlap thresh): ${(displaySize / trackWidth).toFixed(4)} physicalY`);
  console.log(`avoidance trigger range: 0.175 t-units = ${(0.175 * pathLengthPx).toFixed(0)} px`);
  console.log(`\nAvg active racer-pairs in avoidance range per frame: ${avgPairs.toFixed(1)}`);
  console.log(`Max pairs in single frame: ${Math.max(...pairChecks)}`);
  console.log(`\nOverall anomaly rate:`);
  console.log(`  fwd < 25%: ${(totalAnom25 / totalFrames * 100).toFixed(1)}%  (${totalAnom25}/${totalFrames} frames)`);
  console.log(`  fwd < 10%: ${(totalAnom10 / totalFrames * 100).toFixed(1)}%  (${totalAnom10}/${totalFrames} frames)`);
  console.log(`\nPer-racer anomaly%:`);
  stats.forEach((s) => {
    const a25 = s.total > 0 ? (s.anom25 / s.total * 100).toFixed(1) : '-';
    const a10 = s.total > 0 ? (s.anom10 / s.total * 100).toFixed(1) : '-';
    console.log(`  ${s.name.padEnd(4)}: fwd<25%=${a25.padStart(5)}%  fwd<10%=${a10.padStart(5)}%`);
  });
}

await runTrack('space-sprint');
await runTrack('dirt-oval');
