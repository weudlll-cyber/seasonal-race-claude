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
  drawLapInfo,
  drawFinalLapOverlay,
  drawCountdownOverlay,
  drawFinishedOverlay,
} from './drawing/overlayRendering.js';
import { drawTrackLights } from '../../modules/trackLights.js';
import { computeTagLayout, tagFontScreenPx } from './nameTagLayout.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import { effectiveZoom } from '../../modules/camera/openTrackCamera.js';
import { OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
} from '../../modules/autoSpriteScale.js';
import { PHASE } from './racePhase.js';
import { formatBuildLabel, isBuildUncertain } from '../../modules/buildInfo.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;

// The bottom edge of the config badge (row 2), which is historical fixed-px: y 34, height 20. The
// build row anchors below it rather than duplicating those numbers, so if row 2 ever moves this
// follows instead of overlapping it.
const HUD_ROW2_BOTTOM = 54;

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
  const raceElapsedMs = st.raceStart != null ? ts - st.raceStart : 0;
  const showAllTags =
    st.phase !== PHASE.RACING || raceElapsedMs < (cameraConfig.nameTagAllUntilMs ?? 0);
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
    measureText: measureTagText,
    showAll: showAllTags,
    incumbents: tagIncumbents,
    labelOf: (r) =>
      showRpStartRow
        ? r.name + ' (R' + (assignmentByRacer.get(r.index)?.rowIndex ?? 0) + ')'
        : r.name,
  });
  ctx.restore();

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
    gapRerollDevMarker ?? false
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
    drawLapInfo(ctx, st.racers, st.maxLaps);
    drawFinalLapOverlay(ctx, ts, st.finalLapStartTs);
  }

  let countdownNumber = null;
  if (st.phase === PHASE.COUNTDOWN) {
    countdownNumber = drawCountdownOverlay(ctx, ts - st.countdownStart);
  } else if (st.phase === PHASE.FINISHED) {
    drawFinishedOverlay(ctx);
  }

  drawHudPills(ctx, { st, cfgBadge, buildBadge, racePlanActive, racePlanSeed, canvasW, canvasH });

  // ── PiP minimap (RACING and FINISHED only) ──
  if (st.phase !== PHASE.COUNTDOWN) {
    const leaderIdx = st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0);
    const minimapHighlights = showRpMinimapBadges && rpPlanInfo ? rpPlanInfo.b1Indices : null;
    renderMinimap(ctx, shape, st.racers, leaderIdx, canvasW, canvasH, minimapHighlights);
  }

  return { effZoomX, effZoomY, displayScale, tagShown: tagLayout.shown, countdownNumber };
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
  { st, cfgBadge, buildBadge, racePlanActive, racePlanSeed, canvasW, canvasH }
) {
  const right = canvasW - 8;
  const pill = (label, y, h, bg, fg, fontPx) => {
    ctx.save();
    ctx.font = `${fontPx}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const pad = 8;
    const w = Math.ceil(ctx.measureText(label).width) + pad * 2;
    const x = right - w;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.fillText(label, x + pad, y + h / 2 + 0.5);
    ctx.restore();
  };

  // Row 1 — Race Plan status (dev/sightcheck aid). Truthful label: with a seed > 0 the number is
  // the seed of the plan AND the dynamics (the race replays exactly); at 0 nothing is seeded.
  if (racePlanActive && st.phase !== PHASE.COUNTDOWN) {
    const label =
      racePlanSeed > 0 ? `Race Plan: ON  seed:${racePlanSeed}` : 'Race Plan: ON  unseeded';
    pill(label, 8, 22, 'rgba(0,0,0,0.65)', '#4fc3f7', 11);
  }

  // Row 2 — config-fingerprint badge. RED means "NOT apples-to-apples with a default-config sim
  // run" — that is RACE-relevant drift only. Cosmetic (camera / frame-timing) drift is reported
  // quietly and never turns the badge red.
  if (st.phase !== PHASE.COUNTDOWN) {
    const off = cfgBadge.raceCount > 0;
    const label =
      cfgBadge.raceCount === 0 && cfgBadge.cosmeticCount === 0
        ? `cfg ${cfgBadge.hashShort} · defaults`
        : `cfg ${cfgBadge.hashShort} · ${cfgBadge.raceCount} race / ${cfgBadge.cosmeticCount} cosmetic`;
    pill(
      label,
      34,
      20,
      off ? 'rgba(120,20,20,0.82)' : 'rgba(0,0,0,0.5)',
      off ? '#ff8a80' : '#9e9e9e',
      10
    );
  }

  // Row 3 — BUILD IDENTITY (BUILD-TRUTH-1). Which commit is on screen, on which branch, and whether
  // the tree is dirty. It exists because the owner judged the picture twice without being able to
  // tell which code drew it. AMBER when the build is uncertain — dirty means this exact frame is not
  // reproducible from any commit, and `unknown` means the identity could not be read at all.
  //
  // SIZED RELATIVE TO THE FRAME, per the standing rule: the two rows above are historical fixed-px
  // and are deliberately not touched here, so this row anchors below their fixed extent and then
  // scales itself. At the reference 720-px canvas it lands at the same weight as the cfg badge.
  if (buildBadge && st.phase !== PHASE.COUNTDOWN) {
    const fontPx = Math.max(8, Math.round(canvasH * 0.0139)); // 10 px at the 720 reference
    const h = Math.max(14, Math.round(canvasH * 0.0278)); // 20 px at the 720 reference
    const uncertain = isBuildUncertain(buildBadge);
    pill(
      formatBuildLabel(buildBadge),
      HUD_ROW2_BOTTOM + Math.round(canvasH * 0.0056), // 4 px gap at the reference
      h,
      uncertain ? 'rgba(120,80,0,0.82)' : 'rgba(0,0,0,0.5)',
      uncertain ? '#ffcc80' : '#9e9e9e',
      fontPx
    );
  }
}
