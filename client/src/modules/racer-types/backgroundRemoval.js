// ============================================================
// File:        backgroundRemoval.js
// Path:        client/src/modules/racer-types/backgroundRemoval.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Pure pixel math for sprite background removal.
//              No React, DOM, or canvas API imports — operates on
//              plain ImageData-shaped objects {width, height, data}.
// ============================================================

/**
 * Returns true if >60% of sampled edge pixels have alpha < 10,
 * meaning the image already has a transparent background.
 * Samples: 4 corners + 5 evenly spaced pixels on each of the 4 edges (24 total).
 */
export function hasTransparentBackground(imageData) {
  const { width, height, data } = imageData;
  const samples = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const n = 5;
  for (let i = 1; i <= n; i++) {
    samples.push([Math.floor((i * width) / (n + 1)), 0]);
    samples.push([Math.floor((i * width) / (n + 1)), height - 1]);
    samples.push([0, Math.floor((i * height) / (n + 1))]);
    samples.push([width - 1, Math.floor((i * height) / (n + 1))]);
  }
  let transparent = 0;
  for (const [x, y] of samples) {
    const idx = (y * width + x) * 4;
    if (data[idx + 3] < 10) transparent++;
  }
  return transparent / samples.length > 0.6;
}

/**
 * Returns the {r, g, b} color of the pixel at (x, y).
 */
export function sampleColor(imageData, x, y) {
  const { width, data } = imageData;
  const idx = (y * width + x) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
}

/**
 * Scans all pixels with alpha > 10 and returns the bounding box of opaque content,
 * with iterative edge-strip filtering to ignore thin leaked background pixels at image borders.
 *
 * After the raw scan, each edge is checked in a loop: if the outermost N columns/rows
 * contain fewer than 5% opaque pixels, that strip is discarded and the bbox shrinks inward.
 * N = clamp(round(imageDimension × 0.03), 2, 8).  Repeats until all four edges pass.
 *
 * Returns { minX, maxX, minY, maxY, centerX, centerY } or null for a fully transparent image.
 */
export function computeSpriteBoundingBox(imageData) {
  const { width, height, data } = imageData;

  function countOpaque(x0, y0, x1, y1) {
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) n++;
      }
    }
    return n;
  }

  let minX = width,
    maxX = -1,
    minY = height,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  // Strip thickness: 3% of full image dimension, clamped to [2, 8]
  const nX = Math.min(Math.max(Math.round(width * 0.03), 2), 8);
  const nY = Math.min(Math.max(Math.round(height * 0.03), 2), 8);
  const THRESHOLD = 0.05;

  // Iteratively shed sparse edge strips
  let changed = true;
  while (changed) {
    changed = false;
    if (minX > maxX || minY > maxY) return null;

    const bH = maxY - minY + 1;
    const bW = maxX - minX + 1;

    // Right: columns [maxX-nX+1, maxX]
    if (bW > nX) {
      const x0 = maxX - nX + 1;
      if (countOpaque(x0, minY, maxX, maxY) < THRESHOLD * nX * bH) {
        maxX = x0 - 1;
        changed = true;
      }
    }

    // Left: columns [minX, minX+nX-1]
    if (maxX - minX + 1 > nX) {
      const x1 = minX + nX - 1;
      if (countOpaque(minX, minY, x1, maxY) < THRESHOLD * nX * (maxY - minY + 1)) {
        minX = x1 + 1;
        changed = true;
      }
    }

    // Bottom: rows [maxY-nY+1, maxY]
    if (maxY - minY + 1 > nY) {
      const y0 = maxY - nY + 1;
      if (countOpaque(minX, y0, maxX, maxY) < THRESHOLD * (maxX - minX + 1) * nY) {
        maxY = y0 - 1;
        changed = true;
      }
    }

    // Top: rows [minY, minY+nY-1]
    if (maxY - minY + 1 > nY) {
      const y1 = minY + nY - 1;
      if (countOpaque(minX, minY, maxX, y1) < THRESHOLD * (maxX - minX + 1) * nY) {
        minY = y1 + 1;
        changed = true;
      }
    }
  }

  if (minX > maxX || minY > maxY) return null;
  return { minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

/**
 * Returns { offsetX, offsetY } that, when applied as a canvas translate before drawing,
 * moves the sprite so its visual content center aligns with the canvas center.
 *
 * Scales bounding box coordinates from imageData space into canvasWidth×canvasHeight space,
 * so this works correctly for any uploaded image size.
 *
 * Returns { offsetX: 0, offsetY: 0 } for a fully transparent image.
 */
export function computeSpriteOffset(imageData, canvasWidth, canvasHeight) {
  const bbox = computeSpriteBoundingBox(imageData);
  if (!bbox) return { offsetX: 0, offsetY: 0 };
  const scaledCenterX = (bbox.centerX / imageData.width) * canvasWidth;
  const scaledCenterY = (bbox.centerY / imageData.height) * canvasHeight;
  return {
    offsetX: canvasWidth / 2 - scaledCenterX,
    offsetY: canvasHeight / 2 - scaledCenterY,
  };
}

/**
 * Removes the background color from imageData using Euclidean RGB distance.
 *
 * Pixels within `tolerance` of sampledColor → fully transparent (alpha = 0).
 * Pixels between tolerance and tolerance×1.5 → soft feathered alpha.
 * Pixels beyond tolerance×1.5 → unchanged.
 *
 * Returns a new ImageData; never mutates the input.
 */
export function removeBackground(imageData, sampledColor, tolerance) {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  const { r: sr, g: sg, b: sb } = sampledColor;
  const softZone = tolerance * 0.5;
  const outerBound = tolerance * 1.5;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - sr;
    const dg = data[i + 1] - sg;
    const db = data[i + 2] - sb;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance <= tolerance) {
      output[i + 3] = 0;
    } else if (distance <= outerBound) {
      output[i + 3] = Math.round((255 * (distance - tolerance)) / softZone);
    }
  }
  return new ImageData(output, width, height);
}
