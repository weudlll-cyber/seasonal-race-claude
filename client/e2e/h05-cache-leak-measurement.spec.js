// ============================================================
// File:        h05-cache-leak-measurement.spec.js
// Path:        client/e2e/h05-cache-leak-measurement.spec.js
// Project:     RaceArena
// Description: H-05 Phase 1 automated measurement — drives 15 Setup→Race→Setup
//              cycles, reads window.__raceDiagTable(), writes results to
//              reports/audit/H05-RAW-DATA.json for report generation.
//              TEMPORARY — remove after H-05 measurement (with instrumentation).
// ============================================================

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../../reports/audit/H05-RAW-DATA.json');

// Closed oval geometry for Dirt Oval (1280×720 world).
const DIAG_GEOM = {
  id: 'h05-diag-oval',
  name: 'H05 Diag Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1280,
  worldHeight: 720,
  innerPoints: [
    { x: 350, y: 260 },
    { x: 640, y: 220 },
    { x: 930, y: 260 },
    { x: 980, y: 360 },
    { x: 930, y: 460 },
    { x: 640, y: 500 },
    { x: 350, y: 460 },
    { x: 300, y: 360 },
  ],
  outerPoints: [
    { x: 300, y: 200 },
    { x: 640, y: 150 },
    { x: 980, y: 200 },
    { x: 1050, y: 360 },
    { x: 980, y: 520 },
    { x: 640, y: 570 },
    { x: 300, y: 520 },
    { x: 230, y: 360 },
  ],
};

async function seedStorage(page) {
  await page.addInitScript((geom) => {
    // Store the geometry
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const existing = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    if (!existing.includes(geom.id)) existing.push(geom.id);
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));

    // Associate Dirt Oval with this geometry
    const rawTracks = localStorage.getItem('racearena:tracks');
    const tracks = rawTracks ? JSON.parse(rawTracks) : [];
    const updated = tracks.map((t) =>
      t.id === 'dirt-oval' ? { ...t, geometryId: geom.id } : t
    );
    if (!updated.some((t) => t.id === 'dirt-oval')) {
      updated.push({
        id: 'dirt-oval',
        name: 'Dirt Oval',
        icon: '🐴',
        description: 'Classic oval on packed earth.',
        defaultRacerTypeId: 'horse',
        geometryId: geom.id,
        color: '#a0522d',
        defaultDuration: 60,
        defaultWinners: 3,
        difficulty: 'medium',
        surfaceClasses: ['earth'],
        worldWidth: 1280,
        worldHeight: 720,
        isDefault: true,
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));
  }, DIAG_GEOM);
}

async function forcedGcIfAvailable(page) {
  await page.evaluate(() => {
    if (typeof gc === 'function') gc();
  }).catch(() => {});
}

test('H05 — 15-cycle cache + DOM/heap leak measurement', async ({ page }) => {
  test.setTimeout(300_000); // 5 min max

  await seedStorage(page);
  await page.goto('/setup');

  // Wait for the diagnostic API to be available (raceDiagnostics.js must have loaded)
  await page.waitForFunction(() => typeof window.__raceDiagCapture === 'function', {
    timeout: 15_000,
  });

  // Verify Quick Test track button is present (Dirt Oval is the default)
  await expect(
    page.getByRole('button', { name: /Quick Test/ }).first()
  ).toBeVisible({ timeout: 10_000 });

  // Capture baseline (before any race)
  await page.evaluate(() => window.__raceDiagCapture('baseline'));

  const CYCLES = 15;
  for (let i = 0; i < CYCLES; i++) {
    // Start race via Quick Test
    await page.getByRole('button', { name: /Quick Test/ }).first().click();
    await page.waitForURL('**/race', { timeout: 15_000 });

    // Let the race loop run for ~1 second to exercise drawing code and caches
    await page.waitForTimeout(1_000);

    // Optional forced GC before reading heap
    await forcedGcIfAvailable(page);

    // Navigate back to Setup via the sidebar button
    const backBtn = page.getByRole('button', { name: /← Setup|Setup/ }).first();
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
    await backBtn.click();
    await page.waitForURL('**/setup', { timeout: 15_000 });

    // Let React settle
    await page.waitForTimeout(500);
  }

  // Final forced GC + read table
  await forcedGcIfAvailable(page);
  const table = await page.evaluate(() => window.__raceDiagTable());

  expect(table).toBeDefined();
  expect(table.length).toBeGreaterThan(0);

  // Persist raw data for report generation
  try {
    mkdirSync(resolve(__dirname, '../../reports/audit'), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(table, null, 2));
    console.log(`[H05] Raw data written to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('[H05] Could not write raw data:', err.message);
  }

  // Log the table to stdout for immediate inspection
  console.log('\n[H05] Measurement table:');
  console.log(JSON.stringify(table, null, 2));
});
