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
    "a fallback that disagrees with the default it mirrors — `config.k ?? 3` while the default says 5; " +
    "AND (RULE A) a literal mirroring a machine-readable home that disagrees with it — a racer-type " +
    "field copied into a table while the registry says something else; " +
    "AND (RULE D) a racer-type registry whose frame geometry disagrees with the PNG it names — frameWidth x frameCount against the sheet's own IHDR header",
  blind: [
    "destructured defaults, computed keys, aliased keys, `||` instead of `??`",
    "a named fallback imported from another module (reported UNRESOLVED, never silently passed)",
    "test files, which legitimately pass odd values to prove a band rejects them",
    "RULE A: NON-SCALARS. Only scalars can disagree textually, so `surfaceClasses`, `coats` and `rteDefinitions` are out of reach — and `goldenRunner.mjs` carries a `surfaceClasses` table that is a DIFFERENT FACT under the same name, which this rule has NOT cleared",
    "RULE A: a copy that does not NAME its racer. The object must carry the racer id as a value (`id: 'horse'`) or hang from it as a key (`horse: { … }`); a table keyed by array position is invisible",
    "RULE A: literals in COMMENTS are matched like any other — a documented example must avoid stating real values, which is why this file's own example uses placeholders",
    "RULE A: a copy that RENAMES its fields. It discovers pairs from the registry's own field names, so a table using different names is invisible to it. That is the price R18 asks for: renaming a historical record is what makes it readable as one, and it is also what puts it out of reach. (The example the tree carried — `crop-sprite-sheets.mjs`'s `preCropFrameWidth` — was DELETED on 2026-09-03 with the script; the blind spot is unchanged and is now unexercised.)",
    "RULE D: GEOMETRY only. A change that leaves the frame size alone — a repaint, a re-crop to the same target, a truncated write — is invisible to it. That case is measured (ARTWORK-DIGEST-1: an overwrite produced 1200x150 before AND after) and is the artwork DIGEST's question, in check-seed-versions",
    "RULE D: only the sheet named by `spriteUrl`. Mask files hang off nested coat objects, which the registry loader skips, so they are digested but not geometry-checked",
    "RULE A: it can find ZERO literals and that is the GOAL STATE, not a failure — REGISTRY-LITERALS-1 removed the copies before this rule existed and DROP-CROP-SCRIPT-1 removed the last twelve. What must never be zero is the DISCOVERY, and that is enforced below rather than left to the test suite.",
    "an OBJECT or ARRAY literal fallback. NULLISH matches a scalar or a SCREAMING_CASE name, so `?? { start: 0.4, end: 0.7 }` is a mirror this guard has never counted. DECLARED-HOLES-1 looked for them by hand and found FOUR copies of `b2AttackProgress`: two converted by MIRROR-CENSUS-1, and TWO STILL LIVE in `heroCurveGenerator.js` (the `GENERATOR_CONFIG` entry and the `?? { start: 0.4, end: 0.7 }` at the cast site). LEFT OPEN DELIBERATELY: closing it means teaching `literal()` to parse an object and compare structurally — a change to the resolution engine that has to be proved in both directions — and the only class it would surface is already known and already exempt as that module's declared direct-call default set. Every other `?? {}` in the tree is an empty-object guard on a key with no default, which is not a mirror at all."
  ],
  // RULE A widened this from `client/src/` alone. Its founding defect lived in `scripts/`, which is
  // the hole CENSUS-DUPES-1 declared as its own largest, so a change there must now select this guard.
  dirs: ["client/src/", "scripts/", "client/scripts/", "client/public/assets/racers/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
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
  // ── TIER 1 IS EMPTY (ONE-HOME-1, the owner's ruling of 2026-08-19) ────────────────────────────
  //
  // `raceBehavior.js` / `maxLateralAccelPerStep` and `softSteeringObstacleMargin` used to sit here
  // with `?? 0`, exempt because the branch was unreachable. THE RULING MAKES REACHABILITY BESIDE
  // THE POINT: no second definition of a value, whatever its current value and whoever can reach
  // it. Both now read `DEFAULT_RACE_BEHAVIOR_CONFIG`, so there is nothing left to except.
  //
  // The ruling also settles what the OFF-arm question was really about. It was never "should a
  // missing key mean OFF" — no key is ever missing, because every loader walks the full default
  // set. The fallbacks exist so a function can be called WITHOUT a config at all, and the only
  // callers that do that are tests and harnesses. A test calling `applyRacerBehavior({})` should
  // get the SHIPPED game, not a quietly disabled one.
  // ── TIER 2: the OFF-arm booleans — GONE, and REMOVED rather than aligned (MIRROR-CENSUS-2). ───
  //
  // `chaosSteer` · `bandBias` · `gapRerollEnabled` · `phaseSplitBonusEnabled` · `pulkCeilingCap` ·
  // `enableRowEnvSmooth`, seven sites in `raceCore.js`. Their `?? false` is deleted outright, not
  // pointed at the default: a mirror that cannot drift beats one that currently agrees, and there
  // is now no second copy of these six values anywhere.
  //
  // WHY REMOVAL WAS SAFE FOR THESE SIX AND NOT FOR THEIR NEIGHBOURS BELOW. They are BOOLEANS, so
  // the two failure modes coincide: if a caller ever did omit one, `undefined` is falsy and behaves
  // exactly as the deleted `false` did. The `?? 0` entries that remain are NUMBERS feeding
  // arithmetic, where an absent key would become NaN instead of 0 — a worse outcome than the mirror,
  // so removing those would be trading a documentation defect for a behaviour one.
  //
  // Every caller was read before the deletion rather than assumed: the browser passes
  // `loadRaceDynamicsConfig()`; six harness scripts pass `DEFAULT_CONFIG_WORLD.raceDynamicsConfig`,
  // which IS `DEFAULT_RACE_DYNAMICS_CONFIG` (same object identity, checked); `DiagnoseVerteilung`
  // uses the loader. No test passes a partial config to `createRaceFromIdentity`. WORLD and
  // WORLD-OFF measured either side and byte-identical.
  // The three pulk numbers — `pulkLeaderBrake`, `pulkChallengerBoost`, `pulkBoostHeadroom` — stood
  // here with `?? 0` and are gone for the same reason: they READ THE HOME now (ONE-HOME-1). On a
  // value that feeds arithmetic the literal was the worst of both worlds — a stale number if it
  // fired, and a NaN if it were simply deleted. The home is neither.
  // ── TIER 3: engine numbers whose fallback is a STALE PREVIOUS VALUE, not an off switch. ───────
  //
  // TIER 3 IS EMPTY OF ENGINE NUMBERS AS OF MIRROR-CENSUS-1 (2026-08-18), and the reason it emptied
  // is the reason the tier existed: a literal copying a value the default no longer holds cannot be
  // intentional under any reading, so there was nothing to decide. Eight sites now read the default:
  //   raceCore.js       bandBiasR · bandBiasGain · pulkLeadRotationDropDepthLengths · rowBonusPulk
  //   racePlanner.js    bandBiasR · bandBiasGain · gapRerollStrength · b2AttackFinalRank
  // WORLD and WORLD-OFF measured either side and byte-identical, which is the proof — the
  // reachability argument alone would not have been one.
  //
  // ONE OF THOSE EIGHT WAS NOT UNFIREABLE, and the record says so rather than leaving the claim
  // standing: `racePlanner.js` / `gapRerollStrength`. sim-fairness passes
  // `gapRerollStrength: GAP_REROLL_STRENGTH ?? undefined`, and `GAP_REROLL_STRENGTH` is null on any
  // arm where the gap-cap feature is off — so on the WORLD-OFF arm the fallback RAN, and resolved to
  // 0.5 against a shipped 1. It changed nothing only because `computeGapBiasedTarget` returns before
  // reading the strength when the threshold is null. FALLBACK-42-TRIAGE called it UNFIREABLE and gave
  // a reason that was true of raceCore and not of the sim's own `createRacePlan` call.
  //
  // ── AND THE EXCEPTION LIST IS NOW EMPTY OF ENGINE KEYS (ONE-HOME-1, 2026-08-19) ────────────────
  //
  // The paragraph that stood here said the `?? false` / `?? 0` shapes "deliberately stay", because
  // absent-means-OFF was a convention and changing it was the owner's decision. HE MADE IT, and he
  // rejected the question rather than answering it:
  //
  //   No key is ever missing. Every loader walks the full key set of its defaults, so the running
  //   game cannot lack one. The fallbacks exist so a function can be called WITHOUT a config at
  //   all — and the only callers that do that are tests and harnesses. THE RULE IS THEREFORE: no
  //   second definition of a value. A caller that passes no config reads the ONE HOME.
  //
  // So reachability stopped being the question. `racePlanner.js`/`b2AttackHeroes` and
  // `heroCurveGenerator.js`'s `b2AttackHeroes` / `b2AttackFinalRank` read the home now, along with
  // TWO OBJECT-LITERAL copies of `b2AttackProgress` that this guard cannot see at all — its NULLISH
  // pattern matches scalars and SCREAMING_CASE only. A full hand search of the client found exactly
  // those two live sites and no others; the count is in ONE-HOME-1's report so the next reader does
  // not have to repeat it.
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
  // ── TIER 5: Dev Screen — ALSO EMPTY (ONE-HOME-1) ──────────────────────────────────────────────
  //
  // `gapRerollEnabled`, `phaseSplitBonusEnabled` and `racePlanBonusStrengthMultiplier` stood here at
  // six sites, exempt because the section holds `loadRaceDynamicsConfig()` in state and the literal
  // beside each control was never reached. All six read `DEFAULT_RACE_DYNAMICS_CONFIG` now.
  //
  // These were the three the owner could ever have SEEN — a checkbox reading off while the game ran
  // on, and 1.0x displayed where the game runs 2.0x, at the slider and at three derived readouts
  // under it. They are also the reason the JSX shape was worth doing rather than deleting: a bare
  // `checked={undefined}` would flip React from a controlled input to an uncontrolled one, which is
  // a different defect in a panel he uses. Reading the home has neither failure mode.
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

/** `walk`, widened to the script extensions — the founding instance is an `.mjs`. */
function walkAny(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walkAny(p, out);
    else if (/\.(js|jsx|mjs|cjs)$/.test(e) && !/\.test\.|__tests__/.test(p))
      out.push(p);
  }
  return out;
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

// ══ RULE A — A LITERAL MIRRORING A MACHINE-READABLE HOME MUST AGREE WITH IT ══════════════════════
//
// THE DEFECT IT EXISTS FOR. `scripts/audit-sprite-crops.mjs` carried a twenty-row table of
// `frameWidth`/`frameHeight`/`frameCount`/`displaySize`, written in `11093fff` (2026-06-03) — the
// same commit that introduced the cropped sheets. It disagreed with the racer-type registry on eight
// frame geometries and five display sizes FROM THE DAY IT WAS WRITTEN, and nothing noticed for 91
// days. Run with those numbers the tool sliced a 150-px sheet into 128-px windows and reported
// `bodyFillX = 1.000` for seven racers that fill nothing of the sort.
//
// ★ THE PAIRS ARE DISCOVERED, NEVER LISTED, and that is the design rather than a nicety. Both halves
// come from the registry at run time: the RACER IDS from `RACER_TYPE_IDS`, the FIELD NAMES from the
// union of the registry's own scalar config keys. A field added to a racer type is covered without
// anyone editing this guard, and a field removed stops being scanned. A TYPED LIST OF PAIRS WOULD BE
// THE SAME DEFECT ONE LEVEL UP — a hand-kept copy of what the registry holds, going stale exactly as
// the table it is meant to catch did.
//
// WHAT COUNTS AS A COPY. An object literal that both names a racer and states one of the registry's
// own scalar fields:
//     { id: 'horse', frameWidth: <registry>, displaySize: <registry> }   ← named by an `id:` value
//     horse: { displaySize: <registry> }                                ← named by the key it hangs from
//
// ONLY SCALARS ARE COMPARED, because only a scalar can disagree textually. `surfaceClasses`, `coats`
// and `rteDefinitions` are arrays and are out of reach here — stated because `goldenRunner.mjs`
// carries a `surfaceClasses` table that is a DIFFERENT FACT under the same name, and this guard must
// not be read as having cleared it.

/** The registry as a home: racerId → (field → scalar), plus the discovered field-name set. */
export async function loadRacerRegistry(root = ROOT) {
  const ns = await import(
    pathToFileURL(join(root, "client/src/modules/racer-types/index.js")).href,
  );
  const byRacer = new Map();
  const fields = new Set();
  for (const id of ns.RACER_TYPE_IDS) {
    // The FROZEN pre-override snapshot where one exists: some config fields are Dev-Screen tunable
    // and are mutated in place at module load, so `.config` alone would compare a copy against a
    // developer's local tuning rather than against what the repository ships.
    const snap = ns.CONFIG_SNAPSHOT && ns.CONFIG_SNAPSHOT[id];
    const m = new Map();
    for (const [k, v] of Object.entries(ns.RACER_TYPES[id].config)) {
      const val = snap && k in snap ? snap[k] : v;
      if (val === null || typeof val === "object" || typeof val === "function")
        continue;
      m.set(k, val);
      fields.add(k);
    }
    byRacer.set(id, m);
  }
  return { byRacer, fields };
}

/** The `{ … }` literal enclosing index `at`, or null past the size cap. */
function enclosingObject(src, at, cap = 4000) {
  let depth = 0;
  let start = -1;
  for (let i = at; i >= 0 && at - i < cap; i--) {
    const c = src[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let i = start; i < src.length && i - start < cap; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return { start, text: src.slice(start, i + 1) };
    }
  }
  return null;
}

const FIELD_LIT =
  /(?:^|[{,\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false|'[^'\n]*'|"[^"\n]*")/g;

/** Every registry field copied as a literal in `src`, with the racer it claims to describe. */
export function findRegistryCopies(src, file, registry) {
  const { byRacer, fields } = registry;
  const out = [];
  const seen = new Set();
  for (const id of byRacer.keys()) {
    // The racer named as a STRING VALUE (`id: 'horse'`) or as an OBJECT KEY (`horse: { … }`).
    // NOT a template literal: `\s` inside one collapses to a bare `s`, which silently turned
    // this pattern into `(?:^|[{,s])ducks*:s*{` and made the key-form invisible. Caught by the
    // test for that form, which is why the test asserts the FORM rather than the code's output.
    // `String.raw` because a normal template literal eats the backslashes: `\s` inside one
    // collapses to a bare `s`, which silently turned this into `(?:^|[{,s])ducks*:s*{` and made
    // the key-form invisible. Caught by the test for that form, which asserts the FORM rather
    // than whatever the code happened to produce.
    const pat = new RegExp(
      String.raw`'${id}'|"${id}"|(?:^|[{,\s])${id}\s*:\s*\{`,
      "g",
    );
    for (const m of src.matchAll(pat)) {
      const obj = enclosingObject(src, m.index + m[0].length - 1);
      if (!obj) continue;
      const dedupe = `${obj.start}:${id}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      for (const f of obj.text.matchAll(FIELD_LIT)) {
        const key = f[1];
        // Naming the racer is not a copy of a fact ABOUT it.
        if (key === "id" || !fields.has(key)) continue;
        const expected = byRacer.get(id).get(key);
        if (expected === undefined) continue;
        const value = literal(f[2]);
        // A different type is a different job, not a disagreement — the same rule the `??` half uses.
        if (typeof value !== typeof expected) continue;
        out.push({ file, id, key, value, expected, ok: Object.is(value, expected) });
      }
    }
  }
  return out;
}

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

// ── THE MODULE ONLY RUNS WHEN IT IS THE ENTRY POINT ─────────────────────────────────────────────
//
// Its own test imports `findPairs` from it, and every other consumer — the pre-commit hook, the CI
// job, `verify` — SPAWNS it as a process. Until Rule A landed the difference did not show: the guard
// was green, so a self-run on import exited 0 and looked like nothing. The moment Rule A found a real
// disagreement, importing the module called `process.exit(1)` and took the test file down with it.
// Found by running that test rather than by reasoning, and fixed here rather than by making Rule A
// quieter. Checked before changing it: NOTHING else imports this module.
const IS_ENTRY =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (IS_ENTRY) {
const { byKey, ambiguous } = await loadDefaults();
const files = walk(SRC);
const pairs = [];
for (const abs of files) {
  const rel = relative(ROOT, abs).replace(/\\/g, "/");
  pairs.push(...findPairs(readFileSync(abs, "utf8"), rel, byKey));
}


// ── RULE A's SCAN. It reaches FURTHER than the `??` half above, and it has to: the founding defect
// lived in `scripts/`, which `dirs` did not cover, and CENSUS-DUPES-1 named that as its own largest
// declared hole. The HOME ITSELF is excluded — the racer-type modules are the definitions, not
// copies of them — as are test files, on the same reasoning the `??` half uses.
const REGISTRY_HOME = "client/src/modules/racer-types/";
// `--registry-root=<dir>` points the REGISTRY load at a fixture. It exists for one reason and it is
// the reason `--src=`, `--tags-file=` and `--doc=` exist: without it, the loud failure below cannot
// be fired, and a check that cannot go red is the thing this guard is for. It is NOT `--src=`: that
// one moves the SCAN, this one moves the HOME, and conflating them would make the rule compare a
// fixture against itself.
const REGISTRY_ROOT =
  process.argv
    .find((a) => a.startsWith("--registry-root="))
    ?.slice("--registry-root=".length) ?? ROOT;
const registry = await loadRacerRegistry(REGISTRY_ROOT);
const regRoots = process.argv.some((x) => x.startsWith("--src="))
  ? [SRC]
  : ["client/src", "scripts", "client/scripts"].map((d) => join(ROOT, d));
const regFiles = regRoots
  .filter((d) => {
    try {
      return statSync(d).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((d) => walkAny(d));
/** A run that cannot see must break the build, never bless it (Lesson 187). */
const fail187 = (msg) => {
  console.error(`\nFAIL: ${msg}\n      See Lesson 187.`);
  process.exit(1);
};

// ── LOUD FAILURE ON A BROKEN DISCOVERY (Lesson 187, DROP-CROP-SCRIPT-1) ─────────────────────────
//
// Rule A finding ZERO literals is the GOAL, not a fault: REGISTRY-LITERALS-1 removed the copies this
// rule was built for before it existed, and deleting `crop-sprite-sheets.mjs` removed the last
// twelve. From today its live population is zero and it prints "0 registry literal(s)" — which is
// indistinguishable from a rule whose DISCOVERY has silently stopped working, and that is the exact
// shape Lesson 187 is about.
//
// So the discovery itself is what must never be empty. A registry that yields no racers, no fields,
// or a walk that reaches no files, means this rule proved nothing and must break the build. Its own
// test already asserted these are non-empty; asserting it only in the test checks the fixture, not
// the tree.
if (registry.byRacer.size === 0 || registry.fields.size === 0)
  fail187(
    `RULE A discovered ${registry.byRacer.size} racer type(s) and ${registry.fields.size} field ` +
      `name(s) in ${REGISTRY_HOME}. It cannot have compared anything.\n` +
      `      Either the registry moved or its exports changed shape. Refusing to report "0 disagree".`,
  );
if (regFiles.length === 0)
  fail187(
    `RULE A walked ZERO files across ${regRoots.length} root(s). Nothing was scanned, so "0 disagree"\n` +
      `      would be a statement about an empty search rather than about this repository.`,
  );

const copies = [];
for (const abs of regFiles) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  if (rel.startsWith(REGISTRY_HOME)) continue;
  copies.push(...findRegistryCopies(readFileSync(abs, "utf8"), rel, registry));
}
const copiesBad = copies.filter((c) => !c.ok);

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
console.log(
  `check-fallback-agreement RULE A: ${copies.length} registry literal(s) in ${regFiles.length} file(s), ` +
    `over ${registry.byRacer.size} racer type(s) and ${registry.fields.size} DISCOVERED field name(s); ` +
    `${copiesBad.length} disagree. (SCALARS ONLY — arrays such as surfaceClasses are out of reach.)`,
);

// ══════════════════════════════════════════════════════════════════════════════════════════════
// RULE D — THE REGISTRY MUST AGREE WITH THE ARTWORK IT DESCRIBES
//
// Rule A asks whether a COPY of a registry field still agrees with the registry. This asks the
// question one step further out, at the end nobody was holding: **does the registry agree with the
// PNG?** For every racer type: `frameWidth × frameCount === pngWidth` and `frameHeight === pngHeight`,
// read from the file's own IHDR header — 24 bytes, no decoder, no dependency.
//
// WHY IT IS THE HALF THAT WAS MISSING. CENSUS-DUPES-1 catalogued this as group A2 and named the PNG
// as its SOURCE OF TRUTH — the only group in the census whose truth is a binary asset. It recorded
// "Guard: NONE", and verified the agreement BY HAND. RULE-A-REACH-1 measured the consequence: of the
// twelve duplicated-fact groups, Rule A covers one in full and **A2 only by half** — the copies, not
// the fact. This is that half. **The agreement has been checked by hand twice and by a machine
// never**, in eighty-eight days.
//
// WHAT IT DOES NOT COVER, and the distinction is load-bearing rather than pedantic: it compares
// GEOMETRY, so it is blind to a change that leaves the frame size alone. ARTWORK-DIGEST-1 measured
// exactly that case — the 2026-09-03 overwrite produced `1200x150` before AND after, same dimensions,
// different pixels — which is why the digest in `check-seed-versions` exists beside this and neither
// replaces the other. **This rule catches a registry that has drifted from its art; that one catches
// art that has drifted from itself.**
//
// LOUD FAILURE (Lesson 187): zero types with a resolvable sheet FAILS. A rule that compared nothing
// must not print "0 disagree".
// ══════════════════════════════════════════════════════════════════════════════════════════════

const ART_DIR = "client/public/assets/racers";
const artMismatch = [];
let artChecked = 0;
const artUnresolved = [];
for (const [id, fields] of registry.byRacer) {
  const url = fields.get("spriteUrl");
  const fw = fields.get("frameWidth");
  const fh = fields.get("frameHeight");
  const fc = fields.get("frameCount");
  if (typeof url !== "string" || !url) {
    artUnresolved.push(`${id} — no spriteUrl in the registry`);
    continue;
  }
  if (![fw, fh, fc].every((v) => typeof v === "number" && v > 0)) {
    artUnresolved.push(`${id} — frameWidth/frameHeight/frameCount are not all positive numbers`);
    continue;
  }
  const file = join(ROOT, ART_DIR, url.split("/").pop());
  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    artUnresolved.push(`${id} — ${url} is not on disk under ${ART_DIR}`);
    continue;
  }
  // PNG IHDR: width at byte 16, height at byte 20, both big-endian.
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  artChecked++;
  if (fw * fc !== w || fh !== h)
    artMismatch.push(
      `    ${id}: registry says ${fw}x${fh} x${fc} frames = a ${fw * fc}x${fh} sheet, ` +
        `but ${url.split("/").pop()} is ${w}x${h}`,
    );
}

if (artChecked === 0)
  fail187(
    `RULE D resolved ZERO racer sheets under ${ART_DIR}. Either the artwork moved or the registry\n` +
      `      stopped naming it, and "0 disagree" would be a statement about an empty search.`,
  );

console.log(
  `check-fallback-agreement RULE D: ${artChecked} racer sheet(s) checked against the registry's own ` +
    `frame geometry; ${artMismatch.length} disagree${artUnresolved.length ? `, ${artUnresolved.length} unresolved` : ""}. ` +
    `(GEOMETRY ONLY — a change that leaves the frame size alone is the artwork digest's question, not this one.)`,
);
for (const u of artUnresolved) console.log(`  unresolved: ${u}`);

if (artMismatch.length) {
  console.error("");
  console.error(
    `FAIL: RULE D — ${artMismatch.length} racer type(s) whose registry geometry does not match the ` +
      `PNG it names.`,
  );
  for (const m of artMismatch) console.error(m);
  console.error(
    "      The PNG is the source of truth here — it is the artwork. Either the registry was edited\n" +
      "      without the sheet, or the sheet was replaced without the registry. Read the file's own\n" +
      "      header before deciding which: `frameWidth × frameCount` must equal the sheet's width.",
  );
  process.exitCode = 1;
}


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

// ── RULE A GATES SINCE 2026-09-03, AND THE ROUTE THERE IS THE POINT ─────────────────────────────
//
// On its first run against today's tree it went red on `scripts/crop-sprite-sheets.mjs`, and that
// objection was LEGITIMATE: `FLAGGED_TYPES` there records the PRE-CROP source geometry a one-shot
// cropping run took as INPUT, not the registry's current post-crop values. Same field names, a
// different fact — the `surfaceClasses` shape one level along.
//
// ★ NO EXCEPTION WAS EVER ADDED, DELIBERATELY. An exception would have been the guard learning to
// ignore the only thing it had ever objected to, on the authority of whoever wrote the exception.
// And no mechanical discriminator exists: "a table that copies the registry" and "a table that
// records what the registry used to hold" are the same shape, and telling them apart is a judgement
// about intent. That was the finding, and it was reported rather than worked around.
//
// ★ THE OWNER RULED TWICE. First RENAME (PRE-CROP-FIELDS-1, 2026-09-03): the fields became
// `preCropFrameWidth` / `preCropFrameHeight`, so they stopped being registry field names and this
// rule stopped discovering them — not because it was told to ignore them, but because THE
// DISTINCTION EXISTED IN THE TREE. Then DELETE (DROP-CROP-SCRIPT-1, the same day): the script had
// done its work in June and what it could still do was destructive only. **So the file this rule
// objected to is gone, its pre-crop record is preserved beside the artwork in
// `client/public/assets/racers/CREDITS.md`, and the code is at `archive/crop-sprite-sheets`.**
// Rule A reports 0 disagreements over 20 racer types and 22 discovered fields, with an EMPTY
// exception list, and gates: it is a build failure from here. Its live population is now ZERO,
// which is why the discovery itself carries a loud failure above.
// The general rule that prevents the next one is R18 in docs/VERIFY-RULES.md.
//
// It is deliberately LOUD, and it names both sides, because a rule that only says "no" gets an
// exception written for it.
if (copiesBad.length) {
  console.error("");
  console.error(
    `FAIL: RULE A — ${copiesBad.length} literal(s) in ` +
      `${new Set(copiesBad.map((c) => c.file)).size} file(s) mirror a racer-type registry field and ` +
      `DISAGREE with it.`,
  );
  for (const c of copiesBad)
    console.error(
      `    ${c.file}: ${c.key} = ${JSON.stringify(c.value)} for '${c.id}', registry says ${JSON.stringify(c.expected)}`,
    );
  console.error(
    `      Bring the literal in step with the registry, or — if it is a DIFFERENT FACT that merely\n` +
      `      wears the live field's name, such as a record of what the value USED to be — rename the\n` +
      `      field so its meaning is in the name (R18). Do not add an exception: an exception here is\n` +
      `      the guard being told to ignore the only thing it can see.`,
  );
  process.exitCode = 1;
}

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
}
