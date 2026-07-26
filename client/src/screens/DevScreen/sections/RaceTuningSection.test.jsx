// ============================================================
// File:        RaceTuningSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: PR-A3 tests — RaceTuningSection rendering and interactions.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/baseSpeedConfig.js', () => ({
  loadBaseSpeedConfig: vi.fn(() => ({ min: 0.00096, max: 0.00113 })),
  saveBaseSpeedConfig: vi.fn(),
  DEFAULT_BASE_SPEED_CONFIG: { min: 0.00096, max: 0.00113 },
  spreadPercent: (min, max) => {
    if (!min || !max || min >= max) return 0;
    const mean = (min + max) / 2;
    return ((max - min) / 2 / mean) * 100;
  },
}));

vi.mock('../../../modules/raceBehaviorConfig.js', () => ({
  loadRaceBehaviorConfig: vi.fn(() => ({
    enabled: true,
    startSpreadRange: 0.95,
    runoutZone: 0.05,
    comfortThreshold: 0.7,
    softRepulsionStrength: 0.1,
    avoidanceBufferPct: 0.2,
    lateralForce: 0.012,
    lateralDamping: 0.25,
    maxLateral: 0.95,
    speedBrakeTMultiplier: 1.5,
    speedBrakeFactor: 0.98,
    avoidanceWarmupMs: 3000,
    draftingMaxDistance: 80,
    draftingConeAngle: 30,
    draftingBoost: 1.04,
  })),
  saveRaceBehaviorConfig: vi.fn(() => true),
  DEFAULT_RACE_BEHAVIOR_CONFIG: {
    enabled: true,
    startSpreadRange: 0.95,
    runoutZone: 0.05,
    comfortThreshold: 0.7,
    softRepulsionStrength: 0.1,
    avoidanceBufferPct: 0.2,
    lateralForce: 0.012,
    lateralDamping: 0.25,
    maxLateral: 0.95,
    speedBrakeTMultiplier: 1.5,
    speedBrakeFactor: 0.98,
    avoidanceWarmupMs: 3000,
    draftingMaxDistance: 80,
    draftingConeAngle: 30,
    draftingBoost: 1.04,
  },
}));

vi.mock('../../../modules/rowLayoutConfig.js', () => ({
  loadRowLayoutConfig: vi.fn(() => ({
    rowGapMultiplier: 1.5,
    speedBonusFactor: 1.0,
    maxCapacityFactor: 0.3,
  })),
  saveRowLayoutConfig: vi.fn(() => true),
  DEFAULT_ROW_LAYOUT_CONFIG: {
    rowGapMultiplier: 1.5,
    speedBonusFactor: 1.0,
    maxCapacityFactor: 0.3,
  },
}));

// Gap-reroll + B2-attacker keys are included so the DevScreen reorg groups render with real
// values (they moved into the Speed card / their own PULK group). Inlined rather than shared,
// because vi.mock factories are hoisted above any const declaration.
vi.mock('../../../modules/raceDynamicsConfig.js', () => ({
  loadRaceDynamicsConfig: vi.fn(() => ({
    reRollVariationPercent: 58,
    reRollTransitionDuration: 5.0,
    reRollIntervalDivisor: 15,
    reRollLastPositionPercent: 80,
    gapRerollEnabled: true,
    gapRerollThresholdLengths: 0.5,
    gapRerollStrength: 1.0,
    gapRerollMode: 'symmetric',
    gapRerollDevMarker: false,
    b2AttackHeroes: 3,
    packReSteerThreshold: 1.0,
  })),
  saveRaceDynamicsConfig: vi.fn(),
  DEFAULT_RACE_DYNAMICS_CONFIG: {
    reRollVariationPercent: 58,
    reRollTransitionDuration: 5.0,
    reRollIntervalDivisor: 15,
    reRollLastPositionPercent: 80,
    gapRerollEnabled: true,
    gapRerollThresholdLengths: 0.5,
    gapRerollStrength: 1.0,
    gapRerollMode: 'symmetric',
    gapRerollDevMarker: false,
    b2AttackHeroes: 3,
    packReSteerThreshold: 1.0,
  },
}));

vi.mock('../../../modules/frameTimingConfig.js', () => ({
  loadFrameTimingConfig: vi.fn(() => ({ dtSmoothingAlpha: 0.7 })),
  saveFrameTimingConfig: vi.fn(),
  DEFAULT_FRAME_TIMING_CONFIG: { dtSmoothingAlpha: 0.7 },
}));

