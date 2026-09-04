// ============================================================
// File:        heroCurveGenerator.js
// Path:        client/src/modules/heroCurveGenerator.js
// Project:     RaceArena
// Description: choreo Step 2 — PURE hero-curve GENERATOR. From (seed, post-chaos field state, fixed
//              Fisher-Yates final ranks, action-intensity, config) it returns a small cast of heroes
//              (2–4) with anchored position-curves + a forward-looking cameraPlan.
//
//              Fairness is ENDPOINT-ONLY: each hero FINISHES in its assigned band and the field's
//              final-band multiset is preserved (role pairing = same-band endpoint swap only). During
//              the race a curve may cross ANY bands — a deep comeback (rank 20 → 3) is the action.
//
//              Feasibility is DENSITY-based, not a fixed rank-rate: the ±20% speed band over the
//              remaining time is a DISTANCE budget, converted to ranks via the ACTUAL post-chaos
//              position (t) distribution. A bunched field lets a racer pass many (deep comeback
//              feasible); a spread field lets it pass few (deep comeback refused). Only the
//              physically impossible is refused. Positive OUTCOME handoff budget is a hard constraint
//              (resolve into band before the checkpoint — no late rescue).
//
//              ISOLATED: not wired into the race path (Step 3). Reuses Step-1 primitives
//              (makeHeroCurve / anchorHeroCurve / sampleHeroCurve) and the shared BAND_EDGES /
//              mulberry32. Pure + deterministic + fingerprintable. Decomposed into small tested units.
// ============================================================

import { makeHeroCurve, anchorHeroCurve, sampleHeroCurve } from './heroChoreography.js';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { mulberry32, BAND_EDGES, DEFAULT_PHASE_FRACTIONS } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

