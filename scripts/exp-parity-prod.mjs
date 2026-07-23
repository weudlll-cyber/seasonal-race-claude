// ============================================================
// exp-parity-prod.mjs — SIM AT THE OWNER'S (PRODUCT) CONFIGURATION.
//
// WHY. The owner watched three Quick-Test races to the end (city-circuit, searound, mountainstreet)
// with G=0.75 and saw ONE overtake total, dead finales, and the field strung out far behind the
// leaders. Under the stored A8 numbers (deadFinale 15.8%) three dead finales in a row is < 1%, so the
// disagreement is systematic.
//
// FIELD SIZE IS OWNER-CONFIRMED, NOT ASSUMED: the owner plays 40 on CLOSED tracks and 60 on OPEN
// tracks. That matters, because it KILLS the obvious hypothesis — the sweeps also ran 40, so on
// city-circuit and searound (both closed) the field size is IDENTICAL to what was measured. Only
// mountainstreet (open, 60 vs the sweep's 40) differs. Whatever explains the owner's three dead
// finales, it is not field size on the closed tracks.
//
// This driver re-measures the SAME two gap-reroll settings at the owner's field sizes, on the owner's
// own tracks (including city-circuit, never measured before), so the finale claims can be checked in
// the world the owner actually plays in.
//
// HARNESS-SIDE ONLY. It spawns the committed sim with flags; it changes no race behaviour. The one
// sim-file touch this audit required (a read-only distinctLeaders on the existing [0.90,1.0] tracker)
// is additive and fingerprint-verified (efd0f4ad8eca08fa unchanged).
//
// ARMS (identical seeds, paired):
//   PROD-G075 — gap-reroll symmetric G=0.75 s=1.0, carousel OFF   (the candidate the owner tested)
//   PROD-G15  — the shipped default G=1.5                          (what is live today)
//
// METRICS. The finale set the previous audit defined, PLUS the field-spread numbers that turn the
// owner's "look how far back the field is" into a measurement:
//   gapP1P2 / gapP2P3            — front gaps at the finish line (racer lengths)
//   leaderToMedianLen            — leader → MEDIAN finisher at the line: the "is the field strung
//                                  out?" number, and the one the eye reads as a parade
//   frontGroupAtLine             — racers within 3 L of the leader at the line
//   finaleLeadChanges / distinctLeaders over [0.90, 1.0], deadFinaleRate, duoEscape
//   runaway / parade
//
// Usage:
//   node scripts/exp-parity-prod.mjs [--racersClosed=40] [--racersOpen=60] [--races=100] [--dur=60] [--jobs=4]
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

// PRODUCT field size, as the OWNER actually plays it (owner-confirmed): 40 on CLOSED tracks, 60 on
// OPEN tracks. This is NOT the Quick-Test default (20) — the owner sets the count per race. It means
// the closed tracks match the sweep's 40 exactly, so field size cannot explain a closed-track
// divergence; only the open tracks differ (60 vs the sweep's 40).
const RACERS_CLOSED = Number(argVal('racersClosed', '40'));
const RACERS_OPEN = Number(argVal('racersOpen', '60'));
const RACES = Number(argVal('races', '100'));
const SEED = Number(argVal('seed', '1'));
const DUR = Number(argVal('dur', '60'));           // browser raceDefaults.duration default
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/parity-prod'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-parity-prod');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// The owner's three tracks + dirt-oval (cheap, and the only prior closed-track reference).
const TRACK_IDS = ['city-circuit', 'searound', 'mountainstreet', 'dirt-oval'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });

