// LADDER-VALIDATION-1 sweep. 10 tracks x 2 arms, N=100, field size by topology.
// Per-cell output files so no two workers can lose each other's writes; a cell already
// complete is SKIPPED and never recomputed.
import { spawn } from "child_process";
import { mkdirSync, existsSync, appendFileSync } from "fs";
const ROOT = "c:/tmp/night-sweep";
const OUT = "c:/tmp/night-sweep-out";
const LOG = `${OUT}/sweep.log`;
mkdirSync(OUT, { recursive: true });

// Topology + default racer read from source (server/data/tracks/*.json `closed`,
// surfaced as EditorShape.isOpen = !track.closed).
const TRACKS = [
  { id: "city-circuit",   racer: "motorbike", closed: true  },
  { id: "dirt-oval",      racer: "horse",     closed: true  },
  { id: "garden-path",    racer: "snail",     closed: true  },
  { id: "ice-track",      racer: "snowmobile",closed: true  },
  { id: "searound",       racer: "manta",     closed: true  },
  { id: "luger-hill",     racer: "luge",      closed: false },
  { id: "mountainstreet", racer: "boarder",   closed: false },
  { id: "river-run",      racer: "duck",      closed: false },
  { id: "seatrack",       racer: "dolphin",   closed: false },
  { id: "space-sprint",   racer: "rocket",    closed: false },
];
const ARMS = [
  { id: "shipped", flags: [] },
  { id: "middle",  flags: ["--pulkChallengerBoost=0.12"] },
];
const N = 100;

const cells = [];
for (const t of TRACKS) for (const a of ARMS) cells.push({ t, a });
// Longest first: open tracks carry 80 racers and dominate wall clock.
cells.sort((x, y) => (x.t.closed === y.t.closed ? 0 : x.t.closed ? 1 : -1));

const label = (c) => `lv1-${c.a.id}-${c.t.id}`;
const done = (c) =>
  existsSync(`${ROOT}/results/action-metrics/am-${label(c)}.json`) &&
  existsSync(`${OUT}/${label(c)}/hero-map.json`);

const say = (s) => { console.log(s); appendFileSync(LOG, s + "\n"); };
const POOL = 8;
let next = 0, fin = 0;
const t0 = Date.now();
const total = cells.length;
say(`SWEEP START ${total} cells, pool ${POOL}, N=${N}`);

function launch() {
  if (next >= cells.length) return Promise.resolve();
  const c = cells[next++];
  const lb = label(c);
  if (done(c)) { fin++; say(`[skip] ${lb} already complete`); return launch(); }
  const out = `${OUT}/${lb}`;
  mkdirSync(out, { recursive: true });
  const racers = c.t.closed ? 40 : 80;
  const args = ["scripts/sim-fairness.mjs", `--races=${N}`, "--dur=60", "--seed=1",
    `--racers=${racers}`, `--track=${c.t.id}`, `--racer=${c.t.racer}`,
    "--action-metrics", "--hero-map", "--brake-depth",
    `--diagLabel=${lb}`, `--out=${out}`, ...c.a.flags];
  const s = Date.now();
  return new Promise((res) => {
    const p = spawn("node", args, { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
    let err = ""; p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      fin++;
      const dur = ((Date.now() - s) / 1000).toFixed(0);
      const el = ((Date.now() - t0) / 60000).toFixed(1);
      say(`[${el}m] ${fin}/${total} ${lb} (${racers}r) exit=${code} in ${dur}s${code ? " ERR:" + err.slice(0, 250) : ""}`);
      res();
    });
  }).then(launch);
}
await Promise.all(Array.from({ length: POOL }, launch));
say(`SWEEP DONE in ${((Date.now() - t0) / 60000).toFixed(1)}m`);
