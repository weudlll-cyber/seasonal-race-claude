// ============================================================
// File:        spriteAnimations.test.js
// Path:        client/src/modules/racer-types/spriteAnimations.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Unit tests for spriteAnimations.js — verifies transform values
//              at key frames (0, N/4, N/2, 3N/4) for each primary animation
//              type and the tail-wiggle add-on.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeFrameTransforms, PRIMARY_TYPES, FRAME_COUNT_OPTIONS } from './spriteAnimations.js';

const N = 8;

// Helpers
function frame(i, config) {
  return computeFrameTransforms(i, N, config);
}

describe('spriteAnimations — exports', () => {
  it('PRIMARY_TYPES has 7 entries', () => {
    expect(PRIMARY_TYPES).toHaveLength(7);
    expect(PRIMARY_TYPES).toContain('wobble');
    expect(PRIMARY_TYPES).toContain('bounce');
    expect(PRIMARY_TYPES).toContain('breathing');
    expect(PRIMARY_TYPES).toContain('spin');
    expect(PRIMARY_TYPES).toContain('pulse');
    expect(PRIMARY_TYPES).toContain('drift');
    expect(PRIMARY_TYPES).toContain('rumble');
  });

  it('FRAME_COUNT_OPTIONS includes 4, 8, 16', () => {
    expect(FRAME_COUNT_OPTIONS).toContain(4);
    expect(FRAME_COUNT_OPTIONS).toContain(8);
    expect(FRAME_COUNT_OPTIONS).toContain(16);
  });
});

describe('computeFrameTransforms — wobble', () => {
  const cfg = { primaryType: 'wobble', wobbleAmplitude: 0.12 };

  it('frame 0: rotate ≈ 0 (sin 0)', () => {
    expect(frame(0, cfg).rotate).toBeCloseTo(0, 5);
  });

  it('frame N/4: rotate ≈ +amplitude (sin π/2 = 1)', () => {
    expect(frame(N / 4, cfg).rotate).toBeCloseTo(0.12, 5);
  });

  it('frame N/2: rotate ≈ 0 (sin π ≈ 0)', () => {
    expect(frame(N / 2, cfg).rotate).toBeCloseTo(0, 5);
  });

  it('frame 3N/4: rotate ≈ -amplitude (sin 3π/2 = -1)', () => {
    expect(frame((3 * N) / 4, cfg).rotate).toBeCloseTo(-0.12, 5);
  });

  it('scale stays 1 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).scaleX).toBeCloseTo(1, 5);
      expect(frame(i, cfg).scaleY).toBeCloseTo(1, 5);
    }
  });

  it('translate stays 0 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).translateY).toBeCloseTo(0, 5);
    }
  });
});

describe('computeFrameTransforms — spin', () => {
  const cfg = { primaryType: 'spin', spinAmplitude: 0.1 };

  it('frame 0: rotate ≈ 0', () => {
    expect(frame(0, cfg).rotate).toBeCloseTo(0, 5);
  });

  it('frame N/4: rotate ≈ +amplitude', () => {
    expect(frame(N / 4, cfg).rotate).toBeCloseTo(0.1, 5);
  });

  it('frame 3N/4: rotate ≈ -amplitude', () => {
    expect(frame((3 * N) / 4, cfg).rotate).toBeCloseTo(-0.1, 5);
  });
});

