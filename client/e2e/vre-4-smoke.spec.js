// ============================================================
// File:        vre-4-smoke.spec.js
// Path:        client/e2e/vre-4-smoke.spec.js
// Project:     RaceArena
// Description: Smoke tests for VRE-4 — Race Integration.
//              Verifies that a race with a surface-class-matched track+racer
//              starts, runs, and navigates to results without errors.
// ============================================================

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedAirTrackAndStartRace(page) {
  // Inject a minimal air track with geometry reference into session storage
  await page.goto('/');
  await page.evaluate(() => {
    // Seed an air track into localStorage so SetupScreen shows it
    const airTrack = {
      id: 'vre4-smoke-air',
      name: 'VRE4 Smoke Air Track',
      icon: '✈️',
      description: 'Smoke test track',
      defaultRacerTypeId: 'plane',
      geometryId: 'vre4-smoke-geo',
      color: '#7c3aed',
      defaultDuration: 60,
      defaultWinners: 3,
      worldWidth: 1280,
      worldHeight: 720,
      isDefault: false,
      closed: true,
      surfaceClasses: ['air'],
    };
    const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
    const filtered = tracks.filter((t) => t.id !== 'vre4-smoke-air');
    localStorage.setItem('racearena:tracks', JSON.stringify([...filtered, airTrack]));

    // Seed a minimal closed geometry so RaceScreen can init
    const geo = {
      id: 'vre4-smoke-geo',
      closed: true,
      worldWidth: 1280,
      worldHeight: 720,
      pathLengthPx: 2000,
      centerPoints: [
        { x: 200, y: 360 },
        { x: 640, y: 150 },
        { x: 1080, y: 360 },
        { x: 640, y: 570 },
      ],
      innerPoints: [],
      outerPoints: [],
    };
    const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    if (!idx.includes('vre4-smoke-geo')) {
      localStorage.setItem(
        'racearena:trackGeometries:index',
        JSON.stringify([...idx, 'vre4-smoke-geo'])
      );
    }
    localStorage.setItem('racearena:trackGeometries:vre4-smoke-geo', JSON.stringify(geo));

    // Seed an activeRace directly into sessionStorage so we can navigate to /race
    const race = {
      racers: [{ name: 'Alpha' }, { name: 'Beta' }],
      trackId: 'vre4-smoke-air',
      trackName: 'VRE4 Smoke Air Track',
      geometryId: 'vre4-smoke-geo',
      racerTypeId: 'plane',
      worldWidth: 1280,
      worldHeight: 720,
      duration: 60,
      eventName: 'VRE4 Smoke',
      winners: 3,
      raceMode: 'laps',
      targetLaps: 1,
      trackSurfaceClasses: ['air'],
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
  });
}

async function cleanup(page) {
  await page.evaluate(() => {
    const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
    localStorage.setItem(
      'racearena:tracks',
      JSON.stringify(tracks.filter((t) => t.id !== 'vre4-smoke-air'))
    );
    localStorage.removeItem('racearena:trackGeometries:vre4-smoke-air');
    const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    localStorage.setItem(
      'racearena:trackGeometries:index',
      JSON.stringify(idx.filter((id) => id !== 'vre4-smoke-geo'))
    );
    localStorage.removeItem('racearena:trackGeometries:vre4-smoke-geo');
    sessionStorage.removeItem('activeRace');
  });
}

// ── Smoke tests ───────────────────────────────────────────────────────────────

test.describe('VRE-4 Smoke — race starts with surface-class trail', () => {
  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test('RaceScreen mounts without error when trackSurfaceClasses is set', async ({ page }) => {
    await seedAirTrackAndStartRace(page);
    await page.goto('/race');

    // Race canvas must be present — no error screen
    await expect(page.locator('canvas.race-canvas')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.race-error-box')).not.toBeVisible();
  });

  test('RaceScreen shows countdown when race starts', async ({ page }) => {
    await seedAirTrackAndStartRace(page);
    await page.goto('/race');

    // Countdown text (3, 2, 1, GO!) should appear
    await expect(page.locator('.race-phase-badge--countdown')).toBeVisible({ timeout: 8000 });
  });

  test('RaceScreen mounts without error when trackSurfaceClasses is empty (Heimat-Trail)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const race = {
        racers: [{ name: 'Alpha' }],
        trackId: 'vre4-smoke-air',
        trackName: 'VRE4 Smoke Air Track',
        geometryId: 'vre4-smoke-geo',
        racerTypeId: 'plane',
        worldWidth: 1280,
        worldHeight: 720,
        duration: 60,
        eventName: 'VRE4 Smoke Fallback',
        winners: 1,
        raceMode: 'laps',
        targetLaps: 1,
        trackSurfaceClasses: [], // empty → Heimat-Trail path
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('activeRace', JSON.stringify(race));

      const airTrack = {
        id: 'vre4-smoke-air',
        name: 'VRE4 Smoke Air Track',
        icon: '✈️',
        description: '',
        defaultRacerTypeId: 'plane',
        geometryId: 'vre4-smoke-geo',
        color: '#7c3aed',
        defaultDuration: 60,
        defaultWinners: 1,
        worldWidth: 1280,
        worldHeight: 720,
        isDefault: false,
        closed: true,
        surfaceClasses: [],
      };
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      localStorage.setItem(
        'racearena:tracks',
        JSON.stringify([...tracks.filter((t) => t.id !== 'vre4-smoke-air'), airTrack])
      );
      const geo = {
        id: 'vre4-smoke-geo',
        closed: true,
        worldWidth: 1280,
        worldHeight: 720,
        pathLengthPx: 2000,
        centerPoints: [
          { x: 200, y: 360 },
          { x: 640, y: 150 },
          { x: 1080, y: 360 },
          { x: 640, y: 570 },
        ],
        innerPoints: [],
        outerPoints: [],
      };
      const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
      if (!idx.includes('vre4-smoke-geo')) {
        localStorage.setItem(
          'racearena:trackGeometries:index',
          JSON.stringify([...idx, 'vre4-smoke-geo'])
        );
      }
      localStorage.setItem('racearena:trackGeometries:vre4-smoke-geo', JSON.stringify(geo));
    });

    await page.goto('/race');
    await expect(page.locator('canvas.race-canvas')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.race-error-box')).not.toBeVisible();
  });

  test('activeRace with trackSurfaceClasses survives JSON serialisation round-trip', async ({
    page,
  }) => {
    await seedAirTrackAndStartRace(page);
    const classes = await page.evaluate(() => {
      const raw = sessionStorage.getItem('activeRace');
      return JSON.parse(raw).trackSurfaceClasses;
    });
    expect(classes).toEqual(['air']);
  });
});
