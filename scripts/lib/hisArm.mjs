// ============================================================
// File:        scripts/lib/hisArm.mjs
// Project:     RaceArena — ONE-HOME-THREE-TRUTHS-1
//
// THE OWNER'S CAMERA CONFIGURATION — the eleven keys every camera harness in this repository
// measures his arm with, and the `setPath` that applies them.
//
// WHY THIS FILE EXISTS. The list was written out TWICE, byte-for-byte identical, in
// `scripts/viewer-invariants.mjs` and `scripts/diag/endgame-spec.mjs`, each with its own private
// copy of `setPath`. Both copies AGREED, which is the dangerous variant: two harnesses measuring
// "his arm" would keep agreeing right up until somebody edited one of them, and the divergence
// would then show up as a CHANGE IN HIS NUMBERS rather than as an error — a measurement moving for
// a reason that is not the code under test. That is the class of defect the five strobe defects
// were paid for, and the rule they bought is the one applied here: ONE quantity, ONE home, and
// every other site reads it.
//
// WHAT THIS FILE IS NOT. It is not a config, not a default and not a shipped value. It is the
// definition of an ARM — a deliberate departure from the shipped defaults, used to measure what he
// sees on his machine. `client/src/modules/storage/defaults.js` remains the one home for what the
// game actually ships.
//
// ADDING OR CHANGING A KEY HERE CHANGES WHAT "HIS ARM" MEANS in every harness at once. That is the
// point, and it is also the reason to be careful: a number measured before the change and one
// measured after are not comparable, and neither harness will say so.
// ============================================================

/**
 * The owner's arm, as [path, value] pairs. Paths are dot-separated so a nested profile key can be
 * set without the caller knowing the shape of the config.
 *
 * ELEVEN KEYS. The count is not asserted anywhere on purpose — a harness that hard-codes "eleven"
 * would have to be edited in lock-step with this list, which is the duplication this file removes.
 */
export const HIS = [
  ["cameraStateProfiles.OVERVIEW.trackingTC", 1.5],
  ["highlightHeroes", true],
  ["battlePulkThresholdT", 0.001],
  ["outcomePhaseThreshold", 0.65],
  ["battleCooldownMs", 20000],
  ["battleWeight", 0],
  ["finishPauseMs", 4000],
  ["winnerCardMs", 4000],
  ["corridorCapArriveMs", 5000],
  ["labelNamesWhenRoom", true],
  ["minRacersVisible", 8],
];

/**
 * Set a dot-separated path on a config object, cloning each container on the way down.
 *
 * THE CLONE IS LOAD-BEARING, and it is why this is not a two-line helper: the caller starts from
 * `structuredClone(DEFAULT_CAMERA_CONFIG)`, whose nested objects are fresh — but a harness that
 * built its config any other way could otherwise mutate a shared default in place, and every later
 * arm in the same process would inherit it. Both original copies did this; it is preserved exactly.
 *
 * @param {object} o    the config to modify, in place
 * @param {string} path dot-separated, e.g. `cameraStateProfiles.OVERVIEW.trackingTC`
 * @param {*} v         the value to write at that path
 */
export function setPath(o, path, v) {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
}

/**
 * Apply his arm to a config object, in place, and hand it back.
 * @param {object} cfg a config the caller already owns (typically a `structuredClone` of the defaults)
 * @returns {object} the same object
 */
export function applyHisArm(cfg) {
  for (const [p, v] of HIS) setPath(cfg, p, v);
  return cfg;
}
