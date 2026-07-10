// ============================================================
// analyze-gapspace-lengths.mjs — aggregate the re-run gap-space cells in RACER LENGTHS (primary).
// READ-ONLY. RAW distributions only — no gates, no pass/fail, no tuning. Seconds kept as a secondary
// column. Also emits the FRONTMOST-GAP (lead-group detach) distributions and the measured
// lengths-per-second relationship per track (so the two units are connected by data, not a guess).
//
// Input : scripts/night-sweep/results/gap-space/{gm,hm}-ns2-<arm>-<track>.json
// Output: console tables + results/gap-space/summary-lengths.json
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
const pctl = (a) => ({ p10: +percentile(a, 0.1).toFixed(2), p25: +percentile(a, 0.25).toFixed(2),
  p50: +percentile(a, 0.5).toFixed(2), p75: +percentile(a, 0.75).toFixed(2), p90: +percentile(a, 0.9).toFixed(2),
  max: a.length ? +Math.max(...a).toFixed(2) : NaN });
const fmt = (o) => `p10=${o.p10} p25=${o.p25} p50=${o.p50} p75=${o.p75} p90=${o.p90} max=${o.max}`;
const cpOf = (race, cp) => race.checkpoints.find((c) => c.progress === cp);

const summary = { meta: { unit: 'RACER LENGTHS (primary); seconds secondary', note: 'RAW. NO gates. X/Y/Z await owner calibration.', proposedThresholds: PROPOSED_THRESHOLDS }, cells: {}, lengthsPerSecondByTrack: {} };
const lpsByTrack = {}; // track -> [lengths/sec samples]

