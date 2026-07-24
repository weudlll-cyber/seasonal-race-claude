// ============================================================
// File:        durationModel.test.js
// Path:        client/src/modules/durationModel.test.js
// Project:     RaceArena
// Created:     2026-07-23
// Description: Pins THE canonical speed/duration model — the single derivation the
//              browser and the sims share. The suites this replaced (lapsFromDuration,
//              computeClosedTrackSsf, the open ssf clamp, the closed/open duration
//              pickers) tested derivations that no longer exist.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  deriveRaceDuration,
  naturalMaxSeconds,
  secondsForLaps,
  lapsForApproxSeconds,
  normalSpeedFrom,
  fieldFinishWindow,
  legacyLapsFromDefaultDuration,
  trackDefaultLaps,
  trackDefaultSeconds,
  MIN_LAPS,
  OPEN_TRACK_MIN_SECONDS,
} from './durationModel.js';
import { REFERENCE_FPS } from './camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG } from './storage/defaults.js';

const V = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec; // shipped default (150 px/s); assertions derive from V
const RUNOUT = 0.05;

// Real geometries — the numbers the shipped tracks actually produce.
const SEAROUND = 5147.151518220427; // closed
const DIRT_OVAL = 6541.495700998656; // closed
const RIVER_RUN = 13060.642479157927; // open

describe('normal speed config', () => {
  it('ships a positive px/s pace', () => {
    expect(V).toBeGreaterThan(0);
    expect(normalSpeedFrom()).toBe(V);
  });

  it('falls back to the default for a legacy config with no normal speed', () => {
    expect(normalSpeedFrom({ min: 0.00096, max: 0.00113 })).toBe(V);
    expect(normalSpeedFrom({ normalSpeedPxPerSec: 0 })).toBe(V);
    expect(normalSpeedFrom(null)).toBe(V);
  });

  it('honours an explicit override', () => {
    expect(normalSpeedFrom({ normalSpeedPxPerSec: 300 })).toBe(300);
  });
});

describe('closed tracks — laps in, duration out', () => {
  it('derives duration as laps x length / speed', () => {
    expect(secondsForLaps(2, SEAROUND, V)).toBeCloseTo((2 * SEAROUND) / V, 10);
  });

  it('deriveRaceDuration sets finishT to the lap count', () => {
    const m = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 2,
      normalSpeedPxPerSec: V,
      speedMultiplier: 1.1,
      runoutZone: RUNOUT,
    });
    expect(m.finishT).toBe(2);
    // duration = laps x length / (normalSpeed x M) — the type is in the pace.
    expect(m.realizedDurationSec).toBeCloseTo((2 * SEAROUND) / (V * 1.1), 10);
    expect(m.paceScale).toBe(1);
    expect(m.slowdownActive).toBe(false);
  });

  it('duration scales linearly with laps and with track length', () => {
    const one = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 1,
      normalSpeedPxPerSec: V,
    });
    const two = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 2,
      normalSpeedPxPerSec: V,
    });
    expect(two.realizedDurationSec).toBeCloseTo(2 * one.realizedDurationSec, 10);

    const longer = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: DIRT_OVAL,
      laps: 1,
      normalSpeedPxPerSec: V,
    });
    expect(longer.realizedDurationSec / one.realizedDurationSec).toBeCloseTo(
      DIRT_OVAL / SEAROUND,
      10
    );
  });

  it('clamps to at least one lap — the shortest closed race there is', () => {
    expect(
      deriveRaceDuration({ isOpen: false, pathLengthPx: SEAROUND, laps: 0, normalSpeedPxPerSec: V })
        .finishT
    ).toBe(MIN_LAPS);
    expect(
      deriveRaceDuration({
        isOpen: false,
        pathLengthPx: SEAROUND,
        laps: -3,
        normalSpeedPxPerSec: V,
      }).finishT
    ).toBe(MIN_LAPS);
  });

  it('a slower type takes proportionally LONGER over the same laps', () => {
    const slow = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 2,
      normalSpeedPxPerSec: V,
      speedMultiplier: 0.3,
    });
    const fast = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 2,
      normalSpeedPxPerSec: V,
      speedMultiplier: 1.25,
    });
    // duration(M) = duration(1) / M  =>  slow/fast = 1.25 / 0.3
    expect(slow.realizedDurationSec / fast.realizedDurationSec).toBeCloseTo(1.25 / 0.3, 10);
    expect(slow.realizedDurationSec).toBeGreaterThan(fast.realizedDurationSec);
  });

  it('pace is independent of the racer count (no N-calibration in the model)', () => {
    // Nothing in deriveRaceDuration takes nRacers — this pins that it stays that way.
    const m = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 2,
      normalSpeedPxPerSec: V,
    });
    expect(m.raceBaseSpeed).toBeGreaterThan(0);
    expect(Object.keys(m)).not.toContain('nRacers');
  });

  it('a mean racer travels exactly normalSpeed x M px/s', () => {
    const M = 1.1;
    const m = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 3,
      normalSpeedPxPerSec: V,
      speedMultiplier: M,
    });
    const tPerFrame = m.raceBaseSpeed * M; // baseSpeed for spreadFactor = 1
    const pxPerSec = tPerFrame * SEAROUND * REFERENCE_FPS;
    expect(pxPerSec).toBeCloseTo(V * M, 8);
    expect(m.paceSpeedPxPerSec).toBeCloseTo(V * M, 10);
  });
});

