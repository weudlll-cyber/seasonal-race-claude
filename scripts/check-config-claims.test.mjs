// ============================================================
// File:        scripts/check-config-claims.test.mjs
// Project:     RaceArena — CONFIG-TRUTH-1 stage 2
//
// The guard's own liveness, run against a REAL fixture repository — a temp directory with a real
// `git init`, a real `defaults.js` and real documents. The guard shells out to `git ls-files` and
// imports the defaults as a module, so a mocked filesystem would only prove the mock.
//
// THE TWO SABOTAGES THE BRIEF ASKED FOR ARE THE FIRST TWO TESTS, and they are a pair:
//   - paste a value into a document        -> MUST FAIL
//   - change a default, touch no document  -> MUST STILL PASS
// The second is the one that proves the rule is worth having: once documents carry no numbers,
// moving a default cannot make a document stale, because there is nothing to go stale.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  "check-config-claims.mjs",
);

const DEFAULTS = `
export const DEFAULT_CAMERA_CONFIG = { minRacersVisible: 3, glideDurationMs: 500 };
export const DEFAULT_RACE_DYNAMICS_CONFIG = { choreoOutcomeStart: 0.6 };
`;

/**
 * Build a fixture repo: real git, real defaults, the documents given as {name: text}.
 * Returns the root path. `run()` invokes the guard against it.
 */
const withRepo = (docs, fn, defaultsSrc = DEFAULTS) => {
  const root = mkdtempSync(join(tmpdir(), "ra-cc-"));
  try {
    mkdirSync(join(root, "client/src/modules/storage"), { recursive: true });
    writeFileSync(
      join(root, "client/src/modules/storage/defaults.js"),
      defaultsSrc,
    );
    mkdirSync(join(root, "docs"), { recursive: true });
    for (const [name, text] of Object.entries(docs)) {
      const p = join(root, name);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "t@t"],
      ["config", "user.name", "t"],
      ["add", "-A"],
    ])
      spawnSync("git", args, { cwd: root });
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const run = (root, ...args) => {
  const r = spawnSync(process.execPath, [GUARD, `--root=${root}`, ...args], {
    encoding: "utf8",
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

// ────────────────────────────────────────────────────────────
// SABOTAGE 1 — a value pasted into a document.
//   What breaks if deleted: the guard could stop failing entirely and every other test here would
//     still pass, because they all assert PASSES.
//   What goes unnoticed without it: exactly the defect this guard was built for — a number in a
//     sentence with no owner, which is how `choreoOutcomeStart` came to be documented as 0.5 in
//     four documents while 0.6 shipped.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: a config value pasted into a document FAILS, naming file, line and key", () => {
  withRepo(
    {
      "docs/GUIDE.md":
        "# Guide\n\nThe camera keeps `minRacersVisible` (3) in frame.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /docs\/GUIDE\.md:3/);
      assert.match(out, /minRacersVisible/);
      assert.match(out, /One truth lives in one place/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// SABOTAGE 2 — the pair, and the whole argument for the rule.
//   What breaks if deleted: nothing enforces that a default may move freely.
//   What goes unnoticed without it: a guard that quietly re-couples documents to source, so that
//     changing a default breaks the docs build — which is the failure the rule exists to end.
// ────────────────────────────────────────────────────────────
test("SABOTAGE PAIR: changing a default without touching documents STILL PASSES", () => {
  const doc = {
    "docs/GUIDE.md":
      "# Guide\n\nThe camera keeps `minRacersVisible` racers in frame; the value lives in `defaults.js`.\n",
  };
  withRepo(doc, (root) => {
    assert.equal(run(root).status, 0, "clean documents must pass");
  });
  // Same documents, a DIFFERENT default. Nothing in the document can go stale, because the
  // document states no number.
  withRepo(
    doc,
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /0 current claim\(s\)/);
    },
    DEFAULTS.replace("minRacersVisible: 3", "minRacersVisible: 5"),
  );
});

// ────────────────────────────────────────────────────────────
// A CORRECT COPY IS STILL A COPY.
//   What breaks if deleted: the guard could be narrowed to "wrong values only" and pass a correct
//     copy, which then rots the next time the default moves.
//   What goes unnoticed without it: the slow return of exactly this problem.
// ────────────────────────────────────────────────────────────
test("A value that MATCHES source still fails — a correct copy is a copy", () => {
  withRepo(
    { "docs/GUIDE.md": "# Guide\n\n`choreoOutcomeStart` = 0.6 today.\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /choreoOutcomeStart/);
      assert.doesNotMatch(out, /source says/, "no disagreement to report");
    },
  );
});

// ────────────────────────────────────────────────────────────
// HISTORY, both mechanisms.
//   What breaks if deleted: a dated changelog row or a diagnostic archive becomes unfixable except
//     by deleting its record.
//   What goes unnoticed without it: the guard would push people to destroy history to appease it —
//     the same failure mode L206 is about.
// ────────────────────────────────────────────────────────────
test("HISTORY: a dated row is allowed, and a self-declared HISTORICAL document is skipped whole", () => {
  withRepo(
    {
      "docs/CHANGELOG.md":
        "# Log\n\n| 2026-05-31 | raised `minRacersVisible` to 8 |\n",
      "docs/OLD.md":
        "<!-- HISTORICAL: 2026-05-14 — camera inventory taken before the corridor unit -->\n\n`minRacersVisible` was 8 here.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /1 dated row\(s\) allowed/);
      assert.match(out, /1 self-declared HISTORICAL/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE STATED LIMIT — prose is not in scope.
//   What breaks if deleted: the header could claim a limit the code no longer has.
//   What goes unnoticed without it: someone trusting the guard to check that the PROSE is true.
// ────────────────────────────────────────────────────────────
test("IT DOES NOT CHECK PROSE: a key named without a number passes, and it says so", () => {
  withRepo(
    {
      "docs/GUIDE.md":
        "# Guide\n\n`minRacersVisible` is the only override of the corridor guarantee, and it is enormous.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /does not check prose/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE (Lesson 187).
//   What breaks if deleted: the guard can scan nothing and print a green line.
//   What goes unnoticed without it: a rename or a moved directory silently disabling it — the
//     no-op trap this repository has already paid for twice.
// ────────────────────────────────────────────────────────────
test("ZERO DOCUMENTS and ZERO KEYS are FAILURES, not a quiet pass", () => {
  withRepo({}, (root) => {
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /scanned ZERO documents/);
  });

  withRepo(
    { "docs/GUIDE.md": "# Guide\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /ZERO scannable config keys/);
    },
    "export const DEFAULT_EMPTY = {};\n",
  );
});

// ────────────────────────────────────────────────────────────
// SCOPE — only living documents.
//   What breaks if deleted: the guard could creep into reports/ and demand the lab journal be
//     rewritten, which the append-only rule forbids.
//   What goes unnoticed without it: silent scope drift away from check-doc-links' definition.
// ────────────────────────────────────────────────────────────
test("SCOPE: the lab journal is out of scope — a value in reports/ does not fail", () => {
  withRepo(
    {
      "reports/night/OLD.md":
        "`minRacersVisible` = 3 on the day this was written.\n",
      "docs/GUIDE.md": "# Guide\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
    },
  );
});
