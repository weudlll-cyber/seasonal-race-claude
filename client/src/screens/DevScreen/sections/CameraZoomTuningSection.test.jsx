import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const defaultProfiles = {
  OVERVIEW: {
    spritePct: 0.05,
    trackingTC: 1.5,
    entryTC: 1.5,
    leadInDistance: 0,
    followDuration: 0,
    leadOutDistance: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
  LEADER_ZOOM: {
    spritePct: 0.08,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDistance: 0,
    followDuration: 0,
    leadOutDistance: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
  BATTLE_ZOOM: {
    spritePct: 0.12,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDistance: 0,
    followDuration: 0,
    leadOutDistance: 0,
    innerFramePct: 0.7,
    maxStateDuration: 6000,
    minStateHold: 5000,
  },
  COMEBACK_ZOOM: {
    spritePct: 0.065,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDistance: 0,
    followDuration: 0,
    leadOutDistance: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
};

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => freshConfig()),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    schemaVersion: 4,
    cameraStateProfiles: {
      OVERVIEW: {
        spritePct: 0.05,
        trackingTC: 1.5,
        entryTC: 1.5,
        leadInDistance: 0,
        followDuration: 0,
        leadOutDistance: 0,
        innerFramePct: 0.7,
        maxStateDuration: 4000,
        minStateHold: 5000,
      },
      LEADER_ZOOM: {
        spritePct: 0.08,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDistance: 0,
        followDuration: 0,
        leadOutDistance: 0,
        innerFramePct: 0.7,
        maxStateDuration: 4000,
        minStateHold: 5000,
      },
      BATTLE_ZOOM: {
        spritePct: 0.12,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDistance: 0,
        followDuration: 0,
        leadOutDistance: 0,
        innerFramePct: 0.7,
        maxStateDuration: 6000,
        minStateHold: 5000,
      },
      COMEBACK_ZOOM: {
        spritePct: 0.065,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDistance: 0,
        followDuration: 0,
        leadOutDistance: 0,
        innerFramePct: 0.7,
        maxStateDuration: 4000,
        minStateHold: 5000,
      },
    },
    entryConvergenceZoom: 0.05,
    entryConvergencePx: 10,
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.05,
    endgameThreshold: 0.85,
    postStartHoldMs: 7000,
    battleCooldownMs: 8000,
    overviewCooldownMin: 15000,
    overviewCooldownMax: 25000,
  },
}));

import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import CameraZoomTuningSection from './CameraZoomTuningSection.jsx';

