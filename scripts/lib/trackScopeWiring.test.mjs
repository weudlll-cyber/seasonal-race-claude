// ============================================================
// File:        scripts/lib/trackScopeWiring.test.mjs
// Project:     RaceArena — HARNESS-EMPTY-SCOPE-1
//
// WHAT THIS PROVES: that the one shared refusal in `trackScope.mjs` is actually REACHED by the
// tools that take `--tracks`, not only that it works when called. `trackScope.test.mjs` tests the
// helper through a fixture; this file tests the wiring, two ways:
//
//   1. A CENSUS. Every script under `scripts/` that reads a `tracks` flag must import
//      `lib/trackScope.mjs`. This is what catches the NEXT tool: the silent-zero idiom was written
//      independently by several authors, so a rule a new file must remember is a rule it will miss.
//      ★ ONE DERIVED EXCEPTION: a reader that is itself inside the RACE HULL (it imports
//      `raceCore.js` directly, so `engine-reach.mjs` counts its whole import closure). Wiring such a
//      tool would pull `trackScope.mjs` into the hull and make every later edit of the refusal a
//      race-reaching change with a fingerprint bill. The exception is computed from
//      `raceHull()`, never listed by hand, and the second test pins the property it protects.
//   2. END TO END. Real tools are spawned with the scopes that used to print a table over nothing
//      and exit 0 — `--tracks` omitted on a `-sum` analyser, `--tracks=all`, `--tracks=` — and must
//      now exit 2 with the refusal and NO table on stdout. Every case refuses before any race is
//      driven or any file is read, so each spawn costs the tool's import time only.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { raceHull } from "../engine-reach.mjs";

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(SCRIPTS, "..");

// ── 1. THE CENSUS ────────────────────────────────────────────────────────────

/** Every non-test `.mjs` under scripts/, as repo-relative forward-slash paths. */
function scriptFiles(dir = SCRIPTS) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...scriptFiles(p));
    else if (e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs")) {
      out.push(relative(ROOT, p).replace(/\\/g, "/"));
    }
  }
  return out;
}

// HOW A TOOL READS ITS `--tracks` FLAG, in the shapes this repository uses: a helper call with the
// key "tracks" (`arg("tracks", …)`, `argVal(…)`, `ARG(…)`), or a literal `"--tracks="` prefix match.
// A comment that merely mentions `--tracks=` does not match either shape, so prose is not counted.
const READS_TRACKS = /\b\w+\(\s*["']tracks["']|["']--tracks=["']/;

test("every script outside the race hull that reads --tracks imports the shared scope refusal", () => {
  const hull = new Set(raceHull().files);
  const readers = scriptFiles().filter(
    (f) =>
      f !== "scripts/lib/trackScope.mjs" &&
      !hull.has(f) &&
      READS_TRACKS.test(readFileSync(join(ROOT, f), "utf8"))
  );
  // A census that finds nothing is itself a silent zero; the tree has well over twenty such tools.
  assert.ok(readers.length >= 20, `census found only ${readers.length} --tracks readers`);
  const unwired = readers.filter(
    (f) => !/from\s+["'][./]*(lib\/)?trackScope\.mjs["']/.test(readFileSync(join(ROOT, f), "utf8"))
  );
  assert.deepEqual(
    unwired,
    [],
    `these tools take --tracks but do not use scripts/lib/trackScope.mjs: ${unwired.join(", ")}`
  );
});

// The property the exception above protects. If a race-hull driver ever imports the shared place,
// this fails and says why, instead of the hull growing silently.
test("the shared scope refusal stays OUTSIDE the race hull", () => {
  assert.ok(
    !raceHull().files.includes("scripts/lib/trackScope.mjs"),
    "scripts/lib/trackScope.mjs is in the race hull: a driver of raceCore.js imports it, so every " +
      "edit of the refusal now counts as a change that can move a race"
  );
});

// ── 2. END TO END ────────────────────────────────────────────────────────────

const runTool = (rel, args) =>
  spawnSync(process.execPath, [join(ROOT, rel), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });

const assertRefused = (r, what) => {
  assert.equal(r.status, 2, `${what}: expected exit 2, got ${r.status}\n${r.stderr}`);
  assert.match(r.stderr, /Refusing to run/, `${what}: no refusal on stderr`);
  // The defect was a full table over zero rows; a refusal must print no table at all.
  assert.doesNotMatch(r.stdout, /track\s{2,}/, `${what}: a table header reached stdout`);
};

// The founding case on master: an omitted --tracks on a `-sum` analyser printed three table headers
// and "0 of 0 mid-race frames clipped (NaN%)", and exited 0.
test("a -sum analyser with --tracks omitted refuses instead of printing empty tables", () => {
  assertRefused(runTool("scripts/diag/midrace-clip-sum.mjs", []), "midrace-clip-sum");
});

// On master this tool printed "no such track: all" on stderr, skipped the track, printed its table
// header over zero rows and exited 0. `all` is the name that has actually been typed.
test("company-bind-truth refuses --tracks=all instead of skipping it and exiting 0", () => {
  assertRefused(runTool("scripts/company-bind-truth.mjs", ["--tracks=all"]), "company-bind-truth");
});

// The private guard this tool had compared found-count to asked-count: 0 of 0 passed it.
test("company-spread-sweep refuses an empty --tracks= that its old private guard let through", () => {
  assertRefused(runTool("scripts/company-spread-sweep.mjs", ["--tracks="]), "company-spread-sweep");
});

// And the refusal does not fire on a good scope: the same analyser with a known name gets past the
// scope check and prints its table (its data is a separate question — no file is reported by name).
test("a known --tracks name passes the shared check and reaches the tool's own output", () => {
  const r = runTool("scripts/diag/midrace-clip-sum.mjs", [
    "--tracks=river-run",
    `--dir=${join(ROOT, "no-such-dir-harness-empty-scope")}`,
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /Refusing to run/);
  assert.match(r.stdout, /river-run/);
});
