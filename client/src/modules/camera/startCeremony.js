// ============================================================
// File:        startCeremony.js
// Path:        client/src/modules/camera/startCeremony.js
// Project:     RaceArena — START-CEREMONY-CAMERA-1
//
// WHAT THIS IS FOR: the SHAPE of the opening — how long the venue shot is held, how the push in is
// paced, and where in that shape a given moment falls. The owner's word for what it must feel like
// is *ceremonial*: unhurried, deliberate, with a rhythm he can tune.
//
// WHAT IT IS NOT FOR: deciding either end of the move. The venue shot and the formation target are
// GEOMETRY — the track's extent and the field's extent — and they are computed where geometry lives
// (projection.js and framingRule.js's `fieldGuarantee`). This file only says how to get from one to
// the other and when.
//
// Pure: no state, no clock. `ceremonyTotalMs` is the one function here that reads a config, and
// CEREMONY-TRUTH-1 made its fallbacks the SHIPPED DEFAULTS rather than zero — see the note there.
//
// ── FALLBACK IS NOT DEFAULT (LESSON 199), AND THIS FILE HAD SIX OF THEM ─────────────────────────
// Every `cfg?.x ?? 0` here was a second authority on a value `defaults.js` already owns, and zero is
// not a neutral choice: `?? 0` on the digits window silently produces a ceremony with no countdown
// in it, which is exactly the shape of the defect this block was written for. A fallback that
// differs from the default is a value that applies only when nobody is looking.
//
// ── WHY THE PUSH IS EASE-IN-OUT BY DEFAULT AND THE OLD ONE WAS NOT ───────────────────────────────
// The countdown camera used ease-out cubic, which starts at full speed and decelerates. That reads
// as a SNAP followed by a settle — the camera appears to be catching up to something. Ceremony is
// the opposite shape: it begins at rest, gathers, and arrives at rest. So the default is
// ease-in-out, and ease-out is kept on the list so the owner can put the old feel back beside the
// new one and choose.
// ============================================================

/**
 * The easing curves offered to the owner, each mapping progress 0..1 to eased 0..1.
 *
 * All four are pinned to f(0) = 0 and f(1) = 1 by construction rather than by clamping, so a curve
 * can never arrive somewhere other than the target — a push-in that stopped at 0.98 would leave the
 * formation permanently a little too small and nothing would report it.
 */
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

export const CEREMONY_EASINGS = {
  /** Constant speed. The plainest reference, and the honest way to judge the others. */
  linear: (p) => p,
  /** Begins and ends at rest. The default: the ceremonial shape. */
  easeInOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  /** The same shape, held longer at both ends. The most deliberate of the four. */
  easeInOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
  /** Starts fast, decelerates. What the countdown did before this block — kept for comparison. */
  easeOutCubic: (p) => 1 - Math.pow(1 - p, 3),
};

/** The default when the setting is absent or names a curve that does not exist. */
export const DEFAULT_CEREMONY_EASING = 'easeInOutCubic';

/**
 * Resolve an easing by name, falling back to the default rather than throwing.
 *
 * A typo degrades to the shipped curve instead of to a crash or to `undefined` — the same rule the
 * transition grammar uses for an unknown value.
 */
export function ceremonyEasing(name) {
  return CEREMONY_EASINGS[name] ?? CEREMONY_EASINGS[DEFAULT_CEREMONY_EASING];
}

