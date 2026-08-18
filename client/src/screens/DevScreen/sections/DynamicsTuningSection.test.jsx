// ============================================================
// File:        DynamicsTuningSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/DynamicsTuningSection.test.jsx
// Project:     RaceArena — DEV-CONTROLS-HONEST-1
//
// THE THREE CONTROLS THAT COULD SHOW A NUMBER THE GAME IS NOT RUNNING.
//
// OWNER-DECISIONS-2026-08-19 §1.1 named them: three controls in the Dynamics section fall back to a
// value when their setting is missing, and two of the hard-coded fallbacks were WRONG — the
// checkbox would have read OFF while the game ran ON, and the bonus strength would have read 1.0x
// where the game runs 2.0x. ONE-HOME-1 fixed the CODE, so each fallback now READS
// `DEFAULT_RACE_DYNAMICS_CONFIG` instead of copying a literal. It left the test unwritten, and said
// so; this is it.
//
// WHAT MAKES THIS TEST WORK, and it is the whole design: **the storage loader is mocked to return
// an EMPTY object — the missing-setting case that could never be reached through the resolver — and
// the DEFAULTS ARE THE REAL ONES.** The assertion compares what is rendered against
// `DEFAULT_RACE_DYNAMICS_CONFIG` itself, so it can never be satisfied by a number typed into this
// file. Re-introduce any literal fallback and the rendered value stops matching the one home.
//
// MIN-RACERS-5 is the incident this shape exists for: an untouched control showed a value the game
// was not running, for weeks, because a mirror had been typed twice.
//
// WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── THE ONLY MOCK: storage is EMPTY. Everything else — above all the defaults — is real. ────────
// `importOriginal` rather than a literal object: a mock that re-typed the defaults would be the
// second definition this test exists to forbid, and it would pass against a broken component.
vi.mock('../../../modules/raceDynamicsConfig.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadRaceDynamicsConfig: vi.fn(() => ({})), saveRaceDynamicsConfig: vi.fn() };
});

import DynamicsTuningSection from './DynamicsTuningSection.jsx';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from '../../../modules/raceDynamicsConfig.js';

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe('the Dynamics controls with NO stored setting show what the game runs', () => {
  // DELETE THIS and the checkbox can go back to a hard-coded `?? false` while the shipped game runs
  // the feature ON — the owner would read "off", believe it, and turn it on, changing the race in
  // the direction he thought he was leaving it. That is the exact shape of MIN-RACERS-5.
  it('Gap-Reroll enabled — the checkbox reads the shipped value, not a literal', () => {
    render(<DynamicsTuningSection />);
    const box = screen.getByTestId('gap-reroll-toggle');

    expect(box.checked).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled);
    // The discriminator, stated so a later reader can see the test is not vacuous: the shipped value
    // is TRUE, so the wrong literal this replaced (`false`) would fail the line above.
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled).toBe(true);
  });

  // DELETE THIS and the strength box can go back to a literal. It is the least dangerous of the
  // three today — its old literal happened to equal the shipped value — which is exactly why it
  // needs a test: nothing would notice when one of the two moved and the other did not.
  it('Gap-Reroll strength — the number box reads the shipped value, not a literal', () => {
    render(<DynamicsTuningSection />);
    const box = screen.getByLabelText('Gap-Reroll strength');

    expect(Number(box.value)).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength);
  });

  // DELETE THIS and the multiplier can go back to reading 1.0x where the game runs 2.0x — a control
  // that is wrong by a factor of two, on a value that scales a race-shaping bonus.
  it('Race Plan Bonus Strength — the multiplier reads the shipped value, not a literal', () => {
    render(<DynamicsTuningSection />);
    const box = screen.getByLabelText('Race Plan Bonus Strength Multiplier');

    expect(Number(box.value)).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier);
    // The discriminator: the shipped value is 2.0, so the wrong literal this replaced (1.0) fails.
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier).toBe(2.0);
  });

  // DELETE THIS and the three tests above could all pass against a component that ignores stored
  // settings entirely — showing the default no matter what the owner saved, which is the same
  // disease pointing the other way.
  it('CONTROL — a STORED value is what is shown, so the tests above are about the fallback', async () => {
    const mod = await import('../../../modules/raceDynamicsConfig.js');
    mod.loadRaceDynamicsConfig.mockReturnValueOnce({
      gapRerollEnabled: false,
      gapRerollStrength: 0.25,
      racePlanBonusStrengthMultiplier: 1.5,
    });
    render(<DynamicsTuningSection />);

    expect(screen.getByTestId('gap-reroll-toggle').checked).toBe(false);
    expect(Number(screen.getByLabelText('Gap-Reroll strength').value)).toBe(0.25);
    expect(Number(screen.getByLabelText('Race Plan Bonus Strength Multiplier').value)).toBe(1.5);
  });
});
