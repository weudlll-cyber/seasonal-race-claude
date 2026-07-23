// ============================================================
// exp-escape-episodes-report.mjs — PART 2: late-escaper analysis (report-only).
//
// READ-ONLY post-analysis over the escape-latency records the strength sweep already wrote. Runs no
// races and spawns no sim. Classifies every leader-escape episode and, for the uncorrected ones,
// separates the STRUCTURAL cause (no gap-correctable scheduled roll remained) from everything else.
//
// It also derives, from the SCHEDULE MATH ALONE (no runs), where the last gap-correctable roll sits
// and how that window scales with race duration — the "structural gap" question.
//
// Usage: node scripts/exp-escape-episodes-report.mjs [--store=client/tmp/exp-screen-strength]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { summarizeEpisodes } from './sim/observers/escape-episodes.mjs';
import { DEFAULT_RACE_DYNAMICS_CONFIG as DYN } from '../client/src/modules/storage/defaults.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const STORE = (() => { const r = argVal('store', 'client/tmp/exp-screen-strength'); return isAbsolute(r) ? r : join(ROOT, r); })();
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/screen-strength'); return isAbsolute(r) ? r : join(ROOT, r); })();

const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const r3 = (x) => (x == null ? 'n/a' : (+Number(x).toFixed(3)).toString());

// ── Load every stored run: dir name is "<arm>-<track>" ───────────────────────────────────────────
const runs = [];
for (const d of readdirSync(STORE)) {
  const p = join(STORE, d, 'escape-latency.json');
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const m = d.match(/^(.+?)-(searound|city-circuit|mountainstreet|dirt-oval|luger-hill)$/);
  runs.push({ dir: d, arm: m ? m[1] : d, track: m ? m[2] : '?', races: j.races.map((r) => r.escapeLatency), meta: j.meta });
}
if (!runs.length) { console.error(`No escape-latency records under ${STORE}`); process.exit(1); }

const byArm = new Map();
for (const r of runs) { if (!byArm.has(r.arm)) byArm.set(r.arm, []); byArm.get(r.arm).push(r); }

// ── Schedule math (no runs): where does the last gap-correctable roll sit? ───────────────────────
// rollCount = max(2, floor(D / reRollIntervalDivisor));  rollInterval = (lastPos% * D) / rollCount
// The transform additionally refuses to act once elapsed > lastRollDeadline - reRollTransitionDuration,
// which removes the FINAL roll entirely — costing a whole interval, not just the 3 s.
function scheduleMath(realizedSec) {
  const rollCount = Math.max(2, Math.floor(realizedSec / DYN.reRollIntervalDivisor));
  const interval = ((DYN.reRollLastPositionPercent / 100) * realizedSec) / rollCount;
  const lastRoll = rollCount * interval;
  const windowEnd = (DYN.reRollLastPositionPercent / 100) * realizedSec - DYN.reRollTransitionDuration;
  const lastCorrectable = Math.floor(windowEnd / interval) * interval;
  return {
    realizedSec, rollCount, interval, lastRoll, windowEnd, lastCorrectable,
    runoutSec: realizedSec - lastCorrectable,
    runoutFrac: (realizedSec - lastCorrectable) / realizedSec,
    lastCorrectableP: lastCorrectable / realizedSec,
  };
}
const DURATIONS = [30, 60, 89, 120, 300];

// ── Aggregate ───────────────────────────────────────────────────────────────────────────────────
const armRows = [];
for (const [arm, rs] of byArm) {
  const all = rs.flatMap((r) => r.races);
  armRows.push({ arm, track: 'ALL', ...summarizeEpisodes(all) });
  for (const r of rs) armRows.push({ arm, track: r.track, ...summarizeEpisodes(r.races) });
}
armRows.sort((a, b) => a.arm.localeCompare(b.arm) || (a.track === 'ALL' ? -1 : 1));

