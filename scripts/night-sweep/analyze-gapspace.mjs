// ============================================================
// analyze-gapspace.mjs — aggregate the frozen NIGHT-SWEEP gap-space cells into RAW percentile
// distributions. READ-ONLY. Reports distributions ONLY — no gates, no pass/fail, no tuning.
// The proposed X/Y/Z thresholds are echoed for context but never applied as a verdict.
//
// Input : scripts/night-sweep/results/gap-space/{gm,hm}-ns2-<arm>-<track>.json
// Output: console tables + results/gap-space/summary.json
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { percentile, PROPOSED_THRESHOLDS } from '../sim/observers/gap-metrics.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dir, 'results', 'gap-space');
const ARMS = ['A', 'B', 'C'];
const ARM_DESC = {
  A: 'v4-OFF reactive director (SHIPPED default)',
  B: 'v4-ON shipped defaults (int 0.6, strict 0.5)',
  C: 'v4-ON owner settings (int 0.9, strict 0.8)',
};
const TRACKS = [
  { t: 'searound', open: false }, { t: 'dirt-oval', open: false },
  { t: 'mountainstreet', open: true }, { t: 'luger-hill', open: true },
];
const CPS = [0.25, 0.5, 0.75, 0.9];
const pctl = (a) => ({ p10: +percentile(a, 0.1).toFixed(3), p25: +percentile(a, 0.25).toFixed(3),
  p50: +percentile(a, 0.5).toFixed(3), p75: +percentile(a, 0.75).toFixed(3), p90: +percentile(a, 0.9).toFixed(3),
  max: a.length ? +Math.max(...a).toFixed(3) : NaN });
const fmt = (o) => `p10=${o.p10} p25=${o.p25} p50=${o.p50} p75=${o.p75} p90=${o.p90} max=${o.max}`;

const summary = { meta: { note: 'RAW gap-space distributions. NO gates. X/Y/Z await owner calibration.', proposedThresholds: PROPOSED_THRESHOLDS }, cells: {} };

