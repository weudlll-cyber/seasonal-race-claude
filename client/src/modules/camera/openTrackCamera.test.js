import { describe, it, expect } from 'vitest';
import { OPEN_TRACK_BASE_ZOOM, effectiveZoom } from './openTrackCamera.js';

describe('openTrackCamera', () => {
  it('OPEN_TRACK_BASE_ZOOM is 1.5', () => {
    expect(OPEN_TRACK_BASE_ZOOM).toBe(1.5);
  });

  describe('effectiveZoom', () => {
    it('base 1.5 × director 1.6 = 2.4', () => {
      expect(effectiveZoom(1.6)).toBeCloseTo(2.4);
    });

    it('base 1.5 × director 1.0 = 1.5', () => {
      expect(effectiveZoom(1.0)).toBeCloseTo(1.5);
    });

    it('treats falsy directorZoom as 1', () => {
      expect(effectiveZoom(0)).toBeCloseTo(1.5);
      expect(effectiveZoom(null)).toBeCloseTo(1.5);
    });
  });
});
