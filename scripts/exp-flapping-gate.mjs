// RACER-FLAPPING-1 STEP 2 gate (candidate world = decision-hysteresis fix). Runs the recheck quartet at
// N=100 (paired vs the FAIRNESS-RECHECK-1 ship numbers) AND N=300 (fold-in A: the definitive pooled Holm)
// on the CURRENT tree. Records band arrival, rowMin, Holm (native startRowUnfair), runaway. Read-only
// measurement of the candidate — no commit (the world isn't shipped until the gate passes + fingerprint mint).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const p = argv.find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const NLIST = argVal("nlist", "100,300").split(",").map(Number);
const LABEL = argVal("label", "new");
const SCRATCH =
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch");
const OUT = join(SCRATCH, "flapping-gate");
const DATA = join(ROOT, "reports/evolution/flapping-gate-data");
mkdirSync(OUT, { recursive: true });
mkdirSync(DATA, { recursive: true });
const TRACKS = [
  { id: "searound", racer: "manta" },
  { id: "luger-hill", racer: "luge" },
  { id: "seatrack", racer: "dolphin" },
  { id: "space-sprint", racer: "rocket" },
];
const BE = [5, 15, 25, 40];
const zi = (r) => {
  for (let i = 0; i < BE.length; i++) if (r <= BE[i]) return i;
  return BE.length;
};
const results = [];
for (const N of NLIST) {
  for (const t of TRACKS) {
    const out = join(OUT, `${LABEL}-${t.id}-N${N}`);
    const t0 = Date.now();
    execFileSync(
      process.execPath,
      [
        "scripts/sim-fairness.mjs",
        `--track=${t.id}`,
        `--racer=${t.racer}`,
        "--seed=1",
        `--races=${N}`,
        "--track-defaults",
        "--hero-map",
        "--runaway-parade",
        `--out=${out}`,
      ],
      { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 },
    );
    const hm = JSON.parse(readFileSync(join(out, "hero-map.json"), "utf8"));
    const fd = JSON.parse(
      readFileSync(join(out, "fairness-data.json"), "utf8"),
    );
    const rr = [],
      rt = [];
    for (const r of fd.rawData) {
      const row = r.startRowIndex;
      rr[row] = (rr[row] ?? 0) + (zi(r.finalRank) === zi(r.sollRank) ? 1 : 0);
      rt[row] = (rt[row] ?? 0) + 1;
    }
    const rowMin = Math.min(...rr.map((v, i) => (rt[i] ? v / rt[i] : 1)));
    let runaway = null;
    try {
      const rp = JSON.parse(
        readFileSync(join(out, "runaway-parade.json"), "utf8"),
      ).races;
      runaway = rp.length
        ? rp.filter((r) => r.runawayParade?.runaway).length / rp.length
        : null;
    } catch {
      /* */
    }
    const rec = {
      label: LABEL,
      track: t.id,
      racer: t.racer,
      N,
      bandReach: hm.fairness?.bandReach ?? null,
      rowMin,
      holm: hm.fairness?.startRowUnfair ? "UNFAIR" : "ok",
      holmP: hm.fairness?.startRowMinPHolm ?? null,
      runaway,
      secs: Math.round((Date.now() - t0) / 1000),
    };
    results.push(rec);
    console.log(
      `[${LABEL} N=${N}] ${t.id}/${t.racer}: band=${(rec.bandReach * 100).toFixed(1)}% rowMin=${(rowMin * 100).toFixed(0)}% ${rec.holm}(p=${rec.holmP == null ? "?" : rec.holmP.toFixed(3)}) runaway=${runaway == null ? "?" : (runaway * 100).toFixed(0) + "%"} (${rec.secs}s)`,
    );
  }
}
writeFileSync(join(DATA, `${LABEL}.json`), JSON.stringify(results, null, 2));
console.log("DONE");
