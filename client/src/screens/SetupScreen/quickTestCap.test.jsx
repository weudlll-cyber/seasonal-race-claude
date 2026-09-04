// ============================================================
// quickTestCap.test.jsx — QUICKTEST-CAP-1
//
// Quick Test built its own roster capped at a hardcoded 100 regardless of the track, so a Quick Test
// at N=60 started on a track that holds 40 — the exact field REFUSE-OVERSIZED-1 taught the Start
// button to refuse. This proves it now reads the same authority, and that what he SEES is the
// treatment the setup screen already gives rather than a third one.
//
// SABOTAGE — the seam is the TRACK SWITCH. An input clamp alone looks like a fix and is not: N does
//   not change when the quick track does, so a value legal on an open track survives onto a closed
//   one with no control misused. That is the route the normal path already has a refusal for, and it
//   is the one spec here that a clamp-only implementation fails.
//   What breaks if I delete this: the cap could be read correctly and still be reachable.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { fieldCapFor, quickTestFieldSize } from './fieldCap.js';
import { storageSet } from '../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import { QUICK_TEST_NAMES } from '../../modules/racerNames.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';

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

forbidNetwork();

const OPEN_CAP = DEFAULT_RACE_DEFAULTS.maxPlayersOpen; // 100
const CLOSED_CAP = DEFAULT_RACE_DEFAULTS.maxPlayersClosed; // 40

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

/** Two quick-test tracks: the first CLOSED (cap 40), the second OPEN (cap 100). */
function renderWithBothKinds() {
  seedGeometry('geom-closed', true);
  seedGeometry('geom-open', false);
  const tracks = SAMPLE_TRACKS.map((t, i) =>
    i === 0 ? { ...t, geometryId: 'geom-closed' } : i === 1 ? { ...t, geometryId: 'geom-open' } : t
  );
  storageSet(CACHE_KEY, tracks);
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  return tracks;
}

/** The quick-test track switcher is a row of buttons titled with the track name. */
function pickQuickTrack(name) {
  fireEvent.click(screen.getByTitle(name));
}

const nInput = () => screen.getByRole('spinbutton');
const quickButton = () => screen.getByRole('button', { name: /Quick Test/ });

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('fieldCap — the two questions, on their own', () => {
  it('reads maxPlayersOpen / maxPlayersClosed, and falls back to the shipped pair', () => {
    expect(fieldCapFor(true, {})).toBe(OPEN_CAP);
    expect(fieldCapFor(false, {})).toBe(CLOSED_CAP);
    expect(fieldCapFor(true, { maxPlayersOpen: 12 })).toBe(12);
    expect(fieldCapFor(false, { maxPlayersClosed: 7 })).toBe(7);
    expect(fieldCapFor(false, undefined)).toBe(CLOSED_CAP);
  });

  it('the field Quick Test builds is a FLOOR at N, and the roster can exceed it', () => {
    const roster = Array.from({ length: 60 }, (_, i) => ({ name: `P${i}` }));
    expect(quickTestFieldSize(roster, 20, QUICK_TEST_NAMES)).toBe(60);
    expect(quickTestFieldSize([], 20, QUICK_TEST_NAMES)).toBe(20);
  });

  it('and it falls SHORT of N when the fill roster runs out or collides', () => {
    // Three names available, two of them already on screen: the fill can add exactly one.
    const roster = [{ name: 'a' }, { name: 'b' }];
    expect(quickTestFieldSize(roster, 10, ['a', 'b', 'c'])).toBe(3);
  });
});

describe('Quick Test obeys the track it is about to race on', () => {
  it('the N input stops at the CLOSED track’s cap, the way Add always has', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[0].name)).toBeInTheDocument());
    pickQuickTrack(tracks[0].name); // closed, cap 40

    fireEvent.change(nInput(), { target: { value: '60' } });
    expect(nInput()).toHaveValue(CLOSED_CAP);
    expect(nInput()).toHaveAttribute('max', String(CLOSED_CAP));
  });

  it('and at the OPEN track’s cap, which is a different number', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[1].name)).toBeInTheDocument());
    pickQuickTrack(tracks[1].name); // open, cap 100

    fireEvent.change(nInput(), { target: { value: '60' } });
    expect(nInput()).toHaveValue(60);
    fireEvent.change(nInput(), { target: { value: '500' } });
    expect(nInput()).toHaveValue(OPEN_CAP);
  });

  it('★ THE TRACK SWITCH: N=60 set on an open track is REFUSED on a closed one, not clamped', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[1].name)).toBeInTheDocument());

    pickQuickTrack(tracks[1].name); // open, cap 100
    fireEvent.change(nInput(), { target: { value: '60' } });
    expect(nInput()).toHaveValue(60);
    expect(screen.queryByTestId('quick-over-cap-refusal')).toBeNull();

    pickQuickTrack(tracks[0].name); // closed, cap 40 — nothing was misused to get here

    // TOLD, not tidied: the value he set is still 60 and the screen says why it cannot run.
    expect(nInput()).toHaveValue(60);
    const notice = screen.getByTestId('quick-over-cap-refusal');
    expect(notice).toHaveTextContent(`60 racers would start and this track allows ${CLOSED_CAP}`);
    expect(notice).toHaveTextContent(`remove ${60 - CLOSED_CAP} from the roster`);
    expect(quickButton()).toBeDisabled();
  });

  it('the refusal is the SAME treatment the Start button gives, not a new one', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[1].name)).toBeInTheDocument());
    pickQuickTrack(tracks[1].name);
    fireEvent.change(nInput(), { target: { value: '60' } });
    pickQuickTrack(tracks[0].name);

    const notice = screen.getByTestId('quick-over-cap-refusal');
    // role=alert, the shared groupNotice class, numbers and the way out — and never names.
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice.className).toMatch(/groupNotice/);
    expect(quickButton()).toHaveAttribute('title', expect.stringContaining('racers would start'));
  });

  it('an over-cap Quick Test cannot start, even if the button is clicked anyway', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[1].name)).toBeInTheDocument());
    pickQuickTrack(tracks[1].name);
    fireEvent.change(nInput(), { target: { value: '60' } });
    pickQuickTrack(tracks[0].name);

    fireEvent.click(quickButton());
    expect(sessionStorage.getItem('activeRace')).toBeNull();
  });

  it('a field WITHIN the cap still starts, and starts the number it says', async () => {
    const tracks = renderWithBothKinds();
    await waitFor(() => expect(screen.getByTitle(tracks[0].name)).toBeInTheDocument());
    pickQuickTrack(tracks[0].name); // closed, cap 40
    fireEvent.change(nInput(), { target: { value: '30' } });

    expect(screen.queryByTestId('quick-over-cap-refusal')).toBeNull();
    expect(quickButton()).toBeEnabled();
    fireEvent.click(quickButton());

    const race = JSON.parse(sessionStorage.getItem('activeRace'));
    expect(race.racers).toHaveLength(30);
    expect(race.eventName).toBe('Quick Test');
  });
});
