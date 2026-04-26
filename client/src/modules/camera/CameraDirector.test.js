import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  estimatedSecondsPerLap,
  openTrackFinishT,
  BASE_SPEED_MEAN,
  BASE_SPEED_MAX,
  REFERENCE_FPS,
} from './lapUtils.js';

// ── lapsFromDuration ──────────────────────────────────────────────────────────

describe('lapsFromDuration', () => {
  it('returns 1 for 30s', () => expect(lapsFromDuration(30)).toBe(1));
  it('returns 1 for 59s', () => expect(lapsFromDuration(59)).toBe(1));
  it('returns 2 for 60s', () => expect(lapsFromDuration(60)).toBe(2));
  it('returns 2 for 89s', () => expect(lapsFromDuration(89)).toBe(2));
  it('returns 3 for 90s', () => expect(lapsFromDuration(90)).toBe(3));
  it('returns 3 for 119s', () => expect(lapsFromDuration(119)).toBe(3));
  it('returns 4 for 120s', () => expect(lapsFromDuration(120)).toBe(4));
  it('returns 4 for 180s', () => expect(lapsFromDuration(180)).toBe(4));
});

// ── lapProgress ───────────────────────────────────────────────────────────────

describe('lapProgress', () => {
  it('t=0 maxLaps=1 → 0', () => expect(lapProgress(0, 1)).toBe(0));
  it('t=0.5 maxLaps=1 → 0.5', () => expect(lapProgress(0.5, 1)).toBeCloseTo(0.5));
  it('t=1.0 maxLaps=2 → 0.5 (halfway through all laps)', () =>
    expect(lapProgress(1.0, 2)).toBeCloseTo(0.5));
  it('t=1.5 maxLaps=2 → 0.75', () => expect(lapProgress(1.5, 2)).toBeCloseTo(0.75));
  it('t=2.0 maxLaps=2 → 1.0 (finished)', () => expect(lapProgress(2.0, 2)).toBeCloseTo(1.0));
  it('clamps above maxLaps', () => expect(lapProgress(3, 2)).toBeCloseTo(1.0));
  it('works for 4 laps', () => expect(lapProgress(3, 4)).toBeCloseTo(0.75));
});

// ── currentLap ────────────────────────────────────────────────────────────────

describe('currentLap', () => {
  it('t=0 → lap 1', () => expect(currentLap(0, 3)).toBe(1));
  it('t=0.99 → lap 1', () => expect(currentLap(0.99, 3)).toBe(1));
  it('t=1.0 → lap 2', () => expect(currentLap(1.0, 3)).toBe(2));
  it('t=2.5 maxLaps=3 → lap 3', () => expect(currentLap(2.5, 3)).toBe(3));
  it('clamps at maxLaps', () => expect(currentLap(5, 3)).toBe(3));
});

// ── trackOffset distribution ──────────────────────────────────────────────────

// Mirrors the new buildOffsets() implementation in RaceScreen
function buildOffsets(n) {
  if (n === 1) return [0];
  const RANGE_MIN = -0.45,
    RANGE_MAX = 0.45;
  const slots = Array.from(
    { length: n },
    (_, i) => RANGE_MIN + (i / (n - 1)) * (RANGE_MAX - RANGE_MIN)
  );
  const slotWidth = (RANGE_MAX - RANGE_MIN) / (n - 1);
  const jitter = slotWidth * 0.45;
  const jittered = slots.map((s) =>
    Math.max(RANGE_MIN, Math.min(RANGE_MAX, s + (Math.random() - 0.5) * jitter * 2))
  );
  for (let i = jittered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [jittered[i], jittered[j]] = [jittered[j], jittered[i]];
  }
  return jittered;
}

describe('trackOffset distribution', () => {
  it('returns [0] for n=1', () => {
    expect(buildOffsets(1)).toEqual([0]);
  });

  it('returns n offsets for n > 1', () => {
    for (const n of [2, 5, 8, 12]) {
      expect(buildOffsets(n)).toHaveLength(n);
    }
  });

  it('all offsets stay within ±0.45 range', () => {
    for (let n = 2; n <= 16; n++) {
      const offs = buildOffsets(n);
      for (const o of offs) {
        expect(o).toBeGreaterThanOrEqual(-0.45);
        expect(o).toBeLessThanOrEqual(0.45);
      }
    }
  });

  it('offsets span > 60% of the ±0.45 range for n ≥ 4', () => {
    for (let trial = 0; trial < 5; trial++) {
      const offs = buildOffsets(8);
      const spread = Math.max(...offs) - Math.min(...offs);
      expect(spread).toBeGreaterThan(0.9 * 0.6); // > 60% of 0.9 total range
    }
  });
});

// ── CameraDirector state machine ──────────────────────────────────────────────

const mockRacers = (n) =>
  Array.from({ length: n }, (_, i) => ({
    t: 1 - i * 0.1,
    x: 500 + i * 50,
    y: 300,
    finished: false,
  }));

