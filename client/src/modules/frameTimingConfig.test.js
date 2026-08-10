// ============================================================
// File:        frameTimingConfig.test.js
// Path:        client/src/modules/frameTimingConfig.test.js
// Project:     RaceArena — SCOREBOARD-CADENCE-1
//
// WHAT THIS GUARDS: that the standings cadence survives loading, and that a value outside its band
// falls back to the shipped default instead of reaching the race.
//
// WHY THAT MATTERS MORE THAN IT LOOKS. The loader rebuilds this config KEY BY KEY from the defaults
// (`resolveFromDefaults`), so a key the loader does not know about is silently DROPPED — the same
// sharp edge `check-config-keys.mjs` exists for, where a stored `highlightHeroes: true` never reached
// the renderer and the checkbox ticked anyway. A cadence that quietly reverted to 500 while the Dev
// Screen showed 1000 would make the owner's eye-test a test of the wrong thing, and nothing would say
// so.
//
// The band itself is not arbitrary and both ends are asserted: below 100 ms the list is rebuilt more
// often than a person can read it, and above 2000 ms it stops being live.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFrameTimingConfig,
  saveFrameTimingConfig,
  DEFAULT_FRAME_TIMING_CONFIG,
  SCOREBOARD_INTERVAL_MIN_MS,
  SCOREBOARD_INTERVAL_MAX_MS,
} from './frameTimingConfig.js';
import { storageSet, storageRemove, KEYS } from './storage/storage.js';

beforeEach(() => {
  storageRemove(KEYS.FRAME_TIMING_CONFIG);
});

describe('the standings cadence is a setting that survives loading (SCOREBOARD-CADENCE-1)', () => {
  it('ships at 500 ms — half the ticks the hard-coded 250 produced', () => {
    expect(DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs).toBe(500);
    expect(loadFrameTimingConfig().scoreboardIntervalMs).toBe(500);
  });

  it('round-trips a stored value the owner picked, rather than dropping it', () => {
    // The failure this exists for: the loader rebuilds key by key, so an unknown key vanishes and
    // the control would show 1000 while the race ran 500.
    saveFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG, scoreboardIntervalMs: 1000 });
    expect(loadFrameTimingConfig().scoreboardIntervalMs).toBe(1000);
    // The L203 pair: a DIFFERENT stored value must give a different answer, or this only proves the
    // default is 1000 by coincidence.
    saveFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG, scoreboardIntervalMs: 250 });
    expect(loadFrameTimingConfig().scoreboardIntervalMs).toBe(250);
  });

  it('accepts both ends of the band', () => {
    for (const v of [SCOREBOARD_INTERVAL_MIN_MS, SCOREBOARD_INTERVAL_MAX_MS]) {
      saveFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG, scoreboardIntervalMs: v });
      expect(loadFrameTimingConfig().scoreboardIntervalMs).toBe(v);
    }
  });

  it('falls back to the default for a value outside the band, or the wrong type', () => {
    for (const bad of [
      SCOREBOARD_INTERVAL_MIN_MS - 1,
      SCOREBOARD_INTERVAL_MAX_MS + 1,
      0,
      -250,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '500',
      null,
    ]) {
      storageSet(KEYS.FRAME_TIMING_CONFIG, { scoreboardIntervalMs: bad });
      expect(loadFrameTimingConfig().scoreboardIntervalMs).toBe(
        DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs
      );
    }
  });

  it('a config saved before this key existed still loads, at the default', () => {
    storageSet(KEYS.FRAME_TIMING_CONFIG, { dtSmoothingAlpha: 0.5 });
    const c = loadFrameTimingConfig();
    expect(c.dtSmoothingAlpha).toBe(0.5);
    expect(c.scoreboardIntervalMs).toBe(DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs);
  });

  it('the band is the one the Dev Screen offers — one home, not two', () => {
    expect(SCOREBOARD_INTERVAL_MIN_MS).toBeLessThan(
      DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs
    );
    expect(SCOREBOARD_INTERVAL_MAX_MS).toBeGreaterThan(
      DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs
    );
    // The three values the owner is choosing between must all be reachable through the control.
    for (const v of [250, 500, 1000]) {
      expect(v).toBeGreaterThanOrEqual(SCOREBOARD_INTERVAL_MIN_MS);
      expect(v).toBeLessThanOrEqual(SCOREBOARD_INTERVAL_MAX_MS);
    }
  });
});

describe('the bucket arithmetic the race actually runs', () => {
  const FIXED_DT = 16;
  /** The condition at the one call site, lifted verbatim so the test drives the real expression. */
  const ticks = (intervalMs, upToMs) => {
    let n = 0;
    for (let t = FIXED_DT; t <= upToMs; t += FIXED_DT) {
      if (Math.round(t / intervalMs) !== Math.round((t - FIXED_DT) / intervalMs)) n++;
    }
    return n;
  };

  it('doubling the interval halves the updates — which is the whole point of the key', () => {
    const over = 10_000;
    const at250 = ticks(250, over);
    const at500 = ticks(500, over);
    const at1000 = ticks(1000, over);
    expect(at250).toBeGreaterThan(at500);
    expect(at500).toBeGreaterThan(at1000);
    // Not "fewer" — proportionally fewer, within one tick of rounding on a 10 s window.
    expect(Math.abs(at250 - 2 * at500)).toBeLessThanOrEqual(1);
    expect(Math.abs(at500 - 2 * at1000)).toBeLessThanOrEqual(1);
  });

  it('still fires — a cadence that never ticks would freeze the standings', () => {
    // The failure mode a bad bucket would produce: the list stops updating and looks like a hang.
    for (const v of [SCOREBOARD_INTERVAL_MIN_MS, 250, 500, 1000, SCOREBOARD_INTERVAL_MAX_MS]) {
      expect(ticks(v, 10_000)).toBeGreaterThan(0);
    }
  });
});
