import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE, OPEN_TRACK_BASE_ZOOM } from './CameraDirector.js';
import { effectiveZoom } from './openTrackCamera.js';
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
    // 36px fallback → _battleZoom = 0.12*720/36 = 2.4.
    // Full-canvas bbox: 1280*2.4=3072 > canvas width — bbox tightening does NOT fire.
    // Canvas-edge clamp (F6a) DOES fire: lo = 1280*(1-2.4) = -1792, so offsetX ≥ -1792.
    // Raw target: 640 - 1081*2.4 = -1954, clamped to ≈ -1792.
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
    // Canvas-edge clamp means offsetX never goes below ≈ -1792
    expect(cd.offsetX).toBeGreaterThan(-1850);
  });

  it('with editor-scale bbox (fits at zoom=1.728), BATTLE_ZOOM clamps so full track stays visible', () => {
    // referenceSpriteSize=50 → _battleZoom = 0.12*720/50 = 1.728.
    // Editor track spans x=400..1100: width=700, 700*1.728=1209 < 1280 — fits on screen.
    // Clamp fires: keeps left edge (x=400) at screen-left and right edge (x=1100) at screen-right.
    const bbox = { minX: 400, minY: 50, maxX: 1100, maxY: 600 };
    const cd = new CameraDirector(bbox, 1280, 720, false, null, 50);
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
    for (let i = 0; i < 300; i++) cd.update(centreRacers, 1000, mockRaceState, 1280, 720);
    // 36px fallback → _leaderZoom = 0.08*720/36 = 1.6 (bsX=1 on 1280px world)
    const leaderZoom = (0.08 * 720) / 36; // 1.6
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
  it('default 1280-wide world: leaderZoom uses 36px fallback → 0.08×720/(36×1) ≈ 1.6', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    // No referenceSpriteSize → 36px fallback. bsX=1280/1280=1.
    // leaderZoom = 0.08*720 / (36*1) = 57.6/36 = 1.6
    expect(cd._leaderZoom).toBeCloseTo(1.6, 3);
  });

  it('open-track 4000-wide world: leaderZoom uses 36px fallback → 0.08×720/(36×1.5) ≈ 1.067', () => {
    const cd = new CameraDirector(undefined, 4000, 720, true);
    // Open-track: cam.zoom = targetPx / (baseSize × OPEN_BASE) = 57.6/54 ≈ 1.067
    // (worldW does not appear — open-track zoom is track-width-independent by design)
    expect(cd._leaderZoom).toBeCloseTo(57.6 / 54, 3);
  });

  it('battleZoom > leaderZoom (battle shows a tighter field)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom (comeback shows a wider view)', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });

  it('open-track: same leaderZoom regardless of worldW (inverse logic, track-width-independent)', () => {
    // Use worldW values where overviewZoom < raw comebackZoom so safety net does not clip.
    // With 36px fallback: comebackRaw = 0.065*720/(36*1.5) ≈ 0.867.
    // overviewZoom < 0.867 → worldW > 1280/0.867 ≈ 1476 → use 2000 and 4000.
    const cd1 = new CameraDirector(undefined, 2000, 720, true);
    const cd2 = new CameraDirector(undefined, 4000, 720, true);
    expect(cd2._leaderZoom).toBeCloseTo(cd1._leaderZoom, 3);
    expect(cd2._battleZoom).toBeCloseTo(cd1._battleZoom, 3);
    expect(cd2._comebackZoom).toBeCloseTo(cd1._comebackZoom, 3);
  });

  it('open-track LEADER_ZOOM: small and large world converge to same zoom (invariance)', () => {
    const cdSmall = new CameraDirector(undefined, 1280, 720, true);
    const cdLarge = new CameraDirector(undefined, 4000, 720, true);
    const racers = [{ t: 1, x: 640, y: 360, finished: false }];
    cdSmall.state = CAM_STATE.LEADER_ZOOM;
    cdLarge.state = CAM_STATE.LEADER_ZOOM;
    for (let i = 0; i < 200; i++) {
      cdSmall.update(racers, 1000, mockRaceState, 1280, 720);
      cdLarge.update(racers, 1000, mockRaceState, 1280, 720);
    }
    // Both worlds target the same sprite size → same cam.zoom
    expect(cdLarge.zoom).toBeCloseTo(cdSmall.zoom, 1);
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
    // comebackZoom ≈ 1.3 on 1280-track (36px fallback: 0.065×720/36 = 1.3).
    // Target at x=500: targetOffsetX = 640 - 500×1.3 = -10 → clamps within valid range.
    // Camera world-center should be near x=500, far from last-place x=100.
    const worldXAtCenter = (640 - cd.offsetX) / cd.zoom;
    expect(worldXAtCenter).toBeGreaterThan(300); // clearly not last-place (x=100)
  });
});

// ── CameraDirector — zoom ordering (inverse logic) ───────────────────────────

