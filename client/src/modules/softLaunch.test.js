import { describe, it, expect } from 'vitest';
import { computeSoftLaunchFactor } from './softLaunch.js';

describe('computeSoftLaunchFactor', () => {
  it('is 0 during countdown', () => {
    const f = computeSoftLaunchFactor({
      isRacing: false,
      raceElapsedMs: 1500,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });
    expect(f).toBe(0);
  });

  it('ramps linearly from 0 to 1 during soft-launch', () => {
    const f0 = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 0,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });
    const fMid = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 1500,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });
    const fEnd = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 3000,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });

    expect(f0).toBe(0);
    expect(fMid).toBeCloseTo(0.5, 5);
    expect(fEnd).toBe(1);
  });

  it('is 1 in race phase after soft-launch', () => {
    const f = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 5000,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });
    expect(f).toBe(1);
  });

  it('with enableSoftLaunch=false, anti-collision is immediately fully active', () => {
    const f = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 0,
      enableSoftLaunch: false,
      softLaunchDurationSeconds: 3.0,
      softLaunchRampMode: 'linear',
    });
    expect(f).toBe(1);
  });

  it('twoStep mode uses two discrete activation steps', () => {
    const f0 = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 0,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 4,
      softLaunchRampMode: 'twoStep',
    });
    const fStep1 = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 1000,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 4,
      softLaunchRampMode: 'twoStep',
    });
    const fStep2 = computeSoftLaunchFactor({
      isRacing: true,
      raceElapsedMs: 3000,
      enableSoftLaunch: true,
      softLaunchDurationSeconds: 4,
      softLaunchRampMode: 'twoStep',
    });

    expect(f0).toBe(0);
    expect(fStep1).toBe(0.5);
    expect(fStep2).toBe(1);
  });
});
