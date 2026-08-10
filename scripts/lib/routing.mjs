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
//   REACH, declared but CROSS-CHECKED. The measurement harnesses reach into `client/` through
//   `await import(u("client/..."))`, which a static walk of `from "..."` cannot follow. Those entry
//   points are declared, and `routing.test.mjs` extracts every such literal from the guard's own
//   source and fails if one is not inside the guard's resolved set. The declaration cannot drift
//   from the script, because the script is what checks it.
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
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { engineReach } from "../engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(ROOT, "scripts");

/** The import closure of a repo-relative entry file, as repo-relative paths. */
export function closureOf(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return [];
  return engineReach(abs).files;
}

// ── THE TWO SUITES ───────────────────────────────────────────────────────────────────────────────
// A suite is not a script, so it has no file of its own to speak from. Their declarations live here
// and they are the only two that do. Both are pure CONTAINMENT — a suite depends on everything it
// could load — which is also why both of their historical misses were containment mistakes.
export const SUITE_GUARDS = [
  {
    id: "client-suite",
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
    id: "script-suite",
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
 */
export function guardScripts(dir = SCRIPTS) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".mjs") || f.endsWith(".test.mjs")) continue;
    if (
      !/^check-.*\.mjs$|-fingerprint\.mjs$|^fingerprint-default\.mjs$|^gen-engine-reach-doc\.mjs$/.test(
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

/** Turn a declaration into a resolved guard: a concrete file set plus a `matches(file)`. */
export function resolveGuard(d) {
  // SELF IS NOT DECLARED AND CANNOT BE FORGOTTEN — the closure of the file the declaration lives in.
  const self = d.source ? closureOf(d.source) : [];
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
  for (const rel of scripts) {
    const d = read(rel);
    if (!d || !d.id) {
      undeclared.push(rel);
      continue;
    }
    guards.push(resolveGuard({ ...d, source: rel }));
  }
  for (const s of SUITE_GUARDS) {
    guards.push(resolveGuard({ ...s, source: null }));
  }
  guards.sort((a, b) => a.id.localeCompare(b.id));
  return { guards, undeclared };
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
