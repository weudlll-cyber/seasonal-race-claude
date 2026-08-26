// LEADER-LATERAL-MINIMAL-1 — the six answers, from the lateral trace. MEASURE ONLY.
//
// (a) HOW OFTEN the rule would engage, per track, cross-checked against the published clip rates.
// (b) HOW FAR it would move, against the excursion a FOLLOWING camera would carry. This is the
//     question that decides whether the rule buys anything at all over simply following him.
// (c) HOW OFTEN it returns — episodes and their duration. A rule that never returns is a following
//     camera in disguise, and the episode length is what says which one this is.
// (d) THE SMOOTHNESS — the largest frame-to-frame change if applied RAW, the same measure that
//     stopped the setback at 616 px.
// (e) THE LEAD CHANGE — how often the new leader already fits, i.e. the rule correctly does nothing.
// (f) THE RESIDUAL — frames NO lateral shift can fix, with the cause named.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/lat");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const STATE = arg("state", "LEADER_ZOOM");

const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const f = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(8));

const per = [];
for (const t of TRACKS) {
  const p = `${DIR}/lat-${t}.json`;
  if (!existsSync(p)) continue;
  const races = JSON.parse(readFileSync(p, "utf8"));
  const acc = {
    t, n: 0, engage: 0, infeasible: 0,
    need: [], needPx: [], lead: [], today: [], deltas: [], eps: [],
    leadChanges: 0, leadChangeFits: 0, frameW: null,
  };
  for (const R of races) {
    const rows = R.rows.filter((r) => r.state === STATE);
    // Episodes are per RACE — a run of consecutive engaged frames. Frames are consecutive only when
    // their frame numbers are, so a state gap does not silently weld two episodes into one.
    let run = 0, prevFrame = null, prevNeed = null;
    for (const r of rows) {
      acc.n++;
      acc.lead.push(Math.abs(r.leaderLateral));
      if (r.todayShift !== null) acc.today.push(Math.abs(r.todayShift));
      if (!r.feasible) acc.infeasible++;
      const engaged = !r.fitsFromCentre;
      if (engaged) {
        acc.engage++;
        if (r.needD !== null) { acc.need.push(Math.abs(r.needD)); acc.needPx.push(r.needPx); }
      }
      // (d) the raw per-frame change in the offset the rule would hold — 0 when it is disengaged,
      // so the step INTO and OUT OF an episode is counted, which is exactly where a jolt would live.
      const cur = r.feasible ? (engaged ? r.needD : 0) : null;
      if (prevNeed !== null && cur !== null && prevFrame !== null && r.frame === prevFrame + 1)
        acc.deltas.push(Math.abs(cur - prevNeed));
      prevNeed = cur;
      prevFrame = r.frame;
      // episodes
      if (engaged && prevFrame !== null) run++;
      if (!engaged && run > 0) { acc.eps.push(run); run = 0; }
    }
    if (run > 0) acc.eps.push(run);
  }
  // (e) the lead-change case, over BOTH states — the event is the change, not the state it lands in.
  for (const R of races)
    for (const r of R.rows)
      if (r.leadChanged) {
        acc.leadChanges++;
        if (r.fitsFromCentre) acc.leadChangeFits++;
      }
  for (const k of ["need", "needPx", "lead", "today", "deltas", "eps"]) acc[k].sort((a, b) => a - b);
  per.push(acc);
}

console.log(`\n(a) HOW OFTEN THE RULE WOULD ENGAGE — ${STATE} mid-race frames where the leader does not fit`);
console.log("  track              frames    engaged    rate      today's own lateral shift (world px)");
let TN = 0, TE = 0;
for (const d of per) {
  TN += d.n; TE += d.engage;
  console.log("  " + d.t.padEnd(18), String(d.n).padStart(6), String(d.engage).padStart(9),
    f((d.engage / d.n) * 100) + "%", "     med " + f(q(d.today, 0.5)) + "  p95 " + f(q(d.today, 0.95)));
}
console.log(`  POOLED: ${TE} of ${TN} frames (${((TE / TN) * 100).toFixed(2)}%)`);

