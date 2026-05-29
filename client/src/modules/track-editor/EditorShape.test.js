import { describe, it, expect, vi } from 'vitest';
import { EditorShape } from './EditorShape.js';

// Straight open track: inner and outer run parallel horizontally
const STRAIGHT_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 500, y: 10 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 500, y: 50 },
  ],
};

// Closed triangular track
const TRIANGLE_CLOSED = {
  closed: true,
  innerPoints: [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 250, y: 350 },
  ],
  outerPoints: [
    { x: 50, y: 50 },
    { x: 450, y: 50 },
    { x: 250, y: 420 },
  ],
};

describe('EditorShape — open straight track', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('isOpen is true for open track', () => {
    expect(shape.isOpen).toBe(true);
  });

  it('getPosition(0, 0) is on the centre line at the start', () => {
    const pos = shape.getPosition(0, 0);
    expect(pos.x).toBeCloseTo(0, 0);
    expect(pos.y).toBeCloseTo(30, 1); // midpoint of y=10 and y=50
    expect(isFinite(pos.angle)).toBe(true);
  });

  it('getPosition(1, 0) is on the centre line at the end', () => {
    const pos = shape.getPosition(1, 0);
    expect(pos.x).toBeCloseTo(500, 0);
    expect(pos.y).toBeCloseTo(30, 1);
  });

  it('getPosition(0.5, -0.5) is on the inner edge', () => {
    const pos = shape.getPosition(0.5, -0.5);
    expect(pos.y).toBeCloseTo(10, 1);
  });

  it('getPosition(0.5, 0.5) is on the outer edge', () => {
    const pos = shape.getPosition(0.5, 0.5);
    expect(pos.y).toBeCloseTo(50, 1);
  });

  it('angle at t=0.5 is finite and points rightward', () => {
    const pos = shape.getPosition(0.5, 0);
    expect(isFinite(pos.angle)).toBe(true);
    // Horizontal track → angle ≈ 0
    expect(Math.abs(pos.angle)).toBeLessThan(0.3);
  });
});

describe('EditorShape — closed triangular track', () => {
  const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });

  it('isOpen is false for closed track', () => {
    expect(shape.isOpen).toBe(false);
  });

  it('getPosition(0, 0) and getPosition(1, 0) are close (periodic)', () => {
    const p0 = shape.getPosition(0, 0);
    const p1 = shape.getPosition(1, 0);
    const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    expect(dist).toBeLessThan(10);
  });

  it('getTotalLength is positive and finite', () => {
    const len = shape.getTotalLength();
    expect(len).toBeGreaterThan(0);
    expect(isFinite(len)).toBe(true);
  });

  it('getCenterPoint x and y are finite', () => {
    const cp = shape.getCenterPoint();
    expect(isFinite(cp.x)).toBe(true);
    expect(isFinite(cp.y)).toBe(true);
  });

  it('all getPosition angles along the track are finite', () => {
    for (let i = 0; i < 10; i++) {
      const { angle } = shape.getPosition(i / 10, 0);
      expect(isFinite(angle)).toBe(true);
    }
  });
});

describe('EditorShape — getEdgePoints', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('returns outer and inner arrays with nSamples+1 entries', () => {
    const { outer, inner } = shape.getEdgePoints(30);
    expect(outer).toHaveLength(31);
    expect(inner).toHaveLength(31);
  });

  it('outer y is greater than inner y for a horizontal straight track (outer is at y=50, inner at y=10)', () => {
    const { outer, inner } = shape.getEdgePoints(10);
    for (let i = 0; i < outer.length; i++) {
      expect(outer[i].y).toBeGreaterThan(inner[i].y);
    }
  });
});

describe('EditorShape — getActualTrackWidth', () => {
  it('returns the median inner-to-outer distance rounded to the nearest integer', () => {
    // Straight open track with inner y=0, outer y=300 → width exactly 300.
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 500 });
    // STRAIGHT_OPEN: inner y=10, outer y=50 → width = 40
    expect(shape.getActualTrackWidth()).toBe(40);
  });

  it('rounds fractional catmullRom result to nearest integer (fp regression)', () => {
    // Simulate a track whose spline samples produce 299.9999999999994 at the median.
    // We build a track whose inner/outer points are exactly 300px apart, then verify
    // getActualTrackWidth() returns 300 (not 299 via floor artifact).
    const pts = (y) => Array.from({ length: 10 }, (_, i) => ({ x: i * 100, y }));
    const shape = new EditorShape(
      { closed: false, innerPoints: pts(0), outerPoints: pts(300) },
      { samples: 500 }
    );
    expect(shape.getActualTrackWidth()).toBe(300);
  });

  it('result is cached — second call returns the same value without recomputing', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });
    const first = shape.getActualTrackWidth();
    const second = shape.getActualTrackWidth();
    expect(second).toBe(first);
    expect(shape._cachedActualTrackWidth).toBeDefined();
  });
});

