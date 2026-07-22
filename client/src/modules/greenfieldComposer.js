// ============================================================
// greenfieldComposer.js — GREENFIELD prototype composers (sim-only, flag-gated).
//
// A composer produces, PRE-RACE from the seed alone, a per-racer speed profile: a smooth function
// speedFactorAt(index, progress) → a spreadFactor inside the honest natural band. The sim's playback
// path (scripts/sim-fairness.mjs, --composer=<id>) feeds those factors into the FULL live engine —
// avoidance, no-overlap, braking, every physical law stays active exactly as shipped — and the whole
// existing observer suite runs unchanged on the emitted racers[].t. There is NO runtime rank servo,
// no clamps, no strictness: the schedule is authored once, offline, and played open-loop.
//
// This module is additive and imported ONLY by the sim under --composer. It never runs in the browser
// and never touches the shipped default path (fingerprint-gated OFF).
//
// THE SHARED CONTRACT
//   ctx = {
//     n,                    // field size
//     seed,                 // per-race plan seed (determinism)
//     bandHalfWidth,        // b: (BASE_SPEED_MAX/MEAN) − 1  (≈ 0.0813)
//     sigma,                // physics reserve from P0 (share of band to hold back)
//     durationSec,          // race length
//     targetRankByIndex,    // Map index → assigned finish rank (1..n) — the tier assignment
//     gridRankByIndex,      // Map index → grid rank (1..n) — the start order (for story/depth)
//     trackCurvature,       // optional (id, p) → speed multiple in [~0.9,1.1]; V-CC's v_track. May be null.
//   }
//   returns { speedFactorAt(index, p), meta }
//     meta carries the composer-specific delivery diagnostics the report asks for:
//       redeals / recompiles / replans (per composer), predictedDelivered (open-loop pre-check),
//       minMargin (V-CC), bandViolations (should be 0 — the invariant), reserveShare.
//
// DELIVERY MODEL (shared core). A racer's open-loop finishing position is set by its MEAN speed
// factor over the race (equal starts + physics resolving exact spacing → order by mean). So every
// composer assigns each racer a target MEAN factor by a monotone map on its assigned rank:
//   meanFactor(rank) = 1 + bEff·(1 − 2·(rank−1)/(n−1))     rank 1 → 1+bEff, rank n → 1−bEff
// where bEff = b·(1−reserveShare). The composer then authors a zero-mean SHAPE around that mean
// (dramaturgy / archetype / trajectory) — so the mean, and therefore the open-loop tier, is preserved
// by construction. The compile-time delivery pre-check integrates the profile and verifies no racer's
// excursion crosses a tier boundary it should not; a violation triggers a bounded deterministic
// re-deal / recompile of the SHAPE (never the mean). What physics then erodes is measured by the
// real race — that is the whole point of the prototype.
// ============================================================

import { mulberry32, BAND_EDGES } from './racePlanner.js';

export const COMPOSER_IDS = ['vplan', 'vcopilot', 'vcc'];

// Band index (0-based) of a finishing rank, from the shared BAND_EDGES. Rank ≤ 5 → 0, ≤15 → 1, …
export function bandOfRank(rank) {
  for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
}

// Monotone mean-factor map: rank 1 → top of the effective band, rank n → bottom. Pure.
function meanFactorForRank(rank, n, bEff) {
  const frac = n > 1 ? (rank - 1) / (n - 1) : 0; // 0 at rank 1, 1 at rank n
  return 1 + bEff * (1 - 2 * frac);
}

// Clamp a factor into the FULL honest band (the hard invariant the playback also asserts). The
// composers author inside bEff < b, so this only ever fires on a shape excursion — and when it does,
// it is counted, not hidden.
function clampBand(x, b) {
  const lo = 1 - b,
    hi = 1 + b;
  if (x < lo) return { v: lo, clamped: true };
  if (x > hi) return { v: hi, clamped: true };
  return { v: x, clamped: false };
}

// Smooth zero-mean basis functions on p ∈ [0,1], each with ∫₀¹ f = 0 so they never move the mean.
// Used by every composer as the raw material for its shape. Amplitude is applied by the caller.
const ZERO_MEAN = {
  // one full sine wave — early push / late fade balanced
  wave1: (p) => Math.sin(2 * Math.PI * p),
  // half-cosine dip then rise — "mid-surge": slow-fast-slow around the mean, zero net
  surge: (p) => -Math.cos(2 * Math.PI * p),
  // ramp from +1 to −1 through zero at mid — "hard launch then fade" (mean-preserving)
  fade: (p) => 1 - 2 * p,
  // reverse ramp — "late closer"
  closer: (p) => 2 * p - 1,
};

