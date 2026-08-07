// ============================================================
// File:        scripts/lib/routing.mjs
// Project:     RaceArena — VERIFY-ROUTING-1
//
// WHERE `npm run verify` GETS ITS ROUTING FROM: the guards themselves.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────────
// `verify.mjs` used to carry a hand-maintained table of matchers — one regex or prefix test per
// guard, written by whoever added the guard, updated by whoever remembered. It chose wrong four
// times, and every one was found by accident rather than by a guard:
//
//   1. the client matcher looked only at `client/src/` — three times too narrow
//   2. it skipped the client suite when `client/vitest.config.js` changed, because a config file is
//      in no source directory
//   3. it did not run the render guard when `scripts/render-fingerprint.mjs` changed, so a block
//      that altered the INSTRUMENT was verified without it
//   4. `check-measured-stamps` was routed by "markdown changed", while what it actually depends on
//      is whatever its stamps say `depends=` — on this repo, the camera. A camera-only commit never
//      ran it. (Found by this block; see routing.test.mjs.)
//
// Fixing four entries would leave the fifth. The defect is not in the entries, it is that the
// routing is a SECOND statement of something the guard already knows — and a second statement can
// fall behind. So each guard now DECLARES its own dependencies, and this module collects them.
//
// ── WHAT MAKES A DECLARATION UNABLE TO FALL BEHIND ───────────────────────────────────────────────
// Three things, in order of how much they carry:
//
//   SELF, computed. A guard always depends on its own source AND on everything that source
//   statically imports, transitively. Nothing is declared for this and nothing can forget it — it
//   is the import closure of the file the declaration lives in. That is case 3, closed for every
//   guard that exists or will exist.
//
//   REACH, declared but CROSS-CHECKED. The measurement harnesses reach into `client/` through
//   `await import(u("client/..."))`, which a static walk of `from "..."` cannot follow. Those entry
//   points are declared — and `routing.test.mjs` extracts every such literal from the guard's own
//   source and fails if one is not inside the guard's computed dependency set. The declaration
//   cannot drift from the script, because the script is what checks it.
//
//   DIRS / FILES, declared plainly. Containment rules for things that are not reachable by import
//   at all: a directory of documents, a suite's own configuration. These are the only genuinely
//   hand-written part, they are small, and each one is asserted in both directions by a test.
//
// ── WHAT A DECLARATION LOOKS LIKE ────────────────────────────────────────────────────────────────
// In the guard's own file, near the top, before it does any work:
//
//   export const GUARD = {
//     id: "render-fingerprint",
//     covers: "one sentence: what this guard would notice",
//     blind: ["what it does NOT cover", "..."],     // REQUIRED and non-empty — see below
//     reach: ["client/src/screens/RaceScreen/renderRaceFrame.js", ...],
//     dirs: [], files: [], notDirs: [],
//   };
//   if (process.argv.includes("--declare")) { console.log(JSON.stringify(GUARD)); process.exit(0); }
//
// The `--declare` branch is how this module reads it WITHOUT importing the guard: several guards do
// their work at module load, and a router that had to execute a 35-second fingerprint to find out
// what it depends on would be worse than the table it replaces.
//
// `blind` is required and must be non-empty. Every guard states IN ITSELF what it does not cover,
// so a reader of the verify output can see the hole without opening the source — and so that the
// gap is written down by the person who knows it rather than discovered by the person who does not.
// ============================================================

import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { engineReach } from "../engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(ROOT, "scripts");

/** The import closure of a repo-relative entry file, as repo-relative paths (engine-reach's walk). */
export function closureOf(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return [];
  return engineReach(abs).files;
}

// ── THE TWO SUITES ───────────────────────────────────────────────────────────────────────────────
// A suite is not a script, so it has no file of its own to speak from: `client-suite` is
// `npm test` in client/ and `script-suite` is `node --test` over every `scripts/**/*.test.mjs`.
// Their declarations therefore live here, and they are the only two that do. Both are pure
// CONTAINMENT — a suite depends on everything it could possibly load — which is also why the two
// misses they suffered were containment mistakes (a subdirectory named instead of the directory,
// and a config file that lives in no source directory at all).
export const SUITE_GUARDS = [
  {
    id: "client-suite",
    covers:
      "every vitest test under client/, and everything they import — including the configuration " +
      "that decides how the suite runs",
    blind: [
      "client/e2e/ — Playwright, excluded from vitest by vitest.config.js, so a change there must " +
        "NOT select this suite",
      "the server: nothing under server/ is loaded by it",
      "whether the tests are the RIGHT tests. It runs what exists.",
    ],
    // `client/`, NOT `client/src/`: vitest.config.js, package.json and the setup files decide how
    // the suite RUNS. Naming the source subdirectory was miss 1 and miss 2, and they are the same
    // mistake made twice — a suite's dependency is its whole project directory.
    dirs: ["client/"],
    notDirs: ["client/e2e/"],
    files: [],
    reach: [],
    cmd: ["npm", "test", "--silent"],
    cwd: join(ROOT, "client"),
    // EXCLUSIVE, measured rather than assumed: run beside the fingerprints the suite FAILS —
    // sim-fairness.test.js carries a 5 s timeout and four CPU-saturating siblings push it past it.
    exclusive: true,
  },
  {
    id: "script-suite",
    covers: "every scripts/**/*.test.mjs, and the scripts they exercise",
    blind: [
      "it does not run the guards themselves against the repo — it runs their TESTS. A guard can " +
        "pass its own tests and still be failing on the tree; that is what the guard tasks are for.",
      "nothing outside scripts/ selects it, so a client change that breaks a harness is caught by " +
        "the harness's own guard task, not here",
    ],
    dirs: ["scripts/"],
    notDirs: [],
    files: [],
    reach: [],
    cmd: null, // filled in by the runner: the test file list is discovered from git
    exclusive: false,
  },
];

