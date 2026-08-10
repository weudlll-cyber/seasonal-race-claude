// ============================================================
// File:        scripts/gen-ceremony-costs.mjs
// Project:     RaceArena — NIGHT-TOOLS-1 stage B
//
// GENERATES THE CEREMONY'S COST COLUMN from measured runtimes, so it stops being typed by hand.
//
// WHY: the column was wrong in BOTH directions for two mintings — camera claimed `~85 s` and costs
// ~47, render claimed `~30 s` and costs ~15 at the time. A hand-maintained number is corrected only
// where somebody happens to be looking, and the render row was current only because the block that
// wrote it had just touched it. That asymmetry IS the defect.
//
// SINGLE HOME: each guard measures ITSELF and prints `[ra-elapsed-ms N]`. This script runs them and
// writes the table. Nobody types a duration anywhere, and if a guard gets slower the next
// regeneration says so. The generated block also carries WHEN it was measured, on WHICH commit and
// on WHICH machine — a duration without a timestamp is exactly the defect being removed here.
//
// WHAT THIS DOES **NOT** DO, stated per the block's safety bar:
//   - It does not measure the test suites (client vitest, `node --test scripts/`). Those are not in
//     the ceremony's fingerprint table, and their cost is dominated by one file — see
//     reports/evolution/VERIFY-COST-1.md.
//   - It does not run guards concurrently. Contention changes the numbers by 2-5x (measured in
//     VERIFY-FAST-1), and the ceremony's question is "what does this cost me if I run it", which is
//     the sequential answer.
//   - It does not verify the HASHES in the table, only the durations. The hashes have their own
//     homes and their own mint discipline.
//   - One sample per guard. These are wall-clock timings on a loaded desktop: treat them as the
//     right order of magnitude, which is all the column was ever for.
//
// ── CEREMONY-COUNTS-GENERATED: THE SECOND BLOCK, AND WHY IT IS IN THIS FILE ──────────────────────
//
// The mint-tripwire paragraph above the cost table carried THREE TYPED NUMBERS — the size of
// `raceCore.js`'s import closure, the size of the folder the old rule fired on, and how many of that
// folder cannot reach the engine. They had already gone stale once (19 / 103 / 84 until 2026-08-10),
// and the document said so about itself while continuing to type them.
//
// THE BLOCKER WAS NEVER THE NUMBER, IT WAS THE SENTENCE. A generator that owned the paragraph would
// own an ARGUMENT, and an argument that a script rewrites is one nobody can be held to. The fix is
// to split them: the counts are a small generated TABLE with no prose in it, and the argument stays
// as prose above and below the markers, written by a person and touched by nothing.
//
// TWO BLOCKS, ONE MECHANISM, deliberately — the same markers, the same `writeVerified`, the same
// script. A second generator beside this one would be a second thing to remember to run.
//
// THE TWO BLOCKS ARE CHECKED DIFFERENTLY, AND THAT IS THE POINT. A cost is a MEASUREMENT: it cannot
// be recomputed without spending the five minutes it measures, so `--check` can only ask how OLD it
// is. A count is DERIVED: it can be recomputed in milliseconds, so its check asks whether it is
// RIGHT. That is why `--check-counts` exists as its own cheap flag and is what `npm run verify`
// runs — a guard that failed a build over a stale duration would be crying wolf, and a guard that
// only warned about a wrong count would be useless.
//
// Usage:
//   node scripts/gen-ceremony-costs.mjs                # measure the guards, rewrite BOTH blocks
//   node scripts/gen-ceremony-costs.mjs --counts       # rewrite the COUNTS block only (no guards run)
//   node scripts/gen-ceremony-costs.mjs --dry          # measure and print, write nothing
//   node scripts/gen-ceremony-costs.mjs --check        # exit 1 if a block is missing, STALE or WRONG
//   node scripts/gen-ceremony-costs.mjs --check-counts # counts only: exit 1 if missing or WRONG
//   node scripts/gen-ceremony-costs.mjs --doc=<path>   # operate on a copy (used by the test)
// ============================================================

