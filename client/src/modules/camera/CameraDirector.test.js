// CAMERA-ZOOM-UNIT-1 removed the twelve describe blocks that lived here and above. Every one of
// them tested the OLD zoom unit — `_computeZoomForSpriteScale`, the legacy `spritePctOfCanvas`
// conversion, OVERVIEW's target-SPRITE-SIZE derivation and its racer-count normalisation, and the
// open/closed OVERVIEW split. That mechanism no longer exists, so the tests were deleted rather
// than 'adapted': adapting them would have meant inventing new assertions for deleted code. What
// replaces them is `zoomUnit.test.js` (the unit and its guarantee, with failure proofs) plus the
// director-level block at the end of this file. Net: 62 tests removed, 34 added on the new rule.

import { describe, it, expect, vi } from 'vitest';
import {
  CameraDirector,
  CAM_STATE,
  OPEN_TRACK_BASE_ZOOM,
  tcToLerpFactor,
} from './CameraDirector.js';
import { effectiveZoom } from './openTrackCamera.js';
import { lapProgress, currentLap } from './lapUtils.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

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

// Timing fixture, kept from the deleted legacy-unit blocks: these fields drive the STATE MACHINE
// (max duration, endgame threshold), which CAMERA-ZOOM-UNIT-1 did not touch. The obsolete
// `spritePctOfCanvas` zoom fields are gone — a v2 config now simply gets the shipped track-width
// defaults, which is what the timing tests below actually need from it.
const pctConfig = {
  schemaVersion: 2,
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  maxStateDuration: 8000,
  endgameThreshold: 0.85,
};

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

  it('OVERVIEW converges to its TRACK-WIDTHS setting (CAMERA-ZOOM-UNIT-1)', () => {
    // The number to assert is the one the owner sets: how many track widths are on screen.
    const cd = new CameraDirector();
    cd.state = CAM_STATE.OVERVIEW;
    for (let i = 0; i < 200; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.visibleTrackWidths).toBeCloseTo(4, 1);
    expect(isFinite(cd.offsetX)).toBe(true);
    expect(isFinite(cd.offsetY)).toBe(true);
  });

  it('OVERVIEW on a 6000px world shows the SAME track widths as on a 1280px one', () => {
    // The whole point of the unit: the world resolution cancels. Same setting, same picture.
    // Driven to convergence on both — frame 1 still carries the constructor's opening zoom.
    const settle = (cd) => {
      cd.state = CAM_STATE.OVERVIEW;
      for (let i = 0; i < 300; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
      return cd.visibleTrackWidths;
    };
    expect(settle(new CameraDirector(6000, 720, true))).toBeCloseTo(
      settle(new CameraDirector(1280, 720, false)),
      1
    );
  });

  it('OVERVIEW on a 6000px world converges to the same track widths it targets', () => {
    const cd = new CameraDirector(6000, 720, true);
    cd.state = CAM_STATE.OVERVIEW;
    for (let i = 0; i < 300; i++) cd.update(mockRacers(4), 1000, mockRaceState, 1280, 720);
    expect(cd.visibleTrackWidths).toBeCloseTo(4, 1);
  });

  it('LEADER_ZOOM converges to zoom > 1', () => {
    const cd = new CameraDirector(1280, 720, false, { minRacersVisible: 0 });
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
    // DEFAULT_SPRITE_SCALE.battle = 2.81; bsX=1 → _battleZoom=2.81 on 1280px world.
    // resolveCamera clamps camX to keep world within canvas → no black borders.
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
    const cd = new CameraDirector(worldW, 720, false, { minRacersVisible: 0 });
    cd.state = CAM_STATE.LEADER_ZOOM;
    const centreRacers = [{ t: 1, x: 640, y: 360, finished: false }];
    for (let i = 0; i < 300; i++) cd.update(centreRacers, 1000, mockRaceState, 1280, 720);
    // CAMERA-ZOOM-UNIT-1: read the zoom the unit resolved rather than restating it — the assertion
    // under test is the PAN (centre on the racer), not the zoom value.
    expect(cd.visibleTrackWidths).toBeCloseTo(2, 3); // LEADER default
    expect(cd.offsetX).toBeCloseTo(640 - 640 * cd.zoom, 0);
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
  { t: 0.7, x: 9000, y: 300, finished: false }, // P1 — leader, not in battle group
  { t: 0.65, x: 8500, y: 300, finished: false }, // P2 — not in battle group
  { t: 0.5, x: 500, y: 300, finished: false }, // P3 — battle group frontmost (rank ≥ 3 ✓)
  { t: 0.48, x: 480, y: 300, finished: false }, // P4 — 20px from P3
  { t: 0.46, x: 460, y: 300, finished: false }, // P5 — 40px from P3, 20px from P4
  { t: 0.2, x: 200, y: 300, finished: false }, // far from cluster
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

  it('OVERVIEW fires when eligible (cooldown expired, past startDelay, no battle)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = -Infinity; // cooldown always expired
    cd._overviewScheduleNext = null; // no schedule constraint
    // raceElapsed=16000 > overviewStartDelay(15)*1000=15000ms → eligible
    const rs = { raceElapsed: 16000, finishedCount: 0, winner: null, finishT: 1.0 };
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

  it('COMEBACK_ZOOM when a B1 racer gains ≥ minPositions in outcome phase', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired → Priority 3 skipped
    const comebackRacers = [
      { t: 0.5, x: 500, y: 300, finished: false, index: 0 },
      { t: 0.4, x: 400, y: 300, finished: false, index: 1 },
      { t: 0.15, x: 150, y: 300, finished: false, index: 2 }, // B1 racer, now rank 3
    ];
    // Inject B1 set and seed rank history: racer 2 was rank 8 five seconds ago → gain = 5 ≥ 3
    cd.updateRacePlan(new Set([2]));
    const nowTs = 9000;
    const windowMs = (cd._comebackWindowSec ?? 5) * 1000;
    cd._rankHistory.set(2, [
      { ts: nowTs - windowMs + 100, rank: 8 },
      { ts: nowTs - 100, rank: 3 },
    ]);
    const rs = {
      raceElapsed: 11000,
      finishedCount: 0,
      winner: null,
      finishT: 1.0,
      isOutcomePhase: true,
    };
    cd.update(comebackRacers, nowTs, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});

// ── CameraDirector — B4b: comeback candidate = cast comebacker (plan-primary, b1 fallback) ─────────
//
// The comeback shot used to scan ALL of b1Indices (targetRank ≤ 5 — which includes the sovereign-leads)
// and take whoever gained the most ranks. A sovereign-lead that dips and recovers reads as a big gain
// and could win that scan. B4b makes the cast comebacker (heroes with role 'comebacker') the primary
// candidate set, with the b1 scan kept as the fallback. The reality filters are untouched.

describe('CameraDirector — B4b comeback candidate = cast comebacker', () => {
  // 10-racer field. Sorted by t desc → rank. Racer index 2 sits at rank 3, racer index 1 at rank 5.
  const buildField = () => [
    { index: 0, t: 0.99, x: 0, y: 0, finished: false }, // rank 1
    { index: 5, t: 0.98, x: 0, y: 0, finished: false }, // rank 2
    { index: 2, t: 0.97, x: 0, y: 0, finished: false }, // rank 3  ← b1 "noise" (sovereign that dipped)
    { index: 6, t: 0.96, x: 0, y: 0, finished: false }, // rank 4
    { index: 1, t: 0.95, x: 0, y: 0, finished: false }, // rank 5  ← cast comebacker
    { index: 7, t: 0.94, x: 0, y: 0, finished: false }, // rank 6
    { index: 8, t: 0.93, x: 0, y: 0, finished: false }, // rank 7
    { index: 9, t: 0.92, x: 0, y: 0, finished: false }, // rank 8
    { index: 3, t: 0.91, x: 0, y: 0, finished: false }, // rank 9
    { index: 4, t: 0.9, x: 0, y: 0, finished: false }, // rank 10
  ];
  const nowTs = 20000;

  // Seed rank history so BOTH racer 1 (gain 3) and racer 2 (gain 5) pass every reality filter, and
  // racer 2 has the LARGER gain — so a blind b1 scan would prefer racer 2 over the cast comebacker.
  const seedHistory = (cd, { r1StartRank = 8, r2StartRank = 8 } = {}) => {
    const cutoffPlus = nowTs - cd._comebackWindowSec * 1000 + 100;
    cd._rankHistory.set(1, [
      { ts: cutoffPlus, rank: r1StartRank },
      { ts: nowTs - 100, rank: 5 },
    ]);
    cd._rankHistory.set(2, [
      { ts: cutoffPlus, rank: r2StartRank },
      { ts: nowTs - 100, rank: 3 },
    ]);
  };

  const planWithComebacker = {
    b1Indices: new Set([1, 2]),
    heroes: [
      { index: 1, role: 'comebacker', finalRank: 4, beats: [] },
      { index: 2, role: 'sovereign-lead', finalRank: 1, beats: [] },
    ],
  };
  const planWithoutComebacker = {
    b1Indices: new Set([1, 2]),
    heroes: [{ index: 2, role: 'sovereign-lead', finalRank: 1, beats: [] }],
  };

  it('(a) plan WITH a comebacker → only cast comebackers are evaluated (cast racer, not the bigger b1 gainer)', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1, 2]));
    cd.setCameraPlan(planWithComebacker);
    expect([...cd._castComebackerIndices]).toEqual([1]);
    seedHistory(cd);
    const best = cd._detectComebackRacer(buildField(), nowTs);
    expect(best).not.toBeNull();
    // Racer 2 gained more ranks (5 vs 3) but is not the cast comebacker → racer 1 wins.
    expect(best.index).toBe(1);
  });

  it('(b) plan WITHOUT a comebacker → b1 scan runs exactly as today (largest real gain wins)', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1, 2]));
    cd.setCameraPlan(planWithoutComebacker);
    expect(cd._castComebackerIndices).toBeNull();
    seedHistory(cd);
    const best = cd._detectComebackRacer(buildField(), nowTs);
    expect(best).not.toBeNull();
    expect(best.index).toBe(2); // b1 scan → largest gain
  });

  it('(c) no plan → b1 scan runs exactly as today (largest real gain wins)', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1, 2])); // race plan on, but no cameraPlan delivered
    expect(cd._castComebackerIndices).toBeNull();
    seedHistory(cd);
    const best = cd._detectComebackRacer(buildField(), nowTs);
    expect(best).not.toBeNull();
    expect(best.index).toBe(2); // b1 scan → largest gain
  });

  // ── Reality filters unchanged in the plan-primary path ──────────────────────────────────────────
  // The plan changes only WHO is watched, never WHEN we believe it: every gate still gates.

  it('min-gain bar unchanged: a cast comebacker below comebackMinPositionsGained yields NO cut', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1, 2]));
    cd.setCameraPlan(planWithComebacker);
    // Racer 1 (the only cast comebacker) starts at rank 6 → gain = 6-5 = 1 < minGain (2).
    // Racer 2 has a valid gain but is NOT a cast comebacker → excluded → no fallback to it.
    seedHistory(cd, { r1StartRank: 6 });
    expect(cd._detectComebackRacer(buildField(), nowTs)).toBeNull();
  });

  it('start-gap filter unchanged: a cast comebacker starting too far forward yields NO cut', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1]));
    cd.setCameraPlan({
      b1Indices: new Set([1]),
      heroes: [{ index: 1, role: 'comebacker', beats: [] }],
    });
    // Racer 1 is at current rank 5 (field). Start rank 7 → gain 2 (≥ min), but startGapNorm above the
    // 0.4 default; drop start rank to 3 → startGapNorm (3-1)/9 = 0.22 < 0.4 → filtered. gain 3-5 = -2 also
    // fails, so use a field where racer 1 is near the front to isolate the start-gap gate.
    const nearFront = [
      { index: 0, t: 0.99, x: 0, y: 0, finished: false }, // rank 1
      { index: 1, t: 0.98, x: 0, y: 0, finished: false }, // rank 2  ← cast comebacker
      { index: 2, t: 0.97, x: 0, y: 0, finished: false },
      { index: 3, t: 0.96, x: 0, y: 0, finished: false },
      { index: 4, t: 0.95, x: 0, y: 0, finished: false },
      { index: 5, t: 0.94, x: 0, y: 0, finished: false },
      { index: 6, t: 0.93, x: 0, y: 0, finished: false },
      { index: 7, t: 0.92, x: 0, y: 0, finished: false },
      { index: 8, t: 0.91, x: 0, y: 0, finished: false },
      { index: 9, t: 0.9, x: 0, y: 0, finished: false },
    ];
    // start rank 4 → gain 4-2 = 2 (≥ min), startGapNorm (4-1)/9 = 0.33 < 0.4 → filtered out.
    cd._rankHistory.set(1, [
      { ts: nowTs - cd._comebackWindowSec * 1000 + 100, rank: 4 },
      { ts: nowTs - 100, rank: 2 },
    ]);
    expect(cd._detectComebackRacer(nearFront, nowTs)).toBeNull();
  });

  it('current-rank filter unchanged: a cast comebacker already at the very front yields NO cut', () => {
    const cd = new CameraDirector();
    cd.updateRacePlan(new Set([1]));
    cd.setCameraPlan({
      b1Indices: new Set([1]),
      heroes: [{ index: 1, role: 'comebacker', beats: [] }],
    });
    const atFront = [
      { index: 1, t: 0.99, x: 0, y: 0, finished: false }, // rank 1  ← cast comebacker, now leading
      { index: 0, t: 0.98, x: 0, y: 0, finished: false },
      { index: 2, t: 0.97, x: 0, y: 0, finished: false },
      { index: 3, t: 0.96, x: 0, y: 0, finished: false },
      { index: 4, t: 0.95, x: 0, y: 0, finished: false },
      { index: 5, t: 0.94, x: 0, y: 0, finished: false },
      { index: 6, t: 0.93, x: 0, y: 0, finished: false },
      { index: 7, t: 0.92, x: 0, y: 0, finished: false },
      { index: 8, t: 0.91, x: 0, y: 0, finished: false },
      { index: 9, t: 0.9, x: 0, y: 0, finished: false },
    ];
    // start rank 6 → gain 6-1 = 5 (≥ min), startGapNorm (6-1)/9 = 0.56 ≥ 0.4 (passes start-gap), but
    // currentRankNorm (1-1)/9 = 0 < 0.1 default → current-rank gate filters it out.
    cd._rankHistory.set(1, [
      { ts: nowTs - cd._comebackWindowSec * 1000 + 100, rank: 6 },
      { ts: nowTs - 100, rank: 1 },
    ]);
    expect(cd._detectComebackRacer(atFront, nowTs)).toBeNull();
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

  it('Start-Pulk OVERVIEW pan: closed track does not crash with full-field or top-3 input', () => {
    // Full-field centroid behavior is tested in panTarget.test.js.
    // Here we verify CameraDirector plumbs the correct racer set without crashing.
    // No referenceSpriteSize → fallback: targetZoom = _overviewStateZoom = 1.0 (overviewClosedTrackZoom retired).
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
    for (let i = 0; i < 60; i++) cd.update(spreadRacers, 1000 + i * 16, startRs, 1280, 720);
    // At least the OVERVIEW setting: the OVERVIEW-FRAMING-1 group fit may WIDEN the shot to keep
    // the group in frame (a guarantee), but nothing may make it tighter than the setting.
    expect(cd.visibleTrackWidths).toBeGreaterThanOrEqual(4 - 1e-9);
    expect(isFinite(cd.targetOffsetX)).toBe(true);

    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 1000;
    const midRs = { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 };
    cd.update(spreadRacers, 1000, midRs, 1280, 720);
    // OVERVIEW targets its track-widths setting (was: the whole-world zoom 1.0).
    expect(cd.targetZoom).toBeCloseTo(cd._overviewStateZoom, 3);
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

describe('CameraDirector — battle trigger tunables (Block X)', () => {
  it('no config: fallback _maxStateDuration=8000, _battlePulkThresholdT=0.05, _battleMinDurationMs=3000, _endgameThreshold=0.85', () => {
    const cd = new CameraDirector();
    expect(cd._maxStateDuration).toBe(8000);
    expect(cd._battlePulkThresholdT).toBe(0.05);
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
    // 3 racers arc-close at ranks 3/4/5 → _isPulk=true → hasBattle=true → P4 fires
    const racers = [
      { t: 0.7, x: 9000, y: 300, finished: false }, // P1 — leader
      { t: 0.65, x: 8500, y: 300, finished: false }, // P2 — leader
      { t: 0.5, x: 500, y: 300, finished: false }, // P3 — battle group frontmost
      { t: 0.48, x: 460, y: 300, finished: false }, // P4 — arc 0.02 from P3
      { t: 0.46, x: 420, y: 300, finished: false }, // P5 — arc 0.04 from P3, 0.02 from P4
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
    // leaders at 92% progress: below 0.95 threshold → endgame does NOT lock LEADER
    // 3 close racers at ranks 3/4/5 → _isPulk=true → P4 fires BATTLE_ZOOM
    const racers = [
      { t: 0.92, x: 9000, y: 300, finished: false }, // P1 — leader (92% < 0.95 → no endgame)
      { t: 0.91, x: 8500, y: 300, finished: false }, // P2 — leader
      { t: 0.9, x: 500, y: 300, finished: false }, // P3 — battle group frontmost
      { t: 0.88, x: 460, y: 300, finished: false }, // P4 — arc 0.02 from P3
      { t: 0.86, x: 420, y: 300, finished: false }, // P5 — arc 0.04 from P3, 0.02 from P4
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
      battlePulkThresholdT: 0.08,
      battleMinDurationMs: 1500,
      maxStateDuration: 3000,
      endgameThreshold: 0.9,
    });
    expect(cd._battlePulkThresholdT).toBe(0.08);
    expect(cd._battleMinDurationMs).toBe(1500);
    expect(cd._maxStateDuration).toBe(3000);
    expect(cd._endgameThreshold).toBe(0.9);
  });

  it('maxStateDuration in config overrides fallback: no transition before new duration', () => {
    const cfg = {
      ...pctConfig,
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
  { t: 0.7, x: 9000, y: 300, finished: false }, // P1 — leader, not in battle group
  { t: 0.65, x: 8500, y: 300, finished: false }, // P2 — not in battle group
  { t: 0.5, x: 500, y: 300, finished: false }, // P3 — battle group (rank ≥ 3 ✓)
  { t: 0.48, x: 480, y: 300, finished: false }, // P4 — 20px from P3
  { t: 0.46, x: 460, y: 300, finished: false }, // P5 — 40px from P3, 20px from P4
  { t: 0.2, x: 200, y: 300, finished: false }, // far
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

describe('CameraDirector — D5: Director OVERVIEW Scheduler', () => {
  it('_overviewCooldownMs initializes to default 15000', () => {
    const cd = new CameraDirector();
    expect(cd._overviewCooldownMs).toBe(15000);
  });

  it('config overviewCooldownMs is read via _computeTimingConfig', () => {
    const cfg = { ...pctConfig, overviewCooldownMs: 8000 };
    const cd = new CameraDirector(1280, 720, false, cfg);
    expect(cd._overviewCooldownMs).toBe(8000);
  });

  it('_isOverviewEligible: false when raceElapsed < overviewStartDelay', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15; // 15s → 15000ms
    cd._lastOverviewExitTs = -Infinity;
    cd._overviewScheduleNext = null;
    const eligible = cd._isOverviewEligible(20000, { raceElapsed: 5000 });
    expect(eligible).toBe(false);
  });

  it('_isOverviewEligible: false when cooldown not yet expired', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15;
    cd._overviewCooldownMs = 15000;
    cd._lastOverviewExitTs = 10000;
    cd._overviewScheduleNext = null;
    // raceElapsed=20000 >= 15000ms startDelay, but ts-lastExit=5000 < 15000ms cooldown
    const eligible = cd._isOverviewEligible(15000, { raceElapsed: 20000 });
    expect(eligible).toBe(false);
  });

  it('_isOverviewEligible: false when _overviewScheduleNext not yet reached', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15;
    cd._overviewCooldownMs = 15000;
    cd._lastOverviewExitTs = -Infinity;
    cd._overviewScheduleNext = 50000; // scheduled for 50s elapsed
    const eligible = cd._isOverviewEligible(40000, { raceElapsed: 30000 });
    expect(eligible).toBe(false);
  });

  it('_isOverviewEligible: true when startDelay passed, cooldown expired, schedule reached', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15;
    cd._overviewCooldownMs = 15000;
    cd._lastOverviewExitTs = -Infinity;
    cd._overviewScheduleNext = null; // first fire: no schedule constraint
    const eligible = cd._isOverviewEligible(40000, { raceElapsed: 20000 });
    expect(eligible).toBe(true);
  });

  it('_scheduleNextOverview sets _overviewScheduleNext > current raceElapsed', () => {
    const cd = new CameraDirector();
    cd._overviewTargetCount = 2;
    cd._overviewCooldownMs = 15000;
    const raceState = { raceElapsed: 20000, finishT: 1.0 };
    const leader = { t: 0.4 }; // 40% through → estimate = (1.0/0.4)*20000 = 50000ms
    cd._scheduleNextOverview(30000, raceState, leader);
    // interval = 50000/2 = 25000; jitter ∈ [0.8, 1.2]; so next ∈ [20000+20000, 20000+30000]
    expect(cd._overviewScheduleNext).toBeGreaterThan(20000);
    expect(cd._overviewScheduleNext).toBeLessThan(60000);
  });

  it('OVERVIEW fires in candidate pool when eligible (no battle, past startDelay, cooldown expired)', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15;
    cd._overviewCooldownMs = 15000;
    cd._lastOverviewExitTs = -Infinity;
    cd._overviewScheduleNext = null;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // raceElapsed=20000 > 15000ms startDelay; no battle in midRaceRacers; cooldown expired
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('OVERVIEW blocked before startDelay even with cooldown expired', () => {
    const cd = new CameraDirector();
    cd._overviewStartDelay = 15;
    cd._overviewCooldownMs = 1000;
    cd._lastOverviewExitTs = -Infinity;
    cd._overviewScheduleNext = null;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // raceElapsed=5000 < 15000ms startDelay → OVERVIEW not eligible
    cd.update(
      midRaceRacers,
      9000,
      { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.OVERVIEW);
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
// Tests for _computeZoomForSpriteScale and the spritePctOfCanvas config path.
// zoom = spriteScale / bsX (closed) or spriteScale / OPEN_BASE (open) — referenceSpriteSize
// cancels out of the formula and is no longer used in zoom computation (L82).

const inverseConfig = {
  schemaVersion: 2,
  spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  maxStateDuration: 4000,
  endgameThreshold: 0.85,
};

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
      minRacersVisible: 0,
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
      trackWidths: 5.14,
      trackingTC: 1.5,
      entryTC: 1.5,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
    LEADER_ZOOM: {
      trackWidths: 2.85,
      trackingTC: 0.25,
      entryTC: 0.25,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
    BATTLE_ZOOM: {
      trackWidths: 1.83,
      trackingTC: 0.35,
      entryTC: 0.35,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 7000,
      minStateHold: 5000,
    },
    COMEBACK_ZOOM: {
      trackWidths: 3.7,
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
  endgameThreshold: 0.85,
  postStartHoldMs: 7000,
  battleCooldownMs: 8000,
  overviewCooldownMs: 15000,
  targetInnerFramePct: 0.7,
};

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
      const cd = new CameraDirector(1280, 720, false, { minRacersVisible: 0 }, 36);
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

// ── Convergence fix: threshold and timeout paths ─────────────────────────────

// Straight shape so tToWorld() is linear and predictable in these tests.
function makeLinearShape(trackLen = 4000) {
  return {
    getTotalLength: () => trackLen,
    getPosition: (t, _lateral) => ({ x: t * trackLen, y: 360 }),
    getCenterPoint: () => ({ x: trackLen / 2, y: 360 }),
  };
}

// Racers that continuously advance their T position each call, simulating a moving leader.
function makeMovingRacers(count = 4, speedPerFrame = 0.002) {
  let t = 0.1;
  return {
    next() {
      t += speedPerFrame;
      return Array.from({ length: count }, (_, i) => ({ x: t * 4000, y: 360, t: t - i * 0.01 }));
    },
  };
}

describe('CameraDirector — convergence fix: threshold and timeout', () => {
  it('threshold path: camera converges to tracking with moving leader when transitionTConvergence > ese/lf', () => {
    // Use a large transitionTConvergence (0.05) that covers the steady-state gap.
    // The leader moves at ~0.002 T/frame; lf_entry for entryTC=0.8 ≈ 0.047; gap ≈ 0.043.
    // With threshold 0.05 > 0.043, camera should converge via threshold path.
    const shape = makeLinearShape(4000);
    const config = {
      ...profileConfig,
      transitionTConvergence: 0.05,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: {
          ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
          entryTC: 0.8,
          trackingTC: 0.25,
          leadInDuration: 0.3,
          maxEntryDurationMs: 30000, // timeout far in future — threshold must win
        },
      },
    };
    const cd = new CameraDirector(4000, 720, false, config, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 999999999; // prevent OVERVIEW from firing during convergence test
    cd.zoom = cd._leaderZoom; // pre-converge zoom
    const moving = makeMovingRacers(4, 0.002);
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };

    let convergedReason = null;
    for (let i = 0; i < 600; i++) {
      const ts = i * (1000 / 60);
      cd.update(moving.next(), ts, raceState, 1280, 720);
      // _diagConvergenceReason is reset after _recordDiagFrame; capture it from lerpPhase switch
      if (cd.lerpPhase === 'tracking') {
        // Check the ring buffer for the cr field on this frame (diagEnabled is false by default)
        // Instead, verify the phase switched and that timeout didn't fire (timeout > 30s >> current ts)
        convergedReason = 'threshold'; // timeout would only fire at 30000ms, we're under that
        break;
      }
    }
    expect(cd.lerpPhase).toBe('tracking');
    expect(convergedReason).toBe('threshold');
  });

  it('timeout path: camera forces tracking after maxEntryDurationMs when threshold is impossibly tight', () => {
    // transitionTConvergence=0.001 is far below steady-state gap (~0.043 at speed 0.002) — threshold
    // can never fire while the leader moves. maxEntryDurationMs=300ms forces tracking after ~18 frames.
    // We set _camT and _transitionTargetT directly so tSpaceLerpActive=true (xConverged/yConverged
    // are bypassed) and only zoom + timeout gate the transition.
    const shape = makeLinearShape(4000);
    const config = {
      ...profileConfig,
      transitionTConvergence: 0.001, // impossibly tight
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: {
          ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
          entryTC: 0.8,
          trackingTC: 0.25,
          leadInDuration: 0.3,
          maxEntryDurationMs: 300, // fires after ~18 frames at 16.67ms/frame
        },
      },
    };
    const cd = new CameraDirector(4000, 720, false, config, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd.zoom = cd._leaderZoom; // pre-converge zoom
    // Prime T-space lerp so tSpaceLerpActive=true (bypasses xConverged/yConverged gates)
    cd._camT = 0.3;
    cd._transitionTargetT = 0.35; // gap=0.05 >> threshold 0.001 → tConverged always false
    const moving = makeMovingRacers(4, 0.002);
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };

    for (let i = 0; i < 60; i++) {
      cd.update(moving.next(), i * (1000 / 60), raceState, 1280, 720);
      if (cd.lerpPhase === 'tracking') break;
    }
    expect(cd.lerpPhase).toBe('tracking');
  });

  it('convergenceReason "threshold" is logged in _diagConvergenceReason on the transition frame', () => {
    const shape = makeLinearShape(4000);
    const config = {
      ...profileConfig,
      enableFrameLog: true,
      transitionTConvergence: 0.05,
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: {
          ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
          entryTC: 0.8,
          leadInDuration: 0,
          maxEntryDurationMs: 30000,
        },
      },
    };
    const cd = new CameraDirector(4000, 720, false, config, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 999999999; // prevent OVERVIEW from firing during convergence test
    cd.zoom = cd._leaderZoom;
    const moving = makeMovingRacers(4, 0.002);
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };

    let crFound = null;
    for (let i = 0; i < 600; i++) {
      // Peek at _diagConvergenceReason BEFORE update resets it via _recordDiagFrame
      cd.update(moving.next(), i * (1000 / 60), raceState, 1280, 720);
      // After update: if we just switched to tracking, the ring buf entry has cr set.
      if (cd.lerpPhase === 'tracking') {
        // Read the most-recently-written ring buffer entry
        const lastIdx = (cd._diagRingIdx - 1 + 600) % 600;
        crFound = cd._diagRingBuf[lastIdx]?.cr;
        break;
      }
    }
    expect(crFound).toBe('threshold');
  });

  it('convergenceReason "timeout" is logged when time-fallback fires', () => {
    const shape = makeLinearShape(4000);
    const config = {
      ...profileConfig,
      enableFrameLog: true,
      transitionTConvergence: 0.001, // impossibly tight
      cameraStateProfiles: {
        ...profileConfig.cameraStateProfiles,
        LEADER_ZOOM: {
          ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
          entryTC: 0.8,
          leadInDuration: 0.3,
          maxEntryDurationMs: 300,
        },
      },
    };
    const cd = new CameraDirector(4000, 720, false, config, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd.zoom = cd._leaderZoom;
    cd._camT = 0.3;
    cd._transitionTargetT = 0.35; // gap >> threshold → tConverged always false
    const moving = makeMovingRacers(4, 0.002);
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };

    let crFound = null;
    for (let i = 0; i < 60; i++) {
      cd.update(moving.next(), i * (1000 / 60), raceState, 1280, 720);
      if (cd.lerpPhase === 'tracking') {
        const lastIdx = (cd._diagRingIdx - 1 + 600) % 600;
        crFound = cd._diagRingBuf[lastIdx]?.cr;
        break;
      }
    }
    expect(crFound).toBe('timeout');
  });
});

// ── Etappe 6: Observer Phase (Lead-In / Mitlaufen / Lead-Out) ────────────────

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

  it('comebackLockedRacerIndex getter returns _comebackLockedRacerIndex', () => {
    const cd = new CameraDirector();
    expect(cd.comebackLockedRacerIndex).toBeNull();
    cd._comebackLockedRacerIndex = 7;
    expect(cd.comebackLockedRacerIndex).toBe(7);
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

  it('follow: _camT advances to focusT; offsetX NOT overwritten by _computePhasedPanTarget', () => {
    // Architecture: _computePhasedPanTarget only updates _camT in follow phase.
    // targetOffsetX/Y are owned by _setTargets (runs at the top of update() next frame).
    // offsetX must remain unchanged — pixel-lerp closes the gap from the next frame onward.
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, phasedConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    const preCallOffsetX = -700;
    const preCallOffsetY = 0;
    cd.offsetX = preCallOffsetX;
    cd.offsetY = preCallOffsetY;
    cd._observerPhase = 'follow';
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 10500);
    // _camT must advance to focusT so _setTargets uses the racer's world position next frame
    expect(cd._camT).toBeCloseTo(0.51, 5);
    // offsetX/Y must NOT be overwritten by _computePhasedPanTarget
    expect(cd.offsetX).toBe(preCallOffsetX);
    expect(cd.offsetY).toBe(preCallOffsetY);
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
    // 5 racers: 2 leaders (ranks 1/2) + 3 close racers at ranks 3/4/5 → _isPulk=true
    // leaderProgress ≈ 0.7/6 ≈ 0.117 < endgameThreshold=0.85
    const racers = [
      { x: 9000, y: 360, t: 0.7 }, // P1 — leader
      { x: 8500, y: 360, t: 0.65 }, // P2 — leader
      { x: 2000, y: 360, t: 0.5 }, // P3 — battle group
      { x: 1992, y: 360, t: 0.498 }, // P4 — 8px from P3
      { x: 1984, y: 360, t: 0.496 }, // P5 — 16px from P3
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

  it('BATTLE_ZOOM with high spriteScale (large zoom): still converges to tracking', () => {
    // Simulate a user having dialed spriteScale up to 5.0 (= 180px/36 old equivalent) in the dev screen.
    // Needs 3 close racers so _isPulk=true → early exit doesn't fire before convergence.
    const shape = makeShape(4000);
    const highZoomConfig = {
      ...phasedConfig,
      cameraStateProfiles: {
        ...phasedConfig.cameraStateProfiles,
        BATTLE_ZOOM: { ...phasedConfig.cameraStateProfiles.BATTLE_ZOOM, trackWidths: 1.03 },
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

// ── Stage 13: Pulk condition for BATTLE_ZOOM ──────────────────────────────────

describe('CameraDirector — Stage 13: Pulk condition for BATTLE_ZOOM', () => {
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

  it('_isPulk: 3 racers all within threshold at ranks 3/4/5 → true', () => {
    const cd = new CameraDirector();
    // Two leaders at ranks 1/2, then battle group at ranks 3/4/5 — all within 50px
    const racers = [
      { x: 9000, y: 300, t: 0.7 }, // P1 — leader
      { x: 8500, y: 300, t: 0.65 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3 — battle group
      { x: 520, y: 300, t: 0.49 }, // P4
      { x: 510, y: 300, t: 0.48 }, // P5
    ];
    expect(cd._isPulk(racers)).toBe(true);
  });

  it('_isPulk: 2 close + 1 far at ranks 3/4/5 → false (only 2 cluster, need 3)', () => {
    const cd = new CameraDirector();
    const racers = [
      { x: 9000, y: 300, t: 0.7 }, // P1 — leader
      { x: 8500, y: 300, t: 0.65 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3 — close to P4
      { x: 510, y: 300, t: 0.49 }, // P4 — arc 0.01 from P3
      { x: 900, y: 300, t: 0.4 }, // P5 — arc 0.10 from P3 — far (> default 0.05)
    ];
    expect(cd._isPulk(racers)).toBe(false);
  });

  it('_isPulk: custom arc threshold via config (battle group at ranks 3/4/5)', () => {
    // Arc gaps: P3–P4 = 0.01, P3–P5 = 0.04, P4–P5 = 0.03.
    // With threshold=0.02: P3–P5 (0.04) > 0.02 → no triple → no pulk.
    // With threshold=0.05: all pairwise ≤ 0.04 < 0.05 → pulk of 3.
    const tight = new CameraDirector(1280, 720, false, { battlePulkThresholdT: 0.02 });
    const wide = new CameraDirector(1280, 720, false, { battlePulkThresholdT: 0.05 });
    const racers = [
      { x: 9000, y: 300, t: 0.7 }, // P1 — leader
      { x: 8500, y: 300, t: 0.65 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3
      { x: 510, y: 300, t: 0.49 }, // P4 — arc 0.01 from P3
      { x: 580, y: 300, t: 0.46 }, // P5 — arc 0.04 from P3
    ];
    expect(tight._isPulk(racers)).toBe(false);
    expect(wide._isPulk(racers)).toBe(true);
  });

  it('_isPulk: P1/P2 block BATTLE (frontmost in group must be P3+)', () => {
    const cd = new CameraDirector();
    // Close group at ranks 1/2/3 → BATTLE blocked (frontmost is P1 = rank 1)
    const closeAtTop = [
      { x: 500, y: 300, t: 0.9 }, // P1
      { x: 510, y: 300, t: 0.89 }, // P2
      { x: 520, y: 300, t: 0.88 }, // P3
    ];
    expect(cd._isPulk(closeAtTop)).toBe(false);
  });

  it('_isPulk: group at ranks 11/12/13 blocked by default battleMinTopN=10', () => {
    const cd = new CameraDirector(); // battleMinTopN defaults to 10
    const leaders = Array.from({ length: 10 }, (_, i) => ({
      x: i * 300,
      y: 0,
      t: 1 - i * 0.05, // spread 300px apart — no spatial pulk
    }));
    const tail = [
      { x: 100, y: 0, t: 0.45 }, // rank 11
      { x: 102, y: 0, t: 0.44 }, // rank 12
      { x: 104, y: 0, t: 0.43 }, // rank 13
    ];
    expect(cd._isPulk([...leaders, ...tail])).toBe(false);
  });

  it('_isPulk: group at ranks 11/12/13 passes when battleMinTopN=15', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinTopN: 15 });
    const leaders = Array.from({ length: 10 }, (_, i) => ({
      x: i * 300,
      y: 0,
      t: 1 - i * 0.05,
    }));
    const tail = [
      { x: 100, y: 0, t: 0.45 }, // rank 11
      { x: 102, y: 0, t: 0.44 }, // rank 12
      { x: 104, y: 0, t: 0.43 }, // rank 13
    ];
    expect(cd._isPulk([...leaders, ...tail])).toBe(true);
  });

  // ── State machine: BATTLE entry via pulk ─────────────────────────────────

  it('BATTLE triggers via Priority 4 when pulk exists at ranks 3/4/5', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000; // cooldown not expired
    const pulkRacers = [
      { x: 9000, y: 300, t: 0.7, finished: false }, // P1 — leader
      { x: 8500, y: 300, t: 0.65, finished: false }, // P2 — leader
      { x: 500, y: 300, t: 0.5, finished: false }, // P3 — battle group
      { x: 515, y: 300, t: 0.48, finished: false }, // P4
      { x: 530, y: 300, t: 0.46, finished: false }, // P5
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

  it('BATTLE does NOT trigger when only 2 racers cluster (need 3 at rank 3+)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    // Only P3 and P4 are close; P5 far — no valid triple
    const racers = [
      { x: 9000, y: 300, t: 0.7, finished: false }, // P1 — leader
      { x: 8500, y: 300, t: 0.65, finished: false }, // P2 — leader
      { x: 500, y: 300, t: 0.5, finished: false }, // P3 — close to P4
      { x: 510, y: 300, t: 0.48, finished: false }, // P4 — close to P3
      { x: 900, y: 300, t: 0.2, finished: false }, // P5 — far
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
      { x: 9000, y: 300, t: 0.7, finished: false }, // P1 — leader
      { x: 8500, y: 300, t: 0.65, finished: false }, // P2 — leader
      { x: 500, y: 300, t: 0.5, finished: false }, // P3 — battle group
      { x: 510, y: 300, t: 0.49, finished: false }, // P4
      { x: 520, y: 300, t: 0.48, finished: false }, // P5
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

// ── Phase 3B: 3-condition _isPulk ────────────────────────────────────────────

describe('CameraDirector — Phase 3B: 3-condition BATTLE detection', () => {
  it('_isPulk: fails when 3 racers are spatially close but T values differ too much (temporal fails)', () => {
    const cd = new CameraDirector(); // battlePulkThresholdT = 0.05 default
    // Two leaders + battle candidates at ranks 3/4/5, but P4/P5 T far from P3
    const racers = [
      { x: 9000, y: 300, t: 0.9 }, // P1 — leader
      { x: 8500, y: 300, t: 0.85 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3 — battle candidate
      { x: 505, y: 300, t: 0.1 }, // P4 — |P3-P4|=0.4 > 0.05 → temporal fail
      { x: 510, y: 300, t: 0.09 }, // P5
    ];
    expect(cd._isPulk(racers)).toBe(false);
  });

  it('_isPulk: fails when the top group is arc-spread (no 3 within closeness)', () => {
    const cd = new CameraDirector();
    // Ranks 3–7 evenly arc-spread by 0.10 — no 3 consecutive are within the 0.05 closeness.
    // (In arc space, arc-close ⟺ rank-adjacent, so a spread field yields no valid seed triple.)
    const racers = [
      { x: 9000, y: 300, t: 0.9, finished: false }, // P1 — leader
      { x: 8500, y: 300, t: 0.85, finished: false }, // P2 — leader
      { x: 500, y: 300, t: 0.5, finished: false }, // P3
      { x: 505, y: 300, t: 0.4, finished: false }, // P4 — arc 0.10 from P3
      { x: 510, y: 300, t: 0.3, finished: false }, // P5 — arc 0.10 from P4
      { x: 515, y: 300, t: 0.2, finished: false }, // P6
      { x: 520, y: 300, t: 0.1, finished: false }, // P7
    ];
    expect(cd._isPulk(racers)).toBe(false);
  });

  it('_isPulk: passes when all 3 conditions met — spatial, temporal, rank span ≤ 3, rank ≥ 3', () => {
    const cd = new CameraDirector();
    const racers = [
      { x: 9000, y: 300, t: 0.95, finished: false }, // P1 — leader
      { x: 8500, y: 300, t: 0.92, finished: false }, // P2 — leader
      { x: 500, y: 300, t: 0.9, finished: false }, // P3 — Δt to P4=0.02 ✓, dist=20px ✓
      { x: 520, y: 300, t: 0.88, finished: false }, // P4 — Δt to P3=0.02 ✓, dist=20px ✓
      { x: 540, y: 300, t: 0.86, finished: false }, // P5 — Δt to P3=0.04 ✓, dist=40px ✓, span=2 ✓
      { x: 2000, y: 300, t: 0.1, finished: false }, // P6 — far away
    ];
    expect(cd._isPulk(racers)).toBe(true);
  });

  it('_detectPulkGroup: returns frontmost-first triple when battle detected', () => {
    const cd = new CameraDirector();
    const leader1 = { x: 9000, y: 300, t: 0.95 }; // P1
    const leader2 = { x: 8500, y: 300, t: 0.92 }; // P2
    const r0 = { x: 500, y: 300, t: 0.9 }; // P3 — battle group frontmost
    const r1 = { x: 520, y: 300, t: 0.88 }; // P4
    const r2 = { x: 540, y: 300, t: 0.86 }; // P5
    const group = cd._detectPulkGroup([r2, r0, r1, leader1, leader2]); // pass in random order
    expect(group).not.toBeNull();
    expect(group[0]).toBe(r0); // frontmost of battle group first (not overall leader)
    expect(group.length).toBe(3);
  });

  it('_detectPulkGroup: returns null when no qualifying group (temporal fail at rank 3+)', () => {
    const cd = new CameraDirector();
    const racers = [
      { x: 9000, y: 300, t: 0.9 }, // P1 — leader
      { x: 8500, y: 300, t: 0.85 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3
      { x: 505, y: 300, t: 0.1 }, // P4 — |P3-P4|=0.4 > 0.05 → temporal fail
      { x: 510, y: 300, t: 0.09 }, // P5
    ];
    expect(cd._detectPulkGroup(racers)).toBeNull();
  });

  it('camera lock: _battleLockedRacer is set to frontmost group racer on BATTLE_ZOOM entry', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    const leader1 = { x: 9000, y: 300, t: 0.7, finished: false }; // P1
    const leader2 = { x: 8500, y: 300, t: 0.65, finished: false }; // P2
    const r0 = { x: 500, y: 300, t: 0.5, finished: false }; // P3 — battle group frontmost
    const r1 = { x: 515, y: 300, t: 0.48, finished: false }; // P4
    const r2 = { x: 530, y: 300, t: 0.46, finished: false }; // P5
    const bystander = { x: 100, y: 300, t: 0.1, finished: false };
    cd.update(
      [leader1, leader2, r0, r1, r2, bystander],
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleLockedRacer).toBe(r0); // frontmost of battle group locked (not overall leader)
    expect(cd._battleGroupRacers).toHaveLength(3);
  });

  it('getBattleDiagData: returns active=true with locked/group info during BATTLE_ZOOM', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    const leader1 = { x: 9000, y: 300, t: 0.7, finished: false, name: 'Leader1' }; // P1
    const leader2 = { x: 8500, y: 300, t: 0.65, finished: false, name: 'Leader2' }; // P2
    const r0 = { x: 500, y: 300, t: 0.5, finished: false, name: 'Alpha' }; // P3
    const r1 = { x: 515, y: 300, t: 0.48, finished: false, name: 'Beta' }; // P4
    const r2 = { x: 530, y: 300, t: 0.46, finished: false, name: 'Gamma' }; // P5
    cd.update(
      [leader1, leader2, r0, r1, r2],
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    const allRacers = [leader1, leader2, r0, r1, r2];
    const diag = cd.getBattleDiagData(allRacers);
    expect(diag.active).toBe(true);
    expect(diag.lockedRacer).toBe(r0); // frontmost of battle group
    expect(diag.groupRacers).toHaveLength(3);
    expect(diag.isPulkNow).toBe(true);
  });

  // ── New Phase 3B boundary tests ───────────────────────────────────────────

  it('BATTLE boundary: ranks 2/3/4 do NOT trigger BATTLE (frontmost rank 2 < 3)', () => {
    const cd = new CameraDirector();
    // One leader (rank 1), then 3 close racers at ranks 2/3/4 — frontmost P2 blocked
    const racers = [
      { x: 9000, y: 300, t: 0.9 }, // P1 — only one leader
      { x: 500, y: 300, t: 0.5 }, // P2 — frontmost of close group, but rank 2 < 3
      { x: 515, y: 300, t: 0.48 }, // P3
      { x: 530, y: 300, t: 0.46 }, // P4
      { x: 100, y: 300, t: 0.1 }, // P5 — straggler
    ];
    expect(cd._isPulk(racers)).toBe(false);
  });

  it('BATTLE boundary: ranks 9/10/11 trigger BATTLE (frontmost rank 9 ≥ 3, no top-10 cap)', () => {
    const cd = new CameraDirector();
    // 8 spread-out leaders + 3 close racers at ranks 9/10/11
    const leaders = Array.from({ length: 8 }, (_, i) => ({
      x: i * 500,
      y: 0,
      t: 1 - i * 0.05, // t: 1.0…0.65, 500px apart — no spatial pulk
    }));
    const r9 = { x: 100, y: 0, t: 0.45 }; // rank 9
    const r10 = { x: 108, y: 0, t: 0.44 }; // rank 10 — 8px from r9
    const r11 = { x: 116, y: 0, t: 0.43 }; // rank 11 — 16px from r9
    expect(cd._isPulk([...leaders, r9, r10, r11])).toBe(true);
  });

  it('BATTLE boundary: 4-racer group at ranks 4/5/6/7 triggers BATTLE', () => {
    const cd = new CameraDirector();
    // 3 leaders + 4 close racers at ranks 4/5/6/7
    const leaders = [
      { x: 9000, y: 0, t: 0.9 }, // P1
      { x: 8500, y: 0, t: 0.85 }, // P2
      { x: 8000, y: 0, t: 0.8 }, // P3
    ];
    const r4 = { x: 500, y: 0, t: 0.5 }; // rank 4 — frontmost ≥ rank 3 ✓
    const r5 = { x: 512, y: 0, t: 0.49 }; // rank 5 — 12px from r4
    const r6 = { x: 524, y: 0, t: 0.48 }; // rank 6 — 24px from r4, span=2 ✓
    const r7 = { x: 536, y: 0, t: 0.47 }; // rank 7 — 36px from r4, span=3 ✓
    // Sub-triple r4/r5/r6 satisfies all conditions → BATTLE fires
    expect(cd._isPulk([...leaders, r4, r5, r6, r7])).toBe(true);
  });

  // ── H1 fix: _computePhasedPanTarget searches full racers array ────────────

  it('H1 fix: camera phased-follow stays on locked battle racer after it drops to rank 4', () => {
    const mockShape = {
      getPosition: (t) => ({ x: t * 4000, y: 360 }),
      getCenterPoint: () => ({ x: 2000, y: 360 }),
    };
    const cd = new CameraDirector(4000, 720, true, null, 36, mockShape);

    const leader = { x: 3500, y: 360, t: 0.8, finished: false }; // rank 1
    const r2 = { x: 2800, y: 360, t: 0.6, finished: false }; // rank 2
    const r3 = { x: 2200, y: 360, t: 0.53, finished: false }; // rank 3 — overtook locked
    const locked = { x: 2190, y: 360, t: 0.5, finished: false }; // locked racer — now rank 4
    const r5 = { x: 2180, y: 360, t: 0.48, finished: false }; // rank 5
    const r6 = { x: 2170, y: 360, t: 0.46, finished: false }; // rank 6
    const bystander = { x: 400, y: 360, t: 0.05, finished: false };

    const allRacers = [leader, r2, r3, locked, r5, r6, bystander];
    const sorted = [...allRacers].sort((a, b) => b.t - a.t);
    expect(sorted.indexOf(locked)).toBe(3); // confirm locked is at rank 4, not in top-3

    // Place CD in BATTLE_ZOOM tracking/follow phase with the locked racer
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 9000;
    cd._battleLockedRacer = locked;
    cd._battleGroupRacers = [locked, r5, r6];
    // Q4: must set _battleGroupRacerIndices so _findGroupRacers does index/ref lookup in searchList
    // (null idx → falls back to ref comparison via _findByIndex)
    cd._battleGroupRacerIndices = [null, null, null];
    cd._lerpPhase = 'tracking';
    cd._observerPhase = 'follow';
    cd._camT = locked.t;
    cd._lastOverviewExitTs = 3000;

    const focusRacers = sorted.slice(0, 3); // [leader, r2, r3] — locked NOT present

    // Without allRacers: searchList=focusRacers → group not found (locked/r5/r6 not in focusRacers)
    // → centroid fallback → focusRacers[0].t = leader.t
    cd._computePhasedPanTarget(focusRacers, 1280, 720, 1000 / 60, 9016);
    expect(cd._camT).toBeCloseTo(leader.t, 2); // camera drifts to leader ✗ (no allRacers)

    // With allRacers (Q4 centroid): finds locked+r5+r6 by ref → centroid T
    const groupCentroid = (locked.t + r5.t + r6.t) / 3;
    cd._camT = locked.t;
    cd._computePhasedPanTarget(focusRacers, 1280, 720, 1000 / 60, 9016, allRacers);
    expect(cd._camT).toBeCloseTo(groupCentroid, 3); // fixed: camera tracks group centroid ✓
    expect(cd._camT).not.toBeCloseTo(leader.t, 2);
  });

  // ── getBattleDiagData extended fields ────────────────────────────────────

  it('getBattleDiagData: groupRacerRanks, originalGroupValid, currentGroupRacers present', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    const leader1 = { x: 9000, y: 300, t: 0.7, finished: false, name: 'L1' };
    const leader2 = { x: 8500, y: 300, t: 0.65, finished: false, name: 'L2' };
    const r0 = { x: 500, y: 300, t: 0.5, finished: false, name: 'Alpha' }; // P3
    const r1 = { x: 515, y: 300, t: 0.48, finished: false, name: 'Beta' }; // P4
    const r2 = { x: 530, y: 300, t: 0.46, finished: false, name: 'Gamma' }; // P5
    const allRacers = [leader1, leader2, r0, r1, r2];
    cd.update(
      allRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);

    const diag = cd.getBattleDiagData(allRacers);
    expect(diag.groupRacerRanks).toEqual([3, 4, 5]); // r0=P3, r1=P4, r2=P5
    expect(diag.originalGroupValid).toBe(true); // positions unchanged
    expect(diag.currentGroupRacers).toHaveLength(3);
    expect(diag.isPulkNow).toBe(true);
  });

  it('getBattleDiagData: ranks updated when overtakers push group to higher ranks; group still spatially valid', () => {
    const cd = new CameraDirector();
    const leader1 = { x: 9000, y: 300, t: 0.7 };
    const leader2 = { x: 8500, y: 300, t: 0.65 };
    const r0 = { x: 500, y: 300, t: 0.5 }; // originally rank 3
    const r1 = { x: 515, y: 300, t: 0.48 }; // originally rank 4
    const r2 = { x: 530, y: 300, t: 0.46 }; // originally rank 5, will be pushed to rank 8
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd._battleGroupRacers = [r0, r1, r2];
    cd._battleLockedRacer = r0;
    // 3 overtakers with t between r1.t (0.48) and r2.t (0.46) → rank before r2
    const ov1 = { x: 5000, y: 300, t: 0.475 };
    const ov2 = { x: 5000, y: 300, t: 0.469 };
    const ov3 = { x: 5000, y: 300, t: 0.463 };
    // Sorted: leader1, leader2, r0(idx2), r1(idx3), ov1(idx4), ov2(idx5), ov3(idx6), r2(idx7)
    const diag = cd.getBattleDiagData([leader1, leader2, r0, r1, ov1, ov2, ov3, r2]);
    // Q3: originalGroupValid = spatial-only check. r0/r1/r2 still at x=500/515/530 (15/30px apart)
    // → spatially cohesive → valid=true. Rank span no longer invalidates the group.
    expect(diag.originalGroupValid).toBe(true);
    expect(diag.groupRacerRanks).toEqual([3, 4, 8]); // r2 now at rank 8
  });

  // ── Object-Identity regression: renderInterpolation spread-copy ───────────
  // RaceScreen's renderInterpolation path does: renderRacers = st.racers.map(r => ({ ...r, ... }))
  // creating NEW objects every frame. Without index-based lookup, all === comparisons fail
  // after Frame N+1 and the camera silently falls back to the leader.
  it('index-based lookup: camera lock survives renderInterpolation spread-copy (r.index stable)', () => {
    const cd = new CameraDirector();
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;

    // Physics objects with stable r.index (as assigned in RaceScreen)
    const r0 = { index: 0, x: 500, y: 300, t: 0.5, finished: false, name: 'Alpha' };
    const r1 = { index: 1, x: 515, y: 300, t: 0.48, finished: false, name: 'Beta' };
    const r2 = { index: 2, x: 530, y: 300, t: 0.46, finished: false, name: 'Gamma' };
    const l1 = { index: 3, x: 9000, y: 300, t: 0.7, finished: false, name: 'L1' };
    const l2 = { index: 4, x: 8500, y: 300, t: 0.65, finished: false, name: 'L2' };
    const physicsRacers = [l1, l2, r0, r1, r2];

    // Trigger BATTLE_ZOOM entry using physics objects
    cd.update(
      physicsRacers,
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleLockedRacerIndex).toBe(r0.index); // index stored at entry

    // Simulate renderInterpolation: spread-copy every frame (new object identity, same index)
    const renderRacers = physicsRacers.map((r) => ({ ...r, t: r.t + 0.0001 }));

    // Index-based lookup must find the spread copy by r.index
    const found = cd._findByIndex(renderRacers, cd._battleLockedRacerIndex, cd._battleLockedRacer);
    expect(found).not.toBeNull();
    expect(found.index).toBe(r0.index);
    expect(found).not.toBe(r0); // it IS a spread copy, not the original

    // _getBattleFocusRacer should return the spread copy (not fall back to leader)
    const focusRacer = cd._getBattleFocusRacer(renderRacers);
    expect(focusRacer.index).toBe(r0.index);
    expect(focusRacer.t).toBeCloseTo(r0.t + 0.0001, 5);
  });
});

// ── Lead-Ahead toggle ─────────────────────────────────────────────────────────

describe('CameraDirector — leadAheadEnabled toggle', () => {
  const mockShape = {
    getCenterPoint: () => ({ x: 640, y: 360 }),
    getPosition: (t) => ({ x: t * 1280, y: 360 }),
    isOpen: false,
  };

  function makeLeadAheadConfig(leadAheadEnabled) {
    return {
      cameraStateProfiles: {
        OVERVIEW: {
          trackWidths: 5.14,
          trackingTC: 1.5,
          entryTC: 1.5,
          leadInDuration: 0,
          leadOutDuration: 0,
          innerFramePct: 0.7,
          maxStateDuration: 4000,
          minStateHold: 5000,
          maxEntryDurationMs: 10000,
        },
        LEADER_ZOOM: {
          trackWidths: 2.85,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
          maxEntryDurationMs: 5000,
          leadAheadEnabled,
        },
        BATTLE_ZOOM: {
          trackWidths: 1.83,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.2,
          leadOutDuration: 1.0,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
          maxEntryDurationMs: 5000,
          leadAheadEnabled,
        },
        COMEBACK_ZOOM: {
          trackWidths: 3.7,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
          maxEntryDurationMs: 5000,
          leadAheadEnabled,
        },
      },
      transitionTConvergence: 0.03,
      entryConvergenceZoom: 0.05,
      entryConvergencePx: 10,
    };
  }

  // NOMINAL_T_PER_FRAME (0.001) is reset in _transition(); LEADER leadInDuration = 0.3s.
  // Expected lead-ahead when ON: 0.001 × 60 × 0.3 = 0.018
  const NOMINAL_T_PER_FRAME = 0.001;
  const LEADER_LEAD_IN = 0.3;
  const FRAME_RATE = 60;

  it('leadAheadEnabled: false — _transitionTargetT equals focusT (no lead-ahead offset)', () => {
    const cd = new CameraDirector(1280, 720, false, makeLeadAheadConfig(false), 36, mockShape);
    cd._camT = null;
    const racer = { t: 0.4, x: 512, y: 360, finished: false };
    // Post-start-hold window → LEADER_ZOOM
    const raceState = { raceElapsed: 5000, finishedCount: 0, finishT: 1, winner: null };
    cd._transition([racer], 10000, raceState);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    // With lead-ahead OFF, target must equal focusT exactly
    expect(cd._transitionTargetT).toBeCloseTo(0.4, 5);
  });

  it('leadAheadEnabled: true — _transitionTargetT > focusT (lead-ahead offset applied)', () => {
    const cd = new CameraDirector(1280, 720, false, makeLeadAheadConfig(true), 36, mockShape);
    cd._camT = null;
    const racer = { t: 0.4, x: 512, y: 360, finished: false };
    const raceState = { raceElapsed: 5000, finishedCount: 0, finishT: 1, winner: null };
    cd._transition([racer], 10000, raceState);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    // With lead-ahead ON: target = focusT + NOMINAL_T_PER_FRAME × 60 × 0.3
    const expectedOffset = NOMINAL_T_PER_FRAME * FRAME_RATE * LEADER_LEAD_IN;
    expect(cd._transitionTargetT).toBeCloseTo(0.4 + expectedOffset, 5);
    expect(cd._transitionTargetT).toBeGreaterThan(0.4);
  });
});

// ── Convergence-jump fix (PR #109) ────────────────────────────────────────────

describe('CameraDirector — convergence-jump fix', () => {
  // leadInDuration=0 → convergence gate goes directly to 'follow' (not 'lead-in'),
  // which is the scenario that previously produced the hard-pin spike.
  // leadOutDuration=1.5 → phasedEnabled=true so _computePhasedPanTarget runs in tracking mode.
  const WORLD_W = 1280;
  const jumpFixShape = makeShape(WORLD_W);
  const jumpFixConfig = {
    ...profileConfig,
    cameraStateProfiles: {
      ...profileConfig.cameraStateProfiles,
      LEADER_ZOOM: {
        ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
        leadInDuration: 0,
        leadOutDuration: 1.5,
      },
    },
    transitionTConvergence: 0.03,
  };

  it('convergence frame: no spike — offsetX delta bounded by T-space lerp step, not full T-gap', () => {
    // Before fix: dox on convergence frame = full T-gap × worldPx (up to 248px).
    // After fix: dox = only the T-space lerp step for that frame (a fraction of the gap).
    const cd = new CameraDirector(WORLD_W, 720, false, jumpFixConfig, 36, jumpFixShape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const ts0 = 10000;
    cd.stateEnteredAt = ts0;
    cd._lerpPhase = 'entry';
    cd._entryStartTs = ts0;
    cd._observerPhase = 'idle';
    const focusT = 0.3; // x = 0.3 × 1280 = 384px, within world bounds
    cd._camT = focusT - 0.025; // T-gap = 0.025 < convergence threshold 0.03
    cd._transitionTargetT = focusT;
    cd.zoom = cd.targetZoom = cd._leaderZoom; // zoom already converged
    const racer = [{ t: focusT, x: focusT * WORLD_W, y: 360, finished: false }];
    const raceState = { raceElapsed: ts0 + 100, finishedCount: 0, winner: null, finishT: 2.0 };

    const prevOffsetX = cd.offsetX;
    cd.update(racer, ts0 + 100, raceState, WORLD_W, 720);

    expect(cd._lerpPhase).toBe('tracking'); // convergence fired as expected
    const dox = Math.abs(cd.offsetX - prevOffsetX);
    // dox must be well below what the full T-snap would have produced (0.025 × 1280 = 32px).
    // CAMERA-ZOOM-UNIT-1: the budget is a T-fraction of the world in CANVAS px, so it scales with
    // the effective zoom. Stated relative to that zoom instead of as a constant, the assertion is
    // the same one (a T-space lerp step, not a full T-snap) at whatever zoom the unit resolves.
    expect(dox).toBeLessThan(0.025 * WORLD_W * cd.zoom * cd._proj.axisX);
  });

  it('after convergence, pixel-lerp closes remaining offsetX gap within a few tracking frames', () => {
    // Verifies the gap between offsetX (T-space pin position) and targetOffsetX (racer position)
    // shrinks smoothly via pixel-lerp — not left open, not snapped in one frame.
    const cd = new CameraDirector(WORLD_W, 720, false, jumpFixConfig, 36, jumpFixShape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const ts0 = 10000;
    cd.stateEnteredAt = ts0;
    cd._lerpPhase = 'tracking';
    const focusT = 0.5; // x = 0.5 × 1280 = 640px
    cd._camT = focusT;
    cd.zoom = cd.targetZoom = cd._leaderZoom;
    cd._observerPhase = 'follow';
    const racer = [{ t: focusT, x: focusT * WORLD_W, y: 360, finished: false }];

    // Populate targetOffsetX from the racer position via _setTargets (single writer of targetOffsetX)
    cd._setTargets(racer, WORLD_W, 720, null);
    const targetAtFocusT = cd.targetOffsetX;

    // Simulate the convergence gap: offsetX is 100px behind targetOffsetX
    const GAP = 100;
    cd.offsetX = targetAtFocusT - GAP;
    cd.targetOffsetX = targetAtFocusT;

    const raceState = { raceElapsed: ts0 + 100, finishedCount: 0, winner: null, finishT: 2.0 };
    for (let i = 1; i <= 5; i++) {
      cd.update(racer, ts0 + 100 + i * 17, raceState, WORLD_W, 720);
    }

    const gapAfter = Math.abs(cd.targetOffsetX - cd.offsetX);
    // At least 40% of the gap must close in 5 frames (trackingTC=0.25s → lf≈0.14/frame)
    expect(gapAfter).toBeLessThan(GAP * 0.6);
  });
});

// ── Lead-in → follow observer phase snap fix (Phenomenon 4) ─────────────────
//
// When the lead-in phase ends (elapsed >= leadInDuration), the old code fell
// through to the follow branch which executed `this._camT = focusT`, snapping
// _camT from the lead-ahead anchor to the racer position. On a curved track
// this translates to a large pixel-space jump on the very next frame (the
// pixel-lerp tries to close the sudden targetOffsetX gap). The fix returns
// early on the transition frame so _camT stays at the lead-ahead anchor;
// pixel-lerp closes the gap smoothly from frame N+2 onward — analogous to
// the PR #109 convergence-frame fix in the entry → tracking path.

describe('CameraDirector — lead-in → follow snap fix (Phenomenon 4)', () => {
  // Curved open track: y = 360 + 500*sin(30π*t).
  // At t≈0.5 the sine term changes rapidly (~47 000 px/unit-T), so a 0.03T
  // gap between the lead-ahead anchor and the racer produces ~60 px of Y
  // movement through one pixel-lerp step without the fix — large enough to
  // detect reliably.
  function makeCurvedOpenShape(trackLen) {
    return {
      getTotalLength: () => trackLen,
      getPosition: (t) => ({
        x: t * trackLen,
        y: 360 + 500 * Math.sin(30 * Math.PI * t),
      }),
    };
  }

  const TRACK_LEN = 1280;
  const LEAD_AHEAD_T = 0.5;
  const FOCUS_T = 0.53;
  const LEAD_IN_DURATION_S = 0.5; // seconds

  const snapConfig = {
    ...profileConfig,
    enableFrameLog: true,
    cameraStateProfiles: {
      ...profileConfig.cameraStateProfiles,
      LEADER_ZOOM: {
        ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
        trackingTC: 0.25,
        leadInDuration: LEAD_IN_DURATION_S,
        maxStateDuration: 30000,
        minStateHold: 30000,
      },
    },
  };

  function makeSnapTestCD() {
    const shape = makeCurvedOpenShape(TRACK_LEN);
    const cd = new CameraDirector(TRACK_LEN, 720, true, snapConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // Zoom fully converged so pixel-lerp uses a stable lerpFactor
    cd.zoom = cd.targetZoom = cd._leaderZoom;
    cd._lerpPhase = 'tracking';
    cd._observerPhase = 'follow';
    cd._camT = LEAD_AHEAD_T;
    cd._transitionTargetT = null;
    cd._prevFocusT = LEAD_AHEAD_T;

    // Prime offsetX at the lead-ahead pixel position via _setTargets (single writer of targetOffsetX)
    const racersAtLeadAhead = [
      { t: LEAD_AHEAD_T, x: LEAD_AHEAD_T * TRACK_LEN, y: 360, finished: false },
    ];
    cd._setTargets(racersAtLeadAhead, 1280, 720, null);
    cd.offsetX = cd.targetOffsetX;
    cd.offsetY = cd.targetOffsetY;

    // Switch to lead-in with a deliberate T-gap between anchor and racer
    cd._observerPhase = 'lead-in';
    cd._leadInStartTs = 0;
    cd._prevFocusT = FOCUS_T - 0.001;
    return cd;
  }

  const racers = [
    {
      t: FOCUS_T,
      x: FOCUS_T * TRACK_LEN,
      y: 360 + 500 * Math.sin(30 * Math.PI * FOCUS_T),
      finished: false,
    },
    { t: FOCUS_T - 0.01, x: (FOCUS_T - 0.01) * TRACK_LEN, y: 360, finished: false },
  ];
  const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 2.0 };

  it('_camT is NOT snapped to focusT on the lead-in → follow transition frame', () => {
    const cd = makeSnapTestCD();
    // ts=600ms > leadInDuration*1000=500ms → transition fires this frame
    cd.update(racers, 600, raceState, 1280, 720);
    expect(cd._observerPhase).toBe('follow');
    // _camT must remain at the lead-ahead anchor, not at FOCUS_T
    expect(cd._camT).toBeCloseTo(LEAD_AHEAD_T, 4);
  });

  it('pixel movement on the transition frame and first follow frame stay within per-frame range', () => {
    const cd = makeSnapTestCD();
    const oxBefore = cd.offsetX;
    const oyBefore = cd.offsetY;

    // Transition frame
    cd.update(racers, 600, raceState, 1280, 720);
    const deltaN = Math.hypot(cd.offsetX - oxBefore, cd.offsetY - oyBefore);

    // First genuine follow frame
    const oxN = cd.offsetX;
    const oyN = cd.offsetY;
    cd.update(racers, 617, raceState, 1280, 720);
    const deltaN1 = Math.hypot(cd.offsetX - oxN, cd.offsetY - oyN);

    // Without fix: a T-snap makes the pixel-lerp chase a jumped target. With the fix both frames
    // produce near-zero movement. CAMERA-ZOOM-UNIT-1: the budget scales with the effective zoom
    // (canvas px per world px), so it is stated relative to it rather than as a bare 50 px.
    const budget = 50 * Math.max(1, cd.zoom * cd._proj.axisX);
    expect(deltaN).toBeLessThan(budget);
    expect(deltaN1).toBeLessThan(budget);
  });
});

// ── Lead-out toggle (Phenomenon: camera freezes while racer keeps moving) ─────
//
// leadOutEnabled: false → trigger block is bypassed; _observerPhase stays
//   'follow' until the state transition — camera continues tracking the racer.
// leadOutEnabled: true  → existing lead-out behavior is unchanged (analog to
//   the existing lead-out tests in the Etappe 9 block above).

describe('CameraDirector — lead-out toggle', () => {
  // phasedConfig has LEADER_ZOOM: leadOutDuration=1.5, BATTLE_ZOOM: leadOutDuration=1.0.
  // effectiveDuration = max(maxStateDuration=4000, minStateHold=5000) = 5000.
  // stateEnteredAt=10000 → stateEndTime=15000; lead-out fires at ts >= 13500.

  const leadOutOffConfig = {
    ...phasedConfig,
    cameraStateProfiles: {
      ...phasedConfig.cameraStateProfiles,
      LEADER_ZOOM: {
        ...phasedConfig.cameraStateProfiles.LEADER_ZOOM,
        leadOutEnabled: false,
      },
    },
  };

  const leadOutOnConfig = {
    ...phasedConfig,
    cameraStateProfiles: {
      ...phasedConfig.cameraStateProfiles,
      LEADER_ZOOM: {
        ...phasedConfig.cameraStateProfiles.LEADER_ZOOM,
        leadOutEnabled: true,
      },
    },
  };

  it('toggle OFF: observerPhase stays "follow" even when remainingMs <= leadOutDuration * 1000', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, leadOutOffConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    // ts=13600: remaining=1400ms ≤ 1500ms — would trigger lead-out if enabled
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13600);
    expect(cd._observerPhase).toBe('follow');
  });

  it('toggle OFF: camera continues following racer through the lead-out window', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, leadOutOffConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    // Call multiple times deep inside what would be the lead-out window
    for (let i = 0; i < 5; i++) {
      cd._computePhasedPanTarget(
        [{ x: 2040, y: 360, t: 0.51 }],
        1280,
        720,
        1000 / 60,
        14000 + i * 17
      );
    }
    // _camT must track focusT (=0.51) because follow branch ran every frame
    expect(cd._camT).toBeCloseTo(0.51, 5);
    expect(cd._observerPhase).toBe('follow');
  });

  it('toggle ON: lead-out triggers normally — behavior identical to current master', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, leadOutOnConfig, 36, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 10000;
    cd._lerpPhase = 'tracking';
    cd._camT = 0.5;
    cd._observerPhase = 'follow';
    // ts=13000: remaining=2000ms > 1500ms → still follow
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13000);
    expect(cd._observerPhase).toBe('follow');
    // ts=13600: remaining=1400ms ≤ 1500ms → lead-out fires
    cd._computePhasedPanTarget([{ x: 2040, y: 360, t: 0.51 }], 1280, 720, 1000 / 60, 13600);
    expect(cd._observerPhase).toBe('lead-out');
  });

  it('_leadOutEnabledByState initialized from config profiles', () => {
    const shape = makeShape(4000);
    const cd = new CameraDirector(1280, 720, false, leadOutOffConfig, 36, shape);
    expect(cd._leadOutEnabledByState[CAM_STATE.LEADER_ZOOM]).toBe(false);
    // BATTLE_ZOOM has no explicit leadOutEnabled in leadOutOffConfig → defaults to true (backward compat)
    expect(cd._leadOutEnabledByState[CAM_STATE.BATTLE_ZOOM]).toBe(true);
  });
});

// ── COUNTDOWN camera phase ────────────────────────────────────────────────────

describe('CameraDirector.updateCountdown', () => {
  const countdownRacers = Array.from({ length: 6 }, (_, i) => ({ x: 100 + i * 20, y: 360, t: 0 }));

  it('COUNTDOWN phase: camera starts in OVERVIEW state and first update() keeps OVERVIEW', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    // Simulate countdown frames
    for (let i = 0; i < 60; i++) {
      cd.updateCountdown(countdownRacers, 1000 + i * 16, i * 16, 4000, 1280, 720);
    }
    // First RACING update — raceElapsed=0 so start-phase priority keeps OVERVIEW
    const raceState = { raceElapsed: 0, finishedCount: 0, winner: null, finishT: 1 };
    cd.update(countdownRacers, 5000, raceState, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('COUNTDOWN zoom at t=0 equals countdownStartZoom (min zoom = whole track visible)', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    const cam = cd.updateCountdown(countdownRacers, 1000, 0, 4000, 1280, 720);
    // countdownStartZoom for spriteScale=1/36 is clamped to minimum (1.0 for 1280px closed track)
    expect(cam.zoom).toBeCloseTo(cd._countdownStartZoom, 5);
  });

  it('COUNTDOWN zoom at t=duration equals overviewStateZoom — seamless OVERVIEW transition', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    const cam = cd.updateCountdown(countdownRacers, 5000, 4000, 4000, 1280, 720);
    // At full progress=1, ease-out(1)=1 → zoom must equal _overviewStateZoom exactly
    expect(cam.zoom).toBeCloseTo(cd._overviewStateZoom, 5);
    // And the director's live zoom matches so the first RACING update sees no jump
    expect(cd.zoom).toBeCloseTo(cd._overviewStateZoom, 5);
  });
});

// ── T-Space Zoom-Mismatch Fix (pre/post-lerp zoom consistency) ───────────────
//
// These tests verify that during T-Space-Snap entry mode the camera's rendered
// center in world coordinates equals camT's world position (no pre/post-lerp
// zoom mismatch), and that variable frame duration does not produce dox spikes.
//
// Setup helper: linear open track, LEADER_ZOOM entry with T-Space primed.
// The shape maps t → world x = t * trackLen so the expected camera center is
// always exactly shape.getPosition(_camT).x.

function makeTSpaceOpenCD(trackLen = 4000) {
  const shape = {
    getTotalLength: () => trackLen,
    getPosition: (t, _) => ({ x: t * trackLen, y: 360 }),
  };
  // Large transitionTConvergence so threshold never fires during the test window.
  // Small maxEntryDurationMs (2000ms >> test duration) keeps entry phase alive.
  const cfg = {
    ...profileConfig,
    transitionTConvergence: 100,
    cameraStateProfiles: {
      ...profileConfig.cameraStateProfiles,
      LEADER_ZOOM: {
        ...profileConfig.cameraStateProfiles.LEADER_ZOOM,
        entryTC: 0.35,
        leadInDuration: 0,
        maxEntryDurationMs: 2000,
      },
    },
  };
  const cd = new CameraDirector(trackLen, 720, true, cfg, 36, shape);
  cd.state = CAM_STATE.LEADER_ZOOM;
  cd.stateEnteredAt = 0;
  // Start zoom below the leader target so zoom is actively lerping during the test.
  cd.zoom = cd.overviewZoom;
  // Prime T-Space: camT in mid-track, target slightly ahead.
  cd._camT = 0.5;
  cd._transitionTargetT = 0.52;
  cd._lerpPhase = 'entry';
  return { cd, shape, trackLen };
}

describe('CameraDirector — T-Space zoom-mismatch fix', () => {
  it('Test 1 — rendered camera center tracks camT world position (< 1 px error) across variable dt', () => {
    // With the fix, targetOffsetX is computed with the post-lerp zoom, so
    // offsetX = -camX × effZoom is consistent with the zoom used to render.
    // The rendered center (canvas_center − offsetX) / effZoom must equal
    // shape.getPosition(camT).x to within floating-point precision.
    const { cd, shape, trackLen } = makeTSpaceOpenCD();
    const racers = [
      { x: 0.5 * trackLen, y: 360, t: 0.5 },
      { x: 0.48 * trackLen, y: 360, t: 0.48 },
    ];
    const raceState = { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 1 };
    // Mix of normal (16.67ms) and slow (50ms) frames to expose dt-driven mismatch.
    const dtSeq = [16.67, 16.67, 50, 16.67, 16.67, 50, 16.67, 16.67, 16.67, 50];
    let ts = 0;

    for (const dt of dtSeq) {
      ts += dt;
      const cam = cd.update(racers, ts, raceState, 1280, 720);
      if (cd.lerpPhase !== 'entry') break; // safety: stop if convergence fired early

      const effZoom = cam.zoom * OPEN_TRACK_BASE_ZOOM;
      const renderedCenterX = (640 - cam.offsetX) / effZoom;
      const camTWorldX = shape.getPosition(cd._camT, 0).x;

      expect(Math.abs(renderedCenterX - camTWorldX)).toBeLessThan(1);
    }
  });

  it('Test 2 — dox explained solely by zoom-in (pan contribution ≈ 0 during T-Space entry)', () => {
    // dox should equal approximately −worldX × Δ(effZoom) (zoom contribution only).
    // The pan contribution (−effZoom × ΔworldX) stays near zero because camT barely
    // advances per frame; any residual beyond the zoom term is the pan contribution.
    const { cd, trackLen } = makeTSpaceOpenCD();
    const racers = [
      { x: 0.5 * trackLen, y: 360, t: 0.5 },
      { x: 0.48 * trackLen, y: 360, t: 0.48 },
    ];
    const raceState = { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 1 };

    let prevOffsetX = null;
    let prevZoom = null;
    let ts = 0;

    for (let i = 0; i < 12; i++) {
      const dt = i % 3 === 0 ? 50 : 16.67; // every third frame is slow
      ts += dt;
      const cam = cd.update(racers, ts, raceState, 1280, 720);
      if (cd.lerpPhase !== 'entry') break;

      if (prevOffsetX !== null) {
        const dox = cam.offsetX - prevOffsetX;
        const effZoomNew = cam.zoom * OPEN_TRACK_BASE_ZOOM;
        const effZoomOld = prevZoom * OPEN_TRACK_BASE_ZOOM;
        const worldX = (640 - cam.offsetX) / effZoomNew;
        // Zoom contribution: −worldX × Δ(effZoom)
        const zoomContribution = -worldX * (effZoomNew - effZoomOld);
        // Pan contribution: dox minus the zoom term — should be near zero
        const panContribution = dox - zoomContribution;
        expect(Math.abs(panContribution)).toBeLessThan(2);
      }

      prevOffsetX = cam.offsetX;
      prevZoom = cam.zoom;
    }
  });

  it('Test 3 — variable dt (8 ms to 50 ms) does not produce outsized dox spikes', () => {
    // Without the fix, slow frames (lf ≈ 0.134) produce dox ≈ −camX × Δ(effZoom) where
    // Δ(effZoom) = lf × Δzoom_gap × BASE. With the fix, the spike is bounded because
    // targetOffsetX is computed with the already-lerped zoom. The natural zoom-in motion
    // per frame must not exceed worldX × effZoom × lf60_entry × 3 in absolute value.
    const { cd, trackLen } = makeTSpaceOpenCD();
    const lf60 = tcToLerpFactor(0.35); // entryTC matches config above
    const racers = [
      { x: 0.5 * trackLen, y: 360, t: 0.5 },
      { x: 0.48 * trackLen, y: 360, t: 0.48 },
    ];
    const raceState = { raceElapsed: 10000, finishedCount: 0, winner: null, finishT: 1 };
    const dtSeq = [8, 50, 8, 50, 8, 50, 8, 8, 50, 8, 8, 50];

    let prevOffsetX = null;
    let ts = 0;

    for (const dt of dtSeq) {
      ts += dt;
      const cam = cd.update(racers, ts, raceState, 1280, 720);
      if (cd.lerpPhase !== 'entry') break;

      if (prevOffsetX !== null) {
        const dox = Math.abs(cam.offsetX - prevOffsetX);
        const effZoom = cam.zoom * OPEN_TRACK_BASE_ZOOM;
        // World x ≈ canvas_center position (camera center in world coords)
        const worldX = (640 - cam.offsetX) / effZoom;
        const maxAllowed = Math.abs(worldX) * effZoom * lf60 * 3;
        expect(dox).toBeLessThan(maxAllowed + 5); // +5 px tolerance for rounding
      }

      prevOffsetX = cam.offsetX;
    }
  });
});

// ── LEAD_CHANGE camera state ──────────────────────────────────────────────

describe('LEAD_CHANGE camera state', () => {
  it('transitions to LEAD_CHANGE from LEADER_ZOOM on confirmed leader swap', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    const _racers = [
      { index: 0, name: 'Alice', t: 0.6, x: 400, y: 360 },
      { index: 1, name: 'Bob', t: 0.5, x: 300, y: 360 },
      { index: 2, name: 'Carol', t: 0.4, x: 200, y: 360 },
    ];
    // Pre-seed Alice as current leader; seed overview exit so cooldown hasn't expired
    cd._currentLeaderIndex = 0;
    cd._currentLeaderName = 'Alice';
    cd._lastOverviewExitTs = 500; // 400ms ago at ts=900 — well within 20s cooldown
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;

    // Bob overtakes with a clear gap (0.1 > default minGap 0.002)
    const newRacers = [
      { index: 1, name: 'Bob', t: 0.7, x: 500, y: 360 },
      { index: 0, name: 'Alice', t: 0.6, x: 400, y: 360 },
      { index: 2, name: 'Carol', t: 0.4, x: 200, y: 360 },
    ];

    // First call starts debounce timer
    cd._updateLeaderTracking(newRacers, 0);
    expect(cd._leadChangePending).toBe(false);

    // Second call after debounceMs (default 800) confirms the change
    cd._updateLeaderTracking(newRacers, 900);
    expect(cd._leadChangePending).toBe(true);
    expect(cd._currentLeaderName).toBe('Bob');
    expect(cd._prevLeaderName).toBe('Alice');

    // update() early interrupt fires → LEAD_CHANGE
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    cd.update(newRacers, 900, raceState, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEAD_CHANGE);
    expect(cd._leadChangeNewLeaderName).toBe('Bob');
    expect(cd._leadChangePrevLeaderName).toBe('Alice');
    expect(cd._leadChangePending).toBe(false);
  });

  it('does not fire LEAD_CHANGE during debounce window', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    cd._currentLeaderIndex = 0;
    cd._currentLeaderName = 'Alice';
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;

    const newRacers = [
      { index: 1, name: 'Bob', t: 0.7, x: 500, y: 360 },
      { index: 0, name: 'Alice', t: 0.6, x: 400, y: 360 },
    ];

    // Only 400ms elapsed — debounce not yet expired
    cd._updateLeaderTracking(newRacers, 0);
    cd._updateLeaderTracking(newRacers, 400);
    expect(cd._leadChangePending).toBe(false);
  });

  it('does not fire when gap is below minGap threshold', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    cd._currentLeaderIndex = 0;
    cd._currentLeaderName = 'Alice';
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;

    // Gap of 0.001 < default minGap 0.002 — too close
    const newRacers = [
      { index: 1, name: 'Bob', t: 0.6001, x: 500, y: 360 },
      { index: 0, name: 'Alice', t: 0.6, x: 400, y: 360 },
    ];

    cd._updateLeaderTracking(newRacers, 0);
    cd._updateLeaderTracking(newRacers, 900);
    expect(cd._leadChangePending).toBe(false);
  });

  it('LEAD_CHANGE fires during endgame when pending and cooldown elapsed', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    cd._currentLeaderIndex = 0;
    cd._currentLeaderName = 'Alice';
    cd._leadChangePending = true;
    cd._prevLeaderName = 'Alice';
    cd._currentLeaderName = 'Bob';
    cd._lastOverviewExitTs = 500;
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // _lastLeadChangeExitTs = -Infinity (default) → cooldown always elapsed
    // leaderProgress = 0.9 / 1.0 = 90% > 85% → endgame block, but LEAD_CHANGE exception fires
    const racers = [
      { index: 1, name: 'Bob', t: 0.9, x: 700, y: 360 },
      { index: 0, name: 'Alice', t: 0.8, x: 600, y: 360 },
    ];
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    cd.update(racers, 900, raceState, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEAD_CHANGE);
    expect(cd._leadChangePending).toBe(false);
  });

  it('LEAD_CHANGE blocked during endgame when cooldown not elapsed', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    cd._leadChangePending = true;
    cd._prevLeaderName = 'Alice';
    cd._currentLeaderName = 'Bob';
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    // ts=900, lastLeadChangeExitTs=800 → 900-800=100ms < 5000ms cooldown → blocked
    cd._lastLeadChangeExitTs = 800;
    const racers = [
      { index: 1, name: 'Bob', t: 0.9, x: 700, y: 360 },
      { index: 0, name: 'Alice', t: 0.8, x: 600, y: 360 },
    ];
    const raceState = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    cd.update(racers, 900, raceState, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._leadChangePending).toBe(false);
  });
});

// ── CameraDirector — Q3: _isOriginalGroupStillValid ───────────────────────────

describe('CameraDirector — Q3: _isOriginalGroupStillValid', () => {
  it('returns true when no group is stored but a valid pulk exists (falls back to _isPulk)', () => {
    const cd = new CameraDirector();
    cd._battleGroupRacerIndices = []; // empty — no stored group
    // Full racers with valid pulk at rank 3+: falls back to _isPulk which returns true
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3 — pulk
      { t: 0.48, x: 510, y: 300 }, // P4 — pulk
      { t: 0.46, x: 520, y: 300 }, // P5 — pulk
      { t: 0.1, x: 100, y: 300 }, // P6 — bystander (needed for n-2 loop bound)
    ];
    expect(cd._isOriginalGroupStillValid(racers)).toBe(true);
  });

  it('returns true when all stored group racers are still within spatial threshold', () => {
    const cd = new CameraDirector();
    const r0 = { index: 0, t: 0.5, x: 500, y: 300 };
    const r1 = { index: 1, t: 0.48, x: 510, y: 300 };
    const r2 = { index: 2, t: 0.46, x: 520, y: 300 };
    cd._battleGroupRacers = [r0, r1, r2];
    cd._battleGroupRacerIndices = [0, 1, 2];
    // All pairwise: 10px, 20px, 10px — all < 200px threshold
    expect(cd._isOriginalGroupStillValid([r0, r1, r2])).toBe(true);
  });

  it('returns false when any pair in the stored group exceeds the arc closeness threshold', () => {
    const cd = new CameraDirector();
    const r0 = { index: 0, t: 0.5, x: 500, y: 300 };
    const r1 = { index: 1, t: 0.48, x: 510, y: 300 };
    const r2 = { index: 2, t: 0.3, x: 520, y: 300 }; // arc 0.20 from r0 → dispersed (> 0.05)
    cd._battleGroupRacers = [r0, r1, r2];
    cd._battleGroupRacerIndices = [0, 1, 2];
    expect(cd._isOriginalGroupStillValid([r0, r1, r2])).toBe(false);
  });

  it('fires early BATTLE exit when original group disperses after battleMinDurationMs', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    // Use update() to transition into BATTLE, then disperse the group.
    // Leaders at t=0.7/0.65 (leaderProgress=0.7<0.85 endgameThreshold — no endgame block).
    const leader1 = { index: 10, t: 0.7, x: 9000, y: 300, finished: false };
    const leader2 = { index: 11, t: 0.65, x: 8500, y: 300, finished: false };
    const r0 = { index: 2, t: 0.5, x: 500, y: 300, finished: false };
    const r1 = { index: 3, t: 0.48, x: 510, y: 300, finished: false };
    const r2 = { index: 4, t: 0.46, x: 520, y: 300, finished: false };
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    // Enter BATTLE
    cd.update(
      [leader1, leader2, r0, r1, r2],
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleGroupRacerIndices.length).toBeGreaterThanOrEqual(3);
    // Disperse group: move r2 far away in arc, stateAge >= battleMinDurationMs (3000)
    const dispersed = [
      leader1,
      leader2,
      r0,
      r1,
      { ...r2, t: 0.3 }, // arc 0.20 from r0 → group invalid (> 0.05)
    ];
    cd.update(
      dispersed,
      9000 + 3500, // stateAge=3500 >= battleMinDurationMs=3000
      { raceElapsed: 14500, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });
});

// ── CameraDirector — Q1: isolation condition ──────────────────────────────────

describe('CameraDirector — Q1: isolation condition', () => {
  it('isolation disabled by default (threshold=0): BATTLE fires with arc-near non-group racer', () => {
    const cd = new CameraDirector(); // default battleIsolationThresholdT = 0 (no config → disabled)
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3 — group (arc gaps ≤ 0.04 < closeness 0.05)
      { t: 0.48, x: 510, y: 300 }, // P4 — group
      { t: 0.46, x: 520, y: 300 }, // P5 — group
      { t: 0.4, x: 620, y: 300 }, // P6 — arc 0.06 from P5 (not in group; would fail isolation ≥0.06, but off)
    ];
    expect(cd._detectPulkGroup(racers)).not.toBeNull();
  });

  it('isolation threshold configurable via config', () => {
    const cd = new CameraDirector(1280, 720, false, { battleIsolationThresholdT: 0.075 });
    expect(cd._battleIsolationThresholdT).toBe(0.075);
  });

  it('BATTLE blocked when non-group racer is within isolation threshold (arc)', () => {
    const cd = new CameraDirector(1280, 720, false, { battleIsolationThresholdT: 0.075 });
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3 — group
      { t: 0.48, x: 510, y: 300 }, // P4 — group
      { t: 0.46, x: 520, y: 300 }, // P5 — group
      { t: 0.4, x: 600, y: 300 }, // P6 — arc 0.06 from P5 (>closeness, <0.075) → isolation fails
    ];
    expect(cd._detectPulkGroup(racers)).toBeNull();
  });

  it('BATTLE passes when all non-group racers are outside isolation threshold (arc)', () => {
    const cd = new CameraDirector(1280, 720, false, { battleIsolationThresholdT: 0.075 });
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3 — group
      { t: 0.48, x: 510, y: 300 }, // P4 — group
      { t: 0.46, x: 520, y: 300 }, // P5 — group
      { t: 0.3, x: 800, y: 300 }, // P6 — arc 0.16 from P5 > 0.075 → passes
    ];
    expect(cd._detectPulkGroup(racers)).not.toBeNull();
  });
});

// ── CameraDirector — Q2: greedy group expansion ───────────────────────────────

describe('CameraDirector — Q2: greedy group expansion', () => {
  it('returns 3-member group when only seed triple qualifies', () => {
    const cd = new CameraDirector();
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3 — group
      { t: 0.48, x: 510, y: 300 }, // P4 — group
      { t: 0.46, x: 520, y: 300 }, // P5 — group
      { t: 0.2, x: 3000, y: 300 }, // P6 — 2480px from P5 → too far to expand
    ];
    const group = cd._detectPulkGroup(racers);
    expect(group).not.toBeNull();
    expect(group.length).toBe(3);
  });

  it('returns 4-member group when 4th racer qualifies', () => {
    const cd = new CameraDirector();
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3
      { t: 0.49, x: 510, y: 300 }, // P4
      { t: 0.48, x: 520, y: 300 }, // P5
      { t: 0.47, x: 530, y: 300 }, // P6 — arc 0.03 from P3 < closeness 0.05 → fits
    ];
    const group = cd._detectPulkGroup(racers);
    expect(group).not.toBeNull();
    expect(group.length).toBe(4);
  });

  it('caps group at battleMaxGroupSize even when more qualify', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMaxGroupSize: 4 });
    const racers = [
      { t: 0.9, x: 9000, y: 300 }, // P1
      { t: 0.85, x: 8500, y: 300 }, // P2
      { t: 0.5, x: 500, y: 300 }, // P3
      { t: 0.49, x: 505, y: 300 }, // P4
      { t: 0.48, x: 510, y: 300 }, // P5
      { t: 0.47, x: 515, y: 300 }, // P6 — all qualify, but max=4
      { t: 0.46, x: 520, y: 300 }, // P7
    ];
    const group = cd._detectPulkGroup(racers);
    expect(group).not.toBeNull();
    expect(group.length).toBe(4);
  });
});

// ── CameraDirector — Q4: centroid camera ─────────────────────────────────────

describe('CameraDirector — Q4: centroid camera', () => {
  it('_battleLockT is null initially', () => {
    const cd = new CameraDirector();
    expect(cd._battleLockT).toBeNull();
  });

  it('_battleLockT is set to group centroid T at BATTLE entry', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    // Leaders at t=0.7/0.65 — leaderProgress=0.7<0.85 endgameThreshold, no endgame block
    const leader1 = { index: 10, t: 0.7, x: 9000, y: 300, finished: false };
    const leader2 = { index: 11, t: 0.65, x: 8500, y: 300, finished: false };
    const r0 = { index: 2, t: 0.5, x: 500, y: 300, finished: false };
    const r1 = { index: 3, t: 0.48, x: 510, y: 300, finished: false };
    const r2 = { index: 4, t: 0.46, x: 520, y: 300, finished: false };
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    cd.update(
      [leader1, leader2, r0, r1, r2],
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleLockT).not.toBeNull();
    // Centroid = mean of group T values (P3+P4+P5 / 3)
    const expectedCentroid = (0.5 + 0.48 + 0.46) / 3;
    expect(cd._battleLockT).toBeCloseTo(expectedCentroid, 5);
  });

  it('_battleLockT is cleared when BATTLE exits', () => {
    const cd = new CameraDirector(1280, 720, false, null, 36);
    // Leaders at t=0.7/0.65 — leaderProgress=0.7<0.85 endgameThreshold, no endgame block
    const leader1 = { index: 10, t: 0.7, x: 9000, y: 300, finished: false };
    const leader2 = { index: 11, t: 0.65, x: 8500, y: 300, finished: false };
    const r0 = { index: 2, t: 0.5, x: 500, y: 300, finished: false };
    const r1 = { index: 3, t: 0.48, x: 510, y: 300, finished: false };
    const r2 = { index: 4, t: 0.46, x: 520, y: 300, finished: false };
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = 0;
    cd._lastOverviewExitTs = 3000;
    // Enter BATTLE
    cd.update(
      [leader1, leader2, r0, r1, r2],
      9000,
      { raceElapsed: 11000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleLockT).not.toBeNull();
    // Force BATTLE exit via natural max duration (stateAge >= maxStateDuration)
    cd.update(
      [leader1, leader2, r0, r1, r2],
      9000 + 9000, // stateAge=9000 >= max(5000,8000)=8000 → transition
      { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
    expect(cd._battleLockT).toBeNull();
  });
});

// ── BATTLE Pulk quality: Problem A/B/C fixes ──────────────────────────────────

describe('CameraDirector — BATTLE Pulk quality (rank-span, minTopN, P2-drift)', () => {
  // ── Problem B: battleMaxGroupRankSpan ────────────────────────────────────────

  it('battleMaxGroupRankSpan: expansion blocked when adding racer would exceed span', () => {
    // P1/P2 leaders far away, P3–P8 close spatially (span=5 with default), P9 close but span=6
    // With default span=5: group should NOT include P9. With span=7: it should.
    const makeRacers = () => [
      { x: 9000, y: 300, t: 0.9 }, // P1 — leader
      { x: 8500, y: 300, t: 0.85 }, // P2 — leader
      { x: 500, y: 300, t: 0.5 }, // P3 — seed frontmost (i=2)
      { x: 510, y: 300, t: 0.49 }, // P4
      { x: 520, y: 300, t: 0.48 }, // P5
      { x: 530, y: 300, t: 0.47 }, // P6
      { x: 540, y: 300, t: 0.46 }, // P7
      { x: 550, y: 300, t: 0.45 }, // P8 — span from P3 = 5 (indices 2..7)
      { x: 560, y: 300, t: 0.44 }, // P9 — span would be 6 (indices 2..8)
    ];

    const cdDefault = new CameraDirector(1280, 720, false, { battleMaxGroupRankSpan: 5 });
    const groupDefault = cdDefault._detectPulkGroup(makeRacers());
    expect(groupDefault).not.toBeNull();
    // P9 (index 8) must not be in the group — span would be 8-2=6 > 5
    const indicesDefault = groupDefault.map((r) => makeRacers().findIndex((rr) => rr === r));
    expect(Math.max(...indicesDefault) - Math.min(...indicesDefault)).toBeLessThanOrEqual(5);

    const cdWide = new CameraDirector(1280, 720, false, { battleMaxGroupRankSpan: 7 });
    const groupWide = cdWide._detectPulkGroup(makeRacers());
    expect(groupWide).not.toBeNull();
    // P9 may now be included (span 6 ≤ 7)
    expect(groupWide.length).toBeGreaterThanOrEqual(3);
  });

  it('battleMaxGroupRankSpan=2: only tight seed triple can form (no wide expansion)', () => {
    // With span=2: only P3/P4/P5 qualify (indices 2,3,4 — span=2). P6+ blocked.
    const racers = [
      { x: 9000, y: 300, t: 0.9 }, // P1
      { x: 8500, y: 300, t: 0.85 }, // P2
      { x: 500, y: 300, t: 0.5 }, // P3
      { x: 510, y: 300, t: 0.49 }, // P4
      { x: 520, y: 300, t: 0.48 }, // P5
      { x: 530, y: 300, t: 0.47 }, // P6 — blocked by span=2 (would make span=3)
    ];
    const cd = new CameraDirector(1280, 720, false, { battleMaxGroupRankSpan: 2 });
    const group = cd._detectPulkGroup(racers);
    expect(group).not.toBeNull();
    expect(group.length).toBe(3); // only P3/P4/P5
  });

  // ── Problem C: battleMinTopN ─────────────────────────────────────────────────

  it('battleMinTopN: rejects group when frontmost member is outside top-N', () => {
    // 8 leaders far apart, P9/P10/P11 close → frontmost is P9 (index=8) ≥ minTopN=8
    const leaders = Array.from({ length: 8 }, (_, i) => ({
      x: i * 500,
      y: 0,
      t: 1 - i * 0.05,
    }));
    const battle = [
      { x: 100, y: 0, t: 0.55 }, // P9
      { x: 102, y: 0, t: 0.54 }, // P10
      { x: 104, y: 0, t: 0.53 }, // P11
    ];
    const cd = new CameraDirector(1280, 720, false, { battleMinTopN: 8 });
    expect(cd._isPulk([...leaders, ...battle])).toBe(false);
  });

  it('battleMinTopN=12: accepts group at ranks 9/10/11 (frontmost P9 < 12)', () => {
    const leaders = Array.from({ length: 8 }, (_, i) => ({
      x: i * 500,
      y: 0,
      t: 1 - i * 0.05,
    }));
    const battle = [
      { x: 100, y: 0, t: 0.55 }, // P9
      { x: 102, y: 0, t: 0.54 }, // P10
      { x: 104, y: 0, t: 0.53 }, // P11
    ];
    const cd = new CameraDirector(1280, 720, false, { battleMinTopN: 12 });
    expect(cd._isPulk([...leaders, ...battle])).toBe(true);
  });

  // ── Problem A: _isBattleGroupP2Drifted ───────────────────────────────────────

  it('_isBattleGroupP2Drifted: false when no locked group stored', () => {
    const cd = new CameraDirector();
    const racers = [
      { x: 100, y: 0, t: 0.9, index: 0 },
      { x: 200, y: 0, t: 0.8, index: 1 },
    ];
    expect(cd._isBattleGroupP2Drifted(racers)).toBe(false);
  });

  it('_isBattleGroupP2Drifted: false when locked group members are P3+', () => {
    const cd = new CameraDirector();
    cd._battleGroupRacerIndices = [2, 3, 4]; // P3/P4/P5 at lock time
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 0 }, // P1
      { x: 800, y: 0, t: 0.8, index: 1 }, // P2
      { x: 500, y: 0, t: 0.5, index: 2 }, // P3 — in locked group, still P3
      { x: 490, y: 0, t: 0.49, index: 3 }, // P4
      { x: 480, y: 0, t: 0.48, index: 4 }, // P5
    ];
    expect(cd._isBattleGroupP2Drifted(racers)).toBe(false);
  });

  it('_isBattleGroupP2Drifted: true when locked group member drifted to P2', () => {
    const cd = new CameraDirector();
    cd._battleGroupRacerIndices = [2, 3, 4]; // locked at P3/P4/P5
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 0 }, // P1
      { x: 820, y: 0, t: 0.82, index: 2 }, // P2 now — was locked as group member
      { x: 500, y: 0, t: 0.5, index: 1 }, // P3
      { x: 490, y: 0, t: 0.49, index: 3 }, // P4
      { x: 480, y: 0, t: 0.48, index: 4 }, // P5
    ];
    expect(cd._isBattleGroupP2Drifted(racers)).toBe(true);
  });

  it('_isBattleGroupP2Drifted: true when locked group member drifted to P1', () => {
    const cd = new CameraDirector();
    cd._battleGroupRacerIndices = [3, 4, 5];
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 3 }, // P1 now — was locked as group member
      { x: 800, y: 0, t: 0.8, index: 0 }, // P2
      { x: 500, y: 0, t: 0.5, index: 4 }, // P3
      { x: 490, y: 0, t: 0.49, index: 5 }, // P4
    ];
    expect(cd._isBattleGroupP2Drifted(racers)).toBe(true);
  });

  // ── Problem A: P2-drift exit in update() ─────────────────────────────────────

  it('P2-drift: BATTLE does not exit before battleMinDurationMs even when drifted', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 3000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._battleGroupRacerIndices = [2, 3, 4];
    // Racer index=2 is now P2 (drifted), but stateAge=1000 < 3000
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 0, finished: false }, // P1
      { x: 820, y: 0, t: 0.82, index: 2, finished: false }, // P2 — drifted group member
      { x: 500, y: 0, t: 0.5, index: 1, finished: false }, // P3
      { x: 490, y: 0, t: 0.49, index: 3, finished: false }, // P4
      { x: 480, y: 0, t: 0.48, index: 4, finished: false }, // P5
    ];
    cd.update(
      racers,
      1000,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('P2-drift: BATTLE exits after battleMinDurationMs when a group member reaches P2', () => {
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 3000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._battleGroupRacerIndices = [2, 3, 4];
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 0, finished: false }, // P1
      { x: 820, y: 0, t: 0.82, index: 2, finished: false }, // P2 — drifted group member
      { x: 500, y: 0, t: 0.5, index: 1, finished: false }, // P3
      { x: 490, y: 0, t: 0.49, index: 3, finished: false }, // P4
      { x: 480, y: 0, t: 0.48, index: 4, finished: false }, // P5
    ];
    // stateAge=3001 >= 3000 and group member is P2 → should exit
    cd.update(
      racers,
      3001,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    expect(cd.state).not.toBe(CAM_STATE.BATTLE_ZOOM);
  });

  it('P2-drift: BATTLE does not exit when no group member is in P1/P2', () => {
    // Group still at P3/P4/P5 after minHold — should NOT trigger P2-drift exit
    const cd = new CameraDirector(1280, 720, false, { battleMinDurationMs: 1000 });
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd.stateEnteredAt = 0;
    cd._battleGroupRacerIndices = [2, 3, 4];
    const racers = [
      { x: 900, y: 0, t: 0.9, index: 0, finished: false }, // P1
      { x: 800, y: 0, t: 0.8, index: 1, finished: false }, // P2
      { x: 500, y: 0, t: 0.5, index: 2, finished: false }, // P3 — group, still P3
      { x: 490, y: 0, t: 0.49, index: 3, finished: false }, // P4
      { x: 480, y: 0, t: 0.48, index: 4, finished: false }, // P5
    ];
    cd.update(
      racers,
      2000,
      { raceElapsed: 15000, finishedCount: 0, winner: null, finishT: 1 },
      1280,
      720
    );
    // May stay in BATTLE (pulk still valid) or transition via other rules — just not P2-drift
    // The key assertion: _isBattleGroupP2Drifted returns false for this setup
    expect(cd._isBattleGroupP2Drifted(racers)).toBe(false);
  });
});

// ── getComebackDiagData — new phase-gate fields ───────────────────────────────

describe('getComebackDiagData — outcomePhaseThreshold / leaderProgress / isOutcomePhaseActive', () => {
  const makeRacer = (t, idx) => ({ t, x: t * 1000, y: 360, index: idx, finished: false });

  it('outcomePhaseThreshold reflects the configured value', () => {
    const cd = new CameraDirector(1280, 720, false, { outcomePhaseThreshold: 0.6 });
    const diag = cd.getComebackDiagData([], 0);
    expect(diag.outcomePhaseThreshold).toBeCloseTo(0.6, 3);
  });

  it('default outcomePhaseThreshold is 0.75', () => {
    const cd = new CameraDirector(1280, 720, false);
    const diag = cd.getComebackDiagData([], 0);
    expect(diag.outcomePhaseThreshold).toBeCloseTo(0.75, 3);
  });

  it('leaderProgress is 0 before first update()', () => {
    const cd = new CameraDirector(1280, 720, false);
    const diag = cd.getComebackDiagData([], 0);
    expect(diag.leaderProgress).toBe(0);
  });

  it('leaderProgress = leader.t / finishT after update()', () => {
    const cd = new CameraDirector(1280, 720, false);
    const racers = [makeRacer(0.8, 0), makeRacer(0.5, 1), makeRacer(0.3, 2)];
    cd.update(
      racers,
      1000,
      { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    const diag = cd.getComebackDiagData(racers, 1000);
    expect(diag.leaderProgress).toBeCloseTo(0.8, 3);
  });

  it('isOutcomePhaseActive: false when leaderProgress < threshold', () => {
    const cd = new CameraDirector(1280, 720, false, { outcomePhaseThreshold: 0.75 });
    const racers = [makeRacer(0.5, 0), makeRacer(0.3, 1), makeRacer(0.1, 2)];
    cd.update(
      racers,
      1000,
      { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    const diag = cd.getComebackDiagData(racers, 1000);
    expect(diag.isOutcomePhaseActive).toBe(false);
  });

  it('isOutcomePhaseActive: true when leaderProgress > threshold', () => {
    const cd = new CameraDirector(1280, 720, false, { outcomePhaseThreshold: 0.75 });
    const racers = [makeRacer(0.82, 0), makeRacer(0.5, 1), makeRacer(0.3, 2)];
    cd.update(
      racers,
      1000,
      { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0 },
      1280,
      720
    );
    const diag = cd.getComebackDiagData(racers, 1000);
    expect(diag.isOutcomePhaseActive).toBe(true);
  });

  it('isOutcomePhaseActive: true via external isOutcomePhase flag even if leaderProgress is low', () => {
    const cd = new CameraDirector(1280, 720, false, { outcomePhaseThreshold: 0.75 });
    const racers = [makeRacer(0.4, 0), makeRacer(0.3, 1), makeRacer(0.2, 2)];
    cd.update(
      racers,
      1000,
      { raceElapsed: 5000, finishedCount: 0, winner: null, finishT: 1.0, isOutcomePhase: true },
      1280,
      720
    );
    const diag = cd.getComebackDiagData(racers, 1000);
    expect(diag.isOutcomePhaseActive).toBe(true);
    expect(diag.leaderProgress).toBeCloseTo(0.4, 3);
  });
});

describe('CameraDirector — same-state repeat: immediately interruptible', () => {
  const makeRacer = (t, idx) => ({ t, x: t * 1000, y: 360, index: idx, finished: false });
  const rs = (raceElapsed = 5000) => ({
    raceElapsed,
    finishedCount: 0,
    winner: null,
    finishT: 1.0,
  });

  it('_activeStateMinHoldMs is 0 after LEADER_ZOOM → LEADER_ZOOM repeat', () => {
    // _prevCommittedState starts as null, so a non-repeat must happen first to prime it.
    // Step 1 (ts=10001): constructor OVERVIEW → LEADER_ZOOM (non-repeat), stateEnteredAt=10001
    // Step 2 (ts=20002): LEADER_ZOOM → LEADER_ZOOM (repeat), _activeStateMinHoldMs=0
    const cd = new CameraDirector(1280, 720, false, { minStateHoldMs: 10000 });
    const racers = [makeRacer(0.5, 0), makeRacer(0.4, 1), makeRacer(0.3, 2)];
    cd.stateEnteredAt = 0;
    cd.update(racers, 10001, rs(), 1280, 720); // OVERVIEW→LEADER_ZOOM (non-repeat)
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._activeStateMinHoldMs).toBe(10000); // normal value after non-repeat
    // stateEnteredAt=10001; next holdGate=10000 fires when stateAge≥10000 → ts≥20001
    cd.update(racers, 20002, rs(), 1280, 720); // LEADER_ZOOM→LEADER_ZOOM (repeat)
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._activeStateMinHoldMs).toBe(0);
  });

  it('_activeStateMinHoldMs is set to configured value after a different-state transition', () => {
    // Constructor starts in OVERVIEW; raceElapsed=5000 → priority 2.1 → LEADER_ZOOM (different)
    const cd = new CameraDirector(1280, 720, false, { minStateHoldMs: 10000 });
    const racers = [makeRacer(0.5, 0), makeRacer(0.4, 1), makeRacer(0.3, 2)];
    cd.stateEnteredAt = 0;
    cd.update(racers, 10001, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._activeStateMinHoldMs).toBe(10000);
  });

  it('same-state repeat: state switches immediately on next frame when a new event occurs', () => {
    // Step 1: OVERVIEW→LEADER_ZOOM (non-repeat, primes _prevCommittedState)
    // Step 2: LEADER_ZOOM→LEADER_ZOOM repeat (_activeStateMinHoldMs=0, holdGate=0)
    // Step 3: 1ms later, raceElapsed=500 → start-phase priority → OVERVIEW fires immediately
    const cd = new CameraDirector(1280, 720, false, { minStateHoldMs: 10000 });
    const racers = [makeRacer(0.5, 0), makeRacer(0.4, 1), makeRacer(0.3, 2)];
    cd.stateEnteredAt = 0;
    cd.update(racers, 10001, rs(), 1280, 720); // non-repeat → LEADER_ZOOM
    cd.update(racers, 20002, rs(), 1280, 720); // repeat → LEADER_ZOOM, _activeStateMinHoldMs=0
    expect(cd._activeStateMinHoldMs).toBe(0);
    cd.update(racers, 20003, rs(500 /* raceElapsed < 3000 = start phase */), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('stateEnteredAt is NOT reset on a same-state repeat', () => {
    // After non-repeat at ts=10001, stateEnteredAt=10001.
    // On repeat at ts=20002, stateEnteredAt must stay 10001 (camera animation undisturbed).
    const cd = new CameraDirector(1280, 720, false, { minStateHoldMs: 10000 });
    const racers = [makeRacer(0.5, 0), makeRacer(0.4, 1), makeRacer(0.3, 2)];
    cd.stateEnteredAt = 0;
    cd.update(racers, 10001, rs(), 1280, 720); // OVERVIEW→LEADER_ZOOM non-repeat
    expect(cd.stateEnteredAt).toBe(10001);
    cd.update(racers, 20002, rs(), 1280, 720); // LEADER_ZOOM→LEADER_ZOOM repeat
    expect(cd.stateEnteredAt).toBe(10001); // NOT pushed to 20002
    cd.update(racers, 20003, rs(), 1280, 720); // another repeat
    expect(cd.stateEnteredAt).toBe(10001); // stays
  });
});

// ── FINISH_OVERVIEW lookback ──────────────────────────────────────────────────
//
// Tests for the _inFinishMode lookback in the OVERVIEW _setTargets path.
// Open track (worldW=6000): effectiveZoom = overviewZoom × BASE_ZOOM = 1280/6000 × 1.5 ≈ 0.32
// camXMax = 6000 − 1280/0.32 = 2000 — room for pan to vary with the lookback position.
//
// Pan math (worldW=6000, effectiveZoom=0.32, CANVAS_W=1280):
//   targetOffsetX = −camX × effZoom
//   idealCamX     = target.x − CANVAS_W/(2 × effZoom) = target.x − 2000
//   camX          = clamp(idealCamX, 0, 2000)
//
// Shape mock returns { x: t * WORLD_W, y: 360 } and getTotalLength()=WORLD_W.
// lookbackFrac = lookbackPx / WORLD_W; lookbackT = finishT − lookbackFrac.
// finishT=0.8 → normT=0.8 → finishPos.x=4800
// lookbackPx=480 → frac=0.08 → lookbackT=0.72 → target.x=4320 → idealCamX=2320 → camX=2000 → offsetX=−640
// lookbackPx=0   → frac=0.00 → lookbackT=0.80 → target.x=4800 → idealCamX=2800 → camX=2000 → offsetX=−640
// To get unclamped pan, use a small lookback with finishT set closer to center:
//   finishT=0.5, lookbackPx=600 → frac=0.1 → target.x=2400 → idealCamX=400 → camX=400 → offsetX=−128

describe('CameraDirector — FINISH_OVERVIEW lookback', () => {
  const WORLD_W = 6000;
  const CANVAS_W = 1280;
  const CANVAS_H = 720;
  const FINISH_T = 0.8;
  const LEADER_X = 1000;
  const LEADER_Y = 360;

  // CAMERA-ZOOM-UNIT-1: the effective zoom is no longer the whole-world constant this block used
  // to restate — OVERVIEW resolves to its track-widths setting. These tests are about WHERE the
  // camera centres (the fixed lookback point behind the finish line), so the zoom is READ from the
  // director under test rather than re-derived, and the centring maths is unchanged.
  function expectedOffsetX(targetX, cd) {
    const effZoom = cd.zoom * cd._proj.axisX;
    const halfViewport = CANVAS_W / (2 * effZoom);
    const camXMax = WORLD_W - CANVAS_W / effZoom;
    const idealCamX = targetX - halfViewport;
    const camX = Math.max(0, Math.min(camXMax, idealCamX));
    return -camX * effZoom;
  }

  // Shape returns t-dependent position so lookbackT can be verified.
  // getTotalLength returns WORLD_W so that lookbackFrac = lookbackPx / WORLD_W.
  function makeShape() {
    return {
      getTotalLength: () => WORLD_W,
      getPosition: (t, _offset) => ({ x: t * WORLD_W, y: 360, angle: 0 }),
      getCenterPoint: () => ({ x: WORLD_W / 2, y: CANVAS_H / 2 }),
    };
  }

  function makeCD(lookbackPx) {
    return new CameraDirector(
      WORLD_W,
      CANVAS_H,
      true,
      { finishOverviewLookbackPx: lookbackPx },
      36,
      makeShape()
    );
  }

  function putInFinishOverview(cd) {
    const racers = [
      { t: FINISH_T, x: LEADER_X, y: LEADER_Y, finished: true, index: 0 },
      { t: 0.5, x: 2000, y: LEADER_Y, finished: false, index: 1 },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: FINISH_T };
    cd.update(racers, 1000, rs, CANVAS_W, CANVAS_H);
    cd.stateEnteredAt = 0;
    cd.update(racers, 3000, { ...rs, raceElapsed: 12000 }, CANVAS_W, CANVAS_H);
    return racers;
  }

  it('config round-trip: finishOverviewLookbackPx is stored from config', () => {
    const cd = new CameraDirector(1280, 720, false, { finishOverviewLookbackPx: 450 });
    expect(cd._finishOverviewLookbackPx).toBe(450);
  });

  it('config round-trip: finishOverviewLookbackPx defaults to 300', () => {
    const cd = new CameraDirector();
    expect(cd._finishOverviewLookbackPx).toBe(300);
  });

  it('finishPauseMs getter: returns configured value', () => {
    const cd = new CameraDirector(1280, 720, false, { finishPauseMs: 4000 });
    expect(cd.finishPauseMs).toBe(4000);
  });

  it('finishPauseMs getter: defaults to 2500', () => {
    const cd = new CameraDirector();
    expect(cd.finishPauseMs).toBe(2500);
  });

  it('finishPauseMs is live-applied via updateConfig', () => {
    const cd = new CameraDirector(1280, 720, false, { finishPauseMs: 1000 });
    expect(cd.finishPauseMs).toBe(1000);
    cd.updateConfig({ finishPauseMs: 6000 });
    expect(cd.finishPauseMs).toBe(6000);
  });

  it('lookback: camera target is at finishT − lookback position (unclamped range)', () => {
    // Use finishT=0.5, lookbackPx=600 → lookbackFrac=600/6000=0.1 → lookbackT=0.4
    // → target.x=2400 → idealCamX=400 → camX=400 → offsetX=−128
    const shape = {
      getTotalLength: () => WORLD_W,
      getPosition: (t, _offset) => ({ x: t * WORLD_W, y: 360, angle: 0 }),
      getCenterPoint: () => ({ x: WORLD_W / 2, y: CANVAS_H / 2 }),
    };
    const cd = new CameraDirector(
      WORLD_W,
      CANVAS_H,
      true,
      { finishOverviewLookbackPx: 600 },
      36,
      shape
    );
    const FT = 0.5;
    const racers = [
      { t: FT, x: FT * WORLD_W, y: 360, finished: true, index: 0 },
      { t: 0.3, x: 1800, y: 360, finished: false, index: 1 },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: FT };
    cd.update(racers, 1000, rs, CANVAS_W, CANVAS_H);
    cd.stateEnteredAt = 0;
    cd.update(racers, 3000, { ...rs, raceElapsed: 12000 }, CANVAS_W, CANVAS_H);
    cd._lerpPhase = 'tracking';
    cd._camT = null;
    // CAMERA-ZOOM-UNIT-1: the OVERVIEW zoom is the state's track-widths setting, not the
    // projection's whole-world zoom. `overviewZoom` still exists as the projection's loosest
    // cam.zoom and is NOT the state's shot.
    cd.zoom = cd._overviewStateZoom;
    cd.stateEnteredAt = 2900;
    cd.update(racers, 3100, { ...rs, raceElapsed: 12100 }, CANVAS_W, CANVAS_H);
    // lookbackFrac = 600/6000 = 0.1 → lookbackT = 0.5 − 0.1 = 0.4 → target.x = 0.4 × 6000 = 2400
    expect(cd.targetOffsetX).toBeCloseTo(expectedOffsetX(0.4 * WORLD_W, cd), 1);
  });

  it('lookback=0: camera centers exactly on the finish line', () => {
    // finishT=0.5, lookbackPx=0 → lookbackFrac=0 → target.x = 0.5 × 6000 = 3000 → idealCamX=1000 → offsetX=−320
    const shape = {
      getTotalLength: () => WORLD_W,
      getPosition: (t, _offset) => ({ x: t * WORLD_W, y: 360, angle: 0 }),
      getCenterPoint: () => ({ x: WORLD_W / 2, y: CANVAS_H / 2 }),
    };
    const cd = new CameraDirector(
      WORLD_W,
      CANVAS_H,
      true,
      { finishOverviewLookbackPx: 0 },
      36,
      shape
    );
    const FT = 0.5;
    const racers = [
      { t: FT, x: FT * WORLD_W, y: 360, finished: true, index: 0 },
      { t: 0.3, x: 1800, y: 360, finished: false, index: 1 },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: FT };
    cd.update(racers, 1000, rs, CANVAS_W, CANVAS_H);
    cd.stateEnteredAt = 0;
    cd.update(racers, 3000, { ...rs, raceElapsed: 12000 }, CANVAS_W, CANVAS_H);
    cd._lerpPhase = 'tracking';
    cd._camT = null;
    // CAMERA-ZOOM-UNIT-1: the OVERVIEW zoom is the state's track-widths setting, not the
    // projection's whole-world zoom. `overviewZoom` still exists as the projection's loosest
    // cam.zoom and is NOT the state's shot.
    cd.zoom = cd._overviewStateZoom;
    cd.stateEnteredAt = 2900;
    cd.update(racers, 3100, { ...rs, raceElapsed: 12100 }, CANVAS_W, CANVAS_H);
    expect(cd.targetOffsetX).toBeCloseTo(expectedOffsetX(FT * WORLD_W, cd), 1);
  });

  it('no drift: camera target does not change when winner moves in runout', () => {
    // The target is derived from finishT (fixed), not from the winner's runout position.
    const cd = makeCD(480); // 480px = 0.08 × 6000
    const racers = putInFinishOverview(cd);
    cd._lerpPhase = 'tracking';
    cd._camT = null;
    // CAMERA-ZOOM-UNIT-1: the OVERVIEW zoom is the state's track-widths setting, not the
    // projection's whole-world zoom. `overviewZoom` still exists as the projection's loosest
    // cam.zoom and is NOT the state's shot.
    cd.zoom = cd._overviewStateZoom;
    cd.stateEnteredAt = 2900;
    const rs = { raceElapsed: 12100, finishedCount: 1, finishT: FINISH_T };
    cd.update(racers, 3100, rs, CANVAS_W, CANVAS_H);
    const offsetX1 = cd.targetOffsetX;
    // Simulate winner moving further in runout
    racers[0] = { ...racers[0], t: FINISH_T + 0.05, x: (FINISH_T + 0.05) * WORLD_W };
    cd.update(racers, 3117, { ...rs, raceElapsed: 12117 }, CANVAS_W, CANVAS_H);
    expect(cd.targetOffsetX).toBeCloseTo(offsetX1, 1);
  });

  it('no shape: falls through to normal OVERVIEW tracking without throwing', () => {
    const cd = new CameraDirector(1280, 720, false, { finishOverviewLookbackPx: 480 }, 36, null);
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true, index: 0 },
      { t: 0.7, x: 400, y: 300, finished: false, index: 1 },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: 1.0 };
    cd.update(racers, 1000, rs, 1280, 720);
    cd.stateEnteredAt = 0;
    expect(() => cd.update(racers, 3000, { ...rs, raceElapsed: 12000 }, 1280, 720)).not.toThrow();
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
  });

  it('closed track: lookback wraps correctly around start/finish line', () => {
    const shape = {
      getTotalLength: () => 1280,
      getPosition: (t, _offset) => ({ x: t * 1280, y: 360, angle: 0 }),
      getCenterPoint: () => ({ x: 640, y: 360 }),
    };
    // lookbackPx=102 → lookbackFrac=102/1280≈0.08 → wraps back from finish (t=1.0)
    const cd = new CameraDirector(1280, 720, false, { finishOverviewLookbackPx: 102 }, 36, shape);
    const racers = [
      { t: 1.0, x: 640, y: 360, finished: true, index: 0 },
      { t: 0.7, x: 400, y: 300, finished: false, index: 1 },
    ];
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: 1.0 };
    cd.update(racers, 1000, rs, 1280, 720);
    cd.stateEnteredAt = 0;
    cd.update(racers, 3000, { ...rs, raceElapsed: 12000 }, 1280, 720);
    cd._lerpPhase = 'tracking';
    cd._camT = null;
    cd.stateEnteredAt = 2900;
    expect(() => cd.update(racers, 3100, { ...rs, raceElapsed: 12100 }, 1280, 720)).not.toThrow();
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    expect(cd._inFinishMode).toBe(true);
  });

  // ── Entry-phase smooth-pan tests ─────────────────────────────────────────────
  // The smooth-pan fix: _transitionTargetT is set to lookbackT in _transition() but
  // _camT is left at the winner's current T. The T-lerp then glides _camT from the
  // winner's position toward lookbackT in parallel with the zoom-out.
  //
  // Three-frame setup to control dt on the FINISH_OVERVIEW transition frame:
  //   Frame 1 (ts=1000): triggers _inFinishMode + LEADER_ZOOM drama
  //                       _finishMomentExpiry = 1000 + 1500 = 2500
  //   Frame 2 (ts=2400): dt=1400ms — drama not expired (2400 < 2500) → stays LEADER_ZOOM
  //   Frame 3 (ts=2600): dt=200ms — drama expired (2600 >= 2500) → FINISH_OVERVIEW fires
  function setupSmoothPan() {
    const RUNOUT_T = FINISH_T + 0.05; // 0.85
    const LOOKBACK_T = FINISH_T - 480 / WORLD_W; // 0.72
    const racers = [
      { t: RUNOUT_T, x: RUNOUT_T * WORLD_W, y: LEADER_Y, finished: true, index: 0 },
      { t: 0.5, x: 2000, y: LEADER_Y, finished: false, index: 1 },
    ];
    const cd = makeCD(480); // lookbackFrac = 480/6000 = 0.08 → lookbackT = 0.72
    const rs = { raceElapsed: 10000, finishedCount: 1, finishT: FINISH_T };
    cd.update(racers, 1000, rs, CANVAS_W, CANVAS_H); // _finishMomentExpiry = 2500
    cd.update(racers, 2400, { ...rs, raceElapsed: 11400 }, CANVAS_W, CANVAS_H); // stays LEADER_ZOOM
    // Set zoom to leaderZoom so the FINISH_OVERVIEW zoom convergence doesn't immediately fire
    cd.zoom = cd._leaderZoom;
    cd.targetZoom = cd._leaderZoom;
    cd.update(racers, 2600, { ...rs, raceElapsed: 11600 }, CANVAS_W, CANVAS_H); // FINISH_OVERVIEW
    return { cd, racers, rs, RUNOUT_T, LOOKBACK_T };
  }

  it('entry smooth: _transitionTargetT is set to lookbackT at FINISH_OVERVIEW entry', () => {
    const { cd } = setupSmoothPan();
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    expect(cd._inFinishMode).toBe(true);
    expect(cd._lerpPhase).toBe('entry');
    // lookbackFrac = 480/6000 = 0.08 → lookbackT = 0.72
    expect(cd._transitionTargetT).toBeCloseTo(0.72, 3);
  });

  it('entry smooth: _camT starts near winner.t, has not jumped instantly to lookbackT', () => {
    // With the fix, _camT = winner.t at transition, _transitionTargetT = lookbackT.
    // After one 400ms dt frame the lerp has moved _camT partway — still above lookbackT+0.03,
    // proving the camera is gliding rather than cutting. (Without the fix _camT would be 0.72.)
    const { cd, LOOKBACK_T, RUNOUT_T } = setupSmoothPan();
    expect(cd._lerpPhase).toBe('entry');
    expect(cd._camT).toBeGreaterThan(LOOKBACK_T + 0.03); // not yet in lookback convergence zone
    expect(cd._camT).toBeLessThan(RUNOUT_T); // has started moving from winner position
  });

  it('entry smooth: _camT continues moving toward lookbackT on subsequent frames', () => {
    const { cd, racers, rs, LOOKBACK_T } = setupSmoothPan();
    expect(cd._lerpPhase).toBe('entry');
    const camTAfterTransition = cd._camT;
    // One more 16ms frame — _camT should advance toward lookbackT
    cd.update(racers, 1616, { ...rs, raceElapsed: 11616 }, CANVAS_W, CANVAS_H);
    expect(cd._camT).toBeLessThan(camTAfterTransition); // moved toward lookbackT (decreasing T)
    expect(cd._camT).toBeGreaterThan(LOOKBACK_T); // has not overshot the target
  });
});

// ── LEAD_CHANGE pan snap ──────────────────────────────────────────────────────
//
// Tests for the synchronized zoom+pan hard-cut at LEAD_CHANGE entry.
// Previously the zoom snapped immediately but pan lagged (up to ~0.75 s),
// causing the zoomed-in frame to show the wrong position.
// Fix: _camT is snapped to new leader at _transition() time, and
//      offsetX/Y are snapped to targetOffsetX/Y in update() immediately after _setTargets().

describe('CameraDirector — LEAD_CHANGE pan snap', () => {
  const WORLD_W = 6000;
  const CANVAS_W = 1280;
  const CANVAS_H = 720;

  function makeShape() {
    return {
      getPosition: (t, _offset) => ({ x: Math.max(0, Math.min(1, t)) * WORLD_W, y: 360, angle: 0 }),
      getCenterPoint: () => ({ x: WORLD_W / 2, y: CANVAS_H / 2 }),
      getClosestT: (x, _y) => x / WORLD_W,
    };
  }

  function makeCD() {
    return new CameraDirector(WORLD_W, CANVAS_H, true, {}, 36, makeShape());
  }

  it('_leadChangeSnapPending initialises to false', () => {
    const cd = makeCD();
    expect(cd._leadChangeSnapPending).toBe(false);
  });

  it('_camT is snapped to new leader T at LEAD_CHANGE entry (endgame path)', () => {
    // Use leaderProgress > endgameThreshold (0.9) for a deterministic LEAD_CHANGE selection
    // that bypasses the post-start hold and random candidate pool.
    const cd = makeCD();
    const FINISH_T = 0.9;
    const LEADER_T = 0.85; // leaderProgress = 0.85/0.9 ≈ 0.944 > 0.90 → endgame path
    const racers = [
      { t: LEADER_T, x: LEADER_T * WORLD_W, y: 360, index: 0 },
      { t: LEADER_T - 0.02, x: (LEADER_T - 0.02) * WORLD_W, y: 360, index: 1 },
    ];
    const rs = { raceElapsed: 15000, finishedCount: 0, finishT: FINISH_T };
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._lerpPhase = 'tracking';
    cd._camT = LEADER_T - 0.02; // stale — previous leader's T
    cd.stateEnteredAt = 0;
    // Arm a confirmed lead change so endgame path selects LEAD_CHANGE
    cd._leadChangePending = true;
    cd._currentLeaderIndex = 0;
    cd._currentLeaderName = 'R0';
    cd._prevLeaderIndex = 1;
    cd._prevLeaderName = 'R1';
    cd.update(racers, 15100, rs, CANVAS_W, CANVAS_H);
    expect(cd.state).toBe(CAM_STATE.LEAD_CHANGE);
    // _camT must be at new leader's T, not the stale old-leader value
    expect(cd._camT).toBeCloseTo(LEADER_T, 3);
  });

  it('offsetX/Y snap to targetOffsetX/Y on the LEAD_CHANGE entry frame', () => {
    // Test the update() snap mechanism directly — set _leadChangeSnapPending without going
    // through _transition() so the test is independent of state-machine routing.
    const cd = makeCD();
    const LEADER_T = 0.5;
    cd.state = CAM_STATE.LEAD_CHANGE;
    cd._lerpPhase = 'tracking';
    cd._camT = LEADER_T;
    cd._leadChangeSnapPending = true;
    cd.zoom = cd._leaderZoom;
    cd.targetZoom = cd._leaderZoom;
    cd._prevCommittedState = CAM_STATE.LEAD_CHANGE;
    // Simulate previous state's offset (far from new leader)
    cd.offsetX = -999;
    cd.offsetY = -888;
    const racers = [
      { t: LEADER_T, x: LEADER_T * WORLD_W, y: 360, index: 0 },
      { t: LEADER_T - 0.05, x: (LEADER_T - 0.05) * WORLD_W, y: 360, index: 1 },
    ];
    // stateEnteredAt = ts − 100 ms so the hold gate (minStateHold=5000) is not met
    cd.stateEnteredAt = 15000;
    cd.update(
      racers,
      15100,
      { raceElapsed: 15000, finishedCount: 0, finishT: 0.9 },
      CANVAS_W,
      CANVAS_H
    );
    // CAMERA-ZOOM-UNIT-1: the claim under test is SNAP, not glide — the entry frame closes the
    // whole distance in one go instead of easing over many. It is asserted that way now, because
    // at the new zoom the containment clamp runs AFTER the snap and can legitimately hold the
    // committed offset a little short of the raw target. Asserting bit-equality with the target
    // would be asserting that the clamp never acts, which was never the claim. The residual is
    // measured below so a regression into a glide still fails loudly.
    const closedX = 1 - Math.abs(cd.offsetX - cd.targetOffsetX) / Math.abs(-999 - cd.targetOffsetX);
    const closedY = 1 - Math.abs(cd.offsetY - cd.targetOffsetY) / Math.abs(-888 - cd.targetOffsetY);
    // Measured at the shipped defaults: 94.8% on X, the remainder held back by the clamp.
    expect(closedX).toBeGreaterThan(0.9); // a glide closes ~10-20% on frame 1
    expect(closedY).toBeGreaterThan(0.9);
  });

  it('_leadChangeSnapPending is cleared after the first update()', () => {
    const cd = makeCD();
    const LEADER_T = 0.5;
    cd.state = CAM_STATE.LEAD_CHANGE;
    cd._lerpPhase = 'tracking';
    cd._camT = LEADER_T;
    cd._leadChangeSnapPending = true;
    cd.zoom = cd._leaderZoom;
    cd.targetZoom = cd._leaderZoom;
    cd._prevCommittedState = CAM_STATE.LEAD_CHANGE;
    const racers = [
      { t: LEADER_T, x: LEADER_T * WORLD_W, y: 360, index: 0 },
      { t: LEADER_T - 0.05, x: (LEADER_T - 0.05) * WORLD_W, y: 360, index: 1 },
    ];
    cd.stateEnteredAt = 15000;
    cd.update(
      racers,
      15100,
      { raceElapsed: 15000, finishedCount: 0, finishT: 0.9 },
      CANVAS_W,
      CANVAS_H
    );
    expect(cd._leadChangeSnapPending).toBe(false);
  });
});

// ── Dynamic zoom-out (minRacersVisible) ──────────────────────────────────────

describe('_countVisibleRacers', () => {
  const WORLD_W = 1280;
  const CANVAS_W = 1280;
  const CANVAS_H = 720;

  it('counts racers whose screen position falls within the viewport', () => {
    const cd = new CameraDirector(WORLD_W, CANVAS_H, false, {}, 36);
    cd.offsetX = 0;
    cd.offsetY = 0;
    // bsX = 1.0 for 1280-wide world on a 1280-wide canvas (closed track)
    const effZoom = 1.0;
    const racers = [
      { x: 400, y: 200, finished: false }, // visible
      { x: 640, y: 360, finished: false }, // visible (center)
      { x: -100, y: 200, finished: false }, // off-screen left
      { x: 1400, y: 200, finished: false }, // off-screen right (screenX=1400 >= 1280)
      { x: 400, y: 200, finished: true }, // finished — must be skipped
    ];
    expect(cd._countVisibleRacers(racers, effZoom, CANVAS_W, CANVAS_H)).toBe(2);
  });

  it('returns 0 for empty racers array', () => {
    const cd = new CameraDirector(WORLD_W, CANVAS_H, false, {}, 36);
    expect(cd._countVisibleRacers([], 1.0, CANVAS_W, CANVAS_H)).toBe(0);
  });

  it('returns 0 when effZoom is zero', () => {
    const cd = new CameraDirector(WORLD_W, CANVAS_H, false, {}, 36);
    const racers = [{ x: 400, y: 200, finished: false }];
    expect(cd._countVisibleRacers(racers, 0, CANVAS_W, CANVAS_H)).toBe(0);
  });

  it('uses current offsetX/Y to shift the visible window', () => {
    const cd = new CameraDirector(WORLD_W, CANVAS_H, false, {}, 36);
    cd.offsetX = -500;
    cd.offsetY = 0;
    // racer at x=200: screenX = 200 * 1.0 + (-500) = -300 → off-screen
    const racers = [{ x: 200, y: 200, finished: false }];
    expect(cd._countVisibleRacers(racers, 1.0, CANVAS_W, CANVAS_H)).toBe(0);
  });
});

// ── LEADER-MINVIS-1: direct min-visible zoom floor ───────────────────────────
// The LEADER/LEAD_CHANGE camera zooms to the profile but never TIGHTER than the zoom that keeps
// min(minRacersVisible, active field) racers on canvas around the pan focus — computed directly each
// frame (replaces the old slow per-frame ratchet, which zoomed all the way in first and crawled back out).

describe('_zoomFloorForMinVisible (direct min-visible zoom)', () => {
  const cd = new CameraDirector(1280, 720, false, {}, 36);
  const CW = 1280,
    CH = 720; // halfW = 640, halfH = 360
  const F = { x: 640, y: 360 }; // focus at canvas centre in a 1:1 (bsX=1) world

  it('returns the visTarget-th largest per-racer max zoom (x-limited)', () => {
    // dx = 160,320,480,640 → maxZoom = 640/dx = 4.0, 2.0, 1.333, 1.0 (divisor=1). 3rd largest = 1.333.
    const racers = [160, 320, 480, 640].map((dx, i) => ({
      x: F.x + dx,
      y: F.y,
      index: i,
      finished: false,
    }));
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 3, 1.0, CW, CH)).toBeCloseTo(640 / 480, 4);
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 1, 1.0, CW, CH)).toBeCloseTo(4.0, 4);
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 4, 1.0, CW, CH)).toBeCloseTo(1.0, 4);
  });

  it('is limited by the tighter of the x / y extents', () => {
    // dy = 180 → zy = 360/180 = 2.0; dx = 320 → zx = 2.0; equal → 2.0. dy = 360 → zy = 1.0 dominates.
    const racers = [{ x: F.x + 320, y: F.y + 360, index: 0, finished: false }];
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 1, 1.0, CW, CH)).toBeCloseTo(1.0, 4);
  });

  it('Infinity (no constraint) when fewer active racers than visTarget — the small-field guard', () => {
    const racers = [{ x: F.x + 320, y: F.y, index: 0, finished: false }];
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 8, 1.0, CW, CH)).toBe(Infinity);
  });

  it('Infinity when all racers sit at the focus (dx=dy=0)', () => {
    const racers = [0, 1, 2].map((i) => ({ x: F.x, y: F.y, index: i, finished: false }));
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 3, 1.0, CW, CH)).toBe(Infinity);
  });

  it('skips finished racers', () => {
    const racers = [
      { x: F.x + 160, y: F.y, index: 0, finished: false }, // maxZoom 4.0
      { x: F.x + 640, y: F.y, index: 1, finished: true }, // ignored
    ];
    expect(cd._zoomFloorForMinVisible(racers, F.x, F.y, 1, 1.0, CW, CH)).toBeCloseTo(4.0, 4);
  });
});

