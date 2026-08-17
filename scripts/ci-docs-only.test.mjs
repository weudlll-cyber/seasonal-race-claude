// ============================================================
// File:        scripts/ci-docs-only.test.mjs
// Project:     RaceArena — CI-DOCS-ONLY-1
//
// WHAT BREAKS IF THIS FILE IS DELETED: the predicate that decides whether CI runs the client and
// server suites stops being checked in the ONE direction that matters. A bug that makes it return
// `false` too often costs three minutes; a bug that makes it return `true` too often produces a
// GREEN RUN THAT TESTED NOTHING, on a SHA the ship ceremony then treats as verified. Both
// directions are asserted below, and the fail-open cases are asserted individually because each one
// is a separate way for the answer to be unknown.
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isDocPath, decide } from "./ci-docs-only.mjs";

describe("isDocPath — what counts as documentation", () => {
  test("docs/ and reports/ do", () => {
    assert.equal(isDocPath("docs/FAIRNESS.md"), true);
    assert.equal(isDocPath("reports/evolution/INDEX.md"), true);
    assert.equal(isDocPath("reports/night/captures/x.txt"), true);
  });

  test("a root markdown file does", () => {
    assert.equal(isDocPath("README.md"), true);
    assert.equal(isDocPath("CLAUDE.md"), true);
  });

  test("SOURCE DOES NOT, including markdown that is not at the root", () => {
    assert.equal(isDocPath("client/src/App.jsx"), false);
    assert.equal(isDocPath("server/src/app.js"), false);
    assert.equal(isDocPath("scripts/verify.mjs"), false);
    assert.equal(isDocPath("client/README.md"), false); // deliberately a client path
    assert.equal(isDocPath(".github/workflows/ci.yml"), false);
    assert.equal(isDocPath("package.json"), false);
  });

  test("a path that merely CONTAINS docs/ is not a docs path", () => {
    assert.equal(isDocPath("client/src/docs/thing.js"), false);
  });
});

describe("decide — the verdict", () => {
  test("all documentation → DOCS-ONLY", () => {
    const v = decide(["docs/A.md", "reports/night/B.md", "README.md"]);
    assert.equal(v.docsOnly, true);
    assert.match(v.reason, /all 3 changed path/);
  });

  test("ONE source file among many docs → FULL RUN, and it is named", () => {
    const v = decide(["docs/A.md", "reports/B.md", "client/src/x.js"]);
    assert.equal(v.docsOnly, false);
    assert.match(v.reason, /client\/src\/x\.js/);
  });

  // ── FAIL OPEN. Each of these is a different way of not knowing, and every one must run. ────────
  test("an EMPTY diff is not 'nothing to test' — it is FULL RUN", () => {
    assert.equal(decide([]).docsOnly, false);
  });

  test("a diff that could not be computed is FULL RUN, carrying the reason", () => {
    const v = decide([], { computed: false, why: "the base is the all-zero SHA" });
    assert.equal(v.docsOnly, false);
    assert.match(v.reason, /all-zero SHA/);
  });

  test("THE ONE WAY TO GET true: a computed, non-empty, entirely-documentation diff", () => {
    // Stated as a property rather than an instance: no other input shape may return true.
    const shapes = [
      { files: [], opts: {} },
      { files: [], opts: { computed: false, why: "x" } },
      { files: ["docs/A.md", "server/src/app.js"], opts: {} },
      { files: ["package-lock.json"], opts: {} },
    ];
    for (const s of shapes) assert.equal(decide(s.files, s.opts).docsOnly, false);
    assert.equal(decide(["docs/A.md"]).docsOnly, true);
  });
});
