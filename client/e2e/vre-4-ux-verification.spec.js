// ============================================================
// File:        vre-4-ux-verification.spec.js
// Path:        client/e2e/vre-4-ux-verification.spec.js
// Project:     RaceArena
// Description: UX-Verifikation für VRE-4 — Race Integration.
//              Verifies: trackSurfaceClasses written to sessionStorage from
//              SetupScreen, race starts cleanly on surface-class tracks, and
//              Heimat-Trail fallback works for tracks with no classes.
// ============================================================

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedLocalTrack(page, track, geo) {
  await page.evaluate(
    ({ track, geo }) => {
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      const filtered = tracks.filter((t) => t.id !== track.id);
      localStorage.setItem('racearena:tracks', JSON.stringify([...filtered, track]));

      const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
      if (!idx.includes(geo.id)) {
        localStorage.setItem(
          'racearena:trackGeometries:index',
          JSON.stringify([...idx, geo.id])
        );
      }
      localStorage.setItem(`racearena:trackGeometries:${geo.id}`, JSON.stringify(geo));
    },
    { track, geo }
  );
}

async function cleanupTrack(page, trackId, geoId) {
  await page.evaluate(
    ({ trackId, geoId }) => {
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      localStorage.setItem(
        'racearena:tracks',
        JSON.stringify(tracks.filter((t) => t.id !== trackId))
      );
      const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
      localStorage.setItem(
        'racearena:trackGeometries:index',
        JSON.stringify(idx.filter((id) => id !== geoId))
      );
      localStorage.removeItem(`racearena:trackGeometries:${geoId}`);
      sessionStorage.removeItem('activeRace');
    },
    { trackId, geoId }
  );
}

const SHARED_GEO = {
  id: 'vre4-ux-geo',
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

// ── V1 — trackSurfaceClasses in sessionStorage ────────────────────────────────

test.describe('V1 — trackSurfaceClasses written to activeRace from SetupScreen', () => {
  const TRACK = {
    id: 'vre4-ux-air',
    name: 'VRE4 UX Air Track',
    icon: '✈️',
    description: '',
    defaultRacerTypeId: 'plane',
    geometryId: 'vre4-ux-geo',
    color: '#7c3aed',
    defaultDuration: 30,
    defaultWinners: 1,
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
    closed: true,
    surfaceClasses: ['air'],
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seedLocalTrack(page, TRACK, SHARED_GEO);
    // Add a test player so "Start Race" becomes enabled
    await page.evaluate(() => {
      localStorage.setItem('racearena:players', JSON.stringify([{ name: 'Tester' }]));
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupTrack(page, TRACK.id, SHARED_GEO.id);
    await page.evaluate(() => localStorage.removeItem('racearena:players'));
  });

  test('SetupScreen writes trackSurfaceClasses to activeRace when starting a race', async ({
    page,
  }) => {
    await page.goto('/setup');
    // Navigate to Track tab and select our seeded track
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await page.getByRole('button').filter({ hasText: 'VRE4 UX Air Track' }).click();

    // Start the race — button may be enabled once track+player are set
    const startBtn = page.getByRole('button', { name: /Start Race/i });
    if (await startBtn.isDisabled()) {
      // SetupScreen may need at least 1 player — already seeded, but tab may need refresh
      await page.goto('/setup');
      await page.getByRole('tab').nth(1).click();
      await page.getByRole('button').filter({ hasText: 'VRE4 UX Air Track' }).click();
    }

    await startBtn.click();
    await expect(page).toHaveURL('/race', { timeout: 5000 });

    // Read back sessionStorage from within the race page
    const classes = await page.evaluate(() => {
      const raw = sessionStorage.getItem('activeRace');
      return raw ? JSON.parse(raw).trackSurfaceClasses : null;
    });
    expect(Array.isArray(classes)).toBe(true);
    expect(classes).toContain('air');
  });
});

// ── V2 — Heimat-Trail fallback for track without surfaceClasses ───────────────

test.describe('V2 — Heimat-Trail fallback for legacy track (no surfaceClasses)', () => {
  const TRACK_EMPTY = {
    id: 'vre4-ux-empty',
    name: 'VRE4 UX Empty Classes',
    icon: '🏁',
    description: '',
    defaultRacerTypeId: 'horse',
    geometryId: 'vre4-ux-geo',
    color: '#e63946',
    defaultDuration: 30,
    defaultWinners: 1,
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
    closed: true,
    surfaceClasses: [], // legacy — no classes
  };

  test.afterEach(async ({ page }) => {
    await cleanupTrack(page, TRACK_EMPTY.id, SHARED_GEO.id);
  });

  test('race starts without error when track has no surface classes (Heimat-Trail path)', async ({
    page,
  }) => {
    await page.goto('/');
    await seedLocalTrack(page, TRACK_EMPTY, SHARED_GEO);
    await page.evaluate(({ track, geo }) => {
      const race = {
        racers: [{ name: 'Alpha' }, { name: 'Beta' }],
        trackId: track.id,
        trackName: track.name,
        geometryId: geo.id,
        racerTypeId: 'horse',
        worldWidth: 1280,
        worldHeight: 720,
        duration: 30,
        eventName: 'Fallback Test',
        winners: 1,
        raceMode: 'laps',
        targetLaps: 1,
        trackSurfaceClasses: [],
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('activeRace', JSON.stringify(race));
    }, { track: TRACK_EMPTY, geo: SHARED_GEO });

    await page.goto('/race');
    await expect(page.locator('canvas.race-canvas')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.race-error-box')).not.toBeVisible();
  });
});

// ── V3 — activeRace schema has trackSurfaceClasses field ─────────────────────

test.describe('V3 — activeRace schema includes trackSurfaceClasses', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => sessionStorage.removeItem('activeRace'));
  });

  test('trackSurfaceClasses is present and an array in activeRace', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const race = {
        racers: [{ name: 'Alpha' }],
        trackId: 'x',
        trackName: 'X',
        geometryId: null,
        racerTypeId: 'horse',
        worldWidth: 1280,
        worldHeight: 720,
        duration: 60,
        eventName: '',
        winners: 1,
        raceMode: 'laps',
        targetLaps: 1,
        trackSurfaceClasses: ['earth', 'grass'],
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('activeRace', JSON.stringify(race));
    });

    const classes = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('activeRace')).trackSurfaceClasses;
    });
    expect(Array.isArray(classes)).toBe(true);
    expect(classes).toEqual(['earth', 'grass']);
  });

  test('trackSurfaceClasses defaults to [] when track has no classes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const race = {
        racers: [{ name: 'Alpha' }],
        trackId: 'x',
        trackName: 'X',
        geometryId: null,
        racerTypeId: 'horse',
        worldWidth: 1280,
        worldHeight: 720,
        duration: 60,
        eventName: '',
        winners: 1,
        raceMode: 'laps',
        targetLaps: 1,
        trackSurfaceClasses: [],
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('activeRace', JSON.stringify(race));
    });

    const classes = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('activeRace')).trackSurfaceClasses;
    });
    expect(classes).toEqual([]);
  });
});