/** The four beats. None of them is a remainder — see `ceremonySchedule`. */
export const CEREMONY_BEAT = {
  /** The whole track, held still. */
  VENUE: 'venue',
  /** Easing from the venue shot to the formation. */
  PUSH: 'push',
  /**
   * ARRIVED, AND WAITING FOR THE READER (START-BOARD-2). The camera has finished travelling and
   * holds the formation while the runners' board is still up. It exists because the board's length
   * and the camera's are two different requirements: the push is how long a nice camera move takes
   * (taste, fixed), the board is how long a hundred names take to scan (arithmetic, scales with the
   * field). Stretching the push to cover a hundred names would make the camera crawl, which the
   * owner ruled out; so the camera arrives on its own schedule and this beat absorbs the rest.
   * Zero when the board is shorter than the push.
   */
  BOARD: 'board',
  /**
   * Board gone, formation held clean. THIS IS THE SEARCHING TIME (CEREMONY-TIME-1).
   *
   * The board teaches the number-to-name assignment; this beat is when the viewer takes that number
   * and finds it ON THE TRACK. The owner watching searound: the race started almost immediately
   * after the board disappeared, and nobody can find their racer that fast. It is the beat that
   * makes the board worth showing at all — a board with no searching time after it teaches something
   * the viewer has no chance to use.
   *
   * The digits do not run during it. See `countdownMs` in `ceremonySchedule`.
   */
  SETTLED: 'settled',
};

/**
 * How long the runners' board must be up, from the size of the field.
 *
 * `max(floorMs, msPerName × n)` — the owner's shape. The floor is what a SMALL field needs (a board
 * that flashes past is worse than no board), and the per-name term is what makes a hundred names
 * readable at all. His words after the first eye test: *"in that time it is absolutely impossible to
 * find your own racer."*
 *
 * BOTH TERMS WERE ROUGHLY DOUBLED IN CEREMONY-TIME-1 (3000/80 → 6000/120) after his second eye test
 * on searound, where the board was still shown too briefly. The shape did not change; only the
 * numbers, and they are starting values for his eye rather than measured truth.
 *
 * @param {number} n  racers on the board
 * @param {number} floorMs
 * @param {number} msPerName
 * @returns {number} ms the board is visible, fades included
 */
export function boardDurationMs(n, floorMs, msPerName) {
  const count = Number.isFinite(n) && n > 0 ? n : 0;
  const f = Math.max(0, Number.isFinite(floorMs) ? floorMs : 0);
  const per = Math.max(0, Number.isFinite(msPerName) ? msPerName : 0);
  return Math.max(f, per * count);
}

/**
 * The FOUR beats, and the countdown's length, which is now their SUM.
 *
 * CEREMONY-HANDOVER-1 MADE THE SETTLED BEAT A CONTROL. It used to be a REMAINDER — whatever was left
 * of the countdown after the venue and the push — so the one beat whose whole job is stillness could
 * only be set indirectly, by making the other two shorter. The owner watched the formation shot last
 * "VERY briefly" and had no slider for it. A beat that is a control must never silently become a
 * leftover again.
 *
 * ── START-BOARD-2 INVERTED THE CONSTRAINT, AND THAT IS THE CHANGE HERE ──────────────────────────
 * This function used to take `countdownMs` as a CAP and scale all three beats proportionally when
 * they overran it. That made every beat a function of every other beat: raising the push shortened
 * the venue shot and the settled beat by the same ratio, silently, with nothing saying so. The
 * previous block measured it and named it as the reason "just lengthen the push" was not a change
 * anyone could make safely.
 *
 * **The countdown now FOLLOWS the beats instead of capping them.** `totalMs` is simply their sum,
 * and it is what the race counts down. The consequences are deliberate and worth stating plainly:
 *
 *   - **No beat can change another.** Each slider means exactly the beat it names. There is no
 *     scaling factor left in this file, which is why `scaled` is gone from the return.
 *   - **The ceremony gets LONGER at a large field**, because `boardMs` does. That is intended: a
 *     hundred names cannot be read in two seconds, and the alternative — a crawling push — was
 *     ruled out.
 *   - **The camera's rhythm is untouched.** The push is still exactly `pushMs`; the extra time goes
 *     into a new BOARD beat in which the camera has already arrived and holds still.
 *
 * ── THE DIGITS BECAME A BEAT OF THEIR OWN (CEREMONY-TIME-1) ─────────────────────────────────────
 * The digits used to run for the WHOLE ceremony, because they are derived from `totalMs` — so a
 * longer opening simply meant counting from a bigger number, and there was no moment that could be
 * called "before the countdown begins". The owner asked for exactly that moment: the formation
 * standing in view, searchable, and only then the count.
 *
 * So the digits get their own tail window. It is NOT a cap and it must never become one — that is
 * the mistake `countdownDurationMs` made and START-BOARD-2 removed. It adds to `totalMs` like every
 * other beat; it only decides when the digits become VISIBLE, and the camera does not know it exists.
 *
 * @param {number} venueMs     venue-shot duration
 * @param {number} pushMs      push-in duration — the camera's own travel, never stretched
 * @param {number} settledMs   formation held CLEAN (board gone), for searching, before the digits
 * @param {number} boardMs     how long the board must be up, from `boardDurationMs`
 * @param {number} countdownMs the tail in which the DIGITS are shown. Added to the total, not taken
 *                             out of it.
 * @returns {{venueMs, pushMs, boardHoldMs, settledMs, countdownMs, boardStartMs, boardEndMs,
 *   countdownStartMs, totalMs}}
 */
