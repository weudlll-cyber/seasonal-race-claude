// ============================================================
// File:        vre-3-ux-verification.spec.js
// Path:        client/e2e/vre-3-ux-verification.spec.js
// Project:     RaceArena
// Description: UX-Verifikation für VRE-3 — Surface-Class Linking.
//              Pill-toggle behavior, modified badge, reset flow,
//              TrackManager save guard, SetupScreen filter effect.
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
  await page.getByTitle('Edit').first().click();
  await expect(page.getByText('Edit Track')).toBeVisible();
}

// ── V1 — Pill toggle behavior ─────────────────────────────────────────────────

test.describe('V1 — Pill toggle behavior (RacerEditModal)', () => {
  test.afterEach(async ({ page }) => {
    // Clean up overrides
    await page.evaluate(() => localStorage.removeItem('racearena:racerTypeOverrides'));
  });

  test('toggling an inactive pill sets aria-pressed=true', async ({ page }) => {
    await goToDevRacerTypes(page);
    // Open Plane (air only) — find a pill that's inactive
    // Horse has many classes active; find the 'water' pill which should be inactive for horse
    const dialog = await openRacerEditModal(page, 0);
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Find a pill with aria-pressed=false (inactive)
    const inactivePill = pillContainer.getByRole('button', { pressed: false }).first();
    const pillName = await inactivePill.textContent();
    await inactivePill.click();

    // After click, it should be active
    const toggled = pillContainer.getByRole('button').filter({ hasText: pillName });
    await expect(toggled).toHaveAttribute('aria-pressed', 'true');
  });

  test('toggling an active pill sets aria-pressed=false', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openRacerEditModal(page, 0);
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Earth pill should be active for horse
    const earthPill = pillContainer.getByRole('button', { name: /Earth/i });
    await expect(earthPill).toHaveAttribute('aria-pressed', 'true');

    await earthPill.click();
    await expect(earthPill).toHaveAttribute('aria-pressed', 'false');
  });

  test('deselecting all pills disables Done and shows error', async ({ page }) => {
    await goToDevRacerTypes(page);
    // Use Plane which has only ['air'] — one pill to deselect
    const planeEditBtn = page.getByRole('button', { name: 'Edit', exact: true }).nth(11);
    await planeEditBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const dialog = page.getByRole('dialog');
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Air pill should be the only active one for Plane
    const airPill = pillContainer.getByRole('button', { name: /Air/i });
    await airPill.click(); // deselect

    await expect(dialog.getByText(/At least one surface class is required/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Done' })).toBeDisabled();
  });
});

// ── V2 — Modified badge and reset ────────────────────────────────────────────

test.describe('V2 — Modified badge and reset (RacerEditModal)', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('racearena:racerTypeOverrides'));
  });

  test('modified badge appears after toggling a pill', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openRacerEditModal(page, 0); // Horse
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Toggle an inactive pill to create a change
    const inactivePill = pillContainer.getByRole('button', { pressed: false }).first();
    await inactivePill.click();

    await expect(dialog.getByText('modified')).toBeVisible();
  });

  test('"Reset to default" button appears when surface classes are modified', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openRacerEditModal(page, 0);
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Toggle inactive pill
    await pillContainer.getByRole('button', { pressed: false }).first().click();

    await expect(dialog.getByRole('button', { name: /Reset to default/i })).toBeVisible();
  });

  test('"Reset to default" removes the modified badge for surface classes', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openRacerEditModal(page, 0);
    const pillContainer = dialog.getByTestId('surface-class-pills');

    // Modify then reset
    await pillContainer.getByRole('button', { pressed: false }).first().click();
    await expect(dialog.getByText('modified')).toBeVisible();

    await dialog.getByRole('button', { name: /Reset to default/i }).click();
    await expect(dialog.getByText('modified')).not.toBeVisible();
  });
});

// ── V3 — TrackManager surface class pill UX ──────────────────────────────────

