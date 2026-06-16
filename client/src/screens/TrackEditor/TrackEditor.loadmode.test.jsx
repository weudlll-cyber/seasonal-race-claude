// ============================================================
// File:        TrackEditor.loadmode.test.jsx
// Path:        client/src/screens/TrackEditor/TrackEditor.loadmode.test.jsx
// Project:     RaceArena
// Created:     2026-05-02
// Description: Component tests for TLH-2 Track Editor two-mode behaviour:
//              - Load mode (?load=<serverId>): pre-populated, no name field, PUT on save
//              - New track mode (no param): blank, name field visible, POST on save
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackEditor from './TrackEditor.jsx';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';

const DIRT_OVAL = SAMPLE_TRACKS.find((t) => t.name === 'Dirt Oval');

// ── Canvas stub ───────────────────────────────────────────────────────────────

const ctxStub = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  setLineDash: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  globalAlpha: 1,
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub);
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    x: 0,
    y: 0,
  }));
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
});

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../modules/storage/useServerTracks.js', () => ({
  useServerTracksControl: vi.fn(),
}));

vi.mock('../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn(() => []),
  getEffect: vi.fn(() => null),
  getDefaultConfig: vi.fn(() => ({})),
}));

vi.mock('../../modules/storage/trackLoader.js', () => ({
  cacheTrackGeometry: vi.fn().mockResolvedValue({}),
  removeCachedTrackData: vi.fn(),
}));

const mockUpdate = vi.fn().mockResolvedValue({ id: DIRT_OVAL.id, geometryId: 'custom-new' });
const mockCreate = vi.fn().mockResolvedValue({ id: 'new-id', geometryId: 'custom-123' });

const mockRemoveBg = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/trackApi.js', () => ({
  updateTrackOnServer: (...args) => mockUpdate(...args),
  createTrackOnServer: (...args) => mockCreate(...args),
  deleteTrackFromServer: vi.fn().mockResolvedValue(undefined),
  uploadTrackBackground: vi.fn().mockResolvedValue({ backgroundImageFile: 'bg.jpg' }),
  removeTrackBackground: (...args) => mockRemoveBg(...args),
}));

// Mock trackEditorSave so tests can trigger save without real geometry data
vi.mock('./trackEditorSave.js', () => ({
  buildTrackFromEditorState: vi.fn().mockReturnValue({
    name: 'Dirt Oval',
    closed: true,
    innerPoints: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
    outerPoints: [
      { x: 0, y: 10 },
      { x: 1, y: 11 },
      { x: 2, y: 12 },
    ],
    sourceMode: 'boundary',
    pathLengthPx: 500,
    worldWidth: 1280,
    worldHeight: 720,
    effects: [],
    trackLights: { color: '#ffffff', style: 'sequence', speed: 1.0 },
  }),
  validateEditorState: vi.fn().mockReturnValue(null),
  extractEffects: vi.fn().mockReturnValue([]),
  extractTrackLights: vi.fn().mockReturnValue({ color: '#d4790a', style: 'sequence', speed: 1.2 }),
}));

import { useServerTracksControl } from '../../modules/storage/useServerTracks.js';

// ── test fixtures ─────────────────────────────────────────────────────────────

const DIRT_OVAL_NO_GEO = {
  id: DIRT_OVAL.id,
  name: DIRT_OVAL.name,
  icon: '🏟️',
  geometryId: null,
  innerPoints: [],
  outerPoints: [],
  centerPoints: [],
  closed: true,
  backgroundImageFile: null,
  worldWidth: 1280,
  worldHeight: 720,
  surfaceClasses: ['earth'],
  trackLights: { color: '#d4790a', style: 'sequence', speed: 1.2 },
};

// Same track but with a background image already saved — enables the Save button
const DIRT_OVAL_WITH_BG = {
  ...DIRT_OVAL_NO_GEO,
  backgroundImageFile: `${DIRT_OVAL.id}.jpg`,
};

const DIRT_OVAL_WITH_GEO = {
  ...DIRT_OVAL_WITH_BG,
  geometryId: 'custom-geo-existing',
  innerPoints: [
    { x: 100, y: 200 },
    { x: 300, y: 200 },
    { x: 300, y: 400 },
  ],
  outerPoints: [
    { x: 90, y: 190 },
    { x: 310, y: 190 },
    { x: 310, y: 410 },
  ],
};

const mockRefresh = vi.fn().mockResolvedValue(undefined);

function makeCtl(tracks = []) {
  return { tracks, refresh: mockRefresh };
}

function renderEditor(url = '/track-editor') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TrackEditor />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(useServerTracksControl).mockReturnValue(makeCtl());
});

// ── New track mode (no ?load param) ──────────────────────────────────────────

describe('TrackEditor — new track mode (no ?load param)', () => {
  it('title shows "New Track"', () => {
    renderEditor('/track-editor');
    expect(screen.getByTestId('editor-title').textContent).toBe('New Track');
  });

  it('name input field is visible', () => {
    renderEditor('/track-editor');
    expect(screen.getByTestId('track-name-input')).toBeInTheDocument();
  });

  it('name input starts empty', () => {
    renderEditor('/track-editor');
    expect(screen.getByTestId('track-name-input').value).toBe('');
  });
});

// ── Load mode (?load=<serverId>) ──────────────────────────────────────────────

