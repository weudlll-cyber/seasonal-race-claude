const CANVAS_W = 1280;
const CANVAS_H = 720;
const PHASE_RACING = 1;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Draws battle-diagnostics world-space markers on the leader and records
 * a 20-frame snapshot table (used by BattleDiagHUD).
 * Only active when hudState === 'BATTLE_ZOOM'.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} st  Game state: { racers, phase }
 * @param {string|null} hudState  CameraDirector.hudState
 * @param {object} cam  Camera state: { offsetX, offsetY, zoom }
 * @param {number} ezoom  Effective X zoom.
 * @param {number} renderAlpha  Render-interpolation alpha.
 * @param {boolean} interpolationEnabled  Whether render interpolation is active.
 * @param {boolean} isOpenTrack
 * @param {number} bsY  Closed track Y base scale (CH / worldH).
 * @param {object} leaderDiag  leaderDiagRef.current — mutable snapshot state.
 */
export function drawBattleDiagMarkers(
  ctx,
  st,
  hudState,
  cam,
  ezoom,
  renderAlpha,
  interpolationEnabled,
  isOpenTrack,
  bsY,
  leaderDiag
) {
  if (hudState !== 'BATTLE_ZOOM') return;
  if (!st?.racers?.length) return;

  const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
  const doInterp = interpolationEnabled && st.phase === PHASE_RACING;
  const leaderRX = doInterp ? lerp(leader._prevX ?? leader.x, leader.x, renderAlpha) : leader.x;
  const leaderRY = doInterp ? lerp(leader._prevY ?? leader.y, leader.y, renderAlpha) : leader.y;
  const mr = 5 / ezoom;
  const lw = 2 / ezoom;

  const dot = (wx, wy, color) => {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(wx, wy, mr, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, wy, lw, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  dot(leaderRX, leaderRY, '#ff4444');
  const tagOffY = Math.max(12, Math.round(22 / ezoom));
  dot(leaderRX, leaderRY - tagOffY, '#ffd700');

  const ezoomY = isOpenTrack ? ezoom : cam.zoom * bsY;
  const camWorldX = (CANVAS_W / 2 - cam.offsetX) / ezoom;
  const camWorldY = (CANVAS_H / 2 - cam.offsetY) / ezoomY;
  dot(camWorldX, camWorldY, '#cc44ff');

  if (!leaderDiag.frozen) {
    const scrX = leaderRX * ezoom + cam.offsetX;
    leaderDiag.snapshots.push({
      f: leaderDiag.snapshots.length + 1,
      rx: leader.x,
      drawX: leaderRX,
      scrX,
      tagX: scrX,
      camX: camWorldX,
    });
    if (leaderDiag.snapshots.length >= 20) leaderDiag.frozen = true;
  }
}
