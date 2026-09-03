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

// ── RULE C's baseline: one Dev Screen control that CAN represent its value ────────────────────────
// Rule C fails loudly when it finds no Dev Screen at all or no control it can resolve (Lesson 187),
// so every fixture that is meant to reach the older rule's verdict carries one satisfiable control.
// Its defaults live in their own tiny module rather than in DEFAULT_CAMERA_CONFIG, so that the
// `defaultsSrc` shape the other tests depend on — every key `false` — is left exactly as it was.
const RULE_C_HOME = "modules/ruleCFixtureConfig.js";
const ruleCFiles = (min, max, value = "fixtureValue", extra = "") => ({
  // The OLDER rule exits before Rule C runs if it discovers no camera key at all, so every tree that
  // is meant to reach a Rule C verdict has to carry one real, defaulted read.
  "modules/cameraRead.js": "use(cameraConfig.minRacersVisible);\n",
  [RULE_C_HOME]: `export const DEFAULT_FIXTURE_CONFIG = { fixtureValue: 5, fixtureMs: 8000 };\n`,
  "screens/DevScreen/sections/FixtureSection.jsx":
    `import { DEFAULT_FIXTURE_CONFIG } from '../../../${RULE_C_HOME}';\n` +
    `export default function FixtureSection({ cfg }) {\n` +
    `  return (\n` +
    `    <input\n` +
    `      type="number"\n` +
    `      min={${min}}\n` +
    `      max={${max}}\n` +
    `      step={1}\n` +
    `      value={${value}}\n` +
    `    />\n` +
    `  );\n` +
    `}\n` +
    extra,
});
const OK_CONTROL = ruleCFiles(0, 10, "cfg.fixtureValue ?? DEFAULT_FIXTURE_CONFIG.fixtureValue");

/**
 * Build a fixture client tree. `files` maps a path under client/src to its contents.
 * `defaultKeys` are the keys DEFAULT_CAMERA_CONFIG will declare.
 * `bare` omits Rule C's baseline control — only for the test that asserts an EMPTY tree fails.
 */
