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
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
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
  // The property the unit tests above cannot reach, and the one that matters most: this guard ships
  // GREEN over 42 exemptions, so "green" must still mean something. Gutting `isExcepted` to
  // always-true passed every other test in this file — it is caught here and nowhere else.
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
