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
// questions is something a person can pick up. Two of these cannot be "brought in step" without
// deciding a behaviour question, which is exactly why this guard ships green rather than shipping a
// silent alignment:
//   - `outcomePhaseThreshold` shapes the race.
//   - `postStartHoldMs` is engine-adjacent; aligning it silently could move the world fingerprint.
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
  D(
    "client/src/modules/racePlanner.js",
    "postStartHoldMs",
    7000,
    0,
    "UNRESOLVED — owner decision. The planner treats an absent hold as ZERO while the camera default is 7000 ms. These may be two different clocks wearing one key name (the camera's post-start hold vs the planner's), in which case the fix is a RENAME, not an alignment. Engine-adjacent: changing it silently could move the world fingerprint. Do not touch without a mint.",
  ),
  D(
    "client/src/modules/raceBehavior.js",
    "maxLateralAccelPerStep",
    0.0005,
    0,
    "INTENTIONAL, and documented at the value: 0 means DISABLED (pre-fix bang-bang). RACER-MOTION-1 built the cap with 0 as the off switch and RACER-MOTION-2 shipped 0.0005. A partial-config caller getting 0 is the pre-feature world, which is what the sim's OFF arm wants. Aligning it would move the world fingerprint.",
  ),
  D(
    "client/src/modules/raceBehavior.js",
    "softSteeringObstacleMargin",
    0.5,
    0,
    "UNRESOLVED — same shape as the line above (0 = the pre-feature behaviour) but without a report saying so explicitly. Engine file; needs a mint to change either way.",
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
      "INTENTIONAL — the OFF arm. `?? false` is how a partial config (the sim's pre-feature arm, a unit test) gets the world before this mechanism shipped. The `world-off` fingerprint in docs/fingerprints.json depends on exactly this. Aligning it would delete the ablation arm.",
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
      "INTENTIONAL — the same OFF arm expressed as a magnitude: 0 disables the term. Engine file; a mint is required to change it.",
    ),
  ),
  // ── TIER 3: engine numbers whose fallback is a STALE PREVIOUS VALUE, not an off switch. ───────
  //    These are the ones most likely to be real bugs, and none can be fixed without a mint.
  D(
    "client/src/modules/raceCore.js",
    "bandBiasR",
    0.6,
    0.8,
    "UNRESOLVED — 0.8 is not an off switch, it is a NUMBER, and it disagrees with the shipped 0.6. Most likely a superseded value left behind when the default moved. Engine file: needs a mint to correct. Same pair also in racePlanner.js.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "bandBiasGain",
    0.1,
    0.06,
    "UNRESOLVED — as bandBiasR: a stale magnitude rather than a disable. Same pair also in racePlanner.js.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "pulkLeadRotationDropDepthLengths",
    8,
    2,
    "UNRESOLVED — 2 against a shipped 8 is a large disagreement and neither value is an off switch.",
  ),
  D(
    "client/src/modules/raceCore.js",
    "rowBonusPulk",
    0,
    1,
    "UNRESOLVED — and it runs the OTHER way: the fallback (1) is the ACTIVE value and the default (0) is the disabled one, so a partial-config caller gets MORE behaviour than the shipped world, not less.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "bandBiasR",
    0.6,
    0.8,
    "UNRESOLVED — the raceCore pair, duplicated here. Fixing one without the other would leave the two halves of the plan disagreeing.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "bandBiasGain",
    0.1,
    0.06,
    "UNRESOLVED — the raceCore pair, duplicated here.",
  ),
  D(
    "client/src/modules/racePlanner.js",
    "gapRerollStrength",
    1,
    0.5,
    "UNRESOLVED — half the shipped strength as a fallback. Not an off switch.",
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
      "MIXED — `b2AttackHeroes ?? 0` is a genuine off switch (0 heroes = feature off), but `b2AttackFinalRank ?? 10` against a shipped 7 is a stale number riding along with it. The pair should be decided together.",
    ),
  ),
  // ── TIER 4: camera. Visible, but they cannot move the race. ───────────────────────────────────
  ...[
    [
      "client/src/modules/camera/cameraTimingComputation.js",
      "outcomePhaseThreshold",
      0.65,
      0.75,
    ],
    [
      "client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx",
      "outcomePhaseThreshold",
      0.65,
      0.75,
    ],
    [
      "client/src/screens/RaceScreen/ComebackDiagHUD.jsx",
      "outcomePhaseThreshold",
      0.65,
      0.75,
    ],
  ].map(([file, k, d, f]) =>
    D(
      file,
      k,
      d,
      f,
      "UNRESOLVED — owner decision, and the brief named it: 0.65 vs 0.75 SHAPES THE RACE's final phase. THREE files carry the stale 0.75, including the Dev Screen control the owner would use to judge it and the diagnostic HUD he would read while judging — so today the slider, the HUD and the game can all disagree. Decide the number once, then all three follow.",
    ),
  ),
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
      "UNRESOLVED — the COMEBACK trigger band. Stale on both sides at once (the resolver and the slider agree with each other and disagree with the default), which is why nobody noticed: the control shows what the resolver would do, just not what the game does.",
    ),
  ),
  D(
    "client/src/modules/camera/cameraTimingComputation.js",
    "endgameThreshold",
    0.9,
    0.85,
    "UNRESOLVED — a stale previous value; camera-only, so the world cannot move.",
  ),
  D(
    "client/src/modules/camera/cameraTimingComputation.js",
    "maxStateDuration",
    4000,
    8000,
    "UNRESOLVED — the fallback is DOUBLE the shipped value. Camera-only.",
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
      "UNRESOLVED — Dev Screen only, and it is the MIN-RACERS-5 defect exactly: an untouched control shows a value the game is not running. Cheapest tier to fix (point the control at DEFAULT_RACE_DYNAMICS_CONFIG, as CameraAdvancedSection already does for several keys) and it cannot move a fingerprint.",
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
