// ============================================================
// File:        scripts/engine-reach.mjs
// Project:     RaceArena — VERIFY-COST-1
//
// WHAT CAN CHANGE THE RACE — the RACE HULL, computed from source rather than remembered. This is
// the mint tripwire's trigger set.
//
// ── ★ HOW THE RULE DECIDES (HULL-FIX-1). READ THIS PARAGRAPH; IT IS THE WHOLE MECHANISM. ────────
//
// A race is produced by the engine READING ITS ARGUMENTS, so the question "can a change to this file
// change how a race comes out?" has two halves and this tool used to answer only one. Half one, DOWN
// the arrow: everything the engine imports, transitively, from each ENTRY POINT (`raceCore.js` plus
// whatever the fingerprint guards declare they drive). Half two, UP the arrow and then down again: a
// DRIVER is any tracked source file that imports an entry point — that is, any file in this
// repository that constructs or steps a race — and the whole import closure of every driver counts
// too, because a driver's imports are the candidate producers of the values it hands the engine and
// a static walker cannot tell an argument-producer from a bystander. The hull is the union. The
// up-step is taken ONCE, from the entry points only and not from every member of the closure: a file
// that imports a mid-hull module is READING a shared value, not CONSTRUCTING a race, and up-walking
// from (say) `storage/defaults.js` would drag in every screen that shows a setting and make the hull
// the whole application. Every race construction in this repository goes through an entry point,
// because `createRaceFromIdentity` / `stepRacePhysics` / `runRaceHeadless` all live in `raceCore.js`
// — engine-reach.test.mjs asserts exactly that, so the up-step cannot silently stop being complete.
//
// ── WHY THE UP-STEP EXISTS, WITH THE MEASUREMENT THAT FORCED IT (HULL-REACH-1, HULL-FIX-1) ──────
//
// `raceParams.js` (`W_REF_MAX`, which decides sprite geometry → row layout → every start position)
// and `raceActionStage.js` (`pulkLeaderBrake`) are imported by the engine's CALLERS and passed IN as
// arguments. Breaking either moves both golden races. This tool called them OUTSIDE THE HULL for as
// long as it walked imports only — a file that changes a race while the arbiter of "can this change
// a race" says no. `baseSpeedConfig.js`, `rowLayoutConfig.js` and `racerNames.js` are the same shape
// and were proven the same way against the shipped-path arm. Five files, all reached only by going
// up the arrow first.
//
// WHY THE ERRORS ARE NOT SYMMETRIC, AND WHICH WAY THIS LEANS. A file wrongly OUTSIDE means a race
// change ships unmeasured; a file wrongly INSIDE means a run nobody needed. The first is a
// correctness failure and the second is a bill, so every uncertainty here resolves to INSIDE. That
// is why a driver's whole closure counts rather than some narrower guess at which of its imports
// really flow into the constructor.
//
// WHAT A STATIC WALK CAN SEE. Every edge is followed from a STRING LITERAL: a static `from '...'`
// specifier, or a literal inside a dynamic `import(...)` call — the instruments in `scripts/` reach
// the engine through `import(u("client/src/modules/raceCore.js"))` and those edges are real. An
// `import()` whose specifier is NOT a literal cannot be followed at all; such a file is reported in
// `dynamic` and the CLI REFUSES rather than presenting an incomplete list as an answer.
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

import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isInertChange } from "./lib/inertChange.mjs";
// REACH-ADVISORY-1: the routing side already answers reachability for DATA paths. This import is
// circular (dataReach imports importSpecifiers from here) and safe: both bindings are hoisted
// function declarations, used only at call time, never during module evaluation.
import { dataReach } from "./lib/dataReach.mjs";

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

/**
 * Every relative specifier a file imports from. Static `from '...'` edges only.
 *
 * KEPT AS IT WAS, deliberately: `scripts/lib/dataReach.mjs` resolves these against the importing
 * file's directory, so widening this function's contract would silently mis-resolve there. The
 * walk's own richer edge reader is `importEdges` below.
 */
export function importSpecifiers(src) {
  return [...src.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith("."));
}

/**
 * Every string literal that appears inside a dynamic `import(...)` call, plus a flag for the calls
 * that carry NO literal and therefore cannot be followed.
 *
 * WHY THE WHOLE CALL IS SCANNED AND NOT JUST ITS FIRST ARGUMENT. Every instrument in `scripts/`
 * reaches the engine as `import(u("client/src/modules/raceCore.js"))` or
 * `import(u(join(ROOT, "client/src/modules/raceCore.js")))` — the literal is real and one or two
 * calls deep. Reading it is the difference between following those edges and refusing.
 *
 * @returns {{literals: string[], opaque: boolean}}
 */
