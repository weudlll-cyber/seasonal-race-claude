// ============================================================
// File:        scripts/check-client-build.mjs
// Project:     RaceArena — NIGHT-2026-09-07 piece 2
//
// NOTHING BUILT THE CLIENT. Not `npm run verify`, not `.github/workflows/ci.yml` — established at
// source, by searching both for `vite build` and `npm run build`: zero matches in either.
//
// ── WHY THAT IS A HOLE AND NOT A GAP ────────────────────────────────────────────────────────────
//
// A missing or misspelled named export is `undefined` under the dev transform and a HARD FAILURE in
// a bundle. The two disagree, so a tree can be green everywhere this project looks and still be a
// broken package. That class broke a branch on 2026-09-07 (`exportRaceConfig.js`) and a person found
// it by hand, which is the part that should not happen twice.
//
// ★ LINT CANNOT STAND IN FOR THIS, and it is worth being exact about why. `client/eslint.config.js`
// loads `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
// and `eslint-config-prettier` — and NO import plugin. Nothing in that configuration resolves a
// module specifier, so no rule there can notice that a name is not exported by the file it is
// imported from. Reading the config is how that was settled, not by trying it.
//
// ── WHAT IT DOES ────────────────────────────────────────────────────────────────────────────────
//
//   1. Builds the client, exactly the way the package is built — `npm run build` in `client/`, so
//      this file cannot disagree with anybody about what "the build" means.
//   2. Then runs `scripts/audit-bundle-address.mjs` against what it just produced.
//
// ── ★ WHY THE AUDIT IS A STEP HERE AND NOT ITS OWN ROUTED GUARD ─────────────────────────────────
//
// `audit-bundle-address.mjs` is named `audit-` precisely so `routing.mjs` would NOT discover it, and
// its own header gives the reason: it judges `client/dist`, an artefact `verify` does not build, so
// routing it *"would redden `verify` on any tree without a fresh client build"*. RUNTIME-API-URL-1
// left the question — *"wiring it in means deciding whether `verify` should build the client"* — as
// the owner's, item 7 of its list.
//
// This piece answers only the half it was asked to: the build now happens, so the objection is gone.
// But `verify` runs its guards CONCURRENTLY (up to 14 at once), so a separately-routed audit could
// read `client/dist` while this guard is still writing it — a race that would fail for a reason that
// is not a defect, which is the very thing the `audit-` naming was protecting against. Making it
// step 2 of the guard that produces the artefact is what removes the race, rather than papering over
// it with an ordering convention nothing enforces.
//
// It is SPAWNED rather than imported: that script does its work at module top level and exits 1
// itself, so running it as a child reuses it exactly as CI and a person would run it, with no
// refactor and no second copy of its allow-list.
//
// ── HOW THE ROUTING IS DERIVED ──────────────────────────────────────────────────────────────────
//
// NOT a hand-written file list. Vite's root IS `client/`: it reads `client/vite.config.js` and
// `client/package.json` for how to build, `client/index.html` for the entry, walks the import graph
// from `src/main.jsx`, and copies `client/public/` verbatim. So the declaration is the directory,
// for the same reason `client-suite` declares `client/` and not `client/src/` — that guard's
// recorded misses 1 and 2 were both naming the source subdirectory and then being blind to the
// configuration that decides how it runs. `client/e2e/` is excluded because Playwright specs are
// never bundled.
//
// The consequence is the one the brief asked for: a change under `client/` selects this, and a
// change to `docs/` or `reports/` does not.
//
// ── LOUD-FAILURE RULE (proof-of-live) ───────────────────────────────────────────────────────────
//
// A build that exits 0 but emits nothing FAILS. A check that passes because it did nothing is
// indistinguishable from a no-op.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────────
//
//   · It is NOT added to `.github/workflows/ci.yml`. That file is untouched by this piece and is its
//     own order.
//   · It does not test the app. A bundle that builds can still be wrong; that is the suites' job.
//   · It writes `client/dist`, which is gitignored — `verify` still writes no tracked file.
//
// Usage:
//   node scripts/check-client-build.mjs
//   node scripts/check-client-build.mjs --declare
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = join(ROOT, "client");
const DIST = join(CLIENT, "dist");

export const GUARD = {
  id: "check-client-build",
  covers:
    "whether the client still BUILDS — a bundler-only failure such as an import of a name a module does not export, which is `undefined` under the dev transform and fatal in a bundle; and, on what it just built, whether the package names a deployment address",
  blind: [
    "whether the built app WORKS. It compiles and bundles; it never opens a page.",
    "anything the bundler resolves lazily or at runtime — a dynamic `import(variable)` is not checked by building",
    "client/e2e/ — Playwright specs are never bundled, so a break there is the e2e suite's to find",
    "the server, which is not bundled at all",
    "CSS and asset CONTENT: a stylesheet that builds can still be wrong",
  ],
  dirs: ["client/"],
  notDirs: ["client/e2e/"],
  files: [],
  reach: [],
  exclusive: false,
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

const fail = (msg) => {
  console.error(`\nFAIL: check-client-build — ${msg}`);
  process.exit(1);
};

// ── 1. THE BUILD ────────────────────────────────────────────────────────────────────────────────
const built = spawnSync("npm", ["run", "build", "--silent"], {
  cwd: CLIENT,
  encoding: "utf8",
  timeout: 300_000,
  shell: process.platform === "win32",
});
if (built.error) fail(`could not run the client build: ${built.error.message}`);
if (built.status !== 0)
  fail(
    `THE CLIENT DOES NOT BUILD (exit ${built.status}).\n` +
      `This is the failure class the dev transform hides — a bundle is stricter than the dev server.\n\n` +
      (built.stderr || built.stdout || "(no output)"),
  );

// PROOF-OF-LIVE: a build that reports success and emits nothing is not a pass.
if (!existsSync(join(DIST, "index.html")))
  fail("the build exited 0 but produced no client/dist/index.html — nothing was proved.");

const assets = join(DIST, "assets");
const emitted = existsSync(assets) ? readdirSync(assets) : [];
const js = emitted.filter((f) => f.endsWith(".js"));
if (!js.length)
  fail(`the build emitted no JavaScript into client/dist/assets — nothing was proved.`);

const bytes = emitted.reduce((n, f) => n + statSync(join(assets, f)).size, 0);

// ── 2. THE BUNDLE AUDIT, on what was just built ─────────────────────────────────────────────────
const audit = spawnSync(process.execPath, [join(ROOT, "scripts", "audit-bundle-address.mjs")], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 120_000,
});
if (audit.error) fail(`could not run audit-bundle-address: ${audit.error.message}`);
if (audit.status !== 0)
  fail(
    `the package names a deployment address.\n\n${audit.stdout || ""}${audit.stderr || ""}`.trimEnd(),
  );

console.log(
  `check-client-build: the client builds — ${emitted.length} asset(s), ` +
    `${(bytes / 1024).toFixed(1)} kB, in ${((Date.now() - __t0) / 1000).toFixed(1)}s. ` +
    `${(audit.stdout || "").trim()}`,
);
