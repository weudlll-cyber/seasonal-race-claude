// ============================================================
// File:        DevScreen.tier-toggle.test.jsx
// Path:        client/src/screens/DevScreen/DevScreen.tier-toggle.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Tier Toggle ("All | Operator") behavior and Phase-C1 role gating:
//              admin sees full toggle + advanced sections; operator is locked to
//              operator-tier sections regardless of persisted view; null user is
//              treated as non-admin (fail-closed).
//
//              DEVSCREEN-CHAPTERS-1 (2026-10-05): the sidebar lists CHAPTERS now, and a section
//              is found in the content of the chapter it is placed in — so the LOCATORS below
//              open a chapter and look for the section's stub, where they used to read a sidebar
//              label. What each test asserts is unchanged, except the two order tests, which now
//              read the chapter order the design sets (race, camera, look, the things a race is
//              made of). The view switch is in the sidebar, under its header, in every chapter (the
//              owner's decision of 2026-10-05).
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock AuthContext so DevScreen can be rendered without a real AuthProvider ─

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

// ── Mock all section components to avoid deep render trees ───────────────────

vi.mock('./sections/RaceDefaults.jsx', () => ({
  default: () => <div data-testid="section-racedefaults" />,
}));
vi.mock('./sections/PlayerGroupsManager.jsx', () => ({
  default: () => <div data-testid="section-playergroups" />,
}));
vi.mock('./sections/RacerManager.jsx', () => ({
  default: () => <div data-testid="section-racertypes" />,
}));
vi.mock('./sections/TrackManager.jsx', () => ({
  default: () => <div data-testid="section-tracks" />,
}));
vi.mock('./sections/BrandingProfiles.jsx', () => ({
  default: () => <div data-testid="section-branding" />,
}));
vi.mock('./sections/RaceHistory.jsx', () => ({
  default: () => <div data-testid="section-racehistory" />,
}));
vi.mock('./sections/RaceTuningSection.jsx', () => ({
  default: () => <div data-testid="section-racetuning" />,
}));
vi.mock('./sections/SpriteSizeRangeSection.jsx', () => ({
  default: () => <div data-testid="section-sprite-size-range" />,
}));
vi.mock('./sections/NameTagVisibilitySection.jsx', () => ({
  default: () => <div data-testid="section-nametag-visibility" />,
}));
vi.mock('./sections/AutoScaleSection.jsx', () => ({
  default: () => <div data-testid="section-autoscale" />,
}));
vi.mock('./sections/SurfaceClassManager.jsx', () => ({
  default: () => <div data-testid="section-surfaceclasses" />,
}));
vi.mock('./sections/SystemSettings.jsx', () => ({
  default: () => <div data-testid="section-system" />,
}));
vi.mock('./sections/UserManagementSection.jsx', () => ({
  default: () => <div data-testid="section-usermanagement" />,
}));
vi.mock('./sections/CameraAdvancedSection.jsx', () => ({
  default: () => <div data-testid="section-camera-advanced" />,
}));

import { useAuth } from '../../contexts/AuthContext.jsx';
import DevScreen, { isOperatorTier } from './DevScreen.jsx';

function renderDevScreen() {
  return render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
}

const RACE = 'The race';
const CAMERA = 'Camera — start to ending';
const LOOK = 'Look, labels and effects';
const RECORDS = 'Tracks, racers, brands and groups';
const HISTORY = 'History and evaluation';
const DIAGNOSTICS = 'Diagnostics and verification';
const ACCOUNTS = 'Accounts and system';

/** Opens a chapter from the sidebar when the current view lists it. */
function openChapter(title) {
  const button = screen.queryByRole('button', { name: (name) => name.includes(title) });
  if (button) fireEvent.click(button);
}

/** The view switch, in the sidebar — reachable from every chapter. */
function switchView(label) {
  fireEvent.click(screen.getByText(label));
}

beforeEach(() => {
  localStorage.clear();
  // Default to admin so all existing toggle tests continue to pass unchanged.
  useAuth.mockReturnValue({ user: { username: 'admin', role: 'admin' }, logout: vi.fn() });
});

describe('DevScreen tier toggle — UI rendering', () => {
  it('renders the View toggle with All and Operator buttons', () => {
    renderDevScreen();
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Operator')).toBeTruthy();
  });

  it('defaults to All view on first load', () => {
    renderDevScreen();
    // In All mode, the tier label "Advanced" should appear
    expect(screen.getAllByText('Advanced').length).toBeGreaterThan(0);
  });
});

