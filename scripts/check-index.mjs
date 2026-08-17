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
    "a report with no INDEX line, an INDEX line pointing at a report that does not exist, and — since INDEX-COVERAGE-1 — a directory under reports/ that holds tracked reports and is in neither the indexed set nor the declared archive set. Every directory is accounted for; none is merely unwatched",
  blind: [
    "whether the INDEX line DESCRIBES the report; it checks that both ends exist",
    "ORPHANS INSIDE A DECLARED ARCHIVE. Seven directories are named in ARCHIVED with a reason and are deliberately not walked — results-salvage/, open-track-overlap/, closed-track-overview/, greenfield/, perf/, exp-archive/, phase1-metrics/. That is 312 reports of machine output and closed investigations that nobody adds to. The decision is now DECLARED rather than silent, which is the whole of INDEX-COVERAGE-1: a NEW directory, or a new file in one that holds none today, fails until somebody decides which list it belongs in",
    "the four standing notes directly in reports/ (README.md, BASELINE-INVALIDATED.md and two one-off write-ups). They belong to no block, so an index is the wrong shape for them; check-doc-links covers their links",
    "subdirectories of a registered directory — the walk is flat. reports/night/captures/ and reports/night/img/ hold evidence rather than reports and are deliberately not descended into",
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
import { execFileSync } from "node:child_process";
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
  // INDEX-COVERAGE-1: the one archive that still RECEIVES work. `PROJECT-AUDIT-2026-08-18.md` was
  // written here, sat untracked and outside every guard, and was the only copy of the finding that
  // first-admin setup could not succeed. A directory new work lands in needs the orphan check.
  { dir: "reports/proposals", index: "reports/proposals/INDEX.md" },
];

// ── THE ARCHIVES, DECLARED BY NAME (INDEX-COVERAGE-1) ─────────────────────────────────────────
//
// Until 2026-08-18 this guard walked three of the fourteen directories under `reports/` and said
// "0 unindexed" — a true sentence about 44% of the tree, printed in a shape that reads as a
// statement about all of it. The other eleven were not a decision; they were SILENCE, and silence
// is what let a critical finding sit in an unwatched directory.
//
// So every directory is now accounted for in one of two ways: REGISTERED above, or named here with
// a reason. An archive genuinely does not need an index — nobody adds to it and nothing links into
// it — but that has to be SAID, because "not indexed" and "nobody decided" look identical from
// outside.
const ARCHIVED = {
  "results-salvage":
    "raw per-combo result tables recovered from interrupted sweeps — machine output, never linked, never added to",
  "open-track-overlap":
    "the closed open-track overlap investigation; its conclusions live in reports/evolution and docs/DEAD-ENDS.md",
  "closed-track-overview":
    "per-track survey tables from the closed-track pass — evidence for reports that are themselves indexed",
  greenfield:
    "the greenfield night run's raw arms and tables; the verdict is an indexed evolution report",
  perf: "captured performance logs and frame traces — measurements, not write-ups",
  "exp-archive": "superseded experiment write-ups, kept so a killed branch can be re-read",
  "phase1-metrics": "the Phase-1 metric dumps; superseded by REBASELINE.md",
};

// A directory holding tracked reports that is in NEITHER list is the `audit/` case repeating, so it
// FAILS and forces a decision. Deliberately not pre-declared for the empty ones (`audit/`,
// `speed-candidates/`, `clean-state-2026-06-04/` hold no tracked *.md today): listing them now would
// let the next file land in them silently, which is the exact defect this closes.
const ROOT_NOTES_REASON =
  "standing notes that belong to no block — README.md is the map, BASELINE-INVALIDATED.md is the retired-numbers note, and two are one-off write-ups. They sit directly in reports/ and are covered by check-doc-links, not by an index.";

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

// ── DIRECTION 3 (INDEX-COVERAGE-1): EVERY DIRECTORY IS ACCOUNTED FOR ─────────────────────────────
//
// The two directions above answer "is every report in a REGISTERED directory indexed?". They cannot
// answer "is every directory registered?", and that is the question `audit/` failed silently: a new
// directory, a critical finding inside it, and a guard printing 0 unindexed about somewhere else.
//
// Enumeration is by GIT, not the filesystem: a directory with no tracked file is not part of the
// repository, and walking the disk would fail this guard on anybody's local scratch folder.
// Skipped when --dir is given, because that form is the fixture path its own tests use.
if (!dirArg) {
  let tracked;
  try {
    tracked = execFileSync("git", ["ls-files", "reports"], {
      encoding: "utf8",
      cwd: resolve("."),
    });
  } catch (e) {
    fail(
      `cannot enumerate tracked reports (git ls-files): ${e.message}. This guard refuses to report coverage it could not compute.`,
    );
  }
  const segments = new Map();
  let rootNotes = 0;
  for (const line of tracked.split("\n")) {
    const f = line.trim();
    if (!f.endsWith(".md")) continue;
    const rest = f.slice("reports/".length);
    const slash = rest.indexOf("/");
    if (slash < 0) {
      rootNotes++;
      continue;
    }
    const seg = rest.slice(0, slash);
    segments.set(seg, (segments.get(seg) ?? 0) + 1);
  }

  const registeredNames = new Set(REGISTERED.map((p) => basename(p.dir)));
  const undeclared = [...segments.keys()].filter(
    (s) => !registeredNames.has(s) && !(s in ARCHIVED),
  );

  const archivedCount = [...segments.entries()]
    .filter(([s]) => s in ARCHIVED)
    .reduce((n, [, c]) => n + c, 0);

  console.log(
    `check-index: coverage — ${segments.size} directories hold tracked reports; ` +
      `${registeredNames.size} INDEXED (${totals.reports} reports), ` +
      `${Object.keys(ARCHIVED).length} declared ARCHIVE (${archivedCount} reports), ` +
      `${rootNotes} standing note(s) directly in reports/, ${undeclared.length} undeclared.`,
  );

  if (undeclared.length > 0) {
    console.error(
      `\nFAIL: ${undeclared.length} directory/directories under reports/ hold tracked reports and are in NEITHER list:`,
    );
    for (const s of undeclared)
      console.error(`  reports/${s}/  (${segments.get(s)} report(s))`);
    console.error(
      `\nDecide, do not leave it silent — that is how reports/audit/ came to hold the ONLY copy of a\n` +
        `critical finding with nothing watching it. Either add an INDEX.md and register the directory\n` +
        `in REGISTERED, or name it in ARCHIVED with a reason a stranger can read.\n` +
        `Standing notes directly in reports/ are exempt: ${ROOT_NOTES_REASON}`,
    );
    anyFailed = true;
  }
}

// The roll-up exists so a multi-directory run cannot be read as a single-directory one.
if (PAIRS.length > 1) {
  console.log(
    `check-index: ${PAIRS.length} directories — ${totals.reports} reports, ${totals.unindexed} unindexed, ` +
      `${totals.links} links, ${totals.missing} dangling.`,
  );
}
if (anyFailed) process.exit(1);
