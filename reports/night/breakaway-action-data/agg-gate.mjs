// The band-arrival table for one arm, per track. Usage: node agg-gate.mjs <file.json> <ARM>
//
// ── WHAT THIS DOES AND DOES NOT COVER ──────────────────────────────────────────────────────────
// BAND ARRIVAL is here. It is computed in the harness with `bandOfRank`
// (heroCurveGenerator.js:135) over the DRAWN rank against the FINAL rank, and only summed here.
//
// ★★ THE START-ROW HALF OF THE GATE IS NOT HERE, AND CANNOT BE. `computeFairnessStats`
// (scripts/sim/observers/fairness-stats.mjs:18) needs `{ startRowIndex, finalRank }` per racer, and
// ★ THE LIVE RACER OBJECTS THIS HARNESS DRIVES CARRY NO `startRowIndex` — checked: the only
// row-shaped field on them is `rawRowBonus`. The start row is assigned inside `sim-fairness.mjs`'s
// own starting-grid layout (`sim-fairness.mjs:1233`, `startRowIndex: assignment.rowIndex`), which
// never runs on this path. Reconstructing that assignment here would be re-deriving the thing the
// brief's §D explicitly says not to re-derive, and the instrument that owns it is the one measured
// at ~176 s per race. So the start-row gate is reported as NOT MEASURED rather than approximated.
//
// ★ AND THE BAND FIGURES ARE MINE, NOT THE PROJECT'S GATE. The two routes were compared on one
// track at the N the validation could afford (§D) and did not demonstrably agree — 93.3% from
// `sim-fairness.mjs` against 85.0% here, on three races each, and not the same three races. Under
// §K's rule the conservative label is used everywhere these numbers appear.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(readFileSync(join(HERE, process.argv[2] ?? "action-stage2.json"), "utf8"));
const ARM = process.argv[3] ?? "Q60";
const v0 = d.rows.filter((r) => r.arm === ARM);
const by = {};
for (const r of v0) (by[r.track] = by[r.track] || []).push(r);

console.log(`arm ${ARM} — band arrival per track (MY measure; the start-row half is NOT measured).`);
console.log("track            races | band arrival |     B3 | vs the 70% bar");
let A = 0, C = 0;
for (const t of Object.keys(by).sort()) {
  const v = by[t];
  const a = v.reduce((s, r) => s + r.bandArrived, 0);
  const c = v.reduce((s, r) => s + r.bandCounted, 0);
  A += a; C += c;
  const b3a = v.reduce((s, r) => s + r.b3Arrived, 0);
  const b3c = v.reduce((s, r) => s + r.b3Counted, 0);
  const band = (100 * a) / c;
  console.log(
    t.padEnd(16), String(v.length).padStart(5), "|",
    band.toFixed(1).padStart(7) + "%", "|",
    (b3c ? ((100 * b3a) / b3c).toFixed(1) : "—").padStart(6) + "%", "|",
    band < 70 ? "★ FAILS" : "passes, +" + (band - 70).toFixed(1) + " pts",
  );
}
console.log("ALL TEN".padEnd(16), String(v0.length).padStart(5), "|", ((100 * A) / C).toFixed(1).padStart(7) + "%");
