// ============================================================
// File:        perf-reality-check.spec.js
// Path:        client/e2e/perf-reality-check.spec.js
// Project:     RaceArena
// Description: PERF-REALITY STEP 2 — measures rAF frame timing on DEV vs PROD
//              builds using the minimal rAFProbe ring buffer (?perfprobe=1).
//              Scenario: 70 racers, Space Sprint (open track, curvy geometry),
//              run long enough to pass the first leader phase and enter OVERVIEW
//              with zoom transitions — matching the real-game camera behavior
//              the owner observed stutter on.
//
//              Run with:
//                DEV:  npx playwright test --config=playwright.perf-dev.config.js
//                PROD: (kill node) npx playwright test --config=playwright.perf-prod.config.js
//
//              Output written to reports/audit/PERF-REALITY-DEV.json
//                              and reports/audit/PERF-REALITY-PROD.json
// ============================================================

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports/audit');

// ── Winding open-track geometry ────────────────────────────────────────────
// Curves + elevation changes exercise the full camera director (leader zoom,
// battle zoom, OVERVIEW) — matching real Space Sprint camera behavior.
// 70 racers on a 4000×720 world. Inner/outer boundary ~240 px apart.
const SPACE_SPRINT_GEOM = {
  id: 'perf-sprint-curvy',
  name: 'Perf Sprint (curvy)',
  closed: false,
  backgroundImage: null,
  effects: [],
  worldWidth: 4000,
  worldHeight: 720,
  innerPoints: [
    { x: 80,   y: 300 },
    { x: 400,  y: 260 },
    { x: 700,  y: 310 },
    { x: 1000, y: 260 },
    { x: 1300, y: 310 },
    { x: 1600, y: 260 },
    { x: 1900, y: 320 },
    { x: 2200, y: 270 },
    { x: 2500, y: 320 },
    { x: 2800, y: 265 },
    { x: 3100, y: 315 },
    { x: 3400, y: 270 },
    { x: 3700, y: 300 },
    { x: 3950, y: 285 },
  ],
  outerPoints: [
    { x: 80,   y: 460 },
    { x: 400,  y: 420 },
    { x: 700,  y: 470 },
    { x: 1000, y: 420 },
    { x: 1300, y: 470 },
    { x: 1600, y: 420 },
    { x: 1900, y: 480 },
    { x: 2200, y: 430 },
    { x: 2500, y: 480 },
    { x: 2800, y: 425 },
    { x: 3100, y: 475 },
    { x: 3400, y: 430 },
    { x: 3700, y: 460 },
    { x: 3950, y: 445 },
  ],
};

const N_RACERS = 70;

// ── Storage seeder ────────────────────────────────────────────────────────
async function seedStorage(page) {
  await page.addInitScript(
    ({ geom, nRacers }) => {
      // Probe flag — survives SPA navigation
      sessionStorage.setItem('_ra_perfprobe', '1');

      // Store geometry
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      const gIdx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
      if (!gIdx.includes(geom.id)) gIdx.push(geom.id);
      localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(gIdx));

      // Patch Space Sprint with this geometry
      const rawTracks = localStorage.getItem('racearena:tracks');
      const tracks = rawTracks ? JSON.parse(rawTracks) : [];
      const hasSprint = tracks.some((t) => t.id === 'space-sprint');
      const updated = tracks.map((t) =>
        t.id === 'space-sprint'
          ? { ...t, geometryId: geom.id, worldWidth: geom.worldWidth, worldHeight: geom.worldHeight }
          : t
      );
      if (!hasSprint) {
        updated.push({
          id: 'space-sprint',
          name: 'Space Sprint',
          icon: '🚀',
          description: 'Zero-gravity dash.',
          defaultRacerTypeId: 'rocket',
          geometryId: geom.id,
          color: '#7c3aed',
          defaultDuration: 60,
          defaultWinners: 3,
          difficulty: 'medium',
          surfaceClasses: ['air'],
          worldWidth: geom.worldWidth,
          worldHeight: geom.worldHeight,
          isDefault: true,
        });
      }
      localStorage.setItem('racearena:tracks', JSON.stringify(updated));

      // Pre-seed 70 players via ACTIVE_GROUP (SetupScreen reads this on mount)
      const players = Array.from({ length: nRacers }, (_, i) => ({ name: `R${i + 1}` }));
      localStorage.setItem('racearena:activeGroup', JSON.stringify(players));
    },
    { geom: SPACE_SPRINT_GEOM, nRacers: N_RACERS }
  );
}

// ── Main measurement test ─────────────────────────────────────────────────
test(`PERF-REALITY — ${N_RACERS} racers, Space Sprint, DEV vs PROD probe`, async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);

  await seedStorage(page);
  await page.goto('/setup');

  // Select Space Sprint in the Track tab
  await page.getByRole('tab', { name: 'Track' }).click();
  const sprintBtn = page.getByRole('button', { name: /Space Sprint/ }).first();
  await expect(sprintBtn).toBeVisible({ timeout: 10_000 });
  await sprintBtn.click();

  // Confirm players are loaded (70 pre-seeded via ACTIVE_GROUP)
  await page.getByRole('tab', { name: 'Players' }).click();
  const startBtn = page.getByRole('button', { name: /Start Race/ });
  await expect(startBtn).toBeEnabled({ timeout: 10_000 });

  // Start the race
  await startBtn.click();
  await page.waitForURL('**/race', { timeout: 15_000 });

  // Wait for the probe to initialise (first rAF fires)
  await page.waitForFunction(() => typeof window.__perfProbe === 'function', { timeout: 10_000 });

  // Run for 30 s — enough to pass countdown → LEADER zoom → OVERVIEW transition
  // and accumulate ~600 frames at 60 fps (fills the ring buffer completely).
  await page.waitForTimeout(30_000);

  // Read the probe
  const stats = await page.evaluate(() => window.__perfProbe());

  if (!stats || stats.n === 0) {
    throw new Error('Probe returned no data — check sessionStorage flag and initProbe() call');
  }

  // Determine label from baseURL
  const baseURL = testInfo.project?.use?.baseURL ?? 'unknown';
  const label = baseURL.includes('4173') ? 'PROD' : 'DEV';
  const outFile = resolve(REPORTS_DIR, `PERF-REALITY-${label}.json`);

  const result = {
    label,
    baseURL,
    nRacers: N_RACERS,
    track: 'space-sprint (curvy, open)',
    stats,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n[PERF-REALITY ${label}] ${JSON.stringify(stats, null, 2)}`);

  try {
    mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(outFile, JSON.stringify(result, null, 2));
    console.log(`[PERF-REALITY] Written → ${outFile}`);
  } catch (err) {
    console.error('[PERF-REALITY] Write error:', err.message);
  }

  expect(stats.n).toBeGreaterThan(100);
});
