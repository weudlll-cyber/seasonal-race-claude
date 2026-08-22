// ============================================================
// File:        scripts/engine-reach.mjs
// Project:     RaceArena — VERIFY-COST-1
//
// WHAT CAN CHANGE THE RACE: the transitive closure of `raceCore.js`'s imports, computed from source
// rather than remembered. This is the mint tripwire's trigger set.
//
// WHY A CLOSURE AND NOT `ENGINE_INPUT_MODULES`. That list is `raceCore.js`'s DIRECT imports — eleven
// of them — and its guard checks exactly that. The closure is NINETEEN files, and the eight in the
// gap include `autoSpriteScale.js`, which is the precise file the mint tripwire was created for
// (CAMERA-MINT-TRIPWIRE-1), and `storage/defaults.js`. Triggering on the direct list would therefore
// have stopped catching the incident that produced the rule. Measured, not assumed.
//
// WHY A CLOSURE AND NOT THE FOLDER. The blunt trigger is "any file under client/src/modules/ that is
// not under camera/" — 103 files. The closure is 19. The other 84 cannot reach the engine at all, so
// minting for them proves what the diff already proved.
//
// WHY THIS IS SAFE TO COMPUTE STATICALLY: there is not one dynamic `import()` anywhere in the
// closure, so a static walk of the `from '...'` specifiers sees every edge. That is asserted by
// engine-reach.test.mjs rather than left as a claim — if a dynamic import ever appears in the
// closure, the guard fails and this script stops being the authority.
//
// Usage:
//   node scripts/engine-reach.mjs                  # the closure, one path per line
//   node scripts/engine-reach.mjs --check <paths>  # exit 0 if ANY path carries a reaching change
//                                                  # exit 1 if none do; exit 2 = REFUSED, see below
//
// EXIT 2 IS "I WAS ASKED NOTHING", NOT "NO" (REACH-REFUSES-1). --check refuses rather than answering
// when it was given no paths, or when --base= does not resolve. Exit 1 is a real negative answer a
// caller may act on; exit 2 means the question was broken and nothing was examined.
// ============================================================

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isInertChange } from "./lib/inertChange.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MODULES_DIR = join(ROOT, "client", "src", "modules");
const ENTRY = join(MODULES_DIR, "raceCore.js");

// ── THE HULL IS NOT ONLY WHAT raceCore IMPORTS (FP-HULL-1) ─────────────────────────────────────
//
// `raceCore.js`'s import closure answers "what does the engine read". It does NOT answer "what can
// change the world fingerprint", and the two came apart on 2026-08-14: the fingerprint is produced
// by `scripts/sim-fairness.mjs`, which DRIVES the engine and emits the rows that get hashed. It is
// not imported by raceCore, so it was outside the closure by construction — and this script
// answered "none of 11 path(s) can reach the race engine" for a change that moved the fingerprint.
//
// `fingerprint-default.mjs` had already declared the truth in its own GUARD block
// (`reach: [raceCore.js, sim-fairness.mjs]`). Nothing read it. So the entry points are now taken
// FROM THAT DECLARATION rather than restated here — one home, and a guard that changes what it
// drives updates this automatically.
//
// Read by spawning `--declare`, which prints the block and exits before any measuring, because the
// guard is a script with top-level side effects and importing it would run a fingerprint.
const GUARDS_DECLARING_REACH = ["scripts/fingerprint-default.mjs"];

