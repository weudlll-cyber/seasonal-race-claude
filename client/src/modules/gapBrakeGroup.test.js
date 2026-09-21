// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js.
// ============================================================
// File:        gapBrakeGroup.test.js
// Path:        client/src/modules/gapBrakeGroup.test.js
// Project:     RaceArena — GROUP-GAP-BRAKE-1
//
// WHAT THIS FILE OWNS: the four behavioural claims of the group gap brake. The one that matters most
// is the PARADE GUARD — that braking a group does not EQUALISE it, which is the owner's requirement
// of 2026-09-20 and the reason the group path scales instead of clamping.
//
// ★ WHY A SEPARATE FILE. `gapLeaderBrake.test.js` owns the shipped leader-to-second brake. This is a
// different mode behind a different key; mixing them would make it impossible to tell which switch a
// red line is about. ★ ITS FIXTURE IS REUSED, not rebuilt — same `makeRacers`, same
// `createRacePlan(...)` positional shape, same px→t conversion, so the two files cannot drift into
// testing different brakes.
//
// ★★ THE FOUR SABOTAGES, each named at the case that catches it:
//   (1) restore the leader-to-second input  → "the input is the LARGEST of the front gaps"
//   (2) brake only the leader               → "every member of the group is braked"
//   (3) remove the owner's limit of four    → "a group of FIVE is not braked at all"
//   (4) clamp the group to a shared speed   → ★ "the group is NOT equalised" (the parade guard)
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  createRacePlan,
  createTrajectoryController,
  DEFAULT_CONTROLLER_PARAMS,
} from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

const FINISH_T = 2.0;
const TARGET_DUR_MS = 60_000;
const PATH_LENGTH_PX = 6000;
const PROGRESS = 0.8; // inside [choreoOutcomeStart, gapBrakeWindowEnd]
const { minMult } = DEFAULT_CONTROLLER_PARAMS;
// `DEFAULT_STOCHASTIC_NOISE` (racePlanner.js:108) is module-private, so it is pinned into the
// fixture config here rather than guessed. Everything below that needs the noise amplitude reads
// THIS constant, so the run and the derived bound can never be sized from different numbers.
const NOISE_AMP = 0.0008;
const CEILING = DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority;

const makeRacers = (count = 40) =>
  Array.from({ length: count }, (_, i) => ({
    index: i,
    startRowIndex: Math.floor(i / 10),
    t: 0,
    finished: false,
    avoidanceActive: false,
    trajectoryMult: 1.0,
    trajectoryMultTarget: 1.0,
    baseSpeed: 0.001,
  }));

/** A controller with the group brake in a chosen state. */
function controller({ groupOn = true, allowedPx = 100 } = {}) {
  const plan = createRacePlan(
    makeRacers(40),
    FINISH_T,
    TARGET_DUR_MS,
    {
      gapBrakeEnabled: true,
      gapBrakeGroupEnabled: groupOn,
      gapBrakeGroupAllowedGapPx: allowedPx,
      gapBrakeAllowedGapPx: allowedPx,
      gapBrakeWindowEnd: DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeWindowEnd,
      pathLengthPx: PATH_LENGTH_PX,
      stochasticNoise: NOISE_AMP,
    },
    42
  );
  return createTrajectoryController(plan);
}

/**
 * Lay the field out with the FRONT positions at chosen distances behind the leader, in world px, and
 * everyone else trailing. The px→t conversion is `gapPx / PATH_LENGTH_PX`, which is how the
 * mechanism reads it — the test speaks the owner's distance, never an internal fraction.
 *
 * ★★ THE FIELD IS ORDERED BY DRAWN RANK, AND THE FIRST DRAFT WAS NOT. Laid out in index order, the
 * racers standing 1st..6th were whoever the seed had drawn for 30th, 7th, 22nd… so the SERVO
 * commanded them its hardest correction and every reading came back at `minMult` 0.85 — the brake's
 * contribution was invisible underneath it. Ordering by drawn rank makes the rank error ~0, the
 * servo near-silent, and the brake the only thing moving the command, which is what these cases are
 * about. The order is read from the controller rather than assumed.
 */