export function dynamicImportLiterals(src) {
  const literals = [];
  let opaque = false;
  const re = /(^|[^.\w$])import\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex - 1;
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") {
        depth--;
        if (!depth) break;
      }
    }
    const call = src.slice(re.lastIndex, i);
    const found = [...call.matchAll(/["']([^"'\n]+)["']/g)].map((q) => q[1]);
    if (found.length) literals.push(...found);
    else opaque = true;
  }
  return { literals, opaque };
}

/**
 * Resolve one specifier to an absolute file, or null when it names nothing in this repository.
 *
 * TWO SHAPES ARE UNDERSTOOD, and they are the two this repository writes: a RELATIVE specifier,
 * resolved against the importing file, and a REPO-RELATIVE one (`client/...`, `scripts/...`,
 * `server/...`, `shared/...`), which is how the dynamic instruments name what they load. Bare
 * package names resolve to nothing here on purpose — node_modules is not the subject.
 *
 * THE EXTENSION FALLBACK IS A WIDENING AND IS THERE FOR A MEASURED REASON. `resolve(dir, spec)` with
 * no fallback silently drops an extensionless edge, and this repository writes them:
 * `client/src/modules/raceHistory.js` imports `'./storage/storage'`. That edge was invisible. A
 * dropped edge is a file wrongly OUTSIDE, which is the failure this whole file exists to stop.
 */
function resolveSpecifier(fromAbs, spec) {
  let base;
  if (spec.startsWith(".")) base = resolve(dirname(fromAbs), spec);
  else if (/^(client|scripts|server|shared)\//.test(spec)) base = join(ROOT, spec);
  else return null;
  for (const c of [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    join(base, "index.js"),
  ]) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      // not this candidate
    }
  }
  return null;
}

/**
 * The source with COMMENT-ONLY LINES removed — every line whose first non-space character is `//`,
 * `*` or `/*`.
 *
 * ★ WHY THIS IS SAFE, AND IT IS THE ONLY REASON IT IS DONE THIS WAY. A file's prose talks about
 * imports: this file's own header writes `import(u("client/src/modules/raceCore.js"))` to explain
 * the rule, and the scanner read that as an edge and made the arbiter a driver of the engine. But
 * a comment stripper that gets it wrong DELETES A REAL EDGE, which is the failure this piece
 * exists to repair — so nothing clever is attempted. A line that begins with `//`, `*` or `/*`
 * cannot contain an import statement or a live `import()` call, because it is not code. Comments
 * that TRAIL code are left alone; a phantom edge from one is an over-inclusion, which costs a run
 * and never costs correctness.
 */
function withoutCommentLines(src) {
  return src
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
    .join("\n");
}

/**
 * Every import edge out of one file, already resolved.
 * @returns {{edges: string[], opaque: boolean}} `opaque` = it has an `import()` nothing could follow.
 */
export function importEdges(fromAbs, rawSrc) {
  const src = withoutCommentLines(rawSrc);
  const { literals, opaque } = dynamicImportLiterals(src);
  const edges = [];
  for (const spec of [...importSpecifiers(src), ...literals]) {
    const abs = resolveSpecifier(fromAbs, spec);
    if (abs) edges.push(abs);
  }
  return { edges, opaque };
}

/**
 * Every tracked source file in the repository, absolute.
 *
 * GIT IS THE AUTHORITY on what is in the repository — a directory walk would also find build
 * output, scratch files and anything a night left behind, and none of those can change a shipped
 * race. Memoised: the driver scan reads every one of these files once.
 */
let _trackedCache = null;
function trackedSourceFiles() {
  if (_trackedCache) return _trackedCache;
  let out = [];
  try {
    out = execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 28,
    })
      .split("\n")
      .filter((f) => /\.(mjs|cjs|js|jsx|ts|tsx)$/.test(f))
      .map((f) => join(ROOT, f));
  } catch {
    // A tree git cannot list yields NO drivers, which shrinks the hull — so it must be loud rather
    // than absorbed. `raceHull` turns an empty listing into a refusal; see there.
  }
  _trackedCache = out;
  return out;
}

/**
 * THE DRIVERS: every tracked source file that imports an entry point, i.e. every file in this
 * repository that constructs or steps a race. Derived on every run, never listed.
 *
 * ONE STEP UP, and the header says why. A driver's own importers are not race constructors; they
 * hand the driver its props, and following them would end at `main.jsx`.
 *
 * @param {string[]} entries absolute entry-point paths
 * @returns {string[]} absolute driver paths, sorted
 */
