#!/usr/bin/env node
// ============================================================
// File:        scripts/prove-changed.mjs
// Project:     RaceArena — CLEAN-STATE-1 stage 2
//
// A COMMAND THAT WAS SUPPOSED TO EDIT A FILE MUST PROVE THE FILE MOVED.
//
// THE INCIDENT THIS EXISTS FOR, and it happened ONE COMMIT after the fix that was meant to end it.
// `scripts/lib/write-verified.mjs` (ONE-TRUTH-2 stage 6) made every write in `scripts/` prove it
// landed. The very next commit, `7e6a8446`, records the same failure again: a throwaway **Python**
// helper applied edits to a report, hit a Python `assert`, aborted BEFORE its write — and the shell
// had chained the commit with `;` instead of `&&`, so the commit went ahead and claimed edits that
// were never on disk.
//
// WHY THE EXISTING FIX COULD NOT CATCH IT. `writeVerified` is a function you must IMPORT. The class
// of helper that causes this failure is precisely the class that imports nothing: written in one
// breath, in whatever language was at hand, run once, thrown away. "Nobody counts it as a script" is
// the whole problem — a library cannot reach code that was never going to call it.
//
// THE MECHANISM CHOSEN, and the two it was chosen over.
//   - **A wrapper around the COMMAND, not inside it** (this file). Language-agnostic: it works for
//     Python, node, sed, a shell one-liner, anything with an exit status. The helper needs to know
//     nothing about this repository.
//   - _Rejected: a second `writeVerified` for Python._ Same defect as the first — it only helps code
//     that opts in, and the code that causes this never opts in.
//   - _Rejected: a written rule ("never `assert` before a write that matters")._ That rule already
//     existed, in the header of `write-verified.mjs`, when the incident happened. A sentence that
//     was already written and already broken is not a mechanism.
//
// IT CHECKS BOTH HALVES OF THE INCIDENT, which is why it is not just an exit-code check:
//   1. **The command died.** Non-zero exit → fail, naming the paths that therefore may not exist.
//      This alone would have caught the Python assert, and the `;` chaining cannot hide it because
//      this process exits non-zero too.
//   2. **The command lived and did nothing.** Exit 0 with every named path's TEXT identical to
//      before → fail. This is the half an exit code can never see: a helper whose edit silently
//      matched nothing still exits 0 and still reports success.
//
// THE LINE-ENDING TRAP, and it is here because sabotaging this file found it — the first version
// compared raw bytes only, and the silent-no-op sabotage PASSED. A Python helper of the incident's
// own shape (`open(p).read()` → `replace` → `open(p,"w").write()`) rewrites every newline as CRLF on
// Windows: measured on a real 37,305-byte report, 371 LF became 371 CRLF and the file grew 371
// bytes while its TEXT did not change by one character. Byte identity therefore CANNOT prove an
// edit landed — the commonest ad-hoc helper shape defeats it on every run. So the verdict is taken
// on the text with newlines folded, and a file that was rewritten to identical text is reported as
// the no-op it is, by name.
//
// USAGE — put it in front of the command, name what is supposed to change:
//   node scripts/prove-changed.mjs --paths=reports/night/X.md -- python apply_edits.py
//   node scripts/prove-changed.mjs --paths=a.md,b.md -- node fix.mjs --flag
//
// WHAT THIS DOES **NOT** CHECK, stated here rather than discovered later:
//   - **A COMMAND NOBODY WRAPPED.** This is the honest limit and it is not a small one: a one-off
//     command typed straight into a shell is invisible to this file, and no repository-side
//     mechanism can see it. Nothing here creates coverage of ad-hoc work; it creates a cheap way to
//     make ad-hoc work PROVE itself, which someone still has to choose to use.
//   - **Not the CONTENT.** The right bytes, the wrong bytes and a corrupted half-write all count as
//     "changed". Correctness is the caller's business, as it is in `write-verified.mjs`.
//   - **Not paths you did not name.** A command that writes the correct file and also wrecks another
//     one passes.
//   - **Not intent.** It cannot tell a file the command MEANT to write from one it touched by
//     accident, nor a file changed by something else running concurrently.
//   - **Not change-and-revert.** A command that edits a file and puts it back reads as a no-op. That
//     is deliberate: reporting it is the conservative error.
//   - **Not a line-ending-only edit, ON PURPOSE.** A command whose whole job is to normalise
//     newlines will be reported as a no-op. That is the price of the trap above and it is the right
//     way round: such a command is rare, and it says so in its own name when it exists.
//   - **Not binary files, usefully.** The newline folding is applied to every path, so a binary file
//     containing the bytes 0x0D 0x0A compares slightly more loosely than byte-exact.
//   - **Not durability, and not the git index.** It compares bytes on disk, before and after. It
//     does not stage, commit, or fsync anything.
//
// LOUD-FAILURE RULE (Lesson 187): no `--paths`, or no command after `--`, is a FAILURE, not a quiet
// pass. A wrapper invoked with nothing to prove has proved nothing, and must not print a verdict
// that reads like it did.
// ============================================================

