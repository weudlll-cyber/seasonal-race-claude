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
