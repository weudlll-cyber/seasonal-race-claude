// ============================================================
// File:        spriteAnimations.js
// Path:        client/src/modules/racer-types/spriteAnimations.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Pure animation math for the Racer Editor sprite generator.
//              No DOM, no React — all functions are pure given frame index
//              and config. Consumed by spritesheetBuilder.js (canvas drawing)
//              and tested independently.
// ============================================================

export const PRIMARY_TYPES = ['wobble', 'bounce', 'breathing', 'spin', 'pulse', 'drift', 'rumble'];

export const FRAME_COUNT_OPTIONS = [4, 8, 16];

// Per-animation default basePeriodMs values when the user switches primary type.
export const PRIMARY_PERIOD_DEFAULTS = {
  wobble: 700,
  bounce: 600,
  breathing: 1500,
  spin: 900,
  pulse: 400,
  drift: 800,
  rumble: 300,
};

/**
 * Compute canvas transform values for a single animation frame.
 *
 * All values are relative to the sprite's center, ready to be applied with
 * ctx.rotate / ctx.scale / ctx.translate / ctx.transform.
 *
 * @param {number} frameIndex  0-based index (0 ≤ frameIndex < frameCount)
 * @param {number} frameCount  Total frames in one cycle
 * @param {object} config      Animation config (primaryType, amplitudes, addons…)
 * @returns {{
 *   rotate: number,       radians — added to baseRotationOffset by caller
 *   translateX: number,   px
 *   translateY: number,   px (negative = up)
 *   scaleX: number,
 *   scaleY: number,
 *   shearX: number,       ctx.transform(1,0,shearX,1,0,0) for tail wiggle
 *   shadowScale: number,  0–1 multiplier for shadow pulse ellipse radius
 * }}
 */
export function computeFrameTransforms(frameIndex, frameCount, config) {
  const t = frameIndex / frameCount;
  const phase = t * 2 * Math.PI;

  let rotate = 0;
  let translateX = 0;
  let translateY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let shearX = 0;
  let shadowScale = 1;

  switch (config.primaryType) {
    case 'wobble': {
      rotate = Math.sin(phase) * (config.wobbleAmplitude ?? 0.12);
      break;
    }
    case 'spin': {
      rotate = Math.sin(phase) * (config.spinAmplitude ?? 0.1);
      break;
    }
    case 'bounce': {
      // hopFraction: 0 at landing (frame 0), 1 at apex (frame N/2)
      const hopFraction = Math.abs(Math.sin(t * Math.PI));
      const amp = config.bounceAmplitude ?? 0.5;
      scaleX = 1 + amp * 0.15 - hopFraction * amp * 0.25;
      scaleY = 1 - amp * 0.15 + hopFraction * amp * 0.25;
      shadowScale = 1 - hopFraction * 0.5;
      break;
    }
    case 'breathing': {
      const amp = config.breathingAmplitude ?? 0.05;
      const s = 1 + Math.sin(phase) * amp;
      scaleX = s;
      scaleY = s;
      break;
    }
    case 'pulse': {
      const amp = config.pulseAmplitude ?? 0.15;
      const s = 1 + Math.sin(phase) * amp;
      scaleX = s;
      scaleY = s;
      break;
    }
    case 'drift': {
      translateX = Math.sin(phase) * (config.driftAmplitude ?? 6);
      break;
    }
    case 'rumble': {
      const amp = config.rumbleAmplitude ?? 3;
      translateX = Math.sin(phase * 3) * amp;
      translateY = Math.cos(phase * 3) * amp * 0.6;
      break;
    }
    default:
      break;
  }

  if (config.addons?.tailWiggle) {
    shearX = Math.sin(phase) * (config.tailAmplitude ?? 0.12);
  }

  return { rotate, translateX, translateY, scaleX, scaleY, shearX, shadowScale };
}
