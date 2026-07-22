// ============================================================
// File:        quickTestSeed.test.js
// Path:        client/src/screens/SetupScreen/quickTestSeed.test.js
// Project:     RaceArena
// Created:     2026-07-22
// Description: Quick-Test seed UX — empty field draws a fresh random seed per race
//              (different races, each replayable); a typed seed is fixed; seed 0 (the
//              legacy unseeded path) is unreachable from Quick-Test.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  sanitizeQuickTestSeedInput,
  drawQuickTestSeed,
  resolveQuickTestSeed,
  QUICK_TEST_SEED_MIN,
  QUICK_TEST_SEED_MAX,
} from './quickTestSeed.js';
import { mulberry32 } from '../../modules/racePlanner.js';
import { computeEvenRowLayout } from '../../modules/rowLayout.js';

describe('seed field input sanitizing', () => {
  it('keeps an empty field empty (= random)', () => {
    expect(sanitizeQuickTestSeedInput('')).toBe('');
    expect(sanitizeQuickTestSeedInput(null)).toBe('');
    expect(sanitizeQuickTestSeedInput(undefined)).toBe('');
    expect(sanitizeQuickTestSeedInput('   ')).toBe('');
  });

  it('keeps a typed number', () => {
    expect(sanitizeQuickTestSeedInput('42')).toBe('42');
    expect(sanitizeQuickTestSeedInput(1234)).toBe('1234');
  });

  it('strips non-digits instead of collapsing to a wrong number', () => {
    expect(sanitizeQuickTestSeedInput('4a2')).toBe('42');
    expect(sanitizeQuickTestSeedInput('-7')).toBe('7');
  });

  it('clamps to the field range', () => {
    expect(sanitizeQuickTestSeedInput('99999')).toBe(String(QUICK_TEST_SEED_MAX));
  });

  it('makes seed 0 — the legacy unseeded path — unreachable', () => {
    expect(sanitizeQuickTestSeedInput('0')).toBe(String(QUICK_TEST_SEED_MIN));
    expect(sanitizeQuickTestSeedInput('00')).toBe(String(QUICK_TEST_SEED_MIN));
    expect(resolveQuickTestSeed('0').seed).toBeGreaterThan(0);
  });
});

describe('drawQuickTestSeed', () => {
  it('stays inside the field range at both rng extremes', () => {
    expect(drawQuickTestSeed(() => 0)).toBe(QUICK_TEST_SEED_MIN);
    expect(drawQuickTestSeed(() => 0.9999999)).toBe(QUICK_TEST_SEED_MAX);
  });

  it('never draws 0 (which would mean unseeded)', () => {
    for (let i = 0; i < 200; i++) expect(drawQuickTestSeed()).toBeGreaterThanOrEqual(1);
  });

  it('returns integers', () => {
    for (let i = 0; i < 50; i++) expect(Number.isInteger(drawQuickTestSeed())).toBe(true);
  });
});

describe('resolveQuickTestSeed — empty field', () => {
  it('draws a seed and reports it as drawn', () => {
    const { seed, drawn } = resolveQuickTestSeed('', () => 0.5);
    expect(drawn).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(QUICK_TEST_SEED_MIN);
    expect(seed).toBeLessThanOrEqual(QUICK_TEST_SEED_MAX);
  });

  it('two consecutive Quick-Tests get DIFFERENT seeds', () => {
    // The real generator, as the app uses it — the point is that consecutive races differ.
    const seeds = new Set();
    for (let i = 0; i < 40; i++) seeds.add(resolveQuickTestSeed('').seed);
    expect(seeds.size).toBeGreaterThan(30); // overwhelmingly distinct, not a pinned value
  });
});

describe('resolveQuickTestSeed — typed field', () => {
  it('uses the typed value and reports it as not drawn', () => {
    expect(resolveQuickTestSeed('77')).toEqual({ seed: 77, drawn: false });
  });

  it('is stable across repeated resolutions (fixed race)', () => {
    const a = resolveQuickTestSeed('123');
    const b = resolveQuickTestSeed('123');
    expect(b).toEqual(a);
  });
});

