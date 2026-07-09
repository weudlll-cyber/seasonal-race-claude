// ============================================================
// File:        scripts/night-sweep/run-tier1.mjs
// Project:     RaceArena — NIGHT SWEEP (Overtaking Feasibility Map), TIER-1
// Description: Read-only measurement of the REAL v4 mechanism. Spawns sim-fairness.mjs per cell
//              (one track+racer+dur+config) with the clean-baseline flag set + --hero-map, reads the
//              per-cell hero-map.json, and CHECKPOINTS one row per cell to results/tier1/<stage>.jsonl.
//              Parallel worker pool (cores-2). Fail-soft (a broken cell is logged + skipped).
//              Resumable (cells already in the checkpoint are skipped). NO shipped behavior change:
//              every flag defaults to the shipped value except the audited clean-baseline neutralizers
//              (governorDirectorEnabled=false, pulkBiasGain=0) and the read-only --hero-map observer.
//
// Usage:
//   node scripts/night-sweep/run-tier1.mjs --stage=1 [--races=50] [--conc=12] [--dur=60]
//   node scripts/night-sweep/run-tier1.mjs --stage=2 --races=150   (uses best configs from stage 1)
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { cpus } from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..', '..');
const SIM   = join('scripts', 'sim-fairness.mjs'); // relative to ROOT (sim joins OUT under ROOT)

const argv = process.argv.slice(2);
const arg = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const STAGE = Number(arg('stage', '1'));
const N_RACES = Number(arg('races', STAGE === 1 ? '50' : '150'));
const CONC = Number(arg('conc', String(Math.max(1, cpus().length - 2))));
const DUR = Number(arg('dur', '60'));
const SEED = Number(arg('seed', '1'));

const OUT_RESULTS = join(__dir, 'results', 'tier1');
mkdirSync(OUT_RESULTS, { recursive: true });
const TMP_BASE = join(ROOT, 'client', 'tmp', 'ns-tier1');
mkdirSync(TMP_BASE, { recursive: true });

// ── Tracks (Stage 1 = 4; Stage 2 = all 10). defaultRacerTypeId read from the track JSON (never hardcoded). ──
const STAGE1_TRACKS = ['searound', 'dirt-oval', 'mountainstreet', 'luger-hill'];
const ALL_TRACKS = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit',
  'luger-hill', 'ice-track', 'mountainstreet', 'searound', 'seatrack'];
function defaultRacerFor(trackId) {
  const p = join(ROOT, 'server', 'seeds', 'tracks', `${trackId}.json`);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return j.defaultRacerTypeId || j.defaultRacerType || null;
}

// ── Axes ──────────────────────────────────────────────────────────────────────
// DENSITY: absolute base-speed band around the shipped mean 0.001045 (shipped ±8.1%). Wider = more
// spread field (bigger gaps, each place is a real overtake, harder to reach the front); tighter =
// bunched field (deep comeback feasible). This is the field-density axis the brief asks for.
const DENSITY = {
  tight:   { baseSpeedMin: 0.001003, baseSpeedMax: 0.001087 }, // ~±4%
  shipped: { baseSpeedMin: 0.00096,  baseSpeedMax: 0.00113  }, // ~±8.1% (shipped)
  wide:    { baseSpeedMin: 0.00092,  baseSpeedMax: 0.00117  }, // ~±12%
};
// DEPTH proxy: v4 intensity → generator peakDepthFrac 0.15..0.55 of the field + nHeroes 2..4.
const INTENSITY = { shallow: 0.3, mid: 0.6, deep: 0.9 };
// RELEASE proxy: how late B1 heroes are held before the natural-speed finish (lower = released earlier).
const RELEASE = { early: 0.70, medium: 0.85, late: 0.97 };

// ── Grid ────────────────────────────────────────────────────────────────────
function stage1Grid() {
  const cells = [];
  for (const track of STAGE1_TRACKS) {
    const racer = defaultRacerFor(track);
    for (const [dk, d] of Object.entries(DENSITY))
      for (const [ik, iv] of Object.entries(INTENSITY))
        for (const [rk, rv] of Object.entries(RELEASE))
          cells.push({
            id: `${track}__${dk}__i-${ik}__r-${rk}`,
            track, racer, density: dk, intensity: ik, release: rk,
            flags: {
              directorV4Intensity: iv, directorV4ReleaseProgress: rv,
              baseSpeedMin: d.baseSpeedMin, baseSpeedMax: d.baseSpeedMax,
            },
          });
  }
  return cells;
}
// Stage 2: best configs (written by stage 1 as best-configs.json) applied across all 10 tracks.
function stage2Grid() {
  const bcPath = join(OUT_RESULTS, 'best-configs.json');
  if (!existsSync(bcPath)) { console.error('best-configs.json missing — run stage 1 first.'); process.exit(1); }
  const best = JSON.parse(readFileSync(bcPath, 'utf8'));
  const cells = [];
  for (const cfg of best) {
    const d = DENSITY[cfg.density];
    for (const track of ALL_TRACKS) {
      const racer = defaultRacerFor(track);
      cells.push({
        id: `S2__${cfg.name}__${track}`,
        track, racer, density: cfg.density, intensity: cfg.intensity, release: cfg.release, config: cfg.name,
        flags: {
          directorV4Intensity: INTENSITY[cfg.intensity], directorV4ReleaseProgress: RELEASE[cfg.release],
          baseSpeedMin: d.baseSpeedMin, baseSpeedMax: d.baseSpeedMax,
        },
      });
    }
  }
  return cells;
}

