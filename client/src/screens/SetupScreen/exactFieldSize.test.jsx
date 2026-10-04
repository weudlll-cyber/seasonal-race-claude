// ============================================================
// File:        exactFieldSize.test.jsx
// Path:        client/src/screens/SetupScreen/exactFieldSize.test.jsx
// Project:     RaceArena — EXACT-FIELD-SIZE-1 (decided 2026-10-04)
// Description: A race starts with EXACTLY the number of racers chosen. Found by LARGE-FIELD-PERF-1:
//              "Quick Test (80)" started 70, because the default Quick Test name list holds 70
//              names and the fill drew from that list alone. One test per start path that builds a
//              roster from a count:
//                · Quick Test, past the end of the chosen list  → exactly N, every name different
//                · Quick Test, when even every list runs out   → REFUSED, never started short
//                · the ordinary start from typed names          → exactly the names typed
//              The Track Editor's test race is covered by `TrackEditor/testRace.test.js` (exactly
//              TEST_RACE_FIELD_SIZE racers, all different).
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { playerNameKey } from '../../../../shared/playerNames.mjs';

vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
vi.mock('../../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: vi.fn().mockResolvedValue([]),
  dismissSeedNotice: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn().mockResolvedValue([]),
}));

// The real fill, unless a test asks for a short one — the only way to reach the refusal, because the
// shipped lists hold 230 different names against a largest field of 100.
let shortFill = null;
vi.mock('../../modules/racerNames.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, fillRosterFor: (key) => shortFill ?? real.fillRosterFor(key) };
});

import SetupScreen from './SetupScreen.jsx';

forbidNetwork();

function seedGeometry(id, closed) {
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

/** One OPEN track (cap 100) first in the list, so it is the Quick Test track and the Start track. */
function renderOpen(roster) {
  seedGeometry('geom-open', false);
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: 'geom-open' } : t));
  storageSet(CACHE_KEY, tracks);
  if (roster)
    storageSet(
      KEYS.ACTIVE_GROUP,
      roster.map((name) => ({ name }))
    );
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  return tracks;
}

const startedRace = () => JSON.parse(sessionStorage.getItem('activeRace') ?? 'null');
const nInput = () => screen.getByRole('spinbutton');

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  shortFill = null;
});

describe('EXACT-FIELD-SIZE-1 — a race starts with exactly the number chosen', () => {
  it('★ Quick Test (80) starts EIGHTY on the default name list, which holds seventy', async () => {
    const tracks = renderOpen();
    await waitFor(() => expect(screen.getByTitle(tracks[0].name)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(tracks[0].name));
    fireEvent.change(nInput(), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Quick Test \(80\)/ }));

    const names = startedRace().racers.map((r) => r.name);
    expect(names).toHaveLength(80);
    // Every name different under the rule that refuses the same name twice in a race.
    expect(new Set(names.map(playerNameKey)).size).toBe(80);
  });

  it('a count the list CANNOT fill is REFUSED with the reason, and nothing starts', async () => {
    shortFill = ['Ada', 'Bob', 'Cy'];
    const tracks = renderOpen();
    await waitFor(() => expect(screen.getByTitle(tracks[0].name)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(tracks[0].name));
    fireEvent.change(nInput(), { target: { value: '5' } });

    const refusal = screen.getByTestId('quick-short-refusal');
    expect(refusal).toHaveTextContent('Only 3 racers can be filled, not 5');
    const button = screen.getByRole('button', { name: /Quick Test \(5\)/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(startedRace()).toBeNull();
  });

  it('the ordinary start runs exactly the names on the screen, no more and no fewer', async () => {
    const roster = Array.from({ length: 23 }, (_, i) => `Player ${i + 1}`);
    const tracks = renderOpen(roster);
    fireEvent.click(screen.getAllByRole('tab')[1]);
    const card = screen
      .getAllByRole('button')
      .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));
    expect(startedRace().racers.map((r) => r.name)).toEqual(roster);
  });
});