describe('CameraDirector', () => {
  it('starts in OVERVIEW state', () => {
    expect(new CameraDirector().state).toBe(CAM_STATE.OVERVIEW);
  });

  it('update() returns {zoom, offsetX, offsetY} with finite values', () => {
    const cd = new CameraDirector();
    const r = cd.update(mockRacers(4), 1000, 1280, 720);
    expect(typeof r.zoom).toBe('number');
    expect(typeof r.offsetX).toBe('number');
    expect(typeof r.offsetY).toBe('number');
    expect(isFinite(r.zoom)).toBe(true);
    expect(isFinite(r.offsetX)).toBe(true);
    expect(isFinite(r.offsetY)).toBe(true);
  });

  it('OVERVIEW state converges to zoom≈1, offset≈0', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, 1280, 720);
    expect(cd.zoom).toBeCloseTo(1, 1);
    expect(Math.abs(cd.offsetX)).toBeLessThan(5);
    expect(Math.abs(cd.offsetY)).toBeLessThan(5);
  });

  it('LEADER_ZOOM converges to zoom > 1', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, 1280, 720);
    expect(cd.zoom).toBeGreaterThan(1.1);
  });

  it('BATTLE_ZOOM converges to zoom > 1', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, 1280, 720);
    expect(cd.zoom).toBeGreaterThan(1.1);
  });

  it('transitions after MAX_STATE_DURATION (8s) — resets stateEnteredAt', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    cd.update(mockRacers(4), 9000, 1280, 720);
    expect(cd.stateEnteredAt).toBe(9000);
  });

  it('does not transition before 8s have elapsed', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    cd.update(mockRacers(4), 7999, 1280, 720);
    // stateEnteredAt unchanged — transition did not fire
    expect(cd.stateEnteredAt).toBe(0);
  });

  it('all four CAM_STATE constants are defined', () => {
    expect(CAM_STATE.OVERVIEW).toBe('OVERVIEW');
    expect(CAM_STATE.LEADER_ZOOM).toBe('LEADER_ZOOM');
    expect(CAM_STATE.BATTLE_ZOOM).toBe('BATTLE_ZOOM');
    expect(CAM_STATE.COMEBACK_ZOOM).toBe('COMEBACK_ZOOM');
  });
});

// ── CameraDirector — bbox clamping ────────────────────────────────────────────

describe('CameraDirector — bbox clamping', () => {
  it('with full-canvas bbox and extreme racer position, canvas-edge clamp fires and keeps track right edge on screen', () => {
    // Full-canvas bbox: 1280*1.6=2048 > canvas width — bbox tightening does NOT fire.
    // Canvas-edge clamp (F6a) DOES fire: lo = 1280*(1-1.6) = -768, so offsetX ≥ -768.
    // Raw target would be hw - 1081*1.6 = -1089, but it gets clamped to ≈ -768.
    const bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 };
    const cd = new CameraDirector(bbox);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const extremeRacers = [
      { t: 0.9, x: 1081, y: 360, finished: false },
      { t: 0.8, x: 1081, y: 360, finished: false },
    ];
    for (let i = 0; i < 200; i++) cd.update(extremeRacers, 1000, 1280, 720);
    // Track right edge (x=1280) must remain on screen from the left: 1280*zoom + offsetX >= 0
    expect(bbox.maxX * cd.zoom + cd.offsetX).toBeGreaterThan(0);
    // Canvas-edge clamp means offsetX never goes below ≈ -768
    expect(cd.offsetX).toBeGreaterThan(-800);
  });

  it('with editor-scale bbox (fits at zoom=1.6), BATTLE_ZOOM clamps so full track stays visible', () => {
    // Editor track spans x=400..1100: width=700, 700*1.6=1120 < 1280 — fits on screen.
    // Clamp fires: keeps left edge (x=400) at screen-left and right edge (x=1100) at screen-right.
    const bbox = { minX: 400, minY: 50, maxX: 1100, maxY: 600 };
    const cd = new CameraDirector(bbox);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const racers = [
      { t: 0.9, x: 1090, y: 300, finished: false },
      { t: 0.8, x: 1080, y: 300, finished: false },
    ];
    for (let i = 0; i < 300; i++) cd.update(racers, 1000, 1280, 720);
    // left edge must be at or right of screen left
    expect(bbox.minX * cd.zoom + cd.offsetX).toBeGreaterThanOrEqual(-1);
    // right edge must be at or left of screen right
    expect(bbox.maxX * cd.zoom + cd.offsetX).toBeLessThanOrEqual(1281);
  });

  it('LEADER_ZOOM with racers near canvas center: existing behaviour preserved (no unwanted clamping)', () => {
    const bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 };
    const cd = new CameraDirector(bbox);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const centreRacers = [{ t: 1, x: 640, y: 360, finished: false }];
    for (let i = 0; i < 200; i++) cd.update(centreRacers, 1000, 1280, 720);
    // targetOffsetX = 640 - 640*1.4 = -256, within [-512, 0] — no clamping
    expect(cd.offsetX).toBeCloseTo(-256, 0);
  });

  it('default bbox (no arg) behaves identically to explicit full-canvas bbox', () => {
    const cdDefault = new CameraDirector();
    const cdExplicit = new CameraDirector({ minX: 0, minY: 0, maxX: 1280, maxY: 720 });
    const racers = mockRacers(4);
    cdDefault.state = CAM_STATE.BATTLE_ZOOM;
    cdExplicit.state = CAM_STATE.BATTLE_ZOOM;
    for (let i = 0; i < 100; i++) {
      cdDefault.update(racers, 1000 + i * 10, 1280, 720);
      cdExplicit.update(racers, 1000 + i * 10, 1280, 720);
    }
    expect(cdDefault.offsetX).toBeCloseTo(cdExplicit.offsetX, 3);
    expect(cdDefault.offsetY).toBeCloseTo(cdExplicit.offsetY, 3);
  });
});

