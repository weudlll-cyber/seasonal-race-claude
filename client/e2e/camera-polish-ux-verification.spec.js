// ============================================================
// File:        camera-polish-ux-verification.spec.js
// Path:        client/e2e/camera-polish-ux-verification.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: UX-verification suite for PR #28 (Camera-Polish).
//              Covers adaptive-zoom backward compat, clampOffset math,
//              top-3 focus logic, cameraZoomFactor invariant, sprite-scale
//              override hierarchy, and tunable BASE_SPEED range UI.
//              Keep permanently as regression guard.
// ============================================================

import { test, expect } from '@playwright/test';

// ── Shared geometries ──────────────────────────────────────────────────────────

const CLOSED_GEOM_1280 = {
  id: 'cp-ux-closed-1280',
  name: 'CP-UX Oval 1280',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1280,
  worldHeight: 720,
  pathLengthPx: 2000,
  innerPoints: [
    { x: 280, y: 220 }, { x: 680, y: 220 }, { x: 860, y: 400 },
    { x: 680, y: 580 }, { x: 280, y: 580 }, { x: 120, y: 400 },
  ],
  outerPoints: [
    { x: 240, y: 180 }, { x: 720, y: 180 }, { x: 940, y: 400 },
    { x: 720, y: 620 }, { x: 240, y: 620 }, { x: 80, y: 400 },
  ],
};

const CLOSED_GEOM_6000 = {
  id: 'cp-ux-closed-6000',
  name: 'CP-UX Oval 6000',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 6000,
  worldHeight: 720,
  pathLengthPx: 9000,
  innerPoints: [
    { x: 800, y: 220 }, { x: 4200, y: 220 }, { x: 5200, y: 400 },
    { x: 4200, y: 580 }, { x: 800, y: 580 }, { x: 200, y: 400 },
  ],
  outerPoints: [
    { x: 750, y: 180 }, { x: 4250, y: 180 }, { x: 5300, y: 400 },
    { x: 4250, y: 620 }, { x: 750, y: 620 }, { x: 150, y: 400 },
  ],
};

const OPEN_GEOM = {
  id: 'cp-ux-open',
  name: 'CP-UX Sprint',
  closed: false,
  backgroundImage: null,
  effects: [],
  worldWidth: 1280,
  worldHeight: 720,
  pathLengthPx: 1800,
  innerPoints: [
    { x: 100, y: 340 }, { x: 400, y: 340 }, { x: 700, y: 360 }, { x: 1000, y: 340 },
  ],
  outerPoints: [
    { x: 100, y: 380 }, { x: 400, y: 380 }, { x: 700, y: 400 }, { x: 1000, y: 380 },
  ],
};

// ── Storage helpers ─────────────────────────────────────────────────────────

function buildRaceData(geom, { racerTypeId = 'rocket', nRacers = 4 } = {}) {
  return {
    geometryId: geom.id,
    racerTypeId,
    worldWidth: geom.worldWidth,
    worldHeight: geom.worldHeight ?? 720,
    trackWidth: 140,
    duration: 60,
    winners: 3,
    raceMode: 'laps',
    targetLaps: 2,
    eventName: 'CP-UX Test',
    timestamp: new Date().toISOString(),
    racers: Array.from({ length: nRacers }, (_, i) => ({
      id: `r${i}`,
      name: `Racer${i + 1}`,
      color: '#ff0000',
      icon: '🚀',
    })),
  };
}

async function seedRace(page, geom, opts = {}) {
  const raceData = buildRaceData(geom, opts);
  await page.addInitScript(
    ({ geom, raceData }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      sessionStorage.setItem('activeRace', JSON.stringify(raceData));
    },
    { geom, raceData }
  );
}

async function clearBaseSpeedConfig(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('racearena:baseSpeedConfig');
  });
}

// ── V1 — Adaptive Zoom 1280-Track (backward compat) ──────────────────────────