describe('CameraDirector — zoom ordering (inverse logic)', () => {
  it('1280-track: 36px fallback → leaderZoom 1.6, battleZoom 2.4, comebackZoom 1.3', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    // No referenceSpriteSize → 36px fallback + DEFAULT_SPRITE_PCT, bsX=1.0
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3); // 1.6
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 36, 3); // 2.4
    expect(cd._comebackZoom).toBeCloseTo((0.065 * 720) / 36, 3); // 1.3
  });

  it('battleZoom > leaderZoom on any track (battle pct > leader pct)', () => {
    for (const worldW of [1280, 2560]) {
      const cd = new CameraDirector(undefined, worldW, 720);
      expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
    }
  });

  it('comebackZoom < leaderZoom (comeback pct < leader pct)', () => {
    // Use worldW where zooms do not hit MAX_INVERSE_ZOOM ceiling (avoid 6000px closed).
    for (const worldW of [1280, 2560]) {
      const cd = new CameraDirector(undefined, worldW, 720);
      expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
    }
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
    cd._lastOverviewExitTs = 0; // exited OVERVIEW at t=0
    cd._overviewCooldownDuration = 8000; // fix to known value: 9000-0=9000 >= 8000 → expired
    // raceElapsed > postStartHoldMs window (3000+7000=10000) so P2.1 does not fire
    const rs = { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('Cooldown prevents OVERVIEW when not yet expired', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // 9000-3000=6000 < 20000 (default mean) → NOT expired
    // raceElapsed > postStartHoldMs window so P2.1 does not mask the cooldown check
    const rs = { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(midRaceRacers, 9000, rs, 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
  });

  it('Priority 4: battle (gap01 < 0.05) → BATTLE_ZOOM', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → Priority 3 skipped
    // raceElapsed > postStartHoldMs window (10s) so P2.1 does not block BATTLE
    const rs = { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(battleMidRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('Priority 5 default: gap01 < 0.1 (no comeback condition) → LEADER_ZOOM', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    // gap01=0.07 < 0.1 → comeback condition fails → LEADER_ZOOM
    // Cooldown set to ts=9000 when leaving OVERVIEW; 9000-9000=0 < 8000 → cooldown check skipped
    // raceElapsed > postStartHoldMs window so P2.1 does not interfere
    const compactRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.43, x: 430, y: 300, finished: false }, // gap01=0.07, not battle, not comeback
      { t: 0.1, x: 100, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(compactRacers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('COMEBACK_ZOOM when last is far behind and no tight battle', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → Priority 3 skipped
    // raceElapsed > postStartHoldMs window so P2.1 does not block COMEBACK
    const comebackRacers = [
      { t: 0.5, x: 500, y: 300, finished: false }, // leader
      { t: 0.35, x: 350, y: 300, finished: false }, // gap01=0.15 >= 0.1
      { t: 0.15, x: 150, y: 300, finished: false }, // gapLeadLast=0.35 > 0.3
    ];
    const rs = { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 };
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

// ── CameraDirector — Block W: finish drama pulse ──────────────────────────────

describe('CameraDirector — finish drama pulse (Block W)', () => {
  it('first finish: state = LEADER_ZOOM and _finishMomentExpiry is set', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true, finishRank: 1 },
      { t: 0.8, x: 500, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 9000, finishedCount: 1, winner: racers[0], finishT: 1.0 };
    cd.update(racers, 9000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._finishMomentExpiry).toBe(10500); // 9000 + 1500
  });

  it('500ms after first finish trigger: still LEADER_ZOOM (drama pulse active)', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true },
      { t: 0.8, x: 500, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 9000, finishedCount: 1, winner: racers[0], finishT: 1.0 };
    cd.update(racers, 9000, rs, 1280, 720); // _finishMomentExpiry = 10500
    cd.stateEnteredAt = 0; // force _transition() to fire next frame
    cd.update(racers, 9500, { ...rs, raceElapsed: 9500 }, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('1600ms after first finish trigger: transitions to OVERVIEW', () => {
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true },
      { t: 0.8, x: 500, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 9000, finishedCount: 1, winner: racers[0], finishT: 1.0 };
    cd.update(racers, 9000, rs, 1280, 720); // _finishMomentExpiry = 10500
    cd.stateEnteredAt = 0; // force _transition() to fire on next call
    cd.update(racers, 10600, { ...rs, raceElapsed: 10600 }, 1280, 720); // ts > 10500
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('drama exits after 1.5s without minStateHold override — finishDramaExpired bypass', () => {
    // stateEnteredAt is NOT reset here — this tests the real bypass path.
    // Before the fix, _transition() would not fire until max(5000,8000)=8000ms after drama start.
    const cd = new CameraDirector();
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true },
      { t: 0.8, x: 500, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 9000, finishedCount: 1, winner: racers[0], finishT: 1.0 };
    cd.update(racers, 9000, rs, 1280, 720); // stateEnteredAt=9000, _finishMomentExpiry=10500
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    // 1.6s later — stateAge=1600 < minStateHoldMs(5000), but drama is expired (ts > 10500)
    cd.update(racers, 10600, { ...rs, raceElapsed: 10600 }, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    expect(cd.stateEnteredAt).toBe(10600);
  });

  it('OVERVIEW after drama pulse is stable — does not flip back to LEADER on next transition', () => {
    // After the drama pulse expires and state = OVERVIEW, the next _transition() call
    // (triggered by MAX_STATE_DURATION) must keep OVERVIEW, not re-enter LEADER_ZOOM.
    const cd = new CameraDirector();
    cd.stateEnteredAt = 0;
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true },
      { t: 0.8, x: 500, y: 300, finished: false },
    ];
    const rs = { raceElapsed: 9000, finishedCount: 1, winner: racers[0], finishT: 1.0 };
    cd.update(racers, 9000, rs, 1280, 720); // _finishMomentExpiry = 10500
    cd.stateEnteredAt = 0;
    cd.update(racers, 10600, rs, 1280, 720); // drama expired → OVERVIEW, stateEnteredAt=10600
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    // Another 8s later: _transition fires again, stays OVERVIEW (not LEADER)
    cd.stateEnteredAt = 10600;
    cd.update(racers, 18600 + 1, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
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

// ── CameraDirector — configurable zoom multipliers ────────────────────────────

// Base config shared by battle-trigger tests — includes spritePctOfCanvas so no fallback warning.
const pctConfig = {
  schemaVersion: 2,
  spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  battleGapThreshold: 0.05,
  maxStateDuration: 8000,
  endgameThreshold: 0.85,
};

describe('CameraDirector — spritePctOfCanvas config', () => {
  it('with referenceSpriteSize=50: _leaderZoom = 0.08×720 / 50 ≈ 1.152 (closed bsX=1)', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, pctConfig, 50);
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 50, 3);
  });

  it('with referenceSpriteSize=50: _battleZoom = 0.12×720 / 50 ≈ 1.728 (closed bsX=1)', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, pctConfig, 50);
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 50, 3);
  });

  it('extreme battle pct (0.95) clamps _battleZoom to MAX_INVERSE_ZOOM (5.0)', () => {
    const extremeConfig = {
      ...pctConfig,
      spritePctOfCanvas: { ...pctConfig.spritePctOfCanvas, battle: 0.95 },
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, extremeConfig, 50);
    // 0.95×720/50 = 13.68 → clamped to 5.0
    expect(cd._battleZoom).toBe(5.0);
  });

  it('no config passed: DEFAULT_SPRITE_PCT + 36px fallback gives predictable zoom values', () => {
    const cd = new CameraDirector(undefined, 1280, 720);
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3); // 1.6
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 36, 3); // 2.4
  });

  it('open track OVERVIEW targetZoom is overviewZoom regardless of spritePctOfCanvas', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true, pctConfig, 50);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBeCloseTo(1280 / 6000, 3);
  });

  it('live-apply: updateConfig() with new spritePctOfCanvas changes _leaderZoom', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, pctConfig, 50);
    const before = cd._leaderZoom;
    cd.updateConfig({
      ...pctConfig,
      spritePctOfCanvas: { ...pctConfig.spritePctOfCanvas, leader: 0.12 },
    });
    expect(cd._leaderZoom).toBeGreaterThan(before);
    expect(cd._leaderZoom).toBeCloseTo((0.12 * 720) / 50, 3); // 1.728
  });

  it('live-apply: reduced spritePct takes effect on next _transition()', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, pctConfig, 50);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    const zoomBefore = cd.zoom;
    cd.updateConfig({
      ...pctConfig,
      spritePctOfCanvas: { ...pctConfig.spritePctOfCanvas, leader: 0.04 },
    });
    for (let i = 0; i < 300; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeLessThan(zoomBefore);
  });
});

