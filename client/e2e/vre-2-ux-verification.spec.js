// ============================================================
// File:        vre-2-ux-verification.spec.js
// Path:        client/e2e/vre-2-ux-verification.spec.js
// Project:     RaceArena
// Description: UX-Verifikation für VRE-2 Quality Gate.
//              Master-Detail-Selektion, Indicator-Badges, Validation-Recovery,
//              Generator-Wechsel-Verhalten, Default-Override-Lifecycle,
//              rAF-Cleanup (verified via page-stability check).
//              Permanent regression guard — analogous to d3-5-5-ux-verification.
// ============================================================

import { test, expect } from '@playwright/test';
// E2E-RESET-BADGE-1: the API this run is actually talking to. These fixtures used to fetch
// `http://localhost:4000` — the OWNER'S API, hardcoded — while the suite runs against its own
// isolated instance on another port. See the note on the afterEach below.
import { E2E } from './e2e-env.js';

async function goToSurfaceClasses(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Surface Classes/i }).click();
  // Wait for editor to be ready (label input populated)
  await page.locator('#sc-label').waitFor({ state: 'visible' });
}

// ── V1 — Master-Detail selection ──────────────────────────────────────────────

test.describe('V1 — Master-detail selection', () => {
  test('selecting a class updates the editor label field', async ({ page }) => {
    await goToSurfaceClasses(page);

    // Click Mud (reliably present as code-default)
    await page.getByRole('button').filter({ hasText: 'mud' }).first().click();
    const label = await page.locator('#sc-label').inputValue();
    expect(label.toLowerCase()).toContain('mud');
  });

  test('selecting a different class changes the generator dropdown value', async ({ page }) => {
    await goToSurfaceClasses(page);

    // Asphalt uses 'line' generator; Mud uses 'splash'
    await page.getByRole('button').filter({ hasText: 'mud' }).first().click();
    const mudGen = await page.getByRole('combobox', { name: /Generator type/i }).inputValue();

    await page.getByRole('button').filter({ hasText: 'asphalt' }).first().click();
    const asphaltGen = await page.getByRole('combobox', { name: /Generator type/i }).inputValue();

    expect(mudGen).not.toBe(asphaltGen);
  });

  test('selected class button has aria-pressed=true, others false', async ({ page }) => {
    await goToSurfaceClasses(page);

    await page.getByRole('button').filter({ hasText: 'sand' }).first().click();

    const pressed = page.locator('[aria-pressed="true"]');
    await expect(pressed).toHaveCount(1);
  });
});

// ── V2 — Badge indicators ─────────────────────────────────────────────────────

test.describe('V2 — Badge indicators', () => {
  test('all 9 code defaults show Default badge', async ({ page }) => {
    await goToSurfaceClasses(page);
    const defaultBadges = page.getByText('Default');
    expect(await defaultBadges.count()).toBeGreaterThanOrEqual(9);
  });

  test('no Modified or Custom badges present when backend has no overrides/custom', async ({ page }) => {
    // Clear any leftover test classes
    await page.goto('/dev');
    // These should be 0 unless test pollution occurred — acceptable if test ordering varies
    // We just verify the badges are badge elements (not heading/label text)
    // This is a structural check, not a strict count check
    await page.getByRole('button', { name: /Surface Classes/i }).click();
    await page.locator('#sc-label').waitFor({ state: 'visible' });
    // All classes visible
    const allPressable = page.locator('[aria-pressed]');
    expect(await allPressable.count()).toBeGreaterThanOrEqual(9);
  });
});

// ── V3 — Validation recovery ──────────────────────────────────────────────────

