// ============================================================
// File:        index.js
// Path:        client/src/modules/track-shapes/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Factory + registry for all track shape modules.
//              getShape(shapeId, cw, ch) returns the correct shape
//              instance for a given track configuration.
// ============================================================

export { OvalShape } from './OvalShape.js';
export { SCurveShape } from './SCurveShape.js';
export { SpiralShape } from './SpiralShape.js';
export { ZigzagShape } from './ZigzagShape.js';
export { RectangleShape } from './RectangleShape.js';
export { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

import { OvalShape } from './OvalShape.js';
import { SCurveShape } from './SCurveShape.js';
import { SpiralShape } from './SpiralShape.js';
import { ZigzagShape } from './ZigzagShape.js';
import { RectangleShape } from './RectangleShape.js';

const SHAPE_MAP = {
  oval: OvalShape,
  's-curve': SCurveShape,
  spiral: SpiralShape,
  zigzag: ZigzagShape,
  rectangle: RectangleShape,
};

export const SHAPE_IDS = Object.keys(SHAPE_MAP);

export const SHAPE_LABELS = {
  oval: 'Oval',
  's-curve': 'S-Curve',
  spiral: 'Spiral',
  zigzag: 'Zigzag',
  rectangle: 'Rectangle',
};

/**
 * Returns a shape instance for the given shapeId.
 * Falls back to OvalShape for unknown ids.
 */
export function getShape(shapeId, cw, ch) {
  const Cls = SHAPE_MAP[shapeId] ?? OvalShape;
  return new Cls(cw, ch);
}
