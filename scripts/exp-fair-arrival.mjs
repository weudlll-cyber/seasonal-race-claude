// ============================================================
// scripts/exp-fair-arrival.mjs — FAIR-ARRIVAL-1 screen (searound + ice, N=25, paired vs Ship).
// Read-only driver: each arm is a CLI flag-set on sim-fairness.mjs. Headline = ABSOLUTE band arrival
// (hero-map bandReach); dual scoreboard = dead + DEAD-BORING/THRILLER + frontContest + distinctLead;
// watchdog = per-row band floor + Holm. Usage: node scripts/exp-fair-arrival.mjs [--races=25] [--jobs=4]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const pExec = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const RACES = Number(argVal('races', '25'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
// --tag gives a stage its OWN output dir so parallel stages (S1/S2/S3) never collide; --dur overrides
// track-defaults (STAGE 2 = 30s, STAGE 3 = 180s). Both default to the original behaviour.
const TAG = argVal('tag', '');
const DUR = argVal('dur', '');
const TMP = join(ROOT, 'client/tmp/fair-arrival' + (TAG ? `-${TAG}` : ''));
const toOut = (a) => relative(ROOT, a).replace(/\\/g, '/');
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(0) + '%');
const BE = [5, 15, 25, 40];
const zi = (r) => { for (let i = 0; i < BE.length; i++) if (r <= BE[i]) return i; return BE.length; };

