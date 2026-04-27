// ============================================================
// File:        d11-ux-verification.spec.js
// Path:        client/e2e/d11-ux-verification.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: UX verification spec for D11 — Race Behavior.
//              Kept permanently as regression coverage.
//              V1-V10: config persistence, validation, toggle, race integration.
// ============================================================

import { test, expect } from '@playwright/test';

const CLOSED_GEOM = {
  id: 'ux-d11-closed',
  name: 'D11 UX Oval',
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

const DEFAULT_CFG = {
  enabled: true,
  avoidanceDistance: 120,
  avoidanceLateralForce: 0.012,
  avoidanceMaxLateral: 0.35,
  avoidanceSpeedBrake: 0.95,
  avoidanceReturnSpeed: 0.05,
  draftingDistanceT: 0.02,
  draftingLaneThreshold: 0.15,
  draftingBoostFactor: 1.1,
};

async function openBehaviorSection(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race Behavior/ }).click();
  await expect(page.getByRole('heading', { name: /race behavior/i })).toBeVisible();
}

// ── V1: Default values match spec ──────────────────────────────────────────
test('V1 — default avoidanceDistance is 120', async ({ page }) => {
  await openBehaviorSection(page);
  await expect(page.getByLabel('Avoidance Distance (px)')).toHaveValue('120');
});

test('V1 — default avoidanceLateralForce is 0.012', async ({ page }) => {
  await openBehaviorSection(page);
  await expect(page.getByLabel('Lateral Force (per frame)')).toHaveValue('0.012');
});

test('V1 — default draftingBoostFactor is 1.1', async ({ page }) => {
  await openBehaviorSection(page);
  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.1');
});

test('V1 — default enabled is true', async ({ page }) => {
  await openBehaviorSection(page);
  await expect(page.getByLabel('Enabled')).toBeChecked();
});

// ── V2: Config persists across page reload ─────────────────────────────────
test('V2 — changed avoidanceDistance persists across reload', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Avoidance Distance (px)').fill('150');

  await page.reload();
  await openBehaviorSection(page);
  await expect(page.getByLabel('Avoidance Distance (px)')).toHaveValue('150');
});

// ── V3: Reset Defaults restores all values ─────────────────────────────────
test('V3 — Reset Defaults restores avoidanceDistance to 120', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Avoidance Distance (px)').fill('200');
  await page.getByRole('button', { name: /reset defaults/i }).click();
  await expect(page.getByLabel('Avoidance Distance (px)')).toHaveValue('120');
});

test('V3 — Reset Defaults restores draftingBoostFactor to 1.1', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Boost Factor').fill('1.5');
  await page.getByRole('button', { name: /reset defaults/i }).click();
  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.1');
});

test('V3 — Reset Defaults re-enables the toggle', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Enabled').uncheck();
  await page.getByRole('button', { name: /reset defaults/i }).click();
  await expect(page.getByLabel('Enabled')).toBeChecked();
});

// ── V4: Toggle disable/enable ──────────────────────────────────────────────
test('V4 — unchecking Enabled persists across reload', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Enabled').uncheck();
  await page.reload();
  await openBehaviorSection(page);
  await expect(page.getByLabel('Enabled')).not.toBeChecked();
});

// ── V5: Live apply — config stored immediately ─────────────────────────────
test('V5 — config change is stored in localStorage immediately', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Avoidance Distance (px)').fill('100');

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('racearena:raceBehaviorConfig');
    return raw ? JSON.parse(raw) : null;
  });
  expect(stored).not.toBeNull();
  expect(stored.avoidanceDistance).toBe(100);
});

// ── V6: Custom config loaded by race engine ────────────────────────────────
test('V6 — race engine reads custom behavior config from localStorage', async ({ page }) => {
  await seedGeometry(page);

  await page.addInitScript((cfg) => {
    localStorage.setItem('racearena:raceBehaviorConfig', JSON.stringify(cfg));
  }, { ...DEFAULT_CFG, avoidanceDistance: 200 });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/setup');
  await page.getByPlaceholder(/player name/i).first().fill('A');
  await page.getByRole('button', { name: /add/i }).click();
  await page.getByRole('tab', { name: /track/i }).click();
  await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
  await page.getByRole('button', { name: /Start Race/i }).click();
  await page.waitForTimeout(3000);

  expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
});

// ── V7: Behavior disabled — race still works ──────────────────────────────
test('V7 — race works normally when behavior is disabled', async ({ page }) => {
  await seedGeometry(page);

  await page.addInitScript((cfg) => {
    localStorage.setItem('racearena:raceBehaviorConfig', JSON.stringify(cfg));
  }, { ...DEFAULT_CFG, enabled: false });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/setup');
  await page.getByPlaceholder(/player name/i).first().fill('A');
  await page.getByRole('button', { name: /add/i }).click();
  await page.getByPlaceholder(/player name/i).first().fill('B');
  await page.getByRole('button', { name: /add/i }).click();
  await page.getByRole('tab', { name: /track/i }).click();
  await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
  await page.getByRole('button', { name: /Start Race/i }).click();
  await page.waitForTimeout(3000);

  expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
});

// ── V8: Multiple racers race without errors ────────────────────────────────
test('V8 — race with 5 racers and behavior enabled produces no errors', async ({ page }) => {
  await seedGeometry(page);

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/setup');
  for (const name of ['A', 'B', 'C', 'D', 'E']) {
    await page.getByPlaceholder(/player name/i).first().fill(name);
    await page.getByRole('button', { name: /add/i }).click();
  }
  await page.getByRole('tab', { name: /track/i }).click();
  await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
  await page.getByRole('button', { name: /Start Race/i }).click();
  await page.waitForTimeout(6000);

  expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
});

// ── V9: All tunable fields are editable ───────────────────────────────────
test('V9 — avoidanceSpeedBrake can be changed', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Speed Brake').fill('0.9');
  await expect(page.getByLabel('Speed Brake')).toHaveValue('0.9');
});

test('V9 — draftingDistanceT can be changed', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Drafting Distance (t)').fill('0.03');
  await expect(page.getByLabel('Drafting Distance (t)')).toHaveValue('0.03');
});

test('V9 — avoidanceReturnSpeed can be changed', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Return Speed').fill('0.08');
  await expect(page.getByLabel('Return Speed')).toHaveValue('0.08');
});

// ── V10: Drafting summary text reflects current values ────────────────────
test('V10 — drafting summary reflects boost factor change', async ({ page }) => {
  await openBehaviorSection(page);
  await page.getByLabel('Boost Factor').fill('1.2');
  // Summary shows +20% when boostFactor = 1.2
  const summary = page.locator('[data-testid="drafting-summary"]');
  await expect(summary).toContainText('20%');
});
