// ============================================================
// File:        scripts/check-writable.test.mjs
// Project:     RaceArena — MERGE-AND-GUARD-1 stage 6b
//
// The sabotage is a REAL Windows attribute on a REAL file in a REAL fixture repository — the exact
// state ten tracked files were found in. Nothing is stubbed, because a stub of a filesystem
// attribute would only prove the stub, and the whole point of this guard is that the condition is
// invisible to everything that merely reads.
//
// ON A NON-WINDOWS RUNNER the sabotage cannot be created at all, so those tests are SKIPPED rather
// than quietly passing — a green tick for a check that could not run is the no-op trap this
// repository has already paid for. The platform test below runs everywhere and asserts the guard
// says so itself.
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
  "check-writable.mjs",
);
const WINDOWS = process.platform === "win32";

const withRepo = (fn) => {
  const root = mkdtempSync(join(tmpdir(), "ra-w-"));
  try {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs/A.md"), "# A\n");
    writeFileSync(join(root, "docs/B.md"), "# B\n");
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

const setHidden = (root, rel) =>
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `$i = Get-Item -Force -LiteralPath '${rel}'; $i.Attributes = $i.Attributes -bor [IO.FileAttributes]::Hidden`,
    ],
    { cwd: root },
  );

// ────────────────────────────────────────────────────────────
// SABOTAGE — the real condition, reproduced.
//   What breaks if deleted: the guard could stop detecting anything and the clean-tree test would
//     still pass, because a guard that never fails passes it.
//   What goes unnoticed without it: ten tracked files sitting unwritable for months again, which is
//     what actually happened.
// ────────────────────────────────────────────────────────────
test(
  "SABOTAGE: a tracked file marked HIDDEN fails, and is named",
  { skip: WINDOWS ? false : "the Hidden attribute exists only on Windows" },
  () => {
    withRepo((root) => {
      assert.equal(run(root).status, 0, "the fixture must start clean");

      setHidden(root, "docs/A.md");
      const { status, out } = run(root);
      assert.equal(status, 1, "a hidden tracked file must fail");
      assert.match(out, /docs\/A\.md/);
      assert.match(out, /Hidden/);
      assert.match(out, /readable but NOT writable/);
      assert.match(
        out,
        /never appear in a diff/,
        "must say why it is invisible",
      );

      // THE REVERT, and it is also the fix path: --fix clears the attribute and the guard goes quiet.
      const fixed = run(root, "--fix");
      assert.equal(fixed.status, 0);
      assert.match(fixed.out, /cleared/);
      assert.equal(run(root).status, 0, "and the tree is clean again");
    });
  },
);

test(
  "IT DETECTS THE CONDITION THAT ACTUALLY BREAKS WRITES, not one it invented",
  { skip: WINDOWS ? false : "Windows-only condition" },
  () => {
    // The premise of the whole guard: reading works, writing does not. If this ever stops being
    // true, the guard is checking the wrong thing and this test says so.
    withRepo((root) => {
      setHidden(root, "docs/A.md");
      const probe = spawnSync(
        process.execPath,
        [
          "-e",
          `const fs=require('fs');const p='docs/A.md';` +
            `let read='no',write='no';` +
            `try{fs.readFileSync(p);read='yes'}catch{}` +
            `try{fs.writeFileSync(p,fs.readFileSync(p));write='yes'}catch{}` +
            `console.log(read+' '+write)`,
        ],
        { cwd: root, encoding: "utf8" },
      );
      assert.equal(
        probe.stdout.trim(),
        "yes no",
        "a hidden tracked file must still READ and must fail to WRITE — that is the premise",
      );
    });
  },
);

// ────────────────────────────────────────────────────────────
// THE PLATFORM STATEMENT — runs everywhere, including CI.
//   What breaks if deleted: the guard could silently "pass" on Linux and be read as evidence.
//   What goes unnoticed without it: a green CI tick standing in for a check that never ran, which
//     is exactly the no-op trap (Lesson 187).
// ────────────────────────────────────────────────────────────
test("IT NEVER PASSES QUIETLY: on a platform it cannot check, it says so", () => {
  withRepo((root) => {
    const { status, out } = run(root);
    assert.equal(status, 0);
    if (WINDOWS) {
      assert.match(out, /0 carrying a blocking attribute/);
      assert.match(out, /does NOT prove a write would succeed/);
    } else {
      assert.match(out, /SKIPPED/);
      assert.match(out, /NOT checked/);
      assert.match(out, /cannot speak for the owner's tree/);
    }
  });
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE (Lesson 187).
//   What breaks if deleted: an empty enumeration reads as a clean tree.
//   What goes unnoticed without it: running it outside a git repo and believing the green line.
// ────────────────────────────────────────────────────────────
test("ZERO TRACKED FILES is a FAILURE, not a clean tree", () => {
  const root = mkdtempSync(join(tmpdir(), "ra-w-empty-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /returned NOTHING/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
