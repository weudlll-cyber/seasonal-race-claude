// ============================================================
// File:        raceLoopDiagnostics.js
// Path:        client/src/screens/RaceScreen/raceLoopDiagnostics.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The READ-ONLY diagnostics RaceScreen's frame loop writes for its dev HUDs and its
//              browser-test probes: the GovernorDiagHUD snapshot, the hold probe, the Race-Plan
//              per-step readout (RacePlanHUD / CameraDiagnosticsHUD) and the top-3 Δv readout.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. Each of these blocks sat inline in the rAF loop of
// `RaceScreen/index.jsx` — three of them inside the fixed-timestep physics accumulator — and none
// of them is physics. They READ the racers and the race plan and WRITE only a diag object, a ref's
// snapshot or a window-level trace; nothing here is read back by the race. Keeping ~170 lines of
// HUD bookkeeping between the physics step and the finish detection made the accumulator — the one
// part of that loop that decides what the race does — the hardest part of it to read.
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1). Same reads, same writes, same order, called from the same
// places in the loop under the same conditions — the conditions stay at the call sites in
// RaceScreen, so what runs when is still visible there. The only textual changes: the diag object
// arrives as the parameter `diag` instead of being read off `diagDataRef.current`, and the
// GovernorDiagHUD snapshot is RETURNED for the call site to store rather than stored here. The
// comments are the ones that sat beside this code in RaceScreen.
// ============================================================

/**
 * The GovernorDiagHUD snapshot. RaceScreen stores the result in `governorDiagRef.current` — ONE
 * write site, EVERY frame a plan runs.
 *
 * @returns {object}
 */
export function governorDiagSnapshot({
  racePlanController,
  govPhase,
  st,
  govFractions,
  govSeed,
  pathLengthPx,
  govMeanBodyLen,
  isOpenTrack,
  pulkLeadRotationOn,
}) {
  const diagCfg = pulkLeadRotationOn
    ? { directorEnabled: true, pulkOnly: true } // lead-rotation: PULK-scoped, active in PULK
    : { directorEnabled: false };
  return {
    cfg: diagCfg,
    phase: govPhase,
    progress: st.raceProgress,
    pulkStartFrac: govFractions.pulkStartFrac,
    pulkEndFrac: govFractions.pulkEndFrac,
    corrStartFrac: govFractions.corrStartFrac,
    seed: govSeed,
    finishT: st.finishT,
    pathLengthPx,
    meanBodyLen: govMeanBodyLen,
    isOpen: isOpenTrack,
    heroRoles: racePlanController.getHeroRoles?.() ?? null,
  };
}

/**
 * ── HOLD-PROBE (DIRECTION-AUTHORITY-1) — appends to `window.__raHoldTrace` when
 * `localStorage['racearena:holdProbe'] === '1'`; inert otherwise. See the comment at the call site.
 *
 * @param {object} st                   the live race state
 * @param {object|null} racePlanController
 */
export function recordHoldProbe(st, racePlanController) {
  try {
    if (localStorage.getItem('racearena:holdProbe') === '1' && racePlanController) {
      const heldMap = racePlanController.getHeldRelease?.() ?? null;
      if (heldMap && heldMap.size) {
        const order = [...st.racers].sort((a, b) => b.t - a.t);
        const w = (window.__raHoldTrace ||= []);
        for (const [idx, releaseAt] of heldMap) {
          const rank = order.findIndex((r) => r.index === idx) + 1;
          // ARRIVAL-VARIANTS-1 added `m`: the multiplier the servo is actually applying, so
          // a browser test can see whether he is being braked, pushed or left alone. Read off
          // the same racer object, never recomputed.
          const me = st.racers.find((r) => r.index === idx);
          if (rank > 0)
            w.push({
              i: idx,
              rank,
              p: st.raceProgress,
              releaseAt,
              m: me?.trajectoryMult ?? null,
              // ARRIVAL-SHAPE-E-1 added `d`: his DRAWN place, asked of the controller rather
              // than recomputed, so a browser test can say "two ranks before his place"
              // without re-deriving the thing it is there to observe.
              d: racePlanController.getTargetRank?.(idx) ?? null,
            });
        }
      }
    }
  } catch {
    /* storage unavailable — a diagnostic must never take a race down */
  }
}

/**
 * Race-Plan per-step diagnostics → the diag object (polled by CameraDiagnosticsHUD / RacePlanHUD).
 * Called once per physics step while a race plan runs.
 *
 * @param {object} diag   RaceScreen's `diagDataRef.current`
 * @param {object} st     the live race state
 * @param {object} ctx
 * @param {object} ctx.racePlanController
 * @param {number} ctx.physicsTs
 * @param {number} ctx.lastRollDeadline
 * @param {object|null} ctx.rpPlanInfo
 * @param {Map} ctx.assignmentByRacer
 * @param {Map} ctx.speedRings          per-racer speed ring buffers, owned by the race (one per race)
 */
