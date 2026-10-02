// ============================================================
// File:        stateOverlaySelection.js
// Path:        client/src/screens/RaceScreen/stateOverlaySelection.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: WHICH narrative line the state overlay shows when the camera enters a state: the
//              template variables read off the race and the director ({leader}, {position},
//              {count}, {name}, {newLeader}, {previousLeader}), and the per-race no-repeat choice of
//              template.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. This sat inside RaceScreen's state-overlay
// `useEffect`, which also owns things only a React component can own: clearing and setting the
// banner, its auto-clear timer, and the gates (racing phase, the `stateOverlayEnabled` key, which
// camera states speak at all). Those stay there. What moved is the selection itself — it reads the
// racers and the director's diag getters and the per-race memory of used templates, and returns a
// line; it touches no React state. The templates themselves live in
// `modules/stateOverlayTemplates.js`, unchanged.
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same derivations and the same selection calls in the
// same order. The director arrives as `dir` (RaceScreen passes `camDirRef.current`, which each
// branch used to read for itself — the same object), the used-index sets as `memory`. The comments
// are the ones that sat beside this code in RaceScreen.
// ============================================================

import {
  selectOverlayText,
  selectOverlayTextNoRepeat,
} from '../../modules/stateOverlayTemplates.js';

/**
 * The template variables for `camState`, derived from the racers and the director.
 *
 * @param {string} camState   'OVERVIEW' | 'BATTLE_ZOOM' | 'COMEBACK_ZOOM' | 'LEAD_CHANGE'
 * @param {object[]} racers   the live racers (`g.current.racers`, or [] before a race)
 * @param {object|null} dir   the CameraDirector
 * @returns {object} vars
 */
export function overlayVarsFor(camState, racers, dir) {
  const vars = {};
  if (camState === 'OVERVIEW') {
    if (racers.length > 0) {
      const leader = racers.reduce((a, b) => (b.t > a.t ? b : a));
      if (leader?.name) vars.leader = leader.name;
    }
  } else if (camState === 'BATTLE_ZOOM') {
    // Derive {position} (rank of frontmost battle racer) and {count} (group size).
    if (dir && racers.length > 0) {
      const battleData = dir.getBattleDiagData(racers);
      const sorted = [...racers].sort((a, b) => b.t - a.t);
      if (battleData.lockedRacer) {
        const pos = sorted.indexOf(battleData.lockedRacer) + 1;
        if (pos > 0) vars.position = pos;
      } else {
        vars.position = 1;
      }
      vars.count = Math.max(battleData.groupRacers.length, 3);
    }
  } else if (camState === 'COMEBACK_ZOOM') {
    // Derive {name} from the locked comeback racer.
    if (dir) {
      const cbData = dir.getComebackDiagData(racers, performance.now());
      if (cbData.lockedRacer?.name) vars.name = cbData.lockedRacer.name;
    }
  } else if (camState === 'LEAD_CHANGE') {
    // Derive {newLeader} and {previousLeader} from lead-change data.
    if (dir) {
      const lcData = dir.getLeadChangeDiagData();
      if (lcData.newLeader) vars.newLeader = lcData.newLeader;
      if (lcData.previousLeader) vars.previousLeader = lcData.previousLeader;
    }
  }
  return vars;
}

/**
 * Pick the line for `camState` and record it in the per-race memory.
 * Per-race no-repeat tracking: OVERVIEW uses last-index anti-repeat; BATTLE_ZOOM, COMEBACK_ZOOM and
 * LEAD_CHANGE use the full Set to prevent any repeat within one race.
 *
 * @param {string} camState
 * @param {object} vars                  from `overlayVarsFor`
 * @param {object} memory
 * @param {Set<number>} memory.usedBattle
 * @param {Set<number>} memory.usedComeback
 * @param {Set<number>} memory.usedLeadChange
 * @param {{ current: object }} memory.lastIndexRef  last template index per state (replaced, not mutated)
 * @returns {{ text: string, index: number } | null | undefined}
 */
export function pickOverlayText(
  camState,
  vars,
  { usedBattle, usedComeback, usedLeadChange, lastIndexRef }
) {
  let result;
  if (camState === 'BATTLE_ZOOM') {
    result = selectOverlayTextNoRepeat(camState, vars, usedBattle);
    if (result) usedBattle.add(result.index);
  } else if (camState === 'COMEBACK_ZOOM') {
    result = selectOverlayTextNoRepeat(camState, vars, usedComeback);
    if (result) usedComeback.add(result.index);
  } else if (camState === 'LEAD_CHANGE') {
    result = selectOverlayTextNoRepeat(camState, vars, usedLeadChange);
    if (result) usedLeadChange.add(result.index);
  } else {
    result = selectOverlayText(camState, vars, lastIndexRef.current);
    if (result) {
      lastIndexRef.current = { ...lastIndexRef.current, [camState]: result.index };
    }
  }
  return result;
}
