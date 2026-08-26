// GATE-SERIAL-BCRYPT-1 — wall clock and worst-per-test margin for a suite, under a named
// configuration, repeated.
//
// GATE-CLIENT-CROWDING-1 (2026-08-27) made the suite a PARAMETER instead of writing a second copy of
// this file. `--suite=client` points it at the client workspace; the default `server` is what
// GATE-SERIAL-BCRYPT-1 ran and is unchanged in behaviour. Everything below — the repetition, the JSON
// reporter, the margin against the 5,000 ms timeout — is that piece's design and is untouched.
//
// WHY REPEATED: the failure this piece removes is a TIMING CLIFF, and one green proves nothing about
// a cliff. Every run is reported; the worst per-test duration across all of them is what decides
// whether the margin is real.
//
// It changes nothing. It spawns the suite the same way `npm test` does and reads vitest's own JSON
// reporter for per-test durations.
import { spawnSync } from "node:child_process";
import { freemem, totalmem, loadavg } from "node:os";
import { readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// The workspace under test. One instrument, two suites: a second copy would be a second thing to
// keep in step, and the margin question is identical for both.
const SUITE = (
  process.argv.find((a) => a.startsWith("--suite=")) ?? "--suite=server"
).slice(8);
const SERVER = join(ROOT, SUITE);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const RUNS = Number(arg("runs", "3"));
const LABEL = arg("label", "current");
// Extra vitest CLI arguments, comma-separated. Empty = exactly what `npm test` runs.
const EXTRA = (arg("extra", "") || "").split(",").filter(Boolean);
const OUT = arg("out", "c:/tmp/suite-timing");

mkdirSync(OUT, { recursive: true });

const runs = [];
for (let i = 1; i <= RUNS; i++) {
  const jsonPath = join(OUT, `${LABEL}-${i}.json`);
  if (existsSync(jsonPath)) rmSync(jsonPath);
  // GATE-CLIENT-CROWDING-1: the machine's own state either side of the run. The client suite's
  // failure count ROSE 1 -> 3 -> 10 across three consecutive runs while wall clock rose 248s -> 378s,
  // which is accumulation rather than instantaneous load — and "which resource" cannot be answered
  // without sampling one. Free memory is the cheapest candidate to rule in or out.
  const memBefore = freemem();
  const t0 = Date.now();
  // Vitest's own CLI entry, run under this node. `npx.cmd` through spawnSync on Windows returned
  // exit null and no report — a silent zero, which is exactly what this repo has learned not to
  // read as a result.
  const r = spawnSync(
    process.execPath,
    [
      join(SERVER, "node_modules", "vitest", "vitest.mjs"),
      "run",
      ...EXTRA,
      "--reporter=json",
      `--outputFile=${jsonPath}`,
    ],
    { cwd: SERVER, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (r.status === null)
    process.stdout
      .write(`  run ${i}: SPAWN FAILED — ${r.error?.message ?? "no exit code"}
`);
  const wallMs = Date.now() - t0;
  const memAfter = freemem();

  let tests = [];
  try {
    const j = JSON.parse(readFileSync(jsonPath, "utf8"));
    for (const s of j.testResults ?? [])
      for (const a of s.assertionResults ?? [])
        tests.push({
          file: s.name.split(/[\\/]/).pop(),
          name: a.title,
          ms: a.duration ?? 0,
          status: a.status,
        });
  } catch {
    // A run whose report cannot be read is reported as such rather than dropped.
  }
  const failed = tests.filter((t) => t.status !== "passed").length;
  const worst = tests.slice().sort((a, b) => b.ms - a.ms)[0] ?? null;
  runs.push({
    i,
    wallMs,
    exit: r.status,
    tests: tests.length,
    failed,
    worst,
    all: tests,
    memBefore,
    memAfter,
  });
  process.stdout.write(
    `  run ${i}: wall ${(wallMs / 1000).toFixed(1)}s  exit ${r.status}  ${tests.length} tests  ` +
      `${failed} failed  worst ${worst ? `${Math.round(worst.ms)}ms (${worst.file} :: ${worst.name.slice(0, 46)})` : "n/a"}\n`,
  );
}

// ── THE MARGIN, which is the number this piece is judged on ──────────────────────────────────────
// vitest's default testTimeout is 5,000 ms and this piece does not change it. The margin is what is
// left of it under the WORST per-test duration seen across every run.
const TIMEOUT_MS = 5000;
const everyTest = runs.flatMap((r) => r.all);
const worstAll = everyTest.slice().sort((a, b) => b.ms - a.ms)[0] ?? null;
const over = (n) => everyTest.filter((t) => t.ms > n).length;

process.stdout.write("\n");
process.stdout.write(`  LABEL              ${LABEL}\n`);
process.stdout.write(
  `  wall clock         ${runs.map((r) => (r.wallMs / 1000).toFixed(1) + "s").join("  ")}   ` +
    `(mean ${(runs.reduce((s, r) => s + r.wallMs, 0) / runs.length / 1000).toFixed(1)}s)\n`,
);
process.stdout.write(
  `  exit codes         ${runs.map((r) => r.exit).join(", ")}\n`,
);
process.stdout.write(
  `  failed tests       ${runs.reduce((s, r) => s + r.failed, 0)}\n`,
);
if (worstAll)
  process.stdout.write(
    `  WORST TEST         ${Math.round(worstAll.ms)}ms — ${worstAll.file} :: ${worstAll.name}\n` +
      `  MARGIN REMAINING   ${TIMEOUT_MS - Math.round(worstAll.ms)}ms of ${TIMEOUT_MS}ms ` +
      `(${(((TIMEOUT_MS - worstAll.ms) / TIMEOUT_MS) * 100).toFixed(1)}%)\n`,
  );
process.stdout.write(
  `  tests over 2.5s    ${over(2500)}    over 4s: ${over(4000)}    over 5s: ${over(5000)}\n`,
);
