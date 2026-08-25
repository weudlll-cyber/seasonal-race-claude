// GARDEN-PATH-NO-FINISH-1 (a) — what "no finishing order" actually IS. Instrumented, not inferred.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, TRACK_DEFAULT_RACER, RT } from "../lib/raceDriver.mjs";
const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { stepRacePhysics, FIXED_DT } = await import(u("client/src/modules/raceCore.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.slice(k.length + 3) : d; };
const ONLY = arg("track", "garden-path");
const N = Number(arg("racers", "20"));

for (const geo of loadTracks().filter((g) => g.id === ONLY)) {
  const identity = resolveIdentity({ racers: N, raceSeed: 1, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "gp-repro" });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { st, raceCfg, meta, racerTypeId, racerType } = race;
  console.log(`track=${geo.id} racer=${racerTypeId} speedMultiplier=${racerType.getSpeedMultiplier()}`);
  console.log(`  pathLengthPx=${geo.pathLengthPx?.toFixed(1)} finishT=${st.finishT} laps=${geo.closed ? 2 : 1} requestedSeconds=${identity.seconds}`);
  console.log(`  meta: ${JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k,v])=>typeof v!=='object')))}`);
  // Drive the PHYSICS only, with no camera and NO wall-clock ceiling, and watch the leader.
  let ts = 0;
  let frames = 0;
  const marks = [];
  while (st.finishedCount < N && frames < 200000) {
    stepRacePhysics(st, raceCfg, FIXED_DT);
    ts += FIXED_DT * 1000;
    frames++;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    if (frames % 3600 === 0) marks.push({ simSec: +(ts / 1000).toFixed(0), leaderT: +maxT.toFixed(4), finished: st.finishedCount });
    if (marks.length > 14) break;
  }
  let maxT = 0;
  for (const r of st.racers) if (r.t > maxT) maxT = r.t;
  console.log(`  after ${frames} physics steps (${(ts/1000).toFixed(1)} s of RACE TIME): leaderT=${maxT.toFixed(4)} of finishT=${st.finishT}, finished=${st.finishedCount}/${N}`);
  for (const m of marks) console.log(`    ${String(m.simSec).padStart(5)}s  leaderT ${m.leaderT}  finished ${m.finished}`);
}
