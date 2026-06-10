/**
 * Analytical OVERVIEW snap-zoom model — RaceArena stutter investigation.
 * Exact replica of CameraDirector.js + rowLayout.js formulas.
 * Space Sprint worldW=6000 (actual stored track, NOT defaults.js stub of 1280).
 * Comparison: Dirt Oval (closed, worldW=1280) and Mountainstreet (open, worldW=6144).
 */

const CANVAS_W = 1280;
const OPEN_TRACK_BASE_ZOOM = 1.5;
const MAX_INVERSE_ZOOM = 10.0;
const OVERVIEW_TARGET_SCREEN_PX = 28;
const OVERVIEW_SPRITE_SCALE = 1.0;
const LEADER_SPRITE_SCALE = 1.81;
const AUTO_SCALE = { minScale: 0.65, maxScale: 2.5 };
const TRACK_WIDTH_PX = 300;
const START_SPREAD_RANGE = 0.95;
const EFFECTIVE_WIDTH = TRACK_WIDTH_PX * START_SPREAD_RANGE; // 285
const W_REF = Math.min(285, EFFECTIVE_WIDTH); // 285

const DRAGON = { name: 'Dragon', displaySize: 50, bodyFillX: 0.836, bodyFillY: 0.898 };

function computeBodyNarrowRef(W_ref, nRacers, displaySize, bodyFillNarrow, cfg) {
  const narrowDS = displaySize * bodyFillNarrow;
  const minBN = narrowDS * cfg.minScale;
  const maxBN = narrowDS * cfg.maxScale;
  if (!nRacers || !W_ref || !displaySize || !bodyFillNarrow)
    return { bodyNarrow: minBN, rowCount: 1, racersPerRow: nRacers };
  const maxRPR = Math.max(1, Math.floor((2 * W_ref) / Math.max(1, minBN)));
  const rowCount = Math.max(1, Math.ceil(nRacers / maxRPR));
  const rpr = Math.ceil(nRacers / rowCount);
  const target = (2 * W_ref) / rpr;
  return { bodyNarrow: Math.min(target, maxBN), rowCount, racersPerRow: rpr };
}

function snapZoomOpen(worldW, drawnW) {
  const overviewZoom = CANVAS_W / worldW;
  const stateZoom = OVERVIEW_SPRITE_SCALE / OPEN_TRACK_BASE_ZOOM;
  const ceiling = Math.min(MAX_INVERSE_ZOOM, stateZoom * 0.8);
  const raw = OVERVIEW_TARGET_SCREEN_PX / (drawnW * OPEN_TRACK_BASE_ZOOM);
  const snap = Math.max(overviewZoom, Math.min(ceiling, raw));
  return { overviewZoom, raw, snap, ceiling, effZoom: snap * OPEN_TRACK_BASE_ZOOM };
}

function snapZoomClosed(worldW, drawnW) {
  const bsX = CANVAS_W / worldW;
  const raw = OVERVIEW_TARGET_SCREEN_PX / (drawnW * bsX);
  const snap = Math.max(1.0, Math.min(MAX_INVERSE_ZOOM, raw));
  return { bsX, raw, snap, effScale: snap * bsX };
}

function gpuCost(effZoom) { return 1 / (effZoom * effZoom); }

function header(s) { console.log(`\n${'═'.repeat(72)}\n${s}\n${'═'.repeat(72)}`); }

const COUNTS = [8, 10, 15, 20, 30, 40, 60, 70];
const rt = DRAGON;
const bodyFillNarrow = Math.min(rt.bodyFillX, rt.bodyFillY);

