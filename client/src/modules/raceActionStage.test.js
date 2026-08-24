// ============================================================
// File:        raceActionStage.test.js
// Path:        client/src/modules/raceActionStage.test.js
// Project:     RaceArena — RACE-ACTION-CONTROL-1
//
// WHAT THIS IS FOR: the Race Action control offers three stages and the shipped one must stay
// EXACTLY what shipped. These tests hold the properties that make the control safe to add, and each
// was proven to fail by sabotage before it was kept (the sabotages are recorded in
// reports/evolution/RACE-ACTION-CONTROL-1.md):
//
//   1. the default is QUIET                      — sabotage: default the key to 'wild'
//   2. quiet is BYTE-IDENTICAL to today's config — sabotage: give quiet its own literal numbers
//   3. each stage sets EXACTLY its two keys      — sabotage: have wild also write pulkFrontPool
//   4. medium's brake is the SHIPPED one         — sabotage: give medium a brake of its own
//   5. an unknown/missing stage reads as quiet   — sabotage: pass the id through untouched
//
// WHAT IS NOT HERE, deliberately (VERIFY-RULES R7). "These values produce that race" is NOT asserted
// here: the stages set two ORDINARY config keys the engine already had, so what the engine does with
// them is the engine's own coverage and the four fingerprints are what prove the quiet default inert.
// This file owns the TABLE and the RESOLUTION, nothing downstream of them.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RACE_DEFAULTS,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  RACE_ACTION_STAGES,
  RACE_ACTION_STAGE_IDS,
} from './storage/defaults.js';
import {
  normalizeRaceActionStage,
  raceActionStageValues,
  applyRaceActionStage,
  FALLBACK_RACE_ACTION_STAGE,
} from './raceActionStage.js';

describe('RACE-ACTION-CONTROL-1 — the stage table', () => {
  it('offers exactly the three stages, in host order', () => {
    expect(RACE_ACTION_STAGE_IDS).toEqual(['quiet', 'medium', 'wild']);
    expect(Object.keys(RACE_ACTION_STAGES).sort()).toEqual(['medium', 'quiet', 'wild']);
  });

  // PROPERTY 1 — the default is quiet.
  it('defaults to quiet, and the default is read from defaults.js rather than restated', () => {
    expect(DEFAULT_RACE_DEFAULTS.raceActionStage).toBe('quiet');
    expect(FALLBACK_RACE_ACTION_STAGE).toBe(DEFAULT_RACE_DEFAULTS.raceActionStage);
  });

  // PROPERTY 2 — the one that the fingerprints then prove end-to-end. Quiet must not merely be
  // "close to" the shipped values; applying it must leave the shipped config byte-identical.
  it('quiet IS the shipped configuration — applying it to the defaults changes nothing', () => {
    const applied = applyRaceActionStage(DEFAULT_RACE_DYNAMICS_CONFIG, 'quiet');
    expect(applied).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    expect(JSON.stringify(applied)).toBe(JSON.stringify(DEFAULT_RACE_DYNAMICS_CONFIG));
  });

  // PROPERTY 3 — nothing else moves. Compares the FULL key set and every value, so a stage that
  // quietly wrote a third key would fail here rather than in a race nobody re-measured.
  it.each(RACE_ACTION_STAGE_IDS)('stage %s touches exactly its two keys and no others', (stage) => {
    expect(Object.keys(raceActionStageValues(stage)).sort()).toEqual([
      'pulkChallengerBoost',
      'pulkLeaderBrake',
    ]);
    const applied = applyRaceActionStage(DEFAULT_RACE_DYNAMICS_CONFIG, stage);
    expect(Object.keys(applied).sort()).toEqual(Object.keys(DEFAULT_RACE_DYNAMICS_CONFIG).sort());
    for (const key of Object.keys(DEFAULT_RACE_DYNAMICS_CONFIG)) {
      if (key === 'pulkChallengerBoost' || key === 'pulkLeaderBrake') continue;
      expect(applied[key]).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG[key]);
    }
  });

  // PROPERTY 4 — the three stages are the owner's ladder: boost rises once, brake rises once, and
  // only on wild. Stated as RELATIONS to defaults.js so this file states no config value.
  it('is the owner ladder: medium lifts the boost only, wild lifts the boost and the brake', () => {
    const quiet = raceActionStageValues('quiet');
    const medium = raceActionStageValues('medium');
    const wild = raceActionStageValues('wild');

    expect(quiet.pulkChallengerBoost).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.pulkChallengerBoost);
    expect(quiet.pulkLeaderBrake).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake);

    // medium: the boost rises, the brake stays at its SHIPPED value (not a value of its own).
    expect(medium.pulkChallengerBoost).toBeGreaterThan(quiet.pulkChallengerBoost);
    expect(medium.pulkLeaderBrake).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake);

    // wild: the SAME boost as medium, and the brake rises on top of it — the levers add up.
    expect(wild.pulkChallengerBoost).toBe(medium.pulkChallengerBoost);
    expect(wild.pulkLeaderBrake).toBeGreaterThan(medium.pulkLeaderBrake);
  });

  it('hands out a fresh object, so a caller cannot mutate the shared table', () => {
    const first = raceActionStageValues('wild');
    first.pulkLeaderBrake = 999;
    expect(raceActionStageValues('wild').pulkLeaderBrake).not.toBe(999);
  });

  it('never mutates the config it is given', () => {
    const input = { ...DEFAULT_RACE_DYNAMICS_CONFIG };
    const before = JSON.stringify(input);
    applyRaceActionStage(input, 'wild');
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('RACE-ACTION-CONTROL-1 — resolving a stage that is not one of the three', () => {
  // PROPERTY 5 — the compatibility property. Every one of these is a real input: a race payload
  // written before the key existed, a stored blob from an older build, a stage from a newer one.
  it.each([
    ['missing (a race stored before this change)', undefined],
    ['null', null],
    ['empty string', ''],
    ['a stage from a future build', 'feral'],
    ['the right word in the wrong case', 'Wild'],
    ['a number', 2],
    ['an object', { stage: 'wild' }],
  ])('%s reads as quiet', (_label, value) => {
    expect(normalizeRaceActionStage(value)).toBe('quiet');
    expect(applyRaceActionStage(DEFAULT_RACE_DYNAMICS_CONFIG, value)).toEqual(
      DEFAULT_RACE_DYNAMICS_CONFIG
    );
  });

  it.each(RACE_ACTION_STAGE_IDS)('passes the real stage %s through untouched', (stage) => {
    expect(normalizeRaceActionStage(stage)).toBe(stage);
  });
});
