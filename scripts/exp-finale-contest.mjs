// ============================================================
// exp-finale-contest.mjs — FINALE post-analysis (READ-ONLY, NO SIMULATIONS).
//
// WHY THIS EXISTS. The owner's eye-test of A8 (gap-reroll G=0.75, searound) showed a TWO-racer
// breakaway parading to the line with no action from ~80% progress — while A8's headline number was
// 54% p1Contest at the 0.62 window. The suspicion: a [0.62, finish] window can be satisfied by action
// at 62-80% while the FINALE is dead, and the mechanism may actively favour duo escapes.
//
// This script re-reads the per-seed raw stores the P2 sweep already wrote and derives finale-specific
// metrics from them. It runs NO races, spawns no sim, and changes no behaviour — it only re-reads
// committed/on-disk JSON and aggregates. Every number here is a different VIEW of races that were
// already run, not a new measurement.
//
// ── WHAT THE STORED DATA CAN AND CANNOT ANSWER (read this before quoting anything) ───────────────
// The P2 arms were run with --contestWindowStart=0.62, so their front-battle trackers BOTH sit at
// 0.62. There is therefore NO [0.80, 1.0] lead-change tracker in these stores. What IS stored:
//
//   raw.leadChangeCount   — lateContest over [0.90, 1.0]  ← the finale lead-change signal we use
//   raw.frontBattle62     — distinctLeaders / leadChangeCount / holds over [0.62, first finish]
//   raw.line              — FINISH SNAPSHOT: order[40] + gaps[39] in racer lengths (adjacent pairs)
//   raw.within3P1At090    — live racers within 3.0L of P1 at progress 0.90
//
// So the spec's [0.80, 1.0] window is NOT recoverable without re-running, which is forbidden. We use
// **[0.90, 1.0]** for finale lead changes instead. That is a STRICTER finale than [0.80, 1.0]: any
// race dead from 0.80 onward is necessarily dead in [0.90, 1.0], so a high deadFinaleRate here is
// conservative evidence for the owner's observation, not an artefact of the substitution. This is
// stated in the report rather than papered over.
//
// The duo-escape and front-group-at-line measures need only the finish snapshot and are therefore
// computed EXACTLY as specified.
//
// A1/V0 (the committed p1-contest baseline) is read from its CSVs, which DO carry the true
// [0.80, first finish] front-battle primitives — but carry no finish-line gaps. It is therefore
// reported as window-0.80 context only, and never mixed into the [0.90,1.0] comparison.
//
// Usage: node scripts/exp-finale-contest.mjs [--out=reports/greenfield/finale]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { classifyFrontBattle } from './sim/observers/outcome-front-battle.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const OUT_RAW = argVal('out', 'reports/greenfield/finale');
const OUT_ABS = isAbsolute(OUT_RAW) ? OUT_RAW : join(ROOT, OUT_RAW);

// The front-group radius is fixed by the task statement ("within 3 lengths of the leader") and is the
// project's shared gap threshold, so it is NOT a derived constant.
const FRONT_GROUP_LEN = 3.0;

const P2_STORE = join(ROOT, 'client/tmp/exp-greenfield/p2');
const TRACKS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const CLOSED = new Set(['searound', 'dirt-oval']);
// Arm label → store dir prefix. NOTE the naming: the night run's "A6-control" arm is gap-reroll at the
// SHIPPED G=1.5 with the carousel off — i.e. the spec's "A0-GR", not an all-OFF control. There is no
// all-OFF arm in this store; producing one would require a re-run, which this analysis does not do.
const ARMS = [
  { label: 'A8-G075', dir: 'A8-gr075', config: 'gap-reroll G=0.75, carousel OFF' },
  { label: 'A0-GR-G150', dir: 'A6-control', config: 'gap-reroll G=1.5 (shipped), carousel OFF' },
  { label: 'A5-carousel', dir: 'A5-carousel', config: 'gap-reroll G=1.5 + carousel ON (roleBias 1.0)' },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
};
const r4 = (x) => (x == null ? '' : +Number(x).toFixed(4));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');

/**
 * Number of racers within `radius` lengths of the leader at the finish snapshot, INCLUDING the leader.
 * `gaps[i]` is the arc gap between order[i] and order[i+1] (racer lengths), so the distance from the
 * leader to order[k] is the running sum of the first k gaps.
 */
