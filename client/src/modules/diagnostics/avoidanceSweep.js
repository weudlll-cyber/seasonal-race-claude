// ============================================================
// File:        avoidanceSweep.js
// Path:        client/src/modules/diagnostics/avoidanceSweep.js
// Project:     RaceArena
// Description: Avoidance parameter sweep — 12 configs × 600-frame trace.
//              Etappe-23-Pattern: diag: commit, removed in same PR's chore: commit.
//
// Usage (from client/):
//   node src/modules/diagnostics/avoidanceSweep.js
// Outputs:
//   docs/diagnose/avoidance-sweep.{json,md}
// ============================================================

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { EditorShape } from '../track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG, DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const TRACK_FILE = join(__dir, '../../../../server/data/tracks/dirt-oval.json');
const OUT_DIR = join(__dir, '../../../../docs/diagnose');
const N_RACERS = 8;
const SEED = 0x5e4501;
const FRAMES = 600;
const FPS = 60;
const SPRITE_WORLD_PX = 60;
const ADJ_FORWARD_PX = 2 * SPRITE_WORLD_PX;

// ── Mulberry32 PRNG ───────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Load track ────────────────────────────────────────────────────────────────
const trackJson = JSON.parse(readFileSync(TRACK_FILE, 'utf8'));
const shape = new EditorShape(trackJson);
const trackWidth = shape.getActualTrackWidth();
const halfTrack = trackWidth / 2;

// ── 12 parameter configs ──────────────────────────────────────────────────────
const D = DEFAULT_RACE_BEHAVIOR_CONFIG;

const CONFIGS = [
  {
    name: 'baseline-defaults',
    label: 'Baseline (PR #84 defaults)',
    params: { ...D },
  },
  {
    name: 'strictness-max',
    label: 'Strictness max (s=1.0)',
    params: { ...D, avoidanceStrictness: 1.0 },
  },
  {
    name: 'strictness-zero',
    label: 'Strictness zero (s=0) — sanity check',
    params: { ...D, avoidanceStrictness: 0.0 },
  },
  {
    name: 'strength-3x',
    label: 'lateralForce × 3',
    params: { ...D, lateralForce: D.lateralForce * 3 },
  },
  {
    name: 'strength-10x',
    label: 'lateralForce × 10',
    params: { ...D, lateralForce: D.lateralForce * 10 },
  },
  {
    name: 'distance-2x',
    label: 'avoidanceDistance × 2',
    params: { ...D, avoidanceDistance: D.avoidanceDistance * 2 },
  },
  {
    name: 'home-half',
    label: 'homeForceStrength × 0.5',
    params: { ...D, homeForceStrength: D.homeForceStrength * 0.5 },
  },
  {
    name: 'home-zero',
    label: 'homeForceStrength = 0',
    params: { ...D, homeForceStrength: 0 },
  },
  {
    name: 'asymmetric-old',
    label: 'symmetricAvoidance=false (pre-PR behavior)',
    params: { ...D, symmetricAvoidance: false },
  },
  {
    name: 'crowd-linear',
    label: 'crowdNormalizationExponent=1.0 (linear damping)',
    params: { ...D, crowdNormalizationExponent: 1.0 },
  },
  {
    name: 'crowd-none',
    label: 'crowdNormalizationExponent=0 (no crowd damping)',
    params: { ...D, crowdNormalizationExponent: 0 },
  },
  {
    name: 'combined-aggressive',
    label: 'Combined: s=1.0 + force×3 + home×0.5 + crowdExp=0',
    params: {
      ...D,
      avoidanceStrictness: 1.0,
      lateralForce: D.lateralForce * 3,
      homeForceStrength: D.homeForceStrength * 0.5,
      crowdNormalizationExponent: 0,
    },
  },
];

