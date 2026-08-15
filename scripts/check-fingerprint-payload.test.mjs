// ============================================================
// File:        scripts/check-fingerprint-payload.test.mjs
// Project:     RaceArena — FP-PAYLOAD-1
//
// Against real fixture FILES, because the guard parses source. `--file=` points it at a fixture, so
// every case below is a real parse of a real payload rather than a mocked AST.
//
// THE TWO THAT MATTER MOST are the pair every guard in this repo owes: a SABOTAGE it must catch,
// and the RESTORED state it must pass. The rest exist because this guard's failure modes are all
// silent ones — an anchor that moved, a payload behind a variable, a parser that is not there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "check-fingerprint-payload.mjs");
const ROOT = join(HERE, "..");

/** Runs the guard against a fixture written under the REAL repo root, so acorn resolves normally. */
const onFixture = (source, extraArgs = []) => {
  const dir = mkdtempSync(join(ROOT, "ra-fpp-fixture-"));
  try {
    const rel = join(dir, "payload.mjs").slice(ROOT.length + 1).split("\\").join("/");
    writeFileSync(join(dir, "payload.mjs"), source);
    const r = spawnSync(process.execPath, [GUARD, `--file=${rel}`, ...extraArgs], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const EXPLICIT = `
const rawData = [];
for (const r of result) {
  rawData.push({
    trackId: trackId,
    sollRank: targetRank,
    ...r,
  });
}
`;

const SHORTHAND = `
const rawData = [];
for (const r of result) {
  rawData.push({
    trackId,
    sollRank: targetRank,
    ...r,
  });
}
`;

// DELETE THIS and the guard's whole reason for existing is untested: it must CATCH the exact defect
// that moved the world fingerprint for a byte-identical race — a shorthand key whose column name is
// a side effect of a local variable name.
test("SABOTAGE: a shorthand property in the hashed row FAILS, and the key is named", () => {
  const { code, out } = onFixture(SHORTHAND);
  assert.equal(code, 1, "a shorthand property must fail the guard");
  assert.match(out, /trackId/, "it must name the offending key");
  assert.match(out, /SHORTHAND/, "it must say what is wrong, not merely that something is");
});

// DELETE THIS and the guard could be failing on everything — including correct code — and the
// sabotage test above would still pass. A guard that never passes is uninstallable, and this is the
// other half of proving it in both directions.
test("RESTORED: the same payload written explicitly PASSES", () => {
  const { code, out } = onFixture(EXPLICIT);
  assert.equal(code, 0, `explicit properties must pass — got:\n${out}`);
  assert.match(out, /0 using shorthand/);
});

// DELETE THIS and the guard's loudest failure goes untested. It anchors on `rawData.push(...)`
// because the defect it exists for WAS a rename; if that anchor is ever renamed away, the guard
// must FAIL rather than quietly find nothing to check (Lesson 187).
test("ANCHOR LOST: no rawData.push call site at all FAILS loudly", () => {
  const { code, out } = onFixture(`const rows = [];\nrows.push({ trackId });\n`);
  assert.equal(code, 1, "a missing anchor must fail, not pass");
  assert.match(out, /no rawData\.push/);
  assert.match(out, /worse than no guard|Lesson 187/, "it must say why a silent pass is refused");
});

// DELETE THIS and the payload could be moved behind a variable — where the guard sees no properties
// at all — and it would report a clean pass. That is the same silent no-op in a different disguise.
test("PAYLOAD BEHIND A VARIABLE: a non-literal argument FAILS", () => {
  const { code, out } = onFixture(`const rawData = [];\nconst row = { trackId };\nrawData.push(row);\n`);
  assert.equal(code, 1, "a non-literal payload must fail");
  assert.match(out, /not an object literal/);
});

// DELETE THIS and the guard's declared blindness stops being checked. `...r` splices keys decided
// somewhere else into the hashed row; the guard cannot see them, and it must SAY so rather than let
// a reader assume the row is fully covered.
test("SPREADS are reported as blind spots rather than passed over in silence", () => {
  const { code, out } = onFixture(EXPLICIT);
  assert.equal(code, 0);
  assert.match(out, /blind at/, "every spread must be printed on a passing run");
  const { out: report } = onFixture(EXPLICIT, ["--spread-report"]);
  assert.match(report, /1 spread element/);
});

// DELETE THIS and a future edit could make the guard tolerant of a payload it cannot parse, which
// would turn a broken file into a green run.
test("UNPARSEABLE source FAILS instead of being skipped", () => {
  const { code, out } = onFixture(`rawData.push({ trackId: );`);
  assert.equal(code, 1);
  assert.match(out, /does not parse/);
});

// DELETE THIS and nothing checks that the guard declares itself to `npm run verify`'s routing. An
// undeclared guard is not run by the router at all — it would sit in the tree looking like coverage.
test("it declares itself for verify routing, with a non-empty blind list", () => {
  const r = spawnSync(process.execPath, [GUARD, "--declare"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0);
  const d = JSON.parse(r.stdout);
  assert.equal(d.id, "check-fingerprint-payload");
  assert.ok(d.blind.length > 0, "the hole must be written down by whoever knows it");
  assert.ok(
    d.files.includes("scripts/sim-fairness.mjs"),
    "it must select on the file that carries the payload, or verify will never run it"
  );
});

// DELETE THIS and the REAL payload stops being checked by the test suite — every case above runs on
// fixtures, so the shipped file could regress while all of them stayed green.
test("THE REAL TREE: the shipped payload passes", () => {
  const r = spawnSync(process.execPath, [GUARD], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, `the shipped payload must pass:\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /rawData\.push\(\.\.\.\) call site/);
});
