// ============================================================
// File:        trackLights.js
// Path:        client/src/modules/trackLights.js
// Project:     RaceArena
// Description: Track boundary light system — sampling, animation, rendering.
//              Lights replace solid boundary lines in the RaceScreen.
// ============================================================

export const LIGHT_SPACING_PX = 30;
const LIGHT_RADIUS = 3;
const BASE_ALPHA = 0.4;
const MAX_ALPHA = 1.0;
// Wave width in number of lights (half-width for falloff calculation)
const WAVE_HALF_WIDTH = 5;

export const VALID_LIGHT_STYLES = ['steady', 'sequence', 'sync_pulse', 'random_flash'];

export const DEFAULT_TRACK_LIGHTS = { color: '#ffffff', style: 'sequence', speed: 1.0 };

/**
 * Sample a boundary polyline at evenly-spaced arc-length intervals.
 * Returns one light position every `spacing` pixels along the path.
 * @param {{ x: number, y: number }[]} points - boundary points
 * @param {number} spacing - distance between lights in world pixels
 * @returns {{ x: number, y: number }[]}
 */
export function sampleBoundaryAtInterval(points, spacing) {
  if (points.length < 2 || spacing <= 0) return [];
  const result = [];
  let accumulated = 0;
  result.push({ x: points[0].x, y: points[0].y });
  let nextTarget = spacing;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    while (accumulated + segLen > nextTarget) {
      const t = (nextTarget - accumulated) / segLen;
      result.push({
        x: points[i - 1].x + t * dx,
        y: points[i - 1].y + t * dy,
      });
      nextTarget += spacing;
    }
    accumulated += segLen;
  }
  return result;
}

/**
 * Compute the alpha (brightness) for a single light at a given frame.
 *
 * All styles vary between BASE_ALPHA (0.4, dimmed) and MAX_ALPHA (1.0, bright).
 * Lights never go fully dark — they stay at BASE_ALPHA when not illuminated.
 *
 * @param {'steady'|'sequence'|'sync_pulse'|'random_flash'} style
 * @param {number} lightIndex - index of this light in the boundary array
 * @param {number} totalLights - total lights in this boundary
 * @param {number} ts - current timestamp in ms (DOMHighResTimeStamp)
 * @param {number} speed - animation speed multiplier (0.1–3.0)
 * @param {boolean} isClosed - whether the track is closed (affects sequence wrap)
 * @returns {number} alpha in [BASE_ALPHA, MAX_ALPHA]
 */
export function getLightAlpha(style, lightIndex, totalLights, ts, speed, isClosed) {
  switch (style) {
    case 'steady':
      return BASE_ALPHA;

    case 'sync_pulse': {
      // One full pulse cycle every 2 seconds at speed=1.0
      const freq = ((Math.PI * 2) / 2000) * speed;
      return BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * 0.5 * (1 + Math.sin(ts * freq));
    }

    case 'sequence': {
      if (totalLights === 0) return BASE_ALPHA;
      // Full traversal in 3 seconds at speed=1.0
      const periodMs = 3000 / speed;
      const phase = (ts % periodMs) / periodMs;
      const wavePos = phase * totalLights;
      let circDist;
      if (isClosed) {
        const rawDist = (((lightIndex - wavePos) % totalLights) + totalLights) % totalLights;
        circDist = Math.min(rawDist, totalLights - rawDist);
      } else {
        circDist = Math.abs(lightIndex - wavePos);
      }
      const falloff = Math.max(0, 1 - circDist / WAVE_HALF_WIDTH);
      return BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * falloff;
    }

    case 'random_flash': {
      // Deterministic pseudo-random per (lightIndex, time-window).
      // Time window changes 4× per second at speed=1.0, giving ~4 flashes/s per lit light.
      // Only ~8% of lights flash at any moment for a sparse-but-lively effect.
      const windowIndex = Math.floor((ts * speed) / 250);
      const seed = ((lightIndex * 2654435761) >>> 0) ^ ((windowIndex * 1234567) >>> 0);
      const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
      const normalized = ((hash >>> 0) & 0xffff) / 0xffff;
      return normalized < 0.08 ? MAX_ALPHA : BASE_ALPHA;
    }

    default:
      return BASE_ALPHA;
  }
}

/**
 * Render track boundary lights on a canvas context.
 * Must be called inside an active camera transform (world coordinates).
 *
 * Glow is approximated with two arcs (halo + core) instead of ctx.shadowBlur.
 * shadowBlur forces an offscreen Gaussian-blur pass per dot on the GPU — extremely
 * expensive at ~220 dots/frame. The two-arc approach produces the same visual at a
 * tiny fraction of the GPU cost. The halo radius is expressed in world pixels via
 * `SHADOW_BLUR_PX / effectiveZoom` so it always appears as the original 8 CSS pixels
 * on screen regardless of camera zoom.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ outer: {x,y}[], inner: {x,y}[] }} cachedLights - pre-computed light positions
 * @param {{ color: string, style: string, speed: number }} trackLights
 * @param {number} ts - current timestamp in ms
 * @param {boolean} isClosed
 * @param {number} [effectiveZoom=1] - canvas effective zoom (cam.zoom × bsX / BASE).
 *   Used to convert the CSS-pixel glow radius into world-pixel radius so the halo
 *   appears the same screen size at any zoom level.
 */