describe('DevScreen tier toggle — section visibility', () => {
  it('All view shows both Operator and Advanced sections in sidebar', () => {
    renderDevScreen();
    // All tier-1 sections should be in the nav
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
    expect(screen.getByTestId('section-racetuning')).toBeTruthy();
    expect(screen.getByTestId('section-autoscale')).toBeTruthy();
    openChapter(RECORDS);
    expect(screen.getByTestId('section-playergroups')).toBeTruthy();
    openChapter(ACCOUNTS);
    expect(screen.getByTestId('section-system')).toBeTruthy();
  });

  it('Operator view hides advanced sections from sidebar', () => {
    renderDevScreen();
    switchView('Operator');
    // Advanced sections should no longer appear in sidebar
    expect(screen.queryByTestId('section-system')).toBeNull();
    openChapter(RACE);
    expect(screen.queryByTestId('section-racetuning')).toBeNull();
    expect(screen.queryByTestId('section-autoscale')).toBeNull();
    openChapter(LOOK);
    expect(screen.queryByTestId('section-surfaceclasses')).toBeNull();
  });

  it('Operator view still shows all Tier-1 sections', () => {
    renderDevScreen();
    switchView('Operator');
    openChapter(RACE);
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
    openChapter(RECORDS);
    expect(screen.getByTestId('section-playergroups')).toBeTruthy();
    expect(screen.getByTestId('section-racertypes')).toBeTruthy();
    expect(screen.getByTestId('section-tracks')).toBeTruthy();
    expect(screen.getByTestId('section-branding')).toBeTruthy();
    openChapter(HISTORY);
    expect(screen.getByTestId('section-racehistory')).toBeTruthy();
  });

  it('All view shows tier divider, Operator view does not', () => {
    renderDevScreen();
    // All view: divider present
    expect(screen.getAllByText('Advanced').length).toBeGreaterThan(0);
    // Switch to Operator
    switchView('Operator');
    expect(screen.queryByText('Advanced')).toBeNull();
    openChapter(RACE);
    expect(screen.queryByText('Advanced')).toBeNull();
  });
});

describe('DevScreen tier toggle — persistence', () => {
  // admin: checks that the view-toggle selection is written to localStorage.
  // This is NOT role-gating (C1); it tests the UI toggle persistence only.
  it('admin: persists view toggle choice to localStorage', () => {
    renderDevScreen();
    switchView('Operator');
    expect(localStorage.getItem('racearena:devPanelView')).toBe('"operator"');
  });

  it('restores persisted view on re-render', () => {
    localStorage.setItem('racearena:devPanelView', JSON.stringify('operator'));
    renderDevScreen();
    // Should start in operator mode — no advanced sections in sidebar
    expect(screen.queryByTestId('section-racetuning')).toBeNull();
    openChapter(ACCOUNTS);
    expect(screen.queryByTestId('section-system')).toBeNull();
  });
});

describe('DevScreen tier toggle — active section fallback', () => {
  it('switches active section to first operator section when switching to Operator while on advanced section', () => {
    renderDevScreen();
    // Navigate to the advanced-only chapter, then switch to Operator view from the sidebar
    openChapter(DIAGNOSTICS);
    switchView('Operator');
    // The active section content should now be Race Defaults (first operator section)
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
  });
});

describe('DevScreen — new Tier-2 camera sections visibility', () => {
  it('All view shows Sprite Size Range, Camera Advanced, Name Tag Visibility', () => {
    renderDevScreen();
    openChapter(LOOK);
    expect(screen.getByTestId('section-sprite-size-range')).toBeTruthy();
    expect(screen.getByTestId('section-nametag-visibility')).toBeTruthy();
    openChapter(CAMERA);
    expect(screen.getAllByTestId('section-camera-advanced').length).toBeGreaterThan(0);
  });

  it('Operator view hides all three new camera sections', () => {
    renderDevScreen();
    switchView('Operator');
    openChapter(LOOK);
    expect(screen.queryByTestId('section-sprite-size-range')).toBeNull();
    expect(screen.queryByTestId('section-nametag-visibility')).toBeNull();
    openChapter(CAMERA);
    expect(screen.queryByTestId('section-camera-advanced')).toBeNull();
  });

  it('new camera sections appear after Race Tuning in sidebar', () => {
    renderDevScreen();
    const text = document.querySelector('nav').textContent;
    const raceTuningIdx = text.indexOf(RACE);
    const spriteSizeIdx = text.indexOf(LOOK);
    const cameraAdvancedIdx = text.indexOf(CAMERA);
    // The design's chapter order: the race, then the camera, then the look.
    expect(cameraAdvancedIdx).toBeGreaterThan(raceTuningIdx);
    expect(spriteSizeIdx).toBeGreaterThan(cameraAdvancedIdx);
  });
});

