// ============================================================
// File:        scripts/retry-ledger-reporter.mjs
// Project:     RaceArena — NIGHT-TOOLS-1 stage A
//
// THE RETRY LEDGER. `vitest.config.js` sets `retry: 3`, so a test that fails twice and passes on the
// third attempt reports as a pass — indistinguishable from one that passed first time. That is the
// mute-instrument shape (Lesson 204) applied to the suite itself: the run knows something happened
// and says nothing. It already cost a real diagnosis — VERIFY-FAST-1's first concurrent run spent
// wall clock retrying a test that was failing for an environmental reason, and the retries were
// invisible in the summary.
//
// WHY A REPORTER AND NOT A `verify` WRAPPER — the decision, made alone and for two reasons:
//   1. ONLY VITEST KNOWS. `retryCount` lives on the task result. A wrapper sees stdout and an exit
//      code, so it would have to PARSE the human summary — an instrument reading another
//      instrument's prose, which this project has already been burned by.
//   2. CI DOES NOT GO THROUGH `verify`. `.github/workflows/ci.yml` runs `npm run test:coverage`
//      directly. A wrapper in `verify.mjs` would print nothing in CI, and the brief requires the
//      line to survive into what CI prints. A reporter is loaded by vitest itself, so it reaches
//      `npm test`, `npm run test:coverage`, and therefore both `verify` and CI.
// It lives in `scripts/` rather than `client/src/` deliberately: this block may not touch source,
// and a reporter is tooling.
//
// AN EXPLICIT ZERO LINE IS PRINTED WHEN NOTHING RETRIED. Silence must not be the signal — if the
// ledger is missing from a run, that is itself a defect (the reporter was dropped from the config),
// and a run that is silent because all was well would be indistinguishable from it.
//
// WHAT THIS LEDGER DOES **NOT** CHECK, stated here per the block's own safety bar:
//   - It does not know WHY a test retried. A timeout, a race and a genuine flake look identical.
//   - It does not see retries that ended in FAILURE beyond the attempt count: a test that exhausted
//     its retries is reported by vitest as a failure, and this only adds how many attempts it took.
//   - It does not cover the `scripts/` suite (`node --test`), which has no retry mechanism at all.
//   - It does not persist across runs, so it cannot tell you a test retried yesterday too.
//   - It reports vitest's own `flaky` flag; it does not independently verify that a pass after a
//     retry is a real pass rather than a test that only passes when warm.
//   - It counts ATTEMPTS, not wall clock: it cannot say how much time the retries cost.
// ============================================================

/**
 * The ledger rows for a finished run, from vitest 4's reporter API.
 *
 * THE SHAPE WAS PROBED, NOT ASSUMED — the first draft of this file used `onFinished(files)` and the
 * legacy task tree, and it printed nothing at all because neither exists in vitest 4. What is real:
 * `onTestRunEnd(modules)`, `module.children.allTests()`, and `testCase.diagnostic()` returning
 * `{ retryCount, flaky, duration, ... }`. A reporter that silently produces no output is the exact
 * failure this ledger exists to prevent, so it is worth saying how the shape was established.
 *
 * @returns {{file: string, name: string, attempts: number, state: string, flaky: boolean}[]}
 */
export function rowsFromModules(modules) {
  const rows = [];
  for (const m of modules ?? []) {
    let file = m?.moduleId ?? "(unknown file)";
    // Repo-relative if we can manage it; the absolute path is noise in a summary line.
    const cut = file.lastIndexOf("/src/");
    if (cut > 0) file = file.slice(cut + 1);
    let tests = [];
    try {
      tests = [...m.children.allTests()];
    } catch {
      continue;
    }
    for (const t of tests) {
      const d = typeof t.diagnostic === "function" ? t.diagnostic() : null;
      const retries = d?.retryCount ?? 0;
      if (retries > 0) {
        rows.push({
          file,
          name: t.fullName ?? "(unnamed test)",
          // retryCount is the number of RE-tries, so attempts is one more.
          attempts: retries + 1,
          state: t.result?.()?.state ?? "unknown",
          flaky: !!d?.flaky,
        });
      }
    }
  }
  return rows;
}

/** The printed ledger, as lines. Always non-empty: the zero case is a line, not silence. */
export function formatLedger(rows) {
  if (!rows.length)
    return [
      "RETRY LEDGER: 0 tests retried — every test passed on its first attempt.",
    ];
  const flaky = rows.filter((r) => r.flaky).length;
  const out = [
    `RETRY LEDGER: ${rows.length} test(s) needed more than one attempt` +
      (flaky
        ? ` (${flaky} eventually passed — vitest calls those FLAKY)`
        : "") +
      ".",
  ];
  const byFile = new Map();
  for (const r of rows) {
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push(r);
  }
  for (const [file, rs] of [...byFile].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    out.push(`  ${file}  — ${rs.length} test(s)`);
    for (const r of rs)
      out.push(
        `      ${r.attempts} attempts, final ${r.state}${r.flaky ? " (flaky)" : ""}: ${r.name}`,
      );
  }
  return out;
}

export default class RetryLedgerReporter {
  onTestRunEnd(modules) {
    const lines = formatLedger(rowsFromModules(modules));
    // stderr, so it survives `| tail` and `--silent` the way a warning does, and cannot be mistaken
    // for part of vitest's own summary.
    const NL = String.fromCharCode(10);
    process.stderr.write(NL + lines.join(NL) + NL);
  }
}
