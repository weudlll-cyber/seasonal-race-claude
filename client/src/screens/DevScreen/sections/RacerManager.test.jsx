// ============================================================
// File:        RacerManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Updated:     2026-05-27 — Phase 2: listAllRacerTypes, removeRacerType, Edit-in-editor
//              button, delete button; user-created types appear alongside built-ins.
// Description: Component tests for RacerManager — smoke tests, user-created type
//              rendering, delete flow, and Edit-in-Racer-Editor button.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must be initialized before vi.mock factories run) ──────────

const { mockNavigate, mockListAllRacerTypes, mockRemoveRacerType } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockListAllRacerTypes: vi.fn(),
  mockRemoveRacerType: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: { RACER_TYPE_OVERRIDES: 'racearena:racerTypeOverrides' },
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

vi.mock('../../../modules/racer-types/index.js', () => ({
  RACER_TYPES: { horse: {}, rocket: {} },
  listAllRacerTypes: mockListAllRacerTypes,
  removeRacerType: mockRemoveRacerType,
  getRacerTypeLabel: (id) =>
    ({ horse: 'Horse', rocket: 'Rocket', 'test-cat': 'Test Cat' })[id] ?? id,
  TUNABLE_FIELDS: ['speedMultiplier'],
  normalizeOverrideMap: vi.fn((v) => v ?? {}),
}));

vi.mock('./RacerEditModal.jsx', () => ({
  RacerEditModal: vi.fn(() => null),
}));

import RacerManager from './RacerManager.jsx';

// ── Test data ─────────────────────────────────────────────────────────────────

const BUILT_IN_TYPES = [
  { id: 'horse', speedMultiplier: 1.0 },
  { id: 'rocket', speedMultiplier: 1.5 },
];

const MIXED_TYPES = [
  { id: 'horse', speedMultiplier: 1.0 },
  { id: 'rocket', speedMultiplier: 1.5 },
  { id: 'test-cat', speedMultiplier: 0.8 },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockListAllRacerTypes.mockReturnValue(BUILT_IN_TYPES);
});

// ── Existing smoke tests (PR-A3.1) ────────────────────────────────────────────

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

// ── User-created type rendering ───────────────────────────────────────────────

describe('RacerManager — user-created types', () => {
  it('renders user-created types returned by listAllRacerTypes()', () => {
    mockListAllRacerTypes.mockReturnValue(MIXED_TYPES);
    render(<RacerManager />);
    expect(screen.getByText('Horse')).toBeTruthy();
    expect(screen.getByText('Rocket')).toBeTruthy();
    expect(screen.getByText('Test Cat')).toBeTruthy();
  });

  it('shows Delete button for user-created types', () => {
    mockListAllRacerTypes.mockReturnValue(MIXED_TYPES);
    render(<RacerManager />);
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(1);
  });

  it('does not show Delete button for built-in types', () => {
    mockListAllRacerTypes.mockReturnValue(BUILT_IN_TYPES);
    render(<RacerManager />);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('calls removeRacerType with the correct id when delete is confirmed', () => {
    mockListAllRacerTypes.mockReturnValue(MIXED_TYPES);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RacerManager />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockRemoveRacerType).toHaveBeenCalledWith('test-cat');
    vi.restoreAllMocks();
  });

  it('shows "Edit in Racer Editor" button for user-created types only', () => {
    mockListAllRacerTypes.mockReturnValue(MIXED_TYPES);
    render(<RacerManager />);
    const editLinks = screen.getAllByText('Edit in Racer Editor');
    expect(editLinks.length).toBe(1);
    expect(editLinks[0].closest('button').title).toMatch(/Test Cat/);
  });
});
