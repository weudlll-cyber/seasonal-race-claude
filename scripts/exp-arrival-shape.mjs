// ============================================================
// scripts/exp-arrival-shape.mjs — ARRIVAL-SHAPE-E-1 (read-only measurement runner)
//
// ★ WHAT IT OWNS: the sweep that answers "which taper distance works" for variant E, the arrival
//   shape the owner described on 2026-09-13. It fans `sim-fairness.mjs --arrival-shape` out over
//   {variants} x {ten tracks, each at ITS OWN defaultRacerTypeId} x {field sizes}, then aggregates
//   the per-comebacker rows into the two columns that matter — did he land in his block, and how
//   big was the peak gap — plus the mechanical test (his pace the moment he reached his place).
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not decide anything: it prints the table and leaves
//   the variant selection to the report. It does not run the FAIRNESS gates (Holm / band-reach) —
//   those need a different race count and their own sweep, and are owed on the selected arm only.
//   It does not touch the tree, mint anything, or write into the repository: every output goes to
//   the scratch directory. It measures the sim, and the sim's camera does not exist, so the
//   canvas-width figure is NOT produced here — see the report for what stands in for it.
//
// Resumable: a job whose arrival-shape.json already exists is skipped, so an interrupted run
// continues where it stopped. `--force` re-runs everything.
//
// Usage: node scripts/exp-arrival-shape.mjs [--races=20]
//                                           [--racers=20,40,60,100] [--jobs=12] [--force]
// ============================================================
import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { DEFAULT_RACE_DYNAMICS_CONFIG } from "../client/src/modules/storage/defaults.js";
import { ARRIVAL_TAPER_START_RANKS } from "../client/src/modules/racePlanner.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const p = argv.find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
// ONE shape. The `--variants` dimension this runner was built around is gone: the arrival variants
// were measured (ARRIVAL-SHAPE-E-1) and then deleted, so there is nothing to select between and the
// single label below is a directory name, not an arm.
const VARIANTS = ["shipped"];
const RACES = Number(argVal("races", "20"));
const FIELDS = argVal("racers", "20,40,60,100").split(",").map(Number);
const JOBS = Number(argVal("jobs", "12"));
const FORCE = argv.includes("--force");
const SEED = Number(argVal("seed", "1"));
const OUT = join(
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch"),
  "arrival-shape",
);
mkdirSync(OUT, { recursive: true });

// Ten tracks, each at its OWN default racer — never a hardcoded roster. Read from the track files,
// which are the one home for that pairing.
const TRACK_DIR = join(ROOT, "server/data/tracks");
const TRACKS = readdirSync(TRACK_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const t = JSON.parse(readFileSync(join(TRACK_DIR, f), "utf8"));
    return { id: t.id ?? f.replace(/\.json$/, ""), racer: t.defaultRacerTypeId };
  })
  .filter((t) => t.racer);

const jobs = [];
for (const v of VARIANTS)
  for (const t of TRACKS)
    for (const n of FIELDS)
      jobs.push({ v, t, n, dir: join(OUT, v, `${t.id}-${n}`) });

const pending = jobs.filter(
  (j) => FORCE || !existsSync(join(j.dir, "arrival-shape.json")),
);
console.log(
  `${TRACKS.length} tracks x ${FIELDS.length} field sizes x ${VARIANTS.length} variants = ${jobs.length} combos; ${pending.length} to run, ${JOBS} at a time.`,
);

let done = 0;
const t0 = Date.now();
function runOne(j) {
  return new Promise((resolve) => {
    mkdirSync(j.dir, { recursive: true });
    const child = spawn(
      process.execPath,
      [
        "scripts/sim-fairness.mjs",
        `--track=${j.t.id}`,
        `--racer=${j.t.racer}`,
        `--seed=${SEED}`,
        `--races=${RACES}`,
        `--racers=${j.n}`,
        "--track-defaults",
        "--race-plan=true",
        "--arrival-shape",
        // Only arrival-shape.json is read back, so the heavy main report is not written at all.
        "--skip-main-output",
        `--out=${j.dir}`,
      ],
      {
        cwd: ROOT,
        env: { ...process.env },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      console.log(`  SPAWN FAILED ${j.v} ${j.t.id} n=${j.n}: ${e.message}`);
      resolve();
    });
    child.on("close", (code) => {
      done++;
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      const ok = existsSync(join(j.dir, "arrival-shape.json"));
      console.log(
        `  [${done}/${pending.length}] ${j.v} ${j.t.id} n=${j.n} ${ok ? "ok" : `NO OUTPUT (exit ${code}) ${err.slice(-200)}`} (${mins}m)`,
      );
      resolve();
    });
  });
}

