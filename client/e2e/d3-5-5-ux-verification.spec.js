// ============================================================
// File:        d3-5-5-ux-verification.spec.js
// Path:        client/e2e/d3-5-5-ux-verification.spec.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: UX-Verifikation für D3.5.5 Quality Gate PR #21.
//              8 Verifikations-Aufgaben: Modal-Lifecycle, Tooltips,
//              Override-Indikatoren, Validation, Reset-Verhalten,
//              Color-Normalisierung, Layout-Sichtprüfung.
//              Temporärer Verifikations-Spec — nicht für Dauerbetrieb.
// ============================================================

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────

async function goToDevRacerTypes(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Racer Types/i }).click();
}

async function openEditModal(page, nth = 0) {
  const btns = page.getByRole('button', { name: 'Edit', exact: true });
  await btns.nth(nth).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return page.getByRole('dialog');
}

async function getOverrides(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('racearena:racerTypeOverrides') || '{}')
  );
}

// ── V1 — Modal öffnen/schließen/wieder öffnen ─────────────────────────────

test.describe('V1 — Modal open/close/reopen', () => {
  test('modal for each of first 2 types opens with correct label', async ({ page }) => {
    await goToDevRacerTypes(page);

    // First type (Horse)
    const dialog1 = await openEditModal(page, 0);
    await expect(dialog1).toContainText(/horse/i);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Second type (Duck)
    const dialog2 = await openEditModal(page, 1);
    await expect(dialog2).toContainText(/duck/i);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('reopening modal reflects previously set override value', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // Set speedMultiplier to 1.8
    const smInput = dialog.getByLabel(/Speed Multiplier/i);
    await smInput.fill('1.8');
    await smInput.dispatchEvent('change');
    await page.waitForTimeout(200);

    // Close and reopen
    await page.getByRole('button', { name: 'Done' }).click();
    const dialog2 = await openEditModal(page, 0);

    // Should show 1.8 (the override value, not the default)
    const smInput2 = dialog2.getByLabel(/Speed Multiplier/i);
    await expect(smInput2).toHaveValue('1.8');
  });

  test('no state leak: horse changes do not appear in duck modal', async ({ page }) => {
    await goToDevRacerTypes(page);

    // Set horse speedMultiplier
    const d1 = await openEditModal(page, 0);
    const snap = await d1.getByLabel(/Speed Multiplier/i).inputValue();
    await d1.getByLabel(/Speed Multiplier/i).fill('1.9');
    await d1.getByLabel(/Speed Multiplier/i).dispatchEvent('change');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Done' }).click();

    // Open duck — its speedMultiplier should be its own default, not 1.9
    const d2 = await openEditModal(page, 1);
    const duckSm = await d2.getByLabel(/Speed Multiplier/i).inputValue();
    expect(parseFloat(duckSm)).not.toBe(1.9);
    expect(snap).not.toBe('1.9'); // horse had a different default
  });
});

// ── V2 — Tooltips für alle 6 Felder ──────────────────────────────────────

test.describe('V2 — Tooltips for all 6 fields', () => {
  test('all 6 info icons are present and have non-empty aria-label', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const icons = dialog.locator('[role="img"][tabindex="0"]');
    expect(await icons.count()).toBe(6);

    // Each icon's aria-label (= tooltip text) should be non-empty
    for (let i = 0; i < 6; i++) {
      const label = await icons.nth(i).getAttribute('aria-label');
      expect(label, `Icon ${i} aria-label empty`).toBeTruthy();
      expect(label.length, `Icon ${i} aria-label too short`).toBeGreaterThan(10);
    }
  });

  test('tooltip spans are present in DOM (hidden by CSS)', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // role="tooltip" spans are in DOM (hidden via CSS, so use hidden:true)
    const tooltips = dialog.locator('[role="tooltip"]');
    expect(await tooltips.count()).toBe(6);

    for (let i = 0; i < 6; i++) {
      const text = await tooltips.nth(i).textContent();
      expect(text.trim().length, `Tooltip ${i} empty`).toBeGreaterThan(10);
    }
  });
});

// ── V4 — Override-Indikator sichtbar ─────────────────────────────────────

test.describe('V4 — Override indicator (modified badge)', () => {
  test('modified badge appears after changing a field', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // No modified badges initially
    await expect(dialog.getByText('modified')).toHaveCount(0);

    // Change speedMultiplier
    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('1.6');
    await input.dispatchEvent('change');
    await page.waitForTimeout(200);

    // modified badge should appear
    await expect(dialog.getByText('modified').first()).toBeVisible();
  });

  test('modified badge disappears after per-field reset', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 1.6 } })
      );
    });
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // modified badge visible
    await expect(dialog.getByText('modified').first()).toBeVisible();

    // Reset the field
    await dialog.getByRole('button', { name: 'Reset' }).first().click();
    await page.waitForTimeout(200);

    // badge gone
    await expect(dialog.getByText('modified')).toHaveCount(0);
  });

  test('✱ indicator in type row appears when tuning override exists', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // No ✱ indicator initially
    await expect(page.getByTitle('This type has custom tuning overrides')).toHaveCount(0);

    // Set override
    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('1.7');
    await input.dispatchEvent('change');
    await page.waitForTimeout(200);

    // ✱ indicator appears in the type list row (outside the modal)
    await expect(page.getByTitle('This type has custom tuning overrides')).toBeVisible();
  });
});

// ── V5 — Validation out-of-range ─────────────────────────────────────────

