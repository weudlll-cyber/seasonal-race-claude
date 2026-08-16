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
import { engineReach, splitInert } from "./engine-reach.mjs";
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
// VERIFY-COST-3: `--cheap` reaches the fingerprint jobs now. It did not: this file read its flags
// with `has()` and never forwarded anything, so `npm run verify -- --cheap` ran the FULL thing while
// looking like it had not. It cost one seven-minute run and sat uselessly in specs for weeks.
const CHEAP = has("cheap");
const CHEAP_TRACK = arg("cheap-track", null);

// ── AN ARGUMENT THIS SCRIPT DOES NOT UNDERSTAND IS AN ERROR (VERIFY-COST-3) ────────────────────
// This is the generalising half, and it is why `--cheap` could be wrong for weeks: the script
// accepted every flag and acted on the ones it recognised, so a typo, a renamed flag and a flag that
// was never implemented all behaved identically — silently, as a full run. THREE instruments in this
// project have now been caught accepting an argument they ignore.
//
// Anything not on this list stops the run before any work happens. Adding a flag means adding it
// here, which is one line and is the point.
const KNOWN_VALUE_FLAGS = ["base", "jobs", "cheap-track"];
const KNOWN_BARE_FLAGS = ["dry", "no-format", "cheap"];
function rejectUnknownFlags(argv = process.argv.slice(2)) {
  const bad = argv.filter((a) => {
    if (!a.startsWith("--")) return true;
    const eq = a.indexOf("=");
    const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
    return eq === -1
      ? !KNOWN_BARE_FLAGS.includes(name)
      : !KNOWN_VALUE_FLAGS.includes(name);
  });
  if (bad.length === 0) return;
  console.error(
    `\n  FAIL: verify does not understand ${bad.map((b) => `\`${b}\``).join(", ")}.\n` +
      `        Known: ${KNOWN_BARE_FLAGS.map((f) => `--${f}`).join(", ")}, ` +
      `${KNOWN_VALUE_FLAGS.map((f) => `--${f}=…`).join(", ")}.\n` +
      `        Refused rather than ignored: a flag that does nothing silently is how --cheap\n` +
      `        went unnoticed for weeks. See VERIFY-COST-3.\n`,
  );
  process.exit(2);
}

// ── A RUN THAT VERIFIED NOTHING MUST NOT EXIT 0 (VERIFY-BASE-1) ─────────────────────────────────
//
// THE DEFECT, found during the SHIP-THE-LINE merge. `npm run verify` on master printed
// `PASS 0  FAIL 0  SKIP 7`, exited 0, and had checked nothing at all. The cause is arithmetic: the
// routing diffs `master...HEAD`, and on master that is empty by definition, so every guard was
// correctly told it had nothing to look at. Seven honest skips add up to one dishonest exit code.
//
// The same shape has now bitten this project three times — the build badge that could detect its own
// failure and not say so, the `--cheap` flag that was accepted and ignored, and this. An instrument
// that stays quiet when it has nothing to say is worse than one that is missing, because its silence
// is read as an answer.
//
// WHY THE REFUSAL AND NOT A CLEVERER DEFAULT `--base`. Picking a base automatically on master was
// the obvious fix and it is the wrong one: "what changed" there has at least three defensible
// answers — the last commit, the last merge, or everything since the last tag — and they verify
// different things. Guessing would restore the exit code while keeping the real defect, which is a
// green run that checked something other than what the person meant. So verify REFUSES, names the
// cause, and prints the exact command for each reading. The human picks; the machine does not guess.
//
// The refusal fires for `--dry` too. `--dry`'s job is to show the plan, and a plan that runs nothing
// is exactly the plan worth failing on.
export const EXIT_REFUSED = 2;

/**
 * Why did this run select no guards, and what should the caller type instead?
 *
 * PURE, so it is tested without a repository. The main block gathers the git facts and hands them in.
 *
 * @param {object} f
 * @param {string} f.base        the --base value as given
 * @param {boolean} f.baseExists it resolves to a commit
 * @param {boolean} f.hasMergeBase it shares history with HEAD
 * @param {string} f.baseSha
 * @param {string} f.headSha
 * @param {number} f.fileCount   how many changed paths routing saw
 * @param {string} [f.suggest]   a concrete ref to offer instead (the first parent, usually)
 * @returns {{headline: string, remedy: string[]}}
 */
export function describeEmptyRun({
  base,
  baseExists,
  hasMergeBase,
  baseSha,
  headSha,
  fileCount,
  suggest,
}) {
  const pick = suggest || "HEAD~1";
  if (!baseExists)
    return {
      headline: `--base=${base} does not resolve to a commit, so the diff was empty for a reason that has nothing to do with your work.`,
      remedy: [
        `check the ref name`,
        `npm run verify -- --base=<a real commit or branch>`,
      ],
    };
  if (!hasMergeBase)
    return {
      headline: `--base=${base} shares no history with HEAD, so there is no diff to route.`,
      remedy: [`use a ref on this history`, `npm run verify -- --base=${pick}`],
    };
  // `--base=HEAD` is not "compare me to HEAD", it is the documented way to say "only my uncommitted
  // work". Diagnosing it as "you are on the base" would be true and unhelpful: the caller knows
  // where they are, and what they need to hear is that there is nothing uncommitted.
  if (base === "HEAD")
    return {
      headline: `--base=HEAD means "only uncommitted work", and the tree is clean — there is nothing uncommitted to verify.`,
      remedy: [
        `to verify what the last commit put here:`,
        `  npm run verify -- --base=${pick}`,
        `to verify the whole branch against master:`,
        `  npm run verify`,
      ],
    };
  if (baseSha === headSha)
    return {
      headline:
        `you are ON ${base} — HEAD and the base are the same commit (${headSha.slice(0, 8)}), ` +
        `so \`${base}...HEAD\` is empty by definition and every guard is correctly told it has nothing to look at.`,
      remedy: [
        `to verify what the last commit or merge put here:`,
        `  npm run verify -- --base=${pick}`,
        `to verify only uncommitted work (and there must be some):`,
        `  npm run verify -- --base=HEAD`,
      ],
    };
  if (fileCount === 0)
    return {
      headline: `nothing has changed against ${base}, so there is nothing to verify.`,
      remedy: [`this is not a failure of your work — there simply is no diff`],
    };
  // Currently unreachable: `fingerprint-containment` matches every path, so any changed file selects
  // at least one guard. Kept because that is a property of one route rule, not a law — if the
  // catch-all is ever narrowed, this is the case that must not become a silent green again.
  return {
    headline: `${fileCount} file(s) changed but none of them reaches any guard.`,
    remedy: [
      // NOT "check the route table": VERIFY-ROUTING-2 DELETED it, and this line went on naming it
      // for as long as nothing could reach the line to read it (NIGHT-2026-08-18). A guard now
      // declares its own routing, so the place to look is the guard.
      `run \`npm run verify -- --dry\` and read what each guard declares — routing lives in the guards, not in a table here`,
    ],
  };
}

