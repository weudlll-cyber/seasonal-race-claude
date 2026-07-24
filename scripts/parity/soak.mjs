// ============================================================
// File:        scripts/parity/soak.mjs
// Project:     RaceArena — golden equality soak (fix-plan step 6, PART 2)
//
// Runs the golden equality assertion across a broad identity matrix and reports every
// mismatch — it does NOT stop on the first one. A mismatch is a localized bug report:
// seed, identity, both hashes, and the first diverging checkpoint.
//
// AXES (see buildMatrix): all 10 tracks x {default type, one non-default type}
//                        x the three model shapes x varied racer counts x several seeds.
//
// Usage:
//   node scripts/parity/soak.mjs                 # full matrix
//   node scripts/parity/soak.mjs --limit=50      # first N identities (smoke)
//   node scripts/parity/soak.mjs --json=path     # also write the raw result rows
// ============================================================

import { writeFileSync } from 'fs';
import {
  TRACKS,
  RACER_CONFIGS,
  loadTrack,
  buildIdentity,
  realArm,
  simArm,
} from './goldenRunner.mjs';
import { firstDivergence, hashIdentity } from '../../client/src/modules/parity/raceIdentity.js';

const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const m = argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const LIMIT = Number(argVal('limit', '0')) || 0;
const JSON_OUT = argVal('json', null);

// A surface-compatible alternate type per track, so every track is exercised by a type that is
// NOT its default — the multiplier is part of the pace now, so a second M per track matters.
const ALT_TYPE = {
  'city-circuit': 'horse', // asphalt track, earth racer — surface rules are a SETUP concern,
  'dirt-oval': 'motorbike', // not a physics one; the model must not care either way.
  'garden-path': 'horse',
  'ice-track': 'luge',
  'luger-hill': 'snowmobile',
  mountainstreet: 'luge',
  'river-run': 'dolphin',
  searound: 'dolphin',
  seatrack: 'duck',
  'space-sprint': 'horse',
};

const SEEDS = [1, 7, 42, 101, 2024];
const COUNTS = [20, 40, 60];

/** Every identity the soak will check. */
export function buildMatrix() {
  const out = [];
  for (const [trackId, defaultType] of TRACKS) {
    const ctx = loadTrack(trackId);
    const shapes = ctx.isOpen ? ['open-in-range', 'open-slowdown'] : ['closed'];
    const types = [defaultType, ALT_TYPE[trackId]];
    for (const racerType of types) {
      if (!RACER_CONFIGS[racerType]) throw new Error(`unknown racer type ${racerType}`);
      for (const shape of shapes) {
        for (const seed of SEEDS) {
          for (const nRacers of COUNTS) {
            // Closed tracks additionally vary the lap count, so the closed axis is not just
            // "the track default" repeated — 1 lap and the default both get exercised.
            const lapVariants = ctx.isOpen ? [undefined] : [undefined, 1];
            for (const laps of lapVariants) {
              out.push({ trackId, racerType, seed, nRacers, shape, laps });
            }
          }
        }
      }
    }
  }
  return out;
}

function main() {
  const matrix = buildMatrix();
  const cases = LIMIT > 0 ? matrix.slice(0, LIMIT) : matrix;
  const started = Date.now();

  console.log('=== GOLDEN EQUALITY SOAK ===');
  console.log(`identities: ${cases.length}${LIMIT ? ` (limited from ${matrix.length})` : ''}`);
  console.log(`tracks: ${TRACKS.length}   seeds: ${SEEDS.join(',')}   counts: ${COUNTS.join(',')}`);
  console.log('');

  const rows = [];
  const mismatches = [];
  let pass = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const label = `${c.trackId}/${c.racerType}/${c.shape}/n=${c.nRacers}/seed=${c.seed}${
      c.laps ? `/laps=${c.laps}` : ''
    }`;
    let row;
    try {
      const identity = buildIdentity(c);
      // Step-order alignment: arm A is now the REAL browser core (raceCore), and the sim executes the
      // SAME stepRacePhysics — so this soak proves realArm == simArm, byte for byte, across the matrix.
      const a = realArm(identity);
      const b = simArm(identity);
      const equal = a.hash === b.hash;
      row = {
        label,
        identityHash: hashIdentity(identity),
        realHash: a.hash,
        simHash: b.hash,
        equal,
        realizedDurationSec: Number(a.model.realizedDurationSec.toFixed(3)),
        paceScale: Number(a.model.paceScale.toFixed(6)),
        finishT: a.model.finishT,
        racePlanEnabled: identity.racePlanEnabled,
      };
      if (equal) {
        pass++;
      } else {
        const d = firstDivergence(a.outcome, b.outcome);
        row.firstDivergence = d;
        mismatches.push(row);
        console.log(`  MISMATCH  ${label}`);
        console.log(`            identity ${row.identityHash}  real ${a.hash}  sim ${b.hash}`);
        console.log(
          `            first divergence: ${d ? `${d.kind} @ ${d.at} — ${d.detail}` : 'none located'}`
        );
      }
    } catch (err) {
      row = { label, equal: false, error: err.message };
      mismatches.push(row);
      console.log(`  ERROR     ${label}: ${err.message}`);
    }
    rows.push(row);

    if ((i + 1) % 25 === 0 || i === cases.length - 1) {
      const el = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  … ${i + 1}/${cases.length}   pass=${pass}   mismatch=${mismatches.length}   ${el}s`);
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log('');
  console.log('=== RESULT ===');
  console.log(`identities checked : ${cases.length}`);
  console.log(`equal              : ${pass}`);
  console.log(`mismatched         : ${mismatches.length}`);
  console.log(`runtime            : ${elapsed}s`);
  console.log(mismatches.length === 0 ? 'ALL EQUAL — parity holds across the matrix.' : 'MISMATCHES FOUND — see the list above.');

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ meta: { cases: cases.length, pass, mismatches: mismatches.length, elapsed: Number(elapsed) }, rows }, null, 2));
    console.log(`\nrows -> ${JSON_OUT}`);
  }

  return mismatches.length;
}

// Only run when invoked directly — importing this module (e.g. to reuse buildMatrix)
// must not launch a full soak.
if (process.argv[1] && process.argv[1].endsWith('soak.mjs')) main();
