// ============================================================
// File:        raceView.js
// Path:        client/src/screens/TrackEditor/raceView.js
// Project:     RaceArena — PARTICLES-VISIBILITY-10
// Description: The Track Editor's "race view" panel: a section of the track at the race camera's
//              ordinary racing zoom, with the race's background and the editor's live track effects.
//              The owner's decision of 2026-09-29: preview effects at race-camera distance in the
//              editor, and change nothing about how effects are sized or counted.
//
//              Nothing here is a second copy of the race: the zoom is the camera's own conversion
//              (zoomUnit.js), the background is the race's own function (trackRendering.js), and the
//              effects are the editor's preview instances, drawn by their own `render`.
// ============================================================

import {
  projectionForTrack,
  REFERENCE_CANVAS_W,
  REFERENCE_CANVAS_H,
} from '../../modules/camera/projection.js';
import { resolveFramingConfig, DEFAULT_CORRIDORS } from '../../modules/camera/framingConfig.js';
import { referenceWidthFor, resolveZoomForCorridors } from '../../modules/camera/zoomUnit.js';
import { drawEditorBackground } from '../RaceScreen/drawing/trackRendering.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';

/**
 * The panel's canvas: the CENTRE HALF (each axis) of a 1280×720 race frame, at the race canvas's own
 * pixel scale. A crop rather than a shrunken whole frame, so an effect item is exactly as many canvas
 * pixels across as in the race and as many items fall on each pixel area — only less of the frame
 * is shown.
 */
export const RACE_VIEW_W = REFERENCE_CANVAS_W / 2;
export const RACE_VIEW_H = REFERENCE_CANVAS_H / 2;

/** The camera state whose zoom is the ordinary racing shot — "the reference shot" in defaults.js. */
const RACING_STATE = 'LEADER_ZOOM';

/**
 * The race camera's ordinary racing zoom for a track, as world→screen scales of the race canvas.
 *
 * THE ZOOM SOURCE. This is the director's own conversion, called the way the director calls it:
 * `CameraDirector._computeZoomForCorridors` (CameraDirector.js:522) → `resolveZoomForCorridors`
 * (zoomUnit.js:160) with the state's `visibleCorridors` from `resolveFramingConfig`
 * (framingConfig.js:99), `referenceWidthFor` (zoomUnit.js:83) and the track's projection from
 * `projectionForTrack` (projection.js:179). The per-frame guarantees the director applies on top
 * (corridor, pair, company — `_setTargets`) can only WIDEN a shot around the racers, and there are no
 * racers here, so they are not applied.
 *
 * @param {object} p
 * @param {number} p.worldW
 * @param {number} p.worldH
 * @param {boolean} p.isOpenTrack
 * @param {number} p.trackWidthPx  the corridor width the race passes (`geometry.width`)
 * @param {object} p.cameraConfig  the resolved camera config (`loadCameraConfig()`, as the race reads it)
 * @returns {{ camZoom: number, scaleX: number, scaleY: number }} scale = race-canvas px per world px
 */
export function raceViewScale({ worldW, worldH, isOpenTrack, trackWidthPx, cameraConfig }) {
  const proj = projectionForTrack(worldW, worldH, isOpenTrack);
  const framing = resolveFramingConfig(cameraConfig);
  const camZoom = resolveZoomForCorridors(framing.corridorsByState[RACING_STATE], {
    referenceWidthPx: referenceWidthFor(framing.referenceCorridorPx, trackWidthPx),
    axisY: proj.axisY,
    clampCamZoom: (z) => proj.clampCamZoom(z),
    fallbackCorridors: DEFAULT_CORRIDORS[RACING_STATE],
  });
  return { camZoom, scaleX: proj.effX(camZoom), scaleY: proj.effY(camZoom) };
}

/**
 * Where the panel looks by default: the start of the track (its first centre point, or the midpoint
 * of the first inner and outer points in boundary mode) — the start/finish line on a closed track,
 * the start on an open one. The world centre when nothing is drawn yet.
 */
export function raceViewStart({ mode, centerPoints, innerPoints, outerPoints, worldW, worldH }) {
  if (mode === 'center' && centerPoints.length > 0)
    return { x: centerPoints[0].x, y: centerPoints[0].y };
  if (mode !== 'center' && innerPoints.length > 0 && outerPoints.length > 0) {
    return {
      x: (innerPoints[0].x + outerPoints[0].x) / 2,
      y: (innerPoints[0].y + outerPoints[0].y) / 2,
    };
  }
  return { x: worldW / 2, y: worldH / 2 };
}

/**
 * Draw the panel: the race's background, then every effect instance, inside the race-camera
 * world-to-screen transform centred on `centre` — the same order and the same save/render/restore
 * per effect as renderRaceFrame.js. The instances are NOT updated here; the editor's preview loop
 * advances them once per frame and both views draw the same state.
 *
 * @returns {boolean} true when the background image is drawn (or there is none); false while it loads
 */
export function drawRaceView(
  ctx,
  { centre, scaleX, scaleY, bgPath, worldW, worldH, frame },
  effects
) {
  ctx.clearRect(0, 0, RACE_VIEW_W, RACE_VIEW_H);
  ctx.save();
  ctx.translate(RACE_VIEW_W / 2, RACE_VIEW_H / 2);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-centre.x, -centre.y);
  drawEditorBackground(ctx, frame, bgPath, worldW, worldH);
  for (const inst of effects) {
    ctx.save();
    inst.render(ctx);
    ctx.restore();
  }
  ctx.restore();
  return !bgPath || getBackgroundImage(bgPath) !== null;
}
