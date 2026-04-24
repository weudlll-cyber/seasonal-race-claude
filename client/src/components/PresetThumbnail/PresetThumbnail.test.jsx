import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PresetThumbnail from './PresetThumbnail.jsx';

// ── Minimal geometry fixture ─────────────────────────────────────────────────
const N = 8;
const makeCircle = (cx, cy, r) =>
  Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

const TEST_GEOM = {
  id: 'test-geom',
  name: 'Test',
  closed: true,
  backgroundImage: null,
  innerPoints: makeCircle(640, 360, 150),
  outerPoints: makeCircle(640, 360, 280),
  effectId: null,
  effectConfig: {},
};

// ── Module mocks ─────────────────────────────────────────────────────────────
vi.mock('../../modules/track-editor/trackStorage.js', () => ({
  getTrack: vi.fn(),
}));

vi.mock('../../modules/track-effects/bgImageCache.js', () => ({
  getBackgroundImage: vi.fn(() => null),
}));

import { getTrack } from '../../modules/track-editor/trackStorage.js';

// ── Canvas mock (jsdom lacks full 2-D context) ────────────────────────────────
function mockCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: '',
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  return ctx;
}

describe('PresetThumbnail', () => {
  let ctx;
  beforeEach(() => {
    ctx = mockCanvas();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a canvas element with the given dimensions', () => {
    getTrack.mockReturnValue(null);
    const { container } = render(<PresetThumbnail geometryId={null} width={120} height={68} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas.width).toBe(120);
    expect(canvas.height).toBe(68);
  });

  it('fills with placeholder color when geometryId is null', () => {
    const { container } = render(<PresetThumbnail geometryId={null} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    // getContext should have been called; fillRect draws the placeholder
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('fills with placeholder when getTrack returns null', () => {
    getTrack.mockReturnValue(null);
    render(<PresetThumbnail geometryId="missing-id" />);
    expect(getTrack).toHaveBeenCalledWith('missing-id');
    expect(ctx.fillRect).toHaveBeenCalled();
    // No center-line drawn (no stroke call expected beyond placeholder)
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws center-line when geometry is found', () => {
    getTrack.mockReturnValue(TEST_GEOM);
    render(<PresetThumbnail geometryId="test-geom" />);
    expect(getTrack).toHaveBeenCalledWith('test-geom');
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('re-renders when geometryId changes', () => {
    getTrack.mockReturnValue(null);
    const { rerender } = render(<PresetThumbnail geometryId={null} />);
    const callsBefore = ctx.fillRect.mock.calls.length;

    getTrack.mockReturnValue(TEST_GEOM);
    act(() => {
      rerender(<PresetThumbnail geometryId="test-geom" />);
    });
    // fillRect or stroke called again in the new render
    expect(ctx.fillRect.mock.calls.length + ctx.stroke.mock.calls.length).toBeGreaterThan(
      callsBefore
    );
  });

  it('does not crash when getTrack returns undefined', () => {
    getTrack.mockReturnValue(undefined);
    expect(() => render(<PresetThumbnail geometryId="whatever" />)).not.toThrow();
  });
});
