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
// ============================================================

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The documents scanned for stamps. A short explicit list, not a glob: a stamp is a deliberate act,
// and a guard that hunts for them everywhere would encourage sprinkling them about.
const DOCS = ["docs/CAMERA_DIRECTOR.md"];

const STAMP =
  /<!--\s*MEASURED:\s*(.+?)\s+@\s+([0-9a-f]{7,40})\s+(\d{4}-\d{2}-\d{2})\s+depends=([^\s]+)\s*-->/g;

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
};

let found = 0;
for (const doc of DOCS) {
  let text;
  try {
    text = readFileSync(join(ROOT, doc), "utf8");
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
      newest = git("log", "-1", "--format=%H", "--", ...paths);
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
