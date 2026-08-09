// ============================================================
// File:        scripts/phys-bench-fit.mjs
// Project:     RaceArena — PHYS-BENCH-1
//
// THE DERIVED ANSWERS, recomputed from `matrix.json` rather than measured again. That separation is
// the point of the raw files: a later question about a different percentile, a different drawing
// budget or a different frame target is answered by re-running this in a second, on data that was
// gathered once.
//
// IT SHOWS THE FIT, it does not assert an exponent. A power law is fitted in log-log space and the
// table prints MEASURED, FITTED and RESIDUAL per field size, so a reader can see whether the curve
// is really a power law or whether one point is carrying the claim.
//
// THE CEILING IS A FUNCTION, NOT A NUMBER, and it is reported that way on purpose. "Two physics
// steps plus a realistic frame's drawing inside 16.7 ms" needs the DRAWING cost, and this harness is
// headless — it has not measured one and will not invent one. So the ceiling is printed against a
// row of drawing budgets, and the honest statement is the row, not a single racer count.
//
// Usage:
//   node scripts/phys-bench-fit.mjs
//   node scripts/phys-bench-fit.mjs --in=reports/perf/phys-bench-1/matrix.json --frame=16.7
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const IN = arg("in", "reports/perf/phys-bench-1/matrix.json");
const FRAME_MS = Number(arg("frame", "16.7"));
const STEPS_PER_FRAME = Number(arg("steps-per-frame", "2"));
const DRAW_BUDGETS = (arg("draw", "0,2,4,6,8") || "").split(",").map(Number);

const abs = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const m = JSON.parse(readFileSync(abs(IN), "utf8"));

// `--also=` MERGES later matrix files over the base, matching on the run's label. It exists for one
// specific and legitimate case: a triple that a machine transition landed inside is not a
// measurement, and re-running that one size is honest where averaging the disturbed runs in is not.
// The superseded runs stay on disk in their own directory — nothing is deleted, only re-pointed.
const ALSO = (arg("also", "") || "").split(",").filter(Boolean);
for (const path of ALSO) {
  const extra = JSON.parse(readFileSync(abs(path), "utf8"));
  for (const row of extra.rows) {
    const i = m.rows.findIndex((r) => r.label === row.label);
    if (i >= 0) m.rows[i] = row;
    else m.rows.push(row);
  }
}
if (ALSO.length) console.log(`(merged over base: ${ALSO.join(", ")})`);

const field = m.rows.filter((r) => r.label.startsWith("field-"));

/** Least-squares fit of log(t) = a + b·log(N). `b` is the growth exponent. */
function powerFit(points) {
  const n = points.length;
  const lx = points.map((p) => Math.log(p.n));
  const ly = points.map((p) => Math.log(p.t));
  const mx = lx.reduce((a, b) => a + b, 0) / n;
  const my = ly.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (lx[i] - mx) * (ly[i] - my);
    den += (lx[i] - mx) ** 2;
  }
  const b = num / den;
  const a = my - b * mx;
  // R² on the log-log fit — how much of the spread the power law actually accounts for.
  let ssRes = 0,
    ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ly[i] - (a + b * lx[i])) ** 2;
    ssTot += (ly[i] - my) ** 2;
  }
  return { a, b, k: Math.exp(a), r2: 1 - ssRes / ssTot, predict: (N) => Math.exp(a) * N ** b };
}

const sizes = [...new Set(field.map((r) => r.racers))].sort((a, b) => a - b);

console.log(`PHYS-BENCH-1 — derived from ${IN}`);
console.log(
  `track=${m.track} seed=${m.seed} steps=${m.steps} node=${m.node} ${m.platform}\n`,
);

// ── Q1: do the two commits differ? Every run kept; the two chain passes bracket the master pass. ──
console.log("Q1 — CHAIN vs MASTER, per field size (median step, ms). All runs, none averaged away.");
console.log("   n     A chain    B master   A2 chain   |  master vs chain-mean");
for (const n of sizes) {
  const g = (label) => field.find((r) => r.racers === n && r.label.includes(label));
  const A = g("field-A-")?.p50,
    B = g("field-B-")?.p50,
    A2 = g("field-A2-")?.p50;
  const chainMean = (A + A2) / 2;
  const delta = (100 * (B - chainMean)) / chainMean;
  const spread = (100 * Math.abs(A2 - A)) / chainMean;
  console.log(
    `  ${String(n).padStart(3)}   ${A.toFixed(4).padStart(8)}   ${B.toFixed(4).padStart(8)}   ` +
      `${A2.toFixed(4).padStart(8)}   |  ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` +
      `   (chain A/A2 self-spread ${spread.toFixed(1)}%)`,
  );
}

// ── Q2: the curve, fitted on the two chain passes' mean. ──
const pts = sizes.map((n) => {
  const A = field.find((r) => r.racers === n && r.label.includes("field-A-")).p50;
  const A2 = field.find((r) => r.racers === n && r.label.includes("field-A2-")).p50;
  return { n, t: (A + A2) / 2 };
});
const fit = powerFit(pts);
console.log(
  `\nQ2 — GROWTH. Fit on the chain passes' mean: t(N) = ${fit.k.toExponential(3)} · N^${fit.b.toFixed(3)}` +
    `   (log-log R² = ${fit.r2.toFixed(4)})`,
);
console.log("   n    measured    fitted   residual");
for (const p of pts) {
  const f = fit.predict(p.n);
  console.log(
    `  ${String(p.n).padStart(3)}   ${p.t.toFixed(4).padStart(8)}  ${f.toFixed(4).padStart(8)}   ` +
      `${(((p.t - f) / f) * 100 >= 0 ? "+" : "") + (((p.t - f) / f) * 100).toFixed(1)}%`,
  );
}
const masterPts = sizes.map((n) => ({
  n,
  t: field.find((r) => r.racers === n && r.label.includes("field-B-")).p50,
}));
const mFit = powerFit(masterPts);
console.log(`   master's own exponent, for comparison: ${mFit.b.toFixed(3)} (R² ${mFit.r2.toFixed(4)})`);

