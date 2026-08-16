// ============================================================
// File:        d355-smoke.spec.js
// Path:        client/e2e/d355-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Playwright smoke tests for D3.5.5 — per-type tuning UI.
//              Covers: Edit-Modal opening, field interaction, tooltips,
//              localStorage inspection after overrides, reset behavior.
//              Visual race-speed changes are verified via localStorage only
//              (canvas rendering not automatable without pixel diffing).
// ============================================================

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────

async function goToDevRacerTypes(page) {
  await page.goto('/dev');
  // Click the "Racer Types" nav item in the Dev-Screen sidebar
  await page.getByRole('button', { name: /Racer Types/i }).click();
}

async function getOverrides(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('racearena:racerTypeOverrides') || '{}')
  );
}

// ── Task 1 — Edit-Modal opens ─────────────────────────────────────────────

test.describe('D3.5.5 — Edit-Modal opens', () => {
  test.beforeEach(async ({ page }) => {
    await goToDevRacerTypes(page);
  });

  test('Edit button is visible for each racer type', async ({ page }) => {
    // E2E-STALE-2: this asserted `toBe(12)` and the page renders 20 — the built-in registry
    // (`RACER_TYPES` in modules/racer-types/index.js) has grown to twenty entries. But a literal
    // count is the wrong assertion for a list the SERVER can add to: `listAllRacerTypes()` merges
    // server-created types in, so any spec that creates one would break a hard-coded number for a
    // reason that is not a defect. What the test NAME claims — one Edit button per racer type — is
    // an invariant, so it is asserted as one, against an independent enumerator: every row also
    // renders its speed multiplier as "×N.NN".
    const editBtns = page.getByRole('button', { name: 'Edit', exact: true });
    // No `$` anchor: a row that carries tuning overrides appends a ✱ inside the same span.
    const rows = page.getByText(/^×\d+\.\d\d/);
    await expect(editBtns.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount, 'the racer-type list rendered no rows at all').toBeGreaterThan(0);
    expect(await editBtns.count()).toBe(rowCount);
  });

  test('clicking Edit opens a modal dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('modal contains all 6 field labels', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Speed Multiplier/i)).toBeVisible();
    await expect(dialog.getByText(/Display Size/i)).toBeVisible();
    await expect(dialog.getByText(/Anim Period/i)).toBeVisible();
    await expect(dialog.getByText(/Leader Ring Color/i)).toBeVisible();
    await expect(dialog.getByText(/Leader Ring Width/i)).toBeVisible();
    await expect(dialog.getByText(/Leader Ring Height/i)).toBeVisible();
  });

  test('Done button closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('✕ button closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('info icons appear in the modal (one per field)', async ({ page }) => {
    // E2E-STALE-2: this counted every info icon in the dialog and expected 6. The modal now
    // carries 9 — the six tunable fields plus Min Sprite Screen Size, Surface Classes and the
    // cloud-effect overrides — so a total was never the claim the test's own name makes. "One per
    // field" is now asserted per field, which also says WHICH field lost its tooltip when it fails.
    const TUNABLE_FIELD_LABELS = [
      'Speed Multiplier',
      'Display Size (px)',
      'Anim Period (ms)',
      'Leader Ring Color',
      'Leader Ring Width (rx)',
      'Leader Ring Height (ry)',
    ];

    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    for (const label of TUNABLE_FIELD_LABELS) {
      // The row is `<span class=fieldLabel>{label}</span><InfoTooltip/>`, and InfoTooltip renders
      // a wrapper span holding the `role="img"` icon — so the icon is in the label's next sibling.
      const icon = dialog
        .getByText(label, { exact: true })
        .locator('xpath=following-sibling::span[1]//*[@role="img"]');
      await expect(icon, `no info icon beside "${label}"`).toHaveCount(1);
    }
  });
});

// ── Task 2 — Speed override stored in localStorage ────────────────────────