describe('EditorShape — getBoundingBox', () => {
  it('returns a box that contains all inner and outer points', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const bbox = shape.getBoundingBox();
    const allPts = [...TRIANGLE_CLOSED.innerPoints, ...TRIANGLE_CLOSED.outerPoints];
    for (const p of allPts) {
      expect(p.x).toBeGreaterThanOrEqual(bbox.minX);
      expect(p.x).toBeLessThanOrEqual(bbox.maxX);
      expect(p.y).toBeGreaterThanOrEqual(bbox.minY);
      expect(p.y).toBeLessThanOrEqual(bbox.maxY);
    }
  });

  it('is cached — second call returns the same object', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });
    const first = shape.getBoundingBox();
    const second = shape.getBoundingBox();
    expect(second).toBe(first);
  });

  it('minX < maxX and minY < maxY', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { minX, maxX, minY, maxY } = shape.getBoundingBox();
    expect(maxX).toBeGreaterThan(minX);
    expect(maxY).toBeGreaterThan(minY);
  });
});

describe('EditorShape — getPosition smoothness (interpolation, no staircase)', () => {
  it('closed track: t and t+tiny within same old bin give distinct positions', () => {
    // With n=10 and Math.round, t=0.051 and t=0.052 both rounded to idx=1 → identical output.
    // With linear interpolation they produce distinct fractional positions.
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 10 });
    const p0 = shape.getPosition(0.051, 0);
    const p1 = shape.getPosition(0.052, 0);
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    expect(dist).toBeGreaterThan(0);
  });

  it('open track: t and t+tiny within same old bin give distinct positions', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 10 });
    const p0 = shape.getPosition(0.051, 0);
    const p1 = shape.getPosition(0.052, 0);
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    expect(dist).toBeGreaterThan(0);
  });

  it('closed track: positions across a sample boundary change monotonically', () => {
    // n=10 → boundary at t=0.05 (idx flips 0→1 under old Math.round).
    // With interpolation, p(0.049), p(0.05), p(0.051) must each move in the same direction.
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 10 });
    const pA = shape.getPosition(0.049, 0);
    const pM = shape.getPosition(0.05, 0);
    const pB = shape.getPosition(0.051, 0);
    const dAM = Math.hypot(pM.x - pA.x, pM.y - pA.y);
    const dMB = Math.hypot(pB.x - pM.x, pB.y - pM.y);
    // Both halves must show movement (old code: one half had zero movement)
    expect(dAM).toBeGreaterThan(0);
    expect(dMB).toBeGreaterThan(0);
  });
});

describe('EditorShape — offset clamping in getPosition', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('offset 1.0 clamps to the outer edge (same as offset 0.5)', () => {
    const p1 = shape.getPosition(0.5, 1.0);
    const p05 = shape.getPosition(0.5, 0.5);
    expect(p1.x).toBeCloseTo(p05.x, 1);
    expect(p1.y).toBeCloseTo(p05.y, 1);
  });

  it('offset -1.0 clamps to the inner edge (same as offset -0.5)', () => {
    const pN1 = shape.getPosition(0.5, -1.0);
    const pN05 = shape.getPosition(0.5, -0.5);
    expect(pN1.x).toBeCloseTo(pN05.x, 1);
    expect(pN1.y).toBeCloseTo(pN05.y, 1);
  });
});

// ── _tangentAngle regression tests (PR-A2.5 arc-length fix) ──────────────────
//
// Before the fix, _tangentAngle called derivativeAt(controlPoints, t):
//   • derivativeAt treats t as a T-parameter, but racer-t is an arc-length fraction.
//   • derivativeAt clamps t to [0,1], so closed-track lap 2+ always returned
//     the constant end-tangent.
//
// L-shaped open track: horizontal leg (300px) then vertical leg (300px).
const L_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 300, y: 10 },
    { x: 300, y: 310 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 340, y: 50 },
    { x: 340, y: 310 },
  ],
};

