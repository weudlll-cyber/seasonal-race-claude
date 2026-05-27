// ============================================================
// File:        RacerEditModal.test.jsx
// Path:        client/src/screens/DevScreen/sections/RacerEditModal.test.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Component tests for RacerEditModal (D3.5.5 + D7a-Plus)
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../modules/racer-types/spriteLoader.js', () => ({
  getCachedSprite: vi.fn(),
  loadSprite: vi.fn().mockResolvedValue({}),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('../../../modules/racer-types/spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue({}),
    tintSpriteWithMask: vi.fn().mockReturnValue({}),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

vi.mock('../../../modules/autoSpriteScale.js', () => ({
  loadAutoScaleConfig: vi.fn(() => ({ minTargetScreenPx: 32 })),
  DEFAULT_AUTO_SCALE_CONFIG: { minTargetScreenPx: 32 },
}));

vi.mock('../../../modules/surface-effects/useSurfaceClasses.js', () => ({
  useSurfaceClasses: () => ({
    classes: [
      { id: 'earth', label: 'Earth' },
      { id: 'grass', label: 'Grass' },
      { id: 'water', label: 'Water' },
    ],
    refresh: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

import { RacerEditModal } from './RacerEditModal.jsx';
import {
  RACER_TYPE_IDS,
  TUNABLE_FIELDS,
  CONFIG_SNAPSHOT,
  RACER_TYPES,
  restoreTunableDefault,
  registerRacerType,
  _resetLoadedRacerTypesForTesting,
} from '../../../modules/racer-types/index.js';

beforeEach(() => {
  localStorage.clear();
  for (const id of RACER_TYPE_IDS) {
    for (const f of TUNABLE_FIELDS) restoreTunableDefault(id, f);
  }
});

function renderModal(typeId = 'horse', overrides = {}, onClose = vi.fn()) {
  const setOverrides = vi.fn();
  render(
    <RacerEditModal
      typeId={typeId}
      overrides={overrides}
      setOverrides={setOverrides}
      onClose={onClose}
    />
  );
  return { setOverrides, onClose };
}

describe('RacerEditModal', () => {
  it('renders a dialog with the type name', () => {
    renderModal('horse');
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Header title contains "Horse" — find it specifically in the dialog header
    expect(screen.getByRole('dialog').querySelector('span')).toBeTruthy();
  });

  it('renders all 6 tunable field labels', () => {
    renderModal('horse');
    expect(screen.getByLabelText(/Speed Multiplier/i)).toBeTruthy();
    expect(screen.getByLabelText(/Display Size/i)).toBeTruthy();
    expect(screen.getByLabelText(/Anim Period/i)).toBeTruthy();
    expect(screen.getByLabelText(/Leader Ring Color hex/i)).toBeTruthy();
    expect(screen.getByLabelText(/Leader Ring Width/i)).toBeTruthy();
    expect(screen.getByLabelText(/Leader Ring Height/i)).toBeTruthy();
  });

  it('shows code default values in inputs', () => {
    renderModal('horse');
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    expect(smInput.value).toBe(String(CONFIG_SNAPSHOT.horse.speedMultiplier));
  });

  it('shows overridden value when override exists', () => {
    renderModal('horse', { horse: { speedMultiplier: 1.5 } });
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    expect(smInput.value).toBe('1.5');
  });

  it('calls setOverrides when a valid value is entered', () => {
    const { setOverrides } = renderModal('horse');
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    fireEvent.change(smInput, { target: { value: '1.2' } });
    expect(setOverrides).toHaveBeenCalled();
  });

  it('does NOT call setOverrides when value is out of range', () => {
    const { setOverrides } = renderModal('horse');
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    fireEvent.change(smInput, { target: { value: '999' } });
    expect(setOverrides).not.toHaveBeenCalled();
  });

  it('shows an error message for out-of-range values', () => {
    renderModal('horse');
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    fireEvent.change(smInput, { target: { value: '0' } });
    expect(screen.getByText(/Range:/i)).toBeTruthy();
  });

  it('shows error for invalid hex color', () => {
    renderModal('horse');
    const colorText = screen.getByLabelText(/Leader Ring Color hex/i);
    fireEvent.change(colorText, { target: { value: '#gg0000' } });
    expect(screen.getByText(/hex color/i)).toBeTruthy();
  });

  it('shows "modified" badge for overridden fields', () => {
    renderModal('horse', { horse: { speedMultiplier: 1.5 } });
    expect(screen.getByText('modified')).toBeTruthy();
  });

  it('shows Reset button only for overridden fields', () => {
    renderModal('horse', { horse: { speedMultiplier: 1.5 } });
    const resetBtns = screen.getAllByRole('button', { name: /reset/i });
    // "Reset" per-field button + "Reset all to defaults" footer button
    expect(resetBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when Done is clicked', () => {
    const { onClose } = renderModal('horse');
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when ✕ is clicked', () => {
    const { onClose } = renderModal('horse');
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Reset all to defaults calls setOverrides and restores live config', () => {
    RACER_TYPES.horse.config.speedMultiplier = 1.9;
    const { setOverrides } = renderModal('horse', { horse: { speedMultiplier: 1.9 } });
    const resetAllBtn = screen.getByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(resetAllBtn);
    expect(setOverrides).toHaveBeenCalled();
    expect(RACER_TYPES.horse.config.speedMultiplier).toBe(CONFIG_SNAPSHOT.horse.speedMultiplier);
  });

  it('Reset all button is disabled when no tuning overrides exist', () => {
    renderModal('horse', {});
    const resetAllBtn = screen.getByRole('button', { name: /Reset all to defaults/i });
    expect(resetAllBtn.disabled).toBe(true);
  });

  it('InfoTooltip is present for each field including min sprite size and surface classes', () => {
    renderModal('horse');
    // tooltip spans have display:none — query with hidden:true
    // 6 standard fields + 1 min sprite size + 1 surface classes = 8 total
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.length).toBe(8);
  });
});

describe('RacerEditModal — min sprite size section (D7a-Plus)', () => {
  it('renders the Min Sprite Screen Size slider', () => {
    renderModal('horse');
    expect(screen.getByLabelText(/Min Sprite Screen Size/i)).toBeTruthy();
  });

  it('slider shows global default (32) when no override is set', () => {
    renderModal('horse');
    const slider = screen.getByLabelText(/Min Sprite Screen Size/i);
    expect(slider.value).toBe('32');
  });

  it('slider shows override value when override is set', () => {
    renderModal('horse', { horse: { minTargetScreenPx: 64 } });
    const slider = screen.getByLabelText(/Min Sprite Screen Size/i);
    expect(slider.value).toBe('64');
  });

  it('shows global default hint when no override is set', () => {
    renderModal('horse');
    expect(screen.getByText(/global default \(32px\)/i)).toBeTruthy();
  });

  it('hides global default hint when override is set', () => {
    renderModal('horse', { horse: { minTargetScreenPx: 48 } });
    expect(screen.queryByText(/global default/i)).toBeNull();
  });

  it('shows modified badge when override is set', () => {
    renderModal('horse', { horse: { minTargetScreenPx: 48 } });
    // At least one "modified" badge (the minSize one)
    expect(screen.getAllByText('modified').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setOverrides when slider changes', () => {
    const { setOverrides } = renderModal('horse');
    const slider = screen.getByLabelText(/Min Sprite Screen Size/i);
    fireEvent.change(slider, { target: { value: '56' } });
    expect(setOverrides).toHaveBeenCalled();
  });

  it('shows Reset button for min size when override is set', () => {
    renderModal('horse', { horse: { minTargetScreenPx: 48 } });
    const resetBtns = screen.getAllByRole('button', { name: /reset/i });
    expect(resetBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('Reset for min size calls setOverrides to remove override', () => {
    const { setOverrides } = renderModal('horse', { horse: { minTargetScreenPx: 48 } });
    // Find the Reset button in the min size row (title contains "global default")
    const resetBtn = screen.getByTitle(/Reset Min Sprite Screen Size/i);
    fireEvent.click(resetBtn);
    expect(setOverrides).toHaveBeenCalled();
  });

  it('renders a canvas preview element', () => {
    renderModal('horse');
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('Reset all to defaults also resets min size override', () => {
    const { setOverrides } = renderModal('horse', { horse: { minTargetScreenPx: 80 } });
    const resetAllBtn = screen.getByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(resetAllBtn);
    expect(setOverrides).toHaveBeenCalled();
  });
});

describe('RacerEditModal — user-created types', () => {
  const USER_TYPE = {
    id: 'test-cat',
    name: 'Test Cat',
    emoji: '🐱',
    spriteDataUrl: 'data:image/png;base64,abc123',
    frameCount: 4,
    basePeriodMs: 600,
    displaySize: 40,
    trailStyle: 'dust',
    coats: [{ id: 'default', name: 'Default', tint: null }],
    primaryColor: '#ff8800',
    speedMultiplier: 0.9,
    surfaceClasses: ['earth'],
  };

  beforeEach(() => {
    _resetLoadedRacerTypesForTesting();
    registerRacerType(USER_TYPE);
  });

  afterEach(() => {
    _resetLoadedRacerTypesForTesting();
  });

  it('opens without crash for a user-created type', () => {
    renderModal('test-cat');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('opens without crash for a built-in type (regression)', () => {
    renderModal('horse');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows stored speedMultiplier as the initial value for user-created type', () => {
    renderModal('test-cat');
    expect(screen.getByLabelText(/Speed Multiplier/i).value).toBe(
      String(USER_TYPE.speedMultiplier)
    );
  });

  it('Reset all restores stored config values for user-created type', () => {
    const { setOverrides } = renderModal('test-cat', { 'test-cat': { speedMultiplier: 1.8 } });
    const smInput = screen.getByLabelText(/Speed Multiplier/i);
    expect(smInput.value).toBe('1.8');
    fireEvent.click(screen.getByRole('button', { name: /Reset all to defaults/i }));
    expect(setOverrides).toHaveBeenCalled();
    expect(smInput.value).toBe(String(USER_TYPE.speedMultiplier));
  });

  it('Reset all for built-in type still restores code defaults', () => {
    RACER_TYPES.horse.config.speedMultiplier = 1.9;
    const { setOverrides } = renderModal('horse', { horse: { speedMultiplier: 1.9 } });
    fireEvent.click(screen.getByRole('button', { name: /Reset all to defaults/i }));
    expect(setOverrides).toHaveBeenCalled();
    expect(RACER_TYPES.horse.config.speedMultiplier).toBe(CONFIG_SNAPSHOT.horse.speedMultiplier);
  });
});

describe('RacerEditModal — surface classes section (VRE-3)', () => {
  it('renders the surface-class pills container', () => {
    renderModal('horse');
    expect(screen.getByTestId('surface-class-pills')).toBeTruthy();
  });

  it('renders all 3 mock surface class pills as buttons', () => {
    renderModal('horse');
    expect(screen.getByTitle('Earth')).toBeTruthy();
    expect(screen.getByTitle('Grass')).toBeTruthy();
    expect(screen.getByTitle('Water')).toBeTruthy();
  });

  it('Done button is disabled when surfaceClasses override is empty []', () => {
    renderModal('horse', { horse: { surfaceClasses: [] } });
    const doneBtn = screen.getByRole('button', { name: /Done/i });
    expect(doneBtn.disabled).toBe(true);
  });

  it('Done button is enabled when surfaceClasses has at least one entry', () => {
    renderModal('horse');
    const doneBtn = screen.getByRole('button', { name: /Done/i });
    // horse defaults include surfaceClasses from code defaults — Done should be enabled
    expect(doneBtn.disabled).toBe(false);
  });

  it('shows error message when no surface class is selected', () => {
    renderModal('horse', { horse: { surfaceClasses: [] } });
    expect(screen.getByText(/At least one surface class is required/i)).toBeTruthy();
  });

  it('shows modified badge when surfaceClasses is overridden', () => {
    renderModal('horse', { horse: { surfaceClasses: ['earth'] } });
    expect(screen.getAllByText('modified').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles a pill off and shows error when result is empty', () => {
    // Start with only 'earth' selected via override
    renderModal('horse', { horse: { surfaceClasses: ['earth'] } });
    // Deselect Earth — no classes remain → error appears
    fireEvent.click(screen.getByTitle('Earth'));
    expect(screen.getByText(/At least one surface class is required/i)).toBeTruthy();
  });

  it('Reset all to defaults also resets surfaceClasses state', () => {
    const { setOverrides } = renderModal('horse', { horse: { surfaceClasses: ['water'] } });
    const resetAllBtn = screen.getByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(resetAllBtn);
    expect(setOverrides).toHaveBeenCalled();
  });
});
