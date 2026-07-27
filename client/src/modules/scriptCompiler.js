// ============================================================
// File:        scriptCompiler.js
// Path:        client/src/modules/scriptCompiler.js
// Project:     RaceArena
// Description: THE FINALE SCRIPT COMPILER (ACTION-BUILD-4). Per race, a seeded, row-blind draw of a
//              script set from the finale pool, compiled through the full admission stack
//              (reachability accountant · per-racer exposure cap · geometry preference · whole-race
//              occupancy spread), emitted as AUTHORED CURVES (rank-space waypoints). Nothing runs per
//              tick here: this is the formation author's pen — it decides WHICH curves get written.
//              What does not fit the admission stack is SHRUNK or DROPPED before it exists.
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
}) {
  const N = postChaos.length;
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

  // ── SLIDER → script budget (monotone). Higher actionLevel = strictly more scripts of every family. The
  // budget is now TOPOLOGY-BLIND: we draw ambitiously for every family (compression included) and let the
  // clearance reader admit/refuse each lateral instance by local space. What has no room simply is not built. ──
  const LEVEL = { low: 0.6, mid: 1.0, high: 1.5 }[actionLevel] ?? 1.0;
  // Per-family target counts (a seeded jitter around the target makes the draw vary race to race). The
  // ±2.2 span gives a real -1/0/+1 spread (a ×1.0 span rounds to 0 almost always → identical draws).
  const jitter = () => Math.round((rng() - 0.5) * 2.2); // ~-1..+1 (row-blind seeded), genuinely varied
  const q = (base) => Math.max(0, Math.round(base * LEVEL) + jitter());
  const quota = {
    fightForLead: Math.round(1 * LEVEL) >= 1 ? 1 : 0, // one group attempted; clearance filters members
    comebacker: q(2),
    fallbacker: q(2),
    paceConvergence: q(frontConvergence ? 2 : 1), // ARM C raises the longitudinal front story
    duelPair: q(1),
    photoFan: rng() < 0.5 * LEVEL ? 1 : 0, // sometimes; clearance decides if it fits
  };

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
    stats.counts[role]++;
    if (shrunk) stats.shrunk++;
    return true;
  };

  // ── FIGHT FOR THE LEAD — the B1-drawn group trades the lead from ~0.7 (1–3 place excursions; intra-band
  // ⇒ zero fairness cost). Each member peaks (is pulled toward rank 1) in a sequenced window so distinct
  // racers lead through the finale. LATERAL → each peak is admitted per-instance by the clearance reader:
  // it fires only where a free corridor exists at that place/time, and members sequence through the shared
  // corridor (one at a time where the front is tight, several where it is wide). ARM C: a member the reader
  // REFUSES is converted to a front-band longitudinal catch-up (compression cannot have the moment, so the
  // longitudinal finale story does). Endpoint stays the drawn place for every member either way. ──
  if (quota.fightForLead) {
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

  // ── COMEBACKER — drawn in the front half; held a shallow depth behind its draw, then climbs late (the
  // places-gained-late scene). Longitudinal → safe when lanes are scarce. ──
  {
    const pool = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[1] && !used.has(i));
    let placed = 0;
    for (const idx of pool) {
      if (placed >= quota.comebacker) break;
      const depth = 5 + Math.floor(rng() * 5); // 5..9 places to climb back
      const holdRank = drawnOf(idx) + depth;
      const holdStart = clamp(anchorProgress + 0.08 + rng() * 0.1, anchorProgress + 0.02, 0.5);
      const resolve = nextResolve(0.7, 0.95);
      if (admitHold(idx, 'comebacker', LONGITUDINAL, holdStart, resolve, holdRank)) placed++;
    }
  }

  // ── FALLBACKER — a front spot held ahead of its draw, then falls back late (five-overtakes scene). The
  // racer occupies a better rank than it earned, and the field passes it near the line. Longitudinal. ──
  {
    // Drawn just outside/at the front so the fall is visible and band-local (6..~B2 top).
    const pool = byDrawn.filter((i) => {
      const d = drawnOf(i);
      return d >= 4 && d <= BAND_EDGES[1] && !used.has(i);
    });
    let placed = 0;
    for (const idx of pool) {
      if (placed >= quota.fallbacker) break;
      const rise = 4 + Math.floor(rng() * 5); // shown 4..8 places better than it finishes
      const holdRank = Math.max(1, drawnOf(idx) - rise);
      const holdStart = clamp(anchorProgress + 0.06 + rng() * 0.1, anchorProgress + 0.02, 0.5);
      const resolve = nextResolve(0.72, 0.94); // falls back late
      if (admitHold(idx, 'fallbacker', LONGITUDINAL, holdStart, resolve, holdRank)) placed++;
    }
  }

  // ── PACE-ORDER CONVERGENCE — planned-faster behind planned-slower, same lane, honest catch-up completes
  // the pass (the ship's dirt mechanism, seeded not diced). Pick an adjacent same-band pair (A drawn ahead,
  // B drawn just behind); AUTHOR B as the faster one, held level behind A then a single clean late catch-up
  // to its drawn place. No brake, no lane change → the one action closed geometry allows. Longitudinal. ──
  {
    let placed = 0;
    for (let k = 0; k < byDrawn.length - 1 && placed < quota.paceConvergence; k++) {
      const a = byDrawn[k];
      const b = byDrawn[k + 1];
      if (used.has(a) || used.has(b)) continue;
      const da = drawnOf(a);
      const db = drawnOf(b);
      if (bandOf(da) !== bandOf(db) || db - da > 3) continue; // adjacent, same band
      // B (drawn behind) is authored as the faster racer: it sits a couple places back through the middle,
      // then completes ONE monotone same-lane catch-up to its drawn place late. A eases normally (no script).
      const holdRank = db + (1 + Math.floor(rng() * 2)); // 1..2 back of its draw
      const holdStart = clamp(anchorProgress + 0.1 + rng() * 0.1, anchorProgress + 0.02, 0.55);
      const resolve = nextResolve(0.74, 0.95);
      if (admitHold(b, 'paceConvergence', LONGITUDINAL, holdStart, resolve, holdRank)) placed++;
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
        stats.accordAdmit++;
      } else {
        stats.accordRefuse++;
      }
    }
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

  return { scripts, accordBeats, accordAdmittedBeats, stats };
}
