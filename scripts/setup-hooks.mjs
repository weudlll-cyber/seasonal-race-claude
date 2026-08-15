// ============================================================
// File:        scripts/setup-hooks.mjs
// Project:     RaceArena — HOOK-TRACKED-1
//
// THE ONE COMMAND. `npm run hooks:install` — and nothing else — makes this repository's hooks take
// effect in a fresh clone or a fresh worktree. It also runs from `prepare`, so `npm install` and
// `npm ci` do it without anybody remembering.
//
// ── WHAT IT HAS TO SOLVE, AND WHY A SINGLE `git config` LINE IS NOT ENOUGH ──────────────────────
//
// 1. `core.hooksPath` IS NOT CLONED. Git config is not part of the object store, so a fresh clone
//    has no hooksPath at all and runs `.git/hooks/*`, which this repository does not use. One
//    command has to set it.
//
// 2. THE EXECUTABLE BIT IS NOT HONOURED ON THIS MACHINE. `core.filemode` is FALSE here (Git for
//    Windows), so chmod on the working file records nothing and the old hook was tracked as
//    100644. Git for Windows runs a hook through `sh` regardless of the bit — but git on Linux
//    does NOT execute a non-executable hook, so a hook authored here would have been dead on any
//    other machine and green here. The bit is therefore set IN THE INDEX (`git update-index
//    --chmod=+x`), which works from Windows and is what actually travels in a clone.
//
// 3. A RELATIVE hooksPath RESOLVES AGAINST THE WORKTREE. That is what made the old setup fail:
//    `.husky/_` existed in the main worktree and nowhere else. `.githooks` is TRACKED, so the
//    checkout puts it in every worktree, and the same relative path resolves correctly in all of
//    them. Measured, not assumed — see docs/VERIFY-RULES.md R12.
//
// ── IT IS IDEMPOTENT AND IT REPORTS ─────────────────────────────────────────────────────────────
// Running it twice changes nothing and says so. It prints what it did rather than succeeding
// silently, because the whole defect this block exists for was a setup step that was silent when
// it had not happened.
//
// ── IT REFUSES RATHER THAN CONFIGURING A LIE ────────────────────────────────────────────────────
// If the hooks directory or the hook file is missing, it FAILS instead of pointing git at nothing.
// Setting hooksPath to a directory that does not exist is exactly the state HOOK-SILENT-1 found,
// and a setup command that produces it is worse than no setup command.
//
// Usage:
//   npm run hooks:install                       # the one command
//   node scripts/setup-hooks.mjs --check        # report only, change nothing, exit 1 if not set up
// ============================================================

import { execFileSync } from "node:child_process";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

// --root= is the seam the tests use, and it is the ONLY way the refusal path can be exercised:
// this script resolves its own location by default, so in this repository .githooks/ always
// exists and the refusal could never be reached from a test.
const ROOT = argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
export const HOOKS_DIR = ".githooks";
/** The hooks this repository actually ships. A name here must exist as a file, or setup refuses. */
export const REQUIRED_HOOKS = ["pre-commit"];

const CHECK_ONLY = process.argv.includes("--check");
const NL = String.fromCharCode(10);

