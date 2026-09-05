// ============================================================
// File:        scripts/lib/ciUnconditional.mjs
// Project:     RaceArena — PREMERGE-CI-SET-1
//
// WHAT CI RUNS ON EVERY PUSH, DERIVED FROM `ci.yml` RATHER THAN RETYPED.
//
// ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────────────────────────
//
// `verify` selects guards from the DIFF: a guard whose declared paths did not change does not run,
// and its skip is printed with a reason. That is right for an ordinary run and it is why `verify`
// is fast. But `ci.yml`'s docs job carries NO `if:` conditions at all — it runs its guards and the
// whole script suite on every push, whatever changed. So a guard `verify` correctly skipped can be
// red in CI, which is one of the three ways master stood red for three days while every merge had
// run `verify` green first.
//
// ── WHY IT IS DERIVED AND NOT A LIST ────────────────────────────────────────────────────────────
//
// A hand-copied list of "what CI runs" would be a SECOND HOME for a fact `ci.yml` already states,
// and it would drift the first time a step was added there — which is the exact defect class this
// module exists to close. So the workflow file is parsed. A step added to CI is picked up here with
// no edit, and a step this module cannot understand REFUSES rather than being silently dropped.
//
// ── WHY A LINE PARSE AND NOT A YAML LIBRARY ─────────────────────────────────────────────────────
//
// The docs job takes no dependencies (`ci.yml` says so itself: every guard there was built with
// relative imports so the job needs no install), and `verify` runs from the repository root where
// no YAML parser is a dependency either. Adding one to read four dozen lines would be a new runtime
// dependency for the verifier — a cost out of all proportion to the question. The shape being read
// is narrow and fixed: `run: node scripts/<name>.mjs` inside one named job. Anything outside that
// shape is REPORTED, never guessed at.
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CI_FILE = ".github/workflows/ci.yml";

/** The job whose steps are unconditional. Named by its `name:` so a re-ordering cannot move it. */
export const DOCS_JOB_NAME = "Living-doc guards + script tests";

/**
 * Read the docs job's block out of the workflow.
 *
 * @returns {{lines: string[], indent: number}} the job's own lines, without its heading
 */
function docsJobLines(src) {
  const all = src.split("\n");
  const at = all.findIndex((l) => l.trim() === `name: ${DOCS_JOB_NAME}`);
  if (at < 0) return null;
  // The job's key sits one line above its `name:` at a shallower indent; its block ends at the next
  // line indented no deeper than that key.
  const nameIndent = all[at].length - all[at].trimStart().length;
  const keyIndent = nameIndent - 2;
  const out = [];
  for (let i = at + 1; i < all.length; i++) {
    const l = all[i];
    if (l.trim() === "") {
      out.push(l);
      continue;
    }
    const ind = l.length - l.trimStart().length;
    if (ind <= keyIndent) break;
    out.push(l);
  }
  return { lines: out, indent: nameIndent };
}

/**
 * What the docs job runs unconditionally.
 *
 * @param {string} [src] the workflow source, injectable for the tests
 * @returns {{scripts: string[], runsScriptSuite: boolean, conditional: number, problems: string[]}}
 *   `scripts` are repo-relative `scripts/*.mjs` paths, in the order CI runs them.
 */
export function ciUnconditional(src = readFileSync(join(ROOT, CI_FILE), "utf8")) {
  const job = docsJobLines(src);
  if (!job)
    return {
      scripts: [],
      runsScriptSuite: false,
      conditional: 0,
      problems: [
        `the job named "${DOCS_JOB_NAME}" was not found in ${CI_FILE} — this derivation is blind`,
      ],
    };

  const problems = [];
  const scripts = [];
  let runsScriptSuite = false;
  let conditional = 0;

  for (const line of job.lines) {
    const t = line.trim();
    // A CONDITIONAL step is not unconditional, and pretending otherwise would overstate what a
    // --premerge run covers. Counted and reported rather than skipped quietly.
    if (/^if:/.test(t)) conditional++;
    // `node --test` over discovered test files IS the script suite, which verify already owns.
    if (/node\s+--test/.test(t)) runsScriptSuite = true;
    for (const m of t.matchAll(/node\s+(scripts\/[A-Za-z0-9_.\-/]+\.mjs)/g)) {
      const p = m[1];
      if (!scripts.includes(p)) scripts.push(p);
    }
  }
  if (scripts.length === 0)
    problems.push(
      `no \`node scripts/*.mjs\` step was found in the "${DOCS_JOB_NAME}" job — a derivation that ` +
        `finds nothing must not be read as "CI runs nothing" (Lesson 187)`,
    );
  return { scripts, runsScriptSuite, conditional, problems };
}

/**
 * The GUARD IDS `verify` must force under `--premerge`, mapped from the derived script paths.
 *
 * The mapping is the guards' own `source`, so nothing here restates which script is which guard.
 * A CI step that maps to no guard is a PROBLEM, not a silent omission: it means CI runs something
 * `verify` has no way to run, and the operator is told rather than left with a quieter run.
 *
 * @param {object[]} guards resolved guards from `collect()`
 * @param {object} [derived] injectable for the tests
 * @returns {{ids: string[], problems: string[]}}
 */
export function premergeForcedIds(guards, derived = ciUnconditional()) {
  const problems = [...derived.problems];
  const bySource = new Map(guards.filter((g) => g.source).map((g) => [g.source, g.id]));
  const ids = [];
  for (const p of derived.scripts) {
    const id = bySource.get(p);
    if (!id) {
      problems.push(
        `${CI_FILE} runs \`node ${p}\` on every push and no guard declares it as its source, so ` +
          `\`--premerge\` cannot run it`,
      );
      continue;
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (derived.runsScriptSuite && !ids.includes("script-suite")) ids.push("script-suite");
  return { ids, problems };
}
