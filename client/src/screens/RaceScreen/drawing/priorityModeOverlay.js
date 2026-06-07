import { PRIORITY_MODE } from '../../../modules/raceBehavior.js';

const CW = 1280;
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Draws the priority-mode debug overlay (rings + info box).
 * Only called when the M hotkey overlay is active and phase is RACING.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} racers  st.racers
 * @param {number} frameEffZoom  Effective zoom (cam.zoom×bsX for closed, BASE×cam.zoom for open).
 * @param {boolean} isOpenTrack
 * @param {object} cam  Camera state: { offsetX, offsetY, zoom }
 * @param {number} bsY  Closed track Y base scale (CH / worldH).
 * @param {boolean} renderInterpolation  Whether render interpolation is active.
 * @param {number} renderAlpha  Render-interpolation alpha.
 */
export function drawPriorityModeOverlay(
  ctx,
  racers,
  frameEffZoom,
  isOpenTrack,
  cam,
  bsY,
  renderInterpolation,
  renderAlpha
) {
  const modeColors = {
    [PRIORITY_MODE.OVERLAP]: '#ef4444',
    [PRIORITY_MODE.COOLDOWN]: '#f97316',
    [PRIORITY_MODE.BLOCKED]: '#eab308',
  };

  const modeCounts = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
  const modeFrameSums = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
  const modeFrameMax = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
  for (const r of racers) {
    const m = r.currentMode ?? PRIORITY_MODE.NORMAL;
    const fc = r.currentModeFrameCount ?? 0;
    modeCounts[m] = (modeCounts[m] ?? 0) + 1;
    modeFrameSums[m] = (modeFrameSums[m] ?? 0) + fc;
    if (fc > (modeFrameMax[m] ?? 0)) modeFrameMax[m] = fc;
  }

  ctx.save();
  for (const r of racers) {
    if (r.finished) continue;
    const mode = r.currentMode ?? PRIORITY_MODE.NORMAL;
    if (mode === PRIORITY_MODE.NORMAL) continue;
    const color = modeColors[mode];
    if (!color) continue;

    const effZx = frameEffZoom;
    const effZy = isOpenTrack ? effZx : cam.zoom * bsY;
    const rox = renderInterpolation ? lerp(r._prevX ?? r.x, r.x, renderAlpha) : r.x;
    const roy = renderInterpolation ? lerp(r._prevY ?? r.y, r.y, renderAlpha) : r.y;
    const sx = rox * effZx + cam.offsetX;
    const sy = roy * effZy + cam.offsetY;

    const spriteScreenR = (r.frameSizePx ?? 20) * effZx * 0.5;
    const ringR = Math.max(spriteScreenR, 8);
    ctx.beginPath();
    ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const fc = r.currentModeFrameCount ?? 0;
    ctx.font = '9px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    if (mode === PRIORITY_MODE.BLOCKED && r.blockerInfo) {
      ctx.fillText(`${fc} ←${r.blockerInfo.name}`, sx, sy - ringR - 2);
    } else {
      ctx.fillText(fc, sx, sy - ringR - 2);
    }
    ctx.textAlign = 'left';
  }

  const boxX = CW - 210;
  const boxY = 12;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(boxX - 6, boxY - 4, 202, 136);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('Priority Modes  n  avg  max', boxX, boxY + 11);

  function modeAvg(m) {
    return modeCounts[m] > 0 ? Math.round(modeFrameSums[m] / modeCounts[m]) : 0;
  }
  const rows = [
    { label: 'NORMAL  ', color: '#888', key: PRIORITY_MODE.NORMAL },
    { label: 'OVERLAP ', color: '#ef4444', key: PRIORITY_MODE.OVERLAP },
    { label: 'COOLDOWN', color: '#f97316', key: PRIORITY_MODE.COOLDOWN },
    { label: 'BLOCKED ', color: '#eab308', key: PRIORITY_MODE.BLOCKED },
  ];
  rows.forEach(({ label, color, key }, i) => {
    const n = modeCounts[key] ?? 0;
    const avg = modeAvg(key);
    const mx = modeFrameMax[key] ?? 0;
    ctx.fillStyle = color;
    ctx.fillText(
      `${label} ${String(n).padStart(2)}  ${String(avg).padStart(4)}  ${String(mx).padStart(4)}`,
      boxX,
      boxY + 28 + i * 26
    );
  });

  const blockedWithInfo = racers.filter(
    (r) => r.currentMode === PRIORITY_MODE.BLOCKED && r.blockerInfo
  );
  if (blockedWithInfo.length > 0) {
    const listY = boxY + 148;
    const listH = Math.min(blockedWithInfo.length, 5) * 16 + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(boxX - 6, listY - 4, 202, listH);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#eab308';
    ctx.fillText('BLOCKED by (dT=px, dY=px):', boxX, listY + 10);
    blockedWithInfo.slice(0, 5).forEach((r, i) => {
      const b = r.blockerInfo;
      const sign = b.dT >= 0 ? '+' : '';
      ctx.fillStyle = '#c9d1d9';
      ctx.fillText(
        `${(r.name ?? `#${r.index}`).slice(0, 8).padEnd(8)} ← ${b.name.slice(0, 8).padEnd(8)} dT=${sign}${b.dT} dY=${b.dY >= 0 ? '+' : ''}${b.dY}`,
        boxX,
        listY + 24 + i * 16
      );
    });
  }
  ctx.restore();
}
