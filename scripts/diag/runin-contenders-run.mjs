// RUNIN-CONTENDERS-1 sweep driver. Report-only.
// Shards by (track, field size) and runs a pool sized from the machine's own core count.
import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const OUT = "c:/tmp/runin-contenders";
mkdirSync(OUT, { recursive: true });

const TRACKS = [
  "city-circuit",
  "dirt-oval",
  "garden-path",
  "ice-track",
  "searound",
  "luger-hill",
  "mountainstreet",
  "river-run",
  "seatrack",
  "space-sprint",
];
const SEEDS = [1, 2, 3, 9, 42, 777, 2024, 9888];
const SIZES = [20, 40];

const cells = [];
for (const t of TRACKS) for (const n of SIZES) cells.push({ track: t, racers: n });

// The project's own convention: min(16, cores - 2). 14 logical cores here -> 12.
const POOL = Math.max(1, Math.min(16, cpus().length - 2));
console.log(`cores ${cpus().length} -> pool ${POOL} | ${cells.length} shards, ${SEEDS.length} seeds each`);

const done = (c) =>
  SEEDS.every((s) => existsSync(`${OUT}/${c.track}-${c.racers}-${s}.json`));

let next = 0;
let finished = 0;
const t0 = Date.now();

function runOne(c) {
  return new Promise((res) => {
    if (done(c)) {
      res();
      return;
    }
    const p = spawn(
      process.execPath,
      [
        join(ROOT, "scripts", "diag", "runin-contenders.mjs"),
        `--track=${c.track}`,
        `--racers=${c.racers}`,
        `--seeds=${SEEDS.join(",")}`,
        `--out=${OUT}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      finished++;
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(
        `[${finished}/${cells.length}] ${c.track}-${c.racers} exit=${code} ${secs}s` +
          (code !== 0 ? ` ERR ${err.slice(0, 200)}` : "")
      );
      res();
    });
  });
}

async function worker() {
  while (next < cells.length) {
    const c = cells[next++];
    await runOne(c);
  }
}

await Promise.all(Array.from({ length: POOL }, worker));
console.log(`all shards done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
