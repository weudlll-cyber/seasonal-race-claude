// ============================================================
// playerGroups.test.jsx — PLAYER-GROUPS-1
//
// THE END-TO-END HALF. PlayerGroupPicker.test.jsx proves the picker's own arithmetic against a
// stub roster; this proves the whole path — two groups picked on the Setup Screen, both fields in
// `activeRace.racers`, which is the object the RaceScreen actually runs.
//
// SABOTAGE — the seam between "the roster in React state" and "the roster in sessionStorage" is
//   where a feature like this dies quietly: `handleStartRace` copies `players` into `race.racers`
//   verbatim, so anything that strips a field on the way in never shows up until someone looks at
//   a race.
//   What breaks if I delete this: the picker could work perfectly and the group could still be
//   gone by the time the gun goes.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
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

const GROUPS = [
  { id: 'g1', name: 'Reds', players: ['Anna', 'Ben'] },
  { id: 'g2', name: 'Blues', players: ['Cara', 'Dev'] },
];

vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn(),
}));
import { fetchPlayerGroups } from '../../services/playerGroupApi.js';

forbidNetwork();

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

function renderStartable() {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: 'geom-groups' } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry('geom-groups');
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  return tracks;
}

function selectTrack(tracks) {
  fireEvent.click(screen.getAllByRole('tab')[1]);
  const card = screen
    .getAllByRole('button')
    .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
  fireEvent.click(card);
  fireEvent.click(screen.getAllByRole('tab')[0]);
}

const startedRace = () => JSON.parse(sessionStorage.getItem('activeRace') ?? 'null');

beforeEach(() => {
  sessionStorage.clear();
  fetchPlayerGroups.mockResolvedValue(GROUPS);
});

describe('player groups reach the race', () => {
  it('★ TWO groups picked on the Setup Screen both arrive in activeRace.racers', async () => {
    const tracks = renderStartable();
    selectTrack(tracks);

    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    fireEvent.click(await screen.findByTestId('group-chip-Blues'));

    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));

    const race = startedRace();
    expect(race.racers.map((r) => r.name).sort()).toEqual(['Anna', 'Ben', 'Cara', 'Dev']);
    expect(
      race.racers
        .filter((r) => r.group === 'Reds')
        .map((r) => r.name)
        .sort()
    ).toEqual(['Anna', 'Ben']);
    expect(
      race.racers
        .filter((r) => r.group === 'Blues')
        .map((r) => r.name)
        .sort()
    ).toEqual(['Cara', 'Dev']);
  });

  it('a hand-typed name races alongside a group, and carries NO group', async () => {
    const tracks = renderStartable();
    selectTrack(tracks);

    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Zoe' },
    });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));

    const race = startedRace();
    expect(race.racers.map((r) => r.name).sort()).toEqual(['Anna', 'Ben', 'Zoe']);
    expect(race.racers.find((r) => r.name === 'Zoe').group).toBeUndefined();
  });

  it('the start bar names the groups and their sizes', async () => {
    const tracks = renderStartable();
    selectTrack(tracks);
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    fireEvent.click(await screen.findByTestId('group-chip-Blues'));
    expect(screen.getByTestId('start-summary-groups')).toHaveTextContent('Reds 2 + Blues 2');
  });

  it('★ the field is still startable with the minimum this project actually has, which is ONE', async () => {
    // Established before the feature was written: `canStart` is `players.length > 0`, the RaceScreen
    // refuses only an EMPTY roster, and the server refuses only an empty group. Three expressions,
    // all equal to 1. Groups must not quietly raise it.
    fetchPlayerGroups.mockResolvedValue([{ id: 'solo', name: 'Solo', players: ['Anna'] }]);
    const tracks = renderStartable();
    selectTrack(tracks);
    fireEvent.click(await screen.findByTestId('group-chip-Solo'));
    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));
    expect(startedRace().racers).toHaveLength(1);
  });

  it('★ A FIELD OVER THE CAP CANNOT BE STARTED, however it got there', async () => {
    // REFUSE-OVERSIZED-1. The picker refuses a group that would not fit and Add stops at the cap,
    // so an over-cap field looks unreachable. It is not, and there are TWO routes that reach it
    // without misusing any control:
    //   1. the TRACK changes under the roster — open allows 100, closed allows 40, and switching
    //      does not touch the players;
    //   2. the Dev Screen's "Load to Setup", which writes the roster straight into state through
    //      KEYS.ACTIVE_GROUP with NO cap check anywhere on the path.
    // Route 2 is driven here because it needs no second track. Without the Start-side check the
    // refusal would arrive at the start line rather than while choosing, which is the thing the
    // owner's decision is against.
    storageSet(KEYS.RACE_DEFAULTS, { ...DEFAULT_RACE_DEFAULTS, maxPlayersClosed: 2 });
    storageSet(KEYS.ACTIVE_GROUP, [{ name: 'Anna' }, { name: 'Ben' }, { name: 'Cara' }]);
    const tracks = renderStartable();
    selectTrack(tracks);

    await waitFor(() => expect(screen.getByTestId('over-cap-refusal')).toBeInTheDocument());
    const refusal = screen.getByTestId('over-cap-refusal');
    expect(refusal).toHaveTextContent(/3/);
    expect(refusal).toHaveTextContent(/allows/i);
    expect(refusal).toHaveTextContent(/Remove/i);
    // Numbers, never names.
    expect(refusal.textContent).not.toMatch(/Anna|Ben|Cara/);

    // And the race cannot be started at all.
    expect(screen.queryByTitle('Start the race!')).toBeNull();
    const startBtn = screen.getByText(/Start Race/i).closest('button');
    expect(startBtn).toBeDisabled();
    expect(startBtn.getAttribute('title')).toMatch(/allows 2/);
  });

  it('★ …and removing the excess makes it startable again — the way out always works', async () => {
    storageSet(KEYS.RACE_DEFAULTS, { ...DEFAULT_RACE_DEFAULTS, maxPlayersClosed: 2 });
    storageSet(KEYS.ACTIVE_GROUP, [{ name: 'Anna' }, { name: 'Ben' }, { name: 'Cara' }]);
    const tracks = renderStartable();
    selectTrack(tracks);
    await waitFor(() => expect(screen.getByTestId('over-cap-refusal')).toBeInTheDocument());

    fireEvent.click(screen.getAllByTitle('Remove player')[0]);

    await waitFor(() => expect(screen.queryByTestId('over-cap-refusal')).toBeNull());
    expect(screen.getByTitle('Start the race!')).toBeEnabled();
  });

  it('a server that will not answer leaves the Setup Screen fully usable', async () => {
    fetchPlayerGroups.mockRejectedValue(new Error('connection refused'));
    const tracks = renderStartable();
    selectTrack(tracks);
    await waitFor(() => expect(screen.getByTestId('group-load-error')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Zoe' },
    });
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));
    expect(startedRace().racers.map((r) => r.name)).toEqual(['Zoe']);
  });
});
