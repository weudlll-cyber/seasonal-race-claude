// ============================================================
// File:        viewerFrameProbe.js
// Path:        client/src/screens/RaceScreen/viewerFrameProbe.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1 (VIEWER-INVARIANTS-1's payload, moved here)
// Description: The per-frame payload RaceScreen hands `recordViewerFrame` (modules/viewerProbe.js):
//              the transform the frame was DRAWN with, plus every director quantity the acceptance
//              sheet grades from.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. This object literal was 110 lines inline in the rAF
// loop of `RaceScreen/index.jsx`, and it is a different concern from the loop around it: it DRAWS
// nothing and STEPS nothing, it only READS — the renderer's reported values and the director's own
// fields — and copies them into one object. Moving it out is code motion and nothing else: the same
// fields, the same expressions, the same order, built on every frame exactly as before (the probe
// itself decides whether to keep it; inert unless ?viewerprobe=1). The only textual change is that
// `camDirRef.current` is now the parameter `cd` — the same object, read once per call instead of
// once per field, and nothing between the reads could replace it — and the canvas reference size
// arrives as `canvasW`/`canvasH` instead of the screen's module constants.
//
// The inline comments below are the ones that sat beside these fields in RaceScreen, unchanged.
// ============================================================

/**
 * @param {object} p
 * @param {number} p.ts            the frame timestamp
 * @param {object} p.frame         what `renderRaceFrame` returned for this frame (`effZoomX/Y`)
 * @param {object} p.cam           the camera transform this frame was drawn with
 * @param {object} p.shape         the track shape
 * @param {number} p.trackWidthPx  the corridor width
 * @param {object} p.st            the live race state (`g.current`)
 * @param {number} p.worldWidth    the world width
 * @param {object} p.cd            the CameraDirector (`camDirRef.current`)
 * @param {number} p.canvasW       the canvas reference width (RaceScreen's CANVAS_W)
 * @param {number} p.canvasH       the canvas reference height (RaceScreen's CANVAS_H)
 * @returns {object} the payload for `recordViewerFrame`
 */