/** The flags a spawned fingerprint job inherits. One home, so a new one cannot reach only some. */
export function cheapArgs(cheap = CHEAP, track = CHEAP_TRACK) {
  if (!cheap) return [];
  return ["--cheap", ...(track ? [`--cheap-track=${track}`] : [])];
}

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

// ── THE ROUTING COMES FROM THE GUARDS (VERIFY-ROUTING-2) ────────────────────────────────────────
//
// There is no route table here any more. Each guard declares what it covers, in its own file, and
// `scripts/lib/routing.mjs` collects those declarations — see that file for why, and for the five
// misses the table produced. The last of them is the one this block was opened for: the config
// guards were bundled into `doc-guards`, which only markdown selects, so a pure JS change never ran
// `check-config-keys` or `check-fallback-agreement` under verify.
//
// WHAT REPLACES `doc-guards`: nothing. It was a BUNDLE — nine guards behind one route — and a
// bundle can only ever have one dependency set, which is exactly how eight of its members inherited
// "markdown changed" as their trigger. They are nine tasks now, each with its own declaration, each
// selected on its own terms.
const _collect = (() => {
  let cached = null;
  return () => (cached ??= collect());
})();

/** How a guard is INVOKED. Routing is declared by the guard; argv stays here, where the flags live. */
export function commandFor(g) {
  if (g.id === "client-suite")
    return {
      cmd: ["npm", "test", "--silent"],
      cwd: join(ROOT, "client"),
      exclusive: true,
    };
  // WIRE-SUITES-1. `--no-file-parallelism` is the server package's OWN `npm test`, not a flag added
  // here: the suite writes a real sqlite session store, so files sharing it cannot run concurrently.
  // Invoked through the package script rather than by spelling out vitest, so the suite keeps ONE
  // definition of how it runs — the same reason client-suite calls `npm test`.
  if (g.id === "server-suite")
    return {
      cmd: ["npm", "test", "--silent"],
      cwd: join(ROOT, "server"),
      // NOT exclusive, unlike client-suite. That flag exists because the client suite saturates the
      // machine for ~200 s; this one is 42 s and its `--no-file-parallelism` already keeps it to a
      // single worker, so it is the cheapest thing in the run to overlap with a fingerprint.
    };
  if (g.id === "script-suite")
    return { cmd: ["node", "--test", ...scriptTestFiles()] };
  // VERIFY-COST-3: `--cheap` is forwarded HERE, the only place the three are spawned. `cheapArgs()`
  // is one home so a fourth fingerprint job cannot be added and quietly miss it.
  const cheap = [
    "world-fingerprint",
    "camera-fingerprint",
    "render-fingerprint",
  ].includes(g.id);
  // DOC-AUDIT-2 B: this one is a GENERATOR, and with no argv it REWRITES docs/SIM.md. Verify must
  // never write a tracked file, so the flag that makes it read-only lives here with the other argv.
  if (g.id === "engine-reach-doc")
    return { cmd: ["node", g.source, "--check"] };
  // CEREMONY-COUNTS-GENERATED: the same rule for the ceremony's generator, and the flag is
  // `--check-counts` rather than `--check` on purpose. Plain `--check` also fails when the guard
  // COST table is more than 40 commits old, and a stale duration is a thing to re-measure, not a
  // reason to fail somebody's build. The counts are recomputed in milliseconds and are either right
  // or wrong, so that is the half verify asks about.
  if (g.id === "ceremony-counts")
    return { cmd: ["node", g.source, "--check-counts"] };
  // FP-COMPARE-1: the world fingerprint must COMPARE against the record, not print and pass. It
  // measured-and-did-not-check until 2026-08-14, when a renamed column moved the hash, verify
  // printed the new value and reported PASS, and the defect reached master green. `--check` is
  // inert under --cheap (a one-track hash cannot be compared to a ten-track record) and the script
  // says so rather than passing silently.
  if (g.id === "world-fingerprint")
    return {
      cmd: ["node", g.source, ...(cheap ? cheapArgs() : []), "--check"],
    };
  const base = ["node", g.source, ...(cheap ? cheapArgs() : [])];
  // check-index is ONE guard with THREE report directories — one index discipline, not three
  // implementations. The extra invocations are argv, not routing.
  if (g.id === "check-index")
    return {
      cmd: base,
      also: [
        [
          "node",
          g.source,
          "--dir=reports/night",
          "--index=reports/night/INDEX.md",
        ],
        [
          "node",
          g.source,
          "--dir=reports/parity",
          "--index=reports/parity/INDEX.md",
        ],
      ],
    };
  return { cmd: base };
}