// ── The owner's law ───────────────────────────────────────────────────────────────────────
// The original requirement, now a test: the SAME type runs at the SAME px/s on a closed and
// an open track; DIFFERENT types scale duration by their multiplier. If either half of this
// breaks, the pace has grown a second definition somewhere.
describe("the owner's law", () => {
  const TYPES = [
    ['snail', 0.3],
    ['duck', 0.85],
    ['horse', 1.0],
    ['manta', 1.1],
    ['rocket', 1.25],
  ];

  const meanPxPerSec = (model, M, pathLengthPx) =>
    model.raceBaseSpeed * M * pathLengthPx * REFERENCE_FPS;

  it('same type => identical px/s on a closed and an open track', () => {
    for (const [name, M] of TYPES) {
      const closed = deriveRaceDuration({
        isOpen: false,
        pathLengthPx: SEAROUND,
        laps: 2,
        normalSpeedPxPerSec: V,
        speedMultiplier: M,
        runoutZone: RUNOUT,
      });
      // An in-range open request, so no slowdown is in play (the documented exception).
      const openSecs = Math.floor(naturalMaxSeconds(RIVER_RUN, V * M, RUNOUT) * 0.5);
      const open = deriveRaceDuration({
        isOpen: true,
        pathLengthPx: RIVER_RUN,
        requestedSeconds: openSecs,
        normalSpeedPxPerSec: V,
        speedMultiplier: M,
        runoutZone: RUNOUT,
      });

      // Different topology, different track length, different finishT — same px/s.
      expect(closed.finishT).not.toBeCloseTo(open.finishT, 3);
      expect(meanPxPerSec(closed, M, SEAROUND)).toBeCloseTo(V * M, 6);
      expect(meanPxPerSec(open, M, RIVER_RUN)).toBeCloseTo(V * M, 6);
      expect(meanPxPerSec(closed, M, SEAROUND)).toBeCloseTo(meanPxPerSec(open, M, RIVER_RUN), 6);
      // and the model reports that same pace on both
      expect(closed.paceSpeedPxPerSec).toBe(open.paceSpeedPxPerSec);
      expect(closed.paceSpeedPxPerSec).toBeCloseTo(V * M, 10);
      expect(name).toBeTruthy();
    }
  });

  it('different M => closed duration scales by exactly 1/M', () => {
    const base = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: SEAROUND,
      laps: 3,
      normalSpeedPxPerSec: V,
      speedMultiplier: 1.0,
      runoutZone: RUNOUT,
    });
    for (const [, M] of TYPES) {
      const m = deriveRaceDuration({
        isOpen: false,
        pathLengthPx: SEAROUND,
        laps: 3,
        normalSpeedPxPerSec: V,
        speedMultiplier: M,
        runoutZone: RUNOUT,
      });
      expect(m.realizedDurationSec).toBeCloseTo(base.realizedDurationSec / M, 8);
    }
  });

  it('different M => the open natural maximum scales by exactly 1/M', () => {
    const base = naturalMaxSeconds(RIVER_RUN, V * 1.0, RUNOUT);
    for (const [, M] of TYPES) {
      expect(naturalMaxSeconds(RIVER_RUN, V * M, RUNOUT)).toBeCloseTo(base / M, 8);
    }
  });

  it('different M => a fixed open time moves the finish line by exactly M', () => {
    // Open races are time-bounded, so the type changes DISTANCE rather than duration.
    const secs = 20;
    const base = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: secs,
      normalSpeedPxPerSec: V,
      speedMultiplier: 1.0,
      runoutZone: RUNOUT,
    });
    for (const [, M] of TYPES) {
      const m = deriveRaceDuration({
        isOpen: true,
        pathLengthPx: RIVER_RUN,
        requestedSeconds: secs,
        normalSpeedPxPerSec: V,
        speedMultiplier: M,
        runoutZone: RUNOUT,
      });
      expect(m.finishT).toBeCloseTo(base.finishT * M, 10);
      expect(m.realizedDurationSec).toBeCloseTo(secs, 10);
    }
  });

  it('the slowdown factor is computed at the type-aware pace', () => {
    const M = 0.3; // snail: a short natural maximum, so a modest request already slows it
    const natMax = naturalMaxSeconds(RIVER_RUN, V * M, RUNOUT);
    const requested = Math.ceil(natMax) + 30;
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: requested,
      normalSpeedPxPerSec: V,
      speedMultiplier: M,
      runoutZone: RUNOUT,
    });
    expect(m.slowdownActive).toBe(true);
    expect(m.paceScale).toBeCloseTo(natMax / requested, 12);
    expect(m.effectiveSpeedPxPerSec).toBeCloseTo(V * M * m.paceScale, 10);
    expect(m.realizedDurationSec).toBeCloseTo(requested, 8);
  });
});

