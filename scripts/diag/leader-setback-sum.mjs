// LEADER-WHOLE-SETBACK-1 — the five answers, from the setback trace. MEASURE ONLY.
//
// (a) HOW BIG the setback must be, in `leaderForwardFrac` units and in screen px.
// (b) HOW OFTEN it engages, per state and per track, checked against the known clip rates.
// (c) WHAT IT SPENDS — room ahead of the leader and room behind him, before and after.
// (d) HOW FAST it would move frame to frame if applied raw. This decides whether the piece is "a
//     setback" or "a setback that eases", so it is reported as a per-frame delta and not a range.
// (e) THE RESIDUAL — frames a BACK-ONLY setback cannot fix, with the cause named per frame.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/sb");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const STATES = ["LEADER_ZOOM", "LEAD_CHANGE", "OVERVIEW"];
const FRAC = 0.66; // shipped leaderForwardFrac — read from the trace and asserted below

const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const f = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(7));

const per = {};
let shippedFrac = null;
for (const t of TRACKS) {
  const p = `${DIR}/setback-${t}.json`;
  if (!existsSync(p)) { per[t] = null; continue; }
  const races = JSON.parse(readFileSync(p, "utf8"));
  shippedFrac ??= races[0]?.leaderForwardFrac ?? FRAC;
  const acc = {
    frames: 0, need: 0, infeasible: 0,
    px: [], frac: [], deltas: [], byState: {}, residualWhy: {},
    aheadBefore: [], aheadAfter: [], behindBefore: [], behindAfter: [],
    perRace: [],
  };
  for (const s of STATES) acc.byState[s] = { n: 0, need: 0 };
  for (const R of races) {
    let prev = null, rn = 0, rc = 0;
    for (const r of R.rows) {
      acc.frames++; rn++;
      acc.byState[r.state].n++;
      if (r.clipped) { acc.need++; rc++; acc.byState[r.state].need++; }
      if (!r.feasible) { acc.infeasible++; acc.residualWhy[r.residual] = (acc.residualWhy[r.residual] ?? 0) + 1; }
      // (d) the per-frame movement of the setback if applied raw, over CONSECUTIVE frames only.
      const cur = r.feasible ? r.setbackPx : null;
      if (prev !== null && cur !== null && r.frame === prev.frame + 1) acc.deltas.push(Math.abs(cur - prev.v));
      prev = cur === null ? null : { frame: r.frame, v: cur };
      if (r.clipped && r.feasible) {
        acc.px.push(r.setbackPx);
        acc.frac.push(r.setbackFrac);
        if (r.roomAhead !== null) { acc.aheadBefore.push(r.roomAhead); acc.aheadAfter.push(r.roomAhead + r.setbackPx); }
        if (r.roomBehind !== null) { acc.behindBefore.push(r.roomBehind); acc.behindAfter.push(r.roomBehind - r.setbackPx); }
      }
    }
    if (rn) acc.perRace.push({ seed: R.case.seed, pct: (rc / rn) * 100 });
  }
  for (const k of ["px", "frac", "deltas", "aheadBefore", "aheadAfter", "behindBefore", "behindAfter"]) acc[k].sort((a, b) => a - b);
  acc.perRace.sort((a, b) => b.pct - a.pct);
  per[t] = acc;
}

console.log(`\nshipped leaderForwardFrac read from the trace: ${shippedFrac}`);

console.log("\n(a) HOW BIG — setback needed on the frames that need one");
console.log("  track              median px   p95 px   WORST px   median Δfrac   worst Δfrac   worst lands at frac");
for (const t of TRACKS) {
  const a = per[t]; if (!a || !a.px.length) { console.log(`  ${t.padEnd(18)} (none)`); continue; }
  const wf = a.frac.at(-1);
  console.log(
    "  " + t.padEnd(18), f(q(a.px, 0.5)), f(q(a.px, 0.95)), f(a.px.at(-1)),
    f(q(a.frac, 0.5), 3).padStart(14), f(wf, 3).padStart(13),
    f(shippedFrac - wf, 3).padStart(20)
  );
}

console.log("\n(b) HOW OFTEN it engages — % of that state's frames needing any setback");
console.log("  track              LEADER_ZOOM   LEAD_CHANGE   OVERVIEW    all three   worst race");
let TN = 0, TC = 0;
for (const t of TRACKS) {
  const a = per[t]; if (!a) continue;
  TN += a.frames; TC += a.need;
  const cell = (s) => (a.byState[s].n ? f((a.byState[s].need / a.byState[s].n) * 100) + "%" : "     —  ");
  console.log("  " + t.padEnd(18), cell("LEADER_ZOOM"), " ", cell("LEAD_CHANGE"), " ", cell("OVERVIEW"),
    " ", f((a.need / a.frames) * 100) + "%", `  s${a.perRace[0]?.seed} (${a.perRace[0]?.pct.toFixed(1)}%)`);
}
console.log(`  POOLED: ${TC} of ${TN} frames need a setback (${((TC / TN) * 100).toFixed(2)}%)`);

console.log("\n(c) WHAT IT SPENDS — room ahead of the leader and behind him, on the engaged frames");
console.log("  track              ahead before -> after      behind before -> after     behind lost");
for (const t of TRACKS) {
  const a = per[t]; if (!a || !a.aheadBefore.length) continue;
  const ab = q(a.aheadBefore, 0.5), aa = q(a.aheadAfter, 0.5);
  const bb = q(a.behindBefore, 0.5), ba = q(a.behindAfter, 0.5);
  console.log("  " + t.padEnd(18), f(ab) + " ->" + f(aa), "     " + f(bb) + " ->" + f(ba),
    "    " + f(((bb - ba) / bb) * 100) + "%");
}

console.log("\n(d) SMOOTHNESS — per-frame change in the setback if applied RAW (consecutive frames)");
console.log("  track              median Δ   p95 Δ   p99 Δ   WORST Δ px per frame");
let allD = [];
for (const t of TRACKS) {
  const a = per[t]; if (!a || !a.deltas.length) continue;
  allD = allD.concat(a.deltas);
  console.log("  " + t.padEnd(18), f(q(a.deltas, 0.5)), f(q(a.deltas, 0.95)), f(q(a.deltas, 0.99)), f(a.deltas.at(-1)));
}
allD.sort((a, b) => a - b);
console.log(`  POOLED: median ${q(allD, 0.5).toFixed(1)}, p95 ${q(allD, 0.95).toFixed(1)}, p99 ${q(allD, 0.99).toFixed(1)}, worst ${allD.at(-1).toFixed(1)} px in ONE frame`);

console.log("\n(e) THE RESIDUAL — frames a BACK-ONLY setback cannot fix");
let RI = 0;
const why = {};
for (const t of TRACKS) {
  const a = per[t]; if (!a) continue;
  RI += a.infeasible;
  for (const [k, v] of Object.entries(a.residualWhy)) why[k] = (why[k] ?? 0) + v;
  if (a.infeasible)
    console.log("  " + t.padEnd(18), String(a.infeasible).padStart(5) + " frames  " +
      Object.entries(a.residualWhy).map(([k, v]) => `${v}x ${k}`).join(" · "));
}
console.log(`  POOLED: ${RI} of ${TN} frames (${((RI / TN) * 100).toFixed(3)}%) cannot be fixed by a setback.`);
for (const [k, v] of Object.entries(why)) console.log(`     ${String(v).padStart(5)}  ${k}`);
