import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeAutoScaleFactor, DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';
import {
  computeRacersPerRow,
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../client/src/modules/rowLayout.js';
import { computeRaceBaseSpeed } from '../client/src/modules/raceBaseSpeed.js';
import { REFERENCE_FPS, lapsFromDuration, estimatedSecondsPerLap } from '../client/src/modules/camera/lapUtils.js';
import { initRacerBehavior, applyRacerBehavior } from '../client/src/modules/raceBehavior.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const TRACK_PATH = path.join(ROOT, 'server', 'data', 'tracks', 'dirt-oval.json');
const TRACE_PATH = path.join(ROOT, 'docs', 'diagnose', 'free-lane-firing-trace.ndjson');
const SUMMARY_PATH = path.join(ROOT, 'docs', 'diagnose', 'free-lane-firing-summary.md');

const FRAME_COUNT = 1800;
const FRAME_MS = 16;
const RACER_COUNT = 20;
const RACER_DISPLAY_SIZE = 40; // horse default
const SPEED_MULTIPLIER = 1.0; // horse default

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function tPosClosed(t) {
  return ((t % 1) + 1) % 1;
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function pct(num, den) {
  if (!den) return 0;
  return (num / den) * 100;
}

function fmt(n, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
}

async function main() {
  const track = JSON.parse(await fs.readFile(TRACK_PATH, 'utf8'));
  const shape = new EditorShape(track);
  const geometricTrackWidthPx = shape.getActualTrackWidth();
  const pathLengthPx = track.pathLengthPx ?? shape.getTotalLength();

  const baseSpeedMin = DEFAULT_BASE_SPEED_CONFIG.min;
  const baseSpeedMax = DEFAULT_BASE_SPEED_CONFIG.max;
  const baseSpeedMean = (baseSpeedMin + baseSpeedMax) / 2;
  const behaviorConfig = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const dynamicsConfig = { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const rowConfig = { ...DEFAULT_ROW_LAYOUT_CONFIG };

  const finishT = lapsFromDuration(60);
  const targetDuration = Math.round(estimatedSecondsPerLap(SPEED_MULTIPLIER) * finishT);

  const spreadMinFactor = baseSpeedMin / baseSpeedMean;
  const spreadMaxFactor = baseSpeedMax / baseSpeedMean;
  const expectedMinSpreadFactor =
    spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (RACER_COUNT + 1);

  const raceBaseSpeed = computeRaceBaseSpeed(
    finishT,
    targetDuration * expectedMinSpreadFactor * SPEED_MULTIPLIER
  );

  const displaySizeScale = computeAutoScaleFactor(
    geometricTrackWidthPx,
    RACER_COUNT,
    DEFAULT_AUTO_SCALE_CONFIG
  );
  const spriteSize = RACER_DISPLAY_SIZE * displaySizeScale;
  const rowGapPx = spriteSize * rowConfig.rowGapMultiplier;
  const deltaTPerRow = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;

  const effectiveWidth = geometricTrackWidthPx * behaviorConfig.startSpreadRange;
  const racersPerRow = computeRacersPerRow(effectiveWidth, spriteSize);
  const rowLayout = computeRowLayout(RACER_COUNT, racersPerRow);

  const rowSizeByRow = new Map();
  for (const a of rowLayout.assignments) {
    rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
  }
  const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

  const rollCount = Math.max(2, Math.floor(targetDuration / dynamicsConfig.reRollIntervalDivisor));
  const rollInterval =
    ((dynamicsConfig.reRollLastPositionPercent / 100) * targetDuration * 1000) / rollCount;
  const spreadRange = (baseSpeedMax - baseSpeedMin) / baseSpeedMean;
  const halfWidth = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);

  const racers = Array.from({ length: RACER_COUNT }, (_, i) => {
    const assignment = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
    const rowSize = rowSizeByRow.get(assignment.rowIndex) ?? 1;
    const speedBonus = computeSpeedBonus(
      assignment.rowIndex,
      rowGapPx,
      pathLengthPx,
      rowConfig.speedBonusFactor
    );
    const spreadFactor =
      (baseSpeedMin + Math.random() * (baseSpeedMax - baseSpeedMin)) / baseSpeedMean;
    const speedBonusMult = 1 + speedBonus;
    const rollJitter = (Math.random() - 0.5) * 2 * rollInterval * 0.2;

    const racer = {
      index: i,
      id: `r${i}`,
      name: `Racer-${i}`,
      t: -(assignment.rowIndex * deltaTPerRow),
      x: 0,
      y: 0,
      angle: 0,
      finished: false,
      runoutDecay: 1,
      spreadFactor,
      spreadFactorPrev: spreadFactor,
      spreadFactorTarget: spreadFactor,
      transitionStartTime: 0,
      transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
      nextRollTime: rollInterval + rollJitter,
      speedBonusMult,
      baseSpeed: raceBaseSpeed * SPEED_MULTIPLIER * spreadFactor * speedBonusMult,
      spriteWorldSizePx: spriteSize,
      geometricTrackWidthPx,
      pathLengthPx,
    };
    initRacerBehavior(racer);
    racer.physicalY = computeRowPhysicalY(assignment.indexInRow, rowSize, behaviorConfig.startSpreadRange);
    return racer;
  });

  const traceRows = [];
  let overlapFrames = 0;
  let firedFrames = 0;
  const branchCounts = new Map();
  const preDeltaSamples = [];
  const appliedNetSamples = [];

  const pairPrevAbsDY = new Map();
  let trackedPairTransitions = 0;
  let trackedPairSeparated = 0;
  let trackedPairFlat = 0;

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const ts = frame * FRAME_MS;
    const lastRollDeadline = targetDuration * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

    for (const r of racers) {
      if (!r.finished) {
        if (ts >= r.nextRollTime && ts < lastRollDeadline) {
          const newTarget = Math.max(
            baseSpeedMin / baseSpeedMean,
            Math.min(baseSpeedMax / baseSpeedMean, r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth)
          );
          r.spreadFactorPrev = r.spreadFactor;
          r.spreadFactorTarget = newTarget;
          r.transitionStartTime = ts;
          const jitter = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime = ts + rollInterval + jitter;
        }

        const elapsed = ts - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const tProg = elapsed / r.transitionDuration;
          r.spreadFactor =
            r.spreadFactorPrev +
            (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(Math.max(0, Math.min(1, tProg)));
          r.baseSpeed = raceBaseSpeed * SPEED_MULTIPLIER * r.spreadFactor * r.speedBonusMult;
        }
      }

      const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
      const brake = r.avoidanceActive ? behaviorConfig.speedBrakeFactor : 1.0;

      if (!r.finished) {
        r.t = Math.min(r.t + r.baseSpeed * boost * brake, finishT + 0.001);
      } else {
        r.runoutDecay *= 0.97;
        r.t += r.baseSpeed * r.runoutDecay;
      }
    }

    for (const r of racers) {
      const t = Math.min(tPosClosed(r.t), 1);
      const pos = shape.getPosition(t, r.physicalY / 2);
      r.x = pos.x;
      r.y = pos.y;
      r.angle = pos.angle;
    }

    let frameRow = null;
    applyRacerBehavior(racers, {
      ...behaviorConfig,
      __freeLaneDiag: {
        frame,
        onFrame: (row) => {
          frameRow = row;
        },
      },
    });

    if (!frameRow) {
      throw new Error('Diagnostic hook did not emit frame telemetry.');
    }

    for (const r of racers) {
      if (!r.finished && r.t >= finishT) {
        r.finished = true;
      }
    }

    const overlapPairs = frameRow.pairs;
    const firedPairs = overlapPairs.filter((p) => p.fired);
    const overlapRacers = new Set();
    for (const p of overlapPairs) {
      overlapRacers.add(p.aIndex);
      overlapRacers.add(p.bIndex);
    }

    if (frameRow.overlapPairCount > 0) overlapFrames++;
    if (frameRow.firedPairCount > 0) firedFrames++;

    for (const p of firedPairs) {
      branchCounts.set(p.branch, (branchCounts.get(p.branch) ?? 0) + 1);
      if (p.preDeltaA !== 0) preDeltaSamples.push(Math.abs(p.preDeltaA));
      if (p.preDeltaB !== 0) preDeltaSamples.push(Math.abs(p.preDeltaB));
    }

    for (const r of frameRow.racers) {
      if (r.freeLaneDeltaBeforeClamp !== 0) {
        appliedNetSamples.push(Math.abs(r.freeLaneDeltaAppliedNet));
      }
    }

    for (const p of firedPairs) {
      const key = p.aIndex < p.bIndex ? `${p.aIndex}-${p.bIndex}` : `${p.bIndex}-${p.aIndex}`;
      const currentAbsDY = Math.abs(p.dY);
      if (pairPrevAbsDY.has(key)) {
        trackedPairTransitions++;
        const prev = pairPrevAbsDY.get(key);
        if (currentAbsDY > prev + 1e-6) trackedPairSeparated++;
        else if (Math.abs(currentAbsDY - prev) <= 1e-6) trackedPairFlat++;
      }
      pairPrevAbsDY.set(key, currentAbsDY);
    }

    traceRows.push({
      frame,
      overlapPairCount: frameRow.overlapPairCount,
      firedPairCount: frameRow.firedPairCount,
      overlapRacerCount: overlapRacers.size,
      overlapRacers: [...overlapRacers].sort((a, b) => a - b),
      racers: frameRow.racers,
      pairs: overlapPairs,
    });
  }

  await fs.mkdir(path.dirname(TRACE_PATH), { recursive: true });
  await fs.writeFile(TRACE_PATH, traceRows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');

  const totalFiredPairs = [...branchCounts.values()].reduce((a, b) => a + b, 0);
  const branchRows = [...branchCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `| ${name} | ${count} | ${fmt(pct(count, totalFiredPairs), 1)}% |`)
    .join('\n');

  const avgPre = avg(preDeltaSamples);
  const avgApplied = avg(appliedNetSamples);
  const fireCoverage = pct(firedFrames, overlapFrames);
  const separationRate = pct(trackedPairSeparated, trackedPairTransitions);
  const flatRate = pct(trackedPairFlat, trackedPairTransitions);

  let mainHypothesis = 'H2';
  let hypothesisReason =
    'Free-Lane feuert haeufig, aber Separation in Folgeframes bleibt zu oft aus (Rueckzug/Neutralisierung durch andere Kraefte).';

  if (fireCoverage < 60) {
    mainHypothesis = 'H1';
    hypothesisReason =
      'Deutlich weniger Fired-Frames als Overlap-Frames deuten auf zu strikte Ausloesebedingungen hin.';
  } else if (avgPre > 0 && avgApplied < avgPre * 0.35) {
    mainHypothesis = 'H3';
    hypothesisReason =
      'Netto-nach-Clamp-Effekt ist deutlich kleiner als der berechnete Vor-Clamp-Impuls.';
  }

  const summary = `# Free-Lane Firing Summary\n\nDate: ${new Date().toISOString()}\nBranch: claude/free-lane-separation\nFrames simulated: ${FRAME_COUNT}\nTrack: dirt-oval (server/data/tracks/dirt-oval.json)\nRacers: ${RACER_COUNT}\n\nSim setup:\n- Base speed defaults: min=${baseSpeedMin}, max=${baseSpeedMax}\n- Dynamics default: reRollVariationPercent=${dynamicsConfig.reRollVariationPercent}\n- Behavior defaults: draftingBoost=${behaviorConfig.draftingBoost}, draftingMaxDistance=${behaviorConfig.draftingMaxDistance}\n- Track width (median geometric): ${geometricTrackWidthPx}px\n- Sprite world size: ${fmt(spriteSize, 2)}px\n- pathLengthPx: ${fmt(pathLengthPx, 2)}\n\n## Frage 1\nWie viele Frames hatten mindestens einen Overlap?\n\n- Overlap-Frames: **${overlapFrames} / ${FRAME_COUNT}** (${fmt(pct(overlapFrames, FRAME_COUNT), 1)}%)\n\n## Frage 2\nDavon: in wie vielen Frames hat die Free-Lane-Logik gefeuert?\n\n- Fired-Frames: **${firedFrames} / ${overlapFrames || 1}** Overlap-Frames (${fmt(fireCoverage, 1)}%)\n- Aussage: ${fireCoverage < 60 ? 'Spricht fuer H1 (Ausloesung haeufig verpasst).' : 'Ausloesung ist meist aktiv; H1 ist nicht die Hauptursache.'}\n\n## Frage 3\nBranch-Verteilung bei gefeuerten Logik-Aufrufen\n\n| Branch | Count | Anteil |\n|---|---:|---:|\n${branchRows || '| (none) | 0 | 0.0% |'}\n\n## Frage 4\nDelta vor/nach Clamp bei gefeuerten Aufrufen\n\n- Durchschnitt |y-delta| vor Clamp (fired samples): **${fmt(avgPre, 6)}**\n- Durchschnitt |y-delta| netto angewendet nach Clamp/Repulsion (fired samples): **${fmt(avgApplied, 6)}**\n- Verhältnis applied/pre: **${avgPre > 0 ? fmt(avgApplied / avgPre, 3) : '0.000'}**\n- Aussage: ${avgPre > 0 && avgApplied < avgPre * 0.35 ? 'Spricht fuer H3 (starke Abschwaechung nachgelagerter Begrenzung).' : 'Keine dominante Clamp-Abwuergung sichtbar; eher Interaktionsproblem (H2).'}\n\n## Frage 5\nBewegen sich ueberlappende Racer ueber mehrere Frames auseinander?\n\nMetrik: fuer persistierende, gefeuert markierte Paare wird in Folgeframes geprueft, ob |dY| steigt.\n\n- Verfolgte Pair-Transitions: **${trackedPairTransitions}**\n- Separation (|dY| steigt): **${trackedPairSeparated}** (${fmt(separationRate, 1)}%)\n- Flat (|dY| unveraendert): **${trackedPairFlat}** (${fmt(flatRate, 1)}%)\n- Aussage: ${separationRate < 50 ? 'Viele Paare trennen sich trotz Firing nicht stabil -> H2 dominiert.' : 'Separation tritt oft auf; Persistenzproblem eher ueber Trigger/Staerke verteilt.'}\n\n## Hypothese-Auswahl\n\n- Hauptursache: **${mainHypothesis}**\n- Begruendung: ${hypothesisReason}\n\nPriorisierung (qualitativ):\n1. ${mainHypothesis} (Haupttreiber)\n2. ${mainHypothesis === 'H2' ? 'H1/H3 (sekundaer je nach Szene)' : 'H2 (sekundaer durch Rueckkopplung in dichten Pulks)'}\n3. ${mainHypothesis === 'H3' ? 'H1' : 'H3'}\n\n## Empfehlung naechster Schritt (kein Fix in dieser Aufgabe)\n\n- Wenn H1: Triggerkriterium in longitudinaler/lateraler Overlap-Erkennung gegen visuelle Sprite-Overlap-Diagnose kalibrieren.\n- Wenn H2: Konkurrenzkraefte im selben Frame als A/B-Diag isolieren (Free-Lane nur markieren, keine Wirkung) und Rueckzugsanteil quantifizieren.\n- Wenn H3: Netto-Dämpfung durch Clamp/Repulsion in kontrolliertem Sim-Case mit festen Paaren messen (gleiche Inputs, variable maxLateral).\n\n## Sim-Grenzen\n\n- Sim reproduziert Race-Loop-Physik (t-Update, Re-Roll, Positionsberechnung, applyRacerBehavior), aber ohne Canvas/React/Camera Side-Effects.\n- Visuelle Wahrnehmung (Sprite-Silhouette vs. physische Y-Hitbox) kann im Browser trotzdem leicht abweichen.\n`; 

  await fs.writeFile(SUMMARY_PATH, summary, 'utf8');

  console.log(`Trace written: ${TRACE_PATH}`);
  console.log(`Summary written: ${SUMMARY_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
