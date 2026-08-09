// ============================================================
// File:        scripts/check-fingerprints.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 1
//
// THE THREE CURRENT FINGERPRINTS LIVE IN `docs/fingerprints.json` AND NOWHERE ELSE. This guard
// enforces that, and it is a third of the size of the one it replaces.
//
// WHAT CHANGED AND WHY. ONE-TRUTH-1 made 19 copies machine-WRITTEN and machine-CHECKED — a site
// table, anchors, a `--fix` writer, three directions. The owner's rule replaced the goal: one truth
// lives in one place, other documents REFERENCE it and carry no copy, NOT EVEN A GENERATED ONE.
// With the copies deleted, the anchors, the writer and two of the three directions had nothing left
// to do, and keeping an unused writer "in case" is how tools rot. A generated copy is still a copy:
// it has to be kept in step, and a reader who finds one cannot tell the truth from a stale
// rendering of it.
//
// TWO CHECKS REMAIN, and the first is the direction ONE-TRUTH-1 built and DISCARDED as unsound:
//
//   CONTAINMENT (default, ~1 s) — a current value appearing anywhere outside the record, the
//     declared history homes and the named machine exceptions is a FAILURE.
//     It was unsound then and is sound now, and the reason is the whole argument for this block:
//     it used to have to tell "a stale current claim" from "a correct citation of an old value",
//     which needs the sentence read. It no longer does. Documents may cite old values freely; what
//     they may not do is contain a CURRENT one. That is a lexical fact about four strings.
//
//   MINT (`--mint`, ~2 min) — runs each role's own `reproduce` command and fails if the engine
//     disagrees with the record. This is what catches a record edited without re-minting.
//
// WHY MINT IS NOT THE DEFAULT: the four reproduce commands cost roughly two minutes together,
// dominated by the world fingerprint's ten tracks. Containment is meant to run on every commit;
// minting is a ship-time act. The split is stated so nobody assumes the cheap run proved something
// it did not.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **The default run does NOT verify the record against the engine.** It proves only that no
//     document contradicts the record. If the record itself is wrong, containment passes happily.
//   - It does not look inside `docs/TAGS.md` or `reports/`. Those are history by rule, and a
//     historical value is allowed to be exactly what it was.
//   - It cannot tell whether a document's PROSE about a fingerprint is true, only that the document
//     does not restate the value. "The world fingerprint has not moved since April" would pass.
//   - It says nothing about OLD values. A document may cite any superseded value anywhere. That is
//     deliberate: ablation targets and lineage narrative are correct, useful claims.
//   - It does not check any other number in any document — band reach, race counts, dates.
//
// LOUD-FAILURE RULE (Lesson 187): zero roles, an unreadable record, or a scan that reached zero
// files all FAIL. A guard that passes because it found nothing to check is a no-op.
//
// Usage:
//   node scripts/check-fingerprints.mjs           # containment; exit 1 if a copy exists anywhere
//   node scripts/check-fingerprints.mjs --mint    # ALSO re-mint every role and compare
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "fingerprint-containment",
  covers: "a current fingerprint value copied anywhere outside its one home",
  blind: [
    "whether the RECORD is right — it never runs the engine; pass --mint for that",
    "superseded values, which living docs legitimately quote as history",
  ],
  dirs: [],
  files: [],
  everything: true,
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_PATH = argOf("record") ?? join(ROOT, "docs", "fingerprints.json");
const MINT = process.argv.includes("--mint");

let failures = 0;
function fail(msg) {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
}

// ── the record ────────────────────────────────────────────────────────────────────────────────
let record;
try {
  record = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
} catch (e) {
  console.error(`FAIL: cannot read the fingerprint record — ${e.message}`);
  console.error(
    "That file IS the single home. Without it there is nothing to check against.",
  );
  process.exit(1);
}

const roles = record.roles ?? {};
const historyHomes = record.historyHomes ?? [];
const exceptions = record.machineExceptions ?? [];

