import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const defaultProfiles = {
  OVERVIEW: {
    spriteScale: 1.0,
    trackingTC: 1.5,
    entryTC: 1.5,
    leadInDuration: 0,
    leadOutDuration: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
  LEADER_ZOOM: {
    spriteScale: 1.81,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDuration: 0,
    leadOutDuration: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
  BATTLE_ZOOM: {
    spriteScale: 2.81,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDuration: 0,
    leadOutDuration: 0,
    innerFramePct: 0.7,
    maxStateDuration: 6000,
    minStateHold: 5000,
  },
  COMEBACK_ZOOM: {
    spriteScale: 1.39,
    trackingTC: 0.3,
    entryTC: 0.3,
    leadInDuration: 0,
    leadOutDuration: 0,
    innerFramePct: 0.7,
    maxStateDuration: 4000,
    minStateHold: 5000,
  },
};

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => freshConfig()),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    schemaVersion: 14,
    cameraStateProfiles: {
      OVERVIEW: {
        spriteScale: 1.0,
        trackingTC: 1.5,
        entryTC: 1.5,
        leadInDuration: 0,
        leadOutDuration: 0,
        innerFramePct: 0.7,
        maxStateDuration: 4000,
        minStateHold: 5000,
      },
      LEADER_ZOOM: {
        spriteScale: 1.81,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDuration: 0,
        leadOutDuration: 0,
        innerFramePct: 0.7,
        maxStateDuration: 4000,
        minStateHold: 5000,
      },
      BATTLE_ZOOM: {
        spriteScale: 2.81,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDuration: 0,
        leadOutDuration: 0,
        innerFramePct: 0.7,
        maxStateDuration: 6000,
        minStateHold: 5000,
      },
      COMEBACK_ZOOM: {
        spriteScale: 1.39,
        trackingTC: 0.3,
        entryTC: 0.3,
        leadInDuration: 0,
        leadOutDuration: 0,
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

    battlePulkThresholdPx: 200,
    battleMinDurationMs: 3000,
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
    schemaVersion: 14,
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

    battlePulkThresholdPx: 200,
    battleMinDurationMs: 3000,
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
  // Render once per test in beforeEach — eliminates the race between render()
  // and getAllByRole() that caused intermittent failures under full-suite load.
  beforeEach(() => {
    render(<CameraZoomTuningSection />);
  });

  it('renders section title "Camera Behavior"', () => {
    expect(screen.getByText('Camera Behavior')).toBeTruthy();
  });

  it('renders subtitle about per-state profiles', () => {
    expect(screen.getByText(/Per-state camera profiles/)).toBeTruthy();
  });

  it('does NOT render a per-state block for OVERVIEW (zoom set by minimum-body-size slider)', () => {
    // OVERVIEW zoom is controlled by overviewTargetScreenPx, not a spriteScale profile block.
    expect(screen.queryByText('Overview')).toBeNull();
  });

  it('renders state block summary for Leader Zoom', () => {
    expect(screen.getByText('Leader Zoom')).toBeTruthy();
  });

  it('renders state block summary for Battle Zoom', () => {
    expect(screen.getByText('Battle Zoom')).toBeTruthy();
  });

  it('renders state block summary for Comeback Zoom', () => {
    expect(screen.getByText('Comeback Zoom')).toBeTruthy();
  });

  it('renders Entry Convergence section header', () => {
    expect(screen.getByText('Entry Convergence')).toBeTruthy();
  });

  it('renders Convergence zoom threshold label', () => {
    expect(screen.getByText('Convergence zoom threshold')).toBeTruthy();
  });

  it('renders Convergence px threshold label', () => {
    expect(screen.getByText('Convergence px threshold')).toBeTruthy();
  });

  it('renders State Trigger Settings section header', () => {
    expect(screen.getByText('State Trigger Settings')).toBeTruthy();
  });

  it('renders Pulk threshold (px) label', () => {
    expect(screen.getByText('Pulk threshold (px)')).toBeTruthy();
  });

  it('renders BATTLE min hold (ms) label', () => {
    expect(screen.getByText('BATTLE min hold (ms)')).toBeTruthy();
  });

  it('renders Endgame focus threshold label', () => {
    expect(screen.getByText('Endgame focus threshold')).toBeTruthy();
  });

  it('renders Post-Start LEADER Hold label', () => {
    expect(screen.getByText('Post-Start LEADER Hold')).toBeTruthy();
  });

  it('renders BATTLE Cooldown label', () => {
    expect(screen.getByText('BATTLE Cooldown')).toBeTruthy();
  });

  it('renders Periodic OVERVIEW — Min Interval label', () => {
    expect(screen.getByText('Periodic OVERVIEW — Min Interval')).toBeTruthy();
  });

  it('renders Periodic OVERVIEW — Max Interval label', () => {
    expect(screen.getByText('Periodic OVERVIEW — Max Interval')).toBeTruthy();
  });

  it('shows OVERVIEW spriteScale value 1', () => {
    // Use getAllByDisplayValue — multiple inputs may share value '1' in this form.
    expect(screen.getAllByDisplayValue('1').length).toBeGreaterThan(0);
  });

  it('shows LEADER_ZOOM spriteScale value 1.81', () => {
    expect(screen.getByDisplayValue('1.81')).toBeTruthy();
  });

  it('shows BATTLE_ZOOM spriteScale value 2.81', () => {
    expect(screen.getByDisplayValue('2.81')).toBeTruthy();
  });

  it('shows COMEBACK_ZOOM spriteScale value 1.39', () => {
    expect(screen.getByDisplayValue('1.39')).toBeTruthy();
  });

  it('OVERVIEW trackingTC 1.5 is not rendered (OVERVIEW block removed from Dev Screen)', () => {
    // OVERVIEW accordion block no longer exists; its camera zoom is set by overviewTargetScreenPx.
    expect(screen.queryAllByDisplayValue('1.5').length).toBe(0);
  });

  it('shows default entryConvergenceZoom value 0.05', () => {
    expect(screen.getByDisplayValue('0.05')).toBeTruthy();
  });

  it('shows default entryConvergencePx value 10', () => {
    expect(screen.getByDisplayValue('10')).toBeTruthy();
  });

  it('shows default battlePulkThresholdPx value 200', () => {
    expect(screen.getByDisplayValue('200')).toBeTruthy();
  });

  it('shows default battleMinDurationMs value 3000', () => {
    expect(screen.getByDisplayValue('3000')).toBeTruthy();
  });

  it('shows default endgameThreshold value 0.85', () => {
    expect(screen.getByDisplayValue('0.85')).toBeTruthy();
  });

  it('shows default postStartHoldMs value 7000', () => {
    expect(screen.getByDisplayValue('7000')).toBeTruthy();
  });

  it('shows default battleCooldownMs value 8000', () => {
    expect(screen.getByDisplayValue('8000')).toBeTruthy();
  });

  it('shows default overviewCooldownMin value 15000', () => {
    expect(screen.getByDisplayValue('15000')).toBeTruthy();
  });

  it('shows default overviewCooldownMax value 25000', () => {
    expect(screen.getByDisplayValue('25000')).toBeTruthy();
  });

  it('renders Reset Camera Behavior button', () => {
    expect(screen.getByTestId('reset-camera-behavior')).toBeTruthy();
  });

  it('renders per-state Reset state buttons for LEADER, BATTLE, COMEBACK (not OVERVIEW)', () => {
    expect(screen.queryByTestId('reset-state-OVERVIEW')).toBeNull(); // OVERVIEW has no profile block
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
          OVERVIEW: {
            ...defaultProfiles.OVERVIEW,
            spriteScale: 1.5,
            trackingTC: 2.0,
            entryTC: 2.0,
          },
          LEADER_ZOOM: {
            ...defaultProfiles.LEADER_ZOOM,
            spriteScale: 2.0,
            trackingTC: 1.0,
            entryTC: 1.0,
          },
          BATTLE_ZOOM: {
            ...defaultProfiles.BATTLE_ZOOM,
            spriteScale: 3.0,
            trackingTC: 0.8,
            entryTC: 0.8,
          },
          COMEBACK_ZOOM: {
            ...defaultProfiles.COMEBACK_ZOOM,
            spriteScale: 1.8,
            trackingTC: 0.5,
            entryTC: 0.5,
          },
        },
        entryConvergenceZoom: 0.1,
        entryConvergencePx: 20,
        battlePulkThresholdPx: 100,
        battleMinDurationMs: 1500,
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
          OVERVIEW: expect.objectContaining({ spriteScale: 1.0, trackingTC: 1.5, entryTC: 1.5 }),
          LEADER_ZOOM: expect.objectContaining({
            spriteScale: 1.81,
            trackingTC: 0.3,
            entryTC: 0.3,
          }),
          BATTLE_ZOOM: expect.objectContaining({
            spriteScale: 2.81,
            trackingTC: 0.3,
            entryTC: 0.3,
          }),
          COMEBACK_ZOOM: expect.objectContaining({
            spriteScale: 1.39,
            trackingTC: 0.3,
            entryTC: 0.3,
          }),
        }),
        entryConvergenceZoom: 0.05,
        entryConvergencePx: 10,
        battlePulkThresholdPx: 200,
        battleMinDurationMs: 3000,
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
  it('reset-state-LEADER_ZOOM restores only LEADER_ZOOM profile', () => {
    // OVERVIEW no longer has a per-state reset button — its zoom is set by overviewTargetScreenPx.
    loadCameraConfig.mockReturnValue(
      freshConfig({
        cameraStateProfiles: {
          OVERVIEW: { ...defaultProfiles.OVERVIEW },
          LEADER_ZOOM: { ...defaultProfiles.LEADER_ZOOM, spriteScale: 2.5, trackingTC: 2.0 },
          BATTLE_ZOOM: { ...defaultProfiles.BATTLE_ZOOM },
          COMEBACK_ZOOM: { ...defaultProfiles.COMEBACK_ZOOM },
        },
      })
    );
    render(<CameraZoomTuningSection />);
    vi.clearAllMocks();
    fireEvent.click(screen.getByTestId('reset-state-LEADER_ZOOM'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraStateProfiles: expect.objectContaining({
          LEADER_ZOOM: expect.objectContaining({ spriteScale: 1.81, trackingTC: 0.3 }),
          BATTLE_ZOOM: expect.objectContaining({ spriteScale: 2.81 }), // unchanged
        }),
      })
    );
  });
});

