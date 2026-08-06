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
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { engineReach } from "./engine-reach.mjs";

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

// ── WHICH GUARD CARES ───────────────────────────────────────────────────────────────────────────
const isDoc = (f) => f.endsWith(".md");
const isScript = (f) => f.startsWith("scripts/");
const isClient = (f) => f.startsWith("client/src/");
const isCamera = (f) => f.startsWith("client/src/modules/camera/");
// The drawing path, from SHIP-CEREMONY's own list — anything whose diff can reach a `ctx.` call.
// CAMERA COUNTS, and this was a real gap found by FINISH-COMPANY-1: a camera-only diff moved the
// render fingerprint (b6591e74102152bd -> 1f83ecc1fcb6fa9a) while this matcher had told the block it
// could not reach a `ctx.` call. Of course it can — the director decides the transform every drawn
// frame, so the draw sequence is downstream of it. The ceremony's list was written when the render
// fingerprint was new and camera work was assumed to be covered by the camera one; it is not.
const isRender = (f) =>
  f.startsWith("client/src/modules/camera/") ||
  /client\/src\/screens\/RaceScreen\/(renderRaceFrame|drawing\/|renderState)/.test(
    f,
  ) ||
  /nameTagLayout|Minimap|racer-types\//.test(f) ||
  f.startsWith("client/src/modules/parity/recordingContext");

/** The plan: every guard, whether it runs, and WHY — including the ones that do not. */
export function plan(files) {
  const reach = new Set(engineReach().files);
  const engineHits = files.filter((f) => reach.has(f));
  const docs = files.filter(isDoc);
  const scripts = files.filter(isScript);
  const client = files.filter(isClient);
  const camera = files.filter(isCamera);
  const render = files.filter(isRender);

  const why = (hits, what) =>
    hits.length
      ? `${hits.length} ${what} changed (${hits.slice(0, 2).join(", ")}${hits.length > 2 ? ", …" : ""})`
      : null;

  return [
    {
      id: "doc-guards",
      cmd: ["node", "scripts/check-doc-links.mjs"],
      also: [
        ["node", "scripts/check-index.mjs"],
        ["node", "scripts/check-tags.mjs"],
      ],
      run: docs.length > 0,
      reason: why(docs, "doc/report file(s)") ?? "no .md file changed",
    },
    {
      id: "script-suite",
      cmd: ["node", "--test", ...scriptTestFiles()],
      run: scripts.length > 0,
      reason: why(scripts, "script(s)") ?? "nothing under scripts/ changed",
    },
    {
      id: "client-suite",
      cmd: ["npm", "test", "--silent"],
      cwd: join(ROOT, "client"),
      // EXCLUSIVE, and this was measured rather than assumed. Run concurrently with the
      // fingerprints, the suite FAILS: `sim-fairness.test.js` carries a 5 s timeout and four
      // CPU-saturating siblings push it past it. A guard that goes red because of what is running
      // beside it is worse than a slow one — it teaches people to re-run until green. So the suite
      // gets the machine to itself and everything else overlaps after it.
      exclusive: true,
      run: client.length > 0,
      reason:
        why(client, "client source file(s)") ??
        "nothing under client/src/ changed",
    },
    {
      id: "world-fingerprint",
      cmd: ["node", "scripts/fingerprint-default.mjs"],
      run: engineHits.length > 0,
      reason: engineHits.length
        ? `inside the engine's reach: ${engineHits.join(", ")}`
        : client.length
          ? `${client.length} client file(s) changed but NONE is inside engine-reach's closure — the race cannot see them`
          : "nothing under client/src/ changed",
    },
    {
      id: "camera-fingerprint",
      cmd: ["node", "scripts/camera-fingerprint.mjs"],
      run: camera.length > 0,
      reason:
        why(camera, "camera file(s)") ??
        "nothing under modules/camera/ changed",
    },
    {
      id: "render-fingerprint",
      cmd: ["node", "scripts/render-fingerprint.mjs"],
      run: render.length > 0,
      reason:
        why(render, "drawing-path file(s)") ??
        "the diff cannot reach a ctx. call",
    },
  ];
}

function scriptTestFiles() {
  try {
    return execFileSync("git", ["ls-files", "scripts/*.test.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
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
      `(${sum > 0 ? (sum / wallMs).toFixed(1) : "1.0"}x)\n`,
  );
  process.exit(done.every((d) => d.ok) ? 0 : 1);
}
