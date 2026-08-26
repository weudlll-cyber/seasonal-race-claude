// ANCHOR-ROOM-GAP-1 — what the anchor-versus-centre inconsistency COSTS. MEASURE ONLY.
//
// THE INCONSISTENCY, found during LEADER-LATERAL-BUILD-1 and never priced: `_applyLateralGuarantee`
// measures the room it has either side of the anchor from `anchorScreenPoint(...)` — the point the
// framing rule WANTS the anchor to occupy — while `resolveCamera` and `_offsetYFor` place the camera
// by CENTRING the pan target and clamping it to the world bounds. Those are not the same screen
// point. The two were measured a median 132 px apart.
//
// A GAP IN AN INPUT IS NOT AUTOMATICALLY A DEFECT. `lateralShiftToFit` turns rooms into an interval
// and then returns the smallest shift that reaches it — and returns 0 whenever 0 is admissible. A
// wrong room only MATTERS on a frame where it moves that answer. So this probe computes the shift
// TWICE per frame, from the two room pairs, and counts the frames where the ANSWER differs rather
// than reporting the size of the input error, which would overstate it.
//
// THREE VERDICT CLASSES, because "differs" is too coarse to act on:
//   SILENT     both answers are 0 — the centreline works either way. The gap is arithmetic only.
//   SIZE       both engage, same direction, different magnitude.
//   ANSWER     one engages and the other does not, or they disagree in SIGN. This is the only class
//              in which a viewer could see something the framing rule did not intend.
//
// The replication is checked against the director's own `_lastLateralShift` on every frame; a run
// whose replication does not match is reported as such rather than believed.
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
const { anchorScreenPoint, lateralShiftToFit, framingFor, GUARANTEE } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { roomFromPointAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));
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
const OUT = arg("out", "c:/tmp/p3");
const TAG = arg("tag", "gap");

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
    note: "anchor-room-gap (browser camera seed)",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);

  const rows = [];
  let matched = 0;
  let checked = 0;
  // DID THE GUARANTEE RUN AT ALL THIS FRAME? It has five early returns — no pan target, no shape, a
  // degenerate heading, a degenerate scale, an empty subject list — and on any of them it never
  // reaches the line that assigns `_lastLateralShift`. A probe that replicated the arithmetic anyway
  // would be scoring a decision the director never made; the first cut of this file did exactly that
  // and disagreed with the director on 262 OVERVIEW frames, every one of which was a frame where the
  // real function had returned early. The sentinel below is how a frame is EXCLUDED rather than
  // guessed at: NaN going in, still NaN coming out, the function did not get there.
  //
  // AND IT CAPTURES THE REAL ARGUMENTS. Reconstructing the guarantee's inputs from the framing probe
  // was wrong on two branches at once — the pan-target and heading are replaced when the entry-phase
  // pan travels in T-space, and the probe's anchor is not what the function received. Rather than
  // enumerate the branches and get a third one wrong, the wrapper records exactly what was passed.
  const origLateral = cd._applyLateralGuarantee.bind(cd);
  let ranThisFrame = false;
  let lastArgs = null;
  cd._applyLateralGuarantee = function (panTarget, headingT, subjects, camZoom, frameSize, ...rest) {
    cd._lastLateralShift = NaN;
    const r = origLateral(panTarget, headingT, subjects, camZoom, frameSize, ...rest);
    ranThisFrame = Number.isFinite(cd._lastLateralShift);
    lastArgs = { panTarget, headingT, subjects, camZoom, frameSize };
    return r;
  };
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp || !ranThisFrame || !lastArgs) return;
      // The anchor the FUNCTION used, and the heading it was given — not the probe's idea of them.
      const anchor = lastArgs.subjects?.point ?? lastArgs.panTarget;
      const headingT = lastArgs.headingT;
      if (!anchor || headingT == null) return;
      const hw = cd._headingAt(headingT);
      const hs = cd._headingScreen(headingT);
      if (!hw || !hs) return;
      const hwl = Math.hypot(hw.x, hw.y);
      if (!(hwl > 0)) return;
      const perp = { x: -hw.y / hwl, y: hw.x / hwl };

      const camZoom = lastArgs.camZoom;
      const effX = proj.effX(camZoom);
      const effY = proj.effY(camZoom);
      const vx = perp.x * effX;
      const vy = perp.y * effY;
      const scale = Math.hypot(vx, vy);
      if (!(scale > 0)) return;

      const FW = lastArgs.frameSize.width;
      const FH = lastArgs.frameSize.height;
      const pct = cd._innerFramePct;

      // ── A: THE SHIPPED ROOMS, measured from where the framing rule WANTS the anchor ──────────
      const at = anchorScreenPoint(FW, FH, cd._forwardFracNow(), hs);
      if (!at) return;
      const roomPlusA = roomFromPointAlong(at.x, at.y, vx, vy, FW, FH, pct);
      const roomMinusA = roomFromPointAlong(at.x, at.y, -vx, -vy, FW, FH, pct);

      // ── B: THE ROOMS AT THE PLACEMENT THE CAMERA ACTUALLY MAKES ──────────────────────────────
      // `resolveCamera` centres the pan TARGET and clamps to the world bounds; the anchor therefore
      // lands wherever that leaves it, which is `centre - (target - anchor) * eff`. The target here
      // is the pan target BEFORE the lateral shift, which is the input this guarantee is deciding
      // from — using the post-shift target would be circular.
      const tgt = lastArgs.panTarget;
      const camXMax = Math.max(cd._worldBounds.minX, cd._worldBounds.maxX - FW / effX);
      const camYMax = Math.max(cd._worldBounds.minY, cd._worldBounds.maxY - FH / effY);
      const camX = Math.max(cd._worldBounds.minX, Math.min(camXMax, tgt.x - FW / (2 * effX)));
      const camY = Math.max(cd._worldBounds.minY, Math.min(camYMax, tgt.y - FH / (2 * effY)));
      const atB = { x: (anchor.x - camX) * effX, y: (anchor.y - camY) * effY };
      const roomPlusB = roomFromPointAlong(atB.x, atB.y, vx, vy, FW, FH, pct);
      const roomMinusB = roomFromPointAlong(atB.x, atB.y, -vx, -vy, FW, FH, pct);

      // The subject list, exactly as the director builds it.
      const lateralOf = (r) => (r.x - anchor.x) * perp.x + (r.y - anchor.y) * perp.y;
      const half = cd._trackWidthPx / 2;
      const offsets = [];
      if (half > 0) offsets.push(half, -half);
      if (framingFor(cd.state).guarantee === GUARANTEE.PAIR)
        for (const r of lastArgs.subjects?.pair ?? []) if (r) offsets.push(lateralOf(r));
      if (offsets.length === 0) return;

      const dA = lateralShiftToFit(offsets, roomPlusA, roomMinusA, scale);
      const dB = lateralShiftToFit(offsets, roomPlusB, roomMinusB, scale);

      // Replication check against the director itself. `_lastLateralShift` includes the leader's own
      // clamp in LEADER_ZOOM, so only the corridor-only states can be compared directly.
      const leaderClampRuns = cd.state === "LEADER_ZOOM";
      let repl = null;
      if (!leaderClampRuns) {
        checked++;
        repl = Math.abs(dA - (cd._lastLateralShift ?? 0));
        if (repl < 1e-6) matched++;
      }

      const eA = Math.abs(dA) > 1e-9;
      const eB = Math.abs(dB) > 1e-9;
      const cls =
        !eA && !eB ? "SILENT" : eA !== eB || Math.sign(dA) !== Math.sign(dB) ? "ANSWER" : "SIZE";

      rows.push({
        frame,
        state: cd.state,
        cls,
        dA: +dA.toFixed(3),
        dB: +dB.toFixed(3),
        // The input gap itself, so the "132 px" claim is re-measured here rather than carried.
        gapPx: +Math.hypot(atB.x - at.x, atB.y - at.y).toFixed(1),
        // How much the picture would move if the guarantee measured from B instead of A.
        movePx: +(Math.abs(dB - dA) * scale).toFixed(1),
        repl: repl === null ? null : +repl.toFixed(3),
        shipped: Number.isFinite(cd._lastLateralShift) ? +cd._lastLateralShift.toFixed(3) : null,
        lerpPhase: cd._lerpPhase ?? null,
        roomA: [+roomPlusA.toFixed(1), +roomMinusA.toFixed(1)],
        roomB: [+roomPlusB.toFixed(1), +roomMinusB.toFixed(1)],
      });
    },
    { slowmo: false }
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    replication: { checked, matched },
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.seed} rows=${rows.length} ANSWER=${rows.filter((r) => r.cls === "ANSWER").length} ` +
      `SIZE=${rows.filter((r) => r.cls === "SIZE").length} repl=${matched}/${checked}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/gap-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/gap-${TAG}.json\n`);
