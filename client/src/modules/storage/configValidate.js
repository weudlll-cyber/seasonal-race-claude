// ============================================================
// File:        configValidate.js
// Path:        client/src/modules/storage/configValidate.js
// Project:     RaceArena — PER-KEY-REJECT-1 (the owner's order, 2026-09-04)
// Description: What happens when a STORED config value fails its loader's validation: the key is
//              rejected ALONE and falls back to its own default, and every other key survives.
//
// THE ONE HOME for what happens when a STORED config value is outside what its loader accepts.
//
// ── THE DEFECT THIS REPLACES ─────────────────────────────────────────────────────────────────────
// Five of the seven stores validated like this:
//
//     if (a-bad || b-bad || ... || z-bad) return { ...DEFAULTS };
//
// ONE value outside its range and the operator lost EVERY tuning in that store — and was never told
// which key did it, or that anything had happened at all. `raceDynamicsConfig` alone gates forty-odd
// keys behind one `return`: a single stored `choreoOutcomeStart` of 0.65 discarded the brake, the
// boost, the intensity, the attacker count and the whole race plan with it.
//
// It also had a SECOND cost, and that one shaped this project's decisions rather than just its
// storage: a loader bound could never be TIGHTENED, because tightening it would confiscate every
// other key from anyone holding the newly-illegal value. `choreoOutcomeStart`'s bound was left at
// 0.70 for exactly that reason, deliberately and in writing, while the measured edge was 0.60. The
// tolerance was protecting operators FROM THE VALIDATOR, not from the value.
//
// ── THE RULE ─────────────────────────────────────────────────────────────────────────────────────
// A key that fails validation is rejected ALONE, and falls back to ITS DEFAULT. Every other key in
// the stored object survives.
//
// WHY THE DEFAULT AND NOT A CLAMP TO THE NEAREST BOUND. A clamp invents a value nobody chose and
// then presents it as the operator's own setting — 0.65 silently becoming 0.60 is indistinguishable,
// afterwards, from an operator who typed 0.60. The default is the value the product ships, it is the
// one behaviour that is always defined, and it is the only outcome a reader can predict without
// knowing the bound. (The owner did not specify; this is not a picture question, so it is decided
// here and written down rather than left to each store.)
//
// ── CROSS-KEY RULES, AND WHY A RULE OWNS A SET OF KEYS RATHER THAN ONE ───────────────────────────
// Some conditions are not about one key. `min < max` (base speed), `reengageTMultiplier <
// speedBrakeTMultiplier` (behaviour) and `outcomeStart < contestWindowStart < releaseProgress`
// (dynamics) each constrain two or three keys jointly, and NOTHING IN THE STORED OBJECT SAYS WHICH
// ONE IS AT FAULT. So a rule names every key it constrains, and on failure this module reverts
// exactly those of them that DEVIATE FROM THEIR DEFAULT — i.e. the ones the operator actually set.
// A key sitting at its default is not the operator's choice and is left alone; reverting it would
// be a no-op that reads, in the report, like a setting was taken away.
//
// The revert then re-runs every rule, because reverting one key can satisfy or break another. It
// iterates to a fixed point, bounded by the rule count.
//
// ── THE ONE CASE THIS CANNOT REPAIR ──────────────────────────────────────────────────────────────
// If a rule still fails once every key it names sits at its default, then the DEFAULTS violate it —
// a programming error in the store, not an operator's stored value. There is nothing to fall back
// to, so the config is returned as-is and the rule is reported as a store defect. Each store's test
// asserts its own defaults pass all of its rules, so this is unreachable from a shipped tree.
//
// ── WHY THIS FILE IS PURE ────────────────────────────────────────────────────────────────────────
// Three of its callers are inside the engine-reach hull, so whatever they import joins the set that
// can change the race. This module reads no storage, imports no defaults and has no side effects; it
// takes a resolved config and returns a new one plus a list of what it rejected. The CALLER, which
// already owns its storage key, decides whether and how to report. Same shape, and same reason, as
// `configDiff.js` beside it.
// ============================================================

import { valuesEqual } from './configDiff.js';

/**
 * Apply a store's validation rules to an already-resolved config, per key.
 *
 * @param {object} resolved  the config AFTER `resolveFromDefaults` — every default key is present
 * @param {object} defaults  that store's DEFAULT_* object
 * @param {Array<{keys: string[], ok: (c: object) => boolean, why: string}>} rules
 *        `keys`  every key the rule constrains; the ones that deviate from default are reverted
 *        `ok`    true when the rule is satisfied. Reads the whole config, so cross-key rules work
 *        `why`   what was EXPECTED, in one phrase, for the message the operator sees
 * @returns {{config: object, rejected: Array<{key: string, stored: any, using: any, why: string}>,
 *            storeDefects: string[]}}
 */
export function applyKeyRules(resolved, defaults, rules) {
  const config = { ...resolved };
  const rejected = [];
  const storeDefects = [];

  // Bounded at rules.length + 1: each pass that makes progress reverts at least one key, and a
  // reverted key is never reverted twice, so no rule set can loop here.
  for (let pass = 0; pass <= rules.length; pass++) {
    let progressed = false;
    for (const rule of rules) {
      if (rule.ok(config)) continue;
      // Only the keys the OPERATOR set. A key already at its default cannot be the cause and
      // reverting it would report a loss that did not happen.
      const off = rule.keys.filter((k) => !valuesEqual(config[k], defaults[k]));
      if (off.length === 0) {
        // Every key this rule names is already at its default and it still fails: the defaults
        // themselves break it. Not an operator's problem, and not repairable here.
        if (!storeDefects.includes(rule.why)) storeDefects.push(rule.why);
        continue;
      }
      for (const key of off) {
        rejected.push({ key, stored: config[key], using: defaults[key], why: rule.why });
        config[key] = defaults[key];
      }
      progressed = true;
    }
    if (!progressed) break;
  }

  return { config, rejected, storeDefects };
}