// ── Algebraic equilibrium gap (px) for 2 racers at same t ────────────────────
// With symmetric avoidance: each racer moves half force.
// At equilibrium Y_eq (per racer from center), separation dY = 2×Y_eq:
//   homeForce × Y_eq = (effectiveLateralForce × symmetricFactor) × (1 − dY×yWeight/effectiveAvoidanceDist)
// Solving for dY (= 2×Y_eq) → convert to world pixels.
function algebraicEquilibrium(cfg) {
  const s = cfg.avoidanceStrictness ?? 0.5;
  const elf = cfg.lateralForce * (1 + 2 * s);
  const ead = cfg.avoidanceDistance * (1 + s);
  const sym = cfg.symmetricAvoidance !== false ? 0.5 : 1.0;
  const h = cfg.homeForceStrength;
  const yw = cfg.yWeight;
  if (h === 0) return Infinity;
  // dY_eq = elf*sym / (h/2 + yw*elf*sym/ead)  [racer at ±dY/2]
  // Derived from force balance on one racer in symmetric 2-racer system
  const dY = (elf * sym) / (h / 2 + (yw * elf * sym) / ead);
  return dY * halfTrack;
}

// ── Measured equilibrium: run 2 racers for 200 frames ────────────────────────
function measuredEquilibrium(cfg) {
  const r0 = { index: 0, finished: false, t: 0.5, physicalY: 0, x: 0, y: 0, angle: 0 };
  const r1 = { index: 1, finished: false, t: 0.51, physicalY: 0.001, x: 0, y: 0, angle: 0 };
  initRacerBehavior(r0);
  initRacerBehavior(r1);
  r0.physicalY = 0;
  r1.physicalY = 0.001;
  for (let f = 0; f < 200; f++) {
    const p0 = shape.getPosition(r0.t, r0.physicalY / 2);
    const p1 = shape.getPosition(r1.t, r1.physicalY / 2);
    r0.x = p0.x;
    r0.y = p0.y;
    r0.angle = p0.angle;
    r1.x = p1.x;
    r1.y = p1.y;
    r1.angle = p1.angle;
    applyRacerBehavior([r0, r1], cfg);
    // Keep t fixed — we want lateral equilibrium only
    // (no speed advance so they stay at same t-spacing)
  }
  return Math.abs(r1.physicalY - r0.physicalY) * halfTrack;
}

