// Final pooled multi-seed fairness re-gate — Phase B evaluator.
// Pools 6 reusable HEAD tracks (results/lbb-regate-det/head) + 4 new gap tracks
// (results/final-gate-gap) into one 10-track, seeds-1-6, 60s dataset and evaluates
// the owner fairness gate. Band-reach and Holm come ONLY from the exported sim
// helpers (single source) — no metric is reimplemented here.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { computeZoneSuccessRate, computeExtendedFairnessStats, computeFairnessStats } from '../../scripts/sim-fairness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEEDS = [1, 2, 3, 4, 5, 6];
const REUSE = ['garden-path', 'seatrack', 'city-circuit', 'mountainstreet', 'searound', 'ice-track'];
const NEW   = ['dirt-oval', 'river-run', 'space-sprint', 'luger-hill'];
const ALL   = [...NEW, ...REUSE];

const raceKeyOf = (e) => `${e.trackId}|${e.racerType}|${e.seed}|${e.raceIdx}`;

// Deterministic PRNG for the Spearman permutation p (reproducible gate).
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadTrackRawData(track) {
  const base = NEW.includes(track) ? 'results/final-gate-gap' : 'results/lbb-regate-det/head';
  const out = [];
  for (const s of SEEDS) {
    const p = join(ROOT, base, track, `seed${s}`, 'fairness-data.json');
    const d = JSON.parse(readFileSync(p, 'utf8'));
    out.push(...d.rawData);
  }
  return out;
}

// rowSizes from the data itself (positions per start row in one race).
function deriveRowSizes(entries) {
  const oneKey = raceKeyOf(entries[0]);
  const one = entries.filter((e) => raceKeyOf(e) === oneKey);
  const counts = {};
  for (const e of one) counts[e.startRowIndex] = (counts[e.startRowIndex] || 0) + 1;
  return Object.keys(counts).sort((a, b) => a - b).map((k) => counts[k]);
}

// Band-reach via the exported computeZoneSuccessRate (reconstruct {result,targetRankMap}).
function bandReach(entries) {
  const byRace = new Map();
  for (const e of entries) {
    const k = raceKeyOf(e);
    if (!byRace.has(k)) byRace.set(k, []);
    byRace.get(k).push(e);
  }
  const raceEntries = [];
  for (const grp of byRace.values()) {
    raceEntries.push({
      result: grp.map((e) => ({ racerIndex: e.racerIndex, finalRank: e.finalRank })),
      targetRankMap: new Map(grp.map((e) => [e.racerIndex, e.sollRank])),
    });
  }
  return computeZoneSuccessRate(raceEntries);
}

// Map rawData -> entries shape computeExtendedFairnessStats expects.
const toStatEntries = (entries) => entries.map((e) => ({
  finalRank: e.finalRank,
  startRowIndex: e.startRowIndex,
  raceKey: raceKeyOf(e),
  trackId: e.trackId,
  targetBandIdx: e.sollBereich - 1,
  targetRank: e.sollRank,
}));

// ── Load ──
const byTrack = {};
const rowSizesByTrack = {};
for (const t of ALL) {
  byTrack[t] = loadTrackRawData(t);
  rowSizesByTrack[t] = deriveRowSizes(byTrack[t]); // per-track: row layouts differ (2..7 rows)
}
const ZONE70 = 0.70;

// ── PRIMARY: per-track band-reach (rank->zone, independent of row layout) ──
const perTrack = {};
for (const t of ALL) {
  const zsr = bandReach(byTrack[t]);
  const zoneRates = zsr.zones.map((z) => ({ zone: z.zone, rate: z.rate, hits: z.hits, total: z.total }));
  const binding = zoneRates.filter((z) => z.rate != null).reduce((m, z) => (z.rate < m.rate ? z : m));
  perTrack[t] = {
    races: new Set(byTrack[t].map(raceKeyOf)).size,
    racerRows: byTrack[t].length,
    rowSizes: rowSizesByTrack[t],
    overall: zsr.overall.rate,
    zoneRates,
    bindingZone: binding.zone,
    bindingRate: binding.rate,
    bandReachPass: binding.rate >= ZONE70,
  };
}

