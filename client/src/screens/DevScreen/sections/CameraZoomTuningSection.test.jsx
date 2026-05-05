import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => ({
    minTargetScreenPx: 32,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  })),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    minTargetScreenPx: 32,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  },
}));

import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import CameraZoomTuningSection from './CameraZoomTuningSection.jsx';

beforeEach(() => {
  vi.clearAllMocks();
  loadCameraConfig.mockReturnValue({
    minTargetScreenPx: 32,
    maxTargetScreenPx: 160,
    leaderZoomMultiplier: 1.8,
    battleZoomMultiplier: 2.5,
    comebackZoomMultiplier: 1.5,
    openTrackBaseZoom: 1.5,
    tagVisibleMaxCount: 10,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  });
});

describe('CameraZoomTuningSection — default rendering', () => {
  it('renders section title', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Camera Zoom Tuning')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText(/Controls how dramatic camera zoom feels/)).toBeTruthy();
  });

  it('renders Leader zoom strength label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Leader zoom strength')).toBeTruthy();
  });

  it('renders Battle zoom strength label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Battle zoom strength')).toBeTruthy();
  });

  it('renders Comeback zoom strength label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Comeback zoom strength')).toBeTruthy();
  });

  it('renders Open track base zoom label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Open track base zoom')).toBeTruthy();
  });

  it('renders Battle trigger threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Battle trigger threshold')).toBeTruthy();
  });

  it('renders Camera state duration (ms) label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Camera state duration (ms)')).toBeTruthy();
  });

  it('renders Endgame focus threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Endgame focus threshold')).toBeTruthy();
  });

  it('shows default battleGapThreshold value 0.1', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.1')).toBe(true);
  });

  it('shows default maxStateDuration value 4000', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '4000')).toBe(true);
  });

  it('shows default endgameThreshold value 0.85', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.85')).toBe(true);
  });

  it('renders Reset Camera Zoom Tuning button', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByTestId('reset-camera-zoom-tuning')).toBeTruthy();
  });

  it('shows default leaderZoomMultiplier value 1.8', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '1.8')).toBe(true);
  });

  it('shows default battleZoomMultiplier value 2.5', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '2.5')).toBe(true);
  });

  it('shows default comebackZoomMultiplier value 1.5', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '1.5')).toBe(true);
  });
});

describe('CameraZoomTuningSection — reset (L58: start from non-default values)', () => {
  it('reset restores all seven tuning fields to defaults', () => {
    loadCameraConfig.mockReturnValue({
      minTargetScreenPx: 32,
      maxTargetScreenPx: 160,
      leaderZoomMultiplier: 2.5,
      battleZoomMultiplier: 3.0,
      comebackZoomMultiplier: 2.0,
      openTrackBaseZoom: 2.0,
      tagVisibleMaxCount: 10,
      battleGapThreshold: 0.05,
      maxStateDuration: 8000,
      endgameThreshold: 0.7,
    });
    render(<CameraZoomTuningSection />);
    fireEvent.click(screen.getByTestId('reset-camera-zoom-tuning'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        leaderZoomMultiplier: 1.8,
        battleZoomMultiplier: 2.5,
        comebackZoomMultiplier: 1.5,
        openTrackBaseZoom: 1.5,
        battleGapThreshold: 0.1,
        maxStateDuration: 4000,
        endgameThreshold: 0.85,
      })
    );
  });

  it('reset does NOT change sprite-size fields', () => {
    loadCameraConfig.mockReturnValue({
      minTargetScreenPx: 48,
      maxTargetScreenPx: 200,
      leaderZoomMultiplier: 2.5,
      battleZoomMultiplier: 3.0,
      comebackZoomMultiplier: 2.0,
      openTrackBaseZoom: 2.0,
      tagVisibleMaxCount: 10,
      battleGapThreshold: 0.05,
      maxStateDuration: 8000,
      endgameThreshold: 0.7,
    });
    render(<CameraZoomTuningSection />);
    fireEvent.click(screen.getByTestId('reset-camera-zoom-tuning'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ minTargetScreenPx: 48, maxTargetScreenPx: 200 })
    );
  });
});
