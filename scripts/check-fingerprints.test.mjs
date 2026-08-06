// ============================================================
// File:        scripts/check-fingerprints.test.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 1
//
// The guard is driven as a REAL PROCESS against a throwaway git repository, not imitated in-process.
// Every test is a SABOTAGE paired with the unsabotaged position, because a switch is tested by
// proving its two positions differ (L203) and a guard that has only ever passed has not been shown
// able to fail (L187).
//
// The MINT path is exercised with a cheap fake `reproduce` command. The real one costs two minutes;
// what needs testing is the comparison and its failure message, not the race engine.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-fingerprints.mjs");

const VALUE = "aaaabbbbccccdddd";
const OLD = "1111222233334444";

/** Prints VALUE and exits — a stand-in for a two-minute fingerprint script. */
const fakeReproduce = (v) => `node -e "console.log('${v}')"`;

function makeRepo({ record, doc, history, extra } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ra-fp2-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "reports"), { recursive: true });

  writeFileSync(
    join(root, "docs", "fingerprints.json"),
    JSON.stringify(
      record ?? {
        roles: {
          world: {
            value: VALUE,
            reproduce: fakeReproduce(VALUE),
            mintedOn: "abc1234",
            date: "2026-08-06",
          },
        },
        historyHomes: ["reports/"],
        machineExceptions: [],
      },
      null,
      2,
    ),
  );
  // A document that REFERENCES the record and carries no value — the shape this block enforces.
  writeFileSync(
    join(root, "docs", "THING.md"),
    doc ?? "The world fingerprint's value lives in docs/fingerprints.json.\n",
  );
  // History: a report may legitimately contain the current value.
  writeFileSync(
    join(root, "reports", "OLD-BLOCK.md"),
    history ?? `fp was \`${VALUE}\` that day.\n`,
  );
  if (extra)
    for (const [rel, body] of Object.entries(extra))
      writeFileSync(join(root, rel), body);

  // The guard reads `git ls-files`, so the fixture must be a real repository.
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  return root;
}

