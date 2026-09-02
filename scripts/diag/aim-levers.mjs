// AIM-LEVERS-1 — the two levers, measured side by side on the same frames. MEASURE ONLY.
//
// ARMS. `off` is the shipped picture and every other arm is read against it AT THE SAME N.
//   off        both keys at their defaults
//   a          leaderBodyAspectMax = 2.5            (rocket 2.881 and giraffe 2.830 only)
//   b<px>      leaderAimRoomFloorPx = <px>          (binds only where the chord is short)
//   ab<px>     both
//
// BOTH SIDES OF EVERY ARM, because a lever that removes clipping and costs steadiness is a finding
// and not a success:
//   THE FAULT      clipped frames AND clipped EPISODES. The residual is runs of frames — a per-frame
//                  reading overstates any change. Episodes are runs of ADJACENT recorded frames.
//   THE TOLERANCE  `aimAhead - halfLen` against the gap the tolerance has to cover, per frame, so
//                  "does tolerance now exceed the gap" is answerable rather than argued.
//   STEADINESS     the share of frames the camera holds the centreline, the picture's largest
//                  single-frame movement, and corner overflow.
//
// LEVER A IS SET THROUGH THE SAME FUNCTION THE SPRITE IS DRAWN WITH (`setBodyLongAxisMaxRatio`),
// which is the point of the lever: capping only the number the director reasons with would shrink
// the measured clipping without shrinking the clipping.
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
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);
const { projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);
const { cameraSeedForRace } = await import(
  u("client/src/modules/camera/cameraSeed.js")
);
const { anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { setBodyLongAxisMaxRatio, resetBodyLongAxisMaxRatio } = await import(
  u("client/src/modules/racer-types/SpriteRacerType.js")
);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACK = arg("track", "space-sprint");
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "30"));
const OUT = arg("out", "c:/tmp/lev");
const FROM_U = Number(arg("from", "0.10"));
// Arm spec: aspect cap (null = off) and room floor (0 = off).
const ASPECT = arg("aspect", null);
const FLOOR = Number(arg("floor", "0"));
const TAG = arg("tag", "off");

const CFG =
  FLOOR > 0
    ? { ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR }
    : DEFAULT_CAMERA_CONFIG;

const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
if (!geo) {
  process.stderr.write(`no track ${TRACK}\n`);
  process.exit(1);
}

// THE CAP GOES IN BEFORE THE RACE IS BUILT, because `createRaceFromIdentity` derives
// `drawnBodyLengthPx` through it — exactly as RaceScreen does it.
if (ASPECT === null) resetBodyLongAxisMaxRatio();
else setBodyLongAxisMaxRatio(Number(ASPECT));

const races = [];
let identityLine = "";

for (let s = 1; s <= SEEDS; s++) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: s,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(s),
    note: `aim-levers ${TAG}`,
  });
  const race = buildRace(geo, identity, CFG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;
  identityLine = formatIdentity(identity);

  const rows = [];
  let prevOff = null;
  runRace(
    race,
    identity,
    CFG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp || cd.state !== "LEADER_ZOOM") return;
      let leader = null;
      for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;

      const hs = cd._headingScreen(leader.t);
      const hl = hs ? Math.hypot(hs.x, hs.y) : 0;
      if (!(hl > 0)) return;
      const ux = hs.x / hl;
      const uy = hs.y / hl;
      const at = anchorScreenPoint(
        CW,
        CH,
        cd._forwardFracNow(),
        hs,
        cd._leaderAimRoomFloorPx ?? 0,
      );
      if (!at) return;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;
      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;

      const ahead = Math.min(
        ux > 1e-12 ? (CW - at.x) / ux : Infinity,
        ux < -1e-12 ? at.x / -ux : Infinity,
        uy > 1e-12 ? (CH - at.y) / uy : Infinity,
        uy < -1e-12 ? at.y / -uy : Infinity,
      );

      // CORNER OVERFLOW — the fault, tested on the real four corners as drawn.
      let clipped = false;
      for (const p of [-1, 1])
        for (const q of [-1, 1]) {
          const px = sx + ux * halfLen * p - uy * halfWid * q;
          const py = sy + uy * halfLen * p + ux * halfWid * q;
          if (px < 0 || px > CW || py < 0 || py > CH) clipped = true;
        }

      const camStep =
        prevOff === null
          ? null
          : Math.hypot(cd.offsetX - prevOff.x, cd.offsetY - prevOff.y);
      prevOff = { x: cd.offsetX, y: cd.offsetY };

      rows.push({
        frame,
        clipped,
        halfLen: +halfLen.toFixed(2),
        aimAhead: Number.isFinite(ahead) ? +ahead.toFixed(2) : null,
        gap: +Math.hypot(sx - at.x, sy - at.y).toFixed(2),
        leaderExtra: Number.isFinite(cd._lastLeaderLateralExtra)
          ? +cd._lastLeaderLateralExtra.toFixed(2)
          : 0,
        totalShift: Number.isFinite(cd._lastLateralShift)
          ? +cd._lastLateralShift.toFixed(2)
          : 0,
        camStep: camStep === null ? null : +camStep.toFixed(2),
        frac: +(cd._forwardFracNow() ?? 0).toFixed(4),
      });
    },
    { slowmo: false },
  );
  races.push({ seed: s, rows });
}
resetBodyLongAxisMaxRatio();

mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/lev-${TRACK}-${TAG}.json`,
  JSON.stringify({
    track: TRACK,
    tag: TAG,
    aspect: ASPECT,
    floor: FLOOR,
    racers: N,
    seeds: SEEDS,
    identity: identityLine,
    races,
  }),
);
const all = races.flatMap((r) => r.rows);
process.stdout.write(
  `${TRACK} ${TAG} races=${races.length} frames=${all.length} clipped=${all.filter((r) => r.clipped).length}\n`,
);