// Per-episode dump for the record
const epRows = [];
for (const r of runs) {
  r.races.forEach((race, i) => {
    for (const e of race.episodes ?? []) {
      epRows.push({
        arm: r.arm, track: r.track, raceIdx: i,
        startP: e.startP, endP: e.endP, durationMs: e.durationMs, peakGapLen: e.peakGapLen,
        resolved: e.resolved ? 1 : 0, corrected: e.corrected ? 1 : 0,
        hadCorrectableRollAhead: e.hadCorrectableRollAhead ? 1 : 0,
        startedAfterWindowEnd: e.startedAfterWindowEnd ? 1 : 0,
        cause: e.corrected ? 'CORRECTED' : (e.hadCorrectableRollAhead ? 'UNCORRECTED-OTHER' : 'OUT-OF-ROLLS'),
      });
    }
  });
}

mkdirSync(OUT_ABS, { recursive: true });
const EC = ['arm', 'track', 'raceIdx', 'startP', 'endP', 'durationMs', 'peakGapLen', 'resolved', 'corrected', 'hadCorrectableRollAhead', 'startedAfterWindowEnd', 'cause'];
writeFileSync(join(OUT_ABS, 'episodes-per-episode.csv'), [EC.join(','), ...epRows.map((r) => EC.map((c) => r[c] ?? '').join(','))].join('\n') + '\n');
const AC = ['arm', 'track', 'nEpisodes', 'correctedRate', 'uncorrectedRate', 'outOfRollsRate', 'uncorrectedOtherRate', 'outOfRollsShareOfUncorrected', 'unresolvedRate', 'durationMsMed', 'durationMsP90', 'peakGapMed', 'peakGapP90', 'startPMed', 'correctedStartPMed', 'uncorrectedStartPMed', 'startedAfterWindowEndRate'];
writeFileSync(join(OUT_ABS, 'episodes-summary.csv'), [AC.join(','), ...armRows.map((r) => AC.map((c) => (typeof r[c] === 'number' ? +r[c].toFixed(4) : (r[c] ?? ''))).join(','))].join('\n') + '\n');
writeFileSync(join(OUT_ABS, 'schedule-math.json'), JSON.stringify({ config: { reRollIntervalDivisor: DYN.reRollIntervalDivisor, reRollLastPositionPercent: DYN.reRollLastPositionPercent, reRollTransitionDuration: DYN.reRollTransitionDuration }, durations: DURATIONS.map(scheduleMath) }, null, 2));