const CKPT = join(OUT_RESULTS, `stage${STAGE}.jsonl`);
const ERRLOG = join(OUT_RESULTS, `stage${STAGE}-errors.log`);

// Resume: collect cell ids already checkpointed.
const done = new Set();
if (existsSync(CKPT)) {
  for (const line of readFileSync(CKPT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).id); } catch { /* ignore */ }
  }
}

// ── Clean-baseline flag set (audited) — applied to EVERY cell ──────────────────
function cellArgs(cell) {
  const f = cell.flags;
  return [
    SIM,
    `--track=${cell.track}`, `--racer=${cell.racer}`, `--dur=${DUR}`,
    `--races=${N_RACES}`, `--seed=${SEED}`,
    `--race-plan=true`, `--directorV4Enabled=true`,
    `--governorDirectorEnabled=false`, `--pulkBiasGain=0`,     // clean baseline (audit 1a/1b)
    `--bonusMult=2.0`,                                          // areaBonus kept (load-bearing, audit 1c)
    `--directorV4Intensity=${f.directorV4Intensity}`,
    `--directorV4ReleaseProgress=${f.directorV4ReleaseProgress}`,
    `--baseSpeedMin=${f.baseSpeedMin}`, `--baseSpeedMax=${f.baseSpeedMax}`,
    `--hero-map`, `--skip-main-output`, `--out=client/tmp/ns-tier1/${cell.id}`,
  ];
}

function runCell(cell) {
  return new Promise((resolve) => {
    // stdout ignored (the sim prints verbose report tables we don't need); stderr captured for errors.
    const child = spawn(process.execPath, cellArgs(cell), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => resolve({ ok: false, err: e.message }));
    child.on('close', (code) => {
      const hmPath = join(TMP_BASE, cell.id, 'hero-map.json');
      if (code !== 0 || !existsSync(hmPath)) {
        return resolve({ ok: false, err: `exit ${code}${stderr ? ' | ' + stderr.slice(-300) : ''}` });
      }
      try {
        const hm = JSON.parse(readFileSync(hmPath, 'utf8'));
        resolve({ ok: true, hm });
      } catch (e) { resolve({ ok: false, err: `parse: ${e.message}` }); }
      // free disk: drop the big fairness-data.json + report, keep nothing (checkpoint holds the summary)
      try { rmSync(join(TMP_BASE, cell.id), { recursive: true, force: true }); } catch { /* ignore */ }
    });
  });
}