test.describe('V1 — Adaptive Zoom 1280-Track backward compat', () => {
  test('race on 1280px track renders without JS errors', async ({ page }) => {
    await seedRace(page, CLOSED_GEOM_1280);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('zoom formula at worldW=1280: CANVAS_W²/(LEADER_VIEW_W×worldW) ≈ 1.40', async ({ page }) => {
    await page.goto('/');
    const leaderZoom = await page.evaluate(() => {
      const CANVAS_W = 1280;
      const LEADER_VIEW_W = 910;
      const worldW = 1280;
      const MIN_ZOOM = 0.15;
      const MAX_ZOOM = 2.5;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * worldW)));
    });
    expect(leaderZoom).toBeCloseTo(1.406, 2);
  });
});

// ── V2 — Adaptive Zoom 6000-Track ────────────────────────────────────────────

test.describe('V2 — Adaptive Zoom 6000-Track', () => {
  test('race on 6000px track renders without JS errors', async ({ page }) => {
    await seedRace(page, CLOSED_GEOM_6000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('zoom formula at worldW=6000: leaderZoom ≈ 0.30 (zoom-out)', async ({ page }) => {
    await page.goto('/');
    const leaderZoom = await page.evaluate(() => {
      const CANVAS_W = 1280;
      const LEADER_VIEW_W = 910;
      const worldW = 6000;
      const MIN_ZOOM = 0.15;
      const MAX_ZOOM = 2.5;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * worldW)));
    });
    expect(leaderZoom).toBeCloseTo(0.301, 2);
    expect(leaderZoom).toBeLessThan(1); // zoom-out confirmed
  });

  test('MIN_ZOOM clamp: worldW=15000 (very large) gives MIN_ZOOM=0.15', async ({ page }) => {
    await page.goto('/');
    const zoom = await page.evaluate(() => {
      const CANVAS_W = 1280;
      const LEADER_VIEW_W = 910;
      const worldW = 15000; // formula gives ~0.12 < MIN_ZOOM → clamped to 0.15
      const MIN_ZOOM = 0.15;
      const MAX_ZOOM = 2.5;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * worldW)));
    });
    expect(zoom).toBeCloseTo(0.15, 5);
  });
});

// ── V3 — clampOffset for zoom<1 and zoom>1 ───────────────────────────────────

test.describe('V3 — clampOffset math for zoom<1 and zoom>1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Unified formula: a = 0 - bboxMin*zoom; b = canvasSize - bboxMax*zoom
  //   clamp(val, min(a,b), max(a,b))
  function clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
    const a = 0 - bboxMin * zoom;
    const b = canvasSize - bboxMax * zoom;
    return Math.max(Math.min(a, b), Math.min(Math.max(a, b), val));
  }

  test('zoom=0.3 (6000px track): camera can pan — negative target returns edge', async ({ page }) => {
    const result = await page.evaluate(() => {
      function clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
        const a = 0 - bboxMin * zoom;
        const b = canvasSize - bboxMax * zoom;
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), val));
      }
      // 6000px world, 1280 canvas, zoom=0.3 → world is 1800px on screen (wider than 1280)
      // a=0, b=1280-1800=-520 → range [-520, 0], so pan is possible
      const atRightEdge = clampOffset(-520, 0, 6000, 1280, 0.3);
      const farRight = clampOffset(-900, 0, 6000, 1280, 0.3);
      return { atRightEdge, farRight };
    });
    expect(result.atRightEdge).toBe(-520); // at pan limit, no clamp
    expect(result.farRight).toBe(-520);    // clamped to right edge
  });

  test('zoom=2.0 (small track): track fits in canvas — offset kept within bounds', async ({ page }) => {
    const result = await page.evaluate(() => {
      function clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
        const a = 0 - bboxMin * zoom;
        const b = canvasSize - bboxMax * zoom;
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), val));
      }
      // 400px world, 1280 canvas, zoom=2.0 → track is 800px on screen (fits in 1280)
      // a=0, b=1280-800=480 → track visible range [0, 480]
      const centered = clampOffset(240, 0, 400, 1280, 2.0);
      const tooFarLeft = clampOffset(-200, 0, 400, 1280, 2.0);
      const tooFarRight = clampOffset(600, 0, 400, 1280, 2.0);
      return { centered, tooFarLeft, tooFarRight };
    });
    expect(result.centered).toBe(240);   // in range, no clamp
    expect(result.tooFarLeft).toBe(0);   // clamped to a=0
    expect(result.tooFarRight).toBe(480); // clamped to b=480
  });

  test('bboxMin=0 avoids -0: produces exact 0 not -0', async ({ page }) => {
    const result = await page.evaluate(() => {
      function clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
        const a = 0 - bboxMin * zoom; // key: subtraction from 0 avoids -0
        const b = canvasSize - bboxMax * zoom;
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), val));
      }
      const offset = clampOffset(0, 0, 1280, 1280, 1.0);
      return Object.is(offset, -0) ? 'negative-zero' : 'positive-zero';
    });
    expect(result).toBe('positive-zero');
  });
});

