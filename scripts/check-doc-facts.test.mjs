// ============================================================
// File:        scripts/check-doc-facts.test.mjs
// Project:     RaceArena — MERGE-AND-GUARD-1 stage 5
//
// Against a real fixture repository (real `git init`, real FAIRNESS.md, real documents), because the
// guard shells out to `git ls-files` and reads its threshold from a file.
//
// THE TEST THAT MATTERS MOST IS "THE GUARD HAS NO OPINION": change the number in FAIRNESS.md and the
// guard follows it. That is what makes FAIRNESS.md the home rather than the guard being a second one.
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
  "check-doc-facts.mjs",
);

const FAIRNESS = (n = 70) =>
  `# FAIRNESS\n\nThe operational gate: **band-reach ≥ ${n}%** (overall zone-success rate).\n`;

const withRepo = (docs, fn, fairness = FAIRNESS()) => {
  const root = mkdtempSync(join(tmpdir(), "ra-df-"));
  try {
    mkdirSync(join(root, "docs"), { recursive: true });
    if (fairness !== null)
      writeFileSync(join(root, "docs/FAIRNESS.md"), fairness);
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
// SABOTAGE — the threshold restated somewhere else.
//   What breaks if deleted: the guard could stop failing and every other test here still passes,
//     because the rest assert passes.
//   What goes unnoticed without it: the gate moving while a dozen documents quote the old number —
//     the defect the whole stage exists for.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: the threshold restated outside FAIRNESS.md FAILS, naming file and line", () => {
  withRepo(
    {
      "docs/GUIDE.md":
        "# Guide\n\nA change ships if band-reach ≥ 70% on every track.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /docs\/GUIDE\.md:3/);
      assert.match(out, /lives in docs\/FAIRNESS\.md/);
      assert.match(
        out,
        /R11/,
        "must point at the rule that says the guard may be wrong",
      );
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE PAIR (L203) — the shape the rule actually wants must PASS.
//   What breaks if deleted: a guard that failed unconditionally would satisfy every FAIL test.
//   What goes unnoticed without it: a rule nobody can comply with, which gets deleted.
// ────────────────────────────────────────────────────────────
test("CONSEQUENCE: naming the gate WITHOUT the number passes", () => {
  withRepo(
    {
      "docs/GUIDE.md":
        "# Guide\n\nA change ships if band-reach clears the gate ([FAIRNESS.md](FAIRNESS.md)).\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /restated in 0 place\(s\)/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE HOME OWNS IT, AND THE GUARD HAS NO OPINION.
//   What breaks if deleted: the guard could hardcode 70 and become a SECOND home for the number —
//     the exact thing this stage is against.
//   What goes unnoticed without it: moving the gate in FAIRNESS.md and having the guard still
//     enforce the old value everywhere.
// ────────────────────────────────────────────────────────────
test("THE GUARD HAS NO OPINION: change the number in FAIRNESS.md and it follows", () => {
  const doc = {
    "docs/GUIDE.md": "# Guide\n\nShips at band-reach ≥ 75% per track.\n",
  };
  withRepo(doc, (root) => {
    assert.equal(
      run(root).status,
      0,
      "75 is not the gate while the home says 70",
    );
  });
  withRepo(
    doc,
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1, "…and it IS once the home says 75");
      assert.match(out, /threshold/i);
    },
    FAIRNESS(75),
  );
});

// ────────────────────────────────────────────────────────────
// HISTORY, and THE YIELD — the two ways a sentence keeps its number.
//   What breaks if deleted: a dated measurement or an essential quotation becomes unfixable except
//     by damaging it.
//   What goes unnoticed without it: the guard silently pushing people to falsify true sentences,
//     which is the failure stage 5(d) is entirely about.
// ────────────────────────────────────────────────────────────
test("A DATED line keeps its number, and so does a document that declares itself HISTORICAL", () => {
  withRepo(
    {
      "docs/LOG.md":
        "# Log\n\n| 2026-05-31 | band-reach ≥ 70% held on every track |\n",
      "docs/OLD.md":
        "<!-- HISTORICAL: 2026-05-14 — a sweep taken before the gate moved -->\n\nband-reach ≥ 70% then.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /2 exemption\(s\)/);
    },
  );
});

test("THE GUARD YIELDS to a sentence whose SUBJECT is the threshold — keyed on the sentence, not a line number", () => {
  // The real repository has two of these. The mechanism is asserted here so it cannot quietly stop
  // working and start demanding those sentences be rewritten.
  withRepo(
    {
      "docs/SIM.md":
        '# Sim\n\n> **Gate methodology.** A hard "band-reach ≥70% per track" gate is a coin-flip near 70%.\n',
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /yielded at/);
      assert.match(out, /the point/);
    },
  );
});

test("THE YIELD IS NOT A BLANK CHEQUE: the same file fails on a DIFFERENT sentence", () => {
  // If the exemption were keyed on the filename, this would pass and the guard would be blind to
  // every future restatement in SIM.md.
  withRepo(
    {
      "docs/SIM.md":
        "# Sim\n\nA change ships if band-reach ≥ 70% on every track.\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1, out);
      assert.match(out, /docs\/SIM\.md:3/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE (Lesson 187).
//   What breaks if deleted: the guard can find no home, or no documents, and print a green line.
//   What goes unnoticed without it: a renamed FAIRNESS.md silently disabling the whole check.
// ────────────────────────────────────────────────────────────
test("NO HOME, NO THRESHOLD IN IT, and NO DOCUMENTS are all FAILURES", () => {
  withRepo(
    { "docs/GUIDE.md": "# Guide\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /cannot read the fairness threshold/);
    },
    null,
  );

  withRepo(
    { "docs/GUIDE.md": "# Guide\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /no .band-reach/);
    },
    "# FAIRNESS\n\nFairness matters, and this file forgot to say how much.\n",
  );
});
