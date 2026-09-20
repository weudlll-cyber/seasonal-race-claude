// The BREAKAWAY-COUNT table: the owner's definition beside leader-to-second, per track and pooled.
// Usage: node agg-count.mjs <file.json>
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(readFileSync(join(HERE, process.argv[2] ?? "count-v2n300.json"), "utf8"));
const R = d.rows;
const N = R.length;
const med = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, k) => (k ? ((100 * n) / k).toFixed(1) + "%" : "—");

console.log(`N=${N} races, ${d.stage}, threshold ${d.thresholdPx} px (his lead), window [${d.w70Start}, finish], front band ${d.frontBand}`);
console.log("\ntrack            races | ★ OWNER def | leader-to-2nd | pack max med | held>half med s | never closed");
console.log("-".repeat(104));
const by = {};
for (const r of R) (by[r.track] = by[r.track] || []).push(r);
for (const t of Object.keys(by).sort()) {
  const v = by[t];
  const p = v.filter((r) => r.packBreakaway).length;
  const l = v.filter((r) => r.w70Breakaway).length;
  const q = v.filter((r) => r.packBreakaway);
  console.log(
    t.padEnd(16), String(v.length).padStart(5), "|",
    (pct(p, v.length) + ` (${p})`).padStart(11), "|",
    (pct(l, v.length) + ` (${l})`).padStart(13), "|",
    String(med(v.map((r) => r.packMaxPx))?.toFixed(1)).padStart(12), "|",
    String(med(q.map((r) => r.packHeldAboveHalfSec))?.toFixed(2) ?? "—").padStart(15), "|",
    pct(q.filter((r) => r.packNeverClosed).length, q.length),
  );
}
const P = R.filter((r) => r.packBreakaway);
console.log("-".repeat(104));
console.log(
  "POOLED".padEnd(16), String(N).padStart(5), "|",
  (pct(P.length, N) + ` (${P.length})`).padStart(11), "|",
  (pct(R.filter((r) => r.w70Breakaway).length, N) + ` (${R.filter((r) => r.w70Breakaway).length})`).padStart(13), "|",
  String(med(R.map((r) => r.packMaxPx))?.toFixed(1)).padStart(12), "|",
  String(med(P.map((r) => r.packHeldAboveHalfSec))?.toFixed(2) ?? "—").padStart(15), "|",
  pct(P.filter((r) => r.packNeverClosed).length, P.length),
);

// ── group sizes, of the races that qualify ────────────────────────────────────────────────────
const sizes = {};
for (const r of P) sizes[r.packGroupSize] = (sizes[r.packGroupSize] ?? 0) + 1;
console.log("\n★ GROUP SIZE of the qualifying races (racers ahead of the gap):");
for (let g = 1; g <= d.frontBand; g++) console.log(`   ${g} in front: ${String(sizes[g] ?? 0).padStart(3)}  ${pct(sizes[g] ?? 0, P.length)}`);

// ── the sensitivity pair ──────────────────────────────────────────────────────────────────────
console.log("\n★ SENSITIVITY — the same count at other thresholds, owner's definition:");
console.log(`   ${String(d.thresholdPx).padStart(6)} px (his 0.698 w) : ${pct(P.length, N)}`);
for (let i = 0; i < d.sensPx.length; i++) {
  const hit = R.filter((r) => r.packSens?.[i]?.hit).length;
  console.log(`   ${String(d.sensPx[i]).padStart(6)} px (${(d.sensPx[i] / d.widthPx).toFixed(1)} w)       : ${pct(hit, N)}`);
}

// ── who is in the leading group when it first qualifies ───────────────────────────────────────
const roleMix = {};
let slots = 0;
for (const r of P) for (const role of r.packGroupRoles ?? []) { const k = role ?? "(uncast)"; roleMix[k] = (roleMix[k] ?? 0) + 1; slots++; }
console.log(`\n★ ROLES IN THE LEADING GROUP at the moment it first qualifies (${slots} racer-slots over ${P.length} races):`);
for (const [k, n] of Object.entries(roleMix).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(20)} ${String(n).padStart(3)}  ${pct(n, slots)}`);