let _declaredCache = null;
function declaredReachEntries() {
  if (_declaredCache) return _declaredCache;
  const out = [];
  for (const g of GUARDS_DECLARING_REACH) {
    try {
      const json = execFileSync(
        process.execPath,
        [join(ROOT, g), "--declare"],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      for (const r of JSON.parse(json).reach ?? []) out.push(join(ROOT, r));
    } catch {
      // A guard that cannot declare must not silently shrink the hull to nothing, so the engine
      // entry below still stands on its own. The failure is visible as a smaller closure, which
      // engine-reach.test.mjs's floor assertion catches.
    }
  }
  _declaredCache = out;
  return out;
}

/** Every entry point the world fingerprint can be reached from — the engine plus its declared driver. */
export function entryPoints() {
  return [...new Set([ENTRY, ...declaredReachEntries()])];
}

/** Every relative specifier a file imports from. Static `from '...'` edges only — see the header. */
export function importSpecifiers(src) {
  return [...src.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith("."));
}

/**
 * Split hull paths into the ones that really carry a change and the ones whose edit is INERT —
 * comments and whitespace only, so the engine computes the identical thing.
 *
 * VERIFY-COST-1. The world fingerprint is 229 s and it ran, on the night this was written, for a
 * paragraph of prose in `defaults.js`. The decision is mechanical rather than a judgement (see
 * `scripts/lib/inertChange.mjs`) and every uncertainty — an unreadable base, an unparseable file,
 * a missing tokenizer, a directive comment — resolves to "it counts", i.e. to running the guard.
 *
 * @param {string[]} paths  repo-relative paths already known to be in the hull
 * @param {string} base  the git ref to compare against
 * @returns {{hit: string[], inert: {path: string, reason: string}[]}}
 */
export function splitInert(paths, base = "master") {
  const hit = [];
  const inert = [];
  for (const p of paths) {
    let before = null;
    try {
      before = execFileSync("git", ["show", `${base}:${p}`], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 1 << 26,
      });
    } catch {
      hit.push(p); // no base version to compare — it counts
      continue;
    }
    let after = null;
    try {
      after = readFileSync(join(ROOT, p), "utf8");
    } catch {
      hit.push(p);
      continue;
    }
    const r = isInertChange(before, after, p);
    if (r.inert) inert.push({ path: p, reason: r.reason });
    else hit.push(p);
  }
  return { hit, inert };
}

