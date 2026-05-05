import { describe, it, expect } from 'vitest';
import { visibleTagRacers } from './nameTagVisibility.js';

function makeRacers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i, t: (n - i) / n, name: `R${i}` }));
}

describe('visibleTagRacers — PRE_RACE (isRacing=false)', () => {
  it('returns all racers when not racing (isRacing=false)', () => {
    const racers = makeRacers(15);
    expect(visibleTagRacers(racers, false, 10)).toHaveLength(15);
  });

  it('PRE_RACE with N=5 and tagVisibleMaxCount=10: all 5 returned', () => {
    const racers = makeRacers(5);
    expect(visibleTagRacers(racers, false, 10)).toHaveLength(5);
  });
});

describe('visibleTagRacers — RACE_END (isRacing=false)', () => {
  it('returns all racers after race ends (isRacing=false)', () => {
    const racers = makeRacers(20);
    expect(visibleTagRacers(racers, false, 10)).toHaveLength(20);
  });
});

describe('visibleTagRacers — RACING (isRacing=true)', () => {
  it('N=5, tagVisibleMaxCount=10: all 5 visible', () => {
    const racers = makeRacers(5);
    expect(visibleTagRacers(racers, true, 10)).toHaveLength(5);
  });

  it('N=20, tagVisibleMaxCount=10: only top 10 visible', () => {
    const racers = makeRacers(20);
    expect(visibleTagRacers(racers, true, 10)).toHaveLength(10);
  });

  it('N=100, tagVisibleMaxCount=10: only top 10 visible', () => {
    const racers = makeRacers(100);
    expect(visibleTagRacers(racers, true, 10)).toHaveLength(10);
  });

  it('result is sorted by r.t descending (leader first)', () => {
    const racers = [
      { id: 0, t: 0.3 },
      { id: 1, t: 0.9 },
      { id: 2, t: 0.6 },
      { id: 3, t: 0.1 },
      { id: 4, t: 0.8 },
    ];
    const result = visibleTagRacers(racers, true, 3);
    expect(result).toHaveLength(3);
    expect(result[0].t).toBe(0.9);
    expect(result[1].t).toBe(0.8);
    expect(result[2].t).toBe(0.6);
  });

  it('top-10 contains the 10 highest-t racers, not tail', () => {
    const racers = Array.from({ length: 20 }, (_, i) => ({ id: i, t: i / 20 }));
    const result = visibleTagRacers(racers, true, 10);
    const minT = Math.min(...result.map((r) => r.t));
    // Lowest t in result must be from the top-10 by t (i.e. t ≥ 10/20 = 0.5)
    expect(minT).toBeGreaterThanOrEqual(0.5 - 0.001);
  });

  it('does not mutate original racers array', () => {
    const racers = makeRacers(20);
    const original = [...racers];
    visibleTagRacers(racers, true, 10);
    expect(racers).toEqual(original);
  });

  it('tagVisibleMaxCount=3: only top 3 shown even with N=20', () => {
    const racers = makeRacers(20);
    expect(visibleTagRacers(racers, true, 3)).toHaveLength(3);
  });
});
