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
// E2E-STALE-2: the defaults and the spread function are IMPORTED from the shipped source, never
// restated here. `defaults.js` is the one home for a config value (CLAUDE.md, ship ceremony), and
// eight hard-coded copies of the old pair are exactly what the 2026-08 rebaseline invalidated.
// Both modules import cleanly in plain Node — no DOM, no storage access at module load.
import { DEFAULT_BASE_SPEED_CONFIG } from '../src/modules/storage/defaults.js';
import { spreadPercent } from '../src/modules/baseSpeedConfig.js';

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
    { x: 280, y: 220 },
    { x: 680, y: 220 },
    { x: 860, y: 400 },
    { x: 680, y: 580 },
    { x: 280, y: 580 },
    { x: 120, y: 400 },
  ],
  outerPoints: [
    { x: 240, y: 180 },
    { x: 720, y: 180 },
    { x: 940, y: 400 },
    { x: 720, y: 620 },
    { x: 240, y: 620 },
    { x: 80, y: 400 },
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
    { x: 800, y: 220 },
    { x: 4200, y: 220 },
    { x: 5200, y: 400 },
    { x: 4200, y: 580 },
    { x: 800, y: 580 },
    { x: 200, y: 400 },
  ],
  outerPoints: [
    { x: 750, y: 180 },
    { x: 4250, y: 180 },
    { x: 5300, y: 400 },
    { x: 4250, y: 620 },
    { x: 750, y: 620 },
    { x: 150, y: 400 },
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
    { x: 100, y: 340 },
    { x: 400, y: 340 },
    { x: 700, y: 360 },
    { x: 1000, y: 340 },
  ],
  outerPoints: [
    { x: 100, y: 380 },
    { x: 400, y: 380 },
    { x: 700, y: 400 },
    { x: 1000, y: 380 },
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

/**
 * THE THREE ZOOM-FORMULA TESTS BELOW ASSERT A FORMULA THIS PRODUCT NO LONGER HAS.
 * Established by measurement in ONE-TRUTH-2 stage 3, not by reading:
 *
 *   `LEADER_VIEW_W`, `MIN_ZOOM` and `MAX_ZOOM` appear NOWHERE in `client/src`. The zoom model they
 *   describe was replaced by the corridor unit in CAMERA-REFERENCE-WIDTH-1 (`zoomUnit.js`, created
 *   2026-08-02), whose API is `camZoomForCorridors` / `resolveZoomForCorridors` and takes none of
 *   these inputs. There is no real function of this shape left to call.
 *
 * So the brief's instruction — "make them call the real function in zoomUnit.js" — has no target.
 * They were not merely re-implementing a formula; they were re-implementing a RETIRED one, inside
 * `page.evaluate`, after a `goto('/')` that touches no application code. They pass today, they
 * would pass with `zoomUnit.js` deleted, and they would pass if the camera never zoomed at all.
 *
 * WHAT WAS DONE INSTEAD, because the honest answer to "make them real" was to make the coverage
 * real: the CLAMP CONTRACT they gestured at — the one thing here that was covered by nothing — is
 * now asserted against the actual shipped function in
 * `client/src/modules/camera/zoomUnit.test.js` ("the clamp contract"), where it can be run and was
 * proven by sabotage. Every other test in that file injects an identity `clampCamZoom`, so the
 * wiring had never been checked.
 *
 * WHY THEY ARE STILL HERE: deleting three tests is the owner's call and the brief said not to.
 * They are also NOT rewritten, deliberately — the e2e suite cannot be run from this block (its
 * Playwright browsers are not installed, and its `webServer` wants port 5173, which the owner's
 * dev server currently holds), and rewriting tests I cannot execute would replace a known-empty
 * check with an unverified one. See the ONE-TRUTH-2 report.
 *
 * The constants are stated once rather than three times, which is the only defect here that could
 * be fixed without running anything.
 */
const ZOOM_CONSTANTS = {
  CANVAS_W: 1280,
  LEADER_VIEW_W: 910,
  MIN_ZOOM: 0.15,
  MAX_ZOOM: 2.5,
};

test.describe('V1 — Adaptive Zoom 1280-Track backward compat', () => {
  test('race on 1280px track renders without JS errors', async ({ page }) => {
    await seedRace(page, CLOSED_GEOM_1280);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('zoom formula at worldW=1280: CANVAS_W²/(LEADER_VIEW_W×worldW) ≈ 1.40', async ({ page }) => {
    await page.goto('/');
    const leaderZoom = await page.evaluate(
      ({ CANVAS_W, LEADER_VIEW_W, MIN_ZOOM, MAX_ZOOM }) =>
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * 1280))),
      ZOOM_CONSTANTS
    );
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
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('zoom formula at worldW=6000: leaderZoom ≈ 0.30 (zoom-out)', async ({ page }) => {
    await page.goto('/');
    const leaderZoom = await page.evaluate(
      ({ CANVAS_W, LEADER_VIEW_W, MIN_ZOOM, MAX_ZOOM }) =>
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * 6000))),
      ZOOM_CONSTANTS
    );
    expect(leaderZoom).toBeCloseTo(0.301, 2);
    expect(leaderZoom).toBeLessThan(1); // zoom-out confirmed
  });

  test('MIN_ZOOM clamp: worldW=15000 (very large) gives MIN_ZOOM=0.15', async ({ page }) => {
    await page.goto('/');
    const zoom = await page.evaluate(
      ({ CANVAS_W, LEADER_VIEW_W, MIN_ZOOM, MAX_ZOOM }) =>
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * 15000))),
      ZOOM_CONSTANTS
    );
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

  test('zoom=0.3 (6000px track): camera can pan — negative target returns edge', async ({
    page,
  }) => {
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
    expect(result.farRight).toBe(-520); // clamped to right edge
  });

  test('zoom=2.0 (small track): track fits in canvas — offset kept within bounds', async ({
    page,
  }) => {
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
    expect(result.centered).toBe(240); // in range, no clamp
    expect(result.tooFarLeft).toBe(0); // clamped to a=0
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
        { id: 'a', t: 0.1 },
        { id: 'b', t: 0.7 },
        { id: 'c', t: 0.2 },
        { id: 'd', t: 0.9 },
        { id: 'e', t: 0.5 },
        { id: 'f', t: 0.8 },
      ];
      const top = focusRacers(racers);
      return { ids: top.map((r) => r.id), ts: top.map((r) => r.t) };
    });
    expect(result.ids).toEqual(['d', 'f', 'b']); // t=0.9, 0.8, 0.7
    expect(result.ts[0]).toBe(0.9);
    expect(result.ts[2]).toBe(0.7); // 3rd-place boundary
  });

  test('COMEBACK_ZOOM targets 3rd-place (last of focusRacers), not last-place', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      function focusRacers(racers, TOP_N = 3) {
        return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
      }
      const racers = [
        { id: 'last', t: 0.05 },
        { id: 'mid', t: 0.5 },
        { id: 'front', t: 0.95 },
        { id: 'second', t: 0.85 },
        { id: 'third', t: 0.7 },
        { id: 'back', t: 0.2 },
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
      const racers = [
        { id: 'a', t: 0.5 },
        { id: 'b', t: 0.8 },
      ];
      return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(3, racers.length)).length;
    });
    expect(count).toBe(2);
  });

  test('exactly 3 racers: all 3 are in focusRacers', async ({ page }) => {
    const count = await page.evaluate(() => {
      const racers = [
        { id: 'a', t: 0.3 },
        { id: 'b', t: 0.6 },
        { id: 'c', t: 0.9 },
      ];
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
      return [0.3, 0.45, 0.9, 1.4, 2.0].map((zoom) => ({
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
    await page.addInitScript(
      ({ geom }) => {
        localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
        // Set a D3.5.5 override for rocket: displaySize=60
        localStorage.setItem(
          'racearena:racerTypeOverrides',
          JSON.stringify({ rocket: { displaySize: 60 } })
        );
        sessionStorage.setItem(
          'activeRace',
          JSON.stringify({
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
          })
        );
      },
      { geom: CLOSED_GEOM_1280 }
    );

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('race without override: auto-scale active, still starts cleanly', async ({ page }) => {
    await page.addInitScript(
      ({ geom }) => {
        localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
        localStorage.removeItem('racearena:racerTypeOverrides');
        sessionStorage.setItem(
          'activeRace',
          JSON.stringify({
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
          })
        );
      },
      { geom: CLOSED_GEOM_1280 }
    );

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });
});

// ── V8–V12 — the Speed Range block, rewritten against the screen it now lives on ──────────────
//
// E2E-STALE-2 — WHY THIS IS A REWRITE AND NOT A REPAIR. Every test below clicked a Dev-Screen
// section called `Base Speed`. There is no such section: the controls live under **Speed Range**
// inside **Race Tuning** (`DynamicsTuningSection.jsx`), which is an *advanced-tier* sidebar entry.
// Having got there, the tests then located the two inputs POSITIONALLY —
// `input[type=number]`.first() / .nth(1) — which on today's card lands on Normal Speed and Min
// Speed. Both halves had to be rebuilt, so the section helper and the named hooks below replace
// them; the inputs now carry `min-speed-input` / `max-speed-input` the way Normal Speed already did.
//
// AND THE NUMBERS ARE NOT TYPED IN. The old file restated 0.00091/0.00118 in eight places; the
// rebaseline moved them and every one of those places went stale at once. `defaults.js` is the one
// home for a default, so the spec IMPORTS it — a future rebaseline moves these tests with it, and
// a test that disagrees with the shipped default is then a real finding rather than a stale string.

async function goToSpeedRange(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race Tuning/ }).click();
  await expect(page.getByTestId('min-speed-input')).toBeVisible();
}

/** What the number input renders for a config value — React stringifies it. */
const asShown = (n) => String(n);

test.describe('V8 — Speed Range default values in Dev Screen', () => {
  test.beforeEach(async ({ page }) => {
    await clearBaseSpeedConfig(page);
  });

  test('Min Speed shows the shipped default', async ({ page }) => {
    await goToSpeedRange(page);
    await expect(page.getByTestId('min-speed-input')).toHaveValue(
      asShown(DEFAULT_BASE_SPEED_CONFIG.min)
    );
  });

  test('Max Speed shows the shipped default', async ({ page }) => {
    await goToSpeedRange(page);
    await expect(page.getByTestId('max-speed-input')).toHaveValue(
      asShown(DEFAULT_BASE_SPEED_CONFIG.max)
    );
  });

  test('spread preview states the spread of the shipped defaults', async ({ page }) => {
    await goToSpeedRange(page);
    // `spreadPercent` is the shipped function, imported rather than re-implemented — the screen
    // renders `±{spread.toFixed(1)}%`, so this asserts the preview agrees with the engine's own
    // definition of spread for the engine's own defaults.
    const spread = spreadPercent(DEFAULT_BASE_SPEED_CONFIG.min, DEFAULT_BASE_SPEED_CONFIG.max);
    await expect(page.getByTestId('speed-spread-percent')).toHaveText(`±${spread.toFixed(1)}%`);
  });

  test('2-lap gap estimate matches gap = 2 × (1 − min/max) for the defaults', async ({ page }) => {
    await goToSpeedRange(page);
    // The formula is stated on the screen's own tooltip; this reproduces it from the defaults
    // instead of hard-coding the answer, which is what went stale last time.
    const gap = 2 * (1 - DEFAULT_BASE_SPEED_CONFIG.min / DEFAULT_BASE_SPEED_CONFIG.max);
    await expect(page.getByTestId('speed-spread-preview')).toContainText(
      `${gap.toFixed(2)} laps`
    );
  });
});

// ── V9 — Speed Range custom config ───────────────────────────────────────────

test.describe('V9 — Speed Range custom config persists in Dev Screen', () => {
  test('custom config {min: 0.0008, max: 0.0013} shown in inputs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0008, max: 0.0013 })
      );
    });
    await goToSpeedRange(page);
    await expect(page.getByTestId('min-speed-input')).toHaveValue('0.0008');
    await expect(page.getByTestId('max-speed-input')).toHaveValue('0.0013');
  });

  test('a spread past the warning threshold is coloured amber, not accent', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0007, max: 0.0014 })
      );
    });
    await goToSpeedRange(page);
    // The old assertion was `expect(color).not.toBe('')`, which no computed colour can ever be —
    // it passed for every colour including the un-warned one. The rule the screen actually applies
    // is `spread > 20 → #f59e0b`, and ±33.3% is past it, so the colour is now asserted.
    const spread = spreadPercent(0.0007, 0.0014);
    expect(spread, 'this fixture must exceed the >20% amber threshold').toBeGreaterThan(20);
    await expect(page.getByTestId('speed-spread-percent')).toHaveCSS('color', 'rgb(245, 158, 11)');
  });
});

