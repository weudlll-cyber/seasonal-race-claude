// RUNIN-CONTENDERS-1 — summarise the sweep. Report-only.
import { readdirSync, readFileSync } from "node:fs";
const OUT = "c:/tmp/runin-contenders";

const rows = [];
let errs = 0;
for (const f of readdirSync(OUT)) {
  if (!f.endsWith(".json")) continue;
  if (f.endsWith(".err.json")) {
    errs++;
    continue;
  }
  rows.push(JSON.parse(readFileSync(`${OUT}/${f}`, "utf8")));
}
console.log(`races ${rows.length} | errors ${errs}`);

// Only races that actually FINISHED can say anything about who was near the line.
const fin = rows.filter((r) => r.winnerIdx !== null && r.setSize > 0);
console.log(`with a winner and a captured set: ${fin.length}`);
const unfinished = rows.filter((r) => r.winnerIdx === null);
if (unfinished.length) {
  const byTrack = {};
  for (const r of unfinished) byTrack[r.track] = (byTrack[r.track] ?? 0) + 1;
  console.log(`NO WINNER inside the harness window: ${unfinished.length} -> ${JSON.stringify(byTrack)}`);
}

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "--");
const med = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

// ── (a) THE SET AS BUILT ─────────────────────────────────────────────────────────────────────
console.log("\n=== (a) THE SET AS BUILT ===");
for (const n of [20, 40]) {
  const g = fin.filter((r) => r.racers === n);
  const sizes = g.map((r) => r.setSize);
  const hist = {};
  for (const s of sizes) hist[s] = (hist[s] ?? 0) + 1;
  const caps = g.map((r) => r.capturedAt?.leaderProgress).filter((x) => x != null);
  const reforms = g.filter((r) => r.reformCount > 0).length;
  console.log(
    `  N=${n}  races ${g.length}  setSize hist ${JSON.stringify(hist)}  medSize ${med(sizes)}` +
      `  captured@p med ${med(caps)?.toFixed(4)}  re-formed in ${reforms} races`
  );
}

// ── (b) CASE A — the set is TOO SMALL ────────────────────────────────────────────────────────
console.log("\n=== (b) CASE A — racers NOT in the set who were close at the line ===");
console.log("  N   races  winnerOutOfSet   races with >=1 non-set within 1 body   mean non-set close   max");
for (const n of [20, 40]) {
  const g = fin.filter((r) => r.racers === n);
  const wOut = g.filter((r) => r.winnerInSet === false).length;
  const any = g.filter((r) => r.nonSetClose > 0).length;
  const mean = g.reduce((a, r) => a + r.nonSetClose, 0) / (g.length || 1);
  const max = Math.max(0, ...g.map((r) => r.nonSetClose));
  console.log(
    `  ${String(n).padEnd(4)}${String(g.length).padEnd(7)}${String(wOut).padEnd(17)}` +
      `${(any + " (" + pct(any, g.length) + ")").padEnd(39)}${mean.toFixed(2).padEnd(21)}${max}`
  );
}
const winnerOut = fin.filter((r) => r.winnerInSet === false);
console.log(`  WINNER OUTSIDE THE SET, all races: ${winnerOut.length} of ${fin.length} (${pct(winnerOut.length, fin.length)})`);
for (const r of winnerOut.slice(0, 12))
  console.log(`    ${r.track} N=${r.racers} seed=${r.seed} set=${JSON.stringify(r.set)} winner=${r.winnerIdx}`);

// ── (c) CASE B — the set is TOO GENEROUS ─────────────────────────────────────────────────────
console.log("\n=== (c) CASE B — set members who finished far back, and what they cost ===");
let passengers = 0;
let membersTotal = 0;
const costAll = [];
const passengerCost = [];
for (const r of fin) {
  for (const m of r.memberGap) {
    membersTotal++;
    const c = r.cost?.[m.index];
    if (c) costAll.push(c.med);
    // A PASSENGER: in the set, yet finished more than 5 body lengths behind the winner.
    if (m.gap != null && m.gap > 5) {
      passengers++;
      if (c) passengerCost.push(c.med);
    }
  }
}
console.log(`  set members across all races: ${membersTotal}`);
console.log(`  of those, PASSENGERS (finished >5 body lengths back): ${passengers} (${pct(passengers, membersTotal)})`);
console.log(`  races where the set could be priced at all (>=3 live members): ${fin.filter((r) => r.framesPriced > 0).length} of ${fin.length}`);
console.log(`  median per-member width cost, ln(without/with): ${costAll.length ? med(costAll).toFixed(5) : "-- (no race had 3+ live members)"}`);
console.log(`  median PASSENGER width cost: ${passengerCost.length ? med(passengerCost).toFixed(5) : "-- (none priced)"}`);

