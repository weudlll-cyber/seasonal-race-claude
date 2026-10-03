// ============================================================
// File:        scripts/pair-reach-census.test.mjs
// Project:     RaceArena — PAIR-REACH-SCOPE-1 (2026-10-03)
//
// pair-reach-census refuses a scope that names nothing. It is a race-hull driver, so it cannot use
// the shared refusal (`scripts/lib/trackScope.mjs`); its own check reads the registry it already
// loads (`loadTracks()`). These tests run the tool as an operator would and read its exit code and
// its stdout: a refusal is exit 2 with NOTHING on stdout, never an empty table and exit 0.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "pair-reach-census.mjs");
const run = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });

for (const [what, flag] of [
  ["an EMPTY scope", "--tracks="],
  ['"all", which is not a track', "--tracks=all"],
  ["a list with one unknown name", "--tracks=ice-track,no-such-track"],
]) {
  test(`refuses ${what}: exit 2, nothing on stdout, the refusal names the scope`, () => {
    const r = run(flag);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /pair-reach-census: --tracks=/);
  });
}

test("a valid list of TWO tracks runs both (it used to match nothing and exit 0)", () => {
  const r = run("--tracks=ice-track,dirt-oval", "--racers=4", "--samples=1", "--seconds=1");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^dirt-oval\s/m);
  assert.match(r.stdout, /^ice-track\s/m);
});
