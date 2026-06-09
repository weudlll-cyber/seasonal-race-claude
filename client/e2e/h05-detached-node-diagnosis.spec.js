// ============================================================
// File:        h05-detached-node-diagnosis.spec.js
// Path:        client/e2e/h05-detached-node-diagnosis.spec.js
// Project:     RaceArena
// Description: H-05 Phase 1b — detached-node leak identification via CDP.
//              Uses Performance.getMetrics() "Nodes" (total including detached)
//              and HeapProfiler.collectGarbage() before each sample.
//              After 15 cycles takes a heap snapshot to identify which node types
//              accumulate and what retains them.
//              TEMPORARY — remove after H-05 measurement.
// ============================================================

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports/audit');
const RAW_PATH = resolve(REPORTS_DIR, 'H05B-RAW-DATA.json');
const SNAP_ANALYSIS_PATH = resolve(REPORTS_DIR, 'H05B-SNAPSHOT-ANALYSIS.json');

// ── Shared oval geometry (same as Phase 1a) ────────────────────────────────
const DIAG_GEOM = {
  id: 'h05-diag-oval',
  name: 'H05 Diag Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1280,
  worldHeight: 720,
  innerPoints: [
    { x: 350, y: 260 }, { x: 640, y: 220 }, { x: 930, y: 260 }, { x: 980, y: 360 },
    { x: 930, y: 460 }, { x: 640, y: 500 }, { x: 350, y: 460 }, { x: 300, y: 360 },
  ],
  outerPoints: [
    { x: 300, y: 200 }, { x: 640, y: 150 }, { x: 980, y: 200 }, { x: 1050, y: 360 },
    { x: 980, y: 520 }, { x: 640, y: 570 }, { x: 300, y: 520 }, { x: 230, y: 360 },
  ],
};

async function seedStorage(page) {
  await page.addInitScript((geom) => {
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    const existing = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') || '[]');
    if (!existing.includes(geom.id)) existing.push(geom.id);
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));
    const rawTracks = localStorage.getItem('racearena:tracks');
    const tracks = rawTracks ? JSON.parse(rawTracks) : [];
    const updated = tracks.map((t) =>
      t.id === 'dirt-oval' ? { ...t, geometryId: geom.id } : t
    );
    if (!updated.some((t) => t.id === 'dirt-oval')) {
      updated.push({
        id: 'dirt-oval', name: 'Dirt Oval', icon: '🐴',
        description: 'Classic oval on packed earth.',
        defaultRacerTypeId: 'horse',
        geometryId: geom.id, color: '#a0522d',
        defaultDuration: 60, defaultWinners: 3, difficulty: 'medium',
        surfaceClasses: ['earth'], worldWidth: 1280, worldHeight: 720, isDefault: true,
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));
  }, DIAG_GEOM);
}

// ── CDP helpers ────────────────────────────────────────────────────────────

async function enableCdp(cdp) {
  await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
  await cdp.send('HeapProfiler.enable');
}

async function forceGcAndSample(cdp, page) {
  // Force GC via CDP (more reliable than window.gc())
  await cdp.send('HeapProfiler.collectGarbage');
  // Small settle pause after GC
  await page.waitForTimeout(150);

  const perfResult = await cdp.send('Performance.getMetrics');
  const nodesMetric = perfResult.metrics.find((m) => m.name === 'Nodes');
  const cdpNodes = nodesMetric ? Math.round(nodesMetric.value) : null;

  const attachedNodes = await page.evaluate(() => document.querySelectorAll('*').length);

  return { cdpNodes, attachedNodes, detachedNodes: cdpNodes != null ? cdpNodes - attachedNodes : null };
}

// ── Heap snapshot analysis ─────────────────────────────────────────────────

