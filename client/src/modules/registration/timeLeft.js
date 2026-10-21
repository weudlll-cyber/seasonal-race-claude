// ============================================================
// File:        timeLeft.js
// Path:        client/src/modules/registration/timeLeft.js
// Project:     RaceArena — REGISTRATION-1
// Description: How long a registration stays open, said the way a person reads it — "2 days 3 h",
//              "14 min 05 s", "Closed". One helper for the public join page and the director's view,
//              so both count down the same way. The deadline itself is the SERVER's (it decides by its
//              own clock); this only renders the distance to it from this device's clock. Since
//              follow-up 1 (2026-10-21) also how a chosen deadline reads ("Closes Wed 22 Oct, 19:45
//              (in 1 day 2 h)") and what is wrong with one, for the director's date fields.
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

// ── Choosing a deadline (follow-up 1, the owner's request of 2026-10-21) ──────────────────────────

/** The server's bounds (server/src/registrations/registrationStore.js), restated only to WARN early. */
const MIN_WINDOW_MS = MINUTE;
const MAX_WINDOW_MS = 30 * DAY;

/**
 * An instant the way a person reads it, in the browser's locale: "Wed 22 Oct, 19:45" in English.
 *
 * @param {number} ms
 * @param {string} [locale]  defaults to the browser's
 */
export function formatDeadline(ms, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** A `datetime-local` value (this device's time zone) as ms, or NaN when empty or incomplete. */
export function msFromLocal(value) {
  return value ? new Date(value).getTime() : NaN;
}

/** An instant as a `datetime-local` value in this device's time zone, to the minute. */
export function localFromMs(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "Closes Wed 22 Oct, 19:45 (in 1 day 2 h)" — what a chosen deadline will do, said plainly. */
export function closesSentence(ms, now, locale) {
  return `Closes ${formatDeadline(ms, locale)} (in ${formatTimeLeft(ms - now)})`;
}

/**
 * What is wrong with a chosen deadline, or null when the server will accept it. The same rules the
 * server enforces — at least 1 minute ahead, at most 30 days after the registration opened, and for
 * an extension later than the current deadline — checked here so the director sees the reason
 * under the field BEFORE pressing the button. The server still decides.
 *
 * @param {number} ms  the chosen instant (NaN when the field is empty or incomplete)
 * @param {{ now: number, openedAt?: number, after?: number }} rules  `openedAt`: when the
 *        registration opened (now, for a new one); `after`: the current deadline, for an extension
 * @returns {string|null}
 */
export function deadlineProblem(ms, { now, openedAt = now, after = null }) {
  if (!Number.isFinite(ms)) return 'Choose a date and a time.';
  if (ms <= now) return 'This time is in the past.';
  if (ms - now < MIN_WINDOW_MS) return 'Registration must stay open for at least 1 minute.';
  if (after !== null && ms <= after) return 'Choose a time later than the current deadline.';
  if (ms - openedAt > MAX_WINDOW_MS) {
    return openedAt === now
      ? 'A registration can stay open for at most 30 days.'
      : 'That is more than 30 days after the registration was opened.';
  }
  return null;
}
