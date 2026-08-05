// ============================================================
// File:        scripts/finish-motion-truth.mjs
// Project:     RaceArena — FINISH-MOTION-1
//
// WHAT THIS MEASURES: how far the picture MOVES on each frame across the finish, so the owner's
// "the camera first jumps and then zooms out" becomes a number instead of a description.
//
// THE METRIC, and why it is this one. What the eye calls a jump is the picture sliding a long way in
// one frame. `offsetX/offsetY` ARE the screen-space translation the renderer applies, so the
// frame-to-frame change in them is exactly the distance the world slides across the glass. No
// reconstruction, no model of the camera — the same two numbers `update()` returns and the renderer
// consumes. Zoom is recorded beside it as a RELATIVE step (Δzoom / zoom), because a zoom change is
// not commensurable with a pan in pixels and pretending otherwise would hide which of the two moved.
//
// WHAT A JUMP LOOKS LIKE HERE: one frame whose `dPan` is many times the median of the frames around
// it. The report quotes the ratio, not the raw pixels, because the raw number depends on the track's
// scale and the ratio does not.
//
// READ-ONLY. It drives the real director through the shared race driver (ONE-DRIVER-1) and writes
// nothing back; it cannot move a fingerprint.
//
// Usage:
//   node scripts/finish-motion-truth.mjs                     # every track, ±10 frames around entry
//   node scripts/finish-motion-truth.mjs --only=dirt-oval    # one track
//   node scripts/finish-motion-truth.mjs --window=20         # more context frames
//   node scripts/finish-motion-truth.mjs --json              # machine-readable, for before/after diffs
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};
const has = (k) => process.argv.slice(2).includes(`--${k}`);

const ONLY = argVal("only", null);
const WINDOW = Number(argVal("window", 10));
const AS_JSON = has("json");

const identity = resolveIdentity({ racerType: TRACK_DEFAULT_RACER });
const cameraConfig = { ...DEFAULT_CAMERA_CONFIG };

const hyp = (a, b) => Math.sqrt(a * a + b * b);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const results = [];