export function ceremonySchedule(venueMs, pushMs, settledMs, boardMs = 0, countdownMs = 0) {
  const v = Math.max(0, Number.isFinite(venueMs) ? venueMs : 0);
  const p = Math.max(0, Number.isFinite(pushMs) ? pushMs : 0);
  const st = Math.max(0, Number.isFinite(settledMs) ? settledMs : 0);
  const b = Math.max(0, Number.isFinite(boardMs) ? boardMs : 0);
  const cd = Math.max(0, Number.isFinite(countdownMs) ? countdownMs : 0);
  // The board is up for the whole push and then for as long again as it still needs. When it is
  // SHORTER than the push it needs no extra hold at all and this beat is zero — a small field does
  // not make the ceremony longer.
  const boardHoldMs = Math.max(0, b - p);
  const boardEndMs = v + p + boardHoldMs;
  return {
    venueMs: v,
    pushMs: p,
    boardHoldMs,
    settledMs: st,
    countdownMs: cd,
    boardStartMs: v,
    boardEndMs,
    countdownStartMs: boardEndMs + st,
    totalMs: boardEndMs + st + cd,
  };
}

/**
 * The countdown's length for a field of `n`, from the config alone.
 *
 * ONE PLACE COMPUTES IT, and everything that needs it asks here: the camera, the phase advance that
 * fires the gun, the digits, and both fingerprint harnesses. It used to be a config value
 * (`countdownDurationMs`) that four of those five read independently of the beats — which is how the
 * beats came to be capped by a number that knew nothing about them.
 *
 * @param {object} cfg  a camera config
 * @param {number} n    racers in the race
 * @returns {number} ms
 */
export function ceremonyTotalMs(cfg, n) {
  const D = DEFAULT_CAMERA_CONFIG;
  return ceremonySchedule(
    cfg?.ceremonyVenueMs ?? D.ceremonyVenueMs,
    cfg?.ceremonyPushMs ?? D.ceremonyPushMs,
    cfg?.ceremonySettledMs ?? D.ceremonySettledMs,
    boardDurationMs(
      n,
      cfg?.startBoardFloorMs ?? D.startBoardFloorMs,
      cfg?.startBoardMsPerName ?? D.startBoardMsPerName
    ),
    cfg?.countdownDigitsMs ?? D.countdownDigitsMs
  ).totalMs;
}

/**
 * Where in the ceremony a moment falls.
 *
 * @param {number} elapsedMs  ms since the countdown began
 * @param {{venueMs:number, pushMs:number}} schedule  a fitted schedule from `ceremonySchedule`
 * @returns {{beat:string, progress:number}} `progress` is 0..1 WITHIN the current beat
 */
