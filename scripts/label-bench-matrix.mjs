// ============================================================
// File:        scripts/label-bench-matrix.mjs
// Project:     RaceArena — LABEL-BENCH-1
//
// THE MATRIX: three field sizes x four label contents, plus MASTER's layout at 100 for the one
// comparison point that answers "does what we built cost more than what was there".
//
// THE FRAMES ARE CAPTURED ONCE PER FIELD SIZE AND SHARED. Every arm at a given field size replays
// the SAME frames, and the master arm replays them too — it is handed the capture file rather than
// running its own race, because master's camera is not the chain's and a race it drove itself would
// have the racers somewhere else. Comparing two layouts on two different pictures would measure the
// pictures.
//
// ONE PROCESS PER FIELD SIZE (and one more for master), so a de-optimisation at n=30 cannot be
// charged to n=100.
//
// Usage:
//   node scripts/label-bench-matrix.mjs --master=C:/ra-wt-nanoid
// ============================================================

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const MASTER = arg("master", "C:/ra-wt-nanoid");
const OUTDIR = join(ROOT, arg("outdir", "reports/perf/label-bench-1"));
const REPEATS = arg("repeats", "3");
const SAMPLE = arg("sample", "4");
// Three discarded rounds, not one. The master block runs a SINGLE arm, so one warm-up round there is
// a third of the work the chain block's warm-up does, and at one round it did not settle: its five
// measured rounds spread 212 %. Three settles both blocks.
const WARM = arg("warm-rounds", "3");
const SIZES = (arg("sizes", "30,70,100") || "").split(",").map(Number);
const MASTER_AT = Number(arg("master-at", "100"));
// The captured frames are an INTERMEDIATE, not a result: ~6 MB at n=100 and regenerable exactly from
// the seed. They go to scratch, not into the repo. Only the timings are committed.
const SCRATCH = process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch", "label-bench-1");

if (!existsSync(join(MASTER, "scripts", "lib", "raceDriver.mjs"))) {
  console.error(`FAIL: --master=${MASTER} is not a RaceArena tree.`);
  process.exit(2);
}
mkdirSync(OUTDIR, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });

const MASTER_BENCH = join(MASTER, "scripts", "label-bench.mjs");
copyFileSync(join(ROOT, "scripts", "label-bench.mjs"), MASTER_BENCH);

const summary = [];

function run(cwd, args, label) {
  const t0 = Date.now();
  const stdout = execFileSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  const m = stdout.match(/\[label-bench (\{[\s\S]*\})\]/);
  if (!m) {
    console.error(stdout);
    throw new Error(`no [label-bench ...] token from ${label}`);
  }
  const parsed = JSON.parse(m[1]);
  console.log(stdout.split("\n").filter((l) => l && !l.startsWith("[label-bench")).join("\n"));
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  return parsed;
}

try {
  for (const n of SIZES) {
    const frames = join(SCRATCH, `frames-n${n}.json`);
    const out = join(OUTDIR, `chain-n${n}.json`);
    console.log(`=== CHAIN n=${n} — four label contents, same frames ===`);
    summary.push({
      tree: "chain",
      racers: n,
      ...run(
        ROOT,
        [
          join(ROOT, "scripts", "label-bench.mjs"),
          `--racers=${n}`,
          `--repeats=${REPEATS}`,
          `--sample=${SAMPLE}`,
          `--warm-rounds=${WARM}`,
          `--dump-frames=${frames}`,
          `--out=${out}`,
          `--label=chain-n${n}`,
        ],
        `chain-n${n}`,
      ),
    });

    if (n === MASTER_AT) {
      console.log(`=== MASTER n=${n} — its own layout, THE SAME captured frames ===`);
      summary.push({
        tree: "master",
        racers: n,
        ...run(
          MASTER,
          [
            MASTER_BENCH,
            `--replay=${frames}`,
            "--arm=name",
            `--repeats=${REPEATS}`,
            `--warm-rounds=${WARM}`,
            `--out=${join(OUTDIR, `master-n${n}.json`)}`,
            `--label=master-n${n}`,
          ],
          `master-n${n}`,
        ),
      });
    }
  }
} finally {
  rmSync(MASTER_BENCH, { force: true });
}

// ── THE TABLE. Median of each arm's repeats — never the mean; one scheduler hiccup must not move it.
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor((s.length - 1) / 2)];
};
const rows = [];
for (const block of summary) {
  const byArm = new Map();
  for (const a of block.arms) {
    if (!byArm.has(a.arm)) byArm.set(a.arm, []);
    byArm.get(a.arm).push(a);
  }
  for (const [armName, runs] of byArm) {
    rows.push({
      tree: block.tree,
      racers: block.racers,
      arm: armName,
      repeats: runs.length,
      p50: med(runs.map((r) => r.p50)),
      p90: med(runs.map((r) => r.p90)),
      holdP50: med(runs.map((r) => r.holdP50)),
      spreadPct: +(
        (100 * (Math.max(...runs.map((r) => r.p50)) - Math.min(...runs.map((r) => r.p50)))) /
        med(runs.map((r) => r.p50))
      ).toFixed(1),
      placed: runs[0].placed,
      named: runs[0].named,
      chars: runs[0].chars,
    });
  }
}

console.log(
  "\ntree    n     arm            reps   layout p50   layout p90   spread    hold p50   placed   named   name%   chars/f",
);
for (const r of rows) {
  console.log(
    `${r.tree.padEnd(7)} ${String(r.racers).padStart(3)}   ${r.arm.padEnd(14)} ${String(r.repeats).padStart(4)}   ` +
      `${r.p50.toFixed(4).padStart(9)}   ${r.p90.toFixed(4).padStart(9)}   ${(r.spreadPct + "%").padStart(6)}   ` +
      `${r.holdP50.toFixed(4).padStart(8)}   ${r.placed.toFixed(1).padStart(6)}  ${r.named.toFixed(1).padStart(6)}  ` +
      `${((100 * r.named) / Math.max(1e-9, r.placed)).toFixed(1).padStart(5)}%   ${r.chars.toFixed(1).padStart(7)}`,
  );
}

writeFileSync(
  join(OUTDIR, "matrix.json"),
  JSON.stringify(
    {
      tool: "label-bench-matrix.mjs",
      version: "LABEL-BENCH-1",
      trees: { chain: ROOT, master: MASTER },
      framesDir: SCRATCH,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      rows,
      blocks: summary,
    },
    null,
    1,
  ),
);
console.log(`\nmatrix -> ${join(OUTDIR, "matrix.json")}`);
console.log(`captured frames (intermediate, not committed) -> ${SCRATCH}`);