// ── CameraDirector — Block X: battle trigger tunables ────────────────────────

describe('CameraDirector — battle trigger tunables (Block X)', () => {
  it('no config: fallback _maxStateDuration=8000, _battleGapThreshold=0.05, _endgameThreshold=0.85, new timing params', () => {
    const cd = new CameraDirector();
    expect(cd._maxStateDuration).toBe(8000);
    expect(cd._battleGapThreshold).toBe(0.05);
    expect(cd._endgameThreshold).toBe(0.85);
    expect(cd._postStartHoldMs).toBe(7000);
    expect(cd._battleCooldownMs).toBe(8000);
    expect(cd._battleMaxDurationMs).toBe(6000);
    expect(cd._minStateHoldMs).toBe(5000);
  });

  it('battleGapThreshold=0.10 fires BATTLE at gap=0.08 (old 0.05 threshold would not)', () => {
    const cfg = {
      ...pctConfig,
      battleGapThreshold: 0.1,
      maxStateDuration: 4000,
      endgameThreshold: 0.85,
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, cfg);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 9000; // cooldown not expired (11000-9000=2000 < 8000)
    // gap01 = 0.08 — within new 0.10 threshold but not old 0.05
    const racers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.42, x: 420, y: 300, finished: false }, // gap = 0.08
      { t: 0.2, x: 200, y: 300, finished: false },
    ];
    cd.update(
      racers,
      11000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('maxStateDuration=4000 allows transition after 4s (not 8s)', () => {
    const cfg = {
      ...pctConfig,
      battleGapThreshold: 0.1,
      maxStateDuration: 4000,
      endgameThreshold: 0.85,
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, cfg);
    cd.stateEnteredAt = 0;
    // 5001ms — minStateHoldMs=5000 is the effective cap (max(5000, 4000)=5000)
    cd.update(
      mockRacers(4),
      5001,
      { raceElapsed: 5001, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.stateEnteredAt).toBe(5001); // transition fired, stateEnteredAt reset
  });

  it('endgameThreshold=0.95 allows BATTLE at 90% progress (old 0.85 would block it)', () => {
    const cfg = {
      ...pctConfig,
      battleGapThreshold: 0.1,
      maxStateDuration: 4000,
      endgameThreshold: 0.95,
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, cfg);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 9000; // cooldown not expired (11000-9000=2000 < 8000)
    // leader at 90% progress: below 0.95 threshold → endgame does NOT lock LEADER
    // gap01=0.08 < battleGapThreshold=0.10 → should fire BATTLE
    const racers = [
      { t: 0.9, x: 500, y: 300, finished: false }, // 90% progress (finishT=1)
      { t: 0.82, x: 420, y: 300, finished: false }, // gap=0.08
      { t: 0.5, x: 200, y: 300, finished: false },
    ];
    cd.update(
      racers,
      11000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('live-apply: updateConfig() updates all three timing params without re-construction', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, pctConfig);
    expect(cd._maxStateDuration).toBe(8000); // pctConfig.maxStateDuration = 8000
    cd.updateConfig({
      ...pctConfig,
      battleGapThreshold: 0.15,
      maxStateDuration: 3000,
      endgameThreshold: 0.9,
    });
    expect(cd._battleGapThreshold).toBe(0.15);
    expect(cd._maxStateDuration).toBe(3000);
    expect(cd._endgameThreshold).toBe(0.9);
  });

  it('maxStateDuration in config overrides fallback: no transition before new duration', () => {
    const cfg = {
      ...pctConfig,
      battleGapThreshold: 0.1,
      maxStateDuration: 6000,
      endgameThreshold: 0.85,
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, cfg);
    cd.stateEnteredAt = 0;
    // 5999ms — below the configured 6000ms duration, should NOT trigger transition
    cd.update(
      mockRacers(4),
      5999,
      { raceElapsed: 5999, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.stateEnteredAt).toBe(0); // stateEnteredAt unchanged → no transition
  });
});

// ── CameraDirector — Phase-4 timing tunables (D1–D4) ─────────────────────────

const tightBattleRacers = [
  { t: 0.5, x: 500, y: 300, finished: false },
  { t: 0.48, x: 480, y: 300, finished: false }, // gap01=0.02 < 0.05 → hasBattle
  { t: 0.2, x: 200, y: 300, finished: false },
];

describe('CameraDirector — D1: postStartLeaderHold', () => {
  it('no BATTLE before 10s even with tight gap (raceElapsed=9999)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // stateAge=9000 >= max(5000,8000)=8000 → transition fires
    cd.update(
      tightBattleRacers,
      9000,
      { raceElapsed: 9999, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    // P2.1: raceElapsed=9999 < 3000+7000=10000 → forced LEADER, no BATTLE
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE allowed after postStartHold window (raceElapsed=10001)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 5000; // cooldown not expired (10001-5000=5001 < 8000) → P3 skipped
    // stateAge=10001 >= max(5000,8000)=8000 → transition fires
    cd.update(
      tightBattleRacers,
      10001,
      { raceElapsed: 10001, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    // P2.1 does NOT fire (raceElapsed >= 10000); P4: hasBattle=true, battleCooledDown=true
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });
});

describe('CameraDirector — D2: battleCooldown', () => {
  it('no BATTLE within 8s of last battle exit', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastBattleExitTs = 5000; // ts=12000: 12000-5000=7000 < 8000 → not cooled
    cd._lastOverviewExitTs = 5000; // overview cooldown not expired → P3 skipped
    cd.update(
      tightBattleRacers,
      12000,
      { raceElapsed: 12000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE fires after 8s battle cooldown', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastBattleExitTs = 3000; // ts=11001: 11001-3000=8001 >= 8000 → cooled
    cd._lastOverviewExitTs = 5000; // overview cooldown not expired (11001-5000=6001 < 8000) → P3 skipped
    cd.update(
      tightBattleRacers,
      11001,
      { raceElapsed: 11001, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });
});

describe('CameraDirector — D3: battleMaxDurationMs', () => {
  it('no transition before 6s in BATTLE state', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    // stateAge=5999 < max(5000, 6000)=6000 → no transition
    cd.update(
      tightBattleRacers,
      5999,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.stateEnteredAt).toBe(0); // unchanged — no transition fired
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE exits after 6s even with gap still tight; _lastBattleExitTs is set', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 1000;
    // stateAge=6001 >= max(5000, 6000)=6000 → transition fires; battle cooldown blocks re-entry
    cd.update(
      tightBattleRacers,
      6001,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._lastBattleExitTs).toBe(6001);
  });

  it('battleMaxDurationMs hard-cap: force-exit succeeds even when gap is in hysteresis zone (0.06)', () => {
    // Confirms hysteresis does NOT block force-exit. Mechanism: update() pre-sets
    // _lastBattleExitTs=ts → battleCooledDown=false → P4 cannot fire → BATTLE exits to LEADER.
    // Hysteresis (hasBattle=true via exit threshold) only prevents OVERVIEW via P3.
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 1000;
    cd.update(
      marginalRacers, // gap01=0.06: above entry (0.05), below exit threshold (0.07)
      6001,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM); // hard cap fires — BATTLE exited
    expect(cd._lastBattleExitTs).toBe(6001); // cooldown timestamp set by update() pre-transition
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM); // hasBattle=true blocks OVERVIEW → lands on LEADER
  });
});

describe('CameraDirector — D4: minStateHold', () => {
  it('no transition before minStateHoldMs (5s) even when maxStateDuration < 5s', () => {
    const smallCapConfig = { ...pctConfig, maxStateDuration: 2000 };
    const cd = new CameraDirector(undefined, 1280, 720, false, smallCapConfig);
    cd.stateEnteredAt = 0;
    // stateAge=4999 < max(5000, 2000)=5000 → no transition
    cd.update(
      mockRacers(4),
      4999,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.stateEnteredAt).toBe(0); // unchanged — minStateHold blocks early exit
  });

  it('transition fires at minStateHoldMs when maxStateDuration is smaller', () => {
    const smallCapConfig = { ...pctConfig, maxStateDuration: 2000 };
    const cd = new CameraDirector(undefined, 1280, 720, false, smallCapConfig);
    cd.stateEnteredAt = 0;
    // stateAge=5000 >= max(5000, 2000)=5000 → transition fires
    cd.update(
      mockRacers(4),
      5000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.stateEnteredAt).toBe(5000);
  });
});

// ── CameraDirector — B: BATTLE hysteresis ────────────────────────────────────

const marginalRacers = [
  { t: 0.5, x: 500, y: 300, finished: false },
  { t: 0.44, x: 440, y: 300, finished: false }, // gap01=0.06: above entry (0.05), below exit (0.07)
  { t: 0.2, x: 200, y: 300, finished: false },
];

describe('CameraDirector — B: BATTLE hysteresis', () => {
  it('in BATTLE with gap 0.05–0.07: exits to LEADER, not OVERVIEW (exit threshold holds P3)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 1000; // overview cooldown not expired (6001-1000=5001 < 8000)
    // stateAge=6001 >= max(5000,6000)=6000 → forces BATTLE exit; gap=0.06 < exit threshold 0.07
    // hasBattle=true (exit threshold) → P3 !hasBattle=false → no OVERVIEW
    cd.update(
      marginalRacers,
      6001,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
  });

  it('not in BATTLE: gap 0.05–0.07 does NOT enter BATTLE (entry threshold only)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → P3 skipped
    // gap=0.06 >= entry threshold 0.05 → hasBattle=false → P4 skipped → LEADER stays
    cd.update(
      marginalRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('gap below exit threshold (0.04): stays hasBattle=true in BATTLE (hysteresis confirms hold)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 1000;
    // gap=0.04 < 0.07 exit threshold → hasBattle=true; battle exits to LEADER (not OVERVIEW)
    const deepBattleRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.46, x: 460, y: 300, finished: false }, // gap=0.04
      { t: 0.2, x: 200, y: 300, finished: false },
    ];
    cd.update(
      deepBattleRacers,
      6001,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
  });
});

// ── CameraDirector — D5: cameraTransitionSeconds → _lerpFactor ───────────────

describe('CameraDirector — D5: cameraTransitionSeconds → _lerpFactor', () => {
  it('no config: _lerpFactor computed from fallback 1.5s at 60fps ≈ 0.0253', () => {
    const cd = new CameraDirector();
    const expected = 1 - Math.pow(0.1, 1 / (1.5 * 60));
    expect(cd._lerpFactor).toBeCloseTo(expected, 5);
    expect(cd._lerpFactor).toBeCloseTo(0.0253, 3);
  });

  it('cameraTransitionSeconds=0.5 gives faster lerp ≈ 0.0739', () => {
    const fastConfig = { ...pctConfig, cameraTransitionSeconds: 0.5 };
    const cd = new CameraDirector(undefined, 1280, 720, false, fastConfig);
    const expected = 1 - Math.pow(0.1, 1 / (0.5 * 60));
    expect(cd._lerpFactor).toBeCloseTo(expected, 5);
    expect(cd._lerpFactor).toBeCloseTo(0.0739, 3);
  });

  it('cameraTransitionSeconds=3.0 gives slower lerp ≈ 0.0127', () => {
    const slowConfig = { ...pctConfig, cameraTransitionSeconds: 3.0 };
    const cd = new CameraDirector(undefined, 1280, 720, false, slowConfig);
    const expected = 1 - Math.pow(0.1, 1 / (3.0 * 60));
    expect(cd._lerpFactor).toBeCloseTo(expected, 5);
    expect(cd._lerpFactor).toBeCloseTo(0.0127, 3);
  });

  it('live-apply: updateConfig() with faster transition increases _lerpFactor', () => {
    const cd = new CameraDirector();
    const before = cd._lerpFactor;
    cd.updateConfig({ ...pctConfig, cameraTransitionSeconds: 0.5 });
    expect(cd._lerpFactor).toBeGreaterThan(before);
    expect(cd._lerpFactor).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.5 * 60)), 5);
  });
});

// ── CameraDirector — D5: overviewCooldown jitter ─────────────────────────────

describe('CameraDirector — D5: overviewCooldown jitter', () => {
  it('_overviewCooldownDuration initializes to (min+max)/2 mean = 20000 (deterministic)', () => {
    const cd = new CameraDirector();
    // Default: [15000, 25000] → mean = 20000
    expect(cd._overviewCooldownDuration).toBe(20000);
  });

  it('leaving OVERVIEW re-rolls _overviewCooldownDuration within [min, max]', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    // stateAge=9000 >= max(5000,8000)=8000 → _transition fires, prevState=OVERVIEW → re-roll
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd._overviewCooldownDuration).toBeGreaterThanOrEqual(15000);
    expect(cd._overviewCooldownDuration).toBeLessThanOrEqual(25000);
  });

  it('P3 respects custom _overviewCooldownDuration: no OVERVIEW if elapsed < duration', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 9500; // directly set a long cooldown
    // ts=9000: 9000-0=9000 < 9500 → P3 does NOT fire
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
  });

  it('P3 fires when elapsed >= _overviewCooldownDuration', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 8000; // explicit known value
    // ts=9000: 9000-0=9000 >= 8000 → P3 fires
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('config overviewCooldownMin/Max read via _computeTimingConfig; mean used as initial duration', () => {
    const jitterConfig = { ...pctConfig, overviewCooldownMin: 5000, overviewCooldownMax: 9000 };
    const cd = new CameraDirector(undefined, 1280, 720, false, jitterConfig);
    expect(cd._overviewCooldownMin).toBe(5000);
    expect(cd._overviewCooldownMax).toBe(9000);
    expect(cd._overviewCooldownDuration).toBe(7000); // mean = (5000+9000)/2
  });

  it('cooldown expired + BATTLE active → re-rolls cooldown, no OVERVIEW', () => {
    // When the cooldown expires but BATTLE or endgame blocks Priority 3,
    // the cooldown must re-roll so that a later quiet window can trigger OVERVIEW.
    const battleRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.48, x: 480, y: 300, finished: false }, // gap01=0.02 < 0.05 → hasBattle
      { t: 0.2, x: 200, y: 300, finished: false },
    ];
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 5000; // expires at ts=5000+
    // ts=9000: stateAge=9000 >= max(5000,8000)=8000 → _transition fires.
    // hasBattle=true → P3 blocked. cooldownExpired=(9000-0>=5000)=true → re-roll fires.
    cd.update(
      battleRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW); // battle blocked P3
    expect(cd._lastOverviewExitTs).toBe(9000); // re-roll fired: timer restarted at ts
    expect(cd._overviewCooldownDuration).toBeGreaterThanOrEqual(15000); // fresh random roll
    expect(cd._overviewCooldownDuration).toBeLessThanOrEqual(25000);
  });

  it('cooldown not yet expired → no re-roll', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 25000; // far from expiry
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd._lastOverviewExitTs).toBe(0); // unchanged
  });

  it('long-race scenario: two blocked cooldowns, then OVERVIEW fires in quiet LEADER window', () => {
    // Simulates: BATTLE blocks cooldown twice (re-rolls each time), then gap opens
    // and a third cooldown fires successfully.
    const shortCooldownConfig = {
      ...pctConfig,
      overviewCooldownMin: 3000,
      overviewCooldownMax: 3000,
    };
    const cd = new CameraDirector(undefined, 1280, 720, false, shortCooldownConfig);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 3000;

    const battleRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.48, x: 480, y: 300, finished: false }, // gap < threshold → hasBattle
      { t: 0.2, x: 200, y: 300, finished: false },
    ];
    // Tick 1: stateAge=8001 fires _transition. Battle blocks P3 (cooldown expired at t=3000).
    // Re-roll sets _lastOverviewExitTs=8001, new duration=3000.
    cd.update(
      battleRacers,
      8001,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
    expect(cd._lastOverviewExitTs).toBe(8001);

    // Tick 2: stateAge fires again. Second blocked cooldown (expires at 8001+3000=11001).
    cd.stateEnteredAt = 8001;
    cd.update(
      battleRacers,
      16100,
      { raceElapsed: 18000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
    expect(cd._lastOverviewExitTs).toBe(16100);

    // Tick 3: gap widens → no battle. Cooldown expires at 16100+3000=19100. ts=24200 > 19100.
    // stateAge=24200-16100=8100 >= max(5000,8000)=8000 → _transition fires. P3 wins → OVERVIEW.
    cd.stateEnteredAt = 16100;
    cd.update(
      midRaceRacers,
      24200,
      { raceElapsed: 26000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });
});

// ── Effective render-zoom — hierarchy ordering (H1+H2 context preserved) ─────

describe('Effective render-zoom — hierarchy ordering', () => {
  it('closed-track: LEADER eff > OVERVIEW eff, BATTLE eff > LEADER eff across worldW', () => {
    for (const worldW of [1280, 2000, 3000]) {
      const cd = new CameraDirector(undefined, worldW, 720, false, pctConfig, 50);
      const bsX = 1280 / worldW;
      const overviewEff = 1 * bsX;
      const leaderEff = cd._leaderZoom * bsX;
      const battleEff = cd._battleZoom * bsX;
      expect(leaderEff).toBeGreaterThan(overviewEff);
      expect(battleEff).toBeGreaterThan(leaderEff);
    }
  });

  it('open-track: LEADER eff > OVERVIEW eff, BATTLE eff > LEADER eff for worldW ≥ 2000', () => {
    // worldW=1280 would clip leader to overviewZoom (safety net) because baseSize=50
    // makes raw leaderZoom < overviewZoom on a 1280px world.
    for (const worldW of [2000, 3000, 6000]) {
      const cd = new CameraDirector(undefined, worldW, 720, true, pctConfig, 50);
      const overviewEff = effectiveZoom(cd.overviewZoom, OPEN_TRACK_BASE_ZOOM);
      const leaderEff = effectiveZoom(cd._leaderZoom, OPEN_TRACK_BASE_ZOOM);
      const battleEff = effectiveZoom(cd._battleZoom, OPEN_TRACK_BASE_ZOOM);
      expect(leaderEff).toBeGreaterThan(overviewEff);
      expect(battleEff).toBeGreaterThan(leaderEff);
    }
  });

  it('effectiveZoom() scales linearly with openBase argument', () => {
    const camZoom = 1.8;
    expect(effectiveZoom(camZoom, 1.5)).toBeCloseTo(2.7, 2);
    expect(effectiveZoom(camZoom, 2.0)).toBeCloseTo(3.6, 2);
    expect(effectiveZoom(camZoom, 1.0)).toBeCloseTo(1.8, 2);
  });
});

// ── CameraDirector — inverse zoom logic (Round 3) ────────────────────────────
// Tests for _computeZoomForTargetSize and the spritePctOfCanvas config path.
// When referenceSpriteSize=0, a 36px internal default is used with a console warning.

const inverseConfig = {
  schemaVersion: 2,
  spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  battleGapThreshold: 0.1,
  maxStateDuration: 4000,
  endgameThreshold: 0.85,
};

describe('CameraDirector — _computeZoomForTargetSize (Round 3)', () => {
  it('closed-track: targetSize=58, baseSize=36, bsX=0.83 → cam.zoom ≈ 1.94', () => {
    // worldW that gives bsX≈0.83: CANVAS_W/worldW=0.83 → worldW≈1542
    const worldW = Math.round(1280 / 0.83);
    const cd = new CameraDirector(undefined, worldW, 720, false, inverseConfig, 36);
    const expected = 58 / (36 * (1280 / worldW));
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(expected, 2);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(1.94, 1);
  });

  it('open-track: targetSize=58, baseSize=50, OPEN_BASE=1.5 → cam.zoom ≈ 0.77', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true, inverseConfig, 50);
    const expected = 58 / (50 * OPEN_TRACK_BASE_ZOOM);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(expected, 2);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(0.773, 2);
  });

  it('safety net closed — very small targetSize clamps cam.zoom to 1.0', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    // targetSize=1px: would give cam.zoom=1/50=0.02, clamped to 1.0
    expect(cd._computeZoomForTargetSize(1)).toBe(1.0);
  });

  it('safety net open — very small targetSize clamps cam.zoom to overviewZoom', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true, inverseConfig, 50);
    // targetSize=1px: cam.zoom = 1/(50*1.5) = 0.013, clamped to overviewZoom≈0.213
    expect(cd._computeZoomForTargetSize(1)).toBeCloseTo(1280 / 6000, 3);
  });

  it('safety net upper — very large targetSize clamps cam.zoom to 5.0', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    // targetSize=10000px: would give cam.zoom=200, clamped to 5.0
    expect(cd._computeZoomForTargetSize(10000)).toBe(5.0);
  });

  it('referenceSpriteSize=0: uses 36px default, closed → zoom = 58/(36×bsX)', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 0);
    // bsX = 1280/1280 = 1.0 → expected = 58/36 ≈ 1.611
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(58 / 36, 2);
  });

  it('referenceSpriteSize=0: uses 36px default, open → zoom = 58/(36×OPEN_BASE)', () => {
    const cd = new CameraDirector(undefined, 6000, 720, true, inverseConfig, 0);
    // expected = 58/(36×1.5) ≈ 1.074; safety net min = overviewZoom≈0.213 → not clamped
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(58 / (36 * OPEN_TRACK_BASE_ZOOM), 2);
  });
});

