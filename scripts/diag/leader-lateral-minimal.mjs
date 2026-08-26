// LEADER-LATERAL-MINIMAL-1 — the owner's rule, measured before anything is built. MEASURE ONLY.
//
// THE RULE (the owner, 2026-08-26): the camera stays on the corridor centreline; it steps aside
// laterally ONLY when the leader would otherwise be cut, and only as far as needed; as soon as he
// fits from the centreline again it returns. On a lead change the same rule applies — if the new
// leader fits from the centreline, the camera does not chase him.
//
// ── MEASURED FROM THE DELIVERED FRAME, NOT FROM A RECONSTRUCTION ──────────────────────────────
//
// The first version of this probe rebuilt the centreline shot itself — place `afterBias` at
// `anchorScreenPoint` and read the leader off that. IT WAS WRONG, and measurably so: that placement
// misses the director's own target offset by a median 132 px, because `_setTrackTargets` does more
// than put the anchor at the aim point. It reported a 62% engage rate against a 27.6% clip rate on
// the same race — a camera the director never builds.
//
// So the need is solved from THE FRAME AS DRAWN. That is ground truth, it is the same picture the
// known clip rates were measured on, and today's camera IS the centreline shot to within its own
// small lateral shift (`_lastLateralShift`, recorded per frame so the claim can be checked rather
// than assumed).
//
// ── WHY THE NEED IS SOLVED AND NOT SEARCHED ───────────────────────────────────────────────────
//
// Shifting the anchor along the track perpendicular by `d` world px moves every other world point on
// screen by `−v·d`, where `v = (perp.x·effX, perp.y·effY)`. Each of the leader's four body corners
// then has to satisfy `0 ≤ p.x − v.x·d ≤ CW` and `0 ≤ p.y − v.y·d ≤ CH` — eight linear inequalities
// in one unknown. Intersect them and the answer is exact: an interval of admissible `d`, or nothing.
//
// ONE OVER-ESTIMATE IS BAKED IN AND IS STATED RATHER THAN HIDDEN: the delivered frame still carries
// the pan smoother's residual trailing, measured at a median 61 px on clipped frames by
// LEADER-LAG-TRUTH-1. A converged camera would need slightly less than these numbers say.
//
//   * interval contains 0  → HE ALREADY FITS from the centreline. The rule does nothing. This is
//                            the frame count question (a) turns on.
//   * interval excludes 0  → the minimal step is the interval endpoint nearest zero. Signed, so the
//                            direction is recorded too, and (d) can difference it frame to frame.
//   * interval EMPTY       → no lateral movement of any size fits him, because he is being lost
//                            ALONG the track, not across it. That is the residual (f) asks for, and
//                            it is computed rather than argued.
//
// Also recorded per frame: `leaderLateral`, the leader's own displacement from the centreline. That
// is the excursion a camera that simply FOLLOWED him would carry every frame, and it is the number
// the rule has to beat — if the minimal step is not meaningfully smaller, the rule buys nothing over
// following him and (b) has to say so.
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
const OUT = arg("out", "c:/tmp/lat");
const TAG = arg("tag", "lat");
const FROM_U = Number(arg("from", "0.10"));

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
    // The BROWSER derives the camera seed from the race seed — a fixed seed here would be a
    // different camera from the one the owner watches (see the harness-seed correction).
    cameraSeed: cameraSeedForRace(c.seed),
    note: "leader-lateral-minimal (browser camera seed)",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;

  const rows = [];
  let prevLeaderIdx = null;
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp) return;
      const state = cd.state;
      if (state !== "LEADER_ZOOM" && state !== "LEAD_CHANGE") return;
      const racers = st.racers;
      let leader = null;
      for (const r of racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;

      const h = cd._headingScreen(leader.t);
      const hw = cd._headingAt(leader.t);
      const centre = cd._centrelineAt(leader.t);
      if (!h || !hw || !centre) return;
      const L = Math.hypot(h.x, h.y);
      const LW = Math.hypot(hw.x, hw.y);
      if (!(L > 0) || !(LW > 0)) return;
      const ux = h.x / L;
      const uy = h.y / L;
      const frac = cd._forwardFracNow();
      const at = anchorScreenPoint(CW, CH, frac, h);
      if (!at) return;

      // The delivered zoom is what the frame is DRAWN at, so the box test uses it.
      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;

      // The track perpendicular in WORLD space, and what one world px along it is worth on screen.
      const perp = { x: -hw.y / LW, y: hw.x / LW };
      const vx = perp.x * effX;
      const vy = perp.y * effY;

      // The leader's own displacement from the centreline — what a FOLLOWING camera would carry.
      const leaderLateral = (leader.x - centre.x) * perp.x + (leader.y - centre.y) * perp.y;

      // The leader's four body corners AS DRAWN.
      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;
      const corners = [];
      for (const a of [-1, 1])
        for (const b of [-1, 1])
          corners.push({
            x: sx + ux * halfLen * a - uy * halfWid * b,
            y: sy + uy * halfLen * a + ux * halfWid * b,
          });

      // Eight linear inequalities in d. `lo`/`hi` accumulate the admissible interval.
      let lo = -Infinity;
      let hi = Infinity;
      let feasible = true;
      const bound = (p, v, max) => {
        // 0 <= p - v*d <= max
        if (Math.abs(v) < 1e-12) {
          if (p < -1e-9 || p > max + 1e-9) feasible = false;
          return;
        }
        const e1 = (p - max) / v; // p - v*d <= max
        const e2 = p / v; //          p - v*d >= 0
        const a = Math.min(e1, e2);
        const b = Math.max(e1, e2);
        if (a > lo) lo = a;
        if (b < hi) hi = b;
      };
      for (const p of corners) {
        bound(p.x, vx, CW);
        bound(p.y, vy, CH);
      }
      if (lo > hi + 1e-9) feasible = false;

      const fitsFromCentre = feasible && lo <= 1e-9 && hi >= -1e-9;
      // The minimal step: the admissible endpoint nearest zero. Signed.
      const needD = !feasible ? null : fitsFromCentre ? 0 : lo > 0 ? lo : hi;

      // `fitsFromCentre` and "does not clip today" are now the SAME question asked twice, which is
      // the point — it makes the cross-check against the published clip rates exact.
      const clippedToday = !fitsFromCentre;

      const leadChanged = prevLeaderIdx !== null && leader.index !== prevLeaderIdx;
      prevLeaderIdx = leader.index;

      rows.push({
        frame,
        state,
        fitsFromCentre,
        feasible,
        needD: needD === null ? null : +needD.toFixed(2),
        leaderLateral: +leaderLateral.toFixed(2),
        // What the same step costs on SCREEN, so (b) can be read as a share of the frame.
        needPx: needD === null ? null : +Math.abs(needD * Math.hypot(vx, vy)).toFixed(1),
        clippedToday,
        leadChanged,
        // Today's own lateral shift, for the comparison in (b) — the mechanism already exists, it
        // simply does not have the leader in its subject list.
        todayShift: Number.isFinite(cd._lastLateralShift) ? +cd._lastLateralShift.toFixed(2) : null,
        halfLen: +halfLen.toFixed(1),
        halfWid: +halfWid.toFixed(1),
        zoom: +cd.zoom.toFixed(5),
        trackWidth: cd._trackWidthPx ?? null,
      });
    },
    { slowmo: false }
  );

  out.push({ case: c, identity: formatIdentity(identity), frames: rows.length, rows });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} frames=${rows.length} engage=${rows.filter((r) => !r.fitsFromCentre).length} infeasible=${rows.filter((r) => !r.feasible).length}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/lat-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/lat-${TAG}.json\n`);