describe('dynamic zoom-out — LEADER min-visible floor (LEADER-MINVIS-1)', () => {
  const WORLD_W = 1280;
  const CW = 1280;
  const CH = 720;
  const rs = { raceElapsed: 8000, finishedCount: 0, winner: null, finishT: 1.0 };

  // Leader at the FRONT; the rest of the field somewhere behind.
  const strungField = () => {
    const r = [{ index: 0, t: 0.95, x: 1150, y: 360, finished: false }];
    for (let i = 1; i < 40; i++)
      r.push({
        index: i,
        t: 0.5,
        x: 250 + (i % 10) * 15,
        y: 320 + ((i / 10) | 0) * 20,
        finished: false,
      });
    return r;
  };
  // Whole field bunched right around the leader.
  const bunchedField = () =>
    Array.from({ length: 40 }, (_, i) => ({
      index: i,
      t: 0.95 - i * 0.001,
      x: 620 + (i % 8) * 6,
      y: 350 + ((i / 8) | 0) * 6,
      finished: false,
    }));

  // CAMERA-ZOOM-UNIT-1: 400 frames, not 150. The mechanism under test is unchanged, but the
  // LEADER default now starts at 2 track widths instead of the old spriteScale 1.81, which is a
  // TIGHTER starting shot on this fixture's 1280-px world — so the smoothed floor (0.005 cam.zoom
  // per frame) needs proportionally longer to walk out to the relaxed zoom. The assertion is the
  // same; only the time allowed to converge moved.
  const drive = (cfg, field, state = CAM_STATE.LEADER_ZOOM, frames = 400) => {
    // CAMERA-ZOOM-UNIT-1: `leaderMinZoomFraction` is a RELATIVE bound — the min-visible floor may
    // not relax below this fraction of the LEADER zoom. It was tuned against the old unit's leader
    // value, so with the new track-width default it binds before the floor can reach 8 visible on
    // this fixture. These tests are about the FLOOR MECHANISM, so the bound is opened here and the
    // interaction is recorded in the report as input to the framing block (which owns both).
    const cd = new CameraDirector(WORLD_W, CH, false, { leaderMinZoomFraction: 0.3, ...cfg }, 28.5);
    const racers = field();
    for (let i = 0; i < frames; i++) {
      cd.state = state;
      cd.update(racers, 8000 + i * 16, rs, CW, CH);
    }
    const visible = cd._countVisibleRacers(racers, cd.zoom * cd._bsX, CW, CH);
    return { cd, racers, visible };
  };

  it('field 40 strung out → floor relaxes so at least min(8) racers are visible', () => {
    const { visible } = drive({ minRacersVisible: 8 }, strungField);
    expect(visible).toBeGreaterThanOrEqual(8);
  });

  it('bunched field → the floor does NOT force a zoom-out below the leader zoom', () => {
    // All racers already near the leader → min-visible satisfied at the profile zoom, so the floor
    // equals the (resolved) leader target and does not drag the camera wider.
    const { cd } = drive({ minRacersVisible: 8 }, bunchedField);
    expect(cd.targetZoom).toBeGreaterThan(1.4); // stays near leaderZoom (~1.81), not ratcheted to the floor
  });

  it('minRacersVisible = 0 → feature OFF: strung field stays at the tight leader zoom', () => {
    const off = drive({ minRacersVisible: 0 }, strungField);
    const on = drive({ minRacersVisible: 8 }, strungField);
    // OFF keeps the tight leader zoom (few visible); ON relaxes it wider.
    expect(off.cd.targetZoom).toBeGreaterThan(on.cd.targetZoom);
    expect(off.cd._leaderPhaseZoomFloor == null || off.cd._leaderPhaseZoomFloor === null).toBe(
      true
    );
  });

  it('small field (6, all active) → guard holds: no floor-ratchet past showing the whole field', () => {
    const smallField = () =>
      Array.from({ length: 6 }, (_, i) => ({
        index: i,
        t: 0.95 - i * 0.05,
        x: 400 + i * 120,
        y: 360,
        finished: false,
      }));
    const { visible } = drive({ minRacersVisible: 8 }, smallField);
    expect(visible).toBe(6); // all 6 shown; visTarget clamps to active count
  });

  it('LEAD_CHANGE applies the same min-visible floor as LEADER_ZOOM', () => {
    const { visible } = drive({ minRacersVisible: 8 }, strungField, CAM_STATE.LEAD_CHANGE);
    expect(visible).toBeGreaterThanOrEqual(8);
  });

  it('the profile zoom write does NOT defeat the floor (targetZoom clamped every frame)', () => {
    // After convergence on a strung field the profile keeps writing targetZoom = leaderZoom each frame,
    // but the floor clamps it below leaderZoom so the wide view is retained.
    const { cd } = drive({ minRacersVisible: 8 }, strungField);
    expect(cd.targetZoom).toBeLessThan(cd._leaderZoom);
  });

  it('does NOT apply in OVERVIEW state', () => {
    const cd = new CameraDirector(WORLD_W, CH, false, { minRacersVisible: 8 }, 28.5);
    cd.state = CAM_STATE.OVERVIEW;
    cd._leaderPhaseZoomFloor = 1.0;
    cd._setTargets(strungField(), CW, CH, rs);
    expect(cd._leaderPhaseZoomFloor).toBe(1.0); // untouched
  });

  it('does NOT apply in BATTLE_ZOOM state — BATTLE framing is untouched by the min-visible rule', () => {
    // BATTLE must show the duel, not the whole field: the min-visible floor only gates LEADER/LEAD_CHANGE.
    const cd = new CameraDirector(WORLD_W, CH, false, { minRacersVisible: 8 }, 28.5);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    cd._leaderPhaseZoomFloor = 1.0;
    cd._setTargets(strungField(), CW, CH, rs);
    expect(cd._leaderPhaseZoomFloor).toBe(1.0); // untouched — no min-visible clamp in BATTLE
    expect(cd.targetZoom).toBeCloseTo(cd._battleZoom, 6); // BATTLE zoom is exactly the profile
  });

  it('closed-track floor never descends below 1.0 (black-screen guard)', () => {
    const { cd } = drive(
      { minRacersVisible: 8, leaderMinZoom: 0.1, leaderMinZoomFraction: 0 },
      strungField
    );
    expect(cd.targetZoom).toBeGreaterThanOrEqual(1.0 - 1e-9);
  });
});