export function ceremonyAt(elapsedMs, schedule) {
  const e = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const { venueMs, pushMs, boardHoldMs = 0 } = schedule;
  if (e < venueMs) {
    return { beat: CEREMONY_BEAT.VENUE, progress: venueMs > 0 ? e / venueMs : 1 };
  }
  const intoPush = e - venueMs;
  if (pushMs > 0 && intoPush < pushMs) {
    return { beat: CEREMONY_BEAT.PUSH, progress: intoPush / pushMs };
  }
  const intoBoard = intoPush - pushMs;
  if (boardHoldMs > 0 && intoBoard < boardHoldMs) {
    return { beat: CEREMONY_BEAT.BOARD, progress: intoBoard / boardHoldMs };
  }
  return { beat: CEREMONY_BEAT.SETTLED, progress: 1 };
}

/**
 * How visible the runners' board is at a moment, 0..1.
 *
 * COMPUTED FROM THE ELAPSED TIME AND THE SCHEDULE, not from a beat and a progress. The board now
 * spans TWO beats (the push and the board hold), and a per-beat fade would have restarted at the
 * boundary — a visible pulse in the middle of the thing whose whole job is to be steady enough to
 * read. One window with one fade at each end has no seam in it by construction.
 *
 * IT IS GONE BEFORE THE SETTLED BEAT, which is the owner's requirement (d): the gun fires on a
 * clean picture. `boardEndMs` is where the settled beat starts, and the fade-out completes there.
 *
 * @param {number} elapsedMs
 * @param {object} schedule  from `ceremonySchedule`
 * @returns {number} alpha
 */
export function boardAlphaAt(elapsedMs, schedule) {
  const e = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const { boardStartMs = 0, boardEndMs = 0 } = schedule ?? {};
  const span = boardEndMs - boardStartMs;
  if (!(span > 0) || e < boardStartMs || e >= boardEndMs) return 0;
  // A fixed fade in MILLISECONDS, not a fraction of the window: as a fraction, a long board at 100
  // racers would fade for a second and a half at each end, which is reading time spent on nothing.
  const fade = Math.min(BOARD_FADE_MS, span / 2);
  const since = e - boardStartMs;
  const until = boardEndMs - e;
  if (since < fade) return since / fade;
  if (until < fade) return until / fade;
  return 1;
}

/** How long the board takes to arrive and to leave. Short enough not to eat reading time. */
export const BOARD_FADE_MS = 220;

/**
 * The cam.zoom at a moment in the ceremony.
 *
 * INTERPOLATED IN cam.zoom, LINEARLY, with the curve doing the shaping. A geometric (log)
 * interpolation would arguably read as more uniform, because zoom is multiplicative — but that is a
 * change to the FEEL of the move, and the feel is what the owner is about to judge by eye. Making
 * both changes at once would leave him unable to say which he was reacting to. Named as a proposal
 * in the report rather than taken here.
 *
 * @param {number} venueZoom  cam.zoom of the venue shot (the wide end)
 * @param {number} targetZoom  cam.zoom of the formation (the tight end)
 * @param {number} elapsedMs  ms since the countdown began
 * @param {{venueMs:number, pushMs:number}} schedule
 * @param {(p:number)=>number} easing
 * @returns {number} cam.zoom for this frame
 */
export function ceremonyZoom(venueZoom, targetZoom, elapsedMs, schedule, easing) {
  const { beat, progress } = ceremonyAt(elapsedMs, schedule);
  if (beat === CEREMONY_BEAT.VENUE) return venueZoom;
  // BOARD and SETTLED are both "arrived": the camera has finished its travel and holds. That is the
  // whole point of the BOARD beat — the board gets its time without the push getting slower.
  if (beat === CEREMONY_BEAT.BOARD || beat === CEREMONY_BEAT.SETTLED) return targetZoom;
  const eased = easing(Math.min(1, Math.max(0, progress)));
  return venueZoom + (targetZoom - venueZoom) * eased;
}
