// ============================================================
// File:        camera-look-comparison.spec.js
// Path:        client/e2e/camera-look-comparison.spec.js
// Project:     RaceArena
// Created:     2026-05-07
// Description: Visual look comparison — one screenshot per camera state
//              (OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM) for the two reference
//              tracks used in PR #77. No diagnostic overlays in screenshots.
//              Writes PNGs + comparison.md to e2e/camera-look-comparison/.
//
//              State detection: CameraStateHUD renders [data-testid="camera-state-hud"]
//              [data-state=<STATE>] regardless of CSS visibility, so we hide the
//              element visually (visibility:hidden) but keep it in the DOM for
//              waitForSelector(state:'attached') probing.
//
//              No logic changes anywhere. No window.__CAMERA_DIAG__ flag.
// ============================================================

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'camera-look-comparison');

// ── Track geometries (identical to camera-pan-diagnostic.spec.js) ────────────

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
    winners: 4,
    eventName: `Look ${geom.name}`,
    timestamp: new Date().toISOString(),
    racers: makeRacers(4),
    ...extra,
  };
}

async function seedRaceData(page, geom, raceData) {
  await page.addInitScript(
    ({ geom, raceData }) => {
      localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
      sessionStorage.setItem('activeRace', JSON.stringify(raceData));
      // Clear leftover diagnostic logs
      localStorage.removeItem('__cameraDiagLog__');
    },
    { geom, raceData }
  );
}

// CameraStateHUD hidden from view but kept in DOM so data-state is still queryable.
// CameraDiagnosticsHUD is off by default (showCameraDiagnostics: false in cameraConfig
// defaults) so no extra CSS needed for it.
const HIDE_HUD_CSS = '[data-testid="camera-state-hud"] { visibility: hidden !important; }';

// Wait for the countdown badge to disappear (race phase → RACING), confirming the
// 4 s countdown has ended. OVERVIEW data-state is set from React's initial state so
// waitForSelector fires before racing starts; this gate prevents premature screenshots.
async function waitForRacingStart(page) {
  await page.waitForSelector('.race-phase-badge--countdown', {
    state: 'detached',
    timeout: 15_000,
  });
}