const SHADOW_BLUR_PX = 8; // original shadowBlur value in CSS pixels — preserved for visual parity
export function drawTrackLights(ctx, cachedLights, trackLights, ts, isClosed, effectiveZoom = 1) {
  const { color = '#ffffff', style = 'sequence', speed = 1.0 } = trackLights;
  // Convert the original 8 CSS-pixel glow into world-pixel radius.
  // At ezoom=2.5: glowR=3.2 wp → 8 screen px. At ezoom=0.5: glowR=16 wp → 8 screen px.
  const glowR = Math.max(LIGHT_RADIUS * 2, SHADOW_BLUR_PX / effectiveZoom);
  // FRAME-DROPS-80 (a): the lights were about half of the canvas work the GPU executes at 80 racers
  // (LARGE-FIELD-PERF-3) — two antialiased circles per light, for every light, on screen or not.
  // Now a light the shot cannot show is skipped, and a light it can show is ONE image of its halo and
  // core, drawn once per colour and size ratio and reused (`glowSpriteFor`).
  const view = visibleWorldRect(ctx, glowR);
  const sprite = glowSpriteFor(color, glowR / LIGHT_RADIUS);

  ctx.save();
  ctx.fillStyle = color;

  for (const boundary of [cachedLights.outer, cachedLights.inner]) {
    const total = boundary.length;
    for (let i = 0; i < total; i++) {
      const { x, y } = boundary[i];
      if (view && (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY)) continue;
      // The alpha is taken AFTER the cull test only because it is the same pure function of (i, ts)
      // either way: skipping a light skips nothing that a later light depends on.
      const alpha = getLightAlpha(style, i, total, ts, speed, isClosed);
      if (sprite) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, x - glowR, y - glowR, glowR * 2, glowR * 2);
        continue;
      }
      // No image could be made (no 2D canvas — a test environment): the original two circles.
      // Soft halo ring — replaces shadowBlur=8 (no GPU offscreen blur pass needed)
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();
      // Bright core dot
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, LIGHT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * The world rectangle the canvas currently shows, widened by `margin`, read off the context's own
 * transform — the camera's. `null` when the context cannot say (a test double without
 * `getTransform`), which draws every light, as before.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} margin  world px a light may extend past its centre
 * @returns {{minX:number,maxX:number,minY:number,maxY:number}|null}
 */
export function visibleWorldRect(ctx, margin) {
  if (typeof ctx.getTransform !== 'function' || !ctx.canvas) return null;
  const inv = ctx.getTransform().inverse();
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [cx, cy] of [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ]) {
    const x = inv.a * cx + inv.c * cy + inv.e;
    const y = inv.b * cx + inv.d * cy + inv.f;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX: minX - margin, maxX: maxX + margin, minY: minY - margin, maxY: maxY + margin };
}

// ── the glow image cache ───────────────────────────────────────────────────────────────────────
// One image per (colour, halo-to-core ratio). The ratio follows the zoom (the halo keeps a constant
// SCREEN size, the core a constant WORLD size), so it is bucketed to a quarter: a camera move that
// changes it by less than that reuses the image. The image is drawn at a fixed resolution and scaled
// by `drawImage`, which is what the GPU does cheaply.
const GLOW_SPRITE_PX = 64;
const RATIO_STEP = 0.25;
const MAX_SPRITES = 64;
const _glowSprites = new Map();

// How a glow image's canvas is made: an OffscreenCanvas where there is one, else a DOM canvas, else
// nothing (no 2D canvas — then the lights fall back to the original circles).
let _makeCanvas = (size) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
};
/** Swap the image factory (tests). Clears the cache; returns the previous factory. */
export function _setGlowCanvasFactory(fn) {
  const prev = _makeCanvas;
  _makeCanvas = fn;
  _glowSprites.clear();
  return prev;
}

/**
 * The cached halo-and-core image for one colour at one halo-to-core ratio, or `null` when no 2D
 * canvas can be made. The halo is the old soft ring at 0.35 opacity; the core sits on it at full
 * opacity; the whole image is then drawn at the light's own alpha.
 *
 * @param {string} color
 * @param {number} ratio  halo radius / core radius
 */
export function glowSpriteFor(color, ratio) {
  const bucket = Math.round(ratio / RATIO_STEP) * RATIO_STEP;
  const key = `${color}|${bucket}`;
  const hit = _glowSprites.get(key);
  if (hit !== undefined) return hit;
  const canvas = _makeCanvas(GLOW_SPRITE_PX);
  const g = canvas?.getContext?.('2d') ?? null;
  let sprite = null;
  if (g) {
    const half = GLOW_SPRITE_PX / 2;
    g.fillStyle = color;
    g.globalAlpha = 0.35;
    g.beginPath();
    g.arc(half, half, half, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(half, half, half / bucket, 0, Math.PI * 2);
    g.fill();
    sprite = canvas;
  }
  if (_glowSprites.size >= MAX_SPRITES) _glowSprites.clear();
  _glowSprites.set(key, sprite);
  return sprite;
}