function freshConfig(overrides = {}) {
  return {
    schemaVersion: 4,
    cameraStateProfiles: {
      OVERVIEW: { ...defaultProfiles.OVERVIEW },
      LEADER_ZOOM: { ...defaultProfiles.LEADER_ZOOM },
      BATTLE_ZOOM: { ...defaultProfiles.BATTLE_ZOOM },
      COMEBACK_ZOOM: { ...defaultProfiles.COMEBACK_ZOOM },
    },
    entryConvergenceZoom: 0.05,
    entryConvergencePx: 10,
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.05,
    endgameThreshold: 0.85,
    postStartHoldMs: 7000,
    battleCooldownMs: 8000,
    overviewCooldownMin: 15000,
    overviewCooldownMax: 25000,
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

  it('renders subtitle about per-state profiles', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText(/Per-state camera profiles/)).toBeTruthy();
  });

  it('renders state block summary for Overview', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Overview')).toBeTruthy();
  });

  it('renders state block summary for Leader Zoom', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Leader Zoom')).toBeTruthy();
  });

  it('renders state block summary for Battle Zoom', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Battle Zoom')).toBeTruthy();
  });

  it('renders state block summary for Comeback Zoom', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Comeback Zoom')).toBeTruthy();
  });

  it('renders Entry Convergence section header', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Entry Convergence')).toBeTruthy();
  });

  it('renders Convergence zoom threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Convergence zoom threshold')).toBeTruthy();
  });

  it('renders Convergence px threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Convergence px threshold')).toBeTruthy();
  });

  it('renders State Trigger Settings section header', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('State Trigger Settings')).toBeTruthy();
  });

  it('renders Battle trigger threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Battle trigger threshold')).toBeTruthy();
  });

  it('renders Endgame focus threshold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Endgame focus threshold')).toBeTruthy();
  });

  it('renders Post-Start LEADER Hold label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Post-Start LEADER Hold')).toBeTruthy();
  });

  it('renders BATTLE Cooldown label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('BATTLE Cooldown')).toBeTruthy();
  });

  it('renders Periodic OVERVIEW — Min Interval label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Periodic OVERVIEW — Min Interval')).toBeTruthy();
  });

  it('renders Periodic OVERVIEW — Max Interval label', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByText('Periodic OVERVIEW — Max Interval')).toBeTruthy();
  });

  it('shows OVERVIEW spritePct value 0.05', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.05')).toBe(true);
  });

  it('shows LEADER_ZOOM spritePct value 0.08', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.08')).toBe(true);
  });

  it('shows BATTLE_ZOOM spritePct value 0.12', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.12')).toBe(true);
  });

  it('shows COMEBACK_ZOOM spritePct value 0.065', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.065')).toBe(true);
  });

  it('shows OVERVIEW trackingTC value 1.5', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '1.5')).toBe(true);
  });

  it('shows default entryConvergenceZoom value 0.05', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.05')).toBe(true);
  });

  it('shows default entryConvergencePx value 10', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '10')).toBe(true);
  });

  it('shows default battleGapThreshold value 0.05', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.05')).toBe(true);
  });

  it('shows default endgameThreshold value 0.85', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '0.85')).toBe(true);
  });

  it('shows default postStartHoldMs value 7000', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '7000')).toBe(true);
  });

  it('shows default battleCooldownMs value 8000', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '8000')).toBe(true);
  });

  it('shows default overviewCooldownMin value 15000', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '15000')).toBe(true);
  });

  it('shows default overviewCooldownMax value 25000', () => {
    render(<CameraZoomTuningSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '25000')).toBe(true);
  });

  it('renders Reset Camera Behavior button', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByTestId('reset-camera-behavior')).toBeTruthy();
  });

  it('renders per-state Reset state buttons', () => {
    render(<CameraZoomTuningSection />);
    expect(screen.getByTestId('reset-state-OVERVIEW')).toBeTruthy();
    expect(screen.getByTestId('reset-state-LEADER_ZOOM')).toBeTruthy();
    expect(screen.getByTestId('reset-state-BATTLE_ZOOM')).toBeTruthy();
    expect(screen.getByTestId('reset-state-COMEBACK_ZOOM')).toBeTruthy();
  });
});