// ── The replay guarantee ──────────────────────────────────────────────────────
// A drawn seed must behave exactly like a typed one: the HUD shows the drawn value, and
// typing it back must reproduce the race. Mirrors RaceScreen's draw sites (see
// RaceScreen/seedDeterminism.test.js) and uses the REAL row-layout module.
const BASE_SPEED_MIN = 0.9;
const BASE_SPEED_MAX = 1.1;
const BASE_SPEED_MEAN = 1.0;

function raceDrawsForSeed(seed) {
  const native = Math.random;
  Math.random = mulberry32(seed);
  try {
    const rowLayout = computeEvenRowLayout(12, 3);
    const spreadFactors = [];
    for (let i = 0; i < 12; i++) {
      spreadFactors.push(
        (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN
      );
    }
    const reRolls = [];
    for (let roll = 0; roll < 4; roll++) {
      for (let i = 0; i < 12; i++) reRolls.push(Math.random());
    }
    return { rowLayout, spreadFactors, reRolls };
  } finally {
    Math.random = native;
  }
}

describe('replay guarantee: a drawn seed is as replayable as a typed one', () => {
  it('re-entering the drawn seed reproduces the race move-for-move', () => {
    // Race 1: empty field → a seed is drawn. This is the value the HUD shows.
    const { seed: drawnSeed, drawn } = resolveQuickTestSeed('');
    expect(drawn).toBe(true);
    const original = raceDrawsForSeed(drawnSeed);

    // Owner reads the seed off the HUD and types it into the field.
    const { seed: typedSeed, drawn: wasDrawn } = resolveQuickTestSeed(String(drawnSeed));
    expect(typedSeed).toBe(drawnSeed);
    expect(wasDrawn).toBe(false);

    const replay = raceDrawsForSeed(typedSeed);
    expect(replay.rowLayout).toEqual(original.rowLayout);
    expect(replay.spreadFactors).toEqual(original.spreadFactors);
    expect(replay.reRolls).toEqual(original.reRolls);
  });

  it('two empty-field races differ from each other', () => {
    const a = raceDrawsForSeed(resolveQuickTestSeed('', () => 0.1).seed);
    const b = raceDrawsForSeed(resolveQuickTestSeed('', () => 0.8).seed);
    expect(b.spreadFactors).not.toEqual(a.spreadFactors);
  });

  it('restores Math.random after each race (no leakage into the app)', () => {
    const native = Math.random;
    raceDrawsForSeed(resolveQuickTestSeed('').seed);
    expect(Math.random).toBe(native);
  });
});

// ── sessionStorage persistence rules ──────────────────────────────────────────
// Mirrors the effect in SetupScreen: a typed value persists, an empty field clears the
// key. A drawn seed never reaches this path — resolveQuickTestSeed's result is passed
// straight into the race payload, never into setQuickTestSeed.
function persistSeedField(value, store) {
  if (value === '') store.removeItem('quickTestSeed');
  else store.setItem('quickTestSeed', value);
}

function makeStore(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
    data,
  };
}

describe('sessionStorage persistence', () => {
  it('a typed value persists across a remount', () => {
    const store = makeStore();
    persistSeedField('321', store);
    // Remount: SetupScreen re-reads the key through the same sanitizer.
    expect(sanitizeQuickTestSeedInput(store.getItem('quickTestSeed') ?? '')).toBe('321');
  });

  it('an empty field stays empty across a remount (clears the key)', () => {
    const store = makeStore({ quickTestSeed: '321' });
    persistSeedField('', store); // owner clears the field
    expect(store.getItem('quickTestSeed')).toBeNull();
    expect(sanitizeQuickTestSeedInput(store.getItem('quickTestSeed') ?? '')).toBe('');
  });

  it('an auto-drawn seed does NOT overwrite an empty field', () => {
    const store = makeStore();
    const field = ''; // owner leaves it empty
    const { seed, drawn } = resolveQuickTestSeed(field);
    expect(drawn).toBe(true);
    expect(seed).toBeGreaterThan(0);
    // Only the FIELD value is ever persisted — the drawn seed is not fed back in.
    persistSeedField(field, store);
    expect(store.getItem('quickTestSeed')).toBeNull();
    expect(sanitizeQuickTestSeedInput(store.getItem('quickTestSeed') ?? '')).toBe('');
  });

  it('a fresh session starts empty (random), not pinned to 1', () => {
    const store = makeStore();
    expect(sanitizeQuickTestSeedInput(store.getItem('quickTestSeed') ?? '')).toBe('');
  });
});
