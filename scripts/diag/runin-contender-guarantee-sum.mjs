// RUNIN-CONTENDER-GUARANTEE-1 — the summary tables. Read-only, reads only what the sweep wrote.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIRS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const roots = DIRS.length ? DIRS : ["c:/tmp/runin-cg/p1", "c:/tmp/runin-cg/p2"];
const races = [];
for (const d of roots) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith(".json")) continue;
    for (const r of JSON.parse(readFileSync(join(d, f), "utf8"))) if (r?.acc) races.push(r);
  }
}
const out = [];
const say = (s = "") => out.push(s);
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : "0.0");
const key = (r) => `${r.track}-${r.racers}-${r.seed}`;
const sum = (f) => races.reduce((s, r) => s + f(r.acc), 0);
const F = sum((a) => a.frames);

const HIS_TWELVE = [
  "river-run-20-49", "river-run-20-23", "river-run-40-30", "river-run-20-32",
  "mountainstreet-20-13", "river-run-40-23", "luger-hill-40-11", "river-run-20-55",
  "mountainstreet-20-34", "seatrack-20-5", "luger-hill-20-51", "seatrack-20-11",
];

say(`RACES ${races.length}   RUN-IN FRAMES ${F}`);
say("");
say("=== (f) HIS TWELVE — per race, never in aggregate ===");
say("race                       frames  winnerOFF ship -> guarantee   top5OFF ship -> g   setOFF ship -> g   acrossRoom ship->g");
for (const k of HIS_TWELVE) {
  const r = races.find((x) => key(x) === k);
  if (!r) {
    say(`${k.padEnd(26)} NOT FOUND IN SWEEP`);
    continue;
  }
  const a = r.acc;
  say(
    `${k.padEnd(26)} ${String(a.frames).padStart(6)}  ${String(a.winnerOffShip).padStart(9)} -> ${String(a.winnerOffReq).padEnd(9)}   ` +
      `${String(a.top5OffShip).padStart(7)} -> ${String(a.top5OffReq).padEnd(5)}   ` +
      `${String(a.setOffShip).padStart(6)} -> ${String(a.setOffReq).padEnd(4)}   ` +
      `${(a.sumAcrossRoomShip / a.frames).toFixed(0).padStart(4)} -> ${(a.sumAcrossRoomReq / a.frames).toFixed(0)}`
  );
}
const twelve = races.filter((r) => HIS_TWELVE.includes(key(r)));
say(
  `TOTAL over the twelve: winner off ${twelve.reduce((s, r) => s + r.acc.winnerOffShip, 0)} frames shipped -> ` +
    `${twelve.reduce((s, r) => s + r.acc.winnerOffReq, 0)} under the guarantee`
);
say(
  `  races in which the winner is off at all: ${twelve.filter((r) => r.acc.winnerOffShip > 0).length} -> ` +
    `${twelve.filter((r) => r.acc.winnerOffReq > 0).length}`
);

say("");
say("=== (a) THE SET — how many racers qualify, over all frames ===");
const hist = (pick) => {
  const h = {};
  for (const r of races) for (const [k, v] of Object.entries(pick(r.acc))) h[k] = (h[k] ?? 0) + v;
  return h;
};
const showHist = (label, h) => {
  const t = Object.values(h).reduce((a, b) => a + b, 0);
  const keys = Object.keys(h).map(Number).sort((a, b) => a - b);
  say(`${label.padEnd(30)} ${keys.map((k) => `${k}:${pct(h[k], t)}%`).join("  ")}`);
};
showHist("SHIPPED rule (_abreastContenders)", hist((a) => a.sizeShip));
showHist("MY predictive reading, x1", hist((a) => a.sizePred));
for (const k of [2, 3, 5]) showHist(`  ... at x${k} contact length`, hist((a) => a.sizePredTol[k]));
say(`frames where the predictive rule is not evaluable (no rate yet): ${pct(sum((a) => a.notEvaluable), F)}%`);
say(`THE WINNER IS IN THE SHIPPED SET on ${pct(sum((a) => a.winnerInShip), F)}% of frames; in MY set on ${pct(sum((a) => a.winnerInPred), F)}%`);
say("");
say("as the line approaches — quarters of the closing stretch:");
say("quarter   mean size SHIPPED   mean size MINE   winner in SHIPPED   winner in MINE");
for (let q = 0; q < 4; q++) {
  const n = sum((a) => a.quarter[q].n);
  if (!n) continue;
  say(
    `  ${q === 0 ? "0.00-0.25" : q === 1 ? "0.25-0.50" : q === 2 ? "0.50-0.75" : "0.75-1.00"}   ` +
      `${(sum((a) => a.quarter[q].sumShip) / n).toFixed(2).padStart(15)}   ` +
      `${(sum((a) => a.quarter[q].sumPred) / n).toFixed(2).padStart(14)}   ` +
      `${pct(sum((a) => a.quarter[q].winShip), n).padStart(16)}%   ` +
      `${pct(sum((a) => a.quarter[q].winPred), n).padStart(13)}%`
  );
}

