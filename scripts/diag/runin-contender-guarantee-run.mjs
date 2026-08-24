// RUNIN-CONTENDER-GUARANTEE-1 sweep driver. MEASURE ONLY. Pool sized from the machine's own cores.
//
// THE SAME SEEDS AND TRACKS AS LATE-LEAD-HUNT-1, deliberately: this block's whole purpose is to put
// the proposed width beside the shot those races actually got, and a different corpus would make the
// two incomparable.
import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const PHASE = arg("phase", "1");
const OUT = arg("out", `c:/tmp/runin-cg/p${PHASE}`);
mkdirSync(OUT, { recursive: true });

const ALL = [
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

// HIS TWELVE — every race LATE-LEAD-AXIS-1 found with the winner off frame ACROSS the track at the
// line — plus nothing else. Their per-frame series is kept in full so each can be answered on its
// own rather than in aggregate.
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
const TRACE = HIS_TWELVE.join(",");

const shards = [];
if (PHASE === "1") {
  for (let s = 1; s <= 240; s += 20)
    shards.push({ track: "dirt-oval", racers: 20, from: s, to: s + 19 });
} else {
  for (const t of ALL)
    for (const n of [20, 40]) {
      if (t === "dirt-oval" && n === 20) continue;
      shards.push({ track: t, racers: n, from: 1, to: 60 });
    }
}

const POOL = Math.max(1, Math.min(16, cpus().length - 2));
console.log(`cores ${cpus().length} -> pool ${POOL} | phase ${PHASE}: ${shards.length} shards`);

let next = 0;
let done = 0;
const t0 = Date.now();

function runOne(c) {
  return new Promise((res) => {
    const p = spawn(
      process.execPath,
      [
        join(ROOT, "scripts", "diag", "runin-contender-guarantee.mjs"),
        `--track=${c.track}`,
        `--racers=${c.racers}`,
        `--from=${c.from}`,
        `--to=${c.to}`,
        `--trace=${TRACE}`,
        `--out=${OUT}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      done++;
      console.log(
        `[${done}/${shards.length}] ${out.trim() || c.track} ${((Date.now() - t0) / 1000).toFixed(0)}s` +
          (code !== 0 ? ` ERR ${err.slice(0, 200)}` : "")
      );
      res();
    });
  });
}

async function worker() {
  while (next < shards.length) await runOne(shards[next++]);
}
await Promise.all(Array.from({ length: POOL }, worker));
console.log(`phase ${PHASE} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
