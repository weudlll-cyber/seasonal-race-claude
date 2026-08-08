// ============================================================
// File:        renderRaceFrame.js
// Path:        client/src/screens/RaceScreen/renderRaceFrame.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THIS IS FOR: drawing one frame of a race onto a 2D context, and being the ONLY place that
// decides what is drawn and in what order. It takes a context and a plain description of the frame;
// it touches no React, no refs, no DOM and no clock.
//
// WHY IT EXISTS AT ALL. This code used to live inside RaceScreen's rAF callback, closed over
// forty-two pieces of component state. That is why the render path had no protection: nothing could
// drive it except a browser, so "the picture did not change" could only ever be an ARGUMENT. With
// the sequence behind a plain function, `scripts/render-fingerprint.mjs` drives the REAL drawing
// code — not a copy of it — through a recording context and hashes the call stream.
//
// WHAT IT IS NOT FOR:
//   - React and the DOM. The background canvas's CSS transform, the countdown state setter and the
//     perf log stay in the component. This returns what the component needs to do those.
//   - Deciding anything the camera decides. `cam` arrives resolved; this function never asks the
//     director for a zoom or a pan.
//   - Physics. `st` arrives stepped.
//
// THE RULE FOR EDITING IT: the order of the calls below IS the picture. Two layers swapped is a
// different frame even when every argument is identical, which is why the fingerprint hashes a
// SEQUENCE. If you change the order deliberately, the render fingerprint moves and you say so.
// ============================================================

import {
  drawEditorBackground,
  drawEditorTrackSurface,
  drawOpenTrackFinishLine,
} from './drawing/trackRendering.js';
import { drawParticles, drawSurfaceTrails } from './drawing/particleRendering.js';
import { drawRacers } from './drawing/racerRendering.js';
import { drawBattleDiagMarkers } from './drawing/battleDiagRendering.js';
import {
  drawTitle,
  drawTitleOpen,
  lapInfoText,
  drawFinalLapOverlay,
  drawCountdownOverlay,
  drawFinishedOverlay,
} from './drawing/overlayRendering.js';
import { drawStartBoard } from './drawing/startBoardRendering.js';
import { advanceLabelForms, LABEL_FORM_HOLD_MS } from './labelFormHold.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';
import {
  ceremonySchedule,
  boardDurationMs,
  boardAlphaAt,
} from '../../modules/camera/startCeremony.js';
import { drawTrackLights } from '../../modules/trackLights.js';
import { computeTagLayout, tagFontScreenPx } from './nameTagLayout.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import { effectiveZoom } from '../../modules/camera/openTrackCamera.js';
import { OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
  drawnRacerScreenPx,
} from '../../modules/autoSpriteScale.js';
import { raceNumberLabel } from '../../modules/raceNumbers.js';
import { PHASE } from './racePhase.js';
import { formatBuildLabel, isBuildUncertain } from '../../modules/buildInfo.js';
import { hudRightColumn } from './hudLayout.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;

/**
 * Draw one frame.
 *
 * @param {CanvasRenderingContext2D} ctx  a real context, or a recording stand-in
 * @param {object} f  everything the frame needs — see the destructure below
 * @returns {{effZoomX:number, effZoomY:number, displayScale:number, tagShown:Set|null,
 *            countdownNumber:number|null}}
 *   `tagShown` becomes next frame's incumbents; `countdownNumber` feeds the component's state.
 */
