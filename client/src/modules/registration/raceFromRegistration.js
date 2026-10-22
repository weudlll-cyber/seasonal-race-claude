// ============================================================
// File:        raceFromRegistration.js
// Path:        client/src/modules/registration/raceFromRegistration.js
// Project:     RaceArena — REGISTRATION-1 follow-up 2 (the owner's decisions of 2026-10-22)
// Description: What a race takes from the registration its players came from, as two pure rules the
//              Setup screen applies (SetupScreen.jsx `handleUseRegisteredPlayers`, `handleStartRace`):
//                · the race's event name — the brand profile's event name and the registration's
//                  name together, "<base> – <registration>";
//                · which registration a started race marks as "Raced" — the one whose players were
//                  last taken, for as long as the roster is still theirs.
// ============================================================

/** Between the two parts of a composed event name: an en dash with a space on each side. */
export const EVENT_NAME_SEPARATOR = ' – ';

/**
 * The race's event name once a registration's players are taken.
 *
 * `base` is the ACTIVE BRAND PROFILE's event name — the source the Setup screen seeds the field from
 * — and never the field's current value: taking a second registration then REPLACES the first one's
 * part instead of stacking a second suffix onto it.
 *
 * @param {string|null|undefined} base  the active brand profile's event name
 * @param {string|null|undefined} registrationEventName
 * @returns {string|null} the new event name, or null when the field is to stay as it is (a
 *   registration without an event name changes nothing — the behaviour before this rule)
 */
export function composeEventName(base, registrationEventName) {
  const part = typeof registrationEventName === 'string' ? registrationEventName.trim() : '';
  if (!part) return null;
  const head = typeof base === 'string' ? base.trim() : '';
  return head ? `${head}${EVENT_NAME_SEPARATOR}${part}` : part;
}

/**
 * The registration a started race will mark as "Raced": its id, or null for none.
 *
 * Remembered when its players are taken; forgotten when the roster stops being theirs — another
 * registration's players taken (that one is remembered instead), a player group added or removed,
 * the roster emptied — and when the race starts (it is marked once). Editing single names keeps it:
 * a corrected spelling is still that registration's race.
 *
 * @param {string|null} current
 * @param {{ type: 'take', id: string } | { type: 'group' } | { type: 'names', count: number }
 *         | { type: 'started' }} event
 * @returns {string|null}
 */
export function nextRegistrationToMark(current, event) {
  switch (event.type) {
    case 'take':
      return event.id;
    case 'group':
    case 'started':
      return null;
    case 'names':
      return event.count === 0 ? null : current;
    default:
      return current;
  }
}
