// ============================================================
// File:        chainChoreography.js
// Path:        client/src/modules/chainChoreography.js
// Project:     RaceArena
// Description: WHOLE-FIELD chain choreography (flag chainChoreoEnabled; default OFF → not imported paths
//              run). Where hero choreography casts 2–4 heroes and pins the pack to a constant target,
//              chain choreography authors a rank-space curve for EVERY racer from its post-chaos rank to
//              its DRAWN place (the shipped fair draw, untouched — passed in as finalRanks). Between the
//              two it eases (min-jerk) with a small, seeded, OUTCOME-NEUTRAL oscillation so racers cross
//              on the way (the choreography IS the action). At the finish the ease is complete and the
//              oscillation is ×0, so the endpoint is EXACTLY the drawn place — L181-safe by construction.
//
//              REUSE: the curve machinery is the shipped hero-curve engine (makeHeroCurve /
//              anchorHeroCurve / sampleHeroCurve in heroChoreography.js) — this module only AUTHORS the
//              waypoints for the full field (the same role soloWaypoints plays for heroes) and lists the
//              re-plan checkpoints. Pure + deterministic (seeded). Sim-proven in scripts/exp/chain-sim.mjs
//              and reports/evolution/CHAIN-SIM-1.md.
// ============================================================

import { makeHeroCurve, anchorHeroCurve } from './heroChoreography.js';
import { mulberry32 } from './racePlanner.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep (min-jerk easing)

/**
 * K re-plan checkpoints, duration-scaled from ONE global segment duration. Same clamp the sim proved:
 * K = clamp(round(durationSec / segSec), 3, 8). No hardcoded progress constant.
 * @param {number} durationSec
 * @param {number} segSec
 * @returns {number} K in [3,8]
 */
export function chainCheckpointCount(durationSec, segSec) {
  return clamp(Math.round(durationSec / Math.max(1e-6, segSec)), 3, 8);
}

/**
 * Author a full-field set of rank-space curves for chain choreography.
 *
 * @param {object}   args
 * @param {number}   args.seed            plan seed (deterministic)
 * @param {Array<{index:number, rank:number, vel?:number}>} args.postChaos  live field at the boundary,
 *                                        ordered by rank (rank = 1 is leading); vel = d rank / d progress
 * @param {Map<number,number>} args.finalRanks  index → DRAWN final place (the shipped fair draw)
 * @param {number}   args.anchorProgress  the chaos→strict boundary fraction (pulkStartFrac) — curves start here
 * @param {number}   args.K               re-plan checkpoint count (from chainCheckpointCount)
 * @param {number}   args.mExtra          outcome-neutral oscillation amplitude (0 = pure monotone ease)
 * @returns {{ curves: Array<{index:number, curve:object, finalRank:number}>, checkpoints: number[] }}
 */
export function generateChainCurves({ seed, postChaos, finalRanks, anchorProgress, K, mExtra }) {
  const N = postChaos.length;
  const rng = mulberry32(((seed | 0) ^ 0x9e3779b9) >>> 0 || 1);

  // K checkpoints in (anchorProgress, 1]. The last is exactly 1.0 (the finish) → the drawn formation.
  const checkpoints = [];
  for (let k = 1; k <= K; k++) checkpoints.push(anchorProgress + (1 - anchorProgress) * (k / K));

  const curves = [];
  for (const pc of postChaos) {
    const anchorRank = clamp(pc.rank, 1, N);
    const finalRank = clamp(finalRanks.get(pc.index) ?? pc.rank, 1, N);
    // Per-racer seeded oscillation (extra crossings; vanishes at the finish). Drawn per racer so the
    // schedule differs every race and is not a synchronized wave. NEVER reads start row or live order.
    const oscN = 1 + Math.floor(rng() * 3); // 1..3 lobes
    const oscPh = rng() * Math.PI * 2;

    const waypoints = [{ progress: anchorProgress, rank: anchorRank }];
    for (let k = 1; k <= K; k++) {
      const prog = checkpoints[k - 1];
      const frac = (prog - anchorProgress) / Math.max(1e-6, 1 - anchorProgress); // 0..1
      let rank;
      if (k === K) {
        // ENDPOINT INVARIANT: exactly the drawn place; no excursion. This is the L181-safe attractor.
        rank = finalRank;
      } else {
        const base = lerp(anchorRank, finalRank, smoother(frac));
        const osc = mExtra * Math.sin(Math.PI * oscN * frac + oscPh) * (1 - frac); // ×0 at frac=1
        rank = clamp(base + osc, 1, N);
      }
      waypoints.push({ progress: prog, rank });
    }

    // Build via the shipped curve engine, then jerk-match to the boundary (same as the hero handoff).
    const curve = makeHeroCurve(waypoints);
    curves.push({
      index: pc.index,
      curve: anchorHeroCurve(curve, anchorProgress, anchorRank, pc.vel ?? 0),
      finalRank,
    });
  }
  return { curves, checkpoints };
}