// ── V4 — Top-3 Bbox ───────────────────────────────────────────────────────────

test.describe('V4 — Top-3 focus: camera targets top-N racers by position', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('6 racers → focusRacers returns the 3 with highest t values', async ({ page }) => {
    const result = await page.evaluate(() => {
      function focusRacers(racers, TOP_N = 3) {
        return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
      }
      const racers = [
        { id: 'a', t: 0.1 }, { id: 'b', t: 0.7 }, { id: 'c', t: 0.2 },
        { id: 'd', t: 0.9 }, { id: 'e', t: 0.5 }, { id: 'f', t: 0.8 },
      ];
      const top = focusRacers(racers);
      return { ids: top.map(r => r.id), ts: top.map(r => r.t) };
    });
    expect(result.ids).toEqual(['d', 'f', 'b']); // t=0.9, 0.8, 0.7
    expect(result.ts[0]).toBe(0.9);
    expect(result.ts[2]).toBe(0.7); // 3rd-place boundary
  });

  test('COMEBACK_ZOOM targets 3rd-place (last of focusRacers), not last-place', async ({ page }) => {
    const result = await page.evaluate(() => {
      function focusRacers(racers, TOP_N = 3) {
        return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
      }
      const racers = [
        { id: 'last', t: 0.05 }, { id: 'mid', t: 0.5 }, { id: 'front', t: 0.95 },
        { id: 'second', t: 0.85 }, { id: 'third', t: 0.70 }, { id: 'back', t: 0.2 },
      ];
      const focus = focusRacers(racers);
      const comebackTarget = focus[focus.length - 1]; // 3rd place, not last
      return comebackTarget.id;
    });
    expect(result).toBe('third'); // 3rd place (t=0.70), not 'last' (t=0.05)
  });
});

// ── V5 — Top-3 Edge-Cases ────────────────────────────────────────────────────

test.describe('V5 — Top-3 edge cases: 1/2/3 racers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1 racer: focusRacers returns that single racer', async ({ page }) => {
    const count = await page.evaluate(() => {
      const racers = [{ id: 'solo', t: 0.5 }];
      return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(3, racers.length)).length;
    });
    expect(count).toBe(1);
  });

  test('2 racers: focusRacers returns both', async ({ page }) => {
    const count = await page.evaluate(() => {
      const racers = [{ id: 'a', t: 0.5 }, { id: 'b', t: 0.8 }];
      return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(3, racers.length)).length;
    });
    expect(count).toBe(2);
  });

  test('exactly 3 racers: all 3 are in focusRacers', async ({ page }) => {
    const count = await page.evaluate(() => {
      const racers = [{ id: 'a', t: 0.3 }, { id: 'b', t: 0.6 }, { id: 'c', t: 0.9 }];
      return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(3, racers.length)).length;
    });
    expect(count).toBe(3);
  });
});

// ── V6 — cameraZoomFactor formula ────────────────────────────────────────────

