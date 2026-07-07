// PROBE-RECOVERY analysis (read-only). For each track, bin the assigned-winner's rank at 0.55 (OUTCOME
// start) and 0.50 (PULK end) and compute P(final ≤ P5 / ≤ P3 / = P1) + mean final per bin — the recovery
// curve. Derive gate thresholds: gate_high = highest rank still ≥90% recoverable (no boost needed);
// gate_low = rank where recovery drops below 50% (full boost). Also the natural landing distribution.
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'results', 'probe-recovery');
const BINS = [[1,5],[6,10],[11,15],[16,20],[21,30],[31,40],[41,50],[51,60]];
const mean = (a) => (a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0);
const pct = (x) => (x*100).toFixed(0)+'%';
const files = readdirSync(DIR).filter((f)=>/^strip-pr-.+\.json$/.test(f)).sort();
const out = [];
for (const f of files) {
  const track = f.replace('strip-pr-','').replace('.json','');
  const races = JSON.parse(readFileSync(join(DIR,f),'utf8')).combos[0].races;
  const W = races.map((r)=>r.winner).filter((w)=>w && w.rankAt055!=null && w.finalRank!=null);
  const curve = (key) => BINS.map(([lo,hi]) => {
    const g = W.filter((w)=>w[key]>=lo && w[key]<=hi);
    return { lo, hi, n: g.length,
      p5: g.length? g.filter((w)=>w.finalRank<=5).length/g.length : null,
      p3: g.length? g.filter((w)=>w.finalRank<=3).length/g.length : null,
      p1: g.length? g.filter((w)=>w.finalRank===1).length/g.length : null,
      meanFin: g.length? mean(g.map((w)=>w.finalRank)) : null };
  });
  const c55 = curve('rankAt055');
  // gate_high = highest bin-upper where P(≤5) ≥ 0.90 (contiguous from the front); gate_low = lower edge
  // of the first bin (going deeper) where P(≤5) < 0.50.
  let gateHigh = 0;
  for (const b of c55) { if (b.n>0 && b.p5!=null && b.p5>=0.90) gateHigh = b.hi; else if (b.n>0) break; }
  let gateLow = null;
  for (const b of c55) { if (b.n>0 && b.p5!=null && b.p5<0.50) { gateLow = b.lo; break; } }
  out.push({ track, nWinners: W.length,
    natMean055: mean(W.map((w)=>w.rankAt055)), natWorst055: Math.max(...W.map((w)=>w.rankAt055)),
    natMean050: mean(W.map((w)=>w.rankAt050)), finalMean: mean(W.map((w)=>w.finalRank)),
    p5overall: W.filter((w)=>w.finalRank<=5).length/W.length,
    curve55: c55, curve50: curve('rankAt050'), gateHigh, gateLow });
}
const L = [];
L.push('# PROBE-RECOVERY — winner recovery curves + derived gate thresholds');
L.push('');
L.push('Winning cell N8/D0.6, NO position-gate (raw OUTCOME recovery). 100 races/track. P(final≤P5) by winner rank at 0.55.');
L.push('gate_high = deepest rank still ≥90% recoverable (no boost → keep unpredictable); gate_low = rank where recovery <50% (full boost).');
L.push('');
for (const t of out) {
  L.push(`## ${t.track}  (${t.nWinners} winners)`);
  L.push(`Natural landing rank@0.55: mean ${t.natMean055.toFixed(1)}, worst ${t.natWorst055} · rank@0.50 mean ${t.natMean050.toFixed(1)} · overall P(≤P5) ${pct(t.p5overall)} · mean final ${t.finalMean.toFixed(1)}`);
  L.push('');
  L.push('| rank@0.55 bin | n | P(≤P5) | P(≤P3) | P(=P1) | mean final |');
  L.push('|---|--:|--:|--:|--:|--:|');
  for (const b of t.curve55) L.push(`| ${b.lo}–${b.hi} | ${b.n} | ${b.p5==null?'—':pct(b.p5)} | ${b.p3==null?'—':pct(b.p3)} | ${b.p1==null?'—':pct(b.p1)} | ${b.meanFin==null?'—':b.meanFin.toFixed(1)} |`);
  L.push('');
  L.push(`**Derived: gate_high = ${t.gateHigh} (≥90% recoverable up to here) · gate_low = ${t.gateLow ?? '(never <50% — recovers from everywhere)'}**`);
  L.push('');
}
// Global synthesis
L.push('## Global synthesis');
const unfair = out.filter((t)=>['searound','luger-hill','river-run'].includes(t.track));
const ctrl = out.find((t)=>t.track==='garden-path');
L.push(`- gate_high across the 3 unfair: ${unfair.map((t)=>t.track+'='+t.gateHigh).join(', ')}`);
L.push(`- gate_low across the 3 unfair: ${unfair.map((t)=>t.track+'='+(t.gateLow??'none')).join(', ')}`);
if (ctrl) L.push(`- fair control garden-path: gate_high=${ctrl.gateHigh}, gate_low=${ctrl.gateLow??'none (recovers from everywhere)'}, overall P(≤P5)=${pct(ctrl.p5overall)}`);
writeFileSync(join(DIR,'ANALYSIS.md'), L.join('\n'));
writeFileSync(join(DIR,'analysis.json'), JSON.stringify(out,null,2));
console.log(L.join('\n'));
