// ============================================================
// File:        scripts/phys-bench-matrix.mjs
// Project:     RaceArena — PHYS-BENCH-1
//
// THE MATRIX, and the reason it is a script rather than a shell loop: it runs the same bench across
// TWO WORKING TREES in the order A/B/A, and an interleaving that is retyped by hand is an
// interleaving that will eventually not be one. The A/B/A order is the whole control — this machine
// is not a lab bench, and a background task that arrives halfway through a sweep would otherwise be
// indistinguishable from a finding.
//
// ONE PROCESS PER RUN, deliberately. Each configuration gets a fresh V8, so the field-size curve
// cannot be an artefact of one heap growing across five measurements, and a de-optimisation caused
// by run k cannot be charged to run k+1.
//
// TWO INTERLEAVINGS, AND THE SECOND ONE EXISTS BECAUSE THE FIRST ONE FAILED. `--order=pass` runs the
// whole field sweep three times — chain, master, chain — which is the obvious reading of A/B/A. On
// this machine it does not work: the first measured sweep came out systematically slower than the
// third, by 37 % at n=100, so the two chain passes bracket the master pass by far more than any
// difference between the commits could be. A/B/A cancels a CONSTANT offset; it does not cancel a
// monotone trend spread over five minutes.
//
// `--order=size` fixes exactly that by making the three runs ADJACENT IN TIME: for each field size,
// chain, then master, then chain again, back to back. A drift slow enough to matter over five
// minutes moves all three of a triple almost equally, so the within-triple comparison survives it.
// It is still A/B/A — the same three runs in the same order — only the outer loop changed. Both are
// kept and both are reported: the pass order is the honest record of how badly a naive sweep drifts,
// and the size order is the instrument that can actually answer Q1.
//
// HOW THE SECOND TREE IS REACHED: `scripts/phys-bench.mjs` is COPIED into it and run from there, so
// every `../client/src/...` specifier resolves inside that tree. The copy is removed afterwards. The
// alternative — one script importing two engines — cannot work: the module graph is keyed by path
// and both trees export the same names.
//
// WHAT IT DOES NOT DO: it never edits either tree's source. Nothing under `engine-reach.mjs`'s
// closure is touched by this file or by anything it writes.
//
// Usage:
//   node scripts/phys-bench-matrix.mjs --master=C:/ra-wt-nanoid
//   node scripts/phys-bench-matrix.mjs --master=... --order=size --only=field
//   node scripts/phys-bench-matrix.mjs --master=... --skip-profiles
// ============================================================

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const MASTER = arg("master", "C:/ra-wt-nanoid");
const TRACK = arg("track", "searound");
const SEED = arg("seed", "5601");
const STEPS = arg("steps", "3000");
const WARMUP = arg("warmup", "300");
const OUTDIR = join(ROOT, arg("outdir", "reports/perf/phys-bench-1"));
const SKIP_PROFILES = process.argv.includes("--skip-profiles");
// `pass` = three whole sweeps; `size` = the three runs of one field size back to back. See header.
const ORDER = arg("order", "pass");
// Which dimensions to run. Default all; `--only=field` re-measures one dimension without paying for
// the rest, which is what a drifted result needs.
const ONLY = (arg("only", "field,roster") || "").split(",").filter(Boolean);

if (ORDER !== "pass" && ORDER !== "size") {
  console.error(`FAIL: --order must be "pass" or "size", not "${ORDER}".`);
  process.exit(2);
}

// `--sizes=85` re-measures ONE triple. A triple that a machine transition landed inside is not a
// finding and must not be averaged into one — it is re-run, and both attempts are kept on disk.
const FIELD_SIZES = (arg("sizes", "30,50,70,85,100") || "")
  .split(",")
  .map(Number);
const ROSTER_SIZES = [70, 100];
const ROSTERS = ["current", "long", "mixed"];
const PROFILE_SIZES = [30, 100];

