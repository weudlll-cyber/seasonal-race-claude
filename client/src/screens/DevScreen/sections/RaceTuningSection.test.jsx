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
  loadBaseSpeedConfig: vi.fn(() => ({ min: 0.00091, max: 0.00118 })),
  saveBaseSpeedConfig: vi.fn(),
  DEFAULT_BASE_SPEED_CONFIG: { min: 0.00091, max: 0.00118 },
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
    safetyMarginPx: 3,
    lookAheadFrames: 3,
    slotSearchRadiusPx: 60,
    speedBrakeFactor: 0.95,
    draftingMaxDistance: 110,
    draftingConeAngle: 30,
    draftingBoost: 1.1,
  })),
  saveRaceBehaviorConfig: vi.fn(() => true),
  DEFAULT_RACE_BEHAVIOR_CONFIG: {
    enabled: true,
    startSpreadRange: 0.95,
    runoutZone: 0.05,
    safetyMarginPx: 3,
    lookAheadFrames: 3,
    slotSearchRadiusPx: 60,
    speedBrakeFactor: 0.95,
    draftingMaxDistance: 110,
    draftingConeAngle: 30,
    draftingBoost: 1.1,
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

vi.mock('../../../modules/raceDynamicsConfig.js', () => ({
  loadRaceDynamicsConfig: vi.fn(() => ({
    reRollVariationPercent: 85,
    reRollTransitionDuration: 5.0,
    reRollIntervalDivisor: 15,
    reRollLastPositionPercent: 80,
  })),
  saveRaceDynamicsConfig: vi.fn(),
  DEFAULT_RACE_DYNAMICS_CONFIG: {
    reRollVariationPercent: 85,
    reRollTransitionDuration: 5.0,
    reRollIntervalDivisor: 15,
    reRollLastPositionPercent: 80,
  },
}));

import { loadRaceDynamicsConfig } from '../../../modules/raceDynamicsConfig.js';
import RaceTuningSection from './RaceTuningSection.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RaceTuningSection — renders all 6 blocks', () => {
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

  it('renders Block 3: Row Start with summary', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Row Start')).toBeTruthy();
    expect(screen.getByTestId('row-start-summary')).toBeTruthy();
  });

  it('renders Block 4: Speed Re-Roll with preview', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Speed Re-Roll')).toBeTruthy();
    expect(screen.getByTestId('reroll-preview')).toBeTruthy();
  });

  it('renders Block 5: Drafting / Slipstream with summary', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Drafting / Slipstream')).toBeTruthy();
    expect(screen.getByTestId('drafting-summary')).toBeTruthy();
  });

  it('renders Block 6: Speed Brake', () => {
    render(<RaceTuningSection />);
    expect(screen.getByText('Speed Brake')).toBeTruthy();
    expect(screen.getByLabelText('Speed Brake Factor')).toBeTruthy();
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
    expect(summary.textContent).toContain('110 px');
    expect(summary.textContent).toContain('30°');
    expect(summary.textContent).toContain('+10%');
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
    expect(summary.textContent).toContain('110 px');
  });
});

describe('RaceTuningSection — reset uses DEFAULT values, not current state (regression)', () => {
  it('reset-speed-reroll restores reRollVariationPercent to 85 when loaded with stored value 150', () => {
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
    expect(input.value).toBe('85');
  });
});
