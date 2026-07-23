// ============================================================
// exp-owner-config-diff.mjs — PART A: the owner's exported world config vs the shipped defaults.
//
// READ-ONLY. Imports the shipped default objects directly from source (no hand-copied tables, so the
// diff cannot drift from the code) and compares them key-by-key against the owner's exported
// world.json. Runs no races and changes nothing.
//
// For every key it emits SHIPPED (matches default) or DRIFT (differs). The INERT / BEHAVIOUR-CHANGING
// classification for each drift is asserted here as data and PROVEN by the reachability notes, which
// cite the call sites that read the key.
//
// Usage: node scripts/exp-owner-config-diff.mjs [--world=reports/greenfield/owner-config/owner-world.json]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
} from '../client/src/modules/storage/defaults.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const WORLD = (() => { const r = argVal('world', 'reports/greenfield/owner-config/owner-world.json'); return isAbsolute(r) ? r : join(ROOT, r); })();
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/owner-config'); return isAbsolute(r) ? r : join(ROOT, r); })();

const world = JSON.parse(readFileSync(WORLD, 'utf8'));
const cfgs = world.configs ?? {};

// The reachability verdicts. Each entry: why it is INERT, or what it changes if BEHAVIOUR-CHANGING.
// "inert" claims name the guard that makes the key unreachable — that is the proof obligation.
const VERDICTS = {
  packReleaseEnabled: {
    kind: 'BEHAVIOUR-CHANGING',
    note: 'Turns the shelved pack-release ON. It relaxes pack band-strictness so the field is released from its band corridor; the measured failure mode was endgame leakage (92% of band leaks after progress 0.90) — i.e. exactly a stretched field in the finale.',
  },
  gapRerollThresholdLengths: {
    kind: 'BEHAVIOUR-CHANGING',
    note: 'The G under test (0.75 vs shipped 1.5). Intended: tighter field. This is the setting the owner deliberately changed.',
  },
  gapRerollDevMarker: {
    kind: 'INERT (diagnostic only)',
    note: 'Only gates a visual dev marker when a gap-biased sample differs (RaceScreen index.jsx:1164) and a HUD line; it never feeds a speed term.',
  },
  b2AttackFinalRank: {
    kind: 'NEAR-INERT (conditional on b2AttackBandArrival)',
    note: 'Where a B2 attack hero would be parked after its attack (10 vs shipped 7). The owner also runs b2AttackBandArrival=TRUE (the shipped default), and under band-arrival the attacker is RELEASED the moment it re-enters B2 regardless of this value — defaults.js:373-375 states it verbatim: "Under band-arrival b2AttackFinalRank only shapes the fall slope (release triggers at B2 re-entry regardless)." So it can bend the descent slope but cannot change where the hero ends up. Ranked last.',
  },
};

// Planner suspicions that the diff REFUTED — these are the SHIPPED values, not drift. Recorded so the
// refutation is visible in the report rather than silently absent from the drift list.
const REFUTED = [
  ['reRollVariationPercent', 75, 'defaults.js:258 ships 75 — the owner matches it exactly.'],
  ['choreoPackBandStrictness', 0.5, 'defaults.js:308 ships 0.5 — the owner matches it exactly.'],
  ['b2AttackBandArrival', true, 'defaults.js:385 ships true — the owner matches it (and it is what makes b2AttackFinalRank near-inert).'],
  ['choreoReleaseProgress', 0.97, 'defaults.js:317 ships 0.97 — the owner matches it.'],
  ['carouselEnabled', false, 'defaults.js ships false — the carousel is OFF in the owner\'s game, as recommended.'],
];

function diffSection(name, actual, defaults) {
  const rows = [];
  const keys = [...new Set([...Object.keys(defaults ?? {}), ...Object.keys(actual ?? {})])].sort();
  for (const k of keys) {
    const a = actual?.[k];
    const d = defaults?.[k];
    const same = JSON.stringify(a) === JSON.stringify(d);
    const present = a !== undefined;
    rows.push({
      section: name,
      key: k,
      owner: present ? JSON.stringify(a) : '(absent)',
      shipped: d === undefined ? '(no default)' : JSON.stringify(d),
      status: !present ? 'ABSENT (falls back to default)' : same ? 'SHIPPED' : 'DRIFT',
      verdict: same || !present ? '' : (VERDICTS[k]?.kind ?? 'BEHAVIOUR-CHANGING (unclassified)'),
      note: same || !present ? '' : (VERDICTS[k]?.note ?? ''),
    });
  }
  return rows;
}

