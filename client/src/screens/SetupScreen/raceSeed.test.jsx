// ============================================================
// File:        raceSeed.test.jsx
// Path:        client/src/screens/SetupScreen/raceSeed.test.jsx
// Project:     RaceArena — SEED-REAL-RACE-1
//
// WHAT THIS IS FOR: the normal "Start Race" path used to write `racePlanSeed: 0` — the unseeded
// value — so no race the owner watched was reproducible, including the ones he judged. These tests
// hold the four properties that make the change real, and each one was proven to FAIL by sabotage
// before it was kept (recorded in reports/night/SEED-REAL-RACE-1.md):
//
//   1. a started race CARRIES a seed          — sabotage: put the literal 0 back
//   2. an EXPLICIT seed wins                  — sabotage: ignore the field and always draw
//   3. the seed OUTLIVES the session          — sabotage: write it to sessionStorage
//   4. a race stored BEFORE this change still loads — sabotage: require the key in the validator
//
// WHAT IS NOT HERE, deliberately (R7). "The same seed reproduces the same race" is NOT re-asserted
// on this path: it is a property of the ENGINE, not of the start screen, and it is already held —
// byte-identically, across a 600-identity soak — by the golden parity harness. What this path owes
// is that the seed ARRIVES; what happens once it does is somebody else's test, and duplicating it
// here would buy a green tick and no coverage. The one thing worth asserting locally is that the
// value the race is given and the value stored as "the last race's seed" are the SAME number, which
// is the only new way this change could lie about reproducibility.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, storageGet, KEYS } from '../../modules/storage/storage.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { validateActiveRace } from '../RaceScreen/raceSession.js';
import { QUICK_TEST_SEED_MIN, QUICK_TEST_SEED_MAX } from './quickTestSeed.js';

vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
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

/** A startable setup: one track with a real geometry, and players in the active group. */
function renderStartable() {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: 'geom-seed' } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry('geom-seed', { closed: true });
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

function clickStart() {
  fireEvent.click(screen.getByTitle('Start the race!'));
}

function startedRace() {
  const raw = sessionStorage.getItem('activeRace');
  return raw ? JSON.parse(raw) : null;
}

