// LEADER-LAG-TRUTH-1 — the verdict, from the lag trace. MEASURE ONLY.
//
// (a) the lag distribution per track;
// (b) whether the clipped frames are the lag's TAIL. Reported as CLIP RATE BY LAG BIN rather than as
//     "the smallest lag that ever clipped" — a minimum is one frame and one frame is not a threshold.
//     If the rate climbs steeply with lag the tail story holds; if it is flat, it does not, and the
//     table will say so on its own without needing a claim laid over it.
// (c) what the worst frames share — drawn from ALL frames, top 2% by lag against the rest.
// (d) lag or body: clipped frames a PERFECT camera would still clip.
// (e) the requirement: how much of today's lag has to go before the tail clears.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/lag");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const PREFIX = arg("prefix", "");

const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const f = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(7));
const med = (a, k) => {
  const v = a.map((r) => r[k]).filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};

const per = [];
for (const t of TRACKS) {
  const p = `${DIR}/lag-${PREFIX}${t}.json`;
  if (!existsSync(p)) continue;
  const rows = JSON.parse(readFileSync(p, "utf8")).flatMap((R) => R.rows);
  const clip = rows.filter((r) => r.clipped);
  per.push({
    t, rows, clip,
    all: rows.map((r) => r.lagPx).sort((a, b) => a - b),
    clipL: clip.map((r) => r.lagPx).sort((a, b) => a - b),
    keepL: rows.filter((r) => !r.clipped).map((r) => r.lagPx).sort((a, b) => a - b),
    bodyAlone: clip.filter((r) => r.bodyAloneClips).length,
    need: clip.map((r) => r.needScale).filter((v) => v !== null && v !== undefined).sort((a, b) => a - b),
  });
}

console.log("\n(a) THE SUBJECT LAG — aim to arrival, screen px, LEADER_ZOOM mid-race");
console.log("  track              frames   median   p95    p99    WORST   clip rate");
for (const d of per)
  console.log("  " + d.t.padEnd(18), String(d.rows.length).padStart(6), f(q(d.all, 0.5)), f(q(d.all, 0.95)),
    f(q(d.all, 0.99)), f(d.all.at(-1)), f((d.clip.length / d.rows.length) * 100) + "%");
const A = per.flatMap((d) => d.all).sort((a, b) => a - b);
console.log(`  POOLED: median ${q(A, 0.5).toFixed(1)}, p95 ${q(A, 0.95).toFixed(1)}, p99 ${q(A, 0.99).toFixed(1)}, worst ${A.at(-1).toFixed(1)} px`);

const BINS = [0, 100, 150, 200, 250, 300, 350, 400, 500, 1e9];
const label = (i) => (i === BINS.length - 2 ? `${BINS[i]}+` : `${BINS[i]}-${BINS[i + 1]}`).padStart(9);
console.log("\n(b) ARE THE CLIPPED FRAMES THE LAG'S TAIL? — clip rate inside each lag bin");
console.log("  track             " + BINS.slice(0, -1).map((_, i) => label(i)).join(""));
const rateRow = (rows) => {
  const o = [];
  for (let i = 0; i < BINS.length - 1; i++) {
    const b = rows.filter((r) => r.lagPx >= BINS[i] && r.lagPx < BINS[i + 1]);
    o.push((b.length ? ((b.filter((r) => r.clipped).length / b.length) * 100).toFixed(1) + "%" : "—").padStart(9));
  }
  return o.join("");
};
for (const d of per) console.log("  " + d.t.padEnd(18) + rateRow(d.rows));
const ALLROWS = per.flatMap((d) => d.rows);
console.log("  " + "POOLED".padEnd(18) + rateRow(ALLROWS));
console.log("  frames in bin (pooled): " + BINS.slice(0, -1).map((_, i) =>
  String(ALLROWS.filter((r) => r.lagPx >= BINS[i] && r.lagPx < BINS[i + 1]).length).padStart(9)).join(""));
console.log("\n  and the same fact from the other side — the two lag distributions:");
console.log("  track              UNCLIPPED med / p95      CLIPPED med / p95     ratio of medians");
for (const d of per)
  console.log("  " + d.t.padEnd(18), f(q(d.keepL, 0.5)) + " /" + f(q(d.keepL, 0.95)),
    "  " + f(q(d.clipL, 0.5)) + " /" + f(q(d.clipL, 0.95)),
    "   " + f(q(d.clipL, 0.5) / q(d.keepL, 0.5), 2) + "x");

console.log("\n(d) LAG OR BODY? — clipped frames a PERFECT camera would still clip");
let TB = 0, TC = 0;
for (const d of per) {
  TB += d.bodyAlone; TC += d.clip.length;
  console.log("  " + d.t.padEnd(18), String(d.bodyAlone).padStart(6) + " of " + String(d.clip.length).padStart(6) +
    "   " + f(d.clip.length ? (d.bodyAlone / d.clip.length) * 100 : NaN) + "%");
}
console.log(`  POOLED: ${TB} of ${TC} clipped frames (${((TB / TC) * 100).toFixed(2)}%) would clip with ZERO lag.`);
console.log("  and the sprite's own size, for scale:");
console.log("  track              halfLen median / p95     halfLen on clipped frames    room the aim leaves ahead");
for (const d of per)
  console.log("  " + d.t.padEnd(18), f(med(d.rows, "halfLen")) + " /" +
    f(q(d.rows.map((r) => r.halfLen).sort((a, b) => a - b), 0.95)),
    "       " + f(med(d.clip, "halfLen")), "                 " + f(med(d.rows, "aimAhead")));

console.log("\n(c) WHAT THE WORST FRAMES SHARE — top 2% by lag, over ALL frames, against the rest");
console.log("  track              speed hi/rest     turn hi/rest       zoom hi/rest      halfLen hi/rest");
for (const d of per) {
  const s = [...d.rows].sort((a, b) => b.lagPx - a.lagPx);
  const hi = s.slice(0, Math.max(1, Math.floor(s.length * 0.02)));
  const rest = s.slice(hi.length);
  console.log("  " + d.t.padEnd(18),
    f(med(hi, "speedT")) + "/" + f(med(rest, "speedT")),
    " " + f(med(hi, "turnRad"), 4) + "/" + f(med(rest, "turnRad"), 4),
    " " + f(med(hi, "zoom"), 2) + "/" + f(med(rest, "zoom"), 2),
    " " + f(med(hi, "halfLen")) + "/" + f(med(rest, "halfLen")));
}

console.log("\n(e) THE REQUIREMENT — share of today's lag that may SURVIVE and still clear the frame");
console.log("  track              median   p25     p10    p05   frames needing a PERFECT camera (0.00)");
for (const d of per) {
  if (!d.need.length) continue;
  const zero = d.need.filter((v) => v === 0).length;
  console.log("  " + d.t.padEnd(18), f(q(d.need, 0.5), 2), f(q(d.need, 0.25), 2), f(q(d.need, 0.10), 2),
    f(q(d.need, 0.05), 2), "    " + String(zero).padStart(5) + " of " + String(d.need.length).padStart(5) +
    "  (" + ((zero / d.need.length) * 100).toFixed(1) + "%)");
}
const N = per.flatMap((d) => d.need).sort((a, b) => a - b);
console.log(`  POOLED: median ${q(N, 0.5).toFixed(2)}, p10 ${q(N, 0.10).toFixed(2)}, p05 ${q(N, 0.05).toFixed(2)}, ` +
  `${N.filter((v) => v === 0).length} of ${N.length} need a perfect camera.`);