console.log("\n(b) HOW FAR IT WOULD MOVE — the minimal step, against what FOLLOWING him would carry");
console.log("  track              step med   step p95   step WORST  | follow med  follow p95 | step as % of follow");
for (const d of per) {
  if (!d.need.length) { console.log(`  ${d.t.padEnd(18)} (never engages)`); continue; }
  const sm = q(d.need, 0.5), lm = q(d.lead, 0.5);
  console.log("  " + d.t.padEnd(18), f(sm), f(q(d.need, 0.95)), f(d.need.at(-1)),
    " |" + f(lm) + " " + f(q(d.lead, 0.95)), " |   " + f((sm / lm) * 100) + "%");
}
const NEED = per.flatMap((d) => d.need).sort((a, b) => a - b);
const LEAD = per.flatMap((d) => d.lead).sort((a, b) => a - b);
console.log(`  POOLED step: med ${q(NEED, 0.5).toFixed(1)}, p95 ${q(NEED, 0.95).toFixed(1)}, worst ${NEED.at(-1).toFixed(1)} world px`);
console.log(`  POOLED follow: med ${q(LEAD, 0.5).toFixed(1)}, p95 ${q(LEAD, 0.95).toFixed(1)} world px`);
console.log("\n  the same step ON SCREEN, as a share of the 1280 px frame width:");
console.log("  track              med px    p95 px   worst px  |  med %   p95 %   worst %");
for (const d of per) {
  if (!d.needPx.length) continue;
  console.log("  " + d.t.padEnd(18), f(q(d.needPx, 0.5)), f(q(d.needPx, 0.95)), f(d.needPx.at(-1)),
    " |" + f((q(d.needPx, 0.5) / 1280) * 100) + f((q(d.needPx, 0.95) / 1280) * 100) + f((d.needPx.at(-1) / 1280) * 100));
}

console.log("\n(c) HOW OFTEN IT RETURNS — episodes of engagement, in frames (60 fps)");
console.log("  track              episodes   med len   p95 len   longest   engaged share   longest in seconds");
for (const d of per) {
  if (!d.eps.length) { console.log(`  ${d.t.padEnd(18)} (none)`); continue; }
  console.log("  " + d.t.padEnd(18), String(d.eps.length).padStart(8), f(q(d.eps, 0.5)), f(q(d.eps, 0.95)),
    f(d.eps.at(-1)), "   " + f((d.engage / d.n) * 100) + "%", "        " + f(d.eps.at(-1) / 60, 2) + " s");
}
const EPS = per.flatMap((d) => d.eps).sort((a, b) => a - b);
console.log(`  POOLED: ${EPS.length} episodes, median ${q(EPS, 0.5)} frames (${(q(EPS, 0.5) / 60).toFixed(2)} s), p95 ${q(EPS, 0.95)}, longest ${EPS.at(-1)} (${(EPS.at(-1) / 60).toFixed(2)} s)`);

console.log("\n(d) SMOOTHNESS — per-frame change in the offset if applied RAW (consecutive frames)");
console.log("  track              median Δ   p95 Δ    p99 Δ    WORST Δ world px per frame");
let ALLD = [];
for (const d of per) {
  if (!d.deltas.length) continue;
  ALLD = ALLD.concat(d.deltas);
  console.log("  " + d.t.padEnd(18), f(q(d.deltas, 0.5), 2), f(q(d.deltas, 0.95), 2), f(q(d.deltas, 0.99), 2), f(d.deltas.at(-1)));
}
ALLD.sort((a, b) => a - b);
console.log(`  POOLED: median ${q(ALLD, 0.5).toFixed(2)}, p95 ${q(ALLD, 0.95).toFixed(2)}, p99 ${q(ALLD, 0.99).toFixed(2)}, WORST ${ALLD.at(-1).toFixed(1)} world px in ONE frame`);

console.log("\n(e) THE LEAD CHANGE — does the new leader already fit? (the rule correctly doing nothing)");
console.log("  track              lead changes   new leader FITS   rule does nothing");
let LC = 0, LF = 0;
for (const d of per) {
  LC += d.leadChanges; LF += d.leadChangeFits;
  if (!d.leadChanges) continue;
  console.log("  " + d.t.padEnd(18), String(d.leadChanges).padStart(12), String(d.leadChangeFits).padStart(17),
    "   " + f((d.leadChangeFits / d.leadChanges) * 100) + "%");
}
console.log(`  POOLED: ${LF} of ${LC} lead changes (${((LF / LC) * 100).toFixed(1)}%) need NO lateral movement.`);

console.log("\n(f) THE RESIDUAL — frames NO lateral shift of any size can fix");
let RI = 0;
for (const d of per) {
  RI += d.infeasible;
  if (d.infeasible)
    console.log("  " + d.t.padEnd(18), String(d.infeasible).padStart(5) + " of " + String(d.n).padStart(6) +
      " frames   " + f((d.infeasible / d.n) * 100) + "%   (" + f((d.infeasible / Math.max(1, d.engage)) * 100) + "% of engaged)");
}
console.log(`  POOLED: ${RI} of ${TN} frames (${((RI / TN) * 100).toFixed(3)}%) — ${((RI / TE) * 100).toFixed(2)}% of the frames the rule would engage on.`);
