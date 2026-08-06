// ============================================================
// retry-ledger-reporter.test.mjs — NIGHT-TOOLS-1 stage A, consequence test
//
// Run: node --test scripts/retry-ledger-reporter.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: the ledger could silently stop counting — reading the wrong field,
// or dropping nested tasks — and every run would report "0 tests retried", which is exactly the
// silence the ledger exists to end. The failure would look like good news.
//
// WHAT GOES UNNOTICED IF IT IS MISSING: a vitest upgrade that renames `retryCount`. Nothing else in
// the repo reads that field, so nothing else would fail.
//
// THE CONSEQUENCE TEST (safety bar 1) is the third case: the same tree with the retry data REMOVED
// must produce a different ledger. Without that pair, a reporter hard-coded to print the retry text
// would pass every other assertion here.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsFromModules, formatLedger } from "./retry-ledger-reporter.mjs";

/**
 * A vitest-4-shaped module: `children.allTests()` of TestCase-likes with `diagnostic()`.
 * Modelled on the real shape, which was probed rather than assumed — see the reporter's header.
 */
const mod = (moduleId, tests) => ({
  moduleId,
  children: {
    allTests: () =>
      tests.map(
        ([fullName, retryCount, state = "passed", flaky = retryCount > 0]) => ({
          fullName,
          result: () => ({ state }),
          diagnostic: () => ({
            retryCount,
            flaky,
            duration: 1,
            slow: false,
            repeatCount: 0,
          }),
        }),
      ),
  },
});

test("a run with no retries prints an explicit ZERO line, never silence", () => {
  const rows = rowsFromModules([
    mod("a.test.js", [
      ["one", 0],
      ["two", 0],
    ]),
  ]);
  assert.equal(rows.length, 0);
  const lines = formatLedger(rows);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /RETRY LEDGER: 0 tests retried/);
});

test("a retried test is named, with its file, its ATTEMPT count and its final state", () => {
  const rows = rowsFromModules([
    mod("flaky.test.js", [
      ["ok", 0],
      ["shaky", 2],
    ]),
  ]);
  assert.equal(rows.length, 1);
  // Asserted FIELD BY FIELD, not as a whole-object deepEqual. The row gained `attemptsDetail` and
  // `totalMs` in stage 2 and a deepEqual broke on that addition — an instance assertion that objects
  // to honest growth, which is the shape this project keeps replacing with property assertions.
  assert.equal(rows[0].file, "flaky.test.js");
  assert.equal(rows[0].name, "shaky");
  assert.equal(rows[0].attempts, 3); // 2 retries = 3 attempts; the off-by-one that would matter
  assert.equal(rows[0].state, "passed");
  assert.equal(rows[0].flaky, true);
  const text = formatLedger(rows).join("\n");
  assert.match(text, /flaky\.test\.js/);
  assert.match(text, /3 attempts/);
  assert.match(text, /shaky/);
});

test("CONSEQUENCE: the same tree WITHOUT the retry data produces the zero line instead", () => {
  // The pair that makes the test above mean something. If the reporter were hard-coded to print a
  // retry, or read a field that is always truthy, this case would still report a retry and fail.
  const withRetry = formatLedger(
    rowsFromModules([mod("flaky.test.js", [["shaky", 2]])]),
  ).join("\n");
  const without = formatLedger(
    rowsFromModules([mod("flaky.test.js", [["shaky", 0]])]),
  ).join("\n");
  assert.notEqual(withRetry, without);
  assert.match(withRetry, /1 test\(s\) needed more than one attempt/);
  assert.match(without, /0 tests retried/);
});

test("a test that exhausted its retries and FAILED is still counted, with its state", () => {
  const rows = rowsFromModules([
    mod("bad.test.js", [["doomed", 3, "failed", false]]),
  ]);
  assert.equal(rows[0].attempts, 4);
  assert.equal(rows[0].state, "failed");
});

test("MULTIPLE modules are aggregated — one file's retries must not hide another's", () => {
  // `allTests()` already flattens nesting inside a module, so that is vitest's job, not this
  // reporter's. What IS this reporter's job is the loop across modules, and that is what is tested.
  const rows = rowsFromModules([
    mod("a.test.js", [["one", 1]]),
    mod("b.test.js", [
      ["two", 0],
      ["three", 2],
    ]),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.file),
    ["a.test.js", "b.test.js"],
  );
  const text = formatLedger(rows).join(String.fromCharCode(10));
  assert.match(text, /a\.test\.js/);
  assert.match(text, /b\.test\.js/);
});

