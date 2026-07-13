// Post-process the overnight PulkLeadRotation sweep into the morning table.
// Reads (per track, per config A0/D2/D8):
//   results/sweep-pulklr/<cfg>__<track>/hero-map.json   → fairness { bandReach, startRowUnfair, startRowMinPHolm }
//   results/action-metrics/am-<cfg>__<track>.json       → per-race action metrics (pooled across durations)
// Emits: a per-track markdown table + PASS/FAIL vs A0 + a JSON summary. READ-ONLY; writes to results/ only.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const OUTROOT = join(ROOT, 'results', 'sweep-pulklr');
const AMDIR = join(ROOT, 'results', 'action-metrics');

const TRACKS = [
  ['city-circuit', 'motorbike'], ['dirt-oval', 'horse'], ['garden-path', 'snail'],
  ['ice-track', 'snowmobile'], ['luger-hill', 'luge'], ['mountainstreet', 'boarder'],
  ['river-run', 'duck'], ['searound', 'manta'], ['seatrack', 'dolphin'], ['space-sprint', 'rocket'],
];
const BORDERLINE = new Set(['searound', 'luger-hill']);
const CONFIGS = ['A0', 'D2', 'D8'];
const BAND_REACH_GATE = 0.70;

const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
};
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
const f1 = (x) => (x == null ? 'n/a' : x.toFixed(1));
const f2 = (x) => (x == null ? 'n/a' : x.toFixed(2));

function readFairness(cfg, track) {
  const p = join(OUTROOT, `${cfg}__${track}`, 'hero-map.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')).fairness ?? null; } catch { return null; }
}
function readAction(cfg, track) {
  const p = join(AMDIR, `am-${cfg}__${track}.json`);
  if (!existsSync(p)) return null;
  try {
    const d = JSON.parse(readFileSync(p, 'utf8'));
    const races = (d.combos ?? []).flatMap((c) => c.races ?? []); // pool across durations (borderline)
    const pick = (k) => races.map((r) => r[k]).filter((x) => x != null && Number.isFinite(x));
    const stat = (k) => { const a = pick(k); return { mean: mean(a), p10: pct(a, 0.1), p90: pct(a, 0.9), n: a.length }; };
    return {
      nRaces: races.length,
      leadChanges: stat('leadChangesPulk'),
      distinctP1: stat('distinctP1Pulk'),
      held: stat('heldTop5Overtakes'),
      endFullSpread: stat('endFullSpreadLen'),
      endP10P90: stat('endSpreadP10P90Len'),
    };
  } catch { return null; }
}

const cell = (s) => (s ? `${f1(s.mean)} [${f1(s.p10)}–${f1(s.p90)}]` : 'n/a');
const summary = { generatedFor: 'PulkLeadRotation overnight sweep', gate: { bandReach: BAND_REACH_GATE, holm: '0 NEW unfair vs A0' }, tracks: {} };
const lines = [];

for (const [track, racer] of TRACKS) {
  const rows = {};
  for (const cfg of CONFIGS) { rows[cfg] = { fair: readFairness(cfg, track), act: readAction(cfg, track) }; }
  const a0Unfair = rows.A0.fair?.startRowUnfair === true;

  lines.push(`\n### ${track}  (racer: ${racer}${BORDERLINE.has(track) ? ', BORDERLINE — 3-duration' : ''})`);
  lines.push('| cfg | band-reach | Holm start-row | lead-changes | distinct-P1 | held-ovt | spread L2last (L) | spread p10–p90 (L) | seeds |');
  lines.push('|-----|-----------|----------------|--------------|-------------|----------|-------------------|--------------------|-------|');
  const tsum = {};
  for (const cfg of CONFIGS) {
    const { fair, act } = rows[cfg];
    const br = fair?.bandReach;
    const holm = fair ? (fair.startRowUnfair === true ? `UNFAIR (pHolm ${f2(fair.startRowMinPHolm)})` : `fair (pHolm ${f2(fair.startRowMinPHolm)})`) : 'n/a';
    lines.push(`| ${cfg} | ${br == null ? 'n/a' : (br * 100).toFixed(1) + '%'} | ${holm} | ${cell(act?.leadChanges)} | ${cell(act?.distinctP1)} | ${cell(act?.held)} | ${cell(act?.endFullSpread)} | ${cell(act?.endP10P90)} | ${act?.nRaces ?? 'n/a'} |`);
    tsum[cfg] = { bandReach: br, startRowUnfair: fair?.startRowUnfair ?? null, startRowMinPHolm: fair?.startRowMinPHolm ?? null, action: act };
  }
  // PASS/FAIL vs A0 for D2 and D8.
  const verdicts = {};
  for (const cfg of ['D2', 'D8']) {
    const br = rows[cfg].fair?.bandReach;
    const dUnfair = rows[cfg].fair?.startRowUnfair === true;
    const brPass = br != null && br >= BAND_REACH_GATE;
    const holmPass = !dUnfair || a0Unfair; // unfair allowed only if pre-existing in A0
    const newUnfair = dUnfair && !a0Unfair;
    verdicts[cfg] = {
      pass: brPass && holmPass,
      bandReachPass: brPass,
      holmPass,
      newUnfair,
      note: `band-reach ${br == null ? 'n/a' : (br * 100).toFixed(1) + '%'} ${brPass ? '≥70✓' : '<70✗'}; ` +
            `Holm ${dUnfair ? (a0Unfair ? 'unfair but PRE-EXISTING (A0 also unfair)' : 'NEW UNFAIR ✗') : 'fair ✓'}`,
    };
  }
  lines.push(`- **D2:** ${verdicts.D2.pass ? 'PASS' : 'FAIL'} — ${verdicts.D2.note}`);
  lines.push(`- **D8:** ${verdicts.D8.pass ? 'PASS' : 'FAIL'} — ${verdicts.D8.note}`);
  // Data-driven action read (NOT a fun verdict) at D2 and D8.
  for (const cfg of ['D2', 'D8']) {
    const a = rows[cfg].act;
    if (a) {
      const carousel = a.distinctP1.mean != null && a.leadChanges.mean != null && a.leadChanges.mean > 0
        ? (a.distinctP1.mean / Math.max(1, a.leadChanges.mean)) : null;
      lines.push(`- ${cfg} read: distinct-P1 ${f1(a.distinctP1.mean)} on ${f1(a.leadChanges.mean)} lead-changes ` +
        `(${carousel != null && carousel >= 0.8 ? 'rotation' : 'carousel-leaning'}); held-overtakes ${f1(a.held.mean)}; ` +
        `field to ${f1(a.endFullSpread.mean)} L leader→last (p10–p90 ${f1(a.endP10P90.mean)} L) at PULK end.`);
    }
  }
  summary.tracks[track] = { racer, borderline: BORDERLINE.has(track), a0Unfair, configs: tsum, verdicts };
}

const header = `# PulkLeadRotation Overnight Sweep — post-processed ${'' /* date stamped by caller */}`;
const body = header + '\n' + lines.join('\n') + '\n';
writeFileSync(join(OUTROOT, 'TABLE.md'), body);
writeFileSync(join(OUTROOT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(body);
console.log('\nWrote results/sweep-pulklr/TABLE.md + summary.json');