// Asymmetric open track: horizontal (400px) >> vertical (100px).
// Arc-length midpoint is deep on the horizontal leg; T-parameter midpoint is at the corner.
const ASYMMETRIC_L_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 400, y: 10 },
    { x: 400, y: 110 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 440, y: 50 },
    { x: 440, y: 110 },
  ],
};

describe('EditorShape — _tangentAngle (arc-length regression)', () => {
  it('open L-track: angle before the turn (~0) differs from angle after (~π/2)', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle: before } = shape.getPosition(0.2, 0); // on horizontal leg
    const { angle: after } = shape.getPosition(0.8, 0); // on vertical leg
    // Horizontal → ~0 rad; vertical → ~π/2 rad; difference ≥ 1 rad (>57°)
    const diff = Math.abs(after - before);
    expect(diff).toBeGreaterThan(1.0);
    expect(Math.abs(before)).toBeLessThan(0.4); // roughly rightward
    expect(Math.abs(after - Math.PI / 2)).toBeLessThan(0.4); // roughly downward
  });

  it('open L-track: endpoint (t=0) angle is finite and not NaN', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(0, 0);
    expect(isFinite(angle)).toBe(true);
  });

  it('open L-track: endpoint (t=1) angle is finite and not NaN', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(1, 0);
    expect(isFinite(angle)).toBe(true);
  });

  it('closed-track lap 2+: angle at t=2.5 equals angle at t=0.5 (multi-lap regression)', () => {
    // Before the fix, derivativeAt clamped t to [0,1] — so t=2.5 always
    // returned the angle at T=1.0 (constant end-tangent for all racers in lap 2+).
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { angle: a05 } = shape.getPosition(0.5, 0);
    const { angle: a25 } = shape.getPosition(2.5, 0);
    expect(a25).toBeCloseTo(a05, 10);
  });

  it('closed-track: angle at t=0 equals angle at t=1 (periodic wrap)', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { angle: a0 } = shape.getPosition(0, 0);
    const { angle: a1 } = shape.getPosition(1, 0);
    expect(a1).toBeCloseTo(a0, 10);
  });

  it('asymmetric open track: arc-length t=0.7 is on the long horizontal leg (angle ≈ 0)', () => {
    // Horizontal ~400px, vertical ~100px — total ~500px.
    // Arc-length 0.7 = ~350px → still on horizontal leg → angle ≈ 0.
    // The old T-parameter approach: T=0.7 → 2nd segment (vertical) → angle ≈ π/2. This
    // test distinguishes the two approaches.
    const shape = new EditorShape(ASYMMETRIC_L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(0.7, 0);
    expect(Math.abs(angle)).toBeLessThan(0.4); // near 0 = rightward
  });
});

// ── centerPoints — center-perpendicular getPosition ───────────────────────────
//
// Straight horizontal open track: center at y=100, inner at y=50, outer at y=150.
// track.width = 80 (canonical) — deliberately differs from inner/outer distance (100)
// so getActualTrackWidth() = 100 ≠ _centerWidth = 80.  This makes tests unambiguously
// verify that the formula uses track.width, not getActualTrackWidth().
// Traveling rightward → angle ≈ 0, perpCos=0, perpSin=-1 (angle - π/2).
// offset=+0.5 → y = 100 + 0.5*80*(-1) = 60; offset=-0.5 → y = 140.
// NOTE: this fixture's inner/outer are at smaller/larger y respectively, which is
// inverted from real game data (trackEditorSave: inner = offsetCurve(center, +w/2)
// = larger y for rightward travel). Distance-based tests are unaffected.
const STRAIGHT_CENTER = {
  closed: false,
  width: 80,
  centerPoints: [
    { x: 0, y: 100 },
    { x: 500, y: 100 },
  ],
  innerPoints: [
    { x: 0, y: 50 },
    { x: 500, y: 50 },
  ],
  outerPoints: [
    { x: 0, y: 150 },
    { x: 500, y: 150 },
  ],
};

describe('EditorShape — centerPoints: _centerWidth stored from track.width', () => {
  it('_centerWidth equals track.width, not getActualTrackWidth()', () => {
    const shape = new EditorShape(STRAIGHT_CENTER, { samples: 100 });
    expect(shape._centerWidth).toBe(80); // from track.width
    expect(shape.getActualTrackWidth()).toBe(100); // inner/outer are 100px apart
    expect(shape._centerWidth).not.toBe(shape.getActualTrackWidth());
  });
});

