// ============================================================
// File:        scripts/data-export.mjs
// Project:     RaceArena — DATA-EXPORT-1
//
// BOXES UP THE ONLY IRREPLACEABLE THING. `server/data` is git-ignored, so it does not exist at
// origin. OneDrive syncs it, and syncing is not backing up: a deletion propagates exactly as
// faithfully as a file does. This writes one dated archive of the part of `server/data` that exists
// nowhere else, so the owner does not have to remember which part that is.
//
// WHAT COUNTS AS IRREPLACEABLE, and it is COMPUTED, never remembered: a file under `server/data`
// whose bytes differ from — or which has no counterpart in — `server/seeds`, which git tracks. Most
// of `server/data` is a byte-identical copy of the seeds (10 of 13 backgrounds, at the time of
// writing), and archiving those would turn a ~9 MB rescue into a ~68 MB copy of things git already
// has. The comparison is a SHA-256 per file, so "identical" is a measurement.
//
// READ-ONLY against `server/data`. It reads, and it writes one archive somewhere else. It never
// deletes, moves or modifies anything, and it copies nothing to origin — where a backup goes is the
// owner's choice, not a script's.
//
// NOT SCHEDULED, NOT HOOKED. He runs it when he wants a copy.
//
// Usage:
//   npm run data:export                  # archive to the default location (see DEFAULT_OUT_DIR)
//   npm run data:export -- --out=D:/bak  # somewhere he chooses
//   npm run data:export -- --list        # print the comparison and write nothing
// ============================================================

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "server", "data");
const SEEDS = join(ROOT, "server", "seeds");

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const LIST_ONLY = process.argv.slice(2).includes("--list");

/**
 * WHERE THE ARCHIVE GOES BY DEFAULT — and the honest limit on the choice.
 *
 * The brief asked for somewhere outside the OneDrive-synced tree if that can be determined
 * reliably. It cannot, from here: OneDrive's sync roots live in the registry and in per-user JSON
 * whose shape has changed across versions, and a wrong guess would put his only copy somewhere he
 * did not expect. So this makes the WEAKER, CHECKABLE choice — the repo's parent directory, which
 * is at least outside the repo — and SAYS whether that is still inside OneDrive so he can decide.
 * `--out=` overrides it, and that is the intended path for a real backup: an external disk.
 */
const DEFAULT_OUT_DIR = join(ROOT, "..");
const OUT_DIR = arg("out", DEFAULT_OUT_DIR);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

/** Every file under `dir`, as paths relative to it. */
function walk(dir, base = dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, base, acc);
    else acc.push(relative(base, p).split(sep).join("/"));
  }
  return acc;
}

const human = (b) =>
  b >= 1 << 20
    ? `${(b / (1 << 20)).toFixed(1)} MB`
    : b >= 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${b} B`;

if (!existsSync(DATA)) {
  console.error(
    `FAIL: ${DATA} does not exist — nothing to export, and that is not a success.`,
  );
  process.exit(2);
}

// ── THE COMPARISON ──────────────────────────────────────────────────────────────────────────────
const files = walk(DATA);
const unique = [];
const shared = [];
for (const rel of files) {
  const dPath = join(DATA, rel);
  const sPath = join(SEEDS, rel);
  const size = statSync(dPath).size;
  let why;
  if (!existsSync(sPath)) why = "no counterpart in seeds";
  else if (sha(dPath) !== sha(sPath)) why = "differs from seeds";
  if (why) unique.push({ rel, size, why });
  else shared.push({ rel, size });
}

const uniqueBytes = unique.reduce((a, f) => a + f.size, 0);
const sharedBytes = shared.reduce((a, f) => a + f.size, 0);

if (LIST_ONLY || process.env.RA_EXPORT_VERBOSE === "1") {
  for (const f of unique)
    console.log(
      `  UNIQUE  ${f.rel.padEnd(52)} ${human(f.size).padStart(9)}  (${f.why})`,
    );
  for (const f of shared.slice(0, 5))
    console.log(`  in seeds ${f.rel.padEnd(51)} ${human(f.size).padStart(9)}`);
  if (shared.length > 5)
    console.log(`  …and ${shared.length - 5} more already tracked by git`);
}

// ── WHERE THE SIZE ACTUALLY IS ──────────────────────────────────────────────────────────────────
// Printed because the total on its own is not legible: it is dominated by a few big images, and a
// number that grows without a reason attached is a number nobody trusts. Grouped by top-level entry.
if (unique.length) {
  const by = new Map();
  for (const f of unique) {
    const top = f.rel.split("/")[0];
    const e = by.get(top) ?? { n: 0, bytes: 0 };
    e.n += 1;
    e.bytes += f.size;
    by.set(top, e);
  }
  console.log("");
  for (const [top, e] of [...by].sort((a, b) => b[1].bytes - a[1].bytes))
    console.log(
      `  ${top.padEnd(34)} ${String(e.n).padStart(4)} file(s)  ${human(e.bytes).padStart(9)}`,
    );
}

// ── THE TWO-LINE HUMAN SUMMARY ──────────────────────────────────────────────────────────────────
console.log(
  `\n  ${unique.length} file(s) exist ONLY on this machine — ${human(uniqueBytes)}.\n` +
    `  ${shared.length} file(s) (${human(sharedBytes)}) are byte-identical to server/seeds and are NOT archived.`,
);

// AN EMPTY EXPORT IS A LEGITIMATE RESULT AND MUST NOT LOOK LIKE SUCCESS AT BOXING SOMETHING UP.
if (unique.length === 0) {
  console.log(
    `\n  NOTHING TO EXPORT. Every file under server/data matches server/seeds, which git already\n` +
      `  tracks. No archive was written — this is a correct result, not a completed backup.\n`,
  );
  process.exit(0);
}

if (LIST_ONLY) {
  console.log(`\n  --list: nothing written.\n`);
  process.exit(0);
}

// ── THE ARCHIVE ─────────────────────────────────────────────────────────────────────────────────
// Staged through a temp dir so the archive contains ONLY the unique set: `tar` is given an explicit
// file list rather than the data directory, which is what keeps 68 MB of seed copies out of it.
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const name = `racearena-data-${stamp}.tar.gz`;
mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, name);
const stage = mkdtempSync(join(tmpdir(), "ra-export-"));
try {
  for (const f of unique) {
    const dest = join(stage, "server-data", f.rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(DATA, f.rel), dest); // READ + WRITE ELSEWHERE. Never a move.
  }
  // The archive is built INSIDE the staging dir under a bare name and copied out afterwards.
  // Handing `tar` an absolute Windows path makes GNU tar read `C:` as a remote host and fail with
  // "Cannot connect to C: resolve failed" — so no argument here contains a drive letter.
  execFileSync("tar", ["-czf", name, "server-data"], {
    cwd: stage,
    stdio: "pipe",
  });
  copyFileSync(join(stage, name), outPath);
} finally {
  rmSync(stage, { recursive: true, force: true });
}

const archiveBytes = statSync(outPath).size;
const inOneDrive = /onedrive/i.test(outPath);
console.log(
  `\n  WROTE ${name} — ${unique.length} file(s), ${human(archiveBytes)} compressed (from ${human(uniqueBytes)})\n` +
    `  at ${outPath}\n`,
);
if (inOneDrive) {
  console.log(
    `  NOTE: that path is inside OneDrive, which SYNCS rather than backs up — a deletion\n` +
      `  propagates just as faithfully as a file. For a real backup pass --out=<external disk>.\n`,
  );
}
