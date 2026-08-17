// ============================================================
// File:        scripts/check-index.mjs
// Project:     RaceArena
// Description: Living-record guard. Every report file in reports/evolution/ must be referenced
//              from reports/evolution/INDEX.md. Catches the "unindexed report" drift class that
//              check-doc-links cannot see (a report with no inbound link is not a DANGLING link —
//              it is an ORPHAN). Read-only, no dependencies. Run from the repo root:
//              `node scripts/check-index.mjs`. Test/fixture overrides: --dir=<path> --index=<path>.
//
// TWO DIRECTIONS since NIGHT-TOOLS-1, and only the first existed before:
//   FILE -> INDEX   every report is referenced from INDEX.md (the ORPHAN it was built for)
//   INDEX -> FILE   every report INDEX.md links to actually exists (the DANGLING entry)
// The second was checked by NOTHING: check-doc-links scans docs/ and the repo-root *.md only, so
// reports/evolution/INDEX.md is outside its set entirely.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - Whether an index ENTRY describes the report it links to. A correct link to the wrong summary
//     passes both directions.
//   - Links in INDEX.md that are not sibling reports — docs/, reports/parity/, URLs. Those belong to
//     check-doc-links; counting them here would create a second home.
//   - Duplicate entries: a report linked twice passes, and arguably should.
//   - Ordering, grouping, or whether a report sits under the right heading.
//   - Any report in a SUBDIRECTORY of the reports dir (see REACH below).
//   - Whether the report itself is any good. This is a wiring check, not a review.
//
// LOUD-FAILURE RULE (Lesson 187, proof-of-live): a guard that passes because it found nothing to
// check is indistinguishable from a no-op. So an unreadable dir, an unreadable index, or ZERO
// reports all FAIL — never a silent green.
//
// REACH (boundary, not a bug): this scans only the FLAT `*.md` files directly in the reports dir;
// subdirectories are not descended. There are zero report files in subdirectories today. If reports
// ever move into subdirs, widen the readdir to recurse.
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-index",
  covers:
    "a report with no INDEX line, or an INDEX line pointing at a report that does not exist — in both directions, across three report directories",
  blind: [
    "whether the INDEX line DESCRIBES the report; it checks that both ends exist",
    "ELEVEN of the fourteen directories under reports/. This guard walks evolution/, night/ and parity/ — 245 tracked *.md between them — while 329 more sit in audit/, proposals/, closed-track-overview/, exp-archive/, greenfield/, open-track-overlap/, perf/, phase1-metrics/, results-salvage/, speed-candidates/ and clean-state-2026-06-04/, where an orphan cannot be detected. Most of that is archived sweep output, but proposals/ holds 17 and audit/ held the ONLY copy of a critical finding until it was rescued on 2026-08-18. Narrow by decision, not by oversight — widening it is the owner's call (NIGHT-2026-08-18 finding 11)",
  ],
  dirs: ["reports/"],
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

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

// ── THE REGISTERED DIRECTORIES (INDEX-COMPLETE-1) ─────────────────────────────────────────────
//
// Run bare, this guard used to answer about reports/evolution ALONE, while CI invoked it three times
// with three --dir/--index pairs. So `node scripts/check-index.mjs` printed a confident green line
// about a directory it had never been shown, and an unindexed night report sat on master behind that
// green for three hours. The LOUD-FAILURE RULE above already says a guard that finds nothing to
// check is a no-op and must refuse to pass; answering about one third of its subject is the same
// failure with better manners.
//
// IT DEFAULTS TO ALL OF THEM rather than refusing without arguments, which was the other option.
// Refusing helps only the person who runs it bare. Defaulting also covers the fourth directory the
// day somebody adds one, and it makes the CHEAPEST invocation the COMPLETE one — which is the
// invocation people actually type. The explicit --dir/--index form still checks exactly one pair,
// because the guard's own tests point it at fixtures.
const REGISTERED = [
  { dir: "reports/evolution", index: "reports/evolution/INDEX.md" },
  { dir: "reports/night", index: "reports/night/INDEX.md" },
  { dir: "reports/parity", index: "reports/parity/INDEX.md" },
];