// ── Worker pool ────────────────────────────────────────────────────────────────
async function main() {
  const cells = (STAGE === 1 ? stage1Grid() : stage2Grid()).filter((c) => !done.has(c.id));
  const total = cells.length;
  console.log(`[tier1 stage ${STAGE}] ${total} cells to run (skipping ${done.size} done) | races=${N_RACES} conc=${CONC} dur=${DUR}s`);
  if (total === 0) { console.log('nothing to do.'); return; }

  let idx = 0, finished = 0;
  const t0 = Date.now();
  async function worker(wid) {
    while (true) {
      const my = idx++;
      if (my >= cells.length) return;
      const cell = cells[my];
      const r = await runCell(cell);
      finished++;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      if (!r.ok) {
        appendFileSync(ERRLOG, `[${new Date().toISOString()}] ${cell.id} :: ${r.err}\n`);
        console.log(`  [${finished}/${total} ${elapsed}s] ERR  ${cell.id} — ${String(r.err).slice(0, 90)}`);
        // still checkpoint a stub so resume doesn't retry endlessly
        appendFileSync(CKPT, JSON.stringify({ id: cell.id, error: String(r.err).slice(0, 200), ...cellMeta(cell) }) + '\n');
        continue;
      }
      const row = summarizeCell(cell, r.hm);
      appendFileSync(CKPT, JSON.stringify(row) + '\n');
      console.log(`  [${finished}/${total} ${elapsed}s] OK   ${cell.id} | band=${pct(row.bandReach)} unfair=${row.startRowUnfair} realOv=${fx(row.realOvertakesMean)} net=${fx(row.placesGainedNetMean)} reachTgt=${pct(row.reachedTargetBandRate)} spdWall=${pct(row.speedWallShare)} trafWall=${pct(row.trafficWallShare)}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, cells.length) }, (_, w) => worker(w)));
  console.log(`[tier1 stage ${STAGE}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);

  if (STAGE === 1) pickBestConfigs();
}

function cellMeta(cell) {
  return { track: cell.track, racer: cell.racer, density: cell.density, intensity: cell.intensity, release: cell.release, config: cell.config };
}
function summarizeCell(cell, hm) {
  const a = hm.heroAgg || {};
  const f = hm.fairness || {};
  return {
    id: cell.id, ...cellMeta(cell),
    bandReach: f.bandReach, startRowUnfair: f.startRowUnfair, startRowMinPHolm: f.startRowMinPHolm,
    heroesPerRace: a.heroesPerRace, nHeroRows: a.nHeroRows,
    anchorRankMean: a.anchorRankMean, finalRankMean: a.finalRankMean,
    placesGainedNetMean: a.placesGainedNetMean, realOvertakesMean: a.realOvertakesMean,
    bestRankMean: a.bestRankMean, reachedTargetBandRate: a.reachedTargetBandRate,
    reachedFrontRate: a.reachedFrontRate, reachedFrontProgMean: a.reachedFrontProgMean,
    reachedTargetProgMean: a.reachedTargetProgMean,
    ceilFracMean: a.ceilFracMean, trafficFracMean: a.trafficFracMean, bothFracMean: a.bothFracMean,
    maxTrajMean: a.maxTrajMean, shortfallRate: a.shortfallRate,
    speedWallShare: a.speedWallShare, trafficWallShare: a.trafficWallShare,
  };
}
const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(0) + '%');
const fx  = (v) => (v == null ? 'n/a' : v.toFixed(2));

// ── Best-config selection (Stage 1 → Stage 2 input) ─────────────────────────────
// A config = (density, intensity, release). Pool its cells across the 4 tracks. Adoption candidate
// must hold FAIRNESS everywhere (bandReach ≥ 0.70 on every track AND no start-row-unfair track) and
// deliver ACTION (mean real overtakes + net places gained). Score = achievable drama within fairness.
function pickBestConfigs() {
  const rows = readFileSync(CKPT, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((r) => !r.error);
  const byCfg = new Map();
  for (const r of rows) {
    const key = `${r.density}__i-${r.intensity}__r-${r.release}`;
    if (!byCfg.has(key)) byCfg.set(key, []);
    byCfg.get(key).push(r);
  }
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const summary = [];
  for (const [key, cells] of byCfg) {
    const bandOk = cells.every((c) => c.bandReach != null && c.bandReach >= 0.70);
    const fairOk = cells.every((c) => c.startRowUnfair === false);
    const [density, i, r] = key.split('__');
    summary.push({
      name: key, density, intensity: i.replace('i-', ''), release: r.replace('r-', ''),
      nTracks: cells.length, bandOk, fairOk,
      minBandReach: Math.min(...cells.map((c) => c.bandReach ?? 0)),
      realOvertakesMean: mean(cells.map((c) => c.realOvertakesMean ?? 0)),
      placesGainedNetMean: mean(cells.map((c) => c.placesGainedNetMean ?? 0)),
      reachedTargetBandRate: mean(cells.map((c) => c.reachedTargetBandRate ?? 0)),
      trafficWallShare: mean(cells.map((c) => c.trafficWallShare ?? 0)),
      speedWallShare: mean(cells.map((c) => c.speedWallShare ?? 0)),
    });
  }
  // Rank: fairness-holding configs first, then by achievable drama (net places gained × reach).
  summary.sort((a, b) => {
    const af = (a.bandOk && a.fairOk) ? 1 : 0, bf = (b.bandOk && b.fairOk) ? 1 : 0;
    if (af !== bf) return bf - af;
    return (b.placesGainedNetMean * b.reachedTargetBandRate) - (a.placesGainedNetMean * a.reachedTargetBandRate);
  });
  writeFileSync(join(OUT_RESULTS, 'stage1-config-summary.json'), JSON.stringify(summary, null, 2));
  const best = summary.filter((s) => s.bandOk && s.fairOk).slice(0, 3);
  const chosen = (best.length ? best : summary.slice(0, 3));
  writeFileSync(join(OUT_RESULTS, 'best-configs.json'), JSON.stringify(chosen, null, 2));
  console.log('\n[tier1] BEST CONFIGS (top 3 for Stage 2):');
  for (const s of chosen) console.log(`  ${s.name} | fair=${s.bandOk && s.fairOk} minBand=${pct(s.minBandReach)} net=${fx(s.placesGainedNetMean)} realOv=${fx(s.realOvertakesMean)} reachTgt=${pct(s.reachedTargetBandRate)}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
