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
const TMP = join(ROOT, 'client/tmp/fair-arrival');
const toOut = (a) => relative(ROOT, a).replace(/\\/g, '/');
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(0) + '%');
const BE = [5, 15, 25, 40];
const zi = (r) => { for (let i = 0; i < BE.length; i++) if (r <= BE[i]) return i; return BE.length; };

const TRACKS = [{ id: 'searound', racer: 'manta' }, { id: 'ice-track', racer: 'snowmobile' }];
// CHAOS-STEER-1: the owner's Part 1 (chaosSteer) measured ALONE vs Ship. faB60 = the band-bias R=0.60 arm,
// carried as CONTEXT only (the FAIR-ARRIVAL-1 draw-bias cache). No combined A+B arm in this run.
const ARMS = {
  ship: [],
  chaosSteer: ['--chaosSteer=true', '--chaosSteerGain=0.06'],
  faB60: ['--bandBias=true', '--bandR=0.60', '--bandBiasGain=0.10'],
};

async function run(armKey, flags, track) {
  const out = join(TMP, `${armKey}__${track.id}`);
  await pExec(process.execPath, [
    'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=1`, `--races=${RACES}`, `--racers=40`, '--track-defaults', ...flags,
    '--runaway-parade', '--hero-map', '--front-autopsy', `--out=${toOut(out)}`,
  ], { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const hm = JSON.parse(readFileSync(join(out, 'hero-map.json'), 'utf8'));
  const rp = JSON.parse(readFileSync(join(out, 'runaway-parade.json'), 'utf8')).races.map((r) => r.runawayParade);
  const fd = JSON.parse(readFileSync(join(out, 'fairness-data.json'), 'utf8'));
  const rr = [], rt = [];
  for (const r of fd.rawData) { const row = r.startRowIndex; rr[row] = (rr[row] ?? 0) + (zi(r.finalRank) === zi(r.sollRank) ? 1 : 0); rt[row] = (rt[row] ?? 0) + 1; }
  const rowMin = Math.min(...rr.map((v, i) => (rt[i] ? v / rt[i] : 1)));
  const fc = mean(rp.map((r) => r.frontBattle?.frontContestFraction ?? 0));
  const dead = mean(rp.map((r) => ((r.leadChangeCount ?? 0) === 0 ? 1 : 0)));
  // DEAD-BORING = dead race (no P1 change) AND no sustained front contest (frontContest < 0.3).
  let boring = 0;
  for (const r of rp) if ((r.leadChangeCount ?? 0) === 0 && (r.frontBattle?.frontContestFraction ?? 0) < 0.3) boring++;
  const deadBoring = rp.length ? boring / rp.length : 0;
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
    dead, deadBoring, fc, distinctLead: mean(rp.map((r) => r.frontBattle?.distinctLeaders ?? 0)),
    maxLeadHold: mean(rp.map((r) => r.frontBattle?.maxLeadHoldShare ?? 0)),
    steerTele,
  };
}

async function pool(tasks) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } })); return out; }

mkdirSync(TMP, { recursive: true });
const t0 = Date.now();
console.log(`\n=== FAIR-ARRIVAL-1 screen — N=${RACES}/arm/track | searound + ice | track-defaults | jobs=${JOBS} ===`);
const tasks = [];
for (const [k, f] of Object.entries(ARMS)) for (const t of TRACKS) tasks.push(() => run(k, f, t));
const all = await pool(tasks);
const get = (a, t) => all.find((r) => r.arm === a && r.track === t);
const ship = { searound: get('ship', 'searound'), 'ice-track': get('ship', 'ice-track') };
for (const armKey of Object.keys(ARMS)) {
  console.log(`\n── ${armKey} ──`);
  for (const t of TRACKS) {
    const r = get(armKey, t.id), s = ship[t.id];
    const dArr = s ? (r.arrival - s.arrival) * 100 : 0, dFc = s ? (r.fc - s.fc) * 100 : 0, dDB = s ? (r.deadBoring - s.deadBoring) * 100 : 0;
    const sgn = (x) => (x >= 0 ? '+' : '') + x.toFixed(0) + 'pp';
    // GATE per track: arrival >= ship+10 (owner gate is >=90% both; report both)
    const gate = r.arrival >= 0.90 && Math.abs(dFc) <= 10 && r.deadBoring <= s.deadBoring;
    console.log(`  ${t.id.padEnd(11)} | ARRIVAL ${pct(r.arrival)} (${armKey === 'ship' ? '—' : sgn(dArr)}) rowMin ${pct(r.rowMin)} ${r.holm} | frontContest ${pct(r.fc)} (${armKey === 'ship' ? '—' : sgn(dFc)}) | DEAD ${pct(r.dead)} DEAD-BORING ${pct(r.deadBoring)} (${armKey === 'ship' ? '—' : sgn(dDB)}) | distinctLead ${r.distinctLead.toFixed(2)} | ${gate ? 'GATE✓' : ''}`);
    // CHAOS-STEER-1 scorecard line: in-band-at-chaos-end (the direct Part-1 number) + delta vs ship, and steer telemetry.
    const st = r.steerTele, ss = s?.steerTele;
    const dIB = ss ? (st.inBandEnd - ss.inBandEnd) * 100 : 0;
    console.log(`     └chaos-end in-band ${pct(st.inBandEnd)} (${armKey === 'ship' ? '—' : sgn(dIB)}) | steer: share ${pct(st.steeredShare)} · ticks/race ${st.steeredTicks.toFixed(0)} · meanMult ${st.meanMult == null ? 'n/a' : st.meanMult.toFixed(3)} · maxTickΔ ${st.maxTickDelta.toFixed(4)}`);
  }
}
console.log(`\nruntime ${((Date.now() - t0) / 60000).toFixed(1)} min | GATE = arrival≥90% AND frontContest within 10pp AND DEAD-BORING≤ship (both tracks)`);
