// ============================================================
// File:        scripts/verify.mjs
// Project:     RaceArena — VERIFY-FAST-1
//
// ONE COMMAND THAT PICKS ITS OWN WORK. `npm run verify` reads the DIFF, decides which guards can
// possibly have something to say about it, runs those CONCURRENTLY, and prints what it chose AND
// what it skipped with the reason for each.
//
// A SKIPPED GUARD IS A VISIBLE DECISION, NEVER AN OMISSION. That is the whole design constraint: a
// verifier that silently does less is indistinguishable from one that is broken, and this project has
// already paid for two instruments that were quietly not covering what everyone assumed
// (the render fingerprint's window, the build badge's failure path). So the skip list is printed with
// the same prominence as the run list, and the exit code is unaffected by it.
//
// WHAT IT DOES NOT DECIDE: whether a fingerprint MAY move. It reports the hashes; a block that moves
// one on purpose says so in its report and re-mints. This is a change DETECTOR, not a prohibition.
//
// ORDER IS PART OF THE CONTRACT (§3, and it was the owner's find): FORMAT, then MEASURE, then COMMIT.
// The pre-commit hook reformats, and until now it did so AFTER the fingerprints had been measured —
// so every block that measured before committing measured a tree it never committed, and had to
// re-measure. Formatting first removes an entire second measuring pass. `--no-format` exists for the
// case where the tree is already known clean; it prints that it skipped.
//
// Usage:
//   npm run verify                 # against the merge-base with master, plus uncommitted changes
//   npm run verify -- --base=HEAD  # only uncommitted changes
//   npm run verify -- --dry        # print the plan and exit; runs nothing
//   npm run verify -- --no-format  # skip the formatting pass (prints that it did)
//   npm run verify -- --jobs=2     # cap concurrency (default: all chosen guards at once)
//   npm run verify -- --routes     # print every guard's declaration in full, then exit
// ============================================================

import { execFile, execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { collect, reasonFor } from "./lib/routing.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");


const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const has = (k) => process.argv.slice(2).includes(`--${k}`);

const BASE = arg("base", "master");
const DRY = has("dry");
const NO_FORMAT = has("no-format");
const JOBS = Number(arg("jobs", 0)) || 0;
const ROUTES_ONLY = has("routes");

