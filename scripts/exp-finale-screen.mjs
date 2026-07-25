// ============================================================
// exp-finale-screen.mjs — SCREEN for finale front-compression (Evolution Act 2). REPORT-ONLY.
//
// Paired, race-for-race, same seeds:
//   CONTROL = shipped defaults (finale flag OFF)
//   FINALE  = shipped defaults + --finaleFrontCompression=true (at the shipped default knobs)
// on luger-hill (open) + searound (closed), each at its canonical per-track default length
// (--track-defaults), N=25 per arm per track. Nothing ships — the owner decides after an eye test.
//
// Metrics (all read-only, from the standard observers):
//   PRIMARY VETO band-reach (hero-map.json fairness.bandReach — the shipped definition, ≥70% floor)
//   GUARDRAILS   dead finales, front@line, lead changes, runaway, escape median + p90
//   SPLIT        intervention split — mean (A) catch-up UP-tilts vs (B) leader-bleed DOWN-tilts per race,
//                and the B-share, to confirm B stays a rare backstop (from rawData finaleUp/finaleDown)
//
// Usage: node scripts/exp-finale-screen.mjs [--races=25] [--seed=1] [--jobs=2] [--out=reports/evolution]
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
const OUT_ABS = (() => { const r = argVal('out', 'reports/evolution'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-finale-screen');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const TRACK_IDS = ['luger-hill', 'searound'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

const ARMS = [
  { label: 'CONTROL', finale: false },
  { label: 'FINALE', finale: true },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const r2 = (x) => (x == null ? 'n/a' : Number(x).toFixed(2));
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

async function runArmTrack(arm, track) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP_ABS, `${arm.label}-${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, '--track-defaults', `--racers=${nRacers}`,
    '--runaway-parade', '--hero-map', '--escape-latency',
    `--out=${toSimOut(outAbs)}`];
  if (arm.finale) args.push('--finaleFrontCompression=true'); // shipped default knobs
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
  // Intervention split (FINALE arm only): per-race totals live on each rawData row → dedup by raceIdx.
  let upMean = null, downMean = null, bShare = null;
  if (arm.finale) {
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    const perRace = new Map();
    for (const r of fd.rawData) if (!perRace.has(r.raceIdx)) perRace.set(r.raceIdx, { up: r.finaleUp ?? 0, down: r.finaleDown ?? 0 });
    const ups = [...perRace.values()].map((x) => x.up);
    const downs = [...perRace.values()].map((x) => x.down);
    upMean = mean(ups);
    downMean = mean(downs);
    const totU = ups.reduce((s, x) => s + x, 0), totD = downs.reduce((s, x) => s + x, 0);
    bShare = totU + totD > 0 ? totD / (totU + totD) : null;
  }
  return {
    arm: arm.label, track: track.id, closed: track.closed, rows,
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    upMean, downMean, bShare,
    nRacerRows: RACES * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const ups = runs.map((r) => r.upMean).filter((x) => x != null);
  const downs = runs.map((r) => r.downMean).filter((x) => x != null);
  const shares = runs.map((r) => r.bShare).filter((x) => x != null);
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
    upMean: ups.length ? mean(ups) : null,
    downMean: downs.length ? mean(downs) : null,
    bShare: shares.length ? mean(shares) : null,
  };
}

mkdirSync(OUT_ABS, { recursive: true });
mkdirSync(TMP_ABS, { recursive: true });
console.log(`\n=== SCREEN — finale front-compression (Evolution Act 2) — REPORT ONLY ===`);
console.log(`arms: ${ARMS.map((a) => a.label).join('  vs  ')}`);
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

const byArm = new Map(ARMS.map((a) => [a.label, results.filter((r) => r.arm === a.label)]));
const perTrack = (armLabel, trackId) => results.find((r) => r.arm === armLabel && r.track === trackId);

const METRICS = [
  ['band-reach (PRIMARY veto)', (a) => pct(a.bandReachPooled)],
  ['dead finales', (a) => pct(a.deadRate)],
  ['front@line', (a) => r2(a.frontGroupAtLine)],
  ['lead changes', (a) => r2(a.finaleLead)],
  ['runaway', (a) => pct(a.runawayRate)],
  ['escape med (L)', (a) => r2(a.escapeDepthMed)],
  ['escape p90 (L)', (a) => r2(a.escapeDepthP90)],
  ['tilts A/race', (a) => (a.upMean == null ? '—' : r2(a.upMean))],
  ['tilts B/race', (a) => (a.downMean == null ? '—' : r2(a.downMean))],
  ['B share', (a) => (a.bShare == null ? '—' : pct(a.bShare))],
  ['Holm-unfair tracks', (a) => `${a.holmFlaggedTracks}/${a.holmTracksTotal}`],
];

function tableFor(aggByArm) {
  let md = `| metric | ${ARMS.map((a) => a.label).join(' | ')} |\n`;
  md += `|---|${ARMS.map(() => '---').join('|')}|\n`;
  for (const [name, fmt] of METRICS) md += `| ${name} | ${ARMS.map((a) => fmt(aggByArm.get(a.label))).join(' | ')} |\n`;
  return md;
}

const pooledAgg = new Map(ARMS.map((a) => [a.label, aggregate(byArm.get(a.label))]));
const trackAgg = new Map();
for (const t of TRACKS) trackAgg.set(t.id, new Map(ARMS.map((a) => [a.label, aggregate([perTrack(a.label, t.id)])])));

const now = argVal('date', '2026-07-26');
let md = `# Finale front-compression (Evolution Act 2) — SCREEN\n\n`;
md += `**Report-only. Nothing ships; the owner decides after an eye test.** Paired, race-for-race, same seeds. `;
md += `CONTROL = shipped defaults (finale flag OFF) vs FINALE = flag ON at the shipped default knobs `;
md += `(window [0.80,0.90], catch-up gate G_c=1.0 L, leader-bleed gate G_b=2.0 L, strength 1.0). `;
md += `Tracks (one open + one closed): ${TRACKS.map((t) => `${t.id} (${t.closed ? 'closed' : 'open'})`).join(' + ')}, `;
md += `canonical per-track defaults (\`--track-defaults\`), N=${RACES} per arm per track (${RACES * TRACKS.length} races/arm), `;
md += `40 racers closed / 60 open. band-reach is the primary veto (≥70% floor); the rest are finale guardrails; `;
md += `the split (A catch-up vs B leader-bleed) confirms B stays a rare backstop. Generated ${now}.\n\n`;

md += `## Pooled (both tracks)\n\n`;
md += tableFor(pooledAgg);
for (const t of TRACKS) {
  md += `\n## ${t.id} (${t.closed ? 'closed' : 'open'})\n\n`;
  md += tableFor(trackAgg.get(t.id));
}

const ctrl = pooledAgg.get('CONTROL');
const fin = pooledAgg.get('FINALE');
const reachDelta = (fin.bandReachPooled - ctrl.bandReachPooled) * 100;
const deadDelta = (fin.deadRate - ctrl.deadRate) * 100;
const leadDelta = fin.finaleLead - ctrl.finaleLead;
const frontDelta = fin.frontGroupAtLine - ctrl.frontGroupAtLine;
const runawayDelta = (fin.runawayRate - ctrl.runawayRate) * 100;
const reachHolds = fin.bandReachPooled != null && fin.bandReachPooled >= 0.70;
const contestUp = leadDelta > 0.05 || frontDelta > 0.05;
const guardWorse = deadDelta > 0.5 || runawayDelta > 0.5;
const verdict = !reachHolds ? 'FAILS the band-reach floor (veto)'
  : contestUp && !guardWorse ? 'LIFTS finale contest without breaking the floor'
  : guardWorse ? 'guardrails regressed (dead/runaway up)'
  : 'NEUTRAL (no clear contest lift)';

md += `\n## Closing line\n\n`;
md += `**Direction: ${verdict}. band-reach ${pct(fin.bandReachPooled)} (Δ${reachDelta >= 0 ? '+' : ''}${reachDelta.toFixed(1)}pp, floor ${reachHolds ? 'HELD' : 'BROKEN'}); `;
md += `Δlead-changes ${leadDelta >= 0 ? '+' : ''}${leadDelta.toFixed(2)}, Δfront@line ${frontDelta >= 0 ? '+' : ''}${frontDelta.toFixed(2)}, `;
md += `Δdead ${deadDelta >= 0 ? '+' : ''}${deadDelta.toFixed(1)}pp, Δrunaway ${runawayDelta >= 0 ? '+' : ''}${runawayDelta.toFixed(1)}pp; `;
md += `intervention split A ${r2(fin.upMean)}/race vs B ${r2(fin.downMean)}/race (B share ${pct(fin.bShare)} — ${fin.bShare != null && fin.bShare <= 0.25 ? 'B stays a rare backstop' : 'B firing more than expected'}).**\n`;

const outFile = join(OUT_ABS, 'FINALE-SCREEN.md');
writeFileSync(outFile, md);
console.log(`\nreport -> ${toSimOut(outFile)}`);
console.log(md);
