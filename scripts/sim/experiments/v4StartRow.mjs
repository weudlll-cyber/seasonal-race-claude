// ============================================================
// v4StartRow.mjs — DORMANT EXPERIMENT (sim-only, flag-gated, NOT shipped).
// V4 START-ROW boost (--v4ThresholdActive; NOT directorV4 — a name collision): rear-row
// racers on OPEN tracks start with an aggressive speedBonus (V4_INITIAL_BOOST) that steps
// DOWN through a schedule as they complete overtakes, via a per-race threshold machine and
// a smooth per-frame transition. Off by default → construction bonus null + startRowBoostMult
// stays bit-exact 1.0 (byte-identical to a no-flag run).
//
// INFRA STEP 1c-3 — REFACTOR (not a move): logic relocated verbatim from sim-fairness.mjs.
// Lifecycle: initRaceState (per race) -> step (per frame, the overtake+threshold machine) ->
// applyTransition (per racer per frame, the smooth ease). The module writes ONLY V4-owned
// racer fields (startRowBoostMult / ...Prev / ...Target / ...TransitionStart, v4RacerThreshIdx /
// v4RacerThreshTimes) and the per-race state object it created — never r.t / r.physicalY / etc.
// Shared deps passed IN: lateralProximity (also used by hero-map + tier2) and easeInOutCubic.
// ============================================================

