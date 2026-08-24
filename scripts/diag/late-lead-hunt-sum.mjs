// LATE-LEAD-HUNT-1 — summarise the hunt. Report-only.
import { readdirSync, readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIRS = String(arg("dirs", "c:/tmp/late-lead-hunt/p1,c:/tmp/late-lead-hunt/p2")).split(",");

const races = [];
for (const d of DIRS) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith(".json")) continue;
    for (const r of JSON.parse(readFileSync(`${d}/${f}`, "utf8"))) races.push(r);
  }
}
const ok = races.filter((r) => !r.error && r.byPos);
console.log(`races swept ${races.length} | usable ${ok.length} | errors ${races.filter((r) => r.error).length}`);
const noFinish = races.length - ok.length;
if (noFinish) console.log(`  (${noFinish} produced no finishing order and are excluded)`);

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "--");

// ── PER FINISHING POSITION, so the owner draws the "top places" line himself ──────────────────
console.log("\n=== OFF CANVAS and CLIPPED, per finishing position ===");
console.log("  pos   races with him OFF        races with him CLIPPED       median OFF frames when off");
for (let pos = 1; pos <= 5; pos++) {
  const withPos = ok.filter((r) => r.byPos.some((p) => p.pos === pos));
  const off = withPos.filter((r) => r.byPos.find((p) => p.pos === pos).off > 0);
  const clip = withPos.filter((r) => r.byPos.find((p) => p.pos === pos).clipped > 0);
  const fr = off.map((r) => r.byPos.find((p) => p.pos === pos).off).sort((a, b) => a - b);
  console.log(
    `  P${pos}    ${(off.length + " (" + pct(off.length, withPos.length) + ")").padEnd(26)}` +
      `${(clip.length + " (" + pct(clip.length, withPos.length) + ")").padEnd(29)}` +
      `${fr.length ? fr[Math.floor(fr.length / 2)] : "--"}`
  );
}

// ── THE HIT LIST ─────────────────────────────────────────────────────────────────────────────
const hits = [];
for (const r of ok) {
  for (const p of r.byPos) {
    if (p.off > 0) hits.push({ r, p });
  }
}
hits.sort((a, b) => b.p.off - a.p.off);
console.log(`\n=== HITS: a top-5 finisher FULLY OFF CANVAS during the closing stretch ===`);
console.log(`  ${hits.length} hits across ${new Set(hits.map((h) => h.r.track + h.r.seed + h.r.racers)).size} distinct races`);
console.log("\n  track            N   seed   pos  offFrames  u-window        side        binding(off frames)        anchor(off frames)");
for (const h of hits.slice(0, 30)) {
  const b = Object.entries(h.p.binds).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}:${v}`).join(" ");
  const a = Object.entries(h.p.anchors).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}:${v}`).join(" ");
  const w = Object.entries(h.p.where).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(
    `  ${String(h.r.track).padEnd(16)} ${String(h.r.racers).padEnd(3)} ${String(h.r.seed).padEnd(6)} ` +
      `P${h.p.pos}   ${String(h.p.off).padEnd(10)} ${(h.p.offFrom + "-" + h.p.offTo).padEnd(15)} ${w.padEnd(11)} ${b.padEnd(26)} ${a}`
  );
}

// ── THE SHARED-MECHANISM QUESTION ────────────────────────────────────────────────────────────
console.log("\n=== DO THE HITS SHARE ONE MECHANISM? ===");
const bindTot = {};
const anchorSelf = { anchoredOnHim: 0, anchoredElsewhere: 0, noAnchor: 0 };
const sideTot = {};
let offFramesTot = 0;
for (const h of hits) {
  for (const [k, v] of Object.entries(h.p.binds)) {
    bindTot[k] = (bindTot[k] ?? 0) + v;
    offFramesTot += v;
  }
  for (const [k, v] of Object.entries(h.p.where)) sideTot[k] = (sideTot[k] ?? 0) + v;
  for (const [k, v] of Object.entries(h.p.anchors)) {
    if (k === "null") anchorSelf.noAnchor += v;
    else if (Number(k) === h.p.index) anchorSelf.anchoredOnHim += v;
    else anchorSelf.anchoredElsewhere += v;
  }
}
console.log(`  off-frames across all hits: ${offFramesTot}`);
console.log("  WHICH TERM SET THE WIDTH on those frames:");
for (const [k, v] of Object.entries(bindTot).sort((a, b) => b[1] - a[1]))
  console.log(`    ${k.padEnd(22)} ${v} (${pct(v, offFramesTot)})`);
console.log("  WHO THE CAMERA WAS ANCHORED ON:");
for (const [k, v] of Object.entries(anchorSelf))
  console.log(`    ${k.padEnd(22)} ${v} (${pct(v, offFramesTot)})`);
console.log("  WHICH EDGE he was outside:");
for (const [k, v] of Object.entries(sideTot).sort((a, b) => b[1] - a[1]))
  console.log(`    ${k.padEnd(22)} ${v} (${pct(v, offFramesTot)})`);

// WHEN in the closing stretch, in the schedule's own unit.
const uStarts = hits.map((h) => h.p.offFrom).filter((x) => x != null).sort((a, b) => a - b);
const uEnds = hits.map((h) => h.p.offTo).filter((x) => x != null).sort((a, b) => a - b);
if (uStarts.length) {
  console.log(
    `  WHEN, in run-in progress u: starts median ${uStarts[Math.floor(uStarts.length / 2)].toFixed(3)}` +
      ` (min ${uStarts[0].toFixed(3)}), ends median ${uEnds[Math.floor(uEnds.length / 2)].toFixed(3)}` +
      ` (max ${uEnds[uEnds.length - 1].toFixed(3)})`
  );
  const lateEnders = hits.filter((h) => h.p.offTo != null && h.p.offTo > 0.9).length;
  console.log(`  hits still off canvas past u=0.90: ${lateEnders} of ${hits.length}`);
}

// ── PER TRACK / FIELD SIZE ───────────────────────────────────────────────────────────────────
console.log("\n=== hits per track and field size ===");
const key = (r) => `${r.track}|${r.racers}`;
const tally = {};
for (const r of ok) {
  const k = key(r);
  tally[k] ??= { races: 0, hitRaces: 0 };
  tally[k].races++;
  if (r.byPos.some((p) => p.off > 0)) tally[k].hitRaces++;
}
for (const [k, v] of Object.entries(tally).sort())
  console.log(`  ${k.padEnd(22)} races ${String(v.races).padEnd(5)} hit races ${v.hitRaces} (${pct(v.hitRaces, v.races)})`);