if (Object.keys(roles).length === 0) {
  console.error(
    "FAIL: the record declares ZERO roles. A guard with nothing to check is a no-op.",
  );
  process.exit(1);
}
for (const [name, r] of Object.entries(roles)) {
  if (!/^[0-9a-f]{16}$/.test(r.value ?? ""))
    fail(`role "${name}" has no 16-hex value.`);
  if (!r.reproduce)
    fail(`role "${name}" does not name the command that reproduces it.`);
  if (!r.mintedOn)
    fail(`role "${name}" does not name the commit it was minted on.`);
  if (!r.date) fail(`role "${name}" does not carry the date it was minted.`);
}

// ── CONTAINMENT ───────────────────────────────────────────────────────────────────────────────
const values = new Map(Object.entries(roles).map(([n, r]) => [r.value, n]));
const recordRel = RECORD_PATH.replace(/\\/g, "/")
  .split("/")
  .slice(-2)
  .join("/");

const isHistory = (f) =>
  historyHomes.some((h) => (h.endsWith("/") ? f.startsWith(h) : f === h));
const isException = (f) => exceptions.some((e) => e.file === f);

let scanned = 0;
const copies = [];
const tracked = execFileSync("git", ["ls-files"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

for (const f of tracked) {
  if (f === recordRel || isHistory(f) || isException(f)) continue;
  let text;
  try {
    text = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue; // unreadable or binary — a fingerprint is ASCII, so nothing is lost
  }
  scanned++;
  for (const [value, role] of values)
    if (text.includes(value)) copies.push({ file: f, role, value });
}

// Loud failure: a scan that reached nothing must not read as a clean pass.
if (scanned === 0) {
  console.error(
    "FAIL: scanned ZERO files. The guard cannot have proved anything. See Lesson 187.",
  );
  process.exit(1);
}

for (const c of copies)
  fail(
    `${c.file} contains the CURRENT ${c.role} fingerprint.\n` +
      `      One truth lives in one place. Delete the value, and either reference ${recordRel} or\n` +
      `      say nothing — a reference the reader never follows is clutter. If something READS this\n` +
      `      string, add it to "machineExceptions" BY NAME, with its reason.`,
  );

// ── MINT ──────────────────────────────────────────────────────────────────────────────────────
let minted = 0;
if (MINT) {
  for (const [name, r] of Object.entries(roles)) {
    let out;
    try {
      out = execSync(r.reproduce, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch (e) {
      fail(
        `role "${name}": its reproduce command FAILED — ${r.reproduce}\n      ${e.message}`,
      );
      continue;
    }
    // The world script prints `COMBINED <hash>` and then a per-track row for each of ten tracks, so
    // "the last hash in the output" would be a track, not the answer. Prefer the COMBINED line;
    // fall back to the first token, which is what --quiet prints on its own.
    const combined = out.match(/^COMBINED\s+([0-9a-f]{16})/m);
    const first = (out.match(/\b[0-9a-f]{16}\b/) ?? [])[0];
    const got = combined ? combined[1] : first;
    minted++;
    if (!got) {
      fail(`role "${name}": its reproduce command printed no 16-hex value.`);
    } else if (got !== r.value) {
      fail(
        `role "${name}": the ENGINE says ${got}, the record says ${r.value}.\n` +
          `      The record was edited without re-minting, or the behaviour moved. Fix whichever is\n` +
          `      wrong — but the engine is not a document, so it is usually the record.`,
      );
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────────────────────────
console.log(
  `check-fingerprints: ${Object.keys(roles).length} roles, ${scanned} tracked files scanned, ` +
    `${copies.length} stray copies` +
    (MINT
      ? `, ${minted} role(s) re-minted against the engine.`
      : `. (Record NOT verified against the engine — pass --mint for that.)`),
);
if (failures === 0) console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
