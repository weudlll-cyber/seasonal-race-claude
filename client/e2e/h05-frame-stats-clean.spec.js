// ============================================================
// File:        h05-frame-stats-clean.spec.js
// Path:        client/e2e/h05-frame-stats-clean.spec.js
// Project:     RaceArena
// Description: H-05 regression hunt STEP 4 — frame-timing measurement on the
//              clean build (after H-05 diag instrumentation is reverted).
//              Enables the built-in PerfLogHUD via localStorage, runs a 10s
//              Quick Test race on Space Sprint, and reads window.__perfLog
//              exported by PerfLogHUD.
//              TEMPORARY — remove after H-05 regression report is written.
// ============================================================

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports/audit');

// Closed oval geometry for the Quick Test track (Space Sprint is open, use Dirt Oval)
const DIAG_GEOM = {
  id: 'h05-regfix-oval',
  name: 'H05 Regfix Oval',
  closed: false,           // open track — matches Space Sprint behavior
  backgroundImage: null,
  effects: [],
  worldWidth: 4000,
  worldHeight: 720,
  centerPoints: [
    { x: 100, y: 360 }, { x: 800, y: 280 }, { x: 1600, y: 360 },
    { x: 2400, y: 280 }, { x: 3200, y: 360 }, { x: 3900, y: 360 },
  ],
  innerPoints: [],
  outerPoints: [],
};

async function seedStorage(page) {
  await page.addInitScript((geom) => {
    // Store geometry
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const existing = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    if (!existing.includes(geom.id)) existing.push(geom.id);
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));

    // Associate Space Sprint with this geometry
    const rawTracks = localStorage.getItem('racearena:tracks');
    const tracks = rawTracks ? JSON.parse(rawTracks) : [];
    const updated = tracks.map((t) =>
      t.id === 'space-sprint' ? { ...t, geometryId: geom.id } : t
    );
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));

    // Enable PerfLog via camera config
    const camRaw = localStorage.getItem('racearena:cameraConfig');
    const cam = camRaw ? JSON.parse(camRaw) : {};
    cam.enablePerfLog = true;
    localStorage.setItem('racearena:cameraConfig', JSON.stringify(cam));
  }, geom);
}

test('H05 STEP4 — frame stats on clean build (Space Sprint, 20 racers, 10s)', async ({ page }) => {
  test.setTimeout(120_000);

  await page.addInitScript((geom) => {
    // Store geometry
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const existing = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    if (!existing.includes(geom.id)) existing.push(geom.id);
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));
    // Associate Dirt Oval (which supports Quick Test via dirt-oval) with this geometry
    const rawTracks = localStorage.getItem('racearena:tracks');
    const tracks = rawTracks ? JSON.parse(rawTracks) : [];
    const updated = tracks.map((t) =>
      t.id === 'dirt-oval' ? { ...t, geometryId: geom.id } : t
    );
    if (!updated.some((t) => t.id === 'dirt-oval')) {
      updated.push({
        id: 'dirt-oval', name: 'Dirt Oval', icon: '🐴',
        description: 'Classic oval',
        defaultRacerTypeId: 'horse', geometryId: geom.id, color: '#a0522d',
        defaultDuration: 60, defaultWinners: 3, difficulty: 'medium',
        surfaceClasses: ['earth'], worldWidth: 1280, worldHeight: 720, isDefault: true,
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));
    // Enable PerfLog
    const camRaw = localStorage.getItem('racearena:cameraConfig');
    const cam = camRaw ? JSON.parse(camRaw) : {};
    cam.enablePerfLog = true;
    localStorage.setItem('racearena:cameraConfig', JSON.stringify(cam));
  }, DIAG_GEOM);

  await page.goto('/setup');
  await expect(page.getByRole('button', { name: /Quick Test/ }).first()).toBeVisible({ timeout: 10_000 });

  // Start race
  await page.getByRole('button', { name: /Quick Test/ }).first().click();
  await page.waitForURL('**/race', { timeout: 15_000 });

  // Measure rAF timing directly (10 seconds)
  const frameMs = await page.evaluate(() => {
    return new Promise((resolve) => {
      const frames = [];
      let last = null;
      const collect = (ts) => {
        if (last !== null) frames.push(ts - last);
        last = ts;
        if (frames.length < 600) requestAnimationFrame(collect);
        else resolve(frames);
      };
      requestAnimationFrame(collect);
    });
  });

  // Read PerfLog if available
  const perfLog = await page.evaluate(() => {
    // PerfLogHUD exports window.__perfLogData when enablePerfLog is true
    return window.__perfLogData ?? null;
  });

  // Compute stats
  const sorted = [...frameMs].sort((a, b) => a - b);
  const n = sorted.length;
  const avg = sorted.reduce((s, v) => s + v, 0) / n;
  const p50 = sorted[Math.floor(n * 0.5)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];
  const maxMs = sorted[n - 1];
  const avgFps = 1000 / avg;
  const spikes30ms = frameMs.filter((f) => f > 30).length;
  const spikes100ms = frameMs.filter((f) => f > 100).length;

  const stats = {
    n,
    avgFrameMs: +avg.toFixed(2),
    avgFps: +avgFps.toFixed(1),
    p50Ms: +p50.toFixed(2),
    p95Ms: +p95.toFixed(2),
    p99Ms: +p99.toFixed(2),
    maxMs: +maxMs.toFixed(2),
    spikesOver30ms: spikes30ms,
    spikesOver100ms: spikes100ms,
    hasPerfLog: perfLog !== null,
  };

  console.log('\n[H05-STEP4] Frame stats (clean build):');
  console.log(JSON.stringify(stats, null, 2));
  if (perfLog) {
    console.log('[H05-STEP4] PerfLog summary:');
    console.log(JSON.stringify(perfLog, null, 2));
  }

  try {
    mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(
      resolve(REPORTS_DIR, 'H05-FRAME-STATS-CLEAN.json'),
      JSON.stringify({ stats, rawFrameMs: frameMs, perfLog }, null, 2)
    );
  } catch (e) {
    console.error('[H05-STEP4] Write error:', e.message);
  }

  expect(stats.n).toBeGreaterThan(100);
});