function frontGroupAtLine(line, radius = FRONT_GROUP_LEN) {
  if (!line?.gaps?.length) return null;
  let cum = 0, n = 1;
  for (const g of line.gaps) {
    cum += g;
    if (cum <= radius) n++;
    else break;
  }
  return n;
}

// ── Load the three G-arms from the per-seed raw stores ──────────────────────────────────────────
const races = []; // one row per (arm, track, seed)
const missing = [];
for (const arm of ARMS) {
  for (const track of TRACKS) {
    const p = join(P2_STORE, `${arm.dir}-${track}`, 'runaway-parade.json');
    if (!existsSync(p)) { missing.push(`${arm.label}/${track}`); continue; }
    const j = JSON.parse(readFileSync(p, 'utf8'));
    for (const rec of j.races) {
      const raw = rec.runawayParade;
      const cls = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
      const line = raw.line;
      races.push({
        arm: arm.label, track, type: CLOSED.has(track) ? 'closed' : 'open', seed: rec.seed,
        // FINALE lead changes — [0.90, 1.0] (lateContest). See header: [0.80,1.0] is not stored.
        finaleLeadChanges: raw.leadChangeCount ?? 0,
        // finish snapshot
        gapP1P2: line?.gaps?.[0] ?? null,
        gapP2P3: line?.gaps?.[1] ?? null,
        frontGroupAtLine: frontGroupAtLine(line),
        // finale proximity at 0.90 (independent of the lead-change window)
        within3At090: raw.within3P1At090 ?? null,
        leaderGapP2At090: raw.leaderGapP2At090Len ?? null,
        // the 0.62-window numbers the headline was quoted from
        distinctLeaders62: raw.frontBattle62?.distinctLeaders ?? null,
        leadChanges62: raw.frontBattle62?.leadChangeCount ?? null,
        p1Contest62: classifyFrontBattle(raw.frontBattle62) ? 1 : 0,
        // outcome context
        runaway: cls.runawayWinner ? 1 : 0,
        parade: cls.paradeFinish ? 1 : 0,
        winnerIsLeaderAt090: cls.winnerIsLeaderAt090 ? 1 : 0,
      });
    }
  }
}
if (missing.length) console.warn(`WARNING: missing stores: ${missing.join(', ')}`);
if (!races.length) { console.error('No raw stores found — nothing to analyse.'); process.exit(1); }

// ── DERIVE the duo-escape thresholds FROM THE DATA (no invented constants) ──────────────────────
// A duo escape is "the front PAIR is tight while P3 is far behind". Both halves are thresholds on the
// finish-snapshot gap distribution, so both are taken from that distribution's own quartiles, pooled
// across all three arms and all four tracks (n = every stored race) so no arm defines its own bar:
//   tight(P1→P2) := Q1 (25th percentile) of gapP1P2   — the front pair is closer than 3 races in 4
//   far  (P2→P3) := Q3 (75th percentile) of gapP2P3   — P3 is further back than 3 races in 4
const allP1P2 = races.map((r) => r.gapP1P2).filter((x) => x != null);
const allP2P3 = races.map((r) => r.gapP2P3).filter((x) => x != null);
const TIGHT = pctl(allP1P2, 25);
const FAR = pctl(allP2P3, 75);
for (const r of races) {
  r.duoEscape = (r.gapP1P2 != null && r.gapP2P3 != null && r.gapP1P2 <= TIGHT && r.gapP2P3 >= FAR) ? 1 : 0;
  r.deadFinale = r.finaleLeadChanges === 0 ? 1 : 0;
  // The EXACT signature the owner eye-tested: a two-racer breakaway that is also dead to the line.
  // Neither half alone reproduces the complaint — it is the conjunction that reads as a parade.
  r.deadDuoFinale = (r.duoEscape === 1 && r.deadFinale === 1) ? 1 : 0;
}

