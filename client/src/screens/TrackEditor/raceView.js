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
//
//              PARTICLES-VISIBILITY-11 — reference points, because the owner found size could not be
//              judged from background and effects alone (2026-09-29): the editor's own track lines
//              (trackEditorDraw.js drawTrackLines), three racers of the track's racer type at the
//              race's drawn size (raceParams.js deriveSpriteGeometry, autoSpriteScale.js
//              computeRenderDisplayScale, the type's own drawRacer), and the panel's area as a frame
//              in the main view.
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
import { deriveSpriteGeometry } from '../../modules/raceParams.js';
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
} from '../../modules/autoSpriteScale.js';
import { catmullRomSpline } from '../../modules/track-editor/catmullRom.js';
import { computeStartRowCount } from '../../modules/rowLayout.js';
import { drawTrackLines } from './trackEditorDraw.js';

/**
 * The race view's canvas: a WHOLE race frame, 1280×720 at the race canvas's own pixel scale, so an
 * effect item or a racer is exactly as many canvas pixels across as in the race and as many fall on
 * each pixel area. PARTICLES-VISIBILITY-12 made the race view a full-width view of its own; the
 * centre-half crop it had as a small panel beside the track view (PARTICLES-VISIBILITY-10) is gone.
 */
export const RACE_VIEW_W = REFERENCE_CANVAS_W;
export const RACE_VIEW_H = REFERENCE_CANVAS_H;

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

// ── PARTICLES-VISIBILITY-11: the racer reference ─────────────────────────────────────────────────

/**
 * The field size the reference racers are sized for. The race sizes every racer from the field
 * (`deriveSpriteGeometry` packs the start grid across the track), so a racer has no size of its own:
 * three racers drawn at a THREE-racer race's size would be two to three times the size the owner
 * sees. 40 is his usual field — 28 of his 36 stored races on 2026-09-29.
 */
export const RACE_VIEW_FIELD_SIZE = 40;

/**
 * The world-space scale the race passes to `drawRacer` for this racer type at this zoom — the race's
 * own two steps: the drawing scale `buildRaceCoreParams` derives (raceParams.js deriveSpriteGeometry,
 * as RaceScreen/index.jsx calls it), then the frame's bounds (autoSpriteScale.js
 * computeRenderDisplayScale, as renderRaceFrame.js calls it with the X-axis zoom).
 *
 * @param {object} p
 * @param {object} p.racerType             the racer-type instance (`getRacerType`, host overrides applied)
 * @param {number} p.trackWidthPx          the corridor width the race passes
 * @param {number} p.scaleX                the panel's world→screen scale on X
 * @param {object} p.cameraConfig          `loadCameraConfig()`
 * @param {object} p.autoScaleConfig       `loadAutoScaleConfig()`
 * @param {object} p.behaviorConfig        `loadRaceBehaviorConfig()` — its `startSpreadRange`
 * @param {boolean} p.hasDisplaySizeOverride  the owner pinned this type's displaySize
 * @param {number} [p.nRacers]             the field size (RACE_VIEW_FIELD_SIZE)
 * @returns {number} the scale for `drawRacer`
 */
export function raceViewRacerScale({
  racerType,
  trackWidthPx,
  scaleX,
  cameraConfig,
  autoScaleConfig,
  behaviorConfig,
  hasDisplaySizeOverride,
  nRacers = RACE_VIEW_FIELD_SIZE,
}) {
  const c = racerType.config;
  const { displaySizeScale } = deriveSpriteGeometry({
    displaySize: c.displaySize,
    bodyFillX: c.bodyFillX,
    bodyFillY: c.bodyFillY,
    nRacers,
    effectiveWidth: trackWidthPx * behaviorConfig.startSpreadRange,
    autoScaleConfig,
    hasDisplaySizeOverride,
  });
  return computeRenderDisplayScale(
    c.displaySize,
    displaySizeScale,
    scaleX,
    getEffectiveMaxTargetScreenPx(c.maxTargetScreenPx, cameraConfig.maxTargetScreenPx),
    cameraConfig.minDrawnFrameFrac,
    REFERENCE_CANVAS_H
  );
}

/**
 * The track's course where the panel looks: the point of the centre line nearest `centre`, the
 * direction of travel there, and the corridor width. The centre line is the editor's own spline — the
 * centre points, or halfway between the inner and outer boundaries, as trackEditorSave.js builds it.
 *
 * @returns {{ x:number, y:number, angle:number, width:number } | null} null while no track is drawn
 */
export function raceViewCourse(
  { mode, centerPoints, innerPoints, outerPoints, centerWidth, closed },
  centre
) {
  const minPts = closed ? 3 : 2;
  const spline = (pts) => catmullRomSpline(pts, { closed, tension: 0.5, samples: 200 });
  let mid;
  let widthAt;
  if (mode === 'center') {
    if (centerPoints.length < minPts) return null;
    mid = spline(centerPoints);
    widthAt = () => centerWidth;
  } else {
    if (innerPoints.length < minPts || outerPoints.length < minPts) return null;
    const inner = spline(innerPoints);
    const outer = spline(outerPoints);
    mid = inner.map((p, i) => ({ x: (p.x + outer[i].x) / 2, y: (p.y + outer[i].y) / 2 }));
    widthAt = (i) => Math.hypot(inner[i].x - outer[i].x, inner[i].y - outer[i].y);
  }
  const dist2 = (p) => (p.x - centre.x) ** 2 + (p.y - centre.y) ** 2;
  let best = 0;
  for (let i = 1; i < mid.length; i++) if (dist2(mid[i]) < dist2(mid[best])) best = i;
  const a = mid[Math.max(0, best - 1)];
  const b = mid[Math.min(mid.length - 1, best + 1)];
  return {
    x: mid[best].x,
    y: mid[best].y,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    width: widthAt(best),
  };
}