for (const arm of ARMS) {
  console.log(`\n${'═'.repeat(96)}\n  ARM ${arm} — ${ARM_DESC[arm]}   [RACER LENGTHS]\n${'═'.repeat(96)}`);
  for (const tk of TRACKS) {
    const label = `ns2-${arm}-${tk.t}`;
    const gmPath = join(DIR, `gm-${label}.json`);
    const hmPath = join(DIR, `hm-${label}.json`);
    if (!existsSync(gmPath) || !existsSync(hmPath)) { console.log(`  ${label}: MISSING`); continue; }
    const races = JSON.parse(readFileSync(gmPath, 'utf8')).races.map((r) => r.gapMetrics);
    const hm = JSON.parse(readFileSync(hmPath, 'utf8'));
    const N = races.length;
    const lenScale = races[0]?.lenScale, meanBody = races[0]?.meanBodyLenPx, pathPx = races[0]?.pathLengthPx;

    // Checkpoints (lengths), per cp across races.
    const cpAgg = {};
    for (const cp of CPS) {
      const rows = races.map((r) => cpOf(r, cp)).filter(Boolean);
      cpAgg[cp] = {
        fieldMedianBehindLen: pctl(rows.map((c) => c.fieldMedianBehindLen)),
        leaderGapToP2Len: pctl(rows.map((c) => c.leaderGapToP2Len)),
        frontmostGapLen: pctl(rows.map((c) => c.frontmostGapLen)),
        nAheadMedian: +percentile(rows.map((c) => c.frontmostGapNAhead), 0.5).toFixed(1),
      };
      // lengths-per-second samples (leader→P2 len / sec, where sec>0) → the unit bridge.
      for (const c of rows) if (c.leaderGapToP2Sec > 0.05) (lpsByTrack[tk.t] ??= []).push(c.leaderGapToP2Len / c.leaderGapToP2Sec);
    }

    // At the line (lengths, at leader-finish instant).
    const lineP2 = pctl(races.map((r) => r.leaderGapToP2LineLen).filter((x) => x != null));
    const lineTop5 = pctl(races.map((r) => r.top5SpreadLineLen).filter((x) => x != null));
    const lineFieldSpread = pctl(races.map((r) => r.fieldSpreadP10P90LineLen).filter((x) => x != null));
    const lineFront = pctl(races.map((r) => r.frontmostGapLineLen).filter((x) => x != null));
    const lineFrontNAhead = +percentile(races.map((r) => r.frontmostGapLineNAhead).filter((x) => x != null), 0.5).toFixed(1);

    // Final-third distributions.
    const deadOver = pctl(races.map((r) => r.deadRaceFinalThirdOverFrac));
    const deadFlag = races.filter((r) => r.deadRaceFlag).length;
    const deadP90 = pctl(races.map((r) => r.deadRaceFinalThird?.p90 ?? 0));
    const frontP50 = pctl(races.map((r) => r.frontGapFinalThird?.p50 ?? 0));
    const frontP90 = pctl(races.map((r) => r.frontGapFinalThird?.p90 ?? 0));
    const frontFracOver3 = pctl(races.map((r) => r.frontGapFinalThird?.fracOver3 ?? 0));

    // Per-racer (lengths).
    const allPer = races.flatMap((r) => r.perRacer);
    const inCont = pctl(allPer.map((p) => p.inContentionFraction));
    const maxBehind = pctl(allPer.map((p) => p.maxBehindAfterChaosLen));
    const finalBehind = pctl(allPer.map((p) => p.finalBehindLen).filter((x) => x != null));
    const comebacks = allPer.filter((p) => p.visibleComeback).length;
    const fair = hm.fairness.bandReach >= 0.70 && hm.fairness.startRowUnfair === false;

    console.log(`\n  ── ${tk.t} (${tk.open ? 'open' : 'closed'}) ──  N=${N}  band=${(hm.fairness.bandReach * 100).toFixed(1)}% startRowUnfair=${hm.fairness.startRowUnfair} → ${fair ? 'FAIR' : 'not-fair'}   [lenScale=${lenScale} meanBody=${meanBody}px path=${pathPx}px]`);
    console.log(`     field MEDIAN lengths-behind over time:`);
    for (const cp of CPS) console.log(`        @${cp}: ${fmt(cpAgg[cp].fieldMedianBehindLen)}`);
    console.log(`     leader→P2 (lengths) over time:`);
    for (const cp of CPS) console.log(`        @${cp}: ${fmt(cpAgg[cp].leaderGapToP2Len)}`);
    console.log(`     FRONTMOST gap (lengths) over time  [median racers ahead]:`);
    for (const cp of CPS) console.log(`        @${cp}: ${fmt(cpAgg[cp].frontmostGapLen)}  [${cpAgg[cp].nAheadMedian} ahead]`);
    console.log(`     AT THE LINE (lengths): leader→P2 ${fmt(lineP2)}`);
    console.log(`                            top5spread ${fmt(lineTop5)}`);
    console.log(`                            fieldSpread ${fmt(lineFieldSpread)}`);
    console.log(`                            frontmost ${fmt(lineFront)}  [${lineFrontNAhead} ahead]`);
    console.log(`     FINAL-THIRD leader→P2 over-frac(>${PROPOSED_THRESHOLDS.deadRaceGapLen}L): ${fmt(deadOver)} | deadFlag(prov): ${deadFlag}/${N}`);
    console.log(`     FINAL-THIRD frontmost-gap p50 ${fmt(frontP50)} | p90 ${fmt(frontP90)} | frac time >3L ${fmt(frontFracOver3)}`);
    console.log(`     inContention p50(X=${PROPOSED_THRESHOLDS.inContentionLen}L): ${fmt(inCont)} | maxBehind ${fmt(maxBehind)} | finalBehind ${fmt(finalBehind)} | comebacks ${comebacks}/${allPer.length}`);

    summary.cells[label] = { arm, track: tk.t, open: tk.open, N, fairness: hm.fairness, world: hm.meta.world, fairContext: fair,
      lenScale, meanBodyLenPx: meanBody, pathLengthPx: pathPx,
      checkpoints: cpAgg,
      line: { leaderGapToP2: lineP2, top5Spread: lineTop5, fieldSpread: lineFieldSpread, frontmost: lineFront, frontmostNAhead: lineFrontNAhead },
      deadRaceOverFrac: deadOver, deadFlagCount: deadFlag, deadRaceP90: deadP90,
      frontGapFinalThird: { p50: frontP50, p90: frontP90, fracOver3: frontFracOver3 },
      inContentionFraction: inCont, maxBehindAfterChaos: maxBehind, finalBehind, visibleComebacks: comebacks, racerSlots: allPer.length };
  }
}

