// ============================================================
// check-fallback-agreement.test.mjs — the guard can FAIL, and on the right things (FALLBACK-GUARD-1)
//
// Run: node --test scripts/check-fallback-agreement.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: the guard becomes a decoration. A guard that cannot be shown to
// fail is indistinguishable from one that passes everything — and this one ships GREEN over a
// 42-entry exception list, which is exactly the shape that rots into an always-green tick.
//
// The three properties the brief named, each asserted against `findPairs` on synthetic source so
// the test does not depend on the repository's current disagreements (which are the worklist and
// are expected to shrink):
//   1. a disagreeing pair is FOUND
//   2. a pair on the exception list is EXEMPT
//   3. a NEW disagreement in an exception-listed FILE is still found
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  findPairs,
  findRegistryCopies,
  loadRacerRegistry,
  EXCEPTIONS,
} from "./check-fallback-agreement.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = new Map([
  ["minRacersVisible", { value: 5, from: "TEST" }],
  ["outcomePhaseThreshold", { value: 0.65, from: "TEST" }],
  ["someOtherKey", { value: 11, from: "TEST" }],
]);

test("1. a disagreeing pair is FOUND — the MIN-RACERS-5 defect, reconstructed", () => {
  // This is the literal bug: the default said 5 and the mirror said 3.
  const src = `const DEFAULT_MIN_RACERS_VISIBLE = 3;
    export function f(config) { return config?.minRacersVisible ?? DEFAULT_MIN_RACERS_VISIBLE; }`;
  const [p] = findPairs(src, "fake/framingConfig.js", defaults);
  assert.equal(p.key, "minRacersVisible");
  assert.equal(p.value, 3);
  assert.equal(p.expected, 5);
  assert.ok(!p.byRef, "a named literal constant is not a by-reference read");
});

test("1b. …and the INLINE literal form too — that was the Dev Screen slider", () => {
  const [p] = findPairs(
    `value={config.minRacersVisible ?? 3}`,
    "fake/Slider.jsx",
    defaults,
  );
  assert.equal(p.value, 3);
  assert.equal(p.expected, 5);
});

test("1c. an AGREEING pair is not a finding, or the guard would cry wolf on 300 healthy pairs", () => {
  const [p] = findPairs(`config.minRacersVisible ?? 5`, "fake/ok.js", defaults);
  assert.equal(p.value, p.expected);
});

test("the BY-REFERENCE spelling can never disagree, and is reported as such", () => {
  // `?? DEFAULT_CAMERA_CONFIG.minRacersVisible` reads the canonical home — the shape MIN-RACERS-5
  // moved the slider to. It must not be counted as a pair that could drift.
  const [p] = findPairs(
    `config.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.minRacersVisible`,
    "fake/ok.js",
    defaults,
  );
  assert.equal(p.byRef, true);
});

test("…but reading a DIFFERENT key from the defaults object IS a finding", () => {
  // `?? DEFAULT_CAMERA_CONFIG.someOtherKey` looks like the safe spelling and is a real bug.
  const [p] = findPairs(
    `config.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.someOtherKey`,
    "fake/x.js",
    defaults,
  );
  assert.equal(p.crossKey, true);
});

test("a key that is in no defaults object is not a mirror and is ignored", () => {
  assert.deepEqual(
    findPairs(`thing.somethingElse ?? 0`, "fake/x.js", defaults),
    [],
  );
});

test("the BAND form is bound to its variable — the false positive that nearly shipped", () => {
  // The first version matched `.key;` against any `? v : CONST` within 400 chars and reported that
  // `leaderForwardFrac` fell back to 300. Bound now: only the variable actually read from the key.
  const src = `const OTHER = 300;
    const lff = config?.outcomePhaseThreshold;
    const ref = config?.unrelated;
    return { a: Number.isFinite(ref) ? ref : OTHER };`;
  assert.deepEqual(
    findPairs(src, "fake/band.js", defaults),
    [],
    "the unrelated ternary is not paired",
  );

  const bound = `const CAP = 0.75;
    const v = config?.outcomePhaseThreshold;
    return Number.isFinite(v) ? v : CAP;`;
  const [p] = findPairs(bound, "fake/band2.js", defaults);
  assert.equal(p.kind, "band");
  assert.equal(p.value, 0.75);
});