/** Every guard script on disk — DISCOVERED, so a new guard is routed the moment it exists. */
export function guardScripts() {
  const out = [];
  for (const f of readdirSync(SCRIPTS)) {
    if (!f.endsWith(".mjs") || f.endsWith(".test.mjs")) continue;
    if (!/^check-.*\.mjs$|-fingerprint\.mjs$|^fingerprint-default\.mjs$/.test(f)) continue;
    out.push(`scripts/${f}`);
  }
  return out.sort();
}

/**
 * Ask one guard script what it depends on. Returns null when the script declares nothing — which
 * is a finding, not a default: `collect()` reports it rather than inventing a route.
 */
export function declarationOf(relScript) {
  let raw;
  try {
    raw = execFileSync("node", [relScript, "--declare"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 20000,
      // stderr IGNORED: several guards print an elapsed-time line on exit, and execFileSync
      // forwards a child's stderr to ours by default — so simply ASKING eleven guards what they
      // depend on printed eleven stray lines above the plan.
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
 * Every guard, with its dependency set resolved to a concrete predicate.
 *
 * @param {(rel:string)=>object|null} [read] injection point for the tests, which must be able to
 *   exercise the collector without spawning eleven node processes
 * @returns {{guards: object[], undeclared: string[]}}
 */
export function collect(read = declarationOf) {
  const guards = [];
  const undeclared = [];
  for (const rel of guardScripts()) {
    const d = read(rel);
    if (!d || !d.id) {
      undeclared.push(rel);
      continue;
    }
    guards.push(resolveGuard({ ...d, source: rel }));
  }
  for (const s of SUITE_GUARDS) {
    guards.push(resolveGuard({ ...s, source: "scripts/lib/routing.mjs" }));
  }
  guards.sort((a, b) => a.id.localeCompare(b.id));
  return { guards, undeclared };
}

/** Turn a declaration into a resolved guard: a concrete file set plus a `matches(file)`. */
export function resolveGuard(d) {
  // SELF IS NOT DECLARED AND CANNOT BE FORGOTTEN — the closure of the file the declaration lives
  // in. This is miss 3 ("the render guard did not run when its own instrument changed") closed for
  // every guard at once, by construction rather than by an entry someone has to add.
  const self = closureOf(d.source);
  const reached = (d.reach ?? []).flatMap(closureOf);
  const files = new Set([...self, ...reached, ...(d.files ?? [])]);
  const dirs = d.dirs ?? [];
  const notDirs = d.notDirs ?? [];
  const matches = (f) => {
    if (notDirs.some((p) => f.startsWith(p))) return false;
    if (files.has(f)) return true;
    return dirs.some((p) => f.startsWith(p));
  };
  return {
    ...d,
    self,
    files: [...files].sort(),
    dirs,
    notDirs,
    matches: d.everything ? () => true : matches,
  };
}

/**
 * The one-line, MACHINE-CHECKABLE account of why a guard ran or did not.
 *
 * The old skip line was a sentence someone wrote ("nothing matched — this guard covers: markdown
 * anywhere"). A reader could not tell whether it was still true. This prints the DECLARATION: how
 * many files the dependency set actually resolved to, where they came from, and — when the guard
 * runs — which changed paths selected it.
 */
export function reasonFor(g, hits) {
  const shape = g.everything
    ? "every path (declared always-on)"
    : [
        `${g.files.length} file(s) by import closure`,
        g.dirs.length ? `dirs=${g.dirs.join(",")}` : null,
        g.notDirs.length ? `except=${g.notDirs.join(",")}` : null,
        g.reach?.length ? `reach=${g.reach.length} entry point(s)` : null,
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