const git = (args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

/**
 * What is wrong with the hook installation right now, as a list of sentences. Empty means the
 * hooks are in effect.
 *
 * EXPORTED because the guard (`scripts/check-hooks-installed.mjs`) asks the same question, and two
 * statements of "are the hooks in effect" would be one statement too many.
 *
 * @param {string} [root] a repository to inspect instead of this one — the tests use it
 */
export function hookProblems(root = ROOT) {
  const problems = [];
  let configured = null;
  try {
    configured = execFileSync("git", ["config", "--get", "core.hooksPath"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    configured = null; // `git config --get` exits 1 when the key is unset
  }

  if (!configured)
    problems.push(
      `core.hooksPath is UNSET, so git is using .git/hooks — which this repository does not ` +
        `track and does not use. Every check the pre-commit hook runs is being skipped, silently.`,
    );
  else if (configured !== HOOKS_DIR)
    problems.push(
      `core.hooksPath is "${configured}", not "${HOOKS_DIR}". The tracked hooks are not the ones ` +
        `git is running.`,
    );

  const dir = join(root, HOOKS_DIR);
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    problems.push(
      `${HOOKS_DIR}/ does not exist in this checkout. A hooksPath pointing at a missing directory ` +
        `is the exact state HOOK-SILENT-1 found: git runs nothing and reports nothing.`,
    );
  else
    for (const h of REQUIRED_HOOKS)
      if (!existsSync(join(dir, h)))
        problems.push(
          `${HOOKS_DIR}/${h} is missing. git will silently run no ${h} hook.`,
        );

  return problems;
}

/** The index mode of a tracked path, or null when it is not tracked. */
function indexMode(rel) {
  try {
    const line = git(["ls-files", "-s", "--", rel]);
    return line ? line.split(/\s+/)[0] : null;
  } catch {
    return null;
  }
}

// ── EVERYTHING BELOW RUNS ONLY WHEN THIS FILE IS THE ENTRY POINT ────────────────────────────────
// `check-hooks-installed.mjs` imports `hookProblems` from here so there is ONE statement of "are
// the hooks in effect". Without this guard that import would CONFIGURE GIT as a side effect of
// asking a question — the same shape as a read-only guard that writes, which is never acceptable.
const IS_ENTRY =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (IS_ENTRY) main();

function main() {
// ── LOUD FAILURE (Lesson 187): refuse rather than configure a lie ────────────────────────────────
const dir = join(ROOT, HOOKS_DIR);
if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error(
    `FAIL: ${HOOKS_DIR}/ does not exist.${NL}` +
      `      Refusing to point core.hooksPath at a directory that is not there — that is the ` +
      `silent-bypass state${NL}      this setup exists to end, and configuring it would look ` +
      `exactly like success.`,
  );
  process.exit(1);
}
const missing = REQUIRED_HOOKS.filter((h) => !existsSync(join(dir, h)));
if (missing.length) {
  console.error(
    `FAIL: ${HOOKS_DIR}/ exists but is missing: ${missing.join(", ")}.${NL}` +
      `      Refusing to configure hooks that are not there.`,
  );
  process.exit(1);
}

if (CHECK_ONLY) {
  const problems = hookProblems();
  if (problems.length === 0) {
    console.log(`setup-hooks --check: hooks are in effect (core.hooksPath=${HOOKS_DIR}).`);
    process.exit(0);
  }
  for (const p of problems) console.error(`FAIL: ${p}`);
  console.error(`${NL}      Fix it with ONE command:  npm run hooks:install`);
  process.exit(1);
}

// ── 1. point git at the tracked directory ────────────────────────────────────────────────────────
let before = null;
try {
  before = git(["config", "--get", "core.hooksPath"]);
} catch {
  before = null;
}
if (before === HOOKS_DIR) {
  console.log(`hooks: core.hooksPath already ${HOOKS_DIR} — unchanged.`);
} else {
  git(["config", "core.hooksPath", HOOKS_DIR]);
  console.log(
    `hooks: core.hooksPath ${before === null ? "(unset)" : `"${before}"`} -> ${HOOKS_DIR}`,
  );
}

// ── 2. make sure the bit that TRAVELS is set, whatever this machine thinks of file modes ─────────
// `core.filemode` is false on Windows, so the working-tree bit records nothing. The INDEX mode is
// what a clone gets, and git on Linux will not execute a 100644 hook.
for (const h of readdirSync(dir)) {
  const rel = `${HOOKS_DIR}/${h}`;
  const mode = indexMode(rel);
  if (mode === null) {
    console.log(`hooks: ${rel} is not tracked yet — it will need the +x bit once it is added.`);
    continue;
  }
  if (mode === "100755") {
    console.log(`hooks: ${rel} already executable in the index (100755).`);
    continue;
  }
  git(["update-index", "--chmod=+x", "--", rel]);
  console.log(`hooks: ${rel} index mode ${mode} -> 100755 (git on Linux will not run a 100644 hook)`);
}

const left = hookProblems();
if (left.length) {
  for (const p of left) console.error(`FAIL: ${p}`);
  process.exit(1);
}
console.log("hooks: in effect.");
}