// ── Config (single source of truth; documented, calibratable) ─────────────────────────────────
export const GENERATOR_CONFIG = {
  minHeroes: 2,
  maxHeroes: 4,
  // chaos→choreo boundary (= PULK begin). NO independent literal here: the race path threads the LIVE
  // resolved pulkStart fraction into this config per race (racePlanner.js), and this fallback (used
  // only by direct/test generateHeroCurves calls) derives from THE single source, DEFAULT_PHASE_FRACTIONS.pulkStart.
  // A getter, not a value, so it resolves lazily — DEFAULT_PHASE_FRACTIONS is undefined during the
  // racePlanner↔heroCurveGenerator circular import at module-init, but always defined by call time.
  get anchorProgress() {
    return DEFAULT_PHASE_FRACTIONS.pulkStart;
  },
  // Per-race DISTANCE budget for feasibility: over the remaining race a racer can shift its position
  // relative to the field by ≈ speedBudgetFrac × remaining × finishT, converted to ranks via the live
  // position distribution (density-adaptive). Calibrated (Step 3) to the hero ACTUATOR's climb
  // authority — the trajectoryMult servo gives ≈+10% over the field — so the generator never hands a
  // hero a curve steeper than its servo can track. (Drops via −15% are a touch faster; 0.10 is the
  // conservative binding direction.)
  speedBudgetFrac: 0.1,
  // STAGGERED PER-BAND RESOLVE (Step 4): each hero must resolve INTO its final band by its band's
  // resolveProgress — deeper bands earlier (they fall back sooner and hold), the front (B1) latest.
  // B1 is held to releaseProgress, then the follower RELEASES it to natural speed for a real finish
  // contest (order among B1 is free → still fair). Deep bands keep positive backstop budget by
  // resolving early; B1's "budget" is the natural run-out. Indices are band 0=B1 … 4=B5; band 0 uses
  // releaseProgress. DevScreen-adjustable — mirrored in DEFAULT_RACE_DYNAMICS_CONFIG (single source
  // for the tunable values), passed in via the generator config.
  releaseProgress: 0.97,
  bandResolve: [0.97, 0.8, 0.7, 0.65, 0.6],
  // Hole guard: reject a hero set that leaves a rank gap wider than this fraction of the field at
  // any sampled time (a backstop; the loose pack is the primary field-continuity mechanism).
  maxHoleFrac: 0.55,
  // Lateral-delivery cap: max simultaneous featured crossings the lateral layer can plausibly
  // execute (Step-1 finding: dense closed tracks cause ~69% avoidance-braking on the hero).
  maxSimultaneousCrossings: 2,
  // A7: on average one-in-N races adds a deep-band FALLER; a faller must be up front post-chaos
  // (rank ≤ frontRankMax) with a deep assigned band (band index ≥ deepBandMin), both moves feasible.
  fallerEveryNRaces: 3,
  fallerFrontRankMax: 5,
  // A faller drops from the front into a lower band. B2 (mid-pack) is the realistic floor: the
  // staggered resolve (A4) resolves deeper bands EARLIER (B3 by ~0.70), which leaves too little time
  // for a front→B3+ drop to be feasible, so front→B2 (resolve ~0.80) is the reliably-castable faller.
  fallerDeepBandMin: 1, // B2 or deeper
  // A min-jerk segment's PEAK slope is ≈1.7× its average (slow-fast-slow). feasibleTiming allocates
  // this much extra time so the instantaneous slope — what physics limits — stays within the rate.
  minJerkPeakFactor: 1.7,
  // Intensity → drama (each endpoint a monotone function of intensity 0..1).
  reveal: { at0: 0.6, at1: 0.9 }, // resolveProgress: later reveal at higher intensity
  peakDepthFrac: { at0: 0.15, at1: 0.55 }, // comeback/hold depth as a fraction of the field
  // ── B2-attacker "Attack & Fall". THESE FOUR READ THE ONE HOME (ONE-HOME-1, 2026-08-19). ─────────
  // This block used to say "the 0 below is only the direct/test-call fallback, not the shipped
  // default" — a written decision to keep a SECOND definition beside the first. The owner's ruling
  // ends it: a caller that passes no config reads the one home, and a direct or test call is exactly
  // such a caller. A test that calls this generator bare now gets the SHIPPED game rather than a
  // quietly disabled one, which is the only answer that makes a bare call worth anything.
  // Cast b2AttackHeroes ADDITIONAL heroes (beyond the nHeroes budget) from FRONT-post-chaos B2-finishers.
  // Each climbs to b2AttackPeakRank (mandatory choreography), then the curve steers it DOWN to
  // b2AttackFinalRank (a specific B2 rank = the orchestrated-fall length knob), after which the servo
  // RELEASES it to pack-like free reorder (racePlanner: Track-to-FinalRank, then Free). They bypass the
  // standard B2 0.80 resolve checkpoint — the orchestrated fall may run until b2AttackResolveProgress
  // (hero-privilege), leaving [resolve, 1.0] as the free window. Peak timing jittered in b2AttackProgress.
  b2AttackHeroes: DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes,
  b2AttackPeakRank: DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackPeakRank,
  b2AttackFinalRank: DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank,
  b2AttackProgress: { ...DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress },
  b2AttackResolveProgress: DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackResolveProgress,
};

