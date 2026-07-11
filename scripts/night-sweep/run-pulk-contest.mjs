// ============================================================
// run-pulk-contest.mjs — OVERNIGHT FEASIBILITY SWEEP (branch feat/pulk-reopen).
//
// Question: can the reopened PULK window [0.25, 0.5) host a real front contest (M1 = live-P1 brake +
// front-challenger boost) and/or a dense field (M2 = whole-pack cohesion spring) WITHOUT breaking the
// fairness gate (band-reach ≥ 70% AND 0 Holm-unfair start rows)? Both mechanisms are flag-gated + default
// OFF (byte-identical proven separately). This runner ONLY orchestrates — it spawns sim-fairness.mjs per
// cell with the sweep flags + the read-only observers (--hero-map = fairness + hero adherence source;
// --action-metrics = front action + density source), checkpoints one row per cell, and picks winners.
// No physics, no metric math here (mechanisms live in the shared modules; metric math in the observers).
//
// ORCHESTRATION LAYER ONLY. Deterministic (fixed seed). Checkpointed + resumable. Time-budgeted
// (hard-stops new runs at T-30min). Self-contained (matches the established self-contained-runner
// pattern of run-tier1 / run-gapspace — no shared helper existed to reuse; this is documented, not a
// copy-paste of their bodies).
//
// PHASES (drive them in order; each checkpoints independently):
//   --phase=grid1  A0 baseline + M1×3 + M2×3, across the 4 Phase-1 tracks (50 races/cell).
//   --phase=analyze1   rank grid1 arms, apply the fairness gate, write the ≤4 C-combos + winner picks.
//   --phase=combo  run the C-combos from analyze1 across the 4 Phase-1 tracks.
//   --phase=phase2 run the overall winner across ALL tracks (default 300 races/track).
//
// Usage: node scripts/night-sweep/run-pulk-contest.mjs --phase=grid1 [--races=50] [--conc=12] [--budgetMin=360]
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { cpus } from 'os';
import { summarizeHeroAdherence } from '../sim/observers/hero-adherence.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');

const argv = process.argv.slice(2);
const arg = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const PHASE = arg('phase', 'grid1');
const CONC = Number(arg('conc', String(Math.max(1, cpus().length - 2))));
const DUR = Number(arg('dur', '60'));
const SEED = Number(arg('seed', '1'));
const BUDGET_MIN = Number(arg('budgetMin', '360')); // hard time budget; new runs stop at T-30min
const T_START = Date.now();
const stopNewRuns = () => (Date.now() - T_START) / 60000 >= BUDGET_MIN - 30;

const OUT = join(ROOT, 'results', 'pulk-contest-sweep');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'pulk-contest');
mkdirSync(TMP, { recursive: true });

// ── Tracks: Phase 1 = 2 open + 2 closed (prior-gate set); Phase 2 = all shipped. Default racer read
// from the track JSON (never hardcoded — memory rule). ──
const P1_TRACKS = ['mountainstreet', 'luger-hill', 'searound', 'dirt-oval']; // open, open, closed, closed
const ALL_TRACKS = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit',
  'luger-hill', 'ice-track', 'mountainstreet', 'searound', 'seatrack'];
