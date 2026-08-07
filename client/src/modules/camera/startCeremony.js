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
// Pure: no state, no config reads, no clock. It is handed an elapsed time and returns a number.
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

/** The three beats. `settled` is a real beat, not an afterthought — see `ceremonySchedule`. */
export const CEREMONY_BEAT = {
  /** The whole track, held still. */
  VENUE: 'venue',
  /** Easing from the venue shot to the formation. */
  PUSH: 'push',
  /** Arrived, holding the formation until the gun. */
  SETTLED: 'settled',
};

/**
 * Fit the two tunable beats inside the countdown, and say what is left over.
 *
 * THE CONSTRAINT THAT MAKES THIS NECESSARY: the countdown's length is its own setting with its own
 * home (`countdownDurationMs`), and the two ceremony durations are separate sliders. Nothing stops
 * the owner asking for a 3 s venue and a 3 s push inside a 4 s countdown.
 *
 * When that happens the two beats are SCALED PROPORTIONALLY rather than truncated. Truncation would
 * cut the push off mid-move, so the camera would still be travelling when the gun went and the
 * framing the hold is supposed to keep would never have been reached. Scaling preserves the RATIO
 * the owner set — which is the thing he was actually expressing — and guarantees the move always
 * completes before the start.
 *
 * When they fit, the remainder is a SETTLED beat: the formation held, motionless, before the gun.
 * That is a feature and not slack. It is the moment the shot is allowed to be still, and without it
 * the push would arrive exactly as the race begins, which reads as an interruption.
 *
 * @param {number} venueMs  requested venue-shot duration
 * @param {number} pushMs   requested push-in duration
 * @param {number} countdownMs  the countdown's total length
 * @returns {{venueMs:number, pushMs:number, settledMs:number, scaled:boolean}} the fitted beats
 */
export function ceremonySchedule(venueMs, pushMs, countdownMs) {
  const total = Math.max(0, countdownMs) || 0;
  const v = Math.max(0, Number.isFinite(venueMs) ? venueMs : 0);
  const p = Math.max(0, Number.isFinite(pushMs) ? pushMs : 0);
  const asked = v + p;
  if (asked <= 0) return { venueMs: 0, pushMs: 0, settledMs: total, scaled: false };
  if (asked <= total) {
    return { venueMs: v, pushMs: p, settledMs: total - asked, scaled: false };
  }
  const k = total / asked;
  return { venueMs: v * k, pushMs: p * k, settledMs: 0, scaled: true };
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
  const { venueMs, pushMs } = schedule;
  if (e < venueMs) {
    return { beat: CEREMONY_BEAT.VENUE, progress: venueMs > 0 ? e / venueMs : 1 };
  }
  const intoPush = e - venueMs;
  if (pushMs > 0 && intoPush < pushMs) {
    return { beat: CEREMONY_BEAT.PUSH, progress: intoPush / pushMs };
  }
  return { beat: CEREMONY_BEAT.SETTLED, progress: 1 };
}

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
  if (beat === CEREMONY_BEAT.SETTLED) return targetZoom;
  const eased = easing(Math.min(1, Math.max(0, progress)));
  return venueZoom + (targetZoom - venueZoom) * eased;
}