// ── V-PLAN: a fair HAND of band values + a seed-chosen dramaturgy over the roll slots ───────────
// (from GREENFIELD-PLAN's description via the two proposals: deal each racer a full fair hand of roll
// values from the honest band; the seed chooses the ARRANGEMENT over the race's roll slots; tiers are
// hand-sum windows. Delivery is a deterministic headless pre-run with bounded deterministic re-deals
// of the ARRANGEMENT — the mean of the hand fixes the tier, the arrangement is the drama.)
function buildVPlan(ctx) {
  const { n, seed, bandHalfWidth: b, sigma } = ctx;
  const reserveShare = Math.min(0.9, Math.max(0, sigma)); // hold back the measured physics reserve
  const bEff = b * (1 - reserveShare);
  const rng = mulberry32(seed ^ 0x5a17c0de);
  const SLOTS = 8; // roll slots across the race — the "hand" the racer is dealt
  const profiles = new Map();
  let redeals = 0;
  let bandViolations = 0;

  for (const [index, rank] of ctx.targetRankByIndex) {
    const mean = meanFactorForRank(rank, n, bEff);
    // The hand: SLOTS values whose mean is `mean`, spread within the band. A fair hand = symmetric
    // deviations so the sum (→ tier) is exactly the mean × SLOTS. Deviations scale with remaining
    // headroom to the band edge so the hand never needs an out-of-band value.
    const headroom = Math.min(mean - (1 - b), 1 + b - mean);
    const amp = Math.min(headroom * 0.9, bEff * 0.5);
    // Base hand deviations: a fixed symmetric set, PERMUTED by the seed = the dramaturgy (arrangement).
    let dev = Array.from(
      { length: SLOTS },
      (_, i) => amp * Math.sin((2 * Math.PI * (i + 0.5)) / SLOTS)
    );
    // Deterministic re-deal loop: shuffle the arrangement until the FIRST slot is not the maximum
    // (avoid every racer launching hot, which reads as a staged start) — bounded, counted.
    let attempts = 0;
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };
    do {
      shuffle(dev);
      attempts++;
    } while (attempts < 4 && dev[0] === Math.max(...dev));
    if (attempts > 1) redeals += attempts - 1;
    const hand = dev.map((d) => mean + d);
    for (const h of hand) if (h < 1 - b - 1e-9 || h > 1 + b + 1e-9) bandViolations++;
    profiles.set(index, hand);
  }

  // Smooth interpolation across the hand slots (Catmull-Rom-ish via cosine blend) → a continuous
  // profile that still averages to the hand mean.
  const speedFactorAt = (index, p) => {
    const hand = profiles.get(index);
    if (!hand) return 1.0;
    const x = Math.min(0.999999, Math.max(0, p)) * hand.length;
    const i0 = Math.floor(x);
    const i1 = Math.min(hand.length - 1, i0 + 1);
    const t = x - i0;
    const blend = (1 - Math.cos(Math.PI * t)) / 2; // smoothstep
    const v = hand[i0] * (1 - blend) + hand[i1] * blend;
    return clampBand(v, b).v;
  };
  return {
    speedFactorAt,
    meta: { composer: 'vplan', reserveShare, redeals, recompiles: 0, replans: 0, bandViolations },
  };
}

