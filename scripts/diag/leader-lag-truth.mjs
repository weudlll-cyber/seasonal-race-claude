// LEADER-LAG-TRUTH-1 — is the mid-race clipping the tracking lag's tail? MEASURE ONLY.
//
// LEADER-WHOLE-SETBACK-BUILD-1 reversed the working theory: solved from the leader's INTENDED
// placement the setback never engaged once, because at the point the framing rule puts him HE
// ALREADY FITS. So the question is no longer where he is put. It is how far behind the camera runs.
//
// ── THE THREE QUANTITIES, AND WHY ALL THREE ARE NEEDED ─────────────────────────────────────────
//
//   THE AIM      `anchorScreenPoint(W, H, forwardFrac, heading)` — where the framing rule wants the
//                subject, in screen px. This is the intent.
//   THE ARRIVAL  the leader's actual screen position under the delivered camera. The gap between
//                them, decomposed on the heading, is the SUBJECT LAG — what puts him at the edge.
//   THE BODY     half his drawn length along the heading. He clips when the body outruns the room
//                the aim left him, so the split between "lag ate the room" and "the body never fit"
//                is the question (d) exists to answer, and it is computed here per frame rather than
//                argued: `bodyAloneClips` is true when he would clip WITH A PERFECT CAMERA.
//
// Also recorded: the CAMERA's own lag (target offset against delivered offset), which is the same
// story one level up, and the correlates a fix would be aimed at — speed, heading turn, zoom.
//
// `--tracking-tc=` overrides LEADER_ZOOM's `trackingTC`, the key that governs how fast the camera
// catches up, so question (e) can be PRICED by sweeping it. Omitting it leaves the shipped defaults.
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
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { projectionForTrack } = await import(u("client/src/modules/camera/projection.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));
const { anchorScreenPoint } = await import(u("client/src/modules/camera/framingRule.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const CASES = (arg("cases", "space-sprint:20:6") || "")
  .split(",")
  .filter(Boolean)
  .map((s) => {
    const [track, n, seed] = s.split(":");
    return { track, racers: Number(n), seed: Number(seed) };
  });
const OUT = arg("out", "c:/tmp/lag");
const TAG = arg("tag", "lag");
const FROM_U = Number(arg("from", "0.10"));
const TC = arg("tracking-tc", null);
// `focalSmoothTc` is the SECOND smoother — world-space, on the anchor itself, ahead of the pan. It is
// a top-level key, not a per-state profile, which is why the per-state `trackingTC` sweep could not
// reach it and why the gap it opens is a WORLD distance that zoom multiplies onto the screen.
const FTC = arg("focal-tc", null);
const CFG = TC
  ? {
      ...DEFAULT_CAMERA_CONFIG,
      cameraStateProfiles: {
        ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
        LEADER_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
          trackingTC: Number(TC),
        },
      },
    }
  : DEFAULT_CAMERA_CONFIG;
const CFG2 = FTC === null ? CFG : { ...CFG, focalSmoothTc: Number(FTC) };

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const out = [];

for (const c of CASES) {
  const geo = tracks.get(c.track);
  if (!geo) {
    process.stderr.write(`no track ${c.track}\n`);
    continue;
  }
  const identity = resolveIdentity({
    racers: c.racers,
    raceSeed: c.seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(c.seed),
    note: "leader-lag-truth (browser camera seed)",
  });
  const race = buildRace(geo, identity, CFG2);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;

  const rows = [];
  let prevT = null;
  let prevAng = null;
  // The PICTURE's own motion: how far a fixed world point slides on screen from one frame to the
  // next, and how much that slide CHANGES. A faster camera buys a smaller lag by moving the picture
  // harder, so pricing question (e) means reading these two numbers, not only the clip rate.
  let prevOff = null;
  let prevStep = null;
  runRace(
    race,
    identity,
    CFG2,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp || cd.state !== 'LEADER_ZOOM') return;
      const racers = st.racers;
      let leader = null;
      for (const r of racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;

      const h = cd._headingScreen(leader.t);
      const L = h ? Math.hypot(h.x, h.y) : 0;
      if (!(L > 0)) return;
      const ux = h.x / L;
      const uy = h.y / L;
      const frac = cd._forwardFracNow();
      const at = anchorScreenPoint(CW, CH, frac, h);
      if (!at) return;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;

      // WHERE THE GAP LIVES. The `trackingTC` sweep refused to close the gap the smoother's own
      // closed form said it would, so the gap has to be SPLIT before it can be named:
      //   AIM -> TARGET      where the leader would sit if the camera were exactly ON its target.
      //                      Anything here is the framing rule's own doing — a subject that is not
      //                      the leader, a clamp, a guarantee — and no camera speed touches it.
      //   TARGET -> DELIVERED the smoother trailing. THIS is the part `trackingTC` governs.
      const txs = leader.x * effX + cd.targetOffsetX;
      const tys = leader.y * effY + cd.targetOffsetY;
      const aimToTarget = Math.hypot(txs - at.x, tys - at.y);
      const targetToArrival = Math.hypot(sx - txs, sy - tys);
      // WHICH AUTHORITY SPENDS IT. The probe records the anchor world point either side of the two
      // authorities that move it, which is exactly this question. Each is projected with the
      // DELIVERED camera and measured against where the aim wanted the leader.
      const scr = (P) => (P ? { x: P.x * effX + cd.offsetX, y: P.y * effY + cd.offsetY } : null);
      const gap = (P) => { const q = scr(P); return q ? +Math.hypot(q.x - at.x, q.y - at.y).toFixed(1) : null; };
      const gapAnchor = gap(fp.anchorPoint);
      const gapBias = gap(fp.afterBias);
      const gapLateral = gap(fp.afterLateral);
      // Is the anchor the LEADER at all? In world px — if this is large the shot is not on him.
      const anchorOffLeaderPx = fp.anchorPoint
        ? +Math.hypot(fp.anchorPoint.x - leader.x, fp.anchorPoint.y - leader.y).toFixed(1)
        : null;
      // The bias is sized with `effX(guaranteed)`; the frame is DRAWN at `cd.zoom`. If those differ
      // the forward bias lands the wrong size in screen px — a persistent error no camera speed fixes.
      const guaranteedZoom = fp.guaranteed ?? null;
      const zoomRatio = guaranteedZoom ? +(cd.zoom / guaranteedZoom).toFixed(4) : null;

      // THE SUBJECT LAG: arrival minus aim, split on the heading.
      const dx = sx - at.x;
      const dy = sy - at.y;
      const lagAlong = dx * ux + dy * uy;
      const lagAcross = -dx * uy + dy * ux;

      // Room the AIM leaves ahead of him, to the nearest edge along the heading. If his half-length
      // exceeds this, a PERFECT camera clips him too — that is `bodyAloneClips`.
      const roomTo = (px, py, sgn) =>
        Math.min(
          sgn * ux > 1e-12 ? (CW - px) / (sgn * ux) : Infinity,
          sgn * ux < -1e-12 ? px / -(sgn * ux) : Infinity,
          sgn * uy > 1e-12 ? (CH - py) / (sgn * uy) : Infinity,
          sgn * uy < -1e-12 ? py / -(sgn * uy) : Infinity
        );
      const aimAhead = roomTo(at.x, at.y, 1);
      const aimBehind = roomTo(at.x, at.y, -1);

      // Does the DELIVERED box cross an edge? Tested on the real four corners, not on a bound.
      const clipsAt = (cx, cy) => {
        for (const a of [-1, 1])
          for (const b of [-1, 1]) {
            const px = cx + ux * halfLen * a - uy * halfWid * b;
            const py = cy + uy * halfLen * a + ux * halfWid * b;
            if (px < 0 || px > CW || py < 0 || py > CH) return true;
          }
        return false;
      };
      const clipped = clipsAt(sx, sy);

      // HOW MUCH OF THE LAG HAS TO GO. Slide him back along the lag vector toward the aim and retest
      // on the same corners: `needScale` is the largest surviving share of today's lag. 0.6 means a
      // camera 40% tighter clears this frame; 0 means only a perfect camera does. This is the exact
      // requirement question (e) has to price, and it is measured, not extrapolated from a bound.
      let needScale = null;
      if (clipped) {
        needScale = 0;
        for (let i = 19; i >= 0; i--) {
          const s = i / 20;
          if (!clipsAt(at.x + dx * s, at.y + dy * s)) { needScale = s; break; }
        }
      }

      const dt = prevT === null ? null : leader.t - prevT;
      const ang = Math.atan2(uy, ux);
      let turn = null;
      if (prevAng !== null) {
        let d = ang - prevAng;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        turn = Math.abs(d);
      }
      prevT = leader.t;
      prevAng = ang;

      const camStep = prevOff === null ? null : Math.hypot(cd.offsetX - prevOff.x, cd.offsetY - prevOff.y);
      const camJerk = prevStep === null || camStep === null ? null : Math.abs(camStep - prevStep);
      prevOff = { x: cd.offsetX, y: cd.offsetY };
      prevStep = camStep;

      rows.push({
        frame,
        clipped,
        lagAlong: +lagAlong.toFixed(1),
        lagAcross: +lagAcross.toFixed(1),
        lagPx: +Math.hypot(dx, dy).toFixed(1),
        camLagPx: +Math.hypot(cd.targetOffsetX - cd.offsetX, cd.targetOffsetY - cd.offsetY).toFixed(1),
        halfLen: +halfLen.toFixed(1),
        halfWid: +halfWid.toFixed(1),
        aimAhead: Number.isFinite(aimAhead) ? +aimAhead.toFixed(1) : null,
        aimBehind: Number.isFinite(aimBehind) ? +aimBehind.toFixed(1) : null,
        // WOULD A PERFECT CAMERA CLIP HIM? The aim's own room against his own half-body.
        bodyAloneClips:
          Number.isFinite(aimAhead) && Number.isFinite(aimBehind)
            ? halfLen > aimAhead || halfLen > aimBehind
            : null,
        speedT: dt === null ? null : +(dt * 1e5).toFixed(3),
        turnRad: turn === null ? null : +turn.toFixed(5),
        needScale,
        aimToTarget: +aimToTarget.toFixed(1),
        targetToArrival: +targetToArrival.toFixed(1),
        gapAnchor, gapBias, gapLateral, anchorOffLeaderPx, guaranteedZoom, zoomRatio,
        camStep: camStep === null ? null : +camStep.toFixed(2),
        camJerk: camJerk === null ? null : +camJerk.toFixed(3),
        zoom: +cd.zoom.toFixed(5),
        frac: frac === null ? null : +frac.toFixed(4),
      });
    },
    { slowmo: false }
  );

  out.push({ case: c, identity: formatIdentity(identity), focalSmoothTc: CFG2.focalSmoothTc, trackingTC: TC ? Number(TC) : DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC, frames: rows.length, rows });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} LEADER_ZOOM=${rows.length} clipped=${rows.filter((r) => r.clipped).length}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/lag-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/lag-${TAG}.json\n`);
