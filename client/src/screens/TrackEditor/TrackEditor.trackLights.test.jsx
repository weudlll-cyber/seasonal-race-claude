// ============================================================
// File:        TrackEditor.trackLights.test.jsx
// Path:        client/src/screens/TrackEditor/TrackEditor.trackLights.test.jsx
// Project:     RaceArena
// Description: Component tests for the Track Lights configuration section
//              in the Track Editor (color, style, speed, save wiring).
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
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

vi.mock('../../modules/track-effects/index.js', () => ({
  listEffects: vi.fn(() => []),
  getEffect: vi.fn(() => null),
  getDefaultConfig: vi.fn(() => ({})),
}));

vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn(() => 1)
);
vi.stubGlobal('cancelAnimationFrame', vi.fn());

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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

// ── Track Lights section presence ─────────────────────────────────────────────

describe('TrackEditor — Track Lights section', () => {
  it('renders the "Track Lights" heading', () => {
    renderEditor();
    expect(screen.getByText('Track Lights')).toBeTruthy();
  });

  it('renders a color input (type=color)', () => {
    const { container } = renderEditor();
    const colorInput = container.querySelector('input[type="color"]');
    expect(colorInput).not.toBeNull();
  });

  it('renders a Style dropdown with all four options', () => {
    const { container } = renderEditor();
    const styleSelect = container.querySelector('[data-testid="track-lights-style"]');
    expect(styleSelect).not.toBeNull();
    const optionValues = Array.from(styleSelect.options).map((o) => o.value);
    expect(optionValues).toContain('steady');
    expect(optionValues).toContain('sequence');
    expect(optionValues).toContain('sync_pulse');
    expect(optionValues).toContain('random_flash');
  });

  it('renders a Speed range input', () => {
    const { container } = renderEditor();
    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');
    expect(speedInput).not.toBeNull();
  });

  it('speed range has correct min/max/step', () => {
    const { container } = renderEditor();
    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');
    expect(Number(speedInput.min)).toBe(0.1);
    expect(Number(speedInput.max)).toBe(3.0);
    expect(Number(speedInput.step)).toBe(0.1);
  });

  it('speed slider is disabled when style is "steady"', async () => {
    const { container } = renderEditor();
    const styleSelect = container.querySelector('[data-testid="track-lights-style"]');

    await act(async () => {
      fireEvent.change(styleSelect, { target: { value: 'steady' } });
    });

    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');
    expect(speedInput.disabled).toBe(true);
  });

  it('speed slider is enabled when style is "sequence"', async () => {
    const { container } = renderEditor();
    const styleSelect = container.querySelector('[data-testid="track-lights-style"]');

    await act(async () => {
      fireEvent.change(styleSelect, { target: { value: 'sequence' } });
    });

    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');
    expect(speedInput.disabled).toBe(false);
  });

  it('speed slider is enabled when style is "sync_pulse"', async () => {
    const { container } = renderEditor();
    const styleSelect = container.querySelector('[data-testid="track-lights-style"]');

    await act(async () => {
      fireEvent.change(styleSelect, { target: { value: 'sync_pulse' } });
    });

    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');
    expect(speedInput.disabled).toBe(false);
  });

  it('changing style updates the select value', async () => {
    const { container } = renderEditor();
    const styleSelect = container.querySelector('[data-testid="track-lights-style"]');

    await act(async () => {
      fireEvent.change(styleSelect, { target: { value: 'sync_pulse' } });
    });

    expect(styleSelect.value).toBe('sync_pulse');
  });

  it('changing color updates the hex display', async () => {
    const { container } = renderEditor();
    const colorInput = container.querySelector('input[type="color"]');

    await act(async () => {
      fireEvent.change(colorInput, { target: { value: '#ff8844' } });
    });

    // The monospace hex span should reflect the new color
    const hexSpan =
      container.querySelector('span[style*="monospace"]') ??
      Array.from(container.querySelectorAll('span')).find((s) =>
        s.textContent.match(/^#[0-9a-fA-F]{6}$/)
      );
    expect(hexSpan).not.toBeNull();
    expect(hexSpan.textContent).toBe('#ff8844');
  });

  it('changing speed value shows updated display', async () => {
    const { container } = renderEditor();
    const speedInput = container.querySelector('[data-testid="track-lights-speed"]');

    await act(async () => {
      fireEvent.change(speedInput, { target: { value: '2.5' } });
    });

    // The speed display span should show "2.5×"
    const speedSpan = Array.from(container.querySelectorAll('span')).find((s) =>
      s.textContent.includes('×')
    );
    expect(speedSpan).not.toBeNull();
    expect(speedSpan.textContent).toBe('2.5×');
  });
});

// ── trackEditorSave.js — extractTrackLights ───────────────────────────────────

import { extractTrackLights } from './trackEditorSave.js';
import { DEFAULT_TRACK_LIGHTS } from '../../modules/trackLights.js';

describe('extractTrackLights', () => {
  it('returns DEFAULT_TRACK_LIGHTS when geometry.trackLights is missing', () => {
    expect(extractTrackLights({})).toEqual(DEFAULT_TRACK_LIGHTS);
  });

  it('returns DEFAULT_TRACK_LIGHTS when geometry.trackLights is null', () => {
    expect(extractTrackLights({ trackLights: null })).toEqual(DEFAULT_TRACK_LIGHTS);
  });

  it('returns stored trackLights merged with defaults when present', () => {
    const stored = { color: '#ff8844', style: 'sync_pulse', speed: 0.7 };
    const result = extractTrackLights({ trackLights: stored });
    expect(result).toMatchObject(stored);
  });

  it('fills in missing fields from DEFAULT_TRACK_LIGHTS', () => {
    const partial = { color: '#ff0000' };
    const result = extractTrackLights({ trackLights: partial });
    expect(result.color).toBe('#ff0000');
    expect(result.style).toBe(DEFAULT_TRACK_LIGHTS.style);
    expect(result.speed).toBe(DEFAULT_TRACK_LIGHTS.speed);
  });
});

// ── buildTrackFromEditorState — trackLights passthrough ───────────────────────

import { buildTrackFromEditorState } from './trackEditorSave.js';

const VALID_CENTER_POINTS = [
  { x: 100, y: 200 },
  { x: 400, y: 200 },
  { x: 400, y: 400 },
];

describe('buildTrackFromEditorState — trackLights', () => {
  it('includes trackLights in the built track (center mode)', () => {
    const lights = { color: '#3aa0ff', style: 'sequence', speed: 1.5 };
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: VALID_CENTER_POINTS,
      centerWidth: 100,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Test',
      backgroundImage: null,
      effects: [],
      trackLights: lights,
    });
    expect(result.trackLights).toMatchObject(lights);
  });

  it('falls back to DEFAULT_TRACK_LIGHTS when trackLights is not provided', () => {
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: VALID_CENTER_POINTS,
      centerWidth: 100,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Test',
      backgroundImage: null,
      effects: [],
    });
    expect(result.trackLights).toEqual(DEFAULT_TRACK_LIGHTS);
  });
});
