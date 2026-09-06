// ============================================================
// File:        raceIdentifierRow.test.jsx
// Path:        client/src/screens/SetupScreen/raceIdentifierRow.test.jsx
// Project:     RaceArena — IDENTIFIER-SPEAKS-1
//
// THE ROW'S PLACE IS NEVER SIMPLY EMPTY.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────────
//
// The owner added racers, picked a track, typed a seed, and the race identifier row did not appear.
// He then spent time hunting for a field. `currentRaceIdentifier` returned `null` three different
// ways and the panel rendered nothing for all three — including from a bare `catch {}` that
// swallowed a real throw whole. A deliberately absent row and a crashed one looked identical, and
// the only way to tell them apart was to open a console nobody has open during an event.
//
// ── WHAT IS ASSERTED ────────────────────────────────────────────────────────────────────────────
//
// That the row appears when it should; that when it does NOT, a line in its place says why; and
// ★ that a THROW inside the encoder produces a message rather than a blank — with the panel still
// standing, which is the half of the original comment that was right.
//
// The reproduction below is the owner's state exactly — racers in the active group, a track with a
// real geometry selected, seed `3` typed — and it is what established that the happy path was never
// broken: the row renders. What was broken is everything the screen says when it does not.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';

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

// The encoder is replaced ONLY in the throwing test below, through this handle. Everywhere else it
// is the real one, so the happy path is the real happy path.
const encodeSpy = vi.hoisted(() => ({ impl: null }));
vi.mock('../../modules/raceIdentifier.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    encodeRaceIdentifier: (...args) =>
      encodeSpy.impl ? encodeSpy.impl(...args) : real.encodeRaceIdentifier(...args),
  };
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

/** The owner's state: racers in the group, a real geometry, and the track selected. */
function renderStartable({ withPlayers = true, withTrack = true } = {}) {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: 'geom-seed' } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry('geom-seed', { closed: true });
  storageSet(
    KEYS.ACTIVE_GROUP,
    withPlayers ? [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }] : []
  );
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  if (withTrack) {
    fireEvent.click(screen.getAllByRole('tab')[1]);
    const card = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
    fireEvent.click(card);
  }
}

const openSettings = () => fireEvent.click(screen.getAllByRole('tab')[2]);
const typeSeed = (v) =>
  fireEvent.change(screen.getByLabelText('Race seed, key or identifier'), { target: { value: v } });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  encodeSpy.impl = null;
});

describe('IDENTIFIER-SPEAKS-1 — the row appears when it can', () => {
  // The owner's exact state. What breaks if deleted: the row could stop rendering for everybody and
  // only a person at the screen would notice.
  it("racers, a track and a typed seed produce the row — the owner's state", () => {
    renderStartable();
    openSettings();
    typeSeed('3');

    const row = screen.getByTestId('race-identifier-row');
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent(/copy this race/i);
    // And no explanation, because there is nothing to explain.
    expect(screen.queryByTestId('race-identifier-note')).not.toBeInTheDocument();
  });
});