export const GUARD = {
  id: "ceremony-counts",
  covers:
    "the three engine-reach counts in docs/SHIP-CEREMONY.md going stale — a file entering or leaving raceCore.js's import closure, or a file appearing under or leaving client/src/modules/ outside camera/",
  blind: [
    "the guard COST table in the same document — a cost cannot be recomputed without paying it, so --check can only ask how old it is and never fails a build over one",
    "whether the closure is RIGHT — scripts/engine-reach.mjs owns that and has its own test",
    "the prose around the block, which is the argument and is deliberately not generated",
  ],
  dirs: ["client/src/modules/"],
  files: ["docs/SHIP-CEREMONY.md"],
  reach: ["client/src/modules/raceCore.js"],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { writeVerified } from "./lib/write-verified.mjs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { engineReach } from "./engine-reach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC_OVERRIDE = process.argv
  .filter((a) => a.startsWith("--doc="))
  .map((a) => a.slice("--doc=".length));
// A TEST NEVER WRITES THE TRACKED DOCUMENT — same rule and the same seam as gen-engine-reach-doc.
const CEREMONY = DOC_OVERRIDE.length
  ? resolve(DOC_OVERRIDE[0])
  : join(ROOT, "docs", "SHIP-CEREMONY.md");
const BEGIN = "<!-- BEGIN GENERATED: guard costs — gen-ceremony-costs.mjs -->";
const END = "<!-- END GENERATED: guard costs -->";
const COUNTS_BEGIN =
  "<!-- BEGIN GENERATED: engine-reach counts — gen-ceremony-costs.mjs -->";
const COUNTS_END = "<!-- END GENERATED: engine-reach counts -->";

/**
 * STALENESS THRESHOLD, and it names itself in the artifact it leaves behind — the decision this
 * block was asked to make alone. 40 commits, because the table's inputs only move when a guard's
 * WORK changes (more tracks, more frames, more sample points), which has happened roughly every
 * 30-50 commits in this repo's recent history. Shorter would cry wolf on doc-only days; longer and
 * the render row would have gone stale again unnoticed after FINISH-WINDOW-1 extended its run.
 * It WARNS, never fails a build: a stale cost column misinforms, it does not break anything.
 */
const STALE_AFTER_COMMITS = 40;

const GUARDS = [
  {
    id: "world",
    script: "fingerprint-default.mjs",
    label: "`scripts/fingerprint-default.mjs` — **world**",
  },
  {
    id: "camera",
    script: "camera-fingerprint.mjs",
    label: "`scripts/camera-fingerprint.mjs` — **camera**",
  },
  {
    id: "render",
    script: "render-fingerprint.mjs",
    label: "`scripts/render-fingerprint.mjs` — **render**",
  },
  {
    id: "doc-links",
    script: "check-doc-links.mjs",
    label: "`scripts/check-doc-links.mjs`",
  },
  {
    id: "index",
    script: "check-index.mjs",
    label: "`scripts/check-index.mjs`",
  },
  { id: "tags", script: "check-tags.mjs", label: "`scripts/check-tags.mjs`" },
];

// IS_ENTRY: whether this file was RUN or merely IMPORTED. Every side-effecting branch below is
// gated on it — see the MEASURE section for the incident that made it necessary.
const IS_ENTRY =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

const DRY = process.argv.includes("--dry");
const CHECK = process.argv.includes("--check");
const CHECK_COUNTS = process.argv.includes("--check-counts");
const COUNTS_ONLY = process.argv.includes("--counts");

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

/**
 * The three counts the mint tripwire quotes, computed rather than remembered.
 *
 * THE THIRD ONE IS NOT THE DIFFERENCE OF THE FIRST TWO, and typing it as one is exactly how the
 * document came to claim 86. The closure and the folder are two sets neither of which contains the
 * other: the closure reaches `camera/lapUtils.js` (inside `camera/`, which the folder rule excluded)
 * and `client/src/utils/mathUtils.js` (outside `modules/` entirely). So the unreachable count is
 * `folder − |closure ∩ folder|`, and the members responsible for the gap are returned with it so
 * the document can name them instead of asserting a subtraction.
 *
 * THE FOLDER SET IS `git ls-files`, NOT A DIRECTORY WALK: the old rule fired on tracked files, and a
 * walk would also count build output, editor droppings and anything ignored.
 *
 * @returns {{closure:number, folder:number, unreachable:number, outside:string[]}}
 */
export function ceremonyCounts() {
  const closure = engineReach().files;
  const folder = git(["ls-files", "client/src/modules"])
    .split("\n")
    .filter(Boolean)
    .filter((p) => !p.startsWith("client/src/modules/camera/"))
    .filter((p) => !/\.test\./.test(p));
  const inFolder = new Set(folder);
  const outside = closure.filter((f) => !inFolder.has(f));
  return {
    closure: closure.length,
    folder: folder.length,
    unreachable: folder.length - (closure.length - outside.length),
    outside,
  };
}

/** The counts block, rendered. No timestamp and no commit: these are derived facts, not measurements. */
export function countsBlock(c = ceremonyCounts()) {
  return [
    COUNTS_BEGIN,
    "",
    "| count | value |",
    "| ---------------------------------------------------------------------------------------------- | ----- |",
    `| files in \`raceCore.js\`'s import closure — \`node scripts/engine-reach.mjs\` | ${c.closure} |`,
    `| tracked non-test files under \`client/src/modules/\` outside \`camera/\` — what the old folder rule fired on | ${c.folder} |`,
    `| of those, files that CANNOT reach the engine | ${c.unreachable} |`,
    `| closure files the folder rule never covered | ${c.outside.map((f) => "`" + f + "`").join(", ") || "none"} |`,
    "",
    COUNTS_END,
  ].join("\n");
}

/** Splice a rendered block back into the document between its markers, or return null if absent. */
function splice(text, begin, end, block) {
  if (!text.includes(begin) || !text.includes(end)) return null;
  return (
    text.slice(0, text.indexOf(begin)) +
    block +
    text.slice(text.indexOf(end) + end.length)
  );
}

/** Extract the current block text between markers, or null. */
function extract(text, begin, end) {
  if (!text.includes(begin) || !text.includes(end)) return null;
  return text.slice(text.indexOf(begin), text.indexOf(end) + end.length);
}

/**
 * Counts-only correctness check. Unlike the cost table's staleness warning this recomputes the
 * answer, so it fails on a WRONG number rather than an old one.
 */
function checkCounts() {
  const text = readFileSync(CEREMONY, "utf8");
  const have = extract(text, COUNTS_BEGIN, COUNTS_END);
  if (have === null) {
    console.error(
      `FAIL: ${CEREMONY} has no generated engine-reach counts block. Run gen-ceremony-costs.mjs --counts.`,
    );
    return 1;
  }
  const want = countsBlock();
  // COMPARED AFTER NORMALISING WHITESPACE, not byte for byte. A markdown table's column padding is
  // presentation: somebody aligning the pipes by hand, or a future formatter reaching docs/ (today's
  // does not — `npm run format` is `prettier --write src` inside client/), must not be reported as a
  // wrong count. What survives normalisation is every LABEL and every VALUE, which is the whole
  // claim. The generator still writes one canonical form, so `--counts` reflows a hand-aligned table.
  const norm = (s) =>
    s
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .join("\n");
  if (norm(have) !== norm(want)) {
    console.error(
      "FAIL: the engine-reach counts in docs/SHIP-CEREMONY.md do not match the repository.\n" +
        "      Run `node scripts/gen-ceremony-costs.mjs --counts`.\n" +
        "--- in the document ---\n" +
        have +
        "\n--- computed now ---\n" +
        want,
    );
    return 1;
  }
  console.log(
    `check-ceremony-counts: closure ${want.match(/\| (\d+) \|/)?.[1] ?? "?"} — the document agrees with the repository.`,
  );
  return 0;
}

if (IS_ENTRY && CHECK_COUNTS && !CHECK) process.exit(checkCounts());

// --counts: rewrite the cheap block and stop. No guard is run, so this costs milliseconds and there
// is no excuse for leaving the counts stale after a refactor.
if (IS_ENTRY && COUNTS_ONLY) {
  const text = readFileSync(CEREMONY, "utf8");
  const next = splice(text, COUNTS_BEGIN, COUNTS_END, countsBlock());
  if (next === null) {
    console.error(
      `FAIL: ${CEREMONY} has no ${COUNTS_BEGIN} / ${COUNTS_END} pair. Add the markers once, by hand.`,
    );
    process.exit(1);
  }
  if (DRY) {
    console.log(countsBlock());
    process.exit(0);
  }
  writeVerified(CEREMONY, next, "the engine-reach counts in docs/SHIP-CEREMONY.md");
  console.log("  wrote the generated engine-reach counts block");
  process.exit(0);
}

// Seconds up to two minutes, then minutes to one decimal. Rounding to whole minutes turned 47 s
// and 77 s into "1 min" each, which is precisely the resolution the old hand-typed column lacked.
const human = (ms) =>
  ms >= 120_000
    ? `${(ms / 60_000).toFixed(1)} min`
    : `${Math.round(ms / 1000)} s`;

// ── --check: is the generated block present, and how old is it? ─────────────────────────────────
if (IS_ENTRY && CHECK) {
  const text = readFileSync(CEREMONY, "utf8");
  if (!text.includes(BEGIN)) {
    console.error(
      `FAIL: ${CEREMONY} has no generated cost block. Run gen-ceremony-costs.mjs.`,
    );
    process.exit(1);
  }
  const m = text.match(/measured on commit `([0-9a-f]{7,40})`/);
  if (!m) {
    console.error(
      "FAIL: the generated block does not name the commit it was measured on.",
    );
    process.exit(1);
  }
  const since = git(["rev-list", "--count", `${m[1]}..HEAD`]);
  const n = Number(since || "0");
  if (n > STALE_AFTER_COMMITS) {
    console.error(
      `STALE: the cost column was measured ${n} commits ago (threshold ${STALE_AFTER_COMMITS}). ` +
        `Re-run gen-ceremony-costs.mjs. This is a WARNING, not a build failure.`,
    );
    process.exit(1);
  }
  console.log(
    `check-ceremony-costs: measured ${n} commit(s) ago; threshold ${STALE_AFTER_COMMITS}.`,
  );
  // The counts are checked for CORRECTNESS in the same pass — see the header on why the two blocks
  // are asked different questions. Reached only when the cost block is fresh, which is fine: a stale
  // cost block is already a non-zero exit and the operator is being sent to a full regeneration.
  process.exit(checkCounts());
}

// ── MEASURE ─────────────────────────────────────────────────────────────────────────────────────
// Everything below is the ENTRY-POINT program: run the six guards, then write BOTH blocks.
// WRAPPED, and this file's own test is what found it necessary — importing the module for
// `ceremonyCounts` used to run all six guards and rewrite the tracked docs/SHIP-CEREMONY.md as a
// side effect of `node --test`. Same defect and same fix as `verify.mjs`'s IS_ENTRY.
if (IS_ENTRY) {
  const results = [];
  for (const g of GUARDS) {
    process.stderr.write(`  measuring ${g.id}…
  `);
    const started = Date.now();
    // spawnSync, not execFileSync: the guard's OWN measurement arrives on stderr, and execFileSync
    // returns stdout only. Each guard runs exactly ONCE — an earlier draft ran them twice, which on
    // the world fingerprint alone would have doubled a two-minute measurement for nothing.
    const r = spawnSync(process.execPath, [join("scripts", g.script)], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 28,
    });
    const wall = Date.now() - started;
    // The guard's own token is authoritative; the wrapper's clock includes node start-up, which is
    // not what the ceremony is asking about. Fall back to it only if the token is absent.
    const m = String(r.stderr ?? "").match(/\[ra-elapsed-ms (\d+)\]/);
    results.push({
      ...g,
      ms: m ? Number(m[1]) : wall,
      selfTimed: !!m,
      ok: r.status === 0,
    });
  }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const commit = git(["rev-parse", "--short", "HEAD"]) || "(unknown)";
  const machine = hostname() || "(unknown)";

  const lines = [
    BEGIN,
    "",
    `**Costs below are GENERATED, never typed** — measured on commit \`${commit}\`, ${stamp} UTC, on \`${machine}\`,`,
    `by \`node scripts/gen-ceremony-costs.mjs\`. Each guard times ITSELF and prints \`[ra-elapsed-ms N]\`;`,
    `this table quotes those numbers. A duration here that nobody measured is a bug in the generator,`,
    `not a typo. \`--check\` warns once the block is more than ${STALE_AFTER_COMMITS} commits old.`,
    "",
    "| guard | cost |",
    "|---|---|",
    ...results.map(
      (r) =>
        `| ${r.label} | ${r.ok ? human(r.ms) : "FAILED to run"}${r.selfTimed ? "" : " *(wrapper clock — the guard printed no token)*"} |`,
    ),
    "",
    END,
  ];

  if (DRY) {
    console.log(lines.join("\n"));
    console.log("");
    console.log(countsBlock());
    process.exit(0);
  }

  const text = readFileSync(CEREMONY, "utf8");
  let next = splice(text, BEGIN, END, lines.join("\n"));
  if (next === null) {
    console.error(
      `FAIL: ${CEREMONY} has no ${BEGIN} / ${END} pair. Add the markers once, by hand, where the\n` +
        `costs should appear — the generator will not guess where in a document to write.`,
    );
    process.exit(1);
  }
  // A full run writes BOTH blocks. The counts are free next to a five-minute measurement, and leaving
  // them behind would recreate the drift this block was opened to end.
  const withCounts = splice(next, COUNTS_BEGIN, COUNTS_END, countsBlock());
  if (withCounts === null) {
    console.error(
      `FAIL: ${CEREMONY} has no ${COUNTS_BEGIN} / ${COUNTS_END} pair. Add the markers once, by hand.`,
    );
    process.exit(1);
  }
  next = withCounts;
  // VERIFIED, not assumed (ONE-TRUTH-2 stage 6): this rewrites a living document, and a
  // write that silently did not happen has already put a false claim into a report twice.
  writeVerified(
    CEREMONY,
    next,
    "the ceremony cost table and engine-reach counts in docs/SHIP-CEREMONY.md",
  );
  console.log(
    `\n  wrote the generated cost block to docs/SHIP-CEREMONY.md (commit ${commit}, ${machine})`,
  );
  for (const r of results)
    console.log(`    ${r.id.padEnd(10)} ${r.ok ? human(r.ms) : "FAILED"}`);
}
