// ============================================================
// File:        replay.test.js
// Path:        client/src/modules/parity/replay.test.js
// Project:     RaceArena
// Description: Sim replay entry (fix-plan step 4). Pins the label → spec parse, the identity-file
//              content, and the emit → replay round-trip (a saved identity replays byte-identically
//              through the real browser core and the sim).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  specFromLabel,
  identityFileFor,
  replayIdentityFile,
} from '../../../../scripts/parity/replay.mjs';

const RACE_TIMEOUT_MS = 180_000;

describe('replay — label parsing + identity file', () => {
  it('parses a golden/soak row label into a case spec', () => {
    expect(specFromLabel('searound/manta/closed/n=40/seed=7')).toEqual({
      trackId: 'searound',
      racerType: 'manta',
      shape: 'closed',
      nRacers: 40,
      seed: 7,
    });
    expect(specFromLabel('city-circuit/motorbike/closed/n=20/seed=1/laps=1')).toEqual({
      trackId: 'city-circuit',
      racerType: 'motorbike',
      shape: 'closed',
      nRacers: 20,
      seed: 1,
      laps: 1,
    });
    expect(specFromLabel('river-run/duck/open-in-range/n=60/seed=2024').shape).toBe(
      'open-in-range'
    );
  });

  it('an identity file pins the spec + the world/geometry/roster content hashes', () => {
    const f = identityFileFor({
      trackId: 'searound',
      racerType: 'manta',
      seed: 7,
      nRacers: 40,
      shape: 'closed',
    });
    expect(f.spec.trackId).toBe('searound');
    expect(f.identityHash).toMatch(/^[0-9a-f]{8}$/);
    expect(f.worldHash).toMatch(/^[0-9a-f]{8}$/);
    expect(f.trackGeometryHash).toMatch(/^[0-9a-f]{8}$/);
    expect(f.rosterHash).toMatch(/^[0-9a-f]{8}$/);
    expect(f.racePlanEnabled).toBe(true);
    // deterministic: the same spec always emits the same identity hash
    const g = identityFileFor({
      trackId: 'searound',
      racerType: 'manta',
      seed: 7,
      nRacers: 40,
      shape: 'closed',
    });
    expect(g.identityHash).toBe(f.identityHash);
  });
});

describe('replay — the emit → replay round-trip', () => {
  it(
    'a saved identity replays byte-identically (real browser core == sim), identity matches',
    () => {
      const file = identityFileFor({
        trackId: 'searound',
        racerType: 'manta',
        seed: 7,
        nRacers: 40,
        shape: 'closed',
      });
      const r = replayIdentityFile(file);
      expect(r.identityMatches).toBe(true);
      expect(r.equal).toBe(true);
      expect(r.realHash).toBe(r.simHash);
      // shipped-default order for seed 7 — real core == sim (the equal/hash checks above are the
      // guarantee). Moved again at the RACER-MOTION-2 acceleration-cap engine change: the winner stays
      // Breeze but 3rd place is now Surge. real == sim still byte-identical (the equal/hash checks above prove it).
      expect(r.order[0]).toBe('Breeze');
      expect(r.order[2]).toBe('Surge'); // 3rd place after the motion-cap change
    },
    RACE_TIMEOUT_MS
  );

  it(
    'a DRIFTED identity hash is detected (guards a changed world / geometry / roster)',
    () => {
      const file = identityFileFor({
        trackId: 'dirt-oval',
        racerType: 'horse',
        seed: 42,
        nRacers: 20,
        shape: 'closed',
      });
      const tampered = { ...file, identityHash: 'deadbeef' };
      const r = replayIdentityFile(tampered);
      expect(r.identityMatches).toBe(false);
    },
    RACE_TIMEOUT_MS
  );
});