describe('computeFrameTransforms — bounce', () => {
  // amplitude=0.5 (default): squash at landing, stretch at apex, no translateY
  const cfg = { primaryType: 'bounce', bounceAmplitude: 0.5 };

  it('translateY = 0 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).translateY).toBeCloseTo(0, 5);
    }
  });

  it('frame 0: squash — scaleX ≈ 1.075, scaleY ≈ 0.925', () => {
    // hopFraction=0: scaleX = 1 + 0.5×0.15 = 1.075, scaleY = 1 - 0.5×0.15 = 0.925
    expect(frame(0, cfg).scaleX).toBeCloseTo(1.075, 5);
    expect(frame(0, cfg).scaleY).toBeCloseTo(0.925, 5);
  });

  it('frame N/2: stretch — scaleX ≈ 0.95, scaleY ≈ 1.05', () => {
    // hopFraction=1: scaleX = 1 + 0.075 - 0.5×0.25 = 0.95, scaleY = 1 - 0.075 + 0.125 = 1.05
    expect(frame(N / 2, cfg).scaleX).toBeCloseTo(0.95, 5);
    expect(frame(N / 2, cfg).scaleY).toBeCloseTo(1.05, 5);
  });

  it('shadowScale is 1 at landing and 0.5 at apex', () => {
    expect(frame(0, cfg).shadowScale).toBeCloseTo(1, 5);
    expect(frame(N / 2, cfg).shadowScale).toBeCloseTo(0.5, 5);
  });

  it('rotate stays 0 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).rotate).toBeCloseTo(0, 5);
    }
  });
});

describe('computeFrameTransforms — breathing', () => {
  const cfg = { primaryType: 'breathing', breathingAmplitude: 0.05 };

  it('frame 0: scale ≈ 1 (sin 0 = 0)', () => {
    expect(frame(0, cfg).scaleX).toBeCloseTo(1, 5);
    expect(frame(0, cfg).scaleY).toBeCloseTo(1, 5);
  });

  it('frame N/4: scale ≈ 1 + amplitude', () => {
    expect(frame(N / 4, cfg).scaleX).toBeCloseTo(1.05, 5);
    expect(frame(N / 4, cfg).scaleY).toBeCloseTo(1.05, 5);
  });

  it('frame N/2: scale ≈ 1 (sin π ≈ 0)', () => {
    expect(frame(N / 2, cfg).scaleX).toBeCloseTo(1, 5);
  });

  it('frame 3N/4: scale ≈ 1 - amplitude', () => {
    expect(frame((3 * N) / 4, cfg).scaleX).toBeCloseTo(0.95, 5);
    expect(frame((3 * N) / 4, cfg).scaleY).toBeCloseTo(0.95, 5);
  });

  it('rotate stays 0 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).rotate).toBeCloseTo(0, 5);
    }
  });
});

describe('computeFrameTransforms — tail wiggle add-on', () => {
  const cfg = {
    primaryType: 'wobble',
    wobbleAmplitude: 0.12,
    addons: { tailWiggle: true },
    tailAmplitude: 0.12,
  };

  it('frame 0: shearX ≈ 0 (sin 0)', () => {
    expect(frame(0, cfg).shearX).toBeCloseTo(0, 5);
  });

  it('frame N/4: shearX ≈ +tailAmplitude', () => {
    expect(frame(N / 4, cfg).shearX).toBeCloseTo(0.12, 5);
  });

  it('frame 3N/4: shearX ≈ -tailAmplitude', () => {
    expect(frame((3 * N) / 4, cfg).shearX).toBeCloseTo(-0.12, 5);
  });
});

describe('computeFrameTransforms — pulse', () => {
  const cfg = { primaryType: 'pulse', pulseAmplitude: 0.15 };

  it('scaleX equals scaleY at every frame (uniform scale)', () => {
    for (let i = 0; i < N; i++) {
      const tf = frame(i, cfg);
      expect(tf.scaleX).toBeCloseTo(tf.scaleY, 10);
    }
  });

  it('frame 0: scale ≈ 1 (sin 0 = 0)', () => {
    expect(frame(0, cfg).scaleX).toBeCloseTo(1, 5);
  });

  it('frame N/4: scale ≈ 1 + amplitude', () => {
    expect(frame(N / 4, cfg).scaleX).toBeCloseTo(1.15, 5);
  });

  it('frame 3N/4: scale ≈ 1 - amplitude', () => {
    expect(frame((3 * N) / 4, cfg).scaleX).toBeCloseTo(0.85, 5);
  });

  it('translate stays 0 and rotate stays 0 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).translateX).toBeCloseTo(0, 5);
      expect(frame(i, cfg).translateY).toBeCloseTo(0, 5);
      expect(frame(i, cfg).rotate).toBeCloseTo(0, 5);
    }
  });
});

