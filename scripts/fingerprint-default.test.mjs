// ============================================================
// File:        scripts/fingerprint-default.test.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 1
//
// ONE behaviour is tested here and it is the ARGUMENT GUARD, not the fingerprint. Running the real
// measurement costs ~2 minutes and is what `--mint` is for; this file must stay cheap enough to sit
// in the script suite, so every case below exits before a single race is simulated.
//
// WHY IT EXISTS: `argv[2]` is a LABEL and sim flags start at `argv[3]`, so a flag written without a
// label was consumed AS the label and silently dropped. The script then printed "default config"
// and the shipped-default hash — a legitimate-looking answer to a question nobody asked. It put a
// wrong `reproduce` command into docs/fingerprints.json, written on the strength of that output.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "fingerprint-default.mjs");

const run = (...args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    // 2.5 s: every line asserted below is printed during ARGUMENT PARSING, before the first track
    // child is spawned, so this kills the parent while it is still alone. A 15 s budget cost the
    // script suite 45 s and risked orphaning ten race children on the kill.
    timeout: 2_500,
    killSignal: "SIGKILL",
  });

test("A FLAG IN THE LABEL POSITION is REFUSED, and the message shows the corrected command", () => {
  const r = run("--gapRerollEnabled=false");
  assert.equal(
    r.status,
    2,
    "must exit nonzero — silently measuring the wrong world is the defect",
  );
  assert.match(r.stderr, /looks like a flag, but it is in the LABEL position/);
  // The suggestion must be RUNNABLE, not a vague hint: it is what the next person will paste.
  assert.match(
    r.stderr,
    /fingerprint-default\.mjs off --gapRerollEnabled=false/,
  );
});

test("CONSEQUENCE: the same flag AFTER a label is accepted and reaches the sim", () => {
  // The pair. Without this, the guard above would pass against a script that refused everything.
  // Killed by timeout once it has printed the line that proves the flag was forwarded — the race
  // itself is not what is under test.
  const r = run("off", "--gapRerollEnabled=false");
  assert.match(r.stdout, /extra sim args: --gapRerollEnabled=false/);
});

test("CONSEQUENCE: no arguments at all is still the shipped-default invocation", () => {
  const r = run();
  assert.doesNotMatch(r.stderr ?? "", /LABEL position/);
  // No `extra sim args:` line at all — that line only prints when EXTRA is non-empty, so its
  // ABSENCE is the assertion that the default run passes nothing to the sim.
  assert.doesNotMatch(r.stdout ?? "", /extra sim args:/);
});

test("A BARE WORD is a label, not a flag — the guard keys on the leading dashes only", () => {
  const r = run("mylabel");
  assert.doesNotMatch(r.stderr ?? "", /LABEL position/);
});
