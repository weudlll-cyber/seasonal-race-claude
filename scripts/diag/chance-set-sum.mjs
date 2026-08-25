// RUNIN-CHANCE-SET-1 summariser. Reads the sweep shards and answers (c)-(g) as tables.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIRS = (arg("in", "c:/tmp/chance-set/p2") || "").split(",").filter(Boolean);
const ARMS = ["off", "len", "chance", "union"];

const races = [];
for (const dir of DIRS)
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    for (const r of JSON.parse(readFileSync(join(dir, f), "utf8"))) races.push(r);
  }
const ok = races.filter((r) => r.arms?.len?.acc?.frames > 0);
const key = (r) => `${r.track}-${r.racers}-${r.seed}`;

const med = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

process.stdout.write(`RACES WITH DATA: ${ok.length} of ${races.length} attempted\n`);
const noData = races.filter((r) => !r.arms?.len?.acc?.frames);
const byTrackNo = {};
for (const r of noData) byTrackNo[r.track] = (byTrackNo[r.track] ?? 0) + 1;
process.stdout.write(`  no run-in frames, by track: ${JSON.stringify(byTrackNo)}\n\n`);

// ── (d) THE STEP ────────────────────────────────────────────────────────────────────────────────
process.stdout.write("== (d) THE LARGEST SINGLE-FRAME WIDTH STEP ==\n");
process.stdout.write("arm     | mean step | median | p95   | max   | races >0.4ln | races >0.2ln\n");
for (const a of ARMS) {
  const v = ok.map((r) => r.arms[a]?.acc?.maxStepLn ?? 0);
  const s = [...v].sort((x, y) => x - y);
  process.stdout.write(
    `${a.padEnd(7)} | ${mean(v).toFixed(3).padStart(9)} | ${med(v).toFixed(3).padStart(6)} | ` +
      `${(s[Math.floor(s.length * 0.95)] ?? 0).toFixed(3).padStart(5)} | ${Math.max(...v).toFixed(3).padStart(5)} | ` +
      `${String(v.filter((x) => x > 0.4).length).padStart(12)} | ${String(v.filter((x) => x > 0.2).length).padStart(12)}\n`
  );
}

// ── (d) THE WIDTH ───────────────────────────────────────────────────────────────────────────────
process.stdout.write("\n== (d) HOW MUCH WIDER, AND HOW OFTEN ==\n");
process.stdout.write("arm     | mean set | max set | mean ln(camZoom) | wider than OFF by | frames bound\n");
for (const a of ARMS) {
  const rows = ok.map((r) => r.arms[a]?.acc).filter(Boolean);
  const meanSet = mean(rows.map((x) => x.sumSet / x.frames));
  const meanLn = mean(rows.map((x) => x.sumWidthLn / x.frames));
  const offLn = mean(ok.map((r) => r.arms.off.acc.sumWidthLn / r.arms.off.acc.frames));
  process.stdout.write(
    `${a.padEnd(7)} | ${meanSet.toFixed(2).padStart(8)} | ${String(Math.max(...rows.map((x) => x.maxSet))).padStart(7)} | ` +
      `${meanLn.toFixed(4).padStart(16)} | ${(`x${Math.exp(offLn - meanLn).toFixed(2)}`).padStart(17)} | ` +
      `${String(sum(rows.map((x) => x.frames))).padStart(12)}\n`
  );
}

// ── (g) HIS TWELVE ──────────────────────────────────────────────────────────────────────────────
const HIS_TWELVE = [
  "river-run-20-49",
  "river-run-20-23",
  "river-run-40-30",
  "river-run-20-32",
  "mountainstreet-20-13",
  "river-run-40-23",
  "luger-hill-40-11",
  "river-run-20-55",
  "mountainstreet-20-34",
  "seatrack-20-5",
  "luger-hill-20-51",
  "seatrack-20-11",
];
process.stdout.write("\n== (g) HIS TWELVE — winner off frame ==\n");
process.stdout.write("race                     |  off  |  len  | chance | union | line in frame (len/chance)\n");
const tot = { off: 0, len: 0, chance: 0, union: 0 };
for (const k of HIS_TWELVE) {
  const r = ok.find((x) => key(x) === k);
  if (!r) {
    process.stdout.write(`${k.padEnd(24)} | (not in this sweep)\n`);
    continue;
  }
  const c = (a) => r.arms[a]?.acc?.winnerOff ?? -1;
  for (const a of ARMS) tot[a] += Math.max(0, c(a));
  const li = (a) => ((100 * r.arms[a].acc.lineIn) / r.arms[a].acc.frames).toFixed(1);
  process.stdout.write(
    `${k.padEnd(24)} | ${String(c("off")).padStart(5)} | ${String(c("len")).padStart(5)} | ` +
      `${String(c("chance")).padStart(6)} | ${String(c("union")).padStart(5)} | ${li("len")}% / ${li("chance")}%\n`
  );
}
process.stdout.write(
  `${"TOTAL".padEnd(24)} | ${String(tot.off).padStart(5)} | ${String(tot.len).padStart(5)} | ` +
    `${String(tot.chance).padStart(6)} | ${String(tot.union).padStart(5)} |\n`
);