import { spawnSync } from "node:child_process";
import { statSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ABSENT = Symbol("absent");

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Two hashes of a path, or ABSENT. Hashes rather than mtime: mtime moves when content does not.
 *
 * `raw`  — the bytes exactly as they are on disk.
 * `text` — the same bytes with CRLF and lone CR folded to LF.
 *
 * BOTH are needed, and the reason was found by sabotaging this file rather than by reasoning about
 * it. See the LINE-ENDING TRAP in the header.
 */
export function snapshot(path) {
  let buf;
  try {
    statSync(path);
    buf = readFileSync(path);
  } catch {
    return ABSENT;
  }
  return {
    raw: sha(buf),
    text: sha(
      Buffer.from(buf.toString("binary").replace(/\r\n?/g, "\n"), "binary"),
    ),
  };
}

const describe = (s) => (s === ABSENT ? "absent" : s.raw.slice(0, 12));
const sameRaw = (a, b) =>
  a === ABSENT || b === ABSENT ? a === b : a.raw === b.raw;
const sameText = (a, b) =>
  a === ABSENT || b === ABSENT ? a === b : a.text === b.text;

const die = (msg) => {
  console.error(`\nPROVE-CHANGED FAILED — ${msg}`);
  process.exit(1);
};

// ── Argument parsing, and its own loud failures ──────────────
const argv = process.argv.slice(2);
const sep = argv.indexOf("--");

const pathArgs = (sep === -1 ? argv : argv.slice(0, sep))
  .filter((a) => a.startsWith("--paths="))
  .flatMap((a) => a.slice("--paths=".length).split(","))
  .map((p) => p.trim())
  .filter(Boolean);

const command = sep === -1 ? [] : argv.slice(sep + 1);

if (pathArgs.length === 0) {
  die(
    "no --paths given, so there is nothing to prove.\n" +
      "  usage: node scripts/prove-changed.mjs --paths=a.md,b.md -- <command> [args...]\n" +
      "  Refusing to run a command and report a verdict about files nobody named.",
  );
}
if (command.length === 0) {
  die(
    "no command after `--`, so nothing would run.\n" +
      "  usage: node scripts/prove-changed.mjs --paths=a.md,b.md -- <command> [args...]",
  );
}

// ── BEFORE ───────────────────────────────────────────────────
const before = new Map(pathArgs.map((p) => [p, snapshot(p)]));

// ── RUN, inheriting stdio so the command's own output is not swallowed ──
const run = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  shell: false,
});

if (run.error) {
  die(
    `the command could not be started: ${run.error.message}\n` +
      `  command: ${command.join(" ")}\n` +
      `  Nothing was written. Do not report this step as done.`,
  );
}

// ── HALF 1: the command died ─────────────────────────────────
if (run.status !== 0) {
  const how =
    run.signal !== null ? `killed by ${run.signal}` : `exited ${run.status}`;
  console.error(
    `\nPROVE-CHANGED FAILED — the command ${how}, so anything it was going to write may not exist.\n` +
      `  command: ${command.join(" ")}\n` +
      pathArgs.map((p) => `  unproven: ${p}\n`).join("") +
      `  This is the aborted-before-the-write case (a failed assert, an exception, a kill).\n` +
      `  Do not report this step as done.`,
  );
  process.exit(run.status === null ? 1 : run.status);
}

// ── HALF 2: the command lived and changed nothing ────────────
const after = new Map(pathArgs.map((p) => [p, snapshot(p)]));
const changed = pathArgs.filter((p) => !sameText(before.get(p), after.get(p)));
const rewritten = pathArgs.filter(
  (p) =>
    !sameRaw(before.get(p), after.get(p)) &&
    sameText(before.get(p), after.get(p)),
);
const emptied = pathArgs.filter(
  (p) => after.get(p) !== ABSENT && statSync(p).size === 0,
);

if (changed.length === 0) {
  const touchedNothing = rewritten.length === 0;
  console.error(
    `\nPROVE-CHANGED FAILED — the command exited 0 and changed ${touchedNothing ? "NOTHING" : "NO TEXT"}.\n` +
      `  command: ${command.join(" ")}\n` +
      pathArgs
        .map(
          (p) =>
            `  ${rewritten.includes(p) ? "rewritten, text identical" : "unchanged"}: ${p}  (${describe(before.get(p))})\n`,
        )
        .join("") +
      (touchedNothing
        ? `  A successful exit is not evidence of an edit: a pattern that matched nothing, a write to a\n` +
          `  path that was not the one you meant, and a no-op all exit 0. Do not report this as done.`
        : `  THE LINE-ENDING TRAP: the file was rewritten and its TEXT is byte-identical — only newlines\n` +
          `  moved. A read-all/replace/write-all helper does this on every run on Windows, so a\n` +
          `  no-op looks like a diff. The edit did not land. Do not report this step as done.`),
  );
  process.exit(1);
}

if (emptied.length > 0) {
  console.error(
    `\nPROVE-CHANGED FAILED — the command left a file at ZERO BYTES.\n` +
      emptied.map((p) => `  empty: ${p}\n`).join("") +
      `  Empty is the signature of a truncated stream or a template that rendered to nothing.\n` +
      `  Do not report this step as done.`,
  );
  process.exit(1);
}

console.log(
  `prove-changed: ${changed.length} of ${pathArgs.length} named path(s) moved.` +
    ` (Text identity only — it does NOT check the content is correct, and it cannot see a command` +
    ` nobody wrapped.)`,
);
for (const p of changed) {
  console.log(
    `  changed: ${p}  ${describe(before.get(p))} -> ${describe(after.get(p))}`,
  );
}
for (const p of pathArgs.filter((x) => !changed.includes(x))) {
  console.log(
    `  ${rewritten.includes(p) ? "rewritten, text identical" : "unchanged"}: ${p}  (${describe(before.get(p))})`,
  );
}
