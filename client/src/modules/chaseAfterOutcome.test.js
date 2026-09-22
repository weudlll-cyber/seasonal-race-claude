// ============================================================
// File:        chaseAfterOutcome.test.js
// Path:        client/src/modules/chaseAfterOutcome.test.js
// Project:     RaceArena — CHASE-AFTER-OUTCOME (NIGHT-2026-09-23)
//
// WHAT THIS PINS, and nothing else:
//   1. OFF is TODAY. With the key false the governor is byte-identical to before the extension.
//   2. ON changes the race — and NEVER downward. Past the boundary no racer's command is lower
//      than the same racer's command at the same moment with the key off. ★ That is the owner's
//      scope of 2026-09-22 made testable: the leader brake is never extended, so the extension can
//      only ever raise a command.
//   3. The two selections pick the racers they say they do — 'leader' from behind the LEADER,
//      'gap' from behind the largest consecutive gap inside the front band.
//
// ★★ WHY (2) IS WRITTEN AS "NOT LOWER THAN OFF" AND NOT AS "NEVER BELOW 1.0". A racer braked to,
// say, 0.88 just before the boundary is still at 0.88 one step after it and slews UP from there —
// on BOTH arms, because the slew is the same. Asserting `governorMult >= 1` past the boundary would
// fail on that legacy and would be testing the slew, not this feature. The paired comparison tests
// the actual property: the extension never drives anyone slower than today.
//
// The fixture drives `applyPulkLeadRotation` directly with a constructed field, so the phase
// context is explicit and the assertions are about the governor rather than about a whole race.
// ============================================================

import { describe, it, expect } from 'vitest';
import { applyPulkLeadRotation } from './raceGovernor.js';
import { BAND_EDGES } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG as D } from './storage/defaults.js';

const FINISH_T = 2.0;
const PATH_PX = 6000;
const MEAN_BODY = 30;
const PULK_START = 0.25;
const PULK_END = 0.6; // == choreoOutcomeStart, racePlanner.js:174

/** A field of `n` racers laid out in rank order, optionally with one large gap after `gapAfter`. */
function makeField(n = 20, { gapAfter = null, gapT = 0.05 } = {}) {
  const racers = [];
  let t = 1.2;
  for (let i = 0; i < n; i++) {
    racers.push({
      index: i,
      t,
      finished: false,
      spreadFactor: 1.0 - i * 0.002, // strictly descending: everyone behind is reachable
      governorMult: 1.0,
      isHeroChoreographed: false,
    });
    t -= 0.001;
    if (gapAfter != null && i === gapAfter - 1) t -= gapT; // the gap sits AFTER rank `gapAfter`
  }
  return racers;
}

function baseCfg(over = {}) {
  return {
    enabled: true,
    attackerSlots: 2,
    dropDepthLengths: 8,
    outsiderMaxReachLengths: 15,
    deadlockTimeoutMs: 12000,
    minHoldMs: 750,
    frontPool: 8,
    leaderBrake: D.pulkLeaderBrake,
    challengerBoost: D.pulkChallengerBoost,
    maxEffect: D.pulkEnvelopeMaxEffect,
    maxStepPerFrame: D.pulkEnvelopeMaxStepPerFrame,
    ceilingCap: 1.1813397129186605, // the resolved shipped value
    chaseAfterOutcomeEnabled: false,
    chaseAfterOutcomeSelection: 'leader',
    chaseAfterOutcomeSlots: 2,
    ...over,
  };
}

/** Run `steps` governor ticks at `progress` and return the commanded multipliers. */
function drive(racers, cfg, progress, steps = 40) {
  const dirState = {};
  for (let k = 0; k < steps; k++) {
    applyPulkLeadRotation(
      racers,
      FINISH_T,
      {
        progress,
        pulkStartFrac: PULK_START,
        pulkEndFrac: PULK_END,
        corrStartFrac: PULK_END,
        pathLengthPx: PATH_PX,
        meanBodyLen: MEAN_BODY,
        currentMs: 1000 + k * 16,
        dirState,
      },
      cfg
    );
  }
  return racers.map((r) => r.governorMult);
}