// ── WHAT CHANGED ────────────────────────────────────────────────────────────────────────────────
// Committed-on-this-branch UNION uncommitted. Both matter: a block measures before it commits, and
// the branch's earlier commits are part of what it is shipping.
function changedFiles() {
  const run = (args) => {
    try {
      return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" })
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };
  const set = new Set([
    ...(BASE === "HEAD" ? [] : run(["diff", "--name-only", `${BASE}...HEAD`])),
    ...run(["diff", "--name-only", "HEAD"]),
    ...run(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...set].sort();
}

// ── THE ROUTING — COLLECTED, NOT WRITTEN HERE (VERIFY-ROUTING-1) ────────────────────────────────
//
// There is no route table in this file any more. Each guard declares what it depends on, in itself,
// and `scripts/lib/routing.mjs` collects those declarations and resolves them to file sets. The
// table that used to live here chose wrong four times; the full argument for why an entry-by-entry
// repair would have left a fifth is in routing.mjs's header, with the four misses named.
//
// WHICH PATHS STILL ROUTE NOWHERE, and it is now a consequence rather than a decision: a path
// routes nowhere when no guard's declared dependency set contains it. `server/**`, `.github/**` and
// the lockfiles are in nobody's set because no local guard reads them — the always-on pair
// (containment, writable) still see them, which is exactly right. `reports/**` reaches the document
// guards, because they read it.

/** Every guard, resolved. Collected once — spawning a `--declare` per guard costs about 80 ms. */
let _cache = null;
export function guards() {
  if (_cache) return _cache;
  const { guards: g, undeclared } = collect();
  // LOUD FAILURE (Lesson 187): a guard script that declares nothing would be silently unrouted, and
  // an unrouted guard is exactly the silence this whole block exists to end.
  if (undeclared.length) {
    console.error(
      `FAIL: these guard scripts declare no GUARD and are therefore routed NOWHERE:\n  ` +
        undeclared.join("\n  ") +
        `\nAdd an \`export const GUARD\` and a \`--declare\` branch (see scripts/lib/routing.mjs).`,
    );
    process.exit(2);
  }
  _cache = g;
  return g;
}

/** The plan: every guard, whether it runs, and WHY — including the ones that do not. */
export function plan(files, gs = guards()) {
  return gs.map((g) => {
    const hits = files.filter((f) => g.matches(f));
    return {
      id: g.id,
      cmd: g.id === "script-suite" ? ["node", "--test", ...scriptTestFiles()] : g.cmd,
      also: g.also,
      cwd: g.cwd,
      exclusive: g.exclusive,
      run: hits.length > 0,
      reason: reasonFor(g, hits),
      blind: g.blind,
      covers: g.covers,
      source: g.source,
    };
  });
}

function scriptTestFiles() {
  try {
    // `git ls-files scripts` and then FILTER — not the pathspec `scripts/*.test.mjs`, which is what
    // this used to be. That glob matched 17 files while CI's `find scripts -name '*.test.mjs'`
    // matched 18: it missed `scripts/lib/write-verified.test.mjs` the moment a subdirectory
    // appeared. Two discovery mechanisms disagreeing about which tests exist is the same defect
    // class this whole block is about, and the one that loses is always the quieter one.
    return execFileSync("git", ["ls-files", "scripts"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .map((s) => s.trim())
      .filter((f) => f.endsWith(".test.mjs"));
  } catch {
    return [];
  }
}

// ── RUNNING ─────────────────────────────────────────────────────────────────────────────────────
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

function runOne(task) {
  const started = Date.now();
  const one = ([bin, ...args]) =>
    new Promise((resolve) => {
      execFile(
        bin,
        args,
        // `shell` only for npm, which is a .cmd on Windows; node/git are real executables and
        // passing args through a shell would need escaping we do not want to own.
        {
          cwd: task.cwd ?? ROOT,
          encoding: "utf8",
          maxBuffer: 1 << 28,
          shell: bin === "npm" && process.platform === "win32",
        },
        (err, stdout, stderr) =>
          // A SPAWN failure is a finding, not something to retry: this machine produced a
          // process-creation failure (0xC0000142) once already, and a retry loop would have hidden it.
          resolve({
            ok: !err,
            spawnFailed:
              !!err && err.code !== undefined && err.status === undefined,
            out: (stdout || "") + (stderr || ""),
          }),
      );
    });
  return (async () => {
    const results = [await one(task.cmd)];
    for (const extra of task.also ?? []) results.push(await one(extra));
    const ok = results.every((r) => r.ok);
    return {
      id: task.id,
      ok,
      ms: Date.now() - started,
      spawnFailed: results.some((r) => r.spawnFailed),
      out: results
        .map((r) => r.out)
        .join("\n")
        .trim(),
    };
  })();
}

// ── MAIN ────────────────────────────────────────────────────────────────────────────────────────
// Guarded so `plan()` can be imported and tested without the verifier running itself. Caught by
// verify.test.mjs on its first run: without this, importing the module executed the whole thing and
// only one test ever reported.
const IS_ENTRY =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (IS_ENTRY) {
  const files = changedFiles();
  const tasks = plan(files);
  const chosen = tasks.filter((t) => t.run);
  const skipped = tasks.filter((t) => !t.run);

  console.log(`\nVERIFY — ${files.length} changed file(s) vs ${BASE}\n`);
  console.log("  WILL RUN:");
  for (const t of chosen) console.log(`    ${t.id.padEnd(19)} ${t.reason}`);
  if (!chosen.length) console.log("    (nothing — the diff reaches no guard)");
  console.log("\n  SKIPPED, and why:");
  for (const t of skipped) console.log(`    ${t.id.padEnd(19)} ${t.reason}`);
  console.log("");

  // WHAT NOTHING HERE COVERS, printed with the plan. Every guard states its own holes in its own
  // `blind` list, and this is where they are read out — so "verify passed" is never mistaken for
  // "everything was checked". A hole in a guard that did NOT run is not this run's business, so
  // only the chosen guards are listed; `--routes` prints all of them.
  console.log("  NOT COVERED by the guards that ran:");
  for (const t of chosen)
    for (const b of t.blind ?? []) console.log(`    ${t.id.padEnd(19)} ${b}`);
  console.log("");

  if (ROUTES_ONLY) {
    console.log("  THE DECLARATIONS, in full:\n");
    for (const t of tasks) {
      console.log(`  ${t.id}  (declared in ${t.source})`);
      console.log(`    covers: ${t.covers}`);
      console.log(`    route:  ${t.reason}`);
      for (const b of t.blind ?? []) console.log(`    blind:  ${b}`);
      console.log("");
    }
    process.exit(0);
  }

  if (DRY) process.exit(0);

  // §3 FORMAT FIRST. Measuring a tree the commit hook is about to reformat measures a state that is
  // never committed — which is exactly the second measuring pass this removes.
  if (NO_FORMAT) {
    console.log(
      "  format: SKIPPED (--no-format). Measuring a tree the hook may still reformat.\n",
    );
  } else {
    const t0 = Date.now();
    try {
      execFileSync("npm", ["run", "format", "--silent"], {
        cwd: join(ROOT, "client"),
        stdio: "ignore",
        shell: process.platform === "win32",
      });
      console.log(
        `  format: done in ${secs(Date.now() - t0)} — measuring the tree that will be committed.\n`,
      );
    } catch {
      console.log(
        "  format: FAILED — refusing to measure a tree that will change under the hook.\n",
      );
      process.exit(1);
    }
  }

  const cap =
    JOBS > 0 ? JOBS : Math.max(1, Math.min(chosen.length, cpus().length));
  console.log(`  running ${chosen.length} guard(s), up to ${cap} at once…\n`);

  const wall = Date.now();
  const exclusive = chosen.filter((t) => t.exclusive);
  const queue = chosen.filter((t) => !t.exclusive);
  const done = [];
  for (const t of exclusive) {
    const r = await runOne(t);
    done.push(r);
    console.log(
      `  ${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(19)} ${secs(r.ms)}  (ran alone)`,
    );
  }
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(cap, queue.length)) },
      async () => {
        for (;;) {
          const t = queue.shift();
          if (!t) return;
          const r = await runOne(t);
          done.push(r);
          console.log(
            `  ${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(19)} ${secs(r.ms)}`,
          );
        }
      },
    ),
  );
  const wallMs = Date.now() - wall;

  console.log("");
  for (const r of done.filter((d) => !d.ok)) {
    console.log(
      `── ${r.id} FAILED ${r.spawnFailed ? "(SPAWN FAILURE — a finding, not a flake)" : ""}`,
    );
    console.log(r.out.split("\n").slice(-25).join("\n"));
    console.log("");
  }
  // NIGHT-TOOLS-1: the RETRY LEDGER is surfaced even on a green run. vitest writes it to stderr,
  // which `verify` captures but only printed on FAILURE — so a suite that needed three attempts
  // looked exactly like one that passed first time, which is the silence the ledger exists to end.
  for (const r of done) {
    const line = r.out
      .split(String.fromCharCode(10))
      .find((l) => l.includes("RETRY LEDGER"));
    if (line) console.log(`  ${r.id.padEnd(19)} ${line.trim()}`);
  }
  // VERIFY-ROUTING-1: a guard's PENDING lines are surfaced on a GREEN run too. A guard that can see
  // a limit on what it is able to answer must not have that answer disappear because the exit code
  // was zero — which is what happened when a report said PASS about a stamp the commit being made
  // was about to invalidate. True, and incomplete.
  for (const r of done) {
    for (const line of r.out.split(String.fromCharCode(10)))
      if (line.startsWith("PENDING:") || line.includes("PENDING against uncommitted"))
        console.log(`  ${r.id.padEnd(19)} ${line.trim()}`);
  }
  // The hashes are the point of the fingerprint guards, so surface them even when green.
  for (const r of done.filter((d) => d.ok && /fingerprint/.test(d.id))) {
    // CAMERA had to be added after the first full run surfaced only two of the three hashes — a
    // summary that claims to print the hashes and silently drops one is the same shape as every other
    // instrument defect this project has paid for.
    const line = r.out
      .split("\n")
      .find((l) => /^(COMBINED|RENDER|CAMERA)\b|^[0-9a-f]{16}$/.test(l.trim()));
    if (line) console.log(`  ${r.id.padEnd(19)} ${line.trim()}`);
  }

  const sum = done.reduce((a, d) => a + d.ms, 0);
  console.log(
    `\n  wall clock ${secs(wallMs)} — sequential would have been ${secs(sum)} ` +
      `(${sum > 0 ? (sum / wallMs).toFixed(1) : "1.0"}x)`,
  );

  // THE COUNTS ARE EXPLICIT, AND A FAILURE COUNT IS THE LAST LINE (ONE-TRUTH-2 stage 6b).
  // A commit went in with a failing test because a SUMMARY LINE was read instead of a count: the
  // script suite printed 168/169 in the same command as the commit, and the eye took the commit
  // line. Prose can be skimmed; three labelled numbers cannot be mistaken for each other. And when
  // anything failed, the verdict is the LAST thing printed — the position a terminal leaves on
  // screen — so it cannot scroll away above a wall-clock line that reads like success.
  const passed = done.filter((d) => d.ok).length;
  const failed = done.filter((d) => !d.ok).length;
  console.log(`\n  PASS ${passed}   FAIL ${failed}   SKIP ${skipped.length}`);
  if (failed > 0) {
    const names = done
      .filter((d) => !d.ok)
      .map((d) => d.id)
      .join(", ");
    console.log(
      `\n  VERIFY FAILED — ${failed} guard(s) failed: ${names}. Do not commit.\n`,
    );
  } else {
    console.log("");
  }
  process.exit(failed === 0 ? 0 : 1);
}
