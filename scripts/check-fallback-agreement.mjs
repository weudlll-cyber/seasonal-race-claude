// ============================================================
// File:        scripts/check-fallback-agreement.mjs
// Project:     RaceArena — FALLBACK-GUARD-1
//
// A FALLBACK MUST AGREE WITH THE DEFAULT IT MIRRORS. This guard fails when one does not.
//
// THE DEFECT IT EXISTS FOR. `minRacersVisible` was raised 3 -> 5 in `defaults.js` on the owner's
// verdict. Two mirrors of that number stayed at 3: `DEFAULT_MIN_RACERS_VISIBLE` in
// `camera/framingConfig.js`, which is what a partial-config caller gets, and the Dev Screen slider,
// which is the control the owner uses to JUDGE the value. So the shipped path framed on 5, the
// unit-test path framed on 3, and an untouched slider displayed 3 while the game ran 5. MIN-RACERS-5
// had to find and fix both by hand.
//
// `check-config-keys.mjs` was already looking at this exact pair of files and could not have caught
// it: it asks whether a key EXISTS in the defaults, never whether a mirror of it still AGREES. That
// is the gap, and this is the guard for it.
//
// ── WHAT IT DOES NOT CHECK, and this section is the point of the guard rather than an apology ────
//
// The FRAME-INPUTS-1 drift guard learned this the expensive way: a guard that matches one spelling
// must write down which spellings it misses, or its silence is read as proof. This one is TEXTUAL.
// It matches `<something>.<key> ?? <fallback>` and nothing else. It is therefore BLIND to:
//
//   - DESTRUCTURED defaults — `const { minRacersVisible = 3 } = config`. Same bug, different
//     spelling, invisible here.
//   - COMPUTED keys — `config[name] ?? d`. The key is not a literal, so there is nothing to look up.
//   - ALIASED objects are FINE (it does not care what the left side is called), but an aliased KEY
//     is not: `const k = 'minRacersVisible'; config[k] ?? 3`.
//   - `||` instead of `??`. Deliberately not matched: `||` also replaces 0 and '' and is usually a
//     different intent, so treating it as a mirror would produce noise, not findings.
//   - A named fallback IMPORTED from another module. The value is resolved in the DECLARING file
//     only; an unresolvable name is reported as UNRESOLVED, never silently passed.
//   - TERNARIES and validation bands — `Number.isFinite(v) && v > 0 ? v : DEFAULT_X`. This is the
//     big one by count: `framingConfig.js` and `cameraTimingComputation.js` use it heavily, and
//     `DEFAULT_REFERENCE_CORRIDOR_PX` is one of them. See BAND_FALLBACKS below — those ARE checked,
//     by a second pattern, because leaving the project's most common fallback shape out would have
//     made this guard a decoration.
//   - Test files (`*.test.*`), which legitimately pass odd values to prove a band rejects them.
//
// A key that is not in any defaults object is not a mirror of anything and is skipped — that is the
// filter that makes this tractable, since most `?? 0` in the codebase guards arbitrary data.
//
// Usage:
//   node scripts/check-fallback-agreement.mjs
//   node scripts/check-fallback-agreement.mjs --list   # print every pair it checked, agreeing or not
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-fallback-agreement",
  covers:
    "a fallback that disagrees with the default it mirrors — `config.k ?? 3` while the default says 5",
  blind: [
    "destructured defaults, computed keys, aliased keys, `||` instead of `??`",
    "a named fallback imported from another module (reported UNRESOLVED, never silently passed)",
    "test files, which legitimately pass odd values to prove a band rejects them",
  ],
  dirs: ["client/src/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __t0 = Date.now();
process.on("exit", () => {
  process.stderr.write(`[ra-elapsed-ms ${Date.now() - __t0}]\n`);
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// `--src=<dir>` scans somewhere else. It exists for ONE reason and it is the reason
// `check-measured-stamps.mjs --doc=` and `check-tags.mjs --tags-file=` exist: without it, the only
// way to prove this guard can FAIL is to break the real repository, and a test that cannot run the
// guard end-to-end let a gutted `isExcepted` pass green here once already.
const SRC = (() => {
  const a = process.argv.find((x) => x.startsWith("--src="));
  return a ? join(ROOT, a.slice(6)) : join(ROOT, "client", "src");
})();
const LIST = process.argv.includes("--list");

// ── THE EXCEPTION LIST ──────────────────────────────────────────────────────────────────────────
//
// EVERY KNOWN DISAGREEMENT, WITH BOTH VALUES AND A REASON. It is not an allowlist and it is not
// permission: it is a WORKLIST. A bare allowlist rots into a list nobody reads; a list of unanswered
// questions is something a person can pick up. One of these cannot be "brought in step" without
// deciding a behaviour question, which is exactly why this guard ships green rather than shipping a
// silent alignment:
//   - `outcomePhaseThreshold` shapes the race.
// `postStartHoldMs` was the second, and POST-START-HOLD-UNIFY answered it: the planner's reading was
// removed, so there is no longer a second site to be out of step with. The worklist got shorter by
// being worked, which is what it is for.
//
// A NEW disagreement — in any file, including these — is RED. The exception is keyed on
// (file, key, both values), so changing either side of a listed pair makes it stop matching and the
// guard fires. That is deliberate: an exception that survives its own values changing would be a
// hole rather than a record.
// ORDERED BY HOW MUCH DAMAGE THE DISAGREEMENT COULD DO, not alphabetically, because the order is
// the worklist. The reasons below are what the code says about itself plus what the audit could
// establish; where that is not enough to decide, the reason says UNRESOLVED and names the question.
const D = (file, key, defaultValue, fallbackValue, reason) => ({
  file,
  key,
  defaultValue,
  fallbackValue,
  reason,
});
export const EXCEPTIONS = [
  // ── TIER 1: engine-adjacent. Aligning one of these could move the WORLD fingerprint. ──────────
  //
  // RESOLVED AND REMOVED (POST-START-HOLD-UNIFY): `racePlanner.js` / `postStartHoldMs` / 7000 vs 0.
  // The fallback is gone because the READING is gone. Its reason line here also stated something
  // untrue — "raceCore sets postStartHoldMs in the plan config, so `?? 0` never runs". raceCore
  // does not set it, and neither does any other caller of `createRacePlan`; the fallback ran on
  // EVERY race and resolved to 0, which is why removing the floor is byte-identical. Recorded
  // rather than quietly deleted: the entry was right that it could not fire, and wrong about why.
  D(
    "client/src/modules/raceBehavior.js",
    "maxLateralAccelPerStep",
    0.0005,
    0,
    "UNFIREABLE in every shipped path (FALLBACK-42-TRIAGE). `applyRacerBehavior` is called with `{...behaviorConfig, isOpen}` where behaviorConfig is loader-resolved, and the sim merges from DEFAULT_RACE_BEHAVIOR_CONFIG — the key is always present. 0 as the off switch is real, but it is reached by SETTING 0, never by omitting the key. Aligning the literal cannot move the fingerprint, because the branch is not taken.",
  ),
  D(
    "client/src/modules/raceBehavior.js",
    "softSteeringObstacleMargin",
    0.5,
    0,
    "UNFIREABLE in every shipped path (FALLBACK-42-TRIAGE) — same argument as the line above. Not a decision.",
  ),
  // ── TIER 2: the OFF-arm flags. A partial config runs the pre-feature world on purpose. ────────
  ...[
    ["chaosSteer", true, false],
    ["bandBias", true, false],
    ["gapRerollEnabled", true, false],
    ["phaseSplitBonusEnabled", true, false],
    ["pulkCeilingCap", true, false],
    ["enableRowEnvSmooth", true, false],
  ].map(([k, d, f]) =>
    D(
      "client/src/modules/raceCore.js",
      k,
      d,
      f,
      "UNFIREABLE in every shipped path, and the world-off claim it used to carry is CORRECTED (FALLBACK-42-TRIAGE). The browser passes `loadRaceDynamicsConfig()`; sim-fairness builds its config with `mergeCfg(..., DEFAULT_RACE_DYNAMICS_CONFIG)`. Both resolve against the defaults, so the key is always present and `?? false` never runs. `world-off` is produced by `--gapRerollEnabled=false`, which SETS the key — it does not depend on the key being absent. The ablation arm is the FLAG, not the fallback. Still exempt (engine file, aligning is a mint) but it is dead text, not a decision.",
    ),
  ),
  ...[
    ["pulkLeaderBrake", 0.1, 0],
    ["pulkChallengerBoost", 0.06, 0],
    ["pulkBoostHeadroom", 0.1, 0],
  ].map(([k, d, f]) =>
    D(
      "client/src/modules/raceCore.js",
      k,
      d,
      f,
      "UNFIREABLE in every shipped path (FALLBACK-42-TRIAGE) — `dynamicsConfig` is loader-resolved in the browser and defaults-merged in the sim, so 0 is never reached. The OFF arm is the flag that SETS the value, never an absent key. Dead text; a mint to change, but not a decision.",
    ),
  ),
  // ── TIER 3: engine numbers whose fallback is a STALE PREVIOUS VALUE, not an off switch. ───────
  //    These are the ones most likely to be real bugs, and none can be fixed without a mint.
  D(
    "client/src/modules/raceCore.js",
    "bandBiasR",
    0.6,
    0.8,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — a superseded value, confirmed dead: raceCore reads a loader-resolved dynamicsConfig, and racePlanner reads the object raceCore builds, which sets this key unconditionally. Stale text in two places, no behaviour. Same pair also in racePlanner.js.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "bandBiasGain",
    0.1,
    0.06,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — as bandBiasR: stale text, neither a disable nor a decision.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "pulkLeadRotationDropDepthLengths",
    8,
    2,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — 2 against a shipped 8 is a large disagreement AND unreachable: dynamicsConfig always carries the key. Worth correcting as documentation, not as behaviour.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "rowBonusPulk",
    0,
    1,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — and it runs the OTHER way: the fallback (1) is ACTIVE while the default (0) is disabled, so a partial-config caller would get MORE behaviour than the shipped world. No shipped caller is partial, so nobody does. The inverted sense makes it the most misleading line here to leave standing.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "bandBiasR",
    0.6,
    0.8,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — the raceCore pair duplicated here, and doubly dead: racePlanner reads the plan config raceCore builds, and raceCore sets this key unconditionally. A second-line fallback behind a first-line fallback that also never fires.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "bandBiasGain",
    0.1,
    0.06,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — the raceCore pair duplicated here; a second-line fallback, never reached.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "gapRerollStrength",
    1,
    0.5,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — half the shipped strength, and unreachable: raceCore sets gapRerollStrength in the plan config it passes.",
  ),
  ...[
    ["client/src/modules/racePlanner.js", "b2AttackHeroes", 3, 0],
    ["client/src/modules/racePlanner.js", "b2AttackFinalRank", 7, 10],
    ["client/src/modules/heroCurveGenerator.js", "b2AttackHeroes", 3, 0],
    ["client/src/modules/heroCurveGenerator.js", "b2AttackFinalRank", 7, 10],
  ].map(([file, k, d, f]) =>
    D(
      file,
      k,
      d,
      f,
      "UNFIREABLE (FALLBACK-42-TRIAGE) — `?? 0` is a genuine off switch in SHAPE, but the key is always present (racePlanner reads raceCore's plan config; heroCurveGenerator reads racePlanner's). `b2AttackFinalRank ?? 10` against a shipped 7 is stale text riding along. Neither fires; decide the pair together if they are corrected.",
    ),
  ),
  // ── TIER 4: camera. Visible, but they cannot move the race. ───────────────────────────────────
  //
  // THE THREE `outcomePhaseThreshold` ENTRIES ARE GONE, 2026-08-10 (OUTCOME-PHASE-75), and not by
  // aligning a number so the guard would go quiet. The owner decided the value — 0.65 -> 0.75, the
  // later and sharper end of the question he was asked — and the three sites then stopped COPYING
  // it: the resolver and the Dev Screen control read the default (L207), and the diagnostic HUD
  // carries no fallback at all, rendering what the director computed or a dash. A key with no copy
  // of its default cannot disagree with it, so there is nothing left here to except.
  //
  // ONE CORRECTION TO THE RECORD, because the reason that stood here was wrong and it was load
  // bearing: it said "`getComebackDiagData` never puts `outcomePhaseThreshold` into the diag
  // object, so the HUD's `?? 0.75` fires on EVERY render". It does put it in — the key is written
  // unconditionally into the returned object literal in `CameraDirectorDiag.js`, and
  // `_outcomePhaseThreshold` is assigned by `_computeTimingConfig`, which runs from the
  // constructor. The HUD's fallback was therefore UNFIREABLE like the other two, and the HUD was
  // showing the director's real value all along. The defect was real but smaller and differently
  // shaped: three copies of a default, one of which sat in the panel you would read while judging
  // the very number it copied.
  ...[
    [
      "client/src/modules/camera/cameraTimingComputation.js",
      "comebackMinStartGap",
      0.25,
      0.4,
    ],
    [
      "client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx",
      "comebackMinStartGap",
      0.25,
      0.4,
    ],
    [
      "client/src/modules/camera/cameraTimingComputation.js",
      "comebackMaxCurrentRankPct",
      0.2,
      0.1,
    ],
    [
      "client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx",
      "comebackMaxCurrentRankPct",
      0.2,
      0.1,
    ],
  ].map(([file, k, d, f]) =>
    D(
      file,
      k,
      d,
      f,
      "UNFIREABLE (FALLBACK-42-TRIAGE) — the COMEBACK trigger band, stale on both sides at once. Why nobody noticed is now precise: BOTH sites read a loader-resolved config, so neither fallback runs and both numbers are text. The slider shows the config, not the literal beside it.",
    ),
  ),
  D(
    "client/src/modules/camera/cameraTimingComputation.js",
    "endgameThreshold",
    0.95,
    0.85,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — a stale previous value. The director is always constructed with the loader-resolved camera config, and endgameThreshold is a top-level default key, so the fallback is never reached. Camera-only and unreachable: text, not behaviour. ENDGAME-THRESHOLD-095 (2026-08-18) moved the DEFAULT 0.9 -> 0.95 and this line follows it, because an exception records the exact pair it was granted for and a moved default is a different pair. THE FALLBACK IS NOW TWO SHIPS STALE and was deliberately left alone: the ship that moved the default was told to change it in defaults.js and nowhere else, and bringing 0.85 in step would also re-pin the 'no config' test that exists to hold this literal. Worth doing as hygiene, not here.",
  ),
  D(
    "client/src/modules/camera/cameraTimingComputation.js",
    "maxStateDuration",
    4000,
    8000,
    "UNFIREABLE (FALLBACK-42-TRIAGE) — the fallback is DOUBLE the shipped value, and it cannot fire: profMax is only called with the six shipped state names, and CONFIG-DIFF-2 resolves nested blocks field by field, so a stored profile can no longer be missing maxStateDuration. Camera-only and unreachable.",
  ),
  // ── TIER 5: Dev Screen only. Wrong number under the owner's hand, nothing else. ────────────────
  ...[
    ["gapRerollEnabled", true, false],
    ["phaseSplitBonusEnabled", true, false],
    ["racePlanBonusStrengthMultiplier", 2, 1],
  ].map(([k, d, f]) =>
    D(
      "client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx",
      k,
      d,
      f,
      "UNFIREABLE, and the MIN-RACERS-5 comparison is WITHDRAWN (FALLBACK-42-TRIAGE). The section holds loadRaceDynamicsConfig() in state, and that resolves against the defaults, so the control shows the real value and the literal beside it is never used. MIN-RACERS-5 was a genuinely wrong number on screen; this is a wrong number in the source that nobody sees. Still worth pointing at DEFAULT_RACE_DYNAMICS_CONFIG (MIRRORS-BY-REFERENCE), but as hygiene, not a defect.",
    ),
  ),
];

/** Every `DEFAULT_*` object exported by defaults.js and autoSpriteScale.js, flattened to key→value. */
async function loadDefaults() {
  const mods = [
    "client/src/modules/storage/defaults.js",
    "client/src/modules/autoSpriteScale.js",
  ];
  const byKey = new Map();
  const ambiguous = new Set();
  for (const m of mods) {
    const ns = await import(pathToFileURL(join(ROOT, m)).href);
    for (const [name, val] of Object.entries(ns)) {
      if (
        !name.startsWith("DEFAULT_") ||
        !val ||
        typeof val !== "object" ||
        Array.isArray(val)
      )
        continue;
      for (const [k, v] of Object.entries(val)) {
        if (v === null || typeof v === "object") continue; // only scalars can disagree textually
        if (byKey.has(k) && byKey.get(k).value !== v) {
          // The same key with two different default values in two objects. Nothing textual can say
          // which one a fallback mirrors, so it is declared unscannable rather than guessed at.
          ambiguous.add(k);
          continue;
        }
        byKey.set(k, { value: v, from: `${name} (${m})` });
      }
    }
  }
  for (const k of ambiguous) byKey.delete(k);
  return { byKey, ambiguous };
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e) && !/\.test\.|__tests__/.test(p))
      out.push(p);
  }
  return out;
}

