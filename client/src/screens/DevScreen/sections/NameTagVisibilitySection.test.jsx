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
import NameTagVisibilitySection from './NameTagVisibilitySection.jsx';

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

describe('NameTagVisibilitySection — default rendering', () => {
  it('renders section title', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText('Name Tag Visibility')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText(/Controls how many name tags appear during the race/)).toBeTruthy();
  });

  it('renders Max tags during race label', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText('Max tags during race')).toBeTruthy();
  });

  it('shows default tagVisibleMaxCount value 10', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByRole('spinbutton').value).toBe('10');
  });

  it('renders Reset Name Tag Visibility button', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByTestId('reset-nametag-visibility')).toBeTruthy();
  });
});

describe('NameTagVisibilitySection — reset (L58: start from non-default value)', () => {
  it('reset restores tagVisibleMaxCount to default 10', () => {
    loadCameraConfig.mockReturnValue({
      minSpritePctOfCanvas: 0.05,
      maxTargetScreenPx: 160,
      leaderZoomMultiplier: 1.8,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      openTrackBaseZoom: 1.5,
      tagVisibleMaxCount: 5,
    });
    render(<NameTagVisibilitySection />);
    fireEvent.click(screen.getByTestId('reset-nametag-visibility'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ tagVisibleMaxCount: 10 })
    );
  });

  it('reset does NOT change other cameraConfig fields', () => {
    loadCameraConfig.mockReturnValue({
      minSpritePctOfCanvas: 0.07,
      maxTargetScreenPx: 200,
      leaderZoomMultiplier: 2.2,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      openTrackBaseZoom: 1.5,
      tagVisibleMaxCount: 5,
    });
    render(<NameTagVisibilitySection />);
    fireEvent.click(screen.getByTestId('reset-nametag-visibility'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ leaderZoomMultiplier: 2.2, minSpritePctOfCanvas: 0.07 })
    );
  });
});

describe('NameTagVisibilitySection — localStorage persistence', () => {
  it('saveCameraConfig is called on mount', () => {
    render(<NameTagVisibilitySection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
