// ============================================================
// File:        TrackManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/TrackManager.test.jsx
// Project:     RaceArena
// Created:     2026-04-29
// Description: Component tests for TrackManager edit-behaviour (Bug 1 fix)
//              Verifies that Edit always opens the metadata modal for all
//              track types, and that the Track Editor button navigates correctly.
// ============================================================

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../modules/storage/useStorage.js', () => ({ useStorage: vi.fn() }));
vi.mock('../../../modules/storage/useServerTracks.js', () => ({
  useServerTracksControl: vi.fn(),
}));
vi.mock('../../../modules/track-editor/trackStorage.js', () => ({
  listTracks: vi.fn().mockReturnValue([]),
  getTrack: vi.fn().mockReturnValue(null),
}));
vi.mock('../../../modules/storage/defaults.js', () => ({
  DEFAULT_TRACKS: [],
}));
vi.mock('../../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../modules/racer-types/index.js', () => ({
  RACER_TYPE_IDS: ['horse'],
  RACER_TYPE_LABELS: { horse: 'Horse' },
  getRacerType: vi.fn().mockReturnValue({ config: { displaySize: 40 } }),
}));
vi.mock('../../../modules/rowLayout.js', () => ({
  computeRacersPerRow: vi.fn().mockReturnValue(4),
  computeMaxRacersDefault: vi.fn().mockReturnValue(20),
}));
vi.mock('../../../modules/rowLayoutConfig.js', () => ({
  loadRowLayoutConfig: vi.fn().mockReturnValue({
    rowGapMultiplier: 1.5,
    maxCapacityFactor: 0.8,
  }),
}));
vi.mock('../../../modules/raceBehaviorConfig.js', () => ({
  loadRaceBehaviorConfig: vi.fn().mockReturnValue({ startSpreadRange: 0.8 }),
}));
vi.mock('../../../modules/storage/trackLoader.js', () => ({
  removeCachedTrackData: vi.fn(),
}));
vi.mock('../../../services/trackApi.js', () => ({
  deleteTrackFromServer: vi.fn(),
}));
vi.mock('../../../modules/track-editor/EditorShape.js', () => ({
  EditorShape: vi.fn().mockImplementation(() => ({
    getActualTrackWidth: vi.fn().mockReturnValue(200),
  })),
}));
vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: { TRACKS: 'racearena:tracks' },
  newId: vi.fn().mockReturnValue('new-test-id'),
}));

import { useStorage } from '../../../modules/storage/useStorage.js';
import { useServerTracksControl } from '../../../modules/storage/useServerTracks.js';
import { listTracks } from '../../../modules/track-editor/trackStorage.js';
import TrackManager from './TrackManager.jsx';

// ── test data ─────────────────────────────────────────────────────────────────

const DEFAULT_TRACK = {
  id: 'dirt-oval',
  name: 'Dirt Oval',
  icon: '🏁',
  geometryId: null,
  color: '#e63946',
  defaultDuration: 60,
  defaultWinners: 3,
  defaultRacerTypeId: 'horse',
  description: 'Classic dirt oval',
  worldWidth: 1280,
  worldHeight: 720,
  isDefault: true,
  maxRacers: null,
};

const SERVER_TRACK = {
  id: 'mogcvuipw2y5',
  name: 'Weltall',
  icon: '🚀',
  geometryId: 'custom-77bf44c4-aaf2-4163-aed9-7c0c68d66cc4',
  color: '#6c63ff',
  defaultDuration: 120,
  defaultWinners: 3,
  defaultRacerTypeId: 'horse',
  description: 'Space track',
  worldWidth: 6000,
  worldHeight: 4000,
  isDefault: false,
  maxRacers: null,
};

const LOCAL_TRACK_WITH_GEO = {
  id: 'local-track-1',
  name: 'My Local Track',
  icon: '🌿',
  geometryId: 'geo-abc123',
  color: '#22c55e',
  defaultDuration: 90,
  defaultWinners: 3,
  defaultRacerTypeId: 'horse',
  description: '',
  worldWidth: 1280,
  worldHeight: 720,
  isDefault: false,
  maxRacers: null,
};