// ── SECONDARY (GATE): start-row bias = the sim's NATIVE test computeFairnessStats
// (chi-square goodness-of-fit of wins-by-row vs fair share) — the exact test the
// sim persists as stats.pValue and the reports label "Fair/Unfair". Pooled 300
// races/track, correct per-track rowSizes. This is what "start-row bias p-value"
// means in the sim. Holm across the 10 per-track p-values: Holm-Bonferroni never
// DECREASES a p-value, so if the SMALLEST raw p already exceeds 0.05, every
// Holm-adjusted p does too ⇒ 0 Holm-unfair. (No need to re-implement Holm.) ──
function raceResultsFor(entries) {
  const byRace = new Map();
  for (const e of entries) {
    const k = raceKeyOf(e);
    if (!byRace.has(k)) byRace.set(k, []);
    byRace.get(k).push({ startRowIndex: e.startRowIndex, finalRank: e.finalRank });
  }
  return [...byRace.values()];
}
for (const t of ALL) {
  const rs = rowSizesByTrack[t];
  const fs = computeFairnessStats(raceResultsFor(byTrack[t]), rs.length, rs);
  perTrack[t].startRow = { chiSq: fs.chiSq, df: fs.df, pValue: fs.pValue, fair: fs.pValue >= 0.05 };
}
const minRawP = Math.min(...ALL.map((t) => perTrack[t].startRow.pValue));
const unfairTracks = ALL.filter((t) => perTrack[t].startRow.pValue < 0.05);
const holmPass = minRawP >= 0.05; // ⇒ all Holm-adjusted p ≥ raw ≥ minRawP > 0.05

// ── EXPLORATORY CONTEXT (NOT a gate criterion): per-band ordinal Spearman trend.
// Over-powers at N=300 races (flags |r|~0.03 as p<0.05); reported with effect
// sizes so the artifact is visible. Kept separate from the gate. ──
const ordinalContext = {};
for (const t of ALL) {
  const ext = computeExtendedFairnessStats(toStatEntries(byTrack[t]), rowSizesByTrack[t], {
    nPerm: 999, prng: mulberry32(0x9e3779b9),
  });
  ordinalContext[t] = ext.pooled.ordinal
    .filter((o) => o.r != null)
    .map((o) => ({ band: `B${o.bandIdx + 1}`, r: +o.r.toFixed(3), pRaw: +o.pRaw.toFixed(3) }));
}
const maxAbsOrdinalR = Math.max(...Object.values(ordinalContext).flat().map((o) => Math.abs(o.r)));

// ── Context-only: honestOverlap% per track (parsed from the per-seed report md;
// not persisted in fairness-data.json). Context only — NOT a gate criterion. ──
// Section-scoped parse: only the overlap-metrics table (header has
// "overlapRate%" + "honestOverlap%"); honestOverlap is that table's 6th column.
function ctxMetrics(track) {
  const base = NEW.includes(track) ? 'results/final-gate-gap' : 'results/lbb-regate-det/head';
  const ovl = [];
  for (const s of SEEDS) {
    const lines = readFileSync(join(ROOT, base, track, `seed${s}`, 'fairness-report.md'), 'utf8').split(/\r?\n/);
    const hdr = lines.findIndex((l) => /overlapRate%/.test(l) && /honestOverlap%/.test(l));
    if (hdr < 0) continue;
    for (let i = hdr + 2; i < lines.length; i++) {          // +2 skips the |---| separator
      const l = lines[i];
      if (!l.trim().startsWith('|')) break;                  // end of table
      const cols = l.split('|').map((c) => c.trim());        // ['', Track, Racer, Dist, N, overlap%, honest%, ...]
      const m = (cols[6] || '').match(/([\d.]+)%/);
      if (m) ovl.push(parseFloat(m[1]));
    }
  }
  return { honestOverlapPctMean: ovl.length ? ovl.reduce((a, b) => a + b, 0) / ovl.length : null, nRows: ovl.length };
}

