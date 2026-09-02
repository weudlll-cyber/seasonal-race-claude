// AIM-ROOM-SHIP-1 — does the aim room floor break the company guarantee? MEASURE ONLY.
//
// THE QUESTION. `minRacersVisible` is a PROMISE: the shot is widened until at least that many
// racers are in it. The floor moves the leader BACK toward the centre of the frame, which by
// construction shows less of the road BEHIND him — and the pack behind him is exactly what the
// guarantee counts. Two unit tests in `framingRule.test.js` fail under the shipped floor with the
// guarantee asking for 3 and delivering 2, on a deliberately extreme synthetic fixture
// (`visibleCorridors: 0.5`). This asks the only question that decides whether that matters: on REAL
// races at the SHIPPED setting, does the delivered count fall below the promise more often with the
// floor on than with it off?
//
// WHAT IS COUNTED. Per mid-race LEADER_ZOOM frame, the number of racers whose CENTRE lies inside the
// delivered frame, against `minRacersVisible`. A frame is a SHORTFALL when fewer are in shot than
// the promise asks for AND there were at least that many racers left to show — a race with four
// racers still running cannot show five, and counting that as a broken promise would be a lie.
//
// READ-ONLY. It drives the real director through the shared harness and reads the delivered frame;
// no engine file is touched and nothing here can move a fingerprint.
//
// Usage:
//   node scripts/diag/company-under-floor.mjs --tracks=a,b --racers=20 --seeds=30 --floor=360
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACKS = (arg("tracks", "space-sprint") || "").split(",").filter(Boolean);
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "30"));
// Stated explicitly, never inherited from the default — the default MOVED in this very ship, and an
// arm that inherits it silently becomes a copy of the other arm.
const FLOOR = Number(arg("floor", "0"));
const FROM_U = Number(arg("from", "0.10"));

const CFG = { ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR };
const PROMISE = CFG.minRacersVisible;
const geos = new Map(loadTracks().map((g) => [g.id, g]));

const out = [];
for (const track of TRACKS) {
  const geo = geos.get(track);
  if (!geo) {
    process.stderr.write(`no track ${track}\n`);
    continue;
  }
  let frames = 0,
    shortfall = 0,
    worst = Infinity,
    sumIn = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const identity = resolveIdentity({
      trackId: track,
      raceSeed: s,
      racers: N,
      racerType: TRACK_DEFAULT_RACER,
    });
    const race = buildRace(geo, identity, CFG);
    runRace(race, identity, CFG, ({ cd, st }) => {
      if (cd.state !== "LEADER_ZOOM") return;
      const u0 = st.racers.reduce((m, r) => Math.max(m, r._cleanT ?? r.t), 0);
      if (u0 < FROM_U || u0 > 0.9) return;
      const p = cd._framingProbe;
      if (!p) return;
      // SCREEN SPACE, exactly as the renderer and `aim-levers.mjs` compute it:
      // sx = worldX * effX + offsetX. A first cut used `cd.x`/`cd.y` as a world camera centre;
      // those fields do not exist, so every racer read as out of shot and BOTH arms returned a
      // 100% shortfall with mean 0.00 — a silent zero that looked like a catastrophic finding.
      const effX = cd._proj.effX(cd.zoom),
        effY = cd._proj.effY(cd.zoom);
      const running = st.racers.filter((r) => !r.finished);
      if (running.length < PROMISE) return; // cannot show what is not there
      const inShot = running.filter((r) => {
        const sx = r.x * effX + cd.offsetX;
        const sy = r.y * effY + cd.offsetY;
        return sx >= 0 && sx <= p.frameW && sy >= 0 && sy <= p.frameH;
      }).length;
      frames++;
      sumIn += inShot;
      if (inShot < worst) worst = inShot;
      if (inShot < PROMISE) shortfall++;
    });
  }
  out.push({ track, frames, shortfall, worst, mean: sumIn / (frames || 1) });
  process.stdout.write(
    `${track.padEnd(15)} floor=${String(FLOOR).padStart(3)} frames=${String(frames).padStart(6)} ` +
      `shortfall=${String(shortfall).padStart(6)} (${((100 * shortfall) / (frames || 1)).toFixed(2)}%) ` +
      `worst=${worst === Infinity ? "-" : worst} mean=${(sumIn / (frames || 1)).toFixed(2)} promise=${PROMISE}\n`,
  );
}