describe('CameraDirector — inverse zoom: _computeZoomLevels (Round 3)', () => {
  it('_referenceSpriteSize is stored at construction time', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 42);
    expect(cd._referenceSpriteSize).toBe(42);
  });

  it('OPEN_TRACK_BASE_ZOOM is exported as 1.5', () => {
    expect(OPEN_TRACK_BASE_ZOOM).toBe(1.5);
  });

  it('inverse path activates when referenceSpriteSize > 0 and spritePctOfCanvas present', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    // With baseSize=50, bsX=1, leader=0.08*720=57.6: _leaderZoom=57.6/50=1.152
    expect(cd._leaderZoom).toBeCloseTo(57.6 / 50, 3);
  });

  it('referenceSpriteSize=0 uses 36px default, NOT multiplier ratios', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 0);
    // 36px fallback + leader pct 0.08: 0.08*720/36 = 1.6 (≠ old LEADER_ZOOM_RATIO=1.4)
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3);
    expect(cd._leaderZoom).not.toBeCloseTo(1.4, 1); // confirm it is NOT the old multiplier value
  });

  it('battleZoom > leaderZoom with inverse logic (battle pct > leader pct)', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom with inverse logic (comeback pct < leader pct)', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });

  it('live-apply: spritePctOfCanvas.leader 0.08→0.12 changes _leaderZoom after updateConfig()', () => {
    const cd = new CameraDirector(undefined, 1280, 720, false, inverseConfig, 50);
    const zoomBefore = cd._leaderZoom;
    cd.updateConfig({
      ...inverseConfig,
      spritePctOfCanvas: { ...inverseConfig.spritePctOfCanvas, leader: 0.12 },
    });
    expect(cd._leaderZoom).toBeGreaterThan(zoomBefore);
    // new _leaderZoom: 0.12*720/50 = 1.728
    expect(cd._leaderZoom).toBeCloseTo((0.12 * 720) / 50, 3);
  });
});

