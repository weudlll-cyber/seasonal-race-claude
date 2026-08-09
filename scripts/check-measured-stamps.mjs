// ============================================================
// File:        scripts/check-measured-stamps.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 4
//
// MEASURED NUMBERS IN A DOCUMENT GO STALE SILENTLY. This guard makes one class of them say when
// they were taken, and fails when the thing they measure has changed since.
//
// THE DEFECT IT EXISTS FOR: `docs/CAMERA_DIRECTOR.md` stated tracking-lag figures as CURRENT —
// "LEADER 2.05 pp, OVERVIEW 6.78 pp, every other state pooled 3.78". Running the command they cited
// produced none of those. Two camera changes (FINISH-MOTION-1, FINISH-COMPANY-1) had moved the
// camera fingerprint; the prose did not follow. The drift was large enough to REVERSE the reading:
// OVERVIEW is the TIGHTEST state, not the loosest. Nothing could have noticed, because a number in
// a sentence has no owner and no date.
//
// WHY A STAMP AND NOT A GENERATOR — the choice the brief asked me to make and justify.
// `scripts/tracking-lag.mjs` takes about SEVEN MINUTES. A guard that runs it would either never be
// run or would be disabled within a week, and a guard nobody runs is worse than none because it
// looks like coverage. So the numbers stay hand-copied and instead carry a COMMIT and a DATE, and
// this guard answers the only question that makes a stamp useful: has the measured thing changed
// since? That is answerable in milliseconds from git alone.
//
// HOW IT DECIDES. The stamp names a commit. The guard finds the newest commit touching the SOURCE
// the measurement depends on, and fails unless that commit is an ancestor of (or equal to) the
// stamped one. In plain terms: if the camera changed after these figures were taken, they are
// suspect and it says so.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **It does not verify the NUMBERS.** It never runs the measurement. A stamp taken on the right
//     commit with wrong digits typed under it passes. This checks FRESHNESS, not accuracy.
//   - It does not cover any other number in the stamped document. In CAMERA_DIRECTOR.md that
//     explicitly leaves unguarded: the test and file counts in the camera-check section, the
//     command durations (~35 s, ~7 min), the frame counts and sample-point lists, the 2708 px
//     finish jump, the 300 px lookback default, and every percentage in the state-machine prose.
//     Those have no stamp and this guard is silent about them.
//   - It cannot tell a change that MATTERS from one that does not. A comment-only edit to a camera
//     file trips it exactly like a behaviour change. That is deliberate — the alternative is
//     judging significance, which is what went wrong the last time a person did it by eye — but it
//     means a trip is a prompt to re-measure or re-stamp, not proof that the numbers moved.
//   - It does not find measured numbers that carry NO stamp. It checks the stamps that exist. A
//     number nobody stamped is invisible to it.
//
// LOUD-FAILURE RULE (Lesson 187): zero stamps found is a FAILURE. This guard's whole value is that
// the stamps exist; silently checking nothing is the failure mode it is built against.
//
// THE STAMP FORMAT, one HTML comment on its own line:
//   <!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path>[,<path>...] -->
//
// Usage:
//   node scripts/check-measured-stamps.mjs
//   node scripts/check-measured-stamps.mjs --doc=<path>   # check a copy instead (used by its test)
// ============================================================

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The documents scanned for stamps. A short explicit list, not a glob: a stamp is a deliberate act,
// and a guard that hunts for them everywhere would encourage sprinkling them about.
//
// `--doc=<path>` overrides the list, and exists for ONE reason worth writing down. The first version
// of this guard's test sabotaged the REAL `docs/CAMERA_DIRECTOR.md` and restored it in a `finally`.
// That is safe alone and unsafe in this repository: `npm run verify` runs the doc guards and the
// script suite CONCURRENTLY, so the guard read the document during the window its own test had it
// mutated, and verify failed reporting a `depends` path that exists in no commit. A test that
// mutates a tracked file cannot coexist with a guard that reads it. The test now copies the document
// to a temp file and points here instead — nothing tracked is ever written.
const DOC_OVERRIDE = process.argv
  .filter((a) => a.startsWith("--doc="))
  .map((a) => a.slice("--doc=".length));
const DOCS = DOC_OVERRIDE.length ? DOC_OVERRIDE : ["docs/CAMERA_DIRECTOR.md"];

/**
 * The pathspec that keeps TEST FILES out of "what changed" — VERIFY-COST-3.
 *
 * EXPORTED so this guard's own tests can ask the same question the guard asks. They cannot pick
 * their fixture commits by a different rule and still be testing this guard, and CI caught exactly
 * that: on a run where the newest camera commit was a test-file commit, the sabotage stamped a
 * commit the guard no longer considers, so the guard correctly reported fresh while the test
 * demanded stale. The rule has ONE home and both ends read it.
 *
 * `:(exclude,glob)` rather than `:(exclude)`: with the `glob` magic `**` means what it reads as on
 * every git version instead of depending on the default pathspec dialect.
 */
