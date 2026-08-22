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

import { DEFAULT_CAMERA_CONFIG } from '../../../modules/cameraConfig.js';
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

// ============================================================
// ENDGAME-COMPLETE-1 — the two endgame switches are reachable from the Dev Screen.
//
// WHY THIS TEST EXISTS, IN THE FORM IT HAS. This project's rule is that every key is settable from
// the UI, and both of these shipped without a control: the only way to compare the two behaviours
// was to hand-edit `localStorage`, which is not a thing an owner should have to do to judge a shot.
//
// WHAT IT WOULD CATCH IF THE TOGGLES WERE DELETED OR MIS-WIRED, and each of these has happened to a
// key in this repository before:
//
//   1. THE CONTROL DISAPPEARS. A later edit to this section removes or renames the checkbox and the
//      key becomes unreachable again, silently — the camera still reads it, so nothing else fails.
//   2. THE CHECKBOX IS WIRED TO THE WRONG KEY. Two adjacent booleans copied from one another is the
//      commonest way this section breaks; the toggle then moves a different behaviour and the one on
//      the label does nothing. Asserting the CHECKED STATE against a persisted value catches that,
//      where merely asserting the control exists would not.
//   3. THE DEFAULT IS READ FROM THE WRONG PLACE. `config.X ?? DEFAULT_CAMERA_CONFIG.X` is the
//      pattern; a missing `??` makes an unset key render as unchecked whatever the default says, so
//      the screen would lie about what the build does.
//
// It does NOT assert the default VALUE of either key. That belongs to defaults.js and to the ship
// ceremony, and pinning it here would make this file fail the day the owner decides to turn one on
// — which is a decision, not a regression.
// ============================================================
describe('ENDGAME-COMPLETE-1 — the endgame switches are reachable and correctly wired', () => {
  it('both toggles are present in the Endgame section', () => {
    renderWith({});
    expect(screen.getByTestId('contention-watch')).toBeInTheDocument();
    expect(screen.getByTestId('band-floor')).toBeInTheDocument();
  });

  // ONE RENDER PER TEST. The first cut of this pair called `renderWith` twice in one `it` and got
  // "Found multiple elements by: [data-testid=contention-watch]" — the second render mounts beside
  // the first rather than replacing it. Splitting them is what the rest of this file already does.
  //
  // THE TWO KEYS ARE SET OPPOSITE WAYS ON PURPOSE: a checkbox wired to the wrong key passes when
  // both are true and when both are false, and fails only on a mixed pair.
  it('contentionWatch on, bandFloor off — each toggle shows its OWN value', () => {
    renderWith({ contentionWatch: true, bandFloor: false });
    expect(screen.getByTestId('contention-watch')).toBeChecked();
    expect(screen.getByTestId('band-floor')).not.toBeChecked();
  });

  it('contentionWatch off, bandFloor on — and they do not swap', () => {
    renderWith({ contentionWatch: false, bandFloor: true });
    expect(screen.getByTestId('contention-watch')).not.toBeChecked();
    expect(screen.getByTestId('band-floor')).toBeChecked();
  });

  it('an unset key falls back to the shipped default rather than to unchecked', () => {
    renderWith({});
    expect(screen.getByTestId('contention-watch').checked).toBe(
      DEFAULT_CAMERA_CONFIG.contentionWatch
    );
    expect(screen.getByTestId('band-floor').checked).toBe(DEFAULT_CAMERA_CONFIG.bandFloor);
  });
});
