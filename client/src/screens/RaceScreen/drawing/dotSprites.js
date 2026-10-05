// ============================================================
// File:        dotSprites.js
// Path:        client/src/screens/RaceScreen/drawing/dotSprites.js
// Project:     RaceArena — FRAME-DROPS-80 (2026-10-05)
// Description: Cached images of a filled circle and of a soft glowing dot, one per colour, so the
//              race canvas can draw thousands of small round marks per frame as scaled images
//              (`drawImage`) instead of as antialiased paths (`arc` + `fill`), and a glow without
//              `shadowBlur`.
//
// WHY. LARGE-FIELD-PERF-3 measured the GPU process executing the race canvas's 2D calls for the
// whole of a slow frame at 80 racers. The racer trails (ten dots per racer) and the particles were a
// large part of those calls, and every finish-burst particle switched a blur on — about 550 blur
// passes per frame in the last tenth of the race. An image drawn many times is cheap for the GPU; a
// path or a blur drawn many times is not.
//
// WHAT IT CHANGES ON SCREEN. A dot drawn from an image is the same colour and size as before; its
// edge is the image's, scaled, rather than an exact circle's, and a glow is a fixed radial falloff
// rather than Chrome's blur. Close, not identical — so these fixes need the owner's eye.
// ============================================================

const SPRITE_PX = 32;
const MAX_ENTRIES = 256; // a race has at most a few hundred colours; past that, start over
const _dots = new Map();
const _glows = new Map();

// How an image's canvas is made: an OffscreenCanvas where there is one, else a DOM canvas, else none
// (no 2D canvas, e.g. a node test) — the callers then draw the original circles.
let _makeCanvas = (size) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
};

/** Swap the canvas factory (tests). Clears both caches; returns the previous factory. */
export function _setDotCanvasFactory(fn) {
  const prev = _makeCanvas;
  _makeCanvas = fn;
  _dots.clear();
  _glows.clear();
  return prev;
}

function cached(map, color, paint) {
  const hit = map.get(color);
  if (hit !== undefined) return hit;
  const canvas = _makeCanvas(SPRITE_PX);
  const g = canvas?.getContext?.('2d') ?? null;
  const sprite = g ? (paint(g, SPRITE_PX / 2), canvas) : null;
  if (map.size >= MAX_ENTRIES) map.clear();
  map.set(color, sprite);
  return sprite;
}

/**
 * A filled circle in `color`, filling its image edge to edge; `null` when no 2D canvas exists.
 * Draw it at (x - r, y - r) with width and height 2r for a dot of radius r.
 */
export function dotSprite(color) {
  return cached(_dots, color, (g, half) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(half, half, half, 0, Math.PI * 2);
    g.fill();
  });
}

/**
 * A soft glowing dot in `color`: a solid core of half the image's radius fading to nothing at the
 * edge — what a small filled circle with `shadowBlur` looks like. `null` when no 2D canvas exists.
 * Draw it at (x - R, y - R), 2R wide, with R = the dot's radius × 2.
 */
export function glowDotSprite(color) {
  return cached(_glows, color, (g, half) => {
    const grad = g.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, half * 2, half * 2);
  });
}
