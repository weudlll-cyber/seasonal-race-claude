// ============================================================
// File:        SetupScreen.test.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Integration tests for the SetupScreen — guards on the
//              Start Race button, tab navigation, and Quick Test autofill
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
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

describe('SetupScreen — override selector filters inactive racer types', () => {
  function renderWithTrackSelected() {
    // Seed a track with a real geometryId so the card is enabled and can be selected
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-001' } : t
    );
    storageSet(KEYS.TRACKS, tracksWithGeometry);
    renderSetupScreen();
    // Navigate to Track tab and select the first track
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('override selector shows all 12 types when no overrides are set', () => {
    renderWithTrackSelected();
    const select = screen.getByRole('combobox');
    expect(select.options).toHaveLength(12);
  });

  it('override selector omits a type that has been disabled via override map', () => {
    storageSet(KEYS.RACER_TYPE_OVERRIDES, { snail: false });
    renderWithTrackSelected();
    const select = screen.getByRole('combobox');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).not.toContain('snail');
    expect(select.options).toHaveLength(11);
  });
});

describe('SetupScreen — Quick Test autofill', () => {
  function renderWithQuickTrack() {
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-quick' } : t
    );
    storageSet(KEYS.TRACKS, tracksWithGeometry);
    renderSetupScreen();
  }

  function clickQuickTest() {
    const btn = screen.getByTitle('Auto-fill to 20 test players and start race');
    fireEvent.click(btn);
  }

  function getRaceRacers() {
    const raw = sessionStorage.getItem('activeRace');
    return raw ? JSON.parse(raw).racers : null;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts with 20 racers when player list is empty', () => {
    renderWithQuickTrack();
    clickQuickTest();
    expect(getRaceRacers()).toHaveLength(20);
  });

  it('uses deterministic test names — first is Turbo, last is Nova', () => {
    renderWithQuickTrack();
    clickQuickTest();
    const names = getRaceRacers().map((r) => r.name);
    expect(names[0]).toBe('Turbo');
    expect(names[19]).toBe('Nova');
  });

  it('preserves 5 existing players and fills up to 20', () => {
    storageSet(KEYS.ACTIVE_GROUP, [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Carol' },
      { name: 'Dave' },
      { name: 'Eve' },
    ]);
    renderWithQuickTrack();
    clickQuickTest();
    const racers = getRaceRacers();
    expect(racers).toHaveLength(20);
    expect(racers[0].name).toBe('Alice');
    expect(racers[4].name).toBe('Eve');
  });

  it('does not add players when list already has 20', () => {
    const twentyPlayers = Array.from({ length: 20 }, (_, i) => ({ name: `P${i + 1}` }));
    storageSet(KEYS.ACTIVE_GROUP, twentyPlayers);
    renderWithQuickTrack();
    clickQuickTest();
    const racers = getRaceRacers();
    expect(racers).toHaveLength(20);
    expect(racers[0].name).toBe('P1');
  });

  it('skips test names that conflict with existing player names', () => {
    storageSet(KEYS.ACTIVE_GROUP, [{ name: 'Turbo' }, { name: 'Blaze' }]);
    renderWithQuickTrack();
    clickQuickTest();
    const names = getRaceRacers().map((r) => r.name);
    expect(names).toHaveLength(20);
    // Existing players at front
    expect(names[0]).toBe('Turbo');
    expect(names[1]).toBe('Blaze');
    // Fill skips 'Turbo' and 'Blaze', starts at 'Rocket'
    expect(names[2]).toBe('Rocket');
  });
});