// FAIR-ARRIVAL-CONFIRM-1: 10-track confirm of the COMBO. --tracks=ten runs all 10 standard tracks (racer +
// closed read from the seed); default is the searound+ice screen pair. Field size 40 closed / 60 open.
const TEN = ['city-circuit', 'dirt-oval', 'garden-path', 'ice-track', 'luger-hill', 'mountainstreet', 'river-run', 'searound', 'seatrack', 'space-sprint'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS_ARG = argVal('tracks', 'searound,ice-track');
const TRACK_IDS = TRACKS_ARG === 'ten' ? TEN : TRACKS_ARG.split(',').map((s) => s.trim()).filter(Boolean);
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
// CHAOS-STEER-1: the owner's Part 1 (chaosSteer) measured ALONE vs Ship. faB60 = the band-bias R=0.60 arm.
// FAIR-ARRIVAL-COMBINE-1: the two validated halves alone AND together (combo = BOTH flags, no coupling code).
const STEER = ['--chaosSteer=true', '--chaosSteerGain=0.06'];
const BIAS = ['--bandBias=true', '--bandR=0.60', '--bandBiasGain=0.10'];
// PULK-SPECTACLE-1 STAGE 3: chaos window 0.25 -> 0.15 (one flag; everything else untouched).
const CHAOS15 = ['--pulkStart=0.15'];
const ALL_ARMS = {
  ship: [],
  chaosSteer: STEER,
  faB60: BIAS,
  combo: [...STEER, ...BIAS],
  ship15: [...CHAOS15],
  combo15: [...STEER, ...BIAS, ...CHAOS15],
};
// --arms filter (default all). CONFIRM-1 runs --arms=ship,combo (lean; attribution arms reserved for the gate).
const ARM_KEYS = (argVal('arms', Object.keys(ALL_ARMS).join(','))).split(',').map((s) => s.trim()).filter(Boolean);
const ARMS = Object.fromEntries(ARM_KEYS.map((k) => [k, ALL_ARMS[k]]));

async function run(armKey, flags, track) {
  const out = join(TMP, `${armKey}__${track.id}`);
  const nRacers = track.closed ? 40 : 60;
  await pExec(process.execPath, [
    'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=1`, `--races=${RACES}`, `--racers=${nRacers}`, ...(DUR ? [`--dur=${DUR}`] : ['--track-defaults']), ...flags,
    '--runaway-parade', '--hero-map', '--front-autopsy', '--pulk-window', `--out=${toOut(out)}`,
  ], { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const hm = JSON.parse(readFileSync(join(out, 'hero-map.json'), 'utf8'));
  const rp = JSON.parse(readFileSync(join(out, 'runaway-parade.json'), 'utf8')).races.map((r) => r.runawayParade);
  const fd = JSON.parse(readFileSync(join(out, 'fairness-data.json'), 'utf8'));
  const rr = [], rt = [];
  for (const r of fd.rawData) { const row = r.startRowIndex; rr[row] = (rr[row] ?? 0) + (zi(r.finalRank) === zi(r.sollRank) ? 1 : 0); rt[row] = (rt[row] ?? 0) + 1; }
  const rowMin = Math.min(...rr.map((v, i) => (rt[i] ? v / rt[i] : 1)));
  // ROW-SKEW DIAGNOSIS: per-start-row band-reach + per-row steer exposure (share steered + mean mult).
  const rowBandReach = rr.map((v, i) => (rt[i] ? v / rt[i] : null));
  const rowSteer = {}; // row → {n, steered, ticks, multSum, inBandEnd} summed across races
  for (const r of rp) {
    if (!r.chaosSteer?.perRow) continue;
    for (const [row, pr] of Object.entries(r.chaosSteer.perRow)) {
      const a = rowSteer[row] ?? (rowSteer[row] = { n: 0, steered: 0, ticks: 0, multSum: 0, inBandEnd: 0 });
      a.n += pr.n; a.steered += pr.steered; a.ticks += pr.ticks; a.multSum += pr.multSum; a.inBandEnd += pr.inBandEnd;
    }
  }
  // ── PULK-SPECTACLE-1 front-liveliness aggregation (chaos / pulk / LAW / brake) ──
  const fl = rp.map((r) => r.frontLiveliness).filter(Boolean);
  const flA = (f) => (fl.length ? mean(fl.map((x) => f(x) ?? 0)) : null);
  const flPct = (pred) => (fl.length ? fl.filter(pred).length / fl.length : null);
  const flAvgNonNull = (f) => { const v = fl.map(f).filter((y) => y != null); return v.length ? mean(v) : null; };
  const pulk = fl.length ? {
    // CHAOS window [0, chaosEnd]
    maxGapChaos: flA((x) => x.maxGapP1P2_chaos), gapAtChaosEnd: flAvgNonNull((x) => x.gapAtChaosEnd),
    fieldSpreadAtChaosEnd: flAvgNonNull((x) => x.fieldSpreadAtChaosEnd),
    leaderSteered025Pct: flPct((x) => x.leaderSteeredAtChaosEnd),
    leaderSteerMeanMult: flAvgNonNull((x) => x.leaderSteerMeanMult),
    leaderDrawnB1_025Pct: flPct((x) => x.leaderDrawnRankAtChaosEnd != null && x.leaderDrawnRankAtChaosEnd <= 5),
    // PULK window [chaosEnd, 0.60]
    maxLeadHoldShare_mid: flA((x) => x.maxLeadHoldShare_mid), distinctLeaders_mid: flA((x) => x.distinctLeaders_mid),
    leadChanges_mid: flA((x) => x.leadChanges_mid), meanGapP1P2_mid: flA((x) => x.meanGapP1P2_mid),
    maxGapP1P2_mid: flA((x) => x.maxGapP1P2_mid), earlyBreakawayPct: flPct((x) => x.earlyBreakaway),
    leaderIsDrawnB1_mid: flA((x) => x.leaderIsDrawnB1_mid), firstLeadChange: flAvgNonNull((x) => x.firstLeadChangeFromChaosEnd),
    // BRAKE (addendum): trigger-armed share + actual fires + the design gate fraction
    brakeArmed_mid: flAvgNonNull((x) => x.brakeArmed_mid), brakeFires_chaos: flA((x) => x.brakeFires_chaos),
    brakeFires_mid: flA((x) => x.brakeFires_mid), gapCapGateFrac: fl[0]?.gapCapGateFrac ?? null,
    // LAW
    LAW_full: flA((x) => x.LAW_full), LAW_last50: flA((x) => x.LAW_last50),
  } : null;
  const fc = mean(rp.map((r) => r.frontBattle?.frontContestFraction ?? 0));
  const dead = mean(rp.map((r) => ((r.leadChangeCount ?? 0) === 0 ? 1 : 0)));
  // DEAD-BORING = dead race (no P1 change) AND no sustained front contest (frontContest < 0.3); THRILLER = the
  // complement within dead (a dead-by-count race that still held a sustained front contest).
  let boring = 0, thriller = 0;
  for (const r of rp) {
    if ((r.leadChangeCount ?? 0) !== 0) continue;
    if ((r.frontBattle?.frontContestFraction ?? 0) < 0.3) boring++; else thriller++;
  }
  const deadBoring = rp.length ? boring / rp.length : 0;
  const deadThriller = rp.length ? thriller / rp.length : 0;
  const p1MultiSec = mean(rp.map((r) => r.frontBattle?.p1LongestMultiSec ?? 0));
  // NOTE: LAW is UNAVAILABLE on this frozen branch — the LAW/front-autopsy observer was built later on the
  // chain line; porting it would be a code change CONFIRM-1 forbids. Reported as n/a. All other metrics stand.
  // CHAOS-STEER-1 scorecard + steer telemetry (chaosSteer field is attached for every arm, read-only).
  const cs = rp.map((r) => r.chaosSteer).filter(Boolean);
  const inBandEnd = mean(cs.map((c) => (c.nField ? c.inBandEnd / c.nField : 0)));
  const mm = cs.map((c) => c.meanMult).filter((x) => x != null);
  const steerTele = {
    inBandEnd,
    steeredShare: mean(cs.map((c) => (c.nField ? (c.steeredRacers ?? 0) / c.nField : 0))),
    steeredTicks: mean(cs.map((c) => c.steeredTicks ?? 0)),
    meanMult: mm.length ? mean(mm) : null,
    maxTickDelta: cs.length ? Math.max(...cs.map((c) => c.maxTickDelta ?? 0)) : 0,
  };
  return {
    arm: armKey, track: track.id,
    arrival: hm.fairness?.bandReach ?? null, holm: hm.fairness?.startRowUnfair ? 'UNF' : 'ok', rowMin,
    dead, deadBoring, deadThriller, p1MultiSec, closed: track.closed,
    fc, distinctLead: mean(rp.map((r) => r.frontBattle?.distinctLeaders ?? 0)),
    maxLeadHold: mean(rp.map((r) => r.frontBattle?.maxLeadHoldShare ?? 0)),
    steerTele, rowBandReach, rowSteer, pulk,
  };
}

async function pool(tasks) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } })); return out; }