say("");
say("=== (b) BOTH AXES ===");
say(`ACROSS-track binds on ${pct(sum((a) => a.acrossBinds), F)}% of frames; ALONG-track on ${pct(sum((a) => a.alongBinds), F)}%`);
say(`mean set extent: along ${(sum((a) => a.sumAlongPx) / F).toFixed(1)} world px, across ${(sum((a) => a.sumAcrossPx) / F).toFixed(1)} world px`);
say("");
say("track            across binds   mean along px   mean across px   max across px   road px");
for (const t of [...new Set(races.map((r) => r.track))].sort()) {
  const g = races.filter((r) => r.track === t);
  const f = g.reduce((s, r) => s + r.acc.frames, 0);
  say(
    `${t.padEnd(15)} ${(pct(g.reduce((s, r) => s + r.acc.acrossBinds, 0), f) + "%").padStart(12)}   ` +
      `${(g.reduce((s, r) => s + r.acc.sumAlongPx, 0) / f).toFixed(1).padStart(13)}   ` +
      `${(g.reduce((s, r) => s + r.acc.sumAcrossPx, 0) / f).toFixed(1).padStart(14)}   ` +
      `${Math.max(...g.map((r) => r.acc.maxAcrossPx)).toFixed(0).padStart(13)}   ` +
      `${String(g[0].trackWidthPx).padStart(6)}`
  );
}

say("");
say("=== (c)/(d) THE WIDTH IT WOULD DEMAND, against the width shipped ===");
say(`sole-author reading: WIDER than today on ${pct(sum((a) => a.wider), F)}% of frames, TIGHTER on ${pct(sum((a) => a.tighter), F)}%, equal on ${pct(sum((a) => a.same), F)}%`);
say(`mean ln(required / shipped) = ${(sum((a) => a.sumLnSoleVsShip) / F).toFixed(4)}  (negative = wider shot)`);
say(`worst single frame: ${Math.max(...races.map((r) => r.acc.maxLnWider)).toFixed(3)} ln wider, ${Math.max(...races.map((r) => r.acc.maxLnTighter)).toFixed(3)} ln tighter`);
say("");
say("track            wider%  tighter%   across room ship -> guarantee (world px)   x road ship -> g   road held ship -> g");
for (const t of [...new Set(races.map((r) => r.track))].sort()) {
  const g = races.filter((r) => r.track === t);
  const f = g.reduce((s, r) => s + r.acc.frames, 0);
  const arS = g.reduce((s, r) => s + r.acc.sumAcrossRoomShip, 0) / f;
  const arR = g.reduce((s, r) => s + r.acc.sumAcrossRoomReq, 0) / f;
  const road = g[0].trackWidthPx;
  say(
    `${t.padEnd(15)} ${(pct(g.reduce((s, r) => s + r.acc.wider, 0), f) + "%").padStart(6)}  ` +
      `${(pct(g.reduce((s, r) => s + r.acc.tighter, 0), f) + "%").padStart(8)}   ` +
      `${arS.toFixed(0).padStart(20)} -> ${arR.toFixed(0).padEnd(10)}   ` +
      `${(arS / road).toFixed(2)} -> ${(arR / road).toFixed(2).padEnd(6)}   ` +
      `${pct(g.reduce((s, r) => s + r.acc.roadHeldShip, 0), f)}% -> ${pct(g.reduce((s, r) => s + r.acc.roadHeldReq, 0), f)}%`
  );
}

