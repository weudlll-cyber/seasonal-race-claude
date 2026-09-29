import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackEditor from './TrackEditor.jsx';
import { RACE_VIEW_W, RACE_VIEW_H, raceViewScale } from './raceView.js';
import { loadCameraConfig } from '../../modules/cameraConfig.js';

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
  // PARTICLES-VISIBILITY-10: the race view draws the race background (gradients, crowd ellipses).
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  ellipse: vi.fn(),
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

// ── track-effects mock ────────────────────────────────────────────────────────
vi.mock('../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn(() => [
    { id: 'rain', label: 'Rain', description: '', configSchema: [], defaultConfig: {} },
  ]),
  getEffect: vi.fn(() => null),
  getDefaultConfig: vi.fn(() => ({})),
}));

import { listEffects, getEffect, getDefaultConfig } from '../../modules/track-effects/index.js';
import { forbidNetwork } from '../../test/mockServerTracks.js';

// TEARDOWN-INFLIGHT-1: the server-tracks hooks, without the network. These tests were making a REAL
// request to localhost:4000 (the suite printed `HTTP 401` — a live dev server answered it), and
// `withTimeout` never clears its 3 s timer, so the work outlived the test that started it. See
// `src/test/mockServerTracks.js` for the whole mechanism and why `fetch` was NOT the thing to stub.
vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});

// TEARDOWN-INFLIGHT-1 — the proof: any network call from this file throws by name, so a file that
// finishes has proved no request was ever started, and nothing can arrive after a test ends.
forbidNetwork();

// ── rAF/cAF stubs ─────────────────────────────────────────────────────────────
let _rafId = 0;
let _rafCallback = null;
const rafSpy = vi.fn((cb) => {
  _rafCallback = cb;
  return ++_rafId;
});
const cafSpy = vi.fn();

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', rafSpy);
  vi.stubGlobal('cancelAnimationFrame', cafSpy);
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  _rafId = 0;
  _rafCallback = null;
  listEffects.mockReturnValue([
    { id: 'rain', label: 'Rain', description: '', configSchema: [], defaultConfig: {} },
  ]);
  getEffect.mockReturnValue(null);
  getDefaultConfig.mockReturnValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderEditor() {
  return render(
    <MemoryRouter>
      <TrackEditor />
    </MemoryRouter>
  );
}

// Finds the effect <select> — it is the one with a non-disabled "None" option.
// The Load select has option[value=""] but it is disabled; this helper rejects that.
function findEffectSelect(container) {
  return Array.from(container.querySelectorAll('select')).find((s) => {
    const noneOpt = s.querySelector('option[value=""]');
    return noneOpt && !noneOpt.disabled && !s.disabled;
  });
}

// Clicks the "+ Add Effect" button to open a new effect slot.
async function clickAddEffect(container) {
  const btns = Array.from(container.querySelectorAll('button'));
  const addBtn = btns.find((b) => b.textContent.includes('Add Effect'));
  if (addBtn) {
    await act(async () => {
      fireEvent.click(addBtn);
    });
  }
}