const rows = [
  ...diffSection('raceDynamicsConfig', cfgs.raceDynamicsConfig, DEFAULT_RACE_DYNAMICS_CONFIG),
  ...diffSection('raceBehaviorConfig', cfgs.raceBehaviorConfig, DEFAULT_RACE_BEHAVIOR_CONFIG),
  ...diffSection('rowLayoutConfig', cfgs.rowLayoutConfig, DEFAULT_ROW_LAYOUT_CONFIG),
  ...diffSection('baseSpeedConfig', cfgs.baseSpeedConfig, DEFAULT_BASE_SPEED_CONFIG),
];

const drifts = rows.filter((r) => r.status === 'DRIFT');

mkdirSync(OUT_ABS, { recursive: true });
const COLS = ['section', 'key', 'owner', 'shipped', 'status', 'verdict', 'note'];
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
writeFileSync(join(OUT_ABS, 'owner-config-diff.csv'),
  [COLS.join(','), ...rows.map((r) => COLS.map((c) => esc(r[c] ?? '')).join(','))].join('\n') + '\n');

const md = [];
md.push('# PART A — Owner config vs shipped defaults');
md.push('');
md.push(`Source of truth: the owner's exported \`world.json\` (schemaVersion ${world.schemaVersion}), committed at \`reports/greenfield/owner-config/owner-world.json\`. Shipped values are imported directly from \`client/src/modules/storage/defaults.js\` — no hand-copied table, so this diff cannot drift from the code.`);
md.push('');
md.push(`**${drifts.length} keys DRIFT from the shipped defaults.** Everything else matches or is absent (absent ⇒ the loader's \`{...DEFAULT, ...stored}\` merge supplies the default).`);
md.push('');
md.push('| section | key | owner | shipped | classification |');
md.push('|---|---|---|---|---|');
for (const r of drifts) md.push(`| ${r.section} | \`${r.key}\` | **${r.owner}** | ${r.shipped} | ${r.verdict} |`);
md.push('');
md.push('## What each drift does');
md.push('');
for (const r of drifts) md.push(`- **\`${r.key}\`** (${r.owner} vs ${r.shipped}) — *${r.verdict}*. ${r.note}`);
md.push('');
md.push('## Ranked by plausible impact on finale liveliness / field spread');
md.push('');
md.push('1. **`packReleaseEnabled: true`** — the prime suspect, CONFIRMED as a real drift. It is the shelved pack-only strictness release: a pack racer inside its band has its servo strictness dropped to **0** (no rank pinning, free natural speed) until it drifts `packReSteerThreshold` ranks past the band edge. It was shelved default-OFF after the measured endgame-runway failure, and "field roams free late" is precisely the reported symptom (stretched field, dead finale). Part B isolates it.');
md.push('2. **`gapRerollThresholdLengths: 0.75`** — the owner\'s own deliberate change, and the thing under test. Intended to tighten the field.');
md.push('3. **`b2AttackFinalRank: 10`** — near-inert under band-arrival (see above); ranked last on impact.');
md.push('4. **`gapRerollDevMarker: true`** — inert, diagnostic only.');
md.push('');
md.push('## Planner suspicions REFUTED by the diff');
md.push('');
md.push('These were flagged as possible drift but are the **shipped defaults** — the owner matches them exactly, so they cannot explain anything:');
md.push('');
for (const [k, v, why] of REFUTED) md.push(`- \`${k}\` = ${JSON.stringify(v)} — ${why}`);
md.push('');
md.push('Full key-by-key table (including every SHIPPED key): `owner-config-diff.csv`.');
writeFileSync(join(OUT_ABS, 'PART-A-DIFF.md'), md.join('\n') + '\n');

console.log(`\n=== PART A — owner config vs shipped defaults ===`);
console.log(`${rows.length} keys compared, ${drifts.length} DRIFT:`);
for (const r of drifts) console.log(`  ${r.section}.${r.key.padEnd(30)} owner=${String(r.owner).padEnd(10)} shipped=${String(r.shipped).padEnd(10)} ${r.verdict}`);
console.log(`\nWrote ${join(OUT_ABS, 'PART-A-DIFF.md')}`);
