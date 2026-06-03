// ============================================================
// File:        trackLights.js
// Path:        client/src/modules/trackLights.js
// Project:     RaceArena
// Description: Track boundary light system — sampling, animation, rendering.
//              Lights replace solid boundary lines in the RaceScreen.
// ============================================================

import { DEFAULT_TRACKS } from './storage/defaults.js';

export const LIGHT_SPACING_PX = 30;
const LIGHT_RADIUS = 3;
const BASE_ALPHA = 0.4;
const MAX_ALPHA = 1.0;
// Wave width in number of lights (half-width for falloff calculation)
const WAVE_HALF_WIDTH = 5;

export const VALID_LIGHT_STYLES = ['steady', 'sequence', 'sync_pulse', 'random_flash'];

export const DEFAULT_TRACK_LIGHTS = { color: '#ffffff', style: 'sequence', speed: 1.0 };

const THEMED_DEFAULTS_BY_NAME = {
  'Dirt Oval': { color: '#ff8844', style: 'sequence', speed: 1.0 },
  'River Run': { color: '#3aa0ff', style: 'sync_pulse', speed: 0.7 },
  'Space Sprint': { color: '#a8d4ff', style: 'sequence', speed: 1.5 },
  'Garden Path': { color: '#ffdd66', style: 'steady', speed: 1.0 },
  'City Circuit': { color: '#ffffff', style: 'sequence', speed: 1.0 },
};

const THEMED_DEFAULTS = Object.fromEntries(
  DEFAULT_TRACKS.filter((t) => t.name in THEMED_DEFAULTS_BY_NAME).map((t) => [
    t.id,
    THEMED_DEFAULTS_BY_NAME[t.name],
  ])
);

export function getDefaultTrackLights(trackId) {
  return THEMED_DEFAULTS[trackId] ?? DEFAULT_TRACK_LIGHTS;
}

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
 * Uses shadowBlur for glow effect.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ outer: {x,y}[], inner: {x,y}[] }} cachedLights - pre-computed light positions
 * @param {{ color: string, style: string, speed: number }} trackLights
 * @param {number} ts - current timestamp in ms
 * @param {boolean} isClosed
 */
export function drawTrackLights(ctx, cachedLights, trackLights, ts, isClosed) {
  const { color = '#ffffff', style = 'sequence', speed = 1.0 } = trackLights;

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.fillStyle = color;

  for (const boundary of [cachedLights.outer, cachedLights.inner]) {
    const total = boundary.length;
    for (let i = 0; i < total; i++) {
      const alpha = getLightAlpha(style, i, total, ts, speed, isClosed);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(boundary[i].x, boundary[i].y, LIGHT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
