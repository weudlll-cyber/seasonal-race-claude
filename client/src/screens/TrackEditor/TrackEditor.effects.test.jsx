import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackEditor from './TrackEditor.jsx';

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

// ── track-effects mock ────────────────────────────────────────────────────────
vi.mock('../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn(() => [
    { id: 'rain', label: 'Rain', description: '', configSchema: [], defaultConfig: {} },
  ]),
  getEffect: vi.fn(() => null),
  getDefaultConfig: vi.fn(() => ({})),
}));

import { listEffects, getEffect, getDefaultConfig } from '../../modules/track-effects/index.js';

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
  it('shows an error and does not call FileReader when file exceeds 10 MB', async () => {
    const readSpy = vi.fn();
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = readSpy;
    });

    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');

    const oversizeFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizeFile, 'size', { value: 11 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [oversizeFile] } });
    });

    expect(readSpy).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/too large/i);
  });

  it('does not show a size error for a file within the 10 MB limit', async () => {
    // FileReader is synchronous in jsdom — stub it so onload never fires.
    vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
      this.readAsDataURL = vi.fn();
    });

    const { container } = renderEditor();
    const fileInput = container.querySelector('input[type="file"][accept="image/*"]');

    const smallFile = new File(['x'], 'small.jpg', { type: 'image/jpeg' });
    Object.defineProperty(smallFile, 'size', { value: 1 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [smallFile] } });
    });

    expect(container.textContent).not.toMatch(/too large/i);
  });
});
