// ============================================================
// File:        scripts/lib/dataReach.mjs
// Project:     RaceArena — ENGINE-REACH-DATA-FIX-1
//
// WHICH REPOSITORY PATHS A GUARD'S CODE ACTUALLY NAMES — so a change to one of them selects that
// guard, whether it ships as code or as data.
//
// ── THE HOLE THIS CLOSES, AND IT IS NOT THEORETICAL ────────────────────────────────────────────
//
// `engine-reach.mjs` walks IMPORT edges. A JSON file has no imports, so nothing that ships as data
// is in any closure, and a guard that reads one is never selected by a change to it. Two costs,
// both now observed rather than predicted:
//
//   1. `scripts/track-defaults.test.mjs` asserts garden-path's shipped record. `script-suite` routes
//      on `dirs: ["scripts/"]` — its own `blind` list says "nothing outside scripts/ selects it" —
//      so the 2026-08-25 icon change under `server/seeds/` never ran it. **The merge reported GREEN
//      and master's CI was RED for a day** (GATE-SERIAL-BCRYPT-1 section 6).
//   2. `scripts/sim-fairness.mjs` is a declared reach entry of the WORLD FINGERPRINT and it reads
//      `server/seeds/tracks`. A track record change can therefore move that hash, and the arbiter
//      answered "cannot reach the engine at all" (ENGINE-REACH-DATA-1).
//
// ── THE RULE, AND WHY IT IS NOT A LIST ─────────────────────────────────────────────────────────
//
// **If a guard's own code names a tracked repository path, a change to that path selects the guard.**
//
// No notion of "what counts as data" is needed and none is declared — which matters, because a list
// of data directories would be a second owner of a fact, and a second owner going stale is the very
// defect being repaired here for the fourth time. Tracks, name sets, racer types and anything added
// later are covered by the same sentence, because the code that reads them says their name.
//
// ── HOW A PATH IS RECOGNISED ───────────────────────────────────────────────────────────────────
//
// A path counts only when it is CONSTRUCTED FROM THE REPOSITORY ROOT —
//
//   join(ROOT, "server", "seeds", "tracks")   or   join(ROOT, "server/seeds/tracks")
//
// where the leading identifier is itself derived from `import.meta.url`. It is then reconstructed to
// a repo-relative prefix and kept only if it EXISTS and is TRACKED BY GIT.
//
// Bare path-shaped strings are deliberately NOT matched, and `namedPathsIn` records why: they are
// overwhelmingly fixture keys and function arguments, and matching them cost 17 of 40 commits in
// noise while catching nothing the constructed form misses.
//
// ── WHERE IT DELIBERATELY OVER-SELECTS ─────────────────────────────────────────────────────────
//
// A lexical rule cannot tell a READ from a WRITE, so a guard that names its own output path selects
// on that path too. That is the safe direction — a guard that runs when it need not costs time; one
// that stays silent when it must run is what this file exists to stop — and the cost is measured in
// the report rather than assumed.
// ============================================================

import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { importSpecifiers } from "../engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rel = (f) => relative(ROOT, f).split(sep).join("/");

