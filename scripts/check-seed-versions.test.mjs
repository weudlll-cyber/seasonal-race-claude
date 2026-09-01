// ============================================================
// File:        scripts/check-seed-versions.test.mjs
// Project:     RaceArena — SEED-REDELIVERY-1
//
// THE GUARD'S OWN TEST, run against a REAL throwaway git repository rather than a mocked one,
// because the whole guard is a question about a diff and a mock of `git diff` would only prove
// that the mock works.
//
// ── IT USES `node:test`, AND THAT IS NOT A STYLE CHOICE ──────────────────────────────────────────
//
// `script-suite` runs `node --test scripts/*.test.mjs`. This file was written against VITEST when it
// was created, so under the suite it did not fail an assertion — it failed to IMPORT, with
// `Cannot find package 'vitest'`, and had therefore **never run in the suite that runs guard tests**
// from the day it landed. It went green only when invoked by hand with `npx vitest run`, which is
// not what CI or `npm run verify` does. Converted by IMAGE-STANDALONE-1, which found it by running
// the full verify rather than the file.
//
// THE TEST THAT MUST BE ABLE TO GO RED: "fails when a seed file changed and the version did not".
// Removing the version comparison from the guard makes it green, which was run and recorded in
// reports/evolution/SEED-REDELIVERY-1.md.
// ============================================================

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-seed-versions.mjs");

let repo;

const git = (...args) =>
execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

function manifest(version) {
return JSON.stringify(
  { units: { "tracks/alpha": { version, files: ["tracks/alpha.json", "backgrounds/alpha.jpg"] } } },
  null,
  2,
);
}

/**
 * Run the COPY of the guard that lives inside the throwaway repo.
 *
 * It must be the copy, not the original: the guard resolves its own ROOT from its file location,
 * so spawning the real one would have it check the REAL repository while pointed at the fixture —
 * which is how the first version of this test passed nothing and failed everything.
 */
function run(...extra) {
const r = spawnSync(process.execPath, [join(repo, "scripts", "check-seed-versions.mjs"), ...extra], {
  cwd: repo,
  encoding: "utf8",
});
return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// Module-level setup — `node --test` evaluates this before running any test in the file.
repo = mkdtempSync(join(os.tmpdir(), "ra-seedguard-"));
mkdirSync(join(repo, "scripts"), { recursive: true });
mkdirSync(join(repo, "server", "seeds", "tracks"), { recursive: true });
mkdirSync(join(repo, "server", "seeds", "backgrounds"), { recursive: true });
// The guard resolves its own ROOT from its file location, so it has to live in the fixture.
cpSync(GUARD, join(repo, "scripts", "check-seed-versions.mjs"));

writeFileSync(join(repo, "server/seeds/versions.json"), manifest(1));
writeFileSync(join(repo, "server/seeds/tracks/alpha.json"), '{"id":"alpha","name":"Alpha"}\n');
writeFileSync(join(repo, "server/seeds/backgrounds/alpha.jpg"), "jpeg-bytes");

git("init", "-q");
git("config", "user.email", "t@example.com");
git("config", "user.name", "T");
git("add", "-A");
git("commit", "-qm", "base");

after(() => rmSync(repo, { recursive: true, force: true }));

// ── check-seed-versions ──
test("passes on a clean tree", () => {
  const r = run();
  assert.match(r.out, /1 unit\(s\), 2 seed file\(s\)/);
  assert.equal(r.code, 0);
});

test("FAILS when a seed file changed and the version did not", () => {
  writeFileSync(join(repo, "server/seeds/tracks/alpha.json"), '{"id":"alpha","name":"Edited"}\n');
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /without a higher version/);
  assert.match(r.out, /tracks\/alpha/);
  git("checkout", "--", "server/seeds/tracks/alpha.json");
});

test("FAILS the same way when the BINARY half changed", () => {
  writeFileSync(join(repo, "server/seeds/backgrounds/alpha.jpg"), "different-bytes");
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /without a higher version/);
  git("checkout", "--", "server/seeds/backgrounds/alpha.jpg");
});

test("PASSES when the version was raised with the change", () => {
  writeFileSync(join(repo, "server/seeds/tracks/alpha.json"), '{"id":"alpha","name":"Edited"}\n');
  writeFileSync(join(repo, "server/seeds/versions.json"), manifest(2));
  const r = run();
  assert.equal(r.code, 0);
  git("checkout", "--", "server/seeds");
});

test("FAILS on a seed file that belongs to no unit", () => {
  writeFileSync(join(repo, "server/seeds/tracks/orphan.json"), "{}\n");
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /belong to no unit/);
  rmSync(join(repo, "server/seeds/tracks/orphan.json"));
});

test("FAILS on a unit naming a file that does not exist", () => {
  writeFileSync(
    join(repo, "server/seeds/versions.json"),
    JSON.stringify(
      { units: { "tracks/alpha": { version: 1, files: ["tracks/alpha.json", "backgrounds/alpha.jpg", "tracks/ghost.json"] } } },
      null,
      2,
    ),
  );
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /do not exist/);
  git("checkout", "--", "server/seeds/versions.json");
});

test("FAILS on an unreadable manifest rather than passing green", () => {
  writeFileSync(join(repo, "server/seeds/versions.json"), "{ not json");
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /missing or unreadable/);
  git("checkout", "--", "server/seeds/versions.json");
});

test("FAILS on a manifest with no units (Lesson 187)", () => {
  writeFileSync(join(repo, "server/seeds/versions.json"), JSON.stringify({ units: {} }));
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /declares no units/);
  git("checkout", "--", "server/seeds/versions.json");
});

test("declares its routing", () => {
  const r = run("--declare");
  assert.equal(r.code, 0);
  const d = JSON.parse(r.out.split("\n").find((l) => l.startsWith("{")));
  assert.equal(d.id, "check-seed-versions");
  assert.ok(d.blind.length > 0);
  assert.ok(d.dirs.includes("server/seeds/"));
});