export function viewerFramePayload({
  ts,
  frame,
  cam,
  shape,
  trackWidthPx,
  st,
  worldWidth,
  cd,
  canvasW,
  canvasH,
}) {
  return {
    ts,
    effZoomX: frame.effZoomX,
    effZoomY: frame.effZoomY,
    offsetX: cam.offsetX,
    offsetY: cam.offsetY,
    canvasW,
    canvasH,
    shape,
    trackWidthPx,
    racers: st.racers,
    finishT: st.finishT,
    finishedCount: st.finishedCount,
    endgameFrom: cd._endgameThreshold,
    tightestNamed: canvasW / (cd._photoFinishZoom * (frame.effZoomX / cam.zoom)),
    worldWidth,
    state: cd.state,
    binding: cd._framingProbe?.binding ?? '?',
    lerpPhase: cd._lerpPhase,
    contentionOn: !!cd._contentionWatch,
    contentionOut: cd._contentionOut ? [...cd._contentionOut] : null,
    contentionChecks: cd._contentionChecks ?? 0,
    // ── ENDGAME-COMPLETE-1: the last quantities the acceptance sheet grades from ───────────
    // The two factors item 2 names, the heading item 9 and 10 measure along, and the racers
    // item 7 requires in frame — all read from the director rather than re-derived here.
    leaderZoom: cd._leaderZoom,
    photoFinishZoom: cd._photoFinishZoom,
    heading: cd._headingScreen(cd._framingProbe?.t ?? 0),
    contenderIdx: (() => {
      try {
        const ordered = [...st.racers].sort((a, b) => b.t - a.t);
        return cd._abreastContenders(ordered).map((r) => r?.index ?? -1);
      } catch {
        return null;
      }
    })(),
    // ── ITEM 7's MEMBERSHIP (ITEM7-MEMBERSHIP-1) ────────────────────────────────────────
    //
    // WHO CAN STILL WIN, which is a different question from who the shot holds. The owner's
    // decision of 2026-09-04: a racer who has fallen back so far that he can no longer win does
    // not have to be in the picture. Requirement 7 is unchanged; this is the set that answers it.
    //
    //   MEMBER = survivor of the geometric loop   MINUS   every racer at contention weight 0
    //
    // THE FALLBACK IS EXCLUDED because it answers a framing question — `_abreastContenders`
    // falls back to the top two so the photo finish has somebody to hold, and that is correct
    // for the shot and silent about chances. THE WEIGHT SUBTRACTION is the owner's decision, in
    // the project's own terms: `_contentionWeight` reaches 0 exactly when `_updateContentionWatch`
    // has projected twice that the racer cannot reach the line first and the ease has run out.
    //
    // NEITHER RULE ALONE WOULD DO. The watch does not run before `endgameThreshold` and needs
    // two checks `_contentionCheckMs` apart, so nobody is released for about the first half
    // second of the window — membership by release alone would demand the WHOLE FIELD on canvas
    // there. The geometric loop is what excludes the field; the subtraction is what excludes the
    // ones geometry still calls level.
    //
    // NOTHING IS RECOMPUTED HERE. Both are director methods, read the way every other director
    // field on this payload is read.
    item7: (() => {
      try {
        const ordered = [...st.racers].sort((a, b) => b.t - a.t);
        const survivors = cd._abreastSurvivors(ordered);
        const ts = cd._frameTs;
        const member = survivors.filter((r) => cd._contentionWeight(r.index, ts) > 0);
        // What today's set contains that the survivors do not: the fallback's own additions.
        const shown = cd._abreastContenders(ordered);
        return {
          member: member.map((r) => r?.index ?? -1),
          // Racers today's grading requires that the LOOP never admitted.
          byFallback: Math.max(0, shown.length - survivors.length),
          // Racers the loop admitted that the race has already decided.
          byWeight: survivors.length - member.length,
        };
      } catch {
        return null;
      }
    })(),
    // WHERE THE PAN WAS AIMED, beside where it got to. The difference is the smoother's own
    // residual, and it is the quantity that decides whether a shot that loses its subject is a
    // FRAMING decision or a DELIVERY one.
    targetOffsetX: cd.targetOffsetX,
    targetOffsetY: cd.targetOffsetY,
    targetZoom: cd.targetZoom,
    camZoom: cam.zoom,
    // WHERE THE FRAMING RULE INTENDS THE SUBJECT, as a fraction along the motion axis, and the
    // run-in's own travel parameter that drives it.
    forwardFrac: cd._forwardFracNow(),
    runInU: cd._runInSweepU ? cd._runInSweepU() : null,
    runInProgress: cd._runInProgress,
    composing: !!cd._runInComposingNow,
    // WHAT THE PAN IS AIMED AT, in world coordinates, beside the candidates it could be aimed
    // at. Whichever it tracks is the pan's real subject, which no amount of reading the framing
    // rule will settle.
    panTargetX: cd._lastPanTargetX ?? null,
    panTargetY: cd._lastPanTargetY ?? null,
    lineWorld: cd._finishLineWorldPoint(st.finishT),
    lateralShift: cd._lastLateralShift ?? null,
    panClamped: cd._lastResolvedPanTarget?.wasClamped ?? null,
    panCamX: cd._lastResolvedPanTarget?.camX ?? null,
    worldMaxX: cd._worldBounds?.maxX ?? null,
    worldMaxY: cd._worldBounds?.maxY ?? null,
    anchorPoint: cd._framingProbe?.point ?? null,
    // The racers the framing was actually built on this frame, by index. Read from the probe
    // the director already writes; nothing is re-derived.
    subjectIndices: cd._framingProbe?.pair?.map((r) => r?.index ?? -1) ?? null,
  };
}