// ARMS. The first two are "pure shipped defaults, only G differs". The last two are the OWNER'S EXACT
// exported config — which the Part-A diff reduced to just three behaviour-relevant keys, because only
// 4 of 110 keys drift from the shipped defaults (and gapRerollDevMarker is a diagnostic marker with no
// speed term, so it has no sim flag and needs none):
//     packReleaseEnabled = true   (shipped false)  <- the shelved pack-release, prime suspect
//     gapRerollThresholdLengths = 0.75 (shipped 1.5)
//     b2AttackFinalRank = 10      (shipped 7)      <- near-inert under b2AttackBandArrival=true
// Everything else in the owner's export equals the shipped default, which is exactly what a flagless
// sim run already uses — so these three flags reproduce his world faithfully.
const OWNER_FLAGS = [
  '--gapRerollEnabled=true', '--gapRerollThresholdLengths=0.75', '--gapRerollStrength=1.0',
  '--gapRerollMode=symmetric', '--carouselEnabled=false',
  '--pack-release=true', '--b2-attack-final-rank=10',
];
const ARMS = [
  { label: 'PROD-G075', flags: ['--gapRerollEnabled=true', '--gapRerollThresholdLengths=0.75', '--gapRerollStrength=1.0', '--gapRerollMode=symmetric', '--carouselEnabled=false'] },
  { label: 'PROD-G15', flags: ['--gapRerollEnabled=true', '--gapRerollThresholdLengths=1.5', '--gapRerollStrength=1.0', '--gapRerollMode=symmetric', '--carouselEnabled=false'] },
  // The owner's world, verbatim.
  { label: 'OWNERCFG', flags: [...OWNER_FLAGS] },
  // Identical, minus the one suspected key — the isolating pair.
  { label: 'OWNERCFG-NOPACK', flags: OWNER_FLAGS.map((f) => (f === '--pack-release=true' ? '--pack-release=false' : f)) },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r4 = (x) => (x == null ? '' : +Number(x).toFixed(4));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');

// Racers within `radius` lengths of the leader at the finish snapshot (leader included).
function frontGroupAtLine(line, radius = 3.0) {
  if (!line?.gaps?.length) return null;
  let cum = 0, n = 1;
  for (const g of line.gaps) { cum += g; if (cum <= radius) n++; else break; }
  return n;
}
// Leader → the MEDIAN finisher, in lengths: the running sum of gaps up to rank ceil(n/2).
function leaderToMedianLen(line) {
  if (!line?.gaps?.length) return null;
  const n = line.gaps.length + 1;
  const medianRank = Math.ceil(n / 2);          // 1-indexed
  let cum = 0;
  for (let i = 0; i < medianRank - 1; i++) cum += line.gaps[i];
  return cum;
}

async function runArmTrack(arm, track) {
  const outAbs = join(TMP_ABS, `${arm.label}-${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, `--racers=${track.closed ? RACERS_CLOSED : RACERS_OPEN}`,
    // --hero-map is carried ONLY for its self-contained fairness block: hero-map.json reports
    // band-reach with the same definition the main report's OVERALL row uses, without paying for the
    // full main output. Read-only, no behaviour effect.
    '--runaway-parade', '--hero-map', '--skip-main-output', ...arm.flags, `--out=${toSimOut(outAbs)}`];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const j = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  let bandReach = null;
  try { bandReach = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')).fairness?.bandReach ?? null; } catch { /* absent → reported as n/a */ }
  const rows = j.races.map((rec) => {
    const raw = rec.runawayParade;
    const cls = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const line = raw.line;
    return {
      arm: arm.label, track: track.id, type: track.closed ? 'closed' : 'open', seed: rec.seed,
      finaleLeadChanges: raw.leadChangeCount ?? 0,
      finaleDistinctLeaders: raw.lateDistinctLeaders ?? null,
      gapP1P2: line?.gaps?.[0] ?? null,
      gapP2P3: line?.gaps?.[1] ?? null,
      leaderToMedianLen: leaderToMedianLen(line),
      frontGroupAtLine: frontGroupAtLine(line),
      within3At090: raw.within3P1At090 ?? null,
      runaway: cls.runawayWinner ? 1 : 0,
      parade: cls.paradeFinish ? 1 : 0,
      bandReach, // per-run scalar, repeated per row so per-arm/per-track means are trivial
    };
  });
  return { arm: arm.label, track, rows, bandReach, _secs: (Date.now() - t0) / 1000 };
}

console.log(`\n=== PARITY AUDIT — sim at the OWNER'S config === racers: closed=${RACERS_CLOSED} open=${RACERS_OPEN}, dur=${DUR}s, N=${RACES}, ${TRACKS.length} tracks x ${ARMS.length} arms`);
mkdirSync(OUT_ABS, { recursive: true });

const jobs = [];
for (const arm of ARMS) for (const track of TRACKS) jobs.push({ arm, track });
const out = new Array(jobs.length);
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= jobs.length) break;
    out[i] = await runArmTrack(jobs[i].arm, jobs[i].track);
    console.log(`  ${out[i].arm.padEnd(10)} ${out[i].track.id.padEnd(15)} done (${out[i]._secs.toFixed(0)}s)`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

const all = out.flatMap((o) => o.rows);
// Derive the duo-escape thresholds from THIS data set's own distribution (same rule as the previous
// finale audit: Q1 of the front gap, Q3 of the P2->P3 gap), so they describe the product field size.
const TIGHT = pctl(all.map((r) => r.gapP1P2).filter((x) => x != null), 25);
const FAR = pctl(all.map((r) => r.gapP2P3).filter((x) => x != null), 75);
for (const r of all) {
  r.duoEscape = (r.gapP1P2 != null && r.gapP2P3 != null && r.gapP1P2 <= TIGHT && r.gapP2P3 >= FAR) ? 1 : 0;
  r.deadFinale = r.finaleLeadChanges === 0 ? 1 : 0;
}

function agg(rows) {
  return {
    n: rows.length,
    finaleLeadMean: mean(rows.map((r) => r.finaleLeadChanges)),
    finaleDistinctMean: mean(rows.map((r) => r.finaleDistinctLeaders ?? 0)),
    deadFinaleRate: mean(rows.map((r) => r.deadFinale)),
    duoEscapeRate: mean(rows.map((r) => r.duoEscape)),
    frontGroupAtLineMean: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    gapP1P2Med: pctl(rows.map((r) => r.gapP1P2).filter((x) => x != null), 50),
    gapP2P3Med: pctl(rows.map((r) => r.gapP2P3).filter((x) => x != null), 50),
    leaderToMedianMed: pctl(rows.map((r) => r.leaderToMedianLen).filter((x) => x != null), 50),
    leaderToMedianP90: pctl(rows.map((r) => r.leaderToMedianLen).filter((x) => x != null), 90),
    within3At090Mean: mean(rows.map((r) => r.within3At090 ?? 0)),
    bandReach: mean(rows.map((r) => r.bandReach).filter((x) => x != null)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
  };
}

const byArm = new Map();
for (const r of all) { if (!byArm.has(r.arm)) byArm.set(r.arm, []); byArm.get(r.arm).push(r); }
const armAgg = ARMS.map((a) => ({ arm: a.label, ...agg(byArm.get(a.label) ?? []) }));
const byArmTrack = new Map();
for (const r of all) { const k = `${r.arm}|${r.track}`; if (!byArmTrack.has(k)) byArmTrack.set(k, []); byArmTrack.get(k).push(r); }

// CSVs
const RCOLS = ['arm', 'track', 'type', 'seed', 'finaleLeadChanges', 'finaleDistinctLeaders', 'deadFinale', 'gapP1P2', 'gapP2P3', 'leaderToMedianLen', 'frontGroupAtLine', 'duoEscape', 'within3At090', 'bandReach', 'runaway', 'parade'];
writeFileSync(join(OUT_ABS, 'prod-per-seed.csv'), [RCOLS.join(','), ...all.map((r) => RCOLS.map((c) => (typeof r[c] === 'number' ? r4(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');
const ACOLS = ['arm', 'n', 'finaleLeadMean', 'finaleDistinctMean', 'deadFinaleRate', 'duoEscapeRate', 'frontGroupAtLineMean', 'gapP1P2Med', 'gapP2P3Med', 'leaderToMedianMed', 'leaderToMedianP90', 'within3At090Mean', 'bandReach', 'runawayRate', 'paradeRate'];
writeFileSync(join(OUT_ABS, 'prod-arms.csv'), [ACOLS.join(','), ...armAgg.map((a) => ACOLS.map((c) => (typeof a[c] === 'number' ? r4(a[c]) : (a[c] ?? ''))).join(','))].join('\n') + '\n');
const TROWS = [];
for (const [k, rows] of byArmTrack) { const [arm, track] = k.split('|'); TROWS.push({ arm, track, type: rows[0].type, ...agg(rows) }); }
TROWS.sort((a, b) => a.arm.localeCompare(b.arm) || a.track.localeCompare(b.track));
writeFileSync(join(OUT_ABS, 'prod-arm-track.csv'), [['arm', 'track', 'type', ...ACOLS.slice(1)].join(','), ...TROWS.map((r) => ['arm', 'track', 'type', ...ACOLS.slice(1)].map((c) => (typeof r[c] === 'number' ? r4(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

console.log(`\nDerived duo thresholds (owner field sizes): tight P1->P2 <= ${r4(TIGHT)} L, far P2->P3 >= ${r4(FAR)} L`);
for (const a of armAgg) {
  console.log(`  ${a.arm.padEnd(10)} lead=${a.finaleLeadMean.toFixed(2)} distinct=${a.finaleDistinctMean.toFixed(2)} dead=${pct(a.deadFinaleRate)} front@line=${a.frontGroupAtLineMean.toFixed(2)} ldr->med=${r4(a.leaderToMedianMed)}L band=${pct(a.bandReach)} runaway=${pct(a.runawayRate)} parade=${pct(a.paradeRate)}`);
}
console.log('--- per track ---');
for (const r of TROWS) console.log(`  ${r.arm.padEnd(10)} ${r.track.padEnd(15)} lead=${r.finaleLeadMean.toFixed(2)} dead=${pct(r.deadFinaleRate)} ldr->med=${r4(r.leaderToMedianMed)}L front@line=${r.frontGroupAtLineMean.toFixed(2)} runaway=${pct(r.runawayRate)}`);
writeFileSync(join(OUT_ABS, 'meta.json'), JSON.stringify({ racersClosed: RACERS_CLOSED, racersOpen: RACERS_OPEN, races: RACES, dur: DUR, seed: SEED, tracks: TRACK_IDS, arms: ARMS.map((a) => ({ label: a.label, flags: a.flags })), tightThreshold: TIGHT, farThreshold: FAR }, null, 2));
console.log(`\nWrote ${OUT_ABS}`);
