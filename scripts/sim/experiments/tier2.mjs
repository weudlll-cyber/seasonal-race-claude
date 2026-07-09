// ============================================================
// tier2.mjs — DORMANT EXPERIMENT (sim-only, flag-gated, NOT shipped).
// NIGHT-SWEEP TIER-2 feasibility PROTOTYPE: a fair-envelope MALUS (brake the racers ahead of a
// mover) + BOOST (push the mover / challenger), measured against the real lateral traffic. Two
// modes: comeback (a deep climber released at TIER2_RELEASE) and frontfight (a leader-brake /
// challenger-boost on the front pair). Absent flag → tier2 does nothing (tier2Mult stays 1.0) →
// byte-identical. The malus/boost write r.tier2Mult, multiplied in the t-update BESIDE the lateral
// `brake` factor, so a boosted mover STILL brakes with no free lane (owner rule preserved).
//
// INFRA STEP 1c-4 — REFACTOR (not a move): logic relocated verbatim from sim-fairness.mjs.
// Lifecycle: initRaceState (per race) -> stepFrame (per frame — the force machine + observers) ->
// buildObservation (post race -> results.tier2Obs). The module writes ONLY r.tier2Mult (tier2-owned)
// and the per-race state object `t2` it created — never r.t / r.physicalY / etc. External inputs
// (raceProgress, raceTs, racerTargetRankMap, pulkStartLive, releaseProgress, lateralProximity,
// holdMs) are passed IN via ctx; BAND_EDGES is imported from the same source the race core uses.
// ============================================================

import { BAND_EDGES } from '../../../client/src/modules/racePlanner.js';

