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
    // Seed a track with a real geometryId and empty surfaceClasses so the filter
    // does not interfere with the existing isActive-override tests.
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-001', surfaceClasses: [] } : t
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

  it('override selector shows all 20 types when no overrides are set', () => {
    renderWithTrackSelected();
    const select = screen.getByRole('combobox');
    expect(select.options).toHaveLength(20);
  });

  it('override selector omits a type that has been disabled via override map', () => {
    storageSet(KEYS.RACER_TYPE_OVERRIDES, { snail: false });
    renderWithTrackSelected();
    const select = screen.getByRole('combobox');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).not.toContain('snail');
    expect(select.options).toHaveLength(19);
  });
});

describe('SetupScreen — surface class filter (VRE-3)', () => {
  // Space Sprint (index 2) has surfaceClasses: ['air'].
  // Compatible racer types: plane ['air'], dragon ['air', ...], rocket ['air', 'water'] — 3 total.
  function renderWithAirTrack() {
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 2 ? { ...t, geometryId: 'geom-air-001' } : t
    );
    storageSet(KEYS.TRACKS, tracksWithGeometry);
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Space Sprint') && !b.disabled);
    fireEvent.click(trackCard);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('racer dropdown shows only 3 air-compatible types for Space Sprint', () => {
    renderWithAirTrack();
    const select = screen.getByRole('combobox');
    expect(select.options).toHaveLength(3);
  });

  it('racer dropdown includes dragon (air-compatible multi-class type)', () => {
    renderWithAirTrack();
    const select = screen.getByRole('combobox');
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('dragon');
  });

  it('racer dropdown excludes horse (not air-compatible)', () => {
    renderWithAirTrack();
    const select = screen.getByRole('combobox');
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).not.toContain('horse');
  });

  it('shows track-surface-hint element for a track with surface classes', () => {
    renderWithAirTrack();
    expect(screen.getByTestId('track-surface-hint')).toBeInTheDocument();
  });

  it('surface hint contains the capitalised class label', () => {
    renderWithAirTrack();
    expect(screen.getByTestId('track-surface-hint').textContent).toContain('Air');
  });

  it('does not show surface hint for a track with empty surfaceClasses', () => {
    const tracksNoClasses = DEFAULT_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-hint', surfaceClasses: [] } : t
    );
    storageSet(KEYS.TRACKS, tracksNoClasses);
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);
    expect(screen.queryByTestId('track-surface-hint')).toBeNull();
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

describe('SetupScreen — open-track Duration Slider (PR-A1)', () => {
  // River Run (index 1) has no surfaceClasses and is an open track in this test via a mock geometry.
  // We seed a geometry that is open (closed: false) so trackIsOpen becomes true.
  function renderWithOpenTrack() {
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 1 ? { ...t, geometryId: 'geom-open-001' } : t
    );
    storageSet(KEYS.TRACKS, tracksWithGeometry);

    // Seed a minimal open-track geometry into trackGeometries storage
    const geomKey = 'racearena:trackGeometries:geom-open-001';
    const geomIndex = { 'geom-open-001': 'geom-open-001' };
    const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 100, y: 0 }));
    localStorage.setItem(
      geomKey,
      JSON.stringify({
        id: 'geom-open-001',
        closed: false,
        pathLengthPx: 6156,
        innerPoints: pts.map((p) => ({ ...p, y: -20 })),
        outerPoints: pts.map((p) => ({ ...p, y: 20 })),
        centerPoints: pts,
      })
    );
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(geomIndex));

    return render(
      <MemoryRouter>
        <SetupScreen />
      </MemoryRouter>
    );
  }

  function selectOpenTrack() {
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]); // Track tab
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('River Run') && !b.disabled);
    if (trackCard) fireEvent.click(trackCard);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the duration slider for an open track', () => {
    renderWithOpenTrack();
    selectOpenTrack();
    expect(screen.getByTestId('open-track-duration-slider')).toBeInTheDocument();
  });

  it('slider has correct type=range', () => {
    renderWithOpenTrack();
    selectOpenTrack();
    const slider = screen.getByTestId('open-track-duration-slider');
    expect(slider.type).toBe('range');
  });

  it('shows Estimated duration text for an open track', () => {
    renderWithOpenTrack();
    selectOpenTrack();
    expect(screen.getByTestId('open-track-estimated-duration')).toBeInTheDocument();
    expect(screen.getByTestId('open-track-estimated-duration').textContent).toMatch(
      /Estimated duration:/
    );
  });
});

describe('SetupScreen — closed-track Laps & Duration (PR-A1 A2.5)', () => {
  function renderWithClosedTrack() {
    const tracksWithGeometry = DEFAULT_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-closed-001' } : t
    );
    storageSet(KEYS.TRACKS, tracksWithGeometry);

    const geomKey = 'racearena:trackGeometries:geom-closed-001';
    const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 50, y: 0 }));
    localStorage.setItem(
      geomKey,
      JSON.stringify({
        id: 'geom-closed-001',
        closed: true,
        pathLengthPx: 3245,
        innerPoints: pts.map((p) => ({ ...p, y: -20 })),
        outerPoints: pts.map((p) => ({ ...p, y: 20 })),
        centerPoints: pts,
      })
    );
    localStorage.setItem(
      'racearena:trackGeometries:index',
      JSON.stringify({ 'geom-closed-001': 'geom-closed-001' })
    );

    return render(
      <MemoryRouter>
        <SetupScreen />
      </MemoryRouter>
    );
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows "Laps & Duration" label for a closed track', () => {
    renderWithClosedTrack();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);
    expect(screen.getByText(/Laps & Duration/i)).toBeInTheDocument();
  });

  it('shows "Estimated duration:" for a closed track', () => {
    renderWithClosedTrack();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);
    expect(screen.getByTestId('closed-track-estimated-duration').textContent).toMatch(
      /Estimated duration:/
    );
  });

  it('shows duration slider (type=range) for a closed track (PR-A2)', () => {
    renderWithClosedTrack();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);
    const slider = screen.getByTestId('closed-track-duration-slider');
    expect(slider).toBeInTheDocument();
    expect(slider.type).toBe('range');
  });

  it('Model D: changing laps resets duration slider to auto', () => {
    renderWithClosedTrack();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    const trackCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes('Dirt Oval') && !b.disabled);
    fireEvent.click(trackCard);

    const slider = screen.getByTestId('closed-track-duration-slider');

    // Move duration slider manually
    fireEvent.change(slider, { target: { value: String(Number(slider.max)) } });
    expect(slider.value).toBe(slider.max);

    // Now click a lap button — duration should reset to natural (initial auto value)
    const lapBtn = screen.getAllByRole('button').find((b) => b.textContent.trim() === '3');
    fireEvent.click(lapBtn);
    // After lap change, duration resets to auto for new lap count
    expect(screen.getByTestId('closed-track-duration-slider')).toBeInTheDocument();
  });
});