describe('CameraDirector — cross-track scale invariance (Round 3, L62)', () => {
  // Core test: same spritePctOfCanvas → same on-screen sprite pixels regardless of
  // track width or type. This proves the inverse logic solves the L62 asymmetry.

  it('closed 1280px and open 6000px give same leader screenPx for same targetPct', () => {
    const baseSize = 50;
    const targetPct = inverseConfig.spritePctOfCanvas.leader; // 0.08
    const targetPx = targetPct * 720; // 57.6

    const cdClosed = new CameraDirector(undefined, 1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(undefined, 6000, 720, true, inverseConfig, baseSize);

    const bsXClosed = 1280 / 1280; // 1.0
    const closedScreenPx = baseSize * cdClosed._leaderZoom * bsXClosed;
    const openScreenPx = baseSize * cdOpen._leaderZoom * OPEN_TRACK_BASE_ZOOM;

    expect(Math.abs(closedScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(openScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(closedScreenPx - openScreenPx)).toBeLessThan(3);
  });

  it('battle state: closed 1280px and open 6000px give same battleScreenPx', () => {
    const baseSize = 36;
    const targetPx = inverseConfig.spritePctOfCanvas.battle * 720; // 0.12*720=86.4

    const cdClosed = new CameraDirector(undefined, 1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(undefined, 6000, 720, true, inverseConfig, baseSize);

    const bsX = 1280 / 1280;
    const closedScreenPx = baseSize * cdClosed._battleZoom * bsX;
    const openScreenPx = baseSize * cdOpen._battleZoom * OPEN_TRACK_BASE_ZOOM;

    expect(Math.abs(closedScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(openScreenPx - targetPx)).toBeLessThan(3);
  });

  it('comeback state: closed 1280px and open 6000px give same comebackScreenPx', () => {
    const baseSize = 36;
    const targetPx = inverseConfig.spritePctOfCanvas.comeback * 720; // 0.065*720=46.8

    const cdClosed = new CameraDirector(undefined, 1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(undefined, 6000, 720, true, inverseConfig, baseSize);

    const bsX = 1280 / 1280;
    const closedScreenPx = baseSize * cdClosed._comebackZoom * bsX;
    const openScreenPx = baseSize * cdOpen._comebackZoom * OPEN_TRACK_BASE_ZOOM;

    expect(Math.abs(closedScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(openScreenPx - targetPx)).toBeLessThan(3);
  });

  it('closed track: same spritePct on 1280px and 2560px worlds gives same screenPx', () => {
    const baseSize = 50;
    const targetPx = inverseConfig.spritePctOfCanvas.leader * 720;

    const cd1280 = new CameraDirector(undefined, 1280, 720, false, inverseConfig, baseSize);
    const cd2560 = new CameraDirector(undefined, 2560, 720, false, inverseConfig, baseSize);

    const screenPx1280 = baseSize * cd1280._leaderZoom * (1280 / 1280);
    const screenPx2560 = baseSize * cd2560._leaderZoom * (1280 / 2560);

    expect(Math.abs(screenPx1280 - targetPx)).toBeLessThan(3);
    expect(Math.abs(screenPx2560 - targetPx)).toBeLessThan(3);
  });
});
