// ============================================================
// File:        vre-3-smoke.spec.js
// Path:        client/e2e/vre-3-smoke.spec.js
// Project:     RaceArena
// Description: Playwright smoke tests for VRE-3 — Surface-Class Linking.
//              Tests: surface-class pills in RacerEditModal and TrackManager,
//              Save/Done disabled guards, SetupScreen filter via localStorage.
// ============================================================

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToDevRacerTypes(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Racer Types/i }).click();
}

async function goToDevTracks(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Tracks/i }).click();
}

async function openRacerEditModal(page, nth = 0) {
  const editBtns = page.getByRole('button', { name: 'Edit', exact: true });
  await editBtns.nth(nth).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return page.getByRole('dialog');
}

async function openTrackEditForm(page) {
  const editBtn = page.getByTitle('Edit').first();
  await editBtn.click();
  await expect(page.getByText('Edit Track')).toBeVisible();
}

// ── T1 — RacerEditModal surface class pills ───────────────────────────────────

test.describe('VRE-3 — RacerEditModal surface class pills', () => {
  test('surface-class pills container is visible in edit modal', async ({ page }) => {
    await goToDevRacerTypes(page);
    await openRacerEditModal(page, 0);
    await expect(page.getByTestId('surface-class-pills')).toBeVisible();
  });

  test('at least 9 surface-class pills are rendered', async ({ page }) => {
    await goToDevRacerTypes(page);
    await openRacerEditModal(page, 0);
    const pillContainer = page.getByTestId('surface-class-pills');
    const pills = pillContainer.getByRole('button');
    expect(await pills.count()).toBeGreaterThanOrEqual(9);
  });

  test('horse type has Earth pill active by default', async ({ page }) => {
    await goToDevRacerTypes(page);
    await openRacerEditModal(page, 0); // Horse is first
    const earthPill = page.getByRole('button', { name: /Earth/i });
    await expect(earthPill).toHaveAttribute('aria-pressed', 'true');
  });

  test('Done button is enabled by default (horse has surface classes)', async ({ page }) => {
    await goToDevRacerTypes(page);
    await openRacerEditModal(page, 0);
    const doneBtn = page.getByRole('button', { name: 'Done' });
    await expect(doneBtn).toBeEnabled();
  });
});

// ── T2 — TrackManager surface class pills ─────────────────────────────────────

test.describe('VRE-3 — TrackManager surface class pills', () => {
  test('surface-class pills container is visible in track edit form', async ({ page }) => {
    await goToDevTracks(page);
    await openTrackEditForm(page);
    await expect(page.getByTestId('track-surface-class-pills')).toBeVisible();
  });

  test('at least 9 surface-class pills are rendered in track edit form', async ({ page }) => {
    await goToDevTracks(page);
    await openTrackEditForm(page);
    const pillContainer = page.getByTestId('track-surface-class-pills');
    const pills = pillContainer.getByRole('button');
    expect(await pills.count()).toBeGreaterThanOrEqual(9);
  });

  test('Save Changes button is disabled when no surface classes selected for server track', async ({ page }) => {
    // The Weltall server track has surfaceClasses: [] after migration
    await goToDevTracks(page);
    await openTrackEditForm(page);
    const saveBtn = page.getByRole('button', { name: /Save Changes/i });
    await expect(saveBtn).toBeDisabled();
  });

  test('error hint "At least one surface class is required" is visible', async ({ page }) => {
    await goToDevTracks(page);
    await openTrackEditForm(page);
    await expect(page.getByText(/At least one surface class is required/i)).toBeVisible();
  });
});

// ── T3 — SetupScreen surface hint (via localStorage) ─────────────────────────

test.describe('VRE-3 — SetupScreen surface hint', () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage: add a fake track with surfaceClasses=['air'] and a geometry
    await page.goto('/');
    await page.evaluate(() => {
      const fakeTrack = {
        id: 'vre3-test-air',
        name: 'VRE3 Air Test',
        icon: '✈️',
        description: 'e2e smoke test track',
        defaultRacerTypeId: 'plane',
        geometryId: 'vre3-fake-geo',
        color: '#7c3aed',
        defaultDuration: 60,
        defaultWinners: 3,
        worldWidth: 1280,
        worldHeight: 720,
        isDefault: false,
        surfaceClasses: ['air'],
      };
      const existing = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      const filtered = existing.filter((t) => t.id !== 'vre3-test-air');
      localStorage.setItem('racearena:tracks', JSON.stringify([...filtered, fakeTrack]));
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      localStorage.setItem(
        'racearena:tracks',
        JSON.stringify(tracks.filter((t) => t.id !== 'vre3-test-air'))
      );
    });
  });

  test('surface class hint appears when a track with surfaceClasses is selected', async ({ page }) => {
    await page.goto('/');
    // Navigate to Track tab
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    // Select the seeded test track
    await page.getByRole('button').filter({ hasText: 'VRE3 Air Test' }).click();
    await expect(page.getByTestId('track-surface-hint')).toBeVisible();
  });

  test('surface hint mentions "Air" for an air-only track', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await page.getByRole('button').filter({ hasText: 'VRE3 Air Test' }).click();
    const hint = page.getByTestId('track-surface-hint');
    await expect(hint).toContainText('Air');
  });
});
