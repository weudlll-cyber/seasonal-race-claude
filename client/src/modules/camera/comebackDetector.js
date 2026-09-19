// ============================================================
// File:        comebackDetector.js
// Path:        client/src/modules/camera/comebackDetector.js
// Project:     RaceArena — CAMERA-HYGIENE-2
//
// WHAT THIS IS FOR: answering "is anybody coming through the field right now, and who". It keeps a
// short rank history for the racers worth watching, and reports the best current climber that
// passes the gates. That is the whole job.
//
// WHAT IT IS NOT FOR: deciding whether the camera cuts to them. Eligibility, weight, cooldown and
// the camera lock all stay in CameraDirector — this object answers a question about the RACE and has
// no opinion about the shot. It holds no camera value and reads none.
//
// WHY IT REMEMBERS ANYTHING AT ALL. A comeback is not visible in one frame: it is a rank at time T
// compared with a rank `windowSec` earlier, so somebody has to hold the past. That "somebody" was
// four fields and five methods on CameraDirector, which is why this is a file — the state and the
// arithmetic that reads it now live together.
//
// ★★ WHO IS A CANDIDATE — THE CAST, AND NOBODY ELSE (owner's decision, 2026-09-19):
//   the heroes the race plan gave role 'comebacker'. The race authors who comes back, so the camera
//   watches the racer the story named and no other. **With no cast comebacker there is no comeback
//   shot**, and whatever the camera shows instead is one of its other states.
//
//   Until 2026-09-19 there was a second case: failing a cast, the whole B1 pool (targetRank <= 5).
//   It is GONE — `best()` returns null instead. It fired in the ~4% of races that cast nobody and in
//   every race whose only 'comebacker' was the drawn winner, and what it produced was the camera
//   claiming a comeback that no plan had authored. See the block at the refusal in `best()`.
//
// Every cast comebacker is drawn from the B1 pool, so the cast is always already rank-tracked — and
// that is why `_b1` is still the RECORDING roster even though it is no longer a candidate pool.
// ============================================================

/** Rank history is kept this much longer than the window, so the window-start lookup never misses. */
const PRUNE_MARGIN_MS = 2000;

export class ComebackDetector {
  /** @param {object} gates  see setGates */
  constructor(gates) {
    this._gates = gates;
    this._b1 = null; // Set<racerIndex> | null — null disables detection entirely
    this._history = new Map(); // Map<racerIndex, Array<{ts, rank}>>
    this._cast = null; // Set<racerIndex> | null — the plan's named comebackers
    this._resolveByIndex = new Map(); // Map<racerIndex, progress> — the plan's authored resolve beat
  }

  /**
   * @param {{windowSec:number, minPositionsGained:number, minStartGap:number, maxCurrentRankPct:number}} gates
   */
  setGates(gates) {
    this._gates = gates;
  }

  /**
   * Race start: which racers are worth watching, and the plan if it already exists. Clears the
   * history, because a rank recorded in the previous race means nothing in this one.
   * @param {Set<number>|null} b1Indices  racers with targetRank <= 5; null disables detection
   * @param {object|null} cameraPlan
   */
  setRoster(b1Indices, cameraPlan = null) {
    this._b1 = b1Indices instanceof Set ? b1Indices : null;
    this._history = new Map();
    this.setPlan(cameraPlan);
  }

