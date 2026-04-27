import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  loadBaseSpeedConfig,
  saveBaseSpeedConfig,
  spreadPercent,
} from './baseSpeedConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { BASE_SPEED_CONFIG: 'racearena:baseSpeedConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_BASE_SPEED_CONFIG', () => {
  it('has new tighter defaults (±12.9% spread)', () => {
    expect(DEFAULT_BASE_SPEED_CONFIG).toEqual({ min: 0.00091, max: 0.00118 });
  });

  it('min < max', () => {
    expect(DEFAULT_BASE_SPEED_CONFIG.min).toBeLessThan(DEFAULT_BASE_SPEED_CONFIG.max);
  });

  it('spread is ±12-14% (tighter than old ±17%)', () => {
    const sp = spreadPercent(DEFAULT_BASE_SPEED_CONFIG.min, DEFAULT_BASE_SPEED_CONFIG.max);
    expect(sp).toBeGreaterThan(12);
    expect(sp).toBeLessThan(14);
  });
});

describe('loadBaseSpeedConfig', () => {
  it('returns defaults when storage is empty', () => {
    storageGet.mockReturnValue(null);
    expect(loadBaseSpeedConfig()).toEqual(DEFAULT_BASE_SPEED_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ min: 0.0009, max: 0.0013 });
    const cfg = loadBaseSpeedConfig();
    expect(cfg.min).toBe(0.0009);
    expect(cfg.max).toBe(0.0013);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    expect(loadBaseSpeedConfig()).toEqual(DEFAULT_BASE_SPEED_CONFIG);
  });

  it('returns defaults when min >= max (invalid stored config)', () => {
    storageGet.mockReturnValue({ min: 0.001, max: 0.001 });
    expect(loadBaseSpeedConfig()).toEqual(DEFAULT_BASE_SPEED_CONFIG);
  });

  it('returns defaults when min <= 0', () => {
    storageGet.mockReturnValue({ min: 0, max: 0.001 });
    expect(loadBaseSpeedConfig()).toEqual(DEFAULT_BASE_SPEED_CONFIG);
  });

  it('does not mutate DEFAULT_BASE_SPEED_CONFIG', () => {
    storageGet.mockReturnValue({ min: 0.0005 });
    loadBaseSpeedConfig();
    expect(DEFAULT_BASE_SPEED_CONFIG.min).toBe(0.00091);
  });

  it('custom narrow range (±5%) round-trips correctly', () => {
    storageGet.mockReturnValue({ min: 0.00095, max: 0.00105 });
    const cfg = loadBaseSpeedConfig();
    expect(cfg.min).toBe(0.00095);
    expect(cfg.max).toBe(0.00105);
    expect(spreadPercent(cfg.min, cfg.max)).toBeCloseTo(5, 0);
  });

  it('custom wide range (±25%) round-trips correctly — back to old behaviour', () => {
    storageGet.mockReturnValue({ min: 0.00075, max: 0.00125 });
    const cfg = loadBaseSpeedConfig();
    expect(cfg.min).toBe(0.00075);
    expect(cfg.max).toBe(0.00125);
    expect(spreadPercent(cfg.min, cfg.max)).toBeGreaterThan(24);
  });
});

describe('saveBaseSpeedConfig', () => {
  it('writes config to storage', () => {
    const cfg = { min: 0.0009, max: 0.0012 };
    saveBaseSpeedConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:baseSpeedConfig', cfg);
  });
});

describe('spreadPercent', () => {
  it('returns 0 for equal values', () => {
    expect(spreadPercent(0.001, 0.001)).toBe(0);
  });

  it('returns 0 for invalid input (min >= max)', () => {
    expect(spreadPercent(0.002, 0.001)).toBe(0);
  });

  it('returns 0 for zero min', () => {
    expect(spreadPercent(0, 0.001)).toBe(0);
  });

  it('default config ≈ ±12.9%', () => {
    expect(spreadPercent(0.00091, 0.00118)).toBeCloseTo(12.9, 0);
  });

  it('old config (0.00085/0.0012) ≈ ±17%', () => {
    expect(spreadPercent(0.00085, 0.0012)).toBeCloseTo(17.1, 0);
  });

  it('symmetric: spreadPercent(a, b) where b = a × 1.1 → 4.76%', () => {
    const a = 0.001;
    const b = 0.0011;
    // mean = 0.00105, half_range = 0.00005, pct = 0.00005/0.00105 ≈ 4.76%
    expect(spreadPercent(a, b)).toBeCloseTo(4.76, 1);
  });
});