test.describe('V3 — TrackManager surface class pill UX', () => {
  test('Save becomes enabled after selecting a pill on Weltall (starts with none)', async ({ page }) => {
    await goToDevTracks(page);
    await openTrackEditForm(page);

    const pillContainer = page.getByTestId('track-surface-class-pills');
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

    // Select the first pill
    await pillContainer.getByRole('button').first().click();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeEnabled();
  });

  test('deselecting all pills re-disables Save', async ({ page }) => {
    await goToDevTracks(page);
    await openTrackEditForm(page);

    const pillContainer = page.getByTestId('track-surface-class-pills');

    // Select one pill
    const firstPill = pillContainer.getByRole('button').first();
    await firstPill.click();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeEnabled();

    // Deselect it again
    await firstPill.click();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });
});

// ── V4 — SetupScreen filter effect ───────────────────────────────────────────

test.describe('V4 — SetupScreen racer filter (via localStorage seed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      // Seed a fake air-only track with a geometry so it can be selected
      const fakeTrack = {
        id: 'vre3-ux-air',
        name: 'VRE3 Air Track',
        icon: '✈️',
        description: 'UX verification track',
        defaultRacerTypeId: 'plane',
        geometryId: 'vre3-ux-geo',
        color: '#7c3aed',
        defaultDuration: 60,
        defaultWinners: 3,
        worldWidth: 1280,
        worldHeight: 720,
        isDefault: false,
        surfaceClasses: ['air'],
      };
      const existing = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      const filtered = existing.filter((t) => t.id !== 'vre3-ux-air');
      localStorage.setItem('racearena:tracks', JSON.stringify([...filtered, fakeTrack]));
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      localStorage.setItem(
        'racearena:tracks',
        JSON.stringify(tracks.filter((t) => t.id !== 'vre3-ux-air'))
      );
    });
  });

  test('racer dropdown shows fewer than 12 types after selecting an air-only track', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await page.getByRole('button').filter({ hasText: 'VRE3 Air Track' }).click();

    const select = page.getByRole('combobox');
    const optionCount = await select.locator('option').count();
    // Should be 3 (plane, dragon, rocket) instead of 12
    expect(optionCount).toBeLessThan(12);
    expect(optionCount).toBeGreaterThan(0);
  });

  test('surface hint displays "Air" for the air track', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await page.getByRole('button').filter({ hasText: 'VRE3 Air Track' }).click();

    const hint = page.getByTestId('track-surface-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('Air');
  });

  test('switching to a different track changes the racer dropdown options', async ({ page }) => {
    // Seed also an earth track
    await page.evaluate(() => {
      const earthTrack = {
        id: 'vre3-ux-earth',
        name: 'VRE3 Earth Track',
        icon: '🌍',
        description: 'Earth track',
        defaultRacerTypeId: 'horse',
        geometryId: 'vre3-ux-earth-geo',
        color: '#a0522d',
        defaultDuration: 60,
        defaultWinners: 3,
        worldWidth: 1280,
        worldHeight: 720,
        isDefault: false,
        surfaceClasses: ['earth'],
      };
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      const filtered = tracks.filter((t) => t.id !== 'vre3-ux-earth');
      localStorage.setItem('racearena:tracks', JSON.stringify([...filtered, earthTrack]));
    });

    await page.goto('/');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();

    // Select air track → count options
    await page.getByRole('button').filter({ hasText: 'VRE3 Air Track' }).click();
    const airCount = await page.getByRole('combobox').locator('option').count();

    // Select earth track → count should be different
    await page.getByRole('button').filter({ hasText: 'VRE3 Earth Track' }).click();
    const earthCount = await page.getByRole('combobox').locator('option').count();

    // Earth track has more compatible types than air (7 vs 3)
    expect(earthCount).toBeGreaterThan(airCount);

    // Cleanup extra track
    await page.evaluate(() => {
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') || '[]');
      localStorage.setItem(
        'racearena:tracks',
        JSON.stringify(tracks.filter((t) => t.id !== 'vre3-ux-earth'))
      );
    });
  });
});
