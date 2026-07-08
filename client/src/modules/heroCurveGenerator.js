// ============================================================
// File:        heroCurveGenerator.js
// Path:        client/src/modules/heroCurveGenerator.js
// Project:     RaceArena
// Description: v4 Step 2 — PURE hero-curve GENERATOR. From (seed, post-chaos field state, fixed
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
import { mulberry32, BAND_EDGES } from './racePlanner.js';

// ── Config (single source of truth; documented, calibratable) ─────────────────────────────────
export const GENERATOR_CONFIG = {
  minHeroes: 2,
  maxHeroes: 4,
  anchorProgress: 0.25, // chaos→choreo boundary (pulkStart)
  // The ±20% naturalness band is the per-race DISTANCE budget for feasibility: over the remaining
  // race a racer can shift its position relative to the field by ≈ speedBudgetFrac × remaining ×
  // finishT. Converted to ranks via the live position distribution → density-adaptive.
  speedBudgetFrac: 0.2,
  // Positive handoff budget: a curve must have resolved INTO its final band by this progress,
  // leaving [budgetCheckpoint, 1.0] for the OUTCOME controller to merely settle (no late rescue).
  budgetCheckpoint: 0.9,
  // Lateral-delivery cap: max simultaneous featured crossings the lateral layer can plausibly
  // execute (Step-1 finding: dense closed tracks cause ~69% avoidance-braking on the hero).
  maxSimultaneousCrossings: 2,
  // A7: on average one-in-N races adds a deep-band FALLER; a faller must be up front post-chaos
  // (rank ≤ frontRankMax) with a deep assigned band (band index ≥ deepBandMin), both moves feasible.
  fallerEveryNRaces: 3,
  fallerFrontRankMax: 5,
  fallerDeepBandMin: 2, // B3 or deeper
  // A min-jerk segment's PEAK slope is ≈1.7× its average (slow-fast-slow). feasibleTiming allocates
  // this much extra time so the instantaneous slope — what physics limits — stays within the rate.
  minJerkPeakFactor: 1.7,
  // Intensity → drama (each endpoint a monotone function of intensity 0..1).
  reveal: { at0: 0.6, at1: 0.9 }, // resolveProgress: later reveal at higher intensity
  peakDepthFrac: { at0: 0.15, at1: 0.55 }, // comeback/hold depth as a fraction of the field
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
  const bc = config.budgetCheckpoint;
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
// POSITIVE HANDOFF BUDGET: in the final band by budgetCheckpoint, remaining change fits the margin.
export function checkPositiveBudget(curve, maxRankRate, config = GENERATOR_CONFIG) {
  const endRank = sampleHeroCurve(curve, 1.0);
  const atCheckpoint = sampleHeroCurve(curve, config.budgetCheckpoint);
  if (bandOfRank(Math.round(atCheckpoint)) !== bandOfRank(Math.round(endRank))) return false;
  return (
    Math.abs(endRank - atCheckpoint) <=
    Math.max(1, maxRankRate) * (1 - config.budgetCheckpoint) + 1e-6
  );
}
// SEPARATION: transient crossings (overtakes) are legitimate; only SUSTAINED coincidence is forbidden.
export function checkSeparation(curves, maxCoincidentFrac = 0.2) {
  const dp = 0.02;
  const samples = [];
  for (let p = GENERATOR_CONFIG.anchorProgress; p <= 1.0 + 1e-9; p += dp)
    samples.push(Math.min(p, 1));
  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      let near = 0;
      for (const p of samples)
        if (Math.abs(sampleHeroCurve(curves[i], p) - sampleHeroCurve(curves[j], p)) < 0.5) near++;
      if (near / samples.length > maxCoincidentFrac) return false;
    }
  }
  return true;
}

// ── Faller cadence (A7): seeded ~one-in-N. Pure (seed-derived), so it is deterministic per race. ──
export function shouldCastFaller(seed, config = GENERATOR_CONFIG) {
  return mulberry32((seed >>> 0) ^ 0x7a11e5)() < 1 / config.fallerEveryNRaces;
}

// ── Casting (A6/A7): assign 2–4 heroes + a feasible story to each. Seeded, jittered (anti-repetition). ─
export function castHeroes(
  rng,
  postChaos,
  finalRanks,
  drama,
  finishT,
  seed,
  config = GENERATOR_CONFIG
) {
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

  // Role 1 — the assigned winner (final rank 1): sovereign lead if already front, else comeback-to-win.
  if (winnerIdx != null) {
    const wr = stateOf.get(winnerIdx)?.rank ?? 1;
    const peakRank = clamp(Math.round(1 + drama.peakDepthFrac * (n - 1)), 1, n);
    if (wr <= peakRank) addSolo(winnerIdx, 'sovereign-lead', 1, Math.max(1, wr));
    else addSolo(winnerIdx, 'comebacker', 1, wr);
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
    const fr = finalRanks.get(p.index);
    const peakRank =
      p.rank > fr ? p.rank : Math.min(n, fr + Math.round(drama.peakDepthFrac * (n - 1)));
    addSolo(p.index, p.rank > fr ? 'comebacker' : 'sovereign-lead', fr, peakRank);
  }

  return cast;
}

// ── Camera plan (A8): forward-looking cast + roles + beat timing for the camera director, shaped to
// EXTEND the existing updateRacePlan(b1Indices) channel (backward-compatible Set + richer beats). ──
export function buildCameraPlan(cast, curves, finalRanks) {
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
    if (!checkPositiveBudget(anchored, member.maxRankRate, config)) continue;
    curves.push({ index: member.index, role: member.role, curve: anchored });
  }

  const cameraPlan = buildCameraPlan(cast, curves, finalRanks);
  return { heroCast: cast, curves, cameraPlan, finalRanks, requestedIntensity, realizedIntensity };
}
