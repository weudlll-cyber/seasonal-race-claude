// ============================================================
// File:        raceClock.test.js
// Path:        client/src/screens/RaceScreen/raceClock.test.js
// Project:     RaceArena — PAUSE-RESUME-1
//
// The race screen's pause-aware clock, on its own: frame time that stops while paused, and timers
// that keep their remaining time across a pause. `pauseResume.test.jsx` drives the same clock through
// the real screen; this file pins the arithmetic it relies on.
// ============================================================

import { describe, expect, it, vi } from 'vitest';
import { createRaceClock } from './raceClock.js';

/** A clock with an injected wall clock and timer queue, so time is the test's to move. */
function fakeWorld() {
  let now = 0;
  let nextId = 1;
  const pending = new Map();
  const clock = createRaceClock({
    now: () => now,
    setTimer: (fn, ms) => {
      const id = nextId++;
      pending.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimer: (id) => pending.delete(id),
  });
  const advance = (ms) => {
    now += ms;
    for (const [id, t] of [...pending]) {
      if (t.at <= now) {
        pending.delete(id);
        t.fn();
      }
    }
  };
  return { clock, advance };
}

describe('PAUSE-RESUME-1 — frame time', () => {
  it('a race that never pauses reads the browser frame time unchanged', () => {
    const { clock } = fakeWorld();
    for (const ts of [16.7, 33.4, 1234.5678, 99999.125]) expect(clock.frameTime(ts)).toBe(ts);
    expect(clock.pausedTotalMs).toBe(0);
  });

  it('★ frame time does not advance while paused, and resumes where it stopped', () => {
    const { clock } = fakeWorld();
    expect(clock.frameTime(1000)).toBe(1000);
    expect(clock.frameTime(1016)).toBe(1016);
    clock.pause();
    // Every frame while paused is skipped: no time is handed out at all.
    for (let ts = 1032; ts < 6032; ts += 16) expect(clock.frameTime(ts)).toBeNull();
    clock.resume();
    // The first frame after the resume reads the time the first skipped frame would have read.
    expect(clock.frameTime(6032)).toBe(1032);
    expect(clock.frameTime(6048)).toBe(1048);
    expect(clock.pausedTotalMs).toBe(5000);
  });

  it('a pause and resume between two frames costs no time and never runs time backwards', () => {
    const { clock } = fakeWorld();
    expect(clock.frameTime(1000)).toBe(1000);
    clock.pause();
    clock.resume();
    expect(clock.frameTime(1016)).toBe(1016);
  });

  it('repeated pauses add up', () => {
    const { clock } = fakeWorld();
    clock.frameTime(0);
    clock.pause();
    clock.frameTime(100);
    clock.resume();
    expect(clock.frameTime(400)).toBe(100);
    clock.pause();
    clock.frameTime(500);
    clock.frameTime(516);
    clock.resume();
    // 500 raw was 200 of race time (300 already paused); the second pause adds 1000 more.
    expect(clock.frameTime(1500)).toBe(200);
    expect(clock.pausedTotalMs).toBe(1300);
  });

  it('pause and resume report whether they changed anything', () => {
    const { clock } = fakeWorld();
    expect(clock.resume()).toBe(false);
    expect(clock.pause()).toBe(true);
    expect(clock.paused).toBe(true);
    expect(clock.pause()).toBe(false);
    expect(clock.resume()).toBe(true);
    expect(clock.paused).toBe(false);
  });

  it('timeNow is the wall clock minus the paused time', () => {
    const { clock, advance } = fakeWorld();
    clock.frameTime(0);
    clock.pause();
    clock.frameTime(10);
    advance(2000);
    clock.resume();
    clock.frameTime(2010);
    expect(clock.timeNow()).toBe(0);
  });
});

describe('PAUSE-RESUME-1 — pause-aware timers', () => {
  it('★ a timer does not fire while paused and fires after its remaining time on resume', () => {
    const { clock, advance } = fakeWorld();
    const fn = vi.fn();
    clock.setTimeout(fn, 1000);
    advance(400);
    clock.pause();
    advance(10000);
    expect(fn).not.toHaveBeenCalled();
    clock.resume();
    advance(599);
    expect(fn).not.toHaveBeenCalled();
    advance(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a timer set while paused starts counting on resume', () => {
    const { clock, advance } = fakeWorld();
    const fn = vi.fn();
    clock.pause();
    clock.setTimeout(fn, 300);
    advance(5000);
    expect(fn).not.toHaveBeenCalled();
    clock.resume();
    advance(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a cleared timer never fires, paused or not; clearing null or a fired handle is harmless', () => {
    const { clock, advance } = fakeWorld();
    const a = vi.fn();
    const b = vi.fn();
    const ha = clock.setTimeout(a, 100);
    const hb = clock.setTimeout(b, 100);
    clock.clearTimeout(ha);
    clock.pause();
    clock.clearTimeout(hb);
    clock.resume();
    advance(1000);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    const c = vi.fn();
    const hc = clock.setTimeout(c, 10);
    advance(10);
    expect(c).toHaveBeenCalledTimes(1);
    expect(() => clock.clearTimeout(hc)).not.toThrow();
    expect(() => clock.clearTimeout(null)).not.toThrow();
  });

  it('an unpaused timer is an ordinary timer: same delay, one call', () => {
    const setTimer = vi.fn(() => 7);
    const clock = createRaceClock({ now: () => 0, setTimer, clearTimer: () => {} });
    clock.setTimeout(() => {}, 2500);
    expect(setTimer).toHaveBeenCalledTimes(1);
    expect(setTimer.mock.calls[0][1]).toBe(2500);
  });
});