// Distribution of member finishing gaps, so the reader picks the "never a candidate" line.
const memberGaps = fin.flatMap((r) => r.memberGap.map((m) => m.gap).filter((g) => g != null));
const bins = [0.5, 1, 2, 5, 10, 20, 1e9];
console.log("  set members by finishing gap to the winner (body lengths):");
let prev = 0;
for (const b of bins) {
  const c = memberGaps.filter((g) => g > prev && g <= b).length;
  console.log(`    ${prev}-${b === 1e9 ? "inf" : b}: ${c} (${pct(c, memberGaps.length)})`);
  prev = b;
}

// ── (e) FIELD SIZE ───────────────────────────────────────────────────────────────────────────
console.log("\n=== (e) FIELD SIZE — does the case hold at 20 and not at 40? ===");
for (const n of [20, 40]) {
  const g = fin.filter((r) => r.racers === n);
  const closeAll = g.flatMap((r) =>
    Object.entries(r.gapsAtWin).map(([, v]) => v).filter((v) => v != null && v <= 1)
  );
  console.log(
    `  N=${n}  races ${g.length}  med setSize ${med(g.map((r) => r.setSize))}` +
      `  mean racers within 1 body of the winner ${(closeAll.length / (g.length || 1)).toFixed(2)}` +
      `  mean non-set close ${(g.reduce((a, r) => a + r.nonSetClose, 0) / (g.length || 1)).toFixed(2)}`
  );
}
console.log("\n  per-track, mean non-set-close (20 vs 40):");
const tracks = [...new Set(fin.map((r) => r.track))].sort();
for (const t of tracks) {
  const a = fin.filter((r) => r.track === t && r.racers === 20);
  const b = fin.filter((r) => r.track === t && r.racers === 40);
  const m = (g) => (g.length ? (g.reduce((x, r) => x + r.nonSetClose, 0) / g.length).toFixed(2) : "--");
  const s = (g) => (g.length ? med(g.map((r) => r.setSize)) : "--");
  console.log(
    `    ${t.padEnd(16)} 20: close ${String(m(a)).padEnd(6)} set ${String(s(a)).padEnd(4)}` +
      `  40: close ${String(m(b)).padEnd(6)} set ${s(b)}`
  );
}

// ── THE THIRD POSSIBILITY — is the contender set setting the width AT ALL? ────────────────────
console.log("\n=== WHICH TERM SETS THE WIDTH over the closing stretch (p >= 0.95) ===");
for (const n of [20, 40]) {
  const g = fin.filter((r) => r.racers === n);
  const tot = {};
  let frames = 0;
  for (const r of g) {
    frames += r.closingFrames ?? 0;
    for (const [k, v] of Object.entries(r.binding ?? {})) tot[k] = (tot[k] ?? 0) + v;
  }
  const sorted = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  console.log(`  N=${n}  closing frames ${frames}`);
  for (const [k, v] of sorted) console.log(`    ${k.padEnd(22)} ${v} (${pct(v, frames)})`);
}

// The largest width a single member ever cost, so "median 0" is not read as "never".
const maxCost = [];
for (const r of fin) for (const c of Object.values(r.cost ?? {})) if (c) maxCost.push(c.max);
maxCost.sort((a, b) => b - a);
console.log("\n=== the largest per-member width cost seen, ln(without/with) ===");
console.log(`  members priced ${maxCost.length}`);
console.log(`  top 8: ${maxCost.slice(0, 8).map((x) => x.toFixed(5)).join(", ") || "--"}`);
console.log(`  how many priced members ever cost more than 0.01 ln: ${maxCost.filter((x) => x > 0.01).length}`);
