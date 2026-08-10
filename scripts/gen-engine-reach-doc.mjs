// ============================================================
// File:        scripts/gen-engine-reach-doc.mjs
// Project:     RaceArena — ONE-TRUTH-1 stage 5
//
// GENERATES THE ENGINE-REACH FILE LIST IN SIM.md, so the list of files that can change the race is
// never typed by a person.
//
// WHY: the closure is already computed — `scripts/engine-reach.mjs` walks `raceCore.js`'s imports
// and is what the mint tripwire and `verify` both route on. But no DOCUMENT listed it, so a reader
// asking "which files can move the world fingerprint?" had to run a script or guess. A hand-typed
// copy would have been the eleventh fingerprint problem: correct on the day it was written and
// wrong the first time an import changed.
//
// WHERE THE ONE-LINE PURPOSES COME FROM — the FILES THEMSELVES, never this script. Three header
// styles exist in this repository and all three are read:
//   `// Description: ...`              the house header block
//   `// name.js — ...`                 the summary on the filename line
//   `// Project: RaceArena — ...`      raceCore.js, the closure's root, states itself only here
// In each case the comment PARAGRAPH is joined and its FIRST SENTENCE taken — taking one line
// yielded fragments that stopped mid-clause ("lane-free avoidance and").
//
// A file whose header states no purpose is listed as **UNKNOWN**, verbatim and deliberately. That
// is a true statement about the repository, and it is more useful than a plausible sentence written
// by whoever generated the table: the fix is to give the FILE a header, and then this list improves
// by itself. Do not "fill in" an UNKNOWN here.
//
// WHAT THIS DOES **NOT** DO:
//   - It does not judge whether the closure is RIGHT. `scripts/engine-reach.mjs` owns that, has its
//     own test, and is never modified by this block.
//   - It does not describe what a file does BEYOND its own header's first line. A one-line summary
//     of a 900-line module is a signpost, not documentation.
//   - It does not sort by importance. Alphabetical, the same order the closure prints.
//
// Usage:
//   node scripts/gen-engine-reach-doc.mjs           # rewrite the block in docs/SIM.md
//   node scripts/gen-engine-reach-doc.mjs --dry     # print it, write nothing
//   node scripts/gen-engine-reach-doc.mjs --check   # exit 1 if the block is missing or out of date
//   node scripts/gen-engine-reach-doc.mjs --doc=<p> # act on a COPY instead (used by its test)
//
// `--doc=` exists for ONE reason, and it is the same one `check-measured-stamps.mjs` records: this
// file's own test used to SABOTAGE the tracked `docs/SIM.md` and restore it in a `finally`. That is
// safe alone and unsafe here. `npm run verify` runs the doc guards and the script suite
// CONCURRENTLY, and on Windows `check-fingerprints.mjs` holding SIM.md open makes the test's write
// fail outright (`UNKNOWN: -4094`) — measured at 1 run in 8 under load. Worse than the flake: if the
// process dies between the sabotage and the `finally`, the TRACKED file is left corrupted. The test
// now copies the document and points here instead; nothing tracked is ever written by a test.
// ============================================================

// ── DOC-AUDIT-2 B: THE ROUTING MISS THIS DECLARATION CLOSES ──────────────────────────────────────
//
// This block is invalidated by a change to `client/src/`, and until now nothing routed on that. The
// guard for it was this file's own test, which lives in the SCRIPT SUITE, and the script suite is
// selected by changes under `scripts/`. So `CONFIG-DIFF-2` — which changed only `client/src/` and
// added a file to the closure — was correctly not selected locally, verify passed, and CI found the
// stale block minutes later. Master was red for a routing gap, not for a mistake.
//
// The fix belongs where routing now lives: the guard says what it depends on. `reach` names
// `raceCore.js`, and `resolveGuard` expands a reach entry to its whole import closure — which IS the
// hull, i.e. exactly the set of files whose change can move this block. It cannot fall out of step
// with the hull because it IS the hull, computed by the same function the block is generated from.
//
// `scripts/lib/routing.mjs` had to learn to DISCOVER this file (its scan matched `check-*`,
// `*-fingerprint` and `fingerprint-default` only), and `verify.mjs` supplies the `--check` argv —
// running this script with no arguments REWRITES the document, which is not a thing a verify run
// may do.
export const GUARD = {
  id: "engine-reach-doc",
  covers:
    "the generated engine-reach block in docs/SIM.md going stale — a file entering or leaving raceCore.js's import closure, or a listed file's header purpose changing",
  blind: [
    "whether the closure is RIGHT — scripts/engine-reach.mjs owns that and has its own test",
    "a listed file whose header states no purpose: it is reported as UNKNOWN, which is a true statement about the repository and not a failure",
    "every other generated block in every other document",
  ],
  dirs: [],
  files: ["docs/SIM.md"],
  reach: ["client/src/modules/raceCore.js"],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync } from "node:fs";
