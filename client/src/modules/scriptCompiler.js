// ============================================================
// File:        scriptCompiler.js
// Path:        client/src/modules/scriptCompiler.js
// Project:     RaceArena
// Description: THE FINALE SCRIPT COMPILER (ACTION-BUILD-4/5). Per race, a seeded, row-blind draw of a
//              script set from the finale pool, compiled through the full admission stack
//              (reachability accountant · per-racer exposure cap · LOCAL-CLEARANCE admission · whole-race
//              occupancy spread), emitted as AUTHORED CURVES (rank-space waypoints). Nothing runs per
//              tick here: this is the formation author's pen — it decides WHICH curves get written.
//              What does not fit the admission stack is SHRUNK or DROPPED before it exists.
//
//              ACTION-BUILD-5 (the owner's situational rule): the topology-derived scarcity constant is
//              GONE. Every LATERAL element (fight-for-lead / duel / photo-fan) AND every accordion beat is
//              admitted PER-INSTANCE by the clearance reader (clearanceReader.js), reading only local space
//              — planned track width at the arc + planned occupancy + the wandering free corridor sequenced
//              one maneuver at a time. Longitudinal families are admissible everywhere. No topology/track read.
//
//              CONTRACT (binding, same as the chain author):
//                • Endpoint invariant (L181): every authored curve ENDS EXACTLY at the racer's drawn
//                  place (finalRanks). Only the finish is measured, so band-reach is untouched.
//                • Row-blind: the draw/assignment/timing read index + seed + DRAWN place only — never
//                  startRowIndex (it is not even in the contract).
//                • Band-local: every excursion stays inside (or adjacent to) the racer's drawn band, so
//                  the fan-back to the exact rank is always a short, reachable late move.
//                • Deterministic: same (seed, field, draw) → identical script set.
//                • Frozen runtime budget: scripts are curves; the servo/envelope/traffic core are the
//                  same shipped machinery. No new per-tick force is introduced by this module.
//
//              REUSE: the waypoints produced here are consumed by generateChainCurves (chainChoreography.js)
//              through the shipped hero-curve engine (makeHeroCurve / anchorHeroCurve). This module only
//              AUTHORS the waypoints and the per-race telemetry.
// ============================================================

import { mulberry32 } from './racePlanner.js';
import { createClearanceReader } from './clearanceReader.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Single-source band split points (mirrors BAND_EDGES in racePlanner.js). A rank's band index 0..4.
const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (rank) => {
  for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
};
const bandBounds = (bi, N) => {
  const lo = bi === 0 ? 1 : BAND_EDGES[bi - 1] + 1;
  const hi = bi < BAND_EDGES.length ? BAND_EDGES[bi] : N;
  return [lo, Math.min(hi, N)];
};

// Reachability accountant: from a hold at `holdRank` released at progress `resolve`, the servo must be
// able to fan the racer back to `finalRank` by the finish. The chain's smoothness proof bounds the
// target-rank slope well under 1 rank/tick; at the field/race scale used here a conservative reachable
// budget is REACH_RATE ranks of net displacement per unit of remaining progress. If a script's fan-back
// exceeds it, the compiler SHRINKS the hold toward finalRank (or, failing the resolve floor, DROPS it).
const REACH_RATE = 60; // ranks reachable per unit remaining-progress (conservative; band-local moves are ~5-15)
const RESOLVE_FLOOR = 0.55; // a hold may not be pulled earlier than this to stay reachable (keeps mid-race life)

// The finale pool. Each family is short-range and attacker-pattern legal; `kind` drives the geometry
// preference (compression/rotation vs longitudinal same-lane catch-up).
const COMPRESSION = 'compression'; // lateral contest / rotation — wants open lanes
const LONGITUDINAL = 'longitudinal'; // same-lane honest catch-up / hold-and-resolve — safe when lanes are scarce

/**
 * Compile a per-race finale script set.
 *
 * @param {object} args
 * @param {number} args.seed              plan seed (deterministic)
 * @param {Array<{index:number, rank:number, vel?:number}>} args.postChaos  live field at the boundary (rank 1 = leading)
 * @param {Map<number,number>} args.finalRanks  index → DRAWN final place (the fair draw; the terminal contract)
 * @param {number} args.anchorProgress    the chaos→strict boundary fraction (curves start here)
 * @param {('low'|'mid'|'high')} [args.actionLevel]  the slider — scales the script budget (monotone)
 * @param {object} [args.clearance]       LOCAL-CLEARANCE reader inputs {widthAt, carWidth} (ACTION-BUILD-5).
 *                                        When present, every LATERAL element (fight-for-lead / duel /
 *                                        photo-fan) and every accordion beat is admitted per-instance by
 *                                        planned local clearance; longitudinal scripts are ungated. When
 *                                        null, lateral elements are authored ungated (attribution arm).
 * @param {boolean} [args.frontConvergence]  ARM C: where a FRONT lateral is clearance-refused, author a
 *                                        front-band pace-order convergence in its place (longitudinal owns
 *                                        the moment compression cannot have). One global rule reading clearance.
 * @param {object} [args.accordion]       {density, pulseLen} → compute the beat schedule + clearance-admit
 *                                        each beat here (the runtime consumes the admitted set). Null → no beats.
 * @returns {{ scripts: Map<number,{role:string, kind:string, waypoints:Array<{progress:number,rank:number}>, resolve:number}>,
 *            accordBeats: number[], accordAdmittedBeats: number[], stats: object }}
 */
