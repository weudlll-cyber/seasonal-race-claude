// ============================================================
// File:        doubledNames.test.jsx
// Path:        client/src/screens/SetupScreen/doubledNames.test.jsx
// Project:     RaceArena — PERIOD-EVALUATION-1 (the owner's decisions of 2026-10-04)
// Description: THE SAME NAME TWICE IN ONE RACE IS NOT ALLOWED, names compared ignoring case and
//              surrounding or repeated spaces (`shared/playerNames.mjs`). Every way a roster reaches
//              the start line on this screen refuses one, and says which name is doubled:
//                · typing a name                  (PlayerSetup — refused, not added)
//                · adding a player group          (PlayerGroupPicker — not added twice, said so)
//                · a roster arriving WHOLE        (the Dev Screen hand-off — Start refused)
//                · a race identifier's roster     (refused at Start, with the reason)
//                · a Quick Test fill              (never doubles a name already in the field)
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupScreen from './SetupScreen.jsx';
import PlayerSetup from './PlayerSetup.jsx';
import { storageSet, KEYS } from '../../modules/storage/storage.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { encodeRaceIdentifier } from '../../modules/raceIdentifier.js';
import { raceIdentifierBuildId } from '../../modules/raceIdentifierBuild.js';

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
import { fetchPlayerGroups } from '../../services/playerGroupApi.js';

forbidNetwork();

const GEOM = 'geom-doubled-names';

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

/** The setup screen with a track selected and `roster` handed over whole, as the Dev Screen does. */
function renderWith(roster) {
  const tracks = SAMPLE_TRACKS.map((t, i) => (i === 0 ? { ...t, geometryId: GEOM } : t));
  storageSet(CACHE_KEY, tracks);
  seedGeometry(GEOM);
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
  fireEvent.click(screen.getAllByRole('tab')[1]);
  const card = screen
    .getAllByRole('button')
    .find((b) => b.textContent.includes(tracks[0].name) && !b.disabled);
  fireEvent.click(card);
  fireEvent.click(screen.getAllByRole('tab')[0]);
}

const startedRace = () => JSON.parse(sessionStorage.getItem('activeRace') ?? 'null');
const startButton = () => screen.getByText(/Start Race/i).closest('button');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(fetchPlayerGroups).mockResolvedValue([]);
});

describe('typing a name', () => {
  it('★ a name already in the field — capitals and spaces aside — is refused, naming it', () => {
    const onChange = vi.fn();
    render(<PlayerSetup players={[{ name: 'Anna Lee' }]} onChange={onChange} maxPlayers={20} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: '  anna   LEE ' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('player-name-error').textContent).toMatch(
      /^The name "Anna Lee" is in this race twice\./
    );
  });

  it('a different name is added as before', () => {
    const onChange = vi.fn();
    render(<PlayerSetup players={[{ name: 'Anna' }]} onChange={onChange} maxPlayers={20} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Annabel' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledWith([{ name: 'Anna' }, { name: 'Annabel' }]);
  });
});

describe('adding a player group', () => {
  it('★ a name already in the field, or twice in the group, is NOT added twice — and it says so', async () => {
    vi.mocked(fetchPlayerGroups).mockResolvedValue([
      { id: 'g', name: 'Old', players: ['ANNA', 'Ben', 'ben '] },
    ]);
    renderWith(['Anna']);
    fireEvent.click(await screen.findByTestId('group-chip-Old'));
    await waitFor(() => expect(screen.getByTestId('group-notice')).toBeInTheDocument());
    expect(screen.getByTestId('group-notice').textContent).toMatch(/2 names .* not added twice/);
    await waitFor(() => expect(screen.getByTitle('Start the race!')).toBeEnabled());
    fireEvent.click(screen.getByTitle('Start the race!'));
    expect(startedRace().racers.map((r) => r.name)).toEqual(['Anna', 'Ben']);
  });
});

describe('a roster that arrives whole', () => {
  it('★ the same name twice CANNOT BE STARTED, and the start bar says which name', async () => {
    renderWith(['Anna', 'Ben', ' anna']);
    await waitFor(() => expect(screen.getByTestId('doubled-name-refusal')).toBeInTheDocument());
    expect(screen.getByTestId('doubled-name-refusal').textContent).toMatch(
      /The name "Anna" is in this race twice\./
    );
    expect(startButton()).toBeDisabled();
    expect(startButton().getAttribute('title')).toMatch(/"Anna" is in this race twice/);
  });

  it('…and removing the doubled name makes it startable again', async () => {
    renderWith(['Anna', 'Ben', ' anna']);
    await waitFor(() => expect(screen.getByTestId('doubled-name-refusal')).toBeInTheDocument());
    // The field is listed sorted, so the button is found by its row, not by position.
    const anna = screen
      .getAllByTitle('Remove player')
      .find((b) => /anna/i.test(b.parentElement.textContent));
    fireEvent.click(anna);
    await waitFor(() => expect(screen.queryByTestId('doubled-name-refusal')).toBeNull());
    expect(startButton()).toBeEnabled();
  });

  it('a Quick Test is refused too while the field holds a doubled name', async () => {
    renderWith(['Anna', 'ANNA']);
    const quick = await screen.findByText(/Quick Test \(/);
    expect(quick.closest('button')).toBeDisabled();
  });
});

describe('a race identifier', () => {
  it('★ an identifier whose roster has the same name twice is REFUSED at Start, with the reason', () => {
    renderWith(['Alice']);
    const identifier = encodeRaceIdentifier({
      geometryId: GEOM,
      racerTypeId: 'horse',
      names: ['Ada', 'Grace', 'ADA'],
      racePlanSeed: 4242,
      raceActionStage: 'wild',
      targetLaps: 3,
      racePlanEnabled: true,
      world: {},
      defaultWorldConfigs: {},
      defaultEffectiveRacerTypes: {},
      buildId: raceIdentifierBuildId(),
    });
    fireEvent.click(screen.getAllByRole('tab')[2]);
    fireEvent.change(screen.getByLabelText('Race seed, key or identifier'), {
      target: { value: identifier },
    });
    fireEvent.click(startButton());
    expect(startedRace()).toBeNull();
    expect(screen.getByTestId('identifier-error').textContent).toMatch(
      /The name "Ada" is in this race twice\./
    );
  });
});
