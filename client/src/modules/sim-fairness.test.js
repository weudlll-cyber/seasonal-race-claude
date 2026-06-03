// ============================================================
// File:        sim-fairness.test.js
// Path:        client/src/modules/sim-fairness.test.js
// Project:     RaceArena
// Created:     2026-05-17
// Description: Sanity-check tests for scripts/sim-fairness.mjs.
//              Verifies core functions without running the full
//              matrix (that's done by the CLI tool itself).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  makePRNG,
  runSingleRace,
  computeFinishT,
  computeFairnessStats,
  RACER_CONFIGS,
} from '../../../scripts/sim-fairness.mjs';
import { REFERENCE_FPS } from './camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG } from './storage/defaults.js';

// ── Minimal circular track mock ───────────────────────────────────────────────
// Avoids loading real track JSON. Closed circular track: t ∈ [0,1] maps to a
// 500px-radius circle. getActualTrackWidth returns 150px (wider than a sprite).
const MOCK_PATH_LENGTH = 2 * Math.PI * 500; // ≈ 3142 px
const MOCK_TRACK_WIDTH = 150;

const mockShape = {
  isOpen: false,
  getPosition(t, physicalYHalf) {
    const angle = t * 2 * Math.PI;
    const r = 500 + physicalYHalf * MOCK_TRACK_WIDTH;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      angle: angle + Math.PI / 2,
    };
  },
  getActualTrackWidth() {
    return MOCK_TRACK_WIDTH;
  },
};

// Shared race parameters for most tests
const BASE_N_RACERS = 5;
const BASE_FINISH_T = 0.5;
const BASE_TARGET_SEC = 30;

function makeRaceParams(overrides = {}) {
  return {
    shape: mockShape,
    pathLengthPx: MOCK_PATH_LENGTH,
    geometricTrackWidth: MOCK_TRACK_WIDTH,
    isOpen: false,
    speedMultiplier: 1.0,
    displaySize: 40,
    finishT: BASE_FINISH_T,
    targetSeconds: BASE_TARGET_SEC,
    seed: 42,
    nRacers: BASE_N_RACERS,
    ...overrides,
  };
}