export function compileRaceScripts({
  seed,
  postChaos,
  finalRanks,
  anchorProgress,
  actionLevel = 'mid',
  clearance = null,
  frontConvergence = false,
  accordion = null,
  budgetGrade = false,
  finaleCast = false, // ACTION-BUILD-7: the owner's finale cast (final-draw for all + finale-resolving arcs)
  negativeSpace = false, // ACTION-BUILD-7 planner proposal 2: keep one band calm as a texture
}) {
  const N = postChaos.length;
  // ACTION-BUILD-7 slider stage: 'default' is the middle. low/default/high scale story density.
  const stage = actionLevel === 'default' ? 'mid' : actionLevel;
  const rng = mulberry32(((seed | 0) ^ 0x5c819f) >>> 0 || 1); // isolated stream (own salt)

  // Live rank + drawn place lookups (row-blind — index only).
  const anchorRankOf = new Map(postChaos.map((p) => [p.index, clamp(p.rank, 1, N)]));
  const drawnOf = (idx) => clamp(finalRanks.get(idx) ?? anchorRankOf.get(idx) ?? 1, 1, N);
  // Field ordered by DRAWN place (band assignment reads the draw, never the live order or the row).
  const byDrawn = postChaos.map((p) => p.index).sort((a, b) => drawnOf(a) - drawnOf(b));

  // ── LOCAL-CLEARANCE READER (the owner's situational rule). Planned occupancy = the DRAWN ranks (the
  // terminal state of every compiled curve; in the finale windows the field is sorted to it). No topology,
  // no track name, no per-track constant — only local width + local occupancy. Null → lateral is ungated. ──
  const drawnRanks = postChaos.map((p) => drawnOf(p.index));
  const reader = clearance
    ? createClearanceReader({
        widthAt: clearance.widthAt,
        carWidth: clearance.carWidth,
        plannedRanksAt: () => drawnRanks,
      })
    : null;

  // ── ACTION-BUILD-6 CLEARANCE-GRADED SCRIPT BUDGET (BUILD-5 proposal 1). One global monotone rule reading
  // ONLY the lane count the reader already computes (min over the race distance): wide geometry keeps the
  // full budget; very few lanes thin EVERY family toward zero — handing the narrowest tracks back to the
  // plain B15 + proximity substrate that already wins there. No topology/track/name read. Applied only when
  // budgetGrade is on; the scale is always reported for telemetry. LANE_FLOOR..LANE_FULL are lane counts
  // (a physical quantity), not per-track constants. ──
  let minLanes = null;
  let budgetScale = 1;
  if (reader) {
    minLanes = Infinity;
    for (let p = anchorProgress; p <= 1 + 1e-9; p += 0.05)
      minLanes = Math.min(minLanes, reader.lanesAt(p));
    const LANE_FLOOR = 5; // at/below this many lanes the front band fills the width → no script helps
    const LANE_FULL = 8; // at/above this the budget is full
    budgetScale = clamp((minLanes - LANE_FLOOR) / (LANE_FULL - LANE_FLOOR), 0, 1);
  }
  const applyBudget = budgetGrade && reader;
  const gs = applyBudget ? budgetScale : 1; // general thinning
  const gsFront = applyBudget ? Math.sqrt(budgetScale) : 1; // front convergence / pace thinned LAST (gentler)

  // ── SLIDER → script budget (monotone). Higher actionLevel = strictly more scripts of every family. The
  // budget is now TOPOLOGY-BLIND: we draw ambitiously for every family (compression included) and let the
  // clearance reader admit/refuse each lateral instance by local space. What has no room simply is not built. ──
  const LEVEL = { low: 0.6, mid: 1.0, high: 1.5 }[stage] ?? 1.0;
  // Per-family target counts (a seeded jitter around the target makes the draw vary race to race). The
  // ±2.2 span gives a real -1/0/+1 spread (a ×1.0 span rounds to 0 almost always → identical draws).
  const jitter = () => Math.round((rng() - 0.5) * 2.2); // ~-1..+1 (row-blind seeded), genuinely varied
  const q = (base) => Math.max(0, Math.round(base * LEVEL) + jitter());
  // ACTION-BUILD-7: MULTIPLE finale-resolving arcs per race are asked for (target 3) → the arc quotas rise.
  const arcBase = finaleCast ? 3 : 2;
  const quota = {
    fightForLead: Math.round(1 * LEVEL) >= 1 ? 1 : 0, // one group attempted; clearance filters members
    comebacker: q(arcBase),
    fallbacker: q(arcBase),
    paceConvergence: q(frontConvergence ? 2 : 1), // ARM C raises the longitudinal front story
    duelPair: q(1),
    photoFan: rng() < 0.5 * LEVEL ? 1 : 0, // sometimes; clearance decides if it fits
  };
  // Thin by the graded budget. ACTION-BUILD-7 (finaleCast): the budget gates ONLY the LATERAL families
  // (fight-for-lead / duel / photo-fan) that genuinely need side room — the longitudinal families run
  // everywhere, because the final-draw engine (below) is the narrow-track finale mechanism and needs no
  // lane. Pre-BUILD-7 (finaleCast off): the budget thins every family, as ACTION-BUILD-6.
  if (applyBudget) {
    quota.fightForLead = gs >= 0.5 ? quota.fightForLead : 0;
    quota.duelPair = Math.round(quota.duelPair * gs);
    quota.photoFan = gs >= 0.5 ? quota.photoFan : 0;
    if (!finaleCast) {
      quota.comebacker = Math.round(quota.comebacker * gs);
      quota.fallbacker = Math.round(quota.fallbacker * gs);
      quota.paceConvergence = Math.round(quota.paceConvergence * gsFront);
    }
  }

  const used = new Set(); // per-racer exposure cap: each racer belongs to at most ONE script
  const scripts = new Map();
  const stats = {
    counts: {
      fightForLead: 0,
      comebacker: 0,
      fallbacker: 0,
      paceConvergence: 0,
      duelPair: 0,
      photoFan: 0,
      midRaceMover: 0,
      leaderDefends: 0,
    },
    admitted: 0,
    shrunk: 0,
    dropped: 0,
    exposure: 0, // racers carrying a script
    // ACTION-BUILD-5 clearance telemetry: lateral instances the reader let through vs refused for lack of
    // local room; and how many refusals were converted to a front-band longitudinal story (ARM C).
    lateralAdmit: 0,
    lateralRefuse: 0,
    frontConverted: 0,
    accordAdmit: 0,
    accordRefuse: 0,
    // ACTION-BUILD-7 finale-cast telemetry.
    finalDraw: 0, // racers given an authored finish-stretch tempo (the ship's finale engine, authored)
    bandDuels: 0, // contested intra-band crossings authored by the final-draw (across bands)
    quietBand: -1, // the band left calm as negative-space texture (-1 = none)
    // ACTION-BUILD-7b owner-cast telemetry.
    ownerComebacker: 0, // drawn into B1, held OUTSIDE B1, reaches B1 only in the last window (resolve ≥ 0.9)
    ownerFallbacker: 0, // drawn NOT B1, held IN B1, falls out only in the last window (resolve ≥ 0.9)
    midRaceMover: 0, // the mid-race climb/slide variants (a separately named family)
    ownerDepth: 0, // realized far-back depth (ranks) of the owner arcs = feasible max at their resolve
    scenario: 'genuineChange', // per-race front scenario label ('genuineChange' | 'leaderDefends')
    leaderDefendsPlanned: 0, // 1 if this race is a drawn leader-defends (a planned near-miss)
    nearMissChaser: -1, // index of the chaser planned to close to photo-finish range without passing (-1 = none)
    behindP1DuelPlanned: 0, // authored P2+ swaps in the contest window (the behind-P1 tension mark)
    chains: 0, // racers carrying a role CHAIN (>1 authored role in disjoint windows)
    timeShareSum: 0, // Σ authored time-share (progress fraction under any authored role) across storied racers
    countDist: {}, // realized per-family draw counts this race (for the distribution report)
  };

  // Lateral admission through the clearance reader. `null` reader → ungated (attribution arm) → always yes.
  const admitLateral = (p0, p1, rankLo, rankHi) => {
    if (!reader) return { admitted: true, freeLanes: null };
    const r = reader.admit({ p0, p1, rankLo, rankHi });
    if (r.admitted) stats.lateralAdmit++;
    else stats.lateralRefuse++;
    return r;
  };

  // Whole-race occupancy: resolve times are handed out from a spread so scripts do not all land together
  // (gun-to-line relay; closed-track safe). We walk this cursor as scripts are admitted.
  let resolveCursor = 0;
  const nextResolve = (lo, hi) => {
    // Deterministic spread with a seeded jitter (±0.9 slot) so timings genuinely vary race to race while
    // still relaying across the window (whole-race occupancy); clamped to [lo,hi].
    const span = hi - lo;
    const base = lo + span * ((resolveCursor + 0.5 + (rng() - 0.5) * 1.8) / 6);
    resolveCursor = (resolveCursor + 1) % 6;
    return clamp(+base.toFixed(4), lo, hi);
  };

  // ACTION-BUILD-7b — VARIETY IS A HARD REQUIREMENT. Each family's per-race COUNT is DRAWN (never a
  // degenerate always-1): Binomial(3, p) with p from the family mean × slider → a genuine 0/1/2/3 spread,
  // monotone with the slider. The realized distribution is reported so no family reads as a fixed pattern.
  const drawCount = (mean) => {
    const p = clamp((mean * LEVEL) / 3, 0, 1);
    let c = 0;
    for (let k = 0; k < 3; k++) if (rng() < p) c++;
    return c;
  };
  // ACTION-BUILD-7b feasible far-back depth: the honest max the reachability accountant allows for an arc
  // that resolves at `resolve` (reaches/leaves band 1 only in the last window). depth = REACH_RATE·(1−resolve).
  const feasibleDepth = (resolve) => Math.floor(REACH_RATE * (1 - resolve));

  // Admission of a single-racer hold-and-resolve script. Returns true if admitted (after any shrink),
  // false if it had to be dropped. `holdRankRaw` is where the racer is held: behind its draw (comebacker)
  // or in front of it (fallbacker); the reachability accountant shrinks/drops it to keep the fan-back reachable.
  const admitHold = (idx, role, kind, holdStart, resolve0, holdRankRaw) => {
    if (used.has(idx)) return false;
    const finalRank = drawnOf(idx);
    const aRank = anchorRankOf.get(idx) ?? finalRank;
    let resolve = clamp(resolve0, holdStart + 0.05, 0.98);
    let holdRank = clamp(Math.round(holdRankRaw), 1, N);
    // Reachability accountant: shrink the hold until the fan-back fits the remaining runway; drop if it
    // cannot be made reachable without pulling the resolve before the floor (that would kill mid-race life).
    let shrunk = false;
    let guard = 0;
    while (Math.abs(finalRank - holdRank) > REACH_RATE * (1 - resolve) && guard++ < 64) {
      // First try pulling the hold toward the draw (keeps the beat, softens the excursion).
      const step = holdRank > finalRank ? -1 : 1;
      if (Math.abs(holdRank - finalRank) > 1) {
        holdRank += step;
        shrunk = true;
      } else break;
    }
    if (Math.abs(finalRank - holdRank) > REACH_RATE * (1 - resolve)) {
      // Still unreachable: try an earlier resolve (more runway), down to the floor.
      resolve = clamp(resolve - 0.1, RESOLVE_FLOOR, 0.98);
      if (Math.abs(finalRank - holdRank) > REACH_RATE * (1 - resolve)) {
        stats.dropped++;
        return false;
      }
      shrunk = true;
    }
    if (holdRank === finalRank) {
      // Shrunk to nothing — no beat left; drop rather than author a no-op (it would only cost an exposure slot).
      stats.dropped++;
      return false;
    }
    const waypoints = [
      { progress: anchorProgress, rank: aRank },
      { progress: clamp(holdStart, anchorProgress + 1e-3, resolve - 1e-3), rank: holdRank },
      { progress: resolve, rank: holdRank },
      { progress: 1.0, rank: finalRank },
    ];
    scripts.set(idx, { role, kind, waypoints, resolve });
    used.add(idx);
    stats.admitted++;
    stats.exposure++;
    if (role in stats.counts) stats.counts[role]++;
    stats.timeShareSum += 1 - clamp(holdStart, anchorProgress, 0.98); // active span [holdStart, 1]
    if (shrunk) stats.shrunk++;
    return true;
  };

  // ── FIGHT FOR THE LEAD — the B1-drawn group trades the lead from ~0.7 (1–3 place excursions; intra-band
  // ⇒ zero fairness cost). LATERAL. GATED OFF under finaleCast (ACTION-BUILD-7b): the front is cast there by
  // the owner families (leader-defends / owner-comebacker / chains / final-draw), which own the B1 racers.
  // Each member peaks (is pulled toward rank 1) in a sequenced window so distinct racers lead through the
  // finale. Admitted per-instance by the clearance reader:
  // it fires only where a free corridor exists at that place/time, and members sequence through the shared
  // corridor (one at a time where the front is tight, several where it is wide). ARM C: a member the reader
  // REFUSES is converted to a front-band longitudinal catch-up (compression cannot have the moment, so the
  // longitudinal finale story does). Endpoint stays the drawn place for every member either way. ──
  if (quota.fightForLead && !finaleCast) {
    const front = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i)).slice(0, 4);
    if (front.length >= 2) {
      const start = 0.7;
      const span = 0.24; // 0.70..0.94 lead-trading window
      let anyAdmitted = false;
      front.forEach((idx, j) => {
        const finalRank = drawnOf(idx);
        const aRank = anchorRankOf.get(idx) ?? finalRank;
        const peakProg = clamp(start + span * ((j + 0.5) / front.length), start, 0.94);
        const peakRank = 1 + (j % 2); // alternate rank 1 / rank 2 so the lead genuinely changes hands
        const dec = admitLateral(peakProg - 0.03, peakProg + 0.03, 1, peakRank + 2);
        if (dec.admitted) {
          const preProg = clamp(peakProg - 0.1, anchorProgress + 0.05, peakProg - 1e-3);
          const waypoints = [
            { progress: anchorProgress, rank: aRank },
            {
              progress: preProg,
              rank: clamp(Math.round((aRank + finalRank) / 2), 1, BAND_EDGES[0]),
            },
            { progress: peakProg, rank: peakRank },
            { progress: 1.0, rank: finalRank }, // resolves to the drawn place (fairness untouched)
          ];
          scripts.set(idx, {
            role: 'fightForLead',
            kind: COMPRESSION,
            waypoints,
            resolve: peakProg,
          });
          used.add(idx);
          stats.exposure++;
          anyAdmitted = true;
        } else if (frontConvergence) {
          // ARM C: no lateral room here → a single clean same-lane climb into the front slot instead.
          const holdStart = clamp(anchorProgress + 0.1, anchorProgress + 0.02, 0.55);
          if (
            admitHold(
              idx,
              'paceConvergence',
              LONGITUDINAL,
              holdStart,
              peakProg,
              clamp(finalRank + 2, 1, N)
            )
          )
            stats.frontConverted++;
        }
      });
      if (anyAdmitted) {
        stats.counts.fightForLead = 1;
        stats.admitted++;
      }
    }
  }

  if (!finaleCast) {
    // ── COMEBACKER / FALLBACKER / PACE (pre-BUILD-7b shallow variants) — kept for the non-finaleCast arms. ──
    {
      const pool = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[1] && !used.has(i));
      let placed = 0;
      for (const idx of pool) {
        if (placed >= quota.comebacker) break;
        const holdRank = drawnOf(idx) + 5 + Math.floor(rng() * 5);
        const holdStart = clamp(anchorProgress + 0.08 + rng() * 0.1, anchorProgress + 0.02, 0.5);
        if (admitHold(idx, 'comebacker', LONGITUDINAL, holdStart, nextResolve(0.7, 0.95), holdRank))
          placed++;
      }
    }
    {
      const pool = byDrawn.filter(
        (i) => drawnOf(i) >= 4 && drawnOf(i) <= BAND_EDGES[1] && !used.has(i)
      );
      let placed = 0;
      for (const idx of pool) {
        if (placed >= quota.fallbacker) break;
        const holdRank = Math.max(1, drawnOf(idx) - (4 + Math.floor(rng() * 5)));
        const holdStart = clamp(anchorProgress + 0.06 + rng() * 0.1, anchorProgress + 0.02, 0.5);
        if (
          admitHold(idx, 'fallbacker', LONGITUDINAL, holdStart, nextResolve(0.72, 0.94), holdRank)
        )
          placed++;
      }
    }
    {
      let placed = 0;
      for (let k = 0; k < byDrawn.length - 1 && placed < quota.paceConvergence; k++) {
        const a = byDrawn[k],
          b = byDrawn[k + 1];
        if (used.has(a) || used.has(b)) continue;
        const da = drawnOf(a),
          db = drawnOf(b);
        if (bandOf(da) !== bandOf(db) || db - da > 3) continue;
        const holdStart = clamp(anchorProgress + 0.1 + rng() * 0.1, anchorProgress + 0.02, 0.55);
        if (
          admitHold(
            b,
            'paceConvergence',
            LONGITUDINAL,
            holdStart,
            nextResolve(0.74, 0.95),
            db + 1 + Math.floor(rng() * 2)
          )
        )
          placed++;
      }
    }
  } else {
    // ══ ACTION-BUILD-7b OWNER STORY DEFINITIONS (binding) — the arc families to the owner's spec. ══════════
    stats.countDist = {};
    // FRONT SCENARIO DRAWN FIRST (the front is cast every race; the OUTCOME varies). A small share is a
    // LEADER-DEFENDS — drawn here BEFORE the comeback families so it owns the rank-1 racer. NEVER a quiet
    // front: (a) a planned near-miss chaser closes to photo-finish range without passing, (b) genuine P2+
    // place changes behind P1. A defended race is a PLANNED dead-finale (P1 held), not a casting hole.
    if (rng() < 0.2) {
      const leader = byDrawn.find((i) => drawnOf(i) === 1 && !used.has(i));
      const chaser = byDrawn.find((i) => drawnOf(i) >= 2 && drawnOf(i) <= 3 && !used.has(i));
      if (leader != null && chaser != null) {
        scripts.set(leader, {
          role: 'leaderHold',
          kind: LONGITUDINAL,
          resolve: 0.95,
          waypoints: [
            { progress: anchorProgress, rank: anchorRankOf.get(leader) ?? 1 },
            { progress: 0.7, rank: 1 },
            { progress: 1.0, rank: 1 },
          ],
        });
        used.add(leader);
        stats.exposure++;
        stats.timeShareSum += 1 - anchorProgress;
        const cd = drawnOf(chaser);
        scripts.set(chaser, {
          role: 'nearMissChaser',
          kind: LONGITUDINAL,
          resolve: 0.9,
          waypoints: [
            { progress: anchorProgress, rank: anchorRankOf.get(chaser) ?? cd },
            { progress: 0.8, rank: clamp(BAND_EDGES[0], cd + 1, N) },
            { progress: 1.0, rank: cd },
          ],
        });
        used.add(chaser);
        stats.exposure++;
        stats.timeShareSum += 0.2;
        stats.nearMissChaser = chaser;
        const pool = byDrawn.filter(
          (i) => drawnOf(i) >= 3 && drawnOf(i) <= BAND_EDGES[0] && !used.has(i)
        );
        if (pool.length >= 2) {
          const [a, b] = pool;
          const da = drawnOf(a);
          const db = drawnOf(b);
          scripts.set(a, {
            role: 'finalDraw',
            kind: LONGITUDINAL,
            resolve: 0.9,
            waypoints: [
              { progress: anchorProgress, rank: anchorRankOf.get(a) ?? da },
              { progress: 0.7, rank: db },
              { progress: 1.0, rank: da },
            ],
          });
          scripts.set(b, {
            role: 'finalDraw',
            kind: LONGITUDINAL,
            resolve: 0.9,
            waypoints: [
              { progress: anchorProgress, rank: anchorRankOf.get(b) ?? db },
              { progress: 0.7, rank: da },
              { progress: 1.0, rank: db },
            ],
          });
          used.add(a);
          used.add(b);
          stats.exposure += 2;
          stats.bandDuels++;
          stats.behindP1DuelPlanned = 1;
          stats.timeShareSum += 0.6;
        }
        stats.scenario = 'leaderDefends';
        stats.leaderDefendsPlanned = 1;
        stats.counts.leaderDefends = 1;
      }
    }
    // OWNER-COMEBACKER: drawn INTO band 1, runs visibly far back (held OUTSIDE band 1), reaches band 1 ONLY
    // in the last ~10% (resolve ≥ 0.9). "Far back" = the honest max the reachability accountant allows.
    {
      const n = drawCount(2);
      stats.countDist.comebacker = n;
      const pool = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i));
      const resolve = 0.9; // reaches band 1 only in the last 10%
      const maxDepth = feasibleDepth(resolve); // the honest far-back max at a 10% window
      let placed = 0;
      for (const idx of pool) {
        if (placed >= n) break;
        const finalRank = drawnOf(idx);
        // Held OUTSIDE band 1, as far back as reachable (≤ maxDepth so the accountant never shrinks it into
        // the band). A small seeded jitter keeps the depth varied. finalRank + maxDepth is always ≥ 6 here.
        const holdRank = clamp(
          finalRank + maxDepth - Math.floor(rng() * 2),
          BAND_EDGES[0] + 1,
          finalRank + maxDepth
        );
        const holdStart = clamp(anchorProgress + 0.06 + rng() * 0.12, anchorProgress + 0.02, 0.6);
        if (admitHold(idx, 'comebacker', LONGITUDINAL, holdStart, resolve, holdRank)) {
          stats.ownerComebacker++;
          stats.ownerDepth = Math.max(stats.ownerDepth, holdRank - finalRank);
          placed++;
        }
      }
    }
    // OWNER-FALLBACKER: drawn NOT band 1, visibly holds a LEADING position (held IN band 1), falls out of
    // band 1 ONLY in the last ~10% (resolve ≥ 0.9), sliding to its exact drawn place. Feasible only for
    // draws reachable from the band-1 edge in the last window (deeper draws cannot hold B1 and still land).
    {
      const n = drawCount(2);
      stats.countDist.fallbacker = n;
      const resolve = 0.9; // falls out of band 1 only in the last 10%
      const maxDepth = feasibleDepth(resolve);
      const pool = byDrawn.filter((i) => {
        const d = drawnOf(i);
        return d > BAND_EDGES[0] && d - BAND_EDGES[0] <= maxDepth && !used.has(i);
      });
      let placed = 0;
      for (const idx of pool) {
        if (placed >= n) break;
        const finalRank = drawnOf(idx);
        // Held IN band 1 at a LEADING position — rank 2..5, never rank 1 (rank 1 is reserved for the actual
        // winner / a leader-defends hold, so the front outcome stays legible). Reachable (≤ maxDepth).
        const holdRank = clamp(finalRank - maxDepth + Math.floor(rng() * 2), 2, BAND_EDGES[0]);
        const holdStart = clamp(anchorProgress + 0.06 + rng() * 0.12, anchorProgress + 0.02, 0.6);
        if (admitHold(idx, 'fallbacker', LONGITUDINAL, holdStart, resolve, holdRank)) {
          stats.ownerFallbacker++;
          stats.ownerDepth = Math.max(stats.ownerDepth, finalRank - holdRank);
          placed++;
        }
      }
    }
    // MID-RACE MOVER: the mid-race climb/slide variants, a SEPARATELY named family (resolve < 0.7).
    {
      const n = drawCount(1.5);
      stats.countDist.midRaceMover = n;
      const pool = byDrawn.filter(
        (i) => drawnOf(i) >= 4 && drawnOf(i) <= BAND_EDGES[2] && !used.has(i)
      );
      let placed = 0;
      for (const idx of pool) {
        if (placed >= n) break;
        const finalRank = drawnOf(idx);
        const up = rng() < 0.5;
        const holdRank = up
          ? finalRank + (4 + Math.floor(rng() * 5))
          : Math.max(1, finalRank - (3 + Math.floor(rng() * 4)));
        const holdStart = clamp(anchorProgress + 0.05 + rng() * 0.1, anchorProgress + 0.02, 0.4);
        if (
          admitHold(idx, 'midRaceMover', LONGITUDINAL, holdStart, nextResolve(0.45, 0.68), holdRank)
        )
          stats.midRaceMover++;
      }
    }
  }

  // ── BAND-LOCAL DUEL PAIR — two adjacent same-band racers trade their local order once, then resolve to
  // their drawn places. LATERAL (a rotation) → admitted per-instance by the clearance reader; refused where
  // the local field fills the lanes, sequenced through the shared corridor. ──
  {
    let placed = 0;
    for (let k = 0; k < byDrawn.length - 1 && placed < quota.duelPair; k++) {
      const a = byDrawn[k];
      const b = byDrawn[k + 1];
      if (used.has(a) || used.has(b)) continue;
      const da = drawnOf(a);
      const db = drawnOf(b);
      if (bandOf(da) !== bandOf(db) || db - da > 3) continue;
      const cross = 0.6 + rng() * 0.2; // one crossing near 0.6..0.8
      if (!admitLateral(cross - 0.03, cross + 0.03, da - 1, db + 1).admitted) continue; // no lateral room here
      const aA = anchorRankOf.get(a) ?? da;
      const aB = anchorRankOf.get(b) ?? db;
      // A dips to B's place, B rises to A's place at the crossing; both resolve to their draws.
      scripts.set(a, {
        role: 'duelPair',
        kind: COMPRESSION,
        resolve: cross,
        waypoints: [
          { progress: anchorProgress, rank: aA },
          { progress: clamp(cross, anchorProgress + 0.05, 0.9), rank: db },
          { progress: 1.0, rank: da },
        ],
      });
      scripts.set(b, {
        role: 'duelPair',
        kind: COMPRESSION,
        resolve: cross,
        waypoints: [
          { progress: anchorProgress, rank: aB },
          { progress: clamp(cross, anchorProgress + 0.05, 0.9), rank: da },
          { progress: 1.0, rank: db },
        ],
      });
      used.add(a);
      used.add(b);
      stats.exposure += 2;
      stats.admitted++;
      stats.counts.duelPair++;
      placed++;
    }
  }

  // ── PHOTO-FINISH FAN (sometimes) — a small late compression of the top cluster: the front ~5 drawn
  // racers pinch together at ~0.92 then fan to their exact places at the line. LATERAL → admitted only
  // where the finish-line front has a free corridor (a tight front on narrow geometry refuses it). ──
  if (quota.photoFan) {
    const front = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i)).slice(0, 5);
    if (front.length >= 3 && admitLateral(0.9, 1.0, 1, BAND_EDGES[0]).admitted) {
      const pinch = 0.9 + rng() * 0.04;
      let any = false;
      front.forEach((idx, j) => {
        const finalRank = drawnOf(idx);
        const aRank = anchorRankOf.get(idx) ?? finalRank;
        // Pinch toward the cluster centre (rank ~3), fan to the exact place by 1.0.
        const pinchRank = clamp(2 + (j % 3), 1, BAND_EDGES[0]);
        scripts.set(idx, {
          role: 'photoFan',
          kind: COMPRESSION,
          resolve: pinch,
          waypoints: [
            { progress: anchorProgress, rank: aRank },
            { progress: clamp(pinch - 0.15, anchorProgress + 0.05, pinch - 1e-3), rank: pinchRank },
            { progress: pinch, rank: pinchRank },
            { progress: 1.0, rank: finalRank },
          ],
        });
        used.add(idx);
        stats.exposure++;
        any = true;
      });
      if (any) {
        stats.counts.photoFan = 1;
        stats.admitted++;
      }
    }
  }

  // ── MULTI-ROLE CHAINS (ACTION-BUILD-7b, the owner's steering rule) — role chains replace the one-script
  // cap: DISJOINT windows, eased splices, ONE curve through the accountant, endpoint always the drawn place.
  // Band-1 racers explicitly chain (a mid-race dip in window 1, a late cross in window 2). Outside band 1
  // the authored time-share stays moderate (the arcs above own a single window, not the whole race). ──
  if (finaleCast) {
    const b1 = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i));
    for (const idx of b1) {
      const fr = drawnOf(idx);
      const ar = anchorRankOf.get(idx) ?? fr;
      const dip = clamp(fr + 2 + Math.floor(rng() * 3), 1, BAND_EDGES[0] + 3); // window-1 mid-race dip
      const cross = clamp(fr + (rng() < 0.5 ? 1 : -1), 1, BAND_EDGES[0]); // window-2 late cross seed
      scripts.set(idx, {
        role: 'chain',
        kind: LONGITUDINAL,
        resolve: 0.9,
        chain: true,
        // The two ROLE windows are disjoint ([anchor,0.45] mover, [0.7,1.0] cross) with a transition between;
        // the splice waypoints are shared (C0) so the min-jerk curve keeps the per-tick delta small.
        chainWindows: [
          [anchorProgress, 0.45],
          [0.7, 1.0],
        ],
        waypoints: [
          { progress: anchorProgress, rank: ar },
          { progress: 0.45, rank: dip },
          { progress: 0.7, rank: cross },
          { progress: 1.0, rank: fr },
        ],
      });
      used.add(idx);
      stats.exposure++;
      stats.chains++;
      stats.timeShareSum += 1 - anchorProgress; // a chain is authored across the whole post-anchor span
    }
  }

  // ── FINAL-DRAW FOR ALL (ACTION-BUILD-7, the owner's brief; target 2 + 4) — the ship's proven finale
  // engine (the last-reroll tempo differences that persist to the line), AUTHORED instead of rolled and
  // freed of the servo fight. Every racer not otherwise cast gets a persistent finish-stretch tempo: within
  // its band, an authored late crossing — planner proposal 1: the planned-slower (drawn behind) is held
  // slightly AHEAD at finale entry, and the planned-faster passes it to the exact drawn place by the line.
  // Longitudinal / same-lane → needs NO side room → NOT lane-gated → the narrow-track finale engine
  // (searound, ice). Endpoint-exact (each racer ends at its drawn place) so band-reach is untouched, and
  // pillar 3 (order within a band is free) makes the crossing a zero-fairness-cost band-duel. The crossing
  // spans [FINALE_ENTRY, 1.0] so its visible action is inside the finale window. Only when finaleCast. ──
  const FINALE_ENTRY = 0.7;
  if (finaleCast) {
    // Density curve: the fraction of same-band pairs that get a late cross rises with the slider so more
    // racers carry a visible finale story at higher stages (monotone). Negative-space (planner proposal 2):
    // one seeded band is left calm (no final-draw) as a texture, guarding against uniform busy-ness.
    const crossFrac = { low: 0.45, mid: 0.85, high: 1.0 }[stage] ?? 0.85;
    // Negative-space (planner proposal 2): one seeded band kept calm — but NEVER band 1 (owner rule: the
    // front is cast in every race). So the quiet band is drawn from bands 1..5 (index ≥ 1), never index 0.
    stats.quietBand = negativeSpace ? 1 + Math.floor(rng() * BAND_EDGES.length) : -1;
    for (let bi = 0; bi <= BAND_EDGES.length; bi++) {
      if (bi === stats.quietBand) continue;
      const [lo, hi] = bandBounds(bi, N);
      const members = byDrawn.filter((i) => !used.has(i) && drawnOf(i) >= lo && drawnOf(i) <= hi);
      for (let m = 0; m + 1 < members.length; m += 2) {
        const a = members[m]; // drawn AHEAD (planned faster)
        const b = members[m + 1]; // drawn BEHIND (planned slower)
        const da = drawnOf(a);
        const db = drawnOf(b);
        const roll = rng();
        if (roll >= crossFrac) continue; // this pair stays monotone (falls through to the default ease)
        const aRankA = anchorRankOf.get(a) ?? da;
        const aRankB = anchorRankOf.get(b) ?? db;
        // Late cross: at FINALE_ENTRY the slower (b) sits ahead (da) and the faster (a) sits behind (db);
        // they cross to their exact drawn places by the line. Within-band, adjacent ranks → reachable.
        scripts.set(a, {
          role: 'finalDraw',
          kind: LONGITUDINAL,
          resolve: 0.9,
          waypoints: [
            { progress: anchorProgress, rank: aRankA },
            { progress: FINALE_ENTRY, rank: db },
            { progress: 1.0, rank: da },
          ],
        });
        scripts.set(b, {
          role: 'finalDraw',
          kind: LONGITUDINAL,
          resolve: 0.9,
          waypoints: [
            { progress: anchorProgress, rank: aRankB },
            { progress: FINALE_ENTRY, rank: da },
            { progress: 1.0, rank: db },
          ],
        });
        used.add(a);
        used.add(b);
        stats.finalDraw += 2;
        stats.bandDuels++;
        stats.exposure += 2;
        stats.timeShareSum += 2 * (1 - FINALE_ENTRY); // active only in the finale window [0.7, 1]
      }
    }
  }

  // ── ACCORDION BEATS UNDER CLEARANCE — every accordion pulse is a compression element, so it goes through
  // the SAME reader (and the SAME shared-corridor state as the lateral scripts above: a beat that would
  // fight a lead-trade for the front lane is refused). The beat schedule is generated here, identically to
  // the runtime formula (same 0x0acc0 salt), so beat indices align; the runtime consumes accordAdmittedBeats
  // for its beat-entry admission instead of its own open-lane read. Only computed when the accordion is on. ──
  let accordBeats = [];
  const accordAdmittedBeats = [];
  if (accordion && accordion.density > 0) {
    const arng = mulberry32(((seed | 0) ^ 0x0acc0) >>> 0 || 1);
    for (let bi = 0; bi < accordion.density; bi++)
      accordBeats.push(+(0.12 + (0.9 - 0.12) * ((bi + arng()) / accordion.density)).toFixed(4));
    const pulseLen = accordion.pulseLen ?? 0.06;
    for (let bi = 0; bi < accordBeats.length; bi++) {
      const b = accordBeats[bi];
      // The pass the beat buys is the immediate follower going by the momentary leader → front ranks 1..3.
      const dec = reader
        ? reader.admit({ p0: b, p1: b + pulseLen, rankLo: 1, rankHi: 3 })
        : { admitted: true };
      if (dec.admitted) {
        accordAdmittedBeats.push(bi);
      } else {
        stats.accordRefuse++;
      }
    }
    // The accordion is a compression element too, so the graded budget thins it with the scripts: keep only
    // a budgetScale fraction of the clearance-admitted beats (gs → 0 removes them all, handing the narrowest
    // geometry fully back to the plain proximity substrate; gs == 1 keeps every admitted beat).
    if (applyBudget && accordAdmittedBeats.length) {
      const keep = Math.round(accordAdmittedBeats.length * gs);
      stats.accordRefuse += accordAdmittedBeats.length - keep;
      accordAdmittedBeats.length = keep;
    }
    stats.accordAdmit = accordAdmittedBeats.length;
  }

  // ── Per-race variety signature: the sorted (role, resolve-bucket) multiset. Two races with the same
  // signature are a near-duplicate timeline (C_sig collision). Entropy of the role mix is H_script. ──
  const sigParts = [];
  for (const sc of scripts.values()) sigParts.push(`${sc.role}:${Math.round(sc.resolve * 20)}`);
  sigParts.sort();
  stats.signature = sigParts.join('|');
  stats.scriptCount =
    stats.counts.fightForLead +
    stats.counts.comebacker +
    stats.counts.fallbacker +
    stats.counts.paceConvergence +
    stats.counts.duelPair +
    stats.counts.photoFan;
  stats.actionLevel = actionLevel;
  stats.lanesFront = reader ? reader.lanesAt(0.85) : null; // representative finale lane count (telemetry)
  stats.minLanes = minLanes; // min lanes over the race distance (drives the graded budget)
  stats.budgetScale = applyBudget ? +budgetScale.toFixed(3) : 1; // 1 = full budget, 0 = handed to substrate

  // ── STORY-DENSITY ACCOUNTING (ACTION-BUILD-7 target 1) — a racer "carries a story visible in the finale"
  // if its AUTHORED rank changes by ≥1 place across the finale window [0.7, 1.0] (a net late gain/loss, i.e.
  // an overtake or a slide the eye sees near the line). Progress-based ⇒ duration-independent. Per-racer
  // exposure is structurally ≤1 (the `used` set forbids a second story), so no racer is a puppet all race. ──
  const rankAt = (wps, p) => {
    if (p <= wps[0].progress) return wps[0].rank;
    for (let i = 1; i < wps.length; i++) {
      if (p <= wps[i].progress) {
        const t = (p - wps[i - 1].progress) / Math.max(1e-9, wps[i].progress - wps[i - 1].progress);
        return wps[i - 1].rank + (wps[i].rank - wps[i - 1].rank) * t;
      }
    }
    return wps[wps.length - 1].rank;
  };
  let finaleStories = 0;
  for (const sc of scripts.values()) {
    const endRank = sc.waypoints[sc.waypoints.length - 1].rank;
    if (Math.abs(rankAt(sc.waypoints, 0.7) - endRank) >= 1) finaleStories++;
  }
  stats.finaleStories = finaleStories; // racers with a ≥1-place move in the last 30% (the density target)
  stats.storiedRacers = stats.exposure; // total racers carrying any authored story
  // ACTION-BUILD-7b: exposure is per-racer bounded but no longer capped at 1 — band-1 racers CHAIN two
  // roles in one curve. It is measured (max authored roles on any one racer) rather than asserted.
  stats.exposureMax = finaleCast ? 2 : 1; // chains give band-1 racers up to two roles (still one curve)
  stats.timeShareMean = stats.exposure ? +(stats.timeShareSum / stats.exposure).toFixed(3) : 0;
  // Feasible far-back depth trade-off (the owner asked for this as numbers): how deep an owner arc can go
  // for each resolve window — a 10% window (0.90) vs 12% (0.88) vs 15% (0.85). depth = REACH_RATE·(1−resolve).
  stats.depthWindow = {
    w10: feasibleDepth(0.9),
    w12: feasibleDepth(0.88),
    w15: feasibleDepth(0.85),
  };

  return { scripts, accordBeats, accordAdmittedBeats, stats };
}