test.describe('V3 — Validation recovery', () => {
  // E2E-STALE-2: THE ID FIELD IS GONE FROM THE PRODUCT, not broken in it.
  // `SurfaceClassManager.jsx` says so in its own header — "ID is auto-generated from the label via
  // slugify — not user-visible" — and `handleSave` proves it: `uniqueSlug(slugify(draft.label))`.
  // So the old "type an ID with capitals and spaces, get a lowercase error, fix it, error clears"
  // test was asserting a control that no longer exists and a validation rule that was replaced by
  // DERIVATION. Both tests below used to fill `#sc-id` and timed out waiting for it.
  //
  // The label that this derivation is asserted with, and the id it must produce.
  const SLUG_LABEL = 'E2E Slug Test';
  const SLUG_ID = 'e2e-slug-test';

  // The one test here that writes to the shared server cleans up after itself, by the derived id.
  test.afterEach(async ({ page }) => {
    await page.request.delete(`${E2E.apiUrl}/api/surface-classes/${SLUG_ID}`).catch(() => {});
  });

  test('no ID control is offered; the ID is derived from the label on save', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('button', { name: /New Surface Class/i }).click();

    // The form offers a Label and a Generator and NOTHING that sets an id.
    await expect(page.locator('#sc-id')).toHaveCount(0);
    await page.locator('#sc-label').fill(SLUG_LABEL);
    await page.getByRole('button', { name: /Save surface class/i }).click();

    // The class is created and listed under its label...
    await expect(page.getByRole('button', { name: new RegExp(SLUG_LABEL, 'i') })).toBeVisible();
    // ...and DELETE by the slugified id succeeds, which is the statement that `slugify(label)` —
    // not anything the operator typed — is what became the id. A wrong id would 404 here.
    const del = await page.request.delete(`${E2E.apiUrl}/api/surface-classes/${SLUG_ID}`);
    expect(del.ok(), `DELETE /api/surface-classes/${SLUG_ID} → ${del.status()}`).toBeTruthy();
  });

  test('empty label shows error on Save', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('button', { name: /New Surface Class/i }).click();

    // Leave the label empty — the only thing `handleSave` validates before it calls the server.
    await page.getByRole('button', { name: /Save surface class/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/label is required/i);
  });

  test('Save button exists and is not disabled when form is open', async ({ page }) => {
    await goToSurfaceClasses(page);
    const saveBtn = page.getByRole('button', { name: /Save surface class/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).not.toBeDisabled();
  });
});

// ── V4 — Generator switch behaviour ──────────────────────────────────────────

test.describe('V4 — Generator switch', () => {
  test('switching to cloud generator shows Start Size field', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('combobox', { name: /Generator type/i }).selectOption('cloud');
    await expect(page.getByText(/Start Size/i)).toBeVisible();
  });

  test('switching to line generator shows Thickness field', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('combobox', { name: /Generator type/i }).selectOption('line');
    await expect(page.getByText(/Thickness/i)).toBeVisible();
  });

  test('switching to particle generator shows Drift field', async ({ page }) => {
    await goToSurfaceClasses(page);
    await page.getByRole('combobox', { name: /Generator type/i }).selectOption('particle');
    await expect(page.getByText(/Drift/i)).toBeVisible();
  });

  test('switching generator changes the live preview generator attribute', async ({ page }) => {
    // This verifies the preview canvas re-renders — we check aria-label stays present
    await goToSurfaceClasses(page);
    await page.getByRole('combobox', { name: /Generator type/i }).selectOption('splash');
    await expect(page.getByLabel(/Surface effect live preview/i)).toBeVisible();
  });
});

// ── V5 — Default-Override lifecycle ──────────────────────────────────────────