import { writeVerified } from "./lib/write-verified.mjs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { engineReach } from "./engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC_OVERRIDE = process.argv
  .filter((a) => a.startsWith("--doc="))
  .map((a) => a.slice("--doc=".length));
const SIM = DOC_OVERRIDE.length
  ? resolve(DOC_OVERRIDE[0])
  : join(ROOT, "docs", "SIM.md");
// What the messages call it. Under `--doc=` they must not claim to be talking about the real file.
const SIM_LABEL = DOC_OVERRIDE.length ? SIM : "docs/SIM.md";
const BEGIN =
  "<!-- BEGIN GENERATED: engine reach — gen-engine-reach-doc.mjs -->";
const END = "<!-- END GENERATED: engine reach -->";

const DRY = process.argv.includes("--dry");
const CHECK = process.argv.includes("--check");

/**
 * FIRST SENTENCE, not first LINE. The house header wraps a description across several `//` lines,
 * so taking one line yields fragments that stop mid-clause ("lane-free avoidance and"). Continuation
 * lines are joined and the first sentence is taken, which is what a one-line summary should be.
 */
function firstSentence(text) {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/\.(\s|$)/);
  const s = stop === -1 ? t : t.slice(0, stop + 1);
  return s.length > 180 ? s.slice(0, 177).trimEnd() + "…" : s;
}

/**
 * The file's own account of itself, or null if it does not give one. THREE header styles exist in
 * this repository and all three are read here; none of them is invented by this script.
 */
export function purposeOf(source) {
  const lines = source.split("\n").slice(0, 30);

  /** Join the comment paragraph starting at `i`, then take its first sentence. */
  const paragraph = (i, head) => {
    const parts = [head];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (!/^\/\//.test(l)) break; // out of the comment block
      const body = l.replace(/^\/\/\s?/, "");
      if (!body.trim()) break; // blank comment line ends the paragraph
      if (/^={5,}/.test(body.trim())) break; // the header's divider rule
      if (/^[A-Z][A-Za-z]*:\s/.test(body.trim())) break; // a new header FIELD
      parts.push(body.trim());
    }
    return firstSentence(parts.join(" "));
  };

  // THREE HEADER STYLES exist in this repository, in the order they are tried. All three read the
  // FILE; none of them is invented here.

  // Style 1 — the house header block: `// Description: ...` wrapping onto continuation lines.
  const d = lines.findIndex((l) => /^\/\/\s*Description:/.test(l));
  if (d !== -1) {
    const text = paragraph(d, lines[d].replace(/^\/\/\s*Description:\s*/, ""));
    if (text) return text;
  }

  // Style 2 — the summary sits on the filename line: `// name.js — what it is.`
  const f = lines.findIndex((l) => /^\/\/\s*\S+\.js\s+[—-]\s+\S/.test(l));
  if (f !== -1) {
    const text = paragraph(
      f,
      lines[f].match(/^\/\/\s*\S+\.js\s+[—-]\s+(.+)$/)[1],
    );
    if (text) return text;
  }

  // Style 3 — the summary rides on the Project line: `// Project: RaceArena — what it is.`
  // raceCore.js, the ROOT of the whole closure, states itself only here; without this style the
  // most important file in the table would read UNKNOWN while its header plainly says what it is.
  const p = lines.findIndex((l) =>
    /^\/\/\s*Project:\s*RaceArena\s*[—-]\s*\S/.test(l),
  );
  if (p !== -1) {
    const text = paragraph(
      p,
      lines[p].match(/^\/\/\s*Project:\s*RaceArena\s*[—-]\s*(.+)$/)[1],
    );
    if (text) return text;
  }

  return null;
}