function fieldWithFront(ctrl, pxBehind, frontOrder = null) {
  const racers = makeRacers(40);
  const byDrawn = [...racers].sort(
    (a, b) => (ctrl.getTargetRank(a.index) ?? 99) - (ctrl.getTargetRank(b.index) ?? 99),
  );
  // ★ AN OPTIONAL PERMUTATION OF THE FRONT, and the parade guard needs it. Ordered strictly by
  // drawn rank every front racer has the SAME (zero) rank error, so the servo commands all of them
  // the same value and there is no difference for the brake to preserve — the guard would be
  // asserting order on identical numbers. Permuting the front gives each member a different rank
  // error and therefore a different command on the way in, which is the situation the owner's
  // requirement is about.
  if (frontOrder) {
    const front = frontOrder.map((k) => byDrawn[k]);
    for (let i = 0; i < front.length; i++) byDrawn[i] = front[i];
  }
  const packT = FINISH_T * PROGRESS;
  byDrawn.forEach((r, pos) => {
    const px = pos < pxBehind.length
      ? pxBehind[pos]
      : pxBehind[pxBehind.length - 1] + 20 * (pos - pxBehind.length + 1);
    r.t = packT - px / PATH_LENGTH_PX;
  });
  // Return them in POSITION order, so `t[0]` is the leader and `t[2]` is third on the road.
  return { racers, order: byDrawn.map((r) => r.index) };
}

/**
 * Two updates, then the commanded targets. The first seeds the brake's smoothing filter and the
 * second is the one that is read — one sample is not a rate, which the mechanism's own comment says.
 */
function commanded(ctrl, built) {
  ctrl.update(built.racers, 40_000, PROGRESS);
  ctrl.update(built.racers, 41_000, PROGRESS);
  const byIndex = new Map(built.racers.map((r) => [r.index, r.trajectoryMultTarget]));
  return built.order.map((i) => byIndex.get(i)); // POSITION order: [0] is the leader
}

/**
 * One arm: build the field against this controller and read the commands back in position order.
 * ★ EVERY CLAIM BELOW IS braked-against-CONTROL, never against 1.0. The servo is still acting, so
 * only the DIFFERENCE between two runs of the same field isolates the brake.
 */
function arm(pxBehind, opts, frontOrder = null) {
  const c = controller(opts);
  return commanded(c, fieldWithFront(c, pxBehind, frontOrder));
}

/** The gap the brake actually READ this step — the input, not the command. */
function gapRead(pxBehind, opts) {
  const c = controller(opts);
  const built = fieldWithFront(c, pxBehind);
  c.update(built.racers, 40_000, PROGRESS);
  c.update(built.racers, 41_000, PROGRESS);
  return c.getGapBrakeStats().maxGapPxInWindow;
}

// Leader + second together, the break at 2-3: leader-to-second is 5 px, the group gap is 295.
const BREAK_AT_2 = [0, 5, 300, 320, 340, 360, 380, 400];
// Three together, the break at 3-4.
const BREAK_AT_3 = [0, 5, 10, 305, 325, 345, 365, 385];
// Five together, the break at 5-6 — the owner's limit.
const BREAK_AT_5 = [0, 5, 10, 15, 20, 315, 335, 355, 375];
// A lone leader: the break is at 1-2, so the group is one and the gap IS leader-to-second.
const BREAK_AT_1 = [0, 300, 320, 340, 360, 380, 400, 420];

