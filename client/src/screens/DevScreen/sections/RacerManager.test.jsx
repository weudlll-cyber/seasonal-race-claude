// ============================================================
// File:        RacerManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Render smoke-tests for RacerManager — verifies section subtitle
//              and property-legend tooltip texts render correctly after PR-A3.1.
// ============================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: { RACER_TYPE_OVERRIDES: 'racearena:racerTypeOverrides' },
}));

vi.mock('../../../modules/racer-types/index.js', () => ({
  RACER_TYPE_IDS: ['horse', 'rocket'],
  RACER_TYPES: {
    horse: { getSpeedMultiplier: () => 1.0 },
    rocket: { getSpeedMultiplier: () => 1.5 },
  },
  RACER_TYPE_LABELS: { horse: 'Horse', rocket: 'Rocket' },
  TUNABLE_FIELDS: ['speedMultiplier'],
  normalizeOverrideMap: vi.fn((v) => v ?? {}),
}));

vi.mock('./RacerEditModal.jsx', () => ({
  RacerEditModal: vi.fn(() => null),
}));

import RacerManager from './RacerManager.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RacerManager — tooltip render (PR-A3.1)', () => {
  it('renders without crashing', () => {
    render(<RacerManager />);
    expect(screen.getByText(/Racer Types/)).toBeTruthy();
  });

  it('renders the section subtitle', () => {
    render(<RacerManager />);
    expect(screen.getByText(/different categories of racers/)).toBeTruthy();
  });

  it('renders the property legend with tooltip texts', () => {
    render(<RacerManager />);
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    const spriteTip = tooltips.find((el) => el.textContent.includes('facing right'));
    const charTip = tooltips.find((el) => el.textContent.includes('ready-to-use options'));
    expect(spriteTip).toBeTruthy();
    expect(charTip).toBeTruthy();
  });
});
