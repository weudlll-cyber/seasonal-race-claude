// ============================================================
// File:        perfLog.test.js
// Path:        client/src/screens/RaceScreen/perfLog.test.js
// Project:     RaceArena — PERF-WHERE-1
//
// WHAT THIS GUARDS: that a perf-log export says WHERE in the race it was taken, and that it says
// nothing when there is nothing to say.
//
// WHY IT IS WORTH MORE THAN IT LOOKS. The owner has two recordings that could not be compared,
// because neither names its own conditions. PHYS-BENCH-1 then spent a whole block establishing from
// the outside that the cost is quadratic in FIELD SIZE and nearly flat in density — a question the
// export could have answered for free. The failure mode is silent by construction: a log with no
// context looks exactly as complete as one with it, and is read as if it were.
//
// The second half is the 50 ms cap. `total` saturates at exactly 50.00, so p90/p99/max stop
// distinguishing a hiccup from a deschedule at the precise moment that distinction is the question.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  createPerfLog,
  recordPerfFrame,
  getPerfStats,
  exportPerfLog,
  buildPerfContext,
} from './perfLog.js';

/** One recorded frame, with the brackets laid out so each phase has a known duration. */
function record(log, { ts = 0, rawDt = 16.7, uncapped = undefined, nRacers = 40 } = {}) {
  recordPerfFrame(log, ts, rawDt, 0, 1, 2, 3, 4, nRacers, 1, 16, 0, 0, uncapped);
}

const raceState = (over = {}) => ({
  physicsTs: 12345,
  maxLaps: 2,
  raceProgress: 0.42,
  finishedCount: 0,
  racers: [
    { index: 0, t: 1.8, lap: 2, finished: false, name: 'Turbo' },
    { index: 1, t: 1.5, lap: 2, finished: false, name: 'Blaze' },
    { index: 2, t: 1.2, lap: 1, finished: false, name: 'Rocket' },
  ],
  ...over,
});

describe('the export says WHERE in the race it was taken (PERF-WHERE-1)', () => {
  // What breaks if deleted: the context silently stops being written and every future recording is
  // as uncomparable as the two that caused this block. Nothing would look wrong.
  it('carries the new fields when a context is supplied', () => {
    const log = createPerfLog();
    record(log);
    const out = JSON.parse(
      exportPerfLog(log, buildPerfContext(raceState(), { namesOn: true, roster: 'current' }))
    );

    expect(out.context).toBeDefined();
    expect(out.context.physicsMs).toBe(12345);
    expect(out.context.physicsSec).toBe(12.35);
    expect(out.context.leaderLap).toBe(2);
    expect(out.context.maxLaps).toBe(2);
    expect(out.context.raceProgress).toBe(0.42);
    expect(out.context.spreadT).toBeCloseTo(0.6, 5);
    expect(out.context.nRacers).toBe(3);
    expect(out.context.running).toBe(3);
    expect(out.context.roster).toBe('current');
    expect(out.context.namesOn).toBe(true);
  });

  // What breaks if deleted: a reader could not tell an OLD export from one taken during a race that
  // had nothing to say. `context: null` would be indistinguishable from a race with no racers.
  it('has NO context key at all when none is supplied — not a null one', () => {
    const log = createPerfLog();
    record(log);
    const out = JSON.parse(exportPerfLog(log));
    expect('context' in out).toBe(false);
    // …and the rest of the file is exactly what it was.
    expect(out.stats).toBeDefined();
    expect(out.recentFrames).toHaveLength(1);
  });

  it('is absent when the log is off — there is no log to export', () => {
    // `enablePerfLog` off means `createPerfLog()` is never called and `perfLogRef.current` stays
    // null, so both HUD export paths return before reaching `exportPerfLog`. The context can only
    // exist for a log that exists; this asserts the other half — an empty log yields no context.
    const log = createPerfLog();
    const out = JSON.parse(exportPerfLog(log, buildPerfContext(null)));
    expect('context' in out).toBe(false);
    expect(out.stats).toBeNull();
  });

  it('returns null rather than a context full of zeros when there is no race', () => {
    expect(buildPerfContext(null)).toBeNull();
    expect(buildPerfContext({})).toBeNull();
    expect(buildPerfContext({ racers: [] })).toBeNull();
  });

  // What breaks if deleted: the spread would read near zero at the end of every race, when 39 of 40
  // racers have finished and are parked at the line — the opposite of the truth.
  it('measures leader-to-last over the RUNNING racers only', () => {
    const st = raceState();
    st.racers[2].finished = true;
    st.finishedCount = 1;
    const ctx = buildPerfContext(st);
    expect(ctx.running).toBe(2);
    expect(ctx.finishedCount).toBe(1);
    expect(ctx.spreadT).toBeCloseTo(0.3, 5); // 1.8 - 1.5, not 1.8 - 1.2
  });

  it('reports nulls for the spread when every racer has finished', () => {
    const st = raceState();
    for (const r of st.racers) r.finished = true;
    const ctx = buildPerfContext(st);
    expect(ctx.running).toBe(0);
    expect(ctx.spreadT).toBeNull();
    expect(ctx.leaderT).toBeNull();
    expect(ctx.nRacers).toBe(3); // the field size is still known
  });
});

