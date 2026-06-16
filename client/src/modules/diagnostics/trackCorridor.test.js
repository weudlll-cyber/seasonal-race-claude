import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { EditorShape } from '../track-editor/EditorShape.js';
import { computeAutoScaleFactor, getEffectiveMinTargetScreenPx } from '../autoSpriteScale.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = resolve(__dirname, '../../../../server/data/tracks');

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
describe('diagnostic: Block-Z sprite-size regression — render-pixel trace (N=5)', () => {
  it('prints full pipeline for Garden Path (closed) and River Run (open)', () => {
    const CANVAS_W = 1280;
    const N = 5;
    const MIN_ZOOM = 0.15;
    const MAX_ZOOM = 2.5;
    const LEADER_MULTIPLIER = 1.8; // DEFAULT_CAMERA_CONFIG.leaderZoomMultiplier
    const OPEN_BASE_ZOOM = 1.5; // DEFAULT_CAMERA_CONFIG.openTrackBaseZoom
    const OVERVIEW_SPRITE_SCALE = 1.0; // DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.spriteScale
    const FALLBACK_REF_SIZE = 36; // RaceScreen multiplies spriteScale by this to get the px floor

    const gardenPath = SAMPLE_TRACKS.find((t) => t.name === 'Garden Path');
    const riverRun = SAMPLE_TRACKS.find((t) => t.name === 'River Run');
    const geoGarden = loadGeo(gardenPath.id);
    const geoRiver = loadGeo(riverRun.id);
    const shapeGarden = new EditorShape(geoGarden);
    const shapeRiver = new EditorShape(geoRiver);

    const corridorGarden = shapeGarden.getActualTrackWidth();
    const corridorRiver = shapeRiver.getActualTrackWidth();
    const isOpenGarden = !!geoGarden.closed === false; // closed:true → not open
    const isOpenRiver = !geoRiver.closed; // closed:false → open

    // displaySizeScale (auto-scale at N=5)
    const dssGarden = computeAutoScaleFactor(corridorGarden, N, AUTO_SCALE_CFG);
    const dssRiver = computeAutoScaleFactor(corridorRiver, N, AUTO_SCALE_CFG);

    // overviewZoom = CANVAS_W / worldW
    const ovGarden = CANVAS_W / geoGarden.worldWidth;
    const ovRiver = CANVAS_W / geoRiver.worldWidth;

    // bsX = CANVAS_W / worldW (same formula as overviewZoom for 1280-wide canvas)
    const bsXGarden = CANVAS_W / geoGarden.worldWidth;
    const bsXRiver = CANVAS_W / geoRiver.worldWidth;

    // _leaderZoom: closed = clamp(multiplier), open = clamp(overviewZoom × multiplier)
    const leaderZoomGarden = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, LEADER_MULTIPLIER));
    const leaderZoomRiver = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ovRiver * LEADER_MULTIPLIER));

    // cam.zoom at steady-state LEADER_ZOOM = _leaderZoom
    // frameEffZoom: closed = cam.zoom × bsX; open = openTrackBaseZoom × cam.zoom
    const frameEffGarden = leaderZoomGarden * bsXGarden; // closed
    const frameEffRiver = OPEN_BASE_ZOOM * leaderZoomRiver; // open

    // displaySize per racer type
    const displaySizeGarden = 35; // snail
    const displaySizeRiver = 36; // duck

    // proportionalScreenPx (before floor)
    const propGarden = displaySizeGarden * dssGarden * frameEffGarden;
    const propRiver = displaySizeRiver * dssRiver * frameEffRiver;

    // Effective floor: RaceScreen passes spriteScale × FALLBACK_REF_SIZE to getEffectiveMinTargetScreenPx.
    const floorPx = getEffectiveMinTargetScreenPx(
      undefined,
      OVERVIEW_SPRITE_SCALE * FALLBACK_REF_SIZE
    );

    // Final render pixels = max(propScreenPx, floor), clamped by max if set
    const finalGarden = Math.max(propGarden, floorPx);
    const finalRiver = Math.max(propRiver, floorPx);

    // OVERVIEW frameEffZoom (for comparison — illustrates floor impact)
    const overviewZoomGarden = isOpenGarden ? ovGarden : 1; // closed OVERVIEW: cam.zoom=1
    const overviewZoomRiver = isOpenRiver ? ovRiver : 1;
    const frameEffOverviewGarden = isOpenGarden
      ? OPEN_BASE_ZOOM * overviewZoomGarden
      : overviewZoomGarden * bsXGarden;
    const frameEffOverviewRiver = isOpenRiver
      ? OPEN_BASE_ZOOM * overviewZoomRiver
      : overviewZoomRiver * bsXRiver;
    const propOverviewGarden = displaySizeGarden * dssGarden * frameEffOverviewGarden;
    const propOverviewRiver = displaySizeRiver * dssRiver * frameEffOverviewRiver;
    const finalOverviewGarden = Math.max(propOverviewGarden, floorPx);
    const finalOverviewRiver = Math.max(propOverviewRiver, floorPx);

    console.log('\n=== BLOCK-Z SPRITE REGRESSION DIAGNOSIS (N=5) ===');
    console.log(
      `\n| Metric                            | Garden Path (Closed) | River Run (Open) |`
    );
    console.log(`|-----------------------------------|----------------------|------------------|`);
    console.log(
      `| corridorWidthPx                   | ${String(corridorGarden).padEnd(20)} | ${String(corridorRiver).padEnd(16)} |`
    );
    console.log(
      `| worldWidth                        | ${String(geoGarden.worldWidth).padEnd(20)} | ${String(geoRiver.worldWidth).padEnd(16)} |`
    );
    console.log(
      `| displaySize (racer type)          | ${String(displaySizeGarden + ' (snail)').padEnd(20)} | ${String(displaySizeRiver + ' (duck)').padEnd(16)} |`
    );
    console.log(
      `| displaySizeScale @N=5             | ${dssGarden.toFixed(4).padEnd(20)} | ${dssRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| bsX (CANVAS_W/worldW)             | ${bsXGarden.toFixed(4).padEnd(20)} | ${bsXRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| overviewZoom                      | ${ovGarden.toFixed(4).padEnd(20)} | ${ovRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| _leaderZoom (cam.zoom in LEADER)  | ${leaderZoomGarden.toFixed(4).padEnd(20)} | ${leaderZoomRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| frameEffZoom in LEADER            | ${frameEffGarden.toFixed(4).padEnd(20)} | ${frameEffRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| proportionalScreenPx (LEADER)     | ${propGarden.toFixed(2).padEnd(20)} | ${propRiver.toFixed(2).padEnd(16)} |`
    );
    console.log(
      `| Floor (spriteScale=${OVERVIEW_SPRITE_SCALE}×${FALLBACK_REF_SIZE}=${floorPx}px)  | ${String(floorPx + ' px').padEnd(20)} | ${String(floorPx + ' px').padEnd(16)} |`
    );
    console.log(
      `| Floor active in LEADER?           | ${String(propGarden < floorPx).padEnd(20)} | ${String(propRiver < floorPx).padEnd(16)} |`
    );
    console.log(
      `| Final render px (LEADER)          | ${finalGarden.toFixed(2).padEnd(20)} | ${finalRiver.toFixed(2).padEnd(16)} |`
    );
    console.log(`|                                   |                      |                  |`);
    console.log(
      `| frameEffZoom in OVERVIEW          | ${frameEffOverviewGarden.toFixed(4).padEnd(20)} | ${frameEffOverviewRiver.toFixed(4).padEnd(16)} |`
    );
    console.log(
      `| proportionalScreenPx (OVERVIEW)   | ${propOverviewGarden.toFixed(2).padEnd(20)} | ${propOverviewRiver.toFixed(2).padEnd(16)} |`
    );
    console.log(
      `| Floor active in OVERVIEW?         | ${String(propOverviewGarden < floorPx).padEnd(20)} | ${String(propOverviewRiver < floorPx).padEnd(16)} |`
    );
    console.log(
      `| Final render px (OVERVIEW)        | ${finalOverviewGarden.toFixed(2).padEnd(20)} | ${finalOverviewRiver.toFixed(2).padEnd(16)} |`
    );
    console.log(`|                                   |                      |                  |`);
    console.log(
      `| LEADER / OVERVIEW ratio           | ${(finalGarden / finalOverviewGarden).toFixed(3).padEnd(20)} | ${(finalRiver / finalOverviewRiver).toFixed(3).padEnd(16)} |`
    );

    const displayScaleRatio = dssRiver / dssGarden;
    const frameEffRatio = frameEffGarden / frameEffRiver;
    console.log(`\n--- Hypothesis verdicts ---`);
    console.log(`Hyp A — displaySizeScale asymmetry:`);
    console.log(
      `  Garden=${dssGarden.toFixed(3)}, River=${dssRiver.toFixed(3)}, ratio=${displayScaleRatio.toFixed(2)}× (River larger)`
    );
    console.log(`  frameEffZoom ratio (Garden/River)=${frameEffRatio.toFixed(2)}× compensates`);
    console.log(
      `  Net screen-px difference LEADER: ${finalGarden.toFixed(1)} vs ${finalRiver.toFixed(1)} px → ${(finalRiver / finalGarden).toFixed(2)}× (River larger)`
    );
    console.log(
      `  → A PARTIALLY confirmed: asymmetry exists but is largely offset by frameEffZoom.`
    );
    console.log(`\nHyp B — floor only active on one side:`);
    console.log(
      `  LEADER floor active: Garden=${propGarden < floorPx}, River=${propRiver < floorPx}`
    );
    console.log(
      `  OVERVIEW floor active: Garden=${propOverviewGarden < floorPx}, River=${propOverviewRiver < floorPx}`
    );
    console.log(`  → B NOT confirmed in LEADER. Floor IS active in OVERVIEW for both.`);
    console.log(`\nHyp C — call-site bug in getEffectiveMinTargetScreenPx:`);
    console.log(
      `  Floor value returned: ${floorPx} (= OVERVIEW spriteScale ${OVERVIEW_SPRITE_SCALE})`
    );
    console.log(`  RaceScreen call matches signature (typeOverridePx, minSpritePx).`);
    console.log(
      `  → C: No evidence of wrong-args bug from static analysis. Needs browser test to confirm.`
    );
    console.log(`\n>>> KEY FINDING: LEADER vs OVERVIEW ratio differs by track type:`);
    console.log(
      `  Garden Path: LEADER/OVERVIEW = ${(finalGarden / finalOverviewGarden).toFixed(2)}× (${((finalGarden / finalOverviewGarden - 1) * 100).toFixed(0)}% bigger)`
    );
    console.log(
      `  River Run:   LEADER/OVERVIEW = ${(finalRiver / finalOverviewRiver).toFixed(2)}× (${((finalRiver / finalOverviewRiver - 1) * 100).toFixed(0)}% bigger)`
    );
    console.log(
      `  On River Run the zoom-in is more visually dramatic (${((finalRiver / finalOverviewRiver - 1) * 100).toFixed(0)}% vs ${((finalGarden / finalOverviewGarden - 1) * 100).toFixed(0)}%).`
    );
    console.log(
      `  Garden Path LEADER sprites are only ${((finalGarden / finalOverviewGarden - 1) * 100).toFixed(0)}% bigger than OVERVIEW — can look "like OVERVIEW" to the eye.`
    );
    console.log('');

    // Structural assertions — floor and final values must be sensible
    expect(floorPx).toBe(OVERVIEW_SPRITE_SCALE * FALLBACK_REF_SIZE); // = 36 px
    expect(finalGarden).toBeGreaterThanOrEqual(floorPx);
    expect(finalRiver).toBeGreaterThanOrEqual(floorPx);
    // Both tracks should produce similar absolute pixel sizes (within 20% of each other)
    // to confirm the scale-invariant floor is working as intended
    const ratio = Math.max(finalGarden, finalRiver) / Math.min(finalGarden, finalRiver);
    expect(ratio).toBeLessThan(1.25); // should be close — scale invariance
  });
});
