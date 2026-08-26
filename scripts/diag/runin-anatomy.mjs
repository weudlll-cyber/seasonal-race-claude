// RUNIN-SEED13-ANATOMY-1 — ONE RACE, FRAME BY FRAME, THROUGH THE CLOSING STRETCH.
//
// WHY A NEW INSTRUMENT RATHER THAN `level-step-when.mjs`. That script stores four numbers per frame
// (u, zoom, bound, set size) and reduces them to ONE ROW per race — the largest step and where it
// is. That was the right shape for ranking 29 races and it cannot answer either of the owner's two
// questions: WHO joined the level set, and whether the camera's PLACEMENT moves while its WIDTH
// holds. Both need the whole frame, kept.
//
// THE CAMERA SEED IS THE BROWSER'S BY DEFAULT, not the harness constant. Since the owner's decision
// of 2026-08-23 `RaceScreen/index.jsx` derives it as `cameraSeedForRace(racePlanSeed)`;
// `resolveIdentity` still defaults to 1439767152, a value the product cannot produce for any race
// (RUNIN-LEVEL-SET-BUILD-1 section 15). This instrument is about what the OWNER SAW, so it uses his.
//
// PLACEMENT AND WIDTH ARE RECORDED SEPARATELY AND ON PURPOSE. `guaranteed` is the width; the pan
// target passes through three named stages (`anchorPoint` -> `afterBias` -> `afterLateral`) and the
// delivered camera is a fourth thing again, because the tracking lerp lags all of them. A report
// that reads only `zoom` cannot see a shot that pans while it holds its size.
//
// It changes nothing. Every value below is read off the director's own read-only probe or computed
// from the racers the director was handed on that frame.
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
const { CameraDirector } = await import(u("client/src/modules/camera/CameraDirector.js"));
const { contenderGuarantee, anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
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
const OUT = arg("out", "c:/tmp/runin-anatomy");
const FROM_U = Number(arg("from", "0.90"));
// --harness-cam reverts to the pre-2026-08-23 constant, for the side-by-side only.
const HARNESS_CAM = process.argv.includes("--harness-cam");
// --freeze=<frame> : from this frame on, the level set may not GAIN a member. The counterfactual.
// --fps / --jitter : THE ONE THING THE HARNESS FIXES AND THE BROWSER DOES NOT. Every instrument on
// this driver runs a 60 Hz clock; `requestAnimationFrame` does not. Both events below are settling
// behaviours, so the honest question is whether they survive a different frame clock at all — not
// whether the frame numbers match. `hooks.frameMs` is the driver's own seam for this.
const FPS = Number(arg("fps", "60"));
const JITTER = Number(arg("jitter", "0"));
const FREEZE_RAW = arg("freeze", null);
const FREEZE_AT = FREEZE_RAW === null ? null : Number(FREEZE_RAW);

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const out = [];

for (const c of CASES) {
  const geo = tracks.get(c.track);
  if (!geo) {
    process.stderr.write(`no track ${c.track}\n`);
    continue;
  }
  const camSeed = HARNESS_CAM ? undefined : cameraSeedForRace(c.seed);
  const identity = resolveIdentity({
    racers: c.racers,
    raceSeed: c.seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: camSeed,
    note: `runin-anatomy ${HARNESS_CAM ? "(harness camera seed)" : "(browser camera seed)"}`,
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  // THE SHOT'S OWN UNIT, kept identical to section 14 so the two tables can be read side by side:
  // world px across the SHORT screen axis, which is what `visibleCorridors` is defined against.
  const visW = (z) => (z > 0 ? CH / (z * proj.axisY) : 0);

  // -- THE COUNTERFACTUAL ---------------------------------------------------------------------
  // "The level set frozen at its previous membership": from `FREEZE_AT` on, a racer who was not
  // already a member cannot become one. Members may still LEAVE, because freezing departures too
  // would be a second change and the question is what admitting HIM cost.
  //
  // IT CANNOT MOVE THE RACE. The camera is downstream of the physics — `stepRacePhysics` never
  // reads the director — so the counterfactual run is the SAME race, frame for frame, and the only
  // difference between the two traces is the width. That is what makes the side-by-side honest.
  const origLevel = cd._levelContenders.bind(cd);
  let frozenIdx = null;
  if (FREEZE_AT !== null) {
    cd._levelContenders = (racers) => {
      const set = origLevel(racers);
      if (frozenIdx === null) return set;
      return set.filter((r) => frozenIdx.has(r.index));
    };
  }

  const rows = [];
  let crossTs = null;
  let started = false;
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, ts, raceStart, frame, physicsSteps }) => {
      const fp = cd._framingProbe;
      if (FREEZE_AT !== null && frozenIdx === null && frame >= FREEZE_AT) {
        // Latch the membership as it stood on the frame BEFORE the freeze point.
        frozenIdx = new Set(origLevel(st.racers).map((r) => r.index));
      }
      if (st.finishedCount >= 1 && crossTs === null) crossTs = ts;
      // THE WINDOW DELIBERATELY OUTLIVES THE RUN-IN. The owner's second report is of something
      // "nearer the line still", and the run-in's own window is only about half a second wide at
      // 60 Hz — too short to be what he means on its own. The finish drama and the hold that
      // follow the crossing are where the camera spends SECONDS near the line, so the trace runs
      // until the race is over rather than until the schedule hands back.
      if (!fp) return;
      const uNow = cd._runInProgress ?? 0;
      if (!started && (!fp.runInActive || uNow < FROM_U)) return;
      started = true;

      const racers = st.racers;
      let leader = null;
      let maxT = -Infinity;
      for (const r of racers)
        if (r.t > maxT) {
          maxT = r.t;
          leader = r;
        }
      const pathLen = leader?.pathLengthPx ?? 0;

      // ALONG and ACROSS, in the director's own terms: along = the shortest arc back to the leader,
      // times the path length, i.e. the very quantity `withinOneLength` tests. Across = the world
      // displacement projected on the perpendicular to the leader's heading.
      const h = cd._headingAt(leader?.t);
      const hl = h ? Math.hypot(h.x, h.y) : 0;
      const px = hl > 0 ? -h.y / hl : 0;
      const py = hl > 0 ? h.x / hl : 0;
      const shortest = (a, b) => {
        let d = b - a;
        if (!cd._isOpenTrack) {
          d = ((d % 1) + 1) % 1;
          if (d > 0.5) d -= 1;
        }
        return d;
      };
      const describe = (r) => ({
        i: r.index,
        name: r.name ?? null,
        x: +r.x.toFixed(1),
        y: +r.y.toFixed(1),
        alongPx: +(-shortest(leader.t, r.t) * pathLen).toFixed(1), // >0 = BEHIND the leader
        acrossPx: +((r.x - leader.x) * px + (r.y - leader.y) * py).toFixed(1),
        contactPx: +CameraDirector.contactLengthBetween(leader, r).toFixed(1),
        level: CameraDirector.withinOneLength(leader, r, pathLen),
      });
      // -- WHAT EACH MEMBER COSTS, ON HIS OWN -----------------------------------------------------
      // `contenderGuarantee` with ONE subject and an anchor IS `presenceCeilingFrom` for that
      // subject — the anchored arm loops over the members and takes the min, so calling it with a
      // single-element array reproduces that member's own term exactly. No formula is re-derived
      // here; the shipped function is asked, one racer at a time. `costPx` is that ceiling stated
      // as a visible width, which is the unit the owner reads.
      const at =
        fp.t === null || fp.t === undefined
          ? null
          : anchorScreenPoint(CW, CH, cd._forwardFracNow(), cd._headingScreen(fp.t));
      const costOf = (r) => {
        if (!at || !fp.point) return null;
        const c = contenderGuarantee(
          [r],
          proj.axisX,
          proj.axisY,
          CW,
          CH,
          cd._innerFramePct ?? 0.7,
          cd._drawnBodyWidthRefPx,
          fp.point,
          at
        );
        return Number.isFinite(c) ? +visW(c).toFixed(1) : null;
      };
      const liveRaw = origLevel(racers);
      const liveSet = liveRaw.map((r) => ({
        ...describe(r),
        // Distance from the ANCHOR rather than from the leader — the quantity the guarantee is
        // actually built on, and the reason two racers the same distance behind can cost very
        // different amounts of width.
        fromAnchorPx: fp.point ? +Math.hypot(r.x - fp.point.x, r.y - fp.point.y).toFixed(1) : null,
        costPx: costOf(r),
      }));
      const usedSet = (
        FREEZE_AT !== null && frozenIdx ? liveRaw.filter((r) => frozenIdx.has(r.index)) : liveRaw
      ).map((r) => r.index);
      // The two nearest NON-members behind, so a reader can see who is about to arrive.
      const near = racers
        .filter((r) => r !== leader && !liveSet.some((m) => m.i === r.index))
        .map((r) => ({
          ...describe(r),
          fromAnchorPx: fp.point ? +Math.hypot(r.x - fp.point.x, r.y - fp.point.y).toFixed(1) : null,
          costPx: costOf(r),
        }))
        .filter((d) => d.alongPx >= 0)
        .sort((a, b) => a.alongPx - b.alongPx)
        .slice(0, 2);

      // -- PLACEMENT: the delivered camera, not the target ---------------------------------------
      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const camCentre = { x: (CW / 2 - cd.offsetX) / effX, y: (CH / 2 - cd.offsetY) / effY };
      const scr = (p) => (p ? proj.toScreen(p, cd.zoom, cd.offsetX, cd.offsetY) : null);
      const anchorScr = scr(fp.anchorPoint);
      // WHERE THE FRAMING *INTENDED* TO PUT THE ANCHOR THIS FRAME — the same projection, but with
      // the TARGET offsets instead of the delivered ones. The difference between this and
      // `anchorScreen` is the pan's own residual; the difference between this and `anchorAt` is the
      // framing being displaced by something else (`resolveCamera`'s world-edge clamp above all).
      // Without both, "the picture moves" cannot be split into a decision and a delay.
      const anchorScrTarget = fp.anchorPoint
        ? proj.toScreen(fp.anchorPoint, cd.zoom, cd.targetOffsetX, cd.targetOffsetY)
        : null;
      const leaderScr = scr({ x: leader.x, y: leader.y });
      const anchorRacer = cd._focusAnchorRacer(racers);
      const fwd = cd._forwardFracNow();

      rows.push({
        frame,
        physicsSteps,
        ts: +ts.toFixed(1),
        tRace: +(ts - raceStart).toFixed(1),
        u: +uNow.toFixed(4),
        sweepU: +cd._runInSweepU().toFixed(4),
        afterDeadline: !!cd._runInAfterDeadline,
        state: cd.state,
        hud: cd.hudState,
        runInActive: !!fp.runInActive,
        inFinishMode: !!cd._inFinishMode,
        inFinishDrama: !!cd._inFinishDrama,
        inPhotoFinish: !!cd._inPhotoFinish,
        observerPhase: cd._observerPhase ?? null,
        // WIDTH
        zoom: +cd.zoom.toFixed(6),
        targetZoom: +(cd.targetZoom ?? 0).toFixed(6),
        guaranteed: +fp.guaranteed.toFixed(6),
        widthPx: +visW(fp.guaranteed).toFixed(1),
        deliveredWidthPx: +visW(cd.zoom).toFixed(1),
        binding: fp.binding,
        ceilings: Object.fromEntries(
          Object.entries(fp.ceilings).map(([k, v]) => [k, Number.isFinite(v) ? +v.toFixed(6) : null])
        ),
        levelCeiling: Number.isFinite(fp.levelCeiling) ? +fp.levelCeiling.toFixed(6) : null,
        levelPreWidth: +fp.levelPreWidth.toFixed(6),
        levelBound: !!fp.levelBound,
        levelSetSize: fp.levelSetSize,
        runInCeiling: Number.isFinite(fp.runInCeiling) ? +fp.runInCeiling.toFixed(6) : null,
        runInBinding: !!fp.runInBinding,
        scheduled: !!fp.scheduled,
        ratchet: cd._runInRatchet === null ? null : +cd._runInRatchet.toFixed(6),
        // MEMBERSHIP
        setLive: liveSet,
        setUsed: usedSet,
        nearMiss: near,
        // PLACEMENT
        anchorRacer: anchorRacer ? { i: anchorRacer.index, name: anchorRacer.name ?? null } : null,
        anchorT: fp.t === null || fp.t === undefined ? null : +fp.t.toFixed(5),
        forwardFrac: fwd === null || fwd === undefined ? null : +fwd.toFixed(4),
        lateralShift: +(cd._lastLateralShift ?? 0).toFixed(2),
        anchorPoint: fp.anchorPoint
          ? { x: +fp.anchorPoint.x.toFixed(1), y: +fp.anchorPoint.y.toFixed(1) }
          : null,
        afterBias: fp.afterBias
          ? { x: +fp.afterBias.x.toFixed(1), y: +fp.afterBias.y.toFixed(1) }
          : null,
        afterLateral: fp.afterLateral
          ? { x: +fp.afterLateral.x.toFixed(1), y: +fp.afterLateral.y.toFixed(1) }
          : null,
        camCentre: { x: +camCentre.x.toFixed(1), y: +camCentre.y.toFixed(1) },
        headingDeg: h ? +((Math.atan2(h.y, h.x) * 180) / Math.PI).toFixed(2) : null,
        // WHERE THE SUBJECT SITS IN THE PICTURE — "does it pan?" is really a question about this.
        anchorScreen: anchorScr ? { x: +anchorScr.x.toFixed(1), y: +anchorScr.y.toFixed(1) } : null,
        anchorAt: at ? { x: +at.x.toFixed(1), y: +at.y.toFixed(1) } : null,
        anchorScreenTarget: anchorScrTarget
          ? { x: +anchorScrTarget.x.toFixed(1), y: +anchorScrTarget.y.toFixed(1) }
          : null,
        offsetX: +cd.offsetX.toFixed(1),
        offsetY: +cd.offsetY.toFixed(1),
        targetOffsetX: +cd.targetOffsetX.toFixed(1),
        targetOffsetY: +cd.targetOffsetY.toFixed(1),
        pivotAnchorX: cd._lastPivotAnchorX === null ? null : +cd._lastPivotAnchorX.toFixed(1),
        lerpPhase: cd._lerpPhase ?? null,
        pair: (fp.pair ?? []).filter(Boolean).map((r) => (r.index === undefined ? null : r.index)),
        leaderScreen: leaderScr ? { x: +leaderScr.x.toFixed(1), y: +leaderScr.y.toFixed(1) } : null,
        leaderT: +leader.t.toFixed(5),
        finishedCount: st.finishedCount,
      });
    },
    {
      slowmo: true,
      // A deterministic wobble, not a random one: the driver forbids Math.random in a measurement
      // and a repeatable clock is the only kind two runs can be compared under.
      frameMs:
        FPS === 60 && JITTER === 0
          ? undefined
          : (i) => 1000 / FPS + (JITTER > 0 ? JITTER * Math.sin(i * 1.7) : 0),
    }
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    cameraSeed: identity.cameraSeed,
    frozenFrom: FREEZE_AT,
    frozenSet: frozenIdx ? [...frozenIdx] : null,
    crossTs,
    frames: rows.length,
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} camSeed=${identity.cameraSeed} frames=${rows.length}` +
      `${FREEZE_AT !== null ? ` frozen@${FREEZE_AT} -> [${frozenIdx ? [...frozenIdx].join(",") : ""}]` : ""}\n`
  );
}

mkdirSync(OUT, { recursive: true });
const tag = arg(
  "tag",
  FREEZE_AT !== null ? `frozen${FREEZE_AT}` : HARNESS_CAM ? "harnesscam" : "live"
);
writeFileSync(`${OUT}/anatomy-${tag}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/anatomy-${tag}.json\n`);