describe('the 50 ms cap on `total` no longer hides the worst frames (PERF-WHERE-1)', () => {
  // What breaks if deleted: `max` reads 50.00 for a 400 ms deschedule and for a 51 ms hiccup, and
  // the person reading it cannot tell which they are looking at.
  it('records the uncapped delta beside the capped one', () => {
    const log = createPerfLog();
    record(log, { rawDt: 16.7, uncapped: 16.7 });
    record(log, { rawDt: 50, uncapped: 412.9 }); // a real deschedule, capped to 50 for physics
    const out = JSON.parse(exportPerfLog(log));

    expect(out.recentFrames[1].total).toBe(50);
    expect(out.recentFrames[1].totalUncapped).toBe(412.9);
    expect(out.stats.total.max).toBe(50);
    expect(out.stats.totalUncapped.max).toBe(412.9);
  });

  it('carries it into the spike list too, which is where the worst frames are read', () => {
    const log = createPerfLog();
    record(log, { rawDt: 50, uncapped: 412.9 });
    const out = JSON.parse(exportPerfLog(log));
    expect(out.spikes).toHaveLength(1);
    expect(out.spikes[0].totalUncapped).toBe(412.9);
  });

  // What breaks if deleted: an omitted argument would record 0 ms, which reads as an impossibly
  // fast frame rather than as a missing measurement — the worst way for this to fail.
  it('falls back to the capped value when a caller omits it, never to zero', () => {
    const log = createPerfLog();
    recordPerfFrame(log, 0, 33.3, 0, 1, 2, 3, 4, 40);
    const stats = getPerfStats(log);
    expect(stats.totalUncapped.max).toBe(33.3);
  });

  it('states the cap in the legend as well, since the two answer different halves', () => {
    const log = createPerfLog();
    record(log);
    const out = JSON.parse(exportPerfLog(log));
    expect(out._legend.total).toMatch(/CAPPED AT 50/);
    expect(out._legend.totalUncapped).toMatch(/NO cap/);
    expect(out._legend.context).toMatch(/WHERE in the race/);
  });
});

// ── FRAME-GAP-1: `other` becomes splittable ─────────────────────────────────────────────────────
//
// WHAT THESE GUARD. `other` is a SUBTRACTION, not a measurement — it is the name of our ignorance,
// and at 100 racers it holds 10–28 ms of a 33 ms frame while every bracket we own sums to 6–8. The
// two fields below are the only way to say which half of that is ours. If they silently stopped
// being recorded, the diagnosis would go back to a single unsplittable number and nothing would say
// so; that is the failure this file exists to prevent.

