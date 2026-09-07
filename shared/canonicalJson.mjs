// ============================================================
// File:        canonicalJson.mjs
// Path:        shared/canonicalJson.mjs
// Project:     RaceArena — SHARED-CANONICAL-1
//
// THE ONE HOME for the canonical serialisation: the rule that turns a value into the exact string
// that gets hashed and stored. Read by the client and by the server; no path that hashes or stores
// a race may carry its own copy of it.
//
// ── WHY IT MOVED HERE, AND IT IS NOT A TIDYING ──────────────────────────────────────────────────
//
// It used to live in `client/src/modules/raceConfigWorld.js`, and `server/src/races/contentAddress.js`
// reached across the package boundary to import it. That import CANNOT RESOLVE IN THE IMAGE: the
// root `.dockerignore` is an allow-list that re-includes `server/src`, `server/utils`, `server/seeds`
// and named files under `shared/` — the client SOURCE is deliberately excluded, because it has no
// business in a server image. So the containerised server could not start at all. The same defect
// reached `raceStore.js` and `shortKey.js` through `raceShortKey.js`; see `shared/raceShortKey.mjs`.
//
// The fix is the one `shared/nameLimits.mjs` already established: a rule that must be IDENTICAL in
// two runtimes lives above both of them. Neither package can import from the other — the server is
// not part of the client's build, and a server importing from a UI package has its layering
// backwards.
//
// ★ ONE VERSION. This file is not a copy of anything. `raceConfigWorld.js` imports `canonicalJson`
// FROM HERE for its own `hashWorld`, and every other consumer imports it from here too. If this
// logic is ever re-implemented on either side, the safeguard it exists to be becomes the next
// silent divergence.
//
// ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────
//
// It does not hash, and it does not know what a "world" is. `hashWorld`, `WORLD_CONFIG_KEYS`,
// `WORLD_SCHEMA_VERSION`, `unsimulatableReasons` and `worldStamp` stay in `raceConfigWorld.js`
// because NOTHING ON THE SERVER READS THEM — established by resolving every importer, not assumed.
// Moving them too would have dragged the client's config vocabulary into a directory shared with a
// server that has no use for it.
//
// ★ IT ALSO DOES NOT CHANGE WHAT IT PRODUCES. Stored content addresses are byte comparisons against
// this string, so a different output would not be a refactor — it would silently orphan every race
// already stored. The output is pinned character for character by `canonicalJson.test.js`, whose
// expectations were captured from the pre-move implementation.
// ============================================================

/**
 * The canonical string a value is serialised to: stable key order at every depth, so the same value
 * produces an identical string in Node and in the browser.
 *
 * ★ A KNOWN AND DELIBERATE QUIRK, pinned by the test rather than fixed here: keys that look like
 * non-negative integers come out in ASCENDING NUMERIC order, not in the lexicographic order the
 * `.sort()` below asks for. `Object.keys` yields integer-like keys numerically first, the sort then
 * puts them in string order, and `JSON.stringify` re-orders them numerically again on the way out.
 * The net effect is stable and identical on both sides, which is all this function promises — but
 * it is not what the code appears to say, so it is written down here. Changing it would move every
 * stored content address.
 *
 * @param {unknown} value
 * @returns {string}
 * @throws {Error} on a circular reference — loudly, rather than serialising something partial
 */
export function canonicalJson(value) {
  const seen = new WeakSet();
  const norm = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) throw new Error('canonicalJson: circular reference');
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return JSON.stringify(norm(value));
}