test("a module whose tests cannot be read is SKIPPED, not fatal", () => {
  // A reporter that throws takes the whole run's exit code with it, turning a reporting problem
  // into a false test failure — strictly worse than the silence it was built to end.
  const broken = {
    moduleId: "x.test.js",
    children: {
      allTests: () => {
        throw new Error("nope");
      },
    },
  };
  assert.doesNotThrow(() =>
    rowsFromModules([broken, mod("ok.test.js", [["t", 1]])]),
  );
  assert.equal(
    rowsFromModules([broken, mod("ok.test.js", [["t", 1]])]).length,
    1,
  );
});

test("missing or malformed results do not crash the ledger", () => {
  const odd = {
    moduleId: "odd.test.js",
    children: { allTests: () => [{ fullName: "no diagnostic" }] },
  };
  assert.doesNotThrow(() => rowsFromModules([odd]));
  assert.equal(rowsFromModules([odd]).length, 0);
  assert.equal(rowsFromModules(undefined).length, 0);
});

// ── THE DISCONNECTION SABOTAGE (ONE-TRUTH-1 stage 1b) ─────────────────────────────────────────
//
// The sabotages in NIGHT-TOOLS-1 broke the ledger's COUNTING. This one breaks its CONNECTION, which
// is the defect the ledger exists for and the one the night block never demonstrated: with the
// reporter absent from vitest.config.js, a run that retried is byte-identical to one that did not.
//
// WHAT BREAKS IF THIS IS DELETED: the reporter could be dropped from the config — by a merge, by a
// vitest upgrade rewriting `reporters`, by anyone tidying — and every run would go back to hiding
// retries, with nothing to notice. That is precisely how the suite spent months not saying so.
//
// WHAT GOES UNNOTICED IF IT IS MISSING: the difference between "no test retried" and "nobody is
// looking". Those two produce the same silence, and only this test tells them apart.

test("DISCONNECTION: with no reporter, a retried run is INDISTINGUISHABLE from a clean one", () => {
  // Simulate the two runs as vitest would report them WITHOUT the ledger: the default reporter
  // shows counts and states, and retryCount appears nowhere in them.
  const summaryWithout = (mods) =>
    mods
      .flatMap((m) => [...m.children.allTests()])
      .map((t) => `${t.fullName}:${t.result().state}`)
      .join("|");

  const clean = [
    mod("t.test.js", [
      ["a", 0],
      ["b", 0],
    ]),
  ];
  const retried = [
    mod("t.test.js", [
      ["a", 0],
      ["b", 2],
    ]),
  ]; // b needed three attempts

  // THE DEFECT, stated as an assertion: without the ledger the two runs look the same.
  assert.equal(summaryWithout(clean), summaryWithout(retried));

  // THE CONSEQUENCE PAIR: with the ledger they do not. If this half ever matched, the ledger would
  // be decorative and the test above would be describing the shipped behaviour, not a defect.
  assert.notEqual(
    formatLedger(rowsFromModules(clean)).join("|"),
    formatLedger(rowsFromModules(retried)).join("|"),
  );
});

test("DISCONNECTION: the ledger is what carries the difference, not the pass/fail state", () => {
  // Both runs PASS. A guard keyed on exit status could never separate them; only the ledger can.
  const clean = [mod("t.test.js", [["b", 0]])];
  const retried = [mod("t.test.js", [["b", 3]])];
  for (const m of [clean, retried])
    for (const t of m[0].children.allTests())
      assert.equal(t.result().state, "passed");
  assert.match(formatLedger(rowsFromModules(retried)).join(" "), /4 attempts/);
  assert.match(
    formatLedger(rowsFromModules(clean)).join(" "),
    /0 tests retried/,
  );
});

// ── RETRIES DISABLED IS ITS OWN SENTENCE (ONE-TRUTH-2 stage 2) ─────────────────────────────────

test("DISABLED: with retry 0 the ledger says the mechanism is OFF, not that nothing retried", () => {
  const lines = formatLedger([], 0);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /RETRY LEDGER: DISABLED/);
  assert.match(lines[0], /A first-attempt failure fails the suite/);
  // The two wordings must not be confusable — that is the whole point of having both.
  assert.doesNotMatch(lines[0], /0 tests retried/);
});

test("CONSEQUENCE: the SAME empty row set with retries ENABLED prints the zero line instead", () => {
  // L203 in one pair: identical input, different config, different sentence. Without this, DISABLED
  // could have been printed unconditionally and nobody would know.
  const lines = formatLedger([], 3);
  assert.match(
    lines[0],
    /0 tests retried — every test passed on its first attempt/,
  );
  assert.doesNotMatch(lines[0], /DISABLED/);
});

test("An UNKNOWN retry config falls back to counting, never to claiming DISABLED", () => {
  // If the reporter cannot read the config, saying "DISABLED" would be an invention. Counting is
  // the honest default: it describes what was observed rather than what was configured.
  assert.match(formatLedger([], undefined)[0], /0 tests retried/);
});
