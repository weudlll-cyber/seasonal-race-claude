// ============================================================
// File:        camera-pan-diagnostic.spec.js
// Path:        client/e2e/camera-pan-diagnostic.spec.js
// Project:     RaceArena
// Created:     2026-05-06
// Description: Diagnostic test — measures the Plan-B camera pan pipeline on
//              one closed and one open track. Writes structured JSON snapshots
//              to e2e/camera-pan-diagnostic-output/<trackName>.json.
//              Read-only diagnosis: no logic changes in CameraDirector.js.
// ============================================================

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Track geometries ──────────────────────────────────────────────────────────
//
// Closed: 1920×1080 oval — worldW > CANVAS_W so bsX = 1280/1920 = 0.667 < 1.
//   Representative of the "typical wider-than-viewport closed track" case.
//   Same dimensions as the D10 smoke test (smoke-d10-closed) which the project
//   uses as the reference closed track. Does NOT cover: square-aspect-ratio
//   worlds, or worldW < CANVAS_W.
//
// Open: 1280×720 sprint — worldW == CANVAS_W so bsX = 1, but effZoom = 1.5
//   at overview means only 853px of the 1280px world fits in the viewport.
//   Representative of a standard sprint where the camera must pan along the
//   track. Does NOT cover: open tracks wider than canvas (worldW > CANVAS_W),
//   which would have a different overviewZoom profile.
//   NOTE: For open tracks, CameraDirector's offsetX/Y is NOT used in the render
//   path (RaceScreen uses openTrackCamera.js / st.camX/Y instead). The
//   computedPan and finalPan fields in the log reflect CameraDirector's internal
//   computation only. The actual render pan for open tracks is NOT captured here.

const DIAG_CLOSED = {
  id: 'diag-closed-oval',
  name: 'Diag Closed Oval 1920x1080',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1920,
  worldHeight: 1080,
  pathLengthPx: 3500,
  innerPoints: [
    { x: 420, y: 300 },
    { x: 960, y: 300 },
    { x: 1200, y: 540 },
    { x: 960, y: 780 },
    { x: 420, y: 780 },
    { x: 180, y: 540 },
  ],
  outerPoints: [
    { x: 360, y: 240 },
    { x: 1020, y: 240 },
    { x: 1280, y: 540 },
    { x: 1020, y: 840 },
    { x: 360, y: 840 },
    { x: 100, y: 540 },
  ],
};

const DIAG_OPEN = {
  id: 'diag-open-sprint',
  name: 'Diag Open Sprint 1280x720',
  closed: false,
  backgroundImage: null,
  effects: [],
  worldWidth: 1280,
  worldHeight: 720,
  pathLengthPx: 900,
  innerPoints: [
    { x: 100, y: 340 },
    { x: 400, y: 340 },
    { x: 700, y: 360 },
    { x: 1000, y: 340 },
  ],
  outerPoints: [
    { x: 100, y: 380 },
    { x: 400, y: 380 },
    { x: 700, y: 400 },
    { x: 1000, y: 380 },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRacers(n) {
  const colors = ['#ff6b35', '#4fc3f7', '#a5d6a7', '#ffcc02'];
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    name: `Racer${i + 1}`,
    color: colors[i % colors.length],
    icon: '🚀',
  }));
}

function buildRaceData(geom, extra = {}) {
  return {
    geometryId: geom.id,
    racerTypeId: 'rocket',
    worldWidth: geom.worldWidth,
    worldHeight: geom.worldHeight,
    trackWidth: 140,
    duration: 60,
    // winners:4 keeps the race in RACING phase until all racers finish so
    // CameraDirector.update() keeps firing — needed to capture finish drama.
    winners: 4,
    eventName: `Diag ${geom.name}`,
    timestamp: new Date().toISOString(),
    racers: makeRacers(4),
    ...extra,
  };
}

async function seedRaceAndEnableDiag(page, geom, raceData) {
  await page.addInitScript(
    ({ geom, raceData }) => {
      // Enable diagnostic flag before any app code runs
      window.__CAMERA_DIAG__ = true;
      window.__CAMERA_DIAG_LOG__ = [];
      localStorage.removeItem('__cameraDiagLog__');
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      sessionStorage.setItem('activeRace', JSON.stringify(raceData));
    },
    { geom, raceData }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Viewport matches the game canvas so no device-pixel-ratio scaling artefacts.
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Camera Pan Diagnostic — Plan-B baseline', () => {
  test('closed track (1920×1080 oval): collect pan pipeline snapshots', async ({ page }) => {
    test.setTimeout(90_000);

    const raceData = buildRaceData(DIAG_CLOSED, {
      raceMode: 'laps',
      targetLaps: 1,
      targetDuration: 25,
    });

    await seedRaceAndEnableDiag(page, DIAG_CLOSED, raceData);

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/race');

    // Wait until all 4 winners have finished (winners:4) and React navigates to /results
    await page.waitForURL('**/results', { timeout: 80_000 });

    // Collect logs — _emitDiagLog persists to localStorage on each write so they
    // survive the page navigation from /race to /results.
    const logs = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('__cameraDiagLog__') || '[]')
    );

    expect(errors, 'JS errors during race').toHaveLength(0);
    expect(logs.length, 'at least one diag log entry').toBeGreaterThan(0);

    const outDir = join(__dirname, 'camera-pan-diagnostic-output');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'diag-closed-oval.json'), JSON.stringify(logs, null, 2));
  });

  test('open track (1280×720 sprint): collect pan pipeline snapshots', async ({ page }) => {
    test.setTimeout(90_000);

    const raceData = buildRaceData(DIAG_OPEN, {
      raceMode: 'time',
      targetDuration: 25,
    });

    await seedRaceAndEnableDiag(page, DIAG_OPEN, raceData);

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/race');

    await page.waitForURL('**/results', { timeout: 80_000 });

    const logs = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('__cameraDiagLog__') || '[]')
    );

    expect(errors, 'JS errors during race').toHaveLength(0);
    expect(logs.length, 'at least one diag log entry').toBeGreaterThan(0);

    const outDir = join(__dirname, 'camera-pan-diagnostic-output');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'diag-open-sprint.json'), JSON.stringify(logs, null, 2));
  });
});
