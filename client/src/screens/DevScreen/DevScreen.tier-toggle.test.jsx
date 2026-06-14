// ============================================================
// File:        DevScreen.tier-toggle.test.jsx
// Path:        client/src/screens/DevScreen/DevScreen.tier-toggle.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Tier Toggle ("All | Operator") behavior and Phase-C1 role gating:
//              admin sees full toggle + advanced sections; operator is locked to
//              operator-tier sections regardless of persisted view; null user is
//              treated as non-admin (fail-closed).
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

import { useAuth } from '../../contexts/AuthContext.jsx';
import DevScreen, { isOperatorTier } from './DevScreen.jsx';

function renderDevScreen() {
  return render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  // Default to admin so all existing toggle tests continue to pass unchanged.
  useAuth.mockReturnValue({ user: { username: 'admin', role: 'admin' } });
});

describe('DevScreen tier toggle — UI rendering', () => {
  it('renders the View toggle with All and Operator buttons', () => {
    renderDevScreen();
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Operator')).toBeTruthy();
  });

  it('defaults to All view on first load', () => {
    renderDevScreen();
    // In All mode, the tier divider label "Advanced" should appear
    expect(screen.getByText('Advanced')).toBeTruthy();
  });
});

describe('DevScreen tier toggle — section visibility', () => {
  it('All view shows both Operator and Advanced sections in sidebar', () => {
    renderDevScreen();
    // All tier-1 sections should be in the nav
    expect(screen.getByText('Race Defaults')).toBeTruthy();
    expect(screen.getByText('Player Groups')).toBeTruthy();
    expect(screen.getByText('Race Tuning')).toBeTruthy();
    expect(screen.getByText('Auto-Scale')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
  });

  it('Operator view hides advanced sections from sidebar', () => {
    renderDevScreen();
    fireEvent.click(screen.getByText('Operator'));
    // Advanced sections should no longer appear in sidebar
    expect(screen.queryByText('Race Tuning')).toBeNull();
    expect(screen.queryByText('Auto-Scale')).toBeNull();
    expect(screen.queryByText('Surface Classes')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
  });

  it('Operator view still shows all Tier-1 sections', () => {
    renderDevScreen();
    fireEvent.click(screen.getByText('Operator'));
    expect(screen.getByText('Race Defaults')).toBeTruthy();
    expect(screen.getByText('Player Groups')).toBeTruthy();
    expect(screen.getByText('Racer Types')).toBeTruthy();
    expect(screen.getByText('Tracks')).toBeTruthy();
    expect(screen.getByText('Branding')).toBeTruthy();
    expect(screen.getByText('Race History')).toBeTruthy();
  });

  it('All view shows tier divider, Operator view does not', () => {
    renderDevScreen();
    // All view: divider present
    expect(screen.getByText('Advanced')).toBeTruthy();
    // Switch to Operator
    fireEvent.click(screen.getByText('Operator'));
    expect(screen.queryByText('Advanced')).toBeNull();
  });
});

describe('DevScreen tier toggle — persistence', () => {
  it('persists view choice to localStorage', () => {
    renderDevScreen();
    fireEvent.click(screen.getByText('Operator'));
    expect(localStorage.getItem('racearena:devPanelView')).toBe('"operator"');
  });

  it('restores persisted view on re-render', () => {
    localStorage.setItem('racearena:devPanelView', JSON.stringify('operator'));
    renderDevScreen();
    // Should start in operator mode — no advanced sections in sidebar
    expect(screen.queryByText('Race Tuning')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
  });
});

describe('DevScreen tier toggle — active section fallback', () => {
  it('switches active section to first operator section when switching to Operator while on advanced section', () => {
    renderDevScreen();
    // Navigate to Race Tuning (advanced)
    fireEvent.click(screen.getByText('Race Tuning'));
    // Switch to Operator view
    fireEvent.click(screen.getByText('Operator'));
    // The active section content should now be Race Defaults (first operator section)
    expect(screen.getByTestId('section-racedefaults')).toBeTruthy();
  });
});

describe('DevScreen — new Tier-2 camera sections visibility', () => {
  it('All view shows Sprite Size Range, Camera Advanced, Name Tag Visibility', () => {
    renderDevScreen();
    expect(screen.getByText('Sprite Size Range')).toBeTruthy();
    expect(screen.getByText('Camera Advanced')).toBeTruthy();
    expect(screen.getByText('Name Tag Visibility')).toBeTruthy();
  });

  it('Operator view hides all three new camera sections', () => {
    renderDevScreen();
    fireEvent.click(screen.getByText('Operator'));
    expect(screen.queryByText('Sprite Size Range')).toBeNull();
    expect(screen.queryByText('Camera Advanced')).toBeNull();
    expect(screen.queryByText('Name Tag Visibility')).toBeNull();
  });

  it('new camera sections appear after Race Tuning in sidebar', () => {
    renderDevScreen();
    const text = document.body.textContent;
    const raceTuningIdx = text.indexOf('Race Tuning');
    const spriteSizeIdx = text.indexOf('Sprite Size Range');
    const cameraAdvancedIdx = text.indexOf('Camera Advanced');
    expect(spriteSizeIdx).toBeGreaterThan(raceTuningIdx);
    expect(cameraAdvancedIdx).toBeGreaterThan(spriteSizeIdx);
  });
});

describe('DevScreen — section order (Race Defaults first)', () => {
  it('Race Defaults appears before Player Groups in the nav', () => {
    renderDevScreen();
    const allText = document.body.textContent;
    // Race Defaults should appear before Player Groups in the DOM
    const raceDefaultsIdx = allText.indexOf('Race Defaults');
    const playerGroupsIdx = allText.indexOf('Player Groups');
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
    expect(screen.getByText('Race Defaults')).toBeTruthy();
    expect(screen.getByText('Player Groups')).toBeTruthy();
    expect(screen.getByText('Race History')).toBeTruthy();
    // Advanced sections absent
    expect(screen.queryByText('Race Tuning')).toBeNull();
    expect(screen.queryByText('Surface Classes')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
    // No "Advanced" divider
    expect(screen.queryByText('Advanced')).toBeNull();
  });
});

describe('DevScreen role gating — operator with stale localStorage (C1-D)', () => {
  it('D: operator with devPanelView="all" in localStorage still cannot see ADVANCED sections', () => {
    localStorage.setItem('racearena:devPanelView', JSON.stringify('all'));
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    expect(screen.queryByText('Race Tuning')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
    expect(screen.queryByText('Advanced')).toBeNull();
    // Operator sections still visible
    expect(screen.getByText('Race Defaults')).toBeTruthy();
  });
});

describe('DevScreen role gating — null user (C1-E)', () => {
  it('E: null user is treated as non-admin — no ADVANCED sections, no view toggle', () => {
    useAuth.mockReturnValue({ user: null });
    renderDevScreen();
    expect(screen.queryByText('All')).toBeNull();
    expect(screen.queryByText('Race Tuning')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
    expect(screen.queryByText('Advanced')).toBeNull();
    // Operator sections still accessible (fail-closed, not fail-silent)
    expect(screen.getByText('Race Defaults')).toBeTruthy();
  });
});

describe('DevScreen role gating — User Management section (C4)', () => {
  it('admin (All view) sees "User Management" in sidebar', () => {
    useAuth.mockReturnValue({ user: { username: 'admin', role: 'admin' } });
    renderDevScreen();
    expect(screen.getByText('User Management')).toBeTruthy();
  });

  it('operator does not see "User Management" in sidebar', () => {
    useAuth.mockReturnValue({ user: { username: 'op', role: 'operator' } });
    renderDevScreen();
    expect(screen.queryByText('User Management')).toBeNull();
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