function defaultRacerFor(trackId) {
  const j = JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${trackId}.json`), 'utf8'));
  return j.defaultRacerTypeId || j.defaultRacerType || null;
}

// ── ARM TABLE — the SINGLE SOURCE of every strength/gain/dead-zone. Nothing below repeats a literal. ──
// M1: leader-brake magnitude, COUPLED 1:1 to the challenger-boost cap (a symmetric two-sided contest).
//   0.05/0.10/0.15 = weak/med/strong, inside the documented leaderBrake ≤ 0.15 range (defaults.js).
// M2: spring gain weak/med/strong around the shipped pulk-bias gain 2.0; dead zone ~1 racer length.
const M1_BRAKE = { weak: 0.05, med: 0.10, strong: 0.15 };
const M2_GAIN = { weak: 1.0, med: 2.0, strong: 4.0 };
const M2_DEADZONE = 1.0; // racer lengths
// Fixed sweep config (documented): v4 ON, reopened PULK [0.25, 0.5), shipped PULK boni (0), shipped
// density band (±8.1%). governorDirectorEnabled=false is explicit (v4 gates the reactive director off).
const DEFAULT_PULK_END = 0.5; // reopened PULK end / OUTCOME start (owner-tested); overridable per cell
const BASE_FLAGS = [
  '--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkStart=0.25', '--bonusMult=2.0',
  '--baseSpeedMin=0.00096', '--baseSpeedMax=0.00113',
]; // NB: directorV4OutcomeStart (PULK end) is added PER CELL (cell.pulkEnd) so the pulkwidth phase can vary it
function m1Flags(brake) {
  return ['--governorDirectorPulkContestEnabled=true', `--governorDirectorLeaderBrake=${brake}`,
    `--governorDirectorChallengerBoost=${brake}`];
}
function m2Flags(gain) {
  return ['--pulkSpringEnabled=true', `--pulkSpringGain=${gain}`, `--pulkSpringDeadZoneLengths=${M2_DEADZONE}`];
}
// Build the arm set for a phase. Each arm = {arm, label, flags}.
function grid1Arms() {
  const arms = [{ arm: 'A0', label: 'A0-baseline', flags: [] }];
  for (const [k, v] of Object.entries(M1_BRAKE)) arms.push({ arm: `M1-${k}`, label: `M1-${k}-b${v}`, flags: m1Flags(v) });
  for (const [k, v] of Object.entries(M2_GAIN)) arms.push({ arm: `M2-${k}`, label: `M2-${k}-g${v}`, flags: m2Flags(v) });
  return arms;
}

// ── Cell run + summarise ────────────────────────────────────────────────────────
const median = (a) => { const v = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const p90 = (a) => { const v = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); const n = v.length; return n ? v[Math.min(n - 1, Math.ceil(0.9 * n) - 1)] : null; };
const r3 = (v) => (v == null ? null : +v.toFixed(3));

function cellArgs(cell, nRaces) {
  return [
    SIM,
    `--track=${cell.track}`, `--racer=${cell.racer}`, `--dur=${DUR}`, `--races=${nRaces}`, `--seed=${SEED}`,
    ...BASE_FLAGS, `--directorV4OutcomeStart=${cell.pulkEnd ?? DEFAULT_PULK_END}`, ...cell.flags,
    '--hero-map', '--action-metrics', `--diagLabel=${cell.id}`, '--skip-main-output',
    `--out=client/tmp/pulk-contest/${cell.id}`,
  ];
}
function runCell(cell, nRaces) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, cellArgs(cell, nRaces), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => resolve({ ok: false, err: e.message }));
    child.on('close', (code) => {
      const hmPath = join(TMP, cell.id, 'hero-map.json');
      const amPath = join(ROOT, 'results', 'action-metrics', `am-${cell.id}.json`);
      if (code !== 0 || !existsSync(hmPath) || !existsSync(amPath)) {
        return resolve({ ok: false, err: `exit ${code}; hm=${existsSync(hmPath)} am=${existsSync(amPath)}${stderr ? ' | ' + stderr.slice(-250) : ''}` });
      }
      try {
        const hm = JSON.parse(readFileSync(hmPath, 'utf8'));
        const am = JSON.parse(readFileSync(amPath, 'utf8'));
        resolve({ ok: true, hm, am });
      } catch (e) { resolve({ ok: false, err: `parse: ${e.message}` }); }
      try { rmSync(join(TMP, cell.id), { recursive: true, force: true }); } catch { /* ignore */ }
    });
  });
}
function summarizeCell(cell, hm, am, nRaces) {
  const f = hm.fairness || {};
  const races = (am.combos?.[0]?.races) || []; // per-race actionMetrics (this cell = one combo)
  const pull = (k) => races.map((r) => r[k]);
  const ha = summarizeHeroAdherence(hm.perHero || []);
  return {
    id: cell.id, arm: cell.arm, track: cell.track, racer: cell.racer, open: cell.open, nRaces,
    // FAIRNESS (hard gate)
    bandReach: f.bandReach, startRowUnfair: f.startRowUnfair, startRowMinPHolm: f.startRowMinPHolm,
    nativeWinP: f.nativeWinChiSqP, nativeWinUnfair: f.nativeWinUnfair,
    // FRONT ACTION (PULK window)
    distinctP1PulkMed: median(pull('distinctP1Pulk')), distinctP1PulkP90: p90(pull('distinctP1Pulk')),
    heldTop5Med: median(pull('heldTop5Overtakes')), heldTop5P90: p90(pull('heldTop5Overtakes')),
    frontTop5TurnoverMed: median(pull('frontTop5Turnover')), rankChurnMed: median(pull('rankChurn')),
    // DENSITY (racer lengths; PULK window)
    linkGapP90Med: r3(median(pull('maxLinkGapLenP90'))), linkGapP90P90: r3(p90(pull('maxLinkGapLenP90'))),
    linkGapMaxMed: r3(median(pull('maxLinkGapLenMax'))), linkGapMaxP90: r3(p90(pull('maxLinkGapLenMax'))),
    spreadLenMed: r3(median(pull('spreadLenP10P90'))),
    // HERO STORY ADHERENCE (from hero-map perHero via the observer) + hero-map aggregate
    heroResolvedBandRate: ha.resolvedBandRate, heroRoleRealizedRate: ha.roleRealizedRate,
    heroMeanClimbFrac: ha.meanClimbFrac, heroComeback: ha.comeback, heroFaller: ha.faller,
    heroShortfallRate: hm.heroAgg?.shortfallRate ?? null, heroesPerRace: hm.heroAgg?.heroesPerRace ?? null,
    realOvertakesMean: hm.heroAgg?.realOvertakesMean ?? null,
  };
}

// ── Checkpoint / resume ──────────────────────────────────────────────────────────
function ckptPath(phase) { return join(OUT, `${phase}.jsonl`); }
function loadDone(phase) {
  const done = new Set(); const rows = [];
  const p = ckptPath(phase);
  if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split('\n')) { if (l.trim()) try { const j = JSON.parse(l); done.add(j.id); rows.push(j); } catch { /* ignore */ } }
  return { done, rows };
}
const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(0) + '%');
const fx = (v) => (v == null ? 'n/a' : (+v).toFixed(2));

async function runCells(phase, cells, nRaces) {
  const { done } = loadDone(phase);
  const todo = cells.filter((c) => !done.has(c.id));
  console.log(`[${phase}] ${todo.length}/${cells.length} cells (${done.size} done) | races=${nRaces} conc=${CONC} budget=${BUDGET_MIN}min`);
  let idx = 0, fin = 0;
  const live = new Set();
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const p of live) try { process.kill(p, 'SIGKILL'); } catch { /* ignore */ } process.exit(1); });
  async function worker() {
    while (idx < todo.length) {
      if (stopNewRuns()) { console.log(`  [${phase}] T-30min budget guard — stopping new runs.`); return; }
      const cell = todo[idx++];
      const r = await runCell(cell, nRaces);
      fin++;
      const el = ((Date.now() - T_START) / 1000).toFixed(0);
      if (!r.ok) { appendFileSync(ckptPath(phase), JSON.stringify({ id: cell.id, arm: cell.arm, track: cell.track, error: String(r.err).slice(0, 250) }) + '\n'); console.log(`  [${fin}/${todo.length} ${el}s] ERR ${cell.id} — ${String(r.err).slice(0, 90)}`); continue; }
      const row = summarizeCell(cell, r.hm, r.am, nRaces);
      appendFileSync(ckptPath(phase), JSON.stringify(row) + '\n');
      console.log(`  [${fin}/${todo.length} ${el}s] OK ${cell.id.padEnd(26)} band=${pct(row.bandReach)} unfair=${row.startRowUnfair} P1pulk=${fx(row.distinctP1PulkMed)} held5=${fx(row.heldTop5Med)} linkP90=${fx(row.linkGapP90Med)} heroBand=${pct(row.heroResolvedBandRate)}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
  console.log(`[${phase}] done in ${((Date.now() - T_START) / 1000).toFixed(0)}s → ${ckptPath(phase)}`);
}