// Fixed-size worker pool.
const queue = [...pending];
await Promise.all(
  Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) await runOne(queue.shift());
  }),
);

// ── Aggregate ────────────────────────────────────────────────────────────────
const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const med = (xs) => pct(xs, 0.5);

const BLOCK = 5; // the top-5 block — BAND_EDGES[0], and the owner's "his block"
// The front-contest release. From this progress the servo already targets a B1 hero's CURRENT rank,
// so his rank error is zero and the taper has nothing to scale: the taper's window is
// [held release, this]. Read from the one home, never a literal.
const FRONT_RELEASE = DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress;

/** The shipped taper distance, read from its one home rather than parsed out of a label. */
const taperRanksOf = () => ARRIVAL_TAPER_START_RANKS;

/**
 * How many ranks he covered in the LAST SECOND before reaching his drawn place - i.e. how far ahead
 * of his place one second of racing is, in ranks. Null when he never arrived or the trail does not
 * reach back a full second, which is itself an answer: the whole approach was shorter than the ease.
 */
function ranksInLastSecond(o) {
  if (o.arrivalMs == null || !o.trail?.length) return null;
  const before = o.trail.filter((t) => t.ms <= o.arrivalMs - 1000);
  if (!before.length) return null;
  return before[before.length - 1].rank - o.drawn;
}

const rows = [];
for (const v of VARIANTS) {
  for (const n of FIELDS) {
    const obs = [];
    let taperFrames = 0,
      freeFrames = 0,
      netFrames = 0,
      raceCount = 0;
    for (const t of TRACKS) {
      const f = join(OUT, v, `${t.id}-${n}`, "arrival-shape.json");
      if (!existsSync(f)) continue;
      const j = JSON.parse(readFileSync(f, "utf8"));
      for (const r of j.races) {
        raceCount++;
        taperFrames += r.eTaperFrames;
        freeFrames += r.eFreeFrames;
        netFrames += r.eNetFrames;
        for (const o of r.obs) obs.push({ ...o, track: t.id, n });
      }
    }
    if (!obs.length) continue;
    const arrived = obs.filter((o) => o.arrivalMult != null);
    const led = obs.filter((o) => o.maxLeadGapFrac > 0);
    const ranked = obs.filter((o) => o.finishRank != null);
    rows.push({
      v,
      n,
      comebackers: obs.length,
      // ★ 1. does he still land in his block
      blockRate: ranked.length
        ? ranked.filter((o) => o.finishRank <= BLOCK).length / ranked.length
        : null,
      // ★ the mechanical test — his pace the moment he reached his drawn place
      arrMultMed: med(arrived.map((o) => o.arrivalMult)),
      arrMultMin: arrived.length
        ? Math.min(...arrived.map((o) => o.arrivalMult))
        : null,
      atPace: arrived.length
        ? arrived.filter((o) => o.arrivalMult <= 1.001).length / arrived.length
        : null,
      // ★ 2. the peak gap he opened while leading, as a % of the race
      gapMed: led.length ? med(led.map((o) => o.maxLeadGapFrac * 100)) : null,
      gapP90: led.length ? pct(led.map((o) => o.maxLeadGapFrac * 100), 0.9) : null,
      gapMax: led.length ? Math.max(...led.map((o) => o.maxLeadGapFrac * 100)) : null,
      leaders: led.length,
      // ★ WHERE THE TAPER BEGINS, and how often it cannot begin at all. A racer handed back ALREADY
      // inside the taper span never passes through its start, so there is no full drive for it to
      // ease off FROM - the distance is simply unreachable for him. A property of the distance.
      taperStartRankMed: med(obs.filter((o) => o.taperStartRank != null).map((o) => o.taperStartRank)),
      taperNeverBegan: obs.length ? obs.filter((o) => o.taperStartRank == null).length / obs.length : null,
      unreachable: obs.length
        ? obs.filter((o) => o.releaseRank <= o.drawn + taperRanksOf(v)).length / obs.length
        : null,
      // ★ HOW MANY RANKS ONE SECOND IS - the span the taper would need to last as long as the ease.
      ranksPerSecondMed: med(obs.map((o) => ranksInLastSecond(o)).filter((x) => x != null)),
      drawnMed: med(obs.map((o) => o.drawn)),
      // ★ Arrivals that land AFTER the front-contest release, where no taper can reach them.
      lateArrivals: arrived.length
        ? arrived.filter((o) => o.arrivalProgress > FRONT_RELEASE).length / arrived.length
        : null,
      arrProgMed: med(arrived.map((o) => o.arrivalProgress)),
      // ★ how long two ranks actually take
      twoRankMedMs: med(obs.filter((o) => o.twoRankMs != null).map((o) => o.twoRankMs)),
      twoRankP10Ms: pct(
        obs.filter((o) => o.twoRankMs != null).map((o) => o.twoRankMs),
        0.1,
      ),
      // ★ the drift after arrival, which the net exists to bound
      driftMed: med(
        obs.filter((o) => o.worstRankAfter != null).map((o) => o.worstRankAfter - o.drawn),
      ),
      driftMax: obs.some((o) => o.worstRankAfter != null)
        ? Math.max(
            ...obs
              .filter((o) => o.worstRankAfter != null)
              .map((o) => o.worstRankAfter - o.drawn),
          )
        : null,
      // ★ how often band steering corrected him at the edge
      netFrac: freeFrames > 0 ? netFrames / freeFrames : 0,
      taperFrames,
      races: raceCount,
    });
  }
}

