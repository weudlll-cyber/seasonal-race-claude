// RUNIN-VIABLE-1 PART A — WHERE THE CAMERA ACTUALLY AIMS, DECOMPOSED ALONG AND ACROSS THE TRACK.
//
// THE OWNER'S SENTENCE IS A TESTABLE CLAIM, and this instrument exists to test it rather than to
// argue with it: *the camera always aims at the middle, so the focus should only ever move FORWARD
// along the line — never sideways.* If the aim is genuinely always the midpoint, its ACROSS-track
// component is constant and every sideways motion he sees comes from somewhere else. If the across
// component moves, the premise is wrong and this strand has been measuring the wrong quantity.
//
// ── THE DECOMPOSITION, AND WHY IT IS TAKEN AT THE ANCHOR'S STATION ─────────────────────────────
//
// At each frame the anchor has a track parameter `t`. `shape.getPosition(t, 0)` is the CENTRELINE
// point there and `_headingAt(t)` is the world tangent. Together they give a track-local frame:
//
//     along  = (P - centre) . tangentUnit          across = (P - centre) . normalUnit
//
// So `across` is signed world px off the centreline — 0 means "aimed at the middle" in exactly the
// sense the owner means it. Every point below is expressed in that frame, at the SAME station, so
// the numbers are comparable to each other on one row.
//
// ── THE CHAIN IS THE CAUSE ATTRIBUTION, AND THAT IS THE WHOLE POINT ────────────────────────────
//
// The pan target is built in named stages, and each stage is recorded separately, so a sideways
// movement can be charged to the stage that introduced it instead of guessed at:
//
//     anchorPoint   -> the subject itself (pair midpoint, or the leader). Its `across` is the
//                      RACERS' own lateral position. Nothing the camera does moves this.
//     afterBias     -> anchorPoint + the forward bias. Expected to move ALONG only.
//     afterLateral  -> afterBias + the lateral-shift term. This one is ALLOWED to move across.
//     targetAim     -> what the camera is actually told to aim at, after resolveCamera's world-edge
//                      clamp and any frame fitting. Its gap to afterLateral is the CLAMP.
//     deliveredAim  -> where the camera is, after the pan smoother. Its gap to targetAim is LAG.
//
// A jump in `across` therefore names its own author: whichever consecutive pair of stages the step
// appears between is the mechanism that caused it.
//
// MEASURE ONLY. No product file is touched, no key is read that the director does not already
// expose, and nothing is written but JSON.
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
const CASES = (arg("cases", "river-run:20:13") || "")
  .split(",")
  .filter(Boolean)
  .map((s) => {
    const [track, n, seed] = s.split(":");
    return { track, racers: Number(n), seed: Number(seed) };
  });
const OUT = arg("out", "c:/tmp/runin-aim-axes");
const FROM_U = Number(arg("from", "0.90"));
const TAG = arg("tag", "axes");

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const out = [];

