// ============================================================
// File:        scripts/lib/fingerprintCheck.test.mjs
// Project:     RaceArena — FP-COMPARE-2
//
// THE POINT OF THIS FILE IS THAT THE COMPARISON CAN GO RED. Two of the three fingerprint
// instruments spent months printing a hash and exiting 0 whatever it was, and the whole repair is
// worthless if the thing replacing that can only agree. So the failure paths are asserted first.
//
// It runs the module in a CHILD PROCESS, because `checkAgainstRecord` ends the run with
// `process.exit` on the paths that matter — asserting on a thrown error would be asserting on a
// different function than the one the instruments call.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = pathToFileURL(join(HERE, "fingerprintCheck.mjs")).href;

/** A throwaway repo root holding just `docs/fingerprints.json`. */
function fakeRoot(roles) {
  const root = mkdtempSync(join(tmpdir(), "fpcheck-"));
  mkdirSync(join(root, "docs"));
  writeFileSync(
    join(root, "docs", "fingerprints.json"),
    JSON.stringify({ roles }),
  );
  return root;
}

/** Run the check in a child process; returns { status, stdout, stderr }. */
function run({ root, role, label, measured, cheap = false }) {
  const src =
    `import { checkAgainstRecord } from ${JSON.stringify(MODULE)};` +
    `checkAgainstRecord(${JSON.stringify({ role, label, measured, cheap, root })});`;
  try {
    const stdout = execFileSync(process.execPath, ["--input-type=module", "-e", src], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    return {
      status: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

test("IT GOES RED on a hash that does not match the record", () => {
  const root = fakeRoot({ camera: { value: "1111111111111111" } });
  const r = run({ root, role: "camera", label: "CAMERA", measured: "2222222222222222" });
  assert.equal(r.status, 1, "a moved hash must fail the run");
  assert.match(r.stderr, /CAMERA fingerprint does not match the record/);
  assert.match(r.stderr, /recorded : 1111111111111111/);
  assert.match(r.stderr, /measured : 2222222222222222/);
  assert.match(r.stderr, /Do not edit the record to make this pass/);
});

test("it goes GREEN on a hash that matches", () => {
  const root = fakeRoot({ render: { value: "abcdef0123456789" } });
  const r = run({ root, role: "render", label: "RENDER", measured: "abcdef0123456789" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /RENDER matches the record for role "render"/);
});

test("A ROLE THE RECORD DOES NOT DECLARE FAILS — a check with nothing to check is a no-op wearing a guard's name", () => {
  const root = fakeRoot({ camera: { value: "1111111111111111" } });
  const r = run({ root, role: "render", label: "RENDER", measured: "1111111111111111" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /declares no value for role "render"/);
});

test("an unreadable record FAILS rather than blessing (Lesson 187)", () => {
  const root = mkdtempSync(join(tmpdir(), "fpcheck-empty-")); // no docs/fingerprints.json at all
  const r = run({ root, role: "world", label: "WORLD", measured: "1111111111111111" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cannot read the fingerprint record/);
});

test("--cheap SAYS it skipped rather than passing silently", () => {
  const root = fakeRoot({ camera: { value: "1111111111111111" } });
  const r = run({
    root,
    role: "camera",
    label: "CAMERA",
    measured: "cheap-nonsense",
    cheap: true,
  });
  assert.equal(r.status, 0, "a cheap run must not fail on an incomparable hash");
  assert.match(r.stdout, /SKIPPED under --cheap/);
  assert.doesNotMatch(r.stdout, /matches the record/, "it must not claim a comparison it did not make");
});

test("ALL THREE INSTRUMENTS CALL IT — the repair is not half-applied", () => {
  for (const f of [
    "fingerprint-default.mjs",
    "camera-fingerprint.mjs",
    "render-fingerprint.mjs",
  ]) {
    const src = readFileSync(join(HERE, "..", f), "utf8");
    assert.match(
      src,
      /checkAgainstRecord\(/,
      `${f} must compare against the record, not merely print a hash`,
    );
  }
});