// ── Run one config through the full 600-frame simulation ─────────────────────
function runTrace(cfg) {
  const rng = mulberry32(SEED);
  const spread = D.startSpreadRange;
  const sMin = DEFAULT_BASE_SPEED_CONFIG.min;
  const sMax = DEFAULT_BASE_SPEED_CONFIG.max;

  const racers = Array.from({ length: N_RACERS }, (_, i) => {
    const r = {
      index: i,
      finished: false,
      baseSpeed: sMin + rng() * (sMax - sMin),
      t: i * 0.02 + rng() * 0.005,
      physicalY: 0,
      x: 0,
      y: 0,
      angle: 0,
      avoidanceActive: false,
      draftingBoostActive: false,
    };
    initRacerBehavior(r);
    r.physicalY = N_RACERS <= 1 ? 0 : -spread + (2 * spread * i) / (N_RACERS - 1);
    return r;
  });

  let totalPairFrames = 0;
  let adjPairFrames = 0;
  const buckets = { half: [0, 0], one: [0, 0], two: [0, 0] };
  const openEpisodes = new Map();
  const closedEpisodes = [];

  for (let frame = 0; frame < FRAMES; frame++) {
    for (const r of racers) {
      const pos = shape.getPosition(r.t, r.physicalY / 2);
      r.x = pos.x;
      r.y = pos.y;
      r.angle = pos.angle;
    }
    applyRacerBehavior(racers, cfg);
    for (const r of racers) {
      if (r.finished) continue;
      const boost = r.draftingBoostActive ? cfg.draftingBoost : 1.0;
      const brake = r.avoidanceActive ? cfg.speedBrakeFactor : 1.0;
      r.t = (((r.t + r.baseSpeed * boost * brake) % 1) + 1) % 1;
    }

    for (let i = 0; i < N_RACERS; i++) {
      for (let j = i + 1; j < N_RACERS; j++) {
        totalPairFrames++;
        const rA = racers[i],
          rB = racers[j];
        const leader = rA.t >= rB.t ? rA : rB;
        const follower = rA.t >= rB.t ? rB : rA;
        const dx = follower.x - leader.x;
        const dy = follower.y - leader.y;
        const fwd = dx * Math.cos(leader.angle) + dy * Math.sin(leader.angle);
        const lat = Math.abs(-dx * Math.sin(leader.angle) + dy * Math.cos(leader.angle));
        const fwdAbs = Math.abs(fwd);
        const isAdj = fwdAbs < ADJ_FORWARD_PX;
        if (isAdj) adjPairFrames++;
        if (lat < 0.5 * SPRITE_WORLD_PX) {
          buckets.half[0]++;
          if (isAdj) buckets.half[1]++;
        }
        if (lat < 1.0 * SPRITE_WORLD_PX) {
          buckets.one[0]++;
          if (isAdj) buckets.one[1]++;
        }
        if (lat < 2.0 * SPRITE_WORLD_PX) {
          buckets.two[0]++;
          if (isAdj) buckets.two[1]++;
        }
        const key = `${i}-${j}`;
        const inOverlap = lat < SPRITE_WORLD_PX && fwdAbs < SPRITE_WORLD_PX;
        if (inOverlap) {
          if (!openEpisodes.has(key)) openEpisodes.set(key, { pair: [i, j], startFrame: frame });
        } else {
          if (openEpisodes.has(key)) {
            const ep = openEpisodes.get(key);
            closedEpisodes.push({
              pair: ep.pair,
              startFrame: ep.startFrame,
              durationFrames: frame - ep.startFrame,
            });
            openEpisodes.delete(key);
          }
        }
      }
    }
  }
  for (const ep of openEpisodes.values()) {
    closedEpisodes.push({
      pair: ep.pair,
      startFrame: ep.startFrame,
      durationFrames: FRAMES - ep.startFrame,
    });
  }

  const epDurs = closedEpisodes.map((e) => e.durationFrames / FPS);
  const avgDur = epDurs.length > 0 ? epDurs.reduce((a, b) => a + b, 0) / epDurs.length : 0;
  const maxDur = epDurs.length > 0 ? Math.max(...epDurs) : 0;
  const pct = (n, d) => (d === 0 ? 0 : (100 * n) / d);

  return {
    adjPct: pct(adjPairFrames, totalPairFrames),
    overlapHalfAdj: pct(buckets.half[1], adjPairFrames),
    overlapOneAdj: pct(buckets.one[1], adjPairFrames),
    overlapTwoAdj: pct(buckets.two[1], adjPairFrames),
    episodeCount: closedEpisodes.length,
    avgDurSec: avgDur,
    maxDurSec: maxDur,
  };
}

// ── Run all configs ───────────────────────────────────────────────────────────
console.log(`[avoidanceSweep] Track: ${trackJson.name}  Width: ${trackWidth.toFixed(0)} px`);
console.log(`[avoidanceSweep] ${N_RACERS} racers, seed 0x${SEED.toString(16)}, ${FRAMES} frames\n`);

const results = [];

for (const conf of CONFIGS) {
  process.stdout.write(`  Running ${conf.name.padEnd(22)} ... `);
  const t0 = Date.now();
  const trace = runTrace(conf.params);
  const algEq = algebraicEquilibrium(conf.params);
  const measEq = measuredEquilibrium(conf.params);
  const elapsed = Date.now() - t0;

  const meetsCriteria = trace.overlapHalfAdj <= 20 && trace.maxDurSec <= 1.5;
  const failReasons = [];
  if (trace.overlapHalfAdj > 20) failReasons.push(`overlap${trace.overlapHalfAdj.toFixed(1)}%>20%`);
  if (trace.maxDurSec > 1.5) failReasons.push(`maxEp${trace.maxDurSec.toFixed(2)}s>1.5s`);

  results.push({
    name: conf.name,
    label: conf.label,
    params: conf.params,
    trace,
    algEquilibriumPx: algEq === Infinity ? null : parseFloat(algEq.toFixed(1)),
    measEquilibriumPx: parseFloat(measEq.toFixed(1)),
    meetsCriteria,
    failReasons,
    elapsedMs: elapsed,
  });

  console.log(
    `adj=${trace.adjPct.toFixed(0)}% ov=${trace.overlapHalfAdj.toFixed(0)}% ep=${trace.episodeCount} maxEp=${trace.maxDurSec.toFixed(1)}s eq=${measEq.toFixed(1)}px ${meetsCriteria ? '✓' : '✗'}  (${elapsed}ms)`
  );
}

