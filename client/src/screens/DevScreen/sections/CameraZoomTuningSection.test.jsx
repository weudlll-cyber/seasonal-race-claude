import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const defaultSpritePct = { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 };

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => ({
    schemaVersion: 2,
    spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  })),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    schemaVersion: 2,
    spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  },
}));

import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import CameraZoomTuningSection from './CameraZoomTuningSection.jsx';

function freshConfig(overrides = {}) {
  return {
    schemaVersion: 2,
    spritePctOfCanvas: { ...defaultSpritePct },
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  loadCameraConfig.mockReturnValue(freshConfig());
});

describe('CameraZoomTuningSection — default rendering', () => {
  it('renders section title "Camera Behavior"', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Camera Behavior')).toBeTruthy();
  });

  it('renders subtitle about inverse camera logic', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText(/Controls how the camera zooms/)).toBeTruthy();
  });

  it('renders Overview sprite size label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Overview sprite size (% of canvas)')).toBeTruthy();
  });

  it('renders Leader sprite size label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Leader sprite size (% of canvas)')).toBeTruthy();
  });

  it('renders Battle sprite size label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Battle sprite size (% of canvas)')).toBeTruthy();
  });

  it('renders Comeback sprite size label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Comeback sprite size (% of canvas)')).toBeTruthy();
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

  it('shows default overview pct value 0.05', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.05')).toBe(true);
  });

  it('shows default leader pct value 0.08', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.08')).toBe(true);
  });

  it('shows default battle pct value 0.12', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.12')).toBe(true);
  });

  it('shows default comeback pct value 0.065', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.065')).toBe(true);
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

  it('renders Reset Camera Behavior button', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByTestId('reset-camera-behavior')).toBeTruthy();
  });
});

describe('CameraZoomTuningSection — reset (L58: start from non-default values)', () => {
  it('reset restores all seven tuning fields to defaults', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({
        spritePctOfCanvas: { overview: 0.07, leader: 0.1, battle: 0.15, comeback: 0.09 },
        battleGapThreshold: 0.05,
        maxStateDuration: 8000,
        endgameThreshold: 0.7,
      })
    );
    render(<CameraZoomTuningSection />);
    fireEvent.click(screen.getByTestId('reset-camera-behavior'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
        battleGapThreshold: 0.1,
        maxStateDuration: 4000,
        endgameThreshold: 0.85,
      })
    );
  });

  it('reset does NOT change maxTargetScreenPx', () => {
    loadCameraConfig.mockReturnValue(freshConfig({ maxTargetScreenPx: 200 }));
    render(<CameraZoomTuningSection />);
    fireEvent.click(screen.getByTestId('reset-camera-behavior'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ maxTargetScreenPx: 200 })
    );
  });
});

describe('CameraZoomTuningSection — localStorage persistence', () => {
  it('saveCameraConfig is called when component mounts', () => {
    render(<CameraZoomTuningSection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
