// LEADER-LAG-TRUTH-1 (e) — what a FASTER camera would buy and what it would cost. MEASURE ONLY.
//
// `trackingTC` is the time constant of the first-order smoother at CameraDirector.js:1323. Its
// steady-state lag under a target moving at constant screen speed is v·(1−lf)/lf, so the closed form
// PREDICTS the lag ratio for any tc. The sweep is here to check that prediction against the real
// director rather than to stand in for it — where measured and predicted agree, the smoother is the
// whole mechanism; where they part, something else is moving the aim.
//
// THE COST is read on the picture itself: `camStep` is how far a fixed world point slides per frame,
// `camJerk` how much that slide CHANGES per frame. A faster camera buys its smaller lag by moving the
// picture harder, and jerk is where an eye notices.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/lagtc");
const TCS = arg("tcs", "0.25,0.18,0.12,0.08,0.05").split(",");
const TRACKS = arg("tracks", "space-sprint,seatrack,river-run,mountainstreet").split(",");

const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const f = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(7));
const F = 60, tc2lf = (tc) => 1 - Math.pow(0.1, 1 / (tc * F));
const K = (tc) => (1 - tc2lf(tc)) / tc2lf(tc);

const load = (tc, t) => {
  const p = `${DIR}/lag-${tc}-${t}.json`;
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")).flatMap((R) => R.rows);
};
const stats = (rows) => {
  const lag = rows.map((r) => r.lagPx).sort((a, b) => a - b);
  const step = rows.map((r) => r.camStep).filter((v) => v !== null).sort((a, b) => a - b);
  const jerk = rows.map((r) => r.camJerk).filter((v) => v !== null).sort((a, b) => a - b);
  return {
    n: rows.length,
    clipPct: (rows.filter((r) => r.clipped).length / rows.length) * 100,
    lagMed: q(lag, 0.5), lagP95: q(lag, 0.95), lagP99: q(lag, 0.99),
    stepMed: q(step, 0.5), stepP99: q(step, 0.99),
    jerkMed: q(jerk, 0.5), jerkP99: q(jerk, 0.99), jerkMax: jerk.at(-1),
  };
};

console.log("\nWHAT A FASTER CAMERA BUYS — clip rate on the four worst tracks");
console.log("  trackingTC   predicted lag   " + TRACKS.map((t) => t.slice(0, 9).padStart(10)).join("") + "     POOLED");
const base = {};
for (const tc of TCS) {
  const cells = [], pooled = [];
  for (const t of TRACKS) {
    const rows = load(tc, t);
    if (!rows) { cells.push("     —  "); continue; }
    pooled.push(...rows);
    const s = stats(rows);
    if (tc === TCS[0]) base[t] = s;
    cells.push((s.clipPct.toFixed(2) + "%").padStart(10));
  }
  const ps = pooled.length ? stats(pooled) : null;
  console.log("  " + tc.padEnd(12), (Math.round((K(Number(tc)) / K(Number(TCS[0]))) * 100) + "%").padStart(11), "  ",
    cells.join(""), "  " + (ps ? (ps.clipPct.toFixed(2) + "%").padStart(9) : ""));
}

console.log("\nDOES THE CLOSED FORM HOLD? — measured median lag against the smoother's prediction");
console.log("  trackingTC   " + TRACKS.map((t) => (t.slice(0, 9) + " med").padStart(14)).join("") + "      predicted");
for (const tc of TCS) {
  const cells = TRACKS.map((t) => {
    const rows = load(tc, t);
    if (!rows) return "          —  ";
    const s = stats(rows);
    const ratio = base[t] ? (s.lagMed / base[t].lagMed) * 100 : NaN;
    return (s.lagMed.toFixed(0) + " (" + ratio.toFixed(0) + "%)").padStart(14);
  });
  console.log("  " + tc.padEnd(12) + cells.join(""), "         " + Math.round((K(Number(tc)) / K(Number(TCS[0]))) * 100) + "%");
}

console.log("\nWHAT IT COSTS THE PICTURE — a fixed world point's slide per frame, and its CHANGE per frame");
console.log("  trackingTC     slide med   slide p99      JERK med   JERK p99   JERK worst   (pooled over the four)");
for (const tc of TCS) {
  const pooled = [];
  for (const t of TRACKS) { const r = load(tc, t); if (r) pooled.push(...r); }
  if (!pooled.length) continue;
  const s = stats(pooled);
  console.log("  " + tc.padEnd(12), f(s.stepMed), f(s.stepP99), "  ", f(s.jerkMed, 2), f(s.jerkP99, 2), f(s.jerkMax, 1));
}
