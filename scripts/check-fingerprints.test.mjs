// ============================================================
// File:        scripts/check-fingerprints.test.mjs
// Project:     RaceArena — ONE-TRUTH-1 stage 4
//
// The guard is driven as a REAL PROCESS against a throwaway tree, not imitated in-process. Every
// test below is a SABOTAGE: it breaks one thing and asserts the guard notices. A guard that has
// only ever been run on a passing tree has not been shown to be able to fail (Lesson 187), and the
// switch is tested by proving its two positions differ (Lesson 203) — so each sabotage is paired
// with the unsabotaged run that passes.
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
const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  "check-fingerprints.mjs",
);

const VALUE = "aaaabbbbccccdddd";
const OTHER = "1111222233334444";

/** A minimal but REAL tree: a record, and one document that states the value. */
function makeTree({ record, doc } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ra-fp-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "docs", "fingerprints.json"),
    JSON.stringify(
      record ?? {
        roles: {
          world: {
            value: VALUE,
            script: "scripts/fingerprint-default.mjs",
            mintedOn: "abc1234",
            date: "2026-08-06",
          },
        },
        sites: [{ file: "docs/THING.md", role: "world", anchor: "Current: `" }],
        historyAllowed: [],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(root, "docs", "THING.md"),
    doc ?? `Current: \`${VALUE}\` is the world.\n`,
  );
  return root;
}

function run(root, ...extra) {
  const r = spawnSync(process.execPath, [GUARD, `--root=${root}`, ...extra], {
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function withTree(opts, fn) {
  const root = makeTree(opts);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ── the unsabotaged position ──────────────────────────────────────────────────────────────────

test("BASELINE: a record and a document that agree PASS", () => {
  withTree({}, (root) => {
    const r = run(root);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /1\/1 sites read/);
  });
});

// ── sabotage 1: the two directions of disagreement ────────────────────────────────────────────

test("SABOTAGE, doc side: a document carrying a STALE value fails, and both values are named", () => {
  withTree({ doc: `Current: \`${OTHER}\` is the world.\n` }, (root) => {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, new RegExp(`says ${OTHER}`));
    assert.match(r.err, new RegExp(`record says ${VALUE}`));
  });
});

test("SABOTAGE, record side: moving the RECORD makes the untouched document fail", () => {
  // The same disagreement from the other end. This is the direction that matters after a mint:
  // the new value lands in the record and every document is instantly, loudly, out of date.
  const record = {
    roles: {
      world: {
        value: OTHER,
        script: "s.mjs",
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    sites: [{ file: "docs/THING.md", role: "world", anchor: "Current: `" }],
    historyAllowed: [],
  };
  withTree({ record }, (root) => {
    assert.equal(run(root).code, 1);
    // ...and --fix resolves it in the record's favour, which is what "one home" means.
    assert.equal(run(root, "--fix").code, 0);
    assert.equal(run(root).code, 0);
  });
});

// ── sabotage 2: the site stops being checkable ────────────────────────────────────────────────

test("SABOTAGE: rewording prose so the ANCHOR is gone fails — it does not silently check nothing", () => {
  withTree({ doc: `The world is presently \`${VALUE}\`.\n` }, (root) => {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /is GONE/);
  });
});

test("SABOTAGE: an anchor that matches TWICE fails — it no longer identifies one value", () => {
  withTree(
    { doc: `Current: \`${VALUE}\` and also Current: \`${VALUE}\`.\n` },
    (root) => {
      const r = run(root);
      assert.equal(r.code, 1);
      assert.match(r.err, /matches 2 times/);
    },
  );
});

// ── sabotage 3: coverage — a new copy nobody wired up ─────────────────────────────────────────

test("SABOTAGE: a NEW file stating the current value, declared nowhere, fails", () => {
  withTree({}, (root) => {
    assert.equal(run(root).code, 0, "precondition: clean before the new file");
    writeFileSync(
      join(root, "docs", "NEWDOC.md"),
      `The world is \`${VALUE}\` today.\n`,
    );
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /neither a declared site nor declared history/);
  });
});

test("CONSEQUENCE: the same new file PASSES once it is declared as history", () => {
  // The pair to the test above: coverage is a routing question, not a ban. Declaring the file is
  // the fix, and it must actually work — otherwise the guard would push people to delete facts.
  const record = {
    roles: {
      world: {
        value: VALUE,
        script: "s.mjs",
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    sites: [{ file: "docs/THING.md", role: "world", anchor: "Current: `" }],
    historyAllowed: ["docs/NEWDOC.md"],
  };
  withTree({ record }, (root) => {
    writeFileSync(
      join(root, "docs", "NEWDOC.md"),
      `The world was \`${VALUE}\` back then.\n`,
    );
    assert.equal(run(root).code, 0);
  });
});

// ── sabotage 4: the loud-failure rule ─────────────────────────────────────────────────────────

test("LOUD FAILURE: a record with zero sites FAILS rather than passing with nothing to check", () => {
  const record = {
    roles: {
      world: {
        value: VALUE,
        script: "s.mjs",
        mintedOn: "abc1234",
        date: "2026-08-06",
      },
    },
    sites: [],
    historyAllowed: [],
  };
  withTree({ record }, (root) => {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /ZERO sites/);
  });
});

test("LOUD FAILURE: an unreadable record FAILS, and says the record is the home", () => {
  withTree({}, (root) => {
    const r = run(root, "--record=" + join(root, "docs", "nope.json"));
    assert.equal(r.code, 1);
    assert.match(r.err, /cannot read the fingerprint record/);
  });
});

test("A ROLE MUST CARRY ITS PROVENANCE — a value with no mint commit is not a record", () => {
  const record = {
    roles: { world: { value: VALUE, script: "s.mjs", date: "2026-08-06" } },
    sites: [{ file: "docs/THING.md", role: "world", anchor: "Current: `" }],
    historyAllowed: [],
  };
  withTree({ record }, (root) => {
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.err, /does not name the commit it was minted on/);
  });
});

// ── the real tree ─────────────────────────────────────────────────────────────────────────────

test("THE REAL REPOSITORY passes its own guard, and reads EVERY site the record declares", () => {
  // The counts are DERIVED from the record, not typed here. An earlier version of this test pinned
  // "17/17"; stage 5 declared two more sites and the test failed for being right. A literal that
  // has to be edited whenever the thing it describes grows is a maintenance tax, not a check.
  const record = JSON.parse(
    readFileSync(join(ROOT, "docs", "fingerprints.json"), "utf8"),
  );
  const roles = Object.keys(record.roles).length;
  const sites = record.sites.length;

  const r = spawnSync(process.execPath, [GUARD], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  // sites READ must equal sites DECLARED: a site skipped for any reason would show as a shortfall.
  assert.match(
    r.stdout,
    new RegExp(`${roles} roles, ${sites}/${sites} sites read`),
  );
});