mkdirSync(TMP, { recursive: true });
const t0 = Date.now();
console.log(`\n=== FAIR-ARRIVAL confirm — N=${RACES}/arm/track | ${TRACK_IDS.join(', ')} | ${DUR ? DUR + 's' : 'track-defaults'} | arms ${ARM_KEYS.join(',')} | jobs=${JOBS}${TAG ? ' | tag=' + TAG : ''} ===`);
const tasks = [];
for (const [k, f] of Object.entries(ARMS)) for (const t of TRACKS) tasks.push(() => run(k, f, t));
const all = await pool(tasks);
const get = (a, t) => all.find((r) => r.arm === a && r.track === t);
for (const armKey of Object.keys(ARMS)) {
  console.log(`\n── ${armKey} ──`);
  for (const t of TRACKS) {
    const r = get(armKey, t.id), s = get('ship', t.id);
    const dArr = s ? (r.arrival - s.arrival) * 100 : 0, dFc = s ? (r.fc - s.fc) * 100 : 0, dDB = s ? (r.deadBoring - s.deadBoring) * 100 : 0;
    const sgn = (x) => (x >= 0 ? '+' : '') + x.toFixed(0) + 'pp';
    console.log(`  ${t.id.padEnd(13)}${r.closed ? 'C' : 'O'} | ARRIVAL ${pct(r.arrival)} (${armKey === 'ship' ? '—' : sgn(dArr)}) rowMin ${pct(r.rowMin)} ${r.holm} | fC ${pct(r.fc)} (${armKey === 'ship' ? '—' : sgn(dFc)}) | DEAD ${pct(r.dead)} BORING ${pct(r.deadBoring)} (${armKey === 'ship' ? '—' : sgn(dDB)}) thrill ${pct(r.deadThriller)} | dLead ${r.distinctLead.toFixed(2)} maxHold ${pct(r.maxLeadHold)} p1s ${r.p1MultiSec.toFixed(1)}`);
    // CHAOS-STEER-1 scorecard line: in-band-at-chaos-end (the direct Part-1 number) + delta vs ship, and steer telemetry.
    const st = r.steerTele, ss = s?.steerTele;
    const dIB = ss ? (st.inBandEnd - ss.inBandEnd) * 100 : 0;
    console.log(`     └chaos-end in-band ${pct(st.inBandEnd)} (${armKey === 'ship' ? '—' : sgn(dIB)}) | steer: share ${pct(st.steeredShare)} · ticks/race ${st.steeredTicks.toFixed(0)} · meanMult ${st.meanMult == null ? 'n/a' : st.meanMult.toFixed(3)} · maxTickΔ ${st.maxTickDelta.toFixed(4)}`);
    // PULK-SPECTACLE-1: chaos / pulk / brake windows (the owner's mid-race-flat finding).
    const p = r.pulk;
    if (p) {
      const f1 = (x) => (x == null ? 'n/a' : x.toFixed(1)), f2 = (x) => (x == null ? 'n/a' : x.toFixed(2));
      console.log(`     └CHAOS | maxGap ${f1(p.maxGapChaos)}L · handover@end ${f1(p.gapAtChaosEnd)}L · fieldSpread ${f1(p.fieldSpreadAtChaosEnd)}L · leaderSteered ${pct(p.leaderSteered025Pct)}(mult ${f2(p.leaderSteerMeanMult)}) · leaderDrawnB1 ${pct(p.leaderDrawnB1_025Pct)}`);
      console.log(`     └PULK  | maxHold ${f2(p.maxLeadHoldShare_mid)} · distinctLead ${f1(p.distinctLeaders_mid)} · earlyBreak ${pct(p.earlyBreakawayPct)} · leaderDrawnB1_mid ${f2(p.leaderIsDrawnB1_mid)} · meanGap ${f1(p.meanGapP1P2_mid)}L · 1stLeadChg ${f2(p.firstLeadChange)}`);
      console.log(`     └BRAKE | armed_mid ${f2(p.brakeArmed_mid)} · fires chaos/mid ${f1(p.brakeFires_chaos)}/${f1(p.brakeFires_mid)} · gate ${f2(p.gapCapGateFrac)} · LAW ${f2(p.LAW_full)}/${f2(p.LAW_last50)}`);
    }
    // ROW-SKEW DIAGNOSIS: per-start-row band-reach (all arms) + per-row steer exposure (steer/combo arms).
    const rows = [...new Set([...r.rowBandReach.keys()])].filter((i) => r.rowBandReach[i] != null);
    const brLine = rows.map((i) => `r${i}:${pct(r.rowBandReach[i])}`).join(' ');
    console.log(`     └row band-reach | ${brLine}`);
    if (Object.keys(r.rowSteer).length) {
      const exLine = Object.keys(r.rowSteer).sort((a, b) => a - b).map((row) => {
        const a = r.rowSteer[row];
        const share = a.n ? a.steered / a.n : 0, mm = a.ticks ? a.multSum / a.ticks : null;
        return `r${row}:steer${(share * 100).toFixed(0)}%/mult${mm == null ? '—' : mm.toFixed(3)}`;
      }).join(' ');
      console.log(`     └row steer-exposure | ${exLine}`);
    }
  }
}
// ── FAIR-ARRIVAL-GATE (preregistered, binding at N=100). Candidate arm = --gate-arm (default combo15).
// Per track vs SHIP: A arrival [(≥ship+10pp OR ≥88% abs) AND ≥ship] · R rowMin≥ship · F fC≥ship−2pp ·
// B DEAD-BORING≤ship+2pp · P PULK WATCHDOG [maxLeadHoldShare_mid≤ship+5pp AND distinctLeaders_mid≥ship−1
// AND chaos maxGap≤ship+1.0L]. PASS = arrival OR-form on ≥8/10 & no track failing both forms & never below
// ship; R/F/B/P everywhere; Holm not worsened on any watchlist track.
const GATE_ARM = argVal('gate-arm', 'combo15');
if (ARM_KEYS.includes(GATE_ARM)) {
  const mk = (b) => (b ? '✓' : '✗');
  const f1 = (x) => (x == null ? 'n/a' : x.toFixed(1));
  console.log(`\n=== FAIR-ARRIVAL-GATE (${GATE_ARM} vs SHIP, N=${RACES}, per track) ===`);
  console.log(`  track            | arrival S→C | A | rowMin S→C · Holm | R | fC S→C | F | BORING S→C | B | PULK maxHold/distLead/chaosGap S→C | P | PASS`);
  let arrivalOK = 0, failBoth = 0, belowShip = 0;
  const failEverywhere = { R: [], F: [], B: [], P: [] }, holmWorse = [];
  const rows = [];
  for (const t of TRACKS) {
    const s = get('ship', t.id), c = get(GATE_ARM, t.id);
    const aDelta = c.arrival >= s.arrival + 0.10, aAbs = c.arrival >= 0.88, notBelow = c.arrival >= s.arrival - 1e-9;
    const A = (aDelta || aAbs) && notBelow;
    if (A) arrivalOK++; if (notBelow && !aDelta && !aAbs) failBoth++; if (!notBelow) belowShip++;
    const R = c.rowMin >= s.rowMin - 1e-9; if (!R) failEverywhere.R.push(t.id);
    const F = c.fc >= s.fc - 0.02; if (!F) failEverywhere.F.push(t.id);
    const B = c.deadBoring <= s.deadBoring + 0.02; if (!B) failEverywhere.B.push(t.id);
    // PULK WATCHDOG (the owner's finding as a permanent gate line).
    const sp = s.pulk, cp = c.pulk;
    const pHold = cp.maxLeadHoldShare_mid <= sp.maxLeadHoldShare_mid + 0.05;
    const pDist = cp.distinctLeaders_mid >= sp.distinctLeaders_mid - 1;
    const pGap = cp.maxGapChaos <= sp.maxGapChaos + 1.0;
    const P = pHold && pDist && pGap; if (!P) failEverywhere.P.push(t.id);
    // Holm: worsened = ship ok → candidate UNF.
    if (s.holm === 'ok' && c.holm === 'UNF') holmWorse.push(t.id);
    const pass = A && R && F && B && P;
    rows.push({ t, s, c, A, R, F, B, P, pass, aDelta, aAbs, sp, cp });
    console.log(`  ${t.id.padEnd(15)}${c.closed ? 'C' : 'O'}| ${pct(s.arrival)}→${pct(c.arrival)}${aDelta ? '' : aAbs ? '*' : '✗'} | ${mk(A)} | ${pct(s.rowMin)}→${pct(c.rowMin)} ${s.holm}/${c.holm} | ${mk(R)} | ${pct(s.fc)}→${pct(c.fc)} | ${mk(F)} | ${pct(s.deadBoring)}→${pct(c.deadBoring)} | ${mk(B)} | ${cp.maxLeadHoldShare_mid.toFixed(2)}(${(sp.maxLeadHoldShare_mid).toFixed(2)}) ${f1(cp.distinctLeaders_mid)}(${f1(sp.distinctLeaders_mid)}) ${f1(cp.maxGapChaos)}L(${f1(sp.maxGapChaos)}) | ${mk(P)} | ${pass ? 'PASS' : 'FAIL'}`);
  }
  const arrivalGate = arrivalOK >= 8 && failBoth === 0 && belowShip === 0;
  const everywhere = (k) => failEverywhere[k].length === 0;
  const GATE_PASS = arrivalGate && everywhere('R') && everywhere('F') && everywhere('B') && everywhere('P') && holmWorse.length === 0;
  console.log(`\n  ── GATE VERDICT: ${GATE_PASS ? 'PASS' : 'PARTIAL'} ──`);
  console.log(`  arrival: OK-form ${arrivalOK}/10 (need ≥8), failBoth ${failBoth} (need 0), belowShip ${belowShip} (need 0) → ${arrivalGate ? 'PASS' : 'FAIL'}`);
  console.log(`  rowMin≥ship: ${everywhere('R') ? 'PASS' : 'FAIL ' + failEverywhere.R.join(',')} | fC≥ship−2: ${everywhere('F') ? 'PASS' : 'FAIL ' + failEverywhere.F.join(',')} | DEAD-BORING≤ship+2: ${everywhere('B') ? 'PASS' : 'FAIL ' + failEverywhere.B.join(',')}`);
  console.log(`  PULK watchdog: ${everywhere('P') ? 'PASS' : 'FAIL ' + failEverywhere.P.join(',')} | Holm worsened: ${holmWorse.length ? holmWorse.join(',') : 'none'}`);
}
console.log(`\nruntime ${((Date.now() - t0) / 60000).toFixed(1)} min | FAIR-ARRIVAL-GATE (binding at N=${RACES}); gate-arm=${GATE_ARM}`);
