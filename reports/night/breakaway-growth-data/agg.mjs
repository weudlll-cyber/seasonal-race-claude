// ============================================================
// agg.mjs — the reduction behind BREAKAWAY-GROWTH-1
//
// Reads the per-race rows `breakaway-growth.mjs` wrote beside it and prints every table the report
// quotes. It is kept here, next to its data, for one reason: a decomposition nobody can re-run is a
// number without a method, and this project has spent several nights on exactly that failure.
//
//   node agg.mjs            # the directory this file sits in
//   node agg.mjs <dir>      # a directory of races-*.json written elsewhere
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = process.argv[2] ?? HERE;
const rows = [];
for (const f of readdirSync(DIR)) {
  if (f.startsWith("races-") && f.endsWith(".json")) {
    rows.push(...JSON.parse(readFileSync(join(DIR, f), "utf8")));
  }
}
rows.sort((a, b) => a.track.localeCompare(b.track) || a.seed - b.seed);

const LEADER_ZOOM = 225.0; // the settled value; the ONE divisor for every canvas-width figure
const fmt = (x, d = 1) => (x == null || Number.isNaN(x) ? "—" : x.toFixed(d));
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");
const q = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

console.log(`races: ${rows.length}`);
const stops = new Map();
for (const r of rows) stops.set(r.stopReason ?? "(v1)", (stops.get(r.stopReason ?? "(v1)") ?? 0) + 1);
console.log(`stop reason: ${[...stops].map(([k, v]) => `${k}=${v}`).join(", ")}`);
console.log(
  `reconstruction mismatches: ${rows.reduce((s, r) => s + r.reconMismatch, 0)} of ` +
    `${rows.reduce((s, r) => s + r.sampled, 0)} racer-steps`,
);
const bw = rows.filter((r) => r.isBreakaway);
console.log(
  `breakaways (in-window max > 56 px): ${bw.length} of ${rows.length} (${pct(bw.length, rows.length)})`,
);
const disagree = bw.filter((r) => r.peakAgreesWithBrake === false);
console.log(`peak disagrees with the brake's own counter: ${disagree.length}`);

console.log("\n== PER TRACK ==");
console.log("track | races | breakaways | max gap px | max gap widths | median peak px");
const byTrack = new Map();
for (const r of rows) {
  if (!byTrack.has(r.track)) byTrack.set(r.track, []);
  byTrack.get(r.track).push(r);
}
for (const [t, rs] of [...byTrack].sort()) {
  const b = rs.filter((r) => r.isBreakaway);
  const peaks = b.map((r) => r.peakGapPx).filter((x) => x != null);
  const mx = peaks.length ? Math.max(...peaks) : null;
  console.log(
    `${t} | ${rs.length} | ${b.length} | ${fmt(mx)} | ${mx == null ? "—" : fmt(mx / LEADER_ZOOM, 3)} | ${fmt(q(peaks, 0.5))}`,
  );
}

console.log("\n== CATEGORY DISTRIBUTION ==");
const cats = new Map();
for (const r of bw) cats.set(r.category, (cats.get(r.category) ?? 0) + 1);
for (const [c, n] of [...cats].sort((a, b) => b[1] - a[1]))
  console.log(`${c} | ${n} | ${pct(n, bw.length)}`);

const A = bw.filter((r) => r.termTotalPx != null);
console.log(`\nattributable races (baseline + growth found): ${A.length} of ${bw.length}`);
console.log("\n== THE THREE TERMS, POOLED ==");
const sum = (f) => A.reduce((s, r) => s + f(r), 0);
const tot = sum((r) => r.termTotalPx);
console.log(`total growth across growing frames: ${fmt(tot)} px`);
for (const [name, f] of [
  ["leader speeds up", (r) => r.termLeaderPx],
  ["the one behind slows", (r) => r.termSecondPx],
  ["never closed", (r) => r.termPreExistingPx],
]) {
  console.log(`${name} | ${fmt(sum(f))} px | ${pct(sum(f), tot)}`);
}
console.log("\n== THE THREE TERMS, PER-RACE SHARE (median) ==");
console.log(`leader   ${fmt(q(A.map((r) => r.shareLeader), 0.5), 3)}`);
console.log(`second   ${fmt(q(A.map((r) => r.shareSecond), 0.5), 3)}`);
console.log(`pre      ${fmt(q(A.map((r) => r.sharePre), 0.5), 3)}`);

