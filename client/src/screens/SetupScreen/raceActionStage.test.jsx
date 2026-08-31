// ============================================================
// File:        raceActionStage.test.jsx
// Path:        client/src/screens/SetupScreen/raceActionStage.test.jsx
// Project:     RaceArena — RACE-ACTION-CONTROL-1
//
// WHAT THIS IS FOR: the chosen Race Action stage is stored WITH the race, like the seed, so that a
// replay is unambiguous. That is a property of the START path, and this file holds it. The harness
// is raceSeed.test.jsx's, deliberately — the two properties are the same shape and testing them
// through the same real SetupScreen is what keeps them honest about each other.
//
// Sabotages recorded in reports/evolution/RACE-ACTION-CONTROL-1.md:
//   1. the stage travels with the race        — sabotage: drop the key from the payload
//   2. BOTH start paths carry it              — sabotage: leave it out of Quick Test only
//   3. an old stored race still loads         — sabotage: make the resolver throw on a missing key
//   4. the race is a SNAPSHOT of the setting  — sabotage: read the live setting at race time
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { validateActiveRace } from '../RaceScreen/raceSession.js';
import { normalizeRaceActionStage, applyRaceActionStage } from '../../modules/raceActionStage.js';
import {
  DEFAULT_RACE_DEFAULTS,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  RACE_ACTION_STAGE_IDS,
} from '../../modules/storage/defaults.js';

vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
// TEARDOWN-INFLIGHT-1: SetupScreen also mounts SeedRedeliveryNotice (SEED-REDELIVERY-1), which asks
// the server whether this install is owed a redelivery warning. The SERVICE is replaced rather than
// `fetch`, for the same reason the hook above is: replacing the module removes the effect's request
// entirely, so nothing is ever in flight to outlive the test.
vi.mock('../../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: () => Promise.resolve([]),
  dismissSeedNotices: () => Promise.resolve(0),
}));

forbidNetwork();

function seedGeometry(id, { closed = true } = {}) {
  const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 100, y: 0 }));
  localStorage.setItem(
    `racearena:trackGeometries:${id}`,
    JSON.stringify({
      id,
      closed,
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

function renderStartable() {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: 'geom-stage' } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry('geom-stage', { closed: true });
  storageSet(KEYS.ACTIVE_GROUP, [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }]);
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  fireEvent.click(screen.getAllByRole('tab')[1]);
  const card = screen
    .getAllByRole('button')
    .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
  fireEvent.click(card);
}

const clickStart = () => fireEvent.click(screen.getByTitle('Start the race!'));
const startedRace = () => {
  const raw = sessionStorage.getItem('activeRace');
  return raw ? JSON.parse(raw) : null;
};
const setStage = (stage) =>
  storageSet(KEYS.RACE_DEFAULTS, { ...DEFAULT_RACE_DEFAULTS, raceActionStage: stage });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('RACE-ACTION-CONTROL-1 — the stage travels with the race', () => {
  // PROPERTY 1 — without this the stored stage means nothing and a replay is a guess.
  it.each(RACE_ACTION_STAGE_IDS)('a race started on %s carries that stage', (stage) => {
    setStage(stage);
    renderStartable();
    clickStart();
    expect(startedRace().raceActionStage).toBe(stage);
  });

  it('a race started without touching the control carries quiet', () => {
    renderStartable();
    clickStart();
    expect(startedRace().raceActionStage).toBe('quiet');
  });

  // PROPERTY 4 — the race is a SNAPSHOT. Changing the Dev Screen setting after the race started
  // must not reach back into a race already on screen, which is what reading the payload (rather
  // than the live setting) at race time buys.
  it('changing the setting afterwards does not change the race already started', () => {
    setStage('wild');
    renderStartable();
    clickStart();
    const race = startedRace();
    setStage('quiet');
    expect(race.raceActionStage).toBe('wild');
    expect(startedRace().raceActionStage).toBe('wild');
  });

  it('a stage that is not one of the three is normalised at the boundary, not carried through', () => {
    setStage('feral');
    renderStartable();
    clickStart();
    expect(startedRace().raceActionStage).toBe('quiet');
  });

  // PROPERTY 2 — Quick Test is the harness path the camera-replay tool records against.
  it('the Quick Test path carries the stage too', () => {
    setStage('medium');
    renderStartable();
    const quick = screen
      .getAllByRole('button')
      .find((b) => /quick test/i.test(b.textContent) && !b.disabled);
    expect(quick).toBeTruthy();
    fireEvent.click(quick);
    expect(startedRace().raceActionStage).toBe('medium');
  });
});

describe('RACE-ACTION-CONTROL-1 — reading a stored race back', () => {
  // PROPERTY 1, the other half: the payload survives the round trip the race screen actually does.
  it.each(RACE_ACTION_STAGE_IDS)('a stored race on %s reads back as %s', (stage) => {
    setStage(stage);
    renderStartable();
    clickStart();
    const reloaded = JSON.parse(sessionStorage.getItem('activeRace'));
    expect(() => validateActiveRace(reloaded)).not.toThrow();
    expect(normalizeRaceActionStage(reloaded.raceActionStage)).toBe(stage);
  });

  // PROPERTY 3 — the compatibility property, held against a race payload that a build BEFORE this
  // change produced: it validates, it loads, and it runs the shipped configuration.
  it('a race stored BEFORE this change loads, and loads as quiet', () => {
    setStage('wild');
    renderStartable();
    clickStart();
    const legacy = { ...startedRace() };
    delete legacy.raceActionStage; // exactly what an older build wrote

    expect(() => validateActiveRace(legacy)).not.toThrow();
    expect(normalizeRaceActionStage(legacy.raceActionStage)).toBe('quiet');
    // And "quiet" for such a race means the config it would have run: the shipped one, unchanged.
    expect(applyRaceActionStage(DEFAULT_RACE_DYNAMICS_CONFIG, legacy.raceActionStage)).toEqual(
      DEFAULT_RACE_DYNAMICS_CONFIG
    );
  });
});