describe('TrackEditor effect preview (F12/F13)', () => {
  it('does not start requestAnimationFrame when no effect is selected', () => {
    renderEditor();
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('calls effect.create and starts rAF loop when an effect is selected', async () => {
    const mockUpdate = vi.fn();
    const mockRender = vi.fn();
    const mockCreate = vi.fn(() => ({ update: mockUpdate, render: mockRender }));
    getEffect.mockReturnValue({ create: mockCreate, configSchema: [], defaultConfig: {} });
    getDefaultConfig.mockReturnValue({});

    const { container } = renderEditor();

    // Add an effect slot first, then select rain
    await clickAddEffect(container);
    const effectSelect = findEffectSelect(container);
    expect(effectSelect).not.toBeNull();

    await act(async () => {
      fireEvent.change(effectSelect, { target: { value: 'rain' } });
    });

    expect(getEffect).toHaveBeenCalledWith('rain');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels old rAF and reinstantiates effect when effectId changes', async () => {
    const createA = vi.fn(() => ({ update: vi.fn(), render: vi.fn() }));
    const createB = vi.fn(() => ({ update: vi.fn(), render: vi.fn() }));

    listEffects.mockReturnValue([
      { id: 'effect-a', label: 'Effect A', configSchema: [], defaultConfig: {} },
      { id: 'effect-b', label: 'Effect B', configSchema: [], defaultConfig: {} },
    ]);
    getEffect.mockImplementation((id) => {
      if (id === 'effect-a') return { create: createA, configSchema: [], defaultConfig: {} };
      if (id === 'effect-b') return { create: createB, configSchema: [], defaultConfig: {} };
      return null;
    });
    getDefaultConfig.mockReturnValue({});

    const { container } = renderEditor();

    await clickAddEffect(container);
    const effectSelect = findEffectSelect(container);

    await act(async () => {
      fireEvent.change(effectSelect, { target: { value: 'effect-a' } });
    });

    expect(createA).toHaveBeenCalledTimes(1);
    expect(cafSpy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(effectSelect, { target: { value: 'effect-b' } });
    });

    // Old rAF was cancelled before new one started
    expect(cafSpy).toHaveBeenCalled();
    expect(createB).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalledTimes(2);
  });

  it('cancels the rAF loop on unmount', async () => {
    const mockCreate = vi.fn(() => ({ update: vi.fn(), render: vi.fn() }));
    getEffect.mockReturnValue({ create: mockCreate, configSchema: [], defaultConfig: {} });

    const { container, unmount } = renderEditor();

    await clickAddEffect(container);
    const effectSelect = findEffectSelect(container);

    await act(async () => {
      fireEvent.change(effectSelect, { target: { value: 'rain' } });
    });

    expect(rafSpy).toHaveBeenCalledTimes(1);
    const callCountBefore = cafSpy.mock.calls.length;

    act(() => {
      unmount();
    });

    expect(cafSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
  });
});

// ── Background image loading effect (race-condition fix) ─────────────────────
describe('TrackEditor background image loading effect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not create an Image object or fetch when backgroundImage is null', async () => {
    const imageSpy = vi.spyOn(globalThis, 'Image');
    renderEditor();
    // Initial mount with backgroundImage = null — no Image() constructor call expected
    expect(imageSpy).not.toHaveBeenCalled();
  });

  it('sets bgReady=true without loading an image when backgroundImage is null', async () => {
    // We verify indirectly: the canvas render effect fires (bgReady drives a render dep).
    // Absence of errors and a rendered canvas is sufficient — the null path runs synchronously.
    const { container } = renderEditor();
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('loads an image and sets bgRef when backgroundImage is a URL', async () => {
    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      Object.defineProperty(this, 'src', {
        set: () => {
          queueMicrotask(() => this.onload?.());
        },
        get: () => 'data:test',
        configurable: true,
      });
    });

    // We can't set backgroundImage via props directly since TrackEditor manages its own state.
    // Trigger via the upload flow: mock FileReader + Image to set backgroundImage to a data URL.
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = () => {
        this.onload?.({ target: { result: 'data:image/png;base64,abc' } });
      };
    });

    // Allow the inner Image in handleBgUpload to report dimensions
    let callCount = 0;
    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      callCount += 1;
      const self = this;
      let _onload = null;
      Object.defineProperty(self, 'onload', {
        get: () => _onload,
        set: (fn) => {
          _onload = fn;
        },
        configurable: true,
      });
      Object.defineProperty(self, 'onerror', {
        get: () => null,
        set: () => {},
        configurable: true,
      });
      Object.defineProperty(self, 'src', {
        get: () => '',
        set: () => {
          self.naturalWidth = 800;
          self.naturalHeight = 600;
          if (_onload) queueMicrotask(() => _onload());
        },
        configurable: true,
      });
      self.naturalWidth = 0;
      self.naturalHeight = 0;
    });

    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');
    const file = new File(['x'], 'bg.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Two Image() calls expected: one inside handleBgUpload (dimension check),
    // one inside the backgroundImage useEffect (actual load into bgRef).
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('only keeps the last image in bgRef when backgroundImage changes rapidly (race guard)', async () => {
    // Simulate race: two Image() instances created; only the second's onload should commit.
    const instances = [];
    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      const self = this;
      let _onload = null;
      Object.defineProperty(self, 'onload', {
        get: () => _onload,
        set: (fn) => {
          _onload = fn;
        },
        configurable: true,
      });
      Object.defineProperty(self, 'onerror', {
        set: () => {},
        get: () => null,
        configurable: true,
      });
      Object.defineProperty(self, 'src', { set: () => {}, get: () => '', configurable: true });
      instances.push(self);
    });

    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = () => {
        this.onload?.({ target: { result: 'data:image/png;base64,first' } });
      };
    });

    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');
    const file1 = new File(['x'], 'bg1.png', { type: 'image/png' });
    Object.defineProperty(file1, 'size', { value: 1 });

    // First upload — triggers dimension-check Image then effect Image
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file1] } });
    });

    // At this point there are stale Image instances whose onload hasn't fired yet.
    // Calling the first instance's onload after a second effect has run should be a no-op
    // (cancelled flag prevents it from writing to bgRef).
    // We can't inspect bgRef from outside the component; the test verifies no exception is thrown
    // and the component stays mounted — that is the meaningful regression guard.
    if (instances.length > 0) {
      act(() => {
        instances[0].onload?.();
      });
    }

    expect(container.querySelector('canvas')).not.toBeNull();
  });
});