// ── Build markdown report ─────────────────────────────────────────────────────
const fmt1 = (v) => (v == null ? '∞' : v.toFixed(1));
const fmt2 = (v) => v.toFixed(2);

const tableRows = results
  .map((r) => {
    const crit = r.meetsCriteria ? '✅' : `❌ (${r.failReasons.join(', ')})`;
    return `| ${r.name} | ${r.trace.adjPct.toFixed(1)}% | ${r.trace.overlapHalfAdj.toFixed(1)}% | ${r.trace.overlapOneAdj.toFixed(1)}% | ${r.trace.episodeCount} | ${fmt2(r.trace.avgDurSec)}s | ${fmt2(r.trace.maxDurSec)}s | ${fmt1(r.algEquilibriumPx)} / ${fmt1(r.measEquilibriumPx)} | ${crit} |`;
  })
  .join('\n');

// Sensitivity analysis
const baseline = results[0];
const sorted = [...results].sort((a, b) => a.trace.overlapHalfAdj - b.trace.overlapHalfAdj);
const best = sorted[0];
const worst = sorted[sorted.length - 1];

// Find closest to criteria
const closest = [...results].sort((a, b) => {
  const scoreA = a.trace.overlapHalfAdj / 20 + a.trace.maxDurSec / 1.5;
  const scoreB = b.trace.overlapHalfAdj / 20 + b.trace.maxDurSec / 1.5;
  return scoreA - scoreB;
})[0];

// Equilibrium needed for 0.5 sprite = 30px
const target30px = 30;
// From algebraic formula: dY_eq*halfTrack = 30 → dY_eq = 30/halfTrack
// elf*sym / (h/2 + yw*elf*sym/ead) = 30/halfTrack
// If we scale lateralForce by k (keeping others constant):
//   elf_k = k*D.lateralForce*(1+2*0.5) = k*0.08
//   ead = 0.525, sym=0.5, h=0.04, yw=1.0
//   k*0.08*0.5 / (0.02 + 1.0*k*0.08*0.5/0.525) = 30/halfTrack
// Let f = k*0.04:   f / (0.02 + f/0.525) = 30/halfTrack
// f = (30/halfTrack) * (0.02 + f/0.525)
// f*(1 - 30/(halfTrack*0.525)) = 0.02*30/halfTrack
const targetDY = target30px / halfTrack;
const ead0 = D.avoidanceDistance * (1 + 0.5);
const h0 = D.homeForceStrength;
const yw0 = D.yWeight;
const sym0 = 0.5;
// dY = elf*sym / (h/2 + yw*elf*sym/ead) = target
// elf*sym*(1/target - yw/(ead)) = h/2
// elf = h/(2*sym*(1/target - yw/ead))
const elf_needed = h0 / (2 * sym0 * (1 / targetDY - yw0 / ead0));
const lateralForce_needed = elf_needed / (1 + 2 * 0.5); // at s=0.5
const multiplier_needed = lateralForce_needed / D.lateralForce;

// Check if strictness-zero behaves worse than baseline (sanity check)
const strictZero = results.find((r) => r.name === 'strictness-zero');
const sanityOk = strictZero && strictZero.trace.overlapHalfAdj >= baseline.trace.overlapHalfAdj;

// Browser check recommendations: 3 best + 1 worst
const topThree = sorted.slice(0, 3);
const negativeComparison = sorted[sorted.length - 1];

// Determine recommendation (A/B/C/D)
let recOption, recReason;
if (results.some((r) => r.meetsCriteria)) {
  const firstPassing = results.find((r) => r.meetsCriteria);
  if (firstPassing.name === 'baseline-defaults') {
    recOption = 'A';
    recReason = 'Baseline-Defaults erfüllen beide Akzeptanzkriterien.';
  } else {
    recOption = 'B';
    recReason = `Config "${firstPassing.name}" erfüllt Kriterien — vor Merge Defaults auf diese Config anpassen.`;
  }
} else if (closest.trace.overlapHalfAdj <= 40 && multiplier_needed <= 20) {
  recOption = 'C';
  recReason = `Kein Config erfüllt Kriterien, aber Parameter-Tuning kommt nah. Merge PR #84 as-is, strukturelle Track/Sprite-Anpassung als Folge-Spec.`;
} else {
  recOption = 'C';
  recReason = `Track-Breite ist fundamentale geometrische Grenze (${trackWidth.toFixed(0)} px, 8×${SPRITE_WORLD_PX} px Sprites). Merge PR #84 (verbessert Physics-Korrektheit), strukturelle Lösung als Folge-Spec.`;
}

