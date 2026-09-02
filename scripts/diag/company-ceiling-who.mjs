// AIM-ROOM-CEILING-1 — ON THE FRAMES WHERE THE COMPANY PROMISE IS BROKEN, WHICH CEILING WON?
// MEASURE ONLY. Nothing is changed, no setting is swept, no fingerprint is in reach.
//
// THE QUESTION. AIM-ROOM-WIRING-1 leaves a residual company shortfall (space-sprint 4.90% against
// 3.49% at N=300). The owner asks whether raising the OVERVIEW setting would recover those
// companions. That cannot be read off the code: `_companyCeiling` carries no retirement clause, so
// it is not obviously bounded by OVERVIEW at all, and reasoning across from `_fieldCeiling`'s
// retirement is exactly the mistake this measurement exists to avoid making twice.
//
// WHAT IS RECORDED, and only on the frames that matter. A frame is a SHORTFALL when fewer racers
// are in the DELIVERED frame than `minRacersVisible` promises AND at least that many were still
// running — a race with four left cannot show five, and counting that would be a lie. On those
// frames, and no others, this records every term of the composition:
//
//   `guaranteed = min(state, guarantee, company, field, line)`   (`CameraDirector.js` ~4672)
//
// and reports which term is the argmin, plus how far it sits below `company`. If COMPANY is the
// winner and the shot is still too tight, the geometry is short and no setting recovers it. If
// something ELSE wins, that term is the fetter and the gap is the size of it.
//
// TWO CARE POINTS, both learned the hard way in this repository:
//   1. `_framingProbe.binding` is NOT trusted. It is overwritten to 'level' further down, and a
//      standing finding records that it lies on scheduled frames. The argmin is recomputed here from
//      `_framingProbe.ceilings`, and the probe's own label is recorded ALONGSIDE so the two can be
//      compared rather than one being assumed.
//   2. SCHEDULED frames are counted separately, never pooled. While the endgame schedule composes,
//      the other authorities stand down by design and `guaranteed` is the schedule alone — so "which
//      ceiling won" has a different meaning there and mixing the two would average a real answer
//      with a category error.
//
// Usage:
//   node scripts/diag/company-ceiling-who.mjs --tracks=space-sprint --racers=20 --seeds=30 --floor=360
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
// Stated explicitly, never inherited: the shipped default moved during this arc, and an arm that
// inherits it silently becomes a copy of the other arm.
const FLOOR = Number(arg("floor", "360"));
const FROM_U = Number(arg("from", "0.10"));

// CAUSATION TEST, NOT A SWEEP. `--overview-mult=` scales OVERVIEW's own `visibleCorridors` so the
// question "does the owner's OVERVIEW setting reach these frames at all" can be answered by running
// rather than by reading the code. It is deliberately a MULTIPLIER and not a value: this instrument
// is not looking for a better setting, only for whether the setting is connected. 1 = untouched.
const OV_MULT = Number(arg("overview-mult", "1"));
// A FLAG THAT DOES NOTHING MUST SAY SO. `leaderAimRoomFloorPx` exists only on the aim-room branch;
// on master this script still runs and still measures a real shortfall, but `--floor=` reaches
// nothing and the result is master's picture rather than the floor's. That is precisely the trap
// this arc has now hit twice — an arm silently becoming a copy of another — so it is refused loudly
// instead of being discovered in a table.
if (!("leaderAimRoomFloorPx" in DEFAULT_CAMERA_CONFIG) && FLOOR !== 0) {
  process.stderr.write(
    `REFUSED: --floor=${FLOOR} was given, but this tree's camera config has no ` +
      `leaderAimRoomFloorPx key, so the flag would reach nothing and the numbers would be the ` +
      `unfloored picture wearing a floored label. Run with --floor=0, or run on a tree that has the key.\n`
  );
  process.exit(2);
}
const CFG = { ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR };
if (OV_MULT !== 1) {
  const prof = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  CFG.cameraStateProfiles = {
    ...prof,
    OVERVIEW: {
      ...prof.OVERVIEW,
      visibleCorridors: prof.OVERVIEW.visibleCorridors * OV_MULT,
    },
  };
}
const PROMISE = CFG.minRacersVisible;
const TERMS = ["state", "guarantee", "company", "field", "line"];
const geos = new Map(loadTracks().map((g) => [g.id, g]));

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(4) : "inf");

