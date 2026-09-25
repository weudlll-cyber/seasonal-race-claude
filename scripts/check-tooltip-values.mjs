// ============================================================
// File:        scripts/check-tooltip-values.mjs
// Project:     RaceArena — NIGHT-2026-09-26 PIECE 2
//
// A TOOLTIP MUST NOT STATE A CONFIG VALUE. This guard fails when a Dev Screen section source
// carries a number stated as a default (or a range) in a UI string.
//
// THE DEFECT IT EXISTS FOR. DEVSCREEN-STOCKTAKE (2026-09-25) measured it: 38 tooltips across the
// Dev Screen stated a default with nothing checking them, and five of the nine MISLEADING findings
// were a drifted number — a tooltip that claimed a value the game no longer ships. The structural
// cause named in the same stock-take: `check-config-claims` holds DOCUMENTS to stating no config
// values, and tooltips are source, outside that guard's reach.
//
// THE RULE IS THE ONE ALREADY APPLIED TO DOCUMENTS AND FINGERPRINTS: one truth, one home;
// everywhere else references it or says nothing. This file is shaped after `check-config-claims`
// deliberately — same posture, same refusal wording, same provision for a dated historical row.
//
// WHY IT FAILS ON **ANY** DEFAULT-SHAPED NUMBER, NOT ONLY A WRONG ONE. A guard that failed only on
// drifted numbers would go quiet the moment somebody edited a default, because the stale number in
// the tooltip would stop matching. Failing on ANY stated default is what makes the sentence
// "changing a default cannot make a tooltip stale" TRUE — after this guard no tooltip carries a
// number to go stale. Where the reader genuinely needs the shipped value, the Dev Screen already
// shows the LIVE value in the control itself (the input, the pill, the slider read-out).
//
// WHAT COUNTS AS A CLAIM — deliberately NARROW. A claim is one of the drift-prone shapes tooltips
// actually use:
//   "Default: N", "Default N", "Defaults to N", "defaults to N",
//   "Default range N", "shipped N", "shipped: N", "ships N", "ships: N".
// The N may carry a unit (`%`, `ms`, `s`, `px`) or a second number (a range like `35-50`); it is
// still one stated number. The rule is intentionally UI-specific — the check-config-claims style
// of `key + verb + number` does not fit tooltips, where the key name rarely appears at all, so
// this guard names the DRIFT-PRONE SHAPES instead.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **A value stated far from the word "default".** "3500 ms is calm" carries no verb and is
//     invisible here. Same limit as check-config-claims: a lexical guard cannot judge intent.
//   - **A value in a shape not listed above.** Prose that spells the number in words ("three
//     seconds"), or a bare number in a description of range-of-effect.
//   - **Legitimate numbers that describe a FACTOR or a UI-fact.** "1× factor" (Auto-Scale's
//     Enabled) and "Range 0.5–4.0" widget clamps are not stated defaults and are not matched.
//     Widget bounds are set on the input element itself and are the input's own truth.
//   - **A dated line.** A tooltip line carrying `YYYY-MM-DD` is a historical statement — same
//     provision `check-config-claims` gives its docs. In practice tooltips do not carry dates;
//     the provision exists for symmetry, not because it is expected to fire.
//   - **Non-DevScreen source.** Only files under `client/src/screens/DevScreen/sections/` are
//     scanned — those are the files that render controls, and they are the only place a "tooltip"
//     lives on this screen. Tests, harnesses and non-DevScreen source legitimately contain
//     values.
//
// LOUD-FAILURE RULE (Lesson 187): zero section files scanned, or an unreadable directory, FAILS.
// A guard that passes because it found nothing to check is a no-op.
//
// Usage:
//   node scripts/check-tooltip-values.mjs              # fail on any stated default in a section source
//   node scripts/check-tooltip-values.mjs --inventory  # list every stated default, then exit 0
//   node scripts/check-tooltip-values.mjs --root=<dir> # scan a copy (used by its test)
// ============================================================