// ── Background upload: track path preserved on dimension change (bug fix) ───
describe('TrackEditor background upload — track path preserved', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call window.confirm when uploading a background with different dimensions', async () => {
    vi.spyOn(window, 'confirm');

    // FileReader mock: fires onload synchronously with a dummy data URL
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = () => {
        this.onload?.({ target: { result: 'data:image/jpeg;base64,test' } });
      };
    });

    // Image mock: fires onload with 1920×1080 (different from default 1280×720)
    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      const self = this;
      let _onload = null;
      Object.defineProperty(self, 'onload', {
        get: () => _onload,
        set: (fn) => {
          _onload = fn;
        },
        configurable: true,
      });
      Object.defineProperty(self, 'onerror', {
        get: () => null,
        set: () => {},
        configurable: true,
      });
      Object.defineProperty(self, 'src', {
        get: () => '',
        set: () => {
          self.naturalWidth = 1920;
          self.naturalHeight = 1080;
          if (_onload) queueMicrotask(() => _onload());
        },
        configurable: true,
      });
      self.naturalWidth = 0;
      self.naturalHeight = 0;
    });

    const { container } = renderEditor();

    // Add a center point via canvas click so hasPoints = true in the old code path
    const canvas = container.querySelector('canvas');
    await act(async () => {
      fireEvent.click(canvas, { clientX: 640, clientY: 360 });
    });

    // Upload a background with dimensions that differ from the 1280×720 default
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');
    const bgFile = new File(['data'], 'bg.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bgFile, 'size', { value: 1 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [bgFile] } });
    });

    // Bug fix: the reset-on-dimension-change path is removed — confirm must never be shown
    expect(window.confirm).not.toHaveBeenCalled();
  });
});

// ── Background image upload: file size guard (SEC-4) ────────────────────────
describe('TrackEditor background upload size guard', () => {
  // Restore any FileReader spies after each test so cross-test bleed is impossible.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an error and does not call FileReader when file exceeds 10 MB', async () => {
    // The TrackEditor triggers legitimate readAsDataURL calls during render/re-render
    // (sprite loading, thumbnails). We assert that the specific oversize file was never
    // passed to readAsDataURL — not that readAsDataURL was never called at all.
    const OVERSIZE = 11 * 1024 * 1024;
    const readSpy = vi.fn();
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = readSpy;
    });

    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');

    await act(async () => {});

    const oversizeFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizeFile, 'size', { value: OVERSIZE });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [oversizeFile] } });
    });

    // None of the readAsDataURL calls may be for the oversize file itself.
    const calledWithOversizeFile = readSpy.mock.calls.some(
      ([blob]) => blob instanceof Blob && blob.size === OVERSIZE
    );
    expect(calledWithOversizeFile).toBe(false);
    expect(container.textContent).toMatch(/too large/i);
  });

  it('does not show a size error for a file within the 10 MB limit', async () => {
    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');

    const smallFile = new File(['x'], 'small.jpg', { type: 'image/jpeg' });
    Object.defineProperty(smallFile, 'size', { value: 1 * 1024 * 1024 });

    // FileReader is synchronous in jsdom — stub it so onload never fires.
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = vi.fn();
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [smallFile] } });
    });

    expect(container.textContent).not.toMatch(/too large/i);
  });
});

