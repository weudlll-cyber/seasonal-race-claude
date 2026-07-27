// ============================================================
// scripts/exp-chain-ablate.mjs — CHAIN-ABLATE-1 battery. Read-only driver: each ARM is a named CLI
// flag-set on sim-fairness.mjs (no engine change here). Ship control (flagless) is run ONCE and reused.
// Runs the selected arms on 4 standard tracks, N races, paired seeds; prints band-reach / dead-finale /
// late-lead-changes / per-row band-reach vs ship. Deltas vs ship let the add-back ledger keep/discard.
// Usage: node scripts/exp-chain-ablate.mjs --arms=M0,M0warm [--races=20] [--seed=1] [--jobs=4]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec;
const RACES = Number(argVal('races', '20'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
// ACTION-NIGHT-1: fixed duration (30/60/180) via --dur; empty → each track's canonical default.
const DUR = argVal('dur', '');
const TMP = join(ROOT, 'client/tmp/exp-chain-ablate');
const OUT = join(ROOT, 'reports/evolution/chain-ablate-data');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// --tracks=four (default) | ten (the 10 standard fingerprint tracks) | comma-list of ids.
const TEN_TRACKS = ['city-circuit', 'dirt-oval', 'garden-path', 'ice-track', 'luger-hill',
  'mountainstreet', 'river-run', 'searound', 'seatrack', 'space-sprint'];
const FOUR_TRACKS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const TRACKS_ARG = argVal('tracks', 'four');
const TRACK_IDS = TRACKS_ARG === 'ten' ? TEN_TRACKS
  : TRACKS_ARG === 'four' ? FOUR_TRACKS
  : TRACKS_ARG.split(',').map((s) => s.trim()).filter(Boolean);
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

// ── Arm library. NAKED = the M0 base: chain from the gun, SOLE action engine, all helpers OFF. ──────────
const NAKED = [
  '--chainChoreoEnabled=true', '--pulkStart=0', '--choreoOutcomeStart=0', '--choreoReleaseProgress=1.0',
  '--bonusMult=0', '--reRollVariationPercent=0', '--gapRerollEnabled=false', '--speedBonusFactor=0',
  '--b2AttackHeroes=0', '--pulkLeadRotationAttackerSlots=0',
];
const without = (arr, prefix) => arr.filter((f) => !f.startsWith(prefix));
const withF = (arr, ...adds) => [...arr, ...adds];
// A helper "until X%" via a chaos window: chain anchors at X (pulkStart=X), the named helper is ON only
// during [0,X] (chaos), chain from X. Used for the duration-cutoff sweeps.
const boundary = (base, x) => without(without(base, '--pulkStart='), '--choreoOutcomeStart=')
  .concat([`--pulkStart=${x}`, `--choreoOutcomeStart=${x}`]);

const ROW = (a) => withF(without(a, '--speedBonusFactor='), '--speedBonusFactor=1.0'); // start-row bonus ON
const B25F = boundary(ROW(NAKED), 0.25); // the best Round-B base: chaos 0.25 + row bonus, sole engine
const setF = (a, prefix, val) => withF(without(a, prefix), `${prefix}${val}`);

const ARM_LIB = {
  ship: [],
  // Round A — from the gun
  M0:        withF(NAKED, '--avoidanceWarmupMs=0'),                       // strict from gun
  M0warm:    NAKED,                                                        // + shipped overlap warmup
  M0row:     withF(without(NAKED, '--speedBonusFactor='), '--avoidanceWarmupMs=0', '--speedBonusFactor=1.0'),
  M0rowwarm: withF(without(NAKED, '--speedBonusFactor='), '--speedBonusFactor=1.0'),
  // Round A extras
  M0release: withF(without(NAKED, '--choreoReleaseProgress='), '--avoidanceWarmupMs=0', '--choreoReleaseProgress=0.97'),
  M0seg12:   withF(NAKED, '--avoidanceWarmupMs=0', '--chainSegSec=12'),
  M0seg30:   withF(NAKED, '--avoidanceWarmupMs=0', '--chainSegSec=30'),
  M0mx0:     withF(NAKED, '--avoidanceWarmupMs=0', '--chainMExtra=0'),
  M0mx4:     withF(NAKED, '--avoidanceWarmupMs=0', '--chainMExtra=4'),
  // Round B — chaos PRE-SORT window (chain anchors at the boundary; field spreads before it). SOLE engine.
  // rowOn = start-row bonus back on (helps back rows climb during chaos). warmup ON (NAKED default).
  B25:       boundary(withF(without(NAKED, '--speedBonusFactor='), '--speedBonusFactor=1.0'), 0.25),
  B25noRow:  boundary(NAKED, 0.25),                                        // window + warmup only, no row bonus
  B25area:   withF(without(boundary(withF(without(NAKED, '--speedBonusFactor='), '--speedBonusFactor=1.0'), 0.25), '--bonusMult='), '--bonusMult=2.0'),
  B50:       boundary(withF(without(NAKED, '--speedBonusFactor='), '--speedBonusFactor=1.0'), 0.5),
  // Round C — refine around the best base (B25F): boundary cutoff 0.15, checkpoint density, mExtra, release.
  B15:       boundary(ROW(NAKED), 0.15),
  B25seg12:  setF(B25F, '--chainSegSec=', '12'),   // denser checkpoints (K up)
  B25seg30:  setF(B25F, '--chainSegSec=', '30'),   // sparser checkpoints
  B25mx0:    setF(B25F, '--chainMExtra=', '0'),    // no round-trip excursions
  B25mx4:    setF(B25F, '--chainMExtra=', '4'),    // more excursions
  B25rel:    setF(B25F, '--choreoReleaseProgress=', '0.97'), // free B1 to natural speed at the finish (finale run-out)
  // Round D — refine around the reach winner B15 (boundary 0.15 + row bonus). Chase open-track action (mExtra).
  B10:       boundary(ROW(NAKED), 0.10),
  B15mx4:    setF(boundary(ROW(NAKED), 0.15), '--chainMExtra=', '4'),
  B15mx4rel: setF(setF(boundary(ROW(NAKED), 0.15), '--chainMExtra=', '4'), '--choreoReleaseProgress=', '0.97'),
  // ── DRAMA-1 (Phase 2): on the B15 substrate. Two autopsy-named levers — free intra-band front rank
  // (choreoReleaseProgress < 1 frees drawn-B1 finishers to contest P1, attacking OVER-STEER) and drama
  // formations (false leaders / late arrivals manufacture front crossings). B15D0 = the exact B15 baseline.
  B15D0:      boundary(ROW(NAKED), 0.15),
  B15rel85:   setF(boundary(ROW(NAKED), 0.15), '--choreoReleaseProgress=', '0.85'),
  B15rel70:   setF(boundary(ROW(NAKED), 0.15), '--choreoReleaseProgress=', '0.70'),
  B15drama:   withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true'),
  B15dramaRel85: withF(setF(boundary(ROW(NAKED), 0.15), '--choreoReleaseProgress=', '0.85'), '--chainDrama=true'),
  // Round F — drama RESOLVE cutoff sweep (duration rule): resolve=0.75 broke reach; converge earlier so the
  // servo can still land the drawn place within the envelope, while keeping the mid-race front churn.
  B15dr40:    withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true', '--chainDramaResolve=0.4'),
  B15dr50:    withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true', '--chainDramaResolve=0.5'),
  B15dr60:    withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true', '--chainDramaResolve=0.6'),
  B15dr50f25: withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true', '--chainDramaResolve=0.5', '--chainDramaFrac=0.25'),
  B15dr50hd6: withF(boundary(ROW(NAKED), 0.15), '--chainDrama=true', '--chainDramaResolve=0.5', '--chainDramaHoldDepth=6'),
  // Round G — free intra-band FRONT rank the RIGHT way (band-hold, rank-free): reduce servo strictness for
  // front-band racers in the finale (keeps the corral → no runaway; drops the rank-hold → OVER-STEER enemy).
  B15fs50:    withF(boundary(ROW(NAKED), 0.15), '--chainFrontStrictness=0.5'),
  B15fs25:    withF(boundary(ROW(NAKED), 0.15), '--chainFrontStrictness=0.25'),
  B15fs0:     withF(boundary(ROW(NAKED), 0.15), '--chainFrontStrictness=0.0'),
  B15fs25e50: withF(boundary(ROW(NAKED), 0.15), '--chainFrontStrictness=0.25', '--chainFrontFreeFrom=0.5'),
  // ── ACTION-BUILD-1 Stage 1 — THE ACCORDION (malus-side momentary-leader brake), density low/mid/high.
  B15acc3:  withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=3'),
  B15acc6:  withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=6'),
  B15acc9:  withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=9'),
  // ── ACTION-BUILD-2 — the open lane (A = admit invariant, B = lane-conditional skip). Base density 6.
  B15accA:  withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true'),
  B15accAB: withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  B15accB:  withF(boundary(ROW(NAKED), 0.15), '--chainAccordion=true', '--accordDensity=6', '--accordSkip=true'),
  // ── ACTION-BUILD-3 — the proximity floor (bunch each band toward its centre; fan at the finish).
  B15prox:    withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true'),
  B15proxAcc: withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  // ── ACTION-BUILD-4 — the finale SCRIPT COMPILER on the B15+proximity substrate. The full candidate:
  // proximity floor + a seeded finale script set (fight-for-lead / comebacker / fallbacker / pace-order
  // convergence / duel / photo-fan) + the open-lane accordion where lanes afford it. actionLevel=mid.
  B15comp:    withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=mid',
                    '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  // ── ACTION-BUILD-5 ARM A (attribution): the @328171a compiler with the accordion FULLY OFF — isolates
  // how much of the closed dead belongs to the accordion vs the scripts. (Run BEFORE the clearance refactor.)
  B15scriptOnly: withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=mid'),
  // ── ACTION-BUILD-5 ARM B (the owner's rule): compiler + accordion, BOTH under LOCAL-CLEARANCE admission
  // (topology constant deleted; lateral scripts + beats admitted per-instance by planned local space).
  B15clr:  withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=mid',
                 '--clearanceAdmit=true', '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  // ── ACTION-BUILD-5 ARM C (B + front convergence): where a front lateral is clearance-refused, author a
  // front-band longitudinal catch-up instead (the longitudinal finale story owns the moment compression can't).
  B15clrC: withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=mid',
                 '--clearanceAdmit=true', '--frontConvergence=true', '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  // ── ACTION-BUILD-6 ARM D (B15clrC + clearance-graded script BUDGET): thin ALL families toward zero on
  // very-few-lane geometry (hands the narrowest tracks back to the B15+proximity substrate). One monotone rule.
  B15clrD: withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=mid',
                 '--clearanceAdmit=true', '--frontConvergence=true', '--clearanceBudget=true', '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  B15compLo:  withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=low',
                    '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
  B15compHi:  withF(boundary(ROW(NAKED), 0.15), '--chainProximity=true', '--scriptCompiler=true', '--actionLevel=high',
                    '--chainAccordion=true', '--accordDensity=6', '--accordAdmit=true', '--accordSkip=true'),
};

const BAND_EDGES = [5, 15, 25, 40];
const zoneIdx = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(0) + '%');

async function runArmTrack(armKey, flags, track) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP, `${armKey}__${track.id}__d${DUR || 'def'}`);
  const durArgs = DUR ? [`--dur=${DUR}`] : ['--track-defaults'];
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--racers=${nRacers}`, `--normalSpeed=${NORMAL_SPEED}`,
    ...durArgs, ...flags, '--runaway-parade', '--hero-map', '--front-autopsy', `--out=${toSimOut(outAbs)}`];
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
  const faR = JSON.parse(readFileSync(join(outAbs, 'front-autopsy.json'), 'utf8')).races.map((r) => r.frontAutopsy);
  const lawFull = mean(faR.map((r) => r.LAW_full));
  const lawL50 = mean(faR.map((r) => r.LAW_last50));
  const skipRate = mean(faR.map((r) => r.accordSkipRate ?? 0));
  // ── ACTION-BUILD-4 script-compiler aggregation (null-safe: 0 when the compiler is OFF) ──
  const ss = faR.map((r) => r.scriptStats).filter(Boolean);
  const FAMILIES = ['fightForLead', 'comebacker', 'fallbacker', 'paceConvergence', 'duelPair', 'photoFan'];
  const famMean = {};
  for (const f of FAMILIES) famMean[f] = mean(ss.map((s) => s.counts?.[f] ?? 0));
  // Variety: signature-collision rate (races sharing a timeline signature) + role-mix entropy H_script.
  const sigCounts = new Map();
  for (const s of ss) sigCounts.set(s.signature, (sigCounts.get(s.signature) ?? 0) + 1);
  const collided = [...sigCounts.values()].filter((c) => c > 1).reduce((a, c) => a + c, 0);
  const sigCollision = ss.length ? collided / ss.length : 0;
  const famTotals = FAMILIES.map((f) => ss.reduce((a, s) => a + (s.counts?.[f] ?? 0), 0));
  const grand = famTotals.reduce((a, c) => a + c, 0);
  const entropy = grand ? -famTotals.filter((c) => c > 0).map((c) => c / grand).reduce((a, p) => a + p * Math.log2(p), 0) : 0;
  const compiler = {
    scriptCount: mean(ss.map((s) => s.scriptCount ?? 0)),
    dropped: mean(ss.map((s) => s.dropped ?? 0)),
    shrunk: mean(ss.map((s) => s.shrunk ?? 0)),
    exposure: mean(ss.map((s) => s.exposure ?? 0)),
    famMean, sigCollision, entropy, distinctSigs: sigCounts.size, nRaces: ss.length,
    // ACTION-BUILD-5 clearance telemetry: lanes read, lateral admitted vs refused (the situational rule
    // firing where room exists / refusing where it does not), accordion beats admitted, front-conversions.
    lanes: mean(ss.map((s) => s.lanesFront ?? 0)),
    latAdmit: mean(ss.map((s) => s.lateralAdmit ?? 0)),
    latRefuse: mean(ss.map((s) => s.lateralRefuse ?? 0)),
    accAdmit: mean(ss.map((s) => s.accordAdmit ?? 0)),
    accRefuse: mean(ss.map((s) => s.accordRefuse ?? 0)),
    frontConv: mean(ss.map((s) => s.frontConverted ?? 0)),
    budgetScale: mean(ss.map((s) => s.budgetScale ?? 1)),
    minLanes: mean(ss.map((s) => s.minLanes ?? 0)),
  };
  // Lead-fight proxy: leader changes in the last 30% (distinct-leaders signal). fa records whole-race
  // leader-change progresses in `leadChangesProg` (added ACTION-BUILD-4); fall back to 0 when absent.
  const leadLast30 = mean(faR.map((r) => (r.leadChangesProg ?? []).filter((p) => p >= 0.7).length));
  const rowReached = [], rowTotal = [];
  for (const r of fd.rawData) { const row = r.startRowIndex; rowReached[row] = (rowReached[row] ?? 0) + (zoneIdx(r.finalRank) === zoneIdx(r.sollRank) ? 1 : 0); rowTotal[row] = (rowTotal[row] ?? 0) + 1; }
  const rows = rp.races.map((rec) => { const raw = rec.runawayParade; const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS); return { lc: raw.leadChangeCount ?? 0, dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0, runaway: c.runawayWinner ? 1 : 0 }; });
  return {
    arm: armKey, track: track.id, closed: track.closed,
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    rowReachMin: Math.min(...rowReached.map((v, i) => (rowTotal[i] ? v / rowTotal[i] : 1))),
    deadRate: mean(rows.map((r) => r.dead)), leadChanges: mean(rows.map((r) => r.lc)), runawayRate: mean(rows.map((r) => r.runaway)),
    lawFull, lawL50, skipRate, compiler, leadLast30,
  };
}

async function pool(tasks) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } }));
  return out;
}

const requested = (argVal('arms', 'M0') || '').split(',').map((s) => s.trim()).filter(Boolean);
const arms = ['ship', ...requested.filter((a) => a !== 'ship')];
for (const a of arms) if (!ARM_LIB[a]) { console.error(`unknown arm: ${a}. Known: ${Object.keys(ARM_LIB).join(', ')}`); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
console.log(`\n=== CHAIN-ABLATE battery — N=${RACES}/arm/track | tracks ${TRACK_IDS.join(', ')} | seed=${SEED} jobs=${JOBS} ===`);
console.log(`arms: ${arms.join(', ')}`);

// Reuse cached ship results if present (same seed/races), else run.
const cacheFile = join(OUT, `ship_${TRACKS_ARG === 'ten' || TRACKS_ARG === 'four' ? TRACKS_ARG : 'custom'}_N${RACES}_s${SEED}_d${DUR || 'def'}.json`);
let shipRuns = null;
if (arms.includes('ship') && existsSync(cacheFile)) { shipRuns = JSON.parse(readFileSync(cacheFile, 'utf8')); console.log('(ship cache hit)'); }

const tasks = [];
for (const armKey of arms) {
  if (armKey === 'ship' && shipRuns) continue;
  for (const t of TRACKS) tasks.push(() => runArmTrack(armKey, ARM_LIB[armKey], t));
}
const fresh = await pool(tasks);
const all = [...(shipRuns ?? []), ...fresh];
if (arms.includes('ship') && !shipRuns) writeFileSync(cacheFile, JSON.stringify(all.filter((r) => r.arm === 'ship'), null, 2));

const get = (arm, track) => all.find((r) => r.arm === arm && r.track === track);
// Table: for each arm, per-track band / dead / lc, and vs-ship deltas + a summary line.
for (const armKey of arms) {
  console.log(`\n── ${armKey} ──`);
  console.log(`  track           | band (Δship) | dead (Δship) | lead-chg (Δship) | LAWfull LAWl50 (Δship) | holm`);
  let bSum = 0, passReach = 0;
  for (const t of TRACKS) {
    const r = get(armKey, t.id), s = get('ship', t.id);
    const dB = s ? (r.bandReach - s.bandReach) * 100 : 0, dD = s ? (r.deadRate - s.deadRate) * 100 : 0, dL = s ? r.leadChanges - s.leadChanges : 0;
    const dLAW = s ? r.lawFull - s.lawFull : 0, dLAW50 = s ? r.lawL50 - s.lawL50 : 0;
    bSum += r.bandReach; if (r.bandReach >= 0.70) passReach++;
    const sgn = (x, u = '') => (x >= 0 ? '+' : '') + x.toFixed(u === 'pp' ? 0 : 2) + u;
    console.log(`  ${t.id.padEnd(15)} | ${pct(r.bandReach).padStart(4)} (${armKey === 'ship' ? '  —' : sgn(dB, 'pp')}) | ${pct(r.deadRate).padStart(4)} (${armKey === 'ship' ? '  —' : sgn(dD, 'pp')}) | ${r.leadChanges.toFixed(2).padStart(5)} (${armKey === 'ship' ? '  —' : sgn(dL)}) | ${r.lawFull.toFixed(2)}   ${r.lawL50.toFixed(2)}  (${armKey === 'ship' ? ' —/—' : sgn(dLAW) + '/' + sgn(dLAW50)}) | skip ${(r.skipRate * 100).toFixed(0)}% | ${r.startRowUnfair ? 'UNF' : 'ok'}`);
  }
  console.log(`  SUMMARY band-reach mean ${pct(bSum / TRACKS.length)} | tracks ≥70%: ${passReach}/${TRACKS.length}`);
  // ACTION-BUILD-4 compiler line (only when scripts were drawn — nRaces>0 on the candidate arms).
  for (const t of TRACKS) {
    const r = get(armKey, t.id);
    const c = r.compiler;
    if (!c || !c.nRaces) continue;
    const fm = c.famMean;
    console.log(`    [comp ${t.id.padEnd(13)}] scripts ${c.scriptCount.toFixed(1)} (fl${fm.fightForLead.toFixed(1)} cb${fm.comebacker.toFixed(1)} fb${fm.fallbacker.toFixed(1)} pc${fm.paceConvergence.toFixed(1)} dp${fm.duelPair.toFixed(1)} pf${fm.photoFan.toFixed(1)}) | drop ${c.dropped.toFixed(1)} shrink ${c.shrunk.toFixed(1)} | H ${c.entropy.toFixed(2)} sigColl ${(c.sigCollision * 100).toFixed(0)}% (${c.distinctSigs}/${c.nRaces})`);
    console.log(`    [clr  ${t.id.padEnd(13)}] lanes ${c.lanes.toFixed(1)} (min ${c.minLanes.toFixed(1)}) budget ${c.budgetScale.toFixed(2)} | latAdmit ${c.latAdmit.toFixed(1)} latRefuse ${c.latRefuse.toFixed(1)} | accAdmit ${c.accAdmit.toFixed(1)} | frontConv ${c.frontConv.toFixed(1)} | leadLast30 ${r.leadLast30.toFixed(2)}`);
  }
}
console.log(`\nruntime ${((Date.now() - t0) / 60000).toFixed(1)} min`);
writeFileSync(join(OUT, `battery_${arms.filter((a) => a !== 'ship').join('-').slice(0, 60)}.json`), JSON.stringify({ races: RACES, seed: SEED, arms, results: all }, null, 2) + '\n');
