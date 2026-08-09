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
export function lapInfoText(racers, maxLaps) {
  if (maxLaps <= 1) return null;
  if (!racers || racers.length === 0) return null;
  const leader = racers.reduce((a, b) => (b.t > a.t ? b : a));
  const lapNum = currentLap(leader.t, maxLaps);
  return `LAP ${lapNum} / ${maxLaps}`;
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
 * The digit shown at a moment of the countdown — SECONDS REMAINING, rounded up.
 *
 * START-BOARD-1: THE OVERLAY OWNS NO COUNT. It used to start from a hard-coded 3 while the phase
 * itself lasted `countdownDurationMs`, so at the shipped 4000 ms the sequence was 3-2-1-GO! with
 * "GO!" then standing for a whole extra second before anything moved — the digits and the phase
 * were two statements of one length, and the one nobody could see was right.
 *
 * Derived instead: 4000 ms shows 4-3-2-1 and GO! lands exactly at zero, and any other setting
 * follows without this file being touched. `ceil` rather than `floor` is what makes the last second
 * read "1" and the instant of the gun read "GO!" — with `floor` the final second would already
 * say GO!.
 *
 * @param {number} elapsed  ms since the countdown started
 * @param {number} durationMs  the phase's own length
 * @returns {number} seconds remaining, 0 at and after the gun
 */
export function countdownDigit(elapsed, durationMs) {
  const d = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  const e = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
  return Math.max(0, Math.ceil((d - e) / 1000));
}

/**
 * Draws the countdown number in the top-right corner.
 * Returns the current countdown integer so the caller can update React state.
 *
 * ── THE DIGITS HAVE A WINDOW NOW (CEREMONY-TIME-1) ─────────────────────────────────────────────
 * They used to run for the whole ceremony, so a longer opening just meant counting from a bigger
 * number — at 100 racers the sequence would have started at 20. The owner asked for a stretch of
 * formation with NO count on it, so the viewer can find the number the board just taught them
 * before the clock starts pressing. `startMs` is where the digits appear; before it nothing is
 * drawn and `null` is returned, so the caller leaves its state alone rather than showing a number
 * nobody can see.
 *
 * The DIGIT is still derived from the phase's own length, not from the window — the count has to
 * reach zero at the gun, and only the gun knows when that is.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} elapsed  ms since countdown started.
 * @param {number} durationMs  the countdown phase's length — the digits are derived from it.
 * @param {number} [startMs=0]  ms into the phase at which the digits become visible.
 * @returns {number|null} n — seconds remaining; 0 renders as "GO!"; null before the window opens.
 */
export function drawCountdownOverlay(ctx, elapsed, durationMs, startMs = 0) {
  const from = Number.isFinite(startMs) && startMs > 0 ? startMs : 0;
  if (Number.isFinite(elapsed) && elapsed < from) return null;
  const n = countdownDigit(elapsed, durationMs);
  // The palette is indexed by urgency, not by the digit: it has four entries and a countdown may
  // now be longer than four seconds. Clamping keeps the shipped colours for the last three seconds
  // exactly and holds the calmest one for everything above.
  const color = CD_COLORS[Math.min(n, CD_COLORS.length - 1)] ?? '#fff';
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
