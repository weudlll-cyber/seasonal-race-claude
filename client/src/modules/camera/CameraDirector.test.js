import { describe, it, expect } from 'vitest';
import {
  CameraDirector,
  CAM_STATE,
  OPEN_TRACK_BASE_ZOOM,
  tcToLerpFactor,
} from './CameraDirector.js';
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
    const cd = new CameraDirector(6000, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBeCloseTo(1280 / 6000, 3);
    expect(cd.targetZoom).toBeLessThan(0.3);
  });

  it('OVERVIEW on 6000px world: zoom converges to overviewZoom, not 1', () => {
    const cd = new CameraDirector(6000, 720, true);
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
  it('BATTLE_ZOOM with racers at right edge (x=1081): no black border, right world edge stays on screen', () => {
    // 36px fallback → _battleZoom = 0.12*720/36 = 2.4. bsX=1 on 1280px world.
    // resolveCamera: camXMax = 1280 - 1280/2.4 = 746.7; target centered, then clamped.
    // targetOffsetX = -camX * effZoom → 1280*zoom + offsetX = (1280-camX)*effZoom ≥ 1280.
    const cd = new CameraDirector(1280, 720);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const extremeRacers = [
      { t: 0.9, x: 1081, y: 360, finished: false },
      { t: 0.8, x: 1081, y: 360, finished: false },
    ];
    for (let i = 0; i < 200; i++) cd.update(extremeRacers, 1000, mockRaceState, 1280, 720);
    // Right world edge (x=1280) must be at or beyond canvas right (screenX≥1280): no black border
    expect(1280 * cd.zoom + cd.offsetX).toBeGreaterThanOrEqual(1280 - 1);
    // Left world edge must be at or before canvas left (offsetX≤0): no black border on left
    expect(cd.offsetX).toBeLessThanOrEqual(0.1);
  });

  it('BATTLE_ZOOM with racers near right edge (x=1085): no black border on either side', () => {
    // referenceSpriteSize=50 → _battleZoom = 0.12*720/50 = 1.728. bsX=1 on 1280px world.
    // resolveCamera: camXMax = 1280 - 1280/1.728 = 539.3. Target centered at camX=539.3.
    // Right world edge: (1280-539.3)*1.728 = 1280 → exactly at canvas right, no black border.
    const cd = new CameraDirector(1280, 720, false, null, 50);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const racers = [
      { t: 0.9, x: 1090, y: 300, finished: false },
      { t: 0.8, x: 1080, y: 300, finished: false },
    ];
    for (let i = 0; i < 300; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    // Right world edge (x=1280) must reach or exceed canvas right: no black border
    expect(1280 * cd.zoom + cd.offsetX).toBeGreaterThanOrEqual(1280 - 1);
    // Left world edge must not exceed canvas left: no black border on left
    expect(cd.offsetX).toBeLessThanOrEqual(0.1);
  });

  it('LEADER_ZOOM with racers near canvas center: converges to adaptive offset with no clamping', () => {
    const worldW = 1280;
    const cd = new CameraDirector(worldW, 720);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const centreRacers = [{ t: 1, x: 640, y: 360, finished: false }];
    for (let i = 0; i < 300; i++) cd.update(centreRacers, 1000, mockRaceState, 1280, 720);
    // 36px fallback → _leaderZoom = 0.08*720/36 = 1.6 (bsX=1 on 1280px world)
    const leaderZoom = (0.08 * 720) / 36; // 1.6
    expect(cd.offsetX).toBeCloseTo(640 - 640 * leaderZoom, 0);
  });

  it('default args behave identically to explicit 1280×720 world', () => {
    const cdDefault = new CameraDirector();
    const cdExplicit = new CameraDirector(1280, 720);
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

// ── CameraDirector — adaptive zoom (B-16) ────────────────────────────────────

describe('CameraDirector — adaptive zoom (B-16)', () => {
  it('default 1280-wide world: leaderZoom uses 36px fallback → 0.08×720/(36×1) ≈ 1.6', () => {
    const cd = new CameraDirector(1280, 720);
    // No referenceSpriteSize → 36px fallback. bsX=1280/1280=1.
    // leaderZoom = 0.08*720 / (36*1) = 57.6/36 = 1.6
    expect(cd._leaderZoom).toBeCloseTo(1.6, 3);
  });

  it('open-track 4000-wide world: leaderZoom uses 36px fallback → 0.08×720/(36×1.5) ≈ 1.067', () => {
    const cd = new CameraDirector(4000, 720, true);
    // Open-track: cam.zoom = targetPx / (baseSize × OPEN_BASE) = 57.6/54 ≈ 1.067
    // (worldW does not appear — open-track zoom is track-width-independent by design)
    expect(cd._leaderZoom).toBeCloseTo(57.6 / 54, 3);
  });

  it('battleZoom > leaderZoom (battle shows a tighter field)', () => {
    const cd = new CameraDirector(1280, 720);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom (comeback shows a wider view)', () => {
    const cd = new CameraDirector(1280, 720);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });

  it('open-track: same leaderZoom regardless of worldW (inverse logic, track-width-independent)', () => {
    // Use worldW values where overviewZoom < raw comebackZoom so safety net does not clip.
    // With 36px fallback: comebackRaw = 0.065*720/(36*1.5) ≈ 0.867.
    // overviewZoom < 0.867 → worldW > 1280/0.867 ≈ 1476 → use 2000 and 4000.
    const cd1 = new CameraDirector(2000, 720, true);
    const cd2 = new CameraDirector(4000, 720, true);
    expect(cd2._leaderZoom).toBeCloseTo(cd1._leaderZoom, 3);
    expect(cd2._battleZoom).toBeCloseTo(cd1._battleZoom, 3);
    expect(cd2._comebackZoom).toBeCloseTo(cd1._comebackZoom, 3);
  });

  it('open-track LEADER_ZOOM: small and large world converge to same zoom (invariance)', () => {
    const cdSmall = new CameraDirector(1280, 720, true);
    const cdLarge = new CameraDirector(4000, 720, true);
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
    const cd = new CameraDirector(1280, 720);
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
    const cd = new CameraDirector(1280, 720);
    // No referenceSpriteSize → 36px fallback + DEFAULT_SPRITE_PCT, bsX=1.0
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3); // 1.6
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 36, 3); // 2.4
    expect(cd._comebackZoom).toBeCloseTo((0.065 * 720) / 36, 3); // 1.3
  });

  it('battleZoom > leaderZoom on any track (battle pct > leader pct)', () => {
    for (const worldW of [1280, 2560]) {
      const cd = new CameraDirector(worldW, 720);
      expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
    }
  });

  it('comebackZoom < leaderZoom (comeback pct < leader pct)', () => {
    // Use worldW where zooms do not hit MAX_INVERSE_ZOOM ceiling (avoid 6000px closed).
    for (const worldW of [1280, 2560]) {
      const cd = new CameraDirector(worldW, 720);
      expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
    }
  });
});

// ── CameraDirector — world-edge clamp (Befund 2) ─────────────────────────────
// Regression: positive offsetY caused a black strip above the track when
// bbox fits within the viewport. After the fix, offsetY must be ≤ 0 at zoom > 1.

describe('CameraDirector — world-edge clamp (Befund 2)', () => {
  it('offsetY stays ≤ 0 at zoom > 1 when racers are near top edge (y≈110)', () => {
    // resolveCamera: idealCamY = 115 - 720/(2*2.4) = -35 → clamped to 0.
    // targetOffsetY = -0 * 2.4 = 0 → offsetY converges to 0 ≤ 0.
    const cd = new CameraDirector(1280, 720);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    const racers = [
      { t: 0.9, x: 640, y: 110, finished: false },
      { t: 0.8, x: 640, y: 120, finished: false },
    ];
    for (let i = 0; i < 200; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    expect(cd.offsetY).toBeLessThanOrEqual(0);
  });

  it('offsetX stays ≤ 0 at zoom > 1 when racers are near left edge (x≈110)', () => {
    // resolveCamera: idealCamX = 115 - 1280/(2*2.4) = -152 → clamped to 0.
    // targetOffsetX = -0 * 2.4 = 0 → offsetX converges to 0 ≤ 0.
    const cd = new CameraDirector(1280, 720);
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
  { t: 0.48, x: 480, y: 300, finished: false }, // 20px from r0 — within pulk threshold
  { t: 0.46, x: 460, y: 300, finished: false }, // 40px from r0, 20px from r1 — forms pulk of 3
  { t: 0.2, x: 200, y: 300, finished: false }, // far from cluster — not in pulk
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

  it('Priority 4: battle (pulk of 3 within 200px) → BATTLE_ZOOM', () => {
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

  it('Start-Pulk OVERVIEW pan: closed track maintains zoom=1, does not crash with full-field or top-3 input', () => {
    // Full-field centroid behavior is tested in panTarget.test.js.
    // Here we verify CameraDirector plumbs the correct racer set without crashing,
    // and that OVERVIEW on a closed track always keeps cam.zoom=1.
    const cd = new CameraDirector(1280, 720, false);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    const spreadRacers = [
      { t: 0.5, x: 430, y: 360, finished: false },
      { t: 0.4, x: 410, y: 360, finished: false },
      { t: 0.3, x: 390, y: 360, finished: false },
      { t: 0.2, x: 370, y: 360, finished: false },
      { t: 0.1, x: 350, y: 360, finished: false },
    ];
    const startRs = { raceElapsed: 1000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(spreadRacers, 1000, startRs, 1280, 720);
    expect(cd.targetZoom).toBe(1); // OVERVIEW: closed track → cam.zoom=1
    expect(isFinite(cd.targetOffsetX)).toBe(true);

    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    const midRs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(spreadRacers, 1000, midRs, 1280, 720);
    expect(cd.targetZoom).toBe(1);
    expect(isFinite(cd.targetOffsetX)).toBe(true);
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
    const cd = new CameraDirector(1536, 720, false);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000; // prevents transition
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBe(1);
    expect(cd.targetZoom).not.toBeCloseTo(1280 / 1536, 2); // must NOT be 0.833
  });

  it('open track (worldW=6000, isOpenTrack=true): OVERVIEW targetZoom = overviewZoom ≈ 0.213', () => {
    const cd = new CameraDirector(6000, 720, true);
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
    const cd = new CameraDirector(1280, 720, false, pctConfig, 50);
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 50, 3);
  });

  it('with referenceSpriteSize=50: _battleZoom = 0.12×720 / 50 ≈ 1.728 (closed bsX=1)', () => {
    const cd = new CameraDirector(1280, 720, false, pctConfig, 50);
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 50, 3);
  });

  it('extreme battle pct (0.95) clamps _battleZoom to MAX_INVERSE_ZOOM (5.0)', () => {
    const extremeConfig = {
      ...pctConfig,
      spritePctOfCanvas: { ...pctConfig.spritePctOfCanvas, battle: 0.95 },
    };
    const cd = new CameraDirector(1280, 720, false, extremeConfig, 50);
    // 0.95×720/50 = 13.68 → clamped to 5.0
    expect(cd._battleZoom).toBe(5.0);
  });

  it('no config passed: DEFAULT_SPRITE_PCT + 36px fallback gives predictable zoom values', () => {
    const cd = new CameraDirector(1280, 720);
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3); // 1.6
    expect(cd._battleZoom).toBeCloseTo((0.12 * 720) / 36, 3); // 2.4
  });

  it('open track OVERVIEW targetZoom is overviewZoom regardless of spritePctOfCanvas', () => {
    const cd = new CameraDirector(6000, 720, true, pctConfig, 50);
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.targetZoom).toBeCloseTo(1280 / 6000, 3);
  });

  it('live-apply: updateConfig() with new spritePctOfCanvas changes _leaderZoom', () => {
    const cd = new CameraDirector(1280, 720, false, pctConfig, 50);
    const before = cd._leaderZoom;
    cd.updateConfig({
      ...pctConfig,
      spritePctOfCanvas: { ...pctConfig.spritePctOfCanvas, leader: 0.12 },
    });
    expect(cd._leaderZoom).toBeGreaterThan(before);
    expect(cd._leaderZoom).toBeCloseTo((0.12 * 720) / 50, 3); // 1.728
  });

  it('live-apply: reduced spritePct takes effect on next _transition()', () => {
    const cd = new CameraDirector(1280, 720, false, pctConfig, 50);
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
  it('no config: fallback _maxStateDuration=8000, _battlePulkThresholdPx=200, _battleMinDurationMs=3000, _endgameThreshold=0.85', () => {
    const cd = new CameraDirector();
    expect(cd._maxStateDuration).toBe(8000);
    expect(cd._battlePulkThresholdPx).toBe(200);
    expect(cd._battleMinDurationMs).toBe(3000);
    expect(cd._endgameThreshold).toBe(0.85);
    expect(cd._postStartHoldMs).toBe(7000);
    expect(cd._battleCooldownMs).toBe(8000);
    expect(cd._battleMaxDurationMs).toBe(6000);
    expect(cd._minStateHoldMs).toBe(5000);
  });

  it('pulk (3 racers within 200px) triggers BATTLE_ZOOM', () => {
    const cfg = {
      ...pctConfig,
      maxStateDuration: 4000,
      endgameThreshold: 0.85,
    };
    const cd = new CameraDirector(1280, 720, false, cfg);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 9000; // overview cooldown not expired
    // 3 racers within 200px → _isPulk=true → hasBattle=true → P4 fires
    const racers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.46, x: 460, y: 300, finished: false }, // 40px from r0
      { t: 0.42, x: 420, y: 300, finished: false }, // 80px from r0, 40px from r1
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
    const cd = new CameraDirector(1280, 720, false, cfg);
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
      maxStateDuration: 4000,
      endgameThreshold: 0.95,
    };
    const cd = new CameraDirector(1280, 720, false, cfg);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 9000; // overview cooldown not expired
    // leader at 90% progress: below 0.95 threshold → endgame does NOT lock LEADER
    // 3 close racers → _isPulk=true → P4 fires BATTLE_ZOOM
    const racers = [
      { t: 0.9, x: 500, y: 300, finished: false }, // 90% progress (finishT=1)
      { t: 0.86, x: 460, y: 300, finished: false }, // 40px from r0
      { t: 0.82, x: 420, y: 300, finished: false }, // 80px from r0, 40px from r1 → pulk of 3
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

  it('live-apply: updateConfig() updates pulk params and timing params without re-construction', () => {
    const cd = new CameraDirector(1280, 720, false, pctConfig);
    expect(cd._maxStateDuration).toBe(8000); // pctConfig.maxStateDuration = 8000
    cd.updateConfig({
      ...pctConfig,
      battlePulkThresholdPx: 150,
      battleMinDurationMs: 1500,
      maxStateDuration: 3000,
      endgameThreshold: 0.9,
    });
    expect(cd._battlePulkThresholdPx).toBe(150);
    expect(cd._battleMinDurationMs).toBe(1500);
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
    const cd = new CameraDirector(1280, 720, false, cfg);
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
  { t: 0.48, x: 480, y: 300, finished: false }, // 20px from r0
  { t: 0.46, x: 460, y: 300, finished: false }, // 40px from r0, 20px from r1 → pulk of 3
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
    const cd = new CameraDirector(1280, 720, false, smallCapConfig);
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
    const cd = new CameraDirector(1280, 720, false, smallCapConfig);
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

// ── CameraDirector — D5: per-state transition constants → _lf* lerp factors ──

describe('CameraDirector — D5: per-state transition constants', () => {
  it('no config: _lfOverview from 1.5s fallback ≈ 0.0253, _lfLeader from 0.3s ≈ 0.121', () => {
    const cd = new CameraDirector();
    expect(cd._lfOverview).toBeCloseTo(1 - Math.pow(0.1, 1 / (1.5 * 60)), 5);
    expect(cd._lfOverview).toBeCloseTo(0.0253, 3);
    expect(cd._lfLeader).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.3 * 60)), 5);
    expect(cd._lfBattle).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.3 * 60)), 5);
    expect(cd._lfComeback).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.3 * 60)), 5);
  });

  it('object config sets per-state TC and lf independently', () => {
    const cfg = {
      ...pctConfig,
      cameraTransitionSeconds: { overview: 2.0, leader: 0.5, battle: 0.4, comeback: 0.6 },
    };
    const cd = new CameraDirector(1280, 720, false, cfg);
    expect(cd._tcOverview).toBe(2.0);
    expect(cd._tcLeader).toBe(0.5);
    expect(cd._tcBattle).toBe(0.4);
    expect(cd._tcComeback).toBe(0.6);
    expect(cd._lfOverview).toBeCloseTo(1 - Math.pow(0.1, 1 / (2.0 * 60)), 5);
    expect(cd._lfLeader).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.5 * 60)), 5);
    expect(cd._lfBattle).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.4 * 60)), 5);
    expect(cd._lfComeback).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.6 * 60)), 5);
  });

  it('scalar config applies scalar to overview, defaults to zoom-state TCs', () => {
    const cfg = { ...pctConfig, cameraTransitionSeconds: 0.5 };
    const cd = new CameraDirector(1280, 720, false, cfg);
    expect(cd._tcOverview).toBe(0.5);
    expect(cd._tcLeader).toBe(0.3);
    expect(cd._tcBattle).toBe(0.3);
    expect(cd._lfOverview).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.5 * 60)), 5);
    expect(cd._lfLeader).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.3 * 60)), 5);
  });

  it('live-apply: updateConfig() with object TC updates all per-state lf values', () => {
    const cd = new CameraDirector();
    const prevLfOverview = cd._lfOverview;
    cd.updateConfig({
      ...pctConfig,
      cameraTransitionSeconds: { overview: 0.5, leader: 0.1, battle: 0.1, comeback: 0.1 },
    });
    expect(cd._lfOverview).toBeGreaterThan(prevLfOverview);
    expect(cd._lfOverview).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.5 * 60)), 5);
    expect(cd._lfLeader).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.1 * 60)), 5);
    expect(cd._lfBattle).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.1 * 60)), 5);
    expect(cd._lfComeback).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.1 * 60)), 5);
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
    const cd = new CameraDirector(1280, 720, false, jitterConfig);
    expect(cd._overviewCooldownMin).toBe(5000);
    expect(cd._overviewCooldownMax).toBe(9000);
    expect(cd._overviewCooldownDuration).toBe(7000); // mean = (5000+9000)/2
  });

  it('cooldown expired + BATTLE active → re-rolls cooldown, no OVERVIEW', () => {
    // When the cooldown expires but BATTLE or endgame blocks Priority 3,
    // the cooldown must re-roll so that a later quiet window can trigger OVERVIEW.
    const battleRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.48, x: 480, y: 300, finished: false }, // 20px from r0
      { t: 0.46, x: 460, y: 300, finished: false }, // 40px from r0 → pulk of 3 → hasBattle=true
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
    const cd = new CameraDirector(1280, 720, false, shortCooldownConfig);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 0;
    cd._overviewCooldownDuration = 3000;

    const battleRacers = [
      { t: 0.5, x: 500, y: 300, finished: false },
      { t: 0.48, x: 480, y: 300, finished: false }, // 20px from r0
      { t: 0.46, x: 460, y: 300, finished: false }, // 40px from r0 → pulk of 3 → hasBattle=true
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
      const cd = new CameraDirector(worldW, 720, false, pctConfig, 50);
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
      const cd = new CameraDirector(worldW, 720, true, pctConfig, 50);
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
    const cd = new CameraDirector(worldW, 720, false, inverseConfig, 36);
    const expected = 58 / (36 * (1280 / worldW));
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(expected, 2);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(1.94, 1);
  });

  it('open-track: targetSize=58, baseSize=50, OPEN_BASE=1.5 → cam.zoom ≈ 0.77', () => {
    const cd = new CameraDirector(6000, 720, true, inverseConfig, 50);
    const expected = 58 / (50 * OPEN_TRACK_BASE_ZOOM);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(expected, 2);
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(0.773, 2);
  });

  it('safety net closed — very small targetSize clamps cam.zoom to 1.0', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
    // targetSize=1px: would give cam.zoom=1/50=0.02, clamped to 1.0
    expect(cd._computeZoomForTargetSize(1)).toBe(1.0);
  });

  it('safety net open — very small targetSize clamps cam.zoom to overviewZoom', () => {
    const cd = new CameraDirector(6000, 720, true, inverseConfig, 50);
    // targetSize=1px: cam.zoom = 1/(50*1.5) = 0.013, clamped to overviewZoom≈0.213
    expect(cd._computeZoomForTargetSize(1)).toBeCloseTo(1280 / 6000, 3);
  });

  it('safety net upper — very large targetSize clamps cam.zoom to 5.0', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
    // targetSize=10000px: would give cam.zoom=200, clamped to 5.0
    expect(cd._computeZoomForTargetSize(10000)).toBe(5.0);
  });

  it('referenceSpriteSize=0: uses 36px default, closed → zoom = 58/(36×bsX)', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 0);
    // bsX = 1280/1280 = 1.0 → expected = 58/36 ≈ 1.611
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(58 / 36, 2);
  });

  it('referenceSpriteSize=0: uses 36px default, open → zoom = 58/(36×OPEN_BASE)', () => {
    const cd = new CameraDirector(6000, 720, true, inverseConfig, 0);
    // expected = 58/(36×1.5) ≈ 1.074; safety net min = overviewZoom≈0.213 → not clamped
    expect(cd._computeZoomForTargetSize(58)).toBeCloseTo(58 / (36 * OPEN_TRACK_BASE_ZOOM), 2);
  });
});

