// ============================================================
// File:        scripts/w-ref-one-home.test.mjs
// Project:     RaceArena — W-REF-ONE-HOME-1
//
// WHAT THIS OWNS: that the body-narrow ceiling `W_REF_MAX` has exactly ONE home
// (`client/src/modules/raceParams.js`) and that no caller re-types it as a literal.
//
// ── ★ WHY THIS IS A GUARD AND NOT A COMMENT, WITH THE COST THAT BOUGHT IT ───────────────────────
//
// `scripts/sim-fairness.mjs` carried `const W_REF = Math.min(285, effectiveWidth)` under a comment
// reading "W_REF cap at 285 matches the game's cap". That file DRIVES THE WORLD FINGERPRINT. So for
// as long as the copy existed, the project's primary change-detector for the RACE could not see a
// change to the number that decides every start position: HULL-FIX-1 proved by sabotage that moving
// `W_REF_MAX` moves both golden races, and the world hash did not follow. **A green world value was
// not a clearance for that constant.** A constant kept in step by a comment is exactly the shape
// `raceParams.js` was extracted to remove, and it had grown back in eleven places.
//
// ── ★ WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────
//
//   · It does not check the VALUE. `raceParams.js` owns that; changing it is an engine decision
//     with the ship ceremony, and this guard must not have an opinion on the number.
//   · It does not ban the digits 285. A future unrelated 285 — a timeout, a pixel width — is not
//     this defect, so the patterns below require the SHAPE: the literal in the cap position of a
//     `Math.min`, a `W_REF`-named binding, or the first argument of `computeBodyNarrowRef`.
//   · It does not scan comments. Three headers quote the old expression while explaining what was
//     removed, and a guard that made them illegal would delete the record of its own reason.
//   · It does not police FIXTURE WIDTHS. `rowLayout.test.js` passes 285, 570 and 1140 as track
//     widths to bracket the ceiling; those are inputs to a property, not copies of the constant,
//     and that file already reads `W_REF_MAX` for every cap-role use.
//
// ── ★ THE ZERO-HIT GREP IS KEPT HONEST ──────────────────────────────────────────────────────────
//
// A search that finds nothing is indistinguishable from a search that is broken. So the scanner is
// run against synthetic sources that DO carry each pattern and must report every one, and the file
// census must find the real `W_REF_MAX` readers. If either fails, the zero above means nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOME = "client/src/modules/raceParams.js";

/** The re-typed-ceiling patterns, each with the sentence a failure should print. */
const PATTERNS = [
  [/Math\.min\(\s*285\b/, "Math.min(285, …) — the cap, re-typed"],
  [/\bW_REF\w*\s*=\s*285\b/, "a W_REF binding assigned the literal 285"],
  [/computeBodyNarrowRef\(\s*285\b/, "285 passed straight into computeBodyNarrowRef"],
];

/** Comment-only lines removed — a line that begins with `//`, `*` or `/*` is not code. */
function codeOf(src) {
  return src
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
    .join("\n");
}

/** Every offending line in one source, as `{line, why}`. */
function offencesIn(src) {
  const out = [];
  codeOf(src)
    .split("\n")
    .forEach((line, i) => {
      for (const [re, why] of PATTERNS) if (re.test(line)) out.push({ line: i + 1, why });
    });
  return out;
}

function trackedCode() {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\n")
    .filter((f) => /\.(mjs|cjs|js|jsx)$/.test(f));
}

test("★ THE SCANNER CAN FIRE — otherwise the zero below is worthless", () => {
  const found = [
    "  const W_REF = Math.min(285, effectiveWidth);",
    "const W_REF_MAX = 285;",
    "  const br = computeBodyNarrowRef(285, n, ds, bfN, cfg);",
  ].map((s) => offencesIn(s).length);
  assert.deepEqual(found, [1, 1, 1], "a pattern stopped matching its own defect");

  // ...and it must NOT fire on the shapes this guard deliberately allows.
  for (const allowed of [
    "  const W_REF = Math.min(W_REF_MAX, effectiveWidth);",
    "    expect(at(285)).toBeCloseTo(28.5, 6);", // a fixture width
    "  const timeoutMs = 285;", // an unrelated 285
    "// const W_REF = Math.min(285, effW);  <- prose about what was removed",
  ]) {
    assert.equal(offencesIn(allowed).length, 0, `false positive on: ${allowed.trim()}`);
  }
});

test("★ NO FILE RE-TYPES THE CEILING — one home, and only one", () => {
  const offenders = [];
  for (const f of trackedCode()) {
    if (f === HOME) continue; // the home is allowed to state its own number
    let src;
    try {
      src = readFileSync(join(ROOT, f), "utf8");
    } catch {
      continue;
    }
    for (const o of offencesIn(src)) offenders.push(`${f}:${o.line} — ${o.why}`);
  }
  assert.deepEqual(
    offenders,
    [],
    "the body-narrow ceiling has grown a second home:\n  " +
      offenders.join("\n  ") +
      "\n  Import { W_REF_MAX } from raceParams.js instead of writing the number.",
  );
});

test("the home still declares it, and the census reads real files", () => {
  const home = readFileSync(join(ROOT, HOME), "utf8");
  assert.match(home, /export const W_REF_MAX = \d+;/, "raceParams.js no longer declares W_REF_MAX");

  // DISCOVERY, not decoration: if the file walk breaks, the test above passes on an empty tree.
  // Eleven callers were converted by W-REF-ONE-HOME-1; a floor well under that survives a rename
  // without letting a broken scan through.
  const readers = trackedCode().filter((f) => {
    if (f === HOME) return false;
    try {
      return /\bW_REF_MAX\b/.test(readFileSync(join(ROOT, f), "utf8"));
    } catch {
      return false;
    }
  });
  assert.ok(
    readers.length >= 8,
    `only ${readers.length} file(s) read W_REF_MAX — the walk found almost nothing, so the ` +
      "zero-offender result above is not evidence",
  );
  // The one that matters most, named because it is the reason this guard exists.
  assert.ok(
    readers.includes("scripts/sim-fairness.mjs"),
    "sim-fairness.mjs no longer reads the one home — the world fingerprint is blind again",
  );
});
