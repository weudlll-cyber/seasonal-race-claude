// ============================================================
// scripts/exp-band-scale.mjs — BAND-SCALE-1 (read-only measurement, REPORT ONLY)
//
// ★ WHAT IT OWNS: the question "is the fairness guarantee a 40-racer fact?". `BAND_EDGES` is
//   [5,15,25,40] — a table that partitions the field EXACTLY at forty racers and at no other size —
//   while `docs/FAIRNESS.md` states its gate (band-reach >= 70%, every track) without ever naming a
//   field size. This measures band-reach by FIELD SIZE across all ten tracks, says which band the
//   misses fall in, and scores a SECOND band table that scales with the field as a measured arm.
//
// ★ WHY ONE SWEEP ANSWERS BOTH ARMS. Band-reach is a pure function of (drawn rank, final rank):
//   a racer reaches his band when both fall in the same interval. `fairness-data.json`'s `rawData`
//   carries `sollRank` and `finalRank` per racer per race, so a different band table is scored by
//   RE-READING the same races rather than running them again. The scaled arm therefore costs no
//   races at all and — more importantly — is measured on the SAME races as the shipped arm, so the
//   two columns differ only in the table.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not change `BAND_EDGES`, propose a replacement, or
//   touch `docs/FAIRNESS.md`; the scaled table is an arm in a report, not a candidate. It does not
//   COMPUTE the gate: band-reach and the start-row Holm flag are the sim's own numbers, produced by
//   `--hero-map` and READ from it, because a harness that recomputes what it grades is the defect
//   this project has paid for six times. The only thing scored here is the SCALED-edges arm, which
//   nothing else can produce because it is not a table the engine has.
//   It writes nothing into the repository.
//
// Usage: node scripts/exp-band-scale.mjs [--races=30] [--racers=20,40,60,100] [--jobs=12] [--force]
// ============================================================
import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { BAND_EDGES } from "../client/src/modules/racePlanner.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const p = argv.find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const RACES = Number(argVal("races", "30"));
const FIELDS = argVal("racers", "20,40,60,100").split(",").map(Number);
const JOBS = Number(argVal("jobs", "12"));
const FORCE = argv.includes("--force");
const OUT = join(
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch"),
  "band-scale",
);
mkdirSync(OUT, { recursive: true });

const TRACK_DIR = join(ROOT, "server/data/tracks");
const TRACKS = readdirSync(TRACK_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const t = JSON.parse(readFileSync(join(TRACK_DIR, f), "utf8"));
    return { id: t.id ?? f.replace(/\.json$/, ""), racer: t.defaultRacerTypeId };
  })
  .filter((t) => t.racer);

// ── The two band tables ──────────────────────────────────────────────────────
// SHIPPED: the engine's own edges, imported rather than copied.
const shippedEdges = () => BAND_EDGES;
// SCALED: the same PROPORTIONS carried to the actual field. At forty racers it reproduces the
// shipped table exactly (5,15,25,40), which is the control that says the scaling is honest.
const scaledEdges = (n) =>
  BAND_EDGES.map((e) => Math.max(1, Math.round((e * n) / 40)));

function bandOf(rank, edges) {
  for (let i = 0; i < edges.length; i++) if (rank <= edges[i]) return i;
  return edges.length;
}

const jobs = [];
for (const t of TRACKS)
  for (const n of FIELDS) jobs.push({ t, n, dir: join(OUT, `${t.id}-${n}`) });
const pending = jobs.filter(
  (j) => FORCE || !existsSync(join(j.dir, "hero-map.json")),
);
console.log(
  `${TRACKS.length} tracks x ${FIELDS.length} field sizes = ${jobs.length} combos; ${pending.length} to run, ${JOBS} at a time, ${RACES} races each.`,
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
        "--seed=1",
        `--races=${RACES}`,
        `--racers=${j.n}`,
        "--track-defaults",
        "--race-plan=true",
        // --hero-map makes the sim write its OWN bandReach and startRowUnfair (the Holm flag) per
        // combo. Those are the gate's numbers and this script READS them rather than recomputing a
        // second opinion; the only thing computed here is the SCALED-edges arm, which nothing else
        // can produce because it is not a table the engine has.
        "--hero-map",
        `--out=${j.dir}`,
      ],
      { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      console.log(`  SPAWN FAILED ${j.t.id} n=${j.n}: ${e.message}`);
      resolve();
    });
    child.on("close", (code) => {
      done++;
      const ok = existsSync(join(j.dir, "hero-map.json"));
      console.log(
        `  [${done}/${pending.length}] ${j.t.id} n=${j.n} ${ok ? "ok" : `NO OUTPUT (exit ${code}) ${err.slice(-200)}`} (${((Date.now() - t0) / 60000).toFixed(1)}m)`,
      );
      resolve();
    });
  });
}
const queue = [...pending];
await Promise.all(
  Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) await runOne(queue.shift());
  }),
);

// ── Score ────────────────────────────────────────────────────────────────────
const pctS = (h, t) => (t ? ((100 * h) / t).toFixed(1) + "%" : "—");
// Binomial standard error, in percentage points — so a margin can be read against noise.
const seS = (h, t) =>
  t ? (100 * Math.sqrt(((h / t) * (1 - h / t)) / t)).toFixed(2) : "—";

