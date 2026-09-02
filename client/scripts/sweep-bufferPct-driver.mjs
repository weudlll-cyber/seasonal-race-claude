// ============================================================
// Sweep driver: avoidanceBufferPct (Gate D) + optional avoidanceNormExponent (Gate G)
// Fully automatic. Writes results/sweep-bufferPct/SUMMARY.md incrementally.
// Decisions (no user input) documented in SUMMARY.md:
//   - Per-track DEFAULT racer (snail is grass-only → "snail on all" invalid; per-track
//     default is surface-valid + fits the ~7h budget). Test track default = snail.
//   - --dur=60 single (full [30,120] doubles runtime; budget).
//   - 50 races, seed=1, --race-plan=true. Per-track invocations.
// Metrics: honestOverlapRate, stats.pValue, racersBlockedInOutcome, tmOscillatingCount(chain-lock).
// Run:  node scripts/sweep-bufferPct-driver.mjs        (full)
//       node scripts/sweep-bufferPct-driver.mjs --dry  (2 races, 3 tracks, smoke)
// ============================================================
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
const OUTBASE = 'results/sweep-bufferPct';
const SUMMARY = join(ROOT, OUTBASE, 'SUMMARY.md');
const RACES = DRY ? 2 : 50;
const SEED = 1;
const DUR = 60;

// Per-track default racer AND topology, READ FROM server/seeds/tracks/*.json rather than restated.
//
// THIS TABLE WAS DRIFT, AND ON TWO AXES. Its comment named the seed files as its source, which is what
// made it look checked; it was not. The racer half was wrong on garden-path (`snail`; the seed said
// `beetle` from 2026-08-25) and on city-circuit (`buggy`; the seed said `motorbike` from 2026-06-30 —
// a week BEFORE this file was written, so that entry was never right). The topology half was wrong
// too: river-run and space-sprint were marked closed and are open in the seeds. Reading the seed
// removes all three at once and cannot go stale again.
const TRACK_IDS = [
  'dirt-oval',
  'river-run',
  'space-sprint',
  'garden-path',
  'city-circuit',
  'ice-track',
  'searound',
  'luger-hill',
  'mountainstreet',
  'seatrack',
];
const ALL_TRACKS = TRACK_IDS.map((id) => {
  const seed = JSON.parse(readFileSync(join(ROOT, `server/seeds/tracks/${id}.json`), 'utf8'));
  if (!seed?.defaultRacerTypeId) {
    throw new Error(`sweep-bufferPct-driver: ${id}.json has no defaultRacerTypeId`);
  }
  return { id, racer: seed.defaultRacerTypeId, open: seed.closed === false };
});const TRACKS = DRY ? ALL_TRACKS.filter((t) => ['garden-path', 'luger-hill'].includes(t.id)) : ALL_TRACKS;

function log(s) {
  process.stdout.write(s + '\n');
}
function appendSummary(s) {
  appendFileSync(SUMMARY, s + '\n');
}

