// ============================================================
// File:        quick-test-autofill-smoke.spec.js
// Path:        client/e2e/quick-test-autofill-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Smoke tests for Quick Test (20) autofill — verifies that the
//              Quick Test button fills to 20 players and starts a race without
//              errors. Permanent regression guard.
// ============================================================

import { test, expect } from '@playwright/test';

const CLOSED_GEOM = {
  id: 'qt-autofill-closed',
  name: 'Quick Test Oval',
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

test.describe('Quick Test (20) — button and autofill', () => {
  test('button label reads "Quick Test (20)"', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByRole('button', { name: /Quick Test \(20\)/ })).toBeVisible();
  });

  test('Quick Test button is disabled when no track has geometry', async ({ page }) => {
    await page.goto('/setup');
    const btn = page.getByTitle('Draw a track in the Track Editor first');
    await expect(btn).toBeDisabled();
  });

  test('clicking Quick Test fills to 20 racers in sessionStorage', async ({ page }) => {
    await seedGeometry(page);
    await page.goto('/setup');

    await page.getByRole('button', { name: /Quick Test \(20\)/ }).click();

    const racers = await page.evaluate(() => {
      const raw = sessionStorage.getItem('activeRace');
      return raw ? JSON.parse(raw).racers : null;
    });
    expect(racers).not.toBeNull();
    expect(racers).toHaveLength(20);
  });

  test('first test racer is named Turbo', async ({ page }) => {
    await seedGeometry(page);
    await page.goto('/setup');
    await page.getByRole('button', { name: /Quick Test \(20\)/ }).click();

    const firstName = await page.evaluate(() => {
      const raw = sessionStorage.getItem('activeRace');
      return raw ? JSON.parse(raw).racers[0].name : null;
    });
    expect(firstName).toBe('Turbo');
  });

  test('Quick Test with 5 existing players keeps them and adds up to 20', async ({ page }) => {
    await seedGeometry(page);
    await page.goto('/setup');

    // Add 5 players manually
    for (const name of ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']) {
      await page.getByPlaceholder(/player name/i).first().fill(name);
      await page.getByRole('button', { name: /^add$/i }).click();
    }

    await page.getByRole('button', { name: /Quick Test \(20\)/ }).click();

    const racers = await page.evaluate(() => {
      const raw = sessionStorage.getItem('activeRace');
      return raw ? JSON.parse(raw).racers : null;
    });
    expect(racers).toHaveLength(20);
    expect(racers.map((r) => r.name)).toContain('Alice');
    expect(racers.map((r) => r.name)).toContain('Eve');
  });
});

test.describe('Quick Test (20) — race starts without errors', () => {
  test('20-racer quick test race produces no console errors', async ({ page }) => {
    await seedGeometry(page);

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/setup');
    await page.getByRole('button', { name: /Quick Test \(20\)/ }).click();

    await page.waitForTimeout(4000);

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
