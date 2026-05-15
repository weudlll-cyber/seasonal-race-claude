import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../modules/cameraConfig.js', () => ({
  loadCameraConfig: vi.fn(() => ({
    schemaVersion: 7,
    cameraStateProfiles: {
      OVERVIEW: { spritePx: 36 },
      LEADER_ZOOM: { spritePx: 65 },
      BATTLE_ZOOM: { spritePx: 101 },
      COMEBACK_ZOOM: { spritePx: 50 },
    },
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  })),
  saveCameraConfig: vi.fn(),
  DEFAULT_CAMERA_CONFIG: {
    schemaVersion: 7,
    cameraStateProfiles: {
      OVERVIEW: { spritePx: 36 },
      LEADER_ZOOM: { spritePx: 65 },
      BATTLE_ZOOM: { spritePx: 101 },
      COMEBACK_ZOOM: { spritePx: 50 },
    },
    maxTargetScreenPx: 160,
    tagVisibleMaxCount: 10,
    showCameraStateHud: true,
    battleGapThreshold: 0.1,
    maxStateDuration: 4000,
    endgameThreshold: 0.85,
  },
}));

import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import SpriteSizeRangeSection from './SpriteSizeRangeSection.jsx';

function freshConfig(overrides = {}) {
  return {
    schemaVersion: 7,
    cameraStateProfiles: {
      OVERVIEW: { spritePx: 36 },
      LEADER_ZOOM: { spritePx: 65 },
      BATTLE_ZOOM: { spritePx: 101 },
      COMEBACK_ZOOM: { spritePx: 50 },
    },
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

describe('SpriteSizeRangeSection — default rendering', () => {
  it('renders section title "Sprite Size Cap"', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText('Sprite Size Cap')).toBeTruthy();
  });

  it('renders new subtitle text about maximum sprite size', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText(/Maximum sprite size in pixels/)).toBeTruthy();
  });

  it('renders Maximum sprite size label', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByText('Maximum sprite size (px)')).toBeTruthy();
  });

  it('renders Maximum sprite size input with default value 160', () => {
    render(<SpriteSizeRangeSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.some((i) => i.value === '160')).toBe(true);
  });

  it('renders Reset Sprite Size Cap button', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.getByTestId('reset-sprite-size-cap')).toBeTruthy();
  });

  it('does NOT render Minimum sprite size label (moved to Camera Behavior)', () => {
    render(<SpriteSizeRangeSection />);
    expect(screen.queryByText(/Minimum sprite size/)).toBeNull();
  });

  it('renders exactly one number input (only maxTargetScreenPx)', () => {
    render(<SpriteSizeRangeSection />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(1);
  });
});

describe('SpriteSizeRangeSection — reset (L58: start from non-default values)', () => {
  it('reset restores maxTargetScreenPx to default', () => {
    loadCameraConfig.mockReturnValue(freshConfig({ maxTargetScreenPx: 200 }));
    render(<SpriteSizeRangeSection />);
    fireEvent.click(screen.getByTestId('reset-sprite-size-cap'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ maxTargetScreenPx: 160 })
    );
  });

  it('reset does NOT change cameraStateProfiles', () => {
    const customProfiles = {
      OVERVIEW: { spritePx: 50 },
      LEADER_ZOOM: { spritePx: 80 },
      BATTLE_ZOOM: { spritePx: 120 },
      COMEBACK_ZOOM: { spritePx: 60 },
    };
    loadCameraConfig.mockReturnValue(
      freshConfig({ maxTargetScreenPx: 200, cameraStateProfiles: customProfiles })
    );
    render(<SpriteSizeRangeSection />);
    fireEvent.click(screen.getByTestId('reset-sprite-size-cap'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ cameraStateProfiles: customProfiles })
    );
  });

  it('reset does NOT change battleGapThreshold', () => {
    loadCameraConfig.mockReturnValue(
      freshConfig({ maxTargetScreenPx: 200, battleGapThreshold: 0.05 })
    );
    render(<SpriteSizeRangeSection />);
    fireEvent.click(screen.getByTestId('reset-sprite-size-cap'));
    expect(saveCameraConfig).toHaveBeenCalledWith(
      expect.objectContaining({ battleGapThreshold: 0.05 })
    );
  });
});

describe('SpriteSizeRangeSection — localStorage persistence', () => {
  it('saveCameraConfig is called when component mounts', () => {
    render(<SpriteSizeRangeSection />);
    expect(saveCameraConfig).toHaveBeenCalled();
  });
});