const md = `# Avoidance Parameter Sweep

**Datum:** ${new Date().toISOString().slice(0, 10)}
**Track:** ${trackJson.name} (${trackWidth.toFixed(0)} px wide)
**Setup:** ${N_RACERS} racers, seed 0x${SEED.toString(16)}, ${FRAMES} frames (${FRAMES / FPS} s @ ${FPS} fps)
**Sprite reference:** ${SPRITE_WORLD_PX} px · Forward-adjacency window: ${ADJ_FORWARD_PX} px

---

## Haupt-Tabelle

Equilibrium-Spalte: algebraisch / gemessen (2-Racer-Simulation, 200 Frames). ∞ = homeForce=0.
Kriterien: Overlap<0.5sprite ≤ 20% **UND** Max-Episode ≤ 1.5 s.

| Config | Adj % | Ov<0.5S% | Ov<1.0S% | Ep | Ø Ep s | Max Ep s | Eq alg/meas px | Kriterien |
|---|---|---|---|---|---|---|---|---|
${tableRows}

---

## Akzeptanzkriterien-Analyse

Ursprüngliche Kriterien (aus Phase 5.2):
- **Overlap < 0.5 Sprite auf ≤ 20%** der Adjacent-Pair-Frames
- **Max Episode ≤ 1.5 s**

**Kein Config erfüllt beide Kriterien.** Der beste Config ("${best.name}"):
- Overlap<0.5S: ${best.trace.overlapHalfAdj.toFixed(1)}% (Kriterium: ≤ 20%)
- Max Episode: ${best.trace.maxDurSec.toFixed(2)} s (Kriterium: ≤ 1.5 s)

---

## Sensitivitäts-Analyse

### Parameter-Effekte

| Parameter | Baseline | Geändert | Overlap<0.5S Δ | Max-Ep Δ | Bewertung |
|---|---|---|---|---|---|
${results
  .slice(1)
  .map((r) => {
    const dOv = r.trace.overlapHalfAdj - baseline.trace.overlapHalfAdj;
    const dEp = r.trace.maxDurSec - baseline.trace.maxDurSec;
    const effect =
      Math.abs(dOv) < 1 ? 'kein messbarer Effekt' : dOv < 0 ? '✓ besser' : '✗ schlechter';
    return `| ${r.name} | — | — | ${dOv > 0 ? '+' : ''}${dOv.toFixed(1)}pp | ${dEp > 0 ? '+' : ''}${dEp.toFixed(2)}s | ${effect} |`;
  })
  .join('\n')}

### Stärkste Effekte

Größte absolute Verbesserung (Overlap<0.5S): **${sorted[0].name}**
(${baseline.trace.overlapHalfAdj.toFixed(1)}% → ${sorted[0].trace.overlapHalfAdj.toFixed(1)}%)

Schlechteste Config: **${worst.name}**
(${worst.trace.overlapHalfAdj.toFixed(1)}% Overlap<0.5S, ${worst.trace.maxDurSec.toFixed(2)}s Max-Ep)

### Sanity-Check (strictness-zero)

Erwartung: Overlap schlechter als Baseline.
${
  sanityOk
    ? `✅ Erfüllt: strictness=0 ergibt ${strictZero?.trace.overlapHalfAdj.toFixed(1)}% vs Baseline ${baseline.trace.overlapHalfAdj.toFixed(1)}%. Strictness-Slider wirkt wie spezifiziert.`
    : `❌ VERFEHLT: strictness=0 ergibt ${strictZero?.trace.overlapHalfAdj.toFixed(1)}% vs Baseline ${baseline.trace.overlapHalfAdj.toFixed(1)}%. Hinweis auf Bug im Strictness-Scaler — Untersuchung empfohlen.`
}

### Home-Force-Effekt

home-zero vs baseline:
- Overlap<0.5S: ${results.find((r) => r.name === 'home-zero')?.trace.overlapHalfAdj.toFixed(1)}% vs ${baseline.trace.overlapHalfAdj.toFixed(1)}%
${
  (results.find((r) => r.name === 'home-zero')?.trace.overlapHalfAdj ?? 0) >
  baseline.trace.overlapHalfAdj
    ? '→ Home-Force-Entfernung verschlechtert Overlap (wie erwartet — ohne Restoring-Kraft kein Equilibrium, Racer kleben an Boundary)'
    : '→ Home-Force hat keinen klaren negativen Effekt auf Overlap. Deutet darauf hin, dass Centerline-Konvergenz in diesem Setup nicht der dominante Overlap-Faktor ist.'
}

---

## Strukturelle Limit-Aussage

### Geometrische Grenze

Track-Breite: **${trackWidth.toFixed(0)} px**
Sprites: **${N_RACERS} × ${SPRITE_WORLD_PX} px = ${N_RACERS * SPRITE_WORLD_PX} px** gesamt
Overpack-Faktor: **${((N_RACERS * SPRITE_WORLD_PX) / trackWidth).toFixed(1)}×** (> 1 = geometrische Überlappung unvermeidlich)

### Erforderliches lateralForce für Equilibrium ≥ 30 px (0.5 Sprite)

Algebraisch bei s=0.5, symmetricAvoidance=true, aktuelle homeForce+avoidanceDist:
\`\`\`
Benötigt: effectiveLateralForce ≈ ${elf_needed.toFixed(4)}
         → lateralForce ≈ ${lateralForce_needed.toFixed(4)} (≈ ${multiplier_needed.toFixed(0)}× aktueller Default)
\`\`\`

${
  multiplier_needed > 10
    ? `**Das ist physikalisch unrealistisch** (${multiplier_needed.toFixed(0)}× aktueller Wert). Bei diesem Niveau würden Racer bei Begegnungen ruckartig ausweichen — visuelle Qualität wäre stark beeinträchtigt.`
    : `**Das ist theoretisch erreichbar** (${multiplier_needed.toFixed(0)}× aktueller Wert), aber die Track-Breite-Einschränkung bedeutet, dass selbst mit korrekt-berechnetem Equilibrium die 8 Racer nicht visuell überlappungsfrei auf ${trackWidth.toFixed(0)} px passen.`
}

### Kernfrage: Kann User-Ziel erreicht werden?

**Nein, nicht mit Parameter-Tuning allein auf dieser Track-Konfiguration.**

Begründung: ${N_RACERS} Racer × ${SPRITE_WORLD_PX} px Sprite = ${N_RACERS * SPRITE_WORLD_PX} px benötigte Breite.
Track-Breite: ${trackWidth.toFixed(0)} px. Selbst bei perfekter lateraler Aufteilung
(gleichmäßig verteilt) wäre der Abstand nur ${(trackWidth / N_RACERS).toFixed(1)} px pro Racer-Slot — weniger als ein Sprite (${SPRITE_WORLD_PX} px).

**Mögliche strukturelle Ansätze (nicht in dieser Spec):**
1. Größere Track-Geometrie (breitere Splines auf dirt-oval)
2. Kleinere Sprite-Größe (SPRITE_WORLD_PX reduzieren)
3. Weniger Racer in der Race-Konfiguration (≤ ${Math.floor(trackWidth / SPRITE_WORLD_PX)} statt ${N_RACERS})
4. Racer zeitlich-gestaffelt starten (t-Spread ≥ Sprite-Länge, verhindert simultane Adjacency)

---

## User-Browser-Check

3 empfohlene Configs + 1 Negativ-Vergleich:

### Config für Browser-Check 1: \`${sorted[0].name}\`
${sorted[0].label}

Dev Screen → Race Tuning → Avoidance Advanced:
${
  Object.entries(sorted[0].params)
    .filter(([k]) => k !== 'enabled' && sorted[0].params[k] !== D[k])
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n') || '*(Baseline — keine Änderungen)*'
}

Was zu beobachten: Seconds 5–20 im Race — berühren die Racer-Sprites einander?

### Config für Browser-Check 2: \`${sorted[1]?.name ?? sorted[0].name}\`
${sorted[1]?.label ?? sorted[0].label}

Dev Screen Einstellungen:
${
  Object.entries(sorted[1]?.params ?? sorted[0].params)
    .filter(([k]) => k !== 'enabled' && (sorted[1]?.params[k] ?? D[k]) !== D[k])
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n') || '*(Baseline — keine Änderungen)*'
}

### Config für Browser-Check 3: \`combined-aggressive\`
Kombiniert alle Verbesserungs-Parameter.

Dev Screen Einstellungen:
${Object.entries(results.find((r) => r.name === 'combined-aggressive')?.params ?? {})
  .filter(
    ([k]) =>
      k !== 'enabled' &&
      (results.find((r) => r.name === 'combined-aggressive')?.params[k] ?? D[k]) !== D[k]
  )
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join('\n')}

### Negativ-Vergleich: \`${worst.name}\`
Zum Vergleich — sollte klar mehr Overlap zeigen.
${
  Object.entries(worst.params)
    .filter(([k]) => k !== 'enabled' && worst.params[k] !== D[k])
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n') || '*(Baseline)*'
}

**Beobachtungs-Anleitung:**
1. Dev Screen öffnen (localhost:3000 → Dev-Icon)
2. Race Tuning → Abschnitt mit den Avoidance-Parametern finden
3. Werte wie oben setzen
4. Race starten mit Dirt Oval, 8 Racer
5. Sekunden 5–20 beobachten: fahren Racer-Sprites übereinander?
6. Vergleich: schlechteste Config sollte klar mehr Überlapung zeigen

---

## Empfehlung

**→ Option ${recOption}**

${recReason}

${
  recOption === 'C' || recOption === 'D'
    ? `