// ── Console ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n=== PART 2 — late-escaper analysis (read-only, no races run) ===\n');
console.log('SCHEDULE MATH — where the last gap-correctable roll sits (from source config alone)');
console.log(`divisor=${DYN.reRollIntervalDivisor}  lastPositionPercent=${DYN.reRollLastPositionPercent}%  transitionDuration=${DYN.reRollTransitionDuration}s`);
console.log('realized(s)  rolls  interval(s)  lastRoll(s)  windowEnd(s)  lastCORRECTABLE(s)  uncorrectable run-out');
for (const d of DURATIONS.map(scheduleMath)) {
  console.log(String(d.realizedSec).padStart(10), String(d.rollCount).padStart(6), d.interval.toFixed(2).padStart(12),
    d.lastRoll.toFixed(2).padStart(12), d.windowEnd.toFixed(2).padStart(13), d.lastCorrectable.toFixed(2).padStart(19),
    `   ${d.runoutSec.toFixed(1)}s = ${(d.runoutFrac * 100).toFixed(1)}%  (free from p=${d.lastCorrectableP.toFixed(3)})`);
}
console.log('\nEPISODE CLASSIFICATION');
console.log('arm     track          nEp  CORRECTED  UNCORR  OUT-OF-ROLLS  OOR%ofUncorr  unresolved  durMed(s)  peakMed  corrStartP  uncorrStartP');
for (const r of armRows) {
  console.log(r.arm.padEnd(7), r.track.padEnd(14), String(r.nEpisodes).padStart(4),
    pct(r.correctedRate).padStart(10), pct(r.uncorrectedRate).padStart(7), pct(r.outOfRollsRate).padStart(13),
    pct(r.outOfRollsShareOfUncorrected).padStart(13), pct(r.unresolvedRate).padStart(11),
    (r.durationMsMed / 1000).toFixed(1).padStart(10), r3(r.peakGapMed).padStart(8),
    r3(r.correctedStartPMed).padStart(11), r3(r.uncorrectedStartPMed).padStart(13));
}
// ── The owner's actual signature ─────────────────────────────────────────────────────────────────
// Most episodes are shallow and self-resolving: median peak ~1.5 L (barely over G) and median
// duration shorter than the 9.5 s roll interval, so they close before a roll ever comes round. Those
// dominate the raw "uncorrected" count but are NOT what the owner saw. His case is the escape that
// runs UNRESOLVED TO THE LINE — the racer that escaped and won alone. That subset is the one to
// classify, and the phase split (did the leader still have a correctable roll ahead?) is the test of
// "structural gap" vs "the mechanism declined to act".
console.log('\nTHE OWNER\'S SIGNATURE — episodes that ran UNRESOLVED to the line');
console.log('arm     track          nUnres  ofWhich OUT-OF-ROLLS  had-roll-ahead  startP med  peak med  peak p90');
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p90 = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)]; };
const sigRows = [];
for (const [arm, rs] of byArm) {
  const scopes = [['ALL', rs.flatMap((r) => r.races)], ...rs.map((r) => [r.track, r.races])];
  for (const [track, races] of scopes) {
    const unres = races.flatMap((r) => r.episodes ?? []).filter((e) => !e.resolved);
    const oor = unres.filter((e) => !e.hadCorrectableRollAhead);
    const row = {
      arm, track, nUnresolved: unres.length,
      outOfRollsShare: unres.length ? oor.length / unres.length : null,
      hadRollAheadShare: unres.length ? 1 - oor.length / unres.length : null,
      startPMed: med(unres.map((e) => e.startP)),
      peakMed: med(unres.map((e) => e.peakGapLen)),
      peakP90: p90(unres.map((e) => e.peakGapLen)),
    };
    sigRows.push(row);
    console.log(arm.padEnd(7), track.padEnd(14), String(row.nUnresolved).padStart(6),
      pct(row.outOfRollsShare).padStart(21), pct(row.hadRollAheadShare).padStart(15),
      r3(row.startPMed).padStart(11), r3(row.peakMed).padStart(9), r3(row.peakP90).padStart(9));
  }
}
// Phase split over ALL episodes: does having a roll ahead actually predict being corrected?
console.log('\nPHASE SPLIT — does a correctable roll ahead predict correction?');
console.log('arm     had-roll-ahead: n / corrected%   |   no-roll-ahead: n / corrected%');
for (const [arm, rs] of byArm) {
  const all = rs.flatMap((r) => r.races).flatMap((r) => r.episodes ?? []);
  const withRoll = all.filter((e) => e.hadCorrectableRollAhead);
  const without = all.filter((e) => !e.hadCorrectableRollAhead);
  const cr = (a) => (a.length ? a.filter((e) => e.corrected).length / a.length : null);
  console.log(arm.padEnd(7), String(withRoll.length).padStart(14), pct(cr(withRoll)).padStart(12), '   |',
    String(without.length).padStart(14), pct(cr(without)).padStart(12));
}
const SC = ['arm', 'track', 'nUnresolved', 'outOfRollsShare', 'hadRollAheadShare', 'startPMed', 'peakMed', 'peakP90'];
writeFileSync(join(OUT_ABS, 'episodes-unresolved.csv'), [SC.join(','), ...sigRows.map((r) => SC.map((c) => (typeof r[c] === 'number' ? +r[c].toFixed(4) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

console.log(`\nWrote ${OUT_ABS}`);