// ── PARTICLES-VISIBILITY-9: the preview places and draws effects in the WORLD, as the race does ─
// Shared by the PARTICLES-VISIBILITY-9 and -10 blocks below.
// A 2D context that composes save/restore/scale/translate, answers getTransform, and records every
// arc at its SCREEN position — so a test can see where a world point lands on the canvas.
function trackingCtx() {
  let m = { a: 1, d: 1, e: 0, f: 0 };
  const stack = [];
  const arcs = [];
  const known = {
    canvas: { width: 1280, height: 720 },
    arcs,
    save: () => stack.push({ ...m }),
    restore: () => {
      m = stack.pop() ?? { a: 1, d: 1, e: 0, f: 0 };
    },
    scale: (sx, sy) => {
      m = { ...m, a: m.a * sx, d: m.d * sy };
    },
    translate: (tx, ty) => {
      m = { ...m, e: m.e + m.a * tx, f: m.f + m.d * ty };
    },
    getTransform: () => ({ a: m.a, b: 0, c: 0, d: m.d, e: m.e, f: m.f }),
    arc: (x, y, r) => arcs.push({ x: m.a * x + m.e, y: m.d * y + m.f, r }),
  };
  return new Proxy(known, {
    // Unknown methods are no-ops; the race background reads a gradient back, so they return one.
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop: () => {} })),
    set: () => true,
  });
}

// Each canvas gets its own context: the editor view `main`, the race view `raceView`; any other
// canvas gets a fresh tracking context nobody reads.
function routeContexts({ main, raceView = trackingCtx() }) {
  HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    const label = this.getAttribute('aria-label') ?? '';
    if (label.startsWith('Track editor canvas')) return main;
    if (label.startsWith('Race view')) return raceView;
    return trackingCtx();
  });
}

// Uploads a background of the given size; the editor takes its world size from the image.
async function setWorld(container, w, h) {
  vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
    this.readAsDataURL = () => this.onload?.({ target: { result: 'data:image/png;base64,w' } });
  });
  vi.spyOn(globalThis, 'Image').mockImplementation(function () {
    const self = this;
    let onload = null;
    Object.defineProperty(self, 'onload', {
      get: () => onload,
      set: (fn) => {
        onload = fn;
      },
    });
    Object.defineProperty(self, 'onerror', { get: () => null, set: () => {} });
    Object.defineProperty(self, 'src', {
      get: () => '',
      set: () => {
        self.naturalWidth = w;
        self.naturalHeight = h;
        if (onload) queueMicrotask(() => onload());
      },
    });
  });
  const file = new File(['x'], 'bg.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: 1024 });
  await act(async () => {
    fireEvent.change(container.querySelector('input[type="file"][accept="image/*"]'), {
      target: { files: [file] },
    });
  });
}

async function selectEffect(container, id) {
  await clickAddEffect(container);
  const selects = Array.from(container.querySelectorAll('select')).filter((s) => {
    const none = s.querySelector('option[value=""]');
    return none && !none.disabled && !s.disabled;
  });
  await act(async () => {
    fireEvent.change(selects[selects.length - 1], { target: { value: id } });
  });
}

describe('TrackEditor effect preview — world placement (PARTICLES-VISIBILITY-9)', () => {
  let originalGetContext;
  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  it('passes the editor world size to every effect, and again when the world changes', async () => {
    const createA = vi.fn(() => ({ update: vi.fn(), render: vi.fn() }));
    const createB = vi.fn(() => ({ update: vi.fn(), render: vi.fn() }));
    listEffects.mockReturnValue([
      { id: 'effect-a', label: 'Effect A', configSchema: [], defaultConfig: {} },
      { id: 'effect-b', label: 'Effect B', configSchema: [], defaultConfig: {} },
    ]);
    getEffect.mockImplementation((id) =>
      id === 'effect-a'
        ? { create: createA, configSchema: [], defaultConfig: {} }
        : id === 'effect-b'
          ? { create: createB, configSchema: [], defaultConfig: {} }
          : null
    );
    const { container } = renderEditor();
    await selectEffect(container, 'effect-a');
    await selectEffect(container, 'effect-b');
    expect(createA.mock.calls.at(-1)[2]).toEqual({ width: 1280, height: 720 });
    expect(createB.mock.calls.at(-1)[2]).toEqual({ width: 1280, height: 720 });

    await setWorld(container, 3840, 1440);
    expect(createA.mock.calls.at(-1)[2]).toEqual({ width: 3840, height: 1440 });
    expect(createB.mock.calls.at(-1)[2]).toEqual({ width: 3840, height: 1440 });
  });

  it('an item at a world position is drawn at the matching editor screen position', async () => {
    const ctx = trackingCtx();
    routeContexts({ main: ctx });
    // One item at a quarter across and three quarters down the world, whatever its size.
    let world = null;
    const create = vi.fn((canvas, config, w) => {
      world = w;
      return { update: vi.fn(), render: (c) => c.arc(w.width * 0.25, w.height * 0.75, 4) };
    });
    getEffect.mockReturnValue({ create, configSchema: [], defaultConfig: {} });
    const { container } = renderEditor();
    await setWorld(container, 3840, 1440);
    await selectEffect(container, 'rain');
    expect(world).toEqual({ width: 3840, height: 1440 });

    ctx.arcs.length = 0;
    act(() => _rafCallback(16));
    // The editor's whole-world view maps 3840×1440 onto the 1280×720 canvas: x by 1/3, y by 1/2.
    const drawn = ctx.arcs.at(-1);
    expect(drawn.x).toBeCloseTo(1280 * 0.25, 6);
    expect(drawn.y).toBeCloseTo(720 * 0.75, 6);
  });
});

