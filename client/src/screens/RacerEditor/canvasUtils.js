// ============================================================
// File:        canvasUtils.js
// Path:        client/src/screens/RacerEditor/canvasUtils.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Shared canvas drawing utilities for the Racer Editor.
// ============================================================

import { computeSpriteBoundingBox } from '../../modules/racer-types/backgroundRemoval.js';

export function drawCheckerboard(ctx, width, height, tileSize = 8) {
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      ctx.fillStyle =
        (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#cccccc' : '#ffffff';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
}

/**
 * Measure bodyFillX / bodyFillY from a generated spritesheet data URL.
 *
 * For each frame the opaque bounding box is computed in frame-local coordinates
 * via computeSpriteBoundingBox. The union over all frames gives the tightest
 * rectangle that encloses the visible body across the full animation cycle.
 * bodyFillX = unionWidth / frameWidth, bodyFillY = unionHeight / frameHeight.
 *
 * @param {string} spritesheetDataUrl  data: URL of the spritesheet strip.
 * @param {number} frameCount          number of animation frames.
 * @returns {Promise<{bodyFillX: number, bodyFillY: number, frameWidth: number, frameHeight: number} | null>}
 */
export function measureBodyFill(spritesheetDataUrl, frameCount) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const frameWidth = img.naturalWidth / Math.max(frameCount, 1);
      const frameHeight = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      let unionMinX = frameWidth,
        unionMaxX = -1,
        unionMinY = frameHeight,
        unionMaxY = -1;

      for (let i = 0; i < frameCount; i++) {
        ctx.clearRect(0, 0, frameWidth, frameHeight);
        ctx.drawImage(
          img,
          i * frameWidth,
          0,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        );
        const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
        const bbox = computeSpriteBoundingBox(imageData);
        if (bbox) {
          if (bbox.minX < unionMinX) unionMinX = bbox.minX;
          if (bbox.maxX > unionMaxX) unionMaxX = bbox.maxX;
          if (bbox.minY < unionMinY) unionMinY = bbox.minY;
          if (bbox.maxY > unionMaxY) unionMaxY = bbox.maxY;
        }
      }

      if (unionMaxX < 0) {
        resolve(null);
        return;
      }

      const unionWidth = unionMaxX - unionMinX + 1;
      const unionHeight = unionMaxY - unionMinY + 1;
      resolve({
        bodyFillX: Math.min(unionWidth / frameWidth, 1.0),
        bodyFillY: Math.min(unionHeight / frameHeight, 1.0),
        frameWidth,
        frameHeight,
      });
    };
    img.onerror = () => resolve(null);
    img.src = spritesheetDataUrl;
  });
}