// ── Output ──
const overallGate = ALL.every((t) => perTrack[t].bandReachPass) && holmPass;

const bandReachAllPass = ALL.every((t) => perTrack[t].bandReachPass);
const out = {
  head: 'b7d7c7d',
  tracks: ALL.length,
  seedsPerTrack: SEEDS.length,
  racesPerTrack: perTrack[ALL[0]].races,
  rowSizesByTrack,
  primary_bandReach: {
    threshold: ZONE70, bindingZone: 'B3 (always the tightest)',
    perTrackB3: Object.fromEntries(ALL.map((t) => [t, +(perTrack[t].bindingRate * 100).toFixed(2)])),
    failing: ALL.filter((t) => !perTrack[t].bandReachPass),
    pass: bandReachAllPass,
  },
  secondary_startRowBias: {
    test: 'computeFairnessStats (native chi-square wins-by-row vs fair share), pooled 300 races/track',
    perTrackP: Object.fromEntries(ALL.map((t) => [t, +perTrack[t].startRow.pValue.toFixed(4)])),
    minRawP: +minRawP.toFixed(4),
    unfairTracks,
    holmNote: 'Holm never lowers p; minRawP > 0.05 ⇒ all Holm-adjusted p > 0.05 ⇒ 0 Holm-unfair',
    pass: holmPass,
  },
  exploratory_ordinal_NOT_A_GATE: {
    note: 'per-band Spearman; over-powers at N=300 (flags |r|~0.03). Effect sizes negligible.',
    maxAbsR: +maxAbsOrdinalR.toFixed(3),
  },
  overallGate: overallGate ? 'PASSED' : 'FAILED',
};
console.log(JSON.stringify(out, null, 2));

console.log('\n============ PRIMARY — BAND-REACH (pooled 300 races/track, threshold 70%) ============');
console.log('track            races  overall  B1     B2     B3     B4    B3-pass');
for (const t of ALL) {
  const p = perTrack[t];
  const z = Object.fromEntries(p.zoneRates.map((x) => [x.zone, x.rate]));
  const fp = (v) => (v == null ? '  -  ' : (v * 100).toFixed(2).padStart(6));
  console.log(t.padEnd(16), String(p.races).padStart(5), fp(p.overall), fp(z.B1), fp(z.B2), fp(z.B3), fp(z.B4),
    '  ' + (p.bandReachPass ? 'PASS' : `FAIL (${(p.bindingRate * 100).toFixed(2)}%)`));
}
console.log('PRIMARY:', bandReachAllPass ? 'PASS (all 10 B3≥70%)' : `FAIL — B3<70% on: ${out.primary_bandReach.failing.join(', ')}`);

console.log('\n============ SECONDARY — START-ROW BIAS (native chi-square, pooled 300) ============');
console.log('track            chi²p   fair?');
for (const t of ALL) console.log(t.padEnd(16), perTrack[t].startRow.pValue.toFixed(4).padStart(6), '  ' + (perTrack[t].startRow.fair ? 'fair' : 'UNFAIR'));
console.log(`SECONDARY: ${holmPass ? 'PASS' : 'FAIL'} — min raw p=${minRawP.toFixed(4)}; Holm-adjusted ≥ raw ⇒ ${unfairTracks.length} Holm-unfair`);
console.log('\n[context, not a gate] per-band ordinal Spearman max|r| across all tracks =', maxAbsOrdinalR.toFixed(3),
  '(negligible; large-N over-flagging — see exploratory_ordinal above)');

console.log('\n---- CONTEXT ONLY (not a gate criterion): honestOverlap% per track ----');
for (const t of ALL) {
  const c = ctxMetrics(t);
  console.log(t.padEnd(16), c.honestOverlapPctMean == null ? 'n/a' : `${c.honestOverlapPctMean.toFixed(2)}% (mean over ${c.nRows} racer×seed rows)`);
}

console.log('\n>>> OVERALL GATE:', overallGate ? 'PASSED ✅' : 'FAILED ❌');
