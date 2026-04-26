// ============================================================
// File:        d10-smoke.spec.js
// Path:        client/e2e/d10-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Playwright smoke tests for D10 — Track-Size-Variability + Auto-Sprite-Scale.
//              Covers: sessionStorage worldHeight/trackWidth, TrackEditor world size selector,
//              zoom/pan controls, TrackManager world dimensions, AutoScaleSection in Dev Panel
// ============================================================

import { test, expect } from '@playwright/test';

const CLOSED_GEOM = {
  id: 'smoke-d10-closed',
  name: 'D10 Test Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1920,
  worldHeight: 1080,
  innerPoints: [
    { x: 400, y: 300 }, { x: 900, y: 300 }, { x: 1100, y: 540 },
    { x: 900, y: 780 }, { x: 400, y: 780 }, { x: 200, y: 540 },
  ],
  outerPoints: [
    { x: 360, y: 250 }, { x: 940, y: 250 }, { x: 1170, y: 540 },
    { x: 940, y: 830 }, { x: 360, y: 830 }, { x: 150, y: 540 },
  ],
};

async function seedStorage(page) {
  await page.addInitScript((GEOM) => {
    localStorage.setItem(
      `racearena:trackGeometries:${GEOM.id}`,
      JSON.stringify(GEOM)
    );
    const geomIndex = [{ id: GEOM.id, name: GEOM.name }];
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(geomIndex));

    const raw = localStorage.getItem('racearena:tracks');
    const tracks = raw ? JSON.parse(raw) : [];
    const updated = tracks.map((t) =>
      t.id === 'dirt-oval'
        ? { ...t, geometryId: GEOM.id, worldWidth: 1920, worldHeight: 1080, trackWidth: 200 }
        : t
    );
    if (!updated.some((t) => t.id === 'dirt-oval')) {
      updated.push({
        id: 'dirt-oval',
        name: 'Dirt Oval',
        defaultRacerTypeId: 'horse',
        geometryId: GEOM.id,
        worldWidth: 1920,
        worldHeight: 1080,
        trackWidth: 200,
        color: '#c8a46a',
        description: '',
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));
  }, CLOSED_GEOM);
}

// ── T1: sessionStorage contains worldHeight + trackWidth ──────────────────

test.describe('D10-T1 — sessionStorage worldHeight + trackWidth', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page);
    await page.goto('/setup');
    await page.getByRole('tab', { name: 'Track' }).click();
    await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
  });

  test('activeRace sessionStorage includes worldHeight and trackWidth after Quick Test', async ({ page }) => {
    // Fill in at least one player so Quick Test can fire
    await page.getByRole('tab', { name: 'Players' }).click();
    // Quick Test uses pre-seeded test players so no need to add one; just fire it
    // Navigate directly to check what Quick Test would store by reading storage
    const sessionData = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('activeRace') ?? 'null');
    });
    // Quick Test hasn't run yet — check fields after navigating back to setup and running it
    // Click Quick Test (it uses the first track with geometry)
    await page.getByRole('button', { name: /Quick Test/ }).click();

    // We're now on the race screen or transitioning — navigate away immediately
    await page.waitForURL('/race', { timeout: 5000 });

    const activeRace = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('activeRace') ?? 'null')
    );
    expect(activeRace).not.toBeNull();
    expect(typeof activeRace.worldHeight).toBe('number');
    expect(typeof activeRace.trackWidth).toBe('number');
    expect(activeRace.worldHeight).toBeGreaterThan(0);
    expect(activeRace.trackWidth).toBeGreaterThan(0);
  });
});

// ── T2: TrackEditor shows world size selector ─────────────────────────────