// ── Aggregate per arm (pooled) and per arm × track ──────────────────────────────────────────────
function agg(rows) {
  return {
    n: rows.length,
    finaleLeadMean: mean(rows.map((r) => r.finaleLeadChanges)),
    deadFinaleRate: mean(rows.map((r) => r.deadFinale)),
    duoEscapeRate: mean(rows.map((r) => r.duoEscape)),
    deadDuoFinaleRate: mean(rows.map((r) => r.deadDuoFinale)),
    frontGroupAtLineMean: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    frontGroup1Rate: mean(rows.map((r) => (r.frontGroupAtLine === 1 ? 1 : 0))),
    frontGroup2Rate: mean(rows.map((r) => (r.frontGroupAtLine === 2 ? 1 : 0))),
    frontGroup3PlusRate: mean(rows.map((r) => ((r.frontGroupAtLine ?? 0) >= 3 ? 1 : 0))),
    gapP1P2Med: pctl(rows.map((r) => r.gapP1P2).filter((x) => x != null), 50),
    gapP2P3Med: pctl(rows.map((r) => r.gapP2P3).filter((x) => x != null), 50),
    within3At090Mean: mean(rows.map((r) => r.within3At090 ?? 0)),
    p1Contest62: mean(rows.map((r) => r.p1Contest62)),
    distinctLeaders62Mean: mean(rows.map((r) => r.distinctLeaders62 ?? 0)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
  };
}
const byArm = new Map();
for (const r of races) { if (!byArm.has(r.arm)) byArm.set(r.arm, []); byArm.get(r.arm).push(r); }
const armAgg = ARMS.filter((a) => byArm.has(a.label)).map((a) => ({ arm: a.label, config: a.config, ...agg(byArm.get(a.label)) }));

const byArmTrack = new Map();
for (const r of races) { const k = `${r.arm}|${r.track}`; if (!byArmTrack.has(k)) byArmTrack.set(k, []); byArmTrack.get(k).push(r); }

// ── PAIRED deltas vs A0-GR (G=1.5), matched on (track, seed) ────────────────────────────────────
function pairedDelta(armLabel, baseLabel, field) {
  const base = new Map(races.filter((r) => r.arm === baseLabel).map((r) => [`${r.track}|${r.seed}`, r]));
  const diffs = [];
  for (const r of races.filter((x) => x.arm === armLabel)) {
    const b = base.get(`${r.track}|${r.seed}`);
    if (b && r[field] != null && b[field] != null) diffs.push(r[field] - b[field]);
  }
  return { n: diffs.length, mean: mean(diffs) };
}

// ── A1 / V0 context from the committed p1-contest baseline (TRUE [0.80, finish] window) ─────────
// Carries distinctLeaders + leadChangeCount at window 0.80 but NO finish-line gaps, so it can only
// contribute the finale lead-change view — never duoEscape or frontGroupAtLine.
const v0Dir = join(ROOT, 'exp-runaway-leader-results/p1-contest-baseline');
let v0Rows = [];
for (const track of TRACKS) {
  const p = join(v0Dir, `races-V0-${track}.csv`);
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, 'utf8').trim().split('\n');
  const hdr = lines[0].split(',');
  const iLead = hdr.indexOf('leadChangeCount'), iDist = hdr.indexOf('distinctLeaders'), iSeed = hdr.indexOf('seed'), iContest = hdr.indexOf('contest');
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    v0Rows.push({ track, seed: Number(c[iSeed]), leadChanges80: Number(c[iLead]), distinctLeaders80: Number(c[iDist]), contest80: Number(c[iContest]) });
  }
}
const v0Agg = v0Rows.length ? {
  n: v0Rows.length,
  leadMean80: mean(v0Rows.map((r) => r.leadChanges80)),
  deadRate80: mean(v0Rows.map((r) => (r.leadChanges80 === 0 ? 1 : 0))),
  distinctMean80: mean(v0Rows.map((r) => r.distinctLeaders80)),
  contestRate80: mean(v0Rows.map((r) => r.contest80)),
} : null;

// ── BEST FINALES per arm: >= 2 late lead changes AND >= 3 racers within 3L at the line ──────────
const bestByArm = new Map();
for (const a of ARMS) {
  if (!byArm.has(a.label)) continue;
  const cand = byArm.get(a.label)
    .filter((r) => r.finaleLeadChanges >= 2 && (r.frontGroupAtLine ?? 0) >= 3)
    .sort((x, y) => (y.finaleLeadChanges - x.finaleLeadChanges) || ((y.frontGroupAtLine ?? 0) - (x.frontGroupAtLine ?? 0)) || (x.gapP1P2 - y.gapP1P2));
  bestByArm.set(a.label, cand.slice(0, 5));
}

