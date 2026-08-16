import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const census = new Map();
for (const geo of loadTracks()) {
  const identity = resolveIdentity({ racers: 20, raceSeed: 9, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "binding census" });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd, st }) => {
    if (!(st.finishT > 0)) return;
    const b = cd._framingProbe?.binding;
    if (b) census.set(b, (census.get(b) ?? 0) + 1);
  }, { slowmo: true });
}
console.log([...census.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k} ${n}`).join("\n"));
