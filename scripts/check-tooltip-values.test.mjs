// ============================================================
// File:        scripts/check-tooltip-values.test.mjs
// Project:     RaceArena — NIGHT-2026-09-26 PIECE 2
//
// The guard's own liveness against a REAL fixture: a temp directory carrying a
// `client/src/screens/DevScreen/sections/` tree with one section source. The guard shells no
// commands and imports nothing from the fixture, but it walks the sections directory, so a mocked
// filesystem would only prove the mock.
//
// The three sabotages, deliberately narrow:
//   1. a stated default in a tooltip                          -> MUST FAIL
//   2. the same claim on a dated line                         -> MUST PASS
//   3. no sections at all                                     -> MUST FAIL LOUDLY (Lesson 187)
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
  "check-tooltip-values.mjs",
);

const SECTIONS_REL = "client/src/screens/DevScreen/sections";

const withRepo = (sectionFiles, fn) => {
  const root = mkdtempSync(join(tmpdir(), "ra-tv-"));
  try {
    mkdirSync(join(root, SECTIONS_REL), { recursive: true });
    for (const [name, text] of Object.entries(sectionFiles)) {
      const p = join(root, SECTIONS_REL, name);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
};

const run = (root, ...args) => {
  const r = spawnSync(process.execPath, [GUARD, `--root=${root}`, ...args], {
    encoding: "utf8",
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

// ────────────────────────────────────────────────────────────
// SABOTAGE 1 — a stated default in a tooltip.
//   What breaks if deleted: the guard could stop failing entirely and every other test here would
//     still pass, because they all assert PASSES.
//   What goes unnoticed without it: exactly the defect this guard was built for — a number in a
//     tooltip that will drift when defaults.js moves and that nothing else checks.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: a stated default in a tooltip FAILS, naming file, line and shape", () => {
  withRepo(
    {
      "Fake.jsx":
        'export const F = () => <InfoTooltip text="Some tuning knob. Default: 67%" />;\n',
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /Fake\.jsx:1/);
      assert.match(out, /Default N/);
      assert.match(out, /One truth lives in one place/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// SABOTAGE 2 — the dated exception.
//   What breaks if deleted: a historical row would be flagged as a current claim, which would push
//     writers to rewrite records that are correctly HISTORY at the point of use.
//   What goes unnoticed without it: nothing about the guard's own rule, but the discipline the
//     sibling `check-config-claims` already applies would be lost by asymmetry.
// ────────────────────────────────────────────────────────────
test("PASS: a stated default on a line carrying YYYY-MM-DD is history and is allowed", () => {
  withRepo(
    {
      "Fake.jsx":
        '// AIM-ROOM-1: SHIPPED at 360 px since 2026-09-02. The key stays so it is revertible.\n' +
        'export const F = () => <div />;\n',
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0);
      assert.match(out, /0 current claim/);
      assert.match(out, /1 dated row/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// SABOTAGE 3 — the empty scan.
//   What breaks if deleted: a run against a repository that had no sections would pass silently,
//     which is the exact Lesson 187 failure the guard exists to make loud.
//   What goes unnoticed without it: a repo reorganisation that moved DevScreen sections would take
//     the guard offline without a signal.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: zero section files FAILS loudly", () => {
  const root = mkdtempSync(join(tmpdir(), "ra-tv-empty-"));
  try {
    // No sections directory at all.
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /scanned ZERO section files/);
    assert.match(out, /Lesson 187/);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

// ────────────────────────────────────────────────────────────
// PASS: a clean tooltip is not flagged.
// ────────────────────────────────────────────────────────────
test("PASS: a tooltip that states no default is unflagged", () => {
  withRepo(
    {
      "Fake.jsx":
        'export const F = () => <InfoTooltip text="Some tuning knob that describes its effect and states no number." />;\n',
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0);
      assert.match(out, /0 current claim/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// PASS: --declare emits the GUARD contract (required for verify's routing).
// ────────────────────────────────────────────────────────────
test("--declare emits the guard's routing contract", () => {
  const r = spawnSync(process.execPath, [GUARD, "--declare"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  const decl = JSON.parse(r.stdout);
  assert.equal(decl.id, "check-tooltip-values");
  assert.ok(decl.dirs.includes("client/src/screens/DevScreen/sections/"));
  assert.ok(Array.isArray(decl.blind) && decl.blind.length > 0);
});