// ── A. Space Sprint ACTUAL (OPEN, worldW=6000) ────────────────────────────────
header('A. Space Sprint ACTUAL — OPEN track, worldW=6000, worldH=4000');
{
  const worldW = 6000;
  const ldr = LEADER_SPRITE_SCALE / OPEN_TRACK_BASE_ZOOM;
  const ldrEff = ldr * OPEN_TRACK_BASE_ZOOM;
  const ldrGpu = gpuCost(ldrEff);
  const ovMin = CANVAS_W / worldW;
  console.log(`Dragon, W_REF=${W_REF}, overviewZoom floor=${ovMin.toFixed(4)}, ceiling=${(OVERVIEW_SPRITE_SCALE/OPEN_TRACK_BASE_ZOOM*0.8).toFixed(4)}`);
  console.log(`Leader: effZoom=${ldrEff.toFixed(4)}, gpu_ref=1.00x`);
  console.log('');
  console.log('N     bodyNarrow  rows×rpr  raw     snapZoom  effZoom   gpuVsLdr  note');
  console.log('-'.repeat(76));
  for (const n of COUNTS) {
    const { bodyNarrow, rowCount, racersPerRow } = computeBodyNarrowRef(W_REF, n, rt.displaySize, bodyFillNarrow, AUTO_SCALE);
    const { overviewZoom, raw, snap, effZoom } = snapZoomOpen(worldW, bodyNarrow);
    const gpu = (gpuCost(effZoom) / ldrGpu).toFixed(2);
    const note = snap <= overviewZoom + 0.001 ? '⬇ floored' : snap >= OVERVIEW_SPRITE_SCALE/OPEN_TRACK_BASE_ZOOM*0.8 - 0.001 ? '⬆ ratchet cap' : 'raw';
    console.log(`${String(n).padEnd(5)} ${bodyNarrow.toFixed(2).padEnd(11)} ${(rowCount+'×'+racersPerRow).padEnd(9)} ${raw.toFixed(4).padEnd(7)} ${snap.toFixed(4).padEnd(9)} ${effZoom.toFixed(4).padEnd(9)} ${gpu.padEnd(9)}x  ${note}`);
  }
  console.log(`\noverviewZoom=${ovMin.toFixed(4)} is the FLOOR. 8 racers: raw=0.262 > floor → snapZoom=0.262.`);
  console.log(`40+ racers: raw=0.655 > ceiling=0.533 → snapZoom=0.533.`);
  console.log(`DELTA snapZoom: 0.262 (N=8) vs 0.533 (N=40+) → 2.03× zoom factor difference.`);
  console.log(`DELTA effZoom: 0.393 vs 0.800 → GPU raster area ratio: ${(gpuCost(0.393)/gpuCost(0.800)).toFixed(1)}×`);
}

// ── B. Dirt Oval (CLOSED, worldW=1280) ───────────────────────────────────────
header('B. Dirt Oval — CLOSED track, worldW=1280');
{
  const worldW = 1280;
  const bsX = CANVAS_W / worldW;
  const ldrZoom = LEADER_SPRITE_SCALE / bsX;
  const ldrEff = ldrZoom * bsX;
  const ldrGpu = gpuCost(ldrEff);
  console.log(`Dragon, bsX=${bsX.toFixed(4)}, minZoom=1.0, ceiling=MAX_INVERSE_ZOOM`);
  console.log(`Leader: cam.zoom=${ldrZoom.toFixed(4)}, effScale=${ldrEff.toFixed(4)}, gpu_ref=1.00x`);
  console.log('');
  console.log('N     bodyNarrow  rows×rpr  raw     snapZoom  effScale  gpuVsLdr  note');
  console.log('-'.repeat(76));
  for (const n of COUNTS) {
    const { bodyNarrow, rowCount, racersPerRow } = computeBodyNarrowRef(W_REF, n, rt.displaySize, bodyFillNarrow, AUTO_SCALE);
    const { raw, snap, effScale } = snapZoomClosed(worldW, bodyNarrow);
    const gpu = (gpuCost(effScale) / ldrGpu).toFixed(2);
    const note = snap <= 1.001 ? '⬇ floored at 1.0' : snap >= MAX_INVERSE_ZOOM - 0.01 ? '⬆ MAX cap' : 'raw';
    console.log(`${String(n).padEnd(5)} ${bodyNarrow.toFixed(2).padEnd(11)} ${(rowCount+'×'+racersPerRow).padEnd(9)} ${raw.toFixed(4).padEnd(7)} ${snap.toFixed(4).padEnd(9)} ${effScale.toFixed(4).padEnd(9)} ${gpu.padEnd(9)}x  ${note}`);
  }
  console.log(`\nAll counts floor at snapZoom=1.0 → effScale=1.0 → GPU cost 3.28× leader, CONSTANT.`);
  console.log(`Dirt Oval OVERVIEW: zoom does NOT vary with racer count.`);
}