// ── CameraDirector — canvas-edge clamping (F6a) ───────────────────────────────

describe('CameraDirector — canvas-edge clamping (F6a)', () => {
  it('zoom=1: _clampOffset always returns 0 (canvas equals world, no room to pan)', () => {
    const cd = new CameraDirector();
    expect(cd._clampOffset(0, 0, 1280, 1280, 1.0)).toBe(0);
    expect(cd._clampOffset(100, 0, 1280, 1280, 1.0)).toBe(0);
    expect(cd._clampOffset(-500, 0, 1280, 1280, 1.0)).toBe(0);
  });

  it('zoom=1.5: excessively negative val clamps to canvasW*(1-zoom) = -640', () => {
    const cd = new CameraDirector();
    const clamped = cd._clampOffset(-900, 0, 1280, 1280, 1.5);
    expect(clamped).toBeCloseTo(-640, 0);
  });

  it('zoom=1.5: excessively positive val clamps to 0', () => {
    const cd = new CameraDirector();
    const clamped = cd._clampOffset(100, 0, 1280, 1280, 1.5);
    expect(clamped).toBe(0);
  });
});

// ── estimatedSecondsPerLap ────────────────────────────────────────────────────

describe('estimatedSecondsPerLap', () => {
  it('returns exactly 1 / (BASE_SPEED_MEAN * speedMultiplier * REFERENCE_FPS)', () => {
    const sm = 1.0;
    expect(estimatedSecondsPerLap(sm)).toBeCloseTo(1 / (BASE_SPEED_MEAN * sm * REFERENCE_FPS));
  });

  it('horse (1.0) is approx 15-16 seconds', () => {
    const s = estimatedSecondsPerLap(1.0);
    expect(s).toBeGreaterThan(14);
    expect(s).toBeLessThan(17);
  });

  it('snail (0.30) is roughly 3.33× horse time', () => {
    expect(estimatedSecondsPerLap(0.3)).toBeCloseTo(estimatedSecondsPerLap(1.0) / 0.3, 1);
  });

  it('rocket (1.25) is faster than horse', () => {
    expect(estimatedSecondsPerLap(1.25)).toBeLessThan(estimatedSecondsPerLap(1.0));
  });

  it('never returns 0 or negative for any reasonable multiplier', () => {
    for (const sm of [0.1, 0.3, 0.5, 1.0, 1.25, 2.0]) {
      expect(estimatedSecondsPerLap(sm)).toBeGreaterThan(0);
    }
  });
});

// ── openTrackFinishT ──────────────────────────────────────────────────────────

describe('openTrackFinishT', () => {
  it('result is between 0 and 1 (inclusive) for any input', () => {
    for (const sm of [0.3, 1.0, 1.25]) {
      for (const secs of [5, 15, 30, 60, 120]) {
        const ft = openTrackFinishT(secs, sm);
        expect(ft).toBeGreaterThan(0);
        expect(ft).toBeLessThanOrEqual(1);
      }
    }
  });

  it('caps at 1.0 when fastest racer would overshoot the track', () => {
    // Large target seconds → fastest racer overshoots t=1
    expect(openTrackFinishT(60, 1.0)).toBe(1);
  });

  it('gives a fractional value for a short target race', () => {
    // 10s at horse (1.0): fastest racer advances BASE_SPEED_MAX * 1.0 * REFERENCE_FPS * 10
    const expected = Math.min(1, BASE_SPEED_MAX * 1.0 * REFERENCE_FPS * 10);
    expect(openTrackFinishT(10, 1.0)).toBeCloseTo(expected);
    expect(openTrackFinishT(10, 1.0)).toBeLessThan(1);
  });

  it('higher speedMultiplier produces larger or equal finishT', () => {
    const sm1 = openTrackFinishT(10, 0.5);
    const sm2 = openTrackFinishT(10, 1.0);
    const sm3 = openTrackFinishT(10, 1.25);
    expect(sm2).toBeGreaterThanOrEqual(sm1);
    expect(sm3).toBeGreaterThanOrEqual(sm2);
  });

  it('longer target seconds produce larger or equal finishT', () => {
    expect(openTrackFinishT(20, 0.3)).toBeGreaterThanOrEqual(openTrackFinishT(10, 0.3));
  });
});
