// ============================================================
// File:        spriteHelpers.js
// Path:        client/src/modules/surface-effects/generators/spriteHelpers.js
// Project:     RaceArena
// Description: Shared cheap-draw helpers for surface-particle generators.
//              - createBlobSprite: pre-render a soft radial-gradient blob ONCE per
//                (color, size) so render() can drawImage a scaled copy per particle
//                instead of building a gradient/path per particle (cloud + splash).
//              - cullBounds/isVisible/isSegmentVisible: viewport culling shared by all
//                three so off-screen particles are never drawn (spawn/update unchanged).
//              Single source — cloud, splash and line all reuse these (no copies).
// ============================================================

/** Convert a #rrggbb hex to an rgba() string with the given alpha; falls back to a pale blue. */
function hexToRgba(hex, a) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(200,216,232,${a})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Pre-render a soft radial-gradient blob to an offscreen canvas (once). Blitting a scaled
 * copy per particle is far cheaper than gradient/arc construction in the render loop.
 * Gradient stops match cloud's original puff (0→0.9, 0.55→0.4, 1→0). Returns canvas or null
 * (null → caller falls back to arc+fill so headless/no-canvas envs still render).
 * @param {number} maxSize — the largest radius the sprite will be drawn at (sizing the bitmap)
 * @param {string} color   — #rrggbb
 * @returns {(OffscreenCanvas|HTMLCanvasElement|null)}
 */
export function createBlobSprite(maxSize, color) {
  const s = Math.ceil(maxSize) * 2 + 2;
  try {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(s, s)
        : Object.assign(document.createElement('canvas'), { width: s, height: s });
    const ctx2d = canvas.getContext('2d');
    const cx = s / 2;
    const grad = ctx2d.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0, hexToRgba(color, 0.9));
    grad.addColorStop(0.55, hexToRgba(color, 0.4));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, s, s);
    return canvas;
  } catch {
    return null;
  }
}

/** Snapshot the current transform's scale + offset and the canvas size for viewport culling. */
export function cullBounds(ctx) {
  const { a: ez, e: ox, f: oy } = ctx.getTransform();
  return { ez, ox, oy, cw: ctx.canvas.width, ch: ctx.canvas.height };
}

/**
 * Point-radius viewport test (cloud/splash). True when a circle of world-radius `radius`
 * at world (px,py) touches the canvas. Identical logic to cloud's original inline cull.
 */
export function isVisible(cull, px, py, radius) {
  const sr = radius * cull.ez;
  const sx = px * cull.ez + cull.ox;
  if (sx + sr < 0 || sx - sr > cull.cw) return false;
  const sy = py * cull.ez + cull.oy;
  if (sy + sr < 0 || sy - sr > cull.ch) return false;
  return true;
}

/** Segment-AABB viewport test (line). True when the segment's thickened bounding box touches the canvas. */
export function isSegmentVisible(cull, x1, y1, x2, y2, halfThick) {
  const m = halfThick * cull.ez;
  const sx1 = x1 * cull.ez + cull.ox;
  const sx2 = x2 * cull.ez + cull.ox;
  if (Math.max(sx1, sx2) + m < 0 || Math.min(sx1, sx2) - m > cull.cw) return false;
  const sy1 = y1 * cull.ez + cull.oy;
  const sy2 = y2 * cull.ez + cull.oy;
  if (Math.max(sy1, sy2) + m < 0 || Math.min(sy1, sy2) - m > cull.ch) return false;
  return true;
}