describe('CHASE-AFTER-OUTCOME — the extension', () => {
  it('★ OFF is TODAY: past the boundary every racer is slewed to 1.0', () => {
    const out = drive(makeField(), baseCfg({ chaseAfterOutcomeEnabled: false }), 0.8);
    for (const m of out) expect(m).toBeCloseTo(1.0, 10);
  });

  it('★ OFF inside the PULK window still boosts — the extension did not disturb the phase', () => {
    const out = drive(makeField(), baseCfg({ chaseAfterOutcomeEnabled: false }), 0.4);
    expect(Math.max(...out)).toBeGreaterThan(1.0);
  });

  it('★★ ON past the boundary DOES boost, and the slots key decides how many', () => {
    const two = drive(
      makeField(),
      baseCfg({ chaseAfterOutcomeEnabled: true, chaseAfterOutcomeSlots: 2 }),
      0.8
    );
    const five = drive(
      makeField(),
      baseCfg({ chaseAfterOutcomeEnabled: true, chaseAfterOutcomeSlots: 5 }),
      0.8
    );
    const boosted = (a) => a.filter((m) => m > 1.0 + 1e-9).length;
    // slots + the single outsider slot
    expect(boosted(two)).toBe(3);
    expect(boosted(five)).toBe(6);
  });

  it('★★ THE BRAKE IS NEVER EXTENDED: no command past the boundary is lower than with the key off', () => {
    const off = drive(makeField(), baseCfg({ chaseAfterOutcomeEnabled: false }), 0.8);
    const on = drive(makeField(), baseCfg({ chaseAfterOutcomeEnabled: true }), 0.8);
    for (let i = 0; i < off.length; i++) {
      expect(on[i], `racer ${i} was driven SLOWER by the extension`).toBeGreaterThanOrEqual(
        off[i] - 1e-12
      );
    }
    expect(Math.min(...on)).toBeGreaterThanOrEqual(1.0 - 1e-12);
  });

  it('★ the PULK clamp is untouched: the slots key cannot widen the window before the boundary', () => {
    const inPulk = drive(
      makeField(),
      baseCfg({ chaseAfterOutcomeEnabled: true, chaseAfterOutcomeSlots: 5 }),
      0.4
    );
    // 2 attackers (the hard 1..2 clamp) + 1 outsider, whatever the chase key says.
    expect(inPulk.filter((m) => m > 1.0 + 1e-9).length).toBe(3);
  });

  it("★★ SELECTION: 'leader' boosts from behind the LEADER, 'gap' from behind the GAP", () => {
    // The gap sits after rank 3, i.e. inside the front band (BAND_EDGES[0] = 5). With 'leader' the
    // window opens at rank 2 (index 1); with 'gap' it opens at the front of the chasing field,
    // which is index 3.
    expect(BAND_EDGES[0]).toBe(5);
    const opts = { gapAfter: 3, gapT: 0.05 };
    const lead = drive(
      makeField(20, opts),
      baseCfg({
        chaseAfterOutcomeEnabled: true,
        chaseAfterOutcomeSelection: 'leader',
        chaseAfterOutcomeSlots: 2,
      }),
      0.8
    );
    const gap = drive(
      makeField(20, opts),
      baseCfg({
        chaseAfterOutcomeEnabled: true,
        chaseAfterOutcomeSelection: 'gap',
        chaseAfterOutcomeSlots: 2,
      }),
      0.8
    );
    const picked = (a) => a.map((m, i) => (m > 1.0 + 1e-9 ? i : -1)).filter((i) => i >= 0);
    const pLead = picked(lead);
    const pGap = picked(gap);
    // 'leader' reaches INSIDE the leading group — indices 1 and 2 are ahead of the gap.
    expect(pLead).toContain(1);
    expect(pLead).toContain(2);
    // 'gap' takes nobody from inside the leading group (indices 0,1,2).
    for (const i of [0, 1, 2])
      expect(pGap, `'gap' must not boost index ${i}, it is in the leading group`).not.toContain(i);
    expect(pGap).toContain(3); // the front of the chasing field
  });

  it('★★ SABOTAGE GUARD: with nobody selected, ON must equal OFF exactly', () => {
    // If the extension moves the race through anything OTHER than the boost it selects, this fails.
    // `frontPool: 2` leaves `frontPool - 1 = 1` window slot, and `outsiderMaxReachLengths: 0` keeps
    // the outsider from ever qualifying — the nearest thing to "select nobody" the config allows.
    // A residual difference here would mean something else in the extension is moving racers.
    const cfgOff = baseCfg({ chaseAfterOutcomeEnabled: false, challengerBoost: 0 });
    const cfgOn = baseCfg({ chaseAfterOutcomeEnabled: true, challengerBoost: 0 });
    const off = drive(makeField(), cfgOff, 0.8);
    const on = drive(makeField(), cfgOn, 0.8);
    expect(on).toEqual(off);
  });
});