test.describe('D3.5.5 — Speed override localStorage', () => {
  test.beforeEach(async ({ page }) => {
    await goToDevRacerTypes(page);
  });

  test('changing speedMultiplier writes override to localStorage', async ({ page }) => {
    // Open Horse edit modal (first type)
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');

    // Clear the speedMultiplier input and type new value
    const smInput = dialog.getByLabel(/Speed Multiplier/i);
    await smInput.fill('1.5');
    await smInput.dispatchEvent('change');

    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    expect(overrides).toMatchObject({});
    const allKeys = Object.keys(overrides);
    expect(allKeys.length).toBeGreaterThanOrEqual(1);
  });

  test('resetting speedMultiplier removes override from localStorage', async ({ page }) => {
    // Set an override first
    await page.evaluate(() =>
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 1.5 } })
      )
    );
    await page.reload();
    await goToDevRacerTypes(page);

    // Open Horse modal
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');

    // "modified" badge should be visible for speedMultiplier
    await expect(dialog.getByText('modified').first()).toBeVisible();

    // Click the Reset button for that field
    await dialog.getByRole('button', { name: 'Reset' }).first().click();

    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    if (overrides.horse) {
      expect(overrides.horse).not.toHaveProperty('speedMultiplier');
    }
  });
});

// ── Task 3 — displaySize override stored ─────────────────────────────────

test.describe('D3.5.5 — displaySize override localStorage', () => {
  test('setting displaySize=80 is stored in racerTypeOverrides', async ({ page }) => {
    await goToDevRacerTypes(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');

    const sizeInput = dialog.getByLabel(/Display Size/i);
    await sizeInput.fill('80');
    await sizeInput.dispatchEvent('change');
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    const firstId = Object.keys(overrides)[0];
    if (firstId) {
      expect(overrides[firstId]).toHaveProperty('displaySize', 80);
    }
  });
});

// ── Task 4 — leaderRingColor override stored ──────────────────────────────

test.describe('D3.5.5 — leaderRingColor override localStorage', () => {
  test('setting leaderRingColor is stored in racerTypeOverrides', async ({ page }) => {
    await goToDevRacerTypes(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');

    const colorText = dialog.getByLabel(/Leader Ring Color hex/i);
    await colorText.fill('#ff0000');
    await colorText.dispatchEvent('change');
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    const firstId = Object.keys(overrides)[0];
    if (firstId) {
      expect(overrides[firstId]).toHaveProperty('leaderRingColor', '#ff0000');
    }
  });
});

// ── Task 5 — localStorage inspection ─────────────────────────────────────

test.describe('D3.5.5 — localStorage state management', () => {
  test('multiple overrides on the same type coexist in one entry', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 1.2, displaySize: 50 } })
      );
    });
    await goToDevRacerTypes(page);

    // Open Horse modal — should show both modified badges
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    const badges = dialog.getByText('modified');
    expect(await badges.count()).toBe(2);
  });

  test('Reset all to defaults clears all tunable overrides', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 1.5, displaySize: 70 } })
      );
    });
    await goToDevRacerTypes(page);

    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Reset all to defaults/i }).click();
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    expect(overrides).not.toHaveProperty('horse');
  });

  test('isActive override survives Reset all to defaults', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { isActive: false, speedMultiplier: 1.5 } })
      );
    });
    await goToDevRacerTypes(page);

    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Reset all to defaults/i }).click();
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    // speedMultiplier removed, isActive: false preserved
    expect(overrides?.horse?.isActive).toBe(false);
    expect(overrides?.horse).not.toHaveProperty('speedMultiplier');
  });

  test('✱ indicator shown in type row when tuning overrides exist', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 1.5 } })
      );
    });
    await goToDevRacerTypes(page);
    // The ✱ marker appears in the type row
    await expect(page.getByTitle('This type has custom tuning overrides')).toBeVisible();
  });
});
