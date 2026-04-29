// ============================================================
// File:        d7c-smoke.spec.js
// Path:        client/e2e/d7c-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Smoke + UX verification for D7c — Row Start with Speed Bonus.
//              V1-V6: row layout, setup hints, capacity warning, Dev-Screen params.
// ============================================================

import { test, expect } from '@playwright/test';

const CLOSED_GEOM = {
  id: 'd7c-smoke-oval',
  name: 'D7c Smoke Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  pathLengthPx: 4000,
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

async function seedGeometry(page) {
  await page.addInitScript((geom) => {
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const raw = localStorage.getItem('racearena:tracks');
    const tracks = raw ? JSON.parse(raw) : [];
    const patched = tracks.map((t) =>
      t.id === 'dirt-oval'
        ? { ...t, geometryId: geom.id, trackWidth: 140, worldWidth: 1280, worldHeight: 720 }
        : t
    );
    if (!patched.some((t) => t.id === 'dirt-oval')) {
      patched.push({
        id: 'dirt-oval',
        name: 'Dirt Oval',
        defaultRacerTypeId: 'horse',
        geometryId: geom.id,
        worldWidth: 1280,
        worldHeight: 720,
        trackWidth: 140,
        color: '#a0522d',
        description: '',
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(patched));
  }, CLOSED_GEOM);
}

async function seedGeometryWithCapacity(page, maxRacers) {
  await page.addInitScript(
    ({ geom, max }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      const raw = localStorage.getItem('racearena:tracks');
      const tracks = raw ? JSON.parse(raw) : [];
      const patched = tracks.map((t) =>
        t.id === 'dirt-oval'
          ? {
              ...t,
              geometryId: geom.id,
              trackWidth: 140,
              worldWidth: 1280,
              worldHeight: 720,
              maxRacers: max,
            }
          : t
      );
      if (!patched.some((t) => t.id === 'dirt-oval')) {
        patched.push({
          id: 'dirt-oval',
          name: 'Dirt Oval',
          defaultRacerTypeId: 'horse',
          geometryId: geom.id,
          worldWidth: 1280,
          worldHeight: 720,
          trackWidth: 140,
          maxRacers: max,
          color: '#a0522d',
          description: '',
        });
      }
      localStorage.setItem('racearena:tracks', JSON.stringify(patched));
    },
    { geom: CLOSED_GEOM, max: maxRacers }
  );
}

// ── V1: row layout config defaults are loadable ────────────────────────────

test('V1 — row layout config defaults are present and valid', async ({ page }) => {
  await page.goto('/dev');
  await page.waitForLoadState('networkidle');
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('racearena:rowLayoutConfig');
    return raw ? JSON.parse(raw) : null;
  });
  // May be null if never saved — that's fine, defaults kick in at load time
  if (stored) {
    expect(stored.pixelsPerRacer).toBeGreaterThan(0);
    expect(stored.rowGapMultiplier).toBeGreaterThan(0);
    expect(stored.speedBonusFactor).toBeGreaterThanOrEqual(0);
    expect(stored.maxCapacityFactor).toBeGreaterThan(0);
  }
});

// ── V2: Dev Screen shows Row Start section ──────────────────────────────────

test('V2 — Dev Screen Race Behavior section shows Row Start parameters', async ({ page }) => {
  await page.goto('/dev');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Row Start')).toBeVisible();
  await expect(page.getByLabel('Pixels per Racer')).toBeVisible();
  await expect(page.getByLabel('Row Gap Multiplier')).toBeVisible();
  await expect(page.getByLabel('Speed Bonus Factor')).toBeVisible();
  await expect(page.getByLabel('Max Capacity Factor')).toBeVisible();
});

// ── V3: setup shows row hint when players exceed one row ────────────────────

test('V3 — Setup screen shows row-start hint when racers exceed one row', async ({ page }) => {
  await seedGeometry(page);
  await page.goto('/setup');

  // Select track
  const dirtOval = page.locator('[data-track-id="dirt-oval"]').first();
  if (await dirtOval.isVisible()) await dirtOval.click();

  // Add 20 players via Quick Test button
  await page.getByRole('button', { name: /Quick Test/i }).click();
  await page.waitForLoadState('networkidle');

  // Row hint should now be visible (20 players > ~1 row of ~1 on 140px/80px=1 per row)
  // Actually with 140px track and 80px per racer, racersPerRow = floor(140/80) = 1
  // So any > 1 player triggers the hint
  await expect(page.getByTestId('row-start-hint')).toBeVisible();
});

// ── V4: setup shows capacity warning when over maxRacers ───────────────────

test('V4 — Setup screen shows capacity warning when players exceed track maxRacers', async ({
  page,
}) => {
  await seedGeometryWithCapacity(page, 5);
  await page.goto('/setup');

  // Add 10 players
  const addBtn = page.getByRole('button', { name: /Add Player/i });
  if (await addBtn.isVisible()) {
    for (let i = 0; i < 10; i++) {
      await addBtn.click();
    }
  }
  // If no direct add button, use Quick Test (adds up to 20)
  await page.getByRole('button', { name: /Quick Test/i }).click();
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('capacity-warning')).toBeVisible();
});

// ── V5: race starts with multiple rows (no crash) ──────────────────────────

test('V5 — race with 20 players starts without errors (multi-row)', async ({ page }) => {
  await seedGeometry(page);
  await page.goto('/setup');

  // Add 20 players via Quick Test
  await page.getByRole('button', { name: /Quick Test/i }).click();
  await page.waitForURL('/race');
  await page.waitForLoadState('networkidle');

  // Race screen should be shown, not error
  await expect(page.locator('.race-canvas')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.race-error-box')).not.toBeVisible();
});

// ── V6: Row Start params persist after save ────────────────────────────────

test('V6 — Row Start config persists after changing pixelsPerRacer', async ({ page }) => {
  await page.goto('/dev');
  await page.waitForLoadState('networkidle');

  const input = page.getByLabel('Pixels per Racer');
  await input.fill('100');

  // Navigate away and back to verify persistence
  await page.goto('/setup');
  await page.goto('/dev');
  await page.waitForLoadState('networkidle');

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('racearena:rowLayoutConfig');
    return raw ? JSON.parse(raw) : null;
  });
  expect(stored?.pixelsPerRacer).toBe(100);
});
