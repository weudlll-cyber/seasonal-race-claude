// GARDEN-PATH-DEFAULTS-1 (b) and (c) — the duration the SETUP SCREEN would state, for every
// combination of the owner's two changes, beside the other closed tracks.
//
// It computes what the product computes: `buildRace` -> `meta.realizedDurationSec`, the same number
// `closed-track-estimated-duration` renders. Read-only; it changes nothing.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { trackDefaultLaps } = await import(u("client/src/modules/durationModel.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CEILING_S = 200; // scripts/lib/raceDriver.mjs runRace, untouched by this block

/** The realized duration for one track at a given racer and lap count. */
function durationFor(geo, racerType, laps) {
  const identity = resolveIdentity({
    racers: 20, raceSeed: 1, racerType, roster: ROSTER, note: "gp-defaults",
  });
  // `buildRace` takes laps from the shape; override the record it reads so a lap count can be asked
  // for without editing the file. Nothing here is written back.
  const race = buildRace({ ...geo, defaultLaps: laps, defaultRacerTypeId: racerType === TRACK_DEFAULT_RACER ? geo.defaultRacerTypeId : racerType }, identity, DEFAULT_CAMERA_CONFIG);
  // realizedDurationSec is per LAP-count; buildRace hardcodes 2 laps, so scale from the one it ran.
  return { per2: race.meta.realizedDurationSec, racer: race.racerTypeId };
}

const tracks = loadTracks();
const gp = tracks.find((g) => g.id === "garden-path");

console.log("=== (b) GARDEN-PATH, as the setup screen would state it ===");
console.log("racer      1 lap    2 laps   3 laps   4 laps   <- the default lap count is marked");
for (const racer of ["snail", "beetle"]) {
  const { per2 } = durationFor(gp, racer, 2);
  const perLap = per2 / 2;
  const cells = [1, 2, 3, 4].map((n) => `${Math.round(perLap * n)}s`);
  console.log(`${racer.padEnd(10)} ${cells.map((c) => c.padStart(7)).join("  ")}`);
}
console.log();
console.log("=== (c) WHAT EACH CHANGE CONTRIBUTES ON ITS OWN ===");
const perLapOf = (racer) => durationFor(gp, racer, 2).per2 / 2;
const snailLap = perLapOf("snail");
const beetleLap = perLapOf("beetle");
const rows = [
  ["TODAY        snail, 4 laps", snailLap * 4],
  ["one change   BEETLE, 4 laps", beetleLap * 4],
  ["one change   snail, 2 LAPS", snailLap * 2],
  ["BOTH         BEETLE, 2 LAPS", beetleLap * 2],
];
const today = rows[0][1];
for (const [label, secs] of rows) {
  console.log(
    `${label.padEnd(30)} ${Math.round(secs).toString().padStart(4)} s   ` +
      `x${(secs / today).toFixed(2)} of today   ` +
      `${secs <= CEILING_S ? "INSIDE" : "OVER  "} the ${CEILING_S}s harness ceiling`
  );
}
console.log();
console.log("=== the other CLOSED tracks, at their own defaults, for scale ===");
console.log("track            racer        laps   duration");
for (const g of tracks.filter((t) => t.closed)) {
  const laps = trackDefaultLaps(g);
  const { per2, racer } = durationFor(g, TRACK_DEFAULT_RACER, laps);
  console.log(
    `${g.id.padEnd(15)} ${racer.padEnd(12)} ${String(laps).padStart(4)}   ` +
      `${Math.round((per2 / 2) * laps).toString().padStart(4)} s`
  );
}
