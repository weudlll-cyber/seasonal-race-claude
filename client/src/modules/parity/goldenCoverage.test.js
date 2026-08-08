// ============================================================
// File:        goldenCoverage.test.js
// Path:        client/src/modules/parity/goldenCoverage.test.js
// Project:     RaceArena — split out of goldenEquality.test.js by VERIFY-COST-1
//
// THE CHEAP ASSERTIONS, and the one that only exists because of the split.
//
// Everything here runs in milliseconds — no race is stepped. It is in its own file so the pool is
// not held by it, and because the split created a new way for this guard to rot: four files can
// quietly come to run different races while each still passes. The union check below is what makes
// that impossible without a test going red.
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildIdentity, browserModel, simModel } from '../../../../scripts/parity/goldenRunner.mjs';
import { CASES, REAL_ARM_SEEDS, SPREAD_CASES, realArmCase } from './goldenCases.js';

describe('the golden case list is one home, and it still covers what it claimed', () => {
  // WHAT BREAKS IF THIS IS DELETED: the split. Four files could drift into running different races
  // while all four stayed green, and the guard would shrink without anything reporting it.
  // WHAT GOES UNNOTICED WITHOUT IT: exactly that — a case list edited down by one entry.
  it('is not vacuous: the cases cover both topologies and all three model shapes', () => {
    const shapes = new Set();
    const topologies = new Set();
    for (const c of CASES) {
      const identity = buildIdentity(c);
      shapes.add(c.shape);
      topologies.add(identity.isOpen);
      expect(identity.nRacers).toBeGreaterThan(1);
    }
    expect(shapes).toEqual(new Set(['closed', 'open-in-range', 'open-slowdown']));
    expect(topologies).toEqual(new Set([true, false]));
  });

  // WHAT BREAKS IF DELETED: the census the split owes. The pre-split file ran four derivation
  // cases, three real-arm seeds and three spread cases; if that ever silently becomes fewer, the
  // count is the only thing that says so.
  // WHAT GOES UNNOTICED: a case commented out during a debugging session and never restored.
  it('the case list is the size the guard was built at — 4 derivation, 3 real-arm, 3 spread', () => {
    expect(CASES.length).toBe(4);
    expect(REAL_ARM_SEEDS.length).toBe(3);
    expect(SPREAD_CASES.length).toBe(3);
    // and every real-arm seed builds a distinct identity, so three seeds are three races
    const ids = new Set(REAL_ARM_SEEDS.map((s) => JSON.stringify(realArmCase(s))));
    expect(ids.size).toBe(3);
  });

  it('the duration scalars agree before a single frame is stepped', () => {
    for (const c of CASES) {
      const identity = buildIdentity(c);
      const a = browserModel(identity);
      const b = simModel(identity);
      expect(b.finishT).toBe(a.finishT);
      expect(b.realizedDurationSec).toBe(a.realizedDurationSec);
      expect(b.raceBaseSpeed).toBe(a.raceBaseSpeed);
      expect(b.paceScale).toBe(a.paceScale);
      expect(b.paceSpeedPxPerSec).toBe(a.paceSpeedPxPerSec);
    }
  });

  it('the open-slowdown case really is running below full pace', () => {
    const m = browserModel(buildIdentity(CASES[3]));
    expect(m.slowdownActive).toBe(true);
    expect(m.paceScale).toBeLessThan(1);
  });

  it('the identity carries no derived scalar (derivation cannot hide inside it)', () => {
    const identity = buildIdentity(CASES[0]);
    for (const k of ['finishT', 'realizedDurationSec', 'raceBaseSpeed', 'paceScale']) {
      expect(identity[k]).toBeUndefined();
    }
    // and it does carry the three content hashes the parity promise is scoped by
    expect(identity.worldHash).toMatch(/^[0-9a-f]{8}$/);
    expect(identity.trackGeometryHash).toMatch(/^[0-9a-f]{8}$/);
    expect(identity.rosterHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