import { loadRaceDynamicsConfig } from '../../../modules/raceDynamicsConfig.js';
import RaceTuningSection from './RaceTuningSection.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RaceTuningSection — renders all 8 blocks', () => {
  it('renders section header and subtitle', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Race Tuning')).toBeTruthy();
    expect(screen.getByText(/Fine-tune how races feel/)).toBeTruthy();
  });

  it('renders Block 1: Speed Range with inputs', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Speed Range')).toBeTruthy();
    // Min Speed and Max Speed labels rendered inside flex label rows
    expect(screen.getAllByText('Min Speed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Max Speed').length).toBeGreaterThan(0);
  });

  it('renders Block 2: Start Layout', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Start Layout')).toBeTruthy();
    expect(screen.getByLabelText('Start Spread Range')).toBeTruthy();
  });

  it('renders Block 3: Start (Row Start) with summary', () => {
    render(<RaceTuningSection />);
    // Stage-5b-iii: the Row Start controls now live under the "Start" card (dramaturgical reorder).
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByTestId('row-start-summary')).toBeTruthy();
  });

  it('renders Block 4: Speed Re-Roll with preview', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Speed Re-Roll')).toBeTruthy();
    expect(screen.getByTestId('reroll-preview')).toBeTruthy();
  });

  it('renders the finale front-compression toggle + gate fields (Act 2 eye-test control)', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('finale-front-compression-toggle')).toBeTruthy();
    expect(screen.getByLabelText('Catch-up gate G_c (lengths)')).toBeTruthy();
    expect(screen.getByLabelText('Leader-bleed gate G_b (lengths)')).toBeTruthy();
    expect(screen.getByTestId('reset-finale-compression')).toBeTruthy();
  });

  it('renders Block 5: Drafting / Slipstream with summary', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Drafting / Slipstream')).toBeTruthy();
    expect(screen.getByTestId('drafting-summary')).toBeTruthy();
  });

  it('renders Block 6: Comfort Zone', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Comfort Zone')).toBeTruthy();
    expect(screen.getByLabelText('Comfort Threshold')).toBeTruthy();
  });

  it('renders Block 7: Soft Avoidance', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Soft Avoidance')).toBeTruthy();
    expect(screen.getByLabelText('Avoidance Buffer')).toBeTruthy();
  });

  it('renders Block 8: Speed Brake', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Speed Brake')).toBeTruthy();
    expect(screen.getByLabelText('Avoidance Warmup Ms')).toBeTruthy();
  });
});

describe('RaceTuningSection — reset button', () => {
  it('renders Reset All Defaults button', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Reset All Defaults')).toBeTruthy();
  });
});

describe('RaceTuningSection — Re-Roll preview', () => {
  it('shows 4 re-rolls for 60s race with divisor=15', () => {
    render(<RaceTuningSection />);
    const preview = screen.getByTestId('reroll-preview');
    expect(preview.textContent).toContain('4 re-rolls');
  });

  it('shows correct final stretch for lastPositionPercent=80 on 60s race', () => {
    render(<RaceTuningSection />);
    const preview = screen.getByTestId('reroll-preview');
    // 60s × (1 - 0.80) = 12s final stretch
    expect(preview.textContent).toContain('12s');
  });
});

describe('RaceTuningSection — drafting summary', () => {
  it('shows default drafting values in summary', () => {
    render(<RaceTuningSection />);
    const summary = screen.getByTestId('drafting-summary');
    expect(summary.textContent).toContain('80 px');
    expect(summary.textContent).toContain('30°');
    expect(summary.textContent).toContain('+4%');
  });
});

describe('RaceTuningSection — row start summary', () => {
  it('shows full speed compensation with default speedBonusFactor=1.0', () => {
    render(<RaceTuningSection />);
    const summary = screen.getByTestId('row-start-summary');
    expect(summary.textContent).toContain('full');
  });
});

