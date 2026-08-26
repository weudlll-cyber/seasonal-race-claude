// LEADER-WHOLE-SETBACK-1 — how much SETBACK would keep the leader whole? MEASURE ONLY.
//
// The owner's decision of 2026-08-26: when the leader does not fit, THE LEADER GIVES WAY — he moves
// back from his forward position — AND THE ZOOM STAYS. This measures the size of that move before
// anything is built, at the SHIPPED settings, because he has ruled out widening.
//
// ── THE ARITHMETIC, EXACTLY, AND WHY IT IS SOLVED RATHER THAN SEARCHED ─────────────────────────
//
// `anchorScreenPoint` places the subject at `centre + u * (forwardFrac - 0.5) * extent`, where `u` is
// the track's SCREEN heading and `extent = frameExtentAlong(u, W, H)`. So a change of `d` in
// `forwardFrac` moves him `d * extent` screen px along `u`, and pulling him BACK by `t` px is a
// reduction of `t / extent` in the fraction. That makes the two units the report needs the same
// quantity twice.
//
// For a pull-back of `t >= 0`, every corner `c` of his drawn box must satisfy
//     0 <= c.x - t*ux <= W        and        0 <= c.y - t*uy <= H
// Each of those is linear in `t`, so each contributes either a LOWER or an UPPER bound depending on
// the sign of `ux`/`uy`. The smallest workable pull-back is `max(0, max lowerBounds)`, and it is
// workable only if that does not exceed `min upperBounds`. Solved, not scanned: a scan would need a
// step size, and a step size is a number nobody chose.
//
// ── AND IT IS BACK-ONLY, ON PURPOSE ────────────────────────────────────────────────────────────
//
// He chose a SETBACK. A frame that could only be fixed by pushing him FORWARD is therefore NOT
// fixable by the mechanism he chose, and is counted as a residual rather than quietly solved with a
// sign flip. Those frames are reported separately with their reason, because a residual with a named
// cause is the useful kind.
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
const { frameExtentAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));
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
const OUT = arg("out", "c:/tmp/setback");
const TAG = arg("tag", "sb");
const FROM_U = Number(arg("from", "0.10"));
// HIS THREE STATES. OVERVIEW is included because he named it, and is reported apart because its
// framing is not LEADER_ZOOM's.
const STATES = new Set(["LEADER_ZOOM", "LEAD_CHANGE", "OVERVIEW"]);

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
    note: "leader-setback-need (browser camera seed, SHIPPED settings)",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;

  const rows = [];
  let frames = 0;
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp || !STATES.has(cd.state)) return;
      const racers = st.racers;
      let leader = null;
      for (const r of racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;
      frames++;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;
      const h = cd._headingScreen(leader.t);
      const L = h ? Math.hypot(h.x, h.y) : 0;
      if (!(L > 0)) return;
      const ux = h.x / L;
      const uy = h.y / L;
      const extent = frameExtentAlong(ux, uy, CW, CH);

      const halfLen = ((leader.drawnBodyLengthPx ?? 36) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 36) / 2) * effY;
      const corners = [];
      for (const a of [-1, 1])
        for (const b of [-1, 1])
          corners.push({
            x: sx + ux * halfLen * a - uy * halfWid * b,
            y: sy + uy * halfLen * a + ux * halfWid * b,
          });

      // Linear bounds on the pull-back t. See the header.
      let lo = 0;
      let hi = Infinity;
      const bound = (coord, dir, max) => {
        // 0 <= coord - t*dir  ->  t*dir <= coord
        if (dir > 1e-12) hi = Math.min(hi, coord / dir);
        else if (dir < -1e-12) lo = Math.max(lo, coord / dir);
        else if (coord < 0) hi = -Infinity; // parallel and already outside: unfixable this way
        // coord - t*dir <= max  ->  t*dir >= coord - max
        if (dir > 1e-12) lo = Math.max(lo, (coord - max) / dir);
        else if (dir < -1e-12) hi = Math.min(hi, (coord - max) / dir);
        else if (coord > max) hi = -Infinity;
      };
      for (const k of corners) {
        bound(k.x, ux, CW);
        bound(k.y, uy, CH);
      }
      const feasible = lo <= hi + 1e-9;
      const t = feasible ? Math.max(0, lo) : null;
      const clipped = lo > 1e-9 || !feasible;

      // WHY a frame is unfixable, named rather than lumped: either the fix would be a push FORWARD
      // (which the chosen mechanism cannot do), or he does not fit in the frame in ANY position.
      let residual = null;
      if (!feasible) {
        const spanAlong = 2 * halfLen;
        const spanAcross = 2 * halfWid;
        residual =
          spanAlong > extent || spanAcross > Math.min(CW, CH)
            ? "TOO BIG — does not fit the frame in any position"
            : "NEEDS A FORWARD MOVE — a back-only setback cannot fix it";
      }

      // Room ahead of him and behind him, along the heading, before any setback. A pull-back of `t`
      // adds `t` to the room ahead and takes `t` from the room behind, so both are derivable.
      const roomAhead = Math.min(
        ux > 1e-12 ? (CW - sx) / ux : Infinity,
        ux < -1e-12 ? sx / -ux : Infinity,
        uy > 1e-12 ? (CH - sy) / uy : Infinity,
        uy < -1e-12 ? sy / -uy : Infinity
      );
      const roomBehind = Math.min(
        ux > 1e-12 ? sx / ux : Infinity,
        ux < -1e-12 ? (CW - sx) / -ux : Infinity,
        uy > 1e-12 ? sy / uy : Infinity,
        uy < -1e-12 ? (CH - sy) / -uy : Infinity
      );

      rows.push({
        frame,
        state: cd.state,
        clipped,
        feasible,
        residual,
        setbackPx: t === null ? null : +t.toFixed(2),
        setbackFrac: t === null || !(extent > 0) ? null : +(t / extent).toFixed(5),
        extent: +extent.toFixed(1),
        roomAhead: Number.isFinite(roomAhead) ? +roomAhead.toFixed(1) : null,
        roomBehind: Number.isFinite(roomBehind) ? +roomBehind.toFixed(1) : null,
        bodyPx: +(2 * halfLen).toFixed(1),
      });
    },
    { slowmo: false }
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    cameraSeed: identity.cameraSeed,
    leaderForwardFrac: DEFAULT_CAMERA_CONFIG.leaderForwardFrac,
    frames,
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} frames=${frames} needSetback=${rows.filter((r) => r.clipped).length} infeasible=${rows.filter((r) => !r.feasible).length}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/setback-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/setback-${TAG}.json\n`);
