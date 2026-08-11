// ============================================================
// scripts/exp-fairness-recheck.mjs — FAIRNESS-RECHECK-1 (read-only overnight verification)
// Independent re-proof that the shipped COMBO15 world still holds its gate numbers after the
// camera/presentation week. NO engine changes — the OFF-path fingerprint ded0a126048e4cdb is asserted
// separately (first + last). Runs the representative quartet at N=100, 60s, shipped defaults, and records
// the BINDING fairness metrics per track: absolute band arrival (headline), per-start-row floor (rowMin),
// Holm start-row fairness, runaway rate; plus front-action (P1 lead changes) as action context. Commits
// per track so a partial run is an honest partial. This is VERIFICATION, not tuning — deviations are alarms.
// Usage: node scripts/exp-fairness-recheck.mjs [--races=100] [--no-commit]
// ============================================================
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
const RACES = Number(argVal("races", "100"));
const NO_COMMIT = argv.includes("--no-commit");
const SCRATCH =
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch");
const OUT = join(SCRATCH, "fairness-recheck");
const DATA = join(ROOT, "reports/evolution/fairness-recheck-data");
mkdirSync(OUT, { recursive: true });
mkdirSync(DATA, { recursive: true });

// Representative quartet: searound (closed water — owner's eye), luger-hill (closed), seatrack (open water
// — softest roster cell), space-sprint (open — documented chaosGap residual). Default racer each.
const TRACKS = [
  { id: "searound", racer: "manta" },
  { id: "luger-hill", racer: "luge" },
  { id: "seatrack", racer: "dolphin" },
  { id: "space-sprint", racer: "rocket" },
];

// GATE-TRUTH-1: collected only so the once-per-run runaway control below has a run to speak about.
const runawayRows = [];
for (const t of TRACKS) {
  const out = join(OUT, t.id);
  const t0 = Date.now();
  execFileSync(
    process.execPath,
    [
      "scripts/sim-fairness.mjs",
      `--track=${t.id}`,
      `--racer=${t.racer}`,
      "--seed=1",
      `--races=${RACES}`,
      "--track-defaults",
      "--hero-map",
      "--runaway-parade",
      "--front-action",
      `--out=${out}`,
    ],
    { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 },
  );
  const hm = JSON.parse(readFileSync(join(out, "hero-map.json"), "utf8"));
  const fd = JSON.parse(readFileSync(join(out, "fairness-data.json"), "utf8"));
  // GATE-TRUTH-1: ONE home for the per-start-row floor and for the band edges it uses.
  const rowMin = rowMinOf(fd.rawData);
  // GATE-TRUTH-1: read through the observer that OWNS the definition. This used to be
  // `rp.filter((r) => r.runawayParade?.runaway)`, and that property has never existed — the optional
  // chain turned a missing field into a silent, permanent 0%. `runawayRateOf` also returns the
  // CONTROL that tells a broken reader from an honest zero.
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
    /* observer optional */
  }
  if (!runawayOK) console.log(`  ${runawayNote}`);
  let frontContest = null;
  try {
    const fa = JSON.parse(
      readFileSync(join(out, "front-action-data.json"), "utf8"),
    );
    const races = fa.races ?? fa;
    if (Array.isArray(races) && races.length) {
      const lc = races.map(
        (r) => r.frontAction?.leadChanges ?? r.leadChanges ?? 0,
      );
      frontContest = lc.reduce((a, b) => a + b, 0) / lc.length;
    }
  } catch {
    /* observer shape optional */
  }
  runawayRows.push({ label: t.id, rate: runaway, n: RACES });
  const rec = {
    track: t.id,
    racer: t.racer,
    races: RACES,
    bandReach: hm.fairness?.bandReach ?? null,
    rowMin,
    holm: hm.fairness?.startRowUnfair ? "UNFAIR" : "ok",
    holmP: hm.fairness?.startRowMinPHolm ?? null,
    runaway,
    frontContestMeanLeadChanges: frontContest,
    secs: Math.round((Date.now() - t0) / 1000),
  };
  const file = join(DATA, `${t.id}.json`);
  writeFileSync(file, JSON.stringify(rec, null, 2));
  console.log(
    `${t.id}/${t.racer}: bandReach=${rec.bandReach == null ? "?" : (rec.bandReach * 100).toFixed(1) + "%"} rowMin=${(rowMin * 100).toFixed(0)}% ${rec.holm} runaway=${runaway == null ? "?" : (runaway * 100).toFixed(0) + "%"} frontLC=${frontContest == null ? "?" : frontContest.toFixed(2)} (${rec.secs}s)`,
  );
  if (!NO_COMMIT) {
    try {
      execFileSync("git", ["add", file], { cwd: ROOT });
      execFileSync(
        "git",
        [
          "commit",
          "-q",
          "-m",
          `data(fairness-recheck): ${t.id} N=${RACES} gate metrics (FAIRNESS-RECHECK-1)`,
        ],
        { cwd: ROOT },
      );
      console.log(`  committed ${t.id}.json`);
    } catch (e) {
      console.log(`  commit skipped: ${String(e).slice(0, 80)}`);
    }
  }
}
// GATE-TRUTH-1: the once-per-run runaway control, printed on every run.
console.log("\n" + runawayRunSummary(runawayRows));
console.log("DONE — 4-track fairness recheck complete.");