describe('CameraDirector — inverse zoom: _computeZoomLevels (Round 3)', () => {
  it('_referenceSpriteSize is stored at construction time', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 42);
    expect(cd._referenceSpriteSize).toBe(42);
  });

  it('OPEN_TRACK_BASE_ZOOM is exported as 1.5', () => {
    expect(OPEN_TRACK_BASE_ZOOM).toBe(1.5);
  });

  it('inverse path activates when referenceSpriteSize > 0 and spritePctOfCanvas present', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
    // With baseSize=50, bsX=1, leader=0.08*720=57.6: _leaderZoom=57.6/50=1.152
    expect(cd._leaderZoom).toBeCloseTo(57.6 / 50, 3);
  });

  it('referenceSpriteSize=0 uses 36px default, NOT multiplier ratios', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 0);
    // 36px fallback + leader pct 0.08: 0.08*720/36 = 1.6 (≠ old LEADER_ZOOM_RATIO=1.4)
    expect(cd._leaderZoom).toBeCloseTo((0.08 * 720) / 36, 3);
    expect(cd._leaderZoom).not.toBeCloseTo(1.4, 1); // confirm it is NOT the old multiplier value
  });

  it('battleZoom > leaderZoom with inverse logic (battle pct > leader pct)', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
  });

  it('comebackZoom < leaderZoom with inverse logic (comeback pct < leader pct)', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
    expect(cd._comebackZoom).toBeLessThan(cd._leaderZoom);
  });

  it('live-apply: spritePctOfCanvas.leader 0.08→0.12 changes _leaderZoom after updateConfig()', () => {
    const cd = new CameraDirector(1280, 720, false, inverseConfig, 50);
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

    const cdClosed = new CameraDirector(1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(6000, 720, true, inverseConfig, baseSize);

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

    const cdClosed = new CameraDirector(1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(6000, 720, true, inverseConfig, baseSize);

    const bsX = 1280 / 1280;
    const closedScreenPx = baseSize * cdClosed._battleZoom * bsX;
    const openScreenPx = baseSize * cdOpen._battleZoom * OPEN_TRACK_BASE_ZOOM;

    expect(Math.abs(closedScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(openScreenPx - targetPx)).toBeLessThan(3);
  });

  it('comeback state: closed 1280px and open 6000px give same comebackScreenPx', () => {
    const baseSize = 36;
    const targetPx = inverseConfig.spritePctOfCanvas.comeback * 720; // 0.065*720=46.8

    const cdClosed = new CameraDirector(1280, 720, false, inverseConfig, baseSize);
    const cdOpen = new CameraDirector(6000, 720, true, inverseConfig, baseSize);

    const bsX = 1280 / 1280;
    const closedScreenPx = baseSize * cdClosed._comebackZoom * bsX;
    const openScreenPx = baseSize * cdOpen._comebackZoom * OPEN_TRACK_BASE_ZOOM;

    expect(Math.abs(closedScreenPx - targetPx)).toBeLessThan(3);
    expect(Math.abs(openScreenPx - targetPx)).toBeLessThan(3);
  });

  it('closed track: same spritePct on 1280px and 2560px worlds gives same screenPx', () => {
    const baseSize = 50;
    const targetPx = inverseConfig.spritePctOfCanvas.leader * 720;

    const cd1280 = new CameraDirector(1280, 720, false, inverseConfig, baseSize);
    const cd2560 = new CameraDirector(2560, 720, false, inverseConfig, baseSize);

    const screenPx1280 = baseSize * cd1280._leaderZoom * (1280 / 1280);
    const screenPx2560 = baseSize * cd2560._leaderZoom * (1280 / 2560);

    expect(Math.abs(screenPx1280 - targetPx)).toBeLessThan(3);
    expect(Math.abs(screenPx2560 - targetPx)).toBeLessThan(3);
  });
});

// ── CameraDirector — pan centering (world-space coordinate verification) ──────────
// Render pipeline for closed tracks: screen_x = (worldX - camX) × effZoom = worldX × effZoom + offsetX.
// CameraDirector receives world-space coordinates from RaceScreen (no bsX scaling).
// resolveCamera computes camX so the target centers on screen: (target - camX) × effZoom = canvasW/2.
// worldW=1536 (bsX≈0.833); worldH=720 so bsY=1.0 on Dirt Oval.

describe('CameraDirector — trivial pan centering (closed tracks)', () => {
  // Render-pipeline formula for closed tracks.
  // screen_x = worldX × cam.zoom × bsX + offsetX  (equivalent to (worldX - camX) × effZoom).
  function screenX(cd, worldX, worldW) {
    const bsX = 1280 / worldW;
    return worldX * cd.zoom * bsX + cd.offsetX;
  }
  function screenY(cd, worldY, worldH) {
    const bsY = 720 / worldH;
    return worldY * cd.zoom * bsY + cd.offsetY;
  }

  it('LEADER_ZOOM closed worldW=1536: leader centered at hw/hh after pan converges', () => {
    // Dirt Oval scenario: bsX=0.833, bsY=1.0.
    // CameraDirector receives world-space coordinates directly.
    const worldW = 1536;
    const worldH = 720;
    const worldX = 350;
    const worldY = 300;
    const config = {
      ...inverseConfig,
      spritePctOfCanvas: { ...inverseConfig.spritePctOfCanvas, leader: 0.16 },
    };
    const cd = new CameraDirector(worldW, worldH, false, config, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: worldX, y: worldY, finished: false };
    for (let i = 0; i < 400; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(screenX(cd, worldX, worldW)).toBeCloseTo(640, 0);
    expect(screenY(cd, worldY, worldH)).toBeCloseTo(360, 0);
  });

  it('BATTLE_ZOOM closed worldW=1536: track-midpoint centered at hw/hh after pan converges', () => {
    const worldW = 1536;
    const worldH = 720;
    // Top-2 racers have t=0.9 and t=0.8; tMid=0.85.
    // The mock shape returns world position (600, 300) for any t, so the
    // pan target is (600, 300) — same as the euclidean centroid but resolved via
    // the track-curve path, confirming CameraDirector passes shape to getPanTarget.
    const worldCx = 600;
    const worldCy = 300;
    const mockShape = { getPosition: (_t, _offset) => ({ x: worldCx, y: worldCy, angle: 0 }) };
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36, mockShape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    const racers = [
      { t: 0.9, x: 700, y: worldCy, finished: false },
      { t: 0.8, x: 500, y: worldCy, finished: false },
      { t: 0.5, x: 200, y: worldCy, finished: false },
    ];
    for (let i = 0; i < 400; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    expect(screenX(cd, worldCx, worldW)).toBeCloseTo(640, 0);
    expect(screenY(cd, worldCy, worldH)).toBeCloseTo(360, 0);
  });

  it('COMEBACK_ZOOM closed worldW=1536: 3rd-place racer centered at hw/hh after pan converges', () => {
    // 3rd-place (bottom of top-N=3) is the COMEBACK target.
    const worldW = 1536;
    const worldH = 720;
    const worldX = 700;
    const worldY = 360;
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    cd.state = CAM_STATE.COMEBACK_ZOOM;
    cd.stateEnteredAt = 1000;
    const racers = [
      { t: 0.9, x: 900, y: worldY, finished: false }, // 1st
      { t: 0.7, x: 800, y: worldY, finished: false }, // 2nd
      { t: 0.5, x: worldX, y: worldY, finished: false }, // 3rd — targeted
    ];
    for (let i = 0; i < 400; i++) cd.update(racers, 1000, mockRaceState, 1280, 720);
    expect(screenX(cd, worldX, worldW)).toBeCloseTo(640, 0);
    expect(screenY(cd, worldY, worldH)).toBeCloseTo(360, 0);
  });

  it('open track worldW=6000: cam.offsetX not used in render (st.camX/Y path) — no crash', () => {
    // Open tracks pan via RaceScreen (getPanTarget+resolveCamera+st.camX/Y), not cam.offsetX/Y.
    const worldW = 6000;
    const cd = new CameraDirector(worldW, 720, true, inverseConfig, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: 500, y: 360, finished: false };
    for (let i = 0; i < 400; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(cd.zoom).toBeGreaterThan(0);
    expect(isFinite(cd.offsetX)).toBe(true);
  });
});

// ── D6: coordinated pan+zoom transition getters ───────────────────────────────

describe('CameraDirector — D6: coordinated pan+zoom transition', () => {
  const worldW = 1536;
  const worldH = 720;

  it('transitioning=true immediately after state entry, false after convergence', () => {
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: 800, y: 360, finished: false };
    // First update — zoom hasn't converged yet
    cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(cd.transitioning).toBe(true);
    // After 600 frames (~10s at 60fps) zoom should have converged
    for (let i = 0; i < 600; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(cd.transitioning).toBe(false);
  });

  it('zoomProgress increases from near 0 to 1 as zoom converges', () => {
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    // Force start from zoom=1 (overview)
    cd.zoom = 1;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: 800, y: 360, finished: false };
    // Record transition start on first update
    cd.update([leader], 1000, mockRaceState, 1280, 720);
    const earlyProgress = cd.zoomProgress;
    // After convergence
    for (let i = 0; i < 600; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(earlyProgress).toBeLessThan(0.5);
    expect(cd.zoomProgress).toBeCloseTo(1, 1);
  });

  it('panProgress increases from near 0 to 1 as pan converges', () => {
    // At zoom=1 on a closed 1536-world the entire world fits (effZoom=bsX), so
    // no pan is needed regardless of leader position. Start at zoom=1.5 instead —
    // at that level the leader near x=1400 is outside the centred view and
    // pan travel is ~640px.
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    cd.zoom = 1.5;
    cd.offsetX = 0;
    cd.offsetY = 0;
    // Prime transition start to current position (simulates just-transitioned state)
    cd._transitionStartZoom = 1.5;
    cd._transitionStartOffsetX = 0;
    cd._transitionStartOffsetY = 0;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    // x=800 is well-centred so resolveCamera returns a real pan target (not clamped to 0).
    // x=1400 is near the right edge and resolveCamera falls back to minEffZoom where camX=0.
    const leader = { t: 1, x: 800, y: 360, finished: false };
    cd.update([leader], 1000, mockRaceState, 1280, 720);
    const earlyProgress = cd.panProgress;
    for (let i = 0; i < 600; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(earlyProgress).toBeLessThan(0.5);
    expect(cd.panProgress).toBeCloseTo(1, 1);
  });

  it('targetInFrame is true after convergence', () => {
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: 800, y: 360, finished: false };
    for (let i = 0; i < 400; i++) cd.update([leader], 1000, mockRaceState, 1280, 720);
    expect(cd.targetInFrame).toBe(true);
  });

  it('panProgress and zoomProgress default to 1 before any update', () => {
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    expect(cd.panProgress).toBe(1);
    expect(cd.zoomProgress).toBe(1);
  });

  it('pan target tracks current zoom during transition — smooth coupling', () => {
    // Verify that targetOffsetX changes each frame as zoom lerps (not constant).
    const cd = new CameraDirector(worldW, worldH, false, inverseConfig, 36);
    cd.zoom = 1;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    const leader = { t: 1, x: 1000, y: 360, finished: false };
    cd.update([leader], 1000, mockRaceState, 1280, 720);
    const offset1 = cd.targetOffsetX;
    cd.update([leader], 1000, mockRaceState, 1280, 720);
    const offset2 = cd.targetOffsetX;
    // targetOffsetX must change between frames because current zoom changed
    expect(offset2).not.toBeCloseTo(offset1, 5);
  });
});

// ── Phase 1 — tcToLerpFactor helper ──────────────────────────────────────────

describe('tcToLerpFactor (Phase 1 helper)', () => {
  it('tc=0.3s at 60fps: 90% convergence formula matches', () => {
    const lf = tcToLerpFactor(0.3);
    expect(lf).toBeCloseTo(1 - Math.pow(0.1, 1 / (0.3 * 60)), 10);
  });

  it('tc=1.5s at 60fps: slower (smaller lf) than tc=0.3s', () => {
    expect(tcToLerpFactor(1.5)).toBeLessThan(tcToLerpFactor(0.3));
  });

  it('tc=0.3: lf is strictly between 0 and 1', () => {
    const lf = tcToLerpFactor(0.3);
    expect(lf).toBeGreaterThan(0);
    expect(lf).toBeLessThan(1);
  });

  it('larger tc → smaller lf (slower convergence)', () => {
    expect(tcToLerpFactor(2.0)).toBeLessThan(tcToLerpFactor(0.5));
  });
});

// ── Phase 1 — cameraStateProfiles config path ────────────────────────────────

const profileConfig = {
  cameraStateProfiles: {
    OVERVIEW: {
      spritePct: 0.05,
      trackingTC: 1.5,
      entryTC: 1.5,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
    LEADER_ZOOM: {
      spritePct: 0.09,
      trackingTC: 0.25,
      entryTC: 0.25,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
    BATTLE_ZOOM: {
      spritePct: 0.14,
      trackingTC: 0.35,
      entryTC: 0.35,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 7000,
      minStateHold: 5000,
    },
    COMEBACK_ZOOM: {
      spritePct: 0.07,
      trackingTC: 0.3,
      entryTC: 0.3,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
  },
  entryConvergenceZoom: 0.05,
  entryConvergencePx: 10,
  battleGapThreshold: 0.05,
  endgameThreshold: 0.85,
  postStartHoldMs: 7000,
  battleCooldownMs: 8000,
  overviewCooldownMin: 15000,
  overviewCooldownMax: 25000,
  targetInnerFramePct: 0.7,
};

describe('CameraDirector — Phase 1: cameraStateProfiles config path', () => {
  it('_leaderZoom computed from profiles.LEADER_ZOOM.spritePct (0.09)', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 50);
    // 0.09 × 720 / 50 = 1.296 on closed 1280px track (bsX=1)
    expect(cd._leaderZoom).toBeCloseTo((0.09 * 720) / 50, 3);
  });

  it('_battleZoom computed from profiles.BATTLE_ZOOM.spritePct (0.14)', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 50);
    expect(cd._battleZoom).toBeCloseTo((0.14 * 720) / 50, 3);
  });

  it('_tcLeader comes from profiles.LEADER_ZOOM.trackingTC (0.25)', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig);
    expect(cd._tcLeader).toBe(0.25);
    expect(cd._lfLeader).toBeCloseTo(tcToLerpFactor(0.25), 10);
  });

  it('_minStateHoldByState uses per-state values from profiles', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig);
    expect(cd._minStateHoldByState[CAM_STATE.BATTLE_ZOOM]).toBe(5000);
    expect(cd._minStateHoldByState[CAM_STATE.LEADER_ZOOM]).toBe(5000);
  });

  it('_maxStateDurationByState uses BATTLE_ZOOM.maxStateDuration (7000)', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig);
    expect(cd._maxStateDurationByState[CAM_STATE.BATTLE_ZOOM]).toBe(7000);
    expect(cd._maxStateDurationByState[CAM_STATE.LEADER_ZOOM]).toBe(4000);
  });

  it('updateConfig() with updated profiles changes _leaderZoom immediately', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 50);
    const before = cd._leaderZoom;
    const updated = {
      ...profileConfig,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: { ...profileConfig.cameraStateProfiles.LEADER_ZOOM, spritePct: 0.15 },
      },
    };
    cd.updateConfig(updated);
    expect(cd._leaderZoom).toBeGreaterThan(before);
    expect(cd._leaderZoom).toBeCloseTo((0.15 * 720) / 50, 3);
  });

  it('updateConfig() with updated profiles changes _tcBattle and _lfBattle', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig);
    const prevLf = cd._lfBattle;
    const updated = {
      ...profileConfig,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        BATTLE_ZOOM: { ...profileConfig.cameraStateProfiles.BATTLE_ZOOM, trackingTC: 1.0 },
      },
    };
    cd.updateConfig(updated);
    expect(cd._tcBattle).toBe(1.0);
    expect(cd._lfBattle).toBeLessThan(prevLf); // slower convergence
    expect(cd._lfBattle).toBeCloseTo(tcToLerpFactor(1.0), 10);
  });
});