export function recordRacePlanStepDiag(
  diag,
  st,
  { racePlanController, physicsTs, lastRollDeadline, rpPlanInfo, assignmentByRacer, speedRings }
) {
  const activeR = st.racers.filter((r) => !r.finished);
  if (activeR.length > 0) {
    let sfMin = Infinity,
      sfMax = -Infinity,
      sfSum = 0;
    let tmMin = Infinity,
      tmMax = -Infinity;
    for (const r of activeR) {
      const sf = r.spreadFactor ?? 1;
      const tm = r.trajectoryMult ?? 1;
      if (sf < sfMin) sfMin = sf;
      if (sf > sfMax) sfMax = sf;
      sfSum += sf;
      if (tm < tmMin) tmMin = tm;
      if (tm > tmMax) tmMax = tm;
      // Speed ring buffer (5 s @ 16 ms/step = 313 slots)
      let ring = speedRings.get(r.index);
      if (!ring) {
        ring = { buf: new Float32Array(313).fill(1.0), idx: 0 };
        speedRings.set(r.index, ring);
      }
      ring.buf[ring.idx % 313] = tm;
      ring.idx++;
    }
    const d = diag;
    d.rpPhase = racePlanController.getPhase(physicsTs, st.raceProgress);
    d.rpTs = physicsTs;
    d.rpReRollActive = physicsTs < lastRollDeadline;
    d.rpSfMin = sfMin;
    d.rpSfMax = sfMax;
    d.rpSfMean = sfSum / activeR.length;
    d.rpTmMin = tmMin;
    d.rpTmMax = tmMax;
    let bbMin = Infinity,
      bbMax = -Infinity;
    for (const r of activeR) {
      const bb = r.areaBonusMult ?? 1;
      if (bb < bbMin) bbMin = bb;
      if (bb > bbMax) bbMax = bb;
    }
    d.rpBbMin = bbMin;
    d.rpBbMax = bbMax;

    // B1 winner list (targetRank 1–5)
    if (rpPlanInfo) {
      const ranked = [...activeR].sort((a, b) => b.t - a.t);
      const rankByIdx = new Map(ranked.map((r, i) => [r.index, i + 1]));
      const b1Racers = [];
      for (const [racerIdx, targetRank] of rpPlanInfo.targetRanks) {
        if (!rpPlanInfo.b1Indices.has(racerIdx)) continue;
        const racer = st.racers.find((r) => r.index === racerIdx && !r.finished);
        if (!racer) continue;
        b1Racers.push({
          index: racerIdx,
          name: racer.name,
          targetRank,
          currentRank: rankByIdx.get(racerIdx) ?? 0,
          delta: (rankByIdx.get(racerIdx) ?? 0) - targetRank,
          startRow: assignmentByRacer.get(racerIdx)?.rowIndex ?? 0,
        });
      }
      b1Racers.sort((a, b) => a.targetRank - b.targetRank);
      d.rpB1Racers = b1Racers;
    }

    // Top-10 speed monitor
    const top10 = [...activeR].sort((a, b) => b.t - a.t).slice(0, 10);
    d.rpTop10 = top10.map((r, i) => {
      const ring = speedRings.get(r.index);
      let tmMin5s = r.trajectoryMult ?? 1;
      let tmMax5s = r.trajectoryMult ?? 1;
      if (ring && ring.idx > 0) {
        const filled = Math.min(ring.idx, 313);
        let mn = Infinity,
          mx = -Infinity;
        for (let j = 0; j < filled; j++) {
          if (ring.buf[j] < mn) mn = ring.buf[j];
          if (ring.buf[j] > mx) mx = ring.buf[j];
        }
        tmMin5s = mn;
        tmMax5s = mx;
      }
      return {
        rank: i + 1,
        name: r.name,
        tm: r.trajectoryMult ?? 1.0,
        tmMin5s,
        tmMax5s,
        isOscillating: tmMax5s - tmMin5s > 0.18,
      };
    });
  }
}

/**
 * D1: per-racer pixel speed and smoothed Δv between top-3 — diagnostics HUD only. RaceScreen calls
 * it only while the diagnostics overlay is visible.
 *
 * @param {object} diag     RaceScreen's `diagDataRef.current`
 * @param {object[]} racers the race's racers (the `_diag*` fields are written onto them)
 */
export function recordTopThreeSpeedDiag(diag, racers) {
  const ordered = [...racers].sort((a, b) => b.t - a.t);
  for (const r of racers) {
    const dx = r.x - (r._diagPrevX ?? r.x);
    const dy = r.y - (r._diagPrevY ?? r.y);
    r._diagSpeed = Math.sqrt(dx * dx + dy * dy);
    r._diagDx = dx;
    r._diagDy = dy;
    r._diagPrevX = r.x;
    r._diagPrevY = r.y;
  }
  const r0 = ordered[0];
  const r1 = ordered[1];
  const r2 = ordered[2];
  const raw01 = r0 && r1 ? r0._diagSpeed - r1._diagSpeed : 0;
  const raw12 = r1 && r2 ? r1._diagSpeed - r2._diagSpeed : 0;
  const α = 0.1;
  diag.dv01 = diag.dv01 * (1 - α) + raw01 * α;
  diag.dv12 = diag.dv12 * (1 - α) + raw12 * α;
  // M3: ring-buffer max over last 60 frames (absolute value, captures jitter peaks)
  const d = diag;
  const bi = d._dvBufIdx % 60;
  d._dv01Buf[bi] = Math.abs(raw01);
  d._dv12Buf[bi] = Math.abs(raw12);
  d._dvBufIdx++;
  d.dv01Max = Math.max(...d._dv01Buf);
  d.dv12Max = Math.max(...d._dv12Buf);
}