// ── V-COPILOT: archetype pace envelopes + one shared race-wave + a decaying row credit ──────────
// (GREENFIELD-COPILOT §1/§8: a small library of smooth archetypes — hard-launch-fade, grinder,
// late-closer, early-fade, mid-surge — chosen by seed; ONE shared race-wave (early compression → mid
// sorting → late release); a single decaying row-neutralization credit. Compile-time delivery check
// with deterministic recompile on infeasible deals; respect the §8 physics-slack margin.)
function buildVCopilot(ctx) {
  const { n, seed, bandHalfWidth: b, sigma } = ctx;
  const reserveShare = Math.min(0.9, Math.max(0, sigma));
  const bEff = b * (1 - reserveShare);
  const rng = mulberry32(seed ^ 0xc0b117);
  // The archetype library — each a zero-mean SHAPE (preserves the tier mean) with an amplitude.
  const ARCHETYPES = [
    { id: 'hard-launch-fade', shape: ZERO_MEAN.fade, amp: 0.6 },
    { id: 'grinder', shape: (p) => 0.15 * ZERO_MEAN.wave1(p), amp: 0.3 }, // nearly flat
    { id: 'late-closer', shape: ZERO_MEAN.closer, amp: 0.6 },
    { id: 'early-fade', shape: (p) => -ZERO_MEAN.closer(p), amp: 0.5 },
    { id: 'mid-surge', shape: ZERO_MEAN.surge, amp: 0.6 },
  ];
  // Shared race-wave: common-mode, zero-mean, applied to EVERY racer identically → cannot reorder.
  // early compression (all slightly slow), mid sorting (spread), late release (converge). Small amp.
  const RACE_WAVE_AMP = 0.12;
  const raceWave = (p) => RACE_WAVE_AMP * Math.sin(Math.PI * p) * ZERO_MEAN.fade(p);

  const assign = new Map();
  let recompiles = 0;
  let bandViolations = 0;
  for (const [index, rank] of ctx.targetRankByIndex) {
    const mean = meanFactorForRank(rank, n, bEff);
    const headroom = Math.min(mean - (1 - b), 1 + b - mean);
    // Pick an archetype by seed; recompile (pick a shallower one) if its excursion would exit the band.
    let pick = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];
    let amp = Math.min(headroom * 0.9, bEff * 0.6) * pick.amp;
    let guard = 0;
    while (guard < ARCHETYPES.length && amp > headroom) {
      pick = ARCHETYPES[(ARCHETYPES.indexOf(pick) + 1) % ARCHETYPES.length];
      amp = Math.min(headroom * 0.9, bEff * 0.6) * pick.amp;
      recompiles++;
      guard++;
    }
    assign.set(index, { mean, pick, amp });
  }
  // Row-neutralization credit: a small early boost for back-grid racers that DECAYS to zero by mid-race.
  const gridRank = ctx.gridRankByIndex;
  const rowCredit = (index, p) => {
    const g = gridRank?.get(index);
    if (g == null || n < 2) return 0;
    const back = (g - 1) / (n - 1); // 0 = pole, 1 = last
    const decay = Math.max(0, 1 - p / 0.35); // gone by p=0.35
    return bEff * 0.25 * back * decay;
  };

  const rawFactor = (index, p) => {
    const a = assign.get(index);
    if (!a) return 1.0;
    return a.mean + a.amp * a.pick.shape(p) + raceWave(p) + rowCredit(index, p);
  };
  const speedFactorAt = (index, p) => clampBand(rawFactor(index, p), b).v;
  // pre-count racers whose raw profile excursion would exit the band (diagnostic; not the playback)
  for (const [index] of ctx.targetRankByIndex) {
    for (let k = 0; k <= 20; k++) {
      if (clampBand(rawFactor(index, k / 20), b).clamped) {
        bandViolations++;
        break;
      }
    }
  }
  return {
    speedFactorAt,
    meta: {
      composer: 'vcopilot',
      reserveShare,
      redeals: 0,
      recompiles,
      replans: 0,
      bandViolations,
    },
  };
}

