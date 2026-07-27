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
 * @param {number} [args.scarcity]        lateral-clearance read in [0,1]; 1 = lanes scarce (closed), 0 = open
 * @returns {{ scripts: Map<number,{role:string, kind:string, waypoints:Array<{progress:number,rank:number}>, resolve:number}>,
 *            stats: object }}
 */
export function compileRaceScripts({
  seed,
  postChaos,
  finalRanks,
  anchorProgress,
  actionLevel = 'mid',
  scarcity = 0.5,
}) {
  const N = postChaos.length;
  const rng = mulberry32(((seed | 0) ^ 0x5c819f) >>> 0 || 1); // isolated stream (own salt)
  const s = clamp(scarcity, 0, 1);

  // Live rank + drawn place lookups (row-blind — index only).
  const anchorRankOf = new Map(postChaos.map((p) => [p.index, clamp(p.rank, 1, N)]));
  const drawnOf = (idx) => clamp(finalRanks.get(idx) ?? anchorRankOf.get(idx) ?? 1, 1, N);
  // Field ordered by DRAWN place (band assignment reads the draw, never the live order or the row).
  const byDrawn = postChaos.map((p) => p.index).sort((a, b) => drawnOf(a) - drawnOf(b));

  // ── SLIDER → script budget (monotone). Higher actionLevel = strictly more scripts of every family. ──
  const LEVEL = { low: 0.6, mid: 1.0, high: 1.5 }[actionLevel] ?? 1.0;
  // Geometry preference (one global rule reading local clearance, never a track name): scarce lateral
  // room favours longitudinal same-lane scripts; open room favours compression/rotation.
  const compW = 1 - s; // open → 1, closed → 0
  const longW = 0.5 + s; // closed → 1.5, open → 0.5
  // Per-family target counts (a seeded jitter around the target makes the draw vary race to race). The
  // ±2.2 span gives a real -1/0/+1 spread (a ×1.0 span rounds to 0 almost always → identical draws).
  const jitter = () => Math.round((rng() - 0.5) * 2.2); // ~-1..+1 (row-blind seeded), genuinely varied
  const q = (base, w) => Math.max(0, Math.round(base * LEVEL * w) + jitter());
  const quota = {
    fightForLead: Math.min(1, Math.max(0, Math.round(1 * LEVEL * compW))), // 0 or 1 group
    comebacker: q(2, longW),
    fallbacker: q(2, longW),
    paceConvergence: q(1, longW),
    duelPair: q(1, compW),
    photoFan: compW > 0.4 && rng() < 0.5 * LEVEL ? 1 : 0, // sometimes, open only
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
  // racers lead through the finale, then all resolve to their drawn ranks. Compression → open lanes only. ──
  if (quota.fightForLead) {
    const front = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i)).slice(0, 4);
    if (front.length >= 2) {
      const start = 0.7;
      const span = 0.24; // 0.70..0.94 lead-trading window
      front.forEach((idx, j) => {
        const finalRank = drawnOf(idx);
        const aRank = anchorRankOf.get(idx) ?? finalRank;
        // Each member is pulled to the front of B1 in its own sub-window → sequenced lead changes.
        const peakProg = clamp(start + span * ((j + 0.5) / front.length), start, 0.94);
        const peakRank = 1 + (j % 2); // alternate rank 1 / rank 2 so the lead genuinely changes hands
        const preProg = clamp(peakProg - 0.1, anchorProgress + 0.05, peakProg - 1e-3);
        const waypoints = [
          { progress: anchorProgress, rank: aRank },
          { progress: preProg, rank: clamp(Math.round((aRank + finalRank) / 2), 1, BAND_EDGES[0]) },
          { progress: peakProg, rank: peakRank },
          { progress: 1.0, rank: finalRank }, // resolves to the drawn place (fairness untouched)
        ];
        scripts.set(idx, { role: 'fightForLead', kind: COMPRESSION, waypoints, resolve: peakProg });
        used.add(idx);
        stats.exposure++;
      });
      stats.counts.fightForLead = 1;
      stats.admitted++;
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

  // ── BAND-LOCAL DUEL PAIR — two adjacent same-band racers trade their local order once or twice, then
  // resolve to their drawn places. Rotation → open lanes. ──
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

  // ── PHOTO-FINISH FAN (sometimes, open only) — a small late compression of the top cluster: the front
  // ~5 drawn racers pinch together at ~0.92 then fan to their exact places at the line. Band-local. ──
  if (quota.photoFan) {
    const front = byDrawn.filter((i) => drawnOf(i) <= BAND_EDGES[0] && !used.has(i)).slice(0, 5);
    if (front.length >= 3) {
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
  stats.scarcity = +s.toFixed(3);

  return { scripts, stats };
}