/** True if a file contains a DYNAMIC import, which a static walk cannot follow. */
export function hasDynamicImport(src) {
  return /(^|[^.\w])import\s*\(/.test(src);
}

/**
 * Every file the race engine can reach from `raceCore.js`, as repo-relative paths.
 * @returns {{files: string[], dynamic: string[]}} `dynamic` names any reached file the walk cannot
 *   fully follow — it must be empty for this script to be the authority it claims to be.
 */
export function engineReach(entry = entryPoints()) {
  const entries = Array.isArray(entry) ? entry : [entry];
  const seen = new Set();
  const dynamic = [];
  const walk = (file) => {
    const real = resolve(file);
    if (seen.has(real) || !existsSync(real)) return;
    seen.add(real);
    const src = readFileSync(real, "utf8");
    if (hasDynamicImport(src)) dynamic.push(real);
    for (const spec of importSpecifiers(src))
      walk(resolve(dirname(real), spec));
  };
  for (const e of entries) walk(e);
  const rel = (f) => relative(ROOT, f).split(sep).join("/");
  return { files: [...seen].map(rel).sort(), dynamic: dynamic.map(rel).sort() };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const { files, dynamic } = engineReach();
  const checkIdx = process.argv.indexOf("--check");
  if (checkIdx >= 0) {
    const wanted = process.argv
      .slice(checkIdx + 1)
      .filter((p) => !p.startsWith("--"))
      .map((p) => p.replace(/\\/g, "/").replace(/^\.\//, ""));

    // ── A TOOL THAT CANNOT SEE THE DIFF MUST REFUSE, NOT ANSWER ZERO (REACH-REFUSES-1) ──────────
    //
    // Exit 1 means "no path reaches the engine", and a caller reads that as a licence to skip a
    // fingerprint. Every refusal below exits 2 instead — the code this script already uses for the
    // empty-closure and dynamic-import cases, and the same convention npm run verify uses in R0a:
    // 2 is REFUSED, 1 is a real negative answer.
    //
    // THE INCIDENT THIS IS WRITTEN FROM. On 2026-08-22 this script answered "none of 0 path(s)"
    // while the pre-commit hook s own invocation, seconds later on the same tree, correctly named
    // storage/defaults.js. The two calls differed in ONE thing, and it was never cwd, staging or
    // the diff base: the hook guards its call with [ -n "$staged" ] so it never invokes with an
    // empty list, while the hand-typed call substituted an empty path list and handed --check
    // nothing at all. This script reads no tree of its own for --check; it answers about the paths
    // it is given, and it was given none.
    if (wanted.length === 0) {
      console.error(
        "REFUSED: --check was given no paths, so this run examined nothing.\n" +
          "  \"none of 0 path(s)\" is not a clearance — it is the tool saying it was asked nothing.\n" +
          "  Pass the paths you changed:  node scripts/engine-reach.mjs --check <paths>\n" +
          "  If they came from a command substitution, it expanded empty.",
      );
      process.exit(2);
    }

    // VERIFY-COST-1: a hull file whose edit is comments and whitespace ONLY cannot change what the
    // engine computes, so it does not count as reach. Printed, never silent.
    const baseArg = process.argv.find((a) => a.startsWith("--base="));
    const base = baseArg ? baseArg.slice(7) : "master";

    // THE BASE MUST RESOLVE. An unresolvable ref used to reach splitInert, where every git show
    // threw and every path was counted as a hit — the SAFE direction, but for the wrong reason and
    // indistinguishable from a real one. A ref that is not a ref is a broken question, not an answer.
    let baseSha = null;
    try {
      baseSha = execFileSync(
        "git",
        ["rev-parse", "--verify", `${base}^{commit}`],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    } catch {
      console.error(
        `REFUSED: the base ref "${base}" does not resolve to a commit.\n` +
          "  The REF is the problem here, not the work. Nothing was examined.",
      );
      process.exit(2);
    }

    const inHull = wanted.filter((w) => files.includes(w));
    const outOfHull = wanted.filter((w) => !files.includes(w));
    const { hit, inert } = splitInert(inHull, base);
    for (const i of inert)
      console.log(
        `ENGINE REACH: ${i.path} is in the hull but INERT — ${i.reason}`,
      );
    if (hit.length) {
      console.log(
        `ENGINE REACH: ${hit.length} of ${wanted.length} path(s) can change the race:`,
      );
      for (const h of hit) console.log("  " + h);
      process.exit(0);
    }
    // NOT IN THE HULL and IN THE HULL BUT UNCHANGED are different facts, and they used to print as
    // one sentence. defaults.js can absolutely reach the engine; saying it "cannot" because this
    // diff does not touch it is the sentence that taught a reader the tool was doing something else.
    console.log(
      `ENGINE REACH: none of ${wanted.length} path(s) carry a change that can reach the race engine.`,
    );
    if (outOfHull.length)
      console.log(
        `  ${outOfHull.length} outside the hull (cannot reach the engine at all): ${outOfHull.join(", ")}`,
      );
    if (inert.length)
      console.log(
        `  ${inert.length} IN the hull but inert against ${base} — reachable code, unchanged content.`,
      );
    process.exit(1);
  }
  // LOUD FAILURE (Lesson 187): a closure that came back empty or unfollowable is not a pass.
  if (files.length < 5) {
    console.error(
      `FAIL: engine reach returned only ${files.length} files — refusing to bless that.`,
    );
    process.exit(2);
  }
  if (dynamic.length) {
    console.error(
      `FAIL: dynamic import() inside the closure (${dynamic.join(", ")}) — a static walk cannot ` +
        `see those edges, so this list is no longer complete.`,
    );
    process.exit(2);
  }
  console.log(
    `ENGINE REACH — ${files.length} files can change the race (from raceCore.js)`,
  );
  for (const f of files) console.log("  " + f);
}