/**
 * The plan: every guard, whether it runs, and WHY — including the ones that do not.
 *
 * @param {string[]} files  the changed paths
 * @param {string} [base]   the ref the diff is against; used to ask whether a hull change is INERT
 * @param {(paths: string[], base: string) => {hit: string[], inert: {path,reason}[]}} [splitter]
 *   the seam the ROUTING tests use — they pass synthetic paths that are byte-identical to the base,
 *   which the real splitter correctly calls inert.
 * @param {object[]} [guards] injected guard set, so the tests do not spawn thirteen processes
 */
export function plan(files, base = BASE, splitter = splitInert, guards = null) {
  const gs = guards ?? _collect().guards;
  // VERIFY-COST-2: a hull file whose edit is comments and whitespace only cannot change what the
  // engine computes, so it does not select the world fingerprint. REPORTED below, never silent.
  const hull = new Set(engineReach().files);
  const hullHits = files.filter((f) => hull.has(f));
  const { inert } = hullHits.length
    ? splitter(hullHits, base)
    : { hit: [], inert: [] };
  const inertSet = new Set(inert.map((i) => i.path));

  return gs.map((g) => {
    let hits = files.filter((f) => g.matches(f));
    if (g.id === "world-fingerprint")
      hits = hits.filter((f) => !inertSet.has(f));
    const inertNote =
      g.id === "world-fingerprint" && !hits.length && inert.length
        ? `  ·  ${inert.length} hull file(s) changed but are INERT (${inert.map((i) => i.path).join(", ")}): comments and whitespace only, identical tokens`
        : "";
    return {
      id: g.id,
      ...commandFor(g),
      run: hits.length > 0,
      reason: reasonFor(g, hits) + inertNote,
      covers: g.covers,
      blind: g.blind ?? [],
      // CARRIED THROUGH so a consumer can ask the DECLARATION whether a guard is always-on rather
      // than keeping a list of names. The routing tests kept such a list and it needed editing both
      // times an always-on guard was added — a second statement of something the declaration
      // already makes, which is the exact failure VERIFY-ROUTING-2 exists to end.
      everything: g.everything === true,
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
  // BEFORE ANY WORK. A refused flag must cost nothing, or the refusal is worse than the silence.
  rejectUnknownFlags();

  // ── REACH-CONTRACT-1: A BROKEN DECLARATION REFUSES THE RUN ────────────────────────────────────
  //
  // `closureOf` returns [] for a path that does not exist, so a `reach` entry naming a renamed file
  // silently contributes NOTHING: the guard still declares itself, still prints its `reach=N entry
  // point(s)` line, and quietly stops selecting on everything that file imports. Verify then SKIPS
  // it for a diff it should have run on, with a skip reason that reads perfectly honest.
  //
  // Refusing rather than warning, and BEFORE the plan is computed, because the plan itself is the
  // thing that cannot be trusted: a route computed from a broken declaration is not a route, and
  // printing it would give the run the appearance of having decided something.
  //
  // Exit ${EXIT_REFUSED} = refused, the same code an empty run uses (R0a). It is not a guard failure.
  const { invalid } = _collect();
  if (invalid.length) {
    console.error(
      `\n  REFUSED: ${invalid.length} declared path(s) do not resolve, so the routing cannot be trusted.\n`,
    );
    for (const p of invalid)
      console.error(`           ${p.id}  ${p.kind}: ${p.path}\n             ${p.why}`);
    console.error(
      `\n           Fix the declaration in the guard, or restore the path. A declaration that\n` +
        `           names something gone is a guard whose coverage has silently shrunk — which\n` +
        `           looks exactly like coverage. Exit ${EXIT_REFUSED} = refused, not a guard failure.\n`,
    );
    process.exit(EXIT_REFUSED);
  }

  const files = changedFiles();
  const tasks = plan(files);
  const chosen = tasks.filter((t) => t.run);
  const skipped = tasks.filter((t) => !t.run);

  console.log(`\nVERIFY — ${files.length} changed file(s) vs ${BASE}\n`);
  console.log("  WILL RUN:");
  for (const t of chosen) console.log(`    ${t.id.padEnd(26)} ${t.reason}`);
  if (!chosen.length) console.log("    (nothing — the diff reaches no guard)");
  console.log("\n  SKIPPED, and why:");
  for (const t of skipped) console.log(`    ${t.id.padEnd(26)} ${t.reason}`);

  // VERIFY-ROUTING-2: what the guards that WILL RUN say they do NOT cover — in their own words,
  // from their own `blind` lists. A green verify is a statement about what WAS checked; this is the
  // statement about what was not, and it prints on green runs precisely because that is when nobody
  // goes looking for it.
  const holes = chosen.flatMap((t) => (t.blind ?? []).map((b) => [t.id, b]));
  if (holes.length) {
    console.log(
      "\n  NOT COVERED by the guards that will run — their own words:",
    );
    for (const [id, b] of holes) console.log(`    ${id.padEnd(26)} ${b}`);
  }
  console.log("");

  // VERIFY-BASE-1. Nothing will run, so nothing can be verified, so this cannot be a success.
  if (chosen.length === 0) {
    const git1 = (args) => {
      try {
        return execFileSync("git", args, {
          cwd: ROOT,
          encoding: "utf8",
        }).trim();
      } catch {
        return null;
      }
    };
    const baseSha =
      BASE === "HEAD"
        ? git1(["rev-parse", "HEAD"])
        : git1(["rev-parse", `${BASE}^{commit}`]);
    const headSha = git1(["rev-parse", "HEAD"]);
    const { headline, remedy } = describeEmptyRun({
      base: BASE,
      baseExists: !!baseSha,
      hasMergeBase: !!(baseSha && git1(["merge-base", BASE, "HEAD"])),
      baseSha: baseSha ?? "",
      headSha: headSha ?? "",
      fileCount: files.length,
      // The first parent is the honest "what did the last commit or merge put here", and on a merge
      // commit it is the branch that received it rather than the branch that arrived.
      suggest: git1(["rev-parse", "--short=8", "HEAD^1"]) ?? undefined,
    });
    console.error(
      `  REFUSED: this run would verify NOTHING, and a run that verified nothing must not exit 0.\n\n` +
        `           ${headline}\n\n` +
        remedy.map((r) => `           ${r}`).join("\n") +
        `\n\n           (VERIFY-BASE-1. The seven skips above are each correct; it is their SUM\n` +
        `           that is the problem. Exit ${EXIT_REFUSED} = refused, not a guard failure.)\n`,
    );
    process.exit(EXIT_REFUSED);
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