describe('EditorShape — centerPoints: center-perpendicular getPosition', () => {
  const shape = new EditorShape(STRAIGHT_CENTER, { samples: 500 });

  it('getPosition(0.5, 0) returns the interpolated center-curve point', () => {
    const pos = shape.getPosition(0.5, 0);
    // Interpolation: (center[249].x + center[250].x)/2 = exactly 250.0 on a uniform arc
    expect(pos.x).toBeCloseTo(250, 0);
    expect(pos.y).toBeCloseTo(100, 1);
    expect(isFinite(pos.angle)).toBe(true);
  });

  it('getPosition(0.5, 0.5) is at track.width/2 (not getActualTrackWidth()/2) from center', () => {
    const pos = shape.getPosition(0.5, 0.5);
    const center = shape.getPosition(0.5, 0);
    const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
    expect(dist).toBeCloseTo(shape._centerWidth / 2, 1); // 40, not 50
  });

  it('getPosition(0.5, -0.5) is at track.width/2 from center on the opposite side', () => {
    const pos = shape.getPosition(0.5, -0.5);
    const center = shape.getPosition(0.5, 0);
    const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
    expect(dist).toBeCloseTo(shape._centerWidth / 2, 1); // 40, not 50
  });

  it('offsets +0.5 and -0.5 are symmetric about the center', () => {
    const center = shape.getPosition(0.5, 0);
    const pos = shape.getPosition(0.5, 0.5);
    const neg = shape.getPosition(0.5, -0.5);
    expect((pos.x + neg.x) / 2).toBeCloseTo(center.x, 1);
    expect((pos.y + neg.y) / 2).toBeCloseTo(center.y, 1);
  });

  it('all offsets return the same interpolated angle', () => {
    const a0 = shape.getPosition(0.5, 0).angle;
    expect(shape.getPosition(0.5, 0.5).angle).toBeCloseTo(a0, 10);
    expect(shape.getPosition(0.5, -0.5).angle).toBeCloseTo(a0, 10);
  });
});

describe('EditorShape — centerPoints: smooth movement (no index snapping)', () => {
  // Use samples=50 so each sample spans ~10px on a 500px track.
  // With 500 walk steps, snapping produces ~450 zero-distance steps and ~50 jumps
  // of ~10px each → median=0, max≈10.  Interpolation produces uniform ~1px steps.
  // Test threshold: max < max(5 × median, 0.01) catches snapping and passes interpolation.
  it('stepping t 0→1 in 500 steps at offset=0.4: no step > 5× median (snapping guard)', () => {
    const shape = new EditorShape(STRAIGHT_CENTER, { samples: 50 });
    const STEPS = 500;
    const dists = [];
    let prev = shape.getPosition(0, 0.4);
    for (let i = 1; i <= STEPS; i++) {
      const pos = shape.getPosition(i / STEPS, 0.4);
      dists.push(Math.hypot(pos.x - prev.x, pos.y - prev.y));
      prev = pos;
    }
    dists.sort((a, b) => a - b);
    const median = dists[Math.floor(dists.length / 2)];
    const max = dists[dists.length - 1];
    expect(max).toBeLessThan(Math.max(5 * median, 0.01));
  });
});

describe('EditorShape — centerPoints: fallback when track.width is absent', () => {
  it('logs a warning and falls back to getActualTrackWidth() when width is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const noWidthTrack = {
      closed: false,
      centerPoints: [
        { x: 0, y: 100 },
        { x: 500, y: 100 },
      ],
      innerPoints: [
        { x: 0, y: 50 },
        { x: 500, y: 50 },
      ],
      outerPoints: [
        { x: 0, y: 150 },
        { x: 500, y: 150 },
      ],
      // no width field
    };
    const shape = new EditorShape(noWidthTrack, { samples: 100 });
    expect(shape._centerWidth).toBeGreaterThan(0);
    expect(isFinite(shape._centerWidth)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[EditorShape]'));
    warnSpy.mockRestore();
  });

  it('logs a warning and falls back when width is zero', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const zeroWidthTrack = {
      closed: false,
      width: 0,
      centerPoints: [
        { x: 0, y: 100 },
        { x: 500, y: 100 },
      ],
      innerPoints: [
        { x: 0, y: 50 },
        { x: 500, y: 50 },
      ],
      outerPoints: [
        { x: 0, y: 150 },
        { x: 500, y: 150 },
      ],
    };
    const shape = new EditorShape(zeroWidthTrack, { samples: 100 });
    expect(shape._centerWidth).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('EditorShape — no centerPoints: getPosition unchanged (regression)', () => {
  it('STRAIGHT_OPEN without centerPoints still uses inner/outer interpolation', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });
    expect(shape._center).toBeUndefined();
    const pos = shape.getPosition(0.5, 0);
    expect(pos.y).toBeCloseTo(30, 1); // midpoint of y=10 and y=50
  });
});