const withTree = (defaultKeys, files, fn, { bare = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ra-ck-"));
  try {
    mkdirSync(join(root, "client/src/modules/storage"), { recursive: true });
    writeFileSync(
      join(root, "client/src/modules/storage/defaults.js"),
      defaultsSrc(defaultKeys),
    );
    for (const [rel, text] of Object.entries(bare ? files : { ...OK_CONTROL, ...files })) {
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
  withTree(
    ["minRacersVisible"],
    {},
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /scanned ZERO source files/);
    },
    { bare: true },
  );

  withTree(
    ["minRacersVisible"],
    { "modules/thing.js": "const a = 1;\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /discovered ZERO camera-config keys/);
    },
    // bare, because Rule C's baseline carries a camera read on purpose — and this case is precisely
    // the one where there must be none.
    { bare: true },
  );

  withTree([], { "modules/thing.js": "draw(cameraConfig.x);\n" }, (root) => {
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /missing or empty/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RULE C — a control's bounds must contain the value its key ships.
// ══════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// SABOTAGE — the real defect, reduced.
//   What breaks if I delete it: Rule C could stop comparing entirely; every other Rule C test here
//     asserts a PASS, so all of them would stay green.
//   What goes unnoticed without it: `choreoOutcomeStart` shipping 0.6 behind a slider that stops at
//     0.55 — the control clamps on open, touching it loses the shipped value, and Reset restores a
//     number the slider cannot display. That sat in the tree until somebody read the two files
//     side by side.
// ────────────────────────────────────────────────────────────
test("SABOTAGE: a control whose max excludes its shipped value FAILS, naming file, bounds and value", () => {
  withTree(
    ["minRacersVisible"],
    ruleCFiles(0, 4, "cfg.fixtureValue ?? DEFAULT_FIXTURE_CONFIG.fixtureValue"),
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /CANNOT REPRESENT ITS SHIPPED VALUE/);
      assert.match(out, /FixtureSection\.jsx/, "must name where the control is");
      assert.match(out, /accepts \[0, 4\] and the value is 5/);
      assert.match(
        out,
        /DEFAULT_FIXTURE_CONFIG\.fixtureValue/,
        "must name the home the value came from, so the reader can check it",
      );
      assert.match(
        out,
        /do not move the shipped value to fit the control/,
        "must say which side to change — the opposite repair moves the game",
      );
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE PAIR (L203) — the fix must make it pass.
//   What breaks if I delete it: a rule that failed unconditionally would satisfy the sabotage.
// ────────────────────────────────────────────────────────────
test("CONSEQUENCE: widening the bound to contain the shipped value passes", () => {
  withTree(["minRacersVisible"], OK_CONTROL, (root) => {
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /RULE C: \d+ control\(s\) checked/);
  });
});

// ────────────────────────────────────────────────────────────
// THE TRANSFORM — the subtlety that decides whether this rule is usable at all.
//   What breaks if I delete it: someone simplifies Rule C to compare the STORED value against the
//     bounds, which is the obvious implementation and looks identical on most controls.
//   What goes unnoticed without it: five false positives on today's real tree — `nameTagAllUntilMs`
//     ships 8000 and its box reads 8 against max 30. A guard that cries wolf five times gets turned
//     off, and then the one real finding goes with it.
// ────────────────────────────────────────────────────────────
test("a control that displays a UNIT CONVERSION is judged on what it displays, not what it stores", () => {
  withTree(
    ["minRacersVisible"],
    // ships 8000 ms, shows 8 s, bounds are seconds. Comparing 8000 against [0,30] would fail.
    ruleCFiles(0, 30, "(cfg.fixtureMs ?? DEFAULT_FIXTURE_CONFIG.fixtureMs) / 1000"),
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.doesNotMatch(out, /CANNOT REPRESENT/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// THE DESCRIPTOR FORM — the shape the real defect actually had.
//   What breaks if I delete it: Rule C could cover only `<input min={…}>` and miss every control
//     declared as `{ key, label, min, max, step, tip }` in an array the section maps over.
//   What goes unnoticed without it: the defect this rule was written for. `choreoOutcomeStart` is
//     declared in exactly that form.
// ────────────────────────────────────────────────────────────
test("a control declared as a { key, min, max } descriptor is checked too", () => {
  withTree(
    ["minRacersVisible"],
    {
      ...OK_CONTROL,
      "screens/DevScreen/sections/DescriptorSection.jsx":
        "import { DEFAULT_FIXTURE_CONFIG } from '../../../modules/ruleCFixtureConfig.js';\n" +
        "const FIELDS = [\n" +
        "  { key: 'fixtureValue', label: 'Fixture (0-3)', min: 0, max: 3, step: 1 },\n" +
        "];\n" +
        "export default FIELDS;\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /DescriptorSection\.jsx/);
      assert.match(out, /accepts \[0, 3\] and the value is 5/);
    },
  );
});

// ────────────────────────────────────────────────────────────
// NOT A FALSE POSITIVE — what Rule C refuses to guess about.
//   What breaks if I delete it: Rule C starts failing on shared row helpers, whose `min={min}` is a
//     parameter and whose real numbers live in the caller's descriptor.
//   What goes unnoticed without it: nothing — but the guard would be unusable, and R11 says a guard
//     people learn to ignore is worse than a narrow one.
// ────────────────────────────────────────────────────────────
test("a helper row whose bounds are EXPRESSIONS is reported unresolved, never failed", () => {
  withTree(
    ["minRacersVisible"],
    {
      ...OK_CONTROL,
      "screens/DevScreen/sections/HelperRow.jsx":
        "export function SliderRow({ min, max, step, value, onChange }) {\n" +
        "  return <input type=\"range\" min={min} max={max} step={step} value={value} onChange={onChange} />;\n" +
        "}\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 0, out);
      assert.match(out, /unresolved: .*HelperRow\.jsx/);
      assert.match(
        out,
        /they are NOT coverage/,
        "an unresolved control must never read as a checked one",
      );
    },
  );
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE (Lesson 187) — a run that cannot see must break the build, never bless it.
//   What breaks if I delete it: the Dev Screen moves, Rule C scans nothing, and prints a green line.
// ────────────────────────────────────────────────────────────
test("RULE C: no Dev Screen, and a Dev Screen with no resolvable control, both FAIL", () => {
  withTree(
    ["minRacersVisible"],
    { "modules/thing.js": "use(cameraConfig.minRacersVisible);\n" },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /RULE C scanned ZERO Dev Screen files/);
    },
    { bare: true },
  );

  withTree(
    ["minRacersVisible"],
    {
      "modules/thing.js": "use(cameraConfig.minRacersVisible);\n",
      "modules/ruleCFixtureConfig.js":
        "export const DEFAULT_FIXTURE_CONFIG = { fixtureValue: 5 };\n",
      "screens/DevScreen/sections/Empty.jsx":
        "import { DEFAULT_FIXTURE_CONFIG } from '../../../modules/ruleCFixtureConfig.js';\n" +
        "export default function Empty() { return <div>{DEFAULT_FIXTURE_CONFIG.fixtureValue}</div>; }\n",
    },
    (root) => {
      const { status, out } = run(root);
      assert.equal(status, 1);
      assert.match(out, /RULE C resolved ZERO controls/);
    },
    { bare: true },
  );
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// RULE E — a control may not state a range it does not have.
//
// SABOTAGE — the repair CORRECTIONS-1 explicitly refused to make. It found `choreoOutcomeStart`
//   labelled "(0.25–0.55)" over a control that could not reach the shipped 0.6, and declined to fix
//   the label alone because *"0.6 = shipped beside a slider that stops at 0.55 is worse than the
//   inconsistency"*. That judgement was right and nothing enforced it: correcting one of the two
//   numbers would have passed every check in the repository.
//   What breaks if I delete this: a label and a bound can drift apart again, silently.
// ══════════════════════════════════════════════════════════════════════════════════════════════

const rangeControl = (label, min, max) => ({
  ...OK_CONTROL,
  "screens/DevScreen/sections/RangeSection.jsx":
    "import { DEFAULT_FIXTURE_CONFIG } from '../../../modules/ruleCFixtureConfig.js';\n" +
    "const FIELDS = [\n" +
    `  { key: 'fixtureValue', label: '${label}', min: ${min}, max: ${max}, step: 1 },\n` +
    "];\nexport default FIELDS;\n",
});

test("RULE E SABOTAGE: a control whose stated range is not its bounds FAILS, naming both", () => {
  withTree(["minRacersVisible"], rangeControl("Fixture (0-9)", 0, 10), (root) => {
    const { status, out } = run(root);
    assert.equal(status, 1, "a label that lies about its own control must break the build");
    assert.match(out, /RULE E/);
    assert.match(out, /states "\(0–9\)" and its bounds are \[0, 10\]/);
    assert.match(
      out,
      /do not correct only the\s+prose/,
      "must say which repair is wrong, or the next reader makes it",
    );
    assert.match(out, /R16/, "and name the rule it is an instance of");
  });
});

test("RULE E CONSEQUENCE: a stated range that IS the bounds passes", () => {
  withTree(["minRacersVisible"], rangeControl("Fixture (0-10)", 0, 10), (root) => {
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /RULE E: \d+ stated range\(s\) checked/);
    assert.match(out, /0 disagree/);
  });
});

test("RULE E: a bracketed pair that is not ASCENDING is not a range", () => {
  // "(3-1)" is a ratio, a coordinate, a score — not a claim about bounds. Treating every bracketed
  // pair as a range is how a guard starts crying wolf on prose it was never meant to read.
  withTree(["minRacersVisible"], rangeControl("Fixture (10-0)", 0, 10), (root) => {
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /RULE E — /);
  });
});

test("RULE E declares that a VALUE claim is a different question it does not answer", () => {
  withTree(["minRacersVisible"], OK_CONTROL, (root) => {
    const { out } = run(root);
    assert.match(
      out,
      /a claim about a VALUE is a different rule that is not buildable/,
      "the boundary belongs in the output, not only in a comment — CONTROL-CLAIMS-1 measured why",
    );
  });
});
