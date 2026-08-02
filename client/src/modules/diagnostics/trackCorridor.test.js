import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { EditorShape } from '../track-editor/EditorShape.js';
import { computeAutoScaleFactor } from '../autoSpriteScale.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = resolve(__dirname, '../../../../server/seeds/tracks'); // Seeds (committed, CI-safe) instead of server/data/** (gitignored) — cf. C2a.

function loadGeo(id) {
  return JSON.parse(readFileSync(resolve(GEO_DIR, `${id}.json`), 'utf-8'));
}

const AUTO_SCALE_CFG = { referenceValue: 23, minScale: 0.65, maxScale: 2.5 };

const TRACKS = SAMPLE_TRACKS.map(({ id }) => ({ id }));

describe('diagnostic: track corridor widths and auto-scale', () => {
  it('logs corridorWidthPx and displaySizeScale per track', () => {
    const rows = [];

    for (const { id } of TRACKS) {
      const geo = loadGeo(id);
      const shape = new EditorShape(geo);
      const corridorWidthPx = shape.getActualTrackWidth();

      const s5 = computeAutoScaleFactor(corridorWidthPx, 5, AUTO_SCALE_CFG);
      const s10 = computeAutoScaleFactor(corridorWidthPx, 10, AUTO_SCALE_CFG);
      const s20 = computeAutoScaleFactor(corridorWidthPx, 20, AUTO_SCALE_CFG);

      rows.push({ id, worldW: geo.worldWidth, corridorWidthPx, s5, s10, s20 });
    }

    // Table for console output
    console.log('\n=== TRACK CORRIDOR + AUTO-SCALE DIAGNOSTIC ===');
    console.log(
      '| Track          | worldW | corridorWidthPx | scale@N=5 | scale@N=10 | scale@N=20 |'
    );
    console.log(
      '|----------------|--------|-----------------|-----------|------------|------------|'
    );
    for (const r of rows) {
      console.log(
        `| ${r.id.padEnd(14)} | ${String(r.worldW).padEnd(6)} | ${String(r.corridorWidthPx).padEnd(15)} | ${r.s5.toFixed(3).padEnd(9)} | ${r.s10.toFixed(3).padEnd(10)} | ${r.s20.toFixed(3).padEnd(10)} |`
      );
    }

    const closedRows = rows.filter((r) => r.corridorWidthPx < 200);
    const openRows = rows.filter((r) => r.corridorWidthPx >= 200);
    const avgClosedCorridor =
      closedRows.reduce((s, r) => s + r.corridorWidthPx, 0) / closedRows.length;
    const avgOpenCorridor = openRows.reduce((s, r) => s + r.corridorWidthPx, 0) / openRows.length;
    console.log(`\nClosed tracks avg corridorWidth: ${avgClosedCorridor.toFixed(0)} px`);
    console.log(`Open   tracks avg corridorWidth: ${avgOpenCorridor.toFixed(0)} px`);
    console.log(
      `Open corridors are ${(avgOpenCorridor / avgClosedCorridor).toFixed(1)}× wider than closed.\n`
    );

    expect(true).toBe(true);
  });
});

// ── Block-Z Regression Diagnosis ─────────────────────────────────────────────
// Hypotheses A / B / C: Why do Garden Path sprites look tiny in LEADER_ZOOM
// while River Run sprites look large?
//
// This test computes the full render-pipeline for both tracks at N=5 so all
// intermediate values are verifiable without a browser.
//
// Constants match DEFAULT_CAMERA_CONFIG and RaceScreen:
//   CANVAS_W = 1280, CANVAS_H = 720
//   leaderZoomMultiplier = 1.8  (DEFAULT_CAMERA_CONFIG)
//   openTrackBaseZoom    = 1.5  (DEFAULT_CAMERA_CONFIG)
//   OVERVIEW.spriteScale = 1.0  (DEFAULT_CAMERA_CONFIG.cameraStateProfiles) → floor ≈ 1 px (scale-based)
//   displaySize(snail)   = 35   (SnailRacerType.config.displaySize)
//   displaySize(duck)    = 36   (DuckRacerType.config.displaySize)

// CAMERA-PICTURE-FIXES-1 removed the second describe block that lived here: the Block-Z
// sprite-size regression trace. It was a printout of a hypothesis chase about the minimum-sprite
// FLOOR — which side of it each track fell on, and whether the call site passed its arguments in
// the right order. The floor no longer exists, so the trace investigates deleted code and its
// conclusions ("floor IS active in OVERVIEW for both") are now false by construction. Deleted
// rather than adapted; the finding it was chasing is recorded in reports/evolution/.