function run(root, ...extra) {
  const r = spawnSync(process.execPath, [GUARD, `--root=${root}`, ...extra], {
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function withRepo(opts, fn) {
  const root = makeRepo(opts);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ── the unsabotaged position ──────────────────────────────────────────────────────────────────

test("BASELINE: a record, a document that only REFERENCES it, and a report that cites it — PASS", () => {
  withRepo({}, (root) => {
    const r = run(root);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /0 stray copies/);
  });
});

// ── SABOTAGE 1: the owner's rule — a value pasted into a document ──────────────────────────────

test("SABOTAGE: pasting the CURRENT value into a document FAILS, and the message says what to do", () => {
  withRepo(
    { doc: `The current world is \`${VALUE}\`, obviously.\n` },
    (root) => {
      const r = run(root);
      assert.equal(r.code, 1);
      assert.match(
        r.err,
        /docs\/THING\.md contains the CURRENT world fingerprint/,
      );
      assert.match(r.err, /One truth lives in one place/);
    },
  );
});

test("CONSEQUENCE: an OLD value in the same document is fine — citing history is not a defect", () => {
  // This is the pair that makes the containment check honest. ONE-TRUTH-1 discarded a guard that
  // could not tell these apart; this one does not have to, because it only ever looks for CURRENT
  // values. Ablation targets and lineage narrative must stay legal.
  withRepo(
    { doc: `Setting it to 0 restores the pre-motion world \`${OLD}\`.\n` },
    (root) => {
      assert.equal(run(root).code, 0);
    },
  );
});

test("CONSEQUENCE: the same value in a declared HISTORY home passes, and outside one fails", () => {
  withRepo({ extra: { "docs/NOTES.md": `see \`${VALUE}\`\n` } }, (root) => {
    // reports/OLD-BLOCK.md already holds it and passes; docs/NOTES.md holds it and must not.
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /docs\/NOTES\.md/);
    assert.doesNotMatch(r.err, /reports\/OLD-BLOCK\.md/);
  });
});

test("A MACHINE EXCEPTION is honoured BY NAME, not by pattern", () => {
  const record = {
    roles: {
      world: {
        value: VALUE,
        reproduce: fakeReproduce(VALUE),
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    historyHomes: ["reports/"],
    machineExceptions: [
      { file: "docs/NOTES.md", reason: "a test reads this literal" },
    ],
  };
  withRepo(
    {
      record,
      extra: { "docs/NOTES.md": `${VALUE}\n`, "docs/OTHER.md": `${VALUE}\n` },
    },
    (root) => {
      const r = run(root);
      assert.equal(r.code, 1, "the un-excepted sibling must still fail");
      assert.match(r.err, /docs\/OTHER\.md/);
      assert.doesNotMatch(
        r.err,
        /docs\/NOTES\.md/,
        "the named exception must be silent",
      );
    },
  );
});

// ── SABOTAGE 2: the record edited without re-minting ───────────────────────────────────────────

test("SABOTAGE: --mint FAILS when the record disagrees with what the command produces", () => {
  const record = {
    roles: {
      // The record claims VALUE; the reproduce command produces OLD. That is exactly the state of a
      // record someone edited without re-minting.
      world: {
        value: VALUE,
        reproduce: fakeReproduce(OLD),
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    historyHomes: ["reports/"],
    machineExceptions: [],
  };
  withRepo({ record }, (root) => {
    assert.equal(
      run(root).code,
      0,
      "containment alone must still pass — that is the point of the split",
    );
    const r = run(root, "--mint");
    assert.equal(r.code, 1);
    assert.match(
      r.err,
      new RegExp(`the ENGINE says ${OLD}, the record says ${VALUE}`),
    );
  });
});

test("CONSEQUENCE: --mint PASSES when they agree, and says how many roles it re-minted", () => {
  withRepo({}, (root) => {
    const r = run(root, "--mint");
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /1 role\(s\) re-minted/);
  });
});

test("A BROKEN reproduce command FAILS loudly rather than being read as agreement", () => {
  const record = {
    roles: {
      world: {
        value: VALUE,
        reproduce: 'node -e "process.exit(3)"',
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    historyHomes: ["reports/"],
    machineExceptions: [],
  };
  withRepo({ record }, (root) => {
    const r = run(root, "--mint");
    assert.equal(r.code, 1);
    assert.match(r.err, /reproduce command FAILED/);
  });
});

test("THE DEFAULT RUN SAYS IT DID NOT CHECK THE ENGINE — the limit is printed, not buried", () => {
  withRepo({}, (root) => {
    assert.match(run(root).out, /Record NOT verified against the engine/);
  });
});

// ── the loud-failure rule ─────────────────────────────────────────────────────────────────────

test("LOUD FAILURE: zero roles, an unreadable record, and a role with no reproduce command", () => {
  withRepo({ record: { roles: {}, historyHomes: [] } }, (root) => {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /ZERO roles/);
  });
  withRepo({}, (root) => {
    const r = run(root, `--record=${join(root, "docs", "nope.json")}`);
    assert.equal(r.code, 1);
    assert.match(r.err, /cannot read the fingerprint record/);
  });
  const record = {
    roles: { world: { value: VALUE, mintedOn: "abc1234", date: "2026-08-06" } },
    historyHomes: [],
    machineExceptions: [],
  };
  withRepo({ record }, (root) => {
    assert.match(run(root).err, /does not name the command that reproduces it/);
  });
});

// ── the real repository ───────────────────────────────────────────────────────────────────────

test("THE REAL REPOSITORY holds NO copy of any current fingerprint outside the record", () => {
  const r = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 stray copies/);
  // Counts derived from the record, never typed: a literal here would fail for being right the
  // moment a role is added. (That happened in ONE-TRUTH-1 and is not repeated.)
  const record = JSON.parse(
    readFileSync(join(ROOT, "docs", "fingerprints.json"), "utf8"),
  );
  assert.match(
    r.stdout,
    new RegExp(`${Object.keys(record.roles).length} roles`),
  );
});