describe('open tracks — time in, finish line out', () => {
  it('natural maximum is the runout-adjusted traversal at normal speed', () => {
    expect(naturalMaxSeconds(RIVER_RUN, V, RUNOUT)).toBeCloseTo(((1 - RUNOUT) * RIVER_RUN) / V, 10);
  });

  it('in range: finishT lands where a mean racer is after the chosen time', () => {
    const secs = 30;
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: secs,
      normalSpeedPxPerSec: V,
      runoutZone: RUNOUT,
    });
    expect(m.finishT).toBeCloseTo((V * secs) / RIVER_RUN, 10);
    expect(m.finishT).toBeLessThan(1 - RUNOUT);
    expect(m.realizedDurationSec).toBeCloseTo(secs, 10);
    expect(m.paceScale).toBe(1);
    expect(m.slowdownActive).toBe(false);
  });

  it('at exactly the natural maximum: finish line sits on the runout boundary, no slowdown', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V, RUNOUT);
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: natMax,
      normalSpeedPxPerSec: V,
      runoutZone: RUNOUT,
    });
    expect(m.finishT).toBeCloseTo(1 - RUNOUT, 10);
    expect(m.slowdownActive).toBe(false);
    expect(m.paceScale).toBe(1);
  });

  it('beyond the maximum: the whole field slows uniformly and the race still lasts the chosen time', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V, RUNOUT);
    const secs = natMax * 2;
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: secs,
      normalSpeedPxPerSec: V,
      runoutZone: RUNOUT,
    });
    expect(m.finishT).toBeCloseTo(1 - RUNOUT, 10);
    expect(m.slowdownActive).toBe(true);
    expect(m.paceScale).toBeCloseTo(0.5, 10); // exactly half pace for twice the time
    expect(m.effectiveSpeedPxPerSec).toBeCloseTo(V / 2, 10);
    expect(m.realizedDurationSec).toBeCloseTo(secs, 10);
  });

  it('the slowdown factor is exactly naturalMax / requested', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V, RUNOUT);
    for (const secs of [natMax * 1.1, natMax * 1.5, natMax * 3]) {
      const m = deriveRaceDuration({
        isOpen: true,
        pathLengthPx: RIVER_RUN,
        requestedSeconds: secs,
        normalSpeedPxPerSec: V,
        runoutZone: RUNOUT,
      });
      expect(m.paceScale).toBeCloseTo(natMax / secs, 12);
      expect(m.realizedDurationSec).toBeCloseTo(secs, 8);
    }
  });

  it('there is no hidden lower clamp on the pace (the old _MIN_SCALE 0.5 floor is gone)', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V, RUNOUT);
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: natMax * 10,
      normalSpeedPxPerSec: V,
      runoutZone: RUNOUT,
    });
    expect(m.paceScale).toBeCloseTo(0.1, 10); // would have been floored at 0.5 before
    expect(m.realizedDurationSec).toBeCloseTo(natMax * 10, 6);
  });

  it('a mean racer under slowdown travels the reduced speed exactly', () => {
    const M = 0.85;
    // The natural maximum — and therefore the slowdown — is taken at THIS race's pace.
    const natMax = naturalMaxSeconds(RIVER_RUN, V * M, RUNOUT);
    const secs = natMax * 1.6;
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: secs,
      normalSpeedPxPerSec: V,
      speedMultiplier: M,
      runoutZone: RUNOUT,
    });
    expect(m.slowdownActive).toBe(true);
    const pxPerSec = m.raceBaseSpeed * M * RIVER_RUN * REFERENCE_FPS;
    expect(pxPerSec).toBeCloseTo(V * M * m.paceScale, 8);
    expect(m.effectiveSpeedPxPerSec).toBeCloseTo(V * M * m.paceScale, 10);
  });
});

