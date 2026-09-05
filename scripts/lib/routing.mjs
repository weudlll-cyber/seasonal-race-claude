// ============================================================
// File:        scripts/lib/routing.mjs
// Project:     RaceArena — VERIFY-ROUTING-2 (design from VERIFY-ROUTING-1)
//
// WHERE `npm run verify` GETS ITS ROUTING FROM: the guards themselves.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────────
// `verify.mjs` carried a hand-maintained table of matchers — one predicate per guard, written by
// whoever added the guard and updated by whoever remembered. It chose wrong five times, and every
// one was found by accident rather than by a guard:
//
//   1. the client matcher looked only at `client/src/` — too narrow
//   2. it skipped the client suite when `client/vitest.config.js` changed, because a config file is
//      in no source directory
//   3. it did not run the render guard when `scripts/render-fingerprint.mjs` changed, so a block
//      that altered the INSTRUMENT was verified without it
//   4. `check-measured-stamps` was routed by "markdown changed", while what it depends on is
//      whatever its stamps say `depends=` — on this repo, the camera
//   5. THE ONE FOUND AT THE SHIP: the config guards were bundled into `doc-guards`, which only
//      markdown selects, so a pure JS change never ran `check-config-keys` or
//      `check-fallback-agreement` under verify. They fired in the hook and in CI — which is where
//      they catch things — but verify was quietly blind to them.
//
// Fixing five entries would leave the sixth. The defect is not in the entries: it is that the
// routing is a SECOND statement of something the guard already knows, and a second statement can
// fall behind. So each guard DECLARES what it covers, and this module collects those declarations.
//
// ── WHAT MAKES A DECLARATION UNABLE TO FALL BEHIND ───────────────────────────────────────────────
//
//   SELF, computed and never declared. A guard always depends on its own source AND on everything
//   that source statically imports, transitively — the import closure of the file the declaration
//   lives in. Nothing can forget it. That is miss 3 and miss 5's cousin closed for every guard that
//   exists or will exist, by construction.
//
//   REACH, declared. The measurement harnesses reach into `client/` through
//   `await import(u("client/..."))`, which a static walk of `from "..."` cannot follow. Those entry
//   points are declared, and every declared path is checked to EXIST — `declaredPathProblems` below,
//   REACH-CONTRACT-1, and `verify` refuses the run rather than routing on a declaration it cannot
//   trust.
//
//   ★ AND IT IS GUARANTEED BY CONSTRUCTION — established 2026-09-05 (INVISIBLE-FOUR-1), after two
//   earlier attempts to describe it got it wrong in opposite directions.
//
//   The paragraph first claimed a `routing.test.mjs` extracted every such literal and failed if one
//   fell outside the guard's set. **THERE IS NO `routing.test.mjs`** and never was, so
//   GATE-WIRED-AND-CAUSED-1 corrected it to say the property held "by inspection, not by
//   construction". **THAT CORRECTION WAS ALSO WRONG, and this is the measurement that settles it.**
//
//   `dataReach` already closes it. Its rule — its own header states it — is: *if a guard's own code
//   names a tracked repository path, a change to that path selects the guard.* A dynamically
//   imported STRING LITERAL is, by definition, the guard's code naming a path. So the literal is in
//   the guard's resolved set the moment it is written, with no declaration needed and no test to
//   forget. PROVED by sabotage rather than argued: giving `check-ending-frame` an
//   `import(u("server/src/index.js"))` — a path far outside its declared `drawing/` directory —
//   makes `matches("server/src/index.js")` return TRUE, via `dataDirs`, with `dataFrom` naming
//   `scripts/check-ending-frame.mjs` as the file that named it.
//
//   A guard written to check this was built on the same date and DELETED rather than shipped: it
//   read 36 literals across 25 guards, found 0 outside their sets, and could not be made to fail —
//   an inert guard that would have looked like coverage forever. The one thing it did catch was
//   itself, reading the examples in its own header.
//
//   ★ THE RESIDUAL, which no static check can close: a dynamic import whose specifier is a VARIABLE
//   — `import(spec)`, `import(pathToFileURL(join(ROOT, m)))`. There are TEN in the guards today.
//   `dataReach` cannot see a path that is computed rather than written, and neither could any
//   reader. That is the honest edge of this guarantee, and it is stated rather than left implied.
//
//   DIRS / FILES, declared plainly. Containment for what no import can reach: a directory of
//   documents, a suite's own configuration. This is the only genuinely hand-written part, it is
//   small, and it is asserted in both directions by tests.
//
// ── WHAT A DECLARATION LOOKS LIKE ────────────────────────────────────────────────────────────────
//
//   export const GUARD = {
//     id: "check-config-keys",
//     covers: "one sentence: what this guard would notice",
//     blind: ["what it does NOT cover", "..."],   // REQUIRED, non-empty
//     dirs: ["client/src/"], files: [], notDirs: [], reach: [],
//   };
//   if (process.argv.includes("--declare")) { console.log(JSON.stringify(GUARD)); process.exit(0); }
//
// The `--declare` branch is how this module reads a guard WITHOUT importing it: several guards do
// their work at module load, and a router that had to run a four-minute fingerprint to discover
// what it depends on would be worse than the table it replaces. It costs one short-lived process
// per guard — measured at about a second for all thirteen, against verify runs of minutes.
//
// `blind` is REQUIRED and must be non-empty. Every guard states in itself what it does not cover,
// so the hole is written down by the person who knows it rather than discovered by the person who
// does not — and so verify can print a NOT COVERED section that is the guards' own words.
// ============================================================