// ── Fairness gate + ranking ──────────────────────────────────────────────────────
// An ARM passes iff the gate holds on ALL its tracks: bandReach ≥ 0.70 AND startRowUnfair === false.
function armPasses(rows) {
  return rows.length > 0 && rows.every((r) => !r.error && r.bandReach != null && r.bandReach >= 0.70 && r.startRowUnfair === false);
}
const meanOf = (rows, k) => { const v = rows.map((r) => r[k]).filter((x) => Number.isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
function armSummary(arm, rows) {
  return {
    arm, nTracks: rows.length, passes: armPasses(rows),
    minBandReach: Math.min(...rows.map((r) => r.bandReach ?? 0)),
    anyStartRowUnfair: rows.some((r) => r.startRowUnfair === true),
    distinctP1PulkMean: meanOf(rows, 'distinctP1PulkMed'),
    heldTop5Mean: meanOf(rows, 'heldTop5Med'),
    linkGapP90Mean: meanOf(rows, 'linkGapP90Med'),
    heroResolvedBandMean: meanOf(rows, 'heroResolvedBandRate'),
    heroRoleRealizedMean: meanOf(rows, 'heroRoleRealizedRate'),
  };
}
// Rank passers by front action: distinct P1 (PULK) first, held top-5 second, gap p90 ≤ 4 as tiebreaker.
function rankPassers(summ) {
  return summ.filter((s) => s.passes).sort((a, b) => {
    if ((b.distinctP1PulkMean ?? 0) !== (a.distinctP1PulkMean ?? 0)) return (b.distinctP1PulkMean ?? 0) - (a.distinctP1PulkMean ?? 0);
    if ((b.heldTop5Mean ?? 0) !== (a.heldTop5Mean ?? 0)) return (b.heldTop5Mean ?? 0) - (a.heldTop5Mean ?? 0);
    const aTie = (a.linkGapP90Mean ?? 99) <= 4 ? 1 : 0, bTie = (b.linkGapP90Mean ?? 99) <= 4 ? 1 : 0;
    return bTie - aTie;
  });
}

function analyze1() {
  const { rows } = loadDone('grid1');
  const byArm = new Map();
  for (const r of rows) { if (!byArm.has(r.arm)) byArm.set(r.arm, []); byArm.get(r.arm).push(r); }
  const summ = [...byArm.entries()].map(([arm, rs]) => armSummary(arm, rs));
  const a0 = summ.find((s) => s.arm === 'A0');
  const m1 = rankPassers(summ.filter((s) => s.arm.startsWith('M1')));
  const m2 = rankPassers(summ.filter((s) => s.arm.startsWith('M2')));
  // C-combos: best (up to 2) passing M1 × best (up to 2) passing M2 → ≤4 combos.
  const brakeOf = (arm) => M1_BRAKE[arm.split('-')[1]];
  const gainOf = (arm) => M2_GAIN[arm.split('-')[1]];
  const combos = [];
  for (const a of m1.slice(0, 2)) for (const b of m2.slice(0, 2)) {
    combos.push({ id: `C-${a.arm}_${b.arm}`, m1: a.arm, m2: b.arm, brake: brakeOf(a.arm), gain: gainOf(b.arm) });
  }
  // Overall Phase-1 winner candidate = best passing arm across ALL arms (single mechanisms only here;
  // combos are evaluated in --phase=combo, then --phase=phase2 re-picks over grid1+combo).
  const allRanked = rankPassers(summ);
  const analysis = { a0, m1Ranked: m1, m2Ranked: m2, allRanked, combos, generatedFrom: 'grid1' };
  writeFileSync(join(OUT, 'analyze1.json'), JSON.stringify(analysis, null, 2));
  console.log('\n[analyze1] arm summary (✔ = passes fairness on all 4 tracks):');
  for (const s of summ.sort((a, b) => (b.distinctP1PulkMean ?? 0) - (a.distinctP1PulkMean ?? 0)))
    console.log(`  ${s.passes ? 'PASS' : 'FAIL'} ${s.arm.padEnd(10)} minBand=${pct(s.minBandReach)} P1pulk=${fx(s.distinctP1PulkMean)} held5=${fx(s.heldTop5Mean)} linkP90=${fx(s.linkGapP90Mean)} heroBand=${pct(s.heroResolvedBandMean)} heroRole=${pct(s.heroRoleRealizedMean)}`);
  console.log(`\n[analyze1] passing M1: ${m1.map((s) => s.arm).join(', ') || 'NONE'} | passing M2: ${m2.map((s) => s.arm).join(', ') || 'NONE'}`);
  console.log(`[analyze1] C-combos (≤4): ${combos.map((c) => c.id).join(', ') || 'NONE'} → analyze1.json`);
  return analysis;
}

function comboArms() {
  const a = JSON.parse(readFileSync(join(OUT, 'analyze1.json'), 'utf8'));
  return a.combos.map((c) => ({ arm: c.id, label: c.id, flags: [...m1Flags(c.brake), ...m2Flags(c.gain)] }));
}

// Pick the overall winner over grid1 + combo checkpoints (fairness-passing, best front action).
function pickWinner() {
  const rows = [...loadDone('grid1').rows, ...loadDone('combo').rows];
  const byArm = new Map();
  for (const r of rows) { if (r.error) continue; if (!byArm.has(r.arm)) byArm.set(r.arm, []); byArm.get(r.arm).push(r); }
  const summ = [...byArm.entries()].map(([arm, rs]) => armSummary(arm, rs)).filter((s) => s.arm !== 'A0');
  const ranked = rankPassers(summ);
  return { ranked, winner: ranked[0] || null, summ };
}

function armFlagsById(arm) {
  if (arm === 'A0') return [];
  if (arm.startsWith('M1-')) return m1Flags(M1_BRAKE[arm.split('-')[1]]);
  if (arm.startsWith('M2-')) return m2Flags(M2_GAIN[arm.split('-')[1]]);
  if (arm.startsWith('C-')) { const a = JSON.parse(readFileSync(join(OUT, 'analyze1.json'), 'utf8')); const c = a.combos.find((x) => x.id === arm); return [...m1Flags(c.brake), ...m2Flags(c.gain)]; }
  return [];
}

// ── Entry ────────────────────────────────────────────────────────────────────────
async function main() {
  if (PHASE === 'grid1') {
    const cells = [];
    for (const a of grid1Arms()) for (const t of P1_TRACKS)
      cells.push({ id: `g1-${a.arm}-${t}`, arm: a.arm, track: t, racer: defaultRacerFor(t), open: t === 'mountainstreet' || t === 'luger-hill', flags: a.flags });
    await runCells('grid1', cells, Number(arg('races', '50')));
    analyze1();
  } else if (PHASE === 'analyze1') {
    analyze1();
  } else if (PHASE === 'combo') {
    const cells = [];
    for (const a of comboArms()) for (const t of P1_TRACKS)
      cells.push({ id: `cmb-${a.arm}-${t}`, arm: a.arm, track: t, racer: defaultRacerFor(t), open: t === 'mountainstreet' || t === 'luger-hill', flags: a.flags });
    await runCells('combo', cells, Number(arg('races', '50')));
  } else if (PHASE === 'pulkwidth') {
    // DIAGNOSTIC: Phase 1 showed the reopened-PULK BASELINE (A0, OUTCOME-start 0.50) fails the Holm
    // start-row gate on luger-hill/searound — a correction-BUDGET effect (OUTCOME starts late), not a
    // mechanism effect. Does a NARROWER reopened PULK (earlier OUTCOME start) restore baseline fairness
    // while still hosting the M1 contest? Sweep OUTCOME-start ∈ {0.30, 0.35, 0.40} for A0 + M1-med.
    const ENDS = [0.30, 0.35, 0.40];
    const arms = [{ arm: 'A0', flags: [] }, { arm: 'M1-med', flags: m1Flags(M1_BRAKE.med) }];
    const cells = [];
    for (const pe of ENDS) for (const a of arms) for (const t of P1_TRACKS)
      cells.push({ id: `pw-${a.arm}-e${String(pe).replace('.', '')}-${t}`, arm: `${a.arm}@${pe}`, track: t, racer: defaultRacerFor(t), open: t === 'mountainstreet' || t === 'luger-hill', pulkEnd: pe, flags: a.flags });
    await runCells('pulkwidth', cells, Number(arg('races', '100')));
  } else if (PHASE === 'phase2') {
    const forced = arg('winner', null);
    const { winner } = pickWinner();
    const win = forced || winner?.arm;
    if (!win) { console.log('[phase2] NO fairness-passing winner from Phase 1 — do NOT run Phase 2. Run a finer low-strength sweep instead.'); return; }
    console.log(`[phase2] winner = ${win}${forced ? ' (forced)' : ''}`);
    writeFileSync(join(OUT, 'phase2-winner.json'), JSON.stringify({ winner: win, forced: !!forced }, null, 2));
    const flags = armFlagsById(win);
    const cells = [];
    for (const t of ALL_TRACKS)
      cells.push({ id: `p2-${win}-${t}`, arm: win, track: t, racer: defaultRacerFor(t), open: null, flags });
    await runCells('phase2', cells, Number(arg('races', '300')));
  } else {
    console.error(`unknown --phase=${PHASE}`); process.exit(1);
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
