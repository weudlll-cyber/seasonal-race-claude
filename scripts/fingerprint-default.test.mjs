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
//
// FINGERPRINT-DEFAULT-FLAKE-1 (2026-09-30): the harness WAITS FOR THE OUTPUT, not for a clock. It
// used to run the script with `spawnSync` and a fixed 2.5 s SIGKILL and then look at whatever had
// reached stdout — so a loaded machine that took longer than 2.5 s to start Node turned a correct
// script into a red run (seen once under verify's parallel load: 2,805 ms, empty stdout). See
// reports/particles/PARTICLES-VISIBILITY-13.md §B on branch fix/particles-visibility.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "fingerprint-default.mjs");

/** How long a case may wait for the line it expects before it fails. A safety cap, not a verdict. */
const CAP_MS = 30_000;

/**
 * Run the script and settle on the FIRST of: `until` matching the output, the child exiting, or
 * `capMs` passing. The child is killed as soon as it settles — once the awaited line is out, it is
 * starting its ten race children, and the race itself is not what is under test.
 *
 * ★ WHY IT WAITS FOR THE LINE. The line the positive case needs is printed during argument parsing,
 * ~60 ms after start on an idle machine. A fixed deadline made the verdict a race between that print
 * and a clock, and a busy machine can lose it; waiting for the line makes the verdict depend only on
 * what the script prints. `capMs` is there so a script that never prints it fails in bounded time,
 * with `timedOut` set so the assertion can say so.
 *
 * @param {string[]} args
 * @param {{ until?: RegExp, capMs?: number }} [opts]
 * @returns {Promise<{ status: number|null, stdout: string, stderr: string, timedOut: boolean }>}
 */
const run = (args, { until = null, capMs = CAP_MS } = {}) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: ROOT });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (status, timedOut) => {
      if (settled) return;
      settled = true;
      clearTimeout(cap);
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve({ status, stdout, stderr, timedOut });
    };
    const check = () => {
      if (until && until.test(stdout + stderr)) settle(null, false);
    };
    child.stdout.on("data", (d) => {
      stdout += d;
      check();
    });
    child.stderr.on("data", (d) => {
      stderr += d;
      check();
    });
    child.on("exit", (code) => settle(code, false));
    const cap = setTimeout(() => settle(null, true), capMs);
  });

test("A FLAG IN THE LABEL POSITION is REFUSED, and the message shows the corrected command", async () => {
  // The refusal exits the script, so this settles on the exit.
  const r = await run(["--gapRerollEnabled=false"]);
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

test("CONSEQUENCE: the same flag AFTER a label is accepted and reaches the sim", async () => {
  // The pair. Without this, the guard above would pass against a script that refused everything.
  // Waits for the `extra sim args:` line itself, whatever it says, and then checks what it says —
  // so a missing line fails on the cap and a wrong line fails on the match, each saying which.
  const r = await run(["off", "--gapRerollEnabled=false"], { until: /extra sim args:/ });
  assert.equal(
    r.timedOut,
    false,
    `no "extra sim args:" line within ${CAP_MS} ms — stdout was: ${JSON.stringify(r.stdout)}`,
  );
  assert.match(r.stdout, /extra sim args: --gapRerollEnabled=false/);
});

// The two cases below assert an ABSENCE, which no output can confirm early, so they watch for the
// same 2.5 s the old harness did. Under load they can only pass without proof, never fail falsely.
const ABSENCE_WINDOW_MS = 2_500;

test("CONSEQUENCE: no arguments at all is still the shipped-default invocation", async () => {
  const r = await run([], { capMs: ABSENCE_WINDOW_MS });
  assert.doesNotMatch(r.stderr ?? "", /LABEL position/);
  // No `extra sim args:` line at all — that line only prints when EXTRA is non-empty, so its
  // ABSENCE is the assertion that the default run passes nothing to the sim.
  assert.doesNotMatch(r.stdout ?? "", /extra sim args:/);
});

test("A BARE WORD is a label, not a flag — the guard keys on the leading dashes only", async () => {
  const r = await run(["mylabel"], { capMs: ABSENCE_WINDOW_MS });
  assert.doesNotMatch(r.stderr ?? "", /LABEL position/);
});