for (const c of CASES) {
  const geo = tracks.get(c.track);
  if (!geo) {
    process.stderr.write(`no track ${c.track}\n`);
    continue;
  }
  // THE BROWSER'S OWN CAMERA SEEDING, per the owner's decision of 2026-08-23. A harness constant
  // here would describe a picture the product cannot produce for any race.
  const identity = resolveIdentity({
    racers: c.racers,
    raceSeed: c.seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(c.seed),
    note: "runin-aim-axes (browser camera seed)",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd, shape } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;

  /** The track-local frame at station `t`: centreline point plus unit tangent and normal. */
  const frameAt = (t) => {
    if (t === null || t === undefined) return null;
    const c0 = shape.getPosition(t, 0);
    const h = cd._headingAt(t);
    if (!c0 || !h) return null;
    const len = Math.hypot(h.x, h.y);
    if (!(len > 0)) return null;
    const tx = h.x / len;
    const ty = h.y / len;
    return { c0, tx, ty, nx: -ty, ny: tx };
  };
  /** A world point expressed in that frame. */
  const decomp = (F, p) =>
    F && p
      ? {
          along: +((p.x - F.c0.x) * F.tx + (p.y - F.c0.y) * F.ty).toFixed(2),
          across: +((p.x - F.c0.x) * F.nx + (p.y - F.c0.y) * F.ny).toFixed(2),
        }
      : null;

  const rows = [];
  let crossTs = null;
  let started = false;
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, ts, frame }) => {
      const fp = cd._framingProbe;
      if (st.finishedCount >= 1 && crossTs === null) crossTs = ts;
      if (!fp) return;
      const uNow = cd._runInProgress ?? 0;
      if (!started && (!fp.runInActive || uNow < FROM_U)) return;
      started = true;

      const F = frameAt(fp.t);
      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const aimOf = (ox, oy) => ({ x: (CW / 2 - ox) / effX, y: (CH / 2 - oy) / effY });

      const racers = st.racers;
      let leader = null;
      for (const r of racers) if (!leader || r.t > leader.t) leader = r;

      rows.push({
        frame,
        ts,
        u: +uNow.toFixed(4),
        state: cd.state,
        runInActive: !!fp.runInActive,
        runInBinding: !!cd._runInBinding,
        afterDeadline: !!cd._runInAfterDeadline,
        inFinishMode: !!cd._inFinishMode,
        zoom: +cd.zoom.toFixed(5),
        deliveredWidthPx: fp.deliveredWidthPx ?? null,
        // ── THE FIVE STAGES, ALL AT THE SAME STATION ──────────────────────────────────────────
        anchorPoint: decomp(F, fp.anchorPoint),
        afterBias: decomp(F, fp.afterBias),
        afterLateral: decomp(F, fp.afterLateral),
        targetAim: decomp(F, aimOf(cd.targetOffsetX, cd.targetOffsetY)),
        deliveredAim: decomp(F, aimOf(cd.offsetX, cd.offsetY)),
        // WHAT `resolveCamera` ITSELF DECIDED, read from its own record rather than reconstructed.
        // `camX`/`camY` are the viewport TOP-LEFT at `effectiveZoom`, so the centre is that plus
        // half a frame at the zoom the RESOLVER used. If this and `targetAim` disagree, the stored
        // offsets no longer describe the resolver's answer — which is the staleness, isolated.
        resolvedAim: (() => {
          const p = cd._lastResolvedPanTarget;
          if (!p || !(p.effectiveZoom > 0)) return null;
          const eY = proj.effY(proj.camZoomForEffX(p.effectiveZoom));
          return decomp(F, {
            x: p.camX + CW / 2 / p.effectiveZoom,
            y: p.camY + CH / 2 / eY,
          });
        })(),
        lerpPhase: cd._lerpPhase ?? null,
        resolvedEff: cd._lastResolvedPanTarget?.effectiveZoom ?? null,
        drawnEff: +effX.toFixed(6),
        // ── WHAT THE OWNER ACTUALLY SEES ──────────────────────────────────────────────────────
        //
        // World coordinates are the wrong unit for his sentence. He is describing the SUBJECT
        // moving in the PICTURE. So this takes the anchor's screen position against the screen
        // point the framing rule intended for it, and splits the miss along the track's SCREEN
        // heading (forward/back, which he accepts) and across it (sideways, which he does not).
        subjectMiss: (() => {
          if (!fp.anchorPoint || fp.t === null || fp.t === undefined) return null;
          const at = anchorScreenPoint(CW, CH, cd._forwardFracNow(), cd._headingScreen(fp.t));
          const h = cd._headingScreen(fp.t);
          if (!at || !h) return null;
          const L = Math.hypot(h.x, h.y);
          if (!(L > 0)) return null;
          const sx = fp.anchorPoint.x * effX + cd.offsetX;
          const sy = fp.anchorPoint.y * effY + cd.offsetY;
          const dx = sx - at.x;
          const dy = sy - at.y;
          return {
            along: +((dx * h.x + dy * h.y) / L).toFixed(2),
            across: +((-dx * h.y + dy * h.x) / L).toFixed(2),
            screenX: +sx.toFixed(1),
            screenY: +sy.toFixed(1),
          };
        })(),
        // ── WHAT COULD HAVE MOVED IT, recorded so a step can be charged rather than guessed ────
        anchorT: fp.t === null || fp.t === undefined ? null : +fp.t.toFixed(6),
        lateralShift: fp.lateralShift ?? null,
        forwardFrac: cd._forwardFracNow?.() ?? null,
        levelSetSize: fp.levelSetSize ?? null,
        panClamped: cd._lastResolvedPanTarget?.wasClamped ?? null,
        anchorRacerIdx: cd._focusAnchorRacer?.(racers)?.index ?? null,
        pair: (fp.pair ?? []).filter(Boolean).map((r) => (r.index === undefined ? null : r.index)),
        // The racers' OWN lateral spread, so "the subject moved" can be separated from "the camera
        // moved": the across of each framing-pair member at this station.
        pairAcross: (fp.pair ?? [])
          .filter(Boolean)
          .map((r) => decomp(F, { x: r.x, y: r.y })?.across ?? null),
        leaderAcross: decomp(F, { x: leader.x, y: leader.y })?.across ?? null,
        leaderT: +leader.t.toFixed(5),
        finishedCount: st.finishedCount,
      });
    },
    { slowmo: true }
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    cameraSeed: identity.cameraSeed,
    crossTs,
    frames: rows.length,
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} camSeed=${identity.cameraSeed} frames=${rows.length}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/aim-axes-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/aim-axes-${TAG}.json\n`);