for (const arm of ARMS) {
  console.log(`\n${'═'.repeat(92)}\n  ARM ${arm} — ${ARM_DESC[arm]}\n${'═'.repeat(92)}`);
  for (const tk of TRACKS) {
    const label = `ns2-${arm}-${tk.t}`;
    const gmPath = join(DIR, `gm-${label}.json`);
    const hmPath = join(DIR, `hm-${label}.json`);
    if (!existsSync(gmPath) || !existsSync(hmPath)) { console.log(`  ${label}: MISSING (skipped)`); continue; }
    const gm = JSON.parse(readFileSync(gmPath, 'utf8'));
    const hm = JSON.parse(readFileSync(hmPath, 'utf8'));
    const races = gm.races.map((r) => r.gapMetrics);
    const N = races.length;

    // At-the-line, per race.
    const lineP1P2 = races.map((r) => r.leaderGapToP2LineSec);
    const lineTop5 = races.map((r) => r.top5SpreadLineSec);
    const lineFieldSpread = races.map((r) => {
      const fb = r.perRacer.map((p) => p.finalBehindSec).filter((x) => x != null);
      return percentile(fb, 0.9) - percentile(fb, 0.1);
    });
    const deadFrac = races.map((r) => r.deadRaceFinalThirdOverFrac);
    const deadFlagCount = races.filter((r) => r.deadRaceFlag).length;

    // Checkpoints: per cp progress, arrays across races.
    const cpAgg = {};
    for (const cp of CPS) {
      const rows = races.map((r) => r.checkpoints.find((c) => c.progress === cp)).filter(Boolean);
      cpAgg[cp] = {
        leaderGapToP2: pctl(rows.map((c) => c.leaderGapToP2)),
        top5Spread: pctl(rows.map((c) => c.top5Spread)),
        fieldMedianBehind: pctl(rows.map((c) => c.fieldMedianBehind)),
        fieldSpreadP10P90: pctl(rows.map((c) => c.fieldSpreadP10P90)),
      };
    }

    // Per-racer pooled (N×40).
    const allPer = races.flatMap((r) => r.perRacer);
    const inCont = pctl(allPer.map((p) => p.inContentionFraction));
    const maxBehind = pctl(allPer.map((p) => p.maxBehindAfterChaosSec));
    const finalBehind = pctl(allPer.map((p) => p.finalBehindSec).filter((x) => x != null));
    const visibleComebacks = allPer.filter((p) => p.visibleComeback).length;

    const fair = hm.fairness.bandReach != null && hm.fairness.bandReach >= 0.70 && hm.fairness.startRowUnfair === false;

    console.log(`\n  ── ${tk.t} (${tk.open ? 'open' : 'closed'}) ──  N=${N}  band=${(hm.fairness.bandReach * 100).toFixed(1)}%  startRowUnfair=${hm.fairness.startRowUnfair}  → context: ${fair ? 'FAIR' : 'not-fair'}`);
    console.log(`     seconds-behind-leader over time (field MEDIAN):`);
    for (const cp of CPS) console.log(`        @${cp}: median=${fmt(cpAgg[cp].fieldMedianBehind)}`);
    console.log(`     leader→P2 gap over time:`);
    for (const cp of CPS) console.log(`        @${cp}: ${fmt(cpAgg[cp].leaderGapToP2)}`);
    console.log(`     AT THE LINE: leader→P2 ${fmt(pctl(lineP1P2))}`);
    console.log(`                  top5spread ${fmt(pctl(lineTop5))}`);
    console.log(`                  fieldSpread(p90-p10) ${fmt(pctl(lineFieldSpread))}`);
    console.log(`     deadRace final-third over-fraction (raw): ${fmt(pctl(deadFrac))}  | deadFlag(prov X/Y/Z): ${deadFlagCount}/${N} races`);
    console.log(`     inContentionFraction (per racer, prov X=${PROPOSED_THRESHOLDS.inContentionSec}s): ${fmt(inCont)}`);
    console.log(`     maxBehindAfterChaos (per racer): ${fmt(maxBehind)}   finalBehind (per racer): ${fmt(finalBehind)}`);
    console.log(`     visibleComebacks (prov Y/Z): ${visibleComebacks} of ${allPer.length} racer-slots`);

    summary.cells[label] = { arm, track: tk.t, open: tk.open, N,
      fairness: hm.fairness, world: hm.meta.world, fairContext: fair,
      checkpoints: cpAgg,
      line: { leaderGapToP2: pctl(lineP1P2), top5Spread: pctl(lineTop5), fieldSpreadP10P90: pctl(lineFieldSpread) },
      deadRaceOverFrac: pctl(deadFrac), deadFlagCount,
      inContentionFraction: inCont, maxBehindAfterChaos: maxBehind, finalBehind, visibleComebacks,
      racerSlots: allPer.length };
  }
}

// Q5: a "fair AND dead" concrete race — a race inside a FAIR cell with the highest deadRace over-fraction.
console.log(`\n${'═'.repeat(92)}\n  Q5 — "fair AND visibly dead" — per arm, the worst race inside a FAIR cell\n${'═'.repeat(92)}`);
summary.fairAndDead = {};
for (const arm of ARMS) {
  let worst = null;
  for (const tk of TRACKS) {
    const label = `ns2-${arm}-${tk.t}`;
    const c = summary.cells[label];
    if (!c || !c.fairContext) continue;
    const gm = JSON.parse(readFileSync(join(DIR, `gm-${label}.json`), 'utf8'));
    gm.races.forEach((r, idx) => {
      const g = r.gapMetrics;
      if (!worst || g.deadRaceFinalThirdOverFrac > worst.deadFrac)
        worst = { label, track: tk.t, raceIdx: idx, deadFrac: g.deadRaceFinalThirdOverFrac,
          deadFlag: g.deadRaceFlag, lineP1P2: g.leaderGapToP2LineSec, lineTop5: g.top5SpreadLineSec,
          bandReach: c.fairness.bandReach };
    });
  }
  summary.fairAndDead[arm] = worst;
  if (worst) console.log(`  ARM ${arm}: ${worst.label} race#${worst.raceIdx} — band=${(worst.bandReach * 100).toFixed(1)}% (FAIR) yet deadFrac=${(worst.deadFrac * 100).toFixed(0)}% flag=${worst.deadFlag} line[P1→P2=${worst.lineP1P2}s top5=${worst.lineTop5}s]`);
  else console.log(`  ARM ${arm}: no FAIR cell — cannot show fair-and-dead`);
}

writeFileSync(join(DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n→ ${join(DIR, 'summary.json')}`);
