// ============================================================
// File:        SetupScreen.test.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Integration tests for the SetupScreen — guards on the
//              Start Race button and tab navigation
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { KEYS } from '../../modules/storage/storage.js';
import { DEFAULT_TRACKS } from '../../modules/storage/defaults.js';

// Wrap in MemoryRouter because SetupScreen uses <Link> from react-router-dom
function renderSetupScreen() {
  return render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
}

describe('SetupScreen', () => {
  beforeEach(() => {
    // Start each test with clean localStorage so storage defaults apply
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the RaceArena brand in the header', () => {
    renderSetupScreen();
    // Logo splits text across nodes ("Race" + <span>Arena</span>); check full body text
    expect(document.body).toHaveTextContent(/RaceArena/i);
  });

  it('Start Race button is disabled when no players and no track selected', () => {
    renderSetupScreen();
    expect(screen.getByText(/Start Race/i)).toBeDisabled();
  });

  it('shows the Players tab as selected by default', () => {
    renderSetupScreen();
    // The tab with aria-selected="true" should be "Players"
    const selectedTab = screen.getByRole('tab', { selected: true });
    expect(selectedTab).toHaveTextContent('Players');
  });

  it('navigates to the Track tab when clicked', () => {
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]); // "Track" is the second tab
    expect(screen.getByText('Select Track')).toBeInTheDocument();
  });

  it('navigates to the Settings tab when clicked', () => {
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[2]); // "Settings" is the third tab
    expect(screen.getByText('Race Settings')).toBeInTheDocument();
  });

  it('shows the gear icon link to /dev', () => {
    renderSetupScreen();
    const gearLink = screen.getByTitle('Open Dev Panel');
    expect(gearLink).toBeInTheDocument();
  });

  it('Quick Test button is disabled when no tracks have a drawn geometry', () => {
    renderSetupScreen();
    // Default tracks all have geometryId: null — button is disabled until a track is drawn.
    const quickTestBtn = screen.getByTitle('Draw a track in the Track Editor first');
    expect(quickTestBtn).toBeDisabled();
  });
});

// ── W1 regression — track merge order ──────────────────────────────────────
// SetupScreen merges DEFAULT_TRACKS into stored tracks to back-fill new
// fields. The merge must be {defaults, ...stored} so user edits always win.
// Previously it was reversed: {stored, racerTypeId: default}, which silently
// discarded any racerTypeId the user set in the Dev Panel.

describe('SetupScreen — W1 track merge regression', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stored racerTypeId wins over DEFAULT_TRACKS default', () => {
    // User changed dirt-oval → duck in the Dev Panel
    const stored = DEFAULT_TRACKS.map((t) =>
      t.id === 'dirt-oval' ? { ...t, racerTypeId: 'duck', geometryId: 'test-geom' } : t
    );
    localStorage.setItem(KEYS.TRACKS, JSON.stringify(stored));
    renderSetupScreen();

    // dirt-oval is tracks[0] → the default quickTrack; geometryId set → button enabled
    fireEvent.click(screen.getByTitle('Auto-fill 6 test players and start race'));

    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    expect(race.racerTypeId).toBe('duck');
  });

  it('missing racerTypeId in stored track is filled from DEFAULT_TRACKS', () => {
    // Stale stored entry for space-sprint has no racerTypeId field
    const defaultSprint = DEFAULT_TRACKS.find((t) => t.id === 'space-sprint');
    const staleSprint = { ...defaultSprint, racerTypeId: undefined, geometryId: 'test-geom' };
    const stored = DEFAULT_TRACKS.map((t) => (t.id === 'space-sprint' ? staleSprint : t));
    localStorage.setItem(KEYS.TRACKS, JSON.stringify(stored));
    renderSetupScreen();

    // Switch quickTrack to space-sprint via pill button
    fireEvent.click(screen.getByTitle('Space Sprint'));
    fireEvent.click(screen.getByTitle('Auto-fill 6 test players and start race'));

    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    // Default fills in 'rocket'; the old || 'horse' fallback would give 'horse'
    expect(race.racerTypeId).toBe('rocket');
  });

  it('custom track not in DEFAULT_TRACKS passes through the merge unchanged', () => {
    const customTrack = {
      id: 'my-custom',
      name: 'My Custom',
      icon: '⭐',
      description: 'Custom track',
      racerId: 'snail',
      racerTypeId: 'snail',
      geometryId: 'test-geom',
      color: '#ff0000',
      defaultDuration: 60,
      defaultWinners: 3,
      trackWidth: 140,
      isDefault: false,
    };
    // Custom track first → becomes tracks[0] → default quickTrack
    localStorage.setItem(KEYS.TRACKS, JSON.stringify([customTrack, ...DEFAULT_TRACKS]));
    renderSetupScreen();

    fireEvent.click(screen.getByTitle('Auto-fill 6 test players and start race'));

    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    expect(race.racerTypeId).toBe('snail');
  });
});
