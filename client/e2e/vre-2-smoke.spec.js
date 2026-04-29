// ============================================================
// File:        vre-2-smoke.spec.js
// Path:        client/e2e/vre-2-smoke.spec.js
// Project:     RaceArena
// Description: Playwright smoke tests for VRE-2 — Surface-Class Editor.
//              Tests: section navigation, class list, badge rendering,
//              class selection, editor form, new-class save flow.
//              Backend calls go to the real running server (port 4000).
// ============================================================

import { test, expect } from '@playwright/test';

async function goToSurfaceClasses(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Surface Classes/i }).click();
}

// ── T1 — Section navigation ───────────────────────────────────────────────────

test.describe('VRE-2 — Section navigation', () => {
  test('Surface Classes nav item is visible in Dev-Screen sidebar', async ({ page }) => {
    await page.goto('/dev');
    await expect(page.getByRole('button', { name: /Surface Classes/i })).toBeVisible();
  });

  test('clicking Surface Classes nav item shows the section', async ({ page }) => {
    await goToSurfaceClasses(page);
    await expect(page.getByText(/Live Preview/i)).toBeVisible();
  });
});

// ── T2 — Class list ───────────────────────────────────────────────────────────

test.describe('VRE-2 — Class list', () => {
  test('shows at least the 9 code-default surface classes', async ({ page }) => {
    await goToSurfaceClasses(page);
    // Each class has a button; the 9 defaults should always be present
    const classButtons = page.locator('[aria-pressed]');
    await expect(classButtons.first()).toBeVisible();
    expect(await classButtons.count()).toBeGreaterThanOrEqual(9);
  });

  test('Default badge is visible for code-default classes', async ({ page }) => {
    await goToSurfaceClasses(page);
    await expect(page.getByText('Default').first()).toBeVisible();
  });

  test('+ New Surface Class button is present', async ({ page }) => {
    await goToSurfaceClasses(page);
    await expect(page.getByRole('button', { name: /New Surface Class/i })).toBeVisible();
  });
});

// ── T3 — Class selection & editor ────────────────────────────────────────────

test.describe('VRE-2 — Class selection and editor', () => {
  test('first class is auto-selected on mount', async ({ page }) => {
    await goToSurfaceClasses(page);
    // A label input should be populated (editor is open)
    const labelInput = page.locator('#sc-label');
    await expect(labelInput).toBeVisible();
    const val = await labelInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  test('clicking Mud class populates editor with Mud', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('button', { name: /mud/i }).first().click();
    const labelInput = page.locator('#sc-label');
    await expect(labelInput).toHaveValue(/mud/i);
  });

  test('ID field is read-only for existing class', async ({ page }) => {
    await goToSurfaceClasses(page);
    const idInput = page.locator('#sc-id');
    await expect(idInput).toBeVisible();
    const readOnly = await idInput.getAttribute('readonly');
    expect(readOnly).not.toBeNull();
  });

  test('Generator dropdown is present and populated', async ({ page }) => {
    await goToSurfaceClasses(page);
    const genSelect = page.getByRole('combobox', { name: /Generator type/i });
    await expect(genSelect).toBeVisible();
    // Should have at least the 4 generators
    const options = genSelect.locator('option');
    expect(await options.count()).toBeGreaterThanOrEqual(4);
  });

  test('Live Preview canvas is visible when class is selected', async ({ page }) => {
    await goToSurfaceClasses(page);
    await expect(page.getByLabel(/Surface effect live preview/i)).toBeVisible();
  });

  test('changing generator dropdown changes the generator', async ({ page }) => {
    await goToSurfaceClasses(page);
    const genSelect = page.getByRole('combobox', { name: /Generator type/i });
    await genSelect.selectOption('cloud');
    // After switching to cloud, Start Size field should appear
    await expect(page.getByText(/Start Size/i)).toBeVisible();
  });
});

// ── T4 — New class save flow ─────────────────────────────────────────────────

test.describe('VRE-2 — New class creation', () => {
  const TEST_ID = `test-smoke-${Date.now()}`;

  test.afterEach(async ({ page }) => {
    // Clean up: delete the test class if it was created
    await page.evaluate(async (id) => {
      try {
        await fetch(`http://localhost:4000/api/surface-classes/${id}`, { method: 'DELETE' });
      } catch {}
    }, TEST_ID);
  });

  test('+ New opens a blank form with editable ID', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('button', { name: /New Surface Class/i }).click();
    const idInput = page.locator('#sc-id');
    await expect(idInput).toBeVisible();
    expect(await idInput.getAttribute('readonly')).toBeNull();
  });

  test('creating a new custom class adds it to the list', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('button', { name: /New Surface Class/i }).click();

    await page.locator('#sc-label').fill('Smoke Test Class');
    await page.locator('#sc-id').fill(TEST_ID);

    await page.getByRole('button', { name: /Save surface class/i }).click();

    // After save, the new label should appear in the list
    await expect(page.getByText('Smoke Test Class')).toBeVisible({ timeout: 5000 });
    // Custom badge should be present
    await expect(page.getByText('Custom').first()).toBeVisible();
  });
});

// ── T5 — Save / Cancel ───────────────────────────────────────────────────────

test.describe('VRE-2 — Save and Cancel', () => {
  test('Cancel from new-class form reverts to first class', async ({ page }) => {
    await goToSurfaceClasses(page);
    const origLabel = await page.locator('#sc-label').inputValue();

    await page.getByRole('button', { name: /New Surface Class/i }).click();
    await expect(page.getByText('New Surface Class')).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.locator('#sc-label')).toHaveValue(origLabel);
  });

  test('Save button is present in editor', async ({ page }) => {
    await goToSurfaceClasses(page);
    await expect(page.getByRole('button', { name: /Save surface class/i })).toBeVisible();
  });
});