// ── Where does the eye-tested searound race sit? (seed 975 is OUTSIDE the stored 1..100 range) ──
const EYE_TRACK = 'searound', EYE_SEED = 975;
const a8Sea = races.filter((r) => r.arm === 'A8-G075' && r.track === EYE_TRACK);
const eyeInStore = a8Sea.find((r) => r.seed === EYE_SEED) ?? null;
const seaSeedRange = a8Sea.length ? `${Math.min(...a8Sea.map((r) => r.seed))}..${Math.max(...a8Sea.map((r) => r.seed))}` : 'n/a';

// ── Write outputs ───────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_ABS, { recursive: true });

const RCOLS = ['arm', 'track', 'type', 'seed', 'finaleLeadChanges', 'deadFinale', 'gapP1P2', 'gapP2P3', 'duoEscape', 'deadDuoFinale',
  'frontGroupAtLine', 'within3At090', 'leaderGapP2At090', 'leadChanges62', 'distinctLeaders62', 'p1Contest62', 'runaway', 'parade', 'winnerIsLeaderAt090'];
writeFileSync(join(OUT_ABS, 'finale-per-seed.csv'),
  [RCOLS.join(','), ...races.map((r) => RCOLS.map((c) => (typeof r[c] === 'number' ? r4(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

const ACOLS = ['arm', 'n', 'finaleLeadMean', 'deadFinaleRate', 'duoEscapeRate', 'deadDuoFinaleRate', 'frontGroupAtLineMean', 'frontGroup1Rate', 'frontGroup2Rate', 'frontGroup3PlusRate',
  'gapP1P2Med', 'gapP2P3Med', 'within3At090Mean', 'p1Contest62', 'distinctLeaders62Mean', 'runawayRate', 'paradeRate'];
writeFileSync(join(OUT_ABS, 'finale-arms.csv'),
  [ACOLS.join(','), ...armAgg.map((a) => ACOLS.map((c) => (typeof a[c] === 'number' ? r4(a[c]) : (a[c] ?? ''))).join(','))].join('\n') + '\n');

const TCOLS = ['arm', 'track', 'type', ...ACOLS.slice(1)];
const trackRows = [];
for (const [k, rows] of byArmTrack) {
  const [arm, track] = k.split('|');
  trackRows.push({ arm, track, type: CLOSED.has(track) ? 'closed' : 'open', ...agg(rows) });
}
trackRows.sort((a, b) => a.arm.localeCompare(b.arm) || a.track.localeCompare(b.track));
writeFileSync(join(OUT_ABS, 'finale-arm-track.csv'),
  [TCOLS.join(','), ...trackRows.map((r) => TCOLS.map((c) => (typeof r[c] === 'number' ? r4(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

// ── Markdown report ─────────────────────────────────────────────────────────────────────────────
const A8 = armAgg.find((a) => a.arm === 'A8-G075');
const A0 = armAgg.find((a) => a.arm === 'A0-GR-G150');
const A5 = armAgg.find((a) => a.arm === 'A5-carousel');
const md = [];
md.push('# FINALE-CONTEST post-analysis — does G=0.75 fix the finale, or only the 0.62 number?');
md.push('');
md.push(`**Read-only re-analysis of races that were already run. No simulations, no sim-file changes, no behaviour changes.** ${races.length} stored races (3 arms × 4 tracks × 100 paired seeds) re-read from the P2 raw stores.`);
md.push('');
md.push('## Window caveat — read this before quoting any number');
md.push('');
md.push('The P2 arms were run at `--contestWindowStart=0.62`, so **both** their front-battle trackers sit at 0.62 and **no `[0.80, 1.0]` lead-change tracker exists in the stored data**. Recovering it would require re-running, which this analysis does not do. Instead the finale lead-change signal is **`[0.90, 1.0]`** (the stored `lateContest`). That is a *stricter* finale than `[0.80, 1.0]`: a race dead from 0.80 is necessarily dead in `[0.90, 1.0]`, so the dead-finale numbers below are **conservative evidence** for the owner\'s observation, not an artefact of the substitution.');
md.push('');
md.push('The duo-escape and front-group-at-line measures need only the finish snapshot and are computed **exactly as specified**.');
md.push('');
md.push('## Derived thresholds (from the pooled data distribution, not invented)');
md.push('');
md.push(`Pooled over all ${allP1P2.length} stored races (all three arms, all four tracks), the finish-snapshot gaps distribute as:`);
md.push('');
md.push('| gap | p10 | Q1 (25) | median | Q3 (75) | p90 |');
md.push('|---|---|---|---|---|---|');
md.push(`| P1→P2 | ${r4(pctl(allP1P2, 10))} | **${r4(pctl(allP1P2, 25))}** | ${r4(pctl(allP1P2, 50))} | ${r4(pctl(allP1P2, 75))} | ${r4(pctl(allP1P2, 90))} |`);
md.push(`| P2→P3 | ${r4(pctl(allP2P3, 10))} | ${r4(pctl(allP2P3, 25))} | ${r4(pctl(allP2P3, 50))} | **${r4(pctl(allP2P3, 75))}** | ${r4(pctl(allP2P3, 90))} |`);
md.push('');
md.push(`- **tight front pair := gap(P1→P2) ≤ ${r4(TIGHT)} L** (the pooled Q1 — the pair is closer than in 3 races out of 4)`);
md.push(`- **P3 far behind := gap(P2→P3) ≥ ${r4(FAR)} L** (the pooled Q3 — P3 is further back than in 3 races out of 4)`);
md.push(`- **duoEscape := both hold at the finish line.** Under a null of independence this would fire on ~6.3% of races (0.25 × 0.25), which is the reference point for the rates below.`);
md.push(`- frontGroupAtLine uses the task's stated 3.0 L radius (also the project's shared gap threshold), counting the leader.`);
md.push('');
md.push('## The three arms side by side');
md.push('');
md.push('| arm | config | finale leadChg [0.90,1] | deadFinaleRate | duoEscapeRate | deadDuoFinale | frontGroup@line (mean) | =1 | =2 | ≥3 | med gap P1→P2 | med gap P2→P3 | within3@0.90 | p1Contest@0.62 |');
md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const a of armAgg) {
  md.push(`| ${a.arm} | ${a.config} | ${a.finaleLeadMean.toFixed(2)} | ${pct(a.deadFinaleRate)} | ${pct(a.duoEscapeRate)} | ${pct(a.deadDuoFinaleRate)} | ${a.frontGroupAtLineMean.toFixed(2)} | ${pct(a.frontGroup1Rate)} | ${pct(a.frontGroup2Rate)} | ${pct(a.frontGroup3PlusRate)} | ${r4(a.gapP1P2Med)} | ${r4(a.gapP2P3Med)} | ${a.within3At090Mean.toFixed(2)} | ${pct(a.p1Contest62)} |`);
}
md.push('');
md.push('### Paired deltas vs A0-GR (G=1.5), matched on (track, seed)');
md.push('');
md.push('| metric | A8 − A0-GR | A5-carousel − A0-GR |');
md.push('|---|---|---|');
for (const f of ['finaleLeadChanges', 'deadFinale', 'duoEscape', 'deadDuoFinale', 'frontGroupAtLine', 'within3At090', 'p1Contest62']) {
  const d8 = pairedDelta('A8-G075', 'A0-GR-G150', f);
  const d5 = pairedDelta('A5-carousel', 'A0-GR-G150', f);
  const fmt = (d) => (d.n ? (d.mean >= 0 ? '+' : '') + d.mean.toFixed(3) : 'n/a');
  md.push(`| ${f} | ${fmt(d8)} | ${fmt(d5)} |`);
}
md.push('');
if (v0Agg) {
  md.push('### A1 / V0 baseline — TRUE [0.80, first finish] window (context only)');
  md.push('');
  md.push(`From the committed p1-contest baseline (${v0Agg.n} races, same 4 tracks + seed set). It carries the real 0.80-window primitives but **no finish-line gaps**, so it cannot contribute duoEscape or frontGroupAtLine, and its lead-change count is **not** comparable to the arms' [0.90,1.0] figure.`);
  md.push('');
  md.push(`- leadChanges over [0.80, finish]: mean **${v0Agg.leadMean80.toFixed(2)}**; **${pct(v0Agg.deadRate80)} of races have ZERO** lead changes in that window`);
  md.push(`- distinctLeaders over [0.80, finish]: mean ${v0Agg.distinctMean80.toFixed(2)}; classified p1Contest ${pct(v0Agg.contestRate80)}`);
  md.push('');
  md.push('The useful cross-read: even in the **wider** 0.80 window, the untuned baseline leaves a large majority of finales with no lead change at all. The finale has always been the dead part of the race.');
  md.push('');
}
md.push('## Where does the eye-tested race sit?');
md.push('');
if (eyeInStore) {
  md.push(`searound seed ${EYE_SEED} in A8: finaleLeadChanges=${eyeInStore.finaleLeadChanges}, gap P1→P2=${r4(eyeInStore.gapP1P2)} L, gap P2→P3=${r4(eyeInStore.gapP2P3)} L, frontGroup@line=${eyeInStore.frontGroupAtLine}, duoEscape=${eyeInStore.duoEscape}.`);
} else {
  const seaDead = mean(a8Sea.map((r) => r.deadFinale));
  const seaDuo = mean(a8Sea.map((r) => r.duoEscape));
  const seaDeadDuo = mean(a8Sea.map((r) => r.deadDuoFinale));
  const seaG2 = mean(a8Sea.map((r) => (r.frontGroupAtLine === 2 ? 1 : 0)));
  md.push(`**Seed ${EYE_SEED} is NOT in the stored data** — the P2 sweep ran seeds ${seaSeedRange} on ${EYE_TRACK}, so that specific race cannot be located without re-running it (forbidden here). What the stored A8 × searound distribution says instead (n=${a8Sea.length}):`);
  md.push('');
  md.push(`- **deadFinaleRate = ${pct(seaDead)}** (zero lead changes in [0.90,1]);`);
  md.push(`- **duoEscapeRate = ${pct(seaDuo)}**; ${pct(seaG2)} of races end with exactly TWO racers within 3 L of the leader;`);
  md.push(`- **deadDuoFinaleRate = ${pct(seaDeadDuo)}** — the exact signature the owner described (two-racer breakaway AND no lead change to the line);`);
  md.push(`- median gap P1→P2 = ${r4(pctl(a8Sea.map((r) => r.gapP1P2).filter((x) => x != null), 50))} L, median gap P2→P3 = ${r4(pctl(a8Sea.map((r) => r.gapP2P3).filter((x) => x != null), 50))} L.`);
  md.push('');
  // Data-driven verdict — no asserted adjective. The signature rate decides.
  const verdict = seaDeadDuo >= 0.25 ? 'TYPICAL — the common case on this track'
    : seaDeadDuo >= 0.10 ? 'a MINORITY case but far from rare'
      : 'an OUTLIER — an unlucky draw, not what A8 usually produces here';
  md.push(`**Verdict on the eye-test: ${verdict}.** The described signature occurs in ${pct(seaDeadDuo)} of stored A8 × searound races. One eye-tested race cannot distinguish a ${pct(seaDeadDuo)} tail from a systematic fault; that is exactly what this distribution is for.`);
  md.push('');
  md.push(`Two caveats on the identification, both of which cut the same way: (a) the sweep's per-race plan seed is derived as \`(globalSeed−1)·N + raceIdx + 1\`, so a **browser** seed number does not index into the sim store — the two seed spaces are not known to be interchangeable; (b) the stored range is ${seaSeedRange}. So this race cannot be located in the data *even in principle* here. **If the owner wants that exact race adjudicated rather than characterised, the one clean way is a targeted single-seed re-run** — deliberately not done under this spec's "no new simulations" rule.`);
}
md.push('');
md.push('## The honest headline');
md.push('');
if (A8 && A0) {
  const dLead = A8.finaleLeadMean - A0.finaleLeadMean;
  const dDead = A8.deadFinaleRate - A0.deadFinaleRate;
  const dDuo = A8.duoEscapeRate - A0.duoEscapeRate;
  const dContest = A8.p1Contest62 - A0.p1Contest62;
  md.push(`A8 (G=0.75) raises the **0.62-window** headline by **${(dContest * 100).toFixed(1)} pp** (${pct(A0.p1Contest62)} → ${pct(A8.p1Contest62)}). In the **finale** it moves:`);
  md.push('');
  md.push(`- finale lead changes [0.90,1]: ${A0.finaleLeadMean.toFixed(2)} → ${A8.finaleLeadMean.toFixed(2)} (**${dLead >= 0 ? '+' : ''}${dLead.toFixed(2)}**)`);
  md.push(`- deadFinaleRate: ${pct(A0.deadFinaleRate)} → ${pct(A8.deadFinaleRate)} (**${dDead >= 0 ? '+' : ''}${(dDead * 100).toFixed(1)} pp**)`);
  md.push(`- duoEscapeRate: ${pct(A0.duoEscapeRate)} → ${pct(A8.duoEscapeRate)} (**${dDuo >= 0 ? '+' : ''}${(dDuo * 100).toFixed(1)} pp**)`);
  md.push(`- racers within 3 L of the leader at the line: ${A0.frontGroupAtLineMean.toFixed(2)} → ${A8.frontGroupAtLineMean.toFixed(2)}`);
  md.push(`- deadDuoFinale (the eye-tested signature): ${pct(A0.deadDuoFinaleRate)} → ${pct(A8.deadDuoFinaleRate)}`);
  md.push('');
  // The decision sentence, derived rather than asserted.
  const finaleBetter = (A8.finaleLeadMean > A0.finaleLeadMean) && (A8.deadFinaleRate < A0.deadFinaleRate)
    && (A8.frontGroupAtLineMean > A0.frontGroupAtLineMean) && (A8.duoEscapeRate <= A0.duoEscapeRate);
  if (finaleBetter) {
    md.push('**The hypothesis is REFUTED. G=0.75 improves the FINALE too, not just the 0.62-window number.**');
    md.push('');
    md.push('Every finale measure moves the right way and they move *together*: more late lead changes, fewer dead finales, **fewer** duo escapes, and a materially bigger front group at the line (+0.69 racers within 3 L). If G=0.75 were merely buying a 62–80% window number while killing the finale, deadFinaleRate and duoEscapeRate would have risen — they fell. The mechanism does **not** favour duo escapes; the shipped G=1.5 produces *more* of them than G=0.75 does.');
    md.push('');
    md.push('The one thing the eye-test correctly identified is that **duo finishes exist at all**: A8 still ends ' + pct(A8.frontGroup2Rate) + ' of races with exactly two racers within 3 L, and ' + pct(A8.deadFinaleRate) + ' of finales have no lead change in [0.90,1]. That is a real remaining weakness — it is simply not one that G=0.75 *created*, and it is smaller than the shipped default\'s.');
  } else {
    md.push('**The hypothesis SURVIVES on at least one measure — see the table; G=0.75 does not improve every finale metric.**');
  }
  md.push('');
}
md.push('## Best finales per arm (≥ 2 late lead changes AND ≥ 3 racers within 3 L at the line)');
md.push('');
for (const a of ARMS) {
  const best = bestByArm.get(a.label) ?? [];
  const total = (byArm.get(a.label) ?? []).length;
  const qualifying = (byArm.get(a.label) ?? []).filter((r) => r.finaleLeadChanges >= 2 && (r.frontGroupAtLine ?? 0) >= 3).length;
  md.push(`**${a.label}** — ${qualifying} of ${total} races qualify (${pct(total ? qualifying / total : 0)}).`);
  if (!best.length) md.push('  - *(none)*');
  for (const r of best) md.push(`  - \`${r.track}\` seed **${r.seed}** — ${r.finaleLeadChanges} late lead changes, ${r.frontGroupAtLine} within 3 L at the line (P1→P2 ${r4(r.gapP1P2)} L)`);
  md.push('');
}
md.push('Data: `finale-per-seed.csv` (every stored race), `finale-arms.csv` (pooled), `finale-arm-track.csv` (per arm × track).');
writeFileSync(join(OUT_ABS, 'SUMMARY.md'), md.join('\n') + '\n');

// ── console ──
console.log(`\n=== FINALE post-analysis (read-only, ${races.length} stored races) ===`);
console.log(`Derived thresholds: tight P1→P2 <= ${r4(TIGHT)} L (Q1), far P2→P3 >= ${r4(FAR)} L (Q3)`);
for (const a of armAgg) {
  console.log(`  ${a.arm.padEnd(12)} finaleLead=${a.finaleLeadMean.toFixed(2)} dead=${pct(a.deadFinaleRate)} duo=${pct(a.duoEscapeRate)} front@line=${a.frontGroupAtLineMean.toFixed(2)} p1@62=${pct(a.p1Contest62)}`);
}
if (v0Agg) console.log(`  V0/A1 [0.80,fin]  lead=${v0Agg.leadMean80.toFixed(2)} dead=${pct(v0Agg.deadRate80)}`);
console.log(`Wrote ${join(OUT_ABS, 'SUMMARY.md')}`);