// ── Band helpers (derived from the shared BAND_EDGES constant — single source for the edges) ────
export function bandOfRank(rank) {
  for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
}
export function bandBounds(bandIdx) {
  const lo = bandIdx === 0 ? 1 : BAND_EDGES[bandIdx - 1] + 1;
  const hi = bandIdx < BAND_EDGES.length ? BAND_EDGES[bandIdx] : Infinity;
  return [lo, hi];
}
export function bandMultiset(finalRanks) {
  const counts = new Array(BAND_EDGES.length + 1).fill(0);
  for (const rank of finalRanks.values()) counts[bandOfRank(rank)]++;
  return counts;
}
// The progress by which a hero of the given band must resolve into its band (A4). B1 (0) is held
// to releaseProgress (then the follower releases it to natural); deeper bands resolve earlier.
export function resolveForBand(bandIdx, config = GENERATOR_CONFIG) {
  return bandIdx === 0 ? config.releaseProgress : config.bandResolve[bandIdx];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (range, t) => range.at0 + (range.at1 - range.at0) * t;

// ── DENSITY-BASED feasibility: the reachable rank window + per-progress rank rate for one racer,
// from the ±20% distance budget over the remaining race, counted against the live t-distribution. ─
export function racerFeasibility(racer, postChaos, finishT, config = GENERATOR_CONFIG) {
  const n = postChaos.length;
  const remaining = 1 - config.anchorProgress;
  const shift = config.speedBudgetFrac * remaining * finishT; // max relative position shift (t-space)
  let ahead = 0;
  let behind = 0;
  for (const p of postChaos) {
    if (p.index === racer.index) continue;
    if (p.t > racer.t && p.t <= racer.t + shift) ahead++;
    else if (p.t < racer.t && p.t >= racer.t - shift) behind++;
  }
  return {
    bestRank: Math.max(1, racer.rank - ahead), // climb past `ahead` racers
    worstRank: Math.min(n, racer.rank + behind), // drop behind `behind` racers
    maxRankRate: remaining > 0 ? (ahead + behind) / remaining : 0, // density-derived rank/progress
  };
}

// ── Same-band ENDPOINT swap (A4): swap two finals ONLY within a band → band multiset preserved. ──
export function sameBandSwap(finalRanks, idxA, idxB) {
  const rA = finalRanks.get(idxA);
  const rB = finalRanks.get(idxB);
  if (bandOfRank(rA) !== bandOfRank(rB)) {
    throw new Error(`sameBandSwap: cross-band swap refused (${rA} vs ${rB})`);
  }
  const next = new Map(finalRanks);
  next.set(idxA, rB);
  next.set(idxB, rA);
  return next;
}

// ── Intensity → drama parameters (monotone) + per-race feasibility clamp ─────────────────────────
export function intensityToDrama(intensity, config = GENERATOR_CONFIG) {
  const t = clamp(intensity, 0, 1);
  return {
    intensity: t,
    resolveProgress: lerp(config.reveal, t),
    peakDepthFrac: lerp(config.peakDepthFrac, t),
    nHeroes: Math.round(config.minHeroes + (config.maxHeroes - config.minHeroes) * t),
  };
}
// Reduce intensity until the assigned winner's comeback (its deepest role) is feasible from THIS
// field's density. Returns realized ≤ requested.
export function clampIntensityToBudget(
  requested,
  postChaos,
  finalRanks,
  finishT,
  config = GENERATOR_CONFIG
) {
  const winnerIdx = [...finalRanks.entries()].find(([, r]) => r === 1)?.[0];
  const winner = postChaos.find((p) => p.index === winnerIdx);
  if (!winner) return clamp(requested, 0, 1);
  const feas = racerFeasibility(winner, postChaos, finishT, config);
  const n = postChaos.length;
  for (let t = clamp(requested, 0, 1); t > 0; t -= 0.05) {
    const drama = intensityToDrama(t, config);
    const peakRank = clamp(Math.round(1 + drama.peakDepthFrac * (n - 1)), 1, n);
    // Winner must be able to climb from its intended peak back to rank 1 within the density budget.
    if (peakRank <= feas.worstRank && 1 >= feas.bestRank) return +t.toFixed(4);
  }
  return 0;
}

// ── Feasible timing: place peak + resolve so both moves stay within the density rank-rate AND the
// resolve completes by the budget checkpoint (positive handoff budget). null = infeasible. ─────────
export function feasibleTiming(
  anchorRank,
  peakRank,
  finalRank,
  maxRankRate,
  drama,
  config = GENERATOR_CONFIG
) {
  const ap = config.anchorProgress;
  // Resolve by the FINAL band's checkpoint (A4): deep bands earlier, B1 held to the release.
  const bc = resolveForBand(bandOfRank(finalRank), config);
  if (maxRankRate <= 0)
    return anchorRank === peakRank && peakRank === finalRank
      ? { peakProgress: ap + 0.1, resolveProgress: Math.min(bc, ap + 0.2) }
      : null;
  // Allocate time against the PEAK (not average) min-jerk slope so the instantaneous rate stays feasible.
  const span1 = (config.minJerkPeakFactor * Math.abs(anchorRank - peakRank)) / maxRankRate;
  const span2 = (config.minJerkPeakFactor * Math.abs(peakRank - finalRank)) / maxRankRate;
  if (ap + span1 + span2 + 0.06 > bc) return null; // cannot fit with positive budget
  const resolveProgress = clamp(drama.resolveProgress, ap + span1 + span2 + 0.06, bc);
  const peakProgress = clamp(
    resolveProgress - span2 - 0.03,
    ap + span1 + 0.03,
    resolveProgress - 0.03
  );
  return { peakProgress, resolveProgress };
}

// ── B2-attacker timing: place the mandatory climb (anchor→peak) + the orchestrated fall (peak→finalRank)
// so both stay within the density rank-rate AND complete by b2AttackResolveProgress — the BYPASSED, later
// checkpoint (hero-privilege; the standard B2 0.80 resolve does not apply). Peak timing is drawn from the
// config window, clamped feasible. `idx` varies the jitter per attacker so two attackers don't peak in
// lockstep. null = infeasible (climb+fall can't fit the runway). ─────────────────────────────────────
function attackerTiming(anchorRank, peakRank, finalRank, maxRankRate, config, seed, idx) {
  const ap = config.anchorProgress;
  const bc = config.b2AttackResolveProgress ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackResolveProgress;
  if (maxRankRate <= 0) return null;
  const span1 = (config.minJerkPeakFactor * Math.abs(anchorRank - peakRank)) / maxRankRate;
  const span2 = (config.minJerkPeakFactor * Math.abs(peakRank - finalRank)) / maxRankRate;
  if (ap + span1 + span2 + 0.06 > bc) return null; // climb + orchestrated fall can't fit before checkpoint
  const win = config.b2AttackProgress ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress;
  const j = mulberry32((((seed >>> 0) ^ 0xa77ac4) + idx * 0x9e3779b9) >>> 0)();
  let peakProgress = win.start + (win.end - win.start) * j;
  peakProgress = clamp(
    peakProgress,
    ap + span1 + 0.03,
    Math.max(ap + span1 + 0.03, bc - span2 - 0.03)
  );
  const resolveProgress = clamp(peakProgress + span2 + 0.03, peakProgress + 0.03, bc);
  return { peakProgress, resolveProgress };
}

// ── Archetype family A: SOLO (comebacker / sovereign-lead / faller) → raw waypoints (placeholder
// first point, replaced by the runtime anchor). Crosses bands freely; feasibility is checked below. ─
export function soloWaypoints(
  { peakRank, peakProgress, finalRank, resolveProgress },
  config = GENERATOR_CONFIG
) {
  const wp = [{ progress: config.anchorProgress, rank: 1 }]; // placeholder (anchor replaces it)
  // Include a peak waypoint only when it is a genuine excursion away from the final (≥2 ranks); a
  // degenerate peak equal to the final would just add a kink. The resolve waypoint is the LAST point
  // (no separate hold plateau) — sampleHeroCurve holds the final rank after it, and the last control
  // point settles with zero tangent, so the curve eases into the final band WITHOUT overshoot.
  if (
    peakProgress > config.anchorProgress &&
    peakProgress < resolveProgress &&
    Math.abs(peakRank - finalRank) >= 2
  ) {
    wp.push({ progress: peakProgress, rank: peakRank });
  }
  wp.push({ progress: resolveProgress, rank: finalRank });
  return wp;
}
// ── Archetype family B: RELATIONAL (photo-finish / front-battle-then-collapse) → two waypoint lists. ─
export function relationalWaypoints(
  { mode, convergeProgress, frontRank, finalA, finalB },
  config = GENERATOR_CONFIG
) {
  if (mode === 'photo') {
    return {
      a: soloWaypoints(
        {
          peakRank: frontRank,
          peakProgress: convergeProgress,
          finalRank: finalA,
          resolveProgress: 0.98,
        },
        config
      ),
      b: soloWaypoints(
        {
          peakRank: frontRank + 2,
          peakProgress: convergeProgress,
          finalRank: finalB,
          resolveProgress: 0.98,
        },
        config
      ),
    };
  }
  return {
    a: soloWaypoints(
      {
        peakRank: frontRank,
        peakProgress: convergeProgress,
        finalRank: finalA,
        resolveProgress: 0.95,
      },
      config
    ),
    b: soloWaypoints(
      {
        peakRank: frontRank + 2,
        peakProgress: convergeProgress,
        finalRank: finalB,
        resolveProgress: Math.min(0.9, convergeProgress + 0.15),
      },
      config
    ),
  };
}

// ── Generation-time checks ───────────────────────────────────────────────────────────────────────
// FEASIBILITY: no sampled segment demands a faster rank change than the racer's density rank-rate.
export function checkFeasible(curve, maxRankRate) {
  const pts = curve.points;
  const dp = 0.02;
  let prev = sampleHeroCurve(curve, pts[0].progress);
  for (let p = pts[0].progress + dp; p <= 1.0 + 1e-9; p += dp) {
    const cur = sampleHeroCurve(curve, Math.min(p, 1));
    if (Math.abs(cur - prev) / dp > maxRankRate + 1e-6) return false;
    prev = cur;
  }
  return true;
}
// POSITIVE HANDOFF BUDGET (per-band, A4): the curve must be IN its final band by that band's
// resolveProgress, and the remaining change after fits the leftover budget — so deep bands leave the
// OUTCOME backstop room, and B1 is settled in its front cluster before the natural-speed release.
export function checkPositiveBudget(curve, maxRankRate, config = GENERATOR_CONFIG) {
  const endRank = sampleHeroCurve(curve, 1.0);
  const finalBand = bandOfRank(Math.round(endRank));
  const rp = resolveForBand(finalBand, config);
  const atResolve = sampleHeroCurve(curve, rp);
  if (bandOfRank(Math.round(atResolve)) !== finalBand) return false;
  return Math.abs(endRank - atResolve) <= Math.max(1, maxRankRate) * (1 - rp) + 1e-6;
}
// SEPARATION MOVED TO THE TEST FILE (SEPARATION-TO-TEST-1, the owner's decision 2026-08-19).
// `checkSeparation` lived here and was called by nothing but `heroCurveGenerator.test.js` — it never
// gated, rejected or retried a plan, and two specs in a row were written on the assumption that it
// did. It now lives where it is used. NOTHING CHECKS AT RUN TIME THAT TWO HEROES ARE ON DIFFERENT
// SCRIPTS; the assertion covers generated curves in the suite, which is what it always did.

// HOLE GUARD (A5, Step 4): as bands resolve in stages, the field must stay continuous — no large
// empty rank-stretch. Ranks are always a contiguous permutation, so the honest check projects the
// WHOLE field — heroes on their curves + the PACK linearly interpolated from its post-chaos rank
// toward its final rank (the loose controller's rough path) — and rejects only if the projected field
// leaves a gap wider than maxHoleFrac × n at any sampled time (a genuine pile-up). The pack is the
// primary continuity mechanism; this is a backstop that will not fire for a normal, dense field.
export function checkFieldContinuity(
  heroCurves,
  heroIndices,
  postChaos,
  finalRanks,
  config = GENERATOR_CONFIG
) {
  const n = postChaos.length;
  const maxGap = config.maxHoleFrac * n;
  const heroSet = new Set(heroIndices);
  const pack = postChaos.filter((p) => !heroSet.has(p.index));
  const span = 1 - config.anchorProgress;
  for (let p = config.anchorProgress; p <= 1.0 + 1e-9; p += 0.05) {
    const w = span > 0 ? Math.min(1, (p - config.anchorProgress) / span) : 1;
    const ranks = heroCurves.map((c) => sampleHeroCurve(c, Math.min(p, 1)));
    for (const pk of pack)
      ranks.push(pk.rank + ((finalRanks.get(pk.index) ?? pk.rank) - pk.rank) * w);
    ranks.sort((a, b) => a - b);
    for (let i = 1; i < ranks.length; i++) if (ranks[i] - ranks[i - 1] > maxGap) return false;
  }
  return true;
}

// ── Faller cadence (A7): seeded ~one-in-N. Pure (seed-derived), so it is deterministic per race. ──
export function shouldCastFaller(seed, config = GENERATOR_CONFIG) {
  return mulberry32((seed >>> 0) ^ 0x7a11e5)() < 1 / config.fallerEveryNRaces;
}

// ── Casting (A6/A7): assign 2–4 heroes + a feasible story to each. Seeded, jittered (anti-repetition). ─
function castHeroes(rng, postChaos, finalRanks, drama, finishT, seed, config = GENERATOR_CONFIG) {
  const n = postChaos.length;
  const stateOf = new Map(postChaos.map((p) => [p.index, p]));
  const winnerIdx = [...finalRanks.entries()].find(([, r]) => r === 1)?.[0];
  const cast = [];
  const used = new Set();

  const addSolo = (index, role, finalRank, peakRank) => {
    const state = stateOf.get(index);
    if (!state || used.has(index)) return false;
    const feas = racerFeasibility(state, postChaos, finishT, config);
    if (finalRank < feas.bestRank || finalRank > feas.worstRank) return false; // endpoint unreachable
    const timing = feasibleTiming(state.rank, peakRank, finalRank, feas.maxRankRate, drama, config);
    if (!timing) return false;
    cast.push({
      index,
      role,
      finalRank,
      params: { peakRank, finalRank, ...timing },
      maxRankRate: feas.maxRankRate,
    });
    used.add(index);
    return true;
  };

  // Small-gap winner + front contest (A1/A3): B1 heroes resolve into a TIGHT front cluster (ranks
  // 2,3,4… — a close pack, NOT a clear rank-1 lead), held to the release; natural speed then decides
  // 1st. So no B1 hero is steered to a cruising lead. Assigning the winner to cluster rank 2 (not 1)
  // is fair (still B1) and leaves rank 1 to be won by the run-out.
  let b1Cluster = 2;
  const nextCluster = () => Math.min(b1Cluster, BAND_EDGES[0]);

  // Role 1 — the assigned winner (final rank 1): sovereign lead if already front, else comeback-to-win.
  if (winnerIdx != null) {
    const wr = stateOf.get(winnerIdx)?.rank ?? 1;
    const cr = nextCluster();
    const role = wr <= cr ? 'sovereign-lead' : 'comebacker';
    if (addSolo(winnerIdx, role, cr, wr <= cr ? Math.max(1, wr) : wr)) b1Cluster++;
  }

  // A7 — on average every N-th race, add ONE deep-band FALLER FIRST (reserve its slot before the B1
  // pool fills up): a front-post-chaos racer whose deep final band is a FEASIBLE drop (endpoint
  // within reach). Held front by its own curve+servo, then dropped — no external force on the pack.
  if (cast.length < drama.nHeroes && shouldCastFaller(seed, config)) {
    // Front-post-chaos racers with a deep assigned band, nearest the front first. addSolo below
    // enforces the FULL feasibility (reachable endpoint AND a positive-budget drop) — so try
    // candidates until one actually holds; a too-deep drop is skipped, not silently dropped.
    const candidates = postChaos
      .filter(
        (p) =>
          !used.has(p.index) &&
          p.rank <= config.fallerFrontRankMax &&
          bandOfRank(finalRanks.get(p.index)) >= config.fallerDeepBandMin
      )
      .sort((a, b) => a.rank - b.rank);
    for (const p of candidates) {
      if (addSolo(p.index, 'faller', finalRanks.get(p.index), Math.max(1, p.rank))) break;
    }
  }

  // B1-band finishers (final rank ≤ BAND_EDGES[0]), jittered for anti-repetition. Fill the remaining
  // slots as comebackers (deep post-chaos) or sovereigns (front post-chaos).
  const b1Pool = postChaos
    .filter((p) => !used.has(p.index) && finalRanks.get(p.index) <= BAND_EDGES[0])
    .map((p) => ({ ...p, key: rng() }))
    .sort((a, b) => a.key - b.key);
  for (const p of b1Pool) {
    if (cast.length >= drama.nHeroes) break;
    const cr = nextCluster(); // tight front cluster, not the exact assigned rank (A3)
    const peakRank =
      p.rank > cr ? p.rank : Math.min(n, cr + Math.round(drama.peakDepthFrac * (n - 1)));
    if (addSolo(p.index, p.rank > cr ? 'comebacker' : 'sovereign-lead', cr, peakRank)) b1Cluster++;
  }

  // ── B2-ATTACKER "Attack & Fall" (ADDITIONAL heroes, beyond the nHeroes budget; OFF via b2AttackHeroes 0) ──
  // FRONT-post-chaos B2-finishers climb to b2AttackPeakRank, then the curve steers them down to
  // b2AttackFinalRank (the orchestrated-fall length). Front-first because only a SMALL climb-to-peak stays
  // feasible — a mid/back B2 racer can't reach a deep peak and fall back within the runway. attackerTiming
  // + racerFeasibility enforce the full climb+fall feasibility, so infeasible candidates are skipped, not
  // cast unfair. These are cast AFTER (and independently of) the nHeroes cap — a separate attacker budget.
  const nAttack = config.b2AttackHeroes ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes;
  if (nAttack > 0) {
    const peakRank = clamp(
      Math.round(config.b2AttackPeakRank ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackPeakRank),
      1,
      n
    );
    const [b2Lo, b2Hi] = bandBounds(1); // B2 rank bounds
    const finalRank = clamp(
      Math.round(config.b2AttackFinalRank ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank),
      b2Lo,
      Math.min(b2Hi, n)
    );
    const b2Front = postChaos
      .filter((p) => !used.has(p.index) && bandOfRank(finalRanks.get(p.index)) === 1)
      .sort((a, b) => a.rank - b.rank); // front-post-chaos first (smallest, feasible, climb)
    let nCast = 0;
    for (const p of b2Front) {
      if (nCast >= nAttack) break;
      const feas = racerFeasibility(p, postChaos, finishT, config);
      if (peakRank < feas.bestRank) continue; // can't climb to the intended peak
      if (finalRank > feas.worstRank) continue; // can't reach the intended fall depth
      const timing = attackerTiming(
        p.rank,
        peakRank,
        finalRank,
        feas.maxRankRate,
        config,
        seed,
        nCast
      );
      if (!timing) continue;
      cast.push({
        index: p.index,
        role: 'attacker-b2',
        finalRank,
        peakRank,
        params: { peakRank, finalRank, ...timing },
        maxRankRate: feas.maxRankRate,
      });
      used.add(p.index);
      nCast++;
    }
  }

  return cast;
}

// ── Camera plan (A8): forward-looking cast + roles + beat timing for the camera director, shaped to
// EXTEND the existing updateRacePlan(b1Indices) channel (backward-compatible Set + richer beats). ──
function buildCameraPlan(cast, curves, finalRanks) {
  const b1Indices = new Set(
    [...finalRanks.entries()].filter(([, r]) => r <= BAND_EDGES[0]).map(([i]) => i)
  );
  const heroes = curves.map(({ index, role, curve }) => ({
    index,
    role,
    finalRank: finalRanks.get(index),
    beats: curve.points.map((pt, i) => ({
      progress: +pt.progress.toFixed(3),
      event: i === 0 ? 'anchor' : i === curve.points.length - 1 ? 'resolve' : 'peak',
    })),
  }));
  return { b1Indices, heroes };
}

// ── Orchestrator: the pure generator ─────────────────────────────────────────────────────────────
export function generateHeroCurves({
  seed,
  postChaos,
  finalRanks,
  intensity = 0.5,
  finishT,
  config = GENERATOR_CONFIG,
}) {
  const rng = seed > 0 ? mulberry32((seed >>> 0) ^ 0x1e5a17c3) : Math.random;
  const requestedIntensity = clamp(intensity, 0, 1);
  const realizedIntensity = clampIntensityToBudget(
    requestedIntensity,
    postChaos,
    finalRanks,
    finishT,
    config
  );
  const drama = intensityToDrama(realizedIntensity, config);

  const cast = castHeroes(rng, postChaos, finalRanks, drama, finishT, seed, config);

  const curves = [];
  for (const member of cast) {
    const state = postChaos.find((p) => p.index === member.index);
    if (!state) continue;
    const anchored = anchorHeroCurve(
      makeHeroCurve(soloWaypoints(member.params, config)),
      config.anchorProgress,
      state.rank,
      state.vel ?? 0
    );
    // Never emit a curve that violates a generation-time constraint (feasibility / positive budget).
    if (!checkFeasible(anchored, member.maxRankRate)) continue;
    // Positive-budget (in-band by the band's resolve checkpoint) applies to standard heroes. B2-attackers
    // BYPASS it by design (hero-privilege: their orchestrated fall resolves later, at b2AttackResolveProgress,
    // and the servo re-steer — not the checkpoint — keeps the endpoint in B2). So skip it for that role.
    if (member.role !== 'attacker-b2' && !checkPositiveBudget(anchored, member.maxRankRate, config))
      continue;
    // HOLE GUARD (A5): reject a curve that would open a field gap the projected pack can't fill.
    // Gradual falls + the loose pack are the primary continuity; this drops the offending hero.
    const trial = [...curves, { index: member.index, curve: anchored }];
    if (
      !checkFieldContinuity(
        trial.map((c) => c.curve),
        trial.map((c) => c.index),
        postChaos,
        finalRanks,
        config
      )
    )
      continue;
    curves.push({
      index: member.index,
      role: member.role,
      curve: anchored,
      // B2-attacker servo needs these at runtime (peak-reached tracking + release-at-finalRank latch).
      ...(member.role === 'attacker-b2'
        ? { peakRank: member.peakRank, finalRank: member.finalRank }
        : {}),
    });
  }

  const cameraPlan = buildCameraPlan(cast, curves, finalRanks);
  return {
    heroCast: cast,
    curves,
    cameraPlan,
    finalRanks,
    requestedIntensity,
    realizedIntensity,
  };
}
