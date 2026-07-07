// PULK-action-FINAL analysis (read-only). FAIRNESS by the real, binding definition ONLY:
//   band-reach ≥70% per band (computeZoneSuccessRate = EXACT zone match, fz===tz) AND
//   start-row Holm PASS (native computeFairnessStats p ≥ 0.05, 0 unfair rows) AND corrP1 ≤ 0.15.
// Worst-case winner + ≤P5 rate are CONTEXT ONLY (never a fail condition). Two variants: A (no gate),
// B (position-gate 15/31). Per track × variant.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'results', 'pulk-action-final');
const BAND = [5, 15, 25, 40]; const bandOf = (r) => { for (let i = 0; i < BAND.length; i++) if (r <= BAND[i]) return i; return 4; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (x) => (x * 100).toFixed(0) + '%';
const TRACKS = ['searound','garden-path','dirt-oval','ice-track','city-circuit','mountainstreet','seatrack','luger-hill','space-sprint','river-run'];
function fa(l) { const p = join(ROOT, 'results', 'front-action', `front-action-${l}.json`); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')).combos[0].unpredictability.rankVsP1Frac : null; }
function srowP(l) { const p = join(ROOT, 'client', 'tmp', 'paf', l, 'fairness-data.json'); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')).results[0].stats.pValue : null; }
const rows = [];
for (const V of ['A', 'B']) for (const t of TRACKS) {
  const f = join(DIR, `strip-${V}-${t}.json`); if (!existsSync(f)) continue;
  const races = JSON.parse(readFileSync(f, 'utf8')).combos[0].races; const W = races.map((r) => r.winner);
  // band-reach: EXACT zone match per band (computeZoneSuccessRate definition)
  const hit = [0,0,0,0,0], tot = [0,0,0,0,0];
  for (const r of races) for (const p of r.perRacer) if (p.targetRank != null && p.finalRank != null) {
    const tz = bandOf(p.targetRank), fz = bandOf(p.finalRank); tot[tz]++; if (fz === tz) hit[tz]++;
  }
  const band = tot.map((x, i) => x ? hit[i] / x : null);
  const bandPass = band.every((v, i) => v == null || tot[i] === 0 || v >= 0.70);
  const pv = srowP(`${V}-${t}`); const corr = fa(`${V}-${t}`);
  const held = mean(races.map((r) => r.pulk.cleanOvertakes)); const dp1 = mean(races.map((r) => r.pulk.distinctP1));
  const ls = mean(races.map((r) => r.pulk.leaderShare)); const peak = mean(races.map((r) => r.naturalness.maxSpeedFactor));
  const worst = W.slice().sort((a, b) => b.rankAt055 - a.rankAt055)[0];
  const p5rate = W.filter((w) => w.finalRank <= 5).length / W.length;
  const fair = bandPass && (pv == null || pv >= 0.05) && (corr == null || corr <= 0.15);
  const action = held >= 3 && dp1 >= 4;
  rows.push({ V, t, band, bandPass, pv, corr, held, dp1, ls, peak, worst: worst.rankAt055 + '→' + worst.finalRank, p5rate, fair, action, natOk: peak <= 1.082 });
}
const L = [];
L.push('# PULK-action-FINAL — real fairness definition across 10 tracks');
L.push('');
L.push('FAIR = band-reach ≥70% per band (EXACT zone match) AND start-row Holm p≥0.05 AND corrP1 ≤0.15. Worst-winner = CONTEXT ONLY.');
L.push('ACTION = PULK held overtakes ≥3 AND distinct P1 ≥4. Variant A = no gate; B = position-gate 15/31.');
L.push('');
L.push('| V | track | band-reach (B1..B5, exact) | Holm p | corrP1 | HELD ov | dP1 | lShare | peak | FAIR | ACT || ctx worst | ≤P5% |');
L.push('|---|---|---|--:|--:|--:|--:|--:|--:|:--:|:--:|--|---|--:|');
for (const r of rows) {
  const bandStr = r.band.map((v, i) => (r.band[i] == null ? '·' : pct(v))).join('/');
  L.push(`| ${r.V} | ${r.t} | ${bandStr} | ${r.pv == null ? '—' : r.pv.toFixed(2)} | ${r.corr == null ? '—' : r.corr.toFixed(2)} | ${r.held.toFixed(1)} | ${r.dp1.toFixed(1)} | ${pct(r.ls)} | ${r.peak.toFixed(3)} | ${r.fair ? '✅' : '❌'} | ${r.action ? '✅' : '❌'} || ${r.worst} | ${pct(r.p5rate)} |`);
}
L.push('');
for (const V of ['A', 'B']) {
  const vr = rows.filter((r) => r.V === V);
  const fairN = vr.filter((r) => r.fair).length, faN = vr.filter((r) => r.fair && r.action).length, natN = vr.filter((r) => r.natOk).length;
  const unfair = vr.filter((r) => !r.fair).map((r) => r.t + '(' + [!r.bandPass ? 'band' : '', (r.pv != null && r.pv < 0.05) ? 'holm' : '', (r.corr != null && r.corr > 0.15) ? 'corrP1' : ''].filter(Boolean).join('+') + ')');
  L.push(`## Variant ${V}: FAIR ${fairN}/10 · FAIR+ACTION ${faN}/10 · naturalness-ok ${natN}/10`);
  if (unfair.length) L.push('- unfair: ' + unfair.join(', ')); else L.push('- all 10 fair by the real definition');
}
writeFileSync(join(DIR, 'ANALYSIS.md'), L.join('\n'));
writeFileSync(join(DIR, 'analysis.json'), JSON.stringify(rows, null, 2));
console.log(L.join('\n'));
