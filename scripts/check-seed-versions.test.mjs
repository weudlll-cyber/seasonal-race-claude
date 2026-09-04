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
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
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

// ── THE ARTWORK RULE's baseline (ARTWORK-DIGEST-1) ────────────────────────────────────────────
// The guard now also digests `client/public/assets/racers/` and fails loudly if that directory is
// absent or empty — a run that cannot see must break the build. So the fixture carries one asset
// and its record, which also exercises the rule's happy path on every test in this file.
mkdirSync(join(repo, "client", "public", "assets", "racers"), { recursive: true });
writeFileSync(join(repo, "client/public/assets/racers/alpha.png"), "png-bytes");
writeFileSync(
  join(repo, "client/public/assets/racers/digests.json"),
  JSON.stringify(
    {
      files: {
        "alpha.png": createHash("sha256").update("png-bytes").digest("hex"),
      },
    },
    null,
    2,
  ) + "\n",
);

// WATCH-BACKGROUNDS-1 (2026-09-04) added a SECOND watched directory here, the track backgrounds, and
// DROP-DEAD-BACKGROUNDS-1 removed it the same day — the owner wanted the picture the game already
// uses in every case, so that directory holds no artwork and is no longer an artwork directory. The
// fixture followed. The rule's zero-files and missing-directory refusals are UNCHANGED and are still
// exercised below; only the list of directories shrank.

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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE ARTWORK RULE (ARTWORK-DIGEST-1)
//
// SABOTAGE — the founding incident, reduced. On 2026-09-03 an accidentally-run script overwrote
// NINE tracked spritesheets and every check in the repository stayed green. What makes this the
// right sabotage rather than a geometry one: the bad run produced the SAME frame size and only the
// PIXELS changed, so nothing about dimensions could have caught it.
// ══════════════════════════════════════════════════════════════════════════════════════════════

test("SABOTAGE: an artwork file whose BYTES changed fails, naming the file and both digests", () => {
  writeFileSync(join(repo, "client/public/assets/racers/alpha.png"), "overwritten-by-a-stray-script");
  const r = run();
  assert.equal(r.code, 1, "changed artwork must break the build");
  // WATCH-BACKGROUNDS-1: the message now names WHICH directory disagreed, because there are two.
  assert.match(r.out, /the artwork under .* does not match its record/);
  assert.match(r.out, /CHANGED  alpha\.png/);
  assert.match(r.out, /recorded [0-9a-f]{12}….*now [0-9a-f]{12}…/);
  assert.match(
    r.out,
    /--record-artwork/,
    "and must name the one command that re-records, or re-recording becomes harder than deleting the rule",
  );
  assert.match(r.out, /git checkout --/, "and the way back");
  git("checkout", "--", "client/public/assets/racers/alpha.png");
});

test("CONSEQUENCE: restoring the bytes makes it green again", () => {
  const r = run();
  assert.equal(r.code, 0, r.out);
  // DROP-DEAD-BACKGROUNDS-1: ONE watched directory again, one asset in it.
  assert.match(r.out, /1 hand-made asset\(s\) match their record/);
  assert.match(r.out, /assets\/racers/);
});

test("a NEW artwork file in no record fails — a record that lists nothing cannot object", () => {
  writeFileSync(join(repo, "client/public/assets/racers/beta.png"), "new-art");
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /NEW      beta\.png/);
  rmSync(join(repo, "client/public/assets/racers/beta.png"));
});

test("a RECORDED file that vanished fails too", () => {
  const png = join(repo, "client/public/assets/racers/alpha.png");
  const keep = readFileSync(png);
  rmSync(png);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /ZERO image files|MISSING  alpha\.png/);
  writeFileSync(png, keep);
});

test("--record-artwork re-records, and re-recording is the ONLY thing needed", () => {
  writeFileSync(join(repo, "client/public/assets/racers/alpha.png"), "a-deliberate-new-drawing");
  assert.equal(run().code, 1, "first it objects");
  const rec = run("--record-artwork");
  assert.equal(rec.code, 0, rec.out);
  assert.match(rec.out, /recorded 1 file\(s\)/);
  assert.equal(run().code, 0, "and then it is quiet — one command, no version, no second edit");
  git("checkout", "--", "client/public/assets/racers");
});

test("LOUD FAILURE: a missing or empty artwork directory FAILS (Lesson 187)", () => {
  const dir = join(repo, "client/public/assets/racers");
  const png = join(dir, "alpha.png");
  const keep = readFileSync(png);
  rmSync(png);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /ZERO image files/);
  assert.match(r.out, /Lesson 187/);
  writeFileSync(png, keep);

  const r2 = run("--artwork-root=client/public/assets/nowhere");
  assert.equal(r2.code, 1);
  assert.match(r2.out, /does not exist/);
});

test("LOUD FAILURE: an unreadable record FAILS rather than reporting the artwork unchanged", () => {
  const rec = join(repo, "client/public/assets/racers/digests.json");
  const keep = readFileSync(rec);
  writeFileSync(rec, "{ not json");
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /cannot read the artwork record/);
  assert.doesNotMatch(r.out, /match their record/);
  writeFileSync(rec, keep);
});