// Wait for CameraStateHUD data-state to reach targetState, then wait settleMs for
// zoom/pan lerp to converge before screenshotting. Uses state:'attached' so that
// visibility:hidden does not prevent the selector from matching.
async function waitStateAndShot(page, targetState, outPath, settleMs = 2000) {
  await page.waitForSelector(
    `[data-testid="camera-state-hud"][data-state="${targetState}"]`,
    { state: 'attached', timeout: 65_000 }
  );
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: outPath });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Camera Look Comparison — closed vs open', () => {
  test('closed track (1920×1080 oval): screenshot per camera state', async ({ page }) => {
    test.setTimeout(90_000);

    const raceData = buildRaceData(DIAG_CLOSED, {
      raceMode: 'laps',
      targetLaps: 1,
      targetDuration: 25,
    });
    await seedRaceData(page, DIAG_CLOSED, raceData);

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/race');
    await page.waitForSelector('.race-canvas', { timeout: 15_000 });
    await page.addStyleTag({ content: HIDE_HUD_CSS });

    mkdirSync(OUT_DIR, { recursive: true });

    // OVERVIEW: wait for countdown to end (4 s), then 2 s for pan lerp to settle
    await waitForRacingStart(page);
    await waitStateAndShot(page, 'OVERVIEW', join(OUT_DIR, 'closed_overview.png'));
    await waitStateAndShot(page, 'LEADER_ZOOM', join(OUT_DIR, 'closed_leader.png'));
    await waitStateAndShot(page, 'BATTLE_ZOOM', join(OUT_DIR, 'closed_battle.png'));

    expect(errors, 'JS errors during closed race').toHaveLength(0);
  });

  test('open track (1280×720 sprint): screenshot per camera state', async ({ page }) => {
    test.setTimeout(90_000);

    const raceData = buildRaceData(DIAG_OPEN, {
      raceMode: 'time',
      targetDuration: 25,
    });
    await seedRaceData(page, DIAG_OPEN, raceData);

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/race');
    await page.waitForSelector('.race-canvas', { timeout: 15_000 });
    await page.addStyleTag({ content: HIDE_HUD_CSS });

    mkdirSync(OUT_DIR, { recursive: true });

    // OVERVIEW: wait for countdown to end (4 s), then 2 s for pan lerp to settle
    await waitForRacingStart(page);
    await waitStateAndShot(page, 'OVERVIEW', join(OUT_DIR, 'open_overview.png'));
    await waitStateAndShot(page, 'LEADER_ZOOM', join(OUT_DIR, 'open_leader.png'));
    await waitStateAndShot(page, 'BATTLE_ZOOM', join(OUT_DIR, 'open_battle.png'));

    expect(errors, 'JS errors during open race').toHaveLength(0);

    // comparison.md — written after both tests' screenshots exist (second test runs last)
    const md = [
      '# Camera Look Comparison — Closed vs Open Track',
      '',
      '| State | Closed (1920×1080 oval) | Open (1280×720 sprint) |',
      '|---|---|---|',
      '| OVERVIEW | ![Closed OVERVIEW](closed_overview.png) | ![Open OVERVIEW](open_overview.png) |',
      '| LEADER_ZOOM | ![Closed LEADER](closed_leader.png) | ![Open LEADER](open_leader.png) |',
      '| BATTLE_ZOOM | ![Closed BATTLE](closed_battle.png) | ![Open BATTLE](open_battle.png) |',
      '',
      '## Setup',
      '',
      '- Track geometries: identical to `camera-pan-diagnostic.spec.js` (PR #77 reference tracks)',
      '- 4 racers, type `rocket`, viewport 1280×720',
      '- Closed: 1-lap race, 25 s cap, 4 winners declared',
      '- Open: time-race, 25 s, 4 winners declared',
      '- HUD overlays hidden via injected CSS; diagnostic logs off',
      '',
      '## Screenshot timing',
      '',
      'Each screenshot taken ≈2 s after `[data-state]` transitions to the target state',
      '(CameraStateHUD has a 150 ms fade delay, so actual camera transition precedes DOM update',
      'by ~150 ms). At 60 fps, 2 s ≈ 120 frames of lerp time — >99% convergence for the',
      '5%/frame open-track pan lerp; >93% for the 1.5 s zoom-lerp constant.',
      '',
      '## Zoom reference (from diag-run, PR #77 data)',
      '',
      '| State | Closed canvas effZoom | Open canvas effZoom |',
      '|---|---|---|',
      '| OVERVIEW | 0.67 (dirZoom 1.0 × bsX 0.667) | 1.50 (BASE 1.5 × dirZoom 1.0) |',
      '| LEADER_ZOOM | ~1.58 (dirZoom 2.37 × bsX) | ~2.22 (BASE 1.5 × dirZoom 1.48) |',
      '| BATTLE_ZOOM | ~2.37 (dirZoom 3.55 × bsX) | ~3.32 (BASE 1.5 × dirZoom 2.22) |',
      '',
      'Settled target values from the diagnostic run. Actual screenshot zoom may differ',
      'by up to ~7% if lerp was still converging at the 2 s mark.',
      '',
      '## Known limitations',
      '',
      '- Open-track BATTLE centroid is at a different world position than closed-track',
      '  (sprint racers are further right). Same logical camera state, not same world position.',
      '- Minimap and race-name HUD are visible in screenshots — these are normal game UI,',
      '  not diagnostic overlays.',
      '- Zoom values in the table are settled targets from the PR #77 diagnostic run,',
      '  not directly measured in this test run.',
    ].join('\n');

    writeFileSync(join(OUT_DIR, 'comparison.md'), md);
  });
});