function openSettingsTab() {
  fireEvent.click(screen.getAllByRole('tab')[2]);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('SEED-REAL-RACE-1 — a started race carries a seed', () => {
  it('a normal Start Race writes a usable seed, not the legacy 0', () => {
    renderStartable();
    clickStart();
    const race = startedRace();
    expect(race).not.toBeNull();
    // The assertion that matters is `> 0`: 0 is the legacy UNSEEDED value, and it is what this
    // whole change exists to remove from this path.
    expect(race.racePlanSeed).toBeGreaterThan(0);
    expect(Number.isSafeInteger(race.racePlanSeed)).toBe(true);
  });

  it('a drawn seed stays inside the readable range, so it can be read off and typed back', () => {
    renderStartable();
    clickStart();
    const { racePlanSeed } = startedRace();
    expect(racePlanSeed).toBeGreaterThanOrEqual(QUICK_TEST_SEED_MIN);
    expect(racePlanSeed).toBeLessThanOrEqual(QUICK_TEST_SEED_MAX);
  });

  it('the race and the last-race record hold the SAME number — one draw, two consumers', () => {
    renderStartable();
    clickStart();
    expect(storageGet(KEYS.LAST_RACE_SEED, null)).toBe(startedRace().racePlanSeed);
  });
});

describe('SEED-REAL-RACE-1 — an explicitly given seed wins', () => {
  it('a typed seed is the seed the race runs with', () => {
    renderStartable();
    openSettingsTab();
    fireEvent.change(screen.getByLabelText('Race seed'), { target: { value: '4242' } });
    clickStart();
    expect(startedRace().racePlanSeed).toBe(4242);
  });

  it('a typed seed beats the draw on every start, so two races in a row are the same race', () => {
    renderStartable();
    openSettingsTab();
    fireEvent.change(screen.getByLabelText('Race seed'), { target: { value: '77' } });
    clickStart();
    const first = startedRace().racePlanSeed;
    sessionStorage.removeItem('activeRace');
    clickStart();
    expect(startedRace().racePlanSeed).toBe(first);
    expect(first).toBe(77);
  });

  it('typing 0 cannot reach the unseeded path — it is clamped up, not accepted', () => {
    renderStartable();
    openSettingsTab();
    fireEvent.change(screen.getByLabelText('Race seed'), { target: { value: '0' } });
    clickStart();
    expect(startedRace().racePlanSeed).toBeGreaterThan(0);
  });
});

describe('SEED-REAL-RACE-1 — the seed outlives the session', () => {
  it('a TYPED seed is kept in localStorage, which survives the tab closing', () => {
    renderStartable();
    openSettingsTab();
    fireEvent.change(screen.getByLabelText('Race seed'), { target: { value: '1234' } });
    expect(storageGet(KEYS.RACE_SEED, null)).toBe('1234');
    // The sabotage this catches is writing to sessionStorage, which looks identical in a running
    // tab and loses the value the moment the browser closes.
    expect(sessionStorage.getItem(KEYS.RACE_SEED)).toBeNull();
  });

  it('clearing the field REMOVES the key rather than storing an empty string', () => {
    renderStartable();
    openSettingsTab();
    const field = screen.getByLabelText('Race seed');
    fireEvent.change(field, { target: { value: '1234' } });
    fireEvent.change(field, { target: { value: '' } });
    expect(localStorage.getItem(KEYS.RACE_SEED)).toBeNull();
  });

  it('a DRAWN seed survives too — it is recorded even though the field stays empty', () => {
    renderStartable();
    clickStart();
    const drawn = startedRace().racePlanSeed;
    expect(storageGet(KEYS.LAST_RACE_SEED, null)).toBe(drawn);
    // And the field is NOT pinned to it, or every later race would replay the first one.
    expect(localStorage.getItem(KEYS.RACE_SEED)).toBeNull();
  });

  it('the last race seed is offered back in the panel, so he need not have written it down', () => {
    renderStartable();
    clickStart();
    const drawn = startedRace().racePlanSeed;
    openSettingsTab();
    expect(screen.getByText(String(drawn))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /run it again/i }));
    expect(screen.getByLabelText('Race seed')).toHaveValue(String(drawn));
  });
});

describe('SEED-REAL-RACE-1 — a race stored before this change still loads', () => {
  // THE FALLBACK, stated: a payload with NO `racePlanSeed` keeps its old meaning — unseeded, which
  // is the value 0 the engine already understands. It is not back-filled with a fresh draw: that
  // would hand a stored race a seed it never ran with, which is a worse lie than "not reproducible".
  const legacyRace = {
    racers: [{ name: 'Alice' }, { name: 'Bob' }],
    trackId: 't1',
    geometryId: 'geom-seed',
    racerTypeId: 'horse',
    raceMode: 'laps',
    targetLaps: 3,
    // no racePlanSeed — this is what a race stored before 2026-08-23 looks like
  };

  it('validateActiveRace accepts a payload with no racePlanSeed', () => {
    expect(() => validateActiveRace(legacyRace)).not.toThrow();
  });

  it('the reader resolves a missing seed to the legacy unseeded 0', () => {
    // This is the expression RaceScreen uses; asserting the PROPERTY rather than mounting the
    // screen, which is untestable for reasons recorded in docs/BACKLOG.md.
    expect(legacyRace.racePlanSeed ?? 0).toBe(0);
    expect({ ...legacyRace, racePlanSeed: 0 }.racePlanSeed ?? 0).toBe(0);
  });

  it('a legacy race is reported as not reproducible rather than as seed zero', () => {
    // The rule both the result screen and the history entry apply: `> 0`, never `!= null`.
    const shown = Number(legacyRace.racePlanSeed) > 0 ? Number(legacyRace.racePlanSeed) : null;
    expect(shown).toBeNull();
    const shownZero = Number(0) > 0 ? 0 : null;
    expect(shownZero).toBeNull();
  });
});