// ── (g) POPULATION-WIDE VISIBILITY ──────────────────────────────────────────────────────────────
process.stdout.write("\n== (g) POPULATION — races with the winner off frame at any point ==\n");
for (const a of ARMS) {
  const bad = ok.filter((r) => (r.arms[a]?.acc?.winnerOff ?? 0) > 0);
  const t5 = ok.filter((r) => (r.arms[a]?.acc?.top5Off ?? 0) > 0);
  const fr = sum(ok.map((r) => r.arms[a]?.acc?.winnerOff ?? 0));
  process.stdout.write(
    `${a.padEnd(7)} races winner-off ${String(bad.length).padStart(4)}   frames ${String(fr).padStart(6)}   races top5-off ${String(t5.length).padStart(4)}\n`
  );
}

// ── (f) THE FADE COST ───────────────────────────────────────────────────────────────────────────
process.stdout.write("\n== (f) THE PRICE — member-frames spent on racers who do not finish near the front ==\n");
process.stdout.write("arm     | distinct members/race | member-frames | share held by a racer finishing ...\n");
process.stdout.write("        |                       |               |   1st-3rd |  4th-5th | 6th+ or DNF\n");
for (const a of ARMS) {
  let members = 0;
  let races2 = 0;
  let f123 = 0;
  let f45 = 0;
  let f6 = 0;
  for (const r of ok) {
    const h = r.arms[a]?.held;
    if (!h) continue;
    races2++;
    members += h.length;
    for (const m of h) {
      if (m.rank !== null && m.rank <= 3) f123 += m.f;
      else if (m.rank !== null && m.rank <= 5) f45 += m.f;
      else f6 += m.f;
    }
  }
  const T = f123 + f45 + f6 || 1;
  process.stdout.write(
    `${a.padEnd(7)} | ${(members / (races2 || 1)).toFixed(2).padStart(21)} | ${String(T).padStart(13)} | ` +
      `${((100 * f123) / T).toFixed(1).padStart(8)}% | ${((100 * f45) / T).toFixed(1).padStart(7)}% | ${((100 * f6) / T).toFixed(1).padStart(10)}%\n`
  );
}

// ── (e) THE HIT LIST, RE-DERIVED UNDER THE BROWSER SEED ─────────────────────────────────────────
process.stdout.write("\n== (e) EVERY RACE WHOSE ONE-LENGTH STEP EXCEEDS 0.4 ln (browser camera seed) ==\n");
const hits = ok
  .filter((r) => (r.arms.len?.acc?.maxStepLn ?? 0) > 0.4)
  .sort((a, b) => b.arms.len.acc.maxStepLn - a.arms.len.acc.maxStepLn);
process.stdout.write(`count: ${hits.length}\n`);
process.stdout.write("race                     | len step | chance step | union step | verdict\n");
let better = 0;
let worse = 0;
let gone = 0;
for (const r of hits) {
  const L = r.arms.len.acc.maxStepLn;
  const C = r.arms.chance?.acc?.maxStepLn ?? 0;
  const U = r.arms.union?.acc?.maxStepLn ?? 0;
  const v = C <= 0.4 ? "under 0.4 — GONE" : C < L ? "smaller" : "no better";
  if (C <= 0.4) gone++;
  else if (C < L) better++;
  else worse++;
  process.stdout.write(
    `${key(r).padEnd(24) } | ${L.toFixed(3).padStart(8)} | ${C.toFixed(3).padStart(11)} | ${U.toFixed(3).padStart(10)} | ${v}\n`
  );
}
process.stdout.write(`\nof ${hits.length}: ${gone} drop under 0.4, ${better} shrink but stay over, ${worse} no better\n`);

// And the reverse: races the chance arm makes WORSE.
const newHits = ok.filter(
  (r) => (r.arms.chance?.acc?.maxStepLn ?? 0) > 0.4 && (r.arms.len?.acc?.maxStepLn ?? 0) <= 0.4
);
process.stdout.write(`races where CHANCE steps over 0.4 and one-length did NOT: ${newHits.length}\n`);
for (const r of newHits.slice(0, 20))
  process.stdout.write(
    `  ${key(r).padEnd(24)} len ${r.arms.len.acc.maxStepLn.toFixed(3)} -> chance ${r.arms.chance.acc.maxStepLn.toFixed(3)}\n`
  );
