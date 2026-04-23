export { SvgPathShape, getTrackWidth } from './SvgPathShape.js';
export { TRACK_PATHS } from './track-path-configs.js';

import { SvgPathShape } from './SvgPathShape.js';
import { TRACK_PATHS } from './track-path-configs.js';

// Named shape classes — thin wrappers that give each shape a distinct identity
export class OvalShape extends SvgPathShape {
  constructor(cw, ch, trackWidth) {
    const cfg = TRACK_PATHS.oval;
    super(cfg.path, { isOpen: !cfg.closed, centerFrac: cfg.centerFrac, cw, ch, trackWidth });
  }
}

export class SCurveShape extends SvgPathShape {
  constructor(cw, ch, trackWidth) {
    const cfg = TRACK_PATHS['s-curve'];
    super(cfg.path, { isOpen: !cfg.closed, cw, ch, trackWidth });
  }
}

export class SpiralShape extends SvgPathShape {
  constructor(cw, ch, trackWidth) {
    const cfg = TRACK_PATHS.spiral;
    super(cfg.path, { isOpen: !cfg.closed, cw, ch, trackWidth });
  }
}

export class ZigzagShape extends SvgPathShape {
  constructor(cw, ch, trackWidth) {
    const cfg = TRACK_PATHS.zigzag;
    super(cfg.path, { isOpen: !cfg.closed, centerFrac: cfg.centerFrac, cw, ch, trackWidth });
  }
}

export class RectangleShape extends SvgPathShape {
  constructor(cw, ch, trackWidth) {
    const cfg = TRACK_PATHS.rectangle;
    super(cfg.path, { isOpen: !cfg.closed, centerFrac: cfg.centerFrac, cw, ch, trackWidth });
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

export function getShape(shapeId, cw, ch, trackWidth) {
  const Cls = SHAPE_MAP[shapeId] ?? OvalShape;
  return new Cls(cw, ch, trackWidth);
}