describe('CameraZoomTuningSection — reset all (start from non-default values)', () => {
  it('reset restores all profile and global fields to defaults', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({
        cameraStateProfiles: {
          OVERVIEW: { ...defaultProfiles.OVERVIEW, spritePct: 0.07, trackingTC: 2.0, entryTC: 2.0 },
          LEADER_ZOOM: {
            ...defaultProfiles.LEADER_ZOOM,
            spritePct: 0.1,
            trackingTC: 1.0,
            entryTC: 1.0,
          },
          BATTLE_ZOOM: {
            ...defaultProfiles.BATTLE_ZOOM,
            spritePct: 0.15,
            trackingTC: 0.8,
            entryTC: 0.8,
          },
          COMEBACK_ZOOM: {
            ...defaultProfiles.COMEBACK_ZOOM,
            spritePct: 0.09,
            trackingTC: 0.5,
            entryTC: 0.5,
          },
        },
        entryConvergenceZoom: 0.1,
        entryConvergencePx: 20,
        battleGapThreshold: 0.12,
        endgameThreshold: 0.7,
        postStartHoldMs: 3000,
        battleCooldownMs: 4000,
        overviewCooldownMin: 8000,
        overviewCooldownMax: 12000,
      })
    );
    render(<CameraZoomTuningSection />);
    fireEvent.click(screen.getByTestId('reset-camera-behavior'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraStateProfiles: expect.objectContaining({
          OVERVIEW: expect.objectContaining({ spritePct: 0.05, trackingTC: 1.5, entryTC: 1.5 }),
          LEADER_ZOOM: expect.objectContaining({ spritePct: 0.08, trackingTC: 0.3, entryTC: 0.3 }),
          BATTLE_ZOOM: expect.objectContaining({ spritePct: 0.12, trackingTC: 0.3, entryTC: 0.3 }),
          COMEBACK_ZOOM: expect.objectContaining({
            spritePct: 0.065,
            trackingTC: 0.3,
            entryTC: 0.3,
          }),
        }),
        entryConvergenceZoom: 0.05,
        entryConvergencePx: 10,
        battleGapThreshold: 0.05,
        endgameThreshold: 0.85,
        postStartHoldMs: 7000,
        battleCooldownMs: 8000,
        overviewCooldownMin: 15000,
        overviewCooldownMax: 25000,
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

describe('CameraZoomTuningSection — per-state reset', () => {
  it('reset-state-OVERVIEW restores only OVERVIEW profile', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({
        cameraStateProfiles: {
          OVERVIEW: { ...defaultProfiles.OVERVIEW, spritePct: 0.09, trackingTC: 2.0 },
          LEADER_ZOOM: { ...defaultProfiles.LEADER_ZOOM, spritePct: 0.1 },
          BATTLE_ZOOM: { ...defaultProfiles.BATTLE_ZOOM },
          COMEBACK_ZOOM: { ...defaultProfiles.COMEBACK_ZOOM },
        },
      })
    );
    render(<CameraZoomTuningSection />);
    vi.clearAllMocks();
    fireEvent.click(screen.getByTestId('reset-state-OVERVIEW'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraStateProfiles: expect.objectContaining({
          OVERVIEW: expect.objectContaining({ spritePct: 0.05, trackingTC: 1.5 }),
          LEADER_ZOOM: expect.objectContaining({ spritePct: 0.1 }), // unchanged
        }),
      })
    );
  });
});

describe('CameraZoomTuningSection — overviewCooldown min/max silent rejection', () => {
  it('setting overviewCooldownMin equal to overviewCooldownMax is rejected (silent)', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({ overviewCooldownMin: 15000, overviewCooldownMax: 25000 })
    );
    render(<CameraZoomTuningSection />);
    vi.clearAllMocks();
    const inputs = screen.getAllByRole('spinbutton');
    const minInput = inputs.find((i) => i.value === '15000');
    fireEvent.change(minInput, { target: { value: '25000' } });
    expect(saveCameraConfig).not.toHaveBeenCalled();
  });

  it('setting overviewCooldownMax equal to overviewCooldownMin is rejected (silent)', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({ overviewCooldownMin: 15000, overviewCooldownMax: 25000 })
    );
    render(<CameraZoomTuningSection />);
    vi.clearAllMocks();
    const inputs = screen.getAllByRole('spinbutton');
    const maxInput = inputs.find((i) => i.value === '25000');
    fireEvent.change(maxInput, { target: { value: '15000' } });
    expect(saveCameraConfig).not.toHaveBeenCalled();
  });

  it('valid overviewCooldownMin change below max is accepted', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({ overviewCooldownMin: 15000, overviewCooldownMax: 25000 })
    );
    render(<CameraZoomTuningSection />);
    vi.clearAllMocks();
    const inputs = screen.getAllByRole('spinbutton');
    const minInput = inputs.find((i) => i.value === '15000');
    fireEvent.change(minInput, { target: { value: '20000' } });
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});

describe('CameraZoomTuningSection — localStorage persistence', () => {
  it('saveCameraConfig is called when component mounts', () => {
    render(<CameraZoomTuningSection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