// ── C. Summary table: OVERVIEW GPU cost vs track type ────────────────────────
header('C. SUMMARY — GPU cost × leader_zoom: OVERVIEW vs LEADER_ZOOM');
console.log('');
console.log('Track               Type    N=8     N=15    N=20    N=40    N=60   key range');
console.log('-'.repeat(80));

const configs = [
  { label: 'Space Sprint (6000)', worldW: 6000, isOpen: true },
  { label: 'Space Sprint (stub 1280)', worldW: 1280, isOpen: true },
  { label: 'Dirt Oval',           worldW: 1280, isOpen: false },
  { label: 'Mountainstreet',      worldW: 6144, isOpen: true },
];
for (const c of configs) {
  const bsX = CANVAS_W / c.worldW;
  const ldrEff = c.isOpen ? LEADER_SPRITE_SCALE : LEADER_SPRITE_SCALE * bsX / bsX;  // always 1.81 for leader eff
  const ldrGpu = gpuCost(ldrEff);
  const ns = [8, 15, 20, 40, 60];
  const vals = ns.map(n => {
    const { bodyNarrow } = computeBodyNarrowRef(W_REF, n, DRAGON.displaySize, bodyFillNarrow, AUTO_SCALE);
    if (c.isOpen) {
      const { effZoom } = snapZoomOpen(c.worldW, bodyNarrow);
      return (gpuCost(effZoom) / ldrGpu).toFixed(1) + 'x';
    } else {
      const { effScale } = snapZoomClosed(c.worldW, bodyNarrow);
      return (gpuCost(effScale) / ldrGpu).toFixed(1) + 'x';
    }
  });
  const type = c.isOpen ? 'OPEN  ' : 'CLOSED';
  const first = parseFloat(vals[0]);
  const last = parseFloat(vals[vals.length - 1]);
  const range = first > last + 0.5 ? `${last.toFixed(1)}–${first.toFixed(1)}× varies!` : `~${first.toFixed(1)}× flat`;
  console.log(`${c.label.padEnd(21)} ${type}  ${vals.map(v => v.padEnd(7)).join(' ')}  ${range}`);
}

// ── D. sec2 vs master ─────────────────────────────────────────────────────────
header('D. SEC2 vs MASTER VERDICT');
console.log(`
Camera commits between backup/sec2 (4ba558f) and master HEAD:
  51b8ea3  refactor(camera): single source for battle-pulk thresholds [H-02]
  — Moved BATTLE_PULK_THRESHOLD_PX/T constants to cameraTimingComputation.js.
  — ZERO change to OVERVIEW snap zoom, MAX_INVERSE_ZOOM, ratchet stop, or
    drawnBodyWidthRefPx / auto-sprite-scale path.

MAX_INVERSE_ZOOM raised from 5.0 → 10.0 in ee9b664, which is BEFORE backup/sec2.
  sec2 value: 10.0 ✓   master value: 10.0 ✓

Ratchet stop (open-track OVERVIEW ceiling = overviewStateZoom × 0.8):
  sec2: present ✓   master: present ✓   Formula identical.

VERDICT: PRE-EXISTING.
  Any track+racer-count combination that triggers a low OVERVIEW snapZoom
  (e.g. Space Sprint worldW=6000 at N=8) stutters identically in sec2 and master.
  The stutter predates sec2 and is unrelated to any recent camera changes.
`);
