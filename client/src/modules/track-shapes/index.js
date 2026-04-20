export { SvgPathShape } from './SvgPathShape.js';
export { TRACK_PATHS } from './track-path-configs.js';

import { SvgPathShape } from './SvgPathShape.js';
import { TRACK_PATHS } from './track-path-configs.js';

// Named shape classes — thin wrappers that give each shape a distinct identity
export class OvalShape extends SvgPathShape {
  constructor(cw, ch) {
    super(TRACK_PATHS.oval.d, { ...TRACK_PATHS.oval, cw, ch });
  }
}

export class SCurveShape extends SvgPathShape {
  constructor(cw, ch) {
    super(TRACK_PATHS['s-curve'].d, { ...TRACK_PATHS['s-curve'], cw, ch });
  }
}

export class SpiralShape extends SvgPathShape {
  constructor(cw, ch) {
    super(TRACK_PATHS.spiral.d, { ...TRACK_PATHS.spiral, cw, ch });
  }
}

export class ZigzagShape extends SvgPathShape {
  constructor(cw, ch) {
    super(TRACK_PATHS.zigzag.d, { ...TRACK_PATHS.zigzag, cw, ch });
  }
}

export class RectangleShape extends SvgPathShape {
  constructor(cw, ch) {
    super(TRACK_PATHS.rectangle.d, { ...TRACK_PATHS.rectangle, cw, ch });
  }
}

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

export function getShape(shapeId, cw, ch) {
  const Cls = SHAPE_MAP[shapeId] ?? OvalShape;
  return new Cls(cw, ch);
}
