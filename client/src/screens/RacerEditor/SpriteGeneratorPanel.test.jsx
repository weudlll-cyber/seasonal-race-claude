// ============================================================
// File:        SpriteGeneratorPanel.test.jsx
// Path:        client/src/screens/RacerEditor/SpriteGeneratorPanel.test.jsx
// Project:     RaceArena
// Description: Tests for spriteOffset management in SpriteGeneratorPanel:
//              opaque upload yields {0,0}, transparent upload yields
//              computeSpriteOffset result, Remove Background & Center
//              computes offset post-removal, Reset returns to {0,0}.
// ============================================================

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  mockHasTransparent,
  mockComputeOffset,
  mockRemoveBg,
  mockBuildSpritesheet,
  mockDrawSpriteFrame,
  mockSampleColor,
} = vi.hoisted(() => ({
  mockHasTransparent: vi.fn(),
  mockComputeOffset: vi.fn(),
  mockRemoveBg: vi.fn(),
  mockBuildSpritesheet: vi.fn(),
  mockDrawSpriteFrame: vi.fn(),
  mockSampleColor: vi.fn(),
}));

vi.mock('../../modules/racer-types/backgroundRemoval.js', () => ({
  hasTransparentBackground: mockHasTransparent,
  sampleColor: mockSampleColor,
  removeBackground: mockRemoveBg,
  computeSpriteOffset: mockComputeOffset,
}));

vi.mock('../../modules/racer-types/spritesheetBuilder.js', () => ({
  buildSpritesheet: mockBuildSpritesheet,
  drawSpriteFrame: mockDrawSpriteFrame,
  FRAME_SIZE: 128,
}));

vi.mock('../../modules/racer-types/spriteTinter.js', () => ({
  detectTintMode: vi.fn(() => 'multiply'),
  ensureRacerTypeWarm: vi.fn(),
}));

vi.mock('../../modules/racer-types/standardCoats.js', () => ({
  STANDARD_COAT_PALETTE: [{ id: 'bay', name: 'Bay', tint: '#8B4513' }],
}));

vi.mock('./canvasUtils.js', () => ({
  drawCheckerboard: vi.fn(),
}));

vi.mock('./AnimationControls.jsx', () => ({
  AnimationControls: () => null,
}));

vi.mock('./SpritesheetPreview.jsx', () => ({
  SpritesheetPreview: () => null,
}));

import { SpriteGeneratorPanel } from './SpriteGeneratorPanel.jsx';

const ANIM_CONFIG = {
  frameCount: 4,
  basePeriodMs: 600,
  baseRotationOffset: 0,
  addons: {},
};

function makeProps(overrides = {}) {
  return {
    animConfig: ANIM_CONFIG,
    onAnimConfigChange: vi.fn(),
    onSpriteDataUrl: vi.fn(),
    tintMode: 'multiply',
    onTintModeChange: vi.fn(),
    ...overrides,
  };
}

describe('SpriteGeneratorPanel — spriteOffset management', () => {
  let mockCtx;

  beforeEach(() => {
    vi.useFakeTimers();

    mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(128, 128)),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,removed');

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.stubGlobal(
      'Image',
      class MockImage {
        constructor() {
          this.naturalWidth = 128;
          this.naturalHeight = 128;
        }
        set src(url) {
          this._src = url;
          this.onload?.();
        }
        get src() {
          return this._src;
        }
      }
    );

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    mockBuildSpritesheet.mockReturnValue('data:image/png;base64,sheet');
    mockSampleColor.mockReturnValue({ r: 200, g: 200, b: 200 });
    mockComputeOffset.mockReturnValue({ offsetX: 0, offsetY: 0 });
    mockRemoveBg.mockReturnValue(new ImageData(128, 128));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function uploadFile(container, transparent) {
    mockHasTransparent.mockReturnValue(transparent);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'sprite.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    // Flush the setTimeout(0) inside the buildSpritesheet effect
    act(() => {
      vi.runAllTimers();
    });
  }

  it('opaque PNG upload: spriteOffset is {0,0} and computeSpriteOffset is not called', async () => {
    const { container } = render(<SpriteGeneratorPanel {...makeProps()} />);
    await uploadFile(container, false);

    expect(mockComputeOffset).not.toHaveBeenCalled();
    expect(mockBuildSpritesheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { offsetX: 0, offsetY: 0 }
    );
  });

  it('transparent PNG upload: spriteOffset is the result of computeSpriteOffset', async () => {
    mockComputeOffset.mockReturnValue({ offsetX: 15, offsetY: -10 });
    const { container } = render(<SpriteGeneratorPanel {...makeProps()} />);
    await uploadFile(container, true);

    expect(mockComputeOffset).toHaveBeenCalledOnce();
    expect(mockBuildSpritesheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { offsetX: 15, offsetY: -10 }
    );
  });

  it('"Remove Background & Center": spriteOffset is computed from post-removal imageData', async () => {
    const { container } = render(<SpriteGeneratorPanel {...makeProps()} />);
    await uploadFile(container, false); // opaque — offset stays {0,0}
    mockBuildSpritesheet.mockClear();
    mockComputeOffset.mockClear();

    const postRemovalData = new ImageData(128, 128);
    mockRemoveBg.mockReturnValue(postRemovalData);
    mockComputeOffset.mockReturnValue({ offsetX: 20, offsetY: 8 });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove background & center/i }));
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(mockComputeOffset).toHaveBeenCalledWith(postRemovalData, 128, 128);
    expect(mockBuildSpritesheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { offsetX: 20, offsetY: 8 }
    );
  });

  it('Reset: spriteOffset resets to {0,0}', async () => {
    const { container } = render(<SpriteGeneratorPanel {...makeProps()} />);
    await uploadFile(container, false);

    // Establish non-zero offset via Remove Background & Center
    mockRemoveBg.mockReturnValue(new ImageData(128, 128));
    mockComputeOffset.mockReturnValue({ offsetX: 20, offsetY: 8 });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove background & center/i }));
    });
    act(() => {
      vi.runAllTimers();
    });

    // Click Reset and verify offset goes back to {0,0}
    mockBuildSpritesheet.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(mockBuildSpritesheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { offsetX: 0, offsetY: 0 }
    );
  });
});