export const GUARD = {
  id: "check-tooltip-values",
  covers:
    "Dev Screen section sources stating a config VALUE in a tooltip or blurb — the value must live in one home (defaults.js) and be pointed at by the control's own read-out, never copied into a UI string",
  blind: [
    "a number stated in a tooltip without a default-shaped verb near it",
    "a UI string in a source file outside client/src/screens/DevScreen/sections/",
  ],
  dirs: ["client/src/screens/DevScreen/sections/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT = argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = process.argv.includes("--inventory");
const SECTIONS_REL = "client/src/screens/DevScreen/sections";

// A DATED ROW IS HISTORY AT THE POINT OF USE — same as check-config-claims. If a tooltip line
// carries a YYYY-MM-DD date, its number is a record rather than a current claim.
const DATED = /\d{4}-\d{2}-\d{2}/;

// THE DRIFT-PRONE SHAPES. Each match is one stated default in one line. Case-insensitive on the
// verb; the number that follows may carry a unit or be the first half of a range.
//
// The shape names are:
//   Default:? N        →  "Default: 67%" / "Default 1500ms"
//   Defaults to N      →  "Defaults to 0.6"
//   Default range N    →  "Default range 35–50 px"
//   ships? N           →  "ships 0.75" / "shipped at 300"
//
// A leading `[A-Za-z]` is refused before "Default" and "ships" so that "predefault" or "airships"
// cannot false-fire — the same word-boundary discipline check-config-claims applies to its verbs.
const CLAIM_PATTERNS = [
  {
    name: "Default N",
    // "Default: 67%" or "Default 1500ms" — colon optional, requires a digit next.
    re: /\bDefault[s]?\s*:?\s+(-?\d+(?:\.\d+)?)/,
  },
  {
    name: "Defaults to N",
    re: /\bDefaults?\s+to\s+(-?\d+(?:\.\d+)?)/i,
  },
  {
    name: "Default range N",
    re: /\bDefault\s+range\s+(-?\d+(?:\.\d+)?)/i,
  },
  {
    name: "ships N",
    // "ships 0.75" / "shipped at 300" / "shipped: 300" — must be a verb, not a noun-ship.
    re: /\b(?:ships|shipped)\s*(?:at|:)?\s+(-?\d+(?:\.\d+)?)/i,
  },
];

// ── walk the sections directory ───────────────────────────────────────────────
function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (e) {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p));
    } else if (/\.(jsx|js)$/.test(name) && !/\.test\.(jsx|js)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const sectionsDir = join(ROOT, SECTIONS_REL);
const files = walk(sectionsDir);

if (files.length === 0) {
  console.error(
    `FAIL: scanned ZERO section files under ${SECTIONS_REL}. The guard cannot have proved anything. See Lesson 187.`,
  );
  process.exit(1);
}

// ── scan each file line by line ───────────────────────────────────────────────
let failures = 0;
const claims = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).replace(/\\/g, "/");
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  text.split("\n").forEach((line, i) => {
    // Line stripped of markdown emphasis, since some tooltips carry it inline.
    const clean = line.replace(/[`*_]/g, "");
    for (const { name, re } of CLAIM_PATTERNS) {
      const m = clean.match(re);
      if (!m) continue;
      claims.push({
        file: rel,
        line: i + 1,
        shape: name,
        stated: Number(m[1]),
        dated: DATED.test(clean),
        text: line.trim().slice(0, 140),
      });
      break; // one claim per line — do not count the same mention twice
    }
  });
}

const current = claims.filter((c) => !c.dated);
const historical = claims.filter((c) => c.dated);

if (INVENTORY) {
  console.log(
    `check-tooltip-values INVENTORY: ${claims.length} claim(s) — ${current.length} CURRENT, ${historical.length} on a DATED row.\n`,
  );
  for (const c of claims) {
    console.log(
      `[${c.dated ? "DATED " : "CURRENT"}] ${c.file}:${c.line}  shape=${c.shape}, stated=${c.stated}\n    ${c.text}`,
    );
  }
  console.log(`\n[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
};

for (const c of current) {
  fail(
    `${c.file}:${c.line} states a config value in a UI string (shape="${c.shape}", stated=${c.stated})\n` +
      `      ${c.text}\n` +
      `      One truth lives in one place — client/src/modules/storage/defaults.js. Remove the\n` +
      `      number from the tooltip and describe the EFFECT instead. Where the reader genuinely\n` +
      `      needs the shipped value, the control shows it in its own input. If this is a\n` +
      `      HISTORICAL statement, put its date on the line and it will read as history to the\n` +
      `      guard and to a reader alike.`,
  );
}

console.log(
  `check-tooltip-values: ${files.length} section file(s), ${current.length} current claim(s), ${historical.length} dated row(s) allowed. ` +
    `(Stated NUMBERS only, in the drift-prone shapes named at the top — it does not check prose, factor descriptions, or numbers far from a "default"/"ships" verb.)`,
);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