describe('GROUP-GAP-BRAKE-1 — the input and the group', () => {
  it('★ the input is the LARGEST of the front gaps, not leader-to-second (sabotage 1)', () => {
    const ctrl = arm(BREAK_AT_2, { allowedPx: 1e7 }); // the same field, brake out of reach
    const t = arm(BREAK_AT_2, { allowedPx: 100 });
    expect(t[0], 'the leader must be braked — the group gap is 295 px').toBeLessThan(ctrl[0]);
    expect(t[1], 'second is IN the group and must be braked too').toBeLessThan(ctrl[1]);
    expect(t[2], 'the racer behind the gap is the field and must NOT be braked').toBe(ctrl[2]);
  });

  it('★ every member of the group is braked, not only the leader (sabotage 2)', () => {
    const ctrl = arm(BREAK_AT_3, { allowedPx: 1e7 });
    const t = arm(BREAK_AT_3, { allowedPx: 100 });
    for (const i of [0, 1, 2]) expect(t[i], `member ${i} must be braked`).toBeLessThan(ctrl[i]);
    expect(t[3], 'the front of the field must not be').toBe(ctrl[3]);
  });

  it('★★ a group of FIVE is not braked at all — the owner’s limit of four (sabotage 3)', () => {
    const ctrl = arm(BREAK_AT_5, { allowedPx: 1e7 });
    const t = arm(BREAK_AT_5, { allowedPx: 100 });
    for (let i = 0; i < 6; i++) expect(t[i], `racer ${i} must be untouched`).toBe(ctrl[i]);
  });

  it('★ with a LONE leader the new INPUT equals the old one — a generalisation, not a replacement', () => {
    // The break is at 1-2, so the largest front gap IS leader-to-second and both modes must read the
    // same distance. ★ THE CLAIM IS ABOUT THE INPUT, NOT THE COMMAND, and the first draft of this
    // case got that wrong: the two modes FOLD differently on purpose — off is
    // `Math.min(rawTarget, 1 - strength)` and on is `rawTarget * (1 - strength)` — so with a servo
    // command a hair above 1.0 they land 5e-4 apart even on an identical gap. That difference is the
    // proportional form working, not a defect, and asserting the commands equal would have been
    // asserting the feature away.
    const groupGap = gapRead(BREAK_AT_1, { groupOn: true, allowedPx: 100 });
    const offGap = gapRead(BREAK_AT_1, { groupOn: false, allowedPx: 100 });
    expect(groupGap, 'the gap must be the leader-to-second distance').toBeGreaterThan(0);
    expect(groupGap).toBeCloseTo(offGap, 10);

    // And both modes do brake him, which is what makes the shared input meaningful.
    const ctrl = arm(BREAK_AT_1, { allowedPx: 1e7 });
    const groupT = arm(BREAK_AT_1, { groupOn: true, allowedPx: 100 });
    const offT = arm(BREAK_AT_1, { groupOn: false, allowedPx: 100 });
    expect(groupT[0], 'the lone leader is braked in both modes').toBeLessThan(ctrl[0]);
    expect(offT[0]).toBeLessThan(ctrl[0]);
  });

  it('★ with the key OFF a group break is invisible — that difference IS the change', () => {
    // Leader and second together: the shipped mode reads 5 px and cannot engage a 100 px allowance.
    const ctrl = arm(BREAK_AT_2, { groupOn: false, allowedPx: 1e7 });
    const t = arm(BREAK_AT_2, { groupOn: false, allowedPx: 100 });
    for (let i = 0; i < 6; i++) expect(t[i], `racer ${i} untouched with the key off`).toBe(ctrl[i]);
  });
});

