// ============================================================
// File:        goldenEquality.test.js
// Path:        client/src/modules/parity/goldenEquality.test.js
// Project:     RaceArena
// Created:     2026-07-24
// Description: THE GOLDEN EQUALITY TEST (fix-plan step 6). One race identity in, two
//              derivation chains — the browser's and the sim's — one outcome hash out.
//              They must be EXACTLY equal. This is the standing guard that keeps the
//              browser↔sim parity promise from silently regressing.
//
//              A handful of representative identities run here on every `npm test`; the
//              broad sweep (300+) lives in scripts/parity/soak.mjs and is reported in
//              reports/parity/GOLDEN-SOAK.md.
//
// SCOPE: the two arms share the per-frame loop (single-sourced since FORCE-PARITY), so what
// this proves is INPUT-DERIVATION equality plus determinism — the layer where every real
// divergence has lived (D-GRID, D-STREAM, D-DUR, O1). See the header of
// scripts/parity/goldenRunner.mjs for what a stronger version would require.
//
// RUNTIME: each case runs two full races, so the race-running cases carry explicit timeouts.
// Racer counts are kept modest here on purpose — the heavy counts belong to the soak.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  buildIdentity,
  browserArm,
  simArm,
  realArm,
  browserModel,
  simModel,
} from '../../../../scripts/parity/goldenRunner.mjs';
import { firstDivergence, hashIdentity } from './raceIdentity.js';

// Representative identities: both topologies, all three model shapes, a fast and a slow type.
const CASES = [
  { trackId: 'searound', racerType: 'manta', seed: 1, nRacers: 20, shape: 'closed' },
  { trackId: 'dirt-oval', racerType: 'horse', seed: 7, nRacers: 20, shape: 'closed' },
  { trackId: 'river-run', racerType: 'duck', seed: 3, nRacers: 20, shape: 'open-in-range' },
  { trackId: 'seatrack', racerType: 'dolphin', seed: 11, nRacers: 20, shape: 'open-slowdown' },
];

// Two full races per case; generous ceiling so a slow machine cannot flake the parity guard.
const RACE_TIMEOUT_MS = 180_000;

describe('golden equality — browser and sim derive the same race from one identity', () => {
  for (const c of CASES) {
    const label = `${c.trackId}/${c.racerType}/${c.shape}/n=${c.nRacers}/seed=${c.seed}`;
    it(
      `${label}: outcome hashes are exactly equal`,
      () => {
        const identity = buildIdentity(c);
        const a = browserArm(identity);
        const b = simArm(identity);

        if (a.hash !== b.hash) {
          // Never loosen to a tolerance — name the seed and the first diverging checkpoint.
          const d = firstDivergence(a.outcome, b.outcome);
          throw new Error(
            `GOLDEN MISMATCH ${label}\n` +
              `  identity  ${hashIdentity(identity)}\n` +
              `  browser   ${a.hash}\n` +
              `  sim       ${b.hash}\n` +
              `  first divergence: ${d ? `${d.kind} @ ${d.at} — ${d.detail}` : 'hashes differ but no positional divergence found'}`
          );
        }
        expect(a.hash).toBe(b.hash);
      },
      RACE_TIMEOUT_MS
    );
  }

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

  it('is not vacuous: the cases cover both topologies and all three shapes', () => {
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

  it(
    'is not vacuous: a perturbed identity produces a DIFFERENT outcome hash, and the ' +
      'divergence locator finds where',
    () => {
      // NEGATIVE CONTROL. If a green soak is to mean anything, the comparison must be able
      // to fail: feed the two arms DIFFERENT identities and require both an unequal hash and
      // a located first divergence. Without this, a harness bug that made every outcome
      // identical would read as perfect parity.
      const base = buildIdentity(CASES[0]);
      const other = buildIdentity({ ...CASES[0], seed: CASES[0].seed + 1 });
      const a = browserArm(base);
      const b = simArm(other);

      expect(a.hash).not.toBe(b.hash);
      const d = firstDivergence(a.outcome, b.outcome);
      expect(d).not.toBeNull();
      expect(d.kind).toBe('checkpoint');

      // …and the same identity through both arms must locate NO divergence at all.
      expect(firstDivergence(a.outcome, simArm(base).outcome)).toBeNull();
    },
    RACE_TIMEOUT_MS
  );

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

// ── The REAL browser arm (client/src/modules/raceCore.js), run headless ──────────────────────────
// realArm executes the ACTUAL RaceScreen init + per-step advance (extracted so RaceScreen renders
// through it). Unlike browserArm — which hand-mirrors the derivation and then runs the SIM's loop —
// realArm runs RaceScreen's OWN per-step order (controller.update BEFORE the re-roll; advance
// INTERLEAVED per racer; runout decay on finished racers). Two standing properties from the extraction
// task (see reports/parity/DIVERGENCE-AUDIT.md §2f):
//   (1) FAITHFULNESS PIN: the extracted path CAN reproduce the sim byte-for-byte — city-circuit /
//       laps=1 / seed 1 is fully identical — so the extraction is not a systematically broken mirror.
//       (It is NOT identical for every no-plan identity: D-INIT's interleave and D-RUNOUT perturb the
//       race whenever an avoidance/finish interaction bites; the residual's independent proof is that
//       realArm reproduces the owner's real-browser cross-check — Surge/Blitz demoted on seeds 7/42.)
//   (2) THE RESIDUAL IS REAL, NOT VACUOUS: when a Race Plan runs, the order offset flips the finishing
//       order, and the divergence is machine-located. This is D-INIT.
describe('real browser arm (extracted raceCore) — faithfulness pin + the located residual', () => {
  const NO_PLAN_IDENTICAL = {
    trackId: 'city-circuit',
    racerType: 'motorbike',
    seed: 1,
    nRacers: 20,
    shape: 'closed',
    laps: 1,
  };

  it(
    'faithfulness pin: a no-plan identity reproduces the sim byte-for-byte',
    () => {
      const identity = buildIdentity(NO_PLAN_IDENTICAL);
      expect(identity.racePlanEnabled).toBe(false); // guards the premise
      const a = realArm(identity);
      const b = simArm(identity);
      expect(a.hash).toBe(b.hash);
    },
    RACE_TIMEOUT_MS
  );

  it(
    'with a Race Plan, the real browser arm FLIPS the finishing order vs the sim, located (D-INIT)',
    () => {
      // searound / manta / 40 — the owner's browser cross-check cases. The sim-predicted winner on
      // seeds 7 and 42 is demoted in the real path (the exact symptom the owner saw).
      const order = (res) =>
        [...res]
          .sort((x, y) => x.finalRank - y.finalRank)
          .map((r) => r.racerIndex)
          .join(',');
      let anyFlipped = false;
      for (const seed of [1, 7, 42]) {
        const identity = buildIdentity({
          trackId: 'searound',
          racerType: 'manta',
          seed,
          nRacers: 40,
          shape: 'closed',
        });
        expect(identity.racePlanEnabled).toBe(true);
        const a = realArm(identity);
        const b = simArm(identity);
        if (a.hash !== b.hash) {
          const d = firstDivergence(a.outcome, b.outcome);
          expect(d).not.toBeNull(); // a divergent hash must be locatable
          expect(d.kind).toBe('checkpoint');
        }
        if (order(a.results) !== order(b.results)) anyFlipped = true;
      }
      // The residual must actually FLIP a finishing order on at least one cross-check seed — otherwise
      // this guard would pass vacuously and the extraction would have silently become another mirror.
      expect(anyFlipped).toBe(true);
    },
    RACE_TIMEOUT_MS
  );
});