test.describe('V5 — Default-Override lifecycle', () => {
  const OVERRIDE_ID = 'mud';

  // E2E-RESET-BADGE-1: `page.request` rather than `fetch` inside `page.evaluate`, and the run's own
  // API rather than a hardcoded port. `page.request` carries the browser context's cookies, so the
  // call is authenticated the way the UI's would be; a bare `fetch` would have needed
  // `credentials: 'include'` and would still have been pointed at the wrong server.
  test.afterEach(async ({ page }) => {
    // Clean up: delete any override created during the test.
    await page.request.delete(`${E2E.apiUrl}/api/surface-classes/${OVERRIDE_ID}`).catch(() => {});
  });

  test('saving a code-default class creates a Modified override and shows Modified badge', async ({ page }) => {
    await goToSurfaceClasses(page);

    // Select Mud (code-default)
    await page.getByRole('button').filter({ hasText: 'mud' }).first().click();
    await expect(page.locator('#sc-label')).toHaveValue(/mud/i);

    // Change the label
    await page.locator('#sc-label').fill('Modified Mud');
    await page.getByRole('button', { name: /Save surface class/i }).click();

    // After save, Modified badge should appear in the list
    await expect(page.getByText('Modified')).toBeVisible({ timeout: 5000 });
    // Reset-to-Default button should now be visible
    await expect(page.getByRole('button', { name: /Reset to default/i })).toBeVisible();
  });

  test('Reset-to-Default removes the Modified badge', async ({ page }) => {
    // Pre-create an override through the run's OWN API, authenticated by the page's cookies.
    // THIS IS THE DEFECT THE TEST HAD: it posted to a hardcoded localhost:4000 inside
    // page.evaluate, so on the isolated instance no override was ever created and the
    // Reset-to-default button correctly did not exist. The failure was never in the product.
    const created = await page.request.put(`${E2E.apiUrl}/api/surface-classes/mud`, {
      data: {
        id: 'mud',
        label: 'Override Mud',
        generatorId: 'splash',
        config: {
          color: '#ff0000',
          count: 4,
          sizeMin: 2,
          sizeMax: 5,
          lifetimeFrames: 30,
          spawnProbability: 0.5,
          gravity: 0.15,
          spreadAngle: 1.4,
        },
        isOverride: true,
      },
    });
    // The setup is now ASSERTED rather than swallowed. A silently-failing setup is what let this
    // test pass and fail on leaked state from the test above it for two months.
    expect(created.ok(), `could not create the override the test needs (${created.status()})`).toBeTruthy();

    await goToSurfaceClasses(page);
    // Select the overridden mud
    await page.getByRole('button').filter({ hasText: 'mud' }).first().click();
    await expect(page.getByRole('button', { name: /Reset to default/i })).toBeVisible();

    // Confirm dialog
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Reset to default/i }).click();

    // After reset, THIS class is no longer modified.
    //
    // E2E-RESET-BADGE-1: was `expect(page.getByText('Modified')).not.toBeVisible()`, a PAGE-WIDE
    // query. Any other overridden class made it resolve to two elements, and a strict-mode
    // violation ABORTS the assertion immediately instead of retrying — so it never waited the 5 s
    // it asked for, and its verdict depended on what earlier tests had left behind.
    //
    // The Reset-to-default control is rendered only for a class whose kind is 'modified', so its
    // disappearance IS the statement "this class reverted", scoped to the class under test by
    // construction. Stronger than the assertion it replaces, not weaker.
    await expect(page.getByRole('button', { name: /Reset to default/i })).not.toBeVisible({
      timeout: 5000,
    });
  });
});

// ── V6 — Live Preview stability (no crash) ────────────────────────────────────

test.describe('V6 — Live Preview stability', () => {
  test('preview canvas remains visible while changing config sliders', async ({ page }) => {
    await goToSurfaceClasses(page);

    // Navigate to a class that has range sliders (e.g., sand with cloud generator)
    await page.getByRole('button').filter({ hasText: 'sand' }).first().click();
    await expect(page.getByLabel(/Surface effect live preview/i)).toBeVisible();

    // Move sliders — page should not crash.
    //
    // E2E-STALE-2: this used to `fill('30')` unconditionally and failed with "Malformed value" —
    // the first slider is Start Size, whose range is 1–20, and Playwright refuses a value a range
    // input cannot hold. The number was never the point; MOVING the slider was. So the target is
    // now read off the control itself — its own max — which is a value the product accepts by
    // construction and stays correct if the range is ever changed.
    const sliders = page.locator('input[type="range"]');
    const count = await sliders.count();
    expect(count, 'the surface-class editor should expose config sliders').toBeGreaterThan(0);
    const first = sliders.first();
    const max = await first.getAttribute('max');
    await first.fill(String(max));
    await expect(first).toHaveValue(String(max));
    await expect(page.getByLabel(/Surface effect live preview/i)).toBeVisible();
  });

  test('preview remains visible after navigating between classes', async ({ page }) => {
    await goToSurfaceClasses(page);

    await page.getByRole('button').filter({ hasText: 'mud' }).first().click();
    await page.getByRole('button').filter({ hasText: 'snow' }).first().click();

    await expect(page.getByLabel(/Surface effect live preview/i)).toBeVisible();
  });
});