export function renderRaceFrame(ctx, f) {
  const {
    ts,
    st,
    cam,
    shape,
    raceData,
    isOpenTrack,
    bsX,
    bsY,
    worldWidth,
    worldHeight,
    openTrackHW,
    bgImagePath,
    bgCanvasReady,
    effects,
    cachedLightPts,
    trackLightsConfig,
    racerType,
    cameraConfig,
    camera,
    displaySize,
    displaySizeScale,
    assignmentByRacer,
    showRpStartRow,
    showRpMinimapBadges,
    rpPlanInfo,
    renderAlpha,
    interpolationEnabled,
    tagIncumbents,
    // LABEL-OCCLUSION-1: the form each label is CURRENTLY in, and the hold state behind it. Both are
    // owned by the component across frames — the layout is pure and the hold is the only thing in
    // this path that remembers anything.
    tagWideForms,
    tagFormHold,
    leaderDiag,
    cfgBadge,
    buildBadge,
    racePlanActive,
    racePlanSeed,
    gapRerollDevMarker,
    canvasW = CANVAS_W,
    canvasH = CANVAS_H,
  } = f;

  // frameEffZoom is the raw canvas scale (cam.zoom×bsX closed, BASE×cam.zoom open).
  // It is used by labels and trails (via 1/frameEffZoom) to stay constant screen-size.
  const effZoomX = isOpenTrack ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM) : cam.zoom * bsX;
  // Both axis scales: the ctx.scale() below is (zoom×bsX, zoom×bsY) on a closed track, and those
  // differ whenever the world is not 16:9.
  const effZoomY = isOpenTrack ? effZoomX : cam.zoom * bsY;

  // CAMERA-MIN-DRAW-1: the readability FLOOR, as a fraction of the frame — never draw a racer too
  // small to recognise. It is a bound on THIS multiplication and nothing else; the camera has
  // already chosen its zoom without ever reading the value.
  const displayScale = computeRenderDisplayScale(
    displaySize,
    displaySizeScale,
    effZoomX,
    getEffectiveMaxTargetScreenPx(
      racerType?.config?.maxTargetScreenPx,
      cameraConfig.maxTargetScreenPx
    ),
    cameraConfig.minDrawnFrameFrac,
    canvasH
  );

  // ── World space ──────────────────────────────────────────────────────────────────────────────
  // One save/transform/restore wraps every world-space layer so they all move together when the
  // camera pans or zooms. The HUD draws after the restore so it stays in fixed screen space.
  ctx.save();
  ctx.translate(cam.offsetX, cam.offsetY);
  if (isOpenTrack) {
    const ez = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);
    ctx.scale(ez, ez);
  } else {
    ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
  }
  drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight, bgCanvasReady);
  for (const inst of effects) {
    ctx.save();
    inst.render(ctx);
    ctx.restore();
  }
  if (!isOpenTrack) drawEditorTrackSurface(ctx, shape);
  drawTrackLights(ctx, cachedLightPts, trackLightsConfig, ts, !isOpenTrack, effZoomX);
  if (isOpenTrack && st.finishT < 1) drawOpenTrackFinishLine(ctx, shape, st.finishT, openTrackHW);
  drawParticles(ctx, st.dustParticles, st.burstParticles);
  drawSurfaceTrails(ctx, st.racers);

  const focusFactor = st.focusFadeProgress ?? 0;
  const livePulkGroup = focusFactor > 0 ? (camera.detectBattleGroup?.(st.racers) ?? null) : null;

  // ── CAMERA-TAGS-1: WHICH names are drawn, decided in SCREEN space before anything is drawn ──
  // Eligibility is "on canvas"; label-vs-label occlusion decides the rest, so the count is an
  // output. The START-FORMATION exception shows every name through the countdown and for
  // `nameTagAllUntilMs` after the gun — the owner's requirement, so a spectator can find their
  // racer once. `tagIncumbents` carries last frame's set: a label already on screen is offered its
  // pixels first, which is what keeps the layout from churning (Lesson 190).
  const tagFontPx = tagFontScreenPx(cameraConfig.nameTagFrameFrac, canvasH);
  // LABEL-OFFSET-1: how far a label sits above its racer follows the RACER'S DRAWN SIZE, so that size
  // is computed ONCE, here, and handed to both the layout and the renderer. Evaluating the formula
  // twice would be two homes for one distance, and the failure is silent — the decluttering would
  // reason about boxes that are not where the labels get drawn.
  //
  // effZoomY, not effZoomX. This is a VERTICAL distance, and on a closed track the world→screen scale
  // is anisotropic: the sprite is squashed on Y, so the gap has to be squashed with it.
  const racerScreenH = drawnRacerScreenPx(displaySize, displayScale, effZoomY);
  // LABEL-OCCLUSION-1 needs the other axis too, and it is genuinely a different number: on a closed
  // track the world→screen scale is anisotropic, so a name tested against a box built from effZoomY
  // on both axes would be judged against a racer up to 18.5 % the wrong width.
  const racerScreenW = drawnRacerScreenPx(displaySize, displayScale, effZoomX);
  const labelMarginPx = cameraConfig.nameTagMarginPx;
  const raceElapsedMs = st.raceStart != null ? ts - st.raceStart : 0;
  const showAllTags =
    st.phase !== PHASE.RACING ||
    raceElapsedMs < (cameraConfig.nameTagAllUntilMs ?? DEFAULT_CAMERA_CONFIG.nameTagAllUntilMs);
  // LABEL-FOCUS-1: who the camera is on. The director's own answer first; the leader only where it
  // genuinely has none, which is BATTLE_ZOOM and OVERVIEW.
  let focusRacerIndex = camera?.anchorRacerIndex ?? null;
  if (focusRacerIndex == null && st.racers?.length) {
    let leader = st.racers[0];
    for (const r of st.racers) if ((r?.t ?? 0) > (leader?.t ?? 0)) leader = r;
    focusRacerIndex = leader?.index ?? null;
  }
  ctx.save();
  ctx.font = `bold ${tagFontPx}px sans-serif`;
  const measureTagText = (txt) => ctx.measureText(txt).width;
  const tagLayout = computeTagLayout({
    racers: st.racers,
    effX: effZoomX,
    effY: effZoomY,
    offsetX: cam.offsetX,
    offsetY: cam.offsetY,
    canvasW,
    canvasH,
    fontPx: tagFontPx,
    racerScreenH,
    racerScreenW,
    labelMarginPx,
    measureText: measureTagText,
    showAll: showAllTags,
    incumbents: tagIncumbents,
    // RACE-NUMBERS-1: the layout must measure the SAME string the renderer draws, or every box it
    // reasons about is the wrong width — the defect HARNESS-NAMES-1 was created to end.
    labelOf: (r) =>
      showRpStartRow
        ? raceNumberLabel(r.raceNumber) +
          ' (R' +
          (assignmentByRacer.get(r.index)?.rowIndex ?? 0) +
          ')'
        : raceNumberLabel(r.raceNumber),
    // LABEL-DEGRADE-1: the wider form on offer — the racer's NAME — when the toggle is on. Passing
    // null keeps the layout byte-for-byte what it was, which is what makes the toggle a real
    // comparison rather than two code paths that merely look alike.
    wideLabelOf: cameraConfig?.labelNamesWhenRoom ? (r) => r.name ?? '' : null,
    wideForms: tagWideForms,
    // LABEL-FOCUS-1: the racer the camera is ON keeps its name for the whole race. The director
    // already names its subject — `anchorRacerIndex`, from CAMERA-FOCUS-1 — and it is deliberately
    // NULL in BATTLE_ZOOM and OVERVIEW, where the shot is a group and there is no single subject.
    // The leader is the fallback there, and that is a choice made here rather than a notion of
    // focus invented inside the director.
    exempt: focusRacerIndex != null ? new Set([focusRacerIndex]) : null,
    // …and at the photo finish, everyone. At that zoom every racer stays recognisable even when the
    // labels overlap, so overlap is acceptable there — the owner's reasoning, and it is the design.
    exemptAll: camera?.state === 'PHOTO_FINISH',
  });
  ctx.restore();

  // LABEL-OCCLUSION-1: advance the hold with THIS frame's criterion, and hand the result back for
  // the next one. It runs after the layout because the criterion is the layout's output, and the
  // one-frame lag is the same threading `tagIncumbents` already uses.
  const nextWideForms = tagFormHold
    ? advanceLabelForms(tagFormHold, {
        shown: tagLayout.shown,
        clear: tagLayout.wideClear,
        nowMs: ts,
        holdMs: LABEL_FORM_HOLD_MS,
      })
    : null;

  drawRacers(
    ctx,
    st,
    racerType,
    tagLayout,
    cameraConfig.battleFocusDarkening,
    camera.hudState,
    camera.comebackLockedRacerIndex,
    focusFactor,
    livePulkGroup,
    showRpStartRow,
    assignmentByRacer,
    displayScale,
    effZoomX,
    effZoomY,
    tagFontPx,
    renderAlpha,
    interpolationEnabled,
    cameraConfig.highlightHeroes ?? false,
    gapRerollDevMarker ?? false,
    racerScreenH,
    labelMarginPx
  );
  drawBattleDiagMarkers(
    ctx,
    st,
    camera.hudState,
    cam,
    effZoomX,
    renderAlpha,
    interpolationEnabled,
    isOpenTrack,
    bsY,
    leaderDiag
  );
  ctx.restore();

  // ── Screen space ─────────────────────────────────────────────────────────────────────────────
  if (isOpenTrack) {
    drawTitleOpen(ctx, raceData);
  } else {
    drawTitle(ctx, shape, raceData);
    drawFinalLapOverlay(ctx, ts, st.finalLapStartTs);
  }

  let countdownNumber = null;
  if (st.phase === PHASE.COUNTDOWN) {
    const cdElapsed = ts - st.countdownStart;
    // START-BOARD-1/2 — THE RUNNERS' BOARD, under the digits and over everything else.
    //
    // ONE SCHEDULE, asked from the rhythm module rather than re-derived here. It now decides three
    // things at once and they cannot disagree: how long the board is up, how long the countdown
    // lasts, and therefore what the digits read. Two homes for "how long is the push" is the defect
    // the ceremony work spent a night removing; this is the same rule applied to the board.
    // CEREMONY-TRUTH-1: THE FALLBACKS ARE THE DEFAULTS. They were all `?? 0`, which is a second
    // authority on six values `defaults.js` owns — and zero is the worst possible choice for every
    // one of them, because it produces a ceremony that silently skips a beat instead of failing.
    const schedule = ceremonySchedule(
      cameraConfig?.ceremonyVenueMs ?? DEFAULT_CAMERA_CONFIG.ceremonyVenueMs,
      cameraConfig?.ceremonyPushMs ?? DEFAULT_CAMERA_CONFIG.ceremonyPushMs,
      cameraConfig?.ceremonySettledMs ?? DEFAULT_CAMERA_CONFIG.ceremonySettledMs,
      boardDurationMs(
        st.racers?.length ?? 0,
        cameraConfig?.startBoardFloorMs ?? DEFAULT_CAMERA_CONFIG.startBoardFloorMs,
        cameraConfig?.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName
      ),
      cameraConfig?.countdownDigitsMs ?? DEFAULT_CAMERA_CONFIG.countdownDigitsMs
    );
    drawStartBoard(ctx, {
      racers: st.racers,
      racerType,
      displaySize,
      assignmentByRacer,
      alpha: boardAlphaAt(cdElapsed, schedule),
      canvasW,
      canvasH,
    });
    countdownNumber = drawCountdownOverlay(
      ctx,
      cdElapsed,
      schedule.totalMs,
      schedule.countdownStartMs
    );
  } else if (st.phase === PHASE.FINISHED) {
    drawFinishedOverlay(ctx);
  }

  // The lap counter is now part of the right-hand HUD stack (hudLayout.js) instead of drawing
  // itself at a hardcoded y. Open tracks have no laps, so it is simply absent there.
  drawHudPills(ctx, {
    st,
    cfgBadge,
    buildBadge,
    racePlanActive,
    racePlanSeed,
    canvasW,
    canvasH,
    lapText: isOpenTrack ? null : lapInfoText(st.racers, st.maxLaps),
  });

  // ── PiP minimap (RACING and FINISHED only) ──
  if (st.phase !== PHASE.COUNTDOWN) {
    const leaderIdx = st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0);
    const minimapHighlights = showRpMinimapBadges && rpPlanInfo ? rpPlanInfo.b1Indices : null;
    renderMinimap(ctx, shape, st.racers, leaderIdx, canvasW, canvasH, minimapHighlights);
  }

  return {
    effZoomX,
    effZoomY,
    displayScale,
    tagShown: tagLayout.shown,
    tagWide: tagLayout.wide,
    tagWideForms: nextWideForms,
    countdownNumber,
  };
}