// ── Phase 1 — dt-scaled lerp ─────────────────────────────────────────────────

describe('CameraDirector — Phase 1: dt-scaled lerp', () => {
  it('no dt arg (default 16.67ms): lerp factor equals lf60 (behavior-equivalent)', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    const startZoom = 1.0;
    cd.zoom = startZoom;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    // _setTargets() overwrites targetZoom during update; recover the actual lf
    // from how far zoom moved toward the target.
    const delta = cd.targetZoom - startZoom;
    const actualLf = (cd.zoom - startZoom) / delta;
    expect(actualLf).toBeCloseTo(cd._lfLeader, 4);
  });

  it('double dt (33.33ms) produces larger lerp step than single dt', () => {
    const cd1 = new CameraDirector(1280, 720, false, null, 36);
    cd1.state = CAM_STATE.LEADER_ZOOM;
    cd1.stateEnteredAt = 0;
    cd1.zoom = 1.0;
    cd1.targetZoom = 3.0;

    const cd2 = new CameraDirector(1280, 720, false, null, 36);
    cd2.state = CAM_STATE.LEADER_ZOOM;
    cd2.stateEnteredAt = 0;
    cd2.zoom = 1.0;
    cd2.targetZoom = 3.0;

    // Single frame at default dt
    cd1.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    // Double dt frame
    cd2.update(mockRacers(4), 1000, mockRaceState, 1280, 720, 1000 / 30);

    expect(cd2.zoom).toBeGreaterThan(cd1.zoom);
  });

  it('two half-dt frames converge to the same result as one full-dt frame', () => {
    const makeCD = () => {
      const cd = new CameraDirector(1280, 720, false, null, 36);
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.stateEnteredAt = 0;
      cd.zoom = 1.0;
      cd.targetZoom = 3.0;
      cd.offsetX = 0;
      cd.targetOffsetX = 0;
      cd.offsetY = 0;
      cd.targetOffsetY = 0;
      return cd;
    };

    const cdFull = makeCD();
    const cdHalf = makeCD();

    const halfDt = 1000 / (60 * 2);
    const fullDt = 1000 / 60;

    cdFull.update(mockRacers(4), 1000, mockRaceState, 1280, 720, fullDt);
    cdHalf.update(mockRacers(4), 1000, mockRaceState, 1280, 720, halfDt);
    cdHalf.update(mockRacers(4), 1000, mockRaceState, 1280, 720, halfDt);

    // Two half-dt lerp steps should match one full-dt step within floating-point tolerance
    expect(cdHalf.zoom).toBeCloseTo(cdFull.zoom, 6);
  });
});

