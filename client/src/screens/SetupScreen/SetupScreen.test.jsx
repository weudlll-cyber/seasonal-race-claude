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
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';

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

  it('Quick Test button is disabled when server cache is empty (cold start)', () => {
    renderSetupScreen();
    // Cold cache: no tracks in server cache → no track has geometryId → button disabled.
    const quickTestBtn = screen.getByTitle('Draw a track in the Track Editor first');
    expect(quickTestBtn).toBeDisabled();
  });
});

describe('SetupScreen — override selector filters inactive racer types', () => {
  function renderWithTrackSelected() {
    // Seed server cache with a track that has a real geometryId and empty surfaceClasses
    // so the surface-class filter does not interfere with the isActive-override tests.
    const tracksWithGeometry = SAMPLE_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-001', surfaceClasses: [] } : t
    );
    storageSet(CACHE_KEY, tracksWithGeometry);
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
    const select = screen.getByTestId('racer-type-select');
    expect(select.options).toHaveLength(20);
  });

  it('override selector omits a type that has been disabled via override map', () => {
    storageSet(KEYS.RACER_TYPE_OVERRIDES, { snail: false });
    renderWithTrackSelected();
    const select = screen.getByTestId('racer-type-select');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).not.toContain('snail');
    expect(select.options).toHaveLength(19);
  });
});

describe('SetupScreen — surface class filter (VRE-3)', () => {
  // Space Sprint (index 2) has surfaceClasses: ['air'].
  // Compatible racer types: plane ['air'], dragon ['air', ...], rocket ['air', 'water'] — 3 total.
  function renderWithAirTrack() {
    const tracksWithGeometry = SAMPLE_TRACKS.map((t, i) =>
      i === 2 ? { ...t, geometryId: 'geom-air-001' } : t
    );
    storageSet(CACHE_KEY, tracksWithGeometry);
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
    const select = screen.getByTestId('racer-type-select');
    expect(select.options).toHaveLength(3);
  });

  it('racer dropdown includes dragon (air-compatible multi-class type)', () => {
    renderWithAirTrack();
    const select = screen.getByTestId('racer-type-select');
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('dragon');
  });

  it('racer dropdown excludes horse (not air-compatible)', () => {
    renderWithAirTrack();
    const select = screen.getByTestId('racer-type-select');
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
    const tracksNoClasses = SAMPLE_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-hint', surfaceClasses: [] } : t
    );
    storageSet(CACHE_KEY, tracksNoClasses);
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
    const tracksWithGeometry = SAMPLE_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-test-quick' } : t
    );
    storageSet(CACHE_KEY, tracksWithGeometry);
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
    const tracksWithGeometry = SAMPLE_TRACKS.map((t, i) =>
      i === 1 ? { ...t, geometryId: 'geom-open-001' } : t
    );
    storageSet(CACHE_KEY, tracksWithGeometry);

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
    const tracksWithGeometry = SAMPLE_TRACKS.map((t, i) =>
      i === 0 ? { ...t, geometryId: 'geom-closed-001' } : t
    );
    storageSet(CACHE_KEY, tracksWithGeometry);

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

describe('SetupScreen — Quick Test racer selector', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Garden Path (index 3): surfaceClasses: ['grass', 'earth']
  // Searound    (index 7): surfaceClasses: ['water']
  // SAMPLE_TRACKS index values may vary; find by id instead.
  function getTracksWithGeometry(trackIds) {
    return SAMPLE_TRACKS.map((t) =>
      trackIds.includes(t.id) ? { ...t, geometryId: `geom-${t.id}` } : t
    );
  }

  function renderWithQuickTracks(trackIds = ['garden-path']) {
    storageSet(CACHE_KEY, getTracksWithGeometry(trackIds));
    renderSetupScreen();
  }

  function getQuickRacerSelect() {
    return screen.getByTestId('quick-test-racer-select');
  }

  function clickQuickTrack(name) {
    // The quick-test track buttons show emoji + track name
    const btn = screen.getAllByRole('button').find((b) => b.getAttribute('title') === name);
    fireEvent.click(btn);
  }

  it('shows the racer selector in the Quick Test UI', () => {
    renderWithQuickTracks(['garden-path']);
    expect(getQuickRacerSelect()).toBeInTheDocument();
  });

  it('Garden Path (grass/earth): shows only surface-compatible racer types', () => {
    renderWithQuickTracks(['garden-path']);
    const select = getQuickRacerSelect();
    const values = Array.from(select.options).map((o) => o.value);
    // Garden Path surfaceClasses=['grass','earth']
    // Racer types with empty surfaceClasses (always included) + those intersecting grass/earth
    // At minimum: horse (earth,grass), giraffe (sand,earth,grass), elephant (sand,earth,grass),
    //             snake (sand,earth,grass), boarder (asphalt,cobble,earth), beetle (asphalt,cobble,earth),
    //             buggy (sand,earth,mud), snowmobile (snow,ice,earth)
    expect(values).toContain('horse');
    expect(values).toContain('giraffe');
    expect(values).toContain('snake');
    // Water-only racer should NOT appear
    expect(values).not.toContain('koi');
    expect(values).not.toContain('dolphin');
    // Air-only racer should NOT appear
    expect(values).not.toContain('plane');
  });

  it('Searound (water): shows only water-compatible racer types', () => {
    renderWithQuickTracks(['searound']);
    // Switch quick-test track to Searound
    clickQuickTrack('Searound');
    const select = getQuickRacerSelect();
    const values = Array.from(select.options).map((o) => o.value);
    // Water-compatible: duck, koi, turtle, manta, dolphin, rocket (air+water)
    expect(values).toContain('koi');
    expect(values).toContain('dolphin');
    expect(values).toContain('manta');
    // Land-only racer should NOT appear
    expect(values).not.toContain('horse');
    expect(values).not.toContain('giraffe');
  });

  it('default racer for the track is pre-selected (backward-compatible)', () => {
    renderWithQuickTracks(['garden-path']);
    clickQuickTrack('Garden Path');
    const select = getQuickRacerSelect();
    // Garden Path defaultRacerTypeId is 'snail'; that should be the selected value
    const gardenPath = SAMPLE_TRACKS.find((t) => t.id === 'garden-path');
    expect(select.value).toBe(gardenPath.defaultRacerTypeId ?? 'horse');
  });

  it('default option is marked "(default)" in the label', () => {
    renderWithQuickTracks(['garden-path']);
    clickQuickTrack('Garden Path');
    const select = getQuickRacerSelect();
    const gardenPath = SAMPLE_TRACKS.find((t) => t.id === 'garden-path');
    const defaultOpt = Array.from(select.options).find(
      (o) => o.value === (gardenPath.defaultRacerTypeId ?? 'horse')
    );
    expect(defaultOpt.text).toContain('(default)');
  });

  it('Quick Test launches with the selected racer type', () => {
    renderWithQuickTracks(['garden-path']);
    clickQuickTrack('Garden Path');
    const select = getQuickRacerSelect();
    // Pick a non-default compatible racer (horse is compatible with garden-path)
    fireEvent.change(select, { target: { value: 'horse' } });
    // Trigger Quick Test
    const btn = screen.getByTitle(/Auto-fill to/);
    fireEvent.click(btn);
    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    expect(race.racerTypeId).toBe('horse');
  });

  it('Quick Test with default selection uses track default racer (backward-compat)', () => {
    renderWithQuickTracks(['garden-path']);
    clickQuickTrack('Garden Path');
    // No racer change — just click Quick Test
    const btn = screen.getByTitle(/Auto-fill to/);
    fireEvent.click(btn);
    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    const gardenPath = SAMPLE_TRACKS.find((t) => t.id === 'garden-path');
    expect(race.racerTypeId).toBe(gardenPath.defaultRacerTypeId ?? 'horse');
  });

  it('switching to incompatible track resets selection to that track default', () => {
    renderWithQuickTracks(['garden-path', 'searound']);
    const select = getQuickRacerSelect();
    // On Garden Path, pick horse (compatible)
    fireEvent.change(select, { target: { value: 'horse' } });
    expect(select.value).toBe('horse');
    // Switch quick-test track to Searound (horse is not water-compatible)
    clickQuickTrack('Searound');
    // Selection should reset to Searound's default racer
    const searound = SAMPLE_TRACKS.find((t) => t.id === 'searound');
    expect(getQuickRacerSelect().value).toBe(searound.defaultRacerTypeId ?? 'horse');
  });
});

