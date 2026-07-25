// ============================================================
// exp-aff-screen.mjs — SCREEN for Assignment-follows-field (Evolution Act 1). REPORT-ONLY.
//
// Paired, race-for-race, same seeds:
//   CONTROL = shipped defaults (AFF flag OFF)
//   AFF     = shipped defaults + --assignmentFollowsField=true --affSwapThresholdLengths=0.5
// on luger-hill (binding closed) + searound (open), each at its canonical per-track default length
// (--track-defaults), N=25 per arm per track. Nothing ships — the owner decides after an eye test.
//
// Metrics (all read-only, from the standard observers):
//   PRIMARY   band-reach            (hero-map.json fairness.bandReach — the shipped definition)
//   GUARDRAILS dead finales, front@line, lead changes, runaway, escape median + p90
//   FLAP DIAG  mean intra-band target swaps per racer per race (AFF/live, from rawData affSwaps)
//
// Usage: node scripts/exp-aff-screen.mjs [--races=25] [--seed=1] [--jobs=2]
//        [--out=reports/evolution]
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, relative } from 'path';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const RACES = Number(argVal('races', '25'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '2')));
const AFF_H = argVal('affSwapThresholdLengths', '0.5');
const OUT_ABS = (() => { const r = argVal('out', 'reports/evolution'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-aff-screen');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// luger-hill = binding closed track; searound = open track. Each pinned to its seeded default racer.
const TRACK_IDS = ['luger-hill', 'searound'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60; // owner-standard field sizes

const ARMS = [
  { label: 'CONTROL', aff: false },
  { label: `AFF-${AFF_H}`, aff: true },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const r2 = (x) => (x == null ? 'n/a' : Number(x).toFixed(2));
// front group at the line: count of racers within `r` racer-lengths of the leader (walk cumulative gaps).
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

async function runArmTrack(arm, track) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP_ABS, `${arm.label}-${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, '--track-defaults', `--racers=${nRacers}`,
    '--runaway-parade', '--hero-map', '--escape-latency',
    `--out=${toSimOut(outAbs)}`];
  // AFF arm only: engage the mechanism. CONTROL runs the shipped defaults flagless (byte-identical world).
  if (arm.aff) args.push('--assignmentFollowsField=true', `--affSwapThresholdLengths=${AFF_H}`);
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const el = JSON.parse(readFileSync(join(outAbs, 'escape-latency.json'), 'utf8'));
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const e = elByIdx.get(rec.raceIdx) ?? {};
    return {
      finaleLead: raw.leadChangeCount ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      runaway: c.runawayWinner ? 1 : 0,
      escapeDepthLen: e.escapeDepthLen ?? null,
    };
  });
  // Flap diagnostic: mean intra-band target swaps per racer per race (AFF/live). Read from rawData rows
  // (fairness-data.json), where the AFF arm attaches per-racer `affSwaps`. CONTROL rows carry none → 0.
  let affSwapMean = null;
  if (arm.aff) {
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    const swaps = fd.rawData.map((r) => r.affSwaps ?? 0);
    affSwapMean = mean(swaps);
  }
  return {
    arm: arm.label, track: track.id, closed: track.closed, rows,
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    affSwapMean,
    nRacerRows: RACES * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const affMeans = runs.map((r) => r.affSwapMean).filter((x) => x != null);
  return {
    nRaces: rows.length,
    bandReachPooled,
    holmFlaggedTracks: runs.filter((r) => r.startRowUnfair === true).length,
    holmTracksTotal: runs.length,
    deadRate: mean(rows.map((r) => r.dead)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    finaleLead: mean(rows.map((r) => r.finaleLead)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    escapeDepthMed: pctl(depths, 50),
    escapeDepthP90: pctl(depths, 90),
    affSwapMean: affMeans.length ? mean(affMeans) : null,
  };
}

mkdirSync(OUT_ABS, { recursive: true });
mkdirSync(TMP_ABS, { recursive: true });
console.log(`\n=== SCREEN — Assignment-follows-field (Evolution Act 1) — REPORT ONLY ===`);
console.log(`arms: ${ARMS.map((a) => a.label).join('  vs  ')}   (AFF threshold ${AFF_H} lengths)`);
console.log(`tracks ${TRACK_IDS.join(', ')} | N=${RACES}/arm/track | racers ${RACERS_CLOSED} closed / ${RACERS_OPEN} open | --track-defaults | paired seeds (seed=${SEED})`);

const jobs = [];
for (const arm of ARMS) for (const t of TRACKS) jobs.push({ arm, t });
const results = new Array(jobs.length);
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const i = next++;
    const { arm, t } = jobs[i];
    console.log(`  running ${arm.label} / ${t.id} …`);
    results[i] = await runArmTrack(arm, t);
    console.log(`  done    ${arm.label} / ${t.id}  (${results[i]._secs.toFixed(0)}s, bandReach ${pct(results[i].bandReach)})`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

// ── Per-track + pooled tables ───────────────────────────────────────────────
const byArm = new Map(ARMS.map((a) => [a.label, results.filter((r) => r.arm === a.label)]));
const perTrack = (armLabel, trackId) => results.find((r) => r.arm === armLabel && r.track === trackId);

const METRICS = [
  ['band-reach', (a) => pct(a.bandReachPooled)],
  ['dead finales', (a) => pct(a.deadRate)],
  ['front@line', (a) => r2(a.frontGroupAtLine)],
  ['lead changes', (a) => r2(a.finaleLead)],
  ['runaway', (a) => pct(a.runawayRate)],
  ['escape med (L)', (a) => r2(a.escapeDepthMed)],
  ['escape p90 (L)', (a) => r2(a.escapeDepthP90)],
  ['flap swaps/racer', (a) => (a.affSwapMean == null ? '—' : r2(a.affSwapMean))],
  ['Holm-unfair tracks', (a) => `${a.holmFlaggedTracks}/${a.holmTracksTotal}`],
];

function tableFor(label, aggByArm) {
  let md = `| metric | ${ARMS.map((a) => a.label).join(' | ')} |\n`;
  md += `|---|${ARMS.map(() => '---').join('|')}|\n`;
  for (const [name, fmt] of METRICS) {
    md += `| ${name} | ${ARMS.map((a) => fmt(aggByArm.get(a.label))).join(' | ')} |\n`;
  }
  return md;
}

const pooledAgg = new Map(ARMS.map((a) => [a.label, aggregate(byArm.get(a.label))]));
const trackAgg = new Map();
for (const t of TRACKS) {
  const m = new Map(ARMS.map((a) => [a.label, aggregate([perTrack(a.label, t.id)])]));
  trackAgg.set(t.id, m);
}

const now = argVal('date', '2026-07-25');
let md = `# Assignment-follows-field (Evolution Act 1) — SCREEN\n\n`;
md += `**Report-only. Nothing ships; the owner decides after an eye test.** Paired, race-for-race, same seeds. `;
md += `CONTROL = shipped defaults (AFF flag OFF) vs AFF = flag ON at affSwapThresholdLengths ${AFF_H}. `;
md += `Tracks (one open + one closed): ${TRACKS.map((t) => `${t.id} (${t.closed ? 'closed' : 'open'})`).join(' + ')}, canonical per-track defaults (\`--track-defaults\`), `;
md += `N=${RACES} per arm per track (${RACES * TRACKS.length} races/arm), 40 racers closed / 60 open. `;
md += `band-reach is the primary fairness metric; the rest are finale guardrails; the flap diagnostic is the mean `;
md += `intra-band target swaps per racer per race (AFF/live). Generated ${now}.\n\n`;

md += `## Pooled (both tracks)\n\n`;
md += tableFor('pooled', pooledAgg);

for (const t of TRACKS) {
  md += `\n## ${t.id} (${t.closed ? 'closed' : 'open'})\n\n`;
  md += tableFor(t.id, trackAgg.get(t.id));
}

// ── Closing line: direction verdict + cadence-stability read ─────────────────
const ctrl = pooledAgg.get('CONTROL');
const aff = pooledAgg.get(ARMS[1].label);
const reachDelta = (aff.bandReachPooled - ctrl.bandReachPooled) * 100;
const deadDelta = (aff.deadRate - ctrl.deadRate) * 100;
const leadDelta = aff.finaleLead - ctrl.finaleLead;
const runawayDelta = (aff.runawayRate - ctrl.runawayRate) * 100;
const swaps = aff.affSwapMean;
// A "stable" per-tick cadence = low swap churn (few committed swaps/racer) and band-reach not degraded.
const reachFair = aff.bandReachPooled != null && aff.bandReachPooled >= 0.70;
const dirBetter = deadDelta < -0.05 || leadDelta > 0.05 || runawayDelta < -0.05;
const dirWorse = deadDelta > 0.05 || runawayDelta > 0.05 || reachDelta < -1.0;
const verdict = dirBetter && !dirWorse ? 'PROMISING (finale livelier, fairness held)'
  : dirWorse && !dirBetter ? 'NEGATIVE (guardrails regressed)'
  : 'NEUTRAL (no clear finale movement)';
const cadence = swaps == null ? 'n/a'
  : swaps <= 8 ? `per-tick cadence looks STABLE (mean ${r2(swaps)} committed swaps/racer/race at ${AFF_H} lengths — churn is damped)`
  : `per-tick cadence looks TWITCHY (mean ${r2(swaps)} committed swaps/racer/race — consider the roll-boundary fallback)`;

md += `\n## Closing line\n\n`;
md += `**Direction: ${verdict}${reachFair ? '' : ' — band-reach BELOW 70%, fairness at risk'}. `;
md += `Δband-reach ${reachDelta >= 0 ? '+' : ''}${reachDelta.toFixed(1)}pp, Δdead ${deadDelta >= 0 ? '+' : ''}${deadDelta.toFixed(1)}pp, `;
md += `Δlead-changes ${leadDelta >= 0 ? '+' : ''}${leadDelta.toFixed(2)}, Δrunaway ${runawayDelta >= 0 ? '+' : ''}${runawayDelta.toFixed(1)}pp; `;
md += `${cadence}.**\n`;

const outFile = join(OUT_ABS, 'AFF-SCREEN.md');
writeFileSync(outFile, md);
console.log(`\nreport -> ${toSimOut(outFile)}`);
console.log(md);
