// MARGIN-PER-TRACK-1 — the margin does TWO jobs, so one run must measure BOTH. MEASURE ONLY.
//
// ALONG-RESIDUAL-1 established that 2,500 of the 3,330 frames the director declines are the shipped
// 90 px margin rather than unreachable geometry, and that 1,841 of those are space-sprint alone. The
// 90 itself was read off a knee (LEADER-LATERAL-BUILD-1) measured on ONE seed per track and mostly on
// space-sprint. This probe asks whether the margin should be per-track — and it cannot answer that
// from the residual alone.
//
// ── WHY ONE INSTRUMENT AND NOT TWO ─────────────────────────────────────────────────────────────
//
// `leaderLateralMarginPx` is the gate on the leader's lateral guarantee. Lowering it does two things
// AT ONCE and in opposite directions:
//
//   · it ADMITS frames the director used to decline — the residual falls;
//   · it makes the promise closer to the frame edge, where the pan smoother's trailing breaks it
//     before the frame is drawn — clipping returns, and the rule fires on more frames, which is
//     motion.
//
// A sweep that reported only the first would recommend 0. LEADER-LATERAL-BUILD-1's own table is the
// proof: at margin 0 space-sprint seed 6 clips on 608 frames and at 90 on 71. So every arm here is
// measured on BOTH axes IN THE SAME RUN, at the same N, against a margin-90 arm run identically.
//
// ── THE MARGIN IS APPLIED TO THE DIRECTOR, NOT TO THE MEASUREMENT ──────────────────────────────
//
// `along-residual.mjs --margin=` overrides the number the PROBE tests with while the director still
// runs at 90; that is right for asking "how much of today's residual is the margin's doing", and
// wrong for asking "what would shipping a different margin look like". Here the value goes into the
// camera config, so the camera actually moves differently and the steadiness axis has something to
// measure. The residual is then read at the run's OWN margin, because the residual is by definition
// the set of frames THAT director declines.
//
// ── THE CONTROL THAT KEEPS THE SWEEP HONEST ────────────────────────────────────────────────────
//
// `residual0` is the same test at margin 0 — no lateral move of any size fits his body. That is
// geometry, not policy, and it should stay roughly flat across the arms. If it moved with the margin
// the probe would be measuring its own feedback loop rather than the picture.
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
const { lateralAdmissibleForBody } = await import(
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
const SEED0 = Number(arg("seed0", "1"));
// The arm. Omitted, the shipped value is left alone and this is the baseline arm.
const MARGIN = arg("margin", null);
const OUT = arg("out", "c:/tmp/mar");
const TAG = arg("tag", MARGIN === null ? "ship" : `m${MARGIN}`);
const FROM_U = Number(arg("from", "0.10"));

const CFG =
  MARGIN === null
    ? DEFAULT_CAMERA_CONFIG
    : {
        ...DEFAULT_CAMERA_CONFIG,
        cameraStateProfiles: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
          LEADER_ZOOM: {
            ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
            leaderLateralMarginPx: Number(MARGIN),
          },
        },
      };

const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
if (!geo) {
  process.stderr.write(`no track ${TRACK}\n`);
  process.exit(1);
}

const races = [];
let identityLine = "";
let marginUsed = null;

for (let s = SEED0; s < SEED0 + SEEDS; s++) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: s,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(s),
    note: `margin-both-axes margin=${MARGIN ?? "shipped"}`,
  });
  const race = buildRace(geo, identity, CFG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;
  marginUsed = cd._leaderLateralMarginPx;
  identityLine = formatIdentity(identity);

  const rows = [];
  let prevOff = null;
  runRace(
    race,
    identity,
    CFG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp) return;
      // ALONG-RESIDUAL-1's filter exactly, so the baseline arm reproduces its numbers and the sweep
      // is read against a figure that has already been published.
      if (cd.state !== "LEADER_ZOOM") return;
      let leader = null;
      for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;

      const hs = cd._headingScreen(leader.t);
      const hw = cd._headingAt(leader.t);
      if (!hs || !hw) return;
      const hl = Math.hypot(hs.x, hs.y);
      const hwl = Math.hypot(hw.x, hw.y);
      if (!(hl > 0) || !(hwl > 0)) return;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const ux = hs.x / hl;
      const uy = hs.y / hl;
      const perp = { x: -hw.y / hwl, y: hw.x / hwl };
      const vx = perp.x * effX;
      const vy = perp.y * effY;

      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;
      const body = { cx: sx, cy: sy, ux, uy, halfLen, halfWid };

      // THE DIRECTOR'S OWN DECISION, at the margin THIS run is being flown with.
      const a = lateralAdmissibleForBody(
        body,
        vx,
        vy,
        CW,
        CH,
        cd._leaderLateralMarginPx,
      );
      // The geometry-only control — must not move with the arm.
      const a0 = lateralAdmissibleForBody(body, vx, vy, CW, CH, 0);

      // CORNER OVERFLOW: the leader's drawn body leaving the frame rectangle. This is the fault the
      // lateral rule exists to remove, so it is the cost side of the trade read directly.
      let clipped = false;
      for (const p of [-1, 1])
        for (const q of [-1, 1]) {
          const px = sx + ux * halfLen * p - uy * halfWid * q;
          const py = sy + uy * halfLen * p + ux * halfWid * q;
          if (px < 0 || px > CW || py < 0 || py > CH) clipped = true;
        }

      // THE PICTURE'S OWN MOVEMENT — how far a fixed world point slides on screen between frames.
      // Differenced in the summariser against the PREVIOUS ROW ONLY when the two are adjacent
      // frames, because a state cut is not a pan (LEADER-LATERAL-BUILD-1's instrument defect).
      const camStep =
        prevOff === null
          ? null
          : Math.hypot(cd.offsetX - prevOff.x, cd.offsetY - prevOff.y);
      prevOff = { x: cd.offsetX, y: cd.offsetY };

      rows.push({
        frame,
        u: +uNow.toFixed(4),
        residual: !(a.lo <= a.hi),
        residual0: !(a0.lo <= a0.hi),
        clipped,
        // The leader rule's OWN contribution this frame. Zero = the camera held the centreline as
        // far as this rule is concerned, which is the owner's rule stated as one number.
        leaderExtra: Number.isFinite(cd._lastLeaderLateralExtra)
          ? +cd._lastLeaderLateralExtra.toFixed(2)
          : 0,
        totalShift: Number.isFinite(cd._lastLateralShift)
          ? +cd._lastLateralShift.toFixed(2)
          : 0,
        camStep: camStep === null ? null : +camStep.toFixed(2),
      });
    },
    { slowmo: false },
  );
  races.push({ seed: s, rows });
}

mkdirSync(OUT, { recursive: true });
const payload = {
  track: TRACK,
  racers: N,
  seeds: SEEDS,
  seed0: SEED0,
  margin: marginUsed,
  identity: identityLine,
  races,
};
writeFileSync(`${OUT}/ma-${TRACK}-${TAG}.json`, JSON.stringify(payload));
const all = races.flatMap((r) => r.rows);
process.stdout.write(
  `${TRACK} margin=${marginUsed} races=${races.length} frames=${all.length}` +
    ` residual=${all.filter((r) => r.residual).length}` +
    ` residual0=${all.filter((r) => r.residual0).length}` +
    ` clipped=${all.filter((r) => r.clipped).length}\n`,
);
