// ============================================================
// File:        TrackEditor.drafts.test.jsx
// Path:        client/src/screens/TrackEditor/TrackEditor.drafts.test.jsx
// Project:     RaceArena — PARTICLES-VISIBILITY-13 piece A
// Description: "An unsaved track … was found" appears ONLY when there are unsaved changes, and for
//              the track they belong to. Each case the owner's report named: a fresh editor; a
//              stored track loaded and left unchanged (and the reload that follows); a stored track
//              changed and left unsaved; changed and saved; a new unsaved track; and a stale draft
//              equal to the saved track, which the old keying left in every browser.
// ============================================================
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackEditor from './TrackEditor.jsx';
import { draftKeyFor, saveDraft } from './trackEditorDraft.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';

const DIRT_OVAL = SAMPLE_TRACKS.find((t) => t.name === 'Dirt Oval');

const ctxStub = new Proxy(
  { canvas: { width: 1280, height: 720 } },
  {
    get: (t, k) =>
      k in t
        ? t[k]
        : k === 'getTransform'
          ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
          : () => ({ addColorStop: () => {} }),
    set: () => true,
  }
);

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

vi.mock('../../modules/storage/useServerTracks.js', () => ({ useServerTracksControl: vi.fn() }));
vi.mock('../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn(() => []),
  getEffect: vi.fn(() => null),
  getDefaultConfig: vi.fn(() => ({})),
}));
vi.mock('../../modules/storage/trackLoader.js', () => ({
  cacheTrackGeometry: vi.fn().mockResolvedValue({}),
  removeCachedTrackData: vi.fn(),
}));
const mockUpdate = vi
  .fn()
  .mockResolvedValue({ id: DIRT_OVAL.id, geometryId: 'custom-geo-existing' });
vi.mock('../../services/trackApi.js', () => ({
  updateTrackOnServer: (...a) => mockUpdate(...a),
  createTrackOnServer: vi.fn().mockResolvedValue({ id: 'new-id', geometryId: 'custom-123' }),
  deleteTrackFromServer: vi.fn().mockResolvedValue(undefined),
  uploadTrackBackground: vi.fn().mockResolvedValue({ backgroundImageFile: 'bg.jpg' }),
  removeTrackBackground: vi.fn().mockResolvedValue(undefined),
}));

import { useServerTracksControl } from '../../modules/storage/useServerTracks.js';

// A stored track with geometry, as the server and the geometry cache hold it.
const TRACK = {
  id: DIRT_OVAL.id,
  name: 'Dirt Oval',
  geometryId: 'custom-geo-existing',
  closed: true,
  backgroundImageFile: `${DIRT_OVAL.id}.jpg`,
  worldWidth: 1280,
  worldHeight: 720,
  surfaceClasses: ['earth'],
  trackLights: { color: '#d4790a', style: 'sequence', speed: 1.2 },
  centerPoints: [],
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
const GEOMETRY = { ...TRACK, id: TRACK.geometryId, backgroundImage: null };

const draftKeys = () =>
  Object.keys(localStorage)
    .filter((k) => k.startsWith('racearena:trackEditor:draft'))
    .sort();

let confirmSpy;
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(useServerTracksControl).mockReturnValue({
    tracks: [TRACK],
    refresh: vi.fn().mockResolvedValue(undefined),
  });
  localStorage.setItem(`racearena:trackGeometries:${GEOMETRY.id}`, JSON.stringify(GEOMETRY));
  localStorage.setItem('racearena:trackGeometries:index', JSON.stringify([GEOMETRY.id]));
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
});

const offered = () =>
  confirmSpy.mock.calls.filter(([m]) => String(m).startsWith('An unsaved track')).length;

async function open(url) {
  const r = render(
    <MemoryRouter initialEntries={[url]}>
      <TrackEditor />
    </MemoryRouter>
  );
  if (url.includes('load=')) {
    await waitFor(() =>
      expect(screen.getByTestId('editor-title').textContent).toBe('Editing: Dirt Oval')
    );
  }
  await act(async () => {});
  return r;
}
const leave = (r) => r.unmount();
async function addPoint(x, y) {
  const canvas = document.querySelector('canvas[aria-label^="Track editor canvas"]');
  await act(async () => fireEvent.click(canvas, { clientX: x, clientY: y }));
}

describe('"An unsaved track … was found" — only for unsaved changes, and for their own track', () => {
  it('1 a fresh editor: no message, nothing written', async () => {
    leave(await open('/track-editor'));
    expect(offered()).toBe(0);
    expect(draftKeys()).toEqual([]);
  });

  it('2 a stored track loaded and left unchanged: nothing written, no message after — nor on a reload', async () => {
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(draftKeys()).toEqual([]);
    leave(await open('/track-editor')); // a fresh editor — what a reload of the cleared address opens
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(offered()).toBe(0);
  });

  it('3 a stored track changed and left unsaved: its OWN draft, offered for that track and nowhere else', async () => {
    const r = await open(`/track-editor?load=${TRACK.id}`);
    await addPoint(500, 500);
    expect(draftKeys()).toEqual([draftKeyFor(TRACK.id)]);
    leave(r);
    leave(await open('/track-editor'));
    expect(offered()).toBe(0); // not offered to a fresh editor
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(offered()).toBe(1); // offered for its own track
  });

  it('4 changed and saved: the draft is retired, no message after', async () => {
    const r = await open(`/track-editor?load=${TRACK.id}`);
    await addPoint(500, 500);
    expect(draftKeys()).toEqual([draftKeyFor(TRACK.id)]);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Save$/ })));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await waitFor(() => expect(draftKeys()).toEqual([]));
    leave(r);
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(offered()).toBe(0);
  });

  it('5 a new unsaved track: offered back to the next fresh editor', async () => {
    const r = await open('/track-editor');
    await addPoint(300, 200);
    await addPoint(600, 300);
    expect(draftKeys()).toEqual([draftKeyFor(null)]);
    leave(r);
    leave(await open('/track-editor'));
    expect(offered()).toBe(1);
  });

  it('6 a stale draft EQUAL to the saved track (what every old load wrote) is dropped without asking', async () => {
    const drafted = { ...TRACK, trackName: TRACK.name, centerWidth: 120 };
    saveDraft(drafted, localStorage, null); // the old copy under the new-track key
    saveDraft(drafted, localStorage, TRACK.id); // and under the track's own key
    leave(await open('/track-editor'));
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(offered()).toBe(0);
    expect(draftKeys()).toEqual([]);
  });

  it('7 a new track’s draft is not offered when a stored track is opened — it is not that track’s', async () => {
    const r = await open('/track-editor');
    await addPoint(300, 200);
    await addPoint(600, 300);
    leave(r);
    leave(await open(`/track-editor?load=${TRACK.id}`));
    expect(offered()).toBe(0);
    expect(draftKeys()).toEqual([draftKeyFor(null)]); // still there for the next fresh editor
  });
});
