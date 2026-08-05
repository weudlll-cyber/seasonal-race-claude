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
//   node scripts/engine-reach.mjs --check <paths>  # exit 0 if ANY path is in the closure, else 1
// ============================================================

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MODULES_DIR = join(ROOT, "client", "src", "modules");
const ENTRY = join(MODULES_DIR, "raceCore.js");

/** Every relative specifier a file imports from. Static `from '...'` edges only — see the header. */
export function importSpecifiers(src) {
  return [...src.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith("."));
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
export function engineReach(entry = ENTRY) {
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
  walk(entry);
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
      .map((p) => p.replace(/\\/g, "/").replace(/^\.\//, ""));
    const hit = wanted.filter((w) => files.includes(w));
    if (hit.length) {
      console.log(
        `ENGINE REACH: ${hit.length} of ${wanted.length} path(s) can change the race:`,
      );
      for (const h of hit) console.log("  " + h);
      process.exit(0);
    }
    console.log(
      `ENGINE REACH: none of ${wanted.length} path(s) can reach the race engine.`,
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
