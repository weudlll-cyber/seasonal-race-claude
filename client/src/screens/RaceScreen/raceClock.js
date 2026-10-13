// ============================================================
// File:        raceClock.js
// Path:        client/src/screens/RaceScreen/raceClock.js
// Project:     RaceArena — PAUSE-RESUME-1
// Description: The race screen's pause-aware clock. ONE paused flag, and the one place that turns
//              the browser's wall clock into race-screen time — the time every clock on the race
//              screen reads.
//
// ★ WHY ONE CLOCK AND NOT A PATCH PER SITE. The race screen runs on the browser's wall clock in
//   more places than one would guess: the ceremony clock (`ts - st.countdownStart`), the race start
//   stamp (`st.raceStart`, which the camera's `raceElapsed`, the drawn race timer and the result's
//   `elapsedTime` all subtract from), the camera's own `ts`, the battle slow-motion release
//   (`battleSlowmo.js`), the final-lap stamp, the track lights, the countdown number, and three
//   `setTimeout`s (the state-overlay line, the finish hand-over and the winner card). Shifting each
//   stamp on resume would mean a list of sites that has to be kept complete by hand. Instead the
//   loop asks THIS clock what time it is, and the clock answers in time that stopped while the race
//   was paused — so every site that reads the loop's `ts` is pause-aware without being touched.
//
// ★ THE ARITHMETIC. `frameTime(rawTs)` returns `rawTs - pausedTotal`. A race that never pauses has
//   `pausedTotal === 0`, and `x - 0 === x` for every finite number, so such a race sees EXACTLY the
//   timestamps it saw before this file existed — byte-identical, which is what keeps every
//   fingerprint where it is.
//
// ★ WHY THE PAUSE IS STAMPED IN FRAME TIME, NOT AT THE CLICK. A click handler runs between frames,
//   and the browser's frame timestamp for the next frame can be EARLIER than `performance.now()` at
//   the click. Stamping the pause and the resume at the click would let the first frame after a
//   resume land before the last frame drawn — a negative frame delta, which the physics accumulator
//   would subtract. So `pause()` only raises the flag; the FIRST frame that sees it records its own
//   timestamp as the moment time stopped, and the first frame after `resume()` adds exactly the
//   frame time that passed since then. That frame then reads the same race-screen time the first
//   skipped frame would have read, so the race resumes from the exact state it stopped in, with the
//   same frame delta it would have had.
//
// ★ TIMERS. `setTimeout` here is a pause-aware timer: pausing suspends it with its remaining time,
//   resuming re-arms it with that remainder. The race screen's three timers go through it.
// ============================================================

/**
 * Create the race screen's pause-aware clock.
 *
 * @param {object} [deps]   injected for tests; the defaults are the browser's own
 * @param {() => number} [deps.now]        the wall clock timers are measured against
 * @param {Function} [deps.setTimer]      `setTimeout`
 * @param {Function} [deps.clearTimer]    `clearTimeout`
 */
export function createRaceClock({
  now = () => performance.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
} = {}) {
  // THE paused flag. Everything that stands still while paused reads this, directly or through
  // `frameTime` returning null.
  let paused = false;
  // The timestamp of the first frame that found the clock paused; null when not mid-pause.
  let pausedAtFrame = null;
  // Total frame time spent paused, over the whole race. 0 for a race that never pauses.
  let pausedTotal = 0;
  // Live pause-aware timers: { fn, dueAt, remaining, id }.
  const timers = new Set();

  function arm(t, ms) {
    t.dueAt = now() + ms;
    t.id = setTimer(() => {
      timers.delete(t);
      t.fn();
    }, ms);
  }

  return {
    /** Is the race paused? */
    get paused() {
      return paused;
    },

    /** Total frame time spent paused so far (ms). */
    get pausedTotalMs() {
      return pausedTotal;
    },

    /** Stop time. Returns false if already paused. */
    pause() {
      if (paused) return false;
      paused = true;
      for (const t of timers) {
        t.remaining = Math.max(0, t.dueAt - now());
        clearTimer(t.id);
      }
      return true;
    },

    /** Let time run again. Returns false if not paused. */
    resume() {
      if (!paused) return false;
      paused = false;
      for (const t of timers) arm(t, t.remaining);
      return true;
    },

    /**
     * Race-screen time for the frame the browser stamped `rawTs`, or `null` while paused — the
     * frame then does nothing at all, and the picture drawn last stays on the canvas.
     * @param {number} rawTs  the `requestAnimationFrame` timestamp
     * @returns {number|null}
     */
    frameTime(rawTs) {
      if (paused) {
        if (pausedAtFrame === null) pausedAtFrame = rawTs;
        return null;
      }
      if (pausedAtFrame !== null) {
        pausedTotal += rawTs - pausedAtFrame;
        pausedAtFrame = null;
      }
      return rawTs - pausedTotal;
    },

    /**
     * Race-screen time NOW, for a handler that runs between frames (the ceremony skip). Only
     * meaningful while not paused — every caller is guarded on that.
     */
    timeNow() {
      return now() - pausedTotal;
    },

    /**
     * A pause-aware `setTimeout`: no time passes for it while the race is paused.
     * @returns {object} a handle for `clearTimeout`
     */
    setTimeout(fn, ms) {
      const t = { fn, dueAt: 0, remaining: ms, id: null };
      timers.add(t);
      if (paused) t.remaining = ms;
      else arm(t, ms);
      return t;
    },

    /** Cancel a timer made by `setTimeout` above. Tolerates null and an already-fired handle. */
    clearTimeout(handle) {
      if (!handle || !timers.has(handle)) return;
      timers.delete(handle);
      clearTimer(handle.id);
    },
  };
}
