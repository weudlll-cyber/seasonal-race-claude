// RUNIN-CHANCE-SET-1 (c) — DOES MEMBERSHIP ARRIVE GRADUALLY?
//
// The question the block exists to answer is not "is the set bigger" but "does a racer appear in it
// BEFORE the frame he would have crossed the one-length line". So for every join in the chance arm
// this measures the WARNING: the frames between that join and the first frame the shipped
// one-length rule would have admitted the same racer. A join with no warning is a step by another
// name; a join that never reaches the one-length line at all is a racer the chance rule holds and
// the state rule never would — which is (f)'s price, not (c)'s benefit.
//
// Reads only the traced races' per-frame series. Changes nothing.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIRS = (arg("in", "c:/tmp/chance-set/p2") || "").split(",").filter(Boolean);

const races = [];
for (const dir of DIRS)
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    for (const r of JSON.parse(readFileSync(join(dir, f), "utf8")))
      if (r.arms?.chance?.series) races.push(r);
  }

const key = (r) => `${r.track}-${r.racers}-${r.seed}`;
const all = [];
process.stdout.write(`traced races: ${races.length}\n\n`);
process.stdout.write("race                     | joins | with warning | median warning | never level | joins at a cut\n");

for (const r of races) {
  const C = r.arms.chance.series;
  if (!C?.length) continue;
  // The first frame the SHIPPED rule would admit each racer, from the same run's own `lenMembers`.
  const firstLen = new Map();
  for (const f of C)
    for (const i of f.lenMembers) if (!firstLen.has(i)) firstLen.set(i, f.frame);

  const joins = [];
  let prev = new Set(C[0].members);
  for (let k = 1; k < C.length; k++) {
    const cur = new Set(C[k].members);
    for (const m of cur) {
      if (prev.has(m)) continue;
      const lenAt = firstLen.has(m) ? firstLen.get(m) : null;
      // Only a LATER one-length admission is warning; if the shipped rule already had him earlier
      // in this race, this join is a re-admit after a release and warns of nothing.
      const warn = lenAt !== null && lenAt > C[k].frame ? lenAt - C[k].frame : null;
      const stepLn =
        C[k - 1].width > 0 && C[k].width > 0 ? Math.abs(Math.log(C[k].width / C[k - 1].width)) : 0;
      joins.push({ racer: m, frame: C[k].frame, u: C[k].u, warn, everLevel: lenAt !== null, stepLn });
    }
    prev = cur;
  }
  const withWarn = joins.filter((j) => j.warn !== null);
  const warns = withWarn.map((j) => j.warn).sort((a, b) => a - b);
  const neverLevel = joins.filter((j) => !j.everLevel).length;
  const atCut = joins.filter((j) => j.stepLn > 0.2).length;
  all.push(...joins.map((j) => ({ ...j, race: key(r) })));
  process.stdout.write(
    `${key(r).padEnd(24)} | ${String(joins.length).padStart(5)} | ${String(withWarn.length).padStart(12)} | ` +
      `${String(warns.length ? warns[Math.floor(warns.length / 2)] : "-").padStart(14)} | ` +
      `${String(neverLevel).padStart(11)} | ${String(atCut).padStart(14)}\n`
  );
}

const withWarn = all.filter((j) => j.warn !== null);
const w = withWarn.map((j) => j.warn).sort((a, b) => a - b);
process.stdout.write("\n== POOLED OVER THE TRACED RACES ==\n");
process.stdout.write(`joins under the chance rule            : ${all.length}\n`);
process.stdout.write(
  `  ...that precede a one-length crossing : ${withWarn.length} (${((100 * withWarn.length) / (all.length || 1)).toFixed(1)}%)\n`
);
if (w.length)
  process.stdout.write(
    `  warning, frames: min ${w[0]}  p25 ${w[Math.floor(w.length * 0.25)]}  median ${w[Math.floor(w.length / 2)]}  p75 ${w[Math.floor(w.length * 0.75)]}  max ${w[w.length - 1]}\n` +
      `  warning, seconds at 60 Hz: median ${(w[Math.floor(w.length / 2)] / 60).toFixed(2)} s\n`
  );
process.stdout.write(
  `  ...for a racer who NEVER gets within a length : ${all.filter((j) => !j.everLevel).length}\n`
);
process.stdout.write(
  `  ...that themselves land on a visible cut (>0.2 ln): ${all.filter((j) => j.stepLn > 0.2).length}\n`
);
const byU = [0, 0, 0, 0];
for (const j of all) byU[Math.min(3, Math.floor(j.u * 4))]++;
process.stdout.write(`  joins by quarter of the closing stretch: ${JSON.stringify(byU)}\n`);