// Lengths-per-second per track — the bridge that tells us what the old seconds meant.
console.log(`\n${'═'.repeat(96)}\n  LENGTHS-PER-SECOND per track (leader→P2 len / sec, pooled over arms & checkpoints)\n${'═'.repeat(96)}`);
for (const tk of TRACKS) {
  const s = lpsByTrack[tk.t] ?? [];
  const q = pctl(s);
  summary.lengthsPerSecondByTrack[tk.t] = { ...q, n: s.length };
  console.log(`  ${tk.t.padEnd(16)} (${tk.open ? 'open' : 'closed'})  lengths/sec ${fmt(q)}  (n=${s.length})`);
}

// Q5 — fair AND visibly dead, in lengths.
console.log(`\n${'═'.repeat(96)}\n  Q5 — "fair AND visibly dead" (lengths) — worst race inside a FAIR cell, per arm\n${'═'.repeat(96)}`);
summary.fairAndDead = {};
for (const arm of ARMS) {
  let worst = null;
  for (const tk of TRACKS) {
    const label = `ns2-${arm}-${tk.t}`; const c = summary.cells[label];
    if (!c || !c.fairContext) continue;
    JSON.parse(readFileSync(join(DIR, `gm-${label}.json`), 'utf8')).races.forEach((r, idx) => {
      const g = r.gapMetrics;
      if (!worst || g.deadRaceFinalThirdOverFrac > worst.deadFrac)
        worst = { label, raceIdx: idx, deadFrac: g.deadRaceFinalThirdOverFrac, deadFlag: g.deadRaceFlag,
          lineP2Len: g.leaderGapToP2LineLen, frontLen: g.frontmostGapLineLen, nAhead: g.frontmostGapLineNAhead,
          lineP2Sec: g.leaderGapToP2LineSec, bandReach: c.fairness.bandReach };
    });
  }
  summary.fairAndDead[arm] = worst;
  if (worst) console.log(`  ARM ${arm}: ${worst.label} race#${worst.raceIdx} — band=${(worst.bandReach * 100).toFixed(1)}% (FAIR) deadFrac=${(worst.deadFrac * 100).toFixed(0)}% flag=${worst.deadFlag} line[P1→P2=${worst.lineP2Len}L front=${worst.frontLen}L/${worst.nAhead}ahead | ${worst.lineP2Sec}s]`);
}

// Concrete anchor: Arm C · mountainstreet · race #26 — 3.06 s clear → how many lengths?
const cLabel = 'ns2-C-mountainstreet';
if (existsSync(join(DIR, `gm-${cLabel}.json`))) {
  const r26 = JSON.parse(readFileSync(join(DIR, `gm-${cLabel}.json`), 'utf8')).races[26].gapMetrics;
  const lps = summary.lengthsPerSecondByTrack['mountainstreet']?.p50 ?? null;
  summary.anchorC_mtn_race26 = { leaderGapToP2LineLen: r26.leaderGapToP2LineLen, leaderGapToP2LineSec: r26.leaderGapToP2LineSec,
    frontmostGapLineLen: r26.frontmostGapLineLen, frontmostGapLineNAhead: r26.frontmostGapLineNAhead,
    finishTimeGapSec_old: 3.056, lengthsPerSec_p50: lps, converted_3_06s_in_lengths: lps != null ? +(3.056 * lps).toFixed(1) : null };
  console.log(`\n  ANCHOR — Arm C · mountainstreet · race#26 (the "fair AND dead" race):`);
  console.log(`     spatial leader→P2 at the line = ${r26.leaderGapToP2LineLen} lengths (front gap ${r26.frontmostGapLineLen}L, ${r26.frontmostGapLineNAhead} ahead)`);
  console.log(`     the 3.06 s finish-time gap ≈ ${lps != null ? (3.056 * lps).toFixed(1) : '?'} racer lengths (track median ${lps} lengths/s)`);
}

writeFileSync(join(DIR, 'summary-lengths.json'), JSON.stringify(summary, null, 2));
console.log(`\n→ ${join(DIR, 'summary-lengths.json')}`);
