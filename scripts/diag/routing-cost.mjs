// ENGINE-REACH-DATA-FIX-1 — what the widened routing COSTS, over real commits.
//
// The brief forbids "run everything on every change", so the widening has to be priced rather than
// asserted. For each of the last N commits this replays the routing decision twice — with the
// data-reach extension and without it — and reports which guards are newly selected and what they
// cost in wall clock.
//
// It changes nothing and runs no guard; the durations are a fixed table of measured costs, named
// here so the arithmetic is visible rather than hidden in a spreadsheet.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "../lib/routing.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const N = Number(arg("commits", "40"));

// MEASURED WALL CLOCK, seconds, from this branch's own verify runs and GATE-SERIAL-BCRYPT-1.
// Anything not named here is treated as 2 s, which is the observed cost of the cheap guards.
const COST = {
  "server-suite": 40,
  "script-suite": 50,
  "client-suite": 200,
  "world-fingerprint": 229,
  "camera-fingerprint": 60,
  "render-fingerprint": 60,
  "ceremony-counts": 300,
  "engine-reach-doc": 3,
  "fingerprint-containment": 12,
  "check-writable": 6,
  "check-language-closed": 6,
  "check-config-claims": 4,
};
const costOf = (id) => COST[id] ?? 2;

const { guards } = collect();

/** `matches` with the data-reach extension removed, i.e. the routing as it was before this piece. */
function matchesOld(g, f) {
  if (g.everything) return true;
  if ((g.notDirs ?? []).some((p) => f.startsWith(p))) return false;
  if (new Set(g.files).has(f)) return true;
  return (g.dirs ?? []).some((p) => f.startsWith(p));
}
const matchesNew = (g, f) => g.matches(f);

const shas = execFileSync("git", ["log", `-${N}`, "--format=%H"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

let commitsChanged = 0;
let addedSeconds = 0;
const addedBy = {};
const rows = [];

for (const sha of shas) {
  let files;
  try {
    files = execFileSync("git", ["show", "--name-only", "--format=", sha], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    continue;
  }
  if (!files.length) continue;

  const oldSel = guards.filter((g) => files.some((f) => matchesOld(g, f))).map((g) => g.id);
  const newSel = guards.filter((g) => files.some((f) => matchesNew(g, f))).map((g) => g.id);
  const added = newSel.filter((id) => !oldSel.includes(id));
  if (!added.length) continue;

  commitsChanged++;
  const secs = added.reduce((s, id) => s + costOf(id), 0);
  addedSeconds += secs;
  for (const id of added) addedBy[id] = (addedBy[id] ?? 0) + 1;
  rows.push({
    sha: sha.slice(0, 8),
    files: files.length,
    added,
    secs,
    sample: files[0],
  });
}

process.stdout.write(`OVER THE LAST ${shas.length} COMMITS\n\n`);
process.stdout.write(
  `  commits whose selection CHANGES : ${commitsChanged} of ${shas.length} ` +
    `(${((commitsChanged / shas.length) * 100).toFixed(1)}%)\n`
);
process.stdout.write(
  `  total added wall clock          : ${addedSeconds} s over ${shas.length} commits ` +
    `(mean ${(addedSeconds / shas.length).toFixed(1)} s per commit)\n\n`
);
process.stdout.write("  guards newly selected, and on how many commits:\n");
for (const [id, n] of Object.entries(addedBy).sort((a, b) => b[1] - a[1]))
  process.stdout.write(`    ${id.padEnd(26)} ${String(n).padStart(3)} commit(s)  ×${costOf(id)}s\n`);

process.stdout.write("\n  the commits that change, newest first:\n");
for (const r of rows.slice(0, 20))
  process.stdout.write(
    `    ${r.sha}  +${String(r.secs).padStart(3)}s  ${r.added.join(", ")}  ← ${r.sample}\n`
  );
