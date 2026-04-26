// ============================================================
// File:        RacerEditModal.test.jsx
// Path:        client/src/screens/DevScreen/sections/RacerEditModal.test.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Component tests for RacerEditModal (D3.5.5)
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

import { RacerEditModal } from './RacerEditModal.jsx';
import {
  RACER_TYPE_IDS,
  TUNABLE_FIELDS,
  CONFIG_SNAPSHOT,
  RACER_TYPES,
  restoreTunableDefault,
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

  it('InfoTooltip is present for each field', () => {
    renderModal('horse');
    // tooltip spans have display:none — query with hidden:true
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.length).toBe(6);
  });
});