describe('IDENTIFIER-SPEAKS-1 — when there is no row, the screen says why', () => {
  // What breaks if deleted: an empty seed field would leave a blank space that reads exactly like a
  // broken panel, which is the hunt the owner was sent on.
  it('an empty seed field says what to type', () => {
    renderStartable();
    openSettings();

    expect(screen.queryByTestId('race-identifier-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('race-identifier-note')).toHaveTextContent(/type a seed/i);
  });

  // What breaks if deleted: pasting an identifier would blank the row with no word about it.
  //
  // RACE-IDENTIFIER-3 (2026-09-05) improved what this says: a DAMAGED identifier now names the
  // reason it cannot be used rather than the generic "this field holds an identifier". `RA1-abcdef`
  // is damaged — it carries the prefix and nothing decodable — so the refusal is the honest message,
  // and the assertion follows the behaviour rather than pinning the older wording.
  it('a DAMAGED pasted identifier says why it cannot be used', () => {
    renderStartable();
    openSettings();
    typeSeed('RA1-abcdef');

    expect(screen.queryByTestId('race-identifier-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('race-identifier-note')).toHaveTextContent(/cannot be used/i);
  });

  // What breaks if deleted: the two KNOWN absences would go back to being indistinguishable from a
  // fault. These are the ones the brief names.
  it('no racers says to add a racer', () => {
    renderStartable({ withPlayers: false });
    openSettings();
    typeSeed('3');

    expect(screen.queryByTestId('race-identifier-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('race-identifier-note')).toHaveTextContent(/add at least one racer/i);
  });

  it('no track ready says to pick a track', () => {
    renderStartable({ withTrack: false });
    openSettings();
    typeSeed('3');

    expect(screen.queryByTestId('race-identifier-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('race-identifier-note')).toHaveTextContent(/pick a track/i);
  });
});

describe('RUN-IT-AGAIN-1 — repeating a race repeats THAT race', () => {
  // What breaks if deleted: `run it again` goes back to filling in a SEED, which reproduces a race
  // only if nothing on the machine changed since — the defect this closed.
  it('fills the field with the recorded IDENTIFIER, not the seed', () => {
    storageSet(KEYS.LAST_RACE_SEED, 3);
    storageSet(KEYS.LAST_RACE_IDENTIFIER, 'RA1-recorded-identifier');
    renderStartable();
    openSettings();

    // The seed is still the LABEL — scoped to the last-race row, since '3' is also in the field.
    expect(screen.getByTestId('run-it-again').parentElement).toHaveTextContent(/Last race:\s*3/);
    fireEvent.click(screen.getByTestId('run-it-again'));
    expect(screen.getByLabelText('Race seed, key or identifier')).toHaveValue(
      'RA1-recorded-identifier'
    );
  });

  // ★ What breaks if deleted: a race with only a seed recorded would offer the weaker repeat in the
  // place the stronger one lives, with nothing said — which is worse than not offering it.
  it('falls back to the seed when no identifier was recorded, and SAYS so', () => {
    storageSet(KEYS.LAST_RACE_SEED, 3);
    renderStartable();
    openSettings();

    expect(screen.getByTestId('run-it-again-seed-only')).toHaveTextContent(/by seed only/i);
    fireEvent.click(screen.getByTestId('run-it-again'));
    expect(screen.getByLabelText('Race seed, key or identifier')).toHaveValue('3');
  });

  it('says nothing about seeds when the whole race was recorded', () => {
    storageSet(KEYS.LAST_RACE_SEED, 3);
    storageSet(KEYS.LAST_RACE_IDENTIFIER, 'RA1-recorded-identifier');
    renderStartable();
    openSettings();
    expect(screen.queryByTestId('run-it-again-seed-only')).not.toBeInTheDocument();
  });
});

describe('IDENTIFIER-SPEAKS-1 — a swallowed throw is the defect this closes', () => {
  // ★ THE ONE THAT MATTERS. What breaks if deleted: the `catch` goes back to returning a bare null,
  // and a screen state the identifier cannot describe is once again a blank space — the exact
  // failure that made the owner's report impossible to act on from here.
  it('names the error where the row would have been', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    encodeSpy.impl = () => {
      throw new Error('a stored setting this build cannot describe');
    };

    renderStartable();
    openSettings();
    typeSeed('3');

    expect(screen.queryByTestId('race-identifier-row')).not.toBeInTheDocument();
    const note = screen.getByTestId('race-identifier-note');
    expect(note).toHaveTextContent(/cannot be turned into an identifier/i);
    // The error's OWN words reach the screen: the operator's stored state is the one fact nobody
    // reading this from elsewhere has.
    expect(note).toHaveTextContent(/a stored setting this build cannot describe/i);
    expect(warn).toHaveBeenCalled();
  });

  // What breaks if deleted: a throw could take the whole panel down, which is what the catch is for
  // and is the half of the original comment that was right.
  it('leaves the panel standing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    encodeSpy.impl = () => {
      throw new Error('boom');
    };

    renderStartable();
    openSettings();
    typeSeed('3');

    // The seed field itself still works, which is the proof the panel survived.
    expect(screen.getByLabelText('Race seed, key or identifier')).toHaveValue('3');
    expect(screen.getByText('Event Name (optional)')).toBeInTheDocument();
  });
});
