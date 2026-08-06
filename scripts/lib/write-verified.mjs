// ============================================================
// File:        scripts/lib/write-verified.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 6
//
// A WRITE THAT DID NOT HAPPEN MUST NOT LOOK LIKE ONE THAT DID.
//
// THE INCIDENT, twice in two blocks. A helper script did work, then called `assert` to sanity-check
// something, then wrote the file. The assert failed, the process aborted BEFORE the write, and the
// only visible symptom was a traceback that scrolled past — while a later `node --check` on the
// UNCHANGED file printed "syntax ok". Both times the edit was reported as done and was not. Once it
// put a false claim into a published report (NIGHT-TOOLS-1's check-index header); once it silently
// dropped an entire classifier (ONE-TRUTH-1 stage 2a).
//
// TWO RULES COME OUT OF IT, and this file is the mechanical half:
//   1. NEVER use an assertion for a step whose SIDE EFFECT matters. An assert guards a belief; it
//      does not sequence work. If the write matters, it must not sit behind one.
//   2. After writing, VERIFY — the file exists and is non-empty — and fail loudly NAMING THE PATH.
//      "I wrote it" is a claim; `statSync().size > 0` is evidence.
//
// WHY NON-EMPTY AND NOT "correct": correctness is the caller's business and differs every time.
// Zero bytes is the signature of the failure this exists for — a truncated stream, a write to a
// path that was not what the caller meant, a template that rendered to nothing. It is the cheapest
// check that would have caught both incidents.
//
// WHAT THIS DOES **NOT** CHECK, stated here rather than discovered later:
//   - Not the CONTENT. A file full of the wrong bytes passes.
//   - Not that the path is the one you INTENDED. Writing the right bytes to the wrong file passes.
//   - Not durability. It does not fsync; a crash between write and power-loss is out of scope.
//   - Not concurrent writers. If something else truncates the file a millisecond later, this has
//     already returned.
//
// WHERE IT IS APPLIED, and the scoping decision (made alone, ONE-TRUTH-2 stage 6): the LIVING TOOLS
// whose output other things read — the document generators and the data export. It is deliberately
// NOT applied to:
//   - `scripts/exp-*.mjs`, the one-off experiment harnesses. Their output is a lab-journal artefact
//     read by the person who ran them, in the same sitting, and a missing file is immediately
//     obvious. Converting ~40 of them would be a large mechanical diff across code nobody runs
//     twice, for a failure mode that has never occurred there.
//   - `*.test.mjs` fixture writes. A fixture that fails to write fails its own test on the next
//     line, which is a louder signal than this helper gives.
// If either of those assumptions stops holding, widen it — the helper is the cheap part.
// ============================================================

import { writeFileSync, statSync } from "node:fs";

/**
 * Write a file, then prove it landed. Returns the byte size actually on disk.
 *
 * @param {string} path     absolute or cwd-relative path
 * @param {string|Buffer} content
 * @param {string} [what]   what this file is, for the failure message
 */
export function writeVerified(path, content, what = "file") {
  writeFileSync(path, content);

  let size;
  try {
    size = statSync(path).size;
  } catch (e) {
    throw new Error(
      `WRITE FAILED — ${what} is not on disk after writing it.\n` +
        `  path: ${path}\n` +
        `  stat: ${e.message}\n` +
        `  The write appeared to succeed and did not. Do not report this step as done.`,
    );
  }

  if (size === 0) {
    throw new Error(
      `WRITE FAILED — ${what} is ZERO BYTES after writing it.\n` +
        `  path: ${path}\n` +
        `  An empty file is the signature of a truncated stream or a template that rendered to\n` +
        `  nothing. Do not report this step as done.`,
    );
  }

  return size;
}
