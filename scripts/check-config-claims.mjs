// ============================================================
// File:        scripts/check-config-claims.mjs
// Project:     RaceArena — CONFIG-TRUTH-1 stage 2
//
// A CONFIG VALUE LIVES IN `client/src/modules/storage/defaults.js` AND NOWHERE ELSE. This guard
// fails when a DOCUMENT states one.
//
// THE DEFECT IT EXISTS FOR. CLEAN-STATE-1 measured it: seven config keys were stated as CURRENT in
// living documents and disagreed with source, five of them inside `KRAEFTE-LANDKARTE.md`, whose own
// header promised that every value is verifiable against source. `choreoOutcomeStart` was documented
// as "the shipped 0.5" in four separate documents while the shipped world fingerprint was minted
// from 0.6. Nothing could notice, because a number in a sentence has no owner.
//
// THE RULE IS THE ONE ALREADY APPLIED TO FINGERPRINTS (ONE-TRUTH-2), and deliberately so: one truth,
// one home; everywhere else references it or says nothing. `check-fingerprints.mjs` is the sibling
// and this file is shaped after it.
//
// WHY IT FAILS ON **ANY** VALUE, NOT ONLY A WRONG ONE — the decision that makes the guard useful.
// A guard that failed only on values disagreeing with source would (a) pass a correct copy, which is
// still a copy that has to be kept in step, and (b) go quiet the moment someone changes a default,
// because the stale number in the document would stop matching. Failing on ANY stated value is what
// makes the sentence "changing a default cannot make a document stale" TRUE, because after this
// guard no document carries a number to go stale.
//
// WHAT COUNTS AS A CLAIM — deliberately NARROW, and the alternative was considered and rejected.
// A claim is a key name followed by a number in one of the shapes documents actually use:
// `key = N`, `key: N`, `key (N)`, `key (default N)`, `key at/to/of/is/was/now/stays at/set to N`.
// The broader rule — ANY number within N characters of a key name — catches more and fires on prose
// that merely discusses a knob ("at 40 racers the `minRacersVisible` guarantee binds"). A guard with
// a false-positive rate people learn to ignore is worse than a narrower one they trust, which is the
// whitelist half of Lesson 187. WHAT THE NARROW RULE MISSES is listed below, honestly, and it is not
// nothing.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **A value stated far from its key.** "The re-roll stops at 80% of the race" names no key and
//     is invisible here. This is the biggest hole and it is inherent to a lexical guard.
//   - **A value in a shape not listed above** — a table cell two columns from the key name, a value
//     in a heading, prose that spells the number in words ("three racers").
//   - **Keys whose names are ordinary English words.** `min` and `max` are real keys in
//     `DEFAULT_BASE_SPEED_CONFIG`; scanning for them matched "max 100 characters" in every
//     document. They are SKIPPED, by name, below. Nothing checks them.
//   - **Whether the prose is TRUE.** "This knob is the only override of the corridor guarantee"
//     passes, whether or not it is right. Only stated NUMBERS are in scope.
//   - **Non-document files.** Source, tests and harnesses legitimately contain values; only tracked
//     `*.md` is scanned.
//   - **Dated rows.** A line carrying a `YYYY-MM-DD` date is a changelog entry — history at the
//     point of use — and is allowed its number. It cannot tell an honest dated row from a current
//     claim that happens to sit on a dated line.
//   - **THE DATE AND THE CLAIM MUST SHARE A LINE**, and prettier decides where lines break. Writing
//     a dated sentence is not enough: reflowing a paragraph can put the date on one line and the
//     value on the next, and then the value is unexempted. Found by this guard failing on a BACKLOG
//     entry written for MERGE-AND-GUARD-1 whose date prettier had just moved one line up. The fix
//     is to write the date beside the number, not merely nearby.
//   - It does not verify that `defaults.js` is itself correct, or that any value ever shipped.
//
// LOUD-FAILURE RULE (Lesson 187): zero keys extracted, zero documents scanned, or an unreadable
// `defaults.js` all FAIL. A guard that passes because it found nothing to check is a no-op.
//
// Usage:
//   node scripts/check-config-claims.mjs              # fail on any CURRENT claim
//   node scripts/check-config-claims.mjs --inventory  # list every claim incl. dated rows, then exit 0
//   node scripts/check-config-claims.mjs --root=<dir> # scan a copy (used by its test)
// ============================================================

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = process.argv.includes("--inventory");
const DEFAULTS_REL = "client/src/modules/storage/defaults.js";

