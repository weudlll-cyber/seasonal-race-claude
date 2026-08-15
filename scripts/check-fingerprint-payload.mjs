// ============================================================
// File:        scripts/check-fingerprint-payload.mjs
// Project:     RaceArena — FP-PAYLOAD-1
//
// THE HASHED ROW MAY NOT USE SHORTHAND PROPERTY SYNTAX.
//
// ── THE DEFECT IT EXISTS FOR, and it is not hypothetical ────────────────────────────────────────
// `scripts/fingerprint-default.mjs` hashes the rawData rows INCLUDING THEIR KEY NAMES, and those
// rows are built at exactly one place: the `rawData.push({ ... })` call in `scripts/sim-fairness.mjs`.
// While one property there was SHORTHAND, a documentation pass renamed the local variable from
// `sollRank` to `targetRank` — and shorthand syntax renamed the EMITTED COLUMN with it. Nothing in
// the race changed. But `fairness-stats.mjs` reads `r.sollRank`, got `undefined`,
// `bandIndexOfRank(undefined)` returns a constant, and EVERY START ROW'S BAND HIT RATE FELL TO
// 0.000. The world fingerprint moved for a race that was byte-identical.
//
// Under shorthand, the emitted schema is a SIDE EFFECT of local variable naming. Under explicit
// `key: value`, renaming the variable is a local edit and the column is what somebody wrote down.
// The whole guard is that one sentence, mechanised.
//
// ── WHY IT PARSES INSTEAD OF MATCHING TEXT ──────────────────────────────────────────────────────
// A regex over the source is a PARTIAL guard that looks exactly like a complete one, and this
// repository has paid for that before. Shorthand is a syntactic property of a Property node —
// `{ a }` versus `{ a: a }` versus `{ [k]: v }` versus `{ a() {} }` — and nothing short of a parser
// can tell those apart across line breaks, comments, nested objects and template literals. It uses
// acorn, the same tokenizer `scripts/lib/inertChange.mjs` already uses for the world fingerprint's
// inert-change comparison, resolved through that module's own `acorn()` so there is one home for
// where the parser comes from.
//
// ── WHAT IT ANCHORS ON, and why not on a name ───────────────────────────────────────────────────
// The anchor is the CALL SITE `rawData.push(...)`, not any variable, key or comment. The defect
// this guard exists for WAS a rename, so anchoring on a name would have been anchoring on the thing
// that moves. If the payload is ever built somewhere else, or `rawData` is renamed, the anchor
// disappears — and that is a FAILURE (below), not a pass.
//
// ── LOUD-FAILURE RULE (Lesson 187) ──────────────────────────────────────────────────────────────
// Every one of these FAILS rather than passing quietly, because a guard that checks nothing is
// worse than no guard:
//   - the payload file is missing or unreadable
//   - it does not parse
//   - ZERO `rawData.push(...)` call sites are found (the anchor is gone)
//   - a call site's first argument is not an object literal (the payload moved behind a variable,
//     where this guard cannot see its keys)
//   - acorn cannot be resolved at all — it cannot parse, so it cannot have an opinion
//
// ── WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later ────────────────
//   - **SPREAD elements.** `...r` splices a racer object's keys into the hashed row, and `...(FLAG
//     ? {...} : {})` splices a traced field. Those keys are decided somewhere else entirely and
//     this guard is silent about them. It is the same exposure through a different door — a rename
//     in the spread SOURCE renames a hashed column — and it is deliberately out of scope. Run
//     `--spread-report` for the inventory and the count.
//   - Whether the key NAMES are right. `sollRank: wrongVariable` passes. This guards the SCHEMA
//     against accidental renaming, not the values against being wrong.
//   - Any other object in the file, or any other file. One payload, one call site.
//   - The ORDER of the keys, which the hash also depends on. Reordering is a visible, deliberate
//     edit; renaming was the invisible one.
//
// Usage:
//   node scripts/check-fingerprint-payload.mjs                 # the guard
//   node scripts/check-fingerprint-payload.mjs --inventory     # every property and its syntax, exit 0
//   node scripts/check-fingerprint-payload.mjs --spread-report # what the spreads contribute, exit 0
//   node scripts/check-fingerprint-payload.mjs --file=<path>   # check a fixture (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-fingerprint-payload",
  covers:
    "a shorthand property in the object literal whose keys become the world fingerprint's hashed columns, where renaming a local variable silently renames an emitted column",
  blind: [
    "a spread of an object LITERAL, which is ALLOWED — its keys are written at the call site, so a rename of them is a visible edit to this file (the `...(FLAG ? {…} : {})` trace field). A spread of anything else is now REFUSED rather than merely reported (FP-SPREAD-1)",
    "whether the key names are RIGHT — `sollRank: somethingElse` passes; this is a schema guard, not a value guard",
    "the ORDER of the keys, which the hash also depends on — reordering is a visible edit, renaming was the invisible one",
    "every other object literal in the repository; it checks one call site",
  ],
  files: ["scripts/sim-fairness.mjs"],
  dirs: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { acorn } from "./lib/inertChange.mjs";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAYLOAD_FILE = argOf("file") ?? "scripts/sim-fairness.mjs";
