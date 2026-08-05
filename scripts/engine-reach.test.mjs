// ============================================================
// engine-reach.test.mjs — proof-of-live for the mint tripwire's trigger (VERIFY-COST-1)
//
// Run: node --test scripts/engine-reach.test.mjs
//
// The tripwire now triggers on a COMPUTED set rather than a folder, which is only an improvement if
// the computation cannot quietly shrink. These tests are the sabotage: they feed the walker a race
// core with a NEW import and require the closure to grow, because a trigger that stops growing is a
// trigger that stops firing.
//
// ONE TEST PER PROPERTY, not per file. Asserting the nineteen members by name would fail on every
// honest refactor and teach the next person to re-bless the list without reading it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  engineReach,
  importSpecifiers,
  hasDynamicImport,
} from "./engine-reach.mjs";

test("the real closure reaches the engine, and reaches it THROUGH a dependency", () => {
  const { files } = engineReach();
  // A direct import of raceCore: if this is missing the walk is not reading the real file.
  assert.ok(
    files.includes("client/src/modules/raceBehavior.js"),
    "raceBehavior.js",
  );
  // NOT a direct import — reached only via another engine input. This is the property the old
  // ENGINE_INPUT_MODULES list does not have, and the whole reason for computing a closure.
  assert.ok(
    files.includes("client/src/modules/autoSpriteScale.js"),
    "autoSpriteScale.js",
  );
  assert.ok(files.length > 10, `closure suspiciously small: ${files.length}`);
});

test("the closure EXCLUDES presentation code — otherwise it saves nothing", () => {
  const { files } = engineReach();
  const camera = files.filter((f) => f.includes("/modules/camera/"));
  // lapUtils is the one camera file the engine genuinely reads; anything else would mean the
  // closure has swallowed the camera and the trigger is the blunt one again under a new name.
  assert.deepEqual(camera, ["client/src/modules/camera/lapUtils.js"]);
  assert.ok(
    !files.some((f) => f.includes("/screens/")),
    "no screen code should be reachable",
  );
});

test("SABOTAGE: a new engine import makes the closure GROW", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-"));
  try {
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "leaf.js"), "export const a = 1;\n");
    writeFileSync(join(dir, "sub", "added.js"), "export const b = 2;\n");
    writeFileSync(join(dir, "core.js"), "import { a } from './leaf.js';\n");
    const before = engineReach(join(dir, "core.js")).files;
    writeFileSync(
      join(dir, "core.js"),
      "import { a } from './leaf.js';\nimport { b } from './sub/added.js';\n",
    );
    const after = engineReach(join(dir, "core.js")).files;
    assert.equal(
      after.length,
      before.length + 1,
      "the new import must appear in the closure",
    );
    assert.ok(after.some((f) => f.endsWith("sub/added.js")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SABOTAGE: a TRANSITIVE import is followed, not just the direct one", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-"));
  try {
    writeFileSync(join(dir, "deep.js"), "export const c = 3;\n");
    writeFileSync(join(dir, "mid.js"), "import { c } from './deep.js';\n");
    writeFileSync(
      join(dir, "core.js"),
      "import './mid.js';\nimport { c } from './mid.js';\n",
    );
    const { files } = engineReach(join(dir, "core.js"));
    assert.ok(
      files.some((f) => f.endsWith("deep.js")),
      "two hops must be followed",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the dynamic-import detector can fire — the completeness claim is checkable", () => {
  assert.equal(hasDynamicImport("const m = await import('./x.js');"), true);
  assert.equal(hasDynamicImport("import { a } from './x.js';"), false);
  // ...and the real closure currently contains none, which is what makes a static walk complete.
  assert.deepEqual(engineReach().dynamic, []);
});

test("the specifier parser ignores bare package imports", () => {
  const specs = importSpecifiers(
    "import a from 'react';\nimport b from './local.js';\n",
  );
  assert.deepEqual(specs, ["./local.js"]);
});
