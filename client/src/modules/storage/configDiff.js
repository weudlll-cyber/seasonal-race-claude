// ============================================================
// File:        configDiff.js
// Path:        client/src/modules/storage/configDiff.js
// Project:     RaceArena — CONFIG-DIFF-2
//
// THE ONE HOME for how a stored config relates to its defaults. Seven stores used to answer that
// question seven ways; this is the eighth store's protection, written before the eighth store.
//
// ── THE RULE, in three functions ─────────────────────────────────────────────────────────────────
//   resolveFromDefaults  walk the DEFAULT keys. A stored key the defaults no longer have is IGNORED,
//                        and a new default key is present from the first launch after it ships.
//   diffFromDefaults     keep only what DIFFERS. A value equal to its default is not stored, so it
//                        keeps following the default.
//   pruneStored          the one-time normalisation of what is already in a browser: drop every
//                        stored key equal to its current default. A PRUNE, never a reset.
//
// ── WHY THIS FILE IMPORTS NOTHING ────────────────────────────────────────────────────────────────
// Three of its seven callers — `autoSpriteScale.js`, `raceBehaviorConfig.js`,
// `raceDynamicsConfig.js` — are inside the engine-reach hull, so whatever they import becomes part
// of the set that can change the race. This module is therefore PURE: no storage, no defaults, no
// imports at all. It grows the hull by exactly one leaf and adds not one edge.
//
// The consequence is deliberate: it never reads or writes localStorage. `pruneStored` takes the
// stored object and RETURNS what should be written; the caller, which already owns its storage key,
// does the writing. That also makes every function here testable without a storage layer.
//
// ── NESTED BLOCKS ────────────────────────────────────────────────────────────────────────────────
// Handled generically, at any depth, rather than by a list of key names: a default value that is a
// plain object is walked recursively. Two exist today — `cameraStateProfiles` (state -> fields) and
// `b2AttackProgress` ({start, end}) — and they are structurally different, which is exactly why the
// rule is "recurse into plain objects" and not "special-case the profiles".
//
// ARRAYS are compared as VALUES, never merged. No default is an array today; if one appears, a
// stored array differing in any element is stored whole, which is the only safe reading — merging
// arrays by index would silently resurrect a removed entry.
//
// ⚠ THE EDGE, the same one CONFIG-DIFF-1 documented and it is now shared by all seven stores:
// A VALUE DELIBERATELY SET TO TODAY'S DEFAULT IS INDISTINGUISHABLE FROM ONE NEVER TOUCHED. Both are
// absent from storage, so both follow a future change of that default. Separating them needs stored
// intent — a schema — which this project deliberately does not have. The alternative is storing
// everything, which freezes hundreds of keys to buy certainty about a handful.
// ============================================================

/** A plain object — something to recurse into. Arrays and null are values, not blocks. */
function isBlock(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Value equality: scalars by `Object.is`, arrays and objects structurally.
 *
 * Structural rather than `===` because a reference comparison reports every object and array as
 * "differs from the default" and stores it — the freeze this module removes, just narrower.
 */
export function valuesEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => valuesEqual(v, b[i]));
  if (isBlock(a) && isBlock(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && valuesEqual(a[k], b[k]));
  }
  return false;
}

/**
 * The live config: defaults underneath, stored values on top, unknown or retired keys ignored.
 *
 * Iterating the DEFAULT keys is the whole rule. A key deleted from the defaults disappears from the
 * live config even if it is still sitting in storage; a key added to the defaults is present from
 * the first launch after the change. No version, no migration, no reset.
 */
export function resolveFromDefaults(stored, defaults) {
  const s = isBlock(stored) ? stored : {};
  const out = {};
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const has = Object.prototype.hasOwnProperty.call(s, key);
    out[key] = isBlock(def) ? resolveFromDefaults(has ? s[key] : {}, def) : has ? s[key] : def;
  }
  return out;
}

/**
 * What the user chose: the subset of a resolved config that differs from the defaults.
 *
 * Keys equal to their default are OMITTED — an omitted key follows the default forever, which is the
 * point. Unknown keys are dropped: the resolver already ignores them, so writing them back would
 * only preserve litter. An empty nested block is omitted rather than written as `{}`.
 */
export function diffFromDefaults(config, defaults) {
  const out = {};
  if (!isBlock(config)) return out;
  for (const key of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
    const def = defaults[key];
    const cur = config[key];
    if (isBlock(def)) {
      const sub = diffFromDefaults(cur, def);
      if (Object.keys(sub).length) out[key] = sub;
    } else if (!valuesEqual(cur, def)) {
      out[key] = cur;
    }
  }
  return out;
}

/**
 * The one-time normalisation of a stored config. PURE — returns what to write; it writes nothing.
 *
 * `changed` is false when the stored object is already exactly the diff, which is what lets a caller
 * run this on every load and write only when there is genuinely something to drop. It is idempotent:
 * pruning a pruned config finds nothing, so no marker key is needed and it cannot half-run.
 *
 * @returns {{pruned: object, dropped: string[], changed: boolean}}
 */
export function pruneStored(stored, defaults) {
  if (!isBlock(stored)) return { pruned: {}, dropped: [], changed: false };
  // Resolve first so a nested block missing a field is compared against the FULL default block —
  // otherwise an absent field would read as a deviation and be written back.
  const pruned = diffFromDefaults(resolveFromDefaults(stored, defaults), defaults);
  const dropped = Object.keys(stored).filter(
    (k) => !Object.prototype.hasOwnProperty.call(pruned, k)
  );
  return { pruned, dropped, changed: !valuesEqual(stored, pruned) };
}