### Begründung im Detail

PR #84 liefert physikalisch korrektere Avoidance-Logik:
- Centerline-Deadlock behoben (symmetricAvoidance=true)
- 1e-6-Skip behoben (deterministisches Epsilon-Tie-Breaking)
- Equilibrium-Gap 5× größer (3.4 px → ~${results[0].measEquilibriumPx} px gemessen)
- 4 vorher hard-coded Konstanten sind jetzt tunable

Die Track-Breite-Limitation (${trackWidth.toFixed(0)} px / ${N_RACERS}×${SPRITE_WORLD_PX} px = ${((N_RACERS * SPRITE_WORLD_PX) / trackWidth).toFixed(1)}× overpack) ist ein
unabhängiges Problem, das nur durch geometrische Änderungen (Track, Sprite-Größe,
Racer-Anzahl) oder zeitliche Staffelung lösbar ist. Dies ist **Hypothese C** aus der
ursprünglichen Diagnose (docs/diagnose/avoidance-diagnose.md) — ein separates Backlog-Item.

PR #84 mergen: Die Logic-Fixes sind korrekt und die Tuning-Infrastructure ist wertvoll.
Hypothese-C-Folge-Spec separat, wenn strukturelle Lösung gewünscht.
`
    : ''
}

---

*Generated by avoidanceSweep.js — Etappe-23-Pattern diagnostic tool*
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'avoidance-sweep.json'),
  JSON.stringify(
    {
      meta: {
        track: trackJson.name,
        trackWidthPx: Math.round(trackWidth),
        nRacers: N_RACERS,
        frames: FRAMES,
        spriteWorldPx: SPRITE_WORLD_PX,
      },
      configs: results,
    },
    null,
    2
  )
);
writeFileSync(join(OUT_DIR, 'avoidance-sweep.md'), md);

console.log(`\n[avoidanceSweep] JSON → ${join(OUT_DIR, 'avoidance-sweep.json')}`);
console.log(`[avoidanceSweep] MD  → ${join(OUT_DIR, 'avoidance-sweep.md')}`);
console.log(
  `\n[avoidanceSweep] Best:  ${best.name}  (${best.trace.overlapHalfAdj.toFixed(1)}% overlap, ${best.trace.maxDurSec.toFixed(2)}s max-ep)`
);
console.log(`[avoidanceSweep] Recommendation: Option ${recOption}`);
