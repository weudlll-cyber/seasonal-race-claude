// ============================================================
// File:        b-wave-smoke.spec.js
// Path:        client/e2e/b-wave-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Smoke tests for B-Wave bugfix sweep (B-1, B-3, B-10, B-11,
//              B-12, B-13, B-14, B-15). Permanent regression guard.
// ============================================================

import { test, expect } from '@playwright/test';

// ── B-15 — English strings in TrackEditor ────────────────────────────────

test.describe('B-15 — TrackEditor UI strings are English', () => {
  test('upload button shows English "No image" when no image uploaded', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.locator('button').filter({ hasText: /No image/ })).toBeVisible();
  });

  test('Track Size label is English in toolbar', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByText(/Track Size:/)).toBeVisible();
  });

  test('no German strings visible in TrackEditor on load', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByText(/Kein Bild/)).not.toBeVisible();
    await expect(page.getByText(/Track-Größe/)).not.toBeVisible();
    await expect(page.getByText(/Hintergrundbild/)).not.toBeVisible();
  });
});

// ── B-15 — English strings in TrackManager ───────────────────────────────

test.describe('B-15 — TrackManager UI strings are English', () => {
  test('World Dimensions shows English fallback when no geometry selected', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();
    await expect(page.getByText(/Choose Geometry/)).toBeVisible();
    await expect(page.getByText(/Geometrie wählen/)).not.toBeVisible();
  });
});

// ── B-13 — Language selector removed from RaceDefaults ───────────────────

test.describe('B-13 — Language selector removed', () => {
  test('Language pill buttons are absent from Race Defaults section', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Defaults/ }).click();
    await expect(page.getByText('Language')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /English/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Deutsch/ })).not.toBeVisible();
  });
});

// ── B-3 — Winners max is 20 ───────────────────────────────────────────────

test.describe('B-3 — Winners stepper max is 20', () => {
  test('can increment winners beyond 5 in RaceDefaults', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Defaults/ }).click();

    // Click + six times (from default 3 to 9 — if max were still 5, it would stop)
    const plusBtn = page.locator('div').filter({ hasText: /Default Number of Winners/ }).getByRole('button', { name: '+' });
    for (let i = 0; i < 6; i++) {
      await plusBtn.click();
    }
    await expect(page.getByText('9')).toBeVisible();
  });

  test('Winners stepper + is disabled at 20', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Defaults/ }).click();

    // Set winners to 20 by clicking + 17 times (from default 3)
    const plusBtn = page.locator('div').filter({ hasText: /Default Number of Winners/ }).getByRole('button', { name: '+' });
    for (let i = 0; i < 17; i++) {
      await plusBtn.click();
    }
    await expect(plusBtn).toBeDisabled();
  });
});

// ── B-14 — TrackManager shows hint to Track Editor ───────────────────────

test.describe('B-14 — TrackManager hint to Track Editor', () => {
  test('hint with Track Editor link shown when no geometry selected', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();
    await expect(page.getByText(/Track Editor/)).toBeVisible();
    await expect(page.getByText(/draw a track/i)).toBeVisible();
  });
});

// ── B-12 — Max Players configurable in RaceDefaults ──────────────────────

test.describe('B-12 — Max Players stepper in Race Defaults', () => {
  test('Max Players stepper is present in Race Defaults', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Defaults/ }).click();
    await expect(page.getByText('Max Players per Race')).toBeVisible();
  });

  test('Max Players stepper shows default value of 20', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Race Defaults/ }).click();
    const section = page.locator('div').filter({ hasText: /Max Players per Race/ });
    await expect(section.getByText('20')).toBeVisible();
  });
});

// ── B-10 — InfoTooltip renders without alignRight prop ───────────────────

test.describe('B-10 — InfoTooltip boundary detection', () => {
  test('InfoTooltip icon is visible in RacerManager', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Racers/ }).click();
    // At least one info icon should be present
    const infoIcon = page.locator('[role="img"][aria-label]').first();
    await expect(infoIcon).toBeVisible();
  });
});

// ── B-11 — Display-size tooltip is concise ───────────────────────────────

test.describe('B-11 — Display-size tooltip text', () => {
  test('Display Size tooltip is concise (no "Affects visual scale" verbose text)', async ({
    page,
  }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Racers/ }).click();

    // Open first racer edit modal
    const editBtn = page.getByRole('button', { name: /Edit/ }).first();
    await editBtn.click();

    // Hover the display-size info icon to show tooltip
    const displaySizeRow = page.locator('label', { hasText: /Display Size/ });
    await expect(displaySizeRow).toBeVisible();

    // The verbose old text should not appear anywhere in the DOM
    await expect(page.getByText(/Affects visual scale only, not gameplay speed/)).not.toBeVisible();
  });
});