const dirArg = argVal("dir", null);
const PAIRS = dirArg
  ? [{ dir: dirArg, index: argVal("index", join(dirArg, "INDEX.md")) }]
  : REGISTERED;

function fail(msg) {
  console.error(`check-index: FAIL — ${msg}`);
  process.exit(1);
}

let anyFailed = false;
const totals = { reports: 0, unindexed: 0, links: 0, missing: 0 };

for (const pair of PAIRS) {
  const DIR = resolve(pair.dir);
  const INDEX = resolve(pair.index);
  const INDEX_NAME = basename(INDEX);

  let entries;
  try {
    entries = readdirSync(DIR);
  } catch (e) {
    fail(`cannot read reports dir ${DIR}: ${e.message}`);
  }

  // The reports are the flat *.md files in the dir; the index itself is exempt.
  const reports = entries.filter((f) => f.endsWith(".md") && f !== INDEX_NAME);
  if (reports.length === 0) {
    fail(
      `zero reports found in ${DIR}. A guard that finds nothing to check is a no-op (Lesson 187); refusing to pass.`,
    );
  }

  let indexText;
  try {
    indexText = readFileSync(INDEX, "utf8");
  } catch (e) {
    fail(`cannot read index ${INDEX}: ${e.message}`);
  }

  // A report is indexed iff its filename appears as a markdown LINK TARGET — i.e. immediately after
  // `(` (a sibling link `(NAME.md)`) or `/` (a pathed link `(dir/NAME.md)`). Matching the bare
  // filename anywhere would false-pass on substrings (e.g. "A.md" inside "DATA.md").
  const isIndexed = (f) =>
    indexText.includes(`(${f}`) || indexText.includes(`/${f}`);
  const unindexed = reports.filter((f) => !isIndexed(f));

  // DIRECTION 2 (NIGHT-TOOLS-1): every sibling report INDEX.md links to must EXIST. Only `(NAME.md)`
  // sibling targets are considered — a pathed link points outside this guard's relationship and is
  // `check-doc-links`' business, not ours. Anchors are stripped before the check.
  const linked = [
    ...new Set(
      [...indexText.matchAll(/\(([A-Za-z0-9._-]+\.md)(?:#[^)]*)?\)/g)].map(
        (m) => m[1],
      ),
    ),
  ].filter((f) => f !== INDEX_NAME);
  const present = new Set(reports);
  const missing = linked.filter((f) => !present.has(f));

  totals.reports += reports.length;
  totals.unindexed += unindexed.length;
  totals.links += linked.length;
  totals.missing += missing.length;

  console.log(
    `check-index: ${pair.dir} — ${reports.length} reports checked, ${unindexed.length} unindexed; ` +
      `${linked.length} index links checked, ${missing.length} pointing at a missing file.`,
  );

  if (unindexed.length > 0) {
    console.error(
      `\nFAIL: ${unindexed.length} report(s) in ${DIR} not referenced from ${INDEX_NAME}:`,
    );
    for (const f of unindexed) console.error(f);
  }
  if (missing.length > 0) {
    console.error(
      `\nFAIL: ${missing.length} link(s) in ${INDEX_NAME} point at a report that does not exist:`,
    );
    for (const f of missing) console.error(f);
  }
  if (unindexed.length > 0 || missing.length > 0) anyFailed = true;
}

// The roll-up exists so a multi-directory run cannot be read as a single-directory one.
if (PAIRS.length > 1) {
  console.log(
    `check-index: ${PAIRS.length} directories — ${totals.reports} reports, ${totals.unindexed} unindexed, ` +
      `${totals.links} links, ${totals.missing} dangling.`,
  );
}
if (anyFailed) process.exit(1);