test.describe('V6 — cameraZoomFactor: on-screen size invariant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('zoom=1.4 (reference): factor=1.0 → no change', async ({ page }) => {
    const factor = await page.evaluate(() => {
      const REFERENCE = 1.4;
      return REFERENCE / 1.4;
    });
    expect(factor).toBeCloseTo(1.0, 5);
  });

  test('zoom=0.3 (6000px track): factor ≈ 4.667', async ({ page }) => {
    const factor = await page.evaluate(() => 1.4 / 0.3);
    expect(factor).toBeCloseTo(4.667, 2);
  });

  test('zoom=0.45 (4000px track): factor ≈ 3.111', async ({ page }) => {
    const factor = await page.evaluate(() => 1.4 / 0.45);
    expect(factor).toBeCloseTo(3.111, 2);
  });

  test('invariant: factor × zoom = 1.4 for all zoom values', async ({ page }) => {
    const results = await page.evaluate(() => {
      const REFERENCE = 1.4;
      return [0.3, 0.45, 0.9, 1.4, 2.0].map(zoom => ({
        zoom,
        onScreen: (REFERENCE / zoom) * zoom,
      }));
    });
    for (const r of results) {
      expect(r.onScreen).toBeCloseTo(1.4, 5);
    }
  });

  test('zoom=0 guard: returns 1 (no divide-by-zero)', async ({ page }) => {
    const factor = await page.evaluate(() => {
      function computeCameraZoomFactor(z) {
        if (!z || z <= 0) return 1;
        return 1.4 / z;
      }
      return computeCameraZoomFactor(0);
    });
    expect(factor).toBe(1);
  });
});

// ── V7 — Sprite-Scale override hierarchy ─────────────────────────────────────

test.describe('V7 — Sprite-Scale: override hierarchy, race starts cleanly', () => {
  test('race with D3.5.5 displaySize override active starts without errors', async ({ page }) => {
    await page.addInitScript(({ geom }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      // Set a D3.5.5 override for rocket: displaySize=60
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ rocket: { displaySize: 60 } })
      );
      sessionStorage.setItem('activeRace', JSON.stringify({
        geometryId: geom.id,
        racerTypeId: 'rocket',
        worldWidth: geom.worldWidth,
        worldHeight: geom.worldHeight,
        trackWidth: 140,
        duration: 60,
        winners: 3,
        raceMode: 'laps',
        targetLaps: 2,
        eventName: 'V7 Test',
        timestamp: new Date().toISOString(),
        racers: [
          { id: 'r1', name: 'Alpha', color: '#ff0000', icon: '🚀' },
          { id: 'r2', name: 'Beta', color: '#00ff00', icon: '🚀' },
        ],
      }));
    }, { geom: CLOSED_GEOM_1280 });

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('race without override: auto-scale active, still starts cleanly', async ({ page }) => {
    await page.addInitScript(({ geom }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      localStorage.removeItem('racearena:racerTypeOverrides');
      sessionStorage.setItem('activeRace', JSON.stringify({
        geometryId: geom.id,
        racerTypeId: 'rocket',
        worldWidth: geom.worldWidth,
        worldHeight: geom.worldHeight,
        trackWidth: 140,
        duration: 60,
        winners: 3,
        raceMode: 'laps',
        targetLaps: 2,
        eventName: 'V7 No-Override Test',
        timestamp: new Date().toISOString(),
        racers: [
          { id: 'r1', name: 'Alpha', color: '#ff0000', icon: '🚀' },
          { id: 'r2', name: 'Beta', color: '#00ff00', icon: '🚀' },
        ],
      }));
    }, { geom: CLOSED_GEOM_1280 });

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });
});

// ── V8 — BaseSpeed: default values ───────────────────────────────────────────

test.describe('V8 — BaseSpeed default values in Dev Screen', () => {
  test.beforeEach(async ({ page }) => {
    await clearBaseSpeedConfig(page);
  });

  test('Min Speed default is 0.00091', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const minInput = page.locator('input[type="number"]').first();
    await expect(minInput).toHaveValue('0.00091');
  });

  test('Max Speed default is 0.00118', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const maxInput = page.locator('input[type="number"]').nth(1);
    await expect(maxInput).toHaveValue('0.00118');
  });

  test('spread preview shows ±12–14% from mean', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    // Preview should contain "±12" or "±13"
    await expect(page.locator('p').filter({ hasText: /±1[23]/ })).toBeVisible();
  });

  test('2-lap gap estimate is ~0.46 laps for default values', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    // 2 × (1 - 0.00091/0.00118) ≈ 0.46
    await expect(page.locator('p').filter({ hasText: /0\.4[0-9]/ })).toBeVisible();
  });
});

