// RUNIN-LEVEL-SET-BUILD-1 §14 — WHERE IN THE RACE THE WIDTH STEP HAPPENS, and what it looks like.
//
// WHY THIS RE-RUNS ANYTHING AT ALL. The built-code sweep stored per-race AGGREGATES — it has
// `maxStepLn` per race, which is enough to RANK the hit list, and it has no per-frame series, so it
// cannot say WHEN the step happens, how big the shot is either side of it, or whether it comes back.
// Those three are the whole of what the owner needs in order to watch for it. So the hit list is
// taken from disk and only the races ON that list are re-run.
//
// It changes nothing and reads the shot the director actually composes.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { projectionForTrack } = await import(u("client/src/modules/camera/projection.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CH = 720;

const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.slice(k.length + 3) : d; };
const CASES = (arg("cases", "") || "").split(",").filter(Boolean).map((s) => {
  const [track, n, seed] = s.split(":");
  return { track, racers: Number(n), seed: Number(seed) };
});
const OUT = arg("out", "c:/tmp/level-step-when");

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const rows = [];

for (const c of CASES) {
  const geo = tracks.get(c.track);
  if (!geo) continue;
  const identity = resolveIdentity({ racers: c.racers, raceSeed: c.seed, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "level-step-when" });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  // THE SHOT'S OWN UNIT: world px across the SHORT screen axis, which is what `visibleCorridors`
  // is defined against. A viewer sees this get bigger when the shot widens.
  const visibleWorldPx = (z) => (z > 0 ? CH / (z * proj.axisY) : 0);

  const series = [];
  runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd }) => {
    const fp = cd._framingProbe;
    if (!fp || !fp.runInActive) return;
    series.push({ u: cd._runInProgress ?? 0, z: fp.guaranteed, bound: !!fp.levelBound, set: fp.levelSetSize ?? 0 });
  }, { slowmo: true });
  if (series.length < 3) continue;

  // The largest single-frame move, in log space, and WHERE it is.
  let best = { d: 0, i: -1 };
  for (let i = 1; i < series.length; i++) {
    const d = Math.log(series[i].z / series[i - 1].z);
    if (Math.abs(d) > Math.abs(best.d)) best = { d, i };
  }
  const i = best.i;
  const before = series[i - 1];
  const after = series[i];
  const wBefore = visibleWorldPx(before.z);
  const wAfter = visibleWorldPx(after.z);
  const factor = wAfter / wBefore; // >1 = the shot WIDENED, everything on screen shrank by 1/factor

  // DOES IT COME BACK? The release is eased over `runInOpenMs`, so the width should return toward the
  // pre-step value. Measured as: frames until the visible width is back within 10% of `wBefore`.
  let recoverAt = null;
  for (let k = i + 1; k < series.length; k++) {
    const w = visibleWorldPx(series[k].z);
    if (Math.abs(w - wBefore) / wBefore <= 0.1) { recoverAt = k - i; break; }
  }
  rows.push({
    track: c.track, racers: c.racers, seed: c.seed,
    frames: series.length,
    stepLn: +Math.abs(best.d).toFixed(3),
    widened: best.d > 0,
    uAt: +after.u.toFixed(3),
    pctThroughClosing: Math.round(after.u * 100),
    worldBefore: Math.round(wBefore), worldAfter: Math.round(wAfter),
    factor: +factor.toFixed(2),
    shrinkTo: Math.round(100 / factor),
    setBefore: before.set, setAfter: after.set,
    recoverFrames: recoverAt,
    recoverSec: recoverAt === null ? null : +(recoverAt / 60).toFixed(2),
  });
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/steps.json`, JSON.stringify(rows, null, 1));
process.stdout.write(`measured ${rows.length} race(s)\n`);
