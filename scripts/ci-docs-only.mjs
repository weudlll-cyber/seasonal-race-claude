// ============================================================
// File:        scripts/ci-docs-only.mjs
// Project:     RaceArena — CI-DOCS-ONLY-1
//
// IS THIS PUSH DOCUMENTATION ONLY? Prints `true` or `false`, and always prints WHY.
//
// ── WHAT IT IS FOR ───────────────────────────────────────────────────────────────────────────────
// CI runs three jobs in parallel on every push. Measured on real runs, the client job spends
// **2m51s** in `npm run test:coverage` and the whole run's wall clock is whatever the slowest job
// takes. A documentation-only push therefore costs the owner ~3.5 minutes of waiting for a suite
// that cannot have been affected — and he waits, because each ship waits for green before the next
// piece starts.
//
// ── THE ONE RULE, AND WHY IT IS THIS NARROW ──────────────────────────────────────────────────────
// A push is documentation-only when EVERY changed path is under `docs/`, under `reports/`, or is a
// markdown file at the repository root. Nothing else qualifies. No per-tree cleverness, no
// "client/** did not change so skip the client" — one predicate a person can check by eye.
//
// The narrow rule is the point. A per-tree filter has to be RIGHT about every indirect dependency
// (does a client test read a root file? does `shared/` reach both trees?), and being wrong produces
// a GREEN RUN THAT EXAMINED NOTHING — the exact defect class this repository has paid for more than
// once. A docs-only predicate cannot make that mistake: if anything outside those three places
// moved, everything runs.
//
// ── FAIL OPEN, ALWAYS ────────────────────────────────────────────────────────────────────────────
// Every uncertainty resolves to `false` (= run everything) and says so: no base commit, an all-zero
// base (first push or a branch being created), a force push whose base is gone, a git failure, an
// empty file list, or a `workflow_dispatch` with no range at all. The only way to get `true` is a
// diff that was successfully computed and is entirely documentation.
//
// ── WHAT IT DOES NOT DECIDE ──────────────────────────────────────────────────────────────────────
// It does not decide whether the AUDIT GATES run. They always run, in both trees, on every push.
// Their result is not determined by the diff — a HIGH advisory can appear upstream on a day nobody
// pushed anything — so skipping them would break the rule this whole script is built to respect.
// They cost 1 second each; the tests cost minutes.
//
// Usage:  node scripts/ci-docs-only.mjs            # prints `true`/`false` on stdout, reason on stderr
//         BASE_SHA=<sha> HEAD_SHA=<sha> node scripts/ci-docs-only.mjs
// ============================================================

import { execFileSync } from "node:child_process";

const ZERO = "0000000000000000000000000000000000000000";

/** A path that cannot affect any test, lint, format check or build. */
export function isDocPath(p) {
  if (p.startsWith("docs/")) return true;
  if (p.startsWith("reports/")) return true;
  // Repo-root markdown only — `client/README.md` is still a client path by this rule, deliberately:
  // being over-inclusive here costs a test run, being under-inclusive costs a silent green.
  if (/^[^/]+\.md$/.test(p)) return true;
  return false;
}

/**
 * @returns {{docsOnly: boolean, reason: string, files: string[]}}
 */
export function decide(files, { computed = true, why = "" } = {}) {
  if (!computed) return { docsOnly: false, reason: why, files: [] };
  if (!files.length)
    return {
      docsOnly: false,
      reason: "the diff came back EMPTY, which this script does not treat as 'nothing to test'",
      files: [],
    };
  const nonDoc = files.filter((f) => !isDocPath(f));
  if (nonDoc.length)
    return {
      docsOnly: false,
      reason: `${nonDoc.length} of ${files.length} changed path(s) are not documentation, first: ${nonDoc.slice(0, 5).join(", ")}`,
      files,
    };
  return {
    docsOnly: true,
    reason: `all ${files.length} changed path(s) are under docs/, reports/ or a root *.md`,
    files,
  };
}

function changedFiles(base, head) {
  if (!base || !head) return { computed: false, why: "no BASE_SHA/HEAD_SHA in the environment" };
  if (base === ZERO)
    return { computed: false, why: "the base is the all-zero SHA (first push or new branch)" };
  try {
    const out = execFileSync("git", ["diff", "--name-only", `${base}..${head}`], {
      encoding: "utf8",
    });
    return {
      computed: true,
      files: out.split("\n").map((s) => s.trim()).filter(Boolean),
    };
  } catch (err) {
    return {
      computed: false,
      why: `git could not compute ${base}..${head} — ${err?.message?.split("\n")[0] ?? "unknown"}`,
    };
  }
}

// Run only as a CLI, so the test can import the pure halves above.
if (process.argv[1] && process.argv[1].endsWith("ci-docs-only.mjs")) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  const got = changedFiles(base, head);
  const verdict = decide(got.files ?? [], { computed: got.computed, why: got.why });

  console.error(`ci-docs-only: ${verdict.docsOnly ? "DOCS-ONLY" : "FULL RUN"} — ${verdict.reason}`);
  if (verdict.files.length) {
    console.error("  changed paths:");
    for (const f of verdict.files.slice(0, 40)) console.error(`    ${f}`);
    if (verdict.files.length > 40)
      console.error(`    … and ${verdict.files.length - 40} more`);
  }
  console.log(verdict.docsOnly ? "true" : "false");
}
