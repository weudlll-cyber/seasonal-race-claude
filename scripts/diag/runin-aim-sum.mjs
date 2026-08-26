// RUNIN-VIABLE-1 PART A — the summariser. Reads `runin-aim-axes.mjs`'s rows and answers the
// owner's sentence with counts rather than adjectives. MEASURE ONLY.
//
// ── THE WINDOW, because getting it wrong silently is easy ──────────────────────────────────────
//
// The probe traces from u=0.90 to the end of the race, which INCLUDES the ending: past the
// finish-overview handoff the anchor becomes the fixed lookback point and the shot pulls out to the
// overview, so the subject legitimately travels thousands of screen px. That is not what the owner
// is describing. His jolt is AT THE LINE, so the window here ends at the handoff — `inFinishMode`
// turning true — exactly as RUNIN-SEED13-ANATOMY-1 scoped it.
//
// ── AND THE CONVERSE IS TESTED, because "every jump had a zoom change" is worth nothing if the
// zoom is changing on every frame anyway. Section 3 reports BOTH conditional rates.
import { readFileSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const IN = arg("in", null);
// 4 px is well under a racer body and far under anything a viewer would call a jolt — a deliberately
// GENEROUS threshold that counts more events than the eye would, not fewer.
const JUMP = Number(arg("jump", "4"));

const races = JSON.parse(readFileSync(IN, "utf8"));
const f2 = (n) => (n === null || n === undefined ? "    —   " : n.toFixed(2).padStart(8));

const windowOf = (R) => {
  const end = R.rows.findIndex((r) => r.inFinishMode === true);
  const w = end === -1 ? R.rows : R.rows.slice(0, end);
  return w.filter((r) => r.subjectMiss && r.anchorPoint && r.resolvedAim);
};
const dev = (r) =>
  r.resolvedEff > 0 && r.drawnEff > 0 ? Math.abs(r.drawnEff / r.resolvedEff - 1) : 0;

const all = races.map((R) => ({
  key: `${R.case.track}:${R.case.racers}:${R.case.seed}`,
  rows: windowOf(R),
}));

console.log("\n(1) DOES THE AIM EVER MOVE ACROSS THE TRACK? — max |across|, world px off the centreline");
console.log("race                        anchorPoint  afterBias  afterLateral  resolvedAim");
for (const { key, rows } of all) {
  const mx = (s) => Math.max(...rows.map((r) => Math.abs(s(r) ?? 0)));
  console.log(
    key.padEnd(28),
    f2(mx((r) => r.anchorPoint?.across)),
    f2(mx((r) => r.afterBias?.across)),
    f2(mx((r) => r.afterLateral?.across)),
    f2(mx((r) => r.resolvedAim?.across))
  );
}

console.log("\n(2) DOES THE SUBJECT MOVE ACROSS IN THE PICTURE? — screen px vs its intended point");
console.log("race                        worst across  worst along   jumps>" + JUMP + "px   across travel   frames");
for (const { key, rows } of all) {
  const wa = Math.max(...rows.map((r) => Math.abs(r.subjectMiss.across)));
  const wl = Math.max(...rows.map((r) => Math.abs(r.subjectMiss.along)));
  let jumps = 0;
  let travel = 0;
  for (let i = 1; i < rows.length; i++) {
    const d = Math.abs(rows[i].subjectMiss.across - rows[i - 1].subjectMiss.across);
    travel += d;
    if (d > JUMP) jumps++;
  }
  console.log(key.padEnd(28), f2(wa), f2(wl), String(jumps).padStart(10), f2(travel), String(rows.length).padStart(8));
}

console.log("\n(3) IS THE SIZE THE CAUSE? — both conditional rates, and the magnitude relation");
console.log(
  "race                        zoom-static frames: n / jumps / worst   zoom-moved frames: n / jumps / worst"
);
let SN = 0, SJ = 0, SW = 0, MN = 0, MJ = 0, MW = 0;
const pts = [];
for (const { key, rows } of all) {
  let sn = 0, sj = 0, sw = 0, mn = 0, mj = 0, mw = 0;
  for (let i = 1; i < rows.length; i++) {
    const d = Math.abs(rows[i].subjectMiss.across - rows[i - 1].subjectMiss.across);
    const moved = dev(rows[i]) > 1e-9;
    if (moved) {
      mn++;
      if (d > JUMP) mj++;
      mw = Math.max(mw, d);
      pts.push([dev(rows[i]), d]);
    } else {
      sn++;
      if (d > JUMP) sj++;
      sw = Math.max(sw, d);
    }
  }
  SN += sn; SJ += sj; SW = Math.max(SW, sw);
  MN += mn; MJ += mj; MW = Math.max(MW, mw);
  console.log(
    key.padEnd(28),
    String(sn).padStart(9), String(sj).padStart(7), f2(sw), "  ",
    String(mn).padStart(11), String(mj).padStart(7), f2(mw)
  );
}
console.log(
  `\nPOOLED  zoom-STATIC frames: ${SN}, of which ${SJ} jump (${SN ? ((SJ / SN) * 100).toFixed(1) : "—"}%), worst ${SW.toFixed(2)} px` +
    `\nPOOLED  zoom-MOVED  frames: ${MN}, of which ${MJ} jump (${MN ? ((MJ / MN) * 100).toFixed(1) : "—"}%), worst ${MW.toFixed(2)} px`
);

// THE MAGNITUDE RELATION. If the size is the cause, the sideways step should scale with how far the
// drawn zoom is from the one the aim was resolved at. Bucketed rather than fitted: a slope invites a
// claim about linearity this block does not need and has not tested.
const buckets = [
  [0, 1e-4], [1e-4, 1e-3], [1e-3, 1e-2], [1e-2, 1e-1], [1e-1, 1e9],
];
console.log("\n   |drawnEff/resolvedEff - 1|      frames    median across step    worst");
for (const [lo, hi] of buckets) {
  const b = pts.filter(([d]) => d >= lo && d < hi).map(([, v]) => v).sort((a, x) => a - x);
  if (!b.length) continue;
  console.log(
    `   ${lo.toExponential(0).padStart(8)} .. ${hi === 1e9 ? "     inf" : hi.toExponential(0).padStart(8)}   ` +
      `${String(b.length).padStart(7)}   ${b[Math.floor(b.length / 2)].toFixed(2).padStart(16)}   ${b[b.length - 1].toFixed(2).padStart(8)}`
  );
}
