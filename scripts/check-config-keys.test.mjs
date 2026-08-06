// ============================================================
// File:        scripts/check-config-keys.test.mjs
// Project:     RaceArena — DEV-MARKERS-1
//
// Fixture repositories on disk, because the guard walks a real directory tree and imports a real
// defaults module. Nothing is stubbed.
//
// THE SABOTAGE IS THE REAL DEFECT, reduced: a key read from `cameraConfig` with no entry in
// `DEFAULT_CAMERA_CONFIG`. That is exactly the state `highlightHeroes` was in — the checkbox saved,
// the value survived in storage, and the loader dropped it on every read.
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
  "check-config-keys.mjs",
);

const defaultsSrc = (keys) =>
  `export const DEFAULT_CAMERA_CONFIG = {\n${keys.map((k) => `  ${k}: false,`).join("\n")}\n};\n`;

/**
 * Build a fixture client tree. `files` maps a path under client/src to its contents.
 * `defaultKeys` are the keys DEFAULT_CAMERA_CONFIG will declare.
 */
const withTree = (defaultKeys, files, fn) => {
  const root = mkdtempSync(join(tmpdir(), "ra-ck-"));
  try {
    mkdirSync(join(root, "client/src/modules/storage"), { recursive: true });
    writeFileSync(
      join(root, "client/src/modules/storage/defaults.js"),
      defaultsSrc(defaultKeys),
    );
    for (const [rel, text] of Object.entries(files)) {
      const p = join(root, "client/src", rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const run = (root) => {
  const r = spawnSync(process.execPath, [GUARD, `--root=${root}`], {
    encoding: "utf8",
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

// ────────────────────────────────────────────────────────────
// SABOTAGE — the defect itself.
//   What breaks if I delete it: the guard could stop detecting anything, and every other test here
//     asserts a PASS, so all of them would still be green.
//   What goes unnoticed without it: a Dev Screen toggle that saves a value the renderer never sees —
//     which is how `highlightHeroes` sat broken until it was noticed BY EYE.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: a key read from cameraConfig with no default FAILS, naming key and file", () => {
  withTree(
    ["minRacersVisible"],
    {
      "screens/RaceScreen/renderRaceFrame.js":
        "draw(cameraConfig.highlightHeroes ?? false);\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /`highlightHeroes` is read from the camera config/);
      assert.match(out, /renderRaceFrame\.js/, "must name where it is read");
      assert.match(
        out,
        /SILENTLY DROPPED/,
        "must explain the mechanism, not just complain",
      );
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE PAIR (L203) — the fix must make it pass.
//   What breaks if I delete it: a guard that failed unconditionally would satisfy the sabotage test.
//   What goes unnoticed without it: a rule nobody can satisfy, which gets deleted.
// ────────────────────────────────────────────────────────────
test("CONSEQUENCE: the same key WITH a default passes", () => {
  withTree(
    ["minRacersVisible", "highlightHeroes"],
    {
      "screens/RaceScreen/renderRaceFrame.js":
        "draw(cameraConfig.highlightHeroes ?? false);\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /0 without a default/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE SECOND PATTERN — the Dev Screen writes keys too.
//   What breaks if I delete it: a checkbox could write a key nothing defaults and the guard would
//     only catch it if some other file also READ it.
//   What goes unnoticed without it: exactly half the defect — `highlightHeroes` was both written by
//     the Dev Screen and read by the renderer, and either side alone should be enough to fail.
// ────────────────────────────────────────────────────────────
test("A Dev Screen setter naming an undefaulted key also fails", () => {
  withTree(
    ["minRacersVisible"],
    {
      "screens/DevScreen/sections/CameraAdvancedSection.jsx":
        "import { DEFAULT_CAMERA_CONFIG } from '../../../modules/storage/defaults.js';\n" +
        "onChange={() => set('showGhostTrail', true)}\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /showGhostTrail/);
    },
  );
});

test("…but `set()` elsewhere is NOT treated as a camera key — the pattern is narrowed on purpose", () => {
  // `set('x', …)` is a common local helper name. If the guard matched it everywhere it would fire on
  // unrelated code, and a guard people learn to ignore is worse than a narrow one (R11).
  withTree(
    ["minRacersVisible"],
    {
      // A real read as well, so the guard has something to discover — otherwise its loud-failure
      // branch fires and this test would pass for the wrong reason.
      "modules/camera/thing.js": "use(cameraConfig.minRacersVisible);\n",
      "modules/someOtherThing.js":
        "const set = (k, v) => {}; set('notACameraKey', 1);\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.doesNotMatch(out, /notACameraKey/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE NAMED EXCEPTION.
//   What breaks if I delete it: `cameraConfig.js` in an import line reads as a key called `js`.
//   What goes unnoticed without it: a permanent false failure, which would get the guard disabled.
// ────────────────────────────────────────────────────────────
test("`cameraConfig.js` is the module filename, not a key", () => {
  withTree(
    ["minRacersVisible"],
    {
      "modules/thing.js":
        "// see cameraConfig.js for the loader\nimport x from './cameraConfig.js';\n" +
        "use(cameraConfig.minRacersVisible);\n", // a real key, so the guard has something to find
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.doesNotMatch(out, /`js`/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE (Lesson 187).
//   What breaks if I delete it: a moved directory or a changed pattern makes the guard scan nothing
//     and print a green line.
//   What goes unnoticed without it: the guard silently ceasing to guard — the no-op trap this
//     repository has paid for more than once.
// ────────────────────────────────────────────────────────────
test("ZERO source files, ZERO discovered keys, and an EMPTY defaults object all FAIL", () => {
  withTree(["minRacersVisible"], {}, (root) => {
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /scanned ZERO source files/);
  });

  withTree(
    ["minRacersVisible"],
    { "modules/thing.js": "const a = 1;\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /discovered ZERO camera-config keys/);
    },
  );

  withTree([], { "modules/thing.js": "draw(cameraConfig.x);\n" }, (root) => {
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /missing or empty/);
  });
});