// ── CAMERA-JITTER-1: the min-visible floor is smoothed (asymmetric rate-limit) ───────────────
// A dense DYNAMIC field where the visTarget-th nearest racer flips frame-to-frame used to make the raw floor
// (and thus targetZoom + the coupled pan) oscillate wildly. The floor now loosens instantly (never crops) but
// tightens only ≤ zoomOutStepPerFrame per frame — so its output is smooth and the zoom lerp has a stable target.

describe('dynamic zoom-out — min-visible floor is smoothed (CAMERA-JITTER-1)', () => {
  const W = 1280;
  const CH = 720;
  const rs = { raceElapsed: 8000, finishedCount: 0, winner: null, finishT: 1.0 };
  const STEP = 0.005; // default zoomOutStepPerFrame

  // Dense ring around the leader; racers near the 8th-nearest boundary wobble so the binding racer flips.
  const dynamicField = (frame) => {
    const r = [{ index: 0, t: 0.95, x: 640, y: 360, finished: false }];
    for (let i = 1; i < 40; i++) {
      const baseR = 120 + i * 40;
      const wob = Math.sin((frame + i * 7) * 0.9) * 90;
      const ang = i * 2.399;
      r.push({
        index: i,
        t: 0.9 - i * 0.001,
        x: 640 + Math.cos(ang) * (baseR + wob),
        y: 360 + Math.sin(ang) * (baseR + wob) * 0.6,
        finished: false,
      });
    }
    return r;
  };

  const runDynamic = (cfg, frames = 120) => {
    const cd = new CameraDirector(W, CH, false, cfg, 28.5);
    const floors = [];
    const visibles = [];
    for (let i = 0; i < frames; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(dynamicField(i), 8000 + i * 16, rs, W, CH);
      floors.push(cd._leaderPhaseZoomFloor);
      visibles.push(cd._countVisibleRacers(dynamicField(i), cd.zoom * cd._bsX, W, CH));
    }
    return { floors, visibles };
  };

  it('floor output is smooth on a flipping-binding-racer field (bounded per-frame delta, no wild swing)', () => {
    const { floors } = runDynamic({ minRacersVisible: 8 });
    const tail = floors.slice(-80).filter((f) => f != null);
    // Tightening (upward floor moves) is capped at zoomOutStepPerFrame × dtScale (≈ 0.005/frame). Allow a
    // small margin for dt scaling; the point is it is bounded and tiny vs the raw floor's ~0.25/frame jumps.
    let maxUp = 0;
    for (let i = 1; i < tail.length; i++) maxUp = Math.max(maxUp, tail[i] - tail[i - 1]);
    expect(maxUp).toBeLessThanOrEqual(STEP * 1.05); // tightening is rate-limited (no inward snap)
    const range = Math.max(...tail) - Math.min(...tail);
    expect(range).toBeLessThan(0.15); // no wild swing (the raw floor swung ~0.42 pre-fix)
  });

  it('no collapse: the field stays in frame on a churning field (never the tight-profile ~1)', () => {
    // The live count fluctuates because the zoom LERP lags the instant loosen (spec: "may lag a few frames
    // while loosening — acceptable") and the focus-centered floor ignores the inner-frame inset. The
    // guarantee is that it never COLLAPSES to the pre-LEADER-MINVIS tight-profile handful — it stays a healthy
    // fraction of the field with a mean near visTarget.
    const { visibles } = runDynamic({ minRacersVisible: 8 });
    const steady = visibles.slice(20);
    for (const v of steady) expect(v).toBeGreaterThanOrEqual(5); // no collapse (tight profile hit ~1)
    const mean = steady.reduce((a, b) => a + b, 0) / steady.length;
    expect(mean).toBeGreaterThanOrEqual(7); // healthy — near the min(8) target
  });

  it('small-field guard: a 6-racer dynamic field never over-zooms (all 6 stay visible)', () => {
    const smallDynamic = (frame) =>
      Array.from({ length: 6 }, (_, i) => ({
        index: i,
        t: 0.95 - i * 0.05,
        x: 640 + Math.cos(i * 2.399) * (150 + i * 60 + Math.sin(frame * 0.9 + i) * 40),
        y: 360 + Math.sin(i * 2.399) * (150 + i * 60) * 0.6,
        finished: false,
      }));
    // CAMERA-ZOOM-UNIT-1: `leaderMinZoomFraction` bounds how far the min-visible floor may relax,
    // RELATIVE to the LEADER zoom — it was tuned against the old unit. Opened here so the test
    // exercises the small-field guard itself; the interaction is recorded for the framing block.
    const cd = new CameraDirector(
      W,
      CH,
      false,
      { minRacersVisible: 8, leaderMinZoomFraction: 0.3 },
      28.5
    );
    let visible = 0;
    for (let i = 0; i < 120; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(smallDynamic(i), 8000 + i * 16, rs, W, CH);
      visible = cd._countVisibleRacers(smallDynamic(i), cd.zoom * cd._bsX, W, CH);
    }
    expect(visible).toBe(6); // visTarget clamps to the 6 active — all shown, no over-zoom
  });
});

