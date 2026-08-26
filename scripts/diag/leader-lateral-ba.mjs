// LEADER-LATERAL-BUILD-1 — the before/after gate. One instrument, two arms, identical filters.
//
// FOUR NUMBERS DECIDE THIS PIECE, and the second one can veto it on its own:
//   1. the LEADER_ZOOM clip rate, which is what the repair is for;
//   2. THE LARGEST SINGLE-FRAME MOVEMENT OF THE PICTURE — the measure the run-in work used and the
//      one that stopped the setback. A repair that trades a clip for a jolt is a worse picture, so
//      this is reported per track AND as a count of races carrying a movement a viewer would notice;
//   3. the share of frames the camera holds the centre, which is the owner's rule in one number;
//   4. the along-track residual, which this piece does not touch and must therefore not move.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const BEFORE = arg("before", "c:/tmp/lb/before");
const AFTER = arg("after", "c:/tmp/lb/after");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
// A movement a viewer would NOTICE. The run-in work read the picture's per-frame slide in screen px;
// this is the same quantity. 120 px in one frame at 60 fps is a fifth of the frame width in a
// sixtieth of a second — well past the point an eye reads it as a jump rather than a pan.
const NOTICE = Number(arg("notice", "120"));

const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const f = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(8));

const load = (dir, t) => {
  const p = `${dir}/lat-${t}.json`;
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
};
// A camStep is only a PAN when the two frames it spans are adjacent AND both are LEADER_ZOOM. The
// first cut of this gate differenced against the previous RECORDED row, which can be many frames and
// a state transition away, so it read every cut into the state as a 6,000-10,000 px "jolt" and
// declared all 100 races loud in BOTH arms. That is a defect in the instrument, not in the picture:
// a deliberate cut is not the thing this gate exists to catch.
const panSteps = (rows) => {
  const out = [];
  for (let i = 1; i < rows.length; i++)
    if (rows[i].camStep !== null && rows[i].frame === rows[i - 1].frame + 1) out.push(rows[i].camStep);
  return out;
};
const stats = (races) => {
  const rows = races.flatMap((R) => R.rows).filter((r) => r.state === "LEADER_ZOOM");
  const steps = panSteps(rows).sort((a, b) => a - b);
  // Per RACE, so "how many races carry a noticeable movement" is answerable.
  const perRace = races.map((R) => {
    const st = panSteps(R.rows.filter((x) => x.state === "LEADER_ZOOM"));
    return { seed: R.case.seed, worst: st.length ? Math.max(...st) : 0 };
  });
  return {
    n: rows.length,
    clip: rows.filter((r) => !r.fitsFromCentre).length,
    infeasible: rows.filter((r) => !r.feasible).length,
    // "holds the centre" = this rule contributed nothing this frame.
    centre: rows.filter((r) => !(Math.abs(r.leaderExtra ?? 0) > 1e-9)).length,
    stepMed: q(steps, 0.5), stepP99: q(steps, 0.99), stepMax: steps.at(-1),
    loud: perRace.filter((r) => r.worst >= NOTICE).length,
    races: perRace.length,
    perRace,
  };
};

console.log("\n1. THE CLIP RATE — LEADER_ZOOM mid-race frames where the leader is not whole");
console.log("  track              frames    BEFORE      AFTER      change");
let BN = 0, BC = 0, AC = 0;
const rows = [];
for (const t of TRACKS) {
  const b = load(BEFORE, t), a = load(AFTER, t);
  if (!b || !a) continue;
  const sb = stats(b), sa = stats(a);
  rows.push({ t, sb, sa });
  BN += sb.n; BC += sb.clip; AC += sa.clip;
  const rb = (sb.clip / sb.n) * 100, ra = (sa.clip / sa.n) * 100;
  console.log("  " + t.padEnd(18), String(sb.n).padStart(6), f(rb) + "%", f(ra) + "%",
    "   " + (ra <= rb ? "-" : "+") + f(Math.abs(rb - ra), 2) + " pp");
}
console.log(`  POOLED: ${((BC / BN) * 100).toFixed(2)}% -> ${((AC / BN) * 100).toFixed(2)}%  (${BC} -> ${AC} frames, ${(((BC - AC) / BC) * 100).toFixed(1)}% removed)`);

console.log(`\n2. THE PICTURE'S LARGEST SINGLE-FRAME MOVEMENT (screen px) — the jolt gate`);
console.log("  track              med B/A          p99 B/A            WORST B/A          races >= " + NOTICE + " px B/A");
let LB = 0, LA = 0, RT = 0;
for (const { t, sb, sa } of rows) {
  LB += sb.loud; LA += sa.loud; RT += sb.races;
  console.log("  " + t.padEnd(18), f(sb.stepMed, 2) + " /" + f(sa.stepMed, 2),
    "  " + f(sb.stepP99, 1) + " /" + f(sa.stepP99, 1),
    "  " + f(sb.stepMax, 1) + " /" + f(sa.stepMax, 1),
    "   " + String(sb.loud).padStart(3) + " / " + String(sa.loud).padStart(3) + " of " + sb.races);
}
console.log(`  POOLED: ${LB} -> ${LA} of ${RT} races carry a single-frame movement of ${NOTICE} px or more.`);

console.log("\n3. HOLDS THE CENTRE — frames where this rule contributed nothing (the owner's rule in one number)");
console.log("  track              AFTER      (predicted 95.82% pooled by the measurement)");
let CN = 0, CC = 0;
for (const { t, sa } of rows) {
  CN += sa.n; CC += sa.centre;
  console.log("  " + t.padEnd(18), f((sa.centre / sa.n) * 100) + "%");
}
console.log(`  POOLED: ${((CC / CN) * 100).toFixed(2)}%`);

console.log("\n4. THE ALONG-TRACK RESIDUAL — untouched by this piece, so it must not move");
console.log("  track              BEFORE     AFTER    change");
let IB = 0, IA = 0;
for (const { t, sb, sa } of rows) {
  IB += sb.infeasible; IA += sa.infeasible;
  console.log("  " + t.padEnd(18), String(sb.infeasible).padStart(6), String(sa.infeasible).padStart(8),
    "  " + (sa.infeasible === sb.infeasible ? "unchanged" : String(sa.infeasible - sb.infeasible)));
}
console.log(`  POOLED: ${IB} -> ${IA}`);

console.log("\n  worst race per track, AFTER (seed, largest single-frame movement in screen px):");
for (const { t, sa } of rows) {
  const w = sa.perRace.slice().sort((x, y) => y.worst - x.worst)[0];
  console.log("  " + t.padEnd(18), `seed ${String(w.seed).padStart(2)}  ${w.worst.toFixed(1)} px`);
}