/** `const NAME = <scalar>;` declared in this file. The only place a named fallback is resolved. */
function localConstants(src) {
  const m = new Map();
  // MIRRORS-BY-REFERENCE: a constant DEFINED from the default — `const X = DEFAULT_CAMERA_CONFIG.k`
  // — is the safe spelling one level up, and a `band` fallback that uses it cannot disagree. Before
  // this the guard could only resolve a literal, so converting such a constant turned a green entry
  // into an UNRESOLVED one: the guard would have penalised exactly the fix it exists to encourage.
  // Recorded as byRef via the sentinel below, which findPairs turns into the same verdict as an
  // inline `?? DEFAULT_X.k`.
  for (const mm of src.matchAll(
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*([A-Z][A-Z0-9_]{2,}\.[a-zA-Z_][a-zA-Z0-9_]*)\s*;/g,
  )) {
    m.set(mm[1], { byRefTo: mm[2] });
  }
  for (const mm of src.matchAll(
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?|true|false|'[^'\n]*'|"[^"\n]*")\s*;/g,
  )) {
    m.set(mm[1], literal(mm[2]));
  }
  return m;
}

function literal(text) {
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d/.test(text)) return Number(text);
  return text.slice(1, -1);
}

// TWO PATTERNS, because the project writes fallbacks two ways and checking only one would have
// missed `DEFAULT_REFERENCE_CORRIDOR_PX` — a case the brief named explicitly.
//   NULLISH  `config?.someKey ?? FALLBACK`
//   BAND     `Number.isFinite(v) && … ? v : FALLBACK`, where `v` was read from `…someKey` above.
//            Matched only when the guarded expression and the default sit in the same statement, so
//            the key is unambiguous.
const NULLISH =
  /\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\?\s*(-?\d+(?:\.\d+)?|true|false|'[^'\n]*'|"[^"\n]*"|[A-Z][A-Z0-9_]{2,}(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g;
