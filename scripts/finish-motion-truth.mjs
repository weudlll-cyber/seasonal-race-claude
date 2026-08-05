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
// FINISH-WINDOW-1 B1: the pause decomposition. `--pause` reports where the wall-clock time between
// the first crossing and the first frame of the zoom-out actually goes, which is the thing the owner
// experiences as "one to two seconds pass".
const PAUSE = has("pause");
// `--set k=v` (repeatable) so a run can be made under HIS settings rather than the shipped defaults.
// Numbers are parsed as numbers, `true`/`false` as booleans — a string "0.15" for a threshold would
// compare wrongly and silently.
const OVERRIDES = {};
for (const a of process.argv.slice(2)) {
  if (!a.startsWith("--set=")) continue;
  const [k, ...rest] = a.slice(6).split("=");
  const raw = rest.join("=");
  OVERRIDES[k] =
    raw === "true"
      ? true
      : raw === "false"
        ? false
        : Number.isNaN(Number(raw))
          ? raw
          : Number(raw);
}

const identity = resolveIdentity({ racerType: TRACK_DEFAULT_RACER });
const cameraConfig = { ...DEFAULT_CAMERA_CONFIG, ...OVERRIDES };

const hyp = (a, b) => Math.sqrt(a * a + b * b);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const results = [];
const pauseRows = [];

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

  if (PAUSE) {
    const firstIdx = frames.findIndex((f) => f.finished >= 1);
    const secondIdx = frames.findIndex((f) => f.finished >= 2);
    const pfIdx = frames.findIndex((f) => f.hud === "PHOTO_FINISH");
    const dramaIdx = frames.findIndex((f) => f.hud === "FINISH");
    const ovIdx = frames.findIndex(
      (f, i) =>
        f.hud === "FINISH_OVERVIEW" &&
        i > 0 &&
        frames[i - 1].hud !== "FINISH_OVERVIEW",
    );
    const ms = (a, b) =>
      a < 0 || b < 0 ? null : Math.round(frames[b].ts - frames[a].ts);
    pauseRows.push({
      track: geo.name ?? geo.id,
      // The PATH is which shot ran, not which pause followed. Since FINISH-WINDOW-1 the pause runs
      // on both paths and reports `hudState === 'FINISH'`, so keying the label on the pause would
      // relabel every photo finish as a drama — which it did, until this line was corrected.
      path: pfIdx >= 0 ? "photo-finish" : dramaIdx >= 0 ? "drama" : "neither",
      // The whole thing the owner feels: crossing -> the picture starts pulling back.
      totalMs: ms(firstIdx, ovIdx),
      // (1) the drama pulse. Only runs on the drama path; 0 frames means it never ran at all.
      dramaMs: dramaIdx >= 0 ? ms(dramaIdx, ovIdx) : 0,
      // (2) the photo-finish shot holding for the SECOND contender.
      holdToSecondMs: pfIdx >= 0 ? ms(firstIdx, secondIdx) : 0,
      // What is left over once (1) and (2) are accounted for — where a minStateHold effect would
      // have to show up if it were contributing at all.
      residualMs:
        ovIdx < 0 || firstIdx < 0
          ? null
          : secondIdx >= 0 && pfIdx >= 0
            ? ms(secondIdx, ovIdx)
            : null,
      configuredDramaMs: cameraConfig.finishDramaDurationMs ?? 1500,
    });
    continue;
  }

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
    // STAGE C: the acceptance test, as a number. `lookbackPx` is documented as the world-pixel
    // distance BEFORE the finish line at which the camera centres, so the error is how far the
    // settled centre is from that promise — and `maxBeyondFinalPx` answers the second half of the
    // requirement, that no frame of the move places the camera further back than where it ends.
    settledErrorPx: (() => {
      const f = frames[frames.length - 1];
      if (!Number.isFinite(f.camX) || !lookbackPt) return NaN;
      const cx = f.camX + identity.canvasW / 2 / f.effZoom;
      const cy = f.camY + identity.canvasH / 2 / f.effZoom;
      return hyp(cx - lookbackPt.x, cy - lookbackPt.y);
    })(),
    maxBeyondFinalPx: (() => {
      const last = frames[frames.length - 1];
      if (!Number.isFinite(last.camX) || !finishPt) return NaN;
      const centre = (f) => ({
        x: f.camX + identity.canvasW / 2 / f.effZoom,
        y: f.camY + identity.canvasH / 2 / f.effZoom,
      });
      const end = centre(last);
      const endDist = hyp(end.x - finishPt.x, end.y - finishPt.y);
      let worst = 0;
      for (let i = entryIdx; i < frames.length; i++) {
        if (!Number.isFinite(frames[i].camX)) continue;
        const c = centre(frames[i]);
        worst = Math.max(
          worst,
          hyp(c.x - finishPt.x, c.y - finishPt.y) - endDist,
        );
      }
      return worst;
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

if (PAUSE) {
  console.log(
    "THE PAUSE — from the first crossing to the first frame of the zoom-out",
  );
  console.log(formatIdentity(identity));
  console.log(
    `  config: photoFinishCloseThresholdT=${cameraConfig.photoFinishCloseThresholdT} ` +
      `photoFinishLeadProgress=${cameraConfig.photoFinishLeadProgress} ` +
      `finishDramaDurationMs=${cameraConfig.finishDramaDurationMs}`,
  );
  console.log("");
  console.log(
    `  ${"track".padEnd(16)} ${"path".padEnd(13)} ${"TOTAL".padStart(8)} ${"(1) drama".padStart(10)} ${"(2) hold for P2".padStart(16)} ${"residual".padStart(9)}`,
  );
  for (const r of pauseRows) {
    if (r.totalMs === null) {
      console.log(
        `  ${r.track.padEnd(16)} ${r.path.padEnd(13)} ${"—".padStart(8)}  (no finish observed)`,
      );
      continue;
    }
    const pct = (v) =>
      r.totalMs > 0 ? ` ${((v / r.totalMs) * 100).toFixed(0)}%` : "";
    console.log(
      `  ${r.track.padEnd(16)} ${r.path.padEnd(13)} ${String(r.totalMs).padStart(6)}ms ` +
        `${String(r.dramaMs).padStart(7)}ms${pct(r.dramaMs).padStart(5)} ` +
        `${String(r.holdToSecondMs).padStart(11)}ms${pct(r.holdToSecondMs).padStart(5)} ` +
        `${String(r.residualMs ?? "—").padStart(6)}ms`,
    );
  }
  const done = pauseRows.filter((r) => r.totalMs !== null);
  if (done.length) {
    const avg = (f) =>
      Math.round(done.reduce((a, r) => a + f(r), 0) / done.length);
    console.log(
      `
  mean over ${done.length} tracks: TOTAL ${avg((r) => r.totalMs)}ms = ` +
        `drama ${avg((r) => r.dramaMs)}ms + hold-for-P2 ${avg((r) => r.holdToSecondMs)}ms + ` +
        `residual ${avg((r) => r.residualMs ?? 0)}ms`,
    );
    console.log(
      `  configured drama duration: ${done[0].configuredDramaMs}ms — compare with the (1) column.`,
    );
  }
  process.exit(0);
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
        ` ${r.endCentreToFinishPx.toFixed(0)} px from the line (asked for ${r.lookbackToFinishPx.toFixed(0)})` +
        ` | error ${r.settledErrorPx.toFixed(0)} px, max drift behind final ${r.maxBeyondFinalPx.toFixed(0)} px`,
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