import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { engineReach } from "../engine-reach.mjs";
import { dataReach } from "./dataReach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(ROOT, "scripts");

/** The import closure of a repo-relative entry file, as repo-relative paths. */
export function closureOf(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return [];
  return engineReach(abs).files;
}

// ── THE DECLARATION IS A CONTRACT (REACH-CONTRACT-1) ────────────────────────────────────────────
//
// `closureOf` returns [] for a path that does not exist, and THAT is the silent failure this
// checks. A guard declaring `reach: ["client/src/modules/raceCore.js"]` for a file that has since
// been renamed contributes NOTHING to its own dependency set: the guard keeps declaring itself,
// keeps printing a `reach=1 entry point(s)` line, and quietly stops selecting on anything that file
// imports. `npm run verify` then SKIPS it for a diff it should have run on, and prints an honest
// skip reason for a set that has silently shrunk — which is the worst shape a guard can take,
// because it looks exactly like coverage.
//
// `files:` and `dirs:` have the same hole from the other direction: a declared path that does not
// exist never matches anything, so the guard narrows without saying so.
//
// THE DECLARED `reach` WAS CORRECT FOR YEARS AND READ BY NOBODY. It stayed correct by luck. This
// makes it correct by construction.
//
// WHERE THIS LIVES, AND WHY NOT IN A `check-*.mjs` GUARD. A guard checking the router would itself
// be ROUTED BY THE ROUTER — the one path that most needs the check is the one that could skip it.
// So it lives in the resolver: every consumer of a declaration (verify, engine-reach, the tests)
// gets it for free and none of them can opt out.
const KINDS = [
  ["reach", "file"],
  ["files", "file"],
  ["dirs", "dir"],
  ["notDirs", "dir"],
];

/**
 * Every declared path in `d` that does not exist, or exists as the wrong kind of thing.
 * @returns {{id:string, kind:string, path:string, why:string}[]}
 */
export function declaredPathProblems(d) {
  const out = [];
  for (const [key, kind] of KINDS) {
    for (const p of d[key] ?? []) {
      const abs = join(ROOT, p);
      if (!existsSync(abs)) {
        out.push({
          id: d.id,
          kind: key,
          path: p,
          why:
            key === "reach"
              ? "does not exist — its closure resolves to NOTHING, so this guard silently stops selecting on everything that file reaches"
              : "does not exist — it can never match, so this guard is narrower than it declares",
        });
        continue;
      }
      const isDir = statSync(abs).isDirectory();
      if (kind === "dir" && !isDir)
        out.push({ id: d.id, kind: key, path: p, why: "is a FILE, but this key names directories" });
      if (kind === "file" && isDir)
        out.push({ id: d.id, kind: key, path: p, why: "is a DIRECTORY, but this key names files" });
    }
  }
  return out;
}

