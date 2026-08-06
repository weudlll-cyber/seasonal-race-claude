// ============================================================
// scripts/exp-roster-matrix.mjs — ROSTER-MATRIX-1 (read-only measurement)
// Does every SURFACE-COMPATIBLE racer type reach its band on each track it belongs on?
// Builds the eligibility map (racer surfaceClasses ∩ track surfaceClasses), then measures ONLY the
// eligible (type, track) cells as a uniform single-type field on the shipped COMBO15 world (flagless sim
// = COMBO15 defaults). Metric per cell: absolute band arrival (hero-map bandReach) + per-row floor (rowMin)
// + a collapse note (runaway rate). Parallelized across cores; writes + commits per-track JSON so a partial
// run is an honest partial. Engine untouched — the shipped fingerprint is asserted separately.
// Usage: node scripts/exp-roster-matrix.mjs [--races=50] [--dur=60] [--jobs=N] [--tracks=a,b] [--no-commit]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir, cpus } from "node:os";
import { execFile, execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const p = argv.find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const RACES = Number(argVal("races", "50"));
const DUR = Number(argVal("dur", "60"));
const JOBS = Number(
  argVal("jobs", String(Math.max(1, (cpus().length || 4) - 2))),
);
const NO_COMMIT = argv.includes("--no-commit");
const SCRATCH =
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch");
const OUTBASE = join(SCRATCH, "roster-matrix");
const DATADIR = join(ROOT, "reports/evolution/roster-matrix-data");
mkdirSync(OUTBASE, { recursive: true });
mkdirSync(DATADIR, { recursive: true });

// ── racer surfaceClasses (racer-types/*.js) ──
const SURFACES = {
  beetle: ["asphalt", "cobble", "earth"],
  boarder: ["asphalt", "cobble", "earth"],
  buggy: ["sand", "earth", "mud"],
  dolphin: ["water"],
  dragon: ["air", "asphalt", "earth", "water"],
  duck: ["water", "grass"],
  elephant: ["sand", "earth", "grass"],
  f1: ["asphalt"],
  giraffe: ["sand", "earth", "grass"],
  horse: ["sand", "earth", "grass", "asphalt", "snow", "mud"],
  koi: ["water"],
  luge: ["ice", "snow"],
  manta: ["water"],
  motorbike: ["asphalt", "earth"],
  plane: ["air"],
  rocket: ["air", "water"],
  snail: ["grass"],
  snake: ["sand", "earth", "grass"],
  snowmobile: ["snow", "ice", "earth"],
  turtle: ["water"],
};
const TEN = [
  "city-circuit",
  "dirt-oval",
  "garden-path",
  "ice-track",
  "luger-hill",
  "mountainstreet",
  "river-run",
  "searound",
  "seatrack",
  "space-sprint",
];
const seed = (id) =>
  JSON.parse(
    readFileSync(join(ROOT, "server/seeds/tracks", `${id}.json`), "utf8"),
  );
const TRACKS = argVal("tracks", TEN.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((id) => {
    const s = seed(id);
    return {
      id,
      surf: s.surfaceClasses,
      closed: !!s.closed,
      racers: s.closed ? 40 : 60,
    };
  });
const intersects = (a, b) => a.some((x) => b.includes(x));

// band zones for rowMin (B1 1-5, B2 6-15, B3 16-25, B4 26-40, B5 41+)
const BE = [5, 15, 25, 40];
const zi = (r) => {
  for (let i = 0; i < BE.length; i++) if (r <= BE[i]) return i;
  return BE.length;
};

function pExec(file, args) {
  return new Promise((res, rej) => {
    execFile(file, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 }, (err) =>
      err ? rej(err) : res(),
    );
  });
}

async function runCell(track, type) {
  const out = join(OUTBASE, `${track.id}__${type}`);
  await pExec(process.execPath, [
    "scripts/sim-fairness.mjs",
    `--track=${track.id}`,
    `--racer=${type}`,
    "--seed=1",
    `--races=${RACES}`,
    `--racers=${track.racers}`,
    `--dur=${DUR}`,
    "--hero-map",
    "--runaway-parade",
    `--out=${out}`,
  ]);
  const hm = JSON.parse(readFileSync(join(out, "hero-map.json"), "utf8"));
  const fd = JSON.parse(readFileSync(join(out, "fairness-data.json"), "utf8"));
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
    /* observer optional */
  }
  return {
    type,
    bandReach: hm.fairness?.bandReach ?? null,
    rowMin,
    holm: hm.fairness?.startRowUnfair ? "UNF" : "ok",
    runaway,
  };
}

// eligible cells, grouped by track
const plan = TRACKS.map((t) => ({
  track: t,
  types: Object.keys(SURFACES).filter((ty) => intersects(SURFACES[ty], t.surf)),
})).filter((g) => g.types.length > 0);
const totalCells = plan.reduce((n, g) => n + g.types.length, 0);
console.log(
  `ROSTER-MATRIX-1: ${plan.length} tracks, ${totalCells} eligible cells, N=${RACES} dur=${DUR}s jobs=${JOBS}`,
);

// simple promise pool over ALL cells; collect per-track; commit a track when all its cells are in.
const results = {}; // track.id → { ...meta, cells: [] }
for (const g of plan)
  results[g.track.id] = {
    track: g.track.id,
    closed: g.track.closed,
    surfaces: g.track.surf,
    expected: g.types.length,
    cells: [],
  };
const queue = [];
for (const g of plan)
  for (const ty of g.types) queue.push({ track: g.track, type: ty });

let done = 0;
async function worker() {
  while (queue.length) {
    const { track, type } = queue.shift();
    const t0 = Date.now();
    try {
      const r = await runCell(track, type);
      results[track.id].cells.push(r);
      console.log(
        `[${++done}/${totalCells}] ${track.id}/${type}: arrival=${r.bandReach == null ? "?" : (r.bandReach * 100).toFixed(1) + "%"} rowMin=${(r.rowMin * 100).toFixed(0)}% ${r.holm} runaway=${r.runaway == null ? "?" : (r.runaway * 100).toFixed(0) + "%"} (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
      );
    } catch (e) {
      results[track.id].cells.push({ type, error: String(e).slice(0, 200) });
      console.log(
        `[${++done}/${totalCells}] ${track.id}/${type}: ERROR ${String(e).slice(0, 120)}`,
      );
    }
    // commit a track when complete
    const R = results[track.id];
    if (R.cells.length === R.expected) {
      R.cells.sort((a, b) => a.type.localeCompare(b.type));
      const file = join(DATADIR, `${track.id}.json`);
      writeFileSync(file, JSON.stringify(R, null, 2));
      if (!NO_COMMIT) {
        try {
          execFileSync("git", ["add", file], { cwd: ROOT });
          execFileSync(
            "git",
            [
              "commit",
              "-q",
              "-m",
              `data(roster-matrix): ${track.id} eligible-cell arrivals (ROSTER-MATRIX-1)`,
            ],
            { cwd: ROOT },
          );
          console.log(`  committed ${track.id}.json (${R.cells.length} cells)`);
        } catch (e) {
          console.log(`  commit skipped: ${String(e).slice(0, 80)}`);
        }
      }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, worker));
console.log("DONE — all eligible cells measured.");