describe('★★ GROUP-GAP-BRAKE-1 — the PARADE GUARD: the group is NOT equalised', () => {
  it('★ members keep their own commanded speeds, in the same order and the same ratio (sabotage 4)', () => {
    // The unbraked commands come from the same field with the allowance far out of reach, so the
    // only difference between the two runs is whether the brake engaged.
    // ★ THE FRONT IS PERMUTED so the three members carry DIFFERENT rank errors and therefore
    // different servo commands into the brake. Without it all three are drawn where they stand, the
    // servo commands them identically, and the guard would be asserting an order between equal
    // numbers — which would pass under sabotage 4 and prove nothing.
    const PERM = [1, 0, 2];
    const ctrl = arm(BREAK_AT_3, { allowedPx: 1e7 }, PERM);
    const braked = arm(BREAK_AT_3, { allowedPx: 100 }, PERM);

    // ★★ THE CLAIM IS STATED ON THE MEMBERS THE BRAKE CAN ACTUALLY MOVE, and that qualification is
    // a measured fact rather than a convenience. The servo commands the racer standing FIRST its
    // hardest correction — `minMult` 0.85 exactly — whenever he is ahead of his drawn place, which
    // BREAKAWAY-LEVER-1 measured at 41.6% of growing frames. A member already AT the floor cannot be
    // lowered by anything, so multiplying his command and clamping it back to 0.85 leaves him at
    // 0.85. ★ THAT IS THE FLOOR'S DOING, NOT THE BRAKE'S: the owner's standing 15% bound is not
    // negotiable and the brake must not breach it. The ordering the parade guard is about is the
    // ordering the brake is free to preserve, so it is asserted among members above the floor.
    // ★ AND THE FILTER IS ON THE BRAKED VALUE, NOT THE CONTROL. A member whose control sits just
    // above the floor can be pushed ONTO it by the scaling (0.975 x 0.87 = 0.848, clamped to 0.85),
    // and a clamped member is no longer carrying the brake's ratio. The claim is about the members
    // the brake fully controls; the clamped ones are the floor speaking, which is the owner's own
    // 15% bound and must not be breached to make a test tidy.
    const free = [0, 1, 2].filter((i) => ctrl[i] > minMult + 1e-12 && braked[i] > minMult + 1e-12);
    expect(
      free.length,
      'the fixture must leave at least two members off the floor, or there is no ordering to preserve',
    ).toBeGreaterThan(1);

    for (const i of free) expect(braked[i], `member ${i} is braked`).toBeLessThan(ctrl[i]);
    // Every member, floor or not, must be braked or held — never sped up.
    for (const i of [0, 1, 2]) expect(braked[i], `member ${i} not sped up`).toBeLessThanOrEqual(ctrl[i]);

    // ★ THE CLAIM, on whichever pair differed on the way in. A shared clamp makes every member
    // equal; scaling cannot.
    const pairs = [];
    for (const i of free) for (const j of free) if (i < j && ctrl[i] !== ctrl[j]) pairs.push([i, j]);
    expect(pairs.length, 'the fixture must give two free members different commands').toBeGreaterThan(0);
    for (const [i, j] of pairs) {
      expect(
        Math.sign(braked[i] - braked[j]),
        `the faster of ${i},${j} must still be the faster`,
      ).toBe(Math.sign(ctrl[i] - ctrl[j]));
      expect(braked[i], `${i} and ${j} must not share one value`).not.toBe(braked[j]);
    }

    // ★★ AND PROPORTIONALLY — every free member is the SAME multiple of its own unbraked command,
    // which is what "proportional" means and what a shared clamp cannot produce.
    //
    // ★ THE BOUND IS DERIVED FROM THE NOISE, NOT FROM AN OBSERVED MISS. The servo adds
    // `(rng() - 0.5) * 2 * _stochasticNoise` to every command (racePlanner.js:1500), so one racer's
    // `rawTarget` lies within ±A of its deterministic value with A = NOISE_AMP. The control run and
    // the braked run draw independently, so the SAME racer's two raw commands differ by at most 2A.
    // With `ratio_i = scale · raw_i^braked / raw_i^control` and every raw command at or above
    // `minMult`, each ratio sits within `scale · 2A / minMult` of `scale`; two of them therefore sit
    // within twice that of each other:
    //       |ratio_i - ratio_j|  <=  4 · scale · A / minMult
    // At today's constants that is 4 × 0.87 × 0.0008 / 0.85 ≈ 3.3e-3. It moves if the ceiling, the
    // noise or the floor moves, because it is computed from all three rather than written down.
    const scale = 1 - CEILING;
    const RATIO_BOUND = (4 * scale * NOISE_AMP) / minMult;
    const ratios = free.map((i) => braked[i] / ctrl[i]);
    for (const r of ratios) {
      expect(
        Math.abs(r - ratios[0]),
        `every free member must carry the same scale, within the servo noise (${RATIO_BOUND.toExponential(2)})`,
      ).toBeLessThanOrEqual(RATIO_BOUND);
    }
    // ★ AND THE BOUND IS NOT VACUOUS: a shared clamp would put every member at one VALUE, so the
    // ratios would differ by as much as the members' own commands differ — far beyond this bound.
    // That is what sabotage 4 produces, and it is the ORDERING assertion above that catches it
    // strictly, with no tolerance at all.
  });

  it('the brake can only ever SLOW a member, never speed one up', () => {
    const PERM = [1, 0, 2];
    const ctrl = arm(BREAK_AT_3, { allowedPx: 1e7 }, PERM);
    const braked = arm(BREAK_AT_3, { allowedPx: 100 }, PERM);
    for (const i of [0, 1, 2])
      expect(braked[i], `member ${i} must not be sped up`).toBeLessThanOrEqual(ctrl[i]);
  });
});