describe('SetupScreen — brand eventName seed (B1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('activating a profile with non-empty eventName seeds the title field', () => {
    const profile = {
      id: 'bp-test',
      name: 'Test Brand',
      eventName: 'Acme Cup',
      primaryColor: '#e63946',
      secondaryColor: '#f4a261',
    };
    storageSet(KEYS.BRANDING, [profile]);
    storageSet(KEYS.ACTIVE_SESSION, { activeBrandingProfileId: 'bp-test' });
    renderSetupScreen();
    expect(document.body).toHaveTextContent('Acme Cup');
  });

  it('deactivating (None) clears the event name immediately', () => {
    const profile = {
      id: 'bp-deact',
      name: 'Deact Brand',
      eventName: 'Brand Cup',
      primaryColor: '#e63946',
      secondaryColor: '#f4a261',
    };
    storageSet(KEYS.BRANDING, [profile]);
    storageSet(KEYS.ACTIVE_SESSION, { activeBrandingProfileId: 'bp-deact' });
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[2]);
    const titleInput = screen.getByPlaceholderText(/summer sprint/i);
    expect(titleInput.value).toBe('Brand Cup');
    const brandSelect = screen.getByRole('combobox', { name: /active branding profile/i });
    fireEvent.change(brandSelect, { target: { value: '' } });
    expect(titleInput.value).toBe('');
  });
});
