// ============================================================
// File:        timeLeft.js
// Path:        client/src/modules/registration/timeLeft.js
// Project:     RaceArena — REGISTRATION-1
// Description: How long a registration stays open, said the way a person reads it — "2 days 3 h",
//              "14 min 05 s", "Closed". One helper for the public join page and the director's view,
//              so both count down the same way. The deadline itself is the SERVER's (it decides by its
//              own clock); this only renders the distance to it from this device's clock.
// ============================================================

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * @param {number} ms  time left in milliseconds
 * @returns {string}
 */
export function formatTimeLeft(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'Closed';
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = Math.floor((ms % MINUTE) / SECOND);
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
}

/** Milliseconds from `now` until the ISO instant `closesAt`; never negative. */
export function msUntil(closesAt, now = Date.now()) {
  const at = Date.parse(closesAt);
  return Number.isNaN(at) ? 0 : Math.max(0, at - now);
}
