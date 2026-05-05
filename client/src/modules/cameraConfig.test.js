import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./storage/storage.js', () => ({
  KEYS: { CAMERA_CONFIG: 'racearena:cameraConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet } from './storage/storage.js';
import { loadCameraConfig } from './cameraConfig.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('loadCameraConfig', () => {
  it('returns DEFAULT_CAMERA_CONFIG when storage is empty', () => {
    const cfg = loadCameraConfig();
    expect(cfg).toEqual(DEFAULT_CAMERA_CONFIG);
  });

  it('migration: old config with minTargetScreenPx but no minSpritePctOfCanvas → default 0.05', () => {
    storageGet.mockReturnValue({
      minTargetScreenPx: 32,
      maxTargetScreenPx: 160,
      leaderZoomMultiplier: 1.8,
    });
    const cfg = loadCameraConfig();
    expect(cfg.minSpritePctOfCanvas).toBe(0.05);
  });

  it('respects stored minSpritePctOfCanvas when present', () => {
    storageGet.mockReturnValue({ minSpritePctOfCanvas: 0.08 });
    const cfg = loadCameraConfig();
    expect(cfg.minSpritePctOfCanvas).toBe(0.08);
  });

  it('does not crash on old localStorage shape — no field missing errors', () => {
    storageGet.mockReturnValue({ minTargetScreenPx: 48, maxTargetScreenPx: 200 });
    expect(() => loadCameraConfig()).not.toThrow();
  });
});