export function createV4StartRowExperiment(argVal, deps) {
  const { lateralProximity, easeInOutCubic } = deps;
  const active        = argVal('v4ThresholdActive', null) === 'true';
  const initialBoost  = Number(argVal('v4InitialBoost', '1.20'));
  const thresholds    = argVal('v4Thresholds', '20,40,60,80').split(',').map(Number);
  const boostSchedule = argVal('v4BoostSchedule', '1.20,1.15,1.10,1.05,1.0').split(',').map(Number);
  const metricType    = argVal('v4MetricType', 'physical_overtake');
  const row1ThresholdsRaw    = argVal('v4Row1Thresholds', null);
  const rowRestThresholdsRaw = argVal('v4RowRestThresholds', null) ?? argVal('v4Row2Thresholds', null);
  const row1Thresholds = row1ThresholdsRaw    ? row1ThresholdsRaw.split(',').map(Number)    : thresholds;
  const row2Thresholds = rowRestThresholdsRaw ? rowRestThresholdsRaw.split(',').map(Number) : thresholds;

  const api = {
    active, initialBoost, metricType, thresholds, boostSchedule,
    row1Thresholds, row2Thresholds, row1ThresholdsRaw, rowRestThresholdsRaw,

    // Construction ternary arm (sim-fairness.mjs:688-689). null -> core falls through.
    constructionBonus(isOpen, isRearRowOpen) {
      return (active && isRearRowOpen) ? initialBoost : null;
    },

    // Per-race overtaking state (sim-fairness.mjs:783-804). Always returns a state object
    // (empty when inert) so the core observers (results.v4ThreshLog) stay byte-identical.
    initRaceState(racers, isOpen) {
      const row1Total  = active && isOpen ? racers.filter((r) => r.startRowIndex === 1).length : 0;
      const row1Racers = active && isOpen ? racers.filter((r) => r.startRowIndex === 1) : [];
      const row0Racers = active && isOpen ? racers.filter((r) => r.startRowIndex === 0) : [];
      const frontPoolByRow = (active && isOpen && metricType === 'per_racer') ? (() => {
        const map = new Map();
        const maxRow = Math.max(0, ...racers.map((r) => r.startRowIndex));
        for (let ri = 1; ri <= maxRow; ri++) map.set(ri, racers.filter((r) => r.startRowIndex < ri));
        return map;
      })() : null;
      const frontRacers = active && isOpen && metricType !== 'per_racer'
        ? racers.filter((r) => r.startRowIndex === 0 || r.startRowIndex === 1) : [];
      return {
        row1Total, row1Racers, row0Racers, frontPoolByRow, frontRacers,
        hasOvertaken: new Set(), wasNearBehind: new Set(), overtakePairs: new Set(),
        nextThreshIdx: 0, threshLog: [],
      };
    },

    // Per-frame overtake detection + threshold step-downs (sim-fairness.mjs:1856-1930).
    step(state, racers, raceTs, isOpen) {
      if (!(active && isOpen && state.row1Total > 0)) return;
      if (metricType === 'physical_overtake') {
        for (const r1 of state.row1Racers) {
          if (r1.finished) continue;
          for (const r0 of state.row0Racers) {
            if (r0.finished) continue;
            const key = `${r1.index}:${r0.index}`;
            if (state.overtakePairs.has(key)) continue;
            const dY = Math.abs(r1.physicalY - r0.physicalY);
            if (!state.wasNearBehind.has(key)) {
              if (dY < lateralProximity && r1.t < r0.t) state.wasNearBehind.add(key);
            } else {
              if (r1.t > r0.t) { state.overtakePairs.add(key); state.hasOvertaken.add(r1.index); }
            }
          }
        }
      } else if (metricType === 'per_racer') {
        for (const r of racers) {
          if (r.finished || r.startRowIndex === 0) continue;
          const racerThresholds = r.startRowIndex === 1 ? row1Thresholds : row2Thresholds;
          if (r.v4RacerThreshIdx >= racerThresholds.length) continue;
          const frontPool  = state.frontPoolByRow?.get(r.startRowIndex) ?? state.row0Racers;
          const totalFront = frontPool.length;
          if (totalFront === 0) continue;
          const aheadCount = frontPool.reduce((n, f) => n + (f.t < r.t ? 1 : 0), 0);
          const fraction   = aheadCount / totalFront;
          while (r.v4RacerThreshIdx < racerThresholds.length && fraction >= racerThresholds[r.v4RacerThreshIdx] / 100) {
            const toBonus = boostSchedule[Math.min(r.v4RacerThreshIdx + 1, boostSchedule.length - 1)];
            r.startRowBoostMultPrev        = r.startRowBoostMult;
            r.startRowBoostMultTarget      = toBonus / initialBoost;
            r.startRowBoostTransitionStart = raceTs;
            r.v4RacerThreshTimes.push(raceTs);
            r.v4RacerThreshIdx++;
          }
        }
      } else {
        const row0Live = state.row0Racers.filter((r) => !r.finished);
        if (row0Live.length > 0) {
          const minRow0T = Math.min(...row0Live.map((r) => r.t));
          for (const r1 of state.row1Racers) {
            if (!r1.finished && r1.t > minRow0T) state.hasOvertaken.add(r1.index);
          }
        }
      }

      // Trigger global threshold step-downs (skipped for per_racer which handles this per-racer)
      if (metricType !== 'per_racer' && state.nextThreshIdx < thresholds.length) {
        const fraction = state.row1Total > 0 ? state.hasOvertaken.size / state.row1Total : 0;
        while (state.nextThreshIdx < thresholds.length && fraction >= thresholds[state.nextThreshIdx] / 100) {
          const fromBonus = boostSchedule[state.nextThreshIdx];
          const toBonus   = boostSchedule[Math.min(state.nextThreshIdx + 1, boostSchedule.length - 1)];
          state.threshLog.push({ threshold: thresholds[state.nextThreshIdx], timeS: raceTs / 1000, fromBonus, toBonus });
          const newTarget = toBonus / initialBoost;
          for (const r of racers) {
            if (r.startRowIndex > 0 && !r.finished) {
              r.startRowBoostMultPrev        = r.startRowBoostMult;
              r.startRowBoostMultTarget      = newTarget;
              r.startRowBoostTransitionStart = raceTs;
            }
          }
          state.nextThreshIdx++;
        }
      }
    },

    // Per-racer smooth transition (sim-fairness.mjs:1195-1202). Writes only startRowBoostMult.
    applyTransition(r, raceTs, isOpen) {
      if (!(active && isOpen && r.startRowIndex > 0)) return;
      const srBoostEl = raceTs - r.startRowBoostTransitionStart;
      if (srBoostEl >= 0 && srBoostEl < r.startRowBoostTransitionDuration) {
        r.startRowBoostMult = r.startRowBoostMultPrev + (r.startRowBoostMultTarget - r.startRowBoostMultPrev) * easeInOutCubic(srBoostEl / r.startRowBoostTransitionDuration);
      } else if (srBoostEl >= r.startRowBoostTransitionDuration) {
        r.startRowBoostMult = r.startRowBoostMultTarget;
      }
    },
  };

  // In-code dormant invariant: when off, construction contributes null and the transition
  // leaves startRowBoostMult bit-exact 1.0 for any racer state.
  if (!active) {
    const probe = { startRowIndex: 1, startRowBoostMult: 1.0, startRowBoostMultPrev: 1.0,
      startRowBoostMultTarget: 1.0, startRowBoostTransitionStart: -Infinity, startRowBoostTransitionDuration: 1000 };
    api.applyTransition(probe, 500, true);
    if (probe.startRowBoostMult !== 1.0 || api.constructionBonus(true, true) !== null) {
      throw new Error(`V4 start-row dormant invariant violated: startRowBoostMult=${probe.startRowBoostMult}`);
    }
  }
  return api;
}
