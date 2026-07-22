// ============================================================
// File:        seedDeterminism.test.js
// Path:        client/src/screens/RaceScreen/seedDeterminism.test.js
// Project:     RaceArena
// Created:     2026-07-22
// Description: Browser race determinism — with racePlanSeed > 0 the race dynamics are
//              drawn from one seeded generator (start rows, initial spreadFactors, every
//              scheduled re-roll, both jitters), so the same seed replays exactly.
//              seed <= 0 must leave Math.random untouched (legacy path, byte-identical).
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import { mulberry32 } from '../../modules/racePlanner.js';
import { computeEvenRowLayout } from '../../modules/rowLayout.js';

// The native generator, captured before any test can swap it.
const NATIVE_RANDOM = Math.random;
afterEach(() => {
  Math.random = NATIVE_RANDOM;
});

// ── The swap/restore contract, mirrored from RaceScreen/index.jsx ─────────────
// index.jsx does exactly this at the top of the race-init effect and restores in the
// effect's cleanup. Mirrored here so the test doesn't pull in the React component graph
// (house style — see reRoll.test.js).
function installSeededRandom(racePlanSeed) {
  const nativeRandom = Math.random;
  if (racePlanSeed > 0) Math.random = mulberry32(racePlanSeed);
  return () => {
    Math.random = nativeRandom;
  };
}

// ── The five draw sites, mirrored from RaceScreen/index.jsx ───────────────────
// Row layout uses the REAL module (its rng defaults to Math.random — that is the site).
const BASE_SPEED_MIN = 0.9;
const BASE_SPEED_MAX = 1.1;
const BASE_SPEED_MEAN = 1.0;

function initRaceDraws({
  nRacers = 12,
  rowCount = 3,
  rollInterval = 12000,
  rollsPerRacer = 4,
} = {}) {
  // 1. start rows (index.jsx: computeEvenRowLayout(nRacers, rowCount) — no rng argument)
  const rowLayout = computeEvenRowLayout(nRacers, rowCount);
  const spreadFactors = [];
  const firstRollOffsets = [];
  for (let i = 0; i < nRacers; i++) {
    // 2. initial spreadFactor
    spreadFactors.push(
      (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN
    );
    // 3. initial roll jitter
    firstRollOffsets.push((Math.random() - 0.5) * 2 * rollInterval * 0.2);
  }
  // 4./5. every scheduled re-roll draw + its jitter
  const reRolls = [];
  for (let roll = 0; roll < rollsPerRacer; roll++) {
    for (let i = 0; i < nRacers; i++) {
      const halfWidth = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN / 2;
      reRolls.push(spreadFactors[i] + (Math.random() - 0.5) * 2 * halfWidth);
      reRolls.push((Math.random() - 0.5) * 2 * rollInterval * 0.2);
    }
  }
  return { rowLayout, spreadFactors, firstRollOffsets, reRolls };
}

function runSeededInit(seed) {
  const restore = installSeededRandom(seed);
  try {
    return initRaceDraws();
  } finally {
    restore();
  }
}

describe('seeded race dynamics (racePlanSeed > 0)', () => {
  it('two initializations on the same seed produce identical draw sequences', () => {
    const a = runSeededInit(42);
    const b = runSeededInit(42);
    expect(b.rowLayout).toEqual(a.rowLayout);
    expect(b.spreadFactors).toEqual(a.spreadFactors);
    expect(b.firstRollOffsets).toEqual(a.firstRollOffsets);
    expect(b.reRolls).toEqual(a.reRolls);
  });

  it('covers the whole race, not just the start (every scheduled re-roll matches)', () => {
    const a = runSeededInit(7);
    const b = runSeededInit(7);
    // Guard against a vacuous pass: the sequence must be long and not constant.
    expect(a.reRolls.length).toBeGreaterThan(50);
    expect(new Set(a.reRolls).size).toBeGreaterThan(10);
    expect(b.reRolls).toEqual(a.reRolls);
  });

  it('different seeds produce different races', () => {
    const a = runSeededInit(1);
    const b = runSeededInit(2);
    expect(b.spreadFactors).not.toEqual(a.spreadFactors);
    expect(b.reRolls).not.toEqual(a.reRolls);
  });

  it('start rows are seeded too (the rowLayout fallback rng is covered)', () => {
    // computeEvenRowLayout is called without an rng, so it draws from the swapped global.
    // Same seed ⇒ same grid; this is the site that was unseeded before this change.
    const restoreA = installSeededRandom(99);
    const layoutA = computeEvenRowLayout(40, 5);
    restoreA();
    const restoreB = installSeededRandom(99);
    const layoutB = computeEvenRowLayout(40, 5);
    restoreB();
    expect(layoutB).toEqual(layoutA);
  });
});

describe('unseeded legacy path (racePlanSeed <= 0)', () => {
  it('leaves Math.random untouched during the race', () => {
    const restore = installSeededRandom(0);
    expect(Math.random).toBe(NATIVE_RANDOM);
    restore();
    expect(Math.random).toBe(NATIVE_RANDOM);
  });

  it('negative / missing seed is treated as unseeded', () => {
    const restore = installSeededRandom(-1);
    expect(Math.random).toBe(NATIVE_RANDOM);
    restore();
    expect(Math.random).toBe(NATIVE_RANDOM);
  });

  it('stays non-deterministic (races still differ run to run)', () => {
    const a = (() => {
      const r = installSeededRandom(0);
      try {
        return initRaceDraws();
      } finally {
        r();
      }
    })();
    const b = (() => {
      const r = installSeededRandom(0);
      try {
        return initRaceDraws();
      } finally {
        r();
      }
    })();
    expect(b.spreadFactors).not.toEqual(a.spreadFactors);
  });
});

describe('no global leakage', () => {
  it('restores the native Math.random after cleanup', () => {
    const restore = installSeededRandom(5);
    expect(Math.random).not.toBe(NATIVE_RANDOM); // seeded while the race runs
    restore();
    expect(Math.random).toBe(NATIVE_RANDOM); // native again after cleanup
  });

  it('a seeded race does not make the NEXT unseeded race deterministic', () => {
    runSeededInit(5); // a seeded race runs and cleans up
    const a = initRaceDraws(); // now unseeded, on the native generator
    const b = initRaceDraws();
    expect(Math.random).toBe(NATIVE_RANDOM);
    expect(b.spreadFactors).not.toEqual(a.spreadFactors);
  });

  it('nested/overlapping race inits restore in reverse order without stranding a seeded global', () => {
    // Defensive: React can mount the next race before the previous cleanup in StrictMode.
    const restoreOuter = installSeededRandom(11);
    const seededOuter = Math.random;
    const restoreInner = installSeededRandom(22);
    expect(Math.random).not.toBe(seededOuter);
    restoreInner();
    expect(Math.random).toBe(seededOuter);
    restoreOuter();
    expect(Math.random).toBe(NATIVE_RANDOM);
  });
});
