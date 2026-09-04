// ============================================================
// File:        configReport.js
// Path:        client/src/modules/storage/configReport.js
// Project:     RaceArena — PER-KEY-REJECT-1 (the owner's order, 2026-09-04)
// Description: Tells the operator which stored config key was rejected, what was stored, and what
//              is being used instead — one line per key per store.
//
// TELL THE OPERATOR WHEN A STORED KEY WAS NOT USED. One home, shared by every store that validates.
//
// ── WHY THIS IS TOLD AT ALL ──────────────────────────────────────────────────────────────────────
// A key silently reset is the same class of fault as a name silently cut from a roster, and the
// owner decided that one on 2026-09-02: being TOLD beats being tidied. `configValidate.js` makes a
// rejection cost one key instead of the whole config; without a line naming that key, the repair
// would have made the fault quieter rather than smaller.
//
// ── WHY THE CONSOLE, AND WHY THIS IS NOT A NEW TREATMENT ─────────────────────────────────────────
// `storage.js`'s `storageGet` already warns, in exactly this shape, for exactly this fault class:
// "something you had stored is NOT in effect, and nothing on screen says so" (QUIET-FAILURES-1).
// This follows it rather than inventing a second presentation. It also has to: the loaders run at
// race start and at module scope, OUTSIDE any React tree, so there is no component here to raise a
// notice from. The screens' over-capacity notice is the right treatment for a decision being
// REFUSED at a button the operator is looking at; a value quietly dropped at load is the other one,
// and the console is where this project already reports it and already tells the operator to look.
//
// ── WHY IT IS A MODULE OF ITS OWN, BESIDE configDiff AND configValidate ──────────────────────────
// It belongs to the CONFIG-RESOLUTION rule set — resolve, validate, report — not to `storage.js`,
// which is the key registry and the raw read/write. It is also the practical answer: `storage.js` is
// fully mocked by thirteen unrelated test files, so a new export there is a change every one of them
// has to learn about to keep testing something else entirely.
//
// LIKE ITS TWO SIBLINGS, THIS FILE IMPORTS NOTHING. Two of its callers are inside the engine-reach
// hull, so it grows that closure by one leaf and adds not one edge.
// ============================================================

// Which (store, key) pairs have already announced a rejection. NOT app state — a module-local
// de-duplicator, for the same reason `storage.js` keeps one: these loaders run on nearly every race
// start, and one line repeated a thousand times is a different kind of silence. One line per key
// per store, for the life of the page.
const _announced = new Set();

/**
 * NO `localStorage` AT ALL IS NOT A FAILURE — it is node. The sim and all three fingerprint
 * harnesses import these loaders and store nothing, so warning there would print on every run about
 * a value nobody ever set. The rule is `storage.js`'s, restated in one line rather than imported,
 * for the reason in the header.
 */
function inABrowser() {
  return typeof localStorage !== 'undefined';
}

/**
 * Say which key was rejected, what was stored, and what is being used instead.
 *
 * @param {string} storeKey  the localStorage key the config was read from
 * @param {Array<{key: string, stored: any, using: any, why: string}>} rejected
 *        exactly what `applyKeyRules` returns in its `rejected` field
 */
export function reportRejectedKeys(storeKey, rejected) {
  if (!inABrowser() || !rejected?.length) return;
  for (const r of rejected) {
    const tag = `${storeKey}#${r.key}`;
    if (_announced.has(tag)) continue;
    _announced.add(tag);
    console.warn(
      `[storage] "${storeKey}" → "${r.key}" was REJECTED: you had ${JSON.stringify(r.stored)} stored, and ${r.why}. Using the shipped default ${JSON.stringify(r.using)} instead. EVERY OTHER KEY IN THIS CONFIG IS UNCHANGED.`
    );
  }
}

/**
 * A store whose own DEFAULTS break one of its own rules — a code defect, not an operator's stored
 * value, and there is nothing to fall back to. It is unreachable from a shipped tree (every store's
 * suite asserts its defaults pass its rules), so this speaks at error level and is NOT de-duplicated:
 * a defect that prints once and then goes quiet is how the first one got missed.
 *
 * @param {string} storeKey
 * @param {string[]} defects  the `why` of each rule the defaults themselves fail
 */
export function reportStoreDefects(storeKey, defects) {
  if (!inABrowser() || !defects?.length) return;
  for (const why of defects) {
    console.error(
      `[storage] DEFECT in the "${storeKey}" store: its own shipped defaults do not satisfy its own rule that ${why}. Nothing can be fallen back to, so the config is being used exactly as resolved.`
    );
  }
}