console.log("\n== RELATIVE TO THE FIELD ==");
const relL = A.map((r) => r.leaderRelG - r.leaderRelB);
const relS = A.map((r) => r.secondRelG - r.secondRelB);
console.log(`leader  rel-to-field  base ${fmt(q(A.map((r) => r.leaderRelB), 0.5), 4)} -> growth ${fmt(q(A.map((r) => r.leaderRelG), 0.5), 4)}  (median delta ${fmt(q(relL, 0.5), 4)})`);
console.log(`second  rel-to-field  base ${fmt(q(A.map((r) => r.secondRelB), 0.5), 4)} -> growth ${fmt(q(A.map((r) => r.secondRelG), 0.5), 4)}  (median delta ${fmt(q(relS, 0.5), 4)})`);
console.log(`field   px/step       base ${fmt(q(A.map((r) => r.vF_B), 0.5), 4)} -> growth ${fmt(q(A.map((r) => r.vF_G), 0.5), 4)}`);
console.log(`leader  px/step       base ${fmt(q(A.map((r) => r.vL_B), 0.5), 4)} -> growth ${fmt(q(A.map((r) => r.vL_G), 0.5), 4)}`);
console.log(`second  px/step       base ${fmt(q(A.map((r) => r.vS_B), 0.5), 4)} -> growth ${fmt(q(A.map((r) => r.vS_G), 0.5), 4)}`);
console.log(`leader faster than his own baseline: ${A.filter((r) => r.vL_G > r.vL_B).length} of ${A.length}`);
console.log(`second slower than his own baseline: ${A.filter((r) => r.vS_G < r.vS_B).length} of ${A.length}`);
console.log(`field  slower than its own baseline: ${A.filter((r) => r.vF_G < r.vF_B).length} of ${A.length}`);

console.log("\n== WHICH MULTIPLIER DIFFERS (leader vs the racer behind, mean log-ratio over growing frames) ==");
const FACTORS = ["baseSpeed", "boost", "brake", "rowEnvMult", "trajectoryMult", "areaBonusMult", "governorMult"];
const totLog = A.reduce((s, r) => s + r.logRatioTotal, 0) / A.length;
console.log(`total log(vL/vS) mean = ${totLog.toFixed(5)}  (= ${(100 * (Math.exp(totLog) - 1)).toFixed(2)}% faster)`);
for (const f of FACTORS) {
  const vals = A.map((r) => r.logRatioByFactor[f]).filter((x) => x != null);
  const m = vals.reduce((s, x) => s + x, 0) / vals.length;
  const nz = vals.filter((x) => Math.abs(x) > 1e-9).length;
  console.log(
    `${f.padEnd(15)} mean ${m.toFixed(5)}  share ${pct(m, totLog).padStart(7)}  ` +
      `median ${fmt(q(vals, 0.5), 5)}  nonzero in ${nz}/${vals.length} races`,
  );
}

console.log("\n== WHAT THE LEADER CHANGED ABOUT HIMSELF (growth vs his own baseline, mean log delta) ==");
for (const f of FACTORS) {
  const vals = A.map((r) => r.leaderSelfLogByFactor?.[f]).filter((x) => x != null);
  if (!vals.length) continue;
  const m = vals.reduce((s, x) => s + x, 0) / vals.length;
  console.log(`${f.padEnd(15)} mean ${m.toFixed(5)}  median ${fmt(q(vals, 0.5), 5)}`);
}