for (const geo of loadTracks({ only: ONLY })) {
  const race = buildRace(geo, identity, cameraConfig);
  const frames = [];
  let prev = null;
  // The two world points the constraint is judged against, derived the way the director derives
  // them (its own `_finishLookbackT`), so the check cannot drift from the thing it checks.
  const lookbackT = race.cd._finishLookbackT(race.st.finishT);
  const finishTNorm = race.shape.isOpen
    ? Math.min(1, race.st.finishT)
    : ((race.st.finishT % 1) + 1) % 1;
  const lookbackPt =
    lookbackT === null ? null : race.shape.getPosition(lookbackT, 0);
  const finishPt = race.shape.getPosition(finishTNorm, 0);

  runRace(race, identity, cameraConfig, ({ cd, st, ts, frame }) => {
    const row = {
      frame,
      ts: Math.round(ts),
      hud: cd.hudState,
      state: cd.state,
      lerpPhase: cd._lerpPhase,
      observerPhase: cd._observerPhase,
      zoom: cd.zoom,
      offsetX: cd.offsetX,
      offsetY: cd.offsetY,
      camT: cd._camT,
      targetT: cd._transitionTargetT,
      // The DECOMPOSITION: did the pan TARGET move, or did a lagging offset snap onto a target that
      // was already there? Those are different defects with different repairs, and the difference is
      // invisible in `dPan` alone.
      tOffX: cd.targetOffsetX,
      tOffY: cd.targetOffsetY,
      lag: hyp(cd.offsetX - cd.targetOffsetX, cd.offsetY - cd.targetOffsetY),
      // WHICH TERM MOVED. The camera's resolved WORLD point (read off the director's own read-only
      // probe, not reconstructed) separates "the anchor moved" from "the offset math changed".
      camX: cd._lastResolvedPanTarget?.camX ?? NaN,
      camY: cd._lastResolvedPanTarget?.camY ?? NaN,
      probeX: cd._framingProbe?.point?.x ?? NaN,
      probeY: cd._framingProbe?.point?.y ?? NaN,
      guaranteed: cd._framingProbe?.guaranteed ?? NaN,
      effZoom: cd._lastResolvedPanTarget?.effectiveZoom ?? NaN,
      finished: st.finishedCount,
      // The two numbers the eye actually reacts to.
      dPan: prev
        ? hyp(cd.offsetX - prev.offsetX, cd.offsetY - prev.offsetY)
        : 0,
      dZoomRel:
        prev && prev.zoom > 0 ? Math.abs(cd.zoom - prev.zoom) / prev.zoom : 0,
      dTarget: prev
        ? hyp(cd.targetOffsetX - prev.tOffX, cd.targetOffsetY - prev.tOffY)
        : 0,
    };
    frames.push(row);
    prev = row;
  });

  // The frame FINISH_OVERVIEW begins: the first frame reporting it after any frame that did not.
  const entryIdx = frames.findIndex(
    (f, i) =>
      f.hud === "FINISH_OVERVIEW" &&
      i > 0 &&
      frames[i - 1].hud !== "FINISH_OVERVIEW",
  );
  if (entryIdx < 0) {
    results.push({
      track: geo.name ?? geo.id,
      error: "no FINISH_OVERVIEW entry observed",
    });
    continue;
  }

  const lo = Math.max(0, entryIdx - WINDOW);
  const hi = Math.min(frames.length, entryIdx + WINDOW + 1);
  const context = frames.slice(lo, hi);
  const entry = frames[entryIdx];

  // The comparison the eye makes: this frame against its neighbours. Frames BEFORE entry describe
  // the shot being left; frames AFTER describe the zoom-out itself. Both matter and they are kept
  // apart, because a jump that is large only against the calm before it is a different claim from
  // one that is large against the motion after it.
  const before = frames.slice(lo, entryIdx).map((f) => f.dPan);
  const after = frames.slice(entryIdx + 1, hi).map((f) => f.dPan);
  const medBefore = median(before);
  const medAfter = median(after);

  results.push({
    track: geo.name ?? geo.id,
    entryFrame: entry.frame,
    path:
      frames[entryIdx - 1]?.hud === "PHOTO_FINISH" ? "photo-finish" : "drama",
    entryDPan: entry.dPan,
    medianDPanBefore: medBefore,
    medianDPanAfter: medAfter,
    ratioVsBefore: medBefore > 0 ? entry.dPan / medBefore : Infinity,
    ratioVsAfter: medAfter > 0 ? entry.dPan / medAfter : Infinity,
    entryDZoomRel: entry.dZoomRel,
    medianDZoomRelAfter: median(
      frames.slice(entryIdx + 1, hi).map((f) => f.dZoomRel),
    ),
    // WHEN EACH HALF FINISHES — the "do they move together?" question, measured.
    // Defined as the LAST frame still moving, not the first frame calm: an exponential approach is
    // never calm and then suddenly calm, and a "first frame below a threshold" reading would report
    // a motion as finished while it was still visibly creeping.
    // Journey-completion, measured against where the camera ACTUALLY ends up rather than against a
    // per-frame speed threshold. `settled` is the framing 400 frames (~6.7 s) after entry, well past
    // any finish move on any track; each half is "done" at the first frame within 5% of its total
    // journey to that framing. This form works for BOTH arms, which a lag-based measure does not:
    // on the old path the offset is pinned to its target every frame, so its lag is always ~0 and a
    // lag threshold would report the motion as finished before it began.
    ...(() => {
      const settledIdx = Math.min(frames.length - 1, entryIdx + 400);
      const end = frames[settledIdx];
      const e = frames[entryIdx];
      const panTotal = hyp(e.offsetX - end.offsetX, e.offsetY - end.offsetY);
      const zoomTotal = Math.abs(e.zoom - end.zoom);
      const firstWithin = (frac, dist) => {
        for (let i = entryIdx; i <= settledIdx; i++)
          if (dist(frames[i]) <= frac) return i - entryIdx;
        return -1;
      };
      return {
        panTotalPx: panTotal,
        zoomTotal,
        panDoneFrames: firstWithin(0.05 * panTotal, (f) =>
          hyp(f.offsetX - end.offsetX, f.offsetY - end.offsetY),
        ),
        zoomDoneFrames: firstWithin(0.05 * zoomTotal, (f) =>
          Math.abs(f.zoom - end.zoom),
        ),
      };
    })(),
    // THE CONSTRAINT: the camera must not be pulled past the finish line by the winner's runout.
    // Measured as the along-track position of the camera CENTRE at the last frame, against the two
    // points that bound the answer — the lookback point it should hold, and the finish line itself.
    endCentreToLookbackPx: (() => {
      const f = frames[frames.length - 1];
      if (!Number.isFinite(f.camX) || !lookbackPt) return NaN;
      const cx = f.camX + identity.canvasW / 2 / f.effZoom;
      const cy = f.camY + identity.canvasH / 2 / f.effZoom;
      return hyp(cx - lookbackPt.x, cy - lookbackPt.y);
    })(),
    endCentreToFinishPx: (() => {
      const f = frames[frames.length - 1];
      if (!Number.isFinite(f.camX) || !finishPt) return NaN;
      const cx = f.camX + identity.canvasW / 2 / f.effZoom;
      const cy = f.camY + identity.canvasH / 2 / f.effZoom;
      return hyp(cx - finishPt.x, cy - finishPt.y);
    })(),
    lookbackToFinishPx:
      lookbackPt && finishPt
        ? hyp(lookbackPt.x - finishPt.x, lookbackPt.y - finishPt.y)
        : NaN,
    context,
  });
}

