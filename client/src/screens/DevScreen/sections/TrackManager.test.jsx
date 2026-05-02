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
  updateTrackOnServer: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../modules/surface-effects/useSurfaceClasses.js', () => ({
  useSurfaceClasses: () => ({
    classes: [
      { id: 'earth', label: 'Earth' },
      { id: 'grass', label: 'Grass' },
      { id: 'water', label: 'Water' },
    ],
    refresh: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../../modules/track-editor/EditorShape.js', () => ({
  // Use regular function (not arrow) so the mock can be called with `new`
  EditorShape: vi.fn().mockImplementation(function () {
    return { getActualTrackWidth: vi.fn().mockReturnValue(200) };
  }),
}));
vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: { TRACKS: 'racearena:tracks' },
  newId: vi.fn().mockReturnValue('new-test-id'),
}));

import { useStorage } from '../../../modules/storage/useStorage.js';
import { useServerTracksControl } from '../../../modules/storage/useServerTracks.js';
import { updateTrackOnServer } from '../../../services/trackApi.js';
import { listTracks } from '../../../modules/track-editor/trackStorage.js';
import { EditorShape } from '../../../modules/track-editor/EditorShape.js';
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
  // List API returns pointCount (not the arrays themselves — those are stripped by toSummary)
  pointCount: { inner: 3, outer: 3 },
};

// Default track after TLH-1 seeding — server record, no geometry drawn yet
const SERVER_TRACK_NO_GEO = {
  id: 'dirt-oval',
  name: 'Dirt Oval',
  icon: '🏟️',
  geometryId: null,
  color: '#c8a96e',
  defaultDuration: 60,
  defaultWinners: 3,
  defaultRacerTypeId: 'horse',
  description: 'Classic dirt oval',
  worldWidth: 1280,
  worldHeight: 720,
  isDefault: false,
  maxRacers: null,
  // List API returns pointCount; innerPoints/outerPoints are stripped by toSummary
  pointCount: { inner: 0, outer: 0 },
  surfaceClasses: ['earth'],
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

describe('TrackManager — TLH-2: Geometry status display for server tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('server track with geometry shows "Geometry: drawn (X pts)" status', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    const status = screen.getByTestId('geometry-status');
    const expectedPts = SERVER_TRACK.pointCount.inner + SERVER_TRACK.pointCount.outer;
    expect(status.textContent).toBe(`Geometry: drawn (${expectedPts} pts)`);
  });

  it('server track without geometry shows "Geometry: not yet drawn" status', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK_NO_GEO] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByTestId('geometry-status').textContent).toBe('Geometry: not yet drawn');
  });

  it('server track with geometry shows "Edit Geometry" button', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByTestId('track-geometry-btn').textContent).toMatch(/Edit Geometry/);
  });

  it('server track without geometry shows "Draw Geometry" button', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK_NO_GEO] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByTestId('track-geometry-btn').textContent).toMatch(/Draw Geometry/);
  });

  it('"Edit Geometry" on server track with geometry navigates to /track-editor?load=<serverId>', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByTestId('track-geometry-btn'));

    expect(mockNavigate).toHaveBeenCalledWith(`/track-editor?load=${SERVER_TRACK.id}`);
  });

  it('"Draw Geometry" on server track without geometry navigates to /track-editor?load=<serverId>', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK_NO_GEO] });
    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByTestId('track-geometry-btn'));

    expect(mockNavigate).toHaveBeenCalledWith(`/track-editor?load=${SERVER_TRACK_NO_GEO.id}`);
  });

  it('no geometry dropdown visible for server tracks', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    // Only the Default Racer Type combobox should remain — no geometry select
    const combos = screen.getAllByRole('combobox');
    expect(combos).toHaveLength(1);
    expect(combos[0]).toHaveDisplayValue(/horse/i);
  });
});

