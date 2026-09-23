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
      // guarantee). Moved at the RACER-MOTION-2 acceleration-cap change, and again at the
      // night/2026-09-12b merge (2026-09-14): DIRECTION-AUTHORITY-1's hold-and-release shape changes
      // who arrives where, so Surge won and Breeze was 2nd. real == sim is still byte-identical —
      // the three checks above prove it, which is what makes this a re-pin and not a parity failure.
      // ★ AND AGAIN AT THE CHASE SHIP (CHASE-SHIP-1, 2026-09-23): the chase runs past the OUTCOME
      // boundary, so the last 30% is raced differently and the order moves by design — Surge and
      // Breeze swap (Breeze now wins) and 3rd goes Phantom -> Gale. Re-measured before re-pinning:
      // `identityMatches`, `equal` and `realHash === simHash` all hold, so this is a re-pin, not a
      // parity failure. The same pin at goldenCases.js moved at this ship for the same reason.
      expect(r.order[0]).toBe('Breeze');
      expect(r.order[2]).toBe('Gale');
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
