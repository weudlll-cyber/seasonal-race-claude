// ============================================================
// fingerprint-default.mjs — DEFAULT-BEHAVIOUR BYTE-IDENTITY FINGERPRINT (the pulk-cleanup standard).
//
// WHAT IT PROVES: that a change left the SHIPPED default game byte-identical. It runs the headless
// sim on the default config (no mechanism flags → shipped defaults) across the 10 standard tracks
// with a fixed seed and hashes the full per-race results (finish order + final positions). If the
// combined hash is unchanged before vs after a change, the default behaviour is provably unchanged.
//
// STANDING TOOL: this is the ONE comparison used by every stage of THE GREAT PULK CLEANUP (Stages
// 1–5). Do not re-implement per stage — run this before and after and compare the two hashes.
//
// METHOD (fixed, do not vary between stages):
//   • 10 standard tracks × their default racer, --seed=1 --races=3 --dur=60 → per-race seeds {1,2,3}
//     per track (the sim derives race i as (seed-1)*races + i + 1).
//   • DEFAULT config: no mechanism flags are passed, so the shipped defaults.js world is used.
//   • Artifact: SHA-256 over canonicalized rawData — rows sorted by (raceIdx, index), object keys
//     sorted (order-independent) — combined across tracks in the fixed order below.
//   • Also prints the live pulkBias telemetry (planBiasDeltaMean / pulkBiasEventCount) per track,
//     the Scope-B gate for stages that touch the re-roll sampler.
//
// READ-ONLY: imports nothing from the behavioural source; it only spawns the sim CLI and hashes the
// JSON it writes. Adding/running it cannot change any race outcome.
//
// Usage: node scripts/fingerprint-default.mjs [label]     (label only names the temp out dir)
//   Stage-1 AFTER hash (reference): fa4e3796e1e5f1a5
// ============================================================
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LABEL = process.argv[2] || 'run';
const SEED = 1, RACES = 3, DUR = 60;
// 10 standard tracks × default racer (fixed order — never reorder; it feeds the combined hash).
const TRACKS = [
  ['city-circuit', 'motorbike'], ['dirt-oval', 'horse'], ['garden-path', 'snail'],
  ['ice-track', 'snowmobile'], ['luger-hill', 'luge'], ['mountainstreet', 'boarder'],
  ['river-run', 'duck'], ['searound', 'manta'], ['seatrack', 'dolphin'], ['space-sprint', 'rocket'],
];

// Stable stringify: sort object keys recursively so key order never affects the hash.
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

const combined = createHash('sha256');
const perTrack = [];
for (const [track, racer] of TRACKS) {
  const out = `client/tmp/fp/${LABEL}__${track}`;
  execFileSync(process.execPath, [
    'scripts/sim-fairness.mjs', `--track=${track}`, `--racer=${racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, `--out=${out}`,
  ], { cwd: ROOT, stdio: 'ignore' });
  const d = JSON.parse(readFileSync(join(ROOT, out, 'fairness-data.json'), 'utf8'));
  const rows = [...d.rawData].sort((a, b) => (a.raceIdx - b.raceIdx) || (a.index - b.index));
  const rawStr = canon(rows);
  combined.update(track + ':' + rawStr);
  const bias = (d.results || []).map((r) => ({
    planBiasDeltaMean: r.avgNaturalness?.planBiasDeltaMean ?? null,
    pulkBiasEventCount: r.avgNaturalness?.pulkBiasEventCount ?? null,
  }));
  perTrack.push({ track, rows: rows.length, hash: createHash('sha256').update(rawStr).digest('hex').slice(0, 12), bias });
}
const combinedHash = combined.digest('hex').slice(0, 16);
console.log('COMBINED', combinedHash, `(seed=${SEED} races=${RACES} dur=${DUR}, ${TRACKS.length} tracks, default config)`);
for (const t of perTrack) console.log(' ', t.track.padEnd(15), t.hash, 'bias', JSON.stringify(t.bias));
