// ============================================================
// File:        DevScreen.raceAction.test.jsx
// Path:        client/src/screens/DevScreen/DevScreen.raceAction.test.jsx
// Project:     RaceArena — RACE-ACTION-CONTROL-1
//
// WHAT THIS IS FOR: the Race Action control is for the HOST who presents a race, and a host is not
// necessarily an admin. RaceArena has exactly two roles (docs/AUTH.md §3) and the Dev Screen gates
// its sections by `tier` with the default DENY — so a control placed in the wrong section is
// invisible to the very account it was built for, and nothing else in the tree would notice.
//
// These tests render the REAL RaceDefaults section (it is deliberately NOT mocked here, unlike in
// DevScreen.tier-toggle.test.jsx) inside the REAL DevScreen as an OPERATOR, which is the only way to
// establish reachability rather than assume it. Sabotages recorded in
// reports/evolution/RACE-ACTION-CONTROL-1.md:
//
//   1. reachable for a restricted account — sabotage: move the section's tier to 'advanced'
//   2. all three stages are offered       — sabotage: drop 'wild' from the id list
//   3. picking a stage stores it          — sabotage: make the pill a no-op
// ============================================================

import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KEYS, storageGet } from '../../modules/storage/storage.js';
import { RACE_ACTION_STAGE_IDS } from '../../modules/storage/defaults.js';

vi.mock('../../contexts/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

// Every section EXCEPT RaceDefaults is stubbed: this file is about whether the real control is
// reachable, and the rest of the panel only has to exist for the sidebar to render.
vi.mock('./sections/PlayerGroupsManager.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/ChangePasswordSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/RacerManager.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/TrackManager.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/BrandingProfiles.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/RaceHistory.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/RaceTuningSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/SpriteSizeRangeSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/NameTagVisibilitySection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/CameraAdvancedSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/AutoScaleSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/SurfaceClassManager.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/ConfigExportSection.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/SystemSettings.jsx', () => ({ default: () => <div /> }));
vi.mock('./sections/UserManagementSection.jsx', () => ({ default: () => <div /> }));

import { useAuth } from '../../contexts/AuthContext.jsx';
import DevScreen from './DevScreen.jsx';

function renderAs(role) {
  useAuth.mockReturnValue({ user: role ? { username: 'u', role } : null, logout: vi.fn() });
  return render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('RACE-ACTION-CONTROL-1 — reachable for a RESTRICTED account', () => {
  // PROPERTY 1 — the placement property, and the reason this file exists.
  it('an operator lands on the section holding Race Action and can see the control', () => {
    renderAs('operator');
    // Race Defaults is the first operator-tier section, so it is the landing section — the operator
    // reaches the control without navigating anywhere.
    expect(screen.getByTestId('race-action-control')).toBeTruthy();
    expect(screen.getByText('Race Action')).toBeTruthy();
  });

  it('an operator sees all three stages', () => {
    renderAs('operator');
    const control = screen.getByTestId('race-action-control');
    for (const id of RACE_ACTION_STAGE_IDS) {
      expect(within(control).getByTestId(`race-action-${id}`)).toBeTruthy();
    }
    expect(within(control).getAllByRole('button')).toHaveLength(3);
  });

  it('a null user (fail-closed, not fail-silent) still reaches the control', () => {
    renderAs(null);
    expect(screen.getByTestId('race-action-control')).toBeTruthy();
  });

  it('an admin sees the very same control — it is not admin-only either', () => {
    renderAs('admin');
    expect(screen.getByTestId('race-action-control')).toBeTruthy();
  });

  // The negative half of the placement claim: the section that holds the two SLIDERS is the one an
  // operator must NOT see. If this ever passes for an operator the tiering has changed underneath
  // the control and the placement finding in the report is stale.
  it('the admin-only Race Tuning section stays out of an operator\u2019s reach', () => {
    renderAs('operator');
    expect(screen.queryByText('Race Tuning')).toBeNull();
    renderAs('admin');
    expect(screen.getAllByText('Race Tuning').length).toBeGreaterThan(0);
  });
});

describe('RACE-ACTION-CONTROL-1 — the control operates', () => {
  it('starts on quiet with nothing stored', () => {
    renderAs('operator');
    const control = screen.getByTestId('race-action-control');
    expect(within(control).getByTestId('race-action-quiet').getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(within(control).getByTestId('race-action-wild').getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  // PROPERTY 3 — an operator can switch stages WITHOUT touching a slider, which is what the owner
  // said he would look at.
  it.each(RACE_ACTION_STAGE_IDS)('an operator can select %s, and it is stored', (id) => {
    renderAs('operator');
    fireEvent.click(
      within(screen.getByTestId('race-action-control')).getByTestId(`race-action-${id}`)
    );
    expect(storageGet(KEYS.RACE_DEFAULTS)?.raceActionStage).toBe(id);
    expect(
      within(screen.getByTestId('race-action-control'))
        .getByTestId(`race-action-${id}`)
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('a raceDefaults blob stored before this key existed shows quiet', () => {
    localStorage.setItem(
      KEYS.RACE_DEFAULTS,
      JSON.stringify({ duration: 60, winners: 3, soundEffects: true })
    );
    renderAs('operator');
    expect(
      within(screen.getByTestId('race-action-control'))
        .getByTestId('race-action-quiet')
        .getAttribute('aria-pressed')
    ).toBe('true');
  });
});