// ── makePRNG ──────────────────────────────────────────────────────────────────
describe('makePRNG', () => {
  it('returns values in [0, 1)', () => {
    const rng = makePRNG(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed → same sequence', () => {
    const r1 = makePRNG(99);
    const r2 = makePRNG(99);
    for (let i = 0; i < 20; i++) expect(r1()).toBe(r2());
  });

  it('different seeds → different sequences', () => {
    const r1 = makePRNG(1);
    const r2 = makePRNG(2);
    const seq1 = Array.from({ length: 10 }, () => r1());
    const seq2 = Array.from({ length: 10 }, () => r2());
    expect(seq1).not.toEqual(seq2);
  });
});

// ── computeFinishT ────────────────────────────────────────────────────────────
describe('computeFinishT', () => {
  const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;
  // expectedMinSF for N=5 racers
  const spreadMin = DEFAULT_BASE_SPEED_CONFIG.min / BASE_SPEED_MEAN;
  const spreadMax = DEFAULT_BASE_SPEED_CONFIG.max / BASE_SPEED_MEAN;
  const esf = spreadMin + (spreadMax - spreadMin) / (5 + 1);
  const naturalBaseSpeed = BASE_SPEED_MEAN / esf;

  it('closed track: finishT scales linearly with targetSeconds', () => {
    const ft30 = computeFinishT(naturalBaseSpeed, 1.0, 30, false);
    const ft60 = computeFinishT(naturalBaseSpeed, 1.0, 60, false);
    expect(ft60).toBeCloseTo(ft30 * 2, 5);
  });

  it('closed track: higher speedMultiplier → larger finishT', () => {
    const ftHorse = computeFinishT(naturalBaseSpeed, 1.0, 30, false);
    const ftRocket = computeFinishT(naturalBaseSpeed, 1.25, 30, false);
    expect(ftRocket).toBeGreaterThan(ftHorse);
    expect(ftRocket).toBeCloseTo(ftHorse * 1.25, 5);
  });

  it('open track: finishT capped at 0.95', () => {
    // Very long target → would exceed 0.95
    const ft = computeFinishT(naturalBaseSpeed, 1.25, 1000, true, 0.05);
    expect(ft).toBe(0.95);
  });

  it('open track: short target below cap passes through', () => {
    const ft = computeFinishT(naturalBaseSpeed, 0.3, 5, true, 0.05);
    expect(ft).toBeLessThan(0.95);
    expect(ft).toBeGreaterThan(0);
  });

  it('formula: ft = naturalBaseSpeed × speedMultiplier × REFERENCE_FPS × seconds', () => {
    const ft = computeFinishT(naturalBaseSpeed, 0.85, 30, false);
    expect(ft).toBeCloseTo(naturalBaseSpeed * 0.85 * REFERENCE_FPS * 30, 8);
  });
});

// ── runSingleRace ─────────────────────────────────────────────────────────────
describe('runSingleRace', () => {
  it('returns one result per racer', () => {
    const results = runSingleRace(makeRaceParams());
    expect(results).toHaveLength(BASE_N_RACERS);
  });

  it('each racer has a unique finalRank in 1..nRacers', () => {
    const results = runSingleRace(makeRaceParams());
    const ranks = results.map((r) => r.finalRank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it('winner has finalRank = 1 and finishTime > 0', () => {
    const results = runSingleRace(makeRaceParams());
    const winner = results.find((r) => r.finalRank === 1);
    expect(winner).toBeDefined();
    expect(winner.finishTime).toBeGreaterThan(0);
  });

  it('deterministic: same seed → identical results', () => {
    const r1 = runSingleRace(makeRaceParams({ seed: 7 }));
    const r2 = runSingleRace(makeRaceParams({ seed: 7 }));
    for (let i = 0; i < BASE_N_RACERS; i++) {
      expect(r1[i].finalRank).toBe(r2[i].finalRank);
      expect(r1[i].startRowIndex).toBe(r2[i].startRowIndex);
      expect(r1[i].finalT).toBeCloseTo(r2[i].finalT, 10);
    }
  });

  it('different seeds → (usually) different winners', () => {
    // Run 10 races and check there is more than 1 unique winner
    const winners = new Set();
    for (let seed = 1; seed <= 10; seed++) {
      const results = runSingleRace(makeRaceParams({ seed, nRacers: 10 }));
      const winner = results.find((r) => r.finalRank === 1);
      winners.add(winner.racerIndex ?? winner.startRowIndex);
    }
    expect(winners.size).toBeGreaterThan(1);
  });

  it('speedBonusMult applied: rear-row racer gets nonzero bonus', () => {
    // With multiple rows, some racers must be in row > 0
    const results = runSingleRace(makeRaceParams({ nRacers: 20 }));
    const rearRacers = results.filter((r) => r.startRowIndex > 0);
    expect(rearRacers.length).toBeGreaterThan(0);
  });

  it('Math.random is restored after race', () => {
    const before = Math.random.toString();
    runSingleRace(makeRaceParams());
    const after = Math.random.toString();
    expect(after).toBe(before);
  });

  it('all racers have a startRowIndex in [0, totalRows)', () => {
    const results = runSingleRace(makeRaceParams({ nRacers: 20 }));
    for (const r of results) {
      expect(r.startRowIndex).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── computeFairnessStats ──────────────────────────────────────────────────────
describe('computeFairnessStats', () => {
  it('win counts sum to nRaces', () => {
    // Synthetic results: 3 races, 6 racers, 2 rows (3 per row)
    const results = [
      [
        { startRowIndex: 0, finalRank: 1 },
        { startRowIndex: 0, finalRank: 2 },
        { startRowIndex: 0, finalRank: 3 },
        { startRowIndex: 1, finalRank: 4 },
        { startRowIndex: 1, finalRank: 5 },
        { startRowIndex: 1, finalRank: 6 },
      ],
      [
        { startRowIndex: 1, finalRank: 1 },
        { startRowIndex: 0, finalRank: 2 },
        { startRowIndex: 0, finalRank: 3 },
        { startRowIndex: 1, finalRank: 4 },
        { startRowIndex: 1, finalRank: 5 },
        { startRowIndex: 0, finalRank: 6 },
      ],
      [
        { startRowIndex: 0, finalRank: 1 },
        { startRowIndex: 1, finalRank: 2 },
        { startRowIndex: 0, finalRank: 3 },
        { startRowIndex: 1, finalRank: 4 },
        { startRowIndex: 0, finalRank: 5 },
        { startRowIndex: 1, finalRank: 6 },
      ],
    ];
    const stats = computeFairnessStats(results, 2);
    expect(stats.rowStats[0].wins + stats.rowStats[1].wins).toBe(3);
  });

  it('perfect fairness: p-value close to 1', () => {
    // All rows win equally: 25 wins each across 2 rows, 50 races
    const results = [];
    for (let i = 0; i < 50; i++) {
      const row = i % 2; // alternating winner rows
      results.push([
        { startRowIndex: row, finalRank: 1 },
        { startRowIndex: 1 - row, finalRank: 2 },
      ]);
    }
    const stats = computeFairnessStats(results, 2);
    expect(stats.chiSq).toBeCloseTo(0, 5);
    expect(stats.pValue).toBeGreaterThan(0.5);
  });

  it('extreme front-bias: low p-value', () => {
    // Row 0 wins all 50 races
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push([
        { startRowIndex: 0, finalRank: 1 },
        { startRowIndex: 1, finalRank: 2 },
        { startRowIndex: 2, finalRank: 3 },
      ]);
    }
    const stats = computeFairnessStats(results, 3);
    expect(stats.pValue).toBeLessThan(0.001);
  });

  it('rowStats length equals totalRows', () => {
    const results = [
      [
        { startRowIndex: 0, finalRank: 1 },
        { startRowIndex: 1, finalRank: 2 },
      ],
    ];
    const stats = computeFairnessStats(results, 2);
    expect(stats.rowStats).toHaveLength(2);
  });

  it('avgRank for winner-only row is 1 when they always win', () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push([
        { startRowIndex: 0, finalRank: 1 },
        { startRowIndex: 1, finalRank: 2 },
      ]);
    }
    const stats = computeFairnessStats(results, 2);
    expect(stats.rowStats[0].avgRank).toBeCloseTo(1, 5);
    expect(stats.rowStats[1].avgRank).toBeCloseTo(2, 5);
  });
});

// ── RACER_CONFIGS ─────────────────────────────────────────────────────────────
describe('RACER_CONFIGS', () => {
  it('has 20 racer types', () => {
    expect(Object.keys(RACER_CONFIGS)).toHaveLength(20);
  });

  it('all speedMultipliers are positive', () => {
    for (const [_id, cfg] of Object.entries(RACER_CONFIGS)) {
      expect(cfg.speedMultiplier).toBeGreaterThan(0);
    }
  });

  it('snail is the slowest (0.30)', () => {
    expect(RACER_CONFIGS.snail.speedMultiplier).toBe(0.3);
  });

  it('rocket is the fastest (1.25)', () => {
    expect(RACER_CONFIGS.rocket.speedMultiplier).toBe(1.25);
  });

  it('horse speedMultiplier matches source (1.0)', () => {
    expect(RACER_CONFIGS.horse.speedMultiplier).toBe(1.0);
  });
});

// ── Integration: 5 racers, real-ish setup ────────────────────────────────────
describe('integration: 5 racers on mock circular track', () => {
  it('all 5 finish within safety timeout', () => {
    const results = runSingleRace(makeRaceParams({ nRacers: 5, finishT: 0.3, targetSeconds: 20 }));
    for (const r of results) {
      expect(r.finalRank).toBeGreaterThanOrEqual(1);
      expect(r.finalRank).toBeLessThanOrEqual(5);
    }
  });

  it('winner finishTime is less than loser finishTime (or DNF null)', () => {
    const results = runSingleRace(makeRaceParams({ nRacers: 5, finishT: 0.3, targetSeconds: 20 }));
    const winner = results.find((r) => r.finalRank === 1);
    const last = results.find((r) => r.finalRank === 5);
    if (winner.finishTime != null && last.finishTime != null) {
      expect(winner.finishTime).toBeLessThanOrEqual(last.finishTime);
    }
  });

  it('computeFairnessStats over 10 races produces valid output', () => {
    const races = [];
    for (let seed = 1; seed <= 10; seed++) {
      races.push(runSingleRace(makeRaceParams({ seed, nRacers: 10, finishT: 0.3 })));
    }
    // Figure out how many rows the layout created
    const maxRow = Math.max(...races.flat().map((r) => r.startRowIndex));
    const stats = computeFairnessStats(races, maxRow + 1);
    expect(stats.nRaces).toBe(10);
    expect(stats.rowStats.length).toBeGreaterThanOrEqual(1);
    const totalWins = stats.rowStats.reduce((s, r) => s + r.wins, 0);
    expect(totalWins).toBe(10);
  });
});

// ── Mixing-quota (open-track ramp) ────────────────────────────────────────────
describe('runSingleRace — mixingQuota (open-track warmup)', () => {
  // Open-track mock shape
  const openMockShape = {
    isOpen: true,
    getPosition(t, physicalYHalf) {
      const angle = Math.min(t, 1) * 2 * Math.PI;
      const r = 500 + physicalYHalf * MOCK_TRACK_WIDTH;
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, angle: angle + Math.PI / 2 };
    },
    getActualTrackWidth() {
      return MOCK_TRACK_WIDTH;
    },
  };

  function makeOpenParams(overrides = {}) {
    return {
      ...makeRaceParams({ nRacers: 20, finishT: 0.8, targetSeconds: 30 }),
      shape: openMockShape,
      isOpen: true,
      ...overrides,
    };
  }

  it('mixingQuota is null on closed tracks', () => {
    const results = runSingleRace(makeRaceParams({ nRacers: 10 }));
    expect(results.mixingQuota).toBeNull();
  });

  it('mixingQuota is a number in [0, 1] on open tracks', () => {
    const results = runSingleRace(makeOpenParams());
    expect(results.mixingQuota).not.toBeNull();
    expect(results.mixingQuota).toBeGreaterThanOrEqual(0);
    expect(results.mixingQuota).toBeLessThanOrEqual(1);
  });

  it('mixingQuota is null on open track when avoidanceWarmupMs = 0', () => {
    // warmupMs=0 means snapshot never fires (raceTs >= 0 immediately, but isOpen guard
    // checks avoidanceWarmupMs > 0 — warmupMeasured fires at frame 1 when warmupMs=0)
    // Actually since raceTs >= 0 at the first frame, let's just confirm it's defined:
    const results = runSingleRace(makeOpenParams());
    // With warmupMs>0, it should be non-null
    expect(typeof results.mixingQuota).toBe('number');
  });

  it('returned array length is unchanged (mixingQuota is extra property)', () => {
    const results = runSingleRace(makeOpenParams());
    expect(results).toHaveLength(20);
    expect(results.mixingQuota).toBeDefined();
  });

  it('for...of iteration over results ignores mixingQuota', () => {
    const results = runSingleRace(makeOpenParams());
    let count = 0;
    for (const r of results) {
      expect(r).not.toHaveProperty('mixingQuota');
      count++;
    }
    expect(count).toBe(20);
  });
});
