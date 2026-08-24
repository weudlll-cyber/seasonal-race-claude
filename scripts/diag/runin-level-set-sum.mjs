// RUNIN-LEVEL-SET-1 — the summary tables. Read-only; reads only what the sweep wrote.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIRS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const roots = DIRS.length ? DIRS : ["c:/tmp/runin-level/p1", "c:/tmp/runin-level/p2"];
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
const S = (f) => races.reduce((s, r) => s + f(r.acc), 0);
const F = S((a) => a.frames);
const TRACKS = [...new Set(races.map((r) => r.track))].sort();

const HIS_TWELVE = [
  "river-run-20-49", "river-run-20-23", "river-run-40-30", "river-run-20-32",
  "mountainstreet-20-13", "river-run-40-23", "luger-hill-40-11", "river-run-20-55",
  "mountainstreet-20-34", "seatrack-20-5", "luger-hill-20-51", "seatrack-20-11",
];

say(`RACES ${races.length}   RUN-IN FRAMES ${F}`);
say("");
say("=== (d) HIS TWELVE — one by one, never in aggregate ===");
say("race                       frames   winner OFF: ship -> SPAN -> PRESENCE    top5 off ship->pres   line in frame ship->pres   across room ship->pres");
for (const k of HIS_TWELVE) {
  const r = races.find((x) => key(x) === k);
  if (!r) { say(`${k.padEnd(26)} NOT FOUND`); continue; }
  const a = r.acc;
  say(
    `${k.padEnd(26)} ${String(a.frames).padStart(6)}   ${String(a.winnerOffShip).padStart(6)} -> ${String(a.winnerOffSpan).padStart(4)} -> ${String(a.winnerOffAnchor).padEnd(6)}     ` +
      `${String(a.top5OffShip).padStart(6)} -> ${String(a.top5OffAnchor).padEnd(5)}    ` +
      `${pct(a.lineInShip, a.frames).padStart(5)}% -> ${pct(a.lineInAnchor, a.frames).padStart(5)}%      ` +
      `${(a.sumAcrossShip / a.frames).toFixed(0).padStart(4)} -> ${(a.sumAcrossAnchor / a.frames).toFixed(0)}`
  );
}
const t12 = races.filter((r) => HIS_TWELVE.includes(key(r)));
const s12 = (f) => t12.reduce((s, r) => s + f(r.acc), 0);
say(
  `TOTAL over the twelve: winner off ${s12((a) => a.winnerOffShip)} frames shipped -> ${s12((a) => a.winnerOffSpan)} span -> ${s12((a) => a.winnerOffAnchor)} presence`
);
say(
  `  races with the winner off at all: ${t12.filter((r) => r.acc.winnerOffShip > 0).length} -> ${t12.filter((r) => r.acc.winnerOffSpan > 0).length} -> ${t12.filter((r) => r.acc.winnerOffAnchor > 0).length} of 12`
);

say("");
say("=== (a) THE SET the rule produces ===");
const hist = (pickf) => {
  const h = {};
  for (const r of races) for (const [k, v] of Object.entries(pickf(r.acc))) h[k] = (h[k] ?? 0) + v;
  return h;
};
const showHist = (label, h) => {
  const t = Object.values(h).reduce((a, b) => a + b, 0);
  const ks = Object.keys(h).map(Number).sort((a, b) => a - b);
  say(`${label.padEnd(34)} ${ks.map((k) => `${k}:${pct(h[k], t)}%`).join("  ")}`);
};
showHist("THE OWNER'S RULE (one length back)", hist((a) => a.sizeLevel));
showHist("shipped `_abreastContenders`", hist((a) => a.sizeShip));
showHist("previous block's predictive set", hist((a) => a.sizePred));
say("");
say(`the rule's set DIFFERS from the shipped one on ${pct(S((a) => a.levelDiffersFromShip), F)}% of frames`);
say(`  memberships ADDED vs shipped: ${S((a) => a.addedVsShip)}   DROPPED: ${S((a) => a.droppedVsShip)}`);
say(`THE WINNER IS IN THE RULE'S SET on ${pct(S((a) => a.winnerInLevel), F)}% of frames; in the shipped set on ${pct(S((a) => a.winnerInShip), F)}%`);
say("");
say("toward the line — quarters of the closing stretch:");
say("quarter      mean size RULE   mean size SHIPPED   winner in the RULE'S set");
for (let q = 0; q < 4; q++) {
  const n = S((a) => a.quarter[q].n);
  if (!n) continue;
  const lbl = ["0.00-0.25", "0.25-0.50", "0.50-0.75", "0.75-1.00"][q];
  say(
    `  ${lbl}  ${(S((a) => a.quarter[q].sumLevel) / n).toFixed(2).padStart(13)}   ` +
      `${(S((a) => a.quarter[q].sumShip) / n).toFixed(2).padStart(17)}   ` +
      `${pct(S((a) => a.quarter[q].winLevel), n).padStart(22)}%`
  );
}

