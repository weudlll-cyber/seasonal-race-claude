// ============================================================
// File:        scripts/check-hooks-installed.mjs
// Project:     RaceArena — HOOK-TRACKED-1
//
// ARE THE HOOKS ACTUALLY IN EFFECT? Git will not tell you. A `core.hooksPath` pointing at a
// directory that does not exist produces no warning, no error and no hook: commits succeed, exit 0,
// and every check this repository owns is walked past.
//
// HOOK-SILENT-1 demonstrated it in a real worktree — `.husky/_` existed in the main tree and
// nowhere else, so a worktree commit ran nothing at all and said nothing at all. HOOK-TRACKED-1
// moved the hooks into the tracked `.githooks/` so the checkout supplies them. This guard is the
// other half: it makes the remaining ways to be unhooked LOUD.
//
// ── THE THREE STATES IT CATCHES ─────────────────────────────────────────────────────────────────
//   1. `core.hooksPath` UNSET — a fresh clone. Git config is not cloned, so this is the default
//      state of every new checkout until the one setup command runs.
//   2. `core.hooksPath` pointing SOMEWHERE ELSE — a stale `.husky/_`, a personal override.
//   3. `core.hooksPath` correct but the DIRECTORY OR THE HOOK FILE MISSING — the silent state.
//
// ── WHERE IT RUNS, AND WHY NOT IN THE HOOK ──────────────────────────────────────────────────────
// It runs in `npm run verify`, as an ALWAYS-ON guard.
//
// Putting it in the pre-commit hook would be the obvious place and is exactly wrong: if the hooks
// are not in effect the hook does not run, so a hook that checks whether hooks run can only ever
// report success. That is the same shape as a guard reporting success over a directory it was never
// pointed at, and this repository has shipped that mistake twice already.
//
// `verify` is the right home because it is the thing a person runs on a machine that MAKES COMMITS,
// it runs before the commit rather than during it, and it is already the place where routing
// decisions are printed rather than assumed.
//
// ── WHAT IT DOES IN CI, AND WHY ─────────────────────────────────────────────────────────────────
// CI MAKES NO COMMITS, so "are the hooks in effect" is not a property a runner can have: it clones,
// never runs the setup command, and never commits. A check that asserted it would fail every run
// for a correct reason that means nothing; a check that quietly passed would be worse — it would
// look like coverage of a machine that cannot have the property.
//
// So under CI it SKIPS AND SAYS SO, loudly, in one line, and exits 0. It is deliberately NOT wired
// into a CI step: a step whose only possible output is "skipped" is noise. What CI DOES verify is
// that this guard WORKS — `check-hooks-installed.test.mjs` runs in the script suite there, against
// fixture repositories in all three broken states.
//
// ── LOUD-FAILURE RULE (Lesson 187) ──────────────────────────────────────────────────────────────
// It FAILS rather than passing when it cannot establish where it is: not a git repository, or
// `git` unusable. A guard that cannot look must not report that it looked.
//
// Usage:
//   node scripts/check-hooks-installed.mjs              # the guard
//   node scripts/check-hooks-installed.mjs --root=<dir> # check another repository (its test does)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// ALWAYS-ON (`everything`), and that is the only honest shape: being unhooked is a property of the
// CHECKOUT, not of the diff. No set of changed paths makes it more or less true, and a guard that
// only ran when some file changed would be silent in exactly the fresh clone it exists for.
export const GUARD = {
  id: "check-hooks-installed",
  covers:
    "a checkout where the git hooks are not in effect — hooksPath unset, pointing elsewhere, or pointing at a directory whose hook files are missing",
  blind: [
    "whether the hook SCRIPT is correct or does anything useful — it checks that git will run it, not what it does",
    "hooks other than the ones REQUIRED_HOOKS names in scripts/setup-hooks.mjs",
    "`git commit --no-verify`, which bypasses a perfectly installed hook and is a deliberate escape",
    "CI, where it skips and says so: a runner makes no commits, so it cannot have this property",
  ],
  everything: true,
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// ONE HOME for "are the hooks in effect": the setup command answers it, and this guard asks IT
// rather than re-deriving the answer. Two statements of the same predicate is one too many, and
// the drift would be invisible — the guard would pass while the setup disagreed.
import { hookProblems, HOOKS_DIR } from "./setup-hooks.mjs";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT = argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);

// ── CI: skip, say so, exit 0 ────────────────────────────────────────────────────────────────────
// GitHub Actions sets CI=true. Any runner that sets it gets the same treatment.
if (process.env.CI) {
  console.log(
    `check-hooks-installed: SKIPPED — CI makes no commits, so "the hooks are in effect" is not a ` +
      `property this machine can have.${NL}` +
      `  It is not asserted here rather than being quietly passed. What CI DOES check is that this ` +
      `guard works: its${NL}  test runs in the script suite against fixture repositories in all ` +
      `three broken states.`,
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

// ── LOUD FAILURE: establish that there is a repository to look at, before saying anything ───────
let inRepo = false;
try {
  inRepo =
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim() === "true";
} catch {
  inRepo = false;
}
if (!inRepo) {
  console.error(
    `FAIL: ${ROOT} is not a git work tree, so this guard cannot establish anything.${NL}` +
      `      Refusing to report that the hooks are fine — a guard that cannot look must not say ` +
      `it looked.`,
  );
  console.error(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(1);
}

const problems = hookProblems(ROOT);

if (problems.length === 0) {
  console.log(
    `check-hooks-installed: hooks ARE in effect — core.hooksPath=${HOOKS_DIR}, tracked, present. ` +
      `(BLIND to what the hook DOES, to --no-verify, and to CI — see GUARD.blind.)`,
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

console.error(`FAIL: the git hooks are NOT in effect in this checkout.${NL}`);
for (const p of problems) console.error(`      - ${p}`);
console.error(
  `${NL}      Every check the pre-commit hook runs is being skipped, and git reports nothing when ` +
    `that happens —${NL}      commits succeed and exit 0. That is the defect HOOK-SILENT-1 found in ` +
    `a worktree.${NL}${NL}      Fix it with ONE command:${NL}${NL}          npm run hooks:install` +
    `${NL}${NL}      See docs/VERIFY-RULES.md R12, which is the one home for how the hooks work.`,
);
console.error(`[ra-elapsed-ms ${Date.now() - started}]`);
process.exit(1);
