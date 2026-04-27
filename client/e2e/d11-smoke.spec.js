// ============================================================
// File:        d11-smoke.spec.js
// Path:        client/e2e/d11-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Playwright smoke tests for D11 — Race Behavior (soft avoidance
//              + drafting). Verifies: Dev-Screen section accessible, defaults
//              correct, toggle works, reset works, race starts without errors.
// ============================================================

import { test, expect } from '@playwright/test';

const CLOSED_GEOM = {
  id: 'smoke-d11-closed',
  name: 'D11 Test Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  innerPoints: [
    { x: 280, y: 220 }, { x: 680, y: 220 }, { x: 860, y: 400 },
    { x: 680, y: 580 }, { x: 280, y: 580 }, { x: 120, y: 400 },
  ],
  outerPoints: [
    { x: 240, y: 180 }, { x: 720, y: 180 }, { x: 940, y: 400 },
    { x: 720, y: 620 }, { x: 240, y: 620 }, { x: 80, y: 400 },
  ],
};

async function seedGeometry(page) {
  await page.addInitScript((geom) => {
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const raw = localStorage.getItem('racearena:tracks');
    const tracks = raw ? JSON.parse(raw) : [];
    const patched = tracks.map((t) =>
      t.id === 'dirt-oval' ? { ...t, geometryId: geom.id } : t
    );
    if (!tracks.length) {
      patched.push({
        id: 'dirt-oval', name: 'Dirt Oval', defaultRacerTypeId: 'horse',
        geometryId: geom.id, worldWidth: 1280, worldHeight: 720,
        color: '#a0522d', trackWidth: 140, description: '',
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(patched));
  }, CLOSED_GEOM);
}

test.describe('D11 — Race Behavior Dev-Screen section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Behavior/ }).click();
    await expect(page.getByRole('heading', { name: /race behavior/i })).toBeVisible();
  });

  test('Race Behavior section is accessible from sidebar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /race behavior/i })).toBeVisible();
  });

  test('section shows Enabled toggle', async ({ page }) => {
    await expect(page.getByLabel('Enabled')).toBeVisible();
  });

  test('Enabled toggle is checked by default', async ({ page }) => {
    await expect(page.getByLabel('Enabled')).toBeChecked();
  });

  test('avoidance distance field shows default value 80', async ({ page }) => {
    await expect(page.getByLabel('Avoidance Distance (px)')).toHaveValue('80');
  });

  test('drafting boost factor field shows default 1.1', async ({ page }) => {
    await expect(page.getByLabel('Boost Factor')).toHaveValue('1.1');
  });

  test('disabling toggle unchecks Enabled', async ({ page }) => {
    await page.getByLabel('Enabled').uncheck();
    await expect(page.getByLabel('Enabled')).not.toBeChecked();
  });

  test('Reset Defaults button restores default avoidance distance', async ({ page }) => {
    await page.getByLabel('Avoidance Distance (px)').fill('120');
    await page.getByRole('button', { name: /reset defaults/i }).click();
    await expect(page.getByLabel('Avoidance Distance (px)')).toHaveValue('80');
  });

  test('drafting summary text is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="drafting-summary"]')).toBeVisible();
  });
});

test.describe('D11 — Race starts without errors with behavior enabled', () => {
  test('race with behavior enabled produces no console errors', async ({ page }) => {
    await seedGeometry(page);

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/setup');
    await page.getByPlaceholder(/player name/i).first().fill('Racer A');
    await page.getByRole('button', { name: /add/i }).click();
    await page.getByPlaceholder(/player name/i).first().fill('Racer B');
    await page.getByRole('button', { name: /add/i }).click();
    await page.getByRole('tab', { name: /track/i }).click();
    await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
    await page.getByRole('button', { name: /Start Race/i }).click();

    await page.waitForTimeout(5000);

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
