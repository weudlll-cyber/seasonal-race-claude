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
import { compileRaceScripts } from './scriptCompiler.js';

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
 * @param {object}   [args.compiler]      finale script compiler config {actionLevel, scarcity} or null.
 *                                        When present, a seeded row-blind script set is drawn from the
 *                                        finale pool and authored on top of the B15+proximity substrate;
 *                                        scripted racers use their compiled curves, the rest ease as usual.
 * @returns {{ curves: Array<{index:number, curve:object, finalRank:number}>, checkpoints: number[], scriptStats: (object|null) }}
 */
export function generateChainCurves({
  seed,
  postChaos,
  finalRanks,
  anchorProgress,
  K,
  mExtra,
  drama = null,
  proximity = null,
  compiler = null,
}) {
  const N = postChaos.length;
  // ── THE FINALE SCRIPT COMPILER (ACTION-BUILD-4): draw + compile the per-race script set (admission-side;
  // endpoint-invariant by construction). Scripted racers use their authored curves below; every other
  // racer keeps the B15 ease + proximity floor. Null → not imported path runs (byte-identical substrate).
  let compiled = null;
  let scriptStats = null;
  if (compiler) {
    const out = compileRaceScripts({
      seed,
      postChaos,
      finalRanks,
      anchorProgress,
      actionLevel: compiler.actionLevel ?? 'mid',
      scarcity: compiler.scarcity ?? 0.5,
    });
    compiled = out.scripts;
    scriptStats = out.stats;
  }
  // Proximity floor: pull a rank toward its BAND CENTER (bunch within-band = contestable) through the
  // approach, releasing to the exact drawn rank at the finish. Within-band only ⇒ reachable; band
  // separation (fairness) preserved. One global rule; band edges are the shipped BAND_EDGES.
  const bandCenter = (rk) =>
    rk <= 5 ? 3 : rk <= 15 ? 10 : rk <= 25 ? 20 : rk <= 40 ? 33 : Math.min(N, 45);
  const rng = mulberry32(((seed | 0) ^ 0x9e3779b9) >>> 0 || 1);
  const B1 = 5; // front band top edge (BAND_EDGES[0])

  // K checkpoints in (anchorProgress, 1]. The last is exactly 1.0 (the finish) → the drawn formation.
  const checkpoints = [];
  for (let k = 1; k <= K; k++) checkpoints.push(anchorProgress + (1 - anchorProgress) * (k / K));

  const curves = [];
  for (const pc of postChaos) {
    const anchorRank = clamp(pc.rank, 1, N);
    const finalRank = clamp(finalRanks.get(pc.index) ?? pc.rank, 1, N);
    // Per-racer seeded draws (row-blind — index/seed only, never start row): oscillation lobes + phase,
    // a drama roll, a B1 slot for false leaders, and a per-racer stagger so duels sequence not synchronize.
    const oscN = 1 + Math.floor(rng() * 3); // 1..3 lobes
    const oscPh = rng() * Math.PI * 2;
    // Drama-only draws are taken ONLY when drama is active, so the non-drama path consumes the exact same
    // RNG stream as the B15 sorter (curves unchanged when drama is off).
    let dramaRoll = 0,
      b1Slot = 1,
      stagJit = 0;
    if (drama && drama.frac > 0) {
      dramaRoll = rng();
      b1Slot = 1 + Math.floor(rng() * B1); // a front slot for a false leader to occupy
      stagJit = rng(); // 0..1 → per-racer stagger of the resolve time
    }

    // ── DRAMA role (owner's language): intermediate formations DIVERGE from the draw, converge only at
    // the finish. FALSE LEADER = drawn OUTSIDE B1 but held IN B1 until `resolve`, then reeled back to its
    // drawn place. LATE ARRIVAL = drawn INTO B1 but held back until `resolve`, then climbs into the front.
    // Endpoint is ALWAYS finalRank (fairness untouched; only the finish is measured). Smooth by the curve
    // engine (min-jerk) + the eased servo; envelope-safe (the servo clamps trajectoryMult regardless).
    let waypoints;
    let role = 'ease';
    // COMPILER: if this racer carries a compiled finale script, its authored waypoints win (they already
    // end EXACTLY at finalRank — endpoint invariant asserted in scriptCompiler + the tests). The default
    // ease/drama/proximity path below is skipped for scripted racers.
    const script = compiled ? compiled.get(pc.index) : null;
    if (script) {
      waypoints = script.waypoints;
      role = script.role;
    }
    if (!waypoints && drama && drama.frac > 0) {
      // stagger the resolve time per racer so late climbs/drops don't all land together (closed-track safe).
      const resolve = clamp(
        drama.resolve - stagJit * (drama.stagger ?? 0),
        anchorProgress + 0.15,
        0.97
      );
      const holdStart = clamp(anchorProgress + 0.1, anchorProgress + 1e-3, resolve - 1e-3);
      if (finalRank > B1 && dramaRoll < drama.frac) {
        role = 'falseLeader';
        const hold = b1Slot; // occupy a front slot
        waypoints = [
          { progress: anchorProgress, rank: anchorRank },
          { progress: holdStart, rank: hold },
          { progress: resolve, rank: hold },
          { progress: 1.0, rank: finalRank }, // reeled back to the drawn place
        ];
      } else if (finalRank <= B1 && dramaRoll < drama.frac) {
        role = 'lateArrival';
        const hold = clamp(finalRank + (drama.holdDepth ?? 10), B1 + 1, N); // wait outside the front
        waypoints = [
          { progress: anchorProgress, rank: anchorRank },
          { progress: holdStart, rank: hold },
          { progress: resolve, rank: hold },
          { progress: 1.0, rank: finalRank }, // climbs into the front late
        ];
      }
    }
    if (!waypoints) {
      // Default: min-jerk ease anchor→drawn with the small vanishing oscillation (the B15 sorter).
      waypoints = [{ progress: anchorProgress, rank: anchorRank }];
      for (let k = 1; k <= K; k++) {
        const prog = checkpoints[k - 1];
        const frac = (prog - anchorProgress) / Math.max(1e-6, 1 - anchorProgress);
        let rank;
        if (k === K) {
          rank = finalRank; // ENDPOINT INVARIANT
        } else {
          const base = lerp(anchorRank, finalRank, smoother(frac));
          const osc = mExtra * Math.sin(Math.PI * oscN * frac + oscPh) * (1 - frac);
          rank = clamp(base + osc, 1, N);
          if (proximity && proximity.strength > 0) {
            // Hold the band-center pull through the approach, then release to the exact rank by the finish
            // (pull → 0 as frac → 1 so the endpoint invariant is untouched). Keeps each band tight.
            const resolve = proximity.resolve ?? 0.85;
            const pull =
              proximity.strength * (frac < resolve ? 1 : Math.max(0, (1 - frac) / (1 - resolve)));
            rank = clamp(lerp(rank, bandCenter(finalRank), pull), 1, N);
          }
        }
        waypoints.push({ progress: prog, rank });
      }
    }

    // Build via the shipped curve engine, then jerk-match to the boundary (same as the hero handoff).
    const curve = makeHeroCurve(waypoints);
    curves.push({
      index: pc.index,
      curve: anchorHeroCurve(curve, anchorProgress, anchorRank, pc.vel ?? 0),
      finalRank,
      role,
    });
  }
  return { curves, checkpoints, scriptStats };
}
