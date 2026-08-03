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
    nameTagFrameFrac: 0.022,
    nameTagAllUntilMs: 8000,
  })),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    minSpritePctOfCanvas: 0.05,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    nameTagFrameFrac: 0.022,
    nameTagAllUntilMs: 8000,
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
    nameTagFrameFrac: 0.022,
    nameTagAllUntilMs: 8000,
  });
});

describe('NameTagVisibilitySection — default rendering', () => {
  it('renders section title', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText('Name Tag Visibility')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText(/Every racer on screen is offered a name tag/)).toBeTruthy();
  });

  it('renders the two name-tag labels', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByText('Name size (% of frame)')).toBeTruthy();
    expect(screen.getByText('Show all names for (s)')).toBeTruthy();
  });

  it('shows the shipped defaults: 2.2% of frame, all names for 8 s', () => {
    render(<NameTagVisibilitySection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0].value).toBe('2.2');
    expect(inputs[1].value).toBe('8');
  });

  it('renders Reset Name Tag Visibility button', () => {
    render(<NameTagVisibilitySection />);
    expect(screen.getByTestId('reset-nametag-visibility')).toBeTruthy();
  });
});

describe('NameTagVisibilitySection — reset (L58: start from non-default value)', () => {
  it('reset restores both name-tag defaults', () => {
    loadCameraConfig.mockReturnValue({
      minSpritePctOfCanvas: 0.05,
      maxTargetScreenPx: 160,
      leaderZoomMultiplier: 1.8,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      openTrackBaseZoom: 1.5,
      nameTagFrameFrac: 0.03,
      nameTagAllUntilMs: 2000,
    });
    render(<NameTagVisibilitySection />);
    fireEvent.click(screen.getByTestId('reset-nametag-visibility'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nameTagFrameFrac: 0.022, nameTagAllUntilMs: 8000 })
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
      nameTagFrameFrac: 0.03,
      nameTagAllUntilMs: 2000,
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