// ── V10 — Speed Range reset to defaults ──────────────────────────────────────

test.describe('V10 — Speed Range Reset Defaults', () => {
  test('the Speed Range reset restores the shipped defaults after custom values', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:baseSpeedConfig',
        JSON.stringify({ min: 0.0008, max: 0.0013 })
      );
    });
    await goToSpeedRange(page);
    await expect(page.getByTestId('min-speed-input')).toHaveValue('0.0008');

    // The screen has several resets now (one per sub-heading, plus a card-level Reset All). The
    // one under test is the Speed Range heading's, which already names itself.
    await page.getByTestId('reset-speed-range').click();

    await expect(page.getByTestId('min-speed-input')).toHaveValue(
      asShown(DEFAULT_BASE_SPEED_CONFIG.min)
    );
    await expect(page.getByTestId('max-speed-input')).toHaveValue(
      asShown(DEFAULT_BASE_SPEED_CONFIG.max)
    );
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
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('open-track race uses raceMode=open or duration-based finish, still loads', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ geom }) => {
        localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
        sessionStorage.setItem(
          'activeRace',
          JSON.stringify({
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
          })
        );
      },
      { geom: OPEN_GEOM }
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1200);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });
});

// ── V12 — Speed-range: the preview agrees with the shipped defaults ──────────

