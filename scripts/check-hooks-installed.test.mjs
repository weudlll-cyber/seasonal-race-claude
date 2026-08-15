// ============================================================
// File:        scripts/check-hooks-installed.test.mjs
// Project:     RaceArena — HOOK-TRACKED-1
//
// Against real fixture repositories (real `git init`, real `core.hooksPath`, real files on disk),
// because the guard asks git a question and looks at a directory. Nothing here is mocked.
//
// THIS SUITE IS WHAT CI ACTUALLY VERIFIES ABOUT THE HOOKS. The guard itself SKIPS under CI — a
// runner makes no commits, so it cannot have the property — so if these tests did not exist, CI
// would say nothing at all about hook installation. They put all three broken states in front of
// the guard on a machine that can never be in any of them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "check-hooks-installed.mjs");
const SETUP = join(HERE, "setup-hooks.mjs");

/**
 * A throwaway repository, optionally with `.githooks/pre-commit` and a hooksPath.
 * `CI` is stripped from the environment: on a runner it is set, and the guard would skip every
 * case below and the suite would prove nothing while passing.
 */
const withRepo = ({ hooksPath, hookFile = true }, fn) => {
  const root = mkdtempSync(join(tmpdir(), "ra-hooks-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    if (hookFile) {
      mkdirSync(join(root, ".githooks"), { recursive: true });
      writeFileSync(join(root, ".githooks/pre-commit"), "#!/usr/bin/env sh\nexit 0\n");
    }
    if (hooksPath) spawnSync("git", ["config", "core.hooksPath", hooksPath], { cwd: root });
    const env = { ...process.env };
    delete env.CI;
    const r = spawnSync(process.execPath, [GUARD, `--root=${root}`], { encoding: "utf8", env });
    return fn({ code: r.status, out: (r.stdout ?? "") + (r.stderr ?? ""), root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

// DELETE THIS and the guard's whole reason for existing goes untested: a FRESH CLONE has no
// hooksPath at all, which is the state every new checkout starts in and the one that is completely
// silent — git runs .git/hooks, finds nothing, and commits succeed.
test("UNSET hooksPath — a fresh clone — FAILS and names the one command", () => {
  withRepo({ hooksPath: null }, ({ code, out }) => {
    assert.equal(code, 1, "an unhooked checkout must fail");
    assert.match(out, /UNSET/);
    assert.match(out, /npm run hooks:install/, "it must say how to fix it, not only that it is wrong");
  });
});

// DELETE THIS and a stale `.husky/_` — or any personal override — would pass, which is the exact
// configuration this repository was in before HOOK-TRACKED-1.
test("hooksPath pointing SOMEWHERE ELSE FAILS and says where", () => {
  withRepo({ hooksPath: ".husky/_" }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /\.husky\/_/, "it must name the wrong path so the reader can see it");
    assert.match(out, /not "\.githooks"/);
  });
});

// DELETE THIS and the SILENT state goes unguarded — hooksPath correct, directory gone. That is
// precisely what HOOK-SILENT-1 found in a worktree, and it is the case a configuration check alone
// would pass.
test("hooksPath correct but the DIRECTORY missing FAILS", () => {
  withRepo({ hooksPath: ".githooks", hookFile: false }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /does not exist in this checkout/);
    assert.match(out, /HOOK-SILENT-1/);
  });
});

// DELETE THIS and a guard that never passes could ship — uninstallable, and the three sabotage
// tests above would not notice. This is the other half of proving it in both directions.
test("RESTORED: hooksPath set and the hook present PASSES", () => {
  withRepo({ hooksPath: ".githooks" }, ({ code, out }) => {
    assert.equal(code, 0, `a correctly hooked checkout must pass — got:\n${out}`);
    assert.match(out, /hooks ARE in effect/);
  });
});

// DELETE THIS and the guard could report a clean result about a directory that is not a repository
// at all — the shape this codebase has already shipped twice, where success meant "never looked".
test("not a git work tree FAILS rather than reporting the hooks are fine", () => {
  const root = mkdtempSync(join(tmpdir(), "ra-nogit-"));
  try {
    const env = { ...process.env };
    delete env.CI;
    const r = spawnSync(process.execPath, [GUARD, `--root=${root}`], { encoding: "utf8", env });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not a git work tree/);
    assert.match(r.stderr, /must not say it looked/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// DELETE THIS and the CI decision becomes unenforced: a later edit could make the guard ASSERT in
// CI, where it would fail every run for a correct reason that means nothing — or pass quietly,
// which is worse. The skip must stay a skip, and it must stay loud.
test("under CI it SKIPS, says so, and exits 0", () => {
  withRepo({ hooksPath: null }, ({ root }) => {
    const r = spawnSync(process.execPath, [GUARD, `--root=${root}`], {
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    });
    assert.equal(r.status, 0, "CI must not fail on a property it cannot have");
    assert.match(r.stdout, /SKIPPED/);
    assert.match(r.stdout, /makes no commits/, "the skip must state its reason, not just skip");
  });
});

// DELETE THIS and the setup command could start pointing git at a directory that is not there —
// producing the exact silent state it exists to prevent, while looking like success. A setup that
// configures a lie is worse than no setup at all.
test("setup REFUSES to configure hooks that do not exist, and writes NOTHING", () => {
  const root = mkdtempSync(join(tmpdir(), "ra-hooks-empty-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    const r = spawnSync(process.execPath, [SETUP, `--root=${root}`], { encoding: "utf8" });
    assert.equal(r.status, 1, "it must refuse, not configure");
    assert.match(r.stderr, /does not exist/);
    assert.match(r.stderr, /Refusing/);
    // And it must not have written the config on its way out.
    const cfg = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" });
    assert.notEqual(cfg.status, 0, "a refusal must leave core.hooksPath unset");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// DELETE THIS and the setup command could stop being idempotent — running it twice would report a
// change that did not happen, which is the same class of lie as reporting success silently.
test("setup is IDEMPOTENT and says so on the second run", () => {
  const first = spawnSync(process.execPath, [SETUP], { encoding: "utf8" });
  assert.equal(first.status, 0);
  const second = spawnSync(process.execPath, [SETUP], { encoding: "utf8" });
  assert.equal(second.status, 0);
  assert.match(second.stdout, /already \.githooks — unchanged/);
  assert.match(second.stdout, /hooks: in effect/);
});

// DELETE THIS and nothing checks that verify's router knows about this guard. An undeclared guard
// is never run by the router, and an always-on guard that is not always on is not a guard.
test("it declares itself as ALWAYS-ON, with a non-empty blind list", () => {
  const r = spawnSync(process.execPath, [GUARD, "--declare"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const d = JSON.parse(r.stdout);
  assert.equal(d.id, "check-hooks-installed");
  assert.equal(d.everything, true, "being unhooked is a property of the CHECKOUT, not of the diff");
  assert.ok(d.blind.length > 0);
});
