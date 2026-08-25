// GARDEN-PATH-NO-FINISH-1 (d) — every track's OWN realized duration against the harness ceiling.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CEILING_S = 200; // scripts/lib/raceDriver.mjs runRace: `ts - raceStart < 200000`
const rows = [];
for (const geo of loadTracks()) {
  for (const n of [20, 40]) {
    const identity = resolveIdentity({ racers: n, raceSeed: 1, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "gp-dur" });
    try {
      const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
      const d = race.meta.realizedDurationSec;
      rows.push({ track: geo.id, n, racer: race.racerTypeId, mult: race.racerType.getSpeedMultiplier(),
        closed: !!geo.closed, dur: d, margin: CEILING_S - d, pct: (100 * d) / CEILING_S });
    } catch (e) { rows.push({ track: geo.id, n, err: String(e).slice(0, 60) }); }
  }
}
console.log(`THE HARNESS CEILING IS ${CEILING_S} s of race time (raceDriver.mjs runRace).`);
console.log("track            n  racer        mult  closed  realizedDuration  margin to ceiling   % of ceiling");
for (const r of rows.sort((a, b) => (b.dur ?? 0) - (a.dur ?? 0))) {
  if (r.err) { console.log(`${r.track.padEnd(15)} ${String(r.n).padStart(2)}  ERROR ${r.err}`); continue; }
  const flag = r.dur >= CEILING_S ? "  <-- OVER THE CEILING" : r.pct > 70 ? "  <-- within 30%" : "";
  console.log(`${r.track.padEnd(15)} ${String(r.n).padStart(2)}  ${r.racer.padEnd(11)} ${String(r.mult).padStart(4)}  ${String(r.closed).padStart(6)}  ${r.dur.toFixed(1).padStart(14)} s  ${r.margin.toFixed(1).padStart(15)} s  ${r.pct.toFixed(1).padStart(9)}%${flag}`);
}