// WHICH DOCUMENTS ARE IN SCOPE — the SAME living-doc predicate `check-doc-links.mjs` already uses,
// deliberately reused rather than re-invented. Every tracked `.md` under `docs/`, plus the
// repo-ROOT-level `*.md`. Nested result/experiment/report trees (`reports/`, results dirs,
// `client/`, `server/`, `scripts/`) are the lab journal and are allowed their numbers, because a
// report records what was true on the day it was written and must never be rewritten.
//
// A second split existing alongside that one would be a fourth home for the same knowledge, which
// is the thing this whole line of work is against.
const isLivingDoc = (f) => {
  if (f.includes("node_modules/") || f.includes("/dist/")) return false;
  if (f.startsWith("docs/")) return true;
  if (!f.includes("/")) return true; // README.md, KRAEFTE-LANDKARTE.md, …
  return false;
};

// A DOCUMENT MAY DECLARE ITSELF HISTORY, and some under `docs/` genuinely are: a dated diagnostic
// snapshot, a tuning log, an analysis of a state that has since moved. Stripping their numbers would
// destroy the record; leaving them silent would let a reader take a 2026-05 measurement for today's
// truth. So the document says so IN ITSELF, on one line near the top, and both the guard and the
// reader get the same signal from the same place (stage 2c):
//
//   <!-- HISTORICAL: 2026-05-14 — camera inventory taken before the corridor unit landed -->
//
// It is deliberately a whole-document switch and deliberately NOT a directory glob: someone has to
// write the date and the sentence, which is the smallest possible act of taking responsibility for
// calling a document history.
const HISTORICAL_MARK =
  /<!--\s*HISTORICAL:\s*(\d{4}-\d{2}-\d{2})\s*[—-]\s*(.+?)-->/;

// EXCEPTIONS, listed BY NAME with a reason, never by pattern — the same discipline
// `check-fingerprints.mjs` uses for its own exceptions, and for the same file.
const EXCEPT = new Map([
  [
    "docs/TAGS.md",
    "the tag register: a tag's values are what they were when the tag was cut, so every number in " +
      "it is history by construction. It cannot carry a HISTORICAL mark because the register itself " +
      "is live — new tags are added to it.",
  ],
  [
    "docs/AUDIT.md",
    "the append-only audit log. Every entry records what an audit measured on ITS date, with the " +
      "config of that day; its own banner already tells the reader to read rows as history and " +
      "points at the living documents for the current force set. Same shape as TAGS.md: history by " +
      "construction, but a live register, so a whole-document HISTORICAL mark would be a lie.",
  ],
]);

// KEYS WHOSE NAMES ARE ORDINARY ENGLISH WORDS. Listed BY NAME with the reason, never by pattern,
// because a pattern would silently grow. These are NOT checked at all — see the header.
const UNSCANNABLE_KEYS = new Map([
  ["min", "an English word; matches 'min 8', 'min 1000' in unrelated prose"],
  ["max", "an English word; matches 'max 100 characters' in every document"],
  [
    "duration",
    "an English word (and a real key in DEFAULT_RACE_DEFAULTS): matches 'the minimum tested " +
      "duration is 30 seconds', which is a statement about test COVERAGE, not about the default. " +
      "The alternative was rewording a true sentence to appease the guard, which is the L206 " +
      "failure — the guard blames the document and the document gets edited. Its real claims in " +
      "KRAEFTE-LANDKARTE.md were fixed by hand and are NOT enforced from here.",
  ],
]);

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
};

// ── the keys, read from the ONE home ──────────────────────────────────────────
let defaults;
try {
  defaults = await import(pathToFileURL(join(ROOT, DEFAULTS_REL)).href);
} catch (e) {
  console.error(`FAIL: cannot read ${DEFAULTS_REL} — ${e.message}`);
  console.error(
    "That file IS the single home for config values. Without it there is nothing to check against.",
  );
  process.exit(1);
}

const keys = new Map();
for (const [objName, obj] of Object.entries(defaults)) {
  if (!objName.startsWith("DEFAULT_") || !obj || typeof obj !== "object")
    continue;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "number") continue; // booleans read as prose, not as stated numbers
    if (UNSCANNABLE_KEYS.has(k)) continue;
    keys.set(k, { value: v, from: objName });
  }
}

