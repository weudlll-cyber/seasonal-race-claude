// ============================================================
// File:        camera-polish-smoke.spec.js
// Path:        client/e2e/camera-polish-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Smoke tests for camera polish (PR #28):
//              - Base Speed section in Dev Screen (tunable range)
//              - Dev Screen loads without JS errors
// ============================================================

import { test, expect } from '@playwright/test';

test.describe('Base Speed section in Dev Screen', () => {
  test('Base Speed section is accessible via Dev Screen nav', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    await expect(page.getByText('Racer Base Speed Range')).toBeVisible();
  });

  test('Min Speed and Max Speed labels are visible', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    await expect(page.getByText('Min Speed').first()).toBeVisible();
    await expect(page.getByText('Max Speed').first()).toBeVisible();
  });

  test('Min Speed shows default value 0.00091', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const minInput = page.locator('input[type="number"]').first();
    await expect(minInput).toHaveValue('0.00091');
  });

  test('Max Speed shows default value 0.00118', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    const maxInput = page.locator('input[type="number"]').nth(1);
    await expect(maxInput).toHaveValue('0.00118');
  });

  test('Spread Preview card is visible', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    await expect(page.getByText('Spread Preview')).toBeVisible();
  });

  test('Reset Defaults button is present', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    await expect(page.getByRole('button', { name: /Reset Defaults/ })).toBeVisible();
  });

  test('spread preview shows ±% value', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    // Preview paragraph shows "±X.X% from mean"
    await expect(page.locator('p').filter({ hasText: /±/ })).toBeVisible();
  });

  test('Dev Screen loads without JS errors on Base Speed section', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/dev');
    await page.getByRole('button', { name: /Base Speed/ }).click();
    await expect(page.getByText('Racer Base Speed Range')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
