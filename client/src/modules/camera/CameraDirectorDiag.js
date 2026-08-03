// ============================================================
// File:        CameraDirectorDiag.js
// Path:        client/src/modules/camera/CameraDirectorDiag.js
// Project:     RaceArena
// Description: Diagnostics mixin for CameraDirector. Installed onto
//              CameraDirector.prototype via Object.defineProperties at
//              the bottom of CameraDirector.js. All methods use this.*
//              and are resolved against CameraDirector instances at call
//              time. No import from CameraDirector.js — avoids circular dep.
// ============================================================

import { shortestArcDeltaT } from '../../utils/mathUtils.js';
import { earliestAtOrAfter } from './comebackDetector.js';

export const diagMixin = {
  // ── Lead-change diagnostics ───────────────────────────────────────────────

  /**
   * Live LEAD_CHANGE diagnostics for the DevPanel LeadChangeDiagHUD.
   * @returns {object}
   */
  getLeadChangeDiagData() {
    return {
      active: this.state === 'LEAD_CHANGE',
      newLeader: this._leadChangeNewLeaderName,
      previousLeader: this._leadChangePrevLeaderName,
      currentLeader: this._currentLeaderName,
      pendingChange: this._leadChangePending,
      minGap: this._leadChangeMinGap,
      debounceMs: this._leadChangeDebounceMs,
    };
  },

  // ── Comeback diagnostics ──────────────────────────────────────────────────

  /**
   * Live COMEBACK diagnostics for the DevPanel ComebackDiagHUD.
   * @param {Array} racers  Full live racer list.
   * @param {number} ts  Current timestamp in ms.
   * @returns {object}
   */
  getComebackDiagData(racers, ts) {
    const sorted = racers ? [...racers].sort((a, b) => b.t - a.t) : [];
    const currentRankByIndex = new Map(sorted.map((r, i) => [r.index, i + 1]));
    const g = this._comebackGates;
    const cutoff = ts - g.windowSec * 1000;
    const minGain = g.minPositionsGained;
    const minStartGap = g.minStartGap;
    const maxCurrentRankPct = g.maxCurrentRankPct;
    const N = sorted.length;
    const normDivisor = Math.max(N - 1, 1);
    const b1Data = [];
    if (this._comeback.roster) {
      for (const idx of this._comeback.roster) {
        const racer = sorted.find((r) => r.index === idx);
        const currentRank = currentRankByIndex.get(idx) ?? null;
        // The detector's own window lookup, so the HUD and the gate can never disagree about
        // which history entry "the start of the window" means.
        const earliestInWindow = earliestAtOrAfter(this._comeback.historyFor(idx), cutoff);
        const gain =
          earliestInWindow != null && currentRank != null ? earliestInWindow.rank - currentRank : 0;
        const startGapNorm =
          earliestInWindow != null ? (earliestInWindow.rank - 1) / normDivisor : 0;
        const currentRankNorm = currentRank != null ? (currentRank - 1) / normDivisor : 0;
        b1Data.push({
          index: idx,
          name: racer?.name ?? racer?.id ?? '?',
          currentRank,
          rankAtWindowStart: earliestInWindow?.rank ?? null,
          positionsGained: gain,
          gainOk: gain >= minGain,
          startGapOk: earliestInWindow != null && startGapNorm >= minStartGap,
          currentRankOk: currentRank != null && currentRankNorm >= maxCurrentRankPct,
          qualifies: gain >= minGain,
        });
      }
    }
    const lockedRacer = racers
      ? this._findByIndex(racers, this._comebackLockedRacerIndex, this._comebackLockedRacer)
      : this._comebackLockedRacer;
    const threshold = this._outcomePhaseThreshold ?? 0.75;
    const progress = this._diagLeaderProgress ?? 0;
    return {
      active: this.state === 'COMEBACK_ZOOM',
      lockedRacer,
      b1Data,
      windowSec: g.windowSec,
      minPositionsGained: minGain,
      outcomePhaseThreshold: threshold,
      leaderProgress: progress,
      isOutcomePhaseActive: !!(this._diagIsExternalOutcomePhase || progress > threshold),
    };
  },

  // ── Battle diagnostics ────────────────────────────────────────────────────

  /**
   * Live BATTLE diagnostics for the DevPanel BattleDiagHUD.
   * @returns {{
   *   active: boolean,
   *   lockedRacer: object|null,
   *   groupRacers: object[],
   *   groupRacerRanks: (number|null)[],
   *   originalGroupValid: boolean,
   *   currentGroupRacers: object[],
   *   isPulkNow: boolean
   * }}
   */
  getBattleDiagData(racers) {
    const currentGroup = racers ? this._detectPulkGroup(racers) : null;
    const groupRacers = racers ? this._findGroupRacers(racers) : (this._battleGroupRacers ?? []);
    let groupRacerRanks = [];
    if (racers && groupRacers.length > 0) {
      const sorted = [...racers].sort((a, b) => b.t - a.t);
      groupRacerRanks = groupRacers.map((gr) => {
        const idx = sorted.findIndex((r) => r === gr);
        return idx === -1 ? null : idx + 1;
      });
    }
    const lockedRacer = racers
      ? this._findByIndex(racers, this._battleLockedRacerIndex, this._battleLockedRacer)
      : this._battleLockedRacer;

    // Pairwise lap-normalized arc distances for the entry group (live positions). 15b: arc only,
    // scale-independent — no world-px distance in the diag.
    const groupPairwiseTemporal = [];
    for (let a = 0; a < groupRacers.length; a++) {
      for (let b = a + 1; b < groupRacers.length; b++) {
        const ra = groupRacers[a],
          rb = groupRacers[b];
        const nameA = ra?.name ?? ra?.id ?? '?';
        const nameB = rb?.name ?? rb?.id ?? '?';
        if (ra && rb) {
          const dt = +shortestArcDeltaT(ra.t, rb.t).toFixed(4);
          groupPairwiseTemporal.push({ a: nameA, b: nameB, dt });
        }
      }
    }

    // Q1: isolation check for DiagHUD display (arc)
    let isGroupIsolated = true;
    if (racers && groupRacers.length > 0 && this._battleGates.isolationT > 0) {
      const isoThrT = this._battleGates.isolationT;
      const groupSet = new Set(groupRacers.map((r) => r));
      for (const ro of racers) {
        if (groupSet.has(ro)) continue;
        for (const gm of groupRacers) {
          if (shortestArcDeltaT(gm.t, ro.t) < isoThrT) {
            isGroupIsolated = false;
            break;
          }
        }
        if (!isGroupIsolated) break;
      }
    }

    return {
      active: this.state === 'BATTLE_ZOOM',
      lockedRacer,
      groupRacers,
      groupRacerRanks,
      groupSize: groupRacers.length,
      originalGroupValid: racers ? this._isOriginalGroupStillValid(racers) : false,
      currentGroupRacers: currentGroup ?? [],
      isPulkNow: currentGroup !== null,
      isGroupIsolated,
      isolationThresholdT: this._battleGates.isolationT,
      groupPairwiseTemporal,
      closenessThresholdT: this._battleGates.closenessT,
    };
  },

  /** Reset the BATTLE-DIAG snapshot panel (called from HUD 'R' key). */
  resetBattleDiag() {
    this._battleDiagFrameCount = 0;
    this._battleDiagSnapshots = [];
    this._battleDiagFrozen = false;
  },

  // ── Read-only getters ─────────────────────────────────────────────────────

  /** TC (seconds) for the current state — readable by the diagnostics HUD. */
  get currentTc() {
    return this._tcByState?.[this.state] ?? this._tcByState?.OVERVIEW;
  },

  /** Current lerp phase: 'entry' (slow, smooth) or 'tracking' (fast, sticky). */
  get lerpPhase() {
    return this._lerpPhase;
  },

  /** Camera's current track parameter. Null until first state transition with a shape. */
  get camT() {
    return this._camT;
  },

  /** Current observer phase: 'idle' | 'lead-in' | 'follow' | 'lead-out'. */
  get observerPhase() {
    return this._observerPhase;
  },

  /** Last computed focus-racer t value (informational, for HUD). */
  get lastFocusT() {
    return this._lastFocusT;
  },

  /** Fraction of the last 60 frames spent in 'follow' phase (0.0–1.0). */
  get followPct() {
    let count = 0;
    for (let i = 0; i < 60; i++) count += this._followRingBuf[i];
    const total = Math.min(this._followRingIdx, 60);
    return total > 0 ? count / total : 0;
  },

  /** True when zoom has not yet converged to its target (within 0.1%). */
  get transitioning() {
    return Math.abs(this.zoom - this.targetZoom) > this.targetZoom * 0.001;
  },

  /**
   * 0–1 fraction of pan travel completed since the last state transition.
   * Returns 1 when at rest or when start equals target (no movement needed).
   */
  get panProgress() {
    const dx = this.targetOffsetX - this._transitionStartOffsetX;
    const dy = this.targetOffsetY - this._transitionStartOffsetY;
    const total = Math.sqrt(dx * dx + dy * dy);
    if (total < 0.5) return 1;
    const cx = this.offsetX - this._transitionStartOffsetX;
    const cy = this.offsetY - this._transitionStartOffsetY;
    return Math.min(1, Math.sqrt(cx * cx + cy * cy) / total);
  },

  /**
   * 0–1 fraction of zoom travel completed since the last state transition.
   * Returns 1 when at rest or when start equals target.
   */
  get zoomProgress() {
    const total = Math.abs(this.targetZoom - this._transitionStartZoom);
    if (total < 0.0001) return 1;
    return Math.min(1, Math.abs(this.zoom - this._transitionStartZoom) / total);
  },

  /** Whether the last pan-resolved target landed inside the inner frame. */
  get targetInFrame() {
    return this._lastResolvedPanTarget?.targetInInnerFrame ?? true;
  },

  /** How many times _transition() was called in the last 60 frames. */
  get transitionCount60f() {
    let count = 0;
    for (let i = 0; i < 60; i++) count += this._transitionRingBuf[i];
    return count;
  },

  /** Zoom delta at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaZoom() {
    return this._lastEntryDeltaZoom;
  },

  /** X pan delta in px at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaX() {
    return this._lastEntryDeltaX;
  },

  /** Y pan delta in px at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaY() {
    return this._lastEntryDeltaY;
  },

  /** Ms elapsed since the current entry phase started (0 when tracking). */
  get entryElapsedMs() {
    if (this._lerpPhase !== 'entry' || this._entryStartTs === null) return 0;
    return (this._lastTs ?? 0) - this._entryStartTs;
  },

  /** BATTLE-DIAG: snapshots at frames 1, 15, 30, 45, 60 of the current BATTLE_ZOOM episode. */
  get battleDiagSnapshots() {
    return this._battleDiagSnapshots;
  },

  /** True once 60 frames have been collected and the BATTLE-DIAG panel is frozen. */
  get battleDiagFrozen() {
    return this._battleDiagFrozen;
  },

  // ── Frame-log diagnostics ─────────────────────────────────────────────────

  /** Whether frame logging is currently active. */
  get diagEnabled() {
    return this._diagEnabled;
  },

  /** Total frames recorded since construction (monotonic, never resets). */
  get diagFrameCount() {
    return this._diagFrameIdx;
  },

  /**
   * Record one frame into the ring buffer. Called at the very end of update()
   * when _diagEnabled is true. The final offsetX/Y/zoom values are already set.
   */
  _recordDiagFrame(ts, dt, lf, tSpaceLerpActive, transitionFired, racers) {
    const dox = this._diagPrevOffsetX !== null ? this.offsetX - this._diagPrevOffsetX : 0;
    const doy = this._diagPrevOffsetY !== null ? this.offsetY - this._diagPrevOffsetY : 0;
    const dz = this._diagPrevZoom !== null ? this.zoom - this._diagPrevZoom : 0;
    this._diagRingBuf[this._diagRingIdx] = {
      fi: this._diagFrameIdx,
      ts,
      dt,
      st: this.state,
      lp: this._lerpPhase,
      op: this._observerPhase,
      ox: this.offsetX,
      oy: this.offsetY,
      z: this.zoom,
      tax: this.targetOffsetX,
      tay: this.targetOffsetY,
      tz: this.targetZoom,
      dox,
      doy,
      dz,
      lf,
      ts2: tSpaceLerpActive ? 1 : 0,
      tf: transitionFired ? 1 : 0,
      ct: this._camT,
      fot: this._lastFocusT,
      pft: this._diagPrevFocusT,
      ttt: this._transitionTargetT,
      ese: this._entrySpeedEstimate,
      edx: this._lastEntryDeltaX,
      edy: this._lastEntryDeltaY,
      edz: this._lastEntryDeltaZoom,
      cr: this._diagConvergenceReason,
      rc: racers
        ? racers.map((r) => ({
            n: r.name ?? r.id ?? '?',
            t: typeof r.t === 'number' ? +r.t.toFixed(6) : r.t,
            x: typeof r.x === 'number' ? +r.x.toFixed(2) : r.x,
            y: typeof r.y === 'number' ? +r.y.toFixed(2) : r.y,
            dx: typeof r._diagDx === 'number' ? +r._diagDx.toFixed(3) : 0,
            dy: typeof r._diagDy === 'number' ? +r._diagDy.toFixed(3) : 0,
            dt: typeof r._diagLogPrevT === 'number' ? +(r.t - r._diagLogPrevT).toFixed(6) : 0,
            sp: typeof r._diagSpeed === 'number' ? +r._diagSpeed.toFixed(3) : 0,
          }))
        : undefined,
    };
    this._diagConvergenceReason = null; // consumed — only set on the transition frame
    this._diagPrevOffsetX = this.offsetX;
    this._diagPrevOffsetY = this.offsetY;
    this._diagPrevZoom = this.zoom;
    this._diagRingIdx = (this._diagRingIdx + 1) % this._diagRingSize;
    this._diagFrameIdx++;
  },

  /**
   * Serialise the ring buffer to a self-documented JSON string.
   * Frames are returned in chronological order (oldest first).
   * @returns {string}  JSON ready for file download or clipboard paste.
   */
  exportDiagLog() {
    const buffered = Math.min(this._diagFrameIdx, this._diagRingSize);
    // When the buffer has wrapped, the oldest entry is at the current write head.
    const startIdx = this._diagFrameIdx >= this._diagRingSize ? this._diagRingIdx : 0;
    const frames = [];
    for (let i = 0; i < buffered; i++) {
      frames.push(this._diagRingBuf[(startIdx + i) % this._diagRingSize]);
    }
    return JSON.stringify(
      {
        meta: {
          exportedAt: new Date().toISOString(),
          totalFrames: this._diagFrameIdx,
          bufferedFrames: buffered,
          ringSize: this._diagRingSize,
          fieldLegend: {
            fi: 'frameIndex (monotonic)',
            ts: 'timestamp ms',
            dt: 'frame duration ms',
            st: 'camState',
            lp: 'lerpPhase: entry|tracking',
            op: 'observerPhase: idle|lead-in|follow|lead-out',
            ox: 'offsetX px',
            oy: 'offsetY px',
            z: 'zoom',
            tax: 'targetOffsetX px',
            tay: 'targetOffsetY px',
            tz: 'targetZoom',
            dox: 'deltaOffsetX from previous frame (px) — key jitter metric',
            doy: 'deltaOffsetY from previous frame (px)',
            dz: 'deltaZoom from previous frame',
            lf: 'lerp factor used this frame (dt-scaled)',
            ts2: 'tSpaceLerpActive: 1=T-space pin, 0=pixel lerp',
            tf: 'transitionFired this frame: 1=yes',
            ct: 'camT (track param 0–1, null if not in T-space)',
            fot: 'lastFocusT — focus racer track param this frame',
            pft: 'prevFocusT before this frame (null after state change)',
            ttt: 'transitionTargetT (T-space convergence goal, null when tracking)',
            ese: 'entrySpeedEstimate in T/frame',
            edx: 'entryConvergence deltaX px (0 when tracking)',
            edy: 'entryConvergence deltaY px (0 when tracking)',
            edz: 'entryConvergence deltaZoom (0 when tracking)',
            cr: 'convergenceReason: "threshold"|"timeout" on entry→tracking frame, null otherwise',
            rc: 'racers snapshot — array of {n,t,x,y,dx,dy,dt,sp} per racer: n=name, t=path-progress 0–1, x/y=world-px, dx/dy=Δpx from prev frame, dt=Δt from prev frame, sp=pixel-speed',
          },
        },
        frames,
      },
      null,
      0
    );
  },

  /**
   * Returns the last N frames' {dox, doy, tf} from the ring buffer, newest-last.
   * Used by the mini jitter graph overlay.
   * @param {number} [n=30]
   */
  getRecentDeltas(n = 30) {
    const size = Math.min(this._diagFrameIdx, this._diagRingSize, n);
    const result = [];
    const newestIdx = (this._diagRingIdx - 1 + this._diagRingSize) % this._diagRingSize;
    for (let i = size - 1; i >= 0; i--) {
      const entry = this._diagRingBuf[(newestIdx - i + this._diagRingSize) % this._diagRingSize];
      if (entry) result.push({ dox: entry.dox, doy: entry.doy, tf: entry.tf });
    }
    return result;
  },
};