async function takeAndAnalyzeSnapshot(cdp) {
  console.log('[H05B] Taking heap snapshot (this may take ~10–30s)…');
  const chunks = [];

  const onChunk = ({ chunk }) => chunks.push(chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);

  await cdp.send('HeapProfiler.takeHeapSnapshot', {
    reportProgress: false,
    treatGlobalObjectsAsRoots: true,
    captureNumericValue: false,
  });

  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);

  const raw = chunks.join('');
  console.log(`[H05B] Snapshot size: ${(raw.length / 1e6).toFixed(1)} MB`);

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch (e) {
    return { error: `JSON parse failed: ${e.message}` };
  }

  const meta = snapshot.snapshot?.meta;
  if (!meta) return { error: 'No meta in snapshot' };

  const nodeFields = meta.node_fields;
  const nameIdx = nodeFields.indexOf('name');
  const detachednessIdx = nodeFields.indexOf('detachedness');
  const fieldCount = nodeFields.length;
  const strings = snapshot.strings;
  const nodes = snapshot.nodes;

  if (detachednessIdx === -1) {
    // Fallback: count all HTMLElement-pattern names (may include attached ones)
    console.log('[H05B] No detachedness field — falling back to name-pattern scan');
    const htmlPattern = /^HTML\w+Element$|^SVG\w+Element$|^Text$|^Document\w*$/;
    const byName = {};
    const total = nodes.length / fieldCount;
    for (let i = 0; i < total; i++) {
      const name = strings[nodes[i * fieldCount + nameIdx]];
      if (htmlPattern.test(name)) {
        byName[name] = (byName[name] || 0) + 1;
      }
    }
    return { method: 'name-pattern-fallback', detachednessFieldPresent: false, byName };
  }

  // Primary path: use detachedness == 2 (kDetached)
  const detachedByName = {};
  const total = nodes.length / fieldCount;
  for (let i = 0; i < total; i++) {
    const base = i * fieldCount;
    if (nodes[base + detachednessIdx] === 2) {
      const name = strings[nodes[base + nameIdx]];
      detachedByName[name] = (detachedByName[name] || 0) + 1;
    }
  }

  // Sort by count descending
  const sorted = Object.entries(detachedByName)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30); // top 30

  const totalDetached = Object.values(detachedByName).reduce((s, v) => s + v, 0);

  return {
    method: 'detachedness-field',
    detachednessFieldPresent: true,
    totalDetachedNodes: totalDetached,
    top30ByType: Object.fromEntries(sorted),
  };
}

// ── Main test ──────────────────────────────────────────────────────────────

test('H05B — detached-node leak identification via CDP', async ({ page, browser }) => {
  test.setTimeout(600_000); // 10 min max (heap snapshot can be slow)

  // Open CDP session on this page
  const cdp = await page.context().newCDPSession(page);

  await seedStorage(page);
  await page.goto('/setup');

  await enableCdp(cdp);

  // Wait for diag API
  await page.waitForFunction(() => typeof window.__raceDiagCapture === 'function', {
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /Quick Test/ }).first()).toBeVisible({ timeout: 10_000 });

  const rows = [];

  // ── Baseline (on Setup, before any race) ──────────────────────────────
  const baseline = await forceGcAndSample(cdp, page);
  rows.push({ cycle: 0, phase: 'baseline', ...baseline });
  console.log(`[H05B] Baseline: cdpNodes=${baseline.cdpNodes}, attached=${baseline.attachedNodes}, detached=${baseline.detachedNodes}`);

  // ── 15 cycles ─────────────────────────────────────────────────────────
  const CYCLES = 15;
  for (let i = 1; i <= CYCLES; i++) {
    // Setup → Race
    await page.getByRole('button', { name: /Quick Test/ }).first().click();
    await page.waitForURL('**/race', { timeout: 15_000 });
    await page.waitForTimeout(1_000); // let race loop run

    // Sample ON the race screen (before going back)
    const raceSample = await forceGcAndSample(cdp, page);
    rows.push({ cycle: i, phase: 'race-screen', ...raceSample });

    // Race → Setup
    const backBtn = page.getByRole('button', { name: /← Setup|Setup/ }).first();
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
    await backBtn.click();
    await page.waitForURL('**/setup', { timeout: 15_000 });
    await page.waitForTimeout(500);

    // Sample ON Setup after return (with forced GC — this is the critical measurement)
    const setupSample = await forceGcAndSample(cdp, page);
    rows.push({ cycle: i, phase: 'setup-after-return', ...setupSample });

    console.log(
      `[H05B] Cycle ${i}: race cdpNodes=${raceSample.cdpNodes} (det=${raceSample.detachedNodes}) → setup cdpNodes=${setupSample.cdpNodes} (det=${setupSample.detachedNodes})`
    );
  }

  // ── Heap snapshot analysis ─────────────────────────────────────────────
  // Force a final GC before snapshot so we only see truly retained nodes
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(500);

  const snapshotAnalysis = await takeAndAnalyzeSnapshot(cdp);
  console.log('[H05B] Snapshot analysis:', JSON.stringify(snapshotAnalysis, null, 2));

  // ── Persist results ────────────────────────────────────────────────────
  try {
    mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(RAW_PATH, JSON.stringify(rows, null, 2));
    writeFileSync(SNAP_ANALYSIS_PATH, JSON.stringify(snapshotAnalysis, null, 2));
    console.log(`[H05B] Raw data → ${RAW_PATH}`);
    console.log(`[H05B] Snapshot analysis → ${SNAP_ANALYSIS_PATH}`);
  } catch (err) {
    console.error('[H05B] Write error:', err.message);
  }

  // ── Print table ────────────────────────────────────────────────────────
  console.log('\n[H05B] CDP node table:');
  console.log(JSON.stringify(rows, null, 2));

  expect(rows.length).toBeGreaterThan(0);
  expect(snapshotAnalysis).toBeDefined();
  expect(snapshotAnalysis.error).toBeUndefined();
});