function renderTrackManager({ localTracks = [], serverTracks = [] } = {}) {
  vi.mocked(useStorage).mockReturnValue([localTracks, vi.fn()]);
  vi.mocked(useServerTracksControl).mockReturnValue({
    tracks: serverTracks,
    refresh: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <TrackManager />
    </MemoryRouter>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('TrackManager — Edit behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Edit on a default track opens the metadata modal', () => {
    renderTrackManager({ localTracks: [DEFAULT_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText('Edit Track')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Edit on a server track opens the metadata modal (not the editor)', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText('Edit Track')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('modal shows "Edit Geometry" button for server tracks (which have a geometryId)', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText(/Edit Geometry/)).toBeInTheDocument();
  });

  it('"Edit Geometry" on server track navigates to /track-editor?load=<serverId>', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByText(/Edit Geometry/));

    expect(mockNavigate).toHaveBeenCalledWith(`/track-editor?load=${SERVER_TRACK.id}`);
  });

  it('modal shows "Draw Geometry" button for default tracks without geometry', () => {
    renderTrackManager({ localTracks: [DEFAULT_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText(/Draw Geometry/)).toBeInTheDocument();
  });

  it('"Draw Geometry" on a track without geometry navigates to /track-editor', () => {
    renderTrackManager({ localTracks: [DEFAULT_TRACK] });

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByText(/Draw Geometry/));

    expect(mockNavigate).toHaveBeenCalledWith('/track-editor');
  });

  it('"Edit Geometry" on a local track with geometry navigates to /track-editor?load=<geometryId>', () => {
    renderTrackManager({ localTracks: [LOCAL_TRACK_WITH_GEO] });

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByText(/Edit Geometry/));

    expect(mockNavigate).toHaveBeenCalledWith(
      `/track-editor?load=${LOCAL_TRACK_WITH_GEO.geometryId}`
    );
  });

  it('"Add Track" modal does not show a Track Editor button', () => {
    renderTrackManager({ localTracks: [DEFAULT_TRACK] });

    fireEvent.click(screen.getByText('+ Add Track'));

    expect(screen.getByText('Add Track', { selector: 'button' })).toBeInTheDocument();
    expect(screen.queryByText(/Edit Geometry|Draw Geometry/)).not.toBeInTheDocument();
  });
});

describe('TrackManager — Geometry dropdown after server-cache fix (L.6-Bug2)', () => {
  const SERVER_GEOMETRY = {
    id: SERVER_TRACK.geometryId,
    name: 'Weltall',
    backgroundImage: '/bg.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    worldWidth: 6000,
    worldHeight: 4000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('geometry dropdown shows server geometry option when listTracks returns it', () => {
    vi.mocked(listTracks).mockReturnValue([SERVER_GEOMETRY]);

    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByRole('option', { name: 'Weltall' })).toBeInTheDocument();
  });

  it('geometry dropdown value matches server track geometryId after edit', () => {
    vi.mocked(listTracks).mockReturnValue([SERVER_GEOMETRY]);

    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    // Track Geometry is the first <select> in the form; Default Racer Type is second
    const [geometrySelect] = screen.getAllByRole('combobox');
    expect(geometrySelect.value).toBe(SERVER_TRACK.geometryId);
  });
});

describe('TrackManager — Edit Geometry button placement (A1 UX fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Edit Geometry button appears inside the Track Geometry section', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    const geoLabel = screen.getByText('Track Geometry');
    const formGroup = geoLabel.closest('div');
    expect(within(formGroup).getByText(/Edit Geometry/)).toBeInTheDocument();
  });

  it('Edit Geometry button is NOT in the action row (Save/Cancel)', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    const actionRow = saveBtn.closest('div');
    expect(within(actionRow).queryByText(/Edit Geometry|Draw Geometry/)).toBeNull();
  });

  it('action row has exactly Save Changes and Cancel — no third button', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    const actionRow = saveBtn.closest('div');
    expect(within(actionRow).getAllByRole('button')).toHaveLength(2);
  });
});

describe('TrackManager — Track Editor hint text and no effects display (A2 UX fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('modal shows hint that background and effects are managed in the Track Editor', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(
      screen.getByText(/background image and effects are managed in the track editor/i)
    ).toBeInTheDocument();
  });

  it('modal does not show "Effects:" info text', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.queryByText(/^Effects:/)).toBeNull();
  });
});