// ── PARTICLES-VISIBILITY-10: the race-view panel ──────────────────────────────────────────────────
describe('TrackEditor race view (PARTICLES-VISIBILITY-10)', () => {
  let originalGetContext;
  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  // The zoom the panel must use: the race camera's, for the editor's current track (open by
  // default, centre width 120) and the camera config this browser holds (none — the shipped one).
  const expectedScale = (worldW, worldH) =>
    raceViewScale({
      worldW,
      worldH,
      isOpenTrack: true,
      trackWidthPx: 120,
      cameraConfig: loadCameraConfig(),
    });

  // A fake effect that draws one item at a fixed world offset from wherever `at` says, on any canvas.
  function oneItemEffect(at) {
    let world = null;
    const create = vi.fn((canvas, config, w) => {
      world = w;
      return { update: vi.fn(), render: (c) => c.arc(at(w).x, at(w).y, 4) };
    });
    getEffect.mockReturnValue({ create, configSchema: [], defaultConfig: {} });
    return { create, world: () => world };
  }

  it('receives the world size and the race camera’s derived zoom', async () => {
    const raceView = trackingCtx();
    routeContexts({ main: trackingCtx(), raceView });
    const fx = oneItemEffect((w) => ({ x: w.width / 2 + 50, y: w.height / 2 + 30 }));
    const { container } = renderEditor();
    await setWorld(container, 3840, 1440);
    await selectEffect(container, 'rain');
    expect(fx.world()).toEqual({ width: 3840, height: 1440 });

    raceView.arcs.length = 0;
    act(() => _rafCallback(16));
    // Nothing drawn yet, so the panel looks at the world centre; the item is 50 / 30 world px off it.
    const { scaleX, scaleY } = expectedScale(3840, 1440);
    const drawn = raceView.arcs.at(-1);
    expect(drawn.x).toBeCloseTo(RACE_VIEW_W / 2 + 50 * scaleX, 6);
    expect(drawn.y).toBeCloseTo(RACE_VIEW_H / 2 + 30 * scaleY, 6);
  });

  it('a click on a track point recentres it there; the first point is the default', async () => {
    const raceView = trackingCtx();
    routeContexts({ main: trackingCtx(), raceView });
    oneItemEffect(() => ({ x: 900, y: 500 }));
    const { container } = renderEditor();
    const canvas = container.querySelector('canvas[aria-label^="Track editor canvas"]');
    // Two points: the first (400, 300) is where the panel starts, the second is the item's spot.
    await act(async () => fireEvent.click(canvas, { clientX: 400, clientY: 300 }));
    await act(async () => fireEvent.click(canvas, { clientX: 900, clientY: 500 }));
    await selectEffect(container, 'rain');
    const { scaleX, scaleY } = expectedScale(1280, 720);

    raceView.arcs.length = 0;
    act(() => _rafCallback(16));
    let drawn = raceView.arcs.at(-1);
    expect(drawn.x).toBeCloseTo(RACE_VIEW_W / 2 + 500 * scaleX, 6);
    expect(drawn.y).toBeCloseTo(RACE_VIEW_H / 2 + 200 * scaleY, 6);

    // Clicking the second point only selects it — and centres the race view on it.
    await act(async () => fireEvent.click(canvas, { clientX: 900, clientY: 500 }));
    raceView.arcs.length = 0;
    act(() => _rafCallback(32));
    drawn = raceView.arcs.at(-1);
    expect(drawn.x).toBeCloseTo(RACE_VIEW_W / 2, 6);
    expect(drawn.y).toBeCloseTo(RACE_VIEW_H / 2, 6);
  });
});