  /**
   * Mid-race plan delivery, once the heroes are cast. Deliberately does NOT clear the history —
   * the racers were already being tracked and the plan only says which of them the story named.
   * @param {object|null} cameraPlan  { b1Indices, heroes:[{index, role, finalRank, beats}] }
   */
  setPlan(cameraPlan) {
    const heroes = cameraPlan?.heroes;
    if (!Array.isArray(heroes)) {
      this._cast = null;
      return;
    }
    const set = new Set();
    // COMEBACK-CONNECT-1: the RESOLVE beat, kept on the same walk over the same array that already
    // reads the role. This is deliberately not a second channel — the plan arrives here once, and
    // what was being thrown away is now kept beside what was being used.
    //
    // ★ RESOLVE, NOT PEAK, AND THE FIRST DRAFT HAD IT WRONG. `peak` is where the authored curve is
    // steepest and reads like the moment the shot is about — but MEASURED over 30 races the peaks
    // run 0.18 to 0.676, and the director will not even consider a comeback until the outcome phase
    // opens at `outcomePhaseThreshold` (0.75 shipped). EVERY authored peak is already behind the
    // camera by the time it is allowed to look, so a peak gate cannot bite: both arms came back
    // byte-identical. `resolve` is where the authored climb LANDS, it sits just past the window
    // (0.78 in the sampled plans), and it is the beat COMEBACK-BEATS-1's own distance metric is
    // measured against. Keeping `anchor` and `peak` too would be storing values nothing reads.
    // ★★ THE MATCH IS EXACT, AND THAT IS WHAT EXCLUDES THE `pursuer` — 2026-09-18.
    //
    // The generator casts three kinds of racer from the B1 pool: the drawn winner
    // (`heroCurveGenerator.js:648`), the STAGED comebacker (`:688`) and the unstaged front-group
    // pursuer (`:722`). ★★ SINCE 2026-09-19 ONLY THE STAGED ONE IS `'comebacker'`; the other two are
    // `'sovereign-lead'` and `'pursuer'` and neither reaches `_cast`.
    //
    // The pursuer was split out on 2026-09-18 because the camera forcing a comeback shot on a racer
    // who is merely chasing is a defect (COMEBACKER-READERS-1 measured him taking 19 of 157
    // COMEBACK_ZOOM shots, 12%). The drawn winner followed on 2026-09-19 on the owner's decision —
    // a comeback is shown when one was PLANNED, not when one happens — and he was the larger share:
    // 29 of 153 shots over 200 races (PLANNED-COMEBACK-ONLY-1 §3). He is named `sovereign-lead`
    // because that is measurably what he is: he LEADS in 90.7% of races and holds the race's peak
    // gap in 30.2%, against the pursuer's 64.2% and 8.9%.
    //
    // ★ NO `!== 'pursuer'` GUARD IS ADDED HERE ON PURPOSE. An equality test already admits exactly one
    // string, so a second check would be dead on the day it was written and would rot into a list
    // every future role had to be added to. `comebackDetector.pursuer.test.js` goes red if this ever
    // starts admitting the pursuer again.
    const resolves = new Map();
    for (const h of heroes) {
      if (h && h.role === 'comebacker' && Number.isInteger(h.index)) {
        set.add(h.index);
        const beat = Array.isArray(h.beats) ? h.beats.find((b) => b?.event === 'resolve') : null;
        if (beat && Number.isFinite(beat.progress)) resolves.set(h.index, beat.progress);
      }
    }
    this._cast = set.size > 0 ? set : null;
    this._resolveByIndex = resolves;
  }

  /**
   * The authored resolve beat for one racer, or null when the plan named none. Read by the
   * measurement harness; `best()` uses the map directly.
   */
  resolveFor(index) {
    return this._resolveByIndex?.get(index) ?? null;
  }

  /**
   * Is this racer one the PLAN cast as a comebacker?
   *
   * COMEBACK-PRECEDENCE-1 needed this to tell a cast comebacker from a `_b1` fallback candidate,
   * because the precedence applied to the cast ONLY. ★ SINCE 2026-09-19 THERE IS NO FALLBACK
   * CANDIDATE: `best()` refuses outright when the cast is empty, so every racer it can return is
   * already cast and this method can only answer `true` for them. It is KEPT rather than deleted
   * because the director asks the question one line after `best()` returns
   * (`CameraDirector.js:889`), and a population test that reads the set instead of trusting the
   * caller is the thing that would go red if the refusal were ever removed again. It reads the set
   * `setPlan` already builds and adds no second notion of who is cast.
   */
  isCast(index) {
    return !!this._cast && this._cast.has(index);
  }

  /** True when detection is switched on at all (a roster exists). */
  get active() {
    return !!this._b1 && this._b1.size > 0;
  }

  /** The watched roster — read by the diagnostics HUD. */
  get roster() {
    return this._b1;
  }

  /** Rank history for one racer, oldest first. Empty array when untracked. */
  historyFor(index) {
    return this._history.get(index) ?? [];
  }

