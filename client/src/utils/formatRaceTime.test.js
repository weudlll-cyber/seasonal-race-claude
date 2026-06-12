import { describe, it, expect } from 'vitest';
import { formatRaceTime } from './formatRaceTime.js';

describe('formatRaceTime', () => {
  it('formats sub-minute times as ss.hh', () => {
    expect(formatRaceTime(45_320)).toBe('45.32');
  });

  it('formats minute-plus times as m:ss.hh', () => {
    expect(formatRaceTime(75_430)).toBe('1:15.43');
  });

  it('pads seconds to two digits', () => {
    expect(formatRaceTime(65_000)).toBe('1:05.00');
  });

  it('pads hundredths to two digits', () => {
    expect(formatRaceTime(5_050)).toBe('5.05');
  });

  it('handles zero', () => {
    expect(formatRaceTime(0)).toBe('0.00');
  });
});