describe('the one clock — realizedDurationSec is self-consistent', () => {
  const cases = [
    { name: 'closed 1 lap', args: { isOpen: false, pathLengthPx: SEAROUND, laps: 1 } },
    { name: 'closed 4 laps', args: { isOpen: false, pathLengthPx: DIRT_OVAL, laps: 4 } },
    {
      name: 'open in range',
      args: { isOpen: true, pathLengthPx: RIVER_RUN, requestedSeconds: 20 },
    },
    {
      name: 'open slowdown',
      args: { isOpen: true, pathLengthPx: RIVER_RUN, requestedSeconds: 200 },
    },
  ];

  for (const { name, args } of cases) {
    it(`${name}: a mean racer covers finishT in exactly realizedDurationSec`, () => {
      const M = 1.15;
      const m = deriveRaceDuration({
        ...args,
        normalSpeedPxPerSec: V,
        speedMultiplier: M,
        runoutZone: RUNOUT,
      });
      const tPerFrame = m.raceBaseSpeed * M;
      const secondsToFinish = m.finishT / (tPerFrame * REFERENCE_FPS);
      expect(secondsToFinish).toBeCloseTo(m.realizedDurationSec, 8);
    });
  }
});

describe('browser and sim compute identical duration scalars from identical inputs', () => {
  // The seam this ship closed: the browser used to pace from a NOMINAL duration
  // (estimatedSecondsPerLap x laps) while the sim used the raw setting. Both now call
  // this one function, so equality is structural. These cases pin the three shapes the
  // acceptance cares about, exactly as the two call sites build them.
  const call = (args) =>
    deriveRaceDuration({ normalSpeedPxPerSec: V, runoutZone: RUNOUT, ...args });

  const scalars = (m) => [
    m.finishT,
    m.realizedDurationSec,
    m.raceBaseSpeed,
    m.paceScale,
    m.paceSpeedPxPerSec,
  ];

  it('closed laps case: bit-identical', () => {
    const browser = call({ isOpen: false, pathLengthPx: SEAROUND, laps: 2, speedMultiplier: 1.1 });
    const sim = call({ isOpen: false, pathLengthPx: SEAROUND, laps: 2, speedMultiplier: 1.1 });
    expect(scalars(sim)).toEqual(scalars(browser));
    // and the values are the physically expected ones, not merely equal to each other
    expect(browser.finishT).toBe(2);
    expect(browser.realizedDurationSec).toBeCloseTo((2 * SEAROUND) / (V * 1.1), 10);
    expect(browser.paceSpeedPxPerSec).toBeCloseTo(V * 1.1, 10);
  });

  it('open in-range case: bit-identical', () => {
    const args = {
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: 40,
      speedMultiplier: 0.85,
    };
    expect(scalars(call(args))).toEqual(scalars(call(args)));
    expect(call(args).paceScale).toBe(1);
    expect(call(args).realizedDurationSec).toBeCloseTo(40, 10);
  });

  it('open slowdown case: bit-identical including the pace factor', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V * 0.85, RUNOUT);
    const requested = Math.ceil(natMax) + 25;
    const args = {
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: requested,
      speedMultiplier: 0.85,
    };
    const browser = call(args);
    const sim = call(args);
    expect(scalars(sim)).toEqual(scalars(browser));
    expect(browser.slowdownActive).toBe(true);
    expect(browser.paceScale).toBe(sim.paceScale);
    expect(browser.paceScale).toBeCloseTo(natMax / requested, 12);
  });

  it('degenerate inputs return the same empty result on both sides', () => {
    for (const args of [
      { isOpen: false, pathLengthPx: 0, laps: 2 },
      { isOpen: true, pathLengthPx: RIVER_RUN, requestedSeconds: 0 },
      { isOpen: false, pathLengthPx: SEAROUND, laps: 2, normalSpeedPxPerSec: 0 },
    ]) {
      const m = call(args);
      expect(m.realizedDurationSec).toBe(0);
      expect(m.raceBaseSpeed).toBe(0);
    }
  });
});

