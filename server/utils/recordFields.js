// ============================================================
// File:        recordFields.js
// Path:        server/utils/recordFields.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A5M-13)
// Created:     2026-10-12
// Description: The shared checks behind the field allow-lists and number bounds of the tracks,
//              racers, brands and player-groups routes (the owner's decision of 2026-10-12).
//
// ── ★ THE RULE FOR DOUBT, BUILT IN ─────────────────────────────────────────────────────────────
// Re-saving a record the owner already has must never be refused. Two things guarantee it here
// rather than in each route:
//   · on an UPDATE, a key the stored record already carries is never "unknown", whatever it is —
//     a field an older version wrote, a hand edit, a restored backup;
//   · on an UPDATE, a number EQUAL to the stored value is never out of range — the bound applies to
//     a value being changed, not to one the record already holds.
// The allow-lists and bounds themselves live beside each route, derived from every field the client
// sends (editors, API modules, the player-group migration), the shipped seeds and the server's own
// fields, and every bound is at least as wide as anything the editors or the seeds can produce.
// Nothing here runs on READ: stored records keep loading exactly as before.
// ============================================================

/** Is `v` the same value as `stored`? Scalars only — enough for the numbers this guards. */
function sameAsStored(v, existing, key) {
  return (
    existing != null && Object.prototype.hasOwnProperty.call(existing, key) && existing[key] === v
  );
}

/**
 * The keys of `body` that are neither allowed nor already on the stored record.
 *
 * @param {object} body
 * @param {Set<string>} allowed
 * @param {object|null} [existing]  the stored record on an update; null on a create
 * @returns {string[]}
 */
export function unknownFields(body, allowed, existing = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body).filter(
    (k) => !allowed.has(k) && !(existing && Object.prototype.hasOwnProperty.call(existing, k))
  );
}

/** The plain-English refusal for unknown fields; `kind` is e.g. "a track". */
export function unknownFieldsMessage(keys, kind) {
  const list = keys.map((k) => `"${k}"`).join(', ');
  return `${kind} has no field ${list} — remove ${keys.length === 1 ? 'it' : 'them'} and save again`;
}

/**
 * A bounded number, checked only when `key` is in `body`.
 *
 * @param {object} body
 * @param {string} key
 * @param {{ min: number, max: number, integer?: boolean, nullable?: boolean }} bound
 * @param {object|null} [existing]  on an update, a value equal to the stored one always passes
 * @returns {string|null} the error, or null
 */
export function checkNumber(
  body,
  key,
  { min, max, integer = false, nullable = false },
  existing = null
) {
  if (!body || !(key in body)) return null;
  const v = body[key];
  if (sameAsStored(v, existing, key)) return null;
  if (v === null && nullable) return null;
  const ok =
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= min &&
    v <= max &&
    (!integer || Number.isInteger(v));
  if (ok) return null;
  return (
    `${key} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}` +
    (nullable ? ', or null' : '')
  );
}

/**
 * A string of bounded length, checked only when `key` is in `body`.
 *
 * @returns {string|null}
 */
export function checkString(body, key, { max, nullable = false }, existing = null) {
  if (!body || !(key in body)) return null;
  const v = body[key];
  if (sameAsStored(v, existing, key)) return null;
  if (v === null && nullable) return null;
  if (typeof v === 'string' && v.length <= max) return null;
  return `${key} must be text of at most ${max} characters${nullable ? ', or null' : ''}`;
}

/**
 * Every number anywhere inside `value` must be finite and within ±`bound`. For nested data whose
 * keys are open (a track effect's settings), where an allow-list would refuse a key an older
 * version stored but a bound still stops a 1e308.
 *
 * @returns {string|null} the first offending path, as an error, or null
 */
export function checkNestedNumbers(value, path, bound) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.abs(value) <= bound
      ? null
      : `${path} must be a number from ${-bound} to ${bound}`;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const err = checkNestedNumbers(
        v,
        Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`,
        bound
      );
      if (err) return err;
    }
  }
  return null;
}