say("");
say("=== (b) THE WIDTH IT DEMANDS ===");
say(`SPAN reading:     widens on ${pct(S((a) => a.widenSpan), F)}% of frames, TIGHTER on ${pct(S((a) => a.tighterSpan), F)}%, no demand on ${pct(S((a) => a.sameSpan), F)}%`);
say(`PRESENCE reading: widens on ${pct(S((a) => a.widenAnchor), F)}% of frames`);
say(`mean ln(demand/shipped): span ${(S((a) => a.sumLnSpanVsShip) / F).toFixed(4)}   presence ${(S((a) => a.sumLnAnchorVsShip) / F).toFixed(4)}   (negative = wider)`);
say(`worst single frame wider: span ${Math.max(...races.map((r) => r.acc.maxLnWiderSpan)).toFixed(3)} ln, presence ${Math.max(...races.map((r) => r.acc.maxLnWiderAnchor)).toFixed(3)} ln`);
say(`HOW LONG: ${S((a) => a.runsAnchor)} widening episodes, mean ${(S((a) => a.runFramesAnchor) / (S((a) => a.runsAnchor) || 1)).toFixed(1)} frames, longest ${Math.max(...races.map((r) => r.acc.maxRunAnchor))}`);
say("");
say("track            widens (presence)   tighter (span)   across room ship -> presence   x road   mean set size   road px");
for (const t of TRACKS) {
  const g = races.filter((r) => r.track === t);
  const f = g.reduce((s, r) => s + r.acc.frames, 0);
  const G = (fn) => g.reduce((s, r) => s + fn(r.acc), 0);
  const arS = G((a) => a.sumAcrossShip) / f;
  const arA = G((a) => a.sumAcrossAnchor) / f;
  const szH = g.reduce((m, r) => { for (const [k, v] of Object.entries(r.acc.sizeLevel)) m[k] = (m[k] ?? 0) + v; return m; }, {});
  const szN = Object.entries(szH).reduce((s, [k, v]) => s + Number(k) * v, 0) / Object.values(szH).reduce((a, b) => a + b, 0);
  say(
    `${t.padEnd(15)} ${(pct(G((a) => a.widenAnchor), f) + "%").padStart(16)}   ${(pct(G((a) => a.tighterSpan), f) + "%").padStart(14)}   ` +
      `${arS.toFixed(0).padStart(18)} -> ${arA.toFixed(0).padEnd(8)}  ${(arA / g[0].trackWidthPx).toFixed(2)}   ${szN.toFixed(2).padStart(13)}   ${String(g[0].trackWidthPx).padStart(7)}`
  );
}

