// RACER-FLAPPING-1 STEP 2 gate (candidate world = decision-hysteresis fix). Runs the recheck quartet at
// N=100 (paired vs the FAIRNESS-RECHECK-1 ship numbers) AND N=300 (fold-in A: the definitive pooled Holm)
// on the CURRENT tree. Records band arrival, rowMin, Holm (native startRowUnfair), runaway. Read-only
// measurement of the candidate — no commit (the world isn't shipped until the gate passes + fingerprint mint).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rowMinOf } from "./sim/observers/fairness-stats.mjs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  runawayRateOf,
  runawayRunSummary,
} from "./sim/observers/runaway-parade.mjs";
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
    // GATE-TRUTH-1: ONE home for the per-start-row check and for the band edges it uses.
    const rowMin = rowMinOf(fd.rawData);
    // GATE-TRUTH-1: read through the observer that OWNS the definition. This used to be
    // `rp.filter((r) => r.runawayParade?.runaway)`, and that property has never existed — the
    // optional chain turned a missing field into a silent, permanent 0%. `runawayRateOf` also
    // returns the CONTROL that tells a broken reader from an honest zero.
    let runaway = null;
    let runawayNote = "no runaway-parade.json (observer not requested?)";
    let runawayOK = true;
    try {
      const rp = JSON.parse(
        readFileSync(join(out, "runaway-parade.json"), "utf8"),
      ).races;
      const rr = runawayRateOf(rp);
      runaway = rr.rate;
      runawayNote = rr.note;
      runawayOK = rr.ok;
    } catch {
      /* */
    }
    if (!runawayOK) console.log(`  ${runawayNote}`);
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
// GATE-TRUTH-1: the once-per-run control. It prints on EVERY run, and it exists because a rate
// that is identically zero across a whole run is indistinguishable from a rate nobody measured.
console.log(
  "\n" +
    runawayRunSummary(
      results.map((r) => ({
        label: `${r.track}/N${r.N}`,
        rate: r.runaway,
        n: r.N,
      })),
    ),
);
writeFileSync(join(DATA, `${LABEL}.json`), JSON.stringify(results, null, 2));
console.log("DONE");
