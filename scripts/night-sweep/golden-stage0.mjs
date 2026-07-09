// ============================================================
// golden-stage0.mjs — deterministic golden tests for the Stage-0 config pipeline.
// A safeguard that cannot be shown to detect its own failure is worthless (owner). Asserts:
//   G1  no --config            → result stamped ASSUMED-DEFAULTS (provisional)
//   G2  a fully-honoured world  → result stamped that world's hash; race byte-identical to no-config
//   G3  an OLD-schema world.json → sim ABORTS (exit 2, named WORLD_SCHEMA_MISMATCH), no race
//        (race zones were removed at schema v2; a v1 export must fail loud, never be half-honoured)
//   G4  racerTypeOverrides      → sim ABORTS (not yet honoured), no stamp over-claim
//   G5  flip a displaySize override → hash changes; flip back → matches (via the shared module)
// Run: node scripts/night-sweep/golden-stage0.mjs   → exits 0 on pass, 1 on fail.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG, DEFAULT_ROW_LAYOUT_CONFIG,
} from '../../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../../client/src/modules/autoSpriteScale.js';
import { WORLD_SCHEMA_VERSION, hashWorld } from '../../client/src/modules/raceConfigWorld.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const TMP = join(ROOT, 'client', 'tmp', 'golden-stage0');
mkdirSync(TMP, { recursive: true });

const defaultsWorld = () => ({
  schemaVersion: WORLD_SCHEMA_VERSION,
  track: 'mountainstreet', racer: 'boarder', racerCount: 40, durationSec: 60, seed: 1,
  configs: {
    raceDynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
    raceBehaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
    rowLayoutConfig: DEFAULT_ROW_LAYOUT_CONFIG,
    baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
    autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
  },
  racerTypeOverrides: {},
});
const writeWorld = (name, w) => { const p = join(TMP, name); writeFileSync(p, JSON.stringify(w)); return p; };
const RACE = ['--track=mountainstreet', '--racer=boarder', '--dur=60', '--races=2', '--seed=1'];
function runSim(extra, out) {
  const r = spawnSync(process.execPath, [SIM, ...RACE, ...extra, `--out=client/tmp/golden-stage0/${out}`],
    { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
const readData = (out) => JSON.parse(readFileSync(join(TMP, out, 'fairness-data.json'), 'utf8'));

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };

// G1 — no --config → ASSUMED-DEFAULTS
const g1 = runSim([], 'nocfg');
const d1 = readData('nocfg');
ok(g1.code === 0 && d1.meta.world.worldHash === 'ASSUMED-DEFAULTS' && d1.meta.world.provisional === true,
  'G1 no --config → stamped ASSUMED-DEFAULTS + provisional');

// G2 — fully-honoured defaults world → stamped that world's hash; race byte-identical to G1
const w2 = defaultsWorld();
const expectHash = hashWorld(w2).short;
writeWorld('world-ok.json', w2);
const g2 = runSim(['--config=client/tmp/golden-stage0/world-ok.json'], 'okworld');
const d2 = readData('okworld');
ok(g2.code === 0 && d2.meta.world.worldHash === expectHash && d2.meta.world.provisional === false,
  `G2 honoured world → stamped its hash ${expectHash}`);
ok(JSON.stringify(d2.results) === JSON.stringify(d1.results) && JSON.stringify(d2.rawData) === JSON.stringify(d1.rawData),
  'G2 a defaults-world race is byte-identical to the no-config race (honouring is faithful)');

// G3 — an OLD-schema world.json (the shape before race-zones were removed) → ABORT.
// A v1 export carried raceZoneConfig; it must fail loud with a NAMED error, never be half-honoured.
const w3 = defaultsWorld();
w3.schemaVersion = WORLD_SCHEMA_VERSION - 1;                 // stale export from before the bump
w3.configs.raceZoneConfig = { enabled: true, position: 0.5, width: 0.05, brakeStrength: 0.85 };
writeWorld('world-oldschema.json', w3);
const g3 = runSim(['--config=client/tmp/golden-stage0/world-oldschema.json'], 'oldschema');
ok(g3.code === 2 && /WORLD_SCHEMA_MISMATCH/.test(g3.stderr) && /STAGE-0 ABORT/.test(g3.stderr),
  'G3 old-schema world.json → sim ABORTS (exit 2, named WORLD_SCHEMA_MISMATCH), no race');

// G4 — racerTypeOverrides present → ABORT (not yet honoured; never stamp what it does not honour)
const w4 = defaultsWorld(); w4.racerTypeOverrides = { boarder: { displaySize: 999 } };
writeWorld('world-ovr.json', w4);
const g4 = runSim(['--config=client/tmp/golden-stage0/world-ovr.json'], 'ovr');
ok(g4.code === 2 && /racerTypeOverrides/.test(g4.stderr),
  'G4 racerTypeOverrides → sim ABORTS (refuses to stamp a world it does not honour)');

// G5 — the shared hash detects an override flip and restores it (module-level, no sim run)
const wa = defaultsWorld(); const h0 = hashWorld(wa).short;
wa.racerTypeOverrides = { boarder: { displaySize: 999 } }; const h1 = hashWorld(wa).short;
delete wa.racerTypeOverrides.boarder; const h2 = hashWorld(wa).short;
ok(h1 !== h0 && h2 === h0, 'G5 displaySize override flips the hash; flipping back restores it');

console.log(`\n${fails === 0 ? '✓ ALL GOLDEN PASS' : `✗ ${fails} GOLDEN FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
