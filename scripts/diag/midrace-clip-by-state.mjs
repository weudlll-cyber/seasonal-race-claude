// MIDRACE-LEADER-CLIP-1 §2026-08-26 — THE RATE PER CAMERA STATE. MEASURE ONLY: reads JSON, prints.
//
// ── WHY A SECOND SLICE OF THE SAME DATA ────────────────────────────────────────────────────────
//
// The owner narrowed the requirement after the first pass: in LEADER_ZOOM, LEAD_CHANGE and OVERVIEW
// the leader must be in frame, because those are the states whose subject he IS. In BATTLE_ZOOM and
// COMEBACK_ZOOM the camera is watching something else and his absence is not a defect. The pooled
// 13.10% therefore answers a question he did not ask, and the BATTLE_ZOOM share of 82-95% means his
// three states may account for very little of it.
//
// No new races are run. `midrace-leader-clip.mjs` already stored EVERY mid-race frame with a
// `clipped` flag and its state, so the denominators for a per-state rate are on disk.
//
// EPISODES ARE COUNTED WITHIN A STATE, not across it. A run of clipped frames that spans a state
// change is two episodes, because the question is how long the leader is missing FROM A SHOT THAT IS
// SUPPOSED TO BE OF HIM — and once the state changes the shot's subject has changed with it.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/midrace");
const PREFIX = arg("prefix", "after");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
// HIS THREE, FIRST AND SEPARATELY — then the two he has excused, for contrast only.
const HIS = ["LEADER_ZOOM", "LEAD_CHANGE", "OVERVIEW"];
const NOT_HIS = ["BATTLE_ZOOM", "COMEBACK_ZOOM"];

const f = (n, d = 2) => (n === null || n === undefined ? "   —  " : n.toFixed(d).padStart(6));
const pctOf = (a, b) => (b ? (a / b) * 100 : 0);

/** Per (track, state): totals, episodes measured inside the state, and the attribution counts. */
function slice(races, state) {
  let total = 0, clipped = 0, centreOut = 0, anchorLeader = 0;
  let alongSum = 0, acrossSum = 0, alongMax = 0, acrossMax = 0;
  const episodes = [];
  const edge = {};
  const binding = {};
  const perRace = [];
  for (const R of races) {
    let run = 0, t = 0, c = 0;
    for (const r of R.rows) {
      if (r.state !== state) {
        if (run) { episodes.push(run); run = 0; }
        continue;
      }
      total++; t++;
      if (!r.clipped) { if (run) { episodes.push(run); run = 0; } continue; }
      clipped++; c++; run++;
      if (r.centreOut) centreOut++;
      if (r.anchorIsLeader) anchorLeader++;
      for (const e of r.edges) edge[e] = (edge[e] ?? 0) + 1;
      binding[r.binding ?? "none"] = (binding[r.binding ?? "none"] ?? 0) + 1;
      alongSum += r.along; acrossSum += r.across;
      if (r.along > alongMax) alongMax = r.along;
      if (r.across > acrossMax) acrossMax = r.across;
    }
    if (run) episodes.push(run);
    if (t) perRace.push({ seed: R.case.seed, pct: pctOf(c, t), n: c, t });
  }
  episodes.sort((a, b) => a - b);
  perRace.sort((a, b) => b.pct - a.pct);
  return {
    total, clipped, centreOut, anchorLeader, episodes, edge, binding, perRace,
    alongMean: clipped ? alongSum / clipped : 0,
    acrossMean: clipped ? acrossSum / clipped : 0,
    alongMax, acrossMax,
  };
}

const data = [];
for (const t of TRACKS) {
  const p = `${DIR}/clip-${PREFIX}-${t}.json`;
  if (!existsSync(p)) { data.push({ t, missing: true }); continue; }
  const races = JSON.parse(readFileSync(p, "utf8"));
  const byState = {};
  for (const s of [...HIS, ...NOT_HIS]) byState[s] = slice(races, s);
  data.push({ t, byState });
}