test.describe('D10-T2 — TrackEditor world size controls', () => {
  test('world size dropdown and Fit button are visible in TrackEditor', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByText(/World size:/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Fit/ })).toBeVisible();
  });

  test('zoom percentage display is visible', async ({ page }) => {
    await page.goto('/track-editor');
    // Default zoom is 1 = 100%
    await expect(page.getByText(/100%/)).toBeVisible();
  });

  test('world size selector contains HD preset option', async ({ page }) => {
    await page.goto('/track-editor');
    const select = page.locator('select').filter({ hasText: /HD|FHD|QHD/ }).first();
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.some((o) => o.includes('1280'))).toBe(true);
  });
});

// ── T3: TrackManager shows worldWidth + worldHeight fields ────────────────

test.describe('D10-T3 — TrackManager world dimension fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();
  });

  test('World Width pill buttons are visible in track form', async ({ page }) => {
    await expect(page.getByText('World Width (px)')).toBeVisible();
    await expect(page.getByRole('button', { name: '1280' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1920' })).toBeVisible();
  });

  test('World Height pill buttons are visible in track form', async ({ page }) => {
    await expect(page.getByText('World Height (px)')).toBeVisible();
    await expect(page.getByRole('button', { name: '720' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1080' })).toBeVisible();
  });
});

// ── T4: AutoScaleSection visible in Dev Panel ─────────────────────────────

test.describe('D10-T4 — AutoScaleSection in Dev Panel', () => {
  test('Auto-Scale section is listed in the sidebar', async ({ page }) => {
    await page.goto('/dev');
    await expect(page.getByRole('button', { name: /Auto-Scale/ })).toBeVisible();
  });

  test('Auto-Scale section renders the enabled toggle and formula preview', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Auto-Scale/ }).click();
    await expect(page.getByText('Auto-Sprite-Scaling')).toBeVisible();
    await expect(page.getByText(/Enabled/)).toBeVisible();
    await expect(page.getByText('Formula Preview')).toBeVisible();
  });

  test('reset defaults button is present', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Auto-Scale/ }).click();
    await expect(page.getByRole('button', { name: /Reset Defaults/ })).toBeVisible();
  });
});

// ── T5: TrackEditor Fit button resets zoom ────────────────────────────────

test.describe('D10-T5 — TrackEditor fit-to-screen', () => {
  test('Fit button is clickable and zoom resets to 100%', async ({ page }) => {
    await page.goto('/track-editor');

    // Simulate a zoom change via JS to verify Fit resets it
    await page.evaluate(() => {
      // Dispatch a synthetic wheel event to zoom in
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      }
    });
    // Click Fit to reset
    await page.getByRole('button', { name: /Fit/ }).click();
    await expect(page.getByText(/100%/)).toBeVisible();
  });
});

// ── T6: TrackEditor worldWidth/worldHeight saved to geometry ──────────────

test.describe('D10-T6 — TrackEditor saves worldWidth/worldHeight to geometry', () => {
  test('changing world size to FHD and saving stores 1920×1080 in geometry', async ({ page }) => {
    await page.goto('/track-editor');

    // Select FHD world size
    const sizeSelect = page.locator('select').filter({ hasText: /HD|FHD/ }).first();
    await sizeSelect.selectOption({ value: '1920x1080' });

    // Switch to Center Mode and place 3 points so the track is saveable
    await page.getByRole('button', { name: 'Closed Loop' }).click();
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 700, y: 200 } });
    await canvas.click({ position: { x: 900, y: 400 } });

    // Give the track a name and save
    await page.getByPlaceholder(/Track name/).fill('D10 FHD Test');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saved ✓' })).toBeVisible();

    // Verify geometry in localStorage has worldWidth=1920, worldHeight=1080
    const geomData = await page.evaluate(() => {
      const indexRaw = localStorage.getItem('racearena:trackGeometries:index');
      if (!indexRaw) return null;
      const index = JSON.parse(indexRaw);
      const lastId = index[index.length - 1];
      if (!lastId) return null;
      return JSON.parse(localStorage.getItem(`racearena:trackGeometries:${lastId}`) ?? 'null');
    });

    expect(geomData).not.toBeNull();
    expect(geomData.worldWidth).toBe(1920);
    expect(geomData.worldHeight).toBe(1080);
  });
});