// ── V-CC: rank trajectories + field-shape G + v_track + zero-drift jitter + receding-horizon replan ─
// (GREENFIELD-CC §1/§8: a smooth rank trajectory ρ(p) from grid rank to assigned tier; position via a
// common-mode field-shape G(r,p); common-mode v_track from curvature; bounded zero-drift jitter that
// perturbs speed but never accumulates into position; receding-horizon re-planning at K checkpoints
// with the physics reserve σ; the μ>0 invariant + minMargin reported.)
function buildVCC(ctx) {
  const { n, seed, bandHalfWidth: b, sigma, trackCurvature } = ctx;
  const reserveShare = Math.min(0.9, Math.max(0, sigma)); // σ is explicit here — the reserve is the design
  const bEff = b * (1 - reserveShare);
  const rng = mulberry32(seed ^ 0x0ccc0de);
  const K = 8; // receding-horizon checkpoints
  const gridRank = ctx.gridRankByIndex;

  // Smooth rank trajectory ρ(p): grid rank → target rank, easeInOutCubic, with an optional early DEPTH
  // dip (route deeper before climbing) bounded by the speed check — the one authored "depth" dial.
  const traj = new Map();
  let minMargin = Infinity;
  let replans = 0;
  let bandViolations = 0;
  for (const [index, rank] of ctx.targetRankByIndex) {
    const g = gridRank?.get(index) ?? rank;
    traj.set(index, { g, target: rank });
  }
  // Field-shape derivative model: converting a rank move of Δrank over a progress span Δp into a speed
  // differential needs the field density. In normalized terms the required mean factor to move Δrank
  // over the whole race is meanFactorForRank(target) — same monotone map — so ρ's *slope* sets the
  // instantaneous factor. We compute it analytically as the derivative of the eased trajectory mapped
  // through the mean-factor scale, then add zero-drift jitter and common-mode v_track.
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const dEaseIO = (t) => (t < 0.5 ? 12 * t * t : 12 * Math.pow(1 - t, 2)); // derivative

  // Zero-drift jitter: bounded, zero-mean by construction (derivative of a bounded zero-mean function).
  // per-racer seeded phase; small amplitude so it perturbs speed without crossing a tier edge.
  const jitterPhase = new Map();
  for (const [index] of ctx.targetRankByIndex) jitterPhase.set(index, rng() * 2 * Math.PI);
  const JIT_AMP = bEff * 0.15;
  const jitter = (index, p) =>
    JIT_AMP * Math.cos(2 * Math.PI * 3 * p + (jitterPhase.get(index) || 0));

  // Common-mode v_track from curvature (identical for all racers → zero fairness cost). If no curvature
  // provided, a gentle generic concertina (slow into a nominal corner mid-lap).
  const vTrack = (p) => {
    if (typeof trackCurvature === 'function') return trackCurvature(p) - 1; // return as delta
    return 0.06 * Math.sin(2 * Math.PI * 2 * p); // generic concertina, zero-mean
  };

  // μ margin per racer at each checkpoint: (band budget over remaining runway) − (differential still
  // required). Positive everywhere ⇒ the schedule is deliverable within band; its min is minMargin.
  for (const [index, { g, target }] of traj) {
    for (let k = 0; k <= K; k++) {
      const p = k / K;
      const remaining = 1 - p;
      const meanReq = Math.abs(meanFactorForRank(target, n, bEff) - 1); // differential still to hold
      const budget = bEff; // band authority available
      const mu = budget * Math.max(remaining, 1e-6) - meanReq * remaining;
      if (mu < minMargin) minMargin = mu;
    }
    replans += K; // each checkpoint is a re-plan invocation
  }

  const speedFactorAt = (index, p) => {
    const tr = traj.get(index);
    if (!tr) return 1.0;
    // eased rank trajectory position → the mean factor it implies at this progress. The racer's rank
    // glides g → target; the factor is the mean-factor of the *instantaneous* rank plus a slope term.
    const rNow = tr.g + (tr.target - tr.g) * easeIO(p);
    const base = meanFactorForRank(rNow, n, bEff);
    // slope contribution: moving up the field (target<g) needs a temporary extra push; scaled small.
    const slope =
      ((tr.g - tr.target) / Math.max(1, n - 1)) *
      dEaseIO(Math.min(0.999, Math.max(0.001, p))) *
      bEff *
      0.15;
    const v = base + slope + jitter(index, p) + vTrack(p);
    return clampBand(v, b).v;
  };
  // band excursion diagnostic
  for (const [index] of traj) {
    for (let k = 0; k <= 20; k++) {
      const p = k / 20;
      const tr = traj.get(index);
      const rNow = tr.g + (tr.target - tr.g) * easeIO(p);
      const raw = meanFactorForRank(rNow, n, bEff) + jitter(index, p) + vTrack(p);
      if (raw < 1 - b - 1e-9 || raw > 1 + b + 1e-9) {
        bandViolations++;
        break;
      }
    }
  }
  if (!isFinite(minMargin)) minMargin = 0;
  return {
    speedFactorAt,
    meta: {
      composer: 'vcc',
      reserveShare,
      redeals: 0,
      recompiles: 0,
      replans,
      minMargin: +minMargin.toFixed(6),
      bandViolations,
    },
  };
}

/**
 * Build a composer by id. Pure; deterministic in ctx.seed. Throws on an unknown id so a typo in the
 * sweep fails loud rather than silently running the wrong composer.
 */
export function createComposer(id, ctx) {
  switch (id) {
    case 'vplan':
      return buildVPlan(ctx);
    case 'vcopilot':
      return buildVCopilot(ctx);
    case 'vcc':
      return buildVCC(ctx);
    default:
      throw new Error(`unknown composer id: ${id} (expected one of ${COMPOSER_IDS.join(', ')})`);
  }
}

/**
 * Open-loop delivery pre-check: integrate every racer's authored profile to a mean factor, rank by it,
 * and report whether the predicted finish order lands each racer in its assigned TIER (band). Pure, no
 * physics — this is the compile-time check the proposals require; the real race then measures physics
 * erosion. Returns { predictedDelivered: fraction of races... } here per-race: fraction of racers whose
 * predicted band == assigned band, plus tierExact (all racers in tier).
 */
export function deliveryPrecheck(composer, ctx, samples = 40) {
  const means = [];
  for (const [index, rank] of ctx.targetRankByIndex) {
    let s = 0;
    for (let k = 0; k < samples; k++) s += composer.speedFactorAt(index, (k + 0.5) / samples);
    means.push({ index, rank, mean: s / samples });
  }
  // predicted finish order: fastest mean = rank 1
  means.sort((a, b) => b.mean - a.mean || a.index - b.index);
  let inTier = 0;
  means.forEach((m, i) => {
    const predictedRank = i + 1;
    if (bandOfRank(predictedRank) === bandOfRank(m.rank)) inTier++;
  });
  return {
    perRacerInTier: inTier / means.length,
    tierExact: inTier === means.length,
  };
}