for (const state of [...HIS, ...NOT_HIS]) {
  const his = HIS.includes(state);
  console.log(`\n${his ? "★ " : "  "}${state}${his ? "   — HIS REQUIREMENT: the leader must be in frame" : "   — excused: the camera is watching something else"}`);
  console.log(
    "  track              frames   clipped   rate%   centreOut  cOut%   episodes  median  longest   worst race"
  );
  let T = 0, C = 0, O = 0;
  const allEps = [];
  for (const d of data) {
    if (d.missing) continue;
    const s = d.byState[state];
    T += s.total; C += s.clipped; O += s.centreOut; allEps.push(...s.episodes);
    const w = s.perRace[0];
    console.log(
      "  " + d.t.padEnd(18),
      String(s.total).padStart(7),
      String(s.clipped).padStart(9),
      f(pctOf(s.clipped, s.total)),
      String(s.centreOut).padStart(10),
      f(pctOf(s.centreOut, s.total)),
      String(s.episodes.length).padStart(10),
      String(s.episodes.length ? s.episodes[Math.floor(s.episodes.length / 2)] : 0).padStart(7),
      String(s.episodes.at(-1) ?? 0).padStart(8),
      `   s${w ? w.seed : "-"} (${w ? w.pct.toFixed(1) : "-"}%)`
    );
  }
  allEps.sort((a, b) => a - b);
  console.log(
    `  POOLED ${state}: ${C} of ${T} frames clipped (${pctOf(C, T).toFixed(2)}%), ` +
      `centre off canvas ${O} (${pctOf(O, T).toFixed(2)}%), ${allEps.length} episodes, ` +
      `median ${allEps.length ? allEps[Math.floor(allEps.length / 2)] : 0}, longest ${allEps.at(-1) ?? 0}.`
  );
}

console.log(`\nWHERE THE POOLED 13.10% ACTUALLY COMES FROM — share of all clipped frames by state`);
let grand = 0;
const share = {};
for (const d of data) {
  if (d.missing) continue;
  for (const s of [...HIS, ...NOT_HIS]) { share[s] = (share[s] ?? 0) + d.byState[s].clipped; grand += d.byState[s].clipped; }
}
for (const [s, n] of Object.entries(share).sort((a, b) => b[1] - a[1]))
  console.log(`  ${s.padEnd(15)} ${String(n).padStart(7)}   ${pctOf(n, grand).toFixed(1)}% of all clipped frames${HIS.includes(s) ? "   ★ his" : ""}`);
console.log(
  `  HIS THREE TOGETHER: ${HIS.reduce((a, s) => a + (share[s] ?? 0), 0)} of ${grand} clipped frames ` +
    `(${pctOf(HIS.reduce((a, s) => a + (share[s] ?? 0), 0), grand).toFixed(1)}%)`
);

console.log(`\nATTRIBUTION ON HIS THREE — which edge, which term set the width, was he the anchor`);
for (const state of HIS) {
  const edge = {}, binding = {};
  let clipped = 0, anchorLeader = 0, alongS = 0, acrossS = 0, alongM = 0, acrossM = 0;
  for (const d of data) {
    if (d.missing) continue;
    const s = d.byState[state];
    clipped += s.clipped; anchorLeader += s.anchorLeader;
    alongS += s.alongMean * s.clipped; acrossS += s.acrossMean * s.clipped;
    alongM = Math.max(alongM, s.alongMax); acrossM = Math.max(acrossM, s.acrossMax);
    for (const [k, v] of Object.entries(s.edge)) edge[k] = (edge[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.binding)) binding[k] = (binding[k] ?? 0) + v;
  }
  console.log(`  ${state}  (${clipped} clipped frames)`);
  console.log(`     edges:   ${Object.entries(edge).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}`);
  console.log(`     width:   ${Object.entries(binding).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pctOf(v, clipped).toFixed(0)}%`).join(", ") || "—"}`);
  console.log(`     leader was the ANCHOR on ${pctOf(anchorLeader, clipped).toFixed(0)}% of them`);
  console.log(`     overflow: mean across ${(clipped ? acrossS / clipped : 0).toFixed(1)} px, mean along ${(clipped ? alongS / clipped : 0).toFixed(1)} px (max ${acrossM.toFixed(0)} / ${alongM.toFixed(0)})`);
}
