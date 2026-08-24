// LATE-LEAD-HUNT-1 sweep driver. Report-only. Pool sized from the machine's own core count.
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
const OUT = arg("out", `c:/tmp/late-lead-hunt/p${PHASE}`);
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

const shards = [];
if (PHASE === "1") {
  // WHERE HE SAW IT, FIRST AND DEEPEST: dirt-oval at 20, 240 seeds in chunks of 20.
  for (let s = 1; s <= 240; s += 20)
    shards.push({ track: "dirt-oval", racers: 20, from: s, to: s + 19 });
} else {
  // Then every other track, both field sizes, 60 seeds each.
  for (const t of ALL)
    for (const n of [20, 40]) {
      if (t === "dirt-oval" && n === 20) continue; // phase 1 covered it far deeper
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
        join(ROOT, "scripts", "diag", "late-lead-hunt.mjs"),
        `--track=${c.track}`,
        `--racers=${c.racers}`,
        `--from=${c.from}`,
        `--to=${c.to}`,
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
          (code !== 0 ? ` ERR ${err.slice(0, 160)}` : "")
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
