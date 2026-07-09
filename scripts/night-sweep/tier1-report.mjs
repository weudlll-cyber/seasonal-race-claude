// ============================================================
// scripts/night-sweep/tier1-report.mjs
// Turns the TIER-1 checkpoint (stage1.jsonl / stage2.jsonl) into human-readable Markdown tables for
// the morning report: the Stage-1 MAP (places gained per release × depth × density, with the
// speed/traffic wall split + fairness column) and the Stage-2 cross-track fairness/action table.
// Pure reader — no sim, no side effects on the sweep.
// Usage: node scripts/night-sweep/tier1-report.mjs [--stage=1|2]
// ============================================================
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const RES = join(__dir, 'results', 'tier1');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const STAGE = arg('stage', '1');

function load(stage) {
  const p = join(RES, `stage${stage}.jsonl`);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((r) => !r.error);
}
const pct = (v) => (v == null ? '—' : (v * 100).toFixed(0) + '%');
const fx  = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d));

const RELEASE_ORDER = ['early', 'medium', 'late'];
const INT_ORDER = ['shallow', 'mid', 'deep'];
const DENS_ORDER = ['tight', 'shipped', 'wide'];

function stage1Tables(rows) {
  const tracks = [...new Set(rows.map((r) => r.track))];
  let out = '### Stage-1 MAP — real overtakes / net places gained, per track\n\n';
  out += 'Headline = **realOvertakes** (real whole-field passes) | **net** (net places anchor→final) | '
      + '**reachTgt** (fraction of heroes finishing in their target band) | **wall** (S=speed / T=traffic dominant among heroes that fell short) | **band** (band-reach) | **unfair** (start-row Holm).\n\n';
  for (const track of tracks) {
    out += `#### ${track}\n\n`;
    out += '| density | depth | release | realOv | net | reachTgt | ceilFrac | trafFrac | wall | band | unfair |\n';
    out += '|---|---|---|--:|--:|--:|--:|--:|:--:|--:|:--:|\n';
    const tr = rows.filter((r) => r.track === track);
    tr.sort((a, b) => DENS_ORDER.indexOf(a.density) - DENS_ORDER.indexOf(b.density)
      || INT_ORDER.indexOf(a.intensity) - INT_ORDER.indexOf(b.intensity)
      || RELEASE_ORDER.indexOf(a.release) - RELEASE_ORDER.indexOf(b.release));
    for (const r of tr) {
      const wall = (r.speedWallShare == null && r.trafficWallShare == null) ? '—'
        : (r.trafficWallShare >= r.speedWallShare ? `T ${pct(r.trafficWallShare)}` : `S ${pct(r.speedWallShare)}`);
      out += `| ${r.density} | ${r.intensity} | ${r.release} | ${fx(r.realOvertakesMean)} | ${fx(r.placesGainedNetMean)} | ${pct(r.reachedTargetBandRate)} | ${pct(r.ceilFracMean)} | ${pct(r.trafficFracMean)} | ${wall} | ${pct(r.bandReach)} | ${r.startRowUnfair === true ? '❌' : r.startRowUnfair === false ? 'ok' : '?'} |\n`;
    }
    out += '\n';
  }
  return out;
}

function configSummaryTable() {
  const p = join(RES, 'stage1-config-summary.json');
  if (!existsSync(p)) return '';
  const s = JSON.parse(readFileSync(p, 'utf8'));
  let out = '### Config summary (pooled across the 4 Stage-1 tracks)\n\n';
  out += '| config (density/depth/release) | fair everywhere | min band | net gain | realOv | reachTgt | trafWall | speedWall |\n';
  out += '|---|:--:|--:|--:|--:|--:|--:|--:|\n';
  for (const c of s) {
    out += `| ${c.density}/${c.intensity}/${c.release} | ${(c.bandOk && c.fairOk) ? '✅' : '❌'} | ${pct(c.minBandReach)} | ${fx(c.placesGainedNetMean)} | ${fx(c.realOvertakesMean)} | ${pct(c.reachedTargetBandRate)} | ${pct(c.trafficWallShare)} | ${pct(c.speedWallShare)} |\n`;
  }
  return out + '\n';
}

function stage2Table(rows) {
  if (!rows.length) return '';
  let out = '### Stage-2 — best configs across all 10 tracks\n\n';
  const configs = [...new Set(rows.map((r) => r.config))];
  for (const cfg of configs) {
    out += `#### config: ${cfg}\n\n`;
    out += '| track | realOv | net | reachTgt | trafFrac | wall | band | unfair |\n|---|--:|--:|--:|--:|:--:|--:|:--:|\n';
    const cr = rows.filter((r) => r.config === cfg);
    for (const r of cr) {
      const wall = (r.trafficWallShare >= r.speedWallShare) ? `T ${pct(r.trafficWallShare)}` : `S ${pct(r.speedWallShare)}`;
      out += `| ${r.track} | ${fx(r.realOvertakesMean)} | ${fx(r.placesGainedNetMean)} | ${pct(r.reachedTargetBandRate)} | ${pct(r.trafficFracMean)} | ${wall} | ${pct(r.bandReach)} | ${r.startRowUnfair ? '❌' : 'ok'} |\n`;
    }
    const allFair = cr.every((r) => r.bandReach >= 0.70 && r.startRowUnfair === false);
    out += `\n**Holds fairness on all 10 tracks: ${allFair ? 'YES ✅' : 'NO ❌'}**\n\n`;
  }
  return out;
}

const s1 = load('1');
const s2 = load('2');
let md = `# TIER-1 RESULTS (measured ACTUAL v4 mechanism)\n\n`;
md += `Stage-1 cells: ${s1.length} | Stage-2 cells: ${s2.length}\n\n`;
if (s1.length) { md += stage1Tables(s1); md += configSummaryTable(); }
if (s2.length) { md += stage2Table(s2); }
console.log(md);