describe('TrackManager — Edit Geometry button placement (A1 UX fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('geometry button appears inside the Track Geometry section', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));

    const geoLabel = screen.getByText('Track Geometry');
    const formGroup = geoLabel.closest('div');
    expect(within(formGroup).getByTestId('track-geometry-btn')).toBeInTheDocument();
  });

  it('geometry button is NOT in the action row (Save/Cancel)', () => {
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

describe('TrackManager — surface class pills (VRE-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surface-class pills container is present when edit form is open', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('track-surface-class-pills')).toBeInTheDocument();
  });

  it('renders 3 pill buttons from mocked surface classes', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    const pillContainer = screen.getByTestId('track-surface-class-pills');
    const pills = within(pillContainer).getAllByRole('button');
    expect(pills).toHaveLength(3);
  });

  it('Save Changes is disabled when no surface classes selected (server track with none)', () => {
    // SERVER_TRACK has no surfaceClasses field → handleEdit initialises to []
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveBtn.disabled).toBe(true);
  });

  it('shows error hint when no surface class is selected', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByText(/At least one surface class is required/i)).toBeInTheDocument();
  });

  it('Save Changes becomes enabled after selecting a surface class pill', () => {
    renderTrackManager({ serverTracks: [SERVER_TRACK] });
    fireEvent.click(screen.getByTitle('Edit'));
    const pillContainer = screen.getByTestId('track-surface-class-pills');
    const firstPill = within(pillContainer).getAllByRole('button')[0];
    fireEvent.click(firstPill);
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveBtn.disabled).toBe(false);
  });

  it('Add Track button is disabled when surfaceClasses is empty (BLANK form)', () => {
    renderTrackManager({ localTracks: [DEFAULT_TRACK] });
    fireEvent.click(screen.getByText('+ Add Track'));
    const addBtn = screen.getByText('Add Track', { selector: 'button' });
    // Disabled because name is also empty in BLANK form — but surfaceClasses is also empty
    expect(addBtn.disabled).toBe(true);
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

// ── VRE-3 Bug Fix: Server-Track Save must use PUT API ─────────────────────────

const SERVER_TRACK_WITH_CLASSES = {
  ...SERVER_TRACK,
  surfaceClasses: ['air'],
};

describe('TrackManager — handleSave routes correctly for server vs local tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTrackOnServer).mockResolvedValue({});
  });

  it('Save on a server track calls updateTrackOnServer, not setTracks', async () => {
    const setTracksMock = vi.fn();
    vi.mocked(useStorage).mockReturnValue([[], setTracksMock]);
    const refreshMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useServerTracksControl).mockReturnValue({
      tracks: [SERVER_TRACK_WITH_CLASSES],
      refresh: refreshMock,
    });

    render(
      <MemoryRouter>
        <TrackManager />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    // Let async handleSave complete
    await vi.waitFor(() => expect(updateTrackOnServer).toHaveBeenCalled());
    expect(updateTrackOnServer).toHaveBeenCalledWith(
      SERVER_TRACK_WITH_CLASSES.id,
      expect.objectContaining({ surfaceClasses: ['air'] })
    );
    // setTracks (localStorage write) must NOT have been called for the save
    expect(setTracksMock).not.toHaveBeenCalled();
    // Refresh must follow to sync UI
    expect(refreshMock).toHaveBeenCalled();
  });

  it('Save on a local track writes to localStorage, does not call updateTrackOnServer', async () => {
    const setTracksMock = vi.fn();
    vi.mocked(useStorage).mockReturnValue([[LOCAL_TRACK_WITH_GEO], setTracksMock]);
    vi.mocked(useServerTracksControl).mockReturnValue({
      tracks: [],
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TrackManager />
      </MemoryRouter>
    );

    // LOCAL_TRACK_WITH_GEO has no surfaceClasses → initialised to [] → Save disabled
    // Simulate the edit by clicking then toggling a surface class pill first
    fireEvent.click(screen.getByTitle('Edit'));
    const pill = within(screen.getByTestId('track-surface-class-pills')).getAllByRole('button')[0];
    fireEvent.click(pill);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(setTracksMock).toHaveBeenCalled();
    expect(updateTrackOnServer).not.toHaveBeenCalled();
  });

  it('shows inline error message when server PUT fails', async () => {
    vi.mocked(updateTrackOnServer).mockRejectedValue(new Error('Network error'));
    vi.mocked(useStorage).mockReturnValue([[], vi.fn()]);
    vi.mocked(useServerTracksControl).mockReturnValue({
      tracks: [SERVER_TRACK_WITH_CLASSES],
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TrackManager />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await vi.waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
    // Form stays open — user can retry
    expect(screen.getByText('Edit Track')).toBeInTheDocument();
  });
});

// ── toSummary regression guard: geometry source must be cache, not server summary ──────────────

describe('TrackManager — handleEdit geometry source (toSummary regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Edit on server track with geometry uses cached geometry for EditorShape, not server summary', () => {
    // Simulates a real server track: has pathLengthPx (so autoMaxRacers proceeds past the guard),
    // but toSummary has stripped innerPoints/outerPoints — only pointCount is present.
    const serverTrackWithPath = { ...SERVER_TRACK, pathLengthPx: 3244 };

    // The cached geometry from listTracks() has the full innerPoints/outerPoints.
    const cachedGeo = {
      id: SERVER_TRACK.geometryId,
      pathLengthPx: 3244,
      innerPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      outerPoints: [
        { x: -10, y: -10 },
        { x: 110, y: -10 },
        { x: 110, y: 110 },
      ],
    };
    vi.mocked(listTracks).mockReturnValue([cachedGeo]);

    renderTrackManager({ serverTracks: [serverTrackWithPath] });
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText('Edit Track')).toBeInTheDocument();
    // EditorShape must be called with the cached geometry (has innerPoints),
    // NOT with the server summary (has pointCount but no innerPoints).
    expect(EditorShape).toHaveBeenCalledWith(
      expect.objectContaining({ id: cachedGeo.id, pathLengthPx: 3244 })
    );
    expect(EditorShape).not.toHaveBeenCalledWith(
      expect.objectContaining({ pointCount: expect.any(Object) })
    );
  });

  it('Edit on server track without geometry opens modal without crashing (autoMax = null)', () => {
    // SERVER_TRACK_NO_GEO has geometryId: null → geom = null → autoMaxRacers returns null
    renderTrackManager({ serverTracks: [SERVER_TRACK_NO_GEO] });

    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText('Edit Track')).toBeInTheDocument();
    // EditorShape must NOT be called when there is no geometry
    expect(EditorShape).not.toHaveBeenCalled();
  });
});