describe('DevScreen — section order (Race Defaults first)', () => {
  it('Race Defaults appears before Player Groups in the nav', () => {
    renderDevScreen();
    const allText = document.querySelector('nav').textContent;
    // Race Defaults should appear before Player Groups in the DOM
    const raceDefaultsIdx = allText.indexOf(RACE);
    const playerGroupsIdx = allText.indexOf(RECORDS);
    expect(raceDefaultsIdx).toBeGreaterThan(-1);
    expect(raceDefaultsIdx).toBeLessThan(playerGroupsIdx);
  });

  it('Race Defaults section content is shown by default', () => {
    renderDevScreen();
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
  });
});

// ── Phase C1 — Role-based access control ─────────────────────────────────────

describe('DevScreen role gating — operator (C1-B/C)', () => {
  it('B: operator has no view toggle in the DOM', () => {
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    expect(screen.queryByText('All')).toBeNull();
    // "Operator" button absent (only toggle uses that label; sidebar labels differ)
    expect(screen.queryByRole('button', { name: 'Operator' })).toBeNull();
  });

  it('C: operator sees operator sections and no ADVANCED sections', () => {
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    // Operator-tier sections present
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
    // Advanced sections absent
    expect(screen.queryByTestId('section-racetuning')).toBeNull();
    // No "Advanced" divider
    expect(screen.queryByText('Advanced')).toBeNull();
    openChapter(RECORDS);
    expect(screen.getByTestId('section-playergroups')).toBeTruthy();
    openChapter(HISTORY);
    expect(screen.getByTestId('section-racehistory')).toBeTruthy();
    openChapter(LOOK);
    expect(screen.queryByTestId('section-surfaceclasses')).toBeNull();
    openChapter(ACCOUNTS);
    expect(screen.queryByTestId('section-system')).toBeNull();
  });
});

describe('DevScreen role gating — operator with stale localStorage (C1-D)', () => {
  it('D: operator with devPanelView="all" in localStorage still cannot see ADVANCED sections', () => {
    localStorage.setItem('racearena:devPanelView', JSON.stringify('all'));
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    expect(screen.queryByTestId('section-racetuning')).toBeNull();
    expect(screen.queryByText('Advanced')).toBeNull();
    // Operator sections still visible
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
    openChapter(ACCOUNTS);
    expect(screen.queryByTestId('section-system')).toBeNull();
  });
});

describe('DevScreen role gating — null user (C1-E)', () => {
  it('E: null user is treated as non-admin — no ADVANCED sections, no view toggle', () => {
    useAuth.mockReturnValue({ user: null });
    renderDevScreen();
    expect(screen.queryByTestId('section-racetuning')).toBeNull();
    expect(screen.queryByText('Advanced')).toBeNull();
    // Operator sections still accessible (fail-closed, not fail-silent)
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
    openChapter(ACCOUNTS);
    expect(screen.queryByText('All')).toBeNull();
    expect(screen.queryByTestId('section-system')).toBeNull();
  });
});

describe('DevScreen role gating — User Management section (C4)', () => {
  it('admin (All view) sees "User Management" in sidebar', () => {
    useAuth.mockReturnValue({ user: { username: 'admin', role: 'admin' } });
    renderDevScreen();
    openChapter(ACCOUNTS);
    expect(screen.getByTestId('section-usermanagement')).toBeTruthy();
  });

  it('operator does not see "User Management" in sidebar', () => {
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    openChapter(ACCOUNTS);
    expect(screen.queryByTestId('section-usermanagement')).toBeNull();
  });
});

describe('DevScreen role gating — default-deny predicate (C1-F)', () => {
  it('F: isOperatorTier is true only for explicit "operator", false for everything else', () => {
    expect(isOperatorTier('operator')).toBe(true);

    // All of these must return false (default-deny):
    expect(isOperatorTier('advanced')).toBe(false);
    expect(isOperatorTier(undefined)).toBe(false);
    expect(isOperatorTier(null)).toBe(false);
    expect(isOperatorTier('')).toBe(false);
    expect(isOperatorTier('unknown')).toBe(false);
    expect(isOperatorTier('OPERATOR')).toBe(false); // case-sensitive
  });
});

// ── Logout button ─────────────────────────────────────────────────────────────

describe('DevScreen — logout button', () => {
  it('renders a Log out button visible to admin', () => {
    renderDevScreen();
    openChapter(ACCOUNTS);
    expect(screen.getByRole('button', { name: /log out/i })).toBeTruthy();
  });

  it('renders a Log out button visible to operator', () => {
    const mockLogout = vi.fn();
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' }, logout: mockLogout });
    renderDevScreen();
    openChapter(ACCOUNTS);
    expect(screen.getByRole('button', { name: /log out/i })).toBeTruthy();
  });

  it('clicking Log out calls logout() from AuthContext', () => {
    const mockLogout = vi.fn();
    useAuth.mockReturnValue({ user: { username: 'admin', role: 'admin' }, logout: mockLogout });
    renderDevScreen();
    openChapter(ACCOUNTS);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
