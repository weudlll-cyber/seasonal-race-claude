// ============================================================
// File:        racerRendering.js
// Path:        client/src/screens/RaceScreen/drawing/racerRendering.js
// Project:     RaceArena
// Created:     2026-05-25
// Description: Canvas renderer for racers, name tags, and dust trails
//              in world coordinates.
// ============================================================

import { visibleTagRacers } from '../nameTagVisibility.js';
import { lerp, lerpAngle } from '../../../utils/mathUtils.js';

const PHASE_RACING = 1;

/**
 * Draws the name tag above a racer in world coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} px  World X position.
 * @param {number} py  World Y position.
 * @param {string} name
 * @param {boolean} isLeader
 * @param {boolean} isComeback
 * @param {number} ezoom  Effective canvas zoom (used to size labels in world units).
 * @param {boolean} isRacing  True when phase === RACING (enables crown icon).
 */
function drawNameTag(ctx, px, py, name, isLeader, isComeback, ezoom, isRacing) {
  const inv = 1 / ezoom;
  const fontPx = Math.max(8, Math.round(11 * inv));
  const bgH = Math.max(6, Math.round(13 * inv));
  const offsetY = Math.max(12, Math.round(22 * inv));
  const nameY = py - offsetY;
  ctx.font = `bold ${fontPx}px sans-serif`;
  const nameW = ctx.measureText(name).width + Math.round(8 * inv);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(px - nameW / 2, nameY - bgH, nameW, bgH);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillStyle = isLeader ? '#ffd700' : isComeback ? '#00dd55' : '#eee';
  ctx.fillText(name, px, nameY);
  if (isLeader && isRacing) {
    ctx.font = `${Math.max(10, Math.round(14 * inv))}px serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('👑', px, nameY - bgH);
  }
}

/**
 * Draws all racer sprites, trails, and name tags for one frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} st  Game state (g.current): racers, phase, focusFadeProgress, slowmoTs, lastTs.
 * @param {object} racerType  Racer type instance with drawRacer() method.
 * @param {number} tagVisibleMaxCount  Max tags shown (from cameraConfig).
 * @param {number} battleFocusDarkening  Dim factor for non-group racers (from cameraConfig).
 * @param {string|null} hudState  CameraDirector.hudState (for comeback detection).
 * @param {number|null} comebackLockedIdx  CameraDirector.comebackLockedRacerIndex.
 * @param {number} focusFactor  st.focusFadeProgress ?? 0 (hoisted by caller).
 * @param {Array|null} livePulkGroup  Result of _detectPulkGroup (hoisted by caller), or null.
 * @param {boolean} showRpStartRowCfg  Whether to show row number in name tags.
 * @param {Map} assignmentByRacer  racer.index → { rowIndex } assignment map.
 * @param {number} effectiveScale  Sprite display scale.
 * @param {number} ezoom  Effective canvas zoom.
 * @param {number} renderAlpha  Render-interpolation alpha (0 = no interp).
 * @param {boolean} interpolationEnabled  Whether render interpolation is active.
 */
export function drawRacers(
  ctx,
  st,
  racerType,
  tagVisibleMaxCount,
  battleFocusDarkening,
  hudState,
  comebackLockedIdx,
  focusFactor,
  livePulkGroup,
  showRpStartRowCfg,
  assignmentByRacer,
  effectiveScale,
  ezoom,
  renderAlpha,
  interpolationEnabled,
  // DIAG per-piece paint probes (default false). Gate ONLY the paint of each piece — the trail
  // history state (r.trail push/shift) still updates regardless, so toggling changes nothing but
  // whether the piece is painted.
  diagHideRacerTrails = false,
  diagHideRacerSprites = false
) {
  const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
  const inv = 1 / ezoom;
  const isRacing = st.phase === PHASE_RACING;
  const tagSet = new Set(visibleTagRacers(st.racers, isRacing, tagVisibleMaxCount));
  const doInterp = interpolationEnabled && isRacing;

  const isInComeback = hudState === 'COMEBACK_ZOOM';
  const comebackRacer =
    isInComeback && comebackLockedIdx != null
      ? st.racers.find((r) => r.index === comebackLockedIdx)
      : null;

  const battleGroupIndices = livePulkGroup
    ? new Set(livePulkGroup.map((r) => r.index).filter((i) => i != null))
    : null;

  function paintRacer(r, dimAlpha = 1) {
    const renderX = doInterp ? lerp(r._prevX ?? r.x, r.x, renderAlpha) : r.x;
    const renderY = doInterp ? lerp(r._prevY ?? r.y, r.y, renderAlpha) : r.y;
    const renderAngle = doInterp
      ? lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha)
      : r.angle;
    if (!diagHideRacerTrails) {
      for (let i = 0; i < r.trail.length; i++) {
        const frac = (i + 1) / r.trail.length;
        ctx.globalAlpha = frac * 0.4 * dimAlpha;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.trail[i].x, r.trail[i].y, (frac * 5 + 1) * inv, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = dimAlpha;
    const rIsComeback = r === comebackRacer;
    if (!diagHideRacerSprites) {
      racerType.drawRacer(
        ctx,
        renderX,
        renderY,
        renderAngle,
        r,
        r === leader,
        st.slowmoTs ?? st.lastTs ?? 0,
        effectiveScale,
        rIsComeback
      );
    }
    if (tagSet.has(r) || rIsComeback) {
      const tagName = showRpStartRowCfg
        ? r.name + ' (R' + (assignmentByRacer.get(r.index)?.rowIndex ?? 0) + ')'
        : r.name;
      drawNameTag(
        ctx,
        renderX,
        renderY,
        tagName,
        r === leader,
        rIsComeback && r !== leader,
        ezoom,
        isRacing
      );
    }
    r.trail.push({ x: renderX, y: renderY });
    if (r.trail.length > 10) r.trail.shift();
  }

  if (focusFactor > 0 && battleGroupIndices && battleGroupIndices.size > 0) {
    const dark = (battleFocusDarkening ?? 0.4) * focusFactor;
    for (const r of st.racers) {
      paintRacer(r, battleGroupIndices.has(r.index) ? 1 : 1 - dark);
    }
    ctx.globalAlpha = 1;
  } else {
    for (const r of st.racers) paintRacer(r);
  }
}