export function createTier2Experiment(argVal) {
  const mode      = argVal('tier2', null); // 'comeback' | 'frontfight' | null (off)
  const active    = mode === 'comeback' || mode === 'frontfight';
  const MALUS     = Math.max(0, Math.min(0.15, Number(argVal('tier2Malus', '0'))));
  const BOOST     = Math.max(0, Math.min(0.10, Number(argVal('tier2Boost', '0'))));
  const DEPTH     = Math.max(0, Math.min(1, Number(argVal('tier2Depth', '0.5'))));
  const RELEASE   = Math.max(0, Math.min(1, Number(argVal('tier2Release', '0.55'))));
  const K         = Math.max(0, Math.floor(Number(argVal('tier2K', '3'))));
  const START     = Math.max(0, Math.min(1, Number(argVal('tier2Start', '0.35'))));
  const CLIMBER_B1 = argVal('tier2ClimberB1', 'false') === 'true';
  const HEROES_B1  = argVal('tier2HeroesB1', 'false') === 'true';
  const MIN_MULT = 0.85; // servo minMult — the fair brake floor (racePlanner.js:75)
  const MAX_MULT = 1.10; // servo maxMult — the fair boost ceiling (racePlanner.js:74)

  const api = {
    active, mode,
    // Config surfaced for the --tier2 (tier2.json) diagnostic output.
    malus: MALUS, boost: BOOST, depth: DEPTH, release: RELEASE, k: K, start: START,
    climberB1: CLIMBER_B1, heroesB1: HEROES_B1,

    // Per-race state (sim-fairness.mjs:1056-1077). null when inert.
    initRaceState() {
      if (!active) return null;
      return {
        mode,
        // comeback:
        climberIdx: -1, released: false, climberAnchorRank: null, climberBestRank: null,
        frames: 0, trafficFrames: 0, passed: new Set(), nb: new Set(),
        aheadNow: new Set(), rePasses: 0, closeRatioSum: 0, closeRatioFrames: 0,
        closeByBandSum: {}, closeByBandN: {}, closeFrontSum: 0, closeFrontN: 0,
        choHeroTrajSum: 0, choHeroBonusSum: 0, choHeroDriveSum: 0, choHeroN: 0,
        choB1PackBonusSum: 0, choB1PackDriveSum: 0, choB1PackN: 0,
        // frontfight:
        ffStarted: false, heroes: [],
        curAhead: -1, curAheadSinceMs: 0, confirmedLeader: -1, leadChanges: 0,
        ffTrafficFrames: 0, ffFrames: 0,
      };
    },

    // Per-frame force machine + observers (sim-fairness.mjs:1476-1602). Writes r.tier2Mult + t2.
    stepFrame(t2, racers, ctx) {
      if (!active) return;
      const { raceProgress, raceTs, racerTargetRankMap, pulkStartLive, releaseProgress, lateralProximity } = ctx;
      const holdMs = ctx.holdMs;
      for (const r of racers) r.tier2Mult = 1.0;
      const t2order = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
      const t2rankOf = new Map(); t2order.forEach((r, i) => t2rankOf.set(r.index, i + 1));
      const nLive = t2order.length;

      if (mode === 'comeback') {
        if (!t2.released && raceProgress >= RELEASE && nLive > 0) {
          let chosen;
          if (CLIMBER_B1 && racerTargetRankMap) {
            const b1 = t2order.filter((r) => (racerTargetRankMap.get(r.index) ?? 999) <= BAND_EDGES[0]);
            chosen = b1.length ? b1[b1.length - 1] : t2order[Math.max(1, Math.min(nLive, Math.round(DEPTH * nLive))) - 1];
          } else {
            chosen = t2order[Math.max(1, Math.min(nLive, Math.round(DEPTH * nLive))) - 1];
          }
          t2.climberIdx = chosen.index;
          t2.climberAnchorRank = t2rankOf.get(chosen.index); t2.climberBestRank = t2.climberAnchorRank; t2.released = true;
        }
        if (t2.released) {
          const climber = racers.find((r) => r.index === t2.climberIdx);
          if (climber && !climber.finished) {
            climber.tier2Mult = Math.min(MAX_MULT, 1 + BOOST);
            const cRank = t2rankOf.get(climber.index) ?? nLive;
            const climberDrive = (climber.trajectoryMult ?? 1) * (climber.areaBonusMult ?? 1);
            const t2bandOf = (idx) => { const tr = racerTargetRankMap?.get(idx); if (tr == null) return null; for (let i = 0; i < BAND_EDGES.length; i++) if (tr <= BAND_EDGES[i]) return i + 1; return BAND_EDGES.length + 1; };
            let braked = 0;
            let aheadDriveSum = 0, aheadDriveN = 0;
            for (let rr = cRank - 1; rr >= 1 && braked < K; rr--) {
              const ahead = t2order[rr - 1];
              if (ahead && !ahead.finished) {
                ahead.tier2Mult = Math.max(MIN_MULT, 1 - MALUS); braked++;
                const aheadDrive = (ahead.trajectoryMult ?? 1) * (ahead.areaBonusMult ?? 1);
                aheadDriveSum += aheadDrive; aheadDriveN++;
                const b = t2bandOf(ahead.index);
                if (b != null && aheadDrive > 0) {
                  const bk = `B${b}`;
                  t2.closeByBandSum[bk] = (t2.closeByBandSum[bk] ?? 0) + climberDrive / aheadDrive;
                  t2.closeByBandN[bk]   = (t2.closeByBandN[bk] ?? 0) + 1;
                }
              }
            }
            t2.frames++;
            if (climber.avoidanceActive) t2.trafficFrames++;
            const cr = t2rankOf.get(climber.index);
            if (cr != null && (t2.climberBestRank == null || cr < t2.climberBestRank)) t2.climberBestRank = cr;
            if (aheadDriveN > 0) {
              const ratio = climberDrive / (aheadDriveSum / aheadDriveN);
              t2.closeRatioSum += ratio; t2.closeRatioFrames++;
              if (cRank <= 8) { t2.closeFrontSum += ratio; t2.closeFrontN++; }
            }
            for (const o of racers) {
              if (o.index === climber.index || o.finished) continue;
              if (t2.passed.has(o.index)) continue;
              if (!t2.nb.has(o.index)) {
                if (Math.abs((climber.physicalY ?? 0) - (o.physicalY ?? 0)) < lateralProximity && climber.t < o.t) t2.nb.add(o.index);
              } else if (climber.t > o.t) t2.passed.add(o.index);
            }
            for (const o of racers) {
              if (o.index === climber.index || o.finished || !t2.passed.has(o.index)) continue;
              if (o.t > climber.t) { if (!t2.aheadNow.has(o.index)) { t2.rePasses++; t2.aheadNow.add(o.index); } }
              else t2.aheadNow.delete(o.index);
            }
          }
        }
        if (racerTargetRankMap && raceProgress >= pulkStartLive && raceProgress < releaseProgress) {
          for (const r of racers) {
            if (r.finished) continue;
            const rnk = t2rankOf.get(r.index) ?? nLive;
            if (rnk > 8) continue;
            const traj = r.trajectoryMult ?? 1, bonus = r.areaBonusMult ?? 1;
            if (r.isHeroChoreographed) {
              t2.choHeroTrajSum += traj; t2.choHeroBonusSum += bonus; t2.choHeroDriveSum += traj * bonus; t2.choHeroN++;
            } else if ((racerTargetRankMap.get(r.index) ?? 999) <= BAND_EDGES[0]) {
              t2.choB1PackBonusSum += bonus; t2.choB1PackDriveSum += traj * bonus; t2.choB1PackN++;
            }
          }
        }
      } else if (mode === 'frontfight') {
        if (!t2.ffStarted && raceProgress >= START && nLive >= 2) {
          let pair;
          if (HEROES_B1 && racerTargetRankMap) {
            const b1 = t2order.filter((r) => (racerTargetRankMap.get(r.index) ?? 999) <= BAND_EDGES[0]);
            pair = b1.length >= 2 ? [b1[0].index, b1[1].index] : [t2order[0].index, t2order[1].index];
          } else {
            pair = [t2order[0].index, t2order[1].index];
          }
          t2.heroes = pair; t2.ffStarted = true;
          t2.curAhead = pair[0]; t2.curAheadSinceMs = raceTs; t2.confirmedLeader = pair[0];
        }
        if (t2.ffStarted) {
          const [hA, hB] = t2.heroes;
          const rA = t2rankOf.get(hA), rB = t2rankOf.get(hB);
          if (rA != null && rB != null) {
            const leader = rA < rB ? hA : hB, chall = rA < rB ? hB : hA;
            const lr = racers.find((r) => r.index === leader), cr2 = racers.find((r) => r.index === chall);
            if (lr && !lr.finished) lr.tier2Mult = Math.max(MIN_MULT, 1 - MALUS);   // brake the leader
            if (cr2 && !cr2.finished) cr2.tier2Mult = Math.min(MAX_MULT, 1 + BOOST); // boost the challenger
            t2.ffFrames++;
            if (lr && lr.avoidanceActive) t2.ffTrafficFrames++;
            if (leader !== t2.curAhead) { t2.curAhead = leader; t2.curAheadSinceMs = raceTs; }
            if (t2.curAhead !== t2.confirmedLeader && (raceTs - t2.curAheadSinceMs) >= holdMs) {
              t2.leadChanges++; t2.confirmedLeader = t2.curAhead;
            }
          }
        }
      }
    },

    // Post-race observation record (sim-fairness.mjs:2262-2308). Reads t2 + finishRank; returns the record.
    buildObservation(t2, racers) {
      const rankOfIdx = (idx) => racers.find((r) => r.index === idx)?.finishRank ?? null;
      if (t2.mode === 'comeback') {
        const finalRank = rankOfIdx(t2.climberIdx);
        return {
          mode: 'comeback',
          anchorRank: t2.climberAnchorRank, finalRank, bestRank: t2.climberBestRank,
          placesGained: (t2.climberAnchorRank != null && finalRank != null) ? t2.climberAnchorRank - finalRank : null,
          realOvertakes: t2.passed.size,
          rePasses: t2.rePasses,
          netOverRealRatio: t2.passed.size > 0 && t2.climberAnchorRank != null && finalRank != null
            ? +((t2.climberAnchorRank - finalRank) / t2.passed.size).toFixed(4) : null,
          closingSpeedRatio: t2.closeRatioFrames ? +(t2.closeRatioSum / t2.closeRatioFrames).toFixed(4) : null,
          closingSpeedByBand: (() => { const o = {}; for (const bk of Object.keys(t2.closeByBandN)) o[bk] = +(t2.closeByBandSum[bk] / t2.closeByBandN[bk]).toFixed(4); return o; })(),
          closingSpeedFront: t2.closeFrontN ? +(t2.closeFrontSum / t2.closeFrontN).toFixed(4) : null,
          closeFrontFrames: t2.closeFrontN,
          choHeroDrive:  t2.choHeroN ? +(t2.choHeroDriveSum / t2.choHeroN).toFixed(4) : null,
          choHeroTraj:   t2.choHeroN ? +(t2.choHeroTrajSum / t2.choHeroN).toFixed(4) : null,
          choHeroBonus:  t2.choHeroN ? +(t2.choHeroBonusSum / t2.choHeroN).toFixed(4) : null,
          choB1PackDrive: t2.choB1PackN ? +(t2.choB1PackDriveSum / t2.choB1PackN).toFixed(4) : null,
          choB1PackBonus: t2.choB1PackN ? +(t2.choB1PackBonusSum / t2.choB1PackN).toFixed(4) : null,
          choPackOverHero: (t2.choHeroN && t2.choB1PackN && t2.choHeroDriveSum > 0)
            ? +(((t2.choB1PackDriveSum / t2.choB1PackN) / (t2.choHeroDriveSum / t2.choHeroN))).toFixed(4) : null,
          servoCompFrac: t2.choB1PackN ? +(((t2.choB1PackBonusSum / t2.choB1PackN) - 1) / (MAX_MULT - 1)).toFixed(4) : null,
          reachedFront: finalRank != null ? (finalRank <= BAND_EDGES[0]) : null,
          frames: t2.frames, trafficFrac: t2.frames ? +(t2.trafficFrames / t2.frames).toFixed(4) : 0,
        };
      } else {
        const [hA, hB] = t2.heroes.length ? t2.heroes : [-1, -1];
        const fa = rankOfIdx(hA), fb = rankOfIdx(hB);
        return {
          mode: 'frontfight',
          leadChanges: t2.leadChanges,
          heroFinalRanks: [fa, fb],
          bothB1: (fa != null && fb != null) ? (fa <= BAND_EDGES[0] && fb <= BAND_EDGES[0]) : null,
          ffFrames: t2.ffFrames, leaderTrafficFrac: t2.ffFrames ? +(t2.ffTrafficFrames / t2.ffFrames).toFixed(4) : 0,
        };
      }
    },
  };

  // In-code dormant invariant: when off, stepFrame leaves tier2Mult untouched (→ construction 1.0
  // persists → t-update factor bit-exact 1.0).
  if (!active) {
    const probe = [{ index: 0, tier2Mult: 0.5, finished: false, t: 0, physicalY: 0 }];
    api.stepFrame(null, probe, {});
    if (probe[0].tier2Mult !== 0.5) throw new Error(`tier2 dormant invariant violated: stepFrame wrote tier2Mult=${probe[0].tier2Mult}`);
  }
  return api;
}
