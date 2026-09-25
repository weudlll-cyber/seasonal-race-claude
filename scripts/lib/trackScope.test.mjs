// ============================================================
// File:        scripts/lib/trackScope.test.mjs
// Project:     RaceArena — NIGHT-2026-09-26 PIECE 4
//
// The refusal is one home behind two doors: resolveTrackScope for the main tools that iterate
// geos, resolveTrackScopeIds for the diag tools that iterate ids and look each up per iteration.
// Both must refuse an empty or unknown scope and both must return a valid one unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const HELPER_URL = pathToFileURL(join(HERE, "trackScope.mjs")).href;

// A tiny fixture harness that imports the helper and calls one of the two entry points, so we can
// assert the exit and stderr shape without depending on a real diag tool.
const FIXTURE = `
import { resolveTrackScope, resolveTrackScopeIds } from ${JSON.stringify(HELPER_URL)};
const all = [{ id: "space-sprint" }, { id: "river-run" }];
const mode = process.argv[2];
if (mode === "geos-unknown") {
  resolveTrackScope({ tool: "fixture", arg: "nope", all });
} else if (mode === "geos-empty") {
  resolveTrackScope({ tool: "fixture", arg: null, all: [] });
} else if (mode === "geos-valid") {
  const r = resolveTrackScope({ tool: "fixture", arg: "space-sprint", all });
  console.log("geos", r.length, r[0].id);
} else if (mode === "ids-unknown") {
  resolveTrackScopeIds({ tool: "fixture", ids: ["nope"], all });
} else if (mode === "ids-empty") {
  resolveTrackScopeIds({ tool: "fixture", ids: [], all });
} else if (mode === "ids-valid") {
  const r = resolveTrackScopeIds({ tool: "fixture", ids: ["river-run"], all });
  console.log("ids", r.length, r[0]);
} else if (mode === "ids-no-tracks-at-all") {
  resolveTrackScopeIds({ tool: "fixture", ids: ["river-run"], all: [] });
}
`;

const withFixture = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "ra-ts-"));
  try {
    const p = join(dir, "fixture.mjs");
    writeFileSync(p, FIXTURE);
    return fn(p);
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
};

const run = (fixturePath, mode) =>
  spawnSync(process.execPath, [fixturePath, mode], { encoding: "utf8" });

// ── the SECOND door (the one this piece adds) ────────────────────────────────
test("resolveTrackScopeIds refuses an unknown id with exit 2 and names it", () => {
  withFixture((p) => {
    const r = run(p, "ids-unknown");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no such track: nope/);
    assert.match(r.stderr, /this repository has: space-sprint, river-run/);
    assert.match(r.stderr, /There is no "all"/);
  });
});

test("resolveTrackScopeIds refuses an empty ids array with exit 2", () => {
  withFixture((p) => {
    const r = run(p, "ids-empty");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no track at all/);
  });
});

test("resolveTrackScopeIds refuses when no tracks exist at all with exit 2", () => {
  withFixture((p) => {
    const r = run(p, "ids-no-tracks-at-all");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no tracks exist at all/);
  });
});

test("resolveTrackScopeIds returns the validated ids for a valid scope", () => {
  withFixture((p) => {
    const r = run(p, "ids-valid");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^ids 1 river-run/);
  });
});

// ── the ORIGINAL door still behaves ──────────────────────────────────────────
test("resolveTrackScope still refuses an unknown --tracks arg", () => {
  withFixture((p) => {
    const r = run(p, "geos-unknown");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no such track: nope/);
  });
});

test("resolveTrackScope still refuses when the tracks dir is empty", () => {
  withFixture((p) => {
    const r = run(p, "geos-empty");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no tracks exist at all/);
  });
});

test("resolveTrackScope still returns the selected geo for a valid --tracks arg", () => {
  withFixture((p) => {
    const r = run(p, "geos-valid");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^geos 1 space-sprint/);
  });
});