// ── Phase 2 — lerpPhase automat ───────────────────────────────────────────────

// Config with distinct entryTC and trackingTC so tests can tell them apart
const phase2Config = {
  ...profileConfig,
  cameraStateProfiles: {
    ...profileConfig.cameraStateProfiles,
    LEADER_ZOOM: {
      ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
      trackingTC: 0.1, // fast tracking
      entryTC: 2.0, // slow entry (clearly different)
    },
    BATTLE_ZOOM: {
      ...profileConfig.cameraStateProfiles.BATTLE_ZOOM,
      trackingTC: 0.15,
      entryTC: 1.8,
    },
  },
  entryConvergenceZoom: 0.05,
  entryConvergencePx: 10,
};

describe('CameraDirector — Phase 2: lerpPhase automat', () => {
  it('lerpPhase starts as entry on construct', () => {
    const cd = new CameraDirector(1280, 720, false, phase2Config, 36);
    expect(cd.lerpPhase).toBe('entry');
  });

  it('lerpPhase resets to entry on state transition', () => {
    const cd = new CameraDirector(1280, 720, false, phase2Config, 36);
    // Drive to tracking by converging all dimensions
    cd.zoom = cd.targetZoom;
    cd.offsetX = cd.targetOffsetX;
    cd.offsetY = cd.targetOffsetY;
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    // Force a state transition
    cd._transition(mockRacers(4), 20000, mockRaceState);
    expect(cd.lerpPhase).toBe('entry');
  });

  it('lerpPhase switches to tracking when all three dimensions converge', () => {
    // Open tracks now compute offsetX/Y via _setOpenTrackTargets (same as closed tracks).
    // Run until convergence — zoom and offsets both need to reach their targets.
    const cd = new CameraDirector(6000, 720, true, phase2Config, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd.zoom = cd._leaderZoom; // pre-converge zoom so only offsets need to settle
    for (let i = 0; i < 300; i++) {
      cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
      if (cd.lerpPhase === 'tracking') break;
    }
    expect(cd.lerpPhase).toBe('tracking');
  });

  it('lerpPhase stays in entry while one dimension is not converged', () => {
    const cd = new CameraDirector(1280, 720, false, phase2Config, 36);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // Converge zoom and Y, but leave X far away
    cd.zoom = cd.targetZoom;
    cd.offsetY = cd.targetOffsetY;
    cd.offsetX = cd.targetOffsetX - 100; // 100px lag
    cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.lerpPhase).toBe('entry');
  });

  it('entry phase uses _lfEntryByState, tracking phase uses _lfByState', () => {
    const cd = new CameraDirector(1280, 720, false, phase2Config, 36);
    // In entry phase, lerpFactorForState should return entry lf
    const entryLf = cd._lerpFactorForState(CAM_STATE.LEADER_ZOOM);
    expect(entryLf).toBeCloseTo(cd._lfEntryLeader, 10);
    expect(entryLf).toBeCloseTo(tcToLerpFactor(2.0), 10);

    // Switch to tracking, then check
    cd._lerpPhase = 'tracking';
    const trackingLf = cd._lerpFactorForState(CAM_STATE.LEADER_ZOOM);
    expect(trackingLf).toBeCloseTo(cd._lfLeader, 10);
    expect(trackingLf).toBeCloseTo(tcToLerpFactor(0.1), 10);

    // The two must differ
    expect(entryLf).not.toBeCloseTo(trackingLf, 3);
  });

  it('with entryTC == trackingTC, behavior is equivalent to phase 1 (no-op)', () => {
    // Default profileConfig has entryTC == trackingTC for all states
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd._lfEntryLeader).toBeCloseTo(cd._lfLeader, 10);
    expect(cd._lfEntryBattle).toBeCloseTo(cd._lfBattle, 10);
    expect(cd._lfEntryOverview).toBeCloseTo(cd._lfOverview, 10);
    expect(cd._lfEntryComeback).toBeCloseTo(cd._lfComeback, 10);
  });

  it('updateConfig() with new entryTC updates _lfEntry immediately', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    const before = cd._lfEntryLeader;
    const updated = {
      ...profileConfig,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: { ...profileConfig.cameraStateProfiles.LEADER_ZOOM, entryTC: 3.0 },
      },
    };
    cd.updateConfig(updated);
    expect(cd._lfEntryLeader).toBeLessThan(before); // slower convergence
    expect(cd._lfEntryLeader).toBeCloseTo(tcToLerpFactor(3.0), 10);
    // _lfEntryByState map updated too
    expect(cd._lfEntryByState[CAM_STATE.LEADER_ZOOM]).toBeCloseTo(tcToLerpFactor(3.0), 10);
  });
});