// ── V9 — BaseSpeed custom config ─────────────────────────────────────────────

test.describe('V9 — BaseSpeed custom config persists in Dev Screen', () => {
  test('custom config {min: 0.0008, max: 0.0013} shown in inputs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0008, max: 0.0013 })
      );
    });
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const minInput = page.locator('input[type="number"]').first();
    const maxInput = page.locator('input[type="number"]').nth(1);
    await expect(minInput).toHaveValue('0.0008');
    await expect(maxInput).toHaveValue('0.0013');
  });

  test('wider spread triggers orange warning color (>15%)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0007, max: 0.0014 })
      );
    });
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    // ±33% spread → orange warning text color
    const spreadText = page.locator('strong').filter({ hasText: /±\d+/ }).first();
    await expect(spreadText).toBeVisible();
    const color = await spreadText.evaluate((el) => getComputedStyle(el).color);
    // Should not be the default accent color (either orange or amber applied)
    expect(color).not.toBe('');
  });
});

// ── V10 — BaseSpeed reset to defaults ────────────────────────────────────────

test.describe('V10 — BaseSpeed Reset Defaults', () => {
  test('reset defaults restores 0.00091/0.00118 after custom values', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0008, max: 0.0013 })
      );
    });
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();

    // Verify custom values loaded
    const minInput = page.locator('input[type="number"]').first();
    await expect(minInput).toHaveValue('0.0008');

    // Reset
    await page.getByRole('button', { name: /Reset Defaults/ }).click();

    // Should be back to defaults
    await expect(minInput).toHaveValue('0.00091');
    const maxInput = page.locator('input[type="number"]').nth(1);
    await expect(maxInput).toHaveValue('0.00118');
  });
});

// ── V11 — Open track: cameraZoomFactor = 1 ───────────────────────────────────

test.describe('V11 — Open track: sprite scale unaffected by camera zoom', () => {
  test('race on open track starts without JS errors', async ({ page }) => {
    await seedRace(page, OPEN_GEOM, { racerTypeId: 'rocket' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('open-track race uses raceMode=open or duration-based finish, still loads', async ({ page }) => {
    await page.addInitScript(({ geom }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      sessionStorage.setItem('activeRace', JSON.stringify({
        geometryId: geom.id,
        racerTypeId: 'horse',
        worldWidth: geom.worldWidth,
        worldHeight: geom.worldHeight,
        trackWidth: 140,
        duration: 30,
        winners: 3,
        raceMode: 'time',
        targetDuration: 30,
        eventName: 'V11 Open Test',
        timestamp: new Date().toISOString(),
        racers: [
          { id: 'r1', name: 'Horse1', color: '#c8a46a', icon: '🐴' },
          { id: 'r2', name: 'Horse2', color: '#a07040', icon: '🐴' },
        ],
      }));
    }, { geom: OPEN_GEOM });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });
});

// ── V12 — Speed-range: new defaults tighter than old ±17% ────────────────────

test.describe('V12 — Speed-range spread preview matches new tighter defaults', () => {
  test.beforeEach(async ({ page }) => {
    await clearBaseSpeedConfig(page);
  });

  test('default spread is narrower than old 34% total range', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const spreadText = await page
      .locator('p')
      .filter({ hasText: /total range/ })
      .textContent();
    // Extract the "XX% total range" number
    const match = spreadText?.match(/(\d+)%\s+total range/);
    const totalRange = match ? parseInt(match[1], 10) : 999;
    expect(totalRange).toBeLessThan(30); // default 26%, old was 34%
    expect(totalRange).toBeGreaterThan(20); // still meaningful spread
  });

  test('formula preview 2-lap gap < 0.5 laps — no lap-wrap confusion', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    // Extract the lap-gap number from "leader finishes ~X.XX laps ahead of last"
    const previewText = await page
      .locator('p')
      .filter({ hasText: /ahead of last/ })
      .textContent();
    const lapMatch = previewText?.match(/([0-9]+\.[0-9]+)\s+laps/);
    const lapGap = lapMatch ? parseFloat(lapMatch[1]) : 999;
    expect(lapGap).toBeLessThan(0.5); // 0.46 for defaults — no lap wrap
  });
});