if (keys.size === 0) {
  console.error(
    "FAIL: extracted ZERO scannable config keys. The guard cannot have proved anything. See Lesson 187.",
  );
  process.exit(1);
}

// ── the claim shapes ──────────────────────────────────────────────────────────
const NUM = "(-?\\d+(?:\\.\\d+)?)";
const SHAPES = [
  "\\s*=\\s*",
  "\\s*:\\s*",
  // The parenthesised form REQUIRES a space before the bracket: `choreoIntensity` (0.6). Without it
  // the rule matched `duration(M) = duration(1) / M`, which is a FORMULA, not a claim — the exact
  // false positive the narrow-versus-broad decision was meant to avoid, found by running it.
  "\\s+\\(\\s*(?:default\\s+)?",
  // Optional punctuation before the verb: "`referenceCorridorPx`, shipped at 300" slipped past the
  // first version because the comma broke adjacency. Found by surveying what facts still live in
  // more than one document, not by the guard itself — which is the honest way round to say it.
  "[,;]?\\s+(?:shipped default|default|defaults to|stays at|set to|shipped at|shipped|at|to|of|is|was|now)\\s+",
];

// A DATED ROW IS HISTORY AT THE POINT OF USE (stage 2c). A changelog line carries its own date, so a
// reader can see the number is a record rather than a current claim.
const DATED = /\d{4}-\d{2}-\d{2}/;

// ── scan every tracked document ───────────────────────────────────────────────
const tracked = execFileSync("git", ["ls-files", "*.md"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

let scanned = 0;
const claims = [];
const declaredHistorical = [];

for (const f of tracked) {
  if (!isLivingDoc(f) || EXCEPT.has(f)) continue;
  let text;
  try {
    text = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  scanned++;
  const mark = text.match(HISTORICAL_MARK);
  if (mark) {
    declaredHistorical.push({ file: f, date: mark[1], why: mark[2].trim() });
    continue;
  }
  text.split("\n").forEach((line, i) => {
    const clean = line.replace(/[`*_]/g, "");
    for (const [key, { value, from }] of keys) {
      if (!clean.includes(key)) continue;
      for (const shape of SHAPES) {
        const m = clean.match(new RegExp(key + shape + NUM));
        if (!m) continue;
        claims.push({
          file: f,
          line: i + 1,
          key,
          from,
          stated: Number(m[1]),
          source: value,
          dated: DATED.test(clean),
          text: line.trim().slice(0, 120),
        });
        break; // one claim per key per line — do not count the same mention twice
      }
    }
  });
}

if (scanned === 0) {
  console.error(
    "FAIL: scanned ZERO documents. The guard cannot have proved anything. See Lesson 187.",
  );
  process.exit(1);
}

// ── verdict ───────────────────────────────────────────────────────────────────
const current = claims.filter((c) => !c.dated);
const historical = claims.filter((c) => c.dated);

if (INVENTORY) {
  console.log(
    `config-claims INVENTORY: ${claims.length} claim(s) — ${current.length} CURRENT, ${historical.length} on a DATED row.\n`,
  );
  for (const c of claims) {
    console.log(
      `[${c.dated ? "DATED " : "CURRENT"}] ${c.file}:${c.line}  ${c.key} = ${c.stated}` +
        `${c.stated === c.source ? " (matches source)" : ` (source ${c.source})`}\n    ${c.text}`,
    );
  }
  console.log(`\n[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

for (const c of current) {
  fail(
    `${c.file}:${c.line} states a config value: \`${c.key}\` = ${c.stated}` +
      `${c.stated === c.source ? "" : ` (source says ${c.source})`}\n` +
      `      ${c.text}\n` +
      `      One truth lives in one place — ${DEFAULTS_REL}. Delete the number. Either reference the\n` +
      `      defaults where the reader genuinely needs to know the knob exists, or remove the mention;\n` +
      `      prefer removal. If this is a HISTORICAL statement, put its date on the line and it will\n` +
      `      read as history to the guard and to a reader alike.`,
  );
}

console.log(
  `check-config-claims: ${keys.size} keys, ${scanned} living document(s) ` +
    `(${declaredHistorical.length} self-declared HISTORICAL and skipped), ` +
    `${current.length} current claim(s), ${historical.length} dated row(s) allowed. ` +
    `(Stated NUMBERS only — it does not check prose, values stated away from their key, or the ` +
    `${UNSCANNABLE_KEYS.size} keys named in UNSCANNABLE_KEYS.)`,
);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
