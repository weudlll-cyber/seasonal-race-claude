// ============================================================
// File:        compare.mjs
// Path:        reports/evolution/LARGE-FIELD-PERF-3/compare.mjs
// Project:     RaceArena — LARGE-FIELD-PERF-3 (2026-10-05)
// Description: Stage 2's comparison: master against the branch's fixes, on the same Quick Test seeds,
//              from the `.frames.json` files `../LARGE-FIELD-PERF-2/run.mjs` writes (the plan's `arm`
//              field names each race's build).
//
// WHAT IT REPORTS, per track and arm: the races (N), the frames, the share of frames over 33 ms, the
// p95 and p99 frame time, and the same share inside the ending's wide shot (the last tenth of the
// race while the camera is in OVERVIEW — the moment LARGE-FIELD-PERF-2 found Luger hill stuttering).
// Then, for every arm against master, the PAIRED difference: per seed, the arm's slow-frame share
// minus master's on the same seed, with its mean and a 95 % bootstrap interval (10,000 resamples of
// the seeds, fixed generator seed), so a difference smaller than the race-to-race spread reads as
// such.
//
// Usage: node compare.mjs <raw-dir>
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const rawDir = process.argv[2];
const runs = readdirSync(rawDir)
  .filter((f) => f.endsWith(".frames.json"))
  .map((f) => JSON.parse(readFileSync(join(rawDir, f), "utf8")));

function inEndingWide(frames) {
  const total = frames.reduce((a, [g]) => a + g, 0);
  let acc = 0;
  return frames.map(([g, state]) => {
    acc += g;
    return acc > total * 0.9 && state === "OVERVIEW";
  });
}

function stats(list) {
  const gaps = [];
  let slow = 0;
  let endFrames = 0;
  let endSlow = 0;
  for (const r of list) {
    const end = inEndingWide(r.frames);
    r.frames.forEach(([g], k) => {
      gaps.push(g);
      if (g > 33) slow++;
      if (end[k]) {
        endFrames++;
        if (g > 33) endSlow++;
      }
    });
  }
  gaps.sort((a, b) => a - b);
  const q = (p) => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))];
  return {
    races: list.length,
    frames: gaps.length,
    slow,
    share: slow / gaps.length,
    p95: q(0.95),
    p99: q(0.99),
    endFrames,
    endSlow,
    endShare: endFrames ? endSlow / endFrames : 0,
  };
}

const share = (r) => r.frames.filter(([g]) => g > 33).length / r.frames.length;
const pct = (x) => `${(100 * x).toFixed(2)} %`;

// Deterministic resampling (a fixed LCG), so the printed intervals are reproducible.
function bootstrapMean(xs, n = 10000) {
  let s = 12345;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const means = [];
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < xs.length; i++)
      sum += xs[Math.floor(rnd() * xs.length)];
    means.push(sum / xs.length);
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(0.025 * n)], means[Math.floor(0.975 * n)]];
}

const tracks = [...new Set(runs.map((r) => r.track))].sort();
const arms = [...new Set(runs.map((r) => r.arm))];
const order = ["master", "all", "a", "b", "c", "d"].filter((a) =>
  arms.includes(a),
);
for (const t of tracks) {
  console.log(`\n## ${t}, 80 racers`);
  console.log(
    "| arm | N races | frames | frames > 33 ms | p95 ms | p99 ms | ending wide shot: frames > 33 ms |",
  );
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const a of order) {
    const list = runs.filter((r) => r.track === t && r.arm === a);
    if (!list.length) continue;
    const s = stats(list);
    console.log(
      `| ${a} | ${s.races} | ${s.frames} | ${s.slow} (${pct(s.share)}) | ${s.p95.toFixed(1)} | ${s.p99.toFixed(1)} | ${s.endSlow} of ${s.endFrames} (${pct(s.endShare)}) |`,
    );
  }
  console.log(
    "\nPaired against master on the same seeds (arm − master, slow-frame share):",
  );
  const masterBySeed = new Map(
    runs
      .filter((r) => r.track === t && r.arm === "master")
      .map((r) => [r.seed, r]),
  );
  for (const a of order.filter((x) => x !== "master")) {
    const diffs = runs
      .filter((r) => r.track === t && r.arm === a && masterBySeed.has(r.seed))
      .map((r) => share(r) - share(masterBySeed.get(r.seed)));
    if (!diffs.length) continue;
    const mean = diffs.reduce((x, y) => x + y, 0) / diffs.length;
    const [lo, hi] = bootstrapMean(diffs);
    const better = diffs.filter((d) => d < 0).length;
    console.log(
      `- ${a}: N = ${diffs.length} seeds, mean ${(100 * mean).toFixed(2)} points (95 % interval ${(100 * lo).toFixed(2)} to ${(100 * hi).toFixed(2)}); fewer slow frames than master on ${better} of ${diffs.length} seeds`,
    );
  }
  console.log(`\nQuick Test seeds: ${[...masterBySeed.keys()].join(", ")}`);
}