// ── Etappe 6: Observer Phase (Lead-In / Mitlaufen / Lead-Out) ────────────────

const raceStateIdle = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 6000 };

// Minimal shape stub: straight track from x=0 to x=trackLen at y=360.
// getTotalLength() returns trackLen; getPosition(t, _) returns {x: t*trackLen, y: 360}.
function makeShape(trackLen = 4000) {
  return {
    getTotalLength: () => trackLen,
    getPosition: (t, _lateral) => ({ x: t * trackLen, y: 360 }),
  };
}

const phasedConfig = {
  ...profileConfig,
  cameraStateProfiles: {
    ...profileConfig.cameraStateProfiles,
    LEADER_ZOOM: {
      ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
      leadInDuration: 1.0,
      leadOutDuration: 1.5,
    },
    BATTLE_ZOOM: {
      ...profileConfig.cameraStateProfiles.BATTLE_ZOOM,
      leadInDuration: 0.5,
      leadOutDuration: 1.0,
    },
  },
};

describe('CameraDirector — Etappe 9: observer phase (time-based)', () => {
  it('constructor: _camT is null, _observerPhase is "idle"', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd._camT).toBeNull();
    expect(cd._observerPhase).toBe('idle');
  });

  it('_phasedByState reads leadInDuration / leadOutDuration from profiles', () => {
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadInDuration).toBe(1.0);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadOutDuration).toBe(1.5);
    expect(cd._phasedByState[CAM_STATE.OVERVIEW].leadInDuration).toBe(0);
  });

  it('legacy path: _phasedByState defaults all to 0', () => {
    const cd = new CameraDirector(1280, 720, false, pctConfig, 36);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadInDuration).toBe(0);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadOutDuration).toBe(0);
  });

  it('_transition() sets _camT = focusT and _transitionTargetT = focusT+leadAhead for LEADER_ZOOM', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    const racers = [
      { x: 800, y: 360, t: 0.5 },
      { x: 700, y: 360, t: 0.4 },
    ];
    cd._transition(racers, 10000, {
      raceElapsed: 10000,
      finishedCount: 0,
      winner: null,
      finishT: 6000,
    });
    // T-space lerp: _camT starts at focusT; _transitionTargetT includes lead-ahead offset
    // (speed=NOMINAL_T_PER_FRAME=0.001, FRAME_RATE=60, leadInDuration=1.0s → offset=0.06)
    expect(cd._camT).toBeCloseTo(0.5, 5);
    expect(cd._observerPhase).toBe('idle');
    expect(cd._transitionTargetT).toBeCloseTo(0.56, 3);
  });

  it('_transition() to OVERVIEW sets _camT = leader.t and _transitionTargetT = leader.t (no lead-ahead)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    const racers = [{ x: 100, y: 360, t: 0.1 }];
    cd._transition(racers, 1000, {
      raceElapsed: 1000,
      finishedCount: 0,
      winner: null,
      finishT: 6000,
    });
    // OVERVIEW gets T-space lerp targeting the leader's T (no lead-ahead).
    // _camT is released to null after convergence but stays non-null during entry.
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    expect(cd._camT).toBeCloseTo(0.1, 5);
    expect(cd._transitionTargetT).toBeCloseTo(0.1, 5);
  });

  it('_transition() resets _observerPhase to "idle" and sets _transitionTargetT for LEADER_ZOOM', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd._observerPhase = 'follow';
    const racers = [
      { x: 800, y: 360, t: 0.5 },
      { x: 700, y: 360, t: 0.4 },
    ];
    cd._transition(racers, 10000, {
      raceElapsed: 10000,
      finishedCount: 0,
      winner: null,
      finishT: 6000,
    });
    // Observer phase is always reset to 'idle' at transition;
    // lead-in starts only at convergence (set by the convergence gate).
    expect(cd._observerPhase).toBe('idle');
    expect(cd._transitionTargetT).not.toBeNull();
  });

  it('_transition() resets _prevFocusT to null to prevent stale speed estimate on first update frame', () => {
    // Regression guard for camera-pr102-bug-diagnosis.md Bug 1:
    // _prevFocusT accumulates over the previous state's tracking phase. Without this reset,
    // frame 1 of the new state computes speed = (fT_now − stale_prevFocusT) which can be
    // many frames of racer movement, inflating leadAhead and causing _shortestTDelta to
    // return a negative value (camera moves backward briefly before correcting forward).
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd._prevFocusT = 2.38; // stale value from a previous tracking phase
    const racers = [
      { x: 800, y: 360, t: 0.5 },
      { x: 700, y: 360, t: 0.4 },
    ];
    cd._transition(racers, 10000, {
      raceElapsed: 10000,
      finishedCount: 0,
      winner: null,
      finishT: 6000,
    });
    expect(cd._prevFocusT).toBeNull();
  });

  it('observerPhase getter returns _observerPhase', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd.observerPhase).toBe('idle');
    cd._observerPhase = 'follow';
    expect(cd.observerPhase).toBe('follow');
  });

  it('camT getter returns _camT', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd.camT).toBeNull();
    cd._camT = 0.42;
    expect(cd.camT).toBeCloseTo(0.42, 5);
  });

  it('convergence gate: when zoom+T both converge, switches to lead-in with _camT at lead-ahead pos', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    // Simulate T-space lerp having already positioned _camT at focusT+leadAhead (= 0.56).
    // speed=0.001, FRAME_RATE=60, leadInDuration=1.0s → leadAhead=0.06, target=0.5+0.06=0.56
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'entry';
    cd._camT = 0.56; // already at lead-ahead position via T-space lerp
    cd._transitionTargetT = 0.56; // T-space converged
    cd._observerPhase = 'idle';
    // Force zoom convergence regardless of resolveCamera's world-edge adjustments
    cd._entryConvergenceZoom = 100;
    cd.zoom = cd.targetZoom = cd._leaderZoom;
    cd.offsetX = cd.targetOffsetX = 0;
    cd.offsetY = cd.targetOffsetY = 0;
    // One update call — zoom converged + T converged → convergence gate fires
    cd.update(
      [
        { x: 800, y: 360, t: 0.5 },
        { x: 700, y: 360, t: 0.4 },
      ],
      10100,
      { raceElapsed: 10100, finishedCount: 0, winner: null, finishT: 6000 },
      1280,
      720
    );
    // Camera is already at lead-ahead position; no jump. Convergence gate starts lead-in.
    expect(cd._lerpPhase).toBe('tracking');
    expect(cd._observerPhase).toBe('lead-in');
    expect(cd._leadInStartTs).toBe(10100);
    expect(cd._transitionTargetT).toBeNull();
    // _camT should still be near the lead-ahead position (not snapped back to focusT)
    expect(cd._camT).toBeGreaterThan(0.5);
  });

  it('T-space lerp: _camT moves along shorter track arc (0.3→0.7), stays in [0.3, 0.76]', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lerpPhase = 'entry';
    cd._camT = 0.3; // camera at left arc of oval
    cd._transitionTargetT = 0.76; // focusT=0.7 + leadAhead≈0.06
    cd._observerPhase = 'idle';
    const raceState = { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 };
    // Run 10 frames: _camT should move through [0.3, 0.76] without jumping through the
    // infield shortcut (which would go 0.3 → 0.0 → 0.7, i.e., wrapping backward)
    for (let i = 0; i < 10; i++) {
      cd.update([{ x: 2800, y: 360, t: 0.7 }], 1000 + i * 16, raceState, 1280, 720);
      expect(cd._camT).toBeGreaterThanOrEqual(0.3);
      expect(cd._camT).toBeLessThanOrEqual(0.78); // allow for lead-ahead expansion
    }
    expect(cd._camT).toBeGreaterThan(0.3); // confirmed: moved forward
  });

  it('T-space lerp: wrap-around takes shorter arc (t=0.95→t=0.05, forward not backward)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lerpPhase = 'entry';
    cd._camT = 0.95; // just before start/finish line
    cd._transitionTargetT = 1.11; // leader at t=1.05 (lap 2) + leadAhead=0.06
    cd._observerPhase = 'idle';
    // Leader just crossed start/finish into lap 2
    cd.update(
      [{ x: 1000, y: 360, t: 1.05 }],
      1000,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    // shortestTDelta(0.95, 1.11) = 0.16 → moves forward across the line
    // NOT backward (which would give delta = -0.84 and move toward 0.0)
    expect(cd._camT).toBeGreaterThan(0.95); // moved forward (toward 1.0+)
    expect(cd._camT).toBeLessThan(1.11); // didn't overshoot
  });

  it('lead-in: stays in "lead-in" phase until leadInDuration seconds elapsed', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.56;
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 10000;
    // 500ms elapsed < 1000ms leadInDuration → stays lead-in
    cd._computePhasedPanTarget([{ x: 800, y: 360, t: 0.5 }], 1280, 720, 1000 / 60, 10500);
    expect(cd._observerPhase).toBe('lead-in');
  });

  it('lead-in: transitions to "follow" after leadInDuration seconds elapsed', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 10000;
    // 1001ms elapsed > 1000ms leadInDuration → transitions to follow
    cd._computePhasedPanTarget([{ x: 800, y: 360, t: 0.5 }], 1280, 720, 1000 / 60, 11001);
    expect(cd._observerPhase).toBe('follow');
  });

  it('follow: _camT tracks focusT each frame (pin-lock)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 10500);
    expect(cd._camT).toBeCloseTo(0.51, 5);
    cd._computePhasedPanTarget([{ x: 2120, y: 360, t: 0.53 }], 1280, 720, 1000 / 60, 10517);
    expect(cd._camT).toBeCloseTo(0.53, 5);
  });

  it('follow: offsetX === targetOffsetX (no lerp lag)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 10500);
    expect(cd.offsetX).toBe(cd.targetOffsetX);
    expect(cd.offsetY).toBe(cd.targetOffsetY);
  });

  it('lead-out triggered when remainingMs <= leadOutDuration * 1000', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    // effectiveDuration = max(maxStateDuration=4000, minStateHold=5000) = 5000
    // stateEndTime = 10000 + 5000 = 15000; leadOutDuration = 1.5s = 1500ms
    // lead-out fires when ts >= 13500 (remaining <= 1500ms)
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13000);
    expect(cd._observerPhase).toBe('follow'); // remaining = 2000ms > 1500ms
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13600);
    expect(cd._observerPhase).toBe('lead-out'); // remaining = 1400ms <= 1500ms
  });

  it('lead-out: sticky — does not revert once triggered', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    // Trigger lead-out at ts=13600
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13600);
    expect(cd._observerPhase).toBe('lead-out');
    // Next frame: still lead-out (sticky)
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13617);
    expect(cd._observerPhase).toBe('lead-out');
  });

  it('no-op when _lerpPhase === "entry"', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd._camT = 0.5;
    cd._lerpPhase = 'entry';
    cd.state = CAM_STATE.LEADER_ZOOM;
    const before = cd._observerPhase;
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720);
    expect(cd._observerPhase).toBe(before);
  });

  it('OVERVIEW: _computePhasedPanTarget exits immediately (no phase change)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd._camT = 0.5;
    cd._lerpPhase = 'tracking';
    cd.state = CAM_STATE.OVERVIEW;
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720);
    expect(cd._observerPhase).toBe('idle');
  });

  it('follow: _camT wraps correctly when focusT crosses lap boundary', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.98;
    cd._observerPhase = 'follow';
    // Racer wraps from ~0.98 to 0.02 (new lap); follow pins _camT = focusT
    cd._computePhasedPanTarget([{ x: 80, y: 360, t: 0.02 }], 1280, 720, 1000 / 60, 10500);
    expect(cd._camT).toBeCloseTo(0.02, 5);
  });

  it('updateConfig() with new phase fields updates _phasedByState immediately', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadInDuration).toBe(0);
    const updated = {
      ...profileConfig,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: {
          ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
          leadInDuration: 1.5,
          leadOutDuration: 2.0,
        },
      },
    };
    cd.updateConfig(updated);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadInDuration).toBe(1.5);
    expect(cd._phasedByState[CAM_STATE.LEADER_ZOOM].leadOutDuration).toBe(2.0);
  });
});