const INVENTORY = process.argv.includes("--inventory");
const SPREAD_REPORT = process.argv.includes("--spread-report");

/** The one call site whose object literal becomes the hashed row. */
const ANCHOR_OBJECT = "rawData";
const ANCHOR_METHOD = "push";
const ANCHOR = `${ANCHOR_OBJECT}.${ANCHOR_METHOD}(...)`;

const NL = String.fromCharCode(10);
const die = (msg) => {
  console.error(`FAIL: ${msg}`);
  console.error(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(1);
};

const A = acorn();
if (!A)
  die(
    `acorn could not be resolved, so this guard cannot parse and therefore cannot have an ` +
      `opinion.${NL}      It is looked for in the ROOT tree first and the client tree second ` +
      `(scripts/lib/inertChange.mjs).${NL}      Install it at the root: npm ci — or, in a bare ` +
      `environment: npm install --no-save acorn.${NL}      This is a FAILURE and not a skip on ` +
      `purpose: a guard that cannot check is not a guard that passes.`,
  );

const abs = join(ROOT, PAYLOAD_FILE);
let src;
try {
  src = readFileSync(abs, "utf8");
} catch (e) {
  die(`cannot read the payload file ${PAYLOAD_FILE} — ${e.message}`);
}

let ast;
try {
  ast = A.parse(src, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  });
} catch (e) {
  die(`${PAYLOAD_FILE} does not parse — ${e.message}`);
}

/** Depth-first walk over every node in the tree, without pulling in acorn-walk. */
function* nodes(node) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) yield* nodes(n);
    return;
  }
  if (typeof node.type !== "string") return;
  yield node;
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "loc" || key === "start" || key === "end") continue;
    yield* nodes(node[key]);
  }
}

/**
 * Are the key names this spread contributes WRITTEN AT THIS CALL SITE?
 *
 * Object literal          → yes, the keys are right here.
 * `cond ? {…} : {…}`      → yes, both branches are literals (the --b2-trace field's shape).
 * anything else (`...r`)  → no; the names come from wherever that value was built.
 */
function spreadKeysAreVisible(node) {
  if (!node) return false;
  if (node.type === "ObjectExpression") return true;
  if (node.type === "ConditionalExpression")
    return spreadKeysAreVisible(node.consequent) && spreadKeysAreVisible(node.alternate);
  return false;
}

const isAnchorCall = (n) =>
  n.type === "CallExpression" &&
  n.callee?.type === "MemberExpression" &&
  n.callee.computed === false &&
  n.callee.object?.type === "Identifier" &&
  n.callee.object.name === ANCHOR_OBJECT &&
  n.callee.property?.type === "Identifier" &&
  n.callee.property.name === ANCHOR_METHOD;

const calls = [...nodes(ast)].filter(isAnchorCall);

// THE ANCHOR IS GONE — the single loudest failure this guard has. Everything below assumes the
// payload is built where it has always been built.
if (calls.length === 0)
  die(
    `no ${ANCHOR} call site found in ${PAYLOAD_FILE}.${NL}` +
      `      This guard anchors on that call, not on any variable or key name — the defect it ` +
      `exists for WAS a rename.${NL}` +
      `      Either the payload moved, or \`${ANCHOR_OBJECT}\` was renamed. Re-point the anchor ` +
      `deliberately; do not delete the guard.${NL}` +
      `      A guard that silently checks nothing is worse than no guard (Lesson 187).`,
  );

const properties = [];
const spreads = [];
let failures = 0;

