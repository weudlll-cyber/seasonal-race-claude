// ============================================================
// File:        spritesheetBuilder.js
// Path:        client/src/modules/racer-types/spritesheetBuilder.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Canvas-based renderer for the Racer Editor.
//              Consumes computeFrameTransforms (pure math) and renders
//              animation frames onto HTMLCanvasElement contexts.
//              Exposed as two functions:
//                drawSpriteFrame   — render one frame to an existing ctx
//                buildSpritesheet  — render all frames, return data URL
// ============================================================

import { computeFrameTransforms } from './spriteAnimations.js';

export const FRAME_SIZE = 128;

/**
 * Render one animation frame to `ctx`.
 *
 * The frame occupies FRAME_SIZE × FRAME_SIZE pixels starting at (offsetX, 0).
 * Caller is responsible for clearing that region beforehand if needed.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} sourceImg
 * @param {number} frameIndex
 * @param {number} frameCount
 * @param {object} animConfig  Animation config including baseRotationOffset, addons…
 * @param {number} [offsetX]   Horizontal start of this frame in the canvas (default 0)
 * @param {number} [frameSize] Render size in px (default FRAME_SIZE)
 * @param {{ offsetX: number, offsetY: number }} [centerOffset]  Pre-computed centering offset
 */
export function drawSpriteFrame(
  ctx,
  sourceImg,
  frameIndex,
  frameCount,
  animConfig,
  offsetX = 0,
  frameSize = FRAME_SIZE,
  centerOffset = { offsetX: 0, offsetY: 0 }
) {
  const tf = computeFrameTransforms(frameIndex, frameCount, animConfig);
  const cx = offsetX + frameSize / 2;
  const cy = frameSize / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Shadow pulse: drawn before sprite, at a fixed ground position
  if (animConfig.addons?.shadowPulse) {
    const rx = frameSize * 0.3 * tf.shadowScale;
    const ry = frameSize * 0.08 * tf.shadowScale;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, frameSize * 0.44, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const baseRot = animConfig.baseRotationOffset ?? 0;
  const half = frameSize / 2;
  const dx = -half + centerOffset.offsetX;
  const dy = -half + centerOffset.offsetY;

  if (tf.shearX !== 0) {
    // Tail wiggle: top 65% drawn normally, bottom 35% with horizontal shear.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-half, -half, frameSize, frameSize * 0.65);
    ctx.clip();
    ctx.rotate(baseRot + tf.rotate);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(tf.translateX, tf.translateY);
    ctx.drawImage(sourceImg, dx, dy, frameSize, frameSize);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(-half, -half + frameSize * 0.65, frameSize, frameSize * 0.35);
    ctx.clip();
    ctx.rotate(baseRot + tf.rotate);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(tf.translateX, tf.translateY);
    ctx.transform(1, 0, tf.shearX, 1, 0, 0);
    ctx.drawImage(sourceImg, dx, dy, frameSize, frameSize);
    ctx.restore();
  } else {
    ctx.rotate(baseRot + tf.rotate);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(tf.translateX, tf.translateY);
    ctx.drawImage(sourceImg, dx, dy, frameSize, frameSize);
  }

  ctx.restore();
}

/**
 * Build a complete spritesheet from sourceImg using the given animation config.
 * The result is a horizontal strip: width = frameCount × FRAME_SIZE, height = FRAME_SIZE.
 *
 * @param {HTMLImageElement} sourceImg
 * @param {number} frameCount
 * @param {object} animConfig
 * @param {{ offsetX: number, offsetY: number }} [centerOffset]  Pre-computed centering offset
 * @returns {string} PNG data URL
 */
export function buildSpritesheet(
  sourceImg,
  frameCount,
  animConfig,
  centerOffset = { offsetX: 0, offsetY: 0 }
) {
  const canvas = document.createElement('canvas');
  canvas.width = frameCount * FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < frameCount; i++) {
    drawSpriteFrame(
      ctx,
      sourceImg,
      i,
      frameCount,
      animConfig,
      i * FRAME_SIZE,
      FRAME_SIZE,
      centerOffset
    );
  }

  return canvas.toDataURL('image/png');
}