// Run one (track, behavior) → metrics. behavior excludes default keys (merged into behaviorConfig).
function runOne(track, behavior, outDir, allRacers = false) {
  const args = [
    'scripts/sim-fairness.mjs',
    `--track=${track.id}`,
    `--dur=${DUR}`,
    `--races=${RACES}`,
    '--race-plan=true',
    `--seed=${SEED}`,
    `--behavior=${JSON.stringify(behavior)}`,
    `--out=${outDir}`,
  ];
  if (!allRacers) args.push(`--racer=${track.racer}`);
  execFileSync('node', args, { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'], maxBuffer: 1 << 27 });
  const d = JSON.parse(readFileSync(join(ROOT, outDir, 'fairness-data.json'), 'utf8'));
  // Single-racer: one result. All-racers: aggregate (mean overlap/blocked/tmOsc, min pValue).
  const rs = d.results;
  if (!rs || rs.length === 0) throw new Error('no results');
  const avg = (f) => rs.reduce((s, r) => s + (f(r) ?? 0), 0) / rs.length;
  const minP = Math.min(...rs.map((r) => r.stats?.pValue ?? 1));
  return {
    overlap: avg((r) => r.avgNaturalness?.honestOverlapRate),
    p: allRacers ? minP : rs[0].stats?.pValue ?? null,
    blocked: avg((r) => r.avgNaturalness?.racersBlockedInOutcome),
    tmOsc: avg((r) => r.avgNaturalness?.tmOscillatingCount),
    nCombos: rs.length,
  };
}

// Run a parameter value across all tracks → { trackId: metrics }
function runValue(behavior, phaseTag, allRacers = false) {
  const res = {};
  for (const t of TRACKS) {
    const outDir = join(OUTBASE, phaseTag, t.id);
    mkdirSync(join(ROOT, outDir), { recursive: true });
    const t0 = Date.now();
    try {
      res[t.id] = runOne(t, behavior, outDir, allRacers);
      log(`  [${phaseTag}] ${t.id}/${t.racer}: overlap=${res[t.id].overlap.toFixed(4)} p=${res[t.id].p.toFixed(3)} tmOsc=${res[t.id].tmOsc.toFixed(2)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    } catch (e) {
      res[t.id] = { error: String(e.message || e).slice(0, 160) };
      log(`  [${phaseTag}] ${t.id}: ERROR ${res[t.id].error}`);
    }
  }
  return res;
}

// Acceptance vs baseline. tol on tmOsc/overlap to avoid noise rejections.
function accept(val, baseline) {
  const reasons = [];
  // (2) fairness p >= 0.05 ALL tracks
  for (const t of TRACKS) {
    const m = val[t.id];
    if (!m || m.error) { reasons.push(`${t.id}:err`); continue; }
    if (m.p < 0.05) reasons.push(`${t.id}:p=${m.p.toFixed(3)}<0.05`);
  }
  // (1) overlap DOWN on TEST + open tracks
  const checkDown = TRACKS.filter((t) => t.id === TEST_ID || t.open);
  for (const t of checkDown) {
    const m = val[t.id], b = baseline[t.id];
    if (!m || !b || m.error || b.error) continue;
    if (m.overlap > b.overlap + 1e-9) reasons.push(`${t.id}:overlapUp(${m.overlap.toFixed(4)}>${b.overlap.toFixed(4)})`);
  }
  // (3) chain-lock (tmOsc) not higher than baseline (per track, small tolerance)
  for (const t of TRACKS) {
    const m = val[t.id], b = baseline[t.id];
    if (!m || !b || m.error || b.error) continue;
    if (m.tmOsc > b.tmOsc * 1.05 + 0.5) reasons.push(`${t.id}:tmOscUp(${m.tmOsc.toFixed(2)}>${b.tmOsc.toFixed(2)})`);
  }
  return { ok: reasons.length === 0, reasons };
}

function fairAllTracks(val) {
  return TRACKS.every((t) => val[t.id] && !val[t.id].error && val[t.id].p >= 0.05);
}

// SUMMARY rows for one value
function writeRows(label, val, baseline) {
  appendSummary(`\n### ${label}`);
  appendSummary(`| Track | racer | honestOverlap | Δoverlap | p-Wert | tmOsc(chainLock) | blocked |`);
  appendSummary(`|---|---|---|---|---|---|---|`);
  for (const t of TRACKS) {
    const m = val[t.id];
    if (!m || m.error) { appendSummary(`| ${t.label || t.id} | ${t.racer} | ERROR | — | — | — | ${m?.error ?? ''} |`); continue; }
    const b = baseline?.[t.id];
    const dov = b && !b.error ? (m.overlap - b.overlap >= 0 ? '+' : '') + (m.overlap - b.overlap).toFixed(4) : '—';
    appendSummary(`| ${t.label || t.id} | ${t.racer} | ${m.overlap.toFixed(4)} | ${dov} | ${m.p.toFixed(3)} | ${m.tmOsc.toFixed(2)} | ${m.blocked.toFixed(3)} |`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(join(ROOT, OUTBASE), { recursive: true });
  writeFileSync(SUMMARY,
    `# Sweep: avoidanceBufferPct (Gate D) + avoidanceNormExponent (Gate G)\n\n` +
    `Mode: ${DRY ? 'DRY (2 races, 3 tracks)' : 'FULL'} · races=${RACES} · dur=${DUR}s · seed=${SEED} · race-plan=true\n\n` +
    `**Autonome Entscheidungen** (Owner nicht verfügbar): per-Track Default-Racer ` +
    `(snail ist grass-only → "snail auf allen" ungültig; jeder Track nutzt seinen eigenen Default). ` +
    `--dur=60 einzeln (Budget; voll [30,120] wäre 2×). Volle Racer-Matrix wäre ~20-25h → Budget.\n\n` +
    `Akzeptanz: (1) honestOverlap RUNTER auf Test+open · (2) p≥0.05 ALLE Tracks · (3) tmOsc ≤ Baseline.\n`);

  const t0 = Date.now();

  // Phase 0 — baseline bufferPct=0.2
  log('=== Phase 0: baseline bufferPct=0.2 ===');
  const baseline = runValue({ avoidanceBufferPct: 0.2 }, 'phase0');
  writeRows('Phase 0 — Baseline (bufferPct=0.2)', baseline, null);

  // Phase 1 — bufferPct sweep
  log('=== Phase 1: bufferPct 0.3-0.6 ===');
  const phase1 = {};
  const candidates = [];
  for (const v of [0.3, 0.4, 0.5, 0.6]) {
    const val = runValue({ avoidanceBufferPct: v }, `phase1_buf${v}`);
    phase1[v] = val;
    const acc = accept(val, baseline);
    writeRows(`Phase 1 — bufferPct=${v} · ${acc.ok ? 'AKZEPTIERT' : 'verworfen: ' + acc.reasons.join(', ')}`, val, baseline);
    if (acc.ok) candidates.push({ v, testOverlap: val[TEST_ID]?.overlap ?? Infinity });
  }

  let optimum = null; // { bufferPct, normExp }
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.testOverlap - b.testOverlap);
    const best = candidates[0].v;
    appendSummary(`\n**Phase 1 Kandidat:** bufferPct=${best} (niedrigster Test-Overlap unter akzeptierten).`);
    // Phase 2 — refine ±0.05
    log(`=== Phase 2: refine around ${best} ===`);
    const refineVals = [...new Set([+(best - 0.05).toFixed(2), +(best + 0.05).toFixed(2)])].filter((v) => v >= 0.1 && v <= 1.0);
    const accepted = [{ v: best, testOverlap: candidates[0].testOverlap }];
    for (const v of refineVals) {
      const val = runValue({ avoidanceBufferPct: v }, `phase2_buf${v}`);
      const acc = accept(val, baseline);
      writeRows(`Phase 2 — bufferPct=${v} · ${acc.ok ? 'AKZEPTIERT' : 'verworfen: ' + acc.reasons.join(', ')}`, val, baseline);
      if (acc.ok) accepted.push({ v, testOverlap: val[TEST_ID]?.overlap ?? Infinity });
    }
    accepted.sort((a, b) => a.testOverlap - b.testOverlap);
    optimum = { bufferPct: accepted[0].v, normExp: 0.5 };
  } else {
    // Phase 2b — normExp sweep at the highest still-fair bufferPct (else baseline 0.2)
    const fairBufs = [0.2, 0.3, 0.4, 0.5, 0.6].filter((v) => (v === 0.2 ? fairAllTracks(baseline) : phase1[v] && fairAllTracks(phase1[v])));
    const bufForG = fairBufs.length ? Math.max(...fairBufs) : 0.2;
    appendSummary(`\n**Phase 1 ohne Kandidat.** Bester noch-fairer bufferPct = ${bufForG}. → Phase 2b normExp-Sweep.`);
    log(`=== Phase 2b: normExp sweep at bufferPct=${bufForG} ===`);
    const accepted = [];
    for (const e of [0.4, 0.3, 0.2]) {
      const val = runValue({ avoidanceBufferPct: bufForG, avoidanceNormExponent: e }, `phase2b_buf${bufForG}_exp${e}`);
      const acc = accept(val, baseline);
      writeRows(`Phase 2b — bufferPct=${bufForG} normExp=${e} · ${acc.ok ? 'AKZEPTIERT' : 'verworfen: ' + acc.reasons.join(', ')}`, val, baseline);
      if (acc.ok) accepted.push({ e, testOverlap: val[TEST_ID]?.overlap ?? Infinity });
    }
    if (accepted.length) {
      accepted.sort((a, b) => a.testOverlap - b.testOverlap);
      optimum = { bufferPct: bufForG, normExp: accepted[0].e };
    } else {
      // Phase 3 — combined best-fair bufferPct + best (lowest) normExp tried
      appendSummary(`\n**Phase 2b ohne Kandidat.** → Phase 3 kombiniert bufferPct=${bufForG} + normExp=0.2.`);
      log('=== Phase 3: combined ===');
      const val = runValue({ avoidanceBufferPct: bufForG, avoidanceNormExponent: 0.2 }, 'phase3_combined');
      const acc = accept(val, baseline);
      writeRows(`Phase 3 — bufferPct=${bufForG} normExp=0.2 · ${acc.ok ? 'AKZEPTIERT' : 'verworfen: ' + acc.reasons.join(', ')}`, val, baseline);
      if (acc.ok) optimum = { bufferPct: bufForG, normExp: 0.2 };
    }
  }

  // Phase Final — verification with ALL racer types (only if optimum found)
  if (optimum) {
    appendSummary(`\n## OPTIMUM: bufferPct=${optimum.bufferPct}${optimum.normExp !== 0.5 ? `, normExp=${optimum.normExp}` : ''}`);
    log(`=== Phase Final: verify optimum bufferPct=${optimum.bufferPct} normExp=${optimum.normExp} (all racers) ===`);
    const beh = { avoidanceBufferPct: optimum.bufferPct };
    if (optimum.normExp !== 0.5) beh.avoidanceNormExponent = optimum.normExp;
    const val = runValue(beh, 'phase_final', true);
    writeRows(`Phase Final — VERIFIKATION (alle Racer-Typen) · bufferPct=${optimum.bufferPct} normExp=${optimum.normExp}`, val, baseline);
    const acc = accept(val, baseline);
    appendSummary(`\n**Final-Verifikation:** ${acc.ok ? 'BESTÄTIGT ✅' : 'WARN: ' + acc.reasons.join(', ')}`);
    appendSummary(`\n**COMMIT-EMPFEHLUNG:** avoidanceBufferPct=${optimum.bufferPct}${optimum.normExp !== 0.5 ? `, avoidanceNormExponent=${optimum.normExp}` : ' (normExp unverändert 0.5 → raceBehavior.js-Param entfernen vor Commit)'}`);
  } else {
    appendSummary(`\n## KEIN OPTIMUM gefunden — kein Wert erfüllt alle 3 Akzeptanz-Kriterien. Baseline bleibt. Kein Commit empfohlen.`);
    log('=== No optimum found ===');
  }

  appendSummary(`\n_Gesamtlaufzeit: ${((Date.now() - t0) / 60000).toFixed(1)} min._`);
  log(`DONE in ${((Date.now() - t0) / 60000).toFixed(1)} min. Optimum: ${JSON.stringify(optimum)}`);
}

main().catch((e) => { log('FATAL: ' + (e.stack || e)); process.exit(1); });