// ── THE TWO SUITES ───────────────────────────────────────────────────────────────────────────────
// A suite is not a script, so it has no file of its own to speak from. Their declarations live here
// and they are the only two that do. Both are pure CONTAINMENT — a suite depends on everything it
// could load — which is also why both of their historical misses were containment mistakes.
export const SUITE_GUARDS = [
  {
    id: "client-suite",
    suite: true,
    covers:
      "every vitest test under client/, and everything they import — including the configuration that decides how the suite runs",
    blind: [
      "client/e2e/ — Playwright, excluded from vitest by vitest.config.js, so a change there must NOT select this suite",
      "the server: nothing under server/ is loaded by it",
      "whether the tests are the RIGHT tests. It runs what exists.",
    ],
    // `client/`, NOT `client/src/`: vitest.config.js, package.json and the setup files decide how
    // the suite RUNS. Naming the source subdirectory was misses 1 and 2 — the same mistake twice.
    dirs: ["client/"],
    notDirs: ["client/e2e/"],
    files: [],
    reach: [],
    exclusive: true,
  },
  {
    // WIRE-SUITES-1: 19 files and 615 tests that no invoker ran. Not the hook, not verify, not CI —
    // they looked like coverage and were none (CHECK-AUDIT-1). Run green on master as they stood
    // (615/615, 41.8 s), so they were wired unchanged; nothing in them was edited to make that true.
    id: "server-suite",
    suite: true,
    covers:
      "every vitest test under server/, and everything they import — including the configuration that decides how the suite runs",
    blind: [
      "the client: nothing under client/ is loaded by it",
      "the race engine — the server neither imports nor drives it, so this suite can never speak to a fingerprint",
      "whether the tests are the RIGHT tests. It runs what exists.",
    ],
    // `server/`, not `server/src/`, for the reason client-suite records in the comment below: the
    // package manifest and vitest configuration decide how the suite RUNS, and naming the source
    // subdirectory was that guard's misses 1 and 2. Learning it here rather than repeating it.
    dirs: ["server/"],
    notDirs: [],
    files: [],
    reach: [],
    exclusive: false,
  },
  // ── VERIFY-LINT-1 (2026-09-05): THE TWO CHECKS CI RUNS AND `verify` DID NOT ──────────────────
  //
  // ESTABLISHED AT SOURCE, not carried from a report. `.github/workflows/ci.yml`'s Client job runs
  // `npm run lint` and `npm run format:check`; `verify` ran neither. What it DID run is
  // `npm run format` — the FORMATTER, which writes — so the tree it measures is the tree the hook
  // will commit. A formatter is not a check: it cannot fail, and it says nothing about a tree
  // somebody formatted differently.
  //
  // ONLY THE CLIENT, and that is not an omission: `server/package.json` declares NO `lint` and NO
  // `format` script of any kind, and CI's Server job runs neither. Checked at source on 2026-09-05.
  // If the server ever gains them, it gains a guard here in the same shape.
  {
    id: "client-lint",
    covers:
      "eslint over client/src — the check CI's Client job runs and `verify` did not, so a lint fault was invisible until after the merge",
    blind: [
      "the server, which declares no lint script at all",
      "scripts/ and the repository root: eslint is scoped to `client/src` by the client's own `lint` script",
      "whether the RULES are the right rules. It runs the configuration that exists.",
    ],
    dirs: ["client/"],
    notDirs: ["client/e2e/"],
    files: [],
    reach: [],
    exclusive: false,
  },
  {
    id: "client-format-check",
    covers:
      "prettier --check over client/src — whether the tree AS IT STANDS is formatted, which is the question CI asks of the committed tree",
    blind: [
      "the server, which declares no format script at all",
      "everything outside `client/src`: both the format and the check are scoped there by the client's own scripts, so they cannot disagree about scope",
    ],
    dirs: ["client/"],
    notDirs: ["client/e2e/"],
    files: [],
    reach: [],
    exclusive: false,
  },
  {
    id: "script-suite",
    suite: true,
    covers: "every scripts/**/*.test.mjs, and the scripts they exercise",
    blind: [
      "it runs the guards' TESTS, not the guards against this repo — a guard can pass its own tests and still be failing on the tree; that is what the guard tasks are for",
      "nothing outside scripts/ selects it",
    ],
    dirs: ["scripts/"],
    notDirs: [],
    files: [],
    reach: [],
    exclusive: false,
  },
];

