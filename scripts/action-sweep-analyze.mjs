// ============================================================
// MEASUREMENT-ONLY analyze for the PULK re-roll-vs-cohesion sweep.
// Reads results/action-metrics/am-*.json (written by --action-metrics), groups by pulkBiasGain
// level, and reports one table: action metrics (mean over races×tracks) + spreadLenP10P90 +
// pooled band-reach + pooled corrP1 + pooled start-row→finish correlation + maxSpeedFactor.
// No game-module import; pure post-processing of the sim dumps.
// ============================================================
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'results', 'action-metrics');

// ── stats helpers ────────────────────────────────────────────────────────────
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(arr.length);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}
// Deterministic PRNG (mulberry32) for the permutation p-value.
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function permP(xs, ys, nPerm = 999) {
  const obs = Math.abs(spearman(xs, ys));
  const rng = mulberry32(1234567);
  const y = [...ys];
  let ge = 0;
  for (let p = 0; p < nPerm; p++) {
    for (let i = y.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [y[i], y[j]] = [y[j], y[i]];
    }
    if (Math.abs(spearman(xs, y)) >= obs) ge++;
  }
  return (ge + 1) / (nPerm + 1);
}

// ── load + group by pulkBiasGain level ───────────────────────────────────────
const files = readdirSync(DIR).filter((f) => f.startsWith('am-') && f.endsWith('.json'));
if (!files.length) {
  console.error(`No am-*.json in ${DIR}. Run scripts/action-sweep-driver.sh first.`);
  process.exit(1);
}
const byLevel = new Map(); // pulkBiasGain -> { races:[actionMetrics], perRacer:[rows], variation }
for (const f of files) {
  const j = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const lvl = j.meta.pulkBiasGain;
  if (!byLevel.has(lvl)) byLevel.set(lvl, { races: [], perRacer: [], variation: j.meta.reRollVariationPercent, director: j.meta.governorDirectorEnabled });
  const g = byLevel.get(lvl);
  for (const c of j.combos || []) {
    for (const r of c.races || []) {
      g.races.push(r);
      for (const pr of r.perRacer || []) g.perRacer.push(pr);
    }
  }
}

// ── per-level aggregation ────────────────────────────────────────────────────
const levels = [...byLevel.keys()].sort((a, b) => b - a); // 2.0 → 0.0
const rows = [];
for (const lvl of levels) {
  const g = byLevel.get(lvl);
  const R = g.races;
  const m = (f) => mean(R.map(f));
  // pooled band-reach: fraction of racers whose finish band == target band
  const withBand = g.perRacer.filter((p) => p.targetBand != null && p.finalBand != null);
  const bandReach = withBand.length ? withBand.filter((p) => p.finalBand === p.targetBand).length / withBand.length : 0;
  // pooled corrP1: |Spearman(targetRank, PULK-window P1 time)|
  const cp = g.perRacer.filter((p) => p.targetRank != null && p.p1FracWindow != null);
  const corrP1 = Math.abs(spearman(cp.map((p) => p.targetRank), cp.map((p) => p.p1FracWindow)));
  // pooled start-row→finish correlation (start-row fairness signal). Sample for the permutation
  // p (cap at 4000 rows for speed; correlation itself uses all rows).
  const sr = g.perRacer.filter((p) => p.startRowIndex != null && p.finalRank != null);
  const srCorr = Math.abs(spearman(sr.map((p) => p.startRowIndex), sr.map((p) => p.finalRank)));
  const srSample = sr.length > 4000 ? sr.filter((_, i) => i % Math.ceil(sr.length / 4000) === 0) : sr;
  const srP = permP(srSample.map((p) => p.startRowIndex), srSample.map((p) => p.finalRank), 499);
  rows.push({
    lvl, nRaces: R.length,
    churn: m((r) => r.rankChurn),
    travel: m((r) => r.meanRankTravel),
    p90: m((r) => r.p90RankTravel),
    risers: m((r) => r.risers),
    fallers: m((r) => r.fallers),
    top5: m((r) => r.frontTop5Turnover),
    spread: m((r) => r.spreadLenP10P90),
    bandReach, corrP1, srCorr, srP,
    maxSF: Math.max(...R.map((r) => r.maxSpeedFactor)),
    variation: g.variation, director: g.director,
  });
}

// ── print table ──────────────────────────────────────────────────────────────
const v = rows[0]?.variation ?? '?';
const dir = rows[0]?.director ? 'ON' : 'OFF';
console.log(`\n=== PULK re-roll vs cohesion — director ${dir}, reRollVariation=${v}% ===`);
console.log('(action metrics = mean over races×tracks in the PULK window; fairness pooled over all racers)\n');
const H = ['pulkBiasGain', 'nRaces', 'rankChurn', 'travelØ', 'travelP90', 'risers', 'fallers', 'top5turn', 'spreadLen', 'bandReach', 'corrP1', 'srCorr(p)', 'maxSF'];
const w = [12, 7, 10, 8, 10, 7, 8, 9, 10, 10, 7, 12, 6];
const fmt = (cells) => cells.map((c, i) => String(c).padStart(w[i])).join(' ');
console.log(fmt(H));
console.log(w.map((n) => '-'.repeat(n)).join(' '));
for (const r of rows) {
  console.log(fmt([
    r.lvl.toFixed(2), r.nRaces,
    r.churn.toFixed(0), r.travel.toFixed(1), r.p90.toFixed(1),
    r.risers.toFixed(1), r.fallers.toFixed(1), r.top5.toFixed(1),
    r.spread.toFixed(1),
    (r.bandReach * 100).toFixed(0) + '%',
    r.corrP1.toFixed(3),
    r.srCorr.toFixed(2) + '(' + r.srP.toFixed(2) + ')',
    r.maxSF.toFixed(3),
  ]));
}
console.log('\nFairness gates: bandReach ≥ 70%, corrP1 ≤ 0.15, start-row srCorr p ≥ 0.05 (no start-row bias), maxSF ≤ ~1.081.');
console.log('Action read: look for the level where risers AND fallers are both substantial, travel/churn are up,');
console.log('and spreadLen sits in a MID band (not collapsed, not strung out) — while all fairness gates still hold.');