// ── Q3: bunched vs spread, from the same runs. ──
console.log("\nQ3 — DENSITY. First fifth (bunched) vs last fifth (spread), chain passes.");
console.log("   n    first5th   last5th    last/first");
for (const n of sizes) {
  const rs = field.filter((r) => r.racers === n && r.tree === "chain");
  const f = rs.reduce((a, r) => a + r.firstFifthP50, 0) / rs.length;
  const l = rs.reduce((a, r) => a + r.lastFifthP50, 0) / rs.length;
  console.log(
    `  ${String(n).padStart(3)}   ${f.toFixed(4).padStart(8)}  ${l.toFixed(4).padStart(8)}   ${(l / f).toFixed(2)}x`,
  );
}

// ── Q5: the roster arms. Three different RACES, not three label styles. ──
const roster = m.rows.filter((r) => r.label.startsWith("roster-"));
if (roster.length) {
  console.log("\nQ5 — ROSTER (chain head). A racer's name is physics: each arm is a DIFFERENT RACE.");
  console.log("   n    roster    runs    mean p50   spread   vs current");
  const arms = [...new Set(roster.map((r) => r.roster))];
  for (const n of [...new Set(roster.map((r) => r.racers))].sort((a, b) => a - b)) {
    // The palindrome gives each arm two runs; the PAIR MEAN is what a linear drift cancels out of.
    const meanOf = (name) => {
      const rs = roster.filter((x) => x.racers === n && x.roster === name);
      return { rs, mean: rs.reduce((a, x) => a + x.p50, 0) / rs.length };
    };
    const base = meanOf("current").mean;
    for (const name of arms) {
      const { rs, mean } = meanOf(name);
      const spread = rs.length > 1 ? (100 * (Math.max(...rs.map((x) => x.p50)) - Math.min(...rs.map((x) => x.p50)))) / mean : 0;
      const d = (100 * (mean - base)) / base;
      console.log(
        `  ${String(n).padStart(3)}   ${name.padEnd(8)}   ${rs.length}     ${mean.toFixed(4).padStart(8)}   ` +
          `${(spread.toFixed(1) + "%").padStart(6)}   ${d >= 0 ? "+" : ""}${d.toFixed(1)}%`,
      );
    }
  }
}

// ── Q4: WHICH functions change their share between the two field sizes. The shape of the growth. ──
const PROF_DIR = join(dirname(isAbsolute(IN) ? IN : join(ROOT, IN)), "profiles");
const readProf = (name) => {
  try {
    return JSON.parse(readFileSync(join(PROF_DIR, `${name}.selftime.json`), "utf8"));
  } catch {
    return null;
  }
};
for (const tree of ["chain", "master"]) {
  const lo = readProf(`prof-${tree}-n30`);
  const hi = readProf(`prof-${tree}-n100`);
  if (!lo || !hi) continue;
  console.log(`\nQ4 — ${tree}: SELF-TIME SHARE, n=30 -> n=100. The movers are the growth.`);
  const shareOf = (p, fn) => p.top.find((t) => t.fn === fn)?.share ?? 0;
  const names = [...new Set([...hi.top, ...lo.top].map((t) => t.fn))]
    .map((fn) => ({ fn, lo: shareOf(lo, fn), hi: shareOf(hi, fn) }))
    .sort((a, b) => b.hi - a.hi)
    .slice(0, 10);
  console.log("    n=30     n=100    delta   function");
  for (const r of names) {
    const d = r.hi - r.lo;
    console.log(
      `  ${(r.lo.toFixed(2) + "%").padStart(7)}  ${(r.hi.toFixed(2) + "%").padStart(7)}  ` +
        `${(d >= 0 ? "+" : "") + d.toFixed(2)}pp`.padStart(9) +
        `   ${r.fn}`,
    );
  }
}

// ── THE PRODUCT ANSWER. A row, because the drawing budget is not measured here. ──
console.log(
  `\nCEILING — largest N with ${STEPS_PER_FRAME} physics steps + drawing inside ${FRAME_MS} ms.`,
);
console.log("   drawing budget    max racers");
for (const d of DRAW_BUDGETS) {
  const budget = (FRAME_MS - d) / STEPS_PER_FRAME;
  const N = budget <= 0 ? 0 : Math.floor((budget / fit.k) ** (1 / fit.b));
  console.log(`   ${(d + " ms").padStart(8)}          ${N > 0 ? N : "— none"}`);
}
console.log(
  `   (drawing is NOT measured by this harness — it is headless. The row is the answer; a single\n` +
    `    number would be a guess wearing a decimal point.)`,
);

// ── THE OWNER'S TWO RECORDINGS, read back through the fitted curve. ──
// He has 3 ms and 7.7 ms per step from two different moments of two different races. Q3 says density
// is not what separates them, so the curve is asked what FIELD SIZE would produce each. This is an
// inversion of a fit measured on THIS machine, on ONE track — it is an order of magnitude, not a
// diagnosis of his recordings.
const invert = (ms) => Math.round((ms / fit.k) ** (1 / fit.b));
console.log(`\nTHE TWO RECORDINGS, inverted through the fit (this machine, ${m.track}, not his):`);
for (const ms of (arg("recordings", "3,7.7") || "").split(",").map(Number)) {
  console.log(`   ${String(ms).padStart(4)} ms/step  <->  a field of about ${invert(ms)} racers`);
}