if (!existsSync(join(MASTER, "scripts", "lib", "raceDriver.mjs"))) {
  console.error(`FAIL: --master=${MASTER} is not a RaceArena tree.`);
  process.exit(2);
}

mkdirSync(OUTDIR, { recursive: true });
mkdirSync(join(OUTDIR, "raw"), { recursive: true });
mkdirSync(join(OUTDIR, "profiles"), { recursive: true });

// The copy that makes the second tree reachable. Removed in `finally`.
const MASTER_BENCH = join(MASTER, "scripts", "phys-bench.mjs");
copyFileSync(join(ROOT, "scripts", "phys-bench.mjs"), MASTER_BENCH);

const TREES = {
  chain: { root: ROOT, label: "chain" },
  master: { root: MASTER, label: "master" },
};

const rows = [];

/**
 * One bench run, in its own process, in the named tree. Returns the parsed summary.
 *
 * `--out` is always an ABSOLUTE path into this tree's report directory, so the master tree writes
 * its raw samples here too — one place holds the run, whichever engine produced it.
 */
function run(tree, { racers, roster, label, nodeArgs = [] }) {
  const outName = `${label}.json`;
  const args = [
    ...nodeArgs,
    join(tree.root, "scripts", "phys-bench.mjs"),
    `--track=${TRACK}`,
    `--seed=${SEED}`,
    `--racers=${racers}`,
    `--roster=${roster}`,
    `--steps=${STEPS}`,
    `--warmup=${WARMUP}`,
    `--label=${label}`,
    `--out=${join(OUTDIR, "raw", outName)}`,
    "--quiet",
  ];
  const t0 = Date.now();
  const stdout = execFileSync(process.execPath, args, {
    cwd: tree.root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  const m = stdout.match(/\[phys-bench (\{.*\})\]/);
  if (!m) {
    console.error(stdout);
    throw new Error(`no [phys-bench ...] token from ${label}`);
  }
  const parsed = JSON.parse(m[1]);
  const row = {
    tree: tree.label,
    ...parsed,
    wallSec: +((Date.now() - t0) / 1000).toFixed(1),
  };
  rows.push(row);
  console.log(
    `  ${row.tree.padEnd(6)} n=${String(racers).padStart(3)} roster=${roster.padEnd(7)} ` +
      `p50=${row.p50.toFixed(4)}  p90=${row.p90.toFixed(4)}  ` +
      `first5th=${row.firstFifthP50.toFixed(4)}  last5th=${row.lastFifthP50.toFixed(4)}  (${row.wallSec}s)`,
  );
  return row;
}

/**
 * Self time per function from a V8 .cpuprofile.
 *
 * `timeDeltas[i]` is the microseconds elapsed BEFORE `samples[i]` was taken, so charging it to that
 * sample's node is the standard attribution and is what "self time" means here — time on top of the
 * stack, not time underneath a caller.
 */
function selfTimes(profilePath) {
  const p = JSON.parse(readFileSync(profilePath, "utf8"));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const self = new Map();
  let total = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const dt = p.timeDeltas[i] ?? 0;
    if (dt <= 0) continue;
    const n = byId.get(p.samples[i]);
    if (!n) continue;
    const f = n.callFrame;
    const file = (f.url || "").replace(/^.*[/\\](client|scripts|node:)/, "$1");
    const key = `${f.functionName || "(anonymous)"}  ${file}:${(f.lineNumber ?? -1) + 1}`;
    self.set(key, (self.get(key) ?? 0) + dt);
    total += dt;
  }
  return {
    totalUs: total,
    top: [...self.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([fn, us]) => ({ fn, us, share: +((100 * us) / total).toFixed(2) })),
  };
}

/** A profiled bench run. Node writes the .cpuprofile itself; we only summarise it. */
function profile(tree, racers) {
  const label = `prof-${tree.label}-n${racers}`;
  const dir = join(OUTDIR, "profiles", label);
  mkdirSync(dir, { recursive: true });
  run(tree, {
    racers,
    roster: "current",
    label,
    nodeArgs: ["--cpu-prof", `--cpu-prof-dir=${dir}`],
  });
  const f = readdirSync(dir).find((x) => x.endsWith(".cpuprofile"));
  if (!f) throw new Error(`no .cpuprofile written for ${label}`);
  const summary = selfTimes(join(dir, f));
  writeFileSync(
    join(OUTDIR, "profiles", `${label}.selftime.json`),
    JSON.stringify({ label, tree: tree.label, racers, ...summary }, null, 1),
  );
  console.log(
    `    profile -> profiles/${label}.selftime.json  (${(summary.totalUs / 1000).toFixed(0)} ms sampled)`,
  );
  return { label, tree: tree.label, racers, ...summary };
}

const profiles = [];
const t0 = Date.now();
try {
  // ── FIELD SIZE, order A/B/A. Every run is kept; none is averaged with its repeat. ──
  const ABA = [
    ["A", "chain"],
    ["B", "master"],
    ["A2", "chain"],
  ];
  if (ONLY.includes("field")) {
    if (ORDER === "pass") {
      for (const [pass, treeKey] of ABA) {
        console.log(`\nPASS ${pass} — ${treeKey}`);
        for (const n of FIELD_SIZES) {
          run(TREES[treeKey], {
            racers: n,
            roster: "current",
            label: `field-${pass}-${treeKey}-n${n}`,
          });
        }
      }
    } else {
      for (const n of FIELD_SIZES) {
        console.log(`\nTRIPLE n=${n} — chain / master / chain, back to back`);
        for (const [pass, treeKey] of ABA) {
          run(TREES[treeKey], {
            racers: n,
            roster: "current",
            label: `field-${pass}-${treeKey}-n${n}`,
          });
        }
      }
    }
  }

  // ── ROSTER, chain head only, at two field sizes. A racer's name is physics: these are three
  //    DIFFERENT RACES, not one race with three label styles. ──
  if (ONLY.includes("roster")) {
    console.log(`\nROSTER — chain head`);
    for (const n of ROSTER_SIZES) {
      // A PALINDROME, for the same reason `--order=size` exists. Run the three arms forward and then
      // backward: current, long, mixed, mixed, long, current. Each arm then has two runs placed
      // symmetrically about the middle of the block, so a drift that is linear over the block adds
      // the same amount to every arm's PAIR MEAN and cancels out of the comparison. Running the three
      // arms once each does not have that property, and the first attempt at this table proved it —
      // taken during a drifting window it read long +27 % and mixed +35 % at n=100, which is the
      // clock warming up, not a roster.
      const seq = [...ROSTERS, ...[...ROSTERS].reverse()];
      seq.forEach((r, i) =>
        run(TREES.chain, {
          racers: n,
          roster: r,
          label: `roster-chain-n${n}-${r}-r${i}`,
        }),
      );
    }
  }

  // ── Q4, THE PROFILE. Node's own sampling profiler; the engine is not instrumented. ──
  if (!SKIP_PROFILES) {
    console.log(`\nPROFILES`);
    for (const treeKey of ["chain", "master"]) {
      for (const n of PROFILE_SIZES) profiles.push(profile(TREES[treeKey], n));
    }
  }
} finally {
  rmSync(MASTER_BENCH, { force: true });
}

const out = {
  tool: "phys-bench-matrix.mjs",
  version: "PHYS-BENCH-1",
  track: TRACK,
  seed: Number(SEED),
  steps: Number(STEPS),
  warmup: Number(WARMUP),
  order: ORDER,
  only: ONLY,
  trees: { chain: ROOT, master: MASTER },
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  wallSec: +((Date.now() - t0) / 1000).toFixed(1),
  rows,
  profiles,
};
writeFileSync(join(OUTDIR, "matrix.json"), JSON.stringify(out, null, 1));
console.log(
  `\nmatrix -> ${join(OUTDIR, "matrix.json")}   (${out.wallSec}s total)`,
);