describe('CameraDirector — Etappe 10: diagnostic fields', () => {
  it('transitionCount60f is 0 on construction', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd.transitionCount60f).toBe(0);
  });

  it('transitionCount60f is 1 after a frame where _transition() fires', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36, shape);
    // Force stateAge > max(minHold=5000, stateCap=4000) to trigger _transition()
    cd.stateEnteredAt = 0;
    const racers = [{ x: 640, y: 360, t: 0.5 }];
    cd.update(
      racers,
      10000,
      { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    expect(cd.transitionCount60f).toBe(1);
  });

  it('entryElapsedMs is 0 when tracking', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    cd._lerpPhase = 'tracking';
    expect(cd.entryElapsedMs).toBe(0);
  });

  it('entryElapsedMs computed from _entryStartTs and _lastTs', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    cd._lerpPhase = 'entry';
    cd._entryStartTs = 10000;
    cd._lastTs = 11500;
    expect(cd.entryElapsedMs).toBe(1500);
  });

  it('lastEntryDeltaZoom/X/Y are 0 when in tracking phase', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    cd._lastEntryDeltaZoom = 0.5;
    cd._lastEntryDeltaX = 50;
    cd._lastEntryDeltaY = 50;
    const racers = [{ x: 640, y: 360, t: 0.5 }];
    // ts=1000 → stateAge=1000 < minHold=5000, no transition; lerpPhase starts as 'entry'
    // but zoom and offsets should converge immediately (worldW=1280, bsX=1, zoom≈1, offsets≈0)
    cd.update(
      racers,
      1000,
      { raceElapsed: 1000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    // After update, lerpPhase may be 'tracking' if converged; else entry deltas are set
    // We test the tracking case by forcing it:
    cd._lerpPhase = 'tracking';
    cd._lastEntryDeltaZoom = 0.5;
    cd._lastEntryDeltaX = 50;
    cd._lastEntryDeltaY = 50;
    cd.update(
      racers,
      1017,
      { raceElapsed: 1017, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    expect(cd.lastEntryDeltaZoom).toBe(0);
    expect(cd.lastEntryDeltaX).toBe(0);
    expect(cd.lastEntryDeltaY).toBe(0);
  });

  it('battleDiagSnapshots is empty on construction', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd.battleDiagSnapshots).toHaveLength(0);
  });

  it('battleDiagFrozen is false on construction', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    expect(cd.battleDiagFrozen).toBe(false);
  });

  it('resetBattleDiag() clears snapshots and unfreezes', () => {
    const cd = new CameraDirector(1280, 720, false, profileConfig, 36);
    cd._battleDiagSnapshots = [{ f: 1 }];
    cd._battleDiagFrozen = true;
    cd._battleDiagFrameCount = 60;
    cd.resetBattleDiag();
    expect(cd.battleDiagSnapshots).toHaveLength(0);
    expect(cd.battleDiagFrozen).toBe(false);
    expect(cd._battleDiagFrameCount).toBe(0);
  });

  it('battle-diag snapshot is pushed on frame 1 of BATTLE_ZOOM', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
    ];
    // ts=1017 → stateAge=17ms < minHold=5000ms → no transition
    cd.update(
      racers,
      1017,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    expect(cd.battleDiagSnapshots).toHaveLength(1);
    expect(cd.battleDiagSnapshots[0].f).toBe(1);
    expect(cd.battleDiagFrozen).toBe(false);
  });

  it('battle-diag collects 5 snapshots and freezes after 60 frames', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
    ];
    for (let i = 0; i < 60; i++) {
      // ts stays < 1000+5000=6000 to avoid triggering _transition()
      cd.update(
        racers,
        1017 + i * 16,
        { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
        1280,
        720
      );
    }
    expect(cd.battleDiagFrozen).toBe(true);
    // Snapshots at frames 1, 15, 30, 45, 60
    expect(cd.battleDiagSnapshots).toHaveLength(5);
    expect(cd.battleDiagSnapshots.map((s) => s.f)).toEqual([1, 15, 30, 45, 60]);
  });

  it('battle-diag resets automatically on new BATTLE_ZOOM entry', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd._battleDiagSnapshots = [{ f: 1, phase: 'entry' }];
    cd._battleDiagFrozen = true;
    cd._battleDiagFrameCount = 60;
    // Force conditions → BATTLE_ZOOM:
    // raceElapsed=15000 > postStartHold (3000+7000=10000)
    // _lastBattleExitTs=-Infinity (default) → cooldown passed
    // 3 racers within 200px of each other → _isPulk=true → hasBattle=true
    // leaderProgress=0.5/6 ≈ 0.083 < endgameThreshold=0.85
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
      { x: 1984, y: 360, t: 0.496 }, // 16px from r0 → forms pulk
    ];
    cd._transition(racers, 15000, {
      raceElapsed: 15000,
      finishedCount: 0,
      winner: null,
      finishT: 6,
    });
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd.battleDiagSnapshots).toHaveLength(0);
    expect(cd.battleDiagFrozen).toBe(false);
    expect(cd._battleDiagFrameCount).toBe(0);
  });
});