/** Every path git tracks, once. A path git does not track cannot appear in a diff. */
let _tracked = null;
function tracked() {
  if (_tracked) return _tracked;
  try {
    _tracked = new Set(
      execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  } catch {
    // No git means no routing decision can be made from tracking; treat everything as untracked so
    // this module adds nothing rather than adding noise.
    _tracked = new Set();
  }
  return _tracked;
}

/** Is `p` (repo-relative) a tracked file, or a directory containing at least one tracked file? */
// Retained as the tracking primitive `isNonImportable` builds on.
function isTrackedPath(p) {
  const t = tracked();
  if (t.has(p)) return true;
  const asDir = p.endsWith("/") ? p : `${p}/`;
  for (const f of t) if (f.startsWith(asDir)) return true;
  return false;
}

/** Files an `import` can resolve. Anything else is unreachable by a closure walk. */
const IMPORTABLE = /\.(?:js|jsx|mjs|cjs|ts|tsx)$/;

/**
 * Is `p` a tracked path that holds NO importable module?
 *
 * A file answers for itself. A directory qualifies only when every tracked file beneath it is
 * non-importable — one `.js` inside means an import can reach it and this module must not claim it.
 */
export function isNonImportable(p) {
  const t = tracked();
  if (t.has(p)) return !IMPORTABLE.test(p);
  const asDir = p.endsWith("/") ? p : `${p}/`;
  let any = false;
  for (const f of t) {
    if (!f.startsWith(asDir)) continue;
    any = true;
    if (IMPORTABLE.test(f)) return false;
  }
  return any;
}

/**
 * Identifiers in this file that are bound to a REAL repository location.
 *
 * ── WHY THIS EXISTS, AND IT IS THE DIFFERENCE BETWEEN A REPAIR AND NOISE ───────────────────────
 *
 * The first version of this module expanded `join(<any identifier>, "a", "b")`. Measured over 40
 * commits it made `script-suite` select on **27 of them** — almost all documentation commits —
 * because guard tests build FIXTURE trees in a temp directory and write `join(root, "docs")` and
 * `join(root, "reports")`. Those name a `mkdtempSync` path, not this repository, and treating them
 * as repository paths is how a routing repair turns into "run everything on every change".
 *
 * So only identifiers derived from `import.meta.url` count — the `ROOT`/`HERE` convention this
 * repository actually uses for its own location. A temp directory is never bound that way, so it is
 * excluded by construction rather than by a list of names to ignore.
 *
 * @param {string} src
 * @returns {Set<string>} identifier names
 */
export function repoRootIdents(src) {
  const bindings = [
    ...src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*(?:\n[^;\n]*){0,3})/g),
  ].map((m) => ({ name: m[1], init: m[2] }));

  const out = new Set();
  // A FIXPOINT, because the repository root is usually reached in HOPS rather than in one binding.
  // `sim-fairness.mjs` — a declared reach entry of the WORLD FINGERPRINT — writes
  //
  //     const __filename = fileURLToPath(import.meta.url);
  //     const __dir      = dirname(__filename);
  //     const ROOT       = join(__dir, "..");
  //
  // so a one-hop test finds `__filename` and misses `ROOT`, which is the identifier that actually
  // names `server/seeds/tracks`. Following the chain is what makes the world fingerprint select on a
  // track record at all; without it this repair silently dropped the case ENGINE-REACH-DATA-1 was
  // written about. Caught by checking the result rather than by trusting the first version.
  let grew = true;
  while (grew) {
    grew = false;
    for (const { name, init } of bindings) {
      if (out.has(name)) continue;
      const seeded =
        /fileURLToPath\s*\(\s*import\.meta\.url\s*\)/.test(init) ||
        [...out].some((r) => new RegExp(`\\b${r}\\b`).test(init));
      if (seeded) {
        out.add(name);
        grew = true;
      }
    }
  }
  return out;
}


/**
 * Module paths this file imports DYNAMICALLY, through a computed specifier.
 *
 * ── THE SECOND HALF OF THE SAME BLIND SPOT ─────────────────────────────────────────────────────
 *
 * `engine-reach.mjs` walks static `from "..."` edges only. The measurement harnesses do not use
 * them: `render-fingerprint.mjs` writes
 *
 *     const { QUICK_TEST_NAMES_MIXED } = await import(u("client/src/modules/racerNames.js"));
 *
 * so `racerNames.js` — whose contents are hashed into the physics through `stablePairBit` — is a
 * real dependency of that fingerprint and is invisible to the walk. The tree already KNOWS: the
 * walker's own `hasDynamicImport` flags `render-fingerprint.mjs`, and nothing acted on the flag.
 *
 * These are IMPORTS, so they are admitted whether or not they are importable files — the
 * non-importable rule exists to stop this module claiming code the static walk already covers, and
 * a dynamic specifier is precisely code the static walk does NOT cover.
 *
 * @param {string} src
 * @returns {string[]} repo-relative module paths
 */