// THE BAND PATTERN IS BOUND TO ITS VARIABLE, and the first version was not — that is why this is
// two steps rather than one regex. A single `.key; … ? v : CONST` window matched ACROSS statements:
// in `framingConfig.js` it paired `const lff = config?.leaderForwardFrac;` with the
// `? refCfg : DEFAULT_REFERENCE_CORRIDOR_PX` four lines below and reported that `leaderForwardFrac`
// falls back to 300. A guard that invents findings is worse than no guard, so the ternary is now
// matched only when the value being tested is the SAME identifier that was read from the key.
const BAND_DECL =
  /const\s+([a-zA-Z_$][\w$]*)\s*=\s*[^;\n]*?\.([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g;
const BAND_USE = /\?\s*([a-zA-Z_$][\w$]*)\s*:\s*([A-Z][A-Z0-9_]{2,})/g;

export function findPairs(src, file, defaults) {
  const consts = localConstants(src);
  const found = [];
  const push = (key, rhs, kind) => {
    if (!defaults.has(key)) return; // not a mirror of any default
    // THE SAFE SPELLING, and it is worth naming rather than merely tolerating:
    // `config?.k ?? DEFAULT_CAMERA_CONFIG.k` reads the canonical home, so it CANNOT disagree — it is
    // the shape MIN-RACERS-5 moved the Dev Screen slider to. Counted as `byRef` and never a finding.
    // Reading a DIFFERENT key from the defaults object is a real defect and is still reported.
    const ref = /^([A-Z][A-Z0-9_]{2,})\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(rhs);
    if (ref) {
      if (ref[2] !== key)
        found.push({
          file,
          key,
          kind: "cross-key",
          via: rhs,
          value: `${ref[1]}.${ref[2]}`,
          unresolved: null,
          expected: defaults.get(key).value,
          crossKey: true,
        });
      else
        found.push({
          file,
          key,
          kind,
          via: rhs,
          byRef: true,
          expected: defaults.get(key).value,
        });
      return;
    }
    let value;
    let unresolved = null;
    if (/^[A-Z][A-Z0-9_]{2,}$/.test(rhs)) {
      if (!consts.has(rhs)) unresolved = rhs;
      else value = consts.get(rhs);
      // A constant DEFINED from the default (MIRRORS-BY-REFERENCE) is byRef at one remove. Same
      // verdict as an inline `?? DEFAULT_X.k`, and the same defect if it names a DIFFERENT key.
      if (value && typeof value === "object" && value.byRefTo) {
        const r2 = /^([A-Z][A-Z0-9_]{2,})\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(
          value.byRefTo,
        );
        found.push(
          r2 && r2[2] === key
            ? {
                file,
                key,
                kind,
                via: `${rhs} = ${value.byRefTo}`,
                byRef: true,
                expected: defaults.get(key).value,
              }
            : {
                file,
                key,
                kind: "cross-key",
                via: rhs,
                value: value.byRefTo,
                unresolved: null,
                expected: defaults.get(key).value,
                crossKey: true,
              },
        );
        return;
      }
    } else {
      value = literal(rhs);
    }
    const expected = defaults.get(key).value;
    // A FALLBACK OF A DIFFERENT TYPE IS NOT A MIRROR, it is a different job. `\`${cam.leaderForwardFrac ?? 'null'}\``
    // in a diagnostic template is a DISPLAY fallback for a numeric setting, and reporting it as a
    // disagreement is the guard inventing work. Recorded as skipped rather than dropped silently.
    if (!unresolved && typeof value !== typeof expected) {
      found.push({
        file,
        key,
        kind,
        via: rhs,
        value,
        expected,
        typeSkip: true,
      });
      return;
    }
    found.push({ file, key, kind, via: rhs, value, unresolved, expected });
  };
  for (const m of src.matchAll(NULLISH)) push(m[1], m[2], "??");
  const declaredFrom = new Map();
  for (const m of src.matchAll(BAND_DECL)) declaredFrom.set(m[1], m[2]);
  for (const m of src.matchAll(BAND_USE)) {
    const key = declaredFrom.get(m[1]);
    if (key) push(key, m[2], "band");
  }
  return found;
}

const { byKey, ambiguous } = await loadDefaults();
const files = walk(SRC);
const pairs = [];
for (const abs of files) {
  const rel = relative(ROOT, abs).replace(/\\/g, "/");
  pairs.push(...findPairs(readFileSync(abs, "utf8"), rel, byKey));
}

const isExcepted = (p) =>
  EXCEPTIONS.some(
    (e) =>
      e.file === p.file &&
      e.key === p.key &&
      Object.is(e.defaultValue, p.expected) &&
      Object.is(e.fallbackValue, p.value),
  );

const byRef = pairs.filter((p) => p.byRef);
const typeSkipped = pairs.filter((p) => p.typeSkip);
const unresolved = pairs.filter((p) => p.unresolved);
const disagree = pairs.filter(
  (p) =>
    !p.byRef &&
    !p.unresolved &&
    !p.typeSkip &&
    (p.crossKey || !Object.is(p.value, p.expected)),
);
const newOnes = disagree.filter((p) => !isExcepted(p));
const known = disagree.filter(isExcepted);

if (LIST) {
  for (const p of pairs.filter((x) => !x.unresolved && !x.byRef)) {
    const ok = !p.crossKey && Object.is(p.value, p.expected);
    // `skip` and `**` must mean the same thing here as in the failure list below. Two views of one
    // guard that disagree is precisely the confusion a guard is supposed to remove.
    const mark = p.typeSkip ? "skip" : ok ? "  ok" : " ** ";
    console.log(
      `${mark} ${p.file}:${p.key} ${p.kind} ${JSON.stringify(p.value)} vs default ${JSON.stringify(p.expected)} (via ${p.via})`,
    );
  }
}

console.log(
  `check-fallback-agreement: ${pairs.length} mirrored fallback(s) in ${files.length} files; ` +
    `${byRef.length} read the default BY REFERENCE and cannot disagree; ` +
    `${disagree.length} disagree (${known.length} on the exception list, ${newOnes.length} new); ` +
    `${typeSkipped.length} skipped (fallback type differs — a display fallback, not a mirror); ` +
    `${unresolved.length} unresolved; ${ambiguous.size} key(s) unscannable (same key, two defaults).`,
);

// EVERY EXEMPTION IS PRINTED WHEN IT IS GRANTED (R11). A decision to yield must be visible, not
// buried in a list nobody opens.
for (const e of EXCEPTIONS) {
  const live = disagree.some(
    (p) =>
      p.file === e.file &&
      p.key === e.key &&
      Object.is(p.value, e.fallbackValue),
  );
  console.log(
    `  ${live ? "EXEMPT" : "STALE "} ${e.file}:${e.key} default=${JSON.stringify(e.defaultValue)} fallback=${JSON.stringify(e.fallbackValue)} — ${e.reason}`,
  );
}
if (ambiguous.size)
  console.log(`  unscannable keys: ${[...ambiguous].sort().join(", ")}`);
for (const u of unresolved)
  console.log(
    `  UNRESOLVED ${u.file}:${u.key} — \`${u.unresolved}\` is not declared in that file`,
  );

// A STALE EXCEPTION IS A FAILURE, not a shrug: it means the pair was fixed (good) and the record
// still claims an open question (bad), or the values moved and the entry no longer describes
// anything. Either way the worklist has stopped being true.
const stale = EXCEPTIONS.filter(
  (e) =>
    !disagree.some(
      (p) =>
        p.file === e.file &&
        p.key === e.key &&
        Object.is(p.value, e.fallbackValue),
    ),
);

if (newOnes.length || stale.length) {
  console.error("");
  for (const p of newOnes)
    console.error(
      `FAIL: ${p.file} falls back to ${JSON.stringify(p.value)} for \`${p.key}\`, but the default is ` +
        `${JSON.stringify(p.expected)} (${byKey.get(p.key).from}).\n` +
        `      Bring it in step, or add it to EXCEPTIONS in this file WITH A REASON.`,
    );
  for (const e of stale)
    console.error(
      `FAIL: the exception for ${e.file}:${e.key} no longer describes a live disagreement — ` +
        `remove it if the pair was fixed.`,
    );
  process.exit(1);
}