describe('RaceTuningSection — per-block reset buttons', () => {
  it('renders Reset button for Speed Range block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-speed-range')).toBeTruthy();
  });

  it('renders Reset button for Start Layout block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-start-layout')).toBeTruthy();
  });

  it('renders Reset button for Row Start block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-row-start')).toBeTruthy();
  });

  it('renders Reset button for Speed Re-Roll block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-speed-reroll')).toBeTruthy();
  });

  it('renders Reset button for Drafting block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-drafting')).toBeTruthy();
  });

  it('renders Reset button for Comfort Zone block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-comfort-zone')).toBeTruthy();
  });

  it('renders Reset button for Soft Avoidance block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-soft-avoidance')).toBeTruthy();
  });

  it('renders Reset button for Speed Brake block', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('reset-speed-brake')).toBeTruthy();
  });

  it('clicking reset-speed-range restores default min/max without crash', () => {
    render(<RaceTuningSection />);
    fireEvent.click(screen.getByTestId('reset-speed-range'));
    expect(screen.getByTestId('reset-speed-range')).toBeTruthy();
  });

  it('clicking reset-speed-reroll calls setDynamicsConfig with all defaults', () => {
    render(<RaceTuningSection />);
    fireEvent.click(screen.getByTestId('reset-speed-reroll'));
    const preview = screen.getByTestId('reroll-preview');
    expect(preview.textContent).toContain('4 re-rolls');
    expect(preview.textContent).toContain('12s');
  });

  it('clicking reset-drafting does not crash', () => {
    render(<RaceTuningSection />);
    fireEvent.click(screen.getByTestId('reset-drafting'));
    const summary = screen.getByTestId('drafting-summary');
    expect(summary.textContent).toContain('80 px');
  });
});

// ── DevScreen reorg: gap-reroll moved to Speed, B2 attackers got their own group, the row-env
// A/B checkbox was retired to a pinned key. These pin WHERE each control lives, not just that
// it exists — the whole point of the reorg was findability.
describe('RaceTuningSection — DevScreen reorg', () => {
  it('gap-reroll renders as its own group with a per-group Reset', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Gap-Cap Re-Roll')).toBeTruthy();
    expect(screen.getByTestId('reset-gap-reroll')).toBeTruthy();
  });

  it('the whole gap-reroll family is rendered (toggle, G, strength, mode, dev marker)', () => {
    render(<RaceTuningSection />);
    expect(screen.getByTestId('gap-reroll-toggle')).toBeTruthy();
    expect(screen.getByLabelText('Gap-Reroll G (lengths)').value).toBe('0.5');
    expect(screen.getByLabelText('Gap-Reroll strength').value).toBe('1');
    expect(screen.getByTestId('gap-reroll-mode').value).toBe('symmetric');
    expect(screen.getByTestId('gap-reroll-devmarker-toggle')).toBeTruthy();
  });

  it('gap-reroll sits in the Speed card, after the re-roll preview it loads', () => {
    const { container } = render(<RaceTuningSection />);
    const order = [...container.querySelectorAll('[data-testid]')].map((n) =>
      n.getAttribute('data-testid')
    );
    expect(order.indexOf('reset-speed-reroll')).toBeLessThan(order.indexOf('reset-gap-reroll'));
    expect(order.indexOf('reroll-preview')).toBeLessThan(order.indexOf('reset-gap-reroll'));
    // …and before the PULK card's own groups, i.e. still inside Speed.
    expect(order.indexOf('reset-gap-reroll')).toBeLessThan(order.indexOf('reset-pulk'));
  });

  it('drops the "(eye-test)" framing — gap-reroll is the shipped mechanism', () => {
    render(<RaceTuningSection />);
    expect(screen.queryByText(/Gap-Reroll \(eye-test\)/)).toBeNull();
    expect(screen.getByText('Gap-Reroll enabled')).toBeTruthy();
  });

  it('B2 attackers render as their own group with a per-group Reset', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('B2 Attackers')).toBeTruthy();
    expect(screen.getByTestId('reset-b2-attackers')).toBeTruthy();
    expect(screen.getByLabelText('B2-attacker count (0–5)').value).toBe('3');
    expect(screen.getByLabelText('Attacker re-steer threshold (0.5–3.0)').value).toBe('1');
  });

  it('the retired row-env A/B checkbox is gone (key stays pinned, behaviour unchanged)', () => {
    render(<RaceTuningSection />);
    expect(screen.queryByLabelText('rowEnvSmooth')).toBeNull();
  });
});

describe('RaceTuningSection — reset uses DEFAULT values, not current state (regression)', () => {
  it('reset-speed-reroll restores reRollVariationPercent to 58 when loaded with stored value 150', () => {
    loadRaceDynamicsConfig.mockReturnValueOnce({
      reRollVariationPercent: 150,
      reRollTransitionDuration: 3.0,
      reRollIntervalDivisor: 20,
      reRollLastPositionPercent: 70,
    });
    render(<RaceTuningSection />);
    const input = screen.getByLabelText('Re-Roll Variation Percent');
    expect(input.value).toBe('150');
    fireEvent.click(screen.getByTestId('reset-speed-reroll'));
    expect(input.value).toBe('58');
  });
});
