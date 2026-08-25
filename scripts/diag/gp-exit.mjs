// GARDEN-PATH-NO-FINISH-1 (a) — what the REAL harness path does, through raceDriver's own runRace.
// Not inferred from empty output: the exit state is read directly.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.slice(k.length + 3) : d; };
const ONLY = arg("track", "garden-path");
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "3"));

for (const geo of loadTracks().filter((g) => g.id === ONLY)) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const identity = resolveIdentity({ racers: N, raceSeed: seed, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "gp-exit" });
    const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
    let frames = 0;
    let lastTs = 0;
    runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ st, ts }) => { frames++; lastTs = ts; }, { slowmo: true });
    const st = race.st;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    const ranked = st.racers.filter((r) => r.finishRank > 0);
    console.log(
      `${geo.id} n=${N} seed=${seed}: frames=${frames} finishedCount=${st.finishedCount}/${N} ` +
      `leaderT=${maxT.toFixed(4)}/${st.finishT} (${((100 * maxT) / st.finishT).toFixed(1)}% of the race) ` +
      `racers with a finishRank=${ranked.length} -> harness returns ${ranked.length ? "a result" : "NULL (the race is DISCARDED)"}`
    );
  }
}