// ── _precomputeAngles: center-curve tangent when available ────────────────────
//
// DIAGONAL_CENTER: center goes diagonally (angle ≈ −0.46 rad ≈ −26°);
// inner and outer are horizontal (angle = 0).  The two formulas give measurably
// different results at the midpoint, so this fixture directly verifies which one
// _precomputeAngles uses.
const DIAGONAL_CENTER = {
  closed: false,
  width: 100,
  centerPoints: [
    { x: 0, y: 200 },
    { x: 400, y: 0 }, // diagonal: dy/dx = −200/400 → angle ≈ −0.46 rad
  ],
  innerPoints: [
    { x: 0, y: 250 },
    { x: 400, y: 250 }, // horizontal → angle = 0
  ],
  outerPoints: [
    { x: 0, y: 150 },
    { x: 400, y: 150 }, // horizontal → angle = 0
  ],
};

// U-turn fixture used only for the smoothness test — center traces a C-shape.
const UTURN_TRACK = {
  closed: false,
  width: 200,
  centerPoints: [
    { x: 0, y: 0 },
    { x: 300, y: 0 },
    { x: 300, y: 300 },
    { x: 0, y: 300 },
  ],
  innerPoints: [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 200 },
    { x: 0, y: 200 },
  ],
  outerPoints: [
    { x: 0, y: -100 },
    { x: 400, y: -100 },
    { x: 400, y: 400 },
    { x: 0, y: 400 },
  ],
};

describe('EditorShape — _precomputeAngles: center-curve tangent when available', () => {
  it('_angles use center tangent (not inner/outer average) when centerPoints present', () => {
    // DIAGONAL_CENTER: center at ≈ −0.46 rad, inner+outer at 0.
    // With fix: _angles[mid] ≈ −0.46. Without fix: _angles[mid] ≈ 0.
    const shape = new EditorShape(DIAGONAL_CENTER, { samples: 200 });
    const n = 200;
    const mid = Math.floor(n / 2);
    const iPrev = Math.max(0, mid - 1);
    const iNext = Math.min(n - 1, mid + 1);

    const centerAngle = Math.atan2(
      shape._center[iNext].y - shape._center[iPrev].y,
      shape._center[iNext].x - shape._center[iPrev].x
    );
    expect(shape._angles[mid]).toBeCloseTo(centerAngle, 4);

    const innerOuterAngle = Math.atan2(
      shape._inner[iNext].y - shape._inner[iPrev].y + shape._outer[iNext].y - shape._outer[iPrev].y,
      shape._inner[iNext].x - shape._inner[iPrev].x + shape._outer[iNext].x - shape._outer[iPrev].x
    );
    let diff = Math.abs(centerAngle - innerOuterAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    expect(diff).toBeGreaterThan(0.2); // confirms center ≠ inner+outer average here
  });

  it('no centerPoints: _angles uses inner/outer average formula (regression guard)', () => {
    const shape = new EditorShape(L_OPEN, { samples: 100 });
    expect(shape._center).toBeUndefined();
    const n = 100;
    const i = 50;
    const iPrev = Math.max(0, i - 1);
    const iNext = Math.min(n - 1, i + 1);
    const expected = Math.atan2(
      shape._inner[iNext].y - shape._inner[iPrev].y + shape._outer[iNext].y - shape._outer[iPrev].y,
      shape._inner[iNext].x - shape._inner[iPrev].x + shape._outer[iNext].x - shape._outer[iPrev].x
    );
    expect(shape._angles[i]).toBeCloseTo(expected, 10);
  });

  it('angle smoothness: no jump > 30° between adjacent samples on a U-turn with centerPoints', () => {
    const shape = new EditorShape(UTURN_TRACK, { samples: 200 });
    const LIMIT = Math.PI / 6;
    for (let i = 1; i < shape._angles.length; i++) {
      let diff = Math.abs(shape._angles[i] - shape._angles[i - 1]);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      expect(diff).toBeLessThan(LIMIT);
    }
  });
});