/**
 * Every guard script on disk — DISCOVERED, so a new guard is routed the moment it exists.
 *
 * WHY THE SET IS A NAME PATTERN AND NOT "EVERY .mjs": `declarationOf` RUNS the file to ask it, and
 * most scripts here are harnesses and generators that do their work at module load. Asking a sweep
 * what it covers would run the sweep.
 *
 * `gen-engine-reach-doc.mjs` is named EXPLICITLY rather than by widening the pattern to `gen-*`,
 * and the distinction is the point: a generator run with no arguments REWRITES its document. This
 * one is safe to ask because it declares and exits before doing anything, and `verify.mjs` gives it
 * `--check`. Any other generator must earn its place the same way, one name at a time — a `gen-*`
 * wildcard would enrol the next one automatically and in write mode.
 *
 * `gen-ceremony-costs.mjs` is the second name to earn it (CEREMONY-COUNTS-GENERATED), and it is the
 * sharpest case yet for why this list is names and not a wildcard: run with no arguments it does not
 * merely rewrite a document, it spends FIVE MINUTES running six guards first. It qualifies on the
 * same two conditions — it declares and exits before any of that, and `verify.mjs` gives it
 * `--check-counts`.
 *
 * `viewer-invariants.mjs` is the third name to earn it (GATE-WIRED-AND-CAUSED-1), and it is the one
 * that would be most expensive to get wrong: run with no arguments it builds the client, boots an
 * isolated API and preview server, opens Chromium and drives forty races. It qualifies on exactly
 * the same two conditions as the other two — its `--declare` branch is the first statement after the
 * declaration object and MEASURED at 0.28 s, before any of that can start, and `verify.mjs` gives it
 * `--gate`. Until this line it declared its routing to nobody: it matched no pattern here, so its
 * declaration was never read, and it was wired to no `verify` run, no CI job, no hook and no npm
 * script. A guard nothing invokes is not a guard.
 *
 * IT DOES NOT RECURSE, and that is worth knowing rather than discovering (NIGHT-2026-08-18 finding
 * 16). `readdirSync` reads the top level of `scripts/` only, so a guard placed in a subdirectory
 * would never be discovered, never routed and never run locally — silently, because nothing counts
 * what it did not find. There are none today, so this is latent rather than a defect; the sibling
 * `scriptTestFiles()` in `verify.mjs` had exactly this bug once and was moved to `git ls-files` for
 * it. If a guard ever needs a subdirectory, this is the line that has to change with it.
 */
export function guardScripts(dir = SCRIPTS) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".mjs") || f.endsWith(".test.mjs")) continue;
    if (
      !/^check-.*\.mjs$|-fingerprint\.mjs$|^fingerprint-default\.mjs$|^gen-engine-reach-doc\.mjs$|^gen-ceremony-costs\.mjs$|^viewer-invariants\.mjs$/.test(
        f,
      )
    )
      continue;
    out.push(`scripts/${f}`);
  }
  return out.sort();
}

/**
 * Ask one guard script what it depends on. Returns null when it declares nothing — which `collect`
 * REPORTS as undeclared rather than papering over with an invented route.
 */