// IMPORTING THIS FILE MUST NOT WRITE ANYTHING. Its own test imports `purposeOf`, and until this
// guard existed that import ran the generator and rewrote docs/SIM.md as a side effect — a module
// that edits a document merely by being read is a trap for every future caller.
const RUN_DIRECTLY =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) main();

function main() {
  const rows = engineReach().files.map((f) => {
    let purpose = null;
    try {
      purpose = purposeOf(readFileSync(join(ROOT, f), "utf8"));
    } catch {
      purpose = null;
    }
    return { file: f, purpose };
  });

  const unknown = rows.filter((r) => !r.purpose).length;

  const block = [
    BEGIN,
    "",
    `**This list is GENERATED, never typed** — \`node scripts/gen-engine-reach-doc.mjs\` reads the`,
    "closure from `scripts/engine-reach.mjs` and each purpose from the FILE'S OWN header. These are the",
    `**${rows.length} files that can change the race**: touch one and the world fingerprint is owed, which`,
    "is exactly what the pre-commit tripwire and `npm run verify` route on.",
    "",
    "A file whose header states no purpose is listed as **UNKNOWN**. That is a true statement about the",
    "repository rather than a guess — give the FILE a header line and this table improves by itself.",
    "",
    "| File | What it is, in its own words |",
    "|---|---|",
    ...rows.map(
      (r) =>
        `| \`${r.file.replace("client/src/", "")}\` | ${r.purpose ? r.purpose.replace(/\|/g, "\\|") : "**UNKNOWN** — the file's header states no purpose"} |`,
    ),
    "",
    `${rows.length} files, ${unknown} of them UNKNOWN.`,
    "",
    END,
  ].join("\n");

  const text = readFileSync(SIM, "utf8");
  const b = text.indexOf(BEGIN);
  const e = text.indexOf(END);

  if (DRY) {
    console.log(block);
    console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
    process.exit(0);
  }

  if (b === -1 || e === -1) {
    console.error(
      `FAIL: ${SIM_LABEL} has no generated engine-reach block. Add the two markers:\n` +
        `  ${BEGIN}\n  ${END}`,
    );
    process.exit(1);
  }

  const current = text.slice(b, e + END.length);

  // PRETTIER OWNS THE FORMATTING, this script owns the CONTENT. The repo formats markdown on every
  // commit, and prettier pads table columns to align them — so a byte comparison here reported the
  // formatter's own output as drift the moment the block was first written. `--check` therefore
  // compares content with whitespace normalised. It still fails on a changed closure, a changed
  // purpose, a changed count, or a hand-edited row; it does not fail on alignment.
  // Prettier pads columns AND expands the `|---|---|` separator into a rule of matched dashes, so
  // both have to be normalised away. A separator row carries no content at all — it is collapsed to
  // its cell count.
  const normalize = (s) =>
    s
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .map((l) =>
        /^\|[\s|:-]*\|$/.test(l)
          ? l.replace(/\s+/g, "").replace(/-{2,}/g, "-")
          : l,
      )
      .join("\n")
      .trim();

  if (CHECK) {
    if (normalize(current) !== normalize(block)) {
      console.error(
        `FAIL: the engine-reach block in ${SIM_LABEL} is OUT OF DATE.\n` +
          "      The closure or a file's header changed and the document did not follow.\n" +
          "      Run: node scripts/gen-engine-reach-doc.mjs",
      );
      process.exit(1);
    }
    console.log(
      `gen-engine-reach-doc --check: block is current (${rows.length} files, ${unknown} UNKNOWN).`,
    );
    console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
    process.exit(0);
  }

  // Nothing to say → write nothing. Otherwise every run would strip prettier's alignment back out
  // and leave a diff that means nothing, which is how a generator becomes noise people ignore.
  if (normalize(current) === normalize(block)) {
    console.log(
      `gen-engine-reach-doc: ${SIM_LABEL} is already current (${rows.length} files, ${unknown} UNKNOWN). Nothing written.`,
    );
    console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
    return;
  }

  // VERIFIED, not assumed (ONE-TRUTH-2 stage 6). See scripts/lib/write-verified.mjs.
  writeVerified(
    SIM,
    text.slice(0, b) + block + text.slice(e + END.length),
    `the engine-reach block in ${SIM_LABEL}`,
  );
  console.log(
    `gen-engine-reach-doc: wrote ${rows.length} files into ${SIM_LABEL}, ${unknown} with no stated purpose.`,
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
}
