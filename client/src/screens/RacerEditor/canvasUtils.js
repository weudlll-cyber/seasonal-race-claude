// ============================================================
// File:        canvasUtils.js
// Path:        client/src/screens/RacerEditor/canvasUtils.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Shared canvas drawing utilities for the Racer Editor.
// ============================================================

export function drawCheckerboard(ctx, width, height, tileSize = 8) {
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      ctx.fillStyle =
        (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#cccccc' : '#ffffff';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
}