const perN = new Map();
const perTrack = [];
// The sim's OWN gate numbers, read not recomputed.
const nativeRows = [];
for (const n of FIELDS) {
  const acc = {
    n,
    shipHits: 0,
    shipTot: 0,
    scaleHits: 0,
    scaleTot: 0,
    missByBand: new Array(BAND_EDGES.length + 1).fill(0),
    totByBand: new Array(BAND_EDGES.length + 1).fill(0),
  };
  for (const t of TRACKS) {
    const f = join(OUT, `${t.id}-${n}`, "fairness-data.json");
    if (!existsSync(f)) continue;
    const raw = JSON.parse(readFileSync(f, "utf8")).rawData ?? [];
    // The gate's own numbers, straight from the sim: band-reach and the start-row Holm flag.
    const hmPath = join(OUT, `${t.id}-${n}`, "hero-map.json");
    if (existsSync(hmPath)) {
      const hm = JSON.parse(readFileSync(hmPath, "utf8"));
      const fair = hm.fairness ?? {};
      nativeRows.push({
        track: t.id,
        n,
        bandReach: fair.bandReach ?? null,
        startRowUnfair: fair.startRowUnfair ?? null,
        minPHolm: fair.startRowMinPHolm ?? null,
      });
    }
    const se = shippedEdges();
    const sc = scaledEdges(n);
    let sh = 0,
      st = 0,
      ch = 0;
    for (const r of raw) {
      if (r.sollRank == null || r.finalRank == null) continue;
      st++;
      const tz = bandOf(r.sollRank, se);
      acc.totByBand[tz]++;
      if (tz === bandOf(r.finalRank, se)) sh++;
      else acc.missByBand[tz]++;
      if (bandOf(r.sollRank, sc) === bandOf(r.finalRank, sc)) ch++;
    }
    acc.shipHits += sh;
    acc.shipTot += st;
    acc.scaleHits += ch;
    acc.scaleTot += st;
    perTrack.push({ track: t.id, n, hits: sh, tot: st, scaled: ch });
  }
  perN.set(n, acc);
}

console.log("\n## Band-reach by FIELD SIZE — pooled over all ten tracks\n");
console.log(
  "| field | racers scored | shipped edges | ±SE pp | scaled edges | ±SE pp | gate margin (shipped) |",
);
console.log("|---|---|---|---|---|---|---|");
for (const n of FIELDS) {
  const a = perN.get(n);
  if (!a?.shipTot) continue;
  const rate = (100 * a.shipHits) / a.shipTot;
  console.log(
    `| ${n} | ${a.shipTot} | ${pctS(a.shipHits, a.shipTot)} | ${seS(a.shipHits, a.shipTot)} | ${pctS(a.scaleHits, a.scaleTot)} | ${seS(a.scaleHits, a.scaleTot)} | ${(rate - 70).toFixed(1)} pp |`,
  );
}

console.log("\n## Where the misses fall — shipped edges, by DRAWN band\n");
console.log("| field | " + ["B1", "B2", "B3", "B4", "B5"].join(" | ") + " |");
console.log("|---|---|---|---|---|---|");
for (const n of FIELDS) {
  const a = perN.get(n);
  if (!a?.shipTot) continue;
  const cells = a.totByBand.map((t, i) =>
    t ? `${pctS(t - a.missByBand[i], t)} (n=${t})` : "—",
  );
  console.log(`| ${n} | ${cells.join(" | ")} |`);
}

console.log("\n## Per track — shipped edges, the form the gate is stated in\n");
console.log("| track | " + FIELDS.map((n) => `N=${n}`).join(" | ") + " |");
console.log("|---|" + FIELDS.map(() => "---|").join(""));
for (const t of TRACKS) {
  const cells = FIELDS.map((n) => {
    const row = perTrack.find((p) => p.track === t.id && p.n === n);
    if (!row?.tot) return "—";
    const r = (100 * row.hits) / row.tot;
    return `${r.toFixed(1)}%${r < 70 ? " ★UNDER" : ""}`;
  });
  console.log(`| ${t.id} | ${cells.join(" | ")} |`);
}

console.log("\n## The scaled arm per track — same races, different table\n");
console.log("| track | " + FIELDS.map((n) => `N=${n}`).join(" | ") + " |");
console.log("|---|" + FIELDS.map(() => "---|").join(""));
for (const t of TRACKS) {
  const cells = FIELDS.map((n) => {
    const row = perTrack.find((p) => p.track === t.id && p.n === n);
    if (!row?.tot) return "—";
    const r = (100 * row.scaled) / row.tot;
    return `${r.toFixed(1)}%${r < 70 ? " ★UNDER" : ""}`;
  });
  console.log(`| ${t.id} | ${cells.join(" | ")} |`);
}
console.log(
  `\nScaled edges used: ${FIELDS.map((n) => `N=${n} -> [${scaledEdges(n).join(",")}]`).join("  ·  ")}`,
);
console.log(`[ra-elapsed-min ${((Date.now() - t0) / 60000).toFixed(1)}]`);
