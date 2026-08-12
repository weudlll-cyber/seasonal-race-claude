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
//   - It does not cover any other number in a stamped document. In CAMERA_DIRECTOR.md that
//     explicitly leaves unguarded: the test and file counts in the camera-check section, the
//     command durations (~35 s, ~7 min), the frame counts and sample-point lists, the 2708 px
//     finish jump, the 300 px lookback default, and every percentage in the state-machine prose.
//     Those have no stamp and this guard is silent about them.
//   - It cannot tell a change that MATTERS from one that does not. A comment-only edit to a camera
//     file trips it exactly like a behaviour change. That is deliberate — the alternative is
//     judging significance, which is what went wrong the last time a person did it by eye — but it
//     means a trip is a prompt to re-measure or re-stamp, not proof that the numbers moved.
//   - It does not find measured numbers that carry NO stamp. It checks the stamps that exist. A
//     number nobody stamped is invisible to it — and WIDENING THE DOCUMENT SET DID NOT CHANGE THAT.
//     Scanning fifty-seven documents instead of one means a stamp placed anywhere is now checked;
//     it does not mean the unstamped measured numbers in those documents are. That is the same
//     hole, at the same size, and it is still the biggest one here.
//   - `reports/` — the lab journal, deliberately outside the scanned set. A report records what was
//     true on the day it was written and is allowed to go stale by rule, which is the opposite of
//     what a stamp promises.
//
// LOUD-FAILURE RULE (Lesson 187): zero stamps found is a FAILURE. This guard's whole value is that
// the stamps exist; silently checking nothing is the failure mode it is built against.
//
// THE STAMP FORMAT, one HTML comment on its own line:
//   <!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path>[,<path>...] -->
//
// WHY IT READS GIT HISTORY AND NOT THE WORKING TREE — asked again at STAMP-COMPLETE-1, answered
// UNCHANGED. The question a stamp raises is historical: "has the dependency changed since the commit
// this was measured at". Only history can answer it, and a working-tree comparison would answer a
// different question — "does the tree differ from the stamp" — which is true constantly and
// harmlessly during any edit, and would make the guard un-runnable mid-block. The working tree is
// not IGNORED: the PENDING pass at the bottom reads it and REPORTS what is about to go stale,
// without failing. That split is right and stays.
//
// Usage:
//   node scripts/check-measured-stamps.mjs                # every living doc (docs/ + repo-root *.md)
//   node scripts/check-measured-stamps.mjs --doc=<path>   # check a copy instead (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-measured-stamps",
  covers:
    "a stamped measured number whose source changed after the stamp was taken, across EVERY living document (docs/ + repo-root *.md), not one named file",
  blind: [
    "the NUMBERS themselves — it never re-runs a measurement, only checks freshness",
    "any measured number that carries no stamp: it checks the stamps that exist, in any document",
    "reports/ — the lab journal is outside the scanned set and is allowed to go stale by rule",
    "a change that cannot have moved the figures: a comment-only edit trips it exactly like a behaviour change",
  ],
  dirs: ["docs/", "client/src/modules/camera/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── THE DOCUMENTS SCANNED (STAMP-COMPLETE-1) ──────────────────────────────────────────────────
//
// IT IS THE WHOLE LIVING-DOC SET, and it used to be `docs/CAMERA_DIRECTOR.md` and nothing else.
// That was true when the only stamp existed there and false as soon as a second document carried a
// measured number — and the failure is silent by construction, because a guard scanning one file
// prints a confident green line about the other fifty-six it never opened. That is the identical
// shape INDEX-COMPLETE-1 fixed this morning in `check-index`, where a bare invocation answered
// about one of three registered report directories and an unindexed report sat behind the green
// for three hours.
//
// IT DEFAULTS TO ALL OF THEM rather than REFUSING without arguments, and that choice is the same
// one INDEX-COMPLETE-1 made for the same reason: refusing only helps the person who runs it bare,
// while defaulting also covers the document somebody stamps tomorrow AND makes the CHEAPEST
// invocation the COMPLETE one — which is the invocation people actually type. A guard whose
// complete form has to be remembered will be run in its incomplete form.
//
// THE SET IS DISCOVERED, NOT LISTED, and it is the SAME rule `check-doc-links.mjs` uses so there is
// one definition of "a living doc": every tracked `*.md` under `docs/`, plus the repo-root `*.md`
// files. `reports/` is the lab journal and is deliberately out — a report records what was true on
// the day it was written and is allowed to go stale, which is the opposite of what a stamp promises.
//
// `--doc=<path>` overrides the set, and exists for ONE reason worth writing down. The first version
// of this guard's test sabotaged the REAL `docs/CAMERA_DIRECTOR.md` and restored it in a `finally`.
// That is safe alone and unsafe in this repository: `npm run verify` runs the doc guards and the
// script suite CONCURRENTLY, so the guard read the document during the window its own test had it
// mutated, and verify failed reporting a `depends` path that exists in no commit. A test that
// mutates a tracked file cannot coexist with a guard that reads it. The test now copies the document
// to a temp file and points here instead — nothing tracked is ever written.
const DOC_OVERRIDE = process.argv
  .filter((a) => a.startsWith("--doc="))
  .map((a) => a.slice("--doc=".length));

/** Every tracked living doc: all of `docs/`, plus the repo-root `*.md`. Same rule as check-doc-links. */
function livingDocs() {
  const tracked = execFileSync("git", ["ls-files", "*.md"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split(String.fromCharCode(10))
    .map((f) => f.trim())
    .filter(Boolean);
  return tracked.filter((f) => {
    if (f.includes("node_modules/") || f.includes("/dist/")) return false;
    if (f.startsWith("docs/")) return true;
    return !f.includes("/"); // repo-root-level *.md
  });
}

const DOCS = DOC_OVERRIDE.length ? DOC_OVERRIDE : livingDocs();

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
// VERIFY-ROUTING-2 (design from VERIFY-ROUTING-1): every stamp seen, so the PENDING pass below can
// ask about UNCOMMITTED work after the committed check has finished.
const STAMPS = [];
const NL = String.fromCharCode(10);

let scanned = 0;
const CARRIERS = new Set();

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
  scanned++;
  // FENCED CODE IS DOCUMENTATION, NOT A STAMP (STAMP-COMPLETE-1). Now that the whole living-doc set
  // is scanned, any document EXPLAINING the stamp format would have its example parsed as a real
  // stamp and go red for saying what the format is — and R11 is explicit that the answer to a guard
  // disagreeing with a true sentence is to fix the GUARD, never to make the sentence vaguer. So
  // fenced blocks are stripped, exactly as check-doc-links strips them for the same reason.
  text = text.replace(/```[\s\S]*?```/g, "");

  for (const m of text.matchAll(STAMP)) {
    const [, what, stampCommit, date, depends] = m;
    found++;
    const paths = depends.split(",").filter(Boolean);
    STAMPS.push({ doc, what, paths });
    CARRIERS.add(doc);

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
      newest = git(
        "log",
        "-1",
        "--format=%H",
        "--",
        ...paths,
        TEST_FILE_EXCLUDE,
      );
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

// ── A GUARD'S PENDING LINE SURVIVES A GREEN RUN (VERIFY-ROUTING-2) ──────────────────────────────
//
// THE LIMIT THIS EXISTS FOR, and I walked into it myself in MIN-RACERS-5: this guard reads git
// HISTORY. Run before the commit, it has nothing to compare — there is no commit touching the
// dependency yet — so it passes, and it passes for a reason that has nothing to do with the work
// being sound. I ran it that way, saw green, and the very next CI run went red on the same stamp.
//
// It cannot check a commit that does not exist. What it CAN do is say so: it reads the working tree
// and reports uncommitted changes that will make a stamp stale the moment they are committed. This
// is a REPORT, never a failure — failing on it would make the guard un-runnable mid-edit.
//
// THE COUNT PRINTS EVEN WHEN IT IS ZERO, so "no PENDING" is a statement rather than an absence.
let pending = 0;
for (const { doc, what, paths } of STAMPS) {
  let dirty = [];
  try {
    dirty = execFileSync("git", ["status", "--porcelain", "--", ...paths], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split(String.fromCharCode(10))
      .map((l) => l.slice(3).trim())
      .filter(Boolean);
  } catch {
    dirty = [];
  }
  if (!dirty.length) continue;
  pending++;
  console.log(
    `PENDING: ${doc}: "${what}" is fresh against COMMITTED history — but ${dirty.length} ` +
      `uncommitted change(s) under ${paths.join(", ")} will make it stale the moment they are ` +
      `committed:` +
      dirty.map((d) => `${NL}         ${d}`).join("") +
      `${NL}         This guard CANNOT check a commit that does not exist yet, so this is a ` +
      `REPORT and not a failure.` +
      `${NL}         Re-measure and re-stamp in the commit you are about to make.`,
  );
}
console.log(
  `check-measured-stamps: ${pending} stamp(s) PENDING against uncommitted work.`,
);

// THE COUNTS SAY WHAT WAS OPENED, not just what was found. A guard that prints "1 stamp, 0 stale"
// reads identically whether it scanned one document or fifty-seven — which is exactly how the
// one-document version looked green for as long as it did.
console.log(
  `check-measured-stamps: ${found} stamp(s) in ${CARRIERS.size} of ${scanned} living document(s) ` +
    `scanned, ${failures} stale. (Freshness only — the numbers themselves are never re-measured.)`,
);
if (failures > 0) process.exit(1);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
