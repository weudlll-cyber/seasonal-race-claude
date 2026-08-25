// RUNIN-CHANCE-SET-1 sweep driver. MEASURE ONLY. Pool sized from the machine's own cores.
//
// THE SAME CORPUS AS RUNIN-LEVEL-SET-BUILD-1, deliberately: this block exists to put a chance-based
// membership beside the one-length build on the races that build was judged on, and a different
// corpus would make the two incomparable.
//
// Four arms per race (off / len / chance / union), so a shard is four races' work.
import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const PHASE = arg("phase", "2");
const OUT = arg("out", `c:/tmp/chance-set/p${PHASE}`);
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
// line. Their per-frame series is kept in full so each can be answered on its own.
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

// RUNIN-LEVEL-SET-BUILD-1 section 14's hit list — every race with a single-frame width step over
// 0.4 ln under the one-length build. The eighteen LATE ones are what this block has to move.
const HIT_LIST = [
  "space-sprint-20-1",
  "seatrack-20-53",
  "mountainstreet-20-32",
  "mountainstreet-20-24",
  "luger-hill-40-33",
  "seatrack-20-16",
  "luger-hill-40-47",
  "seatrack-20-35",
  "river-run-20-13",
  "mountainstreet-20-15",
  "river-run-20-8",
  "seatrack-20-7",
  "river-run-20-18",
  "seatrack-40-13",
  "city-circuit-20-7",
  "ice-track-20-22",
  "searound-40-56",
  "river-run-20-23",
  "mountainstreet-20-25",
  "luger-hill-40-21",
  "city-circuit-20-34",
  "searound-20-45",
  "seatrack-20-18",
  "searound-20-54",
  "river-run-20-1",
  "river-run-20-58",
  "dirt-oval-20-171",
];
const TRACE = [...new Set([...HIS_TWELVE, ...HIT_LIST])].join(",");

const shards = [];
if (PHASE === "1") {
  for (let s = 1; s <= 240; s += 20)
    shards.push({ track: "dirt-oval", racers: 20, from: s, to: s + 19 });
} else {
  for (const t of ALL)
    for (const n of [20, 40]) {
      if (t === "dirt-oval" && n === 20) continue;
      for (let s = 1; s <= 60; s += 10) shards.push({ track: t, racers: n, from: s, to: s + 9 });
    }
}

const POOL = Math.max(1, Math.min(12, cpus().length - 2));
let next = 0;
let done = 0;
const t0 = Date.now();

function launch() {
  if (next >= shards.length) return null;
  const s = shards[next++];
  const p = spawn(
    process.execPath,
    [
      join(ROOT, "scripts/diag/chance-set.mjs"),
      `--track=${s.track}`,
      `--racers=${s.racers}`,
      `--from=${s.from}`,
      `--to=${s.to}`,
      `--out=${OUT}`,
      `--trace=${TRACE}`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => {
    done++;
    const el = Math.round((Date.now() - t0) / 1000);
    process.stdout.write(
      `[${done}/${shards.length}] ${s.track}-${s.racers}-${s.from}_${s.to} code=${code} ${el}s` +
        `${err ? ` ERR ${err.slice(0, 200)}` : ""}\n`
    );
    const nx = launch();
    if (!nx && done === shards.length) process.stdout.write(`ALL DONE in ${el}s -> ${OUT}\n`);
  });
  return p;
}

process.stdout.write(`shards ${shards.length}, pool ${POOL}, cores ${cpus().length}\n`);
for (let i = 0; i < POOL; i++) launch();