  /**
   * Record this frame's rank for every watched racer. Called once per frame. Only the roster is
   * tracked, so the per-frame allocation stays trivial in a 40-racer field.
   * @param {Array} racers  full live racer array, any order
   * @param {number} ts
   */
  recordRanks(racers, ts) {
    if (!this.active) return;
    const pruneMs = this._gates.windowSec * 1000 + PRUNE_MARGIN_MS;
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (!this._b1.has(r.index)) continue;
      let hist = this._history.get(r.index);
      if (!hist) {
        hist = [];
        this._history.set(r.index, hist);
      }
      hist.push({ ts, rank: i + 1 });
      while (hist.length > 1 && hist[0].ts < ts - pruneMs) hist.shift(); // keep at least one
    }
  }

  /**
   * The best current comeback, or null. "Best" is the largest rank gain over the window among
   * candidates that also started far enough back and have not already reached the lead group —
   * both filters are normalised by field size, so they mean the same thing in a 10-racer race.
   * @param {Array} racers
   * @param {number} ts
   * @returns {object|null} the live racer object
   */
  best(racers, ts, progress = null) {
    if (!this.active) return null;
    const g = this._gates;
    const cutoff = ts - g.windowSec * 1000;
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    const rankByIndex = new Map(sorted.map((r, i) => [r.index, i + 1]));
    const normDivisor = Math.max(sorted.length - 1, 1);
    // ── ★★ THE CAST, AND ONLY THE CAST — the owner's decision of 2026-09-19 ──────────────────
    //
    // A COMEBACK IS SHOWN WHEN ONE WAS PLANNED, NOT WHEN ONE HAPPENS. This line used to read
    //     `this._cast && this._cast.size > 0 ? this._cast : this._b1`
    // so that in a race whose plan named no comebacker the camera chose a subject out of the whole
    // B1 pool instead — the camera inventing the very thing the cast exists to author. Measured over
    // 200 races on master (PLANNED-COMEBACK-ONLY-1 §3): 14 of 153 COMEBACK_ZOOM shots were chosen
    // that way, 13 of them on a racer the plan had not cast in any role at all.
    //
    // ★ NOTHING WAS ADDED TO SAY IT. The refusal is the early-return idiom this method already opens
    // with three lines above (`if (!this.active) return null`), and the set it refuses on is the one
    // `setPlan` already builds at `:110`. There is NO config key: with no cast comebacker there is no
    // comeback shot, full stop, which is a behaviour and not a setting.
    //
    // ★ `_b1` IS NOT DEAD and is deliberately left alone. It is the RECORDING roster — `recordRanks`
    // tracks it, `active` is defined by it, and the diagnostics `roster` getter returns it. History
    // must still be kept for every B1 racer, because the plan arrives MID-RACE (`setPlan`) and a
    // racer cast then needs the window that was recorded before he was named.
    if (!this._cast || this._cast.size === 0) return null;
    const candidates = this._cast;

    let bestRacer = null;
    let bestGain = -1;
    for (const idx of candidates) {
      const currentRank = rankByIndex.get(idx);
      if (currentRank == null) continue; // finished or absent
      // ── COMEBACK-CONNECT-1: THE PLAN SAYS WHEN, WHEN IT IS SWITCHED ON ──────────────────────
      //
      // OFF (`comebackUseBeats: false`, the shipped default) this whole clause is skipped and the
      // moment is whatever the rank-history gates below make it — today's behaviour, unchanged.
      //
      // ON, a racer the plan NAMED is not offered before the plan's resolve beat. This does not decide
      // whether the comeback is real: every gate below still runs, so a racer who never gains the
      // positions is still never offered. It decides only that the shot cannot be taken before the
      // moment it is about — the defect COMEBACK-BEATS-1 measured, where the shot was on the right
      // racer every time and early by a median 0.134 of the race.
      //
      // ★ A CANDIDATE THE PLAN DID NOT NAME IS UNTOUCHED, deliberately: a hero with no resolve beat
      // has no authored moment, and inventing one for him would be this feature making up the very
      // thing it exists to stop the camera making up. (Until 2026-09-19 this also covered `_b1`
      // fallback candidates; there are none any more — the refusal above returns before this loop.)
      if (g.useBeats && progress != null) {
        const landing = this._resolveByIndex.get(idx);
        if (landing != null && progress < landing) continue;
      }
      const hist = this._history.get(idx);
      if (!hist || hist.length < 2) continue;
      const start = earliestAtOrAfter(hist, cutoff);
      if (!start) continue;
      if ((start.rank - 1) / normDivisor < g.minStartGap) continue; // started far enough back?
      if ((currentRank - 1) / normDivisor < g.maxCurrentRankPct) continue; // not already up front
      const gain = start.rank - currentRank; // positive = moved forward
      if (gain >= g.minPositionsGained && gain > bestGain) {
        bestGain = gain;
        bestRacer = sorted.find((r) => r.index === idx) ?? null;
      }
    }
    return bestRacer;
  }
}

/** The first history entry at or after `cutoff`. History is append-ordered, so this is a scan. */
export function earliestAtOrAfter(hist, cutoff) {
  for (let i = 0; i < hist.length; i++) {
    if (hist[i].ts >= cutoff) return hist[i];
  }
  return null;
}