for (const call of calls) {
  const arg = call.arguments[0];
  const at = `${PAYLOAD_FILE}:${call.loc.start.line}`;

  if (!arg)
    die(`${at}: ${ANCHOR} is called with no argument — there is no payload to check.`);

  // The payload must be a LITERAL here. Behind a variable its keys are decided elsewhere and this
  // guard would pass while seeing nothing, which is the failure mode it is built against.
  if (arg.type !== "ObjectExpression")
    die(
      `${at}: the argument to ${ANCHOR} is a ${arg.type}, not an object literal.${NL}` +
        `      This guard reads the literal's properties; behind a variable it can see none of ` +
        `them and would pass while checking nothing.${NL}` +
        `      Build the hashed row inline, or re-point this guard at wherever it is now built.`,
    );

  for (const p of arg.properties) {
    if (p.type === "SpreadElement") {
      const text = src.slice(p.start, p.end).split(NL)[0].trim();
      spreads.push({ line: p.loc.start.line, text });
      // ── FP-SPREAD-1: A SPREAD WHOSE KEYS ARE NOT VISIBLE HERE IS REFUSED ────────────────────
      //
      // This started as a declared BLIND SPOT and is now a rule, because it was the same defect
      // as the shorthand keys through the other door: `...r` spliced six of the sixteen hashed
      // columns out of a racer object, so their names were that object's field names and a rename
      // THERE renamed a hashed column silently.
      //
      // The distinction is whether the KEY NAMES ARE WRITTEN AT THIS CALL SITE. Spreading an
      // object LITERAL is fine — `...(FLAG ? { b2LastInside: x } : {})` names its key right here,
      // and a rename of it is a visible edit to this file. Spreading an IDENTIFIER is not: the
      // names come from wherever that value was built.
      if (!spreadKeysAreVisible(p.argument)) {
        failures++;
        console.error(
          `FAIL: ${PAYLOAD_FILE}:${p.loc.start.line}: \`${text}\` spreads a value whose KEYS ARE ` +
            `NOT NAMED HERE.${NL}` +
            `      The world fingerprint hashes these rows INCLUDING their key names, so a rename ` +
            `in whatever builds${NL}      that value renames an emitted COLUMN — silently, for a ` +
            `race that did not change.${NL}` +
            `      Write the keys out explicitly at this call site. Spreading an object LITERAL is ` +
            `still allowed:${NL}      its keys are written here and a rename of them is a visible ` +
            `edit to this file.`,
        );
      }
      continue;
    }
    const name =
      p.key?.type === "Identifier"
        ? p.key.name
        : p.key?.type === "Literal"
          ? String(p.key.value)
          : "<computed>";
    properties.push({ name, line: p.loc.start.line, shorthand: p.shorthand === true });
    if (p.shorthand === true) {
      failures++;
      console.error(
        `FAIL: ${PAYLOAD_FILE}:${p.loc.start.line}: \`${name}\` uses SHORTHAND property syntax in ` +
          `the hashed row.${NL}` +
          `      The world fingerprint hashes these rows INCLUDING their key names, so renaming ` +
          `the local variable${NL}` +
          `      \`${name}\` would rename the emitted COLUMN with it — silently, for a race that ` +
          `did not change.${NL}` +
          `      Write it explicitly: \`${name}: ${name},\``,
      );
    }
  }
}

if (INVENTORY) {
  console.log(
    `check-fingerprint-payload --inventory: ${properties.length} named propert(ies) at ` +
      `${calls.length} ${ANCHOR} call site(s) in ${PAYLOAD_FILE}`,
  );
  for (const p of properties)
    console.log(`  ${String(p.line).padStart(6)}  ${p.shorthand ? "SHORTHAND" : "explicit "}  ${p.name}`);
  for (const s of spreads) console.log(`  ${String(s.line).padStart(6)}  SPREAD     ${s.text}`);
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

if (SPREAD_REPORT) {
  console.log(
    `check-fingerprint-payload --spread-report: ${spreads.length} spread element(s) in the hashed ` +
      `row. Their keys are decided elsewhere and this guard is BLIND to them — see GUARD.blind.`,
  );
  for (const s of spreads) console.log(`  ${PAYLOAD_FILE}:${s.line}  ${s.text}`);
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

console.log(
  `check-fingerprint-payload: ${calls.length} ${ANCHOR} call site(s), ${properties.length} named ` +
    `propert(ies), ${failures} using shorthand. ` +
    `(BLIND to ${spreads.length} spread element(s), whose keys come from elsewhere — --spread-report ` +
    `lists them; and to whether the names are RIGHT.)`,
);

// EVERY SPREAD IS PRINTED, ALWAYS. A hole the guard knows about and does not mention is
// indistinguishable from one it does not know about — the same reason `verify` prints its skips as
// loudly as its runs.
for (const s of spreads)
  console.log(`  blind at ${PAYLOAD_FILE}:${s.line} — ${s.text}`);

console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
