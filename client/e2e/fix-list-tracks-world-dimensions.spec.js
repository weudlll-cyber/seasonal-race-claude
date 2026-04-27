// ============================================================
// File:        fix-list-tracks-world-dimensions.spec.js
// Path:        client/e2e/fix-list-tracks-world-dimensions.spec.js
// Project:     RaceArena
// Description: Regression guard for the listTracks() worldWidth/worldHeight fix.
//              Verifies that TrackManager auto-syncs world dimensions from a linked
//              geometry (previously broken: dimensions always stayed at 1280×720).
//              Permanent regression guard — must stay green after this fix lands.
// ============================================================

import { test, expect } from '@playwright/test';

const GEOMETRY_ID = 'custom-test-large-track';
const LARGE_W = 4000;
const LARGE_H = 2000;

function buildGeometry(id) {
  const pts = [
    { x: 100, y: 100 },
    { x: 3900, y: 100 },
    { x: 3900, y: 1900 },
  ];
  return {
    id,
    name: 'Large Test Track',
    backgroundImage: '/assets/tracks/backgrounds/city-circuit.png',
    closed: true,
    sourceMode: 'boundary',
    innerPoints: pts,
    outerPoints: pts.map((p) => ({ x: p.x + 50, y: p.y + 50 })),
    worldWidth: LARGE_W,
    worldHeight: LARGE_H,
    pathLengthPx: 11200,
    effects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function seedGeometry(page) {
  const geo = buildGeometry(GEOMETRY_ID);
  await page.evaluate(
    ({ key, index_key, id, geo }) => {
      const existing = JSON.parse(localStorage.getItem(index_key) ?? '[]');
      if (!existing.includes(id)) {
        existing.push(id);
        localStorage.setItem(index_key, JSON.stringify(existing));
      }
      localStorage.setItem(key, JSON.stringify(geo));
    },
    {
      key: `racearena:trackGeometries:${GEOMETRY_ID}`,
      index_key: 'racearena:trackGeometries:index',
      id: GEOMETRY_ID,
      geo,
    }
  );
}

// ── A1 fix: TrackManager auto-sync world dimensions ──────────────────────────

test.describe('fix — listTracks returns worldWidth/worldHeight', () => {
  test('selecting a large-world geometry in TrackManager shows correct dimensions', async ({
    page,
  }) => {
    await page.goto('/dev');
    await seedGeometry(page);
    await page.reload();

    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    // Select the seeded geometry
    await page.locator('select').filter({ hasText: 'Large Test Track' }).selectOption(GEOMETRY_ID);

    // World Dimensions label must now show the geometry's actual dimensions
    await expect(page.getByText(`${LARGE_W}×${LARGE_H} px`)).toBeVisible();
  });

  test('standard 1280×720 geometry still shows correct dimensions', async ({ page }) => {
    await page.goto('/dev');
    // Seed a geometry with default 1280×720
    const geo = buildGeometry('custom-small-track');
    geo.worldWidth = 1280;
    geo.worldHeight = 720;
    geo.name = 'Small Test Track';
    await page.evaluate(
      ({ key, index_key, id, geo }) => {
        const existing = JSON.parse(localStorage.getItem(index_key) ?? '[]');
        if (!existing.includes(id)) {
          existing.push(id);
          localStorage.setItem(index_key, JSON.stringify(existing));
        }
        localStorage.setItem(key, JSON.stringify(geo));
      },
      {
        key: 'racearena:trackGeometries:custom-small-track',
        index_key: 'racearena:trackGeometries:index',
        id: 'custom-small-track',
        geo,
      }
    );
    await page.reload();

    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    await page
      .locator('select')
      .filter({ hasText: 'Small Test Track' })
      .selectOption('custom-small-track');

    await expect(page.getByText('1280×720 px')).toBeVisible();
  });
});

// ── A2 fix: migration syncs existing track configs from linked geometry ────────

test.describe('fix — migration syncs stale track configs', () => {
  test('existing track with stale 1280×720 gets corrected dimensions on page load', async ({
    page,
  }) => {
    await page.goto('/dev');

    // Seed geometry with large dimensions
    await seedGeometry(page);

    // Seed a stale track config that was saved with wrong 1280×720
    const staleTrack = {
      id: 'track-stale-dims',
      name: 'Stale Track',
      icon: '🏁',
      description: '',
      defaultRacerTypeId: 'horse',
      geometryId: GEOMETRY_ID,
      color: '#e63946',
      defaultDuration: 60,
      defaultWinners: 3,
      trackWidth: 140,
      worldWidth: 1280,
      worldHeight: 720,
      isDefault: false,
    };
    await page.evaluate((track) => {
      const existing = JSON.parse(localStorage.getItem('racearena:tracks') ?? '[]');
      existing.push(track);
      localStorage.setItem('racearena:tracks', JSON.stringify(existing));
    }, staleTrack);

    // Reload so the storage.js migration IIFE runs
    await page.reload();

    // Navigate to Tracks → Edit the stale track
    await page.getByRole('button', { name: /Tracks/ }).click();

    // Find the 'Stale Track' row and click its Edit button specifically
    await page.locator('div').filter({ hasText: /^🏁Stale Track/ }).getByTitle('Edit').click();

    // After migration the form must show the geometry's actual dimensions
    await expect(page.getByText(`${LARGE_W}×${LARGE_H} px`)).toBeVisible();
  });
});