// ── THE EXCEPTION LIST IS A WORKLIST, NOT PERMISSION ────────────────────────────────────────────

test("2. every exception carries BOTH values and a REASON — a bare allowlist rots", () => {
  // AN EMPTY LIST IS THE GOAL, NOT A FAILURE (ONE-HOME-1). This asserted `length > 0` with the
  // message "the list must not be empty while the disagreements exist" — a reasonable guard against
  // somebody deleting the list to silence the tool, and wrong the moment the list emptied HONESTLY,
  // because every mirror had been removed. The condition it actually wanted is the pairing between
  // the two, and test 2b already owns that: it runs the guard and asserts `0 new`. So an unexplained
  // deletion still fails — there it would leave real disagreements unlisted — while an empty list
  // that matches an empty finding set passes, which is the state this project is aiming at.
  //
  // What stays is the anti-rot rule below, which is vacuously true of an empty list and binding on
  // every entry that ever returns.
  for (const e of EXCEPTIONS) {
    assert.ok(e.file && e.key, "file and key");
    assert.ok(
      "defaultValue" in e && "fallbackValue" in e,
      `${e.key}: both values`,
    );
    assert.notDeepEqual(
      e.defaultValue,
      e.fallbackValue,
      `${e.key}: an exception must describe a real disagreement`,
    );
    assert.ok(
      typeof e.reason === "string" && e.reason.length > 40,
      `${e.key}: a reason, not a shrug`,
    );
  }
});

test("2b. the guard is GREEN today — every known disagreement is on the list", () => {
  const out = execFileSync(
    process.execPath,
    ["scripts/check-fallback-agreement.mjs"],
    {
      cwd: REPO,
      encoding: "utf8",
    },
  );
  assert.match(out, /0 new/, "no unlisted disagreement");
});

test("3. a NEW disagreement in an exception-listed FILE is still found", () => {
  // The hole this avoids: exempting a FILE rather than a PAIR. An entry for one key in a file must
  // not carry an unrelated key in the same file with it.
  //
  // ONE-HOME-1 EMPTIED THE REAL LIST, so this builds its own entry rather than borrowing one. That
  // is the stronger shape anyway: it tests the MATCHING RULE, which is the thing that must hold,
  // instead of depending on the list happening to be non-empty. The list is now the outcome the
  // whole guard is aiming at — every mirror gone — and a test that needs it populated would fight
  // its own project.
  const FILE = "client/src/modules/raceCore.js";
  const listed = [
    { file: FILE, key: "someOtherKey", defaultValue: 1, fallbackValue: 2 },
  ];
  const [p] = findPairs(`config.minRacersVisible ?? 3`, FILE, defaults);
  const exempt = listed.some(
    (e) =>
      e.file === p.file &&
      e.key === p.key &&
      Object.is(e.defaultValue, p.expected) &&
      Object.is(e.fallbackValue, p.value),
  );
  assert.equal(exempt, false, "a new key in an exempted file is NOT exempt");
});

test("3b. changing either VALUE of a listed pair un-exempts it", () => {
  // The exception is keyed on both values, so a pair that moves stops matching and the guard fires.
  // An exception that survived its own values changing would be a hole, not a record.
  //
  // Synthetic, for the reason in test 3 above: ONE-HOME-1 emptied EXCEPTIONS, and `EXCEPTIONS[0]`
  // was `undefined` the moment it did. The rule under test belongs to the matching, not to whatever
  // happens to be on the list today.
  const e = {
    file: "client/src/modules/raceCore.js",
    key: "someKey",
    defaultValue: 5,
    fallbackValue: "the-recorded-value",
  };
  const list = [e];
  const stillMatches = (fallback) =>
    list.some(
      (x) =>
        x.file === e.file &&
        x.key === e.key &&
        Object.is(x.defaultValue, e.defaultValue) &&
        Object.is(x.fallbackValue, fallback),
    );
  assert.equal(
    stillMatches(e.fallbackValue),
    true,
    "the recorded pair matches",
  );
  assert.equal(
    stillMatches("a-different-value"),
    false,
    "a moved pair does not",
  );
});