const f3 = (x) => (x == null ? "—" : x.toFixed(3));
const f1 = (x) => (x == null ? "—" : (x * 100).toFixed(1) + "%");
console.log("");
console.log("## ★ THE DECISION TABLE — the two conditions, per distance and field size");
console.log("");
console.log(
  "| v | N | comebackers | drawn med | ★ arrMult med | ★ at 1.0 | ★ block | taper starts at rank | never began | unreachable | ranks in last 1 s | arr progress med | ★ after 0.97 |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  console.log(
    `| ${r.v} | ${r.n} | ${r.comebackers} | ${r.drawnMed ?? "—"} | ${f3(r.arrMultMed)} | ${f1(r.atPace)} | ${f1(r.blockRate)} | ${r.taperStartRankMed ?? "—"} | ${f1(r.taperNeverBegan)} | ${f1(r.unreachable)} | ${r.ranksPerSecondMed ?? "—"} | ${f3(r.arrProgMed)} | ${f1(r.lateArrivals)} |`,
  );
}

console.log("");
console.log("## The gap and the drift");
console.log("");
console.log("| v | N | leaders | gap med % | gap p90 % | gap max % | drift med | drift max | net frac |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  console.log(
    `| ${r.v} | ${r.n} | ${r.leaders} | ${f3(r.gapMed)} | ${f3(r.gapP90)} | ${f3(r.gapMax)} | ${r.driftMed ?? "—"} | ${r.driftMax ?? "—"} | ${f1(r.netFrac)} |`,
  );
}

// Pooled over field sizes, which is the row the decision is read from.
console.log("\n## Pooled over all field sizes\n");
console.log(
  "| v | comebackers | block | arrMult med | at 1.0 | gap med % | gap p90 % | gap max % | drift med | drift max | net frac |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const v of VARIANTS) {
  const rs = rows.filter((r) => r.v === v);
  if (!rs.length) continue;
  const all = [];
  for (const n of FIELDS) {
    for (const t of TRACKS) {
      const f = join(OUT, v, `${t.id}-${n}`, "arrival-shape.json");
      if (!existsSync(f)) continue;
      for (const r of JSON.parse(readFileSync(f, "utf8")).races)
        for (const o of r.obs) all.push(o);
    }
  }
  const arrived = all.filter((o) => o.arrivalMult != null);
  const led = all.filter((o) => o.maxLeadGapFrac > 0);
  const ranked = all.filter((o) => o.finishRank != null);
  const drift = all
    .filter((o) => o.worstRankAfter != null)
    .map((o) => o.worstRankAfter - o.drawn);
  const netFrac =
    rs.reduce((s, r) => s + r.netFrac * 1, 0) / rs.length; // mean of the per-N fractions
  console.log(
    `| ${v} | ${all.length} | ${f1(ranked.filter((o) => o.finishRank <= BLOCK).length / (ranked.length || 1))} | ${f3(med(arrived.map((o) => o.arrivalMult)))} | ${f1(arrived.filter((o) => o.arrivalMult <= 1.001).length / (arrived.length || 1))} | ${f3(med(led.map((o) => o.maxLeadGapFrac * 100)))} | ${f3(pct(led.map((o) => o.maxLeadGapFrac * 100), 0.9))} | ${f3(led.length ? Math.max(...led.map((o) => o.maxLeadGapFrac * 100)) : null)} | ${med(drift) ?? "—"} | ${drift.length ? Math.max(...drift) : "—"} | ${f1(netFrac)} |`,
  );
}
console.log(`\n[ra-elapsed-min ${((Date.now() - t0) / 60000).toFixed(1)}]`);
