// ============================================================
// File:        scripts/check-conflict-markers.mjs
// Project:     RaceArena — HOOK-CONFLICT-MARKERS-1 (2026-10-04)
//
// A MERGE CONFLICT THAT IS COMMITTED UNRESOLVED IS INVISIBLE TO EVERY OTHER GUARD. On 2026-10-03 a
// merge commit carried `<<<<<<<` / `>>>>>>>` lines in two documents — the script meant to resolve
// them had failed on a Windows path — and the hook printed `GUARDS: PASS 9   FAIL 0`. It was caught
// by reading the files and amended before the push. This guard makes that a refusal instead.
//
// ── WHAT IT REFUSES ─────────────────────────────────────────────────────────────────────────────
//
// A line that is a conflict marker, the three shapes git writes:
//   · seven `<` at the start of a line, then a space or the end of the line   (ours begins)
//   · exactly seven `=` and nothing else on the line                          (the divider)
//   · seven `>` at the start of a line, then a space or the end of the line   (theirs ends)
// Eight or more of a character, the characters in the middle of a line, or a marker inside
// backticks are not markers and are left alone — so a document that MENTIONS a marker is fine.
//
// ── WHICH FILES ─────────────────────────────────────────────────────────────────────────────────
//
// `--staged` (the pre-commit hook): the STAGED content of every staged file — the blob the commit
// would record, read with `git show :<path>`, never the working tree. Without it (`verify`): every
// tracked file in the working tree. Binary content (a NUL byte) is skipped in both.
//
// ★ NO FILE IS EXCLUDED, and that is checked rather than assumed: on 2026-10-04 no tracked file
// contained a marker-shaped line. The only two that would have to — this guard and its test — build
// the markers at run time (`"<".repeat(7)`), so they contain none. A Markdown setext heading
// (`=======` under a line) is the one legitimate shape that would be refused; this repository writes
// `#` headings, and the refusal names the line so the fix is a one-line change.
//
// LOUD-FAILURE RULE (Lesson 187): in full mode, zero tracked files to scan FAILS — a guard that
// passes because it read nothing is a no-op. In `--staged` mode zero staged files is an ordinary
// empty commit and passes.
//
// Usage:
//   node scripts/check-conflict-markers.mjs --staged     # the pre-commit hook
//   node scripts/check-conflict-markers.mjs              # verify: every tracked file
//   node scripts/check-conflict-markers.mjs --root=<dir> # another repository (its tests)
//   node scripts/check-conflict-markers.mjs --declare
// ============================================================

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
export const GUARD = {
  id: "check-conflict-markers",
  covers:
    "a conflict-marker line (seven `<` or `>` at a line start followed by a space or nothing, or a line of exactly seven `=`) in a tracked file, or in the staged content with --staged",
  blind: [
    "a conflict that was resolved WRONGLY — it sees markers, not whether the merged text is right",
    "binary files (content with a NUL byte), which it skips",
    "a commit made with --no-verify: the hook never runs, and only verify's full scan would see it",
  ],
  dirs: [],
  files: [],
  everything: true,
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const MARK = (ch) => ch.repeat(7);
// Built at run time so that this file holds no marker-shaped line itself.
const MARKER_LINE = new RegExp(
  `^(?:${MARK("<")}(?: |$)|${MARK("=")}$|${MARK(">")}(?: |$))`,
);

/** The 1-based numbers of every marker line in `text`, with the line. */
export function markerLines(text) {
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (MARKER_LINE.test(line)) out.push({ line: i + 1, text: line });
  }
  return out;
}

const ROOT_ARG = process.argv
  .find((a) => a.startsWith("--root="))
  ?.slice("--root=".length);
const ROOT = ROOT_ARG ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGED = process.argv.includes("--staged");
const git = (args, opts = {}) =>
  execFileSync("git", args, {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
    ...opts,
  });

const paths = (
  STAGED
    ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
    : git(["ls-files", "-z"])
)
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

if (!STAGED && paths.length === 0) {
  console.error(
    "check-conflict-markers: no tracked files to scan — refusing to report a pass on nothing.",
  );
  process.exit(1);
}

const found = [];
let scanned = 0;
for (const p of paths) {
  let buf;
  if (STAGED) {
    buf = git(["show", `:${p}`]); // the blob the commit would record
  } else {
    try {
      buf = readFileSync(join(ROOT, p));
    } catch {
      continue; // tracked but absent from the working tree: deleted and not yet staged
    }
  }
  if (buf.includes(0)) continue; // binary
  scanned++;
  for (const m of markerLines(buf.toString("utf8")))
    found.push({ path: p, ...m });
}

if (found.length) {
  console.error(
    `check-conflict-markers: ${found.length} conflict-marker line(s) ${STAGED ? "in the staged content" : "in tracked files"}:`,
  );
  for (const f of found)
    console.error(`  ${f.path}:${f.line}  ${f.text.slice(0, 60)}`);
  console.error(
    "  Resolve the conflict (or remove the stray line), then stage the file again.",
  );
  process.exit(1);
}
console.log(
  `check-conflict-markers: ${scanned} ${STAGED ? "staged" : "tracked"} file(s) scanned, no conflict markers.`,
);