console.log("\n== THE PLAN'S STEERING ==");
const tr = A.map((r) => r.leaderTargetRank).filter((x) => x != null);
console.log(`leader's DRAWN rank: 1 in ${tr.filter((x) => x === 1).length} of ${tr.length}; <=5 in ${tr.filter((x) => x <= 5).length}; median ${q(tr, 0.5)}`);
const tr2 = A.map((r) => r.secondTargetRank).filter((x) => x != null);
console.log(`second's DRAWN rank: 1 in ${tr2.filter((x) => x === 1).length} of ${tr2.length}; median ${q(tr2, 0.5)}`);
const roles = new Map();
for (const r of A) roles.set(r.leaderRole ?? "(none)", (roles.get(r.leaderRole ?? "(none)") ?? 0) + 1);
console.log(`leader's ROLE: ${[...roles].map(([k, v]) => `${k}=${v}`).join(", ")}`);
const roles2 = new Map();
for (const r of A) roles2.set(r.secondRole ?? "(none)", (roles2.get(r.secondRole ?? "(none)") ?? 0) + 1);
console.log(`second's ROLE: ${[...roles2].map(([k, v]) => `${k}=${v}`).join(", ")}`);

console.log("\n== THE BRAKE AT THE GROWING FRAMES ==");
console.log(`races where the brake was ENGAGED on every growing frame: ${A.filter((r) => r.growthStepsBrakeEngaged === r.growthSteps).length} of ${A.length}`);
console.log(`races where it was engaged on NONE:                      ${A.filter((r) => r.growthStepsBrakeEngaged === 0).length}`);
const engShare = A.map((r) => r.growthStepsBrakeEngaged / r.growthSteps);
console.log(`share of growing frames with the brake engaged: median ${fmt(q(engShare, 0.5), 3)}, mean ${fmt(engShare.reduce((s, x) => s + x, 0) / engShare.length, 3)}`);
const bindShare = A.map((r) => r.growthStepsBrakeBindingLeader / r.growthSteps);
console.log(`share of growing frames where the brake's command was the one OBEYED on the leader: median ${fmt(q(bindShare, 0.5), 3)}, mean ${fmt(bindShare.reduce((s, x) => s + x, 0) / bindShare.length, 3)}`);
console.log(`mean brake strength on growing frames: ${fmt(A.reduce((s, r) => s + r.growthMeanBrakeStrength, 0) / A.length, 4)} (ceiling 0.13)`);
console.log(`leader's governorMult: baseline ${fmt(q(A.map((r) => r.baseMeanGovernorLeader), 0.5), 4)} -> growing frames ${fmt(q(A.map((r) => r.growthMeanGovernorLeader), 0.5), 4)}`);
console.log(`brake fired in ${bw.filter((r) => r.brakeFiredFrames > 0).length} of ${bw.length} breakaway races; min mult commanded (median) ${fmt(q(bw.map((r) => r.brakeMinMult), 0.5), 4)}`);

console.log("\n== WINDOW / EPISODE GEOMETRY ==");
console.log(`episode start progress: median ${fmt(q(A.map((r) => r.episodeStartProg), 0.5), 3)}`);
console.log(`peak progress:          median ${fmt(q(A.map((r) => r.episodePeakProg), 0.5), 3)}`);
console.log(`growing frames per race: median ${q(A.map((r) => r.growthSteps), 0.5)}`);
console.log(`baseline frames per race: median ${q(A.map((r) => r.baselineSteps), 0.5)}`);
console.log(`leader already led at episode start: ${A.filter((r) => r.leaderLedAtStart).length} of ${A.length}`);
const leadShare = A.map((r) => (r.growthStepsLeaderLeading ?? 0) / r.growthSteps);
console.log(`share of growing frames on which he was actually leading: median ${fmt(q(leadShare, 0.5), 3)}, mean ${fmt(leadShare.reduce((s, x) => s + x, 0) / leadShare.length, 3)}`);
console.log(`second was already second:           ${A.filter((r) => r.secondWasSecondAtStart).length} of ${A.length}`);