export function dynamicImportPathsIn(src) {
  const out = new Set();
  for (const m of src.matchAll(/\bimport\s*\(([^)]*)\)/g))
    for (const lit of m[1].matchAll(/["']([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)["']/g))
      out.add(lit[1]);
  return [...out];
}

/**
 * The repository paths one file's SOURCE names.
 *
 * ONE FORM, and the bare literal was REMOVED after measuring it:
 *
 *   join(ROOT, "server", "seeds", "tracks")   both spellings of the segmented form, including
 *   join(ROOT, "server/seeds/tracks")         a single segment carrying slashes — expanded ONLY
 *                                             when the leading identifier is bound to
 *                                             `import.meta.url` (see above)
 *
 * A BARE STRING THAT LOOKS LIKE A PATH IS NOT A DEPENDENCY, and treating it as one is how this
 * repair nearly became noise. Guard tests build fixture trees as plain objects —
 * `{"reports/evolution/INDEX.md": "# Index…"}` — and call pure functions with path-shaped arguments,
 * `isDocPath("reports/evolution/INDEX.md")`. Neither reads the repository. Matching bare literals
 * made `script-suite` select on 17 of 40 commits, almost all documentation; requiring the path to be
 * CONSTRUCTED from the repository root removes every one of those without losing either real case —
 * both `sim-fairness.mjs` and `raceDriver.mjs` write `join(ROOT, "server/seeds/tracks")`.
 *
 * @param {string} src  file contents
 * @returns {string[]} repo-relative paths, unverified
 */
export function namedPathsIn(src) {
  const out = new Set();
  const roots = repoRootIdents(src);

  for (const m of src.matchAll(/join\(\s*([A-Za-z_$][\w$]*)\s*((?:,\s*["'][^"']+["']\s*)+)\)/g)) {
    if (!roots.has(m[1])) continue;
    const segs = [...m[2].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
    if (!segs.length) continue;
    out.add(segs.join("/"));
  }

  return [...out];
}

/**
 * Walk an import closure from `entries` and collect every TRACKED repository path any file in it
 * names.
 *
 * @param {string[]} entries  absolute or repo-relative file paths
 * @returns {{paths: string[], from: Record<string,string[]>}}
 *   `paths` are repo-relative and tracked; `from` maps each to the files that named it, so a
 *   routing decision can be explained instead of merely asserted.
 */
export function dataReach(entries) {
  const seen = new Set();
  const from = {};
  // ── HOW FAR THIS WALK GOES, AND WHERE IT DELIBERATELY STOPS ────────────────────────────────
  //
  // A dynamically imported module is recorded as a trigger and is WALKED for further names, but its
  // own statically-imported descendants are NOT recorded. Recording them was tried and measured:
  // `script-suite` went from 8 added entries to 109 and `check-ending-frame` to 88, which is the
  // "run everything on every change" this repair was told not to become. The transitive case is
  // reported in ENGINE-REACH-DATA-FIX-1 as still open rather than bought at that price.
  const walk = (file, viaDynamic = false) => {
    const real = resolve(ROOT, file);
    if (seen.has(real) || !existsSync(real)) return;
    let st;
    try {
      st = statSync(real);
    } catch {
      return;
    }
    if (!st.isFile()) return;
    seen.add(real);
    const src = readFileSync(real, "utf8");
    for (const p of dynamicImportPathsIn(src)) {
      if (!tracked().has(p)) continue;
      (from[p] ??= []).push(rel(real));
    }
    for (const p of namedPathsIn(src)) {
      // ── ONLY WHAT AN IMPORT CLOSURE CANNOT REACH ────────────────────────────────────────────
      //
      // This module exists to cover the gap left by import-following, so it must add ONLY what
      // import-following structurally cannot see: a path holding no importable module.
      // `server/seeds/tracks` is all JSON and qualifies. `client/src/modules` is code, is already
      // covered by every closure that imports into it, and does NOT.
      //
      // WITHOUT THIS THE REPAIR BECOMES THE THING IT WAS TOLD NOT TO BE. `engine-reach.mjs` names
      // `join(ROOT, "client", "src", "modules")` as its walk root, so every guard whose closure
      // touched it began selecting on all of `client/src/modules` — and `verify.test.mjs` caught it
      // with the assertion that a non-hull client file "must not select the guard", which is the
      // repository's own statement of the same rule.
      if (!isNonImportable(p)) continue;
      (from[p] ??= []).push(rel(real));
    }
    for (const spec of importSpecifiers(src)) walk(resolve(dirname(real), spec), viaDynamic);
    // A DYNAMIC IMPORT IS AN EDGE, not merely a name. Following it is what carries the walk from
    // `render-fingerprint.mjs` into `racer-types/index.js` and on to each racer definition, whose
    // speed multipliers set the race length. Stopping at the name would record the door and never
    // look through it.
    for (const spec of dynamicImportPathsIn(src)) walk(resolve(ROOT, spec), true);
  };
  for (const e of entries) walk(e);
  return { paths: Object.keys(from).sort(), from };
}
