import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  estimatedSecondsPerLap,
  REFERENCE_FPS,
} from './lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';

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

const mockRaceState = {
  raceElapsed: 5000,
  finishedCount: 0,
  winner: null,
  finishT: 1.0,
};

describe('CameraDirector', () => {
  it('starts in OVERVIEW state', () => {
    expect(new CameraDirector().state).toBe(CAM_STATE.OVERVIEW);
  });

  it('update() returns {zoom, offsetX, offsetY} with finite values', () => {
    const cd = new CameraDirector();
    const r = cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(typeof r.zoom).toBe('number');
    expect(typeof r.offsetX).toBe('number');
    expect(typeof r.offsetY).toBe('number');
    expect(isFinite(r.zoom)).toBe(true);
    expect(isFinite(r.offsetX)).toBe(true);
    expect(isFinite(r.offsetY)).toBe(true);
  });

  it('OVERVIEW state converges to zoom≈1, offset≈0 (1280px world)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeCloseTo(1, 1);
    expect(Math.abs(cd.offsetX)).toBeLessThan(5);
    expect(Math.abs(cd.offsetY)).toBeLessThan(5);
  });

  it('OVERVIEW on 6000px world: targetZoom = overviewZoom ≈ 0.213, not 1', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBeCloseTo(1280 / 6000, 3);
    expect(cd.targetZoom).toBeLessThan(0.3);
  });

  it('OVERVIEW on 6000px world: zoom converges to overviewZoom, not 1', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    for (let i = 0; i < 300; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeCloseTo(1280 / 6000, 1);
    expect(cd.zoom).toBeLessThan(0.3);
  });

  it('LEADER_ZOOM converges to zoom > 1', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeGreaterThan(1.1);
  });

  it('BATTLE_ZOOM converges to zoom > 1', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeGreaterThan(1.1);
  });

  it('transitions after MAX_STATE_DURATION (8s) — resets stateEnteredAt', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    cd.update(mockRacers(4), 9000, mockRaceState, 1280, 720);
    expect(cd.stateEnteredAt).toBe(9000);
  });

  it('does not transition before 8s have elapsed', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    cd.update(mockRacers(4), 7999, mockRaceState, 1280, 720);
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
    for (let i = 0; i < 200; i++) cd.update(extremeRacers, 1000, mockRaceState, 1280, 720);
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
    for (let i = 0; i < 300; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    // left edge must be at or right of screen left
    expect(bbox.minX * cd.zoom + cd.offsetX).toBeGreaterThanOrEqual(-1);
    // right edge must be at or left of screen right
    expect(bbox.maxX * cd.zoom + cd.offsetX).toBeLessThanOrEqual(1281);
  });

  it('LEADER_ZOOM with racers near canvas center: converges to adaptive offset with no clamping', () => {
    const worldW = 1280;
    const bbox = { minX: 0, minY: 0, maxX: worldW, maxY: 720 };
    const cd = new CameraDirector(bbox, worldW, 720);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const centreRacers = [{ t: 1, x: 640, y: 360, finished: false }];
    for (let i = 0; i < 200; i++) cd.update(centreRacers, 1000, mockRaceState, 1280, 720);
    // New formula: overviewZoom(1.0) × 1.4 = 1.4 exactly at worldW=1280
    const leaderZoom = (1280 / worldW) * 1.4;
    expect(cd.offsetX).toBeCloseTo(640 - 640 * leaderZoom, 0);
  });

  it('default bbox (no arg) behaves identically to explicit full-canvas bbox', () => {
    const cdDefault = new CameraDirector();
    const cdExplicit = new CameraDirector({ minX: 0, minY: 0, maxX: 1280, maxY: 720 });
    const racers = mockRacers(4);
    cdDefault.state = CAM_STATE.BATTLE_ZOOM;
    cdExplicit.state = CAM_STATE.BATTLE_ZOOM;
    for (let i = 0; i < 100; i++) {
      cdDefault.update(racers, 1000 + i * 10, mockRaceState, 1280, 720);
      cdExplicit.update(racers, 1000 + i * 10, mockRaceState, 1280, 720);
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

// ── CameraDirector — adaptive zoom (B-16) ────────────────────────────────────

describe('CameraDirector — adaptive zoom (B-16)', () => {
  it('default 1280-wide world gives leaderZoom = 1.4 (relative-ratio formula)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    // New formula: overviewZoom(1.0) × LEADER_ZOOM_RATIO(1.4) = 1.4 exactly
    expect(cd._leaderZoom).toBeCloseTo(1.4, 3);
    expect(cd._leaderZoom).toBeGreaterThan(1.38);
    expect(cd._leaderZoom).toBeLessThan(1.45);
  });

  it('4000-wide world gives leaderZoom ≈ 0.448 (zoom-out for large tracks)', () => {
    const cd = new CameraDirector(undefined, 4000, 720);
    // New formula: (1280/4000) × 1.4 = 0.448
    expect(cd._leaderZoom).toBeCloseTo((1280 / 4000) * 1.4, 3);
    expect(cd._leaderZoom).toBeLessThan(1); // large track → zoom-out
  });

  it('clamps leaderZoom at MIN_ZOOM (0.15) for very large worlds', () => {
    const cd = new CameraDirector(undefined, 100000, 720);
    expect(cd._leaderZoom).toBe(0.15);
  });

  it('battleZoom > leaderZoom (battle shows a tighter field)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom (comeback shows a wider view)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });

  it('all three zoom values scale inversely with worldW (wider world → lower zoom)', () => {
    const cd1 = new CameraDirector(undefined, 1280, 720);
    const cd2 = new CameraDirector(undefined, 2560, 720);
    expect(cd2._leaderZoom).toBeCloseTo(cd1._leaderZoom / 2, 3);
    expect(cd2._battleZoom).toBeCloseTo(cd1._battleZoom / 2, 3);
    expect(cd2._comebackZoom).toBeCloseTo(cd1._comebackZoom / 2, 3);
  });

  it('LEADER_ZOOM state on large world converges to a lower zoom', () => {
    const cdSmall = new CameraDirector(undefined, 1280, 720);
    const cdLarge = new CameraDirector(undefined, 4000, 720);
    const racers = [{ t: 1, x: 640, y: 360, finished: false }];
    cdSmall.state = CAM_STATE.LEADER_ZOOM;
    cdLarge.state = CAM_STATE.LEADER_ZOOM;
    for (let i = 0; i < 200; i++) {
      cdSmall.update(racers, 1000, mockRaceState, 1280, 720);
      cdLarge.update(racers, 1000, mockRaceState, 1280, 720);
    }
    expect(cdLarge.zoom).toBeLessThan(cdSmall.zoom * 0.5);
  });
});

// ── CameraDirector — top-3 focus ─────────────────────────────────────────────

describe('CameraDirector — top-3 focus', () => {
  it('_focusRacers returns top-3 sorted by t-position', () => {
    const cd = new CameraDirector();
    const racers = [
      { t: 0.5, x: 400 },
      { t: 0.9, x: 800 },
      { t: 0.3, x: 200 },
      { t: 1.0, x: 900 },
      { t: 0.7, x: 600 },
      { t: 0.1, x: 100 },
    ];
    const focus = cd._focusRacers(racers);
    expect(focus).toHaveLength(3);
    expect(focus[0].t).toBe(1.0);
    expect(focus[1].t).toBe(0.9);
    expect(focus[2].t).toBe(0.7);
  });

  it('_focusRacers returns all racers when count ≤ 3', () => {
    const cd = new CameraDirector();
    const two = [
      { t: 0.8, x: 600 },
      { t: 0.5, x: 400 },
    ];
    expect(cd._focusRacers(two)).toHaveLength(2);
    expect(cd._focusRacers([{ t: 1, x: 640 }])).toHaveLength(1);
  });

  it('_focusRacers handles 0 racers without crash', () => {
    const cd = new CameraDirector();
    expect(cd._focusRacers([])).toHaveLength(0);
  });

  it('COMEBACK_ZOOM targets 3rd-place racer, not last-place, when spread is large', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    cd.state = CAM_STATE.COMEBACK_ZOOM;
    const racers = [
      { t: 0.9, x: 900, y: 360, finished: false }, // 1st
      { t: 0.7, x: 700, y: 360, finished: false }, // 2nd
      { t: 0.5, x: 500, y: 360, finished: false }, // 3rd — should be targeted
      { t: 0.1, x: 100, y: 360, finished: false }, // last — should NOT be targeted
    ];
    for (let i = 0; i < 200; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    // comebackZoom ≈ 1.30 on 1280-track.
    // Target at x=500: targetOffsetX = 640 - 500*1.30 = -10 → clamps within valid range.
    // Camera world-center should be near x=500, far from last-place x=100.
    const worldXAtCenter = (640 - cd.offsetX) / cd.zoom;
    expect(worldXAtCenter).toBeGreaterThan(300); // clearly not last-place (x=100)
  });
});

// ── CameraDirector — relative zoom ratios (D7a) ───────────────────────────────

describe('CameraDirector — relative zoom ratios (D7a)', () => {
  it('1280-track: leaderZoom = 1.4, battleZoom = 1.6, comebackZoom = 1.3 (backward-compat)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._leaderZoom).toBeCloseTo(1.4, 3);
    expect(cd._battleZoom).toBeCloseTo(1.6, 3);
    expect(cd._comebackZoom).toBeCloseTo(1.3, 3);
  });

  it('6000-track: states are clearly distinct (battle 1.6× closer than overview)', () => {
    const cd = new CameraDirector(undefined, 6000, 720);
    const overviewZoom = 1280 / 6000;
    expect(cd._leaderZoom).toBeCloseTo(overviewZoom * 1.4, 4);
    expect(cd._battleZoom).toBeCloseTo(overviewZoom * 1.6, 4);
    expect(cd._comebackZoom).toBeCloseTo(overviewZoom * 1.3, 4);
  });

  it('zoom-state ratios are constant regardless of worldW', () => {
    for (const worldW of [1280, 2560, 6000, 640]) {
      const cd = new CameraDirector(undefined, worldW, 720);
      // Battle should always be 1.6/1.4 ≈ 1.143× leaderZoom (before clamping)
      if (cd._battleZoom < 2.5 && cd._leaderZoom < 2.5) {
        expect(cd._battleZoom / cd._leaderZoom).toBeCloseTo(1.6 / 1.4, 2);
      }
    }
  });

  it('battleZoom / leaderZoom ratio is preserved on large world', () => {
    const cd = new CameraDirector(undefined, 6000, 720);
    expect(cd._battleZoom).toBeCloseTo(cd._leaderZoom * (1.6 / 1.4), 4);
  });
});

// ── CameraDirector — adaptive zoom: corrected formula ────────────────────────

describe('CameraDirector — adaptive zoom (corrected formula)', () => {
  it('6000-wide world gives leaderZoom ≈ 0.299 (deep zoom-out)', () => {
    const cd = new CameraDirector(undefined, 6000, 720);
    // New formula: (1280/6000) × 1.4 ≈ 0.2987
    expect(cd._leaderZoom).toBeCloseTo((1280 / 6000) * 1.4, 3);
    expect(cd._leaderZoom).toBeCloseTo(0.3, 1);
  });

  it('16000-wide world clamps leaderZoom at MIN_ZOOM (0.15)', () => {
    const cd = new CameraDirector(undefined, 16000, 720);
    expect(cd._leaderZoom).toBe(0.15);
  });

  it('very small world (512px) clamps leaderZoom at MAX_ZOOM (2.5)', () => {
    // 1280²/(910×512) ≈ 3.50 → clamped to MAX_ZOOM=2.5
    const cd = new CameraDirector(undefined, 512, 720);
    expect(cd._leaderZoom).toBe(2.5);
  });

  it('battleZoom > leaderZoom on 6000-track (battle still tighter than leader)', () => {
    const cd = new CameraDirector(undefined, 6000, 720);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom on 6000-track (comeback still wider than leader)', () => {
    const cd = new CameraDirector(undefined, 6000, 720);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });
});

// ── CameraDirector — _clampOffset for zoom < 1 ───────────────────────────────

describe('CameraDirector — _clampOffset for zoom < 1', () => {
  it('zoom=0.3, 6000px world: pan range is [-520, 0]', () => {
    const cd = new CameraDirector();
    // Within range — unchanged
    expect(cd._clampOffset(0, 0, 6000, 1280, 0.3)).toBe(0);
    expect(cd._clampOffset(-260, 0, 6000, 1280, 0.3)).toBe(-260);
    // Below lower bound — clamped to -520
    expect(cd._clampOffset(-600, 0, 6000, 1280, 0.3)).toBeCloseTo(-520, 0);
    // Above upper bound — clamped to 0
    expect(cd._clampOffset(50, 0, 6000, 1280, 0.3)).toBe(0);
  });

  it('zoom=0.5, 4000px world: pan range is [-720, 0]', () => {
    // 4000*0.5 = 2000 > 1280 canvas → world larger than viewport
    const cd = new CameraDirector();
    expect(cd._clampOffset(0, 0, 4000, 1280, 0.5)).toBe(0);
    expect(cd._clampOffset(-400, 0, 4000, 1280, 0.5)).toBe(-400);
    expect(cd._clampOffset(-800, 0, 4000, 1280, 0.5)).toBeCloseTo(-720, 0);
  });

  it('zoom=2.0, standard 1280px world: pan range is [-1280, 0] (backward compat)', () => {
    const cd = new CameraDirector();
    expect(cd._clampOffset(100, 0, 1280, 1280, 2.0)).toBe(0);
    expect(cd._clampOffset(-1500, 0, 1280, 1280, 2.0)).toBeCloseTo(-1280, 0);
    expect(cd._clampOffset(-640, 0, 1280, 1280, 2.0)).toBe(-640);
  });
});

// ── CameraDirector — world-edge clamp (Befund 2) ─────────────────────────────
// Regression: positive offsetY caused a black strip above the track when
// bbox fits within the viewport. After the fix, offsetY must be ≤ 0 at zoom > 1.

describe('CameraDirector — world-edge clamp (Befund 2)', () => {
  it('offsetY stays ≤ 0 at zoom > 1 even when small bbox fits in viewport', () => {
    // bbox top edge at y=100 (not y=0): bbox fits inside canvas at battleZoom≈1.6
    // Raw target = hh - racerY*zoom > 0 → bbox clamp alone allows positive offsetY.
    // World-edge clamp must force offsetY ≤ 0.
    const bbox = { minX: 0, minY: 100, maxX: 1280, maxY: 400 };
    const cd = new CameraDirector(bbox);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const racers = [
      { t: 0.9, x: 640, y: 110, finished: false },
      { t: 0.8, x: 640, y: 120, finished: false },
    ];
    for (let i = 0; i < 200; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    expect(cd.offsetY).toBeLessThanOrEqual(0);
  });

  it('offsetX stays ≤ 0 at zoom > 1 even when small bbox fits in viewport', () => {
    // Symmetric check for X axis
    const bbox = { minX: 100, minY: 0, maxX: 600, maxY: 720 };
    const cd = new CameraDirector(bbox);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const racers = [
      { t: 0.9, x: 110, y: 360, finished: false },
      { t: 0.8, x: 120, y: 360, finished: false },
    ];
    for (let i = 0; i < 200; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    expect(cd.offsetX).toBeLessThanOrEqual(0);
  });
});

// ── CameraDirector — §5.3 attention hierarchy ────────────────────────────────

// Racers at ~50% progress: endgame (>85%) does NOT fire, no finish event.
const midRaceRacers = [
  { t: 0.5, x: 500, y: 300, finished: false },
  { t: 0.3, x: 300, y: 300, finished: false },
  { t: 0.1, x: 100, y: 300, finished: false },
];
// Top-2 gap = 0.5-0.3 = 0.2 → no battle; leaderProgress = 0.5 < 0.85

const battleMidRacers = [
  { t: 0.5, x: 500, y: 300, finished: false },
  { t: 0.48, x: 480, y: 300, finished: false }, // gap01=0.02 < 0.05 → battle
  { t: 0.2, x: 200, y: 300, finished: false },
];

describe('CameraDirector — §5.3 attention hierarchy', () => {
  it('Priority 1: finishedCount > 0 → LEADER_ZOOM, overrides all', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    const rs = { raceElapsed: 1000, finishedCount: 1, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('Priority 1 beats Priority 2 (finish overrides start phase)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    const rs = { raceElapsed: 500, finishedCount: 1, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('Priority 2: raceElapsed < 3000 → OVERVIEW', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    const rs = { raceElapsed: 1500, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('Priority 3: cooldown expired + no battle → OVERVIEW', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0; // exited OVERVIEW at t=0; 9000-0=9000 >= 8000 → expired
    const rs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('Cooldown prevents OVERVIEW when not yet expired', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // 9000-3000=6000 < 8000 → NOT expired
    const rs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
  });

  it('Priority 4: battle (gap01 < 0.05) → BATTLE_ZOOM', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → Priority 3 skipped
    const rs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(battleMidRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('Priority 5 default: gap01 < 0.1 (no comeback condition) → LEADER_ZOOM', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    // gap01=0.07 < 0.1 → comeback condition fails → LEADER_ZOOM
    // Cooldown set to ts=9000 when leaving OVERVIEW; 9000-9000=0 < 8000 → expired guard ok
    const compactRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.43, x: 430, y: 300, finished: false }, // gap01=0.07, not battle, not comeback
      { t: 0.1, x: 100, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(compactRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('COMEBACK_ZOOM when last is far behind and no tight battle', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → Priority 3 skipped
    const comebackRacers = [
      { t: 0.5, x: 500, y: 300, finished: false }, // leader
      { t: 0.35, x: 350, y: 300, finished: false }, // gap01=0.15 >= 0.1
      { t: 0.15, x: 150, y: 300, finished: false }, // gapLeadLast=0.35 > 0.3
    ];
    const rs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(comebackRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});

// ── CameraDirector — §5.4 trigger extensions ─────────────────────────────────

describe('CameraDirector — §5.4 trigger extensions', () => {
  it('Endgame (leader > 85%): LEADER_ZOOM even when cooldown would block OVERVIEW', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    // cooldown set to ts=9000 on OVERVIEW exit; 9000-9000=0 < 8000 → would block Priority 3
    const endgameRacers = [
      { t: 0.9, x: 500, y: 300, finished: false }, // 0.9/1.0=90% > 85%
      { t: 0.6, x: 300, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(endgameRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('Endgame threshold: leader at exactly 85% does NOT trigger endgame', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired
    const atThresholdRacers = [
      { t: 0.85, x: 500, y: 300, finished: false }, // 0.85/1.0 = 0.85, NOT > 0.85
      { t: 0.5, x: 300, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(atThresholdRacers, 9000, rs, 1280, 720);
    // Priority 3 cooldown not expired, Priority 4 no battle, Priority 5: LEADER or COMEBACK
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW); // endgame did not force OVERVIEW
  });

  it('Start-Pulk (raceElapsed < 3000): OVERVIEW state is set', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    const rs = { raceElapsed: 2000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('Start-Pulk OVERVIEW pan uses full-field centroid (all racers, not just top-3)', () => {
    // Use worldW=640 (overviewZoom=2) with an off-center bbox so racers on the right
    // produce a negative targetOffsetX that survives both the bbox and world-edge clamps.
    // bbox x=[200,440] at zoom=2: clamp range [-400,400]; world-edge range [-1280,0].
    // Racers sorted by t: top-3 at x=430,410,390 (avg 410), bottom-2 at x=370,350.
    // full-field avg x=390 → targetOffsetX = 640 - 780 = -140 (start phase)
    // top-3 avg x=410     → targetOffsetX = 640 - 820 = -180 (normal phase)
    const bbox = { minX: 200, minY: 0, maxX: 440, maxY: 720 };
    const cd = new CameraDirector(bbox, 640, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000; // same as ts → transition will NOT fire
    const spreadRacers = [
      { t: 0.5, x: 430, y: 360, finished: false }, // top-1
      { t: 0.4, x: 410, y: 360, finished: false }, // top-2
      { t: 0.3, x: 390, y: 360, finished: false }, // top-3; avg top-3 x = 410
      { t: 0.2, x: 370, y: 360, finished: false },
      { t: 0.1, x: 350, y: 360, finished: false }, // all-5 avg x = 390
    ];

    const startRs = { raceElapsed: 1000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(spreadRacers, 1000, startRs, 1280, 720);
    expect(cd.targetOffsetX).toBeCloseTo(-140, 0); // full-field: 640 - 390*2

    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    const midRs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(spreadRacers, 1000, midRs, 1280, 720);
    expect(cd.targetOffsetX).toBeCloseTo(-180, 0); // top-3 only: 640 - 410*2
  });
});

// ── CameraDirector — isOpenTrack: OVERVIEW zoom differentiation ───────────────
// Regression: PR-B Bug-A fix set targetZoom = overviewZoom unconditionally.
// On closed tracks (effScale = cam.zoom × bsX) this caused double-scaling and
// 107px black bars. These two tests must fail without the isOpenTrack hotfix.

describe('CameraDirector — isOpenTrack OVERVIEW zoom', () => {
  it('closed track (worldW=1536, isOpenTrack=false): OVERVIEW targetZoom = 1, not overviewZoom', () => {
    const cd = new CameraDirector(undefined, 1536, 720, false);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000; // prevents transition
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBe(1);
    expect(cd.targetZoom).not.toBeCloseTo(1280 / 1536, 2); // must NOT be 0.833
  });

  it('open track (worldW=6000, isOpenTrack=true): OVERVIEW targetZoom = overviewZoom ≈ 0.213', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBeCloseTo(1280 / 6000, 3);
    expect(cd.targetZoom).not.toBe(1);
  });
});

// ── estimatedSecondsPerLap ────────────────────────────────────────────────────

describe('estimatedSecondsPerLap', () => {
  it('returns exactly 1 / (baseSpeedMean * speedMultiplier * REFERENCE_FPS)', () => {
    const sm = 1.0;
    const mean = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;
    expect(estimatedSecondsPerLap(sm)).toBeCloseTo(1 / (mean * sm * REFERENCE_FPS));
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
