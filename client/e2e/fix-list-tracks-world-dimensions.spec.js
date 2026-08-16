// ============================================================
// File:        fix-list-tracks-world-dimensions.spec.js
// Path:        client/e2e/fix-list-tracks-world-dimensions.spec.js
// Project:     RaceArena
// Description: Regression guard for the listTracks() worldWidth/worldHeight fix.
//              Verifies that a track's world dimensions are the LINKED GEOMETRY'S and not the
//              hardcoded 1280×720 they used to stay at.
//              Permanent regression guard — must stay green after this fix lands.
//
// ── E2E-STALE-2, 2026-08-16: REWRITTEN, AND WHY IT COULD NOT BE REPAIRED ────────────────────────
//
// All three tests here drove a geometry `<select>` inside TrackManager's Add-Track form, and that
// control DOES NOT EXIST. A track is created first and its geometry is drawn afterwards in the
// Track Geometry Editor, so the Add form now states exactly that where the dimensions used to be:
// "— (set after saving and drawing geometry)". Two of the three timed out waiting for a `select`
// that is never rendered; the third waited for a track it had written into `localStorage`, which
// stopped being where tracks live when they moved to the server.
//
// THE SUBJECT SURVIVES — `listTracks()` still returns `worldWidth`/`worldHeight` per geometry, and
// a track still has to show its geometry's size rather than 1280×720. Only the route to it moved:
// the EDIT form is where a track's world dimensions are displayed today.
//
// THE FIXTURE IS CREATED THROUGH THE RUN'S OWN API, NOT ADDED TO THE SEEDS. A `server/seeds` entry
// would put a test track into every real installation's data directory on first boot; that is
// production data, and the night brief forbids touching it. Creating it here keeps the fixture
// inside the test that needs it, inside this run's own isolated data directory, and deletes it
// again — which is also what stops it leaking into the specs that share this server.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

const LARGE_GEOMETRY_ID = 'e2e-world-dims-large';
const SMALL_GEOMETRY_ID = 'e2e-world-dims-small';
const LARGE_W = 4000;
const LARGE_H = 2000;

function buildGeometry(id, name, worldWidth, worldHeight) {
  const pts = [
    { x: 100, y: 100 },
    { x: 3900, y: 100 },
    { x: 3900, y: 1900 },
  ];
  return {
    id,
    name,
    backgroundImage: null,
    closed: true,
    sourceMode: 'boundary',
    innerPoints: pts,
    outerPoints: pts.map((p) => ({ x: p.x + 50, y: p.y + 50 })),
    worldWidth,
    worldHeight,
    pathLengthPx: 11200,
    effects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Put a geometry in the client's geometry cache BEFORE the app boots. TrackManager reads
 * `listTracks()` once, in a `useState` initialiser, so seeding after mount would be invisible.
 */
async function seedGeometry(page, geom) {
  await page.addInitScript((g) => {
    const indexKey = 'racearena:trackGeometries:index';
    const index = JSON.parse(localStorage.getItem(indexKey) ?? '[]');
    if (!index.includes(g.id)) {
      index.push(g.id);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
    localStorage.setItem(`racearena:trackGeometries:${g.id}`, JSON.stringify(g));
  }, geom);
}

/**
 * Create a track on the run's own API. Returns its server-assigned id.
 *
 * The server validates a track as a self-contained record — `closed`, world dimensions and a real
 * point set are all required (`validateTrackBodyForCreate` in server/src/routes/tracks.js) — so the
 * geometry travels WITH the track rather than being referenced. `worldWidth`/`worldHeight` are
 * passed separately from the geometry's on purpose: the stale-dimensions case needs them to differ.
 */
async function createTrack(page, geom, { name, worldWidth, worldHeight }) {
  const res = await page.request.post(`${E2E.apiUrl}/api/tracks`, {
    data: {
      name,
      icon: '🏁',
      geometryId: geom.id,
      closed: geom.closed,
      innerPoints: geom.innerPoints,
      outerPoints: geom.outerPoints,
      pathLengthPx: geom.pathLengthPx,
      worldWidth,
      worldHeight,
      surfaceClasses: ['earth'],
    },
  });
  expect(res.ok(), `POST /api/tracks → ${res.status()}: ${await res.text()}`).toBeTruthy();
  return (await res.json()).id;
}

async function openTrackForEdit(page, trackName) {
  await page.getByRole('button', { name: /Tracks/ }).click();
  await page
    .locator('div')
    .filter({ hasText: new RegExp(`^🏁${trackName}`) })
    .getByTitle('Edit')
    .click();
}

// ── The fix: a track's world dimensions come from its geometry ───────────────

test.describe('fix — a track shows its linked geometry’s world dimensions', () => {
  const createdIds = [];

  test.afterEach(async ({ page }) => {
    while (createdIds.length) {
      await page.request.delete(`${E2E.apiUrl}/api/tracks/${createdIds.pop()}`).catch(() => {});
    }
  });

  test('a large-world geometry shows its own dimensions, not 1280×720', async ({ page }) => {
    const geom = buildGeometry(LARGE_GEOMETRY_ID, 'Large Test Track', LARGE_W, LARGE_H);
    await seedGeometry(page, geom);
    createdIds.push(
      await createTrack(page, geom, {
        name: 'E2E Large Dims',
        worldWidth: LARGE_W,
        worldHeight: LARGE_H,
      })
    );

    await page.goto('/dev');
    await openTrackForEdit(page, 'E2E Large Dims');

    await expect(page.getByText(`${LARGE_W}×${LARGE_H} px`)).toBeVisible();
    await expect(page.getByText('1280×720 px')).toHaveCount(0);
  });

  test('a standard 1280×720 geometry still shows 1280×720', async ({ page }) => {
    const geom = buildGeometry(SMALL_GEOMETRY_ID, 'Small Test Track', 1280, 720);
    await seedGeometry(page, geom);
    createdIds.push(
      await createTrack(page, geom, {
        name: 'E2E Small Dims',
        worldWidth: 1280,
        worldHeight: 720,
      })
    );

    await page.goto('/dev');
    await openTrackForEdit(page, 'E2E Small Dims');

    await expect(page.getByText('1280×720 px')).toBeVisible();
  });

  test('the Add-Track form offers no geometry selector and defers the dimensions', async ({
    page,
  }) => {
    // THE THIRD TEST'S SUBJECT WAS THE MIGRATION that repaired a track saved with stale 1280×720
    // while its separately-stored geometry was larger. THAT DIVERGENCE CANNOT HAPPEN ANY MORE: a
    // track is one server record that carries its own points and its own world size — the API
    // refuses a track without them (`validateTrackBodyForCreate`) — so there is no second copy to
    // drift from and no migration left to trigger. Asserting the old repair would be asserting a
    // mechanism the product deliberately removed.
    //
    // What replaced it is asserted instead, because it is the thing that must not silently come
    // back: the Add form offers NO geometry selector, and says so where the dimensions used to be.
    // A geometry `<select>` reappearing here without the sync would be exactly the original defect.
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    await expect(page.getByText('— (set after saving and drawing geometry)')).toBeVisible();
    await expect(page.locator('select').filter({ hasText: /Test Track/ })).toHaveCount(0);
  });
});
