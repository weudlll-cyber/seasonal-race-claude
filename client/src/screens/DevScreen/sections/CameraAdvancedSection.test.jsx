// ============================================================
// File:        CameraAdvancedSection.test.jsx
// Project:     RaceArena
// Description: BATTLE-TRIGGER-RANGE-1 — the Pulk Closeness / Isolation sliders expose the fine-grained
//              sub-1% range (0.1%–2.0% / 0.0%–2.0%, step 0.1%), load persisted in-range values exactly,
//              and display with one decimal. Presentation-only.
// ============================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock loadCameraConfig so we control the persisted values; keep DEFAULT_CAMERA_CONFIG + migrations real.
let mockConfig;
vi.mock('../../../modules/cameraConfig.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadCameraConfig: vi.fn(() => ({ ...actual.DEFAULT_CAMERA_CONFIG, ...mockConfig })),
    saveCameraConfig: vi.fn(),
  };
});

import CameraAdvancedSection from './CameraAdvancedSection.jsx';

const renderWith = (cfg) => {
  mockConfig = cfg;
  render(<CameraAdvancedSection />);
};
// The display span is the input's immediate next sibling (SliderRow layout: label · input · display · tip).
const displayFor = (testId) => screen.getByTestId(testId).nextElementSibling.textContent;

describe('CameraAdvancedSection — Pulk Closeness / Isolation fine-grained range (BATTLE-TRIGGER-RANGE-1)', () => {
  it('Pulk Closeness slider: range 0.1%–2.0%, step 0.1% (fraction 0.001–0.02 / 0.001)', () => {
    renderWith({ battlePulkThresholdT: 0.005 });
    const s = screen.getByTestId('battle-pulk-threshold-t');
    expect(s).toHaveAttribute('min', '0.001');
    expect(s).toHaveAttribute('max', '0.02');
    expect(s).toHaveAttribute('step', '0.001');
  });

  it('Isolation slider: range 0.0%–2.0%, step 0.1% (fraction 0–0.02 / 0.001)', () => {
    renderWith({ battleIsolationThresholdT: 0.003 });
    const s = screen.getByTestId('battle-isolation-threshold-t');
    expect(s).toHaveAttribute('min', '0');
    expect(s).toHaveAttribute('max', '0.02');
    expect(s).toHaveAttribute('step', '0.001');
  });

  it('a persisted in-range value loads exactly (Pulk 0.005 → 0.5%, Isolation 0.012 → 1.2%)', () => {
    renderWith({ battlePulkThresholdT: 0.005, battleIsolationThresholdT: 0.012 });
    expect(screen.getByTestId('battle-pulk-threshold-t')).toHaveValue('0.005');
    expect(displayFor('battle-pulk-threshold-t')).toBe('0.5%');
    expect(screen.getByTestId('battle-isolation-threshold-t')).toHaveValue('0.012');
    expect(displayFor('battle-isolation-threshold-t')).toBe('1.2%');
  });

  it('display is one decimal', () => {
    renderWith({ battlePulkThresholdT: 0.001, battleIsolationThresholdT: 0.02 });
    expect(displayFor('battle-pulk-threshold-t')).toBe('0.1%');
    expect(displayFor('battle-isolation-threshold-t')).toBe('2.0%');
  });

  it('a stored value above 2.0% is preserved in the display (thumb clamps, value not rewritten)', () => {
    // The default 0.05 (5%) is above the new slider max — the display still shows the stored 5.0%.
    renderWith({ battlePulkThresholdT: 0.05 });
    expect(displayFor('battle-pulk-threshold-t')).toBe('5.0%');
  });
});