test.describe('V12 — Speed-range spread preview matches the shipped defaults', () => {
  test.beforeEach(async ({ page }) => {
    await clearBaseSpeedConfig(page);
  });

  test('the total range the preview states is twice the shipped spread', async ({ page }) => {
    // E2E-STALE-2: this used to bound the number in both directions — `< 30` and `> 20` — against
    // a default of "26%". The rebaseline narrowed the range and the LOWER bound is what now fails:
    // the shipped defaults give 16%. A window around a number the test does not own was always the
    // wrong shape. It now asserts the identity the screen renders — total range = 2 × spread —
    // against `defaults.js`, which cannot go stale when the default moves.
    await goToSpeedRange(page);
    const spread = spreadPercent(DEFAULT_BASE_SPEED_CONFIG.min, DEFAULT_BASE_SPEED_CONFIG.max);
    const text = await page.getByTestId('speed-spread-preview').textContent();
    const totalRange = Number(text?.match(/(\d+)%\s+total range/)?.[1]);
    expect(totalRange, `no "N% total range" in "${text}"`).not.toBeNaN();
    expect(totalRange).toBe(Number((spread * 2).toFixed(0)));
  });

  test('formula preview 2-lap gap < 0.5 laps — no lap-wrap confusion', async ({ page }) => {
    // THE ONE STANDING CLAIM IN THIS BLOCK that is about the product rather than about a number:
    // whatever the defaults are, the two-lap gap must stay under half a lap or the minimap's
    // lap-wrap becomes ambiguous. Kept as an absolute on purpose.
    await goToSpeedRange(page);
    const previewText = await page.getByTestId('speed-spread-preview').textContent();
    const lapGap = Number(previewText?.match(/([0-9]+\.[0-9]+)\s+laps/)?.[1]);
    expect(lapGap, `no lap gap in "${previewText}"`).not.toBeNaN();
    expect(lapGap).toBeLessThan(0.5);
  });
});
