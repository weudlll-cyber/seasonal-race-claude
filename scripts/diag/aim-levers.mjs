// AIM-ROOM — the room floor, measured against the picture without it. MEASURE ONLY.
//
// AIM-ROOM-SHIP-1 (2026-09-02) REMOVED LEVER A, the body aspect cap, so this instrument now has one
// lever rather than two. The `--aspect=` flag and the `a`/`ab` arms are GONE, not defaulted off:
// the exports they drove (`setBodyLongAxisMaxRatio`) no longer exist, and a flag that silently does
// nothing is how a harness comes to report that a lever has no effect. AIM-LEVERS-1 holds the
// side-by-side numbers as they were measured, on the tree that still had both.
//
// ARMS. `off` is the pre-ship picture and every other arm is read against it AT THE SAME N.
//   off        leaderAimRoomFloorPx = 0             (the picture before 2026-09-02)
//   b<px>      leaderAimRoomFloorPx = <px>          (binds only where the chord is short)
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
// THE ARM IS SET BY CAMERA CONFIG ONLY. This lever moves the PICTURE and not the race: the frame
// count is identical between arms, which is the property that makes an off-vs-on comparison here a
// comparison of two framings of the SAME races.
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
const FLOOR = Number(arg("floor", "0"));
const TAG = arg("tag", "off");

// THE KEY IS ALWAYS SET EXPLICITLY, and that is a correction rather than a style choice.
// This read `FLOOR > 0 ? {...override} : DEFAULT_CAMERA_CONFIG` while the shipped default was 0, so
// "off" and "the default" were the same object and the shortcut was invisible. AIM-ROOM-SHIP-1 moved
// the default to 360 — and the `off` arm silently became a SECOND copy of the shipped arm. The first
// ten-track sweep run that way returned bit-identical clip counts on all ten tracks, which reads
// exactly like "the lever does nothing" and is in fact "the instrument measured one arm twice".
// An arm must state its own value; it must never inherit one from a default that can move.
const CFG = { ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR };

const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
if (!geo) {
  process.stderr.write(`no track ${TRACK}\n`);
  process.exit(1);
}

// THE CAP GOES IN BEFORE THE RACE IS BUILT, because `createRaceFromIdentity` derives
// `drawnBodyLengthPx` through it — exactly as RaceScreen does it.

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

mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/lev-${TRACK}-${TAG}.json`,
  JSON.stringify({
    track: TRACK,
    tag: TAG,
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