for (const track of TRACKS) {
  const geo = geos.get(track);
  if (!geo) {
    process.stderr.write(`no track ${track}\n`);
    continue;
  }
  let frames = 0,
    shortfall = 0,
    scheduledShort = 0;
  const winner = Object.create(null); // argmin name -> count, unscheduled shortfall frames
  const probeSaid = Object.create(null); // what _framingProbe.binding claimed
  const gapToCompany = []; // ln(company) - ln(argmin), i.e. how much tighter the fetter is
  let companyInfinite = 0;

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
      if (!p || !p.ceilings) return;
      const running = st.racers.filter((r) => !r.finished);
      if (running.length < PROMISE) return;

      // THE DELIVERED FRAME, in screen space exactly as the renderer computes it.
      const effX = cd._proj.effX(cd.zoom),
        effY = cd._proj.effY(cd.zoom);
      const inShot = running.filter((r) => {
        const sx = r.x * effX + cd.offsetX;
        const sy = r.y * effY + cd.offsetY;
        return sx >= 0 && sx <= p.frameW && sy >= 0 && sy <= p.frameH;
      }).length;

      frames++;
      if (inShot >= PROMISE) return; // the promise is kept on this frame
      shortfall++;
      if (p.scheduled) {
        scheduledShort++;
        return; // the schedule is the sole author here; the min has a different meaning
      }

      const c = p.ceilings;
      if (!Number.isFinite(c.company)) companyInfinite++;
      let best = null;
      for (const k of TERMS) {
        const v = c[k];
        if (!Number.isFinite(v)) continue;
        if (best === null || v < c[best]) best = k;
      }
      if (best === null) return;
      winner[best] = (winner[best] ?? 0) + 1;
      probeSaid[p.binding] = (probeSaid[p.binding] ?? 0) + 1;
      if (Number.isFinite(c.company) && c[best] > 0 && c.company > 0) {
        gapToCompany.push(Math.log(c.company) - Math.log(c[best]));
      }
    });
  }

  const q = (a, pp) => {
    if (!a.length) return NaN;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(s.length * pp))];
  };
  const unsched = shortfall - scheduledShort;
  console.log(`\n=== ${track} — N=${SEEDS} races, floor=${FLOOR}, promise=${PROMISE} ===`);
  console.log(
    `frames=${frames}  shortfall=${shortfall} (${((100 * shortfall) / (frames || 1)).toFixed(2)}%)  ` +
      `of which SCHEDULED=${scheduledShort}  unscheduled=${unsched}`
  );
  console.log(`company ceiling was Infinity on ${companyInfinite} of the ${unsched} unscheduled`);
  console.log("WHICH TERM WON THE min, on unscheduled shortfall frames:");
  for (const k of TERMS) {
    const n = winner[k] ?? 0;
    if (n) console.log(`  ${k.padEnd(10)} ${String(n).padStart(7)}  ${((100 * n) / (unsched || 1)).toFixed(2)}%`);
  }
  console.log("what _framingProbe.binding CLAIMED (not trusted, recorded for comparison):");
  for (const [k, n] of Object.entries(probeSaid).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(k).padEnd(10)} ${String(n).padStart(7)}  ${((100 * n) / (unsched || 1)).toFixed(2)}%`);
  if (gapToCompany.length)
    console.log(
      `ln(company) - ln(winner):  p50=${fmt(q(gapToCompany, 0.5))}  p90=${fmt(q(gapToCompany, 0.9))}  ` +
        `max=${fmt(q(gapToCompany, 1))}   (0 = company IS the winner; larger = the fetter is that much tighter)`
    );
}
