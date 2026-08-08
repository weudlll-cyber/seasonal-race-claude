// ============================================================
// File:        goldenNegative.test.js
// Path:        client/src/modules/parity/goldenNegative.test.js
// Project:     RaceArena — split out of goldenEquality.test.js by VERIFY-COST-1
//
// THE NEGATIVE CONTROLS. If a green parity guard is to mean anything, the comparison must be able
// to FAIL: feed the arms DIFFERENT identities and require both an unequal hash and a located first
// divergence. Without these, a harness bug that made every outcome identical would read as perfect
// parity — and that is a defect this project has already paid for in other instruments.
//
// SPLIT, NOT REDUCED: the same two controls that lived in goldenEquality.test.js, in their own file
// so the worker pool can run them beside the positive cases. They are together because they are one
// idea, and because a reader looking for "can this test fail?" should find one file rather than
// two footnotes.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  buildIdentity,
  browserArm,
  simArm,
  realArm,
} from '../../../../scripts/parity/goldenRunner.mjs';
import { firstDivergence } from './raceIdentity.js';
import { CASES, realArmCase, RACE_TIMEOUT_MS } from './goldenCases.js';

describe('the golden comparison can FAIL — the negative controls', () => {
  it(
    'a perturbed identity produces a DIFFERENT outcome hash, and the divergence locator finds where',
    () => {
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

  it(
    'a perturbed identity produces a DIFFERENT real-arm hash',
    () => {
      const base = buildIdentity(realArmCase(7));
      const other = buildIdentity(realArmCase(8));
      expect(realArm(base).hash).not.toBe(realArm(other).hash);
    },
    RACE_TIMEOUT_MS
  );
});