if (AS_JSON) {
  console.log(JSON.stringify({ identity, results }, null, 2));
} else {
  console.log(
    `FINISH MOTION — how far the picture moves per frame across the finish`,
  );
  console.log(formatIdentity(identity));
  console.log("");
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.track.padEnd(16)} ${r.error}`);
      continue;
    }
    console.log(
      `── ${r.track}  (entry via ${r.path}, frame ${r.entryFrame}) ─────────────────`,
    );
    console.log(
      `   ENTRY-FRAME PAN  ${r.entryDPan.toFixed(1)} px` +
        `   vs median before ${r.medianDPanBefore.toFixed(1)} (${r.ratioVsBefore.toFixed(1)}x)` +
        `   vs median after ${r.medianDPanAfter.toFixed(1)} (${r.ratioVsAfter.toFixed(1)}x)`,
    );
    console.log(
      `   ENTRY-FRAME ZOOM ${(r.entryDZoomRel * 100).toFixed(2)}%` +
        `   median after ${(r.medianDZoomRelAfter * 100).toFixed(2)}%` +
        `   | pan done in ${r.panDoneFrames} frames, zoom in ${r.zoomDoneFrames}` +
        ` (apart by ${Math.abs(r.panDoneFrames - r.zoomDoneFrames)})`,
    );
    console.log(
      `   END POSITION     centre is ${r.endCentreToLookbackPx.toFixed(0)} px from the lookback point,` +
        ` ${r.endCentreToFinishPx.toFixed(0)} px from the line (they are ${r.lookbackToFinishPx.toFixed(0)} px apart)`,
    );
    console.log(
      `   frame  hud                 lerp      obs         dPan  dTarget      lag   dZoom%   zoom      camT     targetT`,
    );
    for (const f of r.context) {
      const mark = f.frame === r.entryFrame ? ">>" : "  ";
      console.log(
        `   ${mark}${String(f.frame).padStart(4)}  ${String(f.hud).padEnd(18)}` +
          `${String(f.lerpPhase).padEnd(10)}${String(f.observerPhase).padEnd(9)}` +
          `${f.dPan.toFixed(1).padStart(8)} ${f.dTarget.toFixed(1).padStart(8)} ` +
          `${f.lag.toFixed(1).padStart(8)} ${(f.dZoomRel * 100).toFixed(2).padStart(8)} ` +
          `${f.zoom.toFixed(4).padStart(9)} ${(f.camT ?? NaN).toFixed(4).padStart(8)} ` +
          `${(f.targetT ?? NaN).toFixed(4).padStart(8)}`,
      );
    }
    console.log("");
  }
}
