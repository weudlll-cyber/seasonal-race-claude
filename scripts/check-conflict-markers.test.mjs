// ============================================================
// File:        scripts/check-conflict-markers.test.mjs
// Project:     RaceArena — HOOK-CONFLICT-MARKERS-1 (2026-10-04)
//
// The guard run as the hook runs it (`--staged`) against a scratch git repository, so what is tested
// is the refusal the commit sees. Markers are built at run time (`"<".repeat(7)`) so this file holds
// no marker-shaped line of its own.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markerLines } from "./check-conflict-markers.mjs";

const GUARD = join(dirname(fileURLToPath(import.meta.url)), "check-conflict-markers.mjs");
const OURS = "<".repeat(7);
const MID = "=".repeat(7);
const THEIRS = ">".repeat(7);

/** A scratch repository with one commit, and the guard run against it. */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), "ra-markers-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir });
  g("init", "-q");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  writeFileSync(join(dir, "seed.md"), "seed\n");
  g("add", "seed.md");
  g("commit", "-q", "-m", "seed");
  const run = (...args) =>
    spawnSync(process.execPath, [GUARD, `--root=${dir}`, ...args], { encoding: "utf8" });
  const stage = (name, text) => {
    writeFileSync(join(dir, name), text);
    g("add", name);
  };
  return { dir, run, stage, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("a staged file with a conflict block is REFUSED, and the refusal names file and line", () => {
  const r = repo();
  try {
    r.stage("doc.md", `intro\n${OURS} HEAD\nmine\n${MID}\ntheirs\n${THEIRS} origin/master\n`);
    const out = r.run("--staged");
    assert.equal(out.status, 1, out.stdout);
    assert.match(out.stderr, /doc\.md:2/);
    assert.match(out.stderr, /doc\.md:4/);
    assert.match(out.stderr, /doc\.md:6/);
  } finally {
    r.done();
  }
});

test("a clean staged file passes", () => {
  const r = repo();
  try {
    r.stage("doc.md", "nothing to see\n");
    assert.equal(r.run("--staged").status, 0);
  } finally {
    r.done();
  }
});

test("the divider ALONE is refused: a lone `=======` line", () => {
  const r = repo();
  try {
    r.stage("doc.md", `a\n${MID}\nb\n`);
    assert.equal(r.run("--staged").status, 1);
  } finally {
    r.done();
  }
});

test("--staged reads the STAGED content: a marker only in the working tree does not refuse it", () => {
  const r = repo();
  try {
    r.stage("doc.md", "clean\n");
    writeFileSync(join(r.dir, "doc.md"), `${OURS} HEAD\n`); // after staging
    assert.equal(r.run("--staged").status, 0);
  } finally {
    r.done();
  }
});

test("look-alikes are not markers: eight characters, mid-line, inside backticks, a longer rule", () => {
  const text = [
    `${"=".repeat(8)}`,
    `${OURS}<`,
    `text ${OURS} HEAD`,
    "`" + OURS + "` in prose",
    `${MID} trailing words`,
  ].join("\n");
  assert.deepEqual(markerLines(text), []);
  assert.equal(markerLines(`${OURS}\n${THEIRS}\n`).length, 2, "a bare marker with no label counts");
});

test("full mode with no tracked files at all FAILS rather than passing on nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-markers-empty-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const out = spawnSync(process.execPath, [GUARD, `--root=${dir}`], { encoding: "utf8" });
    assert.equal(out.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