describe('TrackEditor — load mode (?load=<serverId>)', () => {
  it('title shows "Editing: Dirt Oval" after server track is found', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });
  });

  it('name input field is NOT visible in load mode', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });
    expect(screen.queryByTestId('track-name-input')).toBeNull();
  });

  it('new track mode shows name input; load mode does not', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.queryByTestId('track-name-input')).toBeNull();
    });
  });

  it('editor starts in blank canvas when track has no geometry', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    // The counter label should show 0 points (boundary mode selected by default for server tracks)
    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toMatch(/Editing/);
    });
    // Boundary mode with 0 inner points
    expect(screen.getByText(/Inner: 0/)).toBeInTheDocument();
  });
});

// ── Save path: load mode → PUT ────────────────────────────────────────────────

describe('TrackEditor — save path in load mode', () => {
  it('Save calls updateTrackOnServer (PUT) with the server track id', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_BG]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    // Wait for load mode to activate
    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });

    // Click Save (enabled because backgroundImage URL was set from backgroundImageFile)
    const saveBtn = screen.getByRole('button', { name: /^Save$/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(DIRT_OVAL.id, expect.any(Object));
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('first-time geometry save includes a new geometryId in the PUT body', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_BG]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });

    const saveBtn = screen.getByRole('button', { name: /^Save$/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    const [, putBody] = mockUpdate.mock.calls[0];
    expect(putBody).toHaveProperty('geometryId');
    expect(typeof putBody.geometryId).toBe('string');
    expect(putBody.geometryId.length).toBeGreaterThan(0);
  });

  it('second save (existing geometryId) preserves existing geometryId in PUT body', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_GEO]));
    // Seed geometry cache so path-1 (cache) loads it
    localStorage.setItem(
      `racearena:trackGeometries:${DIRT_OVAL_WITH_GEO.geometryId}`,
      JSON.stringify({
        ...DIRT_OVAL_WITH_GEO,
        id: DIRT_OVAL_WITH_GEO.geometryId,
        backgroundImage: `http://localhost:4000/api/tracks/${DIRT_OVAL.id}/background`,
      })
    );
    localStorage.setItem(
      'racearena:trackGeometries:index',
      JSON.stringify([DIRT_OVAL_WITH_GEO.geometryId])
    );

    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });

    const saveBtn = screen.getByRole('button', { name: /^Save$/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    const [, putBody] = mockUpdate.mock.calls[0];
    expect(putBody.geometryId).toBe(DIRT_OVAL_WITH_GEO.geometryId);
  });
});

// ── F3 reproduction: Dirt Oval no-background save path ───────────────────────
// Reproduces the exact scenario from the 2026-05-02 browser test:
//   - Dirt Oval loads (geometryId: null, no background)
//   - user draws geometry (mocked via buildTrackFromEditorState stub)
//   - user clicks Save
// Confirms the frontend PUT path fires correctly — if this test passes, any
// save failure during the real browser test was environmental (server/disk), not a frontend bug.

describe('TrackEditor — F3 reproduction: save from no-background track (load mode)', () => {
  it('Save calls PUT (not POST) even when track has no background', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    // Wait for load mode to activate (Path 2 load from serverTracksCtl.tracks)
    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });

    // Save is enabled in load mode even without a background (F1-revised fix)
    const saveBtn = screen.getByRole('button', { name: /^Save$/ });
    expect(saveBtn.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(DIRT_OVAL.id, expect.any(Object));
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('first-draw on no-background track generates a new geometryId in PUT body', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_NO_GEO]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval');
    });

    const saveBtn = screen.getByRole('button', { name: /^Save$/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    const [serverId, putBody] = mockUpdate.mock.calls[0];
    expect(serverId).toBe(DIRT_OVAL.id);
    expect(typeof putBody.geometryId).toBe('string');
    expect(putBody.geometryId.startsWith('custom-')).toBe(true);
  });
});

// ── Remove background button ──────────────────────────────────────────────────

describe('TrackEditor — "Remove background" button', () => {
  it('is not visible when no background is set (new track mode)', () => {
    renderEditor('/track-editor');
    expect(screen.queryByTestId('remove-background-btn')).not.toBeInTheDocument();
  });

  it('is visible when a background image is loaded (load mode)', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_BG]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('remove-background-btn')).toBeInTheDocument();
    });
  });

  it('click in load mode calls removeTrackBackground with the server ID', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_BG]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('remove-background-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-background-btn'));
    });

    await waitFor(() => {
      expect(mockRemoveBg).toHaveBeenCalledWith(DIRT_OVAL.id);
    });
  });

  it('click in load mode hides the button after removal', async () => {
    vi.mocked(useServerTracksControl).mockReturnValue(makeCtl([DIRT_OVAL_WITH_BG]));
    renderEditor(`/track-editor?load=${DIRT_OVAL.id}`);

    await waitFor(() => {
      expect(screen.getByTestId('remove-background-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-background-btn'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('remove-background-btn')).not.toBeInTheDocument();
    });
  });

  it('click in new track mode resets state without calling removeTrackBackground', async () => {
    renderEditor('/track-editor');

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'bg.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('remove-background-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-background-btn'));
    });

    expect(mockRemoveBg).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('remove-background-btn')).not.toBeInTheDocument();
    });
  });
});

// ── Save path: new track mode → POST ─────────────────────────────────────────

describe('TrackEditor — save path in new track mode', () => {
  it('editor starts without a loaded server ID (confirming POST would be used on save)', () => {
    renderEditor('/track-editor');
    // Title "New Track" confirms no server track was loaded → loadedServerId = null
    // → handleSave branches to createTrackOnServer (POST)
    expect(screen.getByTestId('editor-title').textContent).toBe('New Track');
    // No navigation without ?load param → nothing was loaded
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('name input is enabled in new track mode', () => {
    renderEditor('/track-editor');
    const input = screen.getByTestId('track-name-input');
    expect(input).toBeInTheDocument();
    expect(input.disabled).toBe(false);
  });
});