say("");
say("=== (c) WHY IT WIDENS — the across-track share, which is the point of the thread ===");
const wS = S((a) => a.widenBecauseSide);
const wB = S((a) => a.widenBecauseBehind);
say(`of the ${wS + wB} frames where the rule widens the shot:`);
say(`  the binding member is farther to the SIDE than behind:   ${wS}  (${pct(wS, wS + wB)}%)`);
say(`  the binding member is farther BEHIND than to the side:   ${wB}  (${pct(wB, wS + wB)}%)`);
say(`mean offset of the binding member from the anchor: along ${(S((a) => a.sumBindAlongPx) / (wS + wB || 1)).toFixed(1)} world px, across ${(S((a) => a.sumBindAcrossPx) / (wS + wB || 1)).toFixed(1)} world px`);
say("");
say("track            widening frames   SIDE share   mean along px   mean across px");
for (const t of TRACKS) {
  const g = races.filter((r) => r.track === t);
  const G = (fn) => g.reduce((s, r) => s + fn(r.acc), 0);
  const n = G((a) => a.widenBecauseSide) + G((a) => a.widenBecauseBehind);
  if (!n) { say(`${t.padEnd(15)} ${String(0).padStart(15)}   —`); continue; }
  say(
    `${t.padEnd(15)} ${String(n).padStart(15)}   ${(pct(G((a) => a.widenBecauseSide), n) + "%").padStart(10)}   ` +
      `${(G((a) => a.sumBindAlongPx) / n).toFixed(1).padStart(13)}   ${(G((a) => a.sumBindAcrossPx) / n).toFixed(1).padStart(14)}`
  );
}

say("");
say("=== (e) THE FINISH LINE — composed as a WIDEN-ONLY ceiling on the terms already there ===");
say(`line in frame: shipped ${pct(S((a) => a.lineInShip), F)}%   span reading ${pct(S((a) => a.lineInSpan), F)}%   PRESENCE reading ${pct(S((a) => a.lineInAnchor), F)}%`);
say("");
say("track            shipped   span   presence");
for (const t of TRACKS) {
  const g = races.filter((r) => r.track === t);
  const f = g.reduce((s, r) => s + r.acc.frames, 0);
  const G = (fn) => g.reduce((s, r) => s + fn(r.acc), 0);
  say(`${t.padEnd(15)} ${(pct(G((a) => a.lineInShip), f) + "%").padStart(7)}   ${(pct(G((a) => a.lineInSpan), f) + "%").padStart(6)}   ${(pct(G((a) => a.lineInAnchor), f) + "%").padStart(8)}`);
}

say("");
say("=== (g) SPAN vs PRESENCE — does the rule need the CAMERA-ANCHOR-TRUTH-1 repair? ===");
say(`a member of the rule's own set is OFF FRAME:`);
say(`  shipped today       ${pct(S((a) => a.memberOffShip), F)}% of frames, in ${races.filter((r) => r.acc.memberOffShip > 0).length} of ${races.length} races`);
say(`  SPAN guarantee      ${pct(S((a) => a.memberOffSpan), F)}% of frames, in ${races.filter((r) => r.acc.memberOffSpan > 0).length} races`);
say(`  PRESENCE guarantee  ${pct(S((a) => a.memberOffAnchor), F)}% of frames, in ${races.filter((r) => r.acc.memberOffAnchor > 0).length} races`);
say(`the WINNER is off frame:`);
say(`  shipped ${pct(S((a) => a.winnerOffShip), F)}% (${races.filter((r) => r.acc.winnerOffShip > 0).length} races)  span ${pct(S((a) => a.winnerOffSpan), F)}% (${races.filter((r) => r.acc.winnerOffSpan > 0).length})  presence ${pct(S((a) => a.winnerOffAnchor), F)}% (${races.filter((r) => r.acc.winnerOffAnchor > 0).length})`);
say(`any top-5 finisher is off frame: shipped ${pct(S((a) => a.top5OffShip), F)}% (${races.filter((r) => r.acc.top5OffShip > 0).length} races) -> presence ${pct(S((a) => a.top5OffAnchor), F)}% (${races.filter((r) => r.acc.top5OffAnchor > 0).length} races)`);

say("");
say("=== (f) WHAT IT COSTS THE FORWARD VIEW ===");
say(`fraction of frame ahead of the leader: ${(1 - S((a) => a.sumFwd) / F).toFixed(4)} — identical under both, it is a fraction of the frame`);
say(`room AHEAD of the leader, world px:  shipped ${(S((a) => a.sumAheadShip) / F).toFixed(0)} -> presence ${(S((a) => a.sumAheadAnchor) / F).toFixed(0)}`);
say(`leader's drawn body as a fraction of frame height: shipped ${(S((a) => a.sumBodyFracShip) / F).toFixed(4)} -> presence ${(S((a) => a.sumBodyFracAnchor) / F).toFixed(4)}`);

process.stdout.write(out.join("\n") + "\n");
