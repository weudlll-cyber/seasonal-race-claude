import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => ({
    minSpritePctOfCanvas: 0.05,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
  })),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    minSpritePctOfCanvas: 0.05,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
  },
}));

import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import SpriteSizeRangeSection from './SpriteSizeRangeSection.jsx';

beforeEach(() => {
  vi.clearAllMocks();
  loadCameraConfig.mockReturnValue({
    minSpritePctOfCanvas: 0.05,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
  });
});

describe('SpriteSizeRangeSection — default rendering', () => {
  it('renders section title', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText('Sprite Size Range')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText(/Minimum is in percent of canvas height/)).toBeTruthy();
  });

  it('renders Minimum sprite size label', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText('Minimum sprite size (% of canvas)')).toBeTruthy();
  });

  it('renders Minimum sprite size input with default value 0.05', () => {
    render(<SpriteSizeRangeSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.05')).toBe(true);
  });

  it('renders Maximum sprite size input with default value 160', () => {
    render(<SpriteSizeRangeSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '160')).toBe(true);
  });

  it('renders Reset Sprite Size Range button', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByTestId('reset-sprite-size-range')).toBeTruthy();
  });
});

describe('SpriteSizeRangeSection — reset (L58: start from non-default values)', () => {
  it('reset restores min-pct and max to defaults', () => {
    loadCameraConfig.mockReturnValue({
      minSpritePctOfCanvas: 0.09,
      maxTargetScreenPx: 200,
      leaderZoomMultiplier: 1.8,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      openTrackBaseZoom: 1.5,
      tagVisibleMaxCount: 10,
    });
    render(<SpriteSizeRangeSection />);
    fireEvent.click(screen.getByTestId('reset-sprite-size-range'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ minSpritePctOfCanvas: 0.05, maxTargetScreenPx: 160 })
    );
  });

  it('reset does NOT change other cameraConfig fields', () => {
    loadCameraConfig.mockReturnValue({
      minSpritePctOfCanvas: 0.09,
      maxTargetScreenPx: 200,
      leaderZoomMultiplier: 2.2,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      openTrackBaseZoom: 1.5,
      tagVisibleMaxCount: 10,
    });
    render(<SpriteSizeRangeSection />);
    fireEvent.click(screen.getByTestId('reset-sprite-size-range'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ leaderZoomMultiplier: 2.2 })
    );
  });
});

describe('SpriteSizeRangeSection — localStorage persistence', () => {
  it('saveCameraConfig is called when component mounts', () => {
    render(<SpriteSizeRangeSection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