describe('computeFrameTransforms — drift', () => {
  const cfg = { primaryType: 'drift', driftAmplitude: 6 };

  it('frame 0: translateX = 0 (sin 0)', () => {
    expect(frame(0, cfg).translateX).toBeCloseTo(0, 5);
  });

  it('frame N/4: translateX ≈ +amplitude', () => {
    expect(frame(N / 4, cfg).translateX).toBeCloseTo(6, 5);
  });

  it('frame 3N/4: translateX ≈ -amplitude', () => {
    expect(frame((3 * N) / 4, cfg).translateX).toBeCloseTo(-6, 5);
  });

  it('translateY = 0 and scale = 1 throughout', () => {
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).translateY).toBeCloseTo(0, 5);
      expect(frame(i, cfg).scaleX).toBeCloseTo(1, 5);
      expect(frame(i, cfg).scaleY).toBeCloseTo(1, 5);
    }
  });
});

describe('computeFrameTransforms — rumble', () => {
  // N=12 gives clean values: frame 1 → phase=π/6 → phase×3=π/2
  const cfg = { primaryType: 'rumble', rumbleAmplitude: 3 };

  it('frame 1 of 12: translateX ≈ +amplitude, translateY ≈ 0', () => {
    const tf = computeFrameTransforms(1, 12, cfg);
    expect(tf.translateX).toBeCloseTo(3, 5); // sin(π/2)=1
    expect(tf.translateY).toBeCloseTo(0, 5); // cos(π/2)=0
  });

  it('frame 2 of 12: translateX ≈ 0, translateY ≈ -amplitude×0.6', () => {
    const tf = computeFrameTransforms(2, 12, cfg);
    expect(tf.translateX).toBeCloseTo(0, 5); // sin(π)≈0
    expect(tf.translateY).toBeCloseTo(-1.8, 5); // cos(π)=-1
  });

  it('frame 0 of 12: translateX=0, translateY=+amplitude×0.6 (cos start)', () => {
    const tf = computeFrameTransforms(0, 12, cfg);
    expect(tf.translateX).toBeCloseTo(0, 5);
    expect(tf.translateY).toBeCloseTo(1.8, 5);
  });

  it('rotate and scale unchanged', () => {
    for (let i = 0; i < 12; i++) {
      const tf = computeFrameTransforms(i, 12, cfg);
      expect(tf.rotate).toBeCloseTo(0, 5);
      expect(tf.scaleX).toBeCloseTo(1, 5);
      expect(tf.scaleY).toBeCloseTo(1, 5);
    }
  });
});

describe('computeFrameTransforms — no add-ons', () => {
  it('shearX is 0 when tailWiggle is disabled', () => {
    const cfg = { primaryType: 'wobble', addons: { tailWiggle: false } };
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).shearX).toBe(0);
    }
  });

  it('shearX is 0 when addons is absent', () => {
    const cfg = { primaryType: 'wobble' };
    expect(frame(2, cfg).shearX).toBe(0);
  });

  it('shadowScale is 1 for non-bounce animations', () => {
    const cfg = { primaryType: 'wobble' };
    for (let i = 0; i < N; i++) {
      expect(frame(i, cfg).shadowScale).toBe(1);
    }
  });
});

describe('computeFrameTransforms — unknown primary type', () => {
  it('returns identity transforms for unknown type', () => {
    const tf = computeFrameTransforms(3, N, { primaryType: 'unknown' });
    expect(tf.rotate).toBe(0);
    expect(tf.scaleX).toBe(1);
    expect(tf.scaleY).toBe(1);
    expect(tf.translateX).toBe(0);
    expect(tf.translateY).toBe(0);
  });
});

describe('computeFrameTransforms — 16-frame cycle', () => {
  it('bounce at frame 8 (N/2) of 16: translateY=0, full stretch reached', () => {
    const cfg = { primaryType: 'bounce', bounceAmplitude: 0.5 };
    const tf = computeFrameTransforms(8, 16, cfg);
    expect(tf.translateY).toBeCloseTo(0, 5);
    expect(tf.scaleX).toBeCloseTo(0.95, 5);
    expect(tf.scaleY).toBeCloseTo(1.05, 5);
  });
});
