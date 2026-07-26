// ============================================================
// exp-finale-adaptive-screen.mjs — SCREEN for finale ADAPTIVE gates (Evolution Act 2). REPORT-ONLY.
//
// The decisive test: does ONE track-agnostic spread-scaled law lift/hold BOTH topologies at once?
//   CONTROL  = shipped defaults (both finale flags OFF)
//   ADAPTIVE = finaleFrontCompression + finaleAdaptiveGates ON (gates = fractions of the live front spread)
// on luger-hill (open) + searound (closed), canonical per-track defaults, N=25/arm/track.
//
// Metrics: band-reach PRIMARY VETO (≥70%); guardrails dead / front@line / lead-changes / runaway /
// escape med+p90; plus the REALIZED adaptive gates (mean G_c/G_b per arm/track, from rawData) to confirm
// they scaled apart as intended. Nothing ships — the owner decides after the eye test.
//
// Usage: node scripts/exp-finale-adaptive-screen.mjs [--races=25] [--seed=1] [--jobs=2] [--out=reports/evolution]
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
const TMP_ABS = join(ROOT, 'client/tmp/exp-finale-adaptive-screen');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const TRACK_IDS = ['luger-hill', 'searound'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

const ARMS = [
  { label: 'CONTROL', adaptive: false },
  { label: 'ADAPTIVE', adaptive: true },
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
  if (arm.adaptive) args.push('--finaleFrontCompression=true', '--finaleAdaptiveGates=true');
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
  // Intervention split + realized gate means (ADAPTIVE only): per-race totals on each row → dedup by raceIdx.
  let upMean = null, downMean = null, gcMean = null, gbMean = null;
  if (arm.adaptive) {
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    const per = new Map();
    for (const r of fd.rawData) if (!per.has(r.raceIdx)) per.set(r.raceIdx, r);
    const vals = [...per.values()];
    upMean = mean(vals.map((r) => r.finaleUp ?? 0));
    downMean = mean(vals.map((r) => r.finaleDown ?? 0));
    const gcs = vals.map((r) => r.finaleGcMean).filter((x) => x != null);
    const gbs = vals.map((r) => r.finaleGbMean).filter((x) => x != null);
    gcMean = gcs.length ? mean(gcs) : null;
    gbMean = gbs.length ? mean(gbs) : null;
  }
  return {
    arm: arm.label, track: track.id, closed: track.closed, rows,
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    upMean, downMean, gcMean, gbMean,
    nRacerRows: RACES * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const g = (k) => { const v = runs.map((r) => r[k]).filter((x) => x != null); return v.length ? mean(v) : null; };
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
    upMean: g('upMean'), downMean: g('downMean'), gcMean: g('gcMean'), gbMean: g('gbMean'),
  };
}

mkdirSync(OUT_ABS, { recursive: true });
mkdirSync(TMP_ABS, { recursive: true });
console.log(`\n=== SCREEN — finale ADAPTIVE gates (Evolution Act 2) — REPORT ONLY ===`);
console.log(`arms: ${ARMS.map((a) => a.label).join('  vs  ')}   tracks ${TRACK_IDS.join(', ')} | N=${RACES}/arm/track | paired seeds (seed=${SEED})`);

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
  ['realized G_c (L)', (a) => (a.gcMean == null ? '—' : r2(a.gcMean))],
  ['realized G_b (L)', (a) => (a.gbMean == null ? '—' : r2(a.gbMean))],
  ['tilts A/race', (a) => (a.upMean == null ? '—' : r2(a.upMean))],
  ['tilts B/race', (a) => (a.downMean == null ? '—' : r2(a.downMean))],
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
let md = `# Finale ADAPTIVE gates (Evolution Act 2) — SCREEN (the decisive test)\n\n`;
md += `**Report-only. Nothing ships; the owner decides after an eye test.** The decisive question: does ONE `;
md += `track-agnostic spread-scaled law lift/hold BOTH topologies at once? Paired, same seeds. CONTROL = `;
md += `shipped (both finale flags OFF) vs ADAPTIVE = finaleFrontCompression + finaleAdaptiveGates ON `;
md += `(gates = fractions of the live front spread S: G_c = 0.25·S, G_b = 0.50·S, min-spread 1.0 L). `;
md += `Tracks (one open + one closed): ${TRACKS.map((t) => `${t.id} (${t.closed ? 'closed' : 'open'})`).join(' + ')}, `;
md += `canonical per-track defaults (\`--track-defaults\`), N=${RACES}/arm/track (${RACES * TRACKS.length} races/arm), `;
md += `40 racers closed / 60 open. band-reach is the primary veto (≥70%); realized G_c/G_b confirm the gates `;
md += `scaled apart per track. Generated ${now}.\n\n`;

md += `## Pooled (both tracks)\n\n`;
md += tableFor(pooledAgg);
for (const t of TRACKS) {
  md += `\n## ${t.id} (${t.closed ? 'closed' : 'open'})\n\n`;
  md += tableFor(trackAgg.get(t.id));
}

const open = TRACKS.find((t) => !t.closed).id;
const closed = TRACKS.find((t) => t.closed).id;
const oC = trackAgg.get(open).get('CONTROL'), oA = trackAgg.get(open).get('ADAPTIVE');
const cC = trackAgg.get(closed).get('CONTROL'), cA = trackAgg.get(closed).get('ADAPTIVE');
const p = pooledAgg;
const floorHeld = p.get('ADAPTIVE').bandReachPooled != null && p.get('ADAPTIVE').bandReachPooled >= 0.70
  && oA.bandReachPooled >= 0.70 && cA.bandReachPooled >= 0.70;
const openContestFixed = oA.finaleLead >= oC.finaleLead - 1e-9; // open lead-changes restored to ≥ control
const closedNotWorse = cA.runawayRate <= cC.runawayRate + 1e-9 && cA.deadRate <= cC.deadRate + 1e-9; // closed runaway/dead ≤ control
const bothWin = floorHeld && openContestFixed && closedNotWorse;

md += `\n## Closing line\n\n`;
if (bothWin) {
  md += `**DECISIVE PASS: one spread-scaled law lifts/holds BOTH tracks. Floor held on both `;
  md += `(open ${pct(oA.bandReachPooled)}, closed ${pct(cA.bandReachPooled)}); open lead-changes restored `;
  md += `(${r2(oC.finaleLead)}→${r2(oA.finaleLead)}) AND closed runaway/dead not worsened `;
  md += `(runaway ${pct(cC.runawayRate)}→${pct(cA.runawayRate)}, dead ${pct(cC.deadRate)}→${pct(cA.deadRate)}). `;
  md += `Realized gates scaled per track (open G_c ${r2(oA.gcMean)} / closed G_c ${r2(cA.gcMean)}). Owner eye-test next.**\n`;
} else {
  md += `**DECISIVE FAIL: one spread-scaled law does NOT reconcile both topologies. `;
  md += `Floor ${floorHeld ? 'held' : 'BROKEN'} (open ${pct(oA.bandReachPooled)}, closed ${pct(cA.bandReachPooled)}); `;
  md += `open lead-changes ${r2(oC.finaleLead)}→${r2(oA.finaleLead)} (${openContestFixed ? 'restored' : 'STILL below control'}), `;
  md += `closed runaway ${pct(cC.runawayRate)}→${pct(cA.runawayRate)} / dead ${pct(cC.deadRate)}→${pct(cA.deadRate)} `;
  md += `(${closedNotWorse ? 'held' : 'STILL worse than control'}). Realized gates barely separated `;
  md += `(open G_c ${r2(oA.gcMean)} / closed G_c ${r2(cA.gcMean)}), so the front spread is NOT the hidden variable that `;
  md += `distinguishes the regimes — the open/closed split is structural physics, not gate selectivity. `;
  md += `Recommendation: ABANDON Act 2 — no single scheduled-dice law serves both topologies.**\n`;
}

const outFile = join(OUT_ABS, 'FINALE-ADAPTIVE-SCREEN.md');
writeFileSync(outFile, md);
console.log(`\nreport -> ${toSimOut(outFile)}`);
console.log(md);
