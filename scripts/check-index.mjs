// ============================================================
// File:        scripts/check-index.mjs
// Project:     RaceArena
// Description: Living-record guard. Every report file in reports/evolution/ must be referenced
//              from reports/evolution/INDEX.md. Catches the "unindexed report" drift class that
//              check-doc-links cannot see (a report with no inbound link is not a DANGLING link —
//              it is an ORPHAN). Read-only, no dependencies. Run from the repo root:
//              `node scripts/check-index.mjs`. Test/fixture overrides: --dir=<path> --index=<path>.
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
const __t0 = Date.now();
process.on('exit', () => process.stderr.write(`[${__t0 && ''}elapsed ${((Date.now() - __t0) / 1000).toFixed(1)}s]
`));

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const DIR = resolve(argVal('dir', 'reports/evolution'));
const INDEX = resolve(argVal('index', join(DIR, 'INDEX.md')));
const INDEX_NAME = basename(INDEX);

function fail(msg) {
  console.error(`check-index: FAIL — ${msg}`);
  process.exit(1);
}

let entries;
try {
  entries = readdirSync(DIR);
} catch (e) {
  fail(`cannot read reports dir ${DIR}: ${e.message}`);
}

// The reports are the flat *.md files in the dir; the index itself is exempt.
const reports = entries.filter((f) => f.endsWith('.md') && f !== INDEX_NAME);
if (reports.length === 0) {
  fail(
    `zero reports found in ${DIR}. A guard that finds nothing to check is a no-op (Lesson 187); refusing to pass.`
  );
}

let indexText;
try {
  indexText = readFileSync(INDEX, 'utf8');
} catch (e) {
  fail(`cannot read index ${INDEX}: ${e.message}`);
}

// A report is indexed iff its filename appears as a markdown LINK TARGET — i.e. immediately after
// `(` (a sibling link `(NAME.md)`) or `/` (a pathed link `(dir/NAME.md)`). Matching the bare
// filename anywhere would false-pass on substrings (e.g. "A.md" inside "DATA.md").
const isIndexed = (f) => indexText.includes(`(${f}`) || indexText.includes(`/${f}`);
const unindexed = reports.filter((f) => !isIndexed(f));

console.log(`check-index: ${reports.length} reports checked, ${unindexed.length} unindexed.`);

if (unindexed.length > 0) {
  console.error(
    `\nFAIL: ${unindexed.length} report(s) in ${DIR} not referenced from ${INDEX_NAME}:`
  );
  for (const f of unindexed) console.error(f);
  process.exit(1);
}