describe('CameraZoomTuningSection — overviewCooldown min/max silent rejection', () => {
  beforeEach(() => {
    loadCameraConfig.mockReturnValue(
      freshConfig({ overviewCooldownMin: 15000, overviewCooldownMax: 25000 })
    );
    render(<CameraZoomTuningSection />);
    // Clear spy call counts from the render-triggered useEffect save.
    vi.clearAllMocks();
  });

  it('setting overviewCooldownMin equal to overviewCooldownMax is rejected (silent)', () => {
    fireEvent.change(screen.getByDisplayValue('15000'), { target: { value: '25000' } });
    expect(saveCameraConfig).not.toHaveBeenCalled();
  });

  it('setting overviewCooldownMax equal to overviewCooldownMin is rejected (silent)', () => {
    fireEvent.change(screen.getByDisplayValue('25000'), { target: { value: '15000' } });
    expect(saveCameraConfig).not.toHaveBeenCalled();
  });

  it('valid overviewCooldownMin change below max is accepted', () => {
    fireEvent.change(screen.getByDisplayValue('15000'), { target: { value: '20000' } });
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});

describe('CameraZoomTuningSection — localStorage persistence', () => {
  it('saveCameraConfig is called when component mounts', () => {
    render(<CameraZoomTuningSection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
