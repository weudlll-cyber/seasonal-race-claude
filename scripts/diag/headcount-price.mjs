// COMPANY-HEADCOUNT-1 — WHAT THE CORRECTED HEADCOUNT COSTS THE PICTURE. MEASURE ONLY.
//
// The company guarantee deducted one racer unconditionally, under a premise that stopped being true
// when CAMERA-LATERAL-1 moved the anchor to the track centreline (AIM-ROOM-LOST-1). Corrected, it
// asks for the number it promises — and it therefore becomes the binding term far more often and
// widens the picture past the LEADER_ZOOM setting the owner chose. This prices that, per track.
//
// WHAT IS RECORDED, per mid-race LEADER_ZOOM frame, in the SAME shape as the aim-room instruments so
// the two arcs are comparable:
//   THE PROMISE   racers actually inside the delivered frame, against the configured minimum.
//   THE PRICE     the delivered cam.zoom, so the widening between arms is a distribution and not
//                 just a median. Frames align between arms by (seed, frame), so the comparison is
//                 per-frame rather than aggregate-to-aggregate.
//   STEADINESS    centreline share, largest single-frame pan between ADJACENT frames, and CORNER
//                 OVERFLOW tested on the leader's four drawn corners — the same test aim-levers.mjs
//                 uses, so a repair that keeps the promise and makes the camera restless shows up.
//   THE CONTROL   frame counts, which must stay identical between arms: this moves the PICTURE and
//                 must not move the RACE.
//
// It writes one JSON per (track, arm) and a companion summariser reads them. READ-ONLY: it drives the
// real director through the shared harness and reads the delivered frame; no engine file is touched.
//
// Usage:
//   node scripts/diag/headcount-price.mjs --track=space-sprint --seeds=30 --tag=before --out=c:/tmp/hc
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
  formatIdentity,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACK = arg("track", "space-sprint");
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "30"));
const OUT = arg("out", "c:/tmp/hc");
const TAG = arg("tag", "before");
const FROM_U = Number(arg("from", "0.10"));

// The arm is the TREE, not a flag: this instrument measures whichever `companyGuarantee` is on disk.
// Nothing here can switch the behaviour, which is deliberate — a flag that silently reached nothing
// is the trap this arc has already hit twice.
const CFG = { ...DEFAULT_CAMERA_CONFIG };
const PROMISE = CFG.minRacersVisible;
const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
if (!geo) {
  process.stderr.write(`no track ${TRACK}\n`);
  process.exit(1);
}
const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);

const races = [];
let identityLine = "";
for (let s = 1; s <= SEEDS; s++) {
  const identity = resolveIdentity({
    trackId: TRACK,
    raceSeed: s,
    racers: N,
    racerType: TRACK_DEFAULT_RACER,
  });
  identityLine = formatIdentity(identity);
  const race = buildRace(geo, identity, CFG);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = race.cd._endgameThreshold ?? 0.95;
  const rows = [];
  let prevOff = null;
  runRace(race, identity, CFG, ({ cd, st, frame }) => {
    const fp = cd._framingProbe;
    if (!fp || cd.state !== "LEADER_ZOOM") return;
    let leader = null;
    for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
    if (!leader) return;
    const uNow = leader.t / (st.finishT ?? 1);
    if (uNow < FROM_U || uNow >= END_U) return;
    if (fp.runInActive || cd._inFinishMode) return;

    const effX = proj.effX(cd.zoom);
    const effY = proj.effY(cd.zoom);
    const sx = leader.x * effX + cd.offsetX;
    const sy = leader.y * effY + cd.offsetY;

    // THE PROMISE: how many live racers are in the delivered frame.
    const running = st.racers.filter((r) => !r.finished);
    const inShot = running.filter((r) => {
      const x = r.x * effX + cd.offsetX;
      const y = r.y * effY + cd.offsetY;
      return x >= 0 && x <= CW && y >= 0 && y <= CH;
    }).length;

    // CORNER OVERFLOW — the leader's four drawn corners, exactly as aim-levers.mjs tests them.
    const hs = cd._headingScreen(leader.t);
    const hl = hs ? Math.hypot(hs.x, hs.y) : 0;
    let clipped = false;
    if (hl > 0) {
      const ux = hs.x / hl;
      const uy = hs.y / hl;
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;
      for (const p of [-1, 1])
        for (const q of [-1, 1]) {
          const px = sx + ux * halfLen * p - uy * halfWid * q;
          const py = sy + uy * halfLen * p + ux * halfWid * q;
          if (px < 0 || px > CW || py < 0 || py > CH) clipped = true;
        }
    }

    const camStep =
      prevOff === null
        ? null
        : Math.hypot(cd.offsetX - prevOff.x, cd.offsetY - prevOff.y);
    prevOff = { x: cd.offsetX, y: cd.offsetY };

    rows.push({
      frame,
      inShot,
      running: running.length,
      zoom: +cd.zoom.toFixed(6),
      binding: fp.binding,
      clipped,
      camStep: camStep === null ? null : +camStep.toFixed(3),
      leaderExtra: Number.isFinite(cd._lastLeaderLateralExtra)
        ? +cd._lastLeaderLateralExtra.toFixed(2)
        : 0,
    });
  });
  races.push({ seed: s, rows });
}

mkdirSync(OUT, { recursive: true });
const path = join(OUT, `hc-${TRACK}-${TAG}.json`);
writeFileSync(
  path,
  JSON.stringify({ track: TRACK, tag: TAG, racers: N, seeds: SEEDS, promise: PROMISE, identity: identityLine, races })
);
const all = races.flatMap((r) => r.rows);
process.stdout.write(
  `${TRACK.padEnd(15)} ${TAG.padEnd(7)} races=${SEEDS} frames=${all.length} ` +
    `short=${all.filter((r) => r.inShot < PROMISE && r.running >= PROMISE).length} ` +
    `clipped=${all.filter((r) => r.clipped).length}\n`
);