export function declarationOf(relScript) {
  let raw;
  try {
    raw = execFileSync(process.execPath, [relScript, "--declare"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 20000,
      // stderr IGNORED: several guards print an elapsed-time line on exit, and execFileSync
      // forwards a child's stderr by default — so simply ASKING thirteen guards what they cover
      // printed thirteen stray lines above the plan.
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  const line = raw.split("\n").find((l) => l.trim().startsWith("{"));
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Every test file under a declared directory — the ENTRIES of a suite guard.
 *
 * DERIVED FROM WHAT THE GUARD ALREADY DECLARES. A suite's `dirs` is the tree it runs; its entries
 * are the test files in that tree. Nothing new is declared and there is no list to fall off.
 */
function testFilesUnder(dirs) {
  const out = [];
  const walk = (abs, relPath) => {
    let entries;
    try {
      entries = readdirSync(abs);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      const childAbs = `${abs}/${name}`;
      const childRel = relPath ? `${relPath}/${name}` : name;
      let st;
      try {
        st = statSync(childAbs);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(childAbs, childRel);
      else if (/\.test\.(mjs|jsx?|tsx?)$/.test(name)) out.push(childRel);
    }
  };
  for (const d of dirs) walk(`${ROOT}/${d.replace(/\/$/, "")}`, d.replace(/\/$/, ""));
  return out;
}

/** Turn a declaration into a resolved guard: a concrete file set plus a `matches(file)`. */
export function resolveGuard(d) {
  // SELF IS NOT DECLARED AND CANNOT BE FORGOTTEN — the closure of the file the declaration lives in.
  const self = d.source ? closureOf(d.source) : [];
  const reached = (d.reach ?? []).flatMap(closureOf);
  const files = new Set([...self, ...reached, ...(d.files ?? [])]);
  const dirs = d.dirs ?? [];
  const notDirs = d.notDirs ?? [];

  // ── ENGINE-REACH-DATA-FIX-1: WHAT THE GUARD'S CODE NAMES, NOT ONLY WHAT IT IMPORTS ───────────
  //
  // An import closure cannot reach a JSON file, so nothing that ships as DATA selected any guard.
  // Measured cost of that hole: the 2026-08-25 garden-path icon change broke
  // `scripts/track-defaults.test.mjs`, `script-suite` was not selected because it routes on
  // `scripts/` and the change was under `server/seeds/`, and **master's CI was red for a day while
  // the merge reported green**.
  //
  // So a guard also selects on any TRACKED repository path its own code names. Entries are the
  // guard's own closure, its declared reach, and — for a suite — the test files under the tree it
  // runs, which is derived from the `dirs` it already declares. `dataReach` explains itself: it
  // records which file named each path, so a selection can be justified rather than asserted.
  const suiteEntries = d.suite ? testFilesUnder(dirs) : [];
  const named =
    d.everything || (!self.length && !reached.length && !suiteEntries.length)
      ? { paths: [], from: {} }
      : dataReach([...self, ...reached, ...suiteEntries]);
  // Only paths the guard does not ALREADY match are worth carrying — the rest change nothing and
  // would make the reported reason longer without making it truer.
  const dataDirs = named.paths.filter(
    (p) => !dirs.some((x) => p.startsWith(x)) && !files.has(p)
  );

  const matches = (f) => {
    if (notDirs.some((p) => f.startsWith(p))) return false;
    if (files.has(f)) return true;
    if (dirs.some((p) => f.startsWith(p))) return true;
    // A directory the code named matches its contents; a file matches itself.
    return dataDirs.some((p) => f === p || f.startsWith(`${p}/`));
  };
  return {
    ...d,
    self,
    files: [...files].sort(),
    dirs,
    notDirs,
    dataDirs,
    dataFrom: named.from,
    // `everything` is declared by the containment guard alone: a stray fingerprint copy can be
    // pasted into any file, so no subset of paths would be safe to skip.
    matches: d.everything ? () => true : matches,
  };
}

/**
 * Every guard, with its dependency set resolved.
 *
 * @param {(rel:string)=>object|null} [read] injection point for the tests, which must exercise the
 *   collector without spawning thirteen node processes
 * @returns {{guards: object[], undeclared: string[]}}
 */
export function collect(read = declarationOf, scripts = guardScripts()) {
  const guards = [];
  const undeclared = [];
  // REACH-CONTRACT-1: collected here rather than thrown, so a caller decides what a broken
  // declaration means. `verify` REFUSES on it; the tests assert on it. Either way it is never
  // silently absorbed the way `closureOf`'s empty array absorbs it today.
  const invalid = [];
  for (const rel of scripts) {
    const d = read(rel);
    if (!d || !d.id) {
      undeclared.push(rel);
      continue;
    }
    invalid.push(...declaredPathProblems(d));
    guards.push(resolveGuard({ ...d, source: rel }));
  }
  for (const s of SUITE_GUARDS) {
    invalid.push(...declaredPathProblems(s));
    guards.push(resolveGuard({ ...s, source: null }));
  }
  guards.sort((a, b) => a.id.localeCompare(b.id));
  return { guards, undeclared, invalid };
}

/**
 * The one-line, MACHINE-CHECKABLE account of why a guard ran or did not.
 *
 * The old skip line was a sentence somebody wrote ("nothing matched — this guard covers: markdown
 * anywhere"). A reader could not tell whether it was still true. This prints the DECLARATION: how
 * many files the set resolved to, where they came from, and which changed paths selected it.
 */
export function reasonFor(g, hits) {
  const shape = g.everything
    ? "every path (declared always-on)"
    : [
        `${g.files.length} file(s) by import closure`,
        g.dirs.length ? `dirs=${g.dirs.join(",")}` : null,
        g.notDirs.length ? `except=${g.notDirs.join(",")}` : null,
        g.reach?.length ? `reach=${g.reach.length} entry point(s)` : null,
        // ENGINE-REACH-DATA-FIX-1: the paths this guard's code NAMES but does not import. Printed
        // because the whole defect was a routing decision nobody could see — a guard that selects
        // for a reason it cannot state is one nobody will notice going stale.
        g.dataDirs?.length ? `names=${g.dataDirs.length} path(s) it does not import` : null,
      ]
        .filter(Boolean)
        .join(" · ");
  if (hits.length) {
    const sample = hits.slice(0, 2).join(", ") + (hits.length > 2 ? ", …" : "");
    return `${hits.length} changed (${sample})  ·  declares ${shape}`;
  }
  return `nothing changed  ·  declares ${shape}`;
}

export { ROOT };
