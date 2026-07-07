// Strip-down analysis (read-only). Reads results/strip-down/strip-*.json (action + worst-case +
// per-racer bonus/share) and, when present, client/tmp/sd/<label>/fairness-data.json (official
// start-row chi-sq + row win-rate gate), and emits per (stage x variant x track) tables:
//   PULK action | OUTCOME action | finish fairness | worst-case winner | bonus<->leader correlation
// Fairness definitions are explicit here so they can be inspected:
//   band-reach[B]  = over all (race,racer) assigned to band B, fraction whose finishRank lands in
//                    band B or better. FAIR gate: every band with >=1 assignment reaches >= 70%.
//   start-row      = official native computeFairnessStats p-value (>=0.05 = independent of start row)
//                    from the standard run, plus the 1.5x row win-rate gate (open tracks).
//   action-rich    = PULK front genuinely contested: distinctP1 >= 4 AND leaderShare <= 0.50.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SD = join(ROOT, 'results', 'strip-down');
const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (r) => { for (let i = 0; i < BAND_EDGES.length; i++) if (r <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (x) => (x * 100).toFixed(0) + '%';
function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}
const ARGV = process.argv.slice(2);
const ONLY = ARGV.find((a) => a.startsWith('--stages='))?.slice(9)?.split(',') ?? null; // e.g. --stages=s0,s1

const files = readdirSync(SD).filter((f) => /^strip-s\d.*\.json$/.test(f)).sort();
const rows = [];
for (const f of files) {
  const label = f.replace(/^strip-/, '').replace(/\.json$/, ''); // e.g. s0-v1-searound
  const m = label.match(/^(s\d)-v(\d)-(.+)$/); if (!m) continue;
  const [, stage, variant, track] = m;
  if (ONLY && !ONLY.includes(stage)) continue;
  const d = JSON.parse(readFileSync(join(SD, f), 'utf8'));
  const combo = d.combos[0]; if (!combo) continue;
  const races = combo.races;
  const isOpen = combo.isOpen;

  // ── Action windows (means across races) ──
  const A = (sel, win) => mean(races.map((r) => sel(r[win])));
  const pulk = {
    leadChanges: A((w) => w.leadChanges, 'pulk'),
    distinctP1: A((w) => w.distinctP1, 'pulk'),
    leaderShare: A((w) => w.leaderShare, 'pulk'),
    shuffle: A((w) => w.top3ShuffleRate, 'pulk'),
  };
  const out = {
    leadChanges: A((w) => w.leadChanges, 'outcome'),
    distinctP1: A((w) => w.distinctP1, 'outcome'),
    leaderShare: A((w) => w.leaderShare, 'outcome'),
    shuffle: A((w) => w.top3ShuffleRate, 'outcome'),
  };

  // ── Band-reach per band (from perRacer targetBand vs finalRank) ──
  const bandTot = [0, 0, 0, 0, 0], bandHit = [0, 0, 0, 0, 0];
  const corrX = [], corrArea = [], corrRow = []; // pulk top3-share vs (areaSample-1) / rowBonus
  for (const r of races) for (const p of r.perRacer) {
    if (p.targetBand != null && p.finalRank != null) {
      bandTot[p.targetBand]++;
      if (bandOf(p.finalRank) <= p.targetBand) bandHit[p.targetBand]++;
    }
    corrX.push(p.pulkTop3Frac); corrArea.push(p.areaSample - 1); corrRow.push(p.rowBonus);
  }
  const bandReach = bandTot.map((t, i) => (t > 0 ? bandHit[i] / t : null));
  const bandGate = bandReach.every((v, i) => v == null || bandTot[i] === 0 || v >= 0.70);
  const corrArea_r = pearson(corrX, corrArea);
  const corrRow_r = pearson(corrX, corrRow);

  // ── Worst-case assigned winner ──
  const w = races.map((r) => r.winner).filter((x) => x && x.rankAt055 != null);
  const reachedP1 = w.filter((x) => x.finalRank === 1).length;
  const worst = w.slice().sort((a, b) => b.rankAt055 - a.rankAt055)[0] ?? null;
  const winner = {
    meanRankAt055: mean(w.map((x) => x.rankAt055)),
    worstRankAt055: worst ? worst.rankAt055 : null,
    worstFinalRank: worst ? worst.finalRank : null,
    reachedP1Frac: w.length ? reachedP1 / w.length : null,
    meanMaxTraj: mean(w.map((x) => x.maxTrajMult)),
    meanCeilFrac: mean(w.map((x) => x.outcomeCeilFrac)),
  };

  // ── Official start-row fairness from the standard run (if present) ──
  let pValue = null, rowGate = null;
  const fdp = join(ROOT, 'client', 'tmp', 'sd', label, 'fairness-data.json');
  if (existsSync(fdp)) {
    const fd = JSON.parse(readFileSync(fdp, 'utf8'));
    const st = fd.results?.[0]?.stats;
    if (st) {
      pValue = st.pValue;
      const gr = st.rowStats.filter((rs) => rs.expectedWinRate * st.nRaces >= 3);
      rowGate = gr.every((rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5);
    }
  }

  const fair = bandGate && (pValue == null || pValue >= 0.05) && (rowGate == null || rowGate);
  const actionRich = pulk.distinctP1 >= 4 && pulk.leaderShare <= 0.50;

  rows.push({ stage, variant: 'v' + variant, track, isOpen, nRaces: races.length,
    pulk, out, bandReach, bandTot, bandGate, pValue, rowGate, winner,
    corrArea_r, corrRow_r, fair, actionRich });
}

// ── Emit markdown ──
const L = [];
L.push('# Strip-down analysis');
L.push('');
L.push('Gates: **FAIR** = every assigned band reaches its band or better ≥70% AND start-row p≥0.05 AND 1.5×-gate (open).');
L.push('**ACTION-RICH** = PULK distinctP1 ≥ 4 AND PULK leaderShare ≤ 50% (front contested, no dominator).');
L.push('Windows: PULK = progress [0.25,0.55); OUTCOME = [0.55,1.0). 30 races/combo, seed 1, rubber-band OFF.');
L.push('');
L.push('| stage | var | track | PULK leadΔ | PULK distP1 | PULK lShare | OUT leadΔ | OUT distP1 | band-reach (B1..) | startrow p | winP1% | worst@0.55→fin | ceilFrac | corr(area) | corr(row) | FAIR | ACTION |');
L.push('|---|---|---|--:|--:|--:|--:|--:|---|--:|--:|---|--:|--:|--:|:--:|:--:|');
for (const r of rows) {
  const br = r.bandReach.map((v, i) => (r.bandTot[i] === 0 ? '·' : pct(v))).join('/');
  const wc = r.winner.worstRankAt055 != null ? `${r.winner.worstRankAt055}→${r.winner.worstFinalRank}` : '—';
  L.push(`| ${r.stage} | ${r.variant} | ${r.track} | ${r.pulk.leadChanges.toFixed(1)} | ${r.pulk.distinctP1.toFixed(1)} | ${pct(r.pulk.leaderShare)} | ${r.out.leadChanges.toFixed(1)} | ${r.out.distinctP1.toFixed(1)} | ${br} | ${r.pValue == null ? '—' : r.pValue.toFixed(2)} | ${r.winner.reachedP1Frac == null ? '—' : pct(r.winner.reachedP1Frac)} | ${wc} | ${r.winner.meanCeilFrac.toFixed(2)} | ${r.corrArea_r == null ? '—' : r.corrArea_r.toFixed(2)} | ${r.corrRow_r == null ? '—' : r.corrRow_r.toFixed(2)} | ${r.fair ? '✅' : '❌'} | ${r.actionRich ? '✅' : '❌'} |`);
}
L.push('');
const winners = rows.filter((r) => r.fair && r.actionRich);
L.push('## Fair + action-rich combos');
if (winners.length === 0) L.push('**NONE** — no (stage × variant × track) is both fair and action-rich at 30 races.');
else for (const r of winners) L.push(`- ${r.stage} ${r.variant} ${r.track}`);
const md = L.join('\n');
writeFileSync(join(SD, 'ANALYSIS.md'), md);
writeFileSync(join(SD, 'analysis.json'), JSON.stringify(rows, null, 2));
console.log(md);
