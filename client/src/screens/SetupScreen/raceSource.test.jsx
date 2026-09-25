// ============================================================
// File:        raceSource.test.jsx
// Path:        client/src/screens/SetupScreen/raceSource.test.jsx
// Project:     RaceArena — RACE-SOURCE-1
// Created:     2026-09-25
//
// WHAT THIS IS FOR: the setup screen is the only place that knows HOW a race was started, and it
// writes `activeRace` in THREE places. A marker set at two of them and missed at the third is worse
// than no marker, because the gap is invisible — the race stores a value, it is simply the wrong
// one. These tests hold one property per writer.
//
//   1. an ordinary Start Race is RACE
//   2. a Quick Test is QUICK_TEST
//   3. ★ a start from an IDENTIFIER is RACE — the trap, and the reason this file exists
//
// ★ (3) IS THE ONE WORTH A TEST OF ITS OWN. `startRaceFromIdentifier` is reached from inside
//   `handleStartRace`, so it looks covered by (1) and is not: it is a separate `setItem` with its
//   own payload literal. What changed on that path is where the inputs came FROM, not what kind of
//   race it is — a host running somebody else's race is running a real race.
//
// WHAT IS NOT HERE, deliberately. What the SERVER does with the value — including the load-bearing
// "absent is not real" rule — is asserted in `server/src/races/raceStore.test.js`, where the storage
// decision is made. Re-asserting it through the UI would buy a green tick and no coverage.
//
// The harness (geometry seeding, a startable setup, the service mocks) is taken from
// `raceSeed.test.jsx` and `SetupScreen.test.jsx` rather than invented beside them — the same screen
// needs the same scaffolding, and a second spelling of it is a second thing to keep in step.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { encodeRaceIdentifier } from '../../modules/raceIdentifier.js';
import { raceIdentifierBuildId } from '../../modules/raceIdentifierBuild.js';
// The expected values come from the shared vocabulary, not from string literals retyped here: a
// test carrying its own copy of the spelling cannot catch the spelling changing on one side.
import { RACE_SOURCE } from '../../../../shared/raceSource.mjs';

vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
vi.mock('../../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: () => Promise.resolve([]),
  dismissSeedNotices: () => Promise.resolve(0),
}));
vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn().mockResolvedValue([]),
}));

forbidNetwork();

const GEOM = 'geom-race-source';

function seedGeometry(id) {
  const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 100, y: 0 }));
  localStorage.setItem(
    `racearena:trackGeometries:${id}`,
    JSON.stringify({
      id,
      closed: true,
      pathLengthPx: 6156,
      innerPoints: pts.map((p) => ({ ...p, y: -20 })),
      outerPoints: pts.map((p) => ({ ...p, y: 20 })),
      centerPoints: pts,
    })
  );
  const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '{}');
  idx[id] = id;
  localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(idx));
}

/** A startable setup: one track with a real geometry, and players in the active group. */
function renderStartable() {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: GEOM } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry(GEOM);
  storageSet(KEYS.ACTIVE_GROUP, [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }]);
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  // The track has to be selected before Start Race is enabled. Tabs are [Players, Track, Settings].
  fireEvent.click(screen.getAllByRole('tab')[1]);
  const card = screen
    .getAllByRole('button')
    .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
  fireEvent.click(card);
}

function startedRace() {
  const raw = sessionStorage.getItem('activeRace');
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('RACE-SOURCE-1 — every writer of activeRace says how the race was started', () => {
  it('an ordinary Start Race is marked as a real race', () => {
    renderStartable();
    fireEvent.click(screen.getByTitle('Start the race!'));

    expect(startedRace().raceSource).toBe(RACE_SOURCE.RACE);
  });

  it('a Quick Test is marked as a quick test', () => {
    const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: GEOM } : t));
    storageSet(CACHE_KEY, tracks);
    seedGeometry(GEOM);
    render(
      <MemoryRouter>
        <SetupScreen />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTitle('Auto-fill to 20 test players and start race'));

    expect(startedRace().raceSource).toBe(RACE_SOURCE.QUICK_TEST);
  });

  it('★ a race started from an IDENTIFIER is marked as a real race, not a third kind', () => {
    renderStartable();
    const identifier = encodeRaceIdentifier({
      geometryId: GEOM,
      racerTypeId: 'horse',
      names: ['Ada', 'Grace', 'Alan'],
      racePlanSeed: 4242,
      raceActionStage: 'wild',
      targetLaps: 3,
      racePlanEnabled: true,
      world: {},
      defaultWorldConfigs: {},
      defaultEffectiveRacerTypes: {},
      buildId: raceIdentifierBuildId(),
    });
    // The Settings tab holds the field that takes a seed, a key or an identifier.
    fireEvent.click(screen.getAllByRole('tab')[2]);
    fireEvent.change(screen.getByLabelText('Race seed, key or identifier'), {
      target: { value: identifier },
    });
    fireEvent.click(screen.getByTitle('Start the race!'));

    const race = startedRace();
    // Guard the premise: if the identifier were refused, `activeRace` would be the ordinary payload
    // (or absent) and the assertion below would pass for the wrong reason.
    expect(race).not.toBeNull();
    expect(race.racePlanSeed).toBe(4242);
    expect(race.racers.map((r) => r.name)).toEqual(['Ada', 'Grace', 'Alan']);

    expect(race.raceSource).toBe(RACE_SOURCE.RACE);
  });
});