console.log("\n== CATEGORY x TRACK ==");
const catNames = [...new Set(bw.map((r) => r.category))];
console.log(`track | ${catNames.join(" | ")}`);
for (const [t, rs] of [...byTrack].sort()) {
  const b = rs.filter((r) => r.isBreakaway);
  console.log(`${t} | ${catNames.map((c) => b.filter((r) => r.category === c).length).join(" | ")}`);
}

console.log("\n== CATEGORY x MULTIPLIER SPLIT ==");
for (const c of catNames) {
  const g = A.filter((r) => r.category === c);
  if (!g.length) continue;
  const tl = g.reduce((s, r) => s + r.logRatioTotal, 0) / g.length;
  const parts = FACTORS.map((f) => {
    const m = g.reduce((s, r) => s + r.logRatioByFactor[f], 0) / g.length;
    return `${f}=${m.toFixed(4)}`;
  });
  console.log(`${c} (n=${g.length}) total=${tl.toFixed(4)} | ${parts.join(" ")}`);
}

console.log("\n== WHAT THE ONE BEHIND CHANGED ABOUT HIMSELF (growth vs his own baseline, mean log delta) ==");
for (const f of FACTORS) {
  const vals = A.map((r) => r.secondSelfLogByFactor?.[f]).filter((x) => x != null);
  if (!vals.length) continue;
  const m = vals.reduce((s, x) => s + x, 0) / vals.length;
  console.log(`${f.padEnd(15)} mean ${m.toFixed(5)}  median ${fmt(q(vals, 0.5), 5)}`);
}

console.log("\n== THE EIGHTH TERM: THE NON-PENETRATION PUSH ==");
{
  const pv = A.map((r) => r.pushShareOfGrowth).filter((x) => x != null);
  if (pv.length) {
    const nzp = pv.filter((x) => Math.abs(x) > 1e-9).length;
    console.log(`push share of the growth: median ${fmt(q(pv, 0.5), 5)}, mean ${fmt(pv.reduce((s, x) => s + x, 0) / pv.length, 5)}, nonzero in ${nzp}/${pv.length} races`);
    console.log(`largest |push share| in any race: ${fmt(Math.max(...pv.map(Math.abs)), 5)}`);
    console.log(`total push px across growing frames: ${fmt(A.reduce((s, r) => s + (r.pushDiffPx ?? 0), 0))} of ${fmt(A.reduce((s, r) => s + r.growthAcrossGrowingStepsPx, 0))} px of growth`);
    const worst = [...A].filter((r) => r.pushShareOfGrowth != null).sort((a, b) => Math.abs(b.pushShareOfGrowth) - Math.abs(a.pushShareOfGrowth)).slice(0, 5);
    for (const w of worst) console.log(`  ${w.track} seed=${w.seed} pushShare=${fmt(w.pushShareOfGrowth, 5)} push=${fmt(w.pushDiffPx, 3)}px growth=${fmt(w.growthAcrossGrowingStepsPx, 1)}px`);
  }
}

console.log("\n== SHARE OF GROWING FRAMES ON WHICH HE WAS ACTUALLY LEADING ==");
{
  const leadShare = A.map((r) => (r.growthStepsLeaderLeading ?? 0) / r.growthSteps);
  console.log(`median ${fmt(q(leadShare, 0.5), 3)}, mean ${fmt(leadShare.reduce((s, x) => s + x, 0) / leadShare.length, 3)}`);
}

console.log("\n== MISMATCHES BY TRACK (the push, as the reconstruction sees it) ==");
for (const [t, rs] of [...byTrack].sort()) {
  const mm = rs.reduce((s, r) => s + r.reconMismatch, 0);
  const sp = rs.reduce((s, r) => s + r.sampled, 0);
  if (mm) console.log(`${t} | ${mm} of ${sp} racer-steps (${((100 * mm) / sp).toFixed(4)}%)`);
}