describe('protocol mapping — lapsForApproxSeconds', () => {
  it('picks the lap count whose derived duration is closest to the requested seconds', () => {
    for (const secs of [30, 60, 120, 300]) {
      const laps = lapsForApproxSeconds(secs, SEAROUND, V);
      const derived = secondsForLaps(laps, SEAROUND, V);
      const oneLap = secondsForLaps(1, SEAROUND, V);
      expect(Math.abs(derived - secs)).toBeLessThanOrEqual(oneLap / 2 + 1e-9);
    }
  });

  it('never returns less than one lap', () => {
    expect(lapsForApproxSeconds(1, SEAROUND, V)).toBe(MIN_LAPS);
    expect(lapsForApproxSeconds(0, SEAROUND, V)).toBe(MIN_LAPS);
  });

  it('is the inverse of secondsForLaps for exact multiples', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      expect(lapsForApproxSeconds(secondsForLaps(n, DIRT_OVAL, V), DIRT_OVAL, V)).toBe(n);
    }
  });
});

describe('migration — legacy per-track defaults', () => {
  it('legacyLapsFromDefaultDuration reproduces the deleted staircase exactly', () => {
    expect(legacyLapsFromDefaultDuration(30)).toBe(1);
    expect(legacyLapsFromDefaultDuration(59)).toBe(1);
    expect(legacyLapsFromDefaultDuration(60)).toBe(2);
    expect(legacyLapsFromDefaultDuration(89)).toBe(2);
    expect(legacyLapsFromDefaultDuration(90)).toBe(3);
    expect(legacyLapsFromDefaultDuration(119)).toBe(3);
    expect(legacyLapsFromDefaultDuration(120)).toBe(4);
    expect(legacyLapsFromDefaultDuration(180)).toBe(4);
  });

  it('prefers a migrated defaultLaps over the legacy field', () => {
    expect(trackDefaultLaps({ defaultLaps: 3, defaultDuration: 60 })).toBe(3);
  });

  it('falls back to the staircase for an unmigrated track', () => {
    expect(trackDefaultLaps({ defaultDuration: 120 })).toBe(4);
  });

  it('falls back to one lap for a track with neither field', () => {
    expect(trackDefaultLaps({})).toBe(MIN_LAPS);
    expect(trackDefaultLaps(null)).toBe(MIN_LAPS);
  });

  it('open default seconds are clamped to the natural maximum so defaults never warn', () => {
    const natMax = naturalMaxSeconds(RIVER_RUN, V, RUNOUT);
    // river-run shipped defaultDuration 60 s, which exceeds its natural max at 225 px/s
    const secs = trackDefaultSeconds({ defaultDuration: 60 }, RIVER_RUN, V, RUNOUT);
    expect(secs).toBeLessThanOrEqual(Math.floor(natMax));
    const m = deriveRaceDuration({
      isOpen: true,
      pathLengthPx: RIVER_RUN,
      requestedSeconds: secs,
      normalSpeedPxPerSec: V,
      runoutZone: RUNOUT,
    });
    expect(m.slowdownActive).toBe(false);
  });

  it('leaves an in-range default alone', () => {
    expect(trackDefaultSeconds({ defaultDurationSec: 30 }, RIVER_RUN, V, RUNOUT)).toBe(30);
  });

  it('never returns less than the open-track floor', () => {
    expect(trackDefaultSeconds({ defaultDurationSec: 1 }, RIVER_RUN, V, RUNOUT)).toBe(
      OPEN_TRACK_MIN_SECONDS
    );
  });
});

describe('fieldFinishWindow — the displayed spread around the derived duration', () => {
  it('brackets the mean duration', () => {
    const w = fieldFinishWindow(60, 40, DEFAULT_BASE_SPEED_CONFIG);
    expect(w.medianSec).toBe(60);
    expect(w.firstSec).toBeLessThan(60);
    expect(w.lastSec).toBeGreaterThan(60);
  });

  it('widens as the field grows (extremes get more extreme)', () => {
    const few = fieldFinishWindow(60, 3, DEFAULT_BASE_SPEED_CONFIG);
    const many = fieldFinishWindow(60, 100, DEFAULT_BASE_SPEED_CONFIG);
    expect(many.lastSec - many.firstSec).toBeGreaterThan(few.lastSec - few.firstSec);
  });

  it('collapses to the mean when the spread is zero-width', () => {
    const w = fieldFinishWindow(60, 40, { min: 0.001, max: 0.001 });
    expect(w.firstSec).toBeCloseTo(60, 10);
    expect(w.lastSec).toBeCloseTo(60, 10);
  });
});