export const TEST_FILE_EXCLUDE = ":(exclude,glob)**/*.test.*";

const STAMP =
  /<!--\s*MEASURED:\s*(.+?)\s+@\s+([0-9a-f]{7,40})\s+(\d{4}-\d{2}-\d{2})\s+depends=([^\s]+)\s*-->/g;

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
};

// A SHALLOW CLONE CANNOT ANSWER A HISTORY QUESTION, and must not be allowed to look like a verdict.
// CI checks out with depth 1 by default, so the stamped commit is simply absent and every stamp
// reported "which does not exist" — technically the observed state, and misleading about the cause.
// This guard's whole question is historical, so it says exactly what is wrong and how to fix it.
let shallow = false;
try {
  shallow = git("rev-parse", "--is-shallow-repository") === "true";
} catch {
  shallow = false;
}
if (shallow) {
  console.error(
    "FAIL: this is a SHALLOW clone, so git cannot see the commits these stamps name.\n" +
      "      Nothing is wrong with the document. Deepen the checkout — in GitHub Actions that is\n" +
      "      `actions/checkout@v4` with `fetch-depth: 0` — or run this locally.\n" +
      "      Refusing to report a verdict from a repository that cannot answer the question.",
  );
  process.exit(1);
}

let found = 0;
for (const doc of DOCS) {
  let text;
  try {
    // resolve(), not join(): an absolute --doc path must be honoured, and join() would concatenate
    // it onto ROOT. Caught by the test that pins --doc against an UNTRANSFORMED copy.
    text = readFileSync(resolve(ROOT, doc), "utf8");
  } catch {
    fail(
      `${doc} cannot be read. It is in this guard's document list, so that is a hole.`,
    );
    continue;
  }

  for (const m of text.matchAll(STAMP)) {
    const [, what, stampCommit, date, depends] = m;
    found++;
    const paths = depends.split(",").filter(Boolean);

    // The stamped commit must exist. A typo here would otherwise disable the check silently.
    let resolved;
    try {
      resolved = git("rev-parse", "--verify", `${stampCommit}^{commit}`);
    } catch {
      fail(
        `${doc}: "${what}" is stamped at commit ${stampCommit}, which does not exist.`,
      );
      continue;
    }

    let newest;
    try {
      // VERIFY-COST-3: TEST FILES ARE EXCLUDED FROM "what changed".
      //
      // WHY, and it is narrow on purpose. A measurement script imports the code it measures; it does
      // not import that code's TESTS. So a `*.test.*` file cannot move a number this guard is
      // protecting — but it lives inside the same `depends=` directory, and the pre-commit
      // formatter reformats it. That is not a hypothetical: it turned this guard red twice, in two
      // consecutive blocks, both times because prettier touched `startCeremony.test.js` in a commit
      // that changed no measured behaviour at all, and both times the answer was a re-stamp that
      // proved nothing.
      //
      // WHAT THIS NO LONGER COVERS, stated because a guard that does not say so is trusted for more
      // than it does: a measurement script that reads a test file — as a fixture, a roster or a
      // golden list — is now invisible to this guard, and its stamp will read fresh after that file
      // changes. No script does that today. If one ever does, its `depends=` must name the file
      // directly rather than the directory, and this exclusion must be revisited.
      newest = git("log", "-1", "--format=%H", "--", ...paths, TEST_FILE_EXCLUDE);
    } catch {
      newest = "";
    }
    if (!newest) {
      fail(
        `${doc}: "${what}" declares depends=${depends}, and git has NO commits touching those\n` +
          `      paths. Either the path is wrong or nothing there is tracked — a dependency that\n` +
          `      cannot change is not a dependency, and the stamp would never trip.`,
      );
      continue;
    }

    // Fresh means: the newest change to the dependency is an ancestor of (or equal to) the stamp.
    let fresh = false;
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", newest, resolved], {
        cwd: ROOT,
      });
      fresh = true;
    } catch {
      fresh = false;
    }

    if (!fresh) {
      const when = (() => {
        try {
          return git("log", "-1", "--format=%h %ad %s", "--date=short", newest);
        } catch {
          return newest;
        }
      })();
      fail(
        `${doc}: "${what}" was measured at ${stampCommit} (${date}), but ${depends} changed AFTER\n` +
          `      that:\n        ${when}\n` +
          `      Re-run the measurement and re-stamp, or — if the change cannot have moved these\n` +
          `      numbers — re-stamp deliberately and say why in the commit. Do not just edit the date.`,
      );
    }
  }
}

if (found === 0) {
  console.error(
    "FAIL: found ZERO measured-number stamps. This guard's entire value is that they exist,\n" +
      "      so checking nothing must not read as a pass. Expected format:\n" +
      "      <!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path> -->",
  );
  process.exit(1);
}

console.log(
  `check-measured-stamps: ${found} stamp(s) across ${DOCS.length} document(s), ${failures} stale.` +
    " (Freshness only — the numbers themselves are never re-measured.)",
);
if (failures > 0) process.exit(1);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