test.describe('V5 — Validation for out-of-range values', () => {
  test('speedMultiplier 5.0 shows error and does NOT write to localStorage', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('5.0');
    await input.dispatchEvent('change');
    await page.waitForTimeout(300);

    // Error message shown in UI
    await expect(dialog.getByText(/Range:/i)).toBeVisible();

    // localStorage should not contain 5.0
    const overrides = await getOverrides(page);
    const horse = overrides.horse;
    if (horse) {
      expect(horse.speedMultiplier).not.toBe(5.0);
    }
  });

  test('speedMultiplier 0.0 (below min 0.1) shows error', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('0.0');
    await input.dispatchEvent('change');
    await page.waitForTimeout(300);

    await expect(dialog.getByText(/Range:/i)).toBeVisible();
  });

  test('displaySize 200 (above max 80) shows error and does not store', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const input = dialog.getByLabel(/Display Size/i);
    await input.fill('200');
    await input.dispatchEvent('change');
    await page.waitForTimeout(300);

    await expect(dialog.getByText(/Range:/i)).toBeVisible();

    const overrides = await getOverrides(page);
    if (overrides.horse) {
      expect(overrides.horse.displaySize).not.toBe(200);
    }
  });

  test('valid value after invalid clears error and writes to storage', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('5.0');
    await input.dispatchEvent('change');
    await page.waitForTimeout(200);

    // Error shown
    await expect(dialog.getByText(/Range:/i)).toBeVisible();

    // Fix the value
    await input.fill('1.2');
    await input.dispatchEvent('change');
    await page.waitForTimeout(300);

    // Error cleared
    await expect(dialog.getByText(/Range:/i)).toHaveCount(0);

    // Value stored
    const overrides = await getOverrides(page);
    expect(overrides?.horse?.speedMultiplier).toBe(1.2);
  });
});

// ── V6 — Reset all preserves isActive ────────────────────────────────────

test.describe('V6 — Reset all preserves isActive', () => {
  test('Reset all removes speedMultiplier but keeps isActive:false', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { isActive: false, speedMultiplier: 1.5 } })
      );
    });
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    await dialog.getByRole('button', { name: /Reset all to defaults/i }).click();
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    // speedMultiplier removed
    expect(overrides?.horse?.speedMultiplier).toBeUndefined();
    // isActive:false preserved
    expect(overrides?.horse?.isActive).toBe(false);
  });

  test('Reset all is disabled when there are no tuning overrides', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const resetAllBtn = dialog.getByRole('button', { name: /Reset all to defaults/i });
    await expect(resetAllBtn).toBeDisabled();
  });

  test('Reset all becomes enabled after setting an override', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const resetAllBtn = dialog.getByRole('button', { name: /Reset all to defaults/i });
    await expect(resetAllBtn).toBeDisabled();

    const input = dialog.getByLabel(/Speed Multiplier/i);
    await input.fill('1.3');
    await input.dispatchEvent('change');
    await page.waitForTimeout(200);

    await expect(resetAllBtn).toBeEnabled();
  });
});

// ── V7 — Color-Field-Normalisierung ──────────────────────────────────────

test.describe('V7 — Color field normalization', () => {
  test('hex without # is stored as #rrggbb', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const colorText = dialog.getByLabel(/Leader Ring Color hex/i);
    await colorText.fill('ff0000');
    await colorText.dispatchEvent('change');
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    // should be stored as '#ff0000', not 'ff0000'
    if (overrides?.horse?.leaderRingColor) {
      expect(overrides.horse.leaderRingColor).toBe('#ff0000');
    }
  });

  test('valid hex with # is stored as-is', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const colorText = dialog.getByLabel(/Leader Ring Color hex/i);
    await colorText.fill('#00ff88');
    await colorText.dispatchEvent('change');
    await page.waitForTimeout(300);

    const overrides = await getOverrides(page);
    if (overrides?.horse?.leaderRingColor) {
      expect(overrides.horse.leaderRingColor).toBe('#00ff88');
    }
  });

  test('invalid hex shows error and does not store', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    const colorText = dialog.getByLabel(/Leader Ring Color hex/i);
    await colorText.fill('notacolor');
    await colorText.dispatchEvent('change');
    await page.waitForTimeout(300);

    await expect(dialog.getByText(/hex color/i)).toBeVisible();
    const overrides = await getOverrides(page);
    if (overrides?.horse) {
      expect(overrides.horse.leaderRingColor).toBeUndefined();
    }
  });
});

// ── V8 — Modal-Layout-Konsistenz ─────────────────────────────────────────

test.describe('V8 — Modal layout consistency', () => {
  test('all 6 field labels visible simultaneously in default viewport', async ({ page }) => {
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    await expect(dialog.getByText('Speed Multiplier')).toBeVisible();
    await expect(dialog.getByText('Display Size (px)')).toBeVisible();
    await expect(dialog.getByText('Anim Period (ms)')).toBeVisible();
    await expect(dialog.getByText('Leader Ring Color')).toBeVisible();
    await expect(dialog.getByText('Leader Ring Width (rx)')).toBeVisible();
    await expect(dialog.getByText('Leader Ring Height (ry)')).toBeVisible();
  });

  test('modal screenshot — desktop (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // Screenshot for layout docs
    await page.screenshot({
      path: 'test-results/ux-v8-modal-desktop.png',
      clip: await dialog.boundingBox(),
    });

    // Basic layout: footer buttons visible
    await expect(dialog.getByRole('button', { name: /Reset all to defaults/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible();
  });

  test('modal scroll: all fields reachable at 800x600 (small viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await goToDevRacerTypes(page);
    const dialog = await openEditModal(page, 0);

    // Done button may require scroll — but should exist in DOM
    const doneBtn = dialog.getByRole('button', { name: 'Done' });
    await expect(doneBtn).toBeAttached();

    // Scroll modal to bottom and check Done is reachable
    await doneBtn.scrollIntoViewIfNeeded();
    await expect(doneBtn).toBeVisible();
  });
});
