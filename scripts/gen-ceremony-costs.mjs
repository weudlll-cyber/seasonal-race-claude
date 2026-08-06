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
// Usage:
//   node scripts/gen-ceremony-costs.mjs            # measure and rewrite the ceremony block
//   node scripts/gen-ceremony-costs.mjs --dry      # measure and print, write nothing
//   node scripts/gen-ceremony-costs.mjs --check    # exit 1 if the block is missing or STALE
// ============================================================

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { writeVerified } from "./lib/write-verified.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CEREMONY = join(ROOT, "docs", "SHIP-CEREMONY.md");
const BEGIN = "<!-- BEGIN GENERATED: guard costs — gen-ceremony-costs.mjs -->";
const END = "<!-- END GENERATED: guard costs -->";

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

const DRY = process.argv.includes("--dry");
const CHECK = process.argv.includes("--check");

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

// Seconds up to two minutes, then minutes to one decimal. Rounding to whole minutes turned 47 s
// and 77 s into "1 min" each, which is precisely the resolution the old hand-typed column lacked.
const human = (ms) =>
  ms >= 120_000
    ? `${(ms / 60_000).toFixed(1)} min`
    : `${Math.round(ms / 1000)} s`;

// ── --check: is the generated block present, and how old is it? ─────────────────────────────────
if (CHECK) {
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
  process.exit(0);
}

// ── MEASURE ─────────────────────────────────────────────────────────────────────────────────────
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
  process.exit(0);
}

const text = readFileSync(CEREMONY, "utf8");
let next;
if (text.includes(BEGIN) && text.includes(END)) {
  next =
    text.slice(0, text.indexOf(BEGIN)) +
    lines.join("\n") +
    text.slice(text.indexOf(END) + END.length);
} else {
  console.error(
    `FAIL: ${CEREMONY} has no ${BEGIN} / ${END} pair. Add the markers once, by hand, where the\n` +
      `costs should appear — the generator will not guess where in a document to write.`,
  );
  process.exit(1);
}
// VERIFIED, not assumed (ONE-TRUTH-2 stage 6): this rewrites a living document, and a
// write that silently did not happen has already put a false claim into a report twice.
writeVerified(
  CEREMONY,
  next,
  "the ceremony cost table in docs/SHIP-CEREMONY.md",
);
console.log(
  `\n  wrote the generated cost block to docs/SHIP-CEREMONY.md (commit ${commit}, ${machine})`,
);
for (const r of results)
  console.log(`    ${r.id.padEnd(10)} ${r.ok ? human(r.ms) : "FAILED"}`);
