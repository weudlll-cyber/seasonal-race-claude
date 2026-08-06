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
//   - It classifies the FAILURE REASON but not the CAUSE. `timeout` says the attempt exceeded its
//     limit; it cannot tell you whether that was a slow machine, a real hang, or a test that is
//     simply too big. (This line used to read "it does not know WHY a test retried" — that became
//     FALSE when ONE-TRUTH-1 added the reason class, and the header went on claiming a blindness
//     the tool no longer had. A limits list that is not maintained is a lie with a good reputation.)
//   - It does not see retries that ended in FAILURE beyond the attempt count: a test that exhausted
//     its retries is reported by vitest as a failure, and this only adds how many attempts it took.
//   - It does not cover the `scripts/` suite (`node --test`), which has no retry mechanism at all.
//   - It does not persist across runs, so it cannot tell you a test retried yesterday too.
//   - It reports vitest's own `flaky` flag; it does not independently verify that a pass after a
//     retry is a real pass rather than a test that only passes when warm.
//   - It cannot split the DURATION per attempt — vitest 4 exposes only the test's total, so the
//     ledger prints the total and does not guess how the retries divided it.
// ============================================================

/**
 * THE REASON CLASS for one failed attempt. A retry count without a cause is not an artifact — this
 * is the difference between "the machine was busy" and "a result changed", and those have opposite
 * answers.
 *
 *   timeout     — the attempt exceeded its limit. A SCHEDULING fact, not a correctness one.
 *   assertion   — an expectation failed. With fixed seeds that means a RESULT MOVED; escalate.
 *   process     — spawn/permission/OS-level failure. Neither the test nor the machine's speed.
 *   error       — the test threw something else.
 *   unavailable — vitest recorded no error for this attempt. Printed as "reason unavailable",
 *                 NEVER as a blank: a blank reads as "no reason" rather than "not recorded".
 */
export function reasonClass(err) {
  if (!err) return "unavailable";
  const name = String(err.name ?? "");
  const msg = String(err.message ?? "");
  if (!name && !msg) return "unavailable";
  if (/timed out in \d+\s*ms/i.test(msg) || /timeout/i.test(name))
    return "timeout";
  if (
    /assertion/i.test(name) ||
    /^expected /i.test(msg) ||
    /toBe|toEqual|toMatch/.test(msg)
  )
    return "assertion";
  if (/spawn|ENOENT|EPERM|EACCES|EBUSY|0xC0000142|child process/i.test(msg))
    return "process";
  return "error";
}

/**
 * Per-ATTEMPT reasons for one test.
 *
 * WHAT IS AVAILABLE, PROBED RATHER THAN ASSUMED: `result().errors` holds ONE entry per FAILED
 * attempt, in order, so attempt N's reason is `errors[N]`. Per-attempt DURATION is NOT exposed
 * anywhere in the vitest 4 reporter API — only the test's total. Rather than invent a split, the
 * ledger prints the total and says nothing it cannot know.
 */
export function attemptReasons(errors, attempts) {
  const out = [];
  const failed = errors?.length ?? 0;
  for (let i = 0; i < attempts; i++) {
    const err = errors?.[i];
    // A passing test's LAST attempt has no error: it succeeded.
    const passedHere = i === attempts - 1 && failed < attempts;
    out.push({
      attempt: i + 1,
      status: passedHere ? "passed" : "failed",
      reason: passedHere ? "passed" : reasonClass(err),
      detail: err
        ? String(err.message ?? "")
            .split("\n")[0]
            .slice(0, 90)
        : "",
    });
  }
  return out;
}

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
        const res = typeof t.result === "function" ? t.result() : null;
        rows.push({
          file,
          name: t.fullName ?? "(unnamed test)",
          // retryCount is the number of RE-tries, so attempts is one more.
          attempts: retries + 1,
          state: res?.state ?? "unknown",
          flaky: !!d?.flaky,
          totalMs: d?.duration ?? null,
          attemptsDetail: attemptReasons(res?.errors, retries + 1),
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
    for (const r of rs) {
      const total =
        r.totalMs != null ? `, ${Math.round(r.totalMs)} ms total` : "";
      out.push(
        `      ${r.attempts} attempts, final ${r.state}${r.flaky ? " (flaky)" : ""}${total}: ${r.name}`,
      );
      for (const a of r.attemptsDetail ?? []) {
        const why =
          a.reason === "passed"
            ? "passed"
            : a.reason === "unavailable"
              ? "reason unavailable"
              : `${a.reason}${a.detail ? ` — ${a.detail}` : ""}`;
        out.push(`          attempt ${a.attempt}: ${a.status}, ${why}`);
      }
    }
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