/**
 * The lateral distance, in world px, between two neighbours in a start-grid row of the race — the
 * race's own grid for this field: the row count `raceCore.js` takes from `computeStartRowCount`
 * (rowLayout.js) with the physical sprite size `deriveSpriteGeometry` derives, and the slots
 * `computeRowPhysicalY` spreads evenly over ±startSpreadRange, where ±0.5 is the corridor's edge.
 * So neighbours sit `startSpreadRange × width / (rowSize − 1)` apart.
 *
 * @returns {number} world px; 0 when a row holds one racer
 */
export function raceViewRowSlotPx({
  racerType,
  trackWidthPx,
  autoScaleConfig,
  behaviorConfig,
  hasDisplaySizeOverride,
  nRacers = RACE_VIEW_FIELD_SIZE,
}) {
  const c = racerType.config;
  const spread = behaviorConfig.startSpreadRange;
  const effectiveWidth = trackWidthPx * spread;
  const { physicalSpriteSize } = deriveSpriteGeometry({
    displaySize: c.displaySize,
    bodyFillX: c.bodyFillX,
    bodyFillY: c.bodyFillY,
    nRacers,
    effectiveWidth,
    autoScaleConfig,
    hasDisplaySizeOverride,
  });
  const rowSize = Math.ceil(
    nRacers / computeStartRowCount(effectiveWidth, nRacers, physicalSpriteSize)
  );
  return rowSize > 1 ? (spread * trackWidthPx) / (rowSize - 1) : 0;
}

/**
 * Three racers standing still side by side across the course: three neighbouring slots of a start
 * row, centred on the centre line, `slotPx` apart (raceViewRowSlotPx), all facing the direction of
 * travel.
 */
export function raceViewRacerPlacements(course, slotPx) {
  const nx = -Math.sin(course.angle);
  const ny = Math.cos(course.angle);
  return [-1, 0, 1].map((k) => ({
    x: course.x + nx * k * slotPx,
    y: course.y + ny * k * slotPx,
    angle: course.angle,
  }));
}

// ── PARTICLES-VISIBILITY-11: the panel's area in the main view ───────────────────────────────────

/** The world rectangle the panel shows: its canvas divided by its scale, around its centre. */
export function raceViewArea({ centre, scaleX, scaleY }) {
  const w = RACE_VIEW_W / scaleX;
  const h = RACE_VIEW_H / scaleY;
  return { x: centre.x - w / 2, y: centre.y - h / 2, w, h };
}

/**
 * Outline the panel's area in the main view, inside the main view's world transform. The line is
 * held at 1.5 screen px whatever the main view's zoom (`screenPerWorld` is its smaller axis scale).
 */
export function drawRaceViewFrame(ctx, view, screenPerWorld) {
  const a = raceViewArea(view);
  ctx.save();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffd400';
  ctx.lineWidth = 1.5 / screenPerWorld;
  ctx.strokeRect(a.x, a.y, a.w, a.h);
  ctx.restore();
}

/**
 * Draw the panel, inside the race-camera world-to-screen transform centred on `centre`, in the race's
 * own layer order (renderRaceFrame.js): the race's background; every effect instance; then the track
 * markings — the race draws its finish gate and lights AFTER the effects, so the editor's track lines
 * go there; then the racers, on top, as in the race. The effect instances are NOT updated here; the
 * editor's preview loop advances them once per frame and both views draw the same state.
 *
 * @param {object} view
 * @param {object} [view.lines]   the editor's scene state, for drawTrackLines; omitted = no lines
 * @param {object} [view.racers]  { racerType, displayScale, placements }; omitted = no racers
 * @returns {boolean} true when the background image is drawn (or there is none); false while it loads
 */
export function drawRaceView(
  ctx,
  { centre, scaleX, scaleY, bgPath, worldW, worldH, frame, lines, racers },
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
  // PARTICLES-VISIBILITY-11: the track's course — the main view's own lines, at this zoom.
  if (lines) {
    ctx.save();
    drawTrackLines(ctx, lines);
    ctx.restore();
  }
  // PARTICLES-VISIBILITY-11: the size reference — the type's own drawRacer at the race's scale. Before
  // its sprite has loaded, drawRacer itself draws the type's fallback disc at the same size.
  if (racers) {
    for (const [i, p] of racers.placements.entries()) {
      racers.racerType.drawRacer(
        ctx,
        p.x,
        p.y,
        p.angle,
        { index: i, speed: 0 },
        false,
        frame,
        racers.displayScale,
        false
      );
    }
  }
  ctx.restore();
  return !bgPath || getBackgroundImage(bgPath) !== null;
}
