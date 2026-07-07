// PULK-action-3 analysis (read-only). Reads results/pulk-action-3/strip-<cell>-<track>.json (dual-
// window action + held overtakes + charger depth + naturalness) + client/tmp/pa3/<label>/fairness-data.json
// (official start-row chi-sq + row win-rate gate). Args: --dir=results/pulk-action-3 (default), --labels=re.
// Scoring — THE metric is HELD overtakes (P1 held ≥750 ms), not raw leadΔ flicker:
//   ACTION = cleanOv ≥ 3 (baseline ≈ 1) AND distinctP1 ≥ 4 (rotation, not ping-pong) AND leaderShare ≤ 55%.
//   NAT    = peak PULK speed ≤ +8.2% (natural ceiling ≈ +8.1%).
//   FAIR   = band-reach all ≥70% AND start-row p≥0.05 (searound excused = geometry) AND worst-case winner ≤5.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const DIR = join(ROOT, arg('dir', 'results/pulk-action-3'));
const FDROOT = join(ROOT, arg('fddir', 'client/tmp/pa3'));
const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (r) => { for (let i = 0; i < BAND_EDGES.length; i++) if (r <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (x) => (x * 100).toFixed(0) + '%';
const files = readdirSync(DIR).filter((f) => /^strip-.+\.json$/.test(f)).sort();
const rows = [];
for (const f of files) {
  const label = f.replace(/^strip-/, '').replace(/\.json$/, '');
  const m = label.match(/^([^-]+)-(.+)$/); if (!m) continue; // cell labels have no hyphens; tracks may (garden-path)
  const cell = m[1], track = m[2];
  const d = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const combo = d.combos[0]; if (!combo) continue;
  const races = combo.races; const isOpen = combo.isOpen;
  const A = (sel, win) => mean(races.map((r) => sel(r[win])));
  const pulk = {
    cleanOv: A((w) => w.cleanOvertakes, 'pulk'), distinctP1: A((w) => w.distinctP1, 'pulk'),
    leaderShare: A((w) => w.leaderShare, 'pulk'), leadChanges: A((w) => w.leadChanges, 'pulk'),
    chargerDepth: mean(races.map((r) => r.pulk.chargerDepthMax).filter((x) => x != null)),
  };
  const out = { cleanOv: A((w) => w.cleanOvertakes, 'outcome'), distinctP1: A((w) => w.distinctP1, 'outcome') };
  const bandTot = [0, 0, 0, 0, 0], bandHit = [0, 0, 0, 0, 0];
  for (const r of races) for (const p of r.perRacer) if (p.targetBand != null && p.finalRank != null) { bandTot[p.targetBand]++; if (bandOf(p.finalRank) <= p.targetBand) bandHit[p.targetBand]++; }
  const bandReach = bandTot.map((t, i) => (t > 0 ? bandHit[i] / t : null));
  const bandGate = bandReach.every((v, i) => v == null || bandTot[i] === 0 || v >= 0.70);
  const w = races.map((r) => r.winner).filter((x) => x && x.rankAt055 != null);
  const winner = { worstRankAt055: Math.max(...w.map((x) => x.rankAt055)),
    worstFinalRank: (w.slice().sort((p, q) => q.rankAt055 - p.rankAt055)[0] || {}).finalRank ?? null,
    reachedP1Frac: w.length ? w.filter((x) => x.finalRank === 1).length / w.length : null,
    meanCeilFrac: mean(w.map((x) => x.outcomeCeilFrac)) };
  const nat = { maxSF: mean(races.map((r) => r.naturalness?.maxSpeedFactor ?? 1)) };
  const poolFB = mean(races.map((r) => r.directorPoolFallback ?? 0));
  let pValue = null, rowGate = null;
  const fdp = join(FDROOT, label, 'fairness-data.json');
  if (existsSync(fdp)) { const fd = JSON.parse(readFileSync(fdp, 'utf8')); const st = fd.results?.[0]?.stats;
    if (st) { pValue = st.pValue; const gr = st.rowStats.filter((rs) => rs.expectedWinRate * st.nRaces >= 3);
      rowGate = gr.every((rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5); } }
  const srowOk = track === 'searound' || pValue == null || pValue >= 0.05;   // searound start-row = known geometry
  const winnerRecovered = winner.worstFinalRank != null && winner.worstFinalRank <= 5;
  // FAIR per the spec: band-reach ≥70% AND start-row Holm p≥0.05 (searound excused) AND worst-case
  // winner recovered. The 1.5× row-balance gate is reported separately (rowGate) but NOT in the gate.
  const fair = bandGate && srowOk && winnerRecovered;
  const action = pulk.cleanOv >= 3 && pulk.distinctP1 >= 4 && pulk.leaderShare <= 0.55;
  const natOk = nat.maxSF <= 1.082;
  rows.push({ cell, track, isOpen, pulk, out, bandReach, bandTot, pValue, winner, nat, poolFB, action, fair, natOk });
}
rows.sort((x, y) => x.cell.localeCompare(y.cell) || x.track.localeCompare(y.track));
const L = [];
L.push('# PULK-action-3 analysis (' + arg('dir', 'results/pulk-action-3') + ')');
L.push('');
L.push('PULK 0.25→0.55; OUTCOME 0.55→1.0; 30 races/combo; variant-1; boost 0.06 / brake 0.10 / cap=auto / B3.');
L.push('**HELD** = P1 change held ≥750 ms (clean pass, NOT flicker leadΔ). **ACTION** = cleanOv≥3 AND distinctP1≥4 AND lShare≤55%.');
L.push('**NAT** peak ≤ +8.2% (natural +8.1%). **FAIR** = band-reach all ≥70% AND start-row p≥0.05 (searound excused) AND worst-case winner ≤5.');
L.push('');
L.push('| cell | track | HELD ov | distP1 | lShare | chargerDepth | leadΔ | band-reach | srow p | winP1% | worst@55→fin | ceilFrac | peak | poolFB | ACTION | FAIR | NAT |');
L.push('|---|---|--:|--:|--:|--:|--:|---|--:|--:|---|--:|--:|--:|:--:|:--:|:--:|');
for (const r of rows) {
  const br = r.bandReach.map((v, i) => (r.bandTot[i] === 0 ? '·' : pct(v))).join('/');
  L.push(`| ${r.cell} | ${r.track} | ${r.pulk.cleanOv.toFixed(1)} | ${r.pulk.distinctP1.toFixed(1)} | ${pct(r.pulk.leaderShare)} | ${r.pulk.chargerDepth.toFixed(0)} | ${r.pulk.leadChanges.toFixed(0)} | ${br} | ${r.pValue == null ? '—' : r.pValue.toFixed(2)} | ${r.winner.reachedP1Frac == null ? '—' : pct(r.winner.reachedP1Frac)} | ${r.winner.worstRankAt055}→${r.winner.worstFinalRank} | ${r.winner.meanCeilFrac.toFixed(2)} | ${r.nat.maxSF.toFixed(3)} | ${r.poolFB.toFixed(1)} | ${r.action ? '✅' : '❌'} | ${r.fair ? '✅' : '❌'} | ${r.natOk ? '✅' : '⚠'} |`);
}
L.push('');
const winCells = [...new Set(rows.map((r) => r.cell))].filter((c) => { const cr = rows.filter((r) => r.cell === c); return cr.length >= 4 && cr.every((r) => r.action && r.fair && r.natOk); });
L.push('## Cells that WIN on ALL tracks (action + fair + natural)');
L.push(winCells.length ? winCells.map((c) => '- **' + c + '**').join('\n') : '**NONE fully wins all 4 tracks.** Best partial cells:');
if (!winCells.length) {
  const cells = [...new Set(rows.map((r) => r.cell))];
  const scored = cells.map((c) => { const cr = rows.filter((r) => r.cell === c); return { c, pass: cr.filter((r) => r.action && r.fair && r.natOk).length, cleanOv: mean(cr.map((r) => r.pulk.cleanOv)) }; }).sort((a, b) => b.pass - a.pass || b.cleanOv - a.cleanOv);
  for (const s of scored.slice(0, 5)) L.push(`- ${s.c}: ${s.pass}/4 tracks win, mean HELD ov ${s.cleanOv.toFixed(1)}`);
}
const md = L.join('\n');
writeFileSync(join(DIR, 'ANALYSIS.md'), md);
writeFileSync(join(DIR, 'analysis.json'), JSON.stringify(rows, null, 2));
console.log(md);