say("");
say("=== (e) HIS SPECIFIC CASE — level within a body length AND on opposite sides ===");
for (const k of [0.3, 0.4, 0.5]) {
  const n = sum((a) => a.levelOpp[k] ?? 0);
  say(`  "opposite sides" read as >= ${k} of the road: ${n} frames (${pct(n, F)}%), in ${races.filter((r) => (r.acc.levelOpp[k] ?? 0) > 0).length} of ${races.length} races`);
}
const lo = sum((a) => a.levelOpp[0.5] ?? 0);
say(`  on those frames (>=0.5 road) the guarantee is WIDER than today on ${pct(sum((a) => a.levelOppWider), lo)}% of them`);
say(`  mean ln(required/shipped) there = ${lo ? (sum((a) => a.sumLevelOppLn) / lo).toFixed(4) : "n/a"}`);
say(`  widest across-separation seen in such a pair: ${Math.max(...races.map((r) => r.acc.levelOppAcrossPx)).toFixed(0)} world px`);

say("");
say("=== (f) OVER THE WHOLE CORPUS — visibility, shipped vs guarantee ===");
say(`winner off frame:   ${pct(sum((a) => a.winnerOffShip), F)}% of frames shipped -> ${pct(sum((a) => a.winnerOffReq), F)}% under the guarantee`);
say(`  races with any:   ${races.filter((r) => r.acc.winnerOffShip > 0).length} -> ${races.filter((r) => r.acc.winnerOffReq > 0).length} of ${races.length}`);
say(`any top-5 off:      ${pct(sum((a) => a.top5OffShip), F)}% -> ${pct(sum((a) => a.top5OffReq), F)}%`);
say(`  races with any:   ${races.filter((r) => r.acc.top5OffShip > 0).length} -> ${races.filter((r) => r.acc.top5OffReq > 0).length}`);
say(`a set member off:   ${pct(sum((a) => a.setOffShip), F)}% -> ${pct(sum((a) => a.setOffReq), F)}%`);
say(`  races with any:   ${races.filter((r) => r.acc.setOffShip > 0).length} -> ${races.filter((r) => r.acc.setOffReq > 0).length}`);

say("");
say("=== (g) AGAINST THE FALLBACK — the four tracks whose leader shot is narrower than their road ===");
say("track            empty road on screen  ship / guarantee / FULL-ROAD      line findable ship / g / road     road wider than the set");
for (const t of ["mountainstreet", "river-run", "seatrack", "luger-hill", "ice-track", "city-circuit", "dirt-oval", "space-sprint", "searound"]) {
  const g = races.filter((r) => r.track === t);
  if (!g.length) continue;
  const f = g.reduce((s, r) => s + r.acc.frames, 0);
  say(
    `${t.padEnd(15)} ${pct(g.reduce((s, r) => s + r.acc.sumEmptyRoadShip, 0), f).padStart(8)}% / ` +
      `${pct(g.reduce((s, r) => s + r.acc.sumEmptyRoadReq, 0), f).padStart(5)}% / ` +
      `${pct(g.reduce((s, r) => s + r.acc.sumEmptyRoadRoad, 0), f).padStart(5)}%        ` +
      `${pct(g.reduce((s, r) => s + r.acc.lineInShip, 0), f).padStart(5)}% / ${pct(g.reduce((s, r) => s + r.acc.lineInReq, 0), f).padStart(5)}% / ${pct(g.reduce((s, r) => s + r.acc.lineInRoad, 0), f).padStart(5)}%     ` +
      `${pct(g.reduce((s, r) => s + r.acc.roadWiderThanReq, 0), f).padStart(5)}%`
  );
}
say(`POOLED: mean ln(full-road width / contender width) = ${(sum((a) => a.sumLnRoadVsReq) / F).toFixed(4)} (negative = the road demands the wider shot)`);

say("");
say("=== (h) WHAT IT COSTS THE FORWARD VIEW ===");
say(`mean forward placement (fraction of frame ahead of the leader): ${(1 - sum((a) => a.sumFwd) / F).toFixed(4)} — IDENTICAL under both, it is a fraction`);
say(`room AHEAD of the leader, world px:  shipped ${(sum((a) => a.sumAheadShip) / F).toFixed(0)}  ->  guarantee ${(sum((a) => a.sumAheadReq) / F).toFixed(0)}`);
say(`leader's drawn body as a fraction of frame height: shipped ${(sum((a) => a.sumBodyFracShip) / F).toFixed(4)} -> guarantee ${(sum((a) => a.sumBodyFracReq) / F).toFixed(4)}`);

process.stdout.write(out.join("\n") + "\n");