describe('CameraDirector — Etappe 11: BATTLE_ZOOM pin-lock convergence', () => {
  // phasedConfig has BATTLE_ZOOM: leadInDuration=0.5, leadOutDuration=1.0
  // profileConfig has all leadInDuration=0, leadOutDuration=0

  it('BATTLE_ZOOM with phasedConfig: entry phase converges to tracking as zoom settles', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    cd._lerpPhase = 'entry';
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 1000;
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
    ];
    let reachedTracking = false;
    for (let i = 0; i < 300; i++) {
      // ts stays < 1000+5000=6000 to avoid forcing _transition()
      cd.update(
        racers,
        1017 + i * 16,
        { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
        1280,
        720
      );
      if (cd._lerpPhase === 'tracking') {
        reachedTracking = true;
        break;
      }
    }
    expect(reachedTracking).toBe(true);
  });

  it('BATTLE_ZOOM with high spritePct (large zoom): still converges to tracking', () => {
    // Simulate a user having dialed spritePct up to 0.25 in the dev screen.
    // Needs 3 close racers so _isPulk=true → early exit doesn't fire before convergence.
    const shape = makeShape(4000);
    const highZoomConfig = {
      ...phasedConfig,
      cameraStateProfiles: {
        ...phasedConfig.cameraStateProfiles,
        BATTLE_ZOOM: { ...phasedConfig.cameraStateProfiles.BATTLE_ZOOM, spritePct: 0.25 },
      },
    };
    const cd = new CameraDirector(1280, 720, false, highZoomConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    cd._lerpPhase = 'entry';
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 1000;
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
      { x: 1984, y: 360, t: 0.496 }, // pulk of 3 within 200px — prevents early exit
    ];
    let reachedTracking = false;
    for (let i = 0; i < 300; i++) {
      cd.update(
        racers,
        1017 + i * 16,
        { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
        1280,
        720
      );
      if (cd._lerpPhase === 'tracking') {
        reachedTracking = true;
        break;
      }
    }
    expect(reachedTracking).toBe(true);
  });

  it('_leadInStartTs is reset to ts when entry transitions to tracking', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._camT = 0.5;
    cd._lerpPhase = 'entry';
    cd._observerPhase = 'idle';
    cd._leadInStartTs = 0;
    cd._pendingLeadIn = true; // Design A: lead-in fires at convergence, not at transition
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
    ];
    let trackingTs = null;
    for (let i = 0; i < 300; i++) {
      const tsNow = 100 + i * 16;
      cd.update(
        racers,
        tsNow,
        { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
        1280,
        720
      );
      if (cd._lerpPhase === 'tracking') {
        trackingTs = tsNow;
        break;
      }
    }
    expect(trackingTs).not.toBeNull();
    expect(cd._leadInStartTs).toBe(trackingTs); // reset to tracking-start time
  });

  it('BATTLE_ZOOM transitions to follow phase after lead-in expires', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    cd._lerpPhase = 'tracking'; // already converged
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 1000; // started 1000ms ago
    const racers = [
      { x: 2000, y: 360, t: 0.5 },
      { x: 1992, y: 360, t: 0.498 },
    ];
    // leadInDuration=0.5s=500ms. At ts=2000, elapsed=1000ms >= 500ms → follow
    cd.update(
      racers,
      2000,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    expect(cd._observerPhase).toBe('follow');
  });

  it('LEADER_ZOOM regression: still converges entry → tracking', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5;
    cd._lerpPhase = 'entry';
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 1000;
    const racers = [{ x: 2000, y: 360, t: 0.5 }];
    let reachedTracking = false;
    for (let i = 0; i < 300; i++) {
      cd.update(
        racers,
        1017 + i * 16,
        { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
        1280,
        720
      );
      if (cd._lerpPhase === 'tracking') {
        reachedTracking = true;
        break;
      }
    }
    expect(reachedTracking).toBe(true);
  });

  it('_camT tracks focusT during entry (not frozen at initial lead-in position)', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 1000;
    cd._camT = 0.5; // initial position before T-space lerp runs
    cd._transitionTargetT = 0.524; // initial target (midpoint 0.524, will be updated by block)
    cd._lerpPhase = 'entry';
    cd._observerPhase = 'idle';
    const racers = [
      { x: 2100, y: 360, t: 0.525 }, // leader has moved ahead
      { x: 2092, y: 360, t: 0.523 },
    ];
    cd.update(
      racers,
      1017,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 },
      1280,
      720
    );
    // T-space lerp moves _camT toward focusT+leadAhead — not frozen at 0.5
    expect(cd._camT).toBeGreaterThan(0.5); // moved in right direction
    expect(cd._camT).toBeLessThan(0.56); // one frame: partial progress only
  });
});