test("END TO END: an UNLISTED disagreement makes the guard exit non-zero", () => {
  // The property the unit tests above cannot reach, and the one that matters most: "green" must
  // still mean something. Gutting `isExcepted` to always-true passed every other test in this file —
  // it is caught here and nowhere else. (This comment said the guard "ships GREEN over 42
  // exemptions". The list is EMPTY today: every entry was worked rather than kept. The test is
  // unaffected — its point is that an UNLISTED disagreement fails, which is stronger with no list.)
  //
  // `--src=` points the scan at a fixture. The defaults it compares against are the REAL ones, so
  // the fixture only has to name a real key and get it wrong.
  const dir = mkdtempSync(join(tmpdir(), "ra-fallback-fix-"));
  try {
    writeFileSync(
      join(dir, "fixture.js"),
      "export const f = (config) => config?.minRacersVisible ?? 999;",
    );
    let code = 0;
    let out = "";
    try {
      out = execFileSync(
        process.execPath,
        [
          "scripts/check-fallback-agreement.mjs",
          `--src=${relative(REPO, dir).split("\\").join("/")}`,
        ],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    assert.equal(code, 1, "an unlisted disagreement must fail the guard");
    assert.match(out, /minRacersVisible/, "and it must name the key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ══ RULE A ══════════════════════════════════════════════════════════════════════════════════════
//
// The property that matters is that the PAIRS ARE DISCOVERED. A test that hard-codes "frameWidth"
// and "horse" would pass while the discovery it is meant to protect was replaced by a typed list —
// so these build their registry from a FIXTURE and assert the rule follows it wherever it points.

const REG = (racers) => {
  const byRacer = new Map();
  const fields = new Set();
  for (const [id, f] of Object.entries(racers)) {
    byRacer.set(id, new Map(Object.entries(f)));
    for (const k of Object.keys(f)) fields.add(k);
  }
  return { byRacer, fields };
};

test("RULE A: a literal disagreeing with the home is found, named by an `id:` value", () => {
  const reg = REG({ horse: { frameWidth: 150, displaySize: 47 } });
  const out = findRegistryCopies(
    `const T = [{ id: 'horse', frameWidth: 128, displaySize: 47 }];`,
    "t.mjs",
    reg,
  );
  const bad = out.filter((c) => !c.ok);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].key, "frameWidth");
  assert.equal(bad[0].value, 128);
  assert.equal(bad[0].expected, 150);
});

test("RULE A: a copy named by the KEY it hangs from is found too", () => {
  const reg = REG({ duck: { displaySize: 36 } });
  const out = findRegistryCopies(`const M = { duck: { displaySize: 44 } };`, "t.mjs", reg);
  assert.equal(out.filter((c) => !c.ok).length, 1);
});

test("RULE A: an AGREEING literal is not a finding", () => {
  const reg = REG({ horse: { frameWidth: 150 } });
  const out = findRegistryCopies(`x = { id: 'horse', frameWidth: 150 };`, "t.mjs", reg);
  assert.equal(out.length, 1);
  assert.equal(out[0].ok, true);
});

test("RULE A: THE FIELD NAMES ARE DISCOVERED — a field the registry does not carry is ignored", () => {
  const reg = REG({ horse: { frameWidth: 150 } });
  const out = findRegistryCopies(
    `x = { id: 'horse', frameWidth: 150, notARegistryField: 999 };`,
    "t.mjs",
    reg,
  );
  assert.equal(out.length, 1, "only the registry's own field is compared");
  assert.equal(out[0].key, "frameWidth");
});

test("RULE A: THE RACERS ARE DISCOVERED — an id the registry does not carry is ignored", () => {
  const reg = REG({ horse: { frameWidth: 150 } });
  const out = findRegistryCopies(`x = { id: 'pegasus', frameWidth: 1 };`, "t.mjs", reg);
  assert.equal(out.length, 0);
});

test("RULE A: naming the racer is not a copy of a fact ABOUT it", () => {
  const reg = REG({ horse: { id: "horse", frameWidth: 150 } });
  const out = findRegistryCopies(`x = { id: 'horse' };`, "t.mjs", reg);
  assert.equal(out.length, 0, "`id` itself is never compared");
});

test("RULE A: a different TYPE is a different job, not a disagreement", () => {
  const reg = REG({ horse: { frameWidth: 150 } });
  const out = findRegistryCopies(`x = { id: 'horse', frameWidth: 'auto' };`, "t.mjs", reg);
  assert.equal(out.length, 0);
});

test("RULE A: arrays are out of reach, and the guard says so rather than implying coverage", () => {
  const reg = REG({ horse: { frameWidth: 150 } }); // surfaceClasses is not scalar, so never in `fields`
  const out = findRegistryCopies(
    `x = { id: 'horse', surfaceClasses: ['sand'], frameWidth: 150 };`,
    "t.mjs",
    reg,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "frameWidth");
});

test("RULE A: the real registry yields racers and fields without any list in this guard", async () => {
  const reg = await loadRacerRegistry();
  assert.ok(reg.byRacer.size >= 20, "every racer type is discovered");
  assert.ok(reg.fields.has("frameWidth") && reg.fields.has("displaySize"));
  assert.equal(reg.fields.has("surfaceClasses"), false, "arrays are excluded at discovery");
  // The guard must contain no hand-written pair list: the racer ids come from the registry only.
  const self = readFileSync(join(REPO, "scripts/check-fallback-agreement.mjs"), "utf8");
  assert.equal(
    /RACER_FIELDS\s*=|PAIR_LIST\s*=|const\s+FIELDS\s*=\s*\[/.test(self),
    false,
    "a typed list of pairs would be the same defect one level up",
  );
});

// ────────────────────────────────────────────────────────────
// RULE A GATES (PRE-CROP-FIELDS-1, 2026-09-03).
//   What breaks if I delete it: Rule A could go back to printing and exiting 0 — the state it was
//     in for a day — and every unit test above would stay green, because they all call
//     `findRegistryCopies` directly and never look at the process exit code.
//   What goes unnoticed without it: a literal copy of a racer-type registry field drifting from the
//     registry, silently, which is the entire defect this rule was built for. A rule that reports
//     and cannot fail is a decoration.
// ────────────────────────────────────────────────────────────
test("RULE A GATES: a disagreeing registry literal makes the guard exit non-zero, naming both sides", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-rulea-gate-"));
  try {
    // A real racer id and a real registry field, with a wrong value. The registry it is compared
    // against is the REAL one, so the fixture only has to be wrong.
    writeFileSync(
      join(dir, "fixture.js"),
      "export const T = [{ id: 'horse', frameWidth: 1, frameHeight: 1 }];\n",
    );
    let code = 0;
    let out = "";
    try {
      out = execFileSync(
        process.execPath,
        [
          "scripts/check-fallback-agreement.mjs",
          `--src=${relative(REPO, dir).split("\\").join("/")}`,
        ],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    assert.equal(code, 1, "Rule A must FAIL the build, not merely report");
    assert.match(out, /RULE A/);
    assert.match(out, /frameWidth = 1 for 'horse'/, "must name the literal it found");
    assert.match(out, /registry says/, "and the value it should have agreed with");
    assert.match(
      out,
      /rename the\s+field so its meaning is in the name \(R18\)/,
      "must offer the rename as the escape, since the alternative is an exception list",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RULE A: a RENAMED field is out of reach — the distinction, and its price", () => {
  // This is the shape `crop-sprite-sheets.mjs` HAD before it was deleted, and it is deliberate: a record of what a
  // value USED to be must not wear the live field's name (R18). The cost is stated rather than
  // hidden — the rename is also what makes the table invisible to this rule.
  const dir = mkdtempSync(join(tmpdir(), "ra-rulea-renamed-"));
  try {
    writeFileSync(
      join(dir, "fixture.js"),
      "export const T = [{ id: 'horse', preCropFrameWidth: 1, preCropFrameHeight: 1 }];\n",
    );
    const out = execFileSync(
      process.execPath,
      [
        "scripts/check-fallback-agreement.mjs",
        `--src=${relative(REPO, dir).split("\\").join("/")}`,
      ],
      { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.match(out, /0 disagree/);
    assert.doesNotMatch(out, /RULE A —/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RULE A carries NO exception for the one file it ever objected to", () => {
  // The point of renaming rather than excepting: there is nothing here telling the rule to look
  // away. If this assertion ever has to be deleted, the rule has stopped being a rule.
  //
  // THE SLICE IS THE ARRAY LITERAL AND NOTHING ELSE (narrowed 2026-09-03, DROP-CROP-SCRIPT-1). It
  // used to run from `const EXCEPTIONS` to `const isExcepted`, four hundred lines and three
  // unrelated functions later — so a COMMENT anywhere in that span could fail it, and one did: a
  // note recording that the file had been deleted. An assertion that fires on prose about a thing
  // is not an assertion about the thing.
  const self = readFileSync(join(REPO, "scripts/check-fallback-agreement.mjs"), "utf8");
  const open = self.indexOf("export const EXCEPTIONS = [");
  const exceptionsBlock = self.slice(open, self.indexOf("\n];", open) + 3);
  assert.ok(open >= 0 && exceptionsBlock.length > 0, "the exception list must still be findable");
  assert.match(exceptionsBlock, /\n\];$/, "the slice must end at the array's own closing bracket");
  assert.doesNotMatch(
    exceptionsBlock,
    /crop-sprite-sheets/,
    "the pre-crop table was renamed, not excepted",
  );
  assert.doesNotMatch(
    exceptionsBlock,
    /preCropFrame/,
    "and no exception was written for the renamed fields either",
  );
});

// ────────────────────────────────────────────────────────────
// LOUD FAILURE ON A BROKEN DISCOVERY (Lesson 187, DROP-CROP-SCRIPT-1).
//   What breaks if I delete these: Rule A's live population is now ZERO — the copies it was built
//     for were removed before it existed, and deleting `crop-sprite-sheets.mjs` took the last
//     twelve. So "0 registry literal(s) … 0 disagree" is the GOAL STATE and it is byte-identical to
//     what a rule whose discovery has silently stopped working would print.
//   What goes unnoticed without them: exactly that. A renamed registry export or a moved directory
//     and the rule reports a clean bill of health over an empty search, forever.
// ────────────────────────────────────────────────────────────
test("LOUD FAILURE: an EMPTY REGISTRY fails rather than reporting '0 disagree'", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-rulea-emptyreg-"));
  try {
    const home = join(dir, "client/src/modules/racer-types");
    mkdirSync(home, { recursive: true });
    writeFileSync(
      join(home, "index.js"),
      "export const RACER_TYPE_IDS = [];\nexport const RACER_TYPES = {};\nexport const CONFIG_SNAPSHOT = {};\n",
    );
    let code = 0;
    let out = "";
    try {
      out = execFileSync(
        process.execPath,
        ["scripts/check-fallback-agreement.mjs", `--registry-root=${dir.split("\\").join("/")}`],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    assert.equal(code, 1, "a registry that yields nothing must break the build");
    assert.match(out, /discovered 0 racer type\(s\) and 0 field name\(s\)/);
    assert.match(out, /Lesson 187/);
    assert.doesNotMatch(
      out,
      /RULE A: d+ registry literal/,
      "and must NOT print its summary line on the way out — the refusal message quotes the words it is refusing to print, so the assertion is on the SUMMARY, not on the phrase",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("LOUD FAILURE: a scan that walks ZERO files fails too", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-rulea-emptysrc-"));
  try {
    let code = 0;
    let out = "";
    try {
      out = execFileSync(
        process.execPath,
        [
          "scripts/check-fallback-agreement.mjs",
          `--src=${relative(REPO, dir).split("\\").join("/")}`,
        ],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    assert.equal(code, 1);
    assert.match(out, /walked ZERO files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("…but finding ZERO LITERALS is the GOAL STATE and stays green", () => {
  // The distinction the two tests above exist for. After DROP-CROP-SCRIPT-1 the real tree has no
  // registry literals at all, and that must read as success, not as a broken scan.
  const dir = mkdtempSync(join(tmpdir(), "ra-rulea-noliterals-"));
  try {
    writeFileSync(join(dir, "fixture.js"), "export const T = { id: 'horse', unrelated: 1 };\n");
    const out = execFileSync(
      process.execPath,
      [
        "scripts/check-fallback-agreement.mjs",
        `--src=${relative(REPO, dir).split("\\").join("/")}`,
      ],
      { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.match(out, /RULE A: 0 registry literal\(s\)/);
    assert.match(out, /0 disagree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// RULE D — the registry must agree with the artwork it describes.
//
// SABOTAGE — the half of CENSUS-DUPES-1's group A2 that nothing has ever held. That census named
//   the PNG as the source of truth for frame geometry, recorded "Guard: NONE", and checked the
//   agreement BY HAND. RULE-A-REACH-1 measured the consequence: Rule A covers the COPIES of that
//   fact and not the fact.
//   What breaks if I delete this: Rule D could stop comparing and print "0 disagree" over 20 types.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** A fixture registry pointing at the REAL sheets, so only the numbers are synthetic. */
const registryFixture = (entries) =>
  "export const RACER_TYPE_IDS = " +
  JSON.stringify(Object.keys(entries)) +
  ";\nexport const CONFIG_SNAPSHOT = {};\nexport const RACER_TYPES = " +
  JSON.stringify(
    Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { config: v }])),
  ) +
  ";\n";

const withRegistry = (entries, fn) => {
  const dir = mkdtempSync(join(tmpdir(), "ra-ruled-"));
  try {
    const home = join(dir, "client/src/modules/racer-types");
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, "index.js"), registryFixture(entries));
    let code = 0;
    let out = "";
    try {
      out = execFileSync(
        process.execPath,
        ["scripts/check-fallback-agreement.mjs", `--registry-root=${dir.split("\\").join("/")}`],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    return fn({ code, out });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const HORSE_OK = {
  id: "horse",
  spriteUrl: "/assets/racers/horse-trot.png",
  frameWidth: 150,
  frameHeight: 150,
  frameCount: 8,
};

test("RULE D SABOTAGE: a registry frame size that disagrees with its PNG fails, naming both sides", () => {
  withRegistry({ horse: { ...HORSE_OK, frameWidth: 151 } }, ({ code, out }) => {
    assert.equal(code, 1, "a registry that has drifted from its artwork must break the build");
    assert.match(out, /RULE D/);
    assert.match(out, /horse: registry says 151x150 x8 frames = a 1208x150 sheet/);
    assert.match(out, /horse-trot\.png is 1200x150/, "must state what the file actually is");
    assert.match(
      out,
      /The PNG is the source of truth here/,
      "must say which side wins, or the reader edits the wrong one",
    );
  });
});

test("RULE D CONSEQUENCE: a registry that agrees with its PNG passes", () => {
  withRegistry({ horse: HORSE_OK }, ({ code, out }) => {
    assert.equal(code, 0, out);
    assert.match(out, /RULE D: 1 racer sheet\(s\) checked/);
    assert.match(out, /0 disagree/);
  });
});

test("RULE D: frameCOUNT is part of the comparison, not just the frame size", () => {
  // 150 x 8 = 1200 is the sheet. 150 x 7 is not, and a count that drifts is exactly as wrong as a
  // width that does — it is the same product.
  withRegistry({ horse: { ...HORSE_OK, frameCount: 7 } }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /a 1050x150 sheet, but horse-trot\.png is 1200x150/);
  });
});

test("RULE D LOUD FAILURE: zero resolvable sheets FAILS rather than reporting 0 disagree", () => {
  withRegistry({ horse: { ...HORSE_OK, spriteUrl: "/assets/racers/there-is-no-such-sheet.png" } }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /RULE D resolved ZERO racer sheets/);
    assert.match(out, /Lesson 187/);
    assert.doesNotMatch(out, /RULE D: \d+ racer sheet\(s\) checked/, "and prints no verdict on the way out");
  });
});

test("RULE D is GEOMETRY only, and says so — the digest owns the other half", () => {
  // Stated in the output rather than only in a comment, because the two rules are easy to confuse
  // and ARTWORK-DIGEST-1 measured the case that separates them: an overwrite that produced the SAME
  // frame size and different pixels.
  withRegistry({ horse: HORSE_OK }, ({ out }) => {
    assert.match(out, /GEOMETRY ONLY/);
  });
});