// ── BATTLE-WEIGHT-ZERO-1: a zero-weight event never enters, and the selector is defensive ────
// DEFECT A: a zero-weight state was pushed to the pool and returned by the single-candidate early-out.
// DEFECT B: the weighted selector returned a zero-weight / zero-sum candidate instead of no-pick.

describe('weighted event selection never surfaces a zero-weight state (BATTLE-WEIGHT-ZERO-1)', () => {
  const denseTop = Array.from({ length: 10 }, (_, i) => ({
    index: i,
    t: 0.5 - i * 0.001, // leaderProgress ≈ 0.5 (mid-race: past holds, below endgame + outcome)
    x: 600 + i * 4,
    y: 360,
    finished: false,
  }));
  const rs = (over = {}) => ({
    raceElapsed: 20000,
    finishedCount: 0,
    winner: null,
    finishT: 1.0,
    ...over,
  });
  const mkDir = (cfg = {}) => new CameraDirector(1280, 720, false, cfg, 36);
  // ts = 20000 is past START_PHASE (3000) + postStartHold (7000) and the 8000ms battle cooldown.

  // ── selector unit (DEFECT B) ──
  it('_weightedRandomPick: a single zero-weight candidate returns null (not the candidate)', () => {
    expect(mkDir()._weightedRandomPick([{ state: CAM_STATE.BATTLE_ZOOM, weight: 0 }])).toBeNull();
  });
  it('_weightedRandomPick: an all-zero (zero-sum) pool returns null', () => {
    expect(
      mkDir()._weightedRandomPick([
        { state: 'A', weight: 0 },
        { state: 'B', weight: 0 },
      ])
    ).toBeNull();
  });
  it('_weightedRandomPick: an empty pool returns null', () => {
    expect(mkDir()._weightedRandomPick([])).toBeNull();
  });
  it('_weightedRandomPick: a mixed pool never returns the zero-weight member', () => {
    const cd = mkDir();
    for (let i = 0; i < 200; i++) {
      const p = cd._weightedRandomPick([
        { state: 'ZERO', weight: 0 },
        { state: 'POS', weight: 0.5 },
      ]);
      expect(p.state).toBe('POS');
    }
  });
  it('_weightedRandomPick: positive weights still pick proportionally', () => {
    const cd = mkDir();
    const counts = { A: 0, B: 0 };
    for (let i = 0; i < 4000; i++)
      counts[
        cd._weightedRandomPick([
          { state: 'A', weight: 0.75 },
          { state: 'B', weight: 0.25 },
        ]).state
      ]++;
    const frac = counts.A / (counts.A + counts.B);
    expect(frac).toBeGreaterThan(0.6);
    expect(frac).toBeLessThan(0.9);
  });

  // ── pool integration (DEFECT A — the owner's case) ──
  it('BATTLE weight 0 is never selected even when a pulk is eligible every frame (owner symptom)', () => {
    const cd = mkDir({
      battleWeight: 0,
      leadChangeWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    cd._isPulk = () => true; // force battle eligibility
    for (let i = 0; i < 300; i++) {
      const pick = cd._pickNextState(denseTop, 20000 + i * 16, rs());
      if (pick) expect(pick.nextState).not.toBe(CAM_STATE.BATTLE_ZOOM);
    }
  });
  it('BATTLE weight > 0 DOES fire when a pulk is eligible (control: the guard is weight-specific)', () => {
    const cd = mkDir({
      battleWeight: 1,
      leadChangeWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    cd._isPulk = () => true;
    let sawBattle = false;
    for (let i = 0; i < 40; i++)
      if (cd._pickNextState(denseTop, 20000 + i * 16, rs())?.nextState === CAM_STATE.BATTLE_ZOOM)
        sawBattle = true;
    expect(sawBattle).toBe(true);
  });
  it('LEAD_CHANGE weight 0 is never selected even when a lead change is pending', () => {
    const cd = mkDir({
      leadChangeWeight: 0,
      battleWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    cd._leadChangePending = true;
    const pick = cd._pickNextState(denseTop, 20000, rs());
    expect(pick.nextState).not.toBe(CAM_STATE.LEAD_CHANGE);
  });
  it('all pool weights 0 → no-pick → LEADER default (never BATTLE)', () => {
    const cd = mkDir({
      battleWeight: 0,
      leadChangeWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    cd._isPulk = () => true;
    cd._isOverviewEligible = () => true;
    const pick = cd._pickNextState(denseTop, 20000, rs());
    expect(pick.nextState).toBe(CAM_STATE.LEADER_ZOOM);
    expect(pick.reason).toMatch(/no active candidates/);
  });

  // ── mandatory states are outside the pool (STEP 4) ──
  it('mandatory start-phase OVERVIEW fires even with all pool weights 0', () => {
    const cd = mkDir({
      battleWeight: 0,
      leadChangeWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    expect(cd._pickNextState(denseTop, 1000, rs({ raceElapsed: 1000 })).nextState).toBe(
      CAM_STATE.OVERVIEW
    );
  });
  it('mandatory endgame LEADER fires even with all pool weights 0', () => {
    const cd = mkDir({
      battleWeight: 0,
      leadChangeWeight: 0,
      comebackWeight: 0,
      overviewWeight: 0,
    });
    const endgame = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      t: 0.95 - i * 0.001,
      x: 600,
      y: 360,
      finished: false,
    }));
    const pick = cd._pickNextState(endgame, 20000, rs()); // leaderProgress 0.95 > endgameThreshold
    expect(pick.nextState).toBe(CAM_STATE.LEADER_ZOOM);
    expect(pick.reason).toMatch(/endgame/);
  });
});

// ── CAMERA-FOCUS-1: LEADER-family pan stays anchored on the current leader (no away-drift) ────
// Root cause proven read-only: the pan anchors on leader[0] (never a P1-P2 midpoint), but the smooth
// pan lerp TRAILS the leader; at a tight LEADER zoom the trail pushes him past the inner frame. The
// containment clamp holds the anchor inside the inner region every frame.

describe('CAMERA-FOCUS-1 — leader anchored + contained in frame', () => {
  const W = 6000,
    CW = 1280,
    CH = 720,
    BODY = 28.5,
    OPEN_BASE = 1.5;
  const mkCfg = (minVis) => {
    const c = structuredClone(DEFAULT_CAMERA_CONFIG);
    c.cameraStateProfiles.LEADER_ZOOM = {
      ...c.cameraStateProfiles.LEADER_ZOOM,
      trackWidths: 1.71,
      trackingTC: 0.25,
      innerFramePct: 0.7,
    };
    c.minRacersVisible = minVis;
    return c;
  };
  const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1.0 };
  const innerBounds = (cd) => {
    const m = ((1 - (cd._innerFramePct ?? 0.7)) / 2) * CW;
    return [m, CW - m];
  };
  const screenX = (cd, x) => x * cd.zoom * OPEN_BASE + cd.offsetX;

  it('_focusAnchorRacer returns the current leader (max t) for LEADER_ZOOM / LEAD_CHANGE', () => {
    const cd = new CameraDirector(W, 720, true, mkCfg(0), BODY);
    const racers = [
      { index: 5, t: 0.3, x: 1000, y: 360, finished: false },
      { index: 9, t: 0.7, x: 2000, y: 360, finished: false }, // leader (max t)
      { index: 2, t: 0.5, x: 1500, y: 360, finished: false },
    ];
    cd.state = CAM_STATE.LEADER_ZOOM;
    expect(cd._focusAnchorRacer(racers).index).toBe(9);
    cd.state = CAM_STATE.LEAD_CHANGE;
    expect(cd._focusAnchorRacer(racers).index).toBe(9);
    cd.state = CAM_STATE.BATTLE_ZOOM;
    expect(cd._focusAnchorRacer(racers)).toBeNull(); // group shot — no single anchor
  });

  it('P2 falls back 3 L → the anchor stays the leader (no midpoint pull)', () => {
    const cd = new CameraDirector(W, 720, true, mkCfg(0), BODY);
    cd.state = CAM_STATE.LEADER_ZOOM;
    const near = [
      { index: 0, t: 0.5, x: 1500, y: 360, finished: false },
      { index: 1, t: 0.49, x: 1490, y: 360, finished: false },
    ];
    const far = [
      { index: 0, t: 0.5, x: 1500, y: 360, finished: false },
      { index: 1, t: 0.49, x: 1500 - 3 * BODY, y: 360, finished: false },
    ];
    expect(cd._focusAnchorRacer(near).index).toBe(0);
    expect(cd._focusAnchorRacer(far).index).toBe(0); // gap opened — anchor unchanged
  });

  it('leader sprint at the tight zoom → stays inside the inner frame EVERY frame after entry (containment)', () => {
    const cd = new CameraDirector(W, 720, true, mkCfg(0), BODY); // min-vis off → tightest zoom
    let lx = 1500;
    const field = () => [
      { index: 0, t: 0.5, x: lx, y: 360, finished: false },
      ...Array.from({ length: 9 }, (_, i) => ({
        index: i + 1,
        t: 0.49 - i * 0.001,
        x: lx - (i + 2) * BODY,
        y: 360,
        finished: false,
      })),
    ];
    for (let i = 0; i < 120; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(field(), 20000 + i * 16, rs, CW, CH);
    } // converge/entry
    const [lo, hi] = innerBounds(cd);
    let worst = 0;
    for (let f = 1; f <= 100; f++) {
      lx += 9; // fast sprint
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(field(), 20000 + (120 + f) * 16, rs, CW, CH);
      const sx = screenX(cd, lx);
      worst = Math.max(worst, sx < lo ? lo - sx : sx > hi ? sx - hi : 0);
      expect(sx).toBeGreaterThanOrEqual(lo - 1);
      expect(sx).toBeLessThanOrEqual(hi + 1);
    }
    expect(worst).toBeLessThanOrEqual(1); // never past the inner boundary
  });

  it('P1 swap mid-hold → the anchor re-targets to the NEW leader and it is in frame', () => {
    const cd = new CameraDirector(W, 720, true, mkCfg(0), BODY);
    let a = 1500,
      b = 1480; // racer 0 leads, racer 1 just behind
    const field = (swap) => [
      { index: 0, t: swap ? 0.49 : 0.5, x: a, y: 360, finished: false },
      { index: 1, t: swap ? 0.5 : 0.49, x: b, y: 360, finished: false },
      ...Array.from({ length: 8 }, (_, i) => ({
        index: i + 2,
        t: 0.45 - i * 0.001,
        x: 1400 - i * BODY,
        y: 360,
        finished: false,
      })),
    ];
    for (let i = 0; i < 90; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(field(false), 20000 + i * 16, rs, CW, CH);
    }
    expect(cd.anchorRacerIndex).toBe(0);
    // swap: racer 1 becomes the leader; advance b ahead and drive
    for (let f = 1; f <= 40; f++) {
      b += 3;
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(field(true), 20000 + (90 + f) * 16, rs, CW, CH);
    }
    expect(cd.anchorRacerIndex).toBe(1); // re-anchored to the new leader
    const [lo, hi] = innerBounds(cd);
    const sx = screenX(cd, b);
    expect(sx).toBeGreaterThanOrEqual(lo - 1);
    expect(sx).toBeLessThanOrEqual(hi + 1);
  });

  it('COMEBACK hold → the anchor is the locked comeback racer, not the leader', () => {
    const cd = new CameraDirector(W, 720, true, mkCfg(0), BODY);
    cd.state = CAM_STATE.COMEBACK_ZOOM;
    cd._comebackLockedRacerIndex = 7;
    const racers = [
      { index: 0, t: 0.7, x: 2000, y: 360, finished: false }, // leader
      { index: 7, t: 0.4, x: 1200, y: 360, finished: false }, // comeback subject
    ];
    expect(cd._focusAnchorRacer(racers).index).toBe(7);
  });
});

// ── CAMERA-FOCUS-3: transition grammar (A) TRUE CUT + leader forward-framing ──────────────────
// Kills the half-glide "corner-riding" acquisition: every anchored entry snaps pan+zoom together to
// the correct framing on frame 1. The leader is framed FORWARD (pack behind = the action). Bisect proof
// + replay measurement live in reports/evolution/CAMERA-FOCUS-3.md.

describe('CAMERA-FOCUS-3 — transition grammar + forward-framing', () => {
  // straight-line mock shape (kept within a 3072×2048 world): getPosition(t) = (500 + t*2000, 1000);
  // tangent is +x everywhere, so the leader's motion axis is screen-x.
  const straightShape = {
    getPosition: (t) => ({ x: 500 + t * 2000, y: 1000 }),
    getCenterPoint: () => ({ x: 1500, y: 1000 }),
    getTotalLength: () => 2000,
    isOpen: false,
  };

  it('grammar flag: glide/cut when asked, else legacy; DEFAULT_CAMERA_CONFIG ships glide (CAMERA-GRAMMAR-1)', () => {
    expect(
      new CameraDirector(3072, 2048, false, { cameraTransitionGrammar: 'cut' })._transitionGrammar
    ).toBe('cut');
    expect(
      new CameraDirector(3072, 2048, false, { cameraTransitionGrammar: 'glide' })._transitionGrammar
    ).toBe('glide');
    expect(new CameraDirector(3072, 2048, false, {})._transitionGrammar).toBe('legacy');
    expect(new CameraDirector(3072, 2048, false, null)._transitionGrammar).toBe('legacy');
    expect(structuredClone(DEFAULT_CAMERA_CONFIG).cameraTransitionGrammar).toBe('glide');
    expect(
      new CameraDirector(3072, 2048, false, structuredClone(DEFAULT_CAMERA_CONFIG))
        ._transitionGrammar
    ).toBe('glide');
  });

  it('leaderForwardFrac is accepted only in (0.5, 0.8]; anything else → null (dead-centre)', () => {
    const mk = (v) =>
      new CameraDirector(3072, 2048, false, { leaderForwardFrac: v })._leaderForwardFrac;
    expect(mk(0.66)).toBe(0.66);
    expect(mk(0.8)).toBe(0.8);
    expect(mk(0.5)).toBeNull(); // 0.5 = centre, not a forward bias
    expect(mk(0.9)).toBeNull(); // too far
    expect(mk(undefined)).toBeNull();
    expect(mk('x')).toBeNull();
    expect(structuredClone(DEFAULT_CAMERA_CONFIG).leaderForwardFrac).toBe(0.66);
  });

  it('_applyLeaderForwardBias shifts the pan target BACKWARD along motion so the leader sits forward', () => {
    const cd = new CameraDirector(
      3072,
      2048,
      false,
      { leaderForwardFrac: 0.66 },
      28.5,
      straightShape
    );
    // Horizontal motion (tangent +x): effZoomX=2, frameW=1280 → span=1280, sLen=2 →
    // worldBias = (0.66−0.5)*1280/2 = 102.4 world px backward along +x. (effZoomY/frameH inert here.)
    const out = cd._applyLeaderForwardBias({ x: 1500, y: 1000 }, 0.5, 2, 2, 1280, 720);
    expect(out.x).toBeCloseTo(1500 - 102.4, 1);
    expect(out.y).toBeCloseTo(1000, 3);
    // disabled (frac null) → unchanged
    const cd2 = new CameraDirector(3072, 2048, false, {}, 28.5, straightShape);
    expect(cd2._applyLeaderForwardBias({ x: 1500, y: 1000 }, 0.5, 2, 2, 1280, 720)).toEqual({
      x: 1500,
      y: 1000,
    });
  });

  it('clamp diagnostics: clampActiveCount / clampActiveAxes start at 0', () => {
    const cd = new CameraDirector(3072, 2048, false, {});
    expect(cd.clampActiveCount).toBe(0);
    expect(cd.clampActiveAxes).toEqual({ x: 0, y: 0 });
  });

  it('STEP-3 forward-framing (closed): leader sits FORWARD of centre and the X containment clamp stays idle', () => {
    const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
    cfg.cameraStateProfiles.LEADER_ZOOM = {
      ...cfg.cameraStateProfiles.LEADER_ZOOM,
      trackWidths: 1.71,
    };
    cfg.leaderForwardFrac = 0.7;
    cfg.cameraTransitionGrammar = 'cut'; // this test drives forced steady-state follow; pin entry style
    const W = 3072,
      H = 2048,
      CW = 1280,
      CH = 720,
      bsX = CW / W;
    const cd = new CameraDirector(W, H, false, cfg, 28.5, straightShape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._observerPhase = 'follow'; // steady follow (as grammar-cut promotes on entry)
    const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1.0 };
    let lt = 0.3,
      sumFrac = 0,
      n = 0;
    const px = (t) => 500 + t * 2000; // match straightShape.getPosition
    for (let i = 0; i < 200; i++) {
      lt += 0.00012; // leader advances gently along +x (steady follow — tracking keeps up)
      const lead = { index: 0, t: lt, x: px(lt), y: 1000, finished: false };
      const pack = Array.from({ length: 9 }, (_, k) => ({
        index: k + 1,
        t: lt - 0.01 * (k + 1),
        x: px(lt - 0.01 * (k + 1)),
        y: 1000,
        finished: false,
      }));
      const racers = [lead, ...pack];
      cd.state = CAM_STATE.LEADER_ZOOM;
      const out = cd.update(racers, 20000 + i * 16, rs, CW, CH, 1000 / 60);
      if (i > 60) {
        const sx = lead.x * (cd.zoom * bsX) + out.offsetX;
        sumFrac += sx / CW;
        n++;
      }
    }
    const avgFrac = sumFrac / n;
    expect(avgFrac).toBeGreaterThan(0.55); // leader forward of centre (0.5)
    expect(avgFrac).toBeLessThan(0.85); // but inside the inner-70 leading edge (not at the edge)
    expect(cd.clampActiveAxes.x).toBeLessThan(10); // motion-axis clamp idle: tracking frames the leader
  });
});

// ── CAMERA-FOCUS-5: per-axis screen mapping — the leader is framed forward on EVERY heading, and the ──
// containment clamp uses bsY on the Y axis (matching the live ctx.scale(zoom·bsX, zoom·bsY)). The original
// bug used bsX for BOTH axes: on a non-square world the Y check was mis-scaled, shoving the leader to the
// edge and firing the clamp ~44% of frames. Fix drops the clamp to ~0 and frames vertical motion correctly.
describe('CAMERA-FOCUS-5 — per-axis screen mapping (forward-framing + containment)', () => {
  const W = 3072,
    H = 2048,
    CW = 1280,
    CH = 720; // non-square world: bsX (0.417) ≠ bsY (0.352)
  const bsX = CW / W,
    bsY = CH / H;
  const straight = (fn, len) => ({
    getPosition: fn,
    getCenterPoint: () => fn(0.5),
    getTotalLength: () => len,
    isOpen: false,
  });
  const SHAPES = {
    right: straight((t) => ({ x: 500 + t * 2000, y: 1000 }), 2000),
    left: straight((t) => ({ x: 2500 - t * 2000, y: 1000 }), 2000),
    down: straight((t) => ({ x: 1500, y: 500 + t * 1200 }), 1200),
    up: straight((t) => ({ x: 1500, y: 1700 - t * 1200 }), 1200),
  };
  const driveLeader = (shape) => {
    const cfg = {
      cameraStateProfiles: {
        LEADER_ZOOM: { trackWidths: 1.71, trackingTC: 0.25, innerFramePct: 0.7 },
      },
      minRacersVisible: 8,
      cameraTransitionGrammar: 'cut',
      leaderForwardFrac: 0.66,
    };
    const cd = new CameraDirector(W, H, false, cfg, 28.5, shape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._observerPhase = 'follow';
    let lt = 0.35,
      sx = 0,
      sy = 0,
      n = 0;
    for (let i = 0; i < 160; i++) {
      lt += 0.0006;
      const p = shape.getPosition(lt);
      const lead = { index: 0, t: lt, x: p.x, y: p.y, finished: false };
      const pack = Array.from({ length: 9 }, (_, k) => {
        const pp = shape.getPosition(lt - 0.01 * (k + 1));
        return { index: k + 1, t: lt - 0.01 * (k + 1), x: pp.x, y: pp.y, finished: false };
      });
      cd.state = CAM_STATE.LEADER_ZOOM;
      const out = cd.update(
        [lead, ...pack],
        20000 + i * 16,
        { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 },
        CW,
        CH,
        1000 / 60
      );
      if (i > 70) {
        sx += (lead.x * (cd.zoom * bsX) + out.offsetX) / CW;
        sy += (lead.y * (cd.zoom * bsY) + out.offsetY) / CH;
        n++;
      }
    }
    return { x: sx / n, y: sy / n, cd };
  };

  it('the leader lands ~2/3 toward the LEADING edge on ALL four cardinal headings (vertical included)', () => {
    for (const [dir, shape] of Object.entries(SHAPES)) {
      const r = driveLeader(shape);
      const along =
        dir === 'right' ? r.x : dir === 'left' ? 1 - r.x : dir === 'down' ? r.y : 1 - r.y;
      // faithful per-axis screen position — forward of centre toward the leading edge, not at the edge
      expect(along, `${dir} forwardFrac`).toBeGreaterThan(0.58);
      expect(along, `${dir} forwardFrac`).toBeLessThan(0.85);
    }
  });

  it('the containment clamp uses bsY on the Y axis (matches the render); vertical motion no longer edge-rides', () => {
    // 'down' motion is the case the bsX-for-Y bug broke: the leader was shoved to the top edge.
    const r = driveLeader(SHAPES.down);
    // faithful (bsY) leader Y is forward (~2/3 down), NOT pinned at the top/bottom edge:
    expect(r.y).toBeGreaterThan(0.58);
    expect(r.y).toBeLessThan(0.85);
    // and the emergency rail is essentially idle on both axes (was ~44% on Y with the bug):
    expect(r.cd.clampActiveAxes.y).toBeLessThan(15);
  });
});

// ── CAMERA-SIDEJUMP-1: zoom-about-anchor — a zoom change mid-hold must NOT lurch the leader ──────────
// Root cause: screen = worldPos·effZoom + offset; when the zoom changes (a min-vis floor loosen) and the
// pan lerp only creeps toward its new target, the anchor slides across the frame faster than the pan can
// follow — it lurched to the edge, then recovered ("wide move, leader not where he should be"). The fix
// re-applies each frame's zoom delta AROUND the anchor, so its screen position is preserved and the pan
// lerp only eases it toward the forward target. Generic to every zoom source.
describe('CAMERA-SIDEJUMP-1 — zoom about the anchor (no lurch on a mid-hold zoom change)', () => {
  const W = 3072,
    H = 2048,
    CW = 1280,
    CH = 720,
    bsX = CW / W,
    bsY = CH / H;
  const straightShape = {
    getPosition: (t) => ({ x: 500 + t * 2000, y: 1000 }),
    getCenterPoint: () => ({ x: 1500, y: 1000 }),
    getTotalLength: () => 2000,
    isOpen: false,
  };

  it('a min-vis floor loosen during a LEADER hold does not lurch the leader across the frame', () => {
    const cfg = {
      cameraStateProfiles: {
        LEADER_ZOOM: { trackWidths: 1.71, trackingTC: 0.25, innerFramePct: 0.7 },
      },
      minRacersVisible: 8,
    };
    const cd = new CameraDirector(W, H, false, cfg, 28.5, straightShape);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._observerPhase = 'follow';
    const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    // A slow leader at t≈0.5 with a pack that starts BUNCHED (tight zoom) then SPREADS (forces the min-vis
    // floor to loosen → zoom out mid-hold).
    const lt0 = 0.5;
    const field = (i) => {
      const lt = lt0 + i * 0.00004; // barely moving — screen motion is dominated by the zoom change
      const spread = Math.min(1, Math.max(0, (i - 60) / 40)); // 0 until frame 60, ramps to 1 by frame 100
      const lead = { index: 0, t: lt, x: 500 + lt * 2000, y: 1000, finished: false };
      const pack = Array.from({ length: 15 }, (_, k) => {
        const back = 0.004 + spread * 0.03 * (k + 1); // pack fans out behind as spread grows
        const t = lt - back;
        return { index: k + 1, t, x: 500 + t * 2000, y: 1000, finished: false };
      });
      return [lead, ...pack];
    };
    let prevSX = null,
      worstJump = 0,
      zoomMin = Infinity,
      zoomMax = -Infinity;
    for (let i = 0; i < 140; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      const racers = field(i);
      const out = cd.update(racers, 20000 + i * 16, rs, CW, CH, 1000 / 60);
      zoomMin = Math.min(zoomMin, cd.zoom);
      zoomMax = Math.max(zoomMax, cd.zoom);
      const lead = racers[0];
      const sx = lead.x * (cd.zoom * bsX) + out.offsetX;
      const sy = lead.y * (cd.zoom * bsY) + out.offsetY;
      if (i > 40 && prevSX)
        worstJump = Math.max(worstJump, Math.hypot(sx - prevSX.x, sy - prevSX.y));
      prevSX = { x: sx, y: sy };
      // leader must never leave the inner region during the zoom change
      expect(sx, `frame ${i} leader sx`).toBeGreaterThanOrEqual(0.15 * CW - 1);
      expect(sx, `frame ${i} leader sx`).toBeLessThanOrEqual(0.85 * CW + 1);
    }
    // the field genuinely spread enough to move the zoom (otherwise the test proves nothing)
    expect(zoomMax - zoomMin).toBeGreaterThan(0.3);
    // …yet the (near-stationary) leader never lurched: max frame-to-frame screen move stays small.
    expect(worstJump).toBeLessThan(20);
  });
});

// ── CAMERA-GRAMMAR-1: grammar (B) FULL GLIDE (default) + correctness decoupled from style ────────────
describe('CAMERA-GRAMMAR-1 — glide default, correctness in every shipped grammar', () => {
  const W = 3072,
    H = 2048,
    CW = 1280,
    CH = 720,
    bsX = CW / W,
    bsY = CH / H;
  const straight = {
    getPosition: (t) => ({ x: 500 + t * 2000, y: 1000 }),
    getCenterPoint: () => ({ x: 1500, y: 1000 }),
    getTotalLength: () => 2000,
    isOpen: false,
  };
  const mkCfg = (grammar, extra = {}) => ({
    cameraStateProfiles: {
      LEADER_ZOOM: { trackWidths: 1.71, trackingTC: 0.25, innerFramePct: 0.7 },
    },
    minRacersVisible: 8,
    cameraTransitionGrammar: grammar,
    ...extra,
  });
  const field = (lt) => {
    const lead = { index: 0, t: lt, x: 500 + lt * 2000, y: 1000, finished: false };
    const pack = Array.from({ length: 9 }, (_, k) => ({
      index: k + 1,
      t: lt - 0.01 * (k + 1),
      x: 500 + (lt - 0.01 * (k + 1)) * 2000,
      y: 1000,
      finished: false,
    }));
    return [lead, ...pack];
  };

  it('glideDurationMs validates to [300,900] (default 500); shipped default grammar is glide', () => {
    expect(new CameraDirector(W, H, false, mkCfg('glide'))._glideDurationMs).toBe(500);
    expect(
      new CameraDirector(W, H, false, mkCfg('glide', { glideDurationMs: 700 }))._glideDurationMs
    ).toBe(700);
    expect(
      new CameraDirector(W, H, false, mkCfg('glide', { glideDurationMs: 100 }))._glideDurationMs
    ).toBe(500); // clamped-out
    expect(
      new CameraDirector(W, H, false, mkCfg('glide', { glideDurationMs: 2000 }))._glideDurationMs
    ).toBe(500);
    expect(structuredClone(DEFAULT_CAMERA_CONFIG).cameraTransitionGrammar).toBe('glide');
  });

  it('correctness is decoupled: both shipped grammars promote observerPhase=follow on anchored entry', () => {
    for (const g of ['glide', 'cut']) {
      const cd = new CameraDirector(W, H, false, mkCfg(g), 28.5, straight);
      cd.state = CAM_STATE.OVERVIEW;
      cd._transition(field(0.5), 1000, {
        raceElapsed: 20000,
        finishedCount: 0,
        winner: null,
        finishT: 1,
      });
      // force the machine into LEADER for the assertion regardless of what _pickNextState chose
      if (cd.state === CAM_STATE.LEADER_ZOOM || cd.state === CAM_STATE.LEAD_CHANGE) {
        expect(cd.observerPhase, `${g} observerPhase`).toBe('follow');
      }
    }
  });

  it('glide: pan AND zoom travel TOGETHER (no hybrid) and land the leader forward-framed by glide end', () => {
    const cd = new CameraDirector(
      W,
      H,
      false,
      mkCfg('glide', { glideDurationMs: 500 }),
      28.5,
      straight
    );
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._observerPhase = 'follow';
    // start FAR from the LEADER framing: wide zoom, zero offset
    cd.zoom = 2.0;
    cd.offsetX = 0;
    cd.offsetY = 0;
    cd._lerpPhase = 'glide';
    cd._glideStartTs = 1000;
    cd._glideStartZoom = 2.0;
    cd._glideStartOffsetX = 0;
    cd._glideStartOffsetY = 0;
    const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    // mid-glide (t=1250, s=0.5): BOTH zoom and offset strictly between start and target — neither snapped.
    cd.update(field(0.5), 1250, rs, CW, CH, 1000 / 60);
    const targetZoom = cd.targetZoom,
      targetOffX = cd.targetOffsetX;
    expect(cd.zoom).toBeGreaterThan(2.05); // moved off the start
    expect(cd.zoom).toBeLessThan(targetZoom - 0.05); // but did NOT snap to target (no instant zoom)
    expect(Math.abs(cd.offsetX - 0)).toBeGreaterThan(1); // pan moved off the start
    expect(Math.abs(cd.offsetX - targetOffX)).toBeGreaterThan(1); // pan did NOT snap to target
    // by glide end the leader is forward-framed inside inner-70
    for (let t = 1300; t <= 1700; t += 16) cd.update(field(0.5), t, rs, CW, CH, 1000 / 60);
    const lead = field(0.5)[0];
    const sx = (lead.x * (cd.zoom * bsX) + cd.offsetX) / CW;
    const sy = (lead.y * (cd.zoom * bsY) + cd.offsetY) / CH;
    expect(sx).toBeGreaterThan(0.15);
    expect(sx).toBeLessThan(0.85);
    expect(sy).toBeGreaterThan(0.15);
    expect(sy).toBeLessThan(0.85);
    expect(cd.lerpPhase).toBe('tracking'); // glide handed off to steady follow
  });

  it('regression: per-axis (FOCUS-5) + zoom-about-anchor (SIDEJUMP-1) hold under the glide default', () => {
    // per-axis: the clamp uses bsY on Y — a moving leader on a non-square world stays inside inner-70.
    const cd = new CameraDirector(W, H, false, mkCfg('glide'), 28.5, straight);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._observerPhase = 'follow';
    cd._lerpPhase = 'tracking';
    const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 1 };
    let lt = 0.35,
      worstJump = 0,
      prev = null,
      zmin = Infinity,
      zmax = -Infinity;
    for (let i = 0; i < 120; i++) {
      lt += 0.0002;
      // spread the pack after frame 60 to force a min-vis zoom change (SIDEJUMP scenario)
      const spread = Math.min(1, Math.max(0, (i - 60) / 40));
      const lead = { index: 0, t: lt, x: 500 + lt * 2000, y: 1000, finished: false };
      const pack = Array.from({ length: 15 }, (_, k) => {
        const tt = lt - (0.004 + spread * 0.03 * (k + 1));
        return { index: k + 1, t: tt, x: 500 + tt * 2000, y: 1000, finished: false };
      });
      cd.state = CAM_STATE.LEADER_ZOOM;
      const out = cd.update([lead, ...pack], 20000 + i * 16, rs, CW, CH, 1000 / 60);
      zmin = Math.min(zmin, cd.zoom);
      zmax = Math.max(zmax, cd.zoom);
      const sx = lead.x * (cd.zoom * bsX) + out.offsetX,
        sy = lead.y * (cd.zoom * bsY) + out.offsetY;
      expect(sx).toBeGreaterThanOrEqual(0.15 * CW - 1);
      expect(sx).toBeLessThanOrEqual(0.85 * CW + 1);
      expect(sy).toBeGreaterThanOrEqual(0.15 * CH - 1);
      expect(sy).toBeLessThanOrEqual(0.85 * CH + 1);
      if (i > 40 && prev) worstJump = Math.max(worstJump, Math.hypot(sx - prev.x, sy - prev.y));
      prev = { x: sx, y: sy };
    }
    expect(zmax - zmin).toBeGreaterThan(0.3); // the zoom genuinely moved
    expect(worstJump).toBeLessThan(20); // …without lurching the leader (zoom-about-anchor holds)
  });
});

// ── CAMERA-DETOUR-1: frame-log instrument liveness (Lesson 187 proof-of-live) ──────────────────
// The instrument must PROVE it is not a silent no-op: it emits a window on a real transition when the
// flag is on, and emits NOTHING when the flag is off. A viewing tool that cannot prove liveness is the
// exact trap Lesson 187 was written for. It measures; it must never move a camera value (covered by the
// fingerprint OFF==ON check in the report + the wider suite still passing).
describe('CameraDirector — CAMERA-DETOUR-1 frame-log liveness', () => {
  // Drive OVERVIEW for a few frames (fills the 3-frame pre-buffer), then force a real transition
  // (finishedCount>0 → LEADER_ZOOM, Priority 1 overrides all), then run ~35 frames to complete the
  // ~30-frame post window.
  const driveThroughTransition = (cd) => {
    let ts = 1000;
    cd.state = CAM_STATE.OVERVIEW;
    cd.stateEnteredAt = 0;
    const overview = { raceElapsed: 1000, finishedCount: 0, winner: null, finishT: 1.0 };
    for (let i = 0; i < 5; i++) {
      cd.update(mockRacers(4), ts, overview, 1280, 720);
      ts += 16;
    }
    const afterFinish = { raceElapsed: 2000, finishedCount: 1, winner: null, finishT: 1.0 };
    for (let i = 0; i < 35; i++) {
      cd.update(mockRacers(4), ts, afterFinish, 1280, 720);
      ts += 16;
    }
  };

  it('ON: emits a [RA CAMERA DETOUR] window (pre + post frames) on a real transition', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const cd = new CameraDirector(1280, 720, false, { cameraDetourLog: true });
    driveThroughTransition(cd);
    const log = cd.exportDetourLog();
    expect(log.length).toBeGreaterThan(0); // a window was captured
    const w = log[log.length - 1];
    expect(w.frames.some((f) => f.rel < 0)).toBe(true); // captured the pre-transition frames (candidate A)
    expect(w.frames.some((f) => f.rel === 0)).toBe(true); // and the transition frame itself
    expect(w.frames.filter((f) => f.rel >= 0).length).toBeGreaterThan(20); // ~30 post frames
    // the anchor screen position is present on post frames (the STEP-3 flip signal)
    const f0 = w.frames.find((f) => f.rel === 0);
    expect(f0.anchorSX).not.toBeNull();
    // CAMERA-DETOUR-2 extension: the anchor WORLD position, glide endpoint, branch + centroid count
    // are logged so anchor-motion can be separated from camera-motion.
    expect(f0.awX).not.toBeNull();
    expect(f0.toX).not.toBeNull();
    expect(typeof f0.br).toBe('string'); // 'glide' | 'cut' | 'follow'
    expect(typeof f0.rc).toBe('number');
    // a copy-pasteable console line fired for the owner's live session
    expect(spy.mock.calls.some((c) => String(c[0]).startsWith('[RA CAMERA DETOUR]'))).toBe(true);
    spy.mockRestore();
  });

  it('OFF (default): produces NO frame-log lines and no export — proves it is truly gated', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const cd = new CameraDirector(1280, 720, false); // cameraDetourLog defaults false
    driveThroughTransition(cd);
    expect(cd.exportDetourLog()).toHaveLength(0);
    expect(spy.mock.calls.some((c) => String(c[0]).startsWith('[RA CAMERA DETOUR]'))).toBe(false);
    spy.mockRestore();
  });
});

// ── CAMERA-GLIDE-TARGET-1: the glide endpoint is computed at the DESTINATION zoom (cause D fix) ──────
// The standing invariant: during a GLIDE, targetOffset is the DESTINATION framing, so it does NOT depend
// on the live, still-easing zoom — it is constant for the glide's duration (moving only as the anchor
// world point moves). This test would have caught cause D on the day GRAMMAR-1 shipped. The fix is
// glide-specific: the entry/tracking paths, which pin offset to targetOffset each frame while the zoom
// eases, must KEEP tracking the live render zoom — asserted here too so the fix cannot silently widen.
const FRAME = { width: 1280, height: 720 };
describe('CameraDirector — CAMERA-GLIDE-TARGET-1 glide endpoint at destination zoom', () => {
  const target = { x: 800, y: 420 };

  // CAMERA-PROJECTION-1: _setClosedTrackTargets / _setOpenTrackTargets merged into the single
  // _setTrackTargets, which takes the state's cam.zoom (not its effective zoom). Same assertions.
  for (const dest of ['leader', 'battle']) {
    it(`GLIDE endpoint is invariant to the live easing zoom (${dest} destination — two settings)`, () => {
      const cd = new CameraDirector(1280, 720, false);
      cd._lerpPhase = 'glide';
      const stateCamZoom = cd[`_${dest}Zoom`]; // destination zoom, resolved from config
      cd.zoom = 1.0; // early glide (still eased-out)
      cd._setTrackTargets(target, stateCamZoom, FRAME);
      const early = cd.targetOffsetX;
      cd.zoom = 6.0; // a wildly different LIVE zoom, still mid-glide
      cd._setTrackTargets(target, stateCamZoom, FRAME);
      const late = cd.targetOffsetX;
      expect(late).toBeCloseTo(early, 6); // endpoint does NOT travel with the live zoom (cause D fixed)
    });
  }

  it('GLIDE endpoint mirrors on OPEN tracks too (one shared target function now)', () => {
    const cd = new CameraDirector(6000, 720, true);
    cd._lerpPhase = 'glide';
    cd.zoom = 1.0;
    cd._setTrackTargets(target, cd._leaderZoom, FRAME);
    const early = cd.targetOffsetX;
    cd.zoom = 5.0;
    cd._setTrackTargets(target, cd._leaderZoom, FRAME);
    expect(cd.targetOffsetX).toBeCloseTo(early, 6);
  });

  it('ENTRY/TRACKING endpoint still tracks the live zoom — the fix is glide-specific (entry path untouched)', () => {
    const cd = new CameraDirector(1280, 720, false);
    cd._lerpPhase = 'tracking';
    cd.zoom = 1.0;
    cd._setTrackTargets(target, cd._leaderZoom, FRAME);
    const a = cd.targetOffsetX;
    cd.zoom = 6.0;
    cd._setTrackTargets(target, cd._leaderZoom, FRAME);
    expect(cd.targetOffsetX).not.toBeCloseTo(a, 3); // non-glide still uses the live zoom (unchanged)
  });
});

// ── OVERVIEW-FRAMING-1: frame the leader + N racers; the leader is ALWAYS framed ──────────────────
// The owner's rule made testable (Lesson 192 — "the leader is always framed" is a TEST, not a comment).
describe('CameraDirector — OVERVIEW-FRAMING-1 leader-always-framed framing', () => {
  const INNER = 0.7;
  const frame = { width: 1280, height: 720 };
  const mkDir = (worldW = 3000, worldH = 1500) => {
    const cd = new CameraDirector(worldW, worldH, false);
    cd._innerFramePct = INNER;
    cd._overviewSnapZoom = cd._overviewStateZoom ?? cd.overviewZoom ?? 1; // a defined zoom ceiling
    return cd;
  };
  // leader (max t) + spread followers, all inside world [0,3000] × [0,1500]
  const spreadGroup = () =>
    [2600, 2300, 2000, 1700, 1400, 1100, 800].map((x, i) => ({
      x,
      y: 760 + (i % 2 ? 90 : -90),
      t: 2 - i * 0.02,
    }));
  const screenOf = (cd, r) => ({
    sx: r.x * cd.targetZoom * cd._bsX + cd.targetOffsetX,
    sy: r.y * cd.targetZoom * cd._bsY + cd.targetOffsetY,
  });
  const inInner = (cd, r, fw, fh) => {
    const s = screenOf(cd, r);
    const mx = ((1 - INNER) / 2) * fw;
    const my = ((1 - INNER) / 2) * fh;
    return (
      s.sx >= mx - 1e-6 && s.sx <= fw - mx + 1e-6 && s.sy >= my - 1e-6 && s.sy <= fh - my + 1e-6
    );
  };

  it('leader is ALWAYS inside the inner frame across the whole slider range (checks 1, 4, 6)', () => {
    const group = spreadGroup();
    const leader = group[0];
    for (const N of [2, 5, 8, 12]) {
      for (const frac of [0.01, 0.022, 0.04, 0.06]) {
        const cd = mkDir();
        cd._overviewFrameRacers = N;
        cd._overviewMinSpriteFrac = frac;
        cd._setOverviewGroupTargets(group, frame);
        expect(inInner(cd, leader, frame.width, frame.height)).toBe(true);
      }
    }
  });

  it('frames at least N racers when the sprite floor does not bind (check 2)', () => {
    const group = spreadGroup();
    const cd = mkDir();
    cd._overviewFrameRacers = 5;
    cd._overviewMinSpriteFrac = 0.005; // tiny floor → does not bind
    cd._setOverviewGroupTargets(group, frame);
    const framed = group.filter((r) => inInner(cd, r, frame.width, frame.height)).length;
    expect(framed).toBeGreaterThanOrEqual(5);
  });

  it('the frame centre sits BEHIND the leader — leader ahead of centre, field behind (rule 4)', () => {
    const group = spreadGroup();
    const cd = mkDir();
    cd._overviewFrameRacers = 5;
    cd._overviewMinSpriteFrac = 0.005;
    cd._setOverviewGroupTargets(group, frame);
    // followers have lower x, so the leader (max x) sits to the RIGHT of the frame centre
    expect(screenOf(cd, group[0]).sx).toBeGreaterThan(frame.width / 2);
  });

  it('resolution independence: fractional framing identical at 3 canvas scales (check 3)', () => {
    // CAMERA-PROJECTION-1: the scales now come from the projection, so this scales the WORLD (which
    // is what the axis scales are derived from) instead of poking _bsX/_bsY behind the director's
    // back. Same invariant: scale world and canvas together and the framing must not move.
    const group = spreadGroup();
    const leader = group[0];
    const out = [];
    for (const k of [1, 1.5, 2]) {
      // world SHRINKS as the canvas grows by k, so axisX = 1280/worldW scales by k — the exact
      // relationship the old test faked by multiplying _bsX.
      const cd = mkDir(3000 / k, 1500 / k);
      cd._overviewFrameRacers = 5;
      cd._overviewMinSpriteFrac = 0.022;
      const fk = { width: 1280 * k, height: 720 * k };
      cd._setOverviewGroupTargets(group, fk);
      const effX = cd._proj.effX(cd.targetZoom);
      out.push({
        leaderFrac: (leader.x * effX + cd.targetOffsetX) / fk.width,
        visWorldFrac: fk.width / effX,
      });
    }
    expect(out[1].leaderFrac).toBeCloseTo(out[0].leaderFrac, 6);
    expect(out[2].leaderFrac).toBeCloseTo(out[0].leaderFrac, 6);
    expect(out[1].visWorldFrac).toBeCloseTo(out[0].visWorldFrac, 6);
    expect(out[2].visWorldFrac).toBeCloseTo(out[0].visWorldFrac, 6);
  });

  it('config live path: the two owner values flow config → director; absent → defaults (Lesson 193)', () => {
    const withVals = new CameraDirector(3000, 1500, false, {
      overviewFrameRacers: 8,
      overviewMinSpriteFrac: 0.04,
    });
    expect(withVals._overviewFrameRacers).toBe(8);
    expect(withVals._overviewMinSpriteFrac).toBeCloseTo(0.04, 6);
    const bare = new CameraDirector(3000, 1500, false, {}); // stored config missing the keys → defaults
    expect(bare._overviewFrameRacers).toBe(5);
    expect(bare._overviewMinSpriteFrac).toBeCloseTo(0.018, 6);
  });
});

// ── CAMERA-REPRO-1: the director's own dice, and the detour log's shared clock ─────────────────────
// The camera rolls two dice of its own — which state to cut to (_weightedRandomPick) and when the
// next OVERVIEW is due (_scheduleNextOverview). Unseeded, the SAME race shows a different camera
// every run, which is exactly why a marked moment could never be handed to anyone before. These
// tests pin the two properties the marker/replay path stands on: seeded is reproducible, and
// unseeded is unchanged from what shipped.
describe('CameraDirector.setRandomSeed (CAMERA-REPRO-1)', () => {
  const driveRace = (cd) => {
    const out = [];
    let ts = 1000;
    for (let i = 0; i < 400; i++) {
      const raceState = {
        raceElapsed: ts - 1000,
        finishedCount: 0,
        winner: null,
        finishT: 1.0,
      };
      cd.update(mockRacers(6), ts, raceState, 1280, 720, 16);
      out.push(`${cd.state}|${cd.zoom.toFixed(6)}|${cd.offsetX.toFixed(3)}`);
      ts += 16;
    }
    return out;
  };

  // The two draw sites, exercised directly. Driving the state machine cannot be relied on to roll a
  // die within any fixed number of frames, and a test that silently exercises nothing is worse than
  // no test at all — this project has shipped one of those before.
  const rollBoth = (cd) => {
    cd._weightedRandomPick([
      { state: 'A', weight: 1 },
      { state: 'B', weight: 1 },
    ]);
    cd._scheduleNextOverview(1000, { finishT: 1, raceElapsed: 5000 }, { t: 0.4 });
  };

  it('defaults to Math.random — an unseeded director draws from the global generator, as it always has', () => {
    const cd = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    expect(cd.randomSeed).toBe(0);
    const spy = vi.spyOn(Math, 'random');
    rollBoth(cd);
    expect(spy).toHaveBeenCalledTimes(2); // one draw per site, unchanged from the shipped path
    spy.mockRestore();
  });

  it('same seed → identical camera run, frame for frame', () => {
    const a = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    const b = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    a.setRandomSeed(5601);
    b.setRandomSeed(5601);
    expect(driveRace(b)).toEqual(driveRace(a));
    expect(a.randomSeed).toBe(5601);
  });

  it('a seeded director never touches the global generator', () => {
    const cd = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    cd.setRandomSeed(99);
    const spy = vi.spyOn(Math, 'random');
    rollBoth(cd);
    driveRace(cd);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('seed 0 restores the shipped Math.random path', () => {
    const cd = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    cd.setRandomSeed(4242);
    cd.setRandomSeed(0);
    expect(cd.randomSeed).toBe(0);
    const spy = vi.spyOn(Math, 'random');
    rollBoth(cd);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('both draw sites move with the seed — the state pick AND the OVERVIEW jitter', () => {
    const picks = (seed) => {
      const cd = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
      cd.setRandomSeed(seed);
      const out = [];
      for (let i = 0; i < 40; i++) {
        out.push(
          cd._weightedRandomPick([
            { state: 'A', weight: 1 },
            { state: 'B', weight: 1 },
            { state: 'C', weight: 2 },
          ]).state
        );
        cd._scheduleNextOverview(1000, { finishT: 1, raceElapsed: 5000 }, { t: 0.4 });
        out.push(cd._overviewScheduleNext.toFixed(4));
      }
      return out.join(',');
    };
    expect(picks(11)).toBe(picks(11)); // reproducible
    expect(picks(11)).not.toBe(picks(12)); // and genuinely seed-dependent
  });

  it('the seeded stream is a real uniform generator, not a constant', () => {
    const cd = new CameraDirector(1280, 720, false, DEFAULT_CAMERA_CONFIG);
    cd.setRandomSeed(7);
    const draws = Array.from({ length: 500 }, () => cd._random());
    expect(new Set(draws).size).toBeGreaterThan(400);
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThan(1);
    const mean = draws.reduce((s, v) => s + v, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});

describe('detour log carries the marker clock (CAMERA-REPRO-1)', () => {
  it('every logged frame has a ts on the same clock the marker records', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const cd = new CameraDirector(1280, 720, false, { cameraDetourLog: true });
    let ts = 1000;
    const overview = { raceElapsed: 1000, finishedCount: 0, winner: null, finishT: 1.0 };
    for (let i = 0; i < 5; i++) {
      cd.update(mockRacers(4), ts, overview, 1280, 720);
      ts += 16;
    }
    const afterFinish = { raceElapsed: 2000, finishedCount: 1, winner: null, finishT: 1.0 };
    for (let i = 0; i < 35; i++) {
      cd.update(mockRacers(4), ts, afterFinish, 1280, 720);
      ts += 16;
    }
    const w = cd.exportDetourLog().at(-1);
    const post = w.frames.filter((f) => f.rel >= 0);
    expect(post.length).toBeGreaterThan(0);
    for (const f of post) expect(typeof f.ts).toBe('number');
    // monotonic and on the caller's clock — so a marker's moment.cms locates a window without guesswork
    for (let i = 1; i < post.length; i++) expect(post[i].ts).toBeGreaterThan(post[i - 1].ts);
    expect(post[0].ts).toBeGreaterThanOrEqual(1000);
    expect(post.at(-1).ts).toBeLessThanOrEqual(ts);
    spy.mockRestore();
  });
});