describe('rafLate — how late the browser was to us (FRAME-GAP-1)', () => {
  it('is recorded per frame and summarised beside the other brackets', () => {
    const log = createPerfLog();
    // Three frames whose rafLate rises: the percentiles must follow the values, not the order.
    recordPerfFrame(log, 0, 16.7, 0, 1, 2, 3, 4, 40, 1, 16, 0, 0, 16.7, 1);
    recordPerfFrame(log, 16, 16.7, 0, 1, 2, 3, 4, 40, 1, 16, 0, 0, 16.7, 9);
    recordPerfFrame(log, 32, 16.7, 0, 1, 2, 3, 4, 40, 1, 16, 0, 0, 16.7, 5);
    const s = getPerfStats(log);
    expect(s.rafLate.max).toBe(9);
    expect(s.rafLate.p50).toBe(5);
    // The L203 pair: a DIFFERENT set of values must give a different answer, or this is testing
    // that the field exists rather than that it carries anything.
    const quiet = createPerfLog();
    recordPerfFrame(quiet, 0, 16.7, 0, 1, 2, 3, 4, 40, 1, 16, 0, 0, 16.7, 0);
    expect(getPerfStats(quiet).rafLate.max).toBe(0);
  });

  it('defaults to 0 when a caller omits it — an old caller must not write undefined', () => {
    const log = createPerfLog();
    recordPerfFrame(log, 0, 16.7, 0, 1, 2, 3, 4, 40);
    expect(getPerfStats(log).rafLate.max).toBe(0);
  });

  it('reaches the export, because it is only useful read BESIDE `other`', () => {
    const log = createPerfLog();
    recordPerfFrame(log, 0, 30, 0, 1, 2, 3, 4, 40, 1, 16, 0, 0, 30, 21.5);
    const f = JSON.parse(exportPerfLog(log)).recentFrames[0];
    expect(f.rafLate).toBe(21.5);
    // The claim the field is for: a 30 ms frame with 4 ms measured has 26 ms of `other`, and this
    // says 21.5 of it was the browser being late rather than anything we ran.
    expect(f.other).toBeCloseTo(26, 5);
  });
});

describe('long tasks — the blocks we cannot bracket (FRAME-GAP-1)', () => {
  it('records that the API is UNAVAILABLE rather than reporting zero long tasks', async () => {
    // The distinction the brief asks for, and it is not pedantry: "no long tasks" and "this browser
    // cannot see long tasks" point at opposite conclusions, and a bare 0 says the reassuring one.
    const { startLongTaskObserver } = await import('./perfLog.js');
    const log = createPerfLog();
    expect(log.longTasks.supported).toBe(null); // never started
    startLongTaskObserver(log); // jsdom has no longtask entry type
    expect(log.longTasks.supported).toBe(false);
    // The stats view reports it too, and needs a frame to exist at all — `getPerfStats` returns
    // null on an empty ring, which is correct: percentiles over nothing are not zero.
    recordPerfFrame(log, 0, 16.7, 0, 1, 2, 3, 4, 40);
    expect(getPerfStats(log).longTasks.supported).toBe(false);
  });

  it('tallies count, total, max and attribution when the browser does provide entries', async () => {
    const { startLongTaskObserver, stopLongTaskObserver } = await import('./perfLog.js');
    // A stand-in PerformanceObserver: the real one is the browser's, so what is testable here is
    // that the callback's entries are accumulated the way the report will read them.
    let fire = null;
    class FakePO {
      static supportedEntryTypes = ['longtask'];
      constructor(cb) {
        fire = cb;
      }
      observe() {}
      disconnect() {}
    }
    const original = globalThis.PerformanceObserver;
    globalThis.PerformanceObserver = FakePO;
    try {
      const log = createPerfLog();
      startLongTaskObserver(log);
      expect(log.longTasks.supported).toBe(true);
      fire({
        getEntries: () => [
          { duration: 62, attribution: [{ containerType: 'window', containerName: 'self' }] },
          { duration: 120, attribution: [] },
        ],
      });
      expect(log.longTasks.count).toBe(2);
      expect(log.longTasks.totalMs).toBe(182);
      expect(log.longTasks.maxMs).toBe(120);
      expect(log.longTasks.attribution['window:self']).toBe(1);
      recordPerfFrame(log, 0, 16.7, 0, 1, 2, 3, 4, 40);
      expect(getPerfStats(log).longTasks.count).toBe(2);
      stopLongTaskObserver(log);
      expect(log._longTaskObserver).toBe(null);
    } finally {
      globalThis.PerformanceObserver = original;
    }
  });

  it('survives a browser that lists longtask and then refuses to observe it', async () => {
    const { startLongTaskObserver } = await import('./perfLog.js');
    class ThrowingPO {
      static supportedEntryTypes = ['longtask'];
      observe() {
        throw new Error('refused');
      }
      disconnect() {}
    }
    const original = globalThis.PerformanceObserver;
    globalThis.PerformanceObserver = ThrowingPO;
    try {
      const log = createPerfLog();
      startLongTaskObserver(log); // must not throw into the race
      expect(log.longTasks.supported).toBe(false);
    } finally {
      globalThis.PerformanceObserver = original;
    }
  });
});