/**
 * Top-right HUD info pills.
 *
 * Each row is a pill that HUGS its text: the label sits INSIDE the block, left-aligned and
 * vertically centred, with the block right-anchored so the two rows line up. The explicit
 * textAlign/textBaseline are REQUIRED — earlier render helpers (racer name tags, overlays) leave
 * the shared context at textAlign='center'/'right', which previously pushed these labels out to the
 * LEFT of their bars. One helper draws both rows so they can never drift apart.
 */
function drawHudPills(
  ctx,
  { st, cfgBadge, buildBadge, racePlanActive, racePlanSeed, canvasW, canvasH, lapText }
) {
  // ONE owner of this column (hudLayout.js). Every row is placed after the one above it, so the
  // build line cannot land on the lap counter the way it did on the owner's screenshot.
  const showRacePlan = racePlanActive && st.phase !== PHASE.COUNTDOWN;
  const showRest = st.phase !== PHASE.COUNTDOWN;
  const rows = hudRightColumn(canvasW, canvasH, {
    racePlan: showRacePlan,
    cfg: showRest,
    lap: showRest && !!lapText,
    build: showRest && !!buildBadge,
  });

  const pill = (label, row, bg, fg) => {
    ctx.save();
    ctx.font = `${row.fontPx}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const pad = Math.max(4, Math.round(row.fontPx * 0.8));
    const w = Math.ceil(ctx.measureText(label).width) + pad * 2;
    const x = row.right - w;
    ctx.fillStyle = bg;
    ctx.fillRect(x, row.y, w, row.h);
    ctx.fillStyle = fg;
    ctx.fillText(label, x + pad, row.y + row.h / 2 + 0.5);
    ctx.restore();
  };

  // Row 1 - Race Plan status. With a seed > 0 the number seeds the plan AND the dynamics.
  if (showRacePlan) {
    const label =
      racePlanSeed > 0 ? `Race Plan: ON  seed:${racePlanSeed}` : 'Race Plan: ON  unseeded';
    pill(label, rows.racePlan, 'rgba(0,0,0,0.65)', '#4fc3f7');
  }

  // Row 2 - config-fingerprint badge. RED means "NOT apples-to-apples with a default-config sim
  // run" - RACE-relevant drift only. Cosmetic drift is reported quietly and never turns it red.
  if (showRest) {
    const off = cfgBadge.raceCount > 0;
    const label =
      cfgBadge.raceCount === 0 && cfgBadge.cosmeticCount === 0
        ? `cfg ${cfgBadge.hashShort} \u00b7 defaults`
        : `cfg ${cfgBadge.hashShort} \u00b7 ${cfgBadge.raceCount} race / ${cfgBadge.cosmeticCount} cosmetic`;
    pill(
      label,
      rows.cfg,
      off ? 'rgba(120,20,20,0.82)' : 'rgba(0,0,0,0.5)',
      off ? '#ff8a80' : '#9e9e9e'
    );
  }

  // Row 3 - the LAP counter. Game information, not diagnostics, so it keeps its own look (bold
  // sans, blue glow) - but it is placed by the same stack, which is the entire point of hudLayout.
  if (showRest && lapText) {
    const row = rows.lap;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${row.fontPx}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#0088ff';
    ctx.fillText(lapText, row.right, row.y + row.h / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Row 4 - BUILD IDENTITY (BUILD-TRUTH-1). AMBER when uncertain: dirty means this frame is not
  // reproducible from any commit; unknown means the identity could not be read at all.
  if (showRest && buildBadge) {
    const uncertain = isBuildUncertain(buildBadge);
    pill(
      formatBuildLabel(buildBadge),
      rows.build,
      uncertain ? 'rgba(120,80,0,0.82)' : 'rgba(0,0,0,0.5)',
      uncertain ? '#ffcc80' : '#9e9e9e'
    );
  }
}