// ── Etappe 13: Pulk-Bedingung für BATTLE_ZOOM ─────────────────────────────────

describe('CameraDirector — Etappe 13: Pulk-Bedingung für BATTLE_ZOOM', () => {
  const rs15 = { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 6 };

  // ── _isPulk unit tests ────────────────────────────────────────────────────

  it('_isPulk: < 3 racers → false', () => {
    const cd = new CameraDirector();
    expect(
      cd._isPulk([
        { x: 100, y: 100, t: 0.9 },
        { x: 110, y: 100, t: 0.8 },
      ])
    ).toBe(false);
    expect(cd._isPulk([{ x: 100, y: 100, t: 0.9 }])).toBe(false);
    expect(cd._isPulk([])).toBe(false);
    expect(cd._isPulk(null)).toBe(false);
  });

  it('_isPulk: 3 racers all within threshold → true', () => {
    const cd = new CameraDirector();
    // All within 50px of each other — well inside default 200px threshold
    const racers = [
      { x: 500, y: 300, t: 0.5 },
      { x: 520, y: 300, t: 0.49 },
      { x: 510, y: 300, t: 0.48 },
    ];
    expect(cd._isPulk(racers)).toBe(true);
  });

  it('_isPulk: 2 close + 1 far → false (no racer has 2+ others within threshold)', () => {
    const cd = new CameraDirector();
    const racers = [
      { x: 500, y: 300, t: 0.5 },
      { x: 510, y: 300, t: 0.49 }, // 10px from r0 — close
      { x: 900, y: 300, t: 0.48 }, // 400px from r0 — far
    ];
    // r0 has only r1 within 200px (closeCount=1 < 2). r1 same. No pulk.
    expect(cd._isPulk(racers)).toBe(false);
  });

  it('_isPulk: custom threshold via config', () => {
    // With threshold=50px: r0–r1 are 10px apart, r2 is 80px away → no pulk.
    // With threshold=100px: r2 is 80px < 100px → pulk of 3.
    const tight = new CameraDirector(1280, 720, false, { battlePulkThresholdPx: 50 });
    const wide = new CameraDirector(1280, 720, false, { battlePulkThresholdPx: 100 });
    const racers = [
      { x: 500, y: 300, t: 0.5 },
      { x: 510, y: 300, t: 0.49 },
      { x: 580, y: 300, t: 0.48 },
    ];
    expect(tight._isPulk(racers)).toBe(false);
    expect(wide._isPulk(racers)).toBe(true);
  });

  it('_isPulk: only top-10 racers considered; racer outside top-10 ignored', () => {
    const cd = new CameraDirector();
    // 10 spread-out racers + 3 very close racers ranked 11-13 → no pulk in top 10
    const top10 = Array.from({ length: 10 }, (_, i) => ({
      x: i * 300,
      y: 0,
      t: 1 - i * 0.05,
    }));
    const tail = [
      { x: 100, y: 0, t: 0.45 },
      { x: 102, y: 0, t: 0.44 },
      { x: 104, y: 0, t: 0.43 },
    ];
    expect(cd._isPulk([...top10, ...tail])).toBe(false);
  });

  // ── State machine: BATTLE entry via pulk ─────────────────────────────────

  it('BATTLE triggers via Priority 4 when pulk exists (3 racers within threshold)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired
    const pulkRacers = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 515, y: 300, t: 0.48, finished: false },
      { x: 530, y: 300, t: 0.46, finished: false },
      { x: 100, y: 300, t: 0.1, finished: false },
    ];
    cd.update(
      pulkRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE does NOT trigger when fewer than 3 racers form a cluster', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    // r0 and r1 close, r2 far — no pulk
    const racers = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 510, y: 300, t: 0.48, finished: false },
      { x: 900, y: 300, t: 0.2, finished: false },
    ];
    cd.update(
      racers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  // ── Minimum hold: BATTLE stays during battleMinDurationMs even if pulk gone ─

  it('BATTLE stays active during battleMinDurationMs even after pulk dissolves', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 3000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    // 2 racers only → pulk gone; but stateAge < 3000ms
    const noPulk = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 510, y: 300, t: 0.49, finished: false },
    ];
    // At ts=2999: stateAge=2999 < 3000 → should NOT exit
    cd.update(
      noPulk,
      2999,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE exits after battleMinDurationMs when pulk condition is not met', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 3000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = -Infinity; // overview cooldown irrelevant
    const noPulk = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 510, y: 300, t: 0.49, finished: false },
    ];
    // At ts=3001: stateAge=3001 ≥ 3000 and no pulk → should exit BATTLE
    cd.update(
      noPulk,
      3001,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('BATTLE stays if pulk still present after battleMinDurationMs', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 3000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    const pulk = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 510, y: 300, t: 0.49, finished: false },
      { x: 520, y: 300, t: 0.48, finished: false },
    ];
    // stateAge=4000 ≥ 3000 but pulk still present → should NOT exit via early check
    // (May still exit via maxStateDuration, but that's 8000ms — safe here)
    cd.update(
      pulk,
      4000,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('battleMinDurationMs from config is respected (custom 1000ms)', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 1000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    const noPulk = [
      { x: 500, y: 300, t: 0.5, finished: false },
      { x: 900, y: 300, t: 0.3, finished: false },
    ];
    // With 1000ms min hold, should exit at ts=1001 (stateAge=1001 ≥ 1000)
    cd.update(
      noPulk,
      999,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM); // not yet
    cd.update(
      noPulk,
      1001,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM); // exited
  });
});
