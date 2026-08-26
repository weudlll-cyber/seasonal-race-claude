// LEADER-CORRIDORS-DEFAULT-1 — what the shipped default costs, per setting. MEASURE ONLY.
//
// Reads the sweep `midrace-leader-clip.mjs` wrote and answers four questions the owner has to weigh
// against each other, which is why the benefit and the cost are printed in the SAME table rather
// than in two:
//
//   (a) the clip rate in HIS THREE STATES, per track and pooled, worst track named;
//   (b) what a wider setting COSTS — the leader's drawn size on screen, and how much of the frame is
//       road rather than surroundings;
//   (c) whether any setting reaches ZERO clipping on every track;
//   (d) whether the right answer is the same for every track, since the key is global today.
//
// OVERVIEW IS A CONTROL, NOT A RESULT. The sweep moves LEADER_ZOOM and LEAD_CHANGE — the two states
// that ship at 0.75 — and leaves OVERVIEW at its own 1.5, so its rate should be flat across the whole
// sweep. If it ever moves, the override leaked and the table is lying; it is printed for that reason.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/lcd");
const VALS = (arg("vals", "0.55,0.65,0.75,0.85,1.00,1.20") || "").split(",");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const SWEPT = ["LEADER_ZOOM", "LEAD_CHANGE"];
const CONTROL = "OVERVIEW";
const DEFAULT_V = "0.75";

const f = (n, d = 2) => (n === null || n === undefined || Number.isNaN(n) ? "   —  " : n.toFixed(d).padStart(6));
const tag = (v) => (v === DEFAULT_V ? `${v}*` : v);

/** For one (setting, track): the swept-state clip rate, the control rate, and the cost figures. */
function read(v, t) {
  const p = `${DIR}/clip-v${v}-${t}.json`;
  if (!existsSync(p)) return null;
  const races = JSON.parse(readFileSync(p, "utf8"));
  let sweptN = 0, sweptClip = 0, ctrlN = 0, ctrlClip = 0;
  let bodySum = 0, roadSum = 0, n = 0;
  const perRace = [];
  for (const R of races) {
    let rn = 0, rc = 0;
    for (const r of R.rows) {
      if (SWEPT.includes(r.state)) {
        sweptN++; rn++;
        if (r.clipped) { sweptClip++; rc++; }
        // Cost figures are read from the SWEPT states only — that is where the setting applies.
        if (r.bodyPx) { bodySum += r.bodyPx; roadSum += r.roadFrac; n++; }
      } else if (r.state === CONTROL) {
        ctrlN++;
        if (r.clipped) ctrlClip++;
      }
    }
    if (rn) perRace.push({ seed: R.case.seed, pct: (rc / rn) * 100 });
  }
  perRace.sort((a, b) => b.pct - a.pct);
  return {
    sweptN, sweptClip, ctrlN, ctrlClip,
    rate: sweptN ? (sweptClip / sweptN) * 100 : NaN,
    ctrlRate: ctrlN ? (ctrlClip / ctrlN) * 100 : NaN,
    bodyPx: n ? bodySum / n : NaN,
    roadFrac: n ? roadSum / n : NaN,
    worst: perRace[0] ?? null,
  };
}

const grid = {};
for (const v of VALS) { grid[v] = {}; for (const t of TRACKS) grid[v][t] = read(v, t); }

console.log("\n(a) CLIP RATE IN HIS SWEPT STATES (LEADER_ZOOM + LEAD_CHANGE) — % of their frames");
console.log("  setting   " + TRACKS.map((t) => t.slice(0, 8).padStart(9)).join("") + "   POOLED   worst track");
for (const v of VALS) {
  let N = 0, C = 0, worstT = null, worstR = -1;
  const cells = TRACKS.map((t) => {
    const r = grid[v][t];
    if (!r) return "     —   ";
    N += r.sweptN; C += r.sweptClip;
    if (r.rate > worstR) { worstR = r.rate; worstT = t; }
    return f(r.rate).padStart(9);
  });
  console.log(
    `  ${tag(v).padEnd(8)}` + cells.join("") +
      `   ${f(N ? (C / N) * 100 : NaN)}   ${worstT} ${worstR.toFixed(1)}%`
  );
}
console.log("  * = shipped default");

console.log("\n  SPACE-SPRINT ON ITS OWN LINE — his case, and the worst track");
console.log("  setting   swept-state rate   frames        worst race");
for (const v of VALS) {
  const r = grid[v]["space-sprint"];
  if (!r) continue;
  console.log(
    `  ${tag(v).padEnd(8)}  ${f(r.rate)}%          ${String(r.sweptClip).padStart(5)}/${String(r.sweptN).padStart(5)}   seed ${r.worst ? r.worst.seed : "-"} (${r.worst ? r.worst.pct.toFixed(1) : "-"}%)`
  );
}

console.log("\n(b) WHAT WIDENING COSTS — averaged over the swept states");
console.log("  setting   leader drawn length (screen px)   road as share of frame height");
for (const v of VALS) {
  let b = 0, rd = 0, n = 0;
  for (const t of TRACKS) { const r = grid[v][t]; if (r && !Number.isNaN(r.bodyPx)) { b += r.bodyPx; rd += r.roadFrac; n++; } }
  console.log(`  ${tag(v).padEnd(8)}  ${f(n ? b / n : NaN, 1).padStart(20)} px        ${f(n ? (rd / n) * 100 : NaN, 1)}%`);
}

console.log("\n(c) IS THERE A SETTING WITH NO CLIPPING AT ALL, ON EVERY TRACK?");
for (const v of VALS) {
  const bad = TRACKS.filter((t) => grid[v][t] && grid[v][t].sweptClip > 0);
  console.log(
    `  ${tag(v).padEnd(8)} ${bad.length === 0 ? "ZERO on every track" : `${bad.length} track(s) still clip: ` + bad.map((t) => `${t} ${grid[v][t].rate.toFixed(1)}%`).join(", ")}`
  );
}

console.log("\n(d) IS THE ANSWER THE SAME FOR EVERY TRACK? — lowest setting that reaches zero, per track");
for (const t of TRACKS) {
  const hit = VALS.find((v) => grid[v][t] && grid[v][t].sweptClip === 0);
  const at75 = grid[DEFAULT_V][t];
  console.log(
    `  ${t.padEnd(16)} at default ${at75 ? f(at75.rate) : "  —  "}%   zero at ${hit ? tag(hit) : "NONE of the swept values"}`
  );
}

console.log("\n  CONTROL — OVERVIEW is NOT swept and must be flat:");
console.log("  " + VALS.map((v) => {
  let N = 0, C = 0;
  for (const t of TRACKS) { const r = grid[v][t]; if (r) { N += r.ctrlN; C += r.ctrlClip; } }
  return `${tag(v)}=${N ? ((C / N) * 100).toFixed(2) : "—"}%`;
}).join("  "));