export function driversOf(entries) {
  const want = new Set(entries.map((e) => resolve(e)));
  const out = [];
  for (const f of trackedSourceFiles()) {
    if (want.has(resolve(f))) continue; // an entry point is not its own driver
    let src;
    try {
      src = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const { edges } = importEdges(f, src);
    if (edges.some((e) => want.has(resolve(e)))) out.push(f);
  }
  return out.sort();
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

/**
 * True if a file contains a dynamic `import()` the walk CANNOT follow — one with no string literal
 * anywhere in the call.
 *
 * NARROWED FROM "HAS ANY import()" (HULL-FIX-1), and the narrowing is a widening of the hull, not a
 * shrinking of it. This used to be "any dynamic import at all", which was a true completeness test
 * only while no reached file had one. The instruments that drive the engine all do — and they reach
 * it THROUGH one, `import(u("client/src/modules/raceCore.js"))`. Those edges are now followed, so
 * the property worth guarding is the one that is still unfollowable: a specifier that is not a
 * literal. A file with one of those is named and the CLI refuses.
 */
export function hasDynamicImport(src) {
  return dynamicImportLiterals(src).opaque;
}

/**
 * The import closure of an entry, as repo-relative paths — HALF ONE of the rule, down the arrow.
 *
 * ★ THIS IS NOT THE HULL. It answers "what does this file read, transitively"; `raceHull()` below
 * answers "what can change a race". `scripts/lib/routing.mjs`'s `closureOf` is this function and
 * must stay this function: it expands EVERY guard's declared `reach`, so giving it the up-step would
 * up-walk from things like `storage/defaults.js` and hand unrelated guards the whole application.
 *
 * @param {string|string[]} entry absolute path(s) to walk from — required, because a default here
 *   would read as "the hull" and it is not.
 * @returns {{files: string[], dynamic: string[]}} `dynamic` names any reached file the walk cannot
 *   fully follow — it must be empty for this script to be the authority it claims to be.
 */
export function engineReach(entry) {
  const entries = Array.isArray(entry) ? entry : [entry];
  const seen = new Set();
  const dynamic = [];
  const walk = (file) => {
    const real = resolve(file);
    if (seen.has(real) || !existsSync(real)) return;
    seen.add(real);
    const src = readFileSync(real, "utf8");
    const { edges, opaque } = importEdges(real, src);
    if (opaque) dynamic.push(real);
    for (const e of edges) walk(e);
  };
  for (const e of entries) walk(e);
  const rel = (f) => relative(ROOT, f).split(sep).join("/");
  return { files: [...seen].map(rel).sort(), dynamic: dynamic.map(rel).sort() };
}

/**
 * ★ THE RACE HULL — every file whose change can change how a race comes out. Both halves of the
 * rule: the entry points' closures, plus the closure of every DRIVER of an entry point.
 *
 * This is what the CLI answers with, what the pre-commit tripwire prints, and what a mint decision
 * rests on. `entries` is injectable for the tests only; nothing in the repository passes it.
 *
 * @returns {{files: string[], dynamic: string[], drivers: string[], entries: string[]}}
 */
export function raceHull(entries = entryPoints()) {
  const drivers = driversOf(entries);
  const { files, dynamic } = engineReach([...entries, ...drivers]);
  const rel = (f) => relative(ROOT, f).split(sep).join("/");
  return {
    files,
    dynamic,
    drivers: drivers.map(rel).sort(),
    entries: entries.map(rel).sort(),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const { files, dynamic, drivers, entries } = raceHull();
  // The hull's own entry set, used for every DATA question below: a driver names data paths too —
  // `RaceScreen` reaching a track record is the same fact as `sim-fairness.mjs` reaching one.
  const hullEntries = [...entryPoints(), ...drivers.map((d) => join(ROOT, d))];
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

    // ── THE ADVISORY MUST AGREE WITH THE ROUTING (REACH-ADVISORY-1) ─────────────────────────────
    //
    // A JSON file has no imports, so nothing that ships as DATA can ever be in an import closure —
    // and this line therefore called every seed record "cannot reach the engine at all". It said
    // exactly that on 2026-08-25 for a two-line edit to `server/seeds/tracks/garden-path.json`
    // THAT MOVED ALL FOUR FINGERPRINTS, and again on 2026-08-31 for the seed snapshot.
    //
    // The routing side has been right about this since ENGINE-REACH-DATA-FIX-1: `dataReach` walks
    // the same closure and reports every tracked repository path the files in it NAME. Over this
    // script's own entry points it returns `server/seeds/tracks`, named by `sim-fairness.mjs` —
    // which is a declared reach entry of the world fingerprint precisely because it drives the
    // engine and emits the rows that get hashed.
    //
    // SO THIS CONSULTS THAT, rather than inventing a second notion of reach. There is one rule and
    // one home for it; what was missing was this line asking. The matching is the same rule routing
    // uses (`f === p || f.startsWith(p + "/")`), for the same reason: a directory the code named
    // matches its contents, a file matches itself.
    //
    // NO TOKEN-INERTNESS ANALYSIS IS APPLIED TO A DATA HIT, deliberately. `isInertChange` compares
    // JS tokens to decide a diff is comments and whitespace; a data file has no such notion, and
    // inventing one would be the second notion this repair exists to avoid.
    //
    // BUT "DID IT CHANGE AT ALL" STILL APPLIES, and leaving it out was a real over-report caught by
    // running the matrix rather than by reading: an UNCHANGED seed record was being announced as
    // "can change the race". A hull file in that state is correctly reported as carrying no change,
    // and a data file must be held to the same standard — the question this command answers is
    // whether the PATHS IT WAS GIVEN carry a reaching change, not whether they could in principle.
    const dataPrefixes = dataReach(hullEntries).paths;
    const reachesAsData = (w) =>
      !files.includes(w) &&
      dataPrefixes.some((p) => w === p || w.startsWith(`${p}/`));

    /** A data path counts only if its bytes differ from `base` — or if base has no version of it. */
    const changedAgainstBase = (p) => {
      let before;
      try {
        before = execFileSync("git", ["show", `${base}:${p}`], {
          cwd: ROOT,
          encoding: "utf8",
          maxBuffer: 1 << 26,
          stdio: ["ignore", "pipe", "ignore"],
        });
      } catch {
        return true; // new, or unreadable at base — it counts, which is the safe direction
      }
      try {
        return readFileSync(join(ROOT, p), "utf8") !== before;
      } catch {
        return true;
      }
    };

    const inHull = wanted.filter((w) => files.includes(w));
    const dataNamed = wanted.filter(reachesAsData);
    const dataHits = dataNamed.filter(changedAgainstBase);
    const dataUnchanged = dataNamed.filter((p) => !dataHits.includes(p));
    const outOfHull = wanted.filter((w) => !files.includes(w) && !reachesAsData(w));
    const { hit, inert } = splitInert(inHull, base);
    for (const i of inert)
      console.log(
        `ENGINE REACH: ${i.path} is in the hull but INERT — ${i.reason}`,
      );
    if (hit.length || dataHits.length) {
      const total = hit.length + dataHits.length;
      console.log(
        `ENGINE REACH: ${total} of ${wanted.length} path(s) can change the race:`,
      );
      for (const h of hit) console.log("  " + h);
      // Named separately: a reader who sees a JSON file listed as reaching deserves to know it got
      // there by being NAMED by engine code rather than imported by it, because that is the fact
      // this line was wrong about for months.
      for (const d of dataHits) {
        const via = dataReach(hullEntries).from[
          dataPrefixes.find((p) => d === p || d.startsWith(`${p}/`))
        ];
        console.log(
          `  ${d}   (DATA — read by ${via ? via.join(", ") : "the engine closure"})`,
        );
      }
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
    // The data equivalent of the line above, and it is a THIRD distinct fact: not "cannot reach the
    // engine" but "the engine reads this, and this diff does not touch it".
    if (dataUnchanged.length)
      console.log(
        `  ${dataUnchanged.length} DATA read by the engine but unchanged against ${base}: ${dataUnchanged.join(", ")}`,
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
  // A DRIVERLESS HULL IS A BROKEN SCAN, NOT A NARROW REPOSITORY. `driversOf` reads `git ls-files`,
  // and a tree git cannot list yields zero drivers and a hull that has quietly gone back to being
  // the import closure — the exact failure this piece repaired. It has to be louder than a number.
  if (!drivers.length) {
    console.error(
      `FAIL: the hull found NO drivers of ${entries.join(", ")} — the up-step found nothing, so ` +
        `this is the old import-closure answer wearing the new name. Check that \`git ls-files\` works here.`,
    );
    process.exit(2);
  }
  if (dynamic.length) {
    console.error(
      `FAIL: an unfollowable dynamic import() inside the hull (${dynamic.join(", ")}) — its ` +
        `specifier is not a string literal, so a static walk cannot see where it goes and this ` +
        `list is no longer complete.`,
    );
    process.exit(2);
  }
  console.log(
    `RACE HULL — ${files.length} files can change the race ` +
      `(${entries.length} entry point(s), ${drivers.length} driver(s) of them)`,
  );
  for (const f of files) console.log("  " + f);
}
