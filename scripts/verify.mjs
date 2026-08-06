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
// ============================================================

import { execFile, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { engineReach } from "./engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ONE-TRUTH-2 deleted the `sites` array from docs/fingerprints.json — no document carries a copy of
// a fingerprint any more, so there is nothing to route to. The reader that resolved those sites is
// gone with them rather than left returning an empty set "in case".
const FINGERPRINT_RECORD = "docs/fingerprints.json";

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const has = (k) => process.argv.slice(2).includes(`--${k}`);

const BASE = arg("base", "master");
const DRY = has("dry");
const NO_FORMAT = has("no-format");
const JOBS = Number(arg("jobs", 0)) || 0;

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

// ── THE ROUTE TABLE — ONE map, read from one place ──────────────────────────────────────────────
//
// This replaced five scattered predicates. Three separate times the routing was too narrow and each
// time the entry was fixed while the MAP stayed invisible: camera files did not select the render
// fingerprint (FINISH-COMPANY-1), and `client/vitest.config.js` did not select the client suite even
// though it decides how the whole suite runs (NIGHT-TOOLS-1). Three occurrences is a defect in the
// map, not in the entries — so the map is now a single table, it is printed with every skip, and it
// is tested in both directions.
//
// WHICH PATHS THIS DELIBERATELY ROUTES NOWHERE, stated here rather than left to be discovered:
//   - `reports/**` — the lab journal. It is allowed to rot; no guard reads it.
//   - `server/**`, `e2e/**`, `.github/**`, `*.json` lockfiles — nothing in the local guard set
//     inspects them. CI covers what it covers; `verify` does not pretend to.
//   - `client/src/**/*.test.{js,jsx}` — a test file DOES select the client suite (it is client
//     source), but it deliberately selects NO fingerprint: a test cannot change the picture.
//   - Anything not matched below runs nothing, and the plan says so by omission.
//
// Each rule: which guard it selects, and a MATCHER. A path may select several.
export const ROUTES = [
  {
    guard: "doc-guards",
    what: "markdown anywhere, plus the fingerprint record itself",
    match: (f) => f.endsWith(".md") || f === FINGERPRINT_RECORD,
  },
  {
    guard: "fingerprint-containment",
    // RUNS WHENEVER ANYTHING CHANGED — precisely that, not "always". Since ONE-TRUTH-2 a current
    // fingerprint may exist only in the record, and a stray copy can be pasted into ANY file — a
    // comment, a shell hook, a JSON fixture — so no subset of paths would be safe to skip. It
    // matches every path; an EMPTY diff still selects nothing, which is coherent (nothing changed,
    // so nothing can have introduced a copy). It scans all tracked files in ~2 s, cheap enough that
    // routing it more finely could only ever be wrong. It does NOT re-mint — see the guard's header.
    what: "every changed file, of any kind — a stray copy can appear anywhere; the scan is ~2 s",
    match: () => true,
  },
  {
    guard: "script-suite",
    what: "anything under scripts/",
    match: (f) => f.startsWith("scripts/"),
  },
  {
    guard: "client-suite",
    // `client/`, NOT `client/src/`: vitest.config.js, package.json and the setup files decide how
    // the suite RUNS, and a change to them is exactly a reason to run it. That was the third miss.
    what: "anything under client/ EXCEPT e2e — including the configs that decide how the suite runs",
    // `client/e2e/` is Playwright and is excluded from vitest by vitest.config.js, so a change
    // there must NOT select the vitest suite. Caught by the routed-nowhere test when this rule was
    // first widened from `client/src/` — widening a matcher can overshoot as easily as it can miss.
    match: (f) => f.startsWith("client/") && !f.startsWith("client/e2e/"),
  },
  {
    guard: "world-fingerprint",
    what: "any file the race engine can reach (engine-reach closure)",
    match: (f, reach) => reach.has(f),
  },
  {
    guard: "camera-fingerprint",
    what: "the camera director and its modules",
    match: (f) => f.startsWith("client/src/modules/camera/"),
  },
  {
    guard: "render-fingerprint",
    // Camera counts: the director decides the transform on every drawn frame.
    what: "anything that can reach a ctx. call — including the camera",
    match: (f) =>
      f.startsWith("client/src/modules/camera/") ||
      /client\/src\/screens\/RaceScreen\/(renderRaceFrame|drawing\/|renderState)/.test(
        f,
      ) ||
      /nameTagLayout|Minimap|racer-types\//.test(f) ||
      f.startsWith("client/src/modules/parity/recordingContext"),
  },
];

/** The files that select a given guard, using the one table above. */
export function selectedBy(guard, files, reach) {
  const rule = ROUTES.find((r) => r.guard === guard);
  if (!rule) return [];
  return files.filter((f) => rule.match(f, reach ?? new Set()));
}

/** The plan: every guard, whether it runs, and WHY — including the ones that do not. */
export function plan(files) {
  const reach = new Set(engineReach().files);
  const hits = Object.fromEntries(
    ROUTES.map((r) => [r.guard, files.filter((f) => r.match(f, reach))]),
  );
  const why = (guard) => {
    const h = hits[guard];
    const rule = ROUTES.find((r) => r.guard === guard);
    if (h.length)
      return `${h.length} file(s) matched (${h.slice(0, 2).join(", ")}${h.length > 2 ? ", …" : ""})`;
    // The skip reason NAMES THE RULE, so what the map believes is visible without reading the code.
    return `nothing matched — this guard covers: ${rule.what}`;
  };

  const cmd = {
    "doc-guards": {
      cmd: ["node", "scripts/check-doc-links.mjs"],
      also: [
        ["node", "scripts/check-index.mjs"],
        // reports/night/ and reports/parity/ were outside every guard until ONE-TRUTH-2 stage 5.
        // Same guard, three directories — one index discipline, not three implementations.
        [
          "node",
          "scripts/check-index.mjs",
          "--dir=reports/night",
          "--index=reports/night/INDEX.md",
        ],
        [
          "node",
          "scripts/check-index.mjs",
          "--dir=reports/parity",
          "--index=reports/parity/INDEX.md",
        ],
        ["node", "scripts/check-tags.mjs"],
        ["node", "scripts/check-measured-stamps.mjs"],
        ["node", "scripts/check-config-claims.mjs"],
        ["node", "scripts/check-doc-facts.mjs"],
        ["node", "scripts/check-config-keys.mjs"],
      ],
    },
    "fingerprint-containment": {
      cmd: ["node", "scripts/check-fingerprints.mjs"],
    },
    "script-suite": { cmd: ["node", "--test", ...scriptTestFiles()] },
    "client-suite": {
      cmd: ["npm", "test", "--silent"],
      cwd: join(ROOT, "client"),
      // EXCLUSIVE, measured rather than assumed: run beside the fingerprints the suite FAILS —
      // sim-fairness.test.js carries a 5 s timeout and four CPU-saturating siblings push it past it.
      exclusive: true,
    },
    "world-fingerprint": { cmd: ["node", "scripts/fingerprint-default.mjs"] },
    "camera-fingerprint": { cmd: ["node", "scripts/camera-fingerprint.mjs"] },
    "render-fingerprint": { cmd: ["node", "scripts/render-fingerprint.mjs"] },
  };

  return ROUTES.map((r) => ({
    id: r.guard,
    ...cmd[r.guard],
    run: hits[r.guard].length > 0,
    reason: why(r.guard),
  }));
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
