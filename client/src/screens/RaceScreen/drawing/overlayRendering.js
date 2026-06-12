// ============================================================
// File:        overlayRendering.js
// Path:        client/src/screens/RaceScreen/drawing/overlayRendering.js
// Project:     RaceArena
// Created:     2026-05-25
// Description: Canvas renderer for race overlays — event title, lap counter,
//              position results panel, and camera-debug info.
// ============================================================

import { currentLap } from '../../../modules/camera/lapUtils.js';

const CW = 1280;
const CH = 720;
const CD_COLORS = ['#00ff55', '#33ff88', '#ffcc00', '#ff3333'];

/**
 * Draws the race title for closed tracks above the track area.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape  EditorShape instance (provides getEdgePoints).
 * @param {object} raceData  { eventName, trackName, subtitle }
 */
export function drawTitle(ctx, shape, raceData) {
  const titleY = 44;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffd700';
  ctx.fillText(
    `🏆  ${raceData.eventName || 'Race'}  ·  ${raceData.trackName || ''}`,
    CW / 2,
    titleY
  );
  if (raceData.subtitle) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.65)';
    ctx.fillText(raceData.subtitle, CW / 2, titleY + 22);
  }
  ctx.shadowBlur = 0;
}

/**
 * Draws the race title for open tracks at a fixed top position.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} raceData  { eventName, trackName, subtitle }
 */
export function drawTitleOpen(ctx, raceData) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffd700';
  ctx.fillText(`🏆  ${raceData.eventName || 'Race'}  ·  ${raceData.trackName || ''}`, CW / 2, 38);
  if (raceData.subtitle) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.65)';
    ctx.fillText(raceData.subtitle, CW / 2, 60);
  }
  ctx.shadowBlur = 0;
}

/**
 * Draws the lap counter (top-right) for multi-lap closed tracks.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} racers  Array of racer state objects (each has `.t`).
 * @param {number} maxLaps
 */
export function drawLapInfo(ctx, racers, maxLaps) {
  if (maxLaps <= 1) return;
  const leader = racers.reduce((a, b) => (b.t > a.t ? b : a));
  const lapNum = currentLap(leader.t, maxLaps);
  const text = `LAP ${lapNum} / ${maxLaps}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#0088ff';
  ctx.fillText(text, CW - 14, 66);
  ctx.shadowBlur = 0;
}

/**
 * Draws the "FINAL LAP!" flash overlay when the leader enters the last lap.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts  Current timestamp (ms).
 * @param {number|null} finalLapStartTs  Timestamp when the final lap began, or null.
 */
export function drawFinalLapOverlay(ctx, ts, finalLapStartTs) {
  if (!finalLapStartTs) return;
  const age = ts - finalLapStartTs;
  if (age > 3000) return;
  const alpha = age < 500 ? age / 500 : age > 2500 ? 1 - (age - 2500) / 500 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#ff4400';
  ctx.shadowBlur = 30;
  ctx.shadowColor = '#ff6600';
  ctx.fillText('FINAL LAP!', CW / 2, CH / 2 - 80);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * Draws the countdown number (3, 2, 1, GO!) in the top-right corner.
 * Returns the current countdown integer so the caller can update React state.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} elapsed  ms since countdown started.
 * @returns {number} n — 3, 2, 1, or 0 ("GO!").
 */
export function drawCountdownOverlay(ctx, elapsed) {
  const n = Math.max(0, 3 - Math.floor(elapsed / 1000));
  const color = CD_COLORS[n] ?? '#fff';
  const text = n > 0 ? String(n) : 'GO!';
  const fSize = n > 0 ? 56 : 44;
  const shrink = 1 - ((elapsed % 1000) / 1000) * 0.1;
  const padX = 14,
    padY = 8;
  const anchorX = CW - 18;
  const anchorY = 18;
  ctx.save();
  ctx.translate(anchorX, anchorY + fSize / 2);
  ctx.scale(shrink, shrink);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fSize}px sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(-(tw + padX * 2), -(fSize / 2 + padY), tw + padX * 2, fSize + padY * 2, 8);
  ctx.fill();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
  return n;
}

/**
 * Draws the "RACE FINISHED!" full-screen overlay.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawFinishedOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 80px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.shadowBlur = 45;
  ctx.shadowColor = '#ffd700';
  ctx.fillText('RACE FINISHED!', CW / 2, CH / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#bbb';
  ctx.fillText('Loading results…', CW / 2, CH / 2 + 58);
}
