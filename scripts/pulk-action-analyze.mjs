// PULK-action grid analysis (read-only). Reads results/pulk-action/strip-<cell>-<track>.json (dual-
// window action + worst-case winner + naturalness) and client/tmp/pa/<label>/fairness-data.json
// (official start-row chi-sq + row win-rate gate). Emits per (cell × track) tables.
// Scoring (per spec — score on genuine circulation, NOT leadΔ flicker):
//   ACTION-RICH = PULK distinctP1 >= 4 AND PULK leaderShare <= 0.55 (front contested, no dominator;
//                 Stage-0 baseline was distinctP1 ~1.9 / leaderShare 0.75-0.87). leadΔ shown but not scored.
//   FAIR        = every assigned band reaches its band or better >= 70% AND start-row p >= 0.05 AND
//                 1.5x row win-rate gate (open) AND worst-case assigned winner recovers (final <= 5).
//   NAT         = maxSpeedFactor <= 1.09 (natural ceiling ~1.081); ⚠ if a tool pushes racers faster.
//   ceilFrac    = share of OUTCOME the winner spends at the controller clamp (headroom; <~0.85 = ok).
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PA = join(ROOT, 'results', 'pulk-action');
const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (r) => { for (let i = 0; i < BAND_EDGES.length; i++) if (r <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (x) => (x * 100).toFixed(0) + '%';

const files = readdirSync(PA).filter((f) => /^strip-a\db\d-.+\.json$/.test(f)).sort();
const rows = [];
for (const f of files) {
  const label = f.replace(/^strip-/, '').replace(/\.json$/, ''); // a2b0-searound
  const m = label.match(/^(a\d)(b\d)-(.+)$/); if (!m) continue;
  const [, a, b, track] = m;
  const d = JSON.parse(readFileSync(join(PA, f), 'utf8'));
  const combo = d.combos[0]; if (!combo) continue;
  const races = combo.races; const isOpen = combo.isOpen;
  const A = (sel, win) => mean(races.map((r) => sel(r[win])));
  const pulk = { leadChanges: A((w) => w.leadChanges, 'pulk'), distinctP1: A((w) => w.distinctP1, 'pulk'), leaderShare: A((w) => w.leaderShare, 'pulk'), shuffle: A((w) => w.top3ShuffleRate, 'pulk') };
  const out = { leadChanges: A((w) => w.leadChanges, 'outcome'), distinctP1: A((w) => w.distinctP1, 'outcome') };
  const bandTot = [0, 0, 0, 0, 0], bandHit = [0, 0, 0, 0, 0];
  for (const r of races) for (const p of r.perRacer) if (p.targetBand != null && p.finalRank != null) { bandTot[p.targetBand]++; if (bandOf(p.finalRank) <= p.targetBand) bandHit[p.targetBand]++; }
  const bandReach = bandTot.map((t, i) => (t > 0 ? bandHit[i] / t : null));
  const bandGate = bandReach.every((v, i) => v == null || bandTot[i] === 0 || v >= 0.70);
  const w = races.map((r) => r.winner).filter((x) => x && x.rankAt055 != null);
  const winner = { meanRankAt055: mean(w.map((x) => x.rankAt055)), worstRankAt055: Math.max(...w.map((x) => x.rankAt055)),
    worstFinalRank: (w.slice().sort((p, q) => q.rankAt055 - p.rankAt055)[0] || {}).finalRank ?? null,
    meanFinalRank: mean(w.map((x) => x.finalRank)), reachedP1Frac: w.length ? w.filter((x) => x.finalRank === 1).length / w.length : null,
    meanCeilFrac: mean(w.map((x) => x.outcomeCeilFrac)) };
  const nat = { maxSF: mean(races.map((r) => r.naturalness?.maxSpeedFactor ?? 1)), exceedFrac: mean(races.map((r) => r.naturalness?.exceedFrac ?? 0)) };
  let pValue = null, rowGate = null;
  const fdp = join(ROOT, 'client', 'tmp', 'pa', label, 'fairness-data.json');
  if (existsSync(fdp)) { const fd = JSON.parse(readFileSync(fdp, 'utf8')); const st = fd.results?.[0]?.stats;
    if (st) { pValue = st.pValue; const gr = st.rowStats.filter((rs) => rs.expectedWinRate * st.nRaces >= 3);
      rowGate = gr.every((rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5); } }
  const winnerRecovered = winner.worstFinalRank != null && winner.worstFinalRank <= 5;
  const fair = bandGate && (pValue == null || pValue >= 0.05) && (rowGate == null || rowGate) && winnerRecovered;
  const actionRich = pulk.distinctP1 >= 4 && pulk.leaderShare <= 0.55;
  const natOk = nat.maxSF <= 1.09;
  rows.push({ cell: a + b, a, b, track, isOpen, nRaces: races.length, pulk, out, bandReach, bandTot, bandGate, pValue, rowGate, winner, nat, natOk, fair, actionRich });
}
rows.sort((x, y) => x.cell.localeCompare(y.cell) || x.track.localeCompare(y.track));

const L = [];
L.push('# PULK-action grid analysis');
L.push('');
L.push('Windows: PULK action = progress [0.25,0.55); OUTCOME = [0.55,1.0). 30 races/combo, seed 1, variant-1 re-roll.');
L.push('Bonuses 0 in PULK (both axes); chaos row-bonus full. Tools fade to 1.0 before corridorStart (0.55).');
L.push('**ACTION** = distinctP1 ≥ 4 AND leaderShare ≤ 55% (Stage-0 baseline: 1.9 / 75-87%). leadΔ shown but NOT scored (flicker).');
L.push('**FAIR** = band-reach all ≥70% AND start-row p≥0.05 AND 1.5×-gate (open) AND worst-case winner recovers (≤5).');
L.push('**NAT** ✅ if peak speed ≤ +9% (natural ≈ +8.1%); ⚠ = a tool pushes a racer faster than natural.');
L.push('');
L.push('| cell | track | PULK distP1 | PULK lShare | PULK leadΔ(flick) | OUT distP1 | band-reach | srow p | winP1% | worst@55→fin | ceilFrac | nat maxSF | nat>ceil | ACTION | FAIR | NAT |');
L.push('|---|---|--:|--:|--:|--:|---|--:|--:|---|--:|--:|--:|:--:|:--:|:--:|');
for (const r of rows) {
  const br = r.bandReach.map((v, i) => (r.bandTot[i] === 0 ? '·' : pct(v))).join('/');
  L.push(`| ${r.cell} | ${r.track} | ${r.pulk.distinctP1.toFixed(1)} | ${pct(r.pulk.leaderShare)} | ${r.pulk.leadChanges.toFixed(0)} | ${r.out.distinctP1.toFixed(1)} | ${br} | ${r.pValue == null ? '—' : r.pValue.toFixed(2)} | ${r.winner.reachedP1Frac == null ? '—' : pct(r.winner.reachedP1Frac)} | ${r.winner.worstRankAt055}→${r.winner.worstFinalRank} | ${r.winner.meanCeilFrac.toFixed(2)} | ${r.nat.maxSF.toFixed(3)} | ${pct(r.nat.exceedFrac)} | ${r.actionRich ? '✅' : '❌'} | ${r.fair ? '✅' : '❌'} | ${r.natOk ? '✅' : '⚠'} |`);
}
L.push('');
const wins = rows.filter((r) => r.actionRich && r.fair);
L.push('## Cells that are BOTH action-rich AND fair (per track)');
if (!wins.length) L.push('**NONE** at 30 races.');
else for (const r of wins) L.push(`- ${r.cell} × ${r.track}  (nat ${r.natOk ? 'ok' : 'WARN maxSF ' + r.nat.maxSF.toFixed(2)})`);
// Cell-level roll-up: a cell "wins" if action+fair on all 4 tracks (naturalness noted separately).
const cells = [...new Set(rows.map((r) => r.cell))].sort();
L.push('');
L.push('## Cell roll-up (across all 4 tracks)');
L.push('| cell | tracks action+fair | tracks nat-ok | mean PULK distP1 | mean lShare | mean nat maxSF |');
L.push('|---|--:|--:|--:|--:|--:|');
for (const c of cells) {
  const cr = rows.filter((r) => r.cell === c);
  L.push(`| ${c} | ${cr.filter((r) => r.actionRich && r.fair).length}/${cr.length} | ${cr.filter((r) => r.natOk).length}/${cr.length} | ${mean(cr.map((r) => r.pulk.distinctP1)).toFixed(1)} | ${pct(mean(cr.map((r) => r.pulk.leaderShare)))} | ${mean(cr.map((r) => r.nat.maxSF)).toFixed(3)} |`);
}
const md = L.join('\n');
writeFileSync(join(PA, 'ANALYSIS.md'), md);
writeFileSync(join(PA, 'analysis.json'), JSON.stringify(rows, null, 2));
console.log(md);
