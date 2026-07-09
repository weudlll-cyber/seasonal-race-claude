// Analyze PRE-STAGE-1 checkpoint JSONL → per-track × arm tables. Read-only.
// Usage: node scripts/night-sweep/analyze-prestage1.mjs <phaseA.jsonl|phaseB.jsonl>
import { readFileSync } from 'fs';
const path = process.argv[2] || 'scripts/night-sweep/results/prestage1/phaseA.jsonl';
const rows = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.error);
const TRACKS = ['mountainstreet', 'luger-hill', 'searound', 'dirt-oval'];
const OPEN = { mountainstreet: 'OPEN', 'luger-hill': 'OPEN', searound: 'CLOSED', 'dirt-oval': 'CLOSED' };
const isPhaseB = rows.some((r) => r.strict != null);
const key = (r) => isPhaseB ? `${r.arm}|st${r.strict}|q2${r.q2}` : r.arm;
const groups = [...new Set(rows.map(key))].sort();
const f = (v, d = 3) => (v == null ? ' -- ' : (+v).toFixed(d));
const pct = (v) => (v == null ? ' -- ' : (v * 100).toFixed(1) + '%');

function line(cols, w) { return cols.map((c, i) => String(c).padEnd(w[i])).join(' '); }
const W = [22, 8, 8, 8, 8, 8, 8, 9, 8, 9, 10, 8, 8, 9];
const HEAD = ['cell', 'bandR', 'B1', 'B2', 'B3', 'B4(tail)', 'anchor', 'final', 'net', 'real', 'rePass', 'reachF', 'traffic', 'winP'];

for (const trk of TRACKS) {
  console.log(`\n### ${trk} (${OPEN[trk]})`);
  console.log(line(HEAD, W));
  console.log(line(HEAD.map(() => '------'), W));
  for (const g of groups) {
    const r = rows.find((x) => x.track === trk && key(x) === g);
    if (!r) continue;
    const a = r.agg, fa = r.fairness, pb = fa.bandReachPerBand || {};
    console.log(line([g, pct(fa.bandReach), pct(pb.B1), pct(pb.B2), pct(pb.B3), pct(pb.B4),
      f(a.anchorRankMean, 1), f(a.finalRankMean, 1), f(a.placesGainedMean, 1), f(a.realOvertakesMean, 1),
      f(a.rePassesMean, 1), pct(a.reachedFrontRate), f(a.trafficFracMean), f(fa.nativeWinChiSqP) + (fa.nativeWinUnfair ? '*' : '')], W));
  }
}

// Headwind / closing-speed detail
console.log('\n### Headwind + closing-speed (choreo window + front)');
const W2 = [22, 12, 12, 12, 12, 12, 12];
const H2 = ['cell', 'closeFront', 'close-B1', 'close-B4', 'packOverHero', 'servoComp', 'traffic'];
for (const trk of TRACKS) {
  console.log(`\n${trk} (${OPEN[trk]})`);
  console.log(line(H2, W2));
  for (const g of groups) {
    const r = rows.find((x) => x.track === trk && key(x) === g);
    if (!r) continue;
    const a = r.agg, cb = a.closingSpeedByBandMean || {};
    console.log(line([g, f(a.closingSpeedFrontMean), f(cb.B1), f(cb.B4), f(a.choPackOverHeroMean), f(a.servoCompFracMean), f(a.trafficFracMean)], W2));
  }
}

// Arm means across the 4 tracks (Phase A summary)
if (!isPhaseB) {
  console.log('\n### ARM MEANS across 4 tracks');
  const W3 = [6, 9, 9, 9, 9, 9, 9, 10, 10, 9];
  const H3 = ['arm', 'bandR', 'B4tail', 'anchor', 'net', 'reachF', 'rePass', 'packOvH', 'servoComp', 'traffic'];
  console.log(line(H3, W3));
  for (const arm of ['A1', 'A2', 'A3']) {
    const rs = rows.filter((x) => x.arm === arm);
    const m = (sel) => { const vs = rs.map(sel).filter((v) => v != null && isFinite(v)); return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null; };
    console.log(line([arm, pct(m((r) => r.fairness.bandReach)), pct(m((r) => r.fairness.bandReachPerBand?.B4)),
      f(m((r) => r.agg.anchorRankMean), 1), f(m((r) => r.agg.placesGainedMean), 1), pct(m((r) => r.agg.reachedFrontRate)),
      f(m((r) => r.agg.rePassesMean), 1), f(m((r) => r.agg.choPackOverHeroMean)), f(m((r) => r.agg.servoCompFracMean)), f(m((r) => r.agg.trafficFracMean))], W3));
  }
}
