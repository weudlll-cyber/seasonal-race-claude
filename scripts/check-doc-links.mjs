// ============================================================
// File:        scripts/check-doc-links.mjs
// Project:     RaceArena
// Description: Living-doc link checker. Verifies every relative markdown link in the LIVING docs
//              (docs/ + top-level *.md) resolves to a real file. Exits non-zero on any dangling link.
//              `reports/` is EXCLUDED by design — it is the lab journal (historical, allowed to rot).
//              No dependencies (plain Node). Run from the repo root: `node scripts/check-doc-links.mjs`.
//
// WHAT THIS GUARD DOES **NOT** CHECK:
//   - ANCHORS. `file.md#section` is verified only as far as `file.md`; a dead #anchor passes.
//   - EXTERNAL links. http(s) targets are never fetched — a 404 on the web is invisible here.
//   - `reports/**`, by design (the lab journal is allowed to rot), so a dangling link INSIDE a
//     report is not seen. reports/evolution/INDEX.md's own targets are check-index's job.
//   - Whether a link points at the RIGHT file — only that the path resolves.
//   - Images and any non-markdown asset reference.
//   - The reverse direction: a living doc that nothing links TO is not reported as an orphan.
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-doc-links",
  // WAS "a relative link in a living doc OR REPORT". It never scanned reports — `isLivingDoc`
  // excludes them by design, as the header has always said — so the declaration claimed ground the
  // code never looked at, which is the one thing a declaration must not do (CHECK-AUDIT-1 found it).
  covers:
    "a relative link in a LIVING doc (docs/ + repo-root *.md) that points at a file which does not exist",
  blind: [
    "external URLs",
    "anchors within a file — only the file half of a link is resolved",
    "links written INSIDE reports/ — the lab journal is allowed to rot and is never scanned, even though a change there selects this guard (see dirs below)",
    "repo-root `*.md`, which this guard SCANS but does not ROUTE on. `dirs` below is docs/ and reports/, so a change to README.md or CLAUDE.md ALONE selects neither this guard nor check-measured-stamps — proved by appending one blank line to README.md and reading `npm run verify --dry`, where the only guards it selected were the three declared always-on. CI runs everything unconditionally, so a broken root link is caught there: the cost is a late failure, not a missed one (NIGHT-2026-08-18 finding 10)",
  ],
  // `reports/` STAYS in dirs, and it is not an inconsistency with the line above. `dirs` is a
  // ROUTING statement — which changed paths select this guard — and it is a different question from
  // which files get SCANNED. Reports are never scanned, but they are link TARGETS: 88 links in the
  // living docs point into reports/, and deleting or renaming a report makes those dangle. A guard
  // that did not run when reports changed would miss its most likely real failure.
  dirs: ["docs/", "reports/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  // NIGHT-TOOLS-1: MACHINE-READABLE, because a human string has to be re-parsed by
  // whatever generates the ceremony's cost column, and a parser of prose is the defect
  // that column already had. `scripts/gen-ceremony-costs.mjs` reads exactly this token.
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)
`);
});

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();

// The living-doc set: every tracked .md under docs/, plus the repo-ROOT-level *.md files (README, etc.).
// Nested result/experiment/report trees are the lab journal and are excluded (they are allowed to rot):
// reports/, and any other tracked .md that is neither under docs/ nor at the repo root.
const tracked = execSync('git ls-files "*.md"', { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);
const files = tracked.filter((f) => {
  if (f.includes("node_modules/") || f.includes("/dist/")) return false;
  if (f.startsWith("docs/")) return true; // all of docs/ is living
  if (!f.includes("/")) return true; // repo-root-level *.md (README.md, KRAEFTE-LANDKARTE.md, …)
  return false; // nested trees (reports/, results dirs, client/, server/, scripts/) = not living docs
});

const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
let dangling = 0;
let checked = 0;

for (const f of files) {
  const abs = join(ROOT, f);
  // Strip HTML comments and fenced code blocks — links inside them are not live references.
  const text = readFileSync(abs, "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "");
  let m;
  while ((m = linkRe.exec(text))) {
    let target = m[1].trim();
    // Strip an optional "title" and any #anchor / line-anchor (#L123). Code line-anchors are
    // best-effort pointers; we verify the file exists, not the line.
    target = target.split(/\s+/)[0].split("#")[0];
    if (!target) continue; // pure in-page anchor
    if (/^(https?:|mailto:|tel:|data:)/.test(target)) continue; // external
    checked++;
    const resolved = resolve(dirname(abs), target);
    if (!existsSync(resolved)) {
      dangling++;
      console.error(`DANGLING: ${f} -> ${m[1]}`);
    }
  }
}

console.log(
  `check-doc-links: ${checked} relative links across ${files.length} living-doc files; ${dangling} dangling.`,
);
if (dangling > 0) {
  console.error(
    `\nFAIL: ${dangling} dangling link(s) in living docs. Fix or remove them (reports/ is excluded as lab journal).`,
  );
  process.exit(1);
}
