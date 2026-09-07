// ============================================================
// File:        repeatRace.js
// Path:        client/src/modules/repeatRace.js
// Project:     RaceArena — RACE-HISTORY-4
// Created:     2026-09-06
// Description: RUNNING A STORED RACE AGAIN — the one home for "take these stored inputs and make
//              the setup screen run them".
//
//              ★ WHAT IT OWNS: turning a stored race's INPUTS into the identifier string the setup
//              screen already understands, and handing that string over.
//              ★ WHAT IT DELIBERATELY DOES NOT DO: start a race. It never touches `activeRace`,
//              never navigates, and knows nothing about tracks, players or geometry.
//
// ── WHY IT HANDS OVER A STRING INSTEAD OF STARTING ──────────────────────────────────────────────
// `SetupScreen.startRaceFromIdentifier` is the ONE path that starts a race from recorded inputs —
// it resolves the track, refuses when the geometry is not on this device, builds the payload and
// writes `worldConfigOverride` so `RaceScreen` runs the RECORDED world rather than this machine's.
// A second starter would be a second copy of all of that, and the copy would be the one that
// silently drifted. So the history row's button and a typed short key both end in the same place
// the `run it again` control already ends (`RaceSettings.jsx` → `onSeedChange`): the identifier goes
// into the seed field, and the existing path takes it from there.
//
// ── WHY THE INPUTS ARE RE-ENCODED RATHER THAN THE STRING BEING STORED ───────────────────────────
// The store keeps a race's inputs as COLUMNS, not as an identifier string, and RACE-STORE-2 gives
// the reason: the identifier compresses the config world into a diff because it must be typable,
// and a diff is unreadable once `defaults.js` moves. Re-encoding here is the inverse of that
// decision and costs nothing — the field set is the same one, and a guard at each end holds it so
// (`raceHistory.test.js` and `raceStore.test.js`).
//
// ── ★ THE BUILD THE RACE WAS RECORDED UNDER TRAVELS WITH IT ─────────────────────────────────────
// `decodeRaceIdentifier` REFUSES a string from another build, by design: a config diff read against
// different defaults describes a different race, and a stranger's string must never quietly become
// one. That is right for a string somebody hands you and wrong for a race out of your own team's
// history, where refusing would make every race older than the last deploy useless.
//
// So a repeat carries the build it was recorded under, and the setup screen decodes against THAT
// while SAYING SO on screen when it differs from the running build. The owner's rule of 2026-09-06:
// warn and run, never refuse silently and never stay silent. **The pasted-string path is
// unchanged** — a long identifier typed into the field is still checked against the running build,
// because nothing there says where it came from.
// ============================================================

import { encodeRaceIdentifier } from './raceIdentifier.js';
import { DEFAULT_CONFIG_WORLD } from './storage/defaults.js';
import { storageSet, KEYS } from './storage/storage';

/** Where an armed repeat waits for the setup screen. Session-scoped: it is a single act, not state. */
const ARMED_KEY = 'racearena:repeatRace';

/**
 * The identifier string for a race's stored inputs.
 *
 * Accepts the shape BOTH stores use — the local history entry's `inputs` (RACE-SAVE-3) and the
 * server's hydrated race (RACE-STORE-2) — because they carry the same field names by construction.
 *
 * @param {object} inputs
 * @returns {string}
 */
export function identifierForStoredInputs(inputs) {
  return encodeRaceIdentifier({
    geometryId: inputs.geometryId,
    racerTypeId: inputs.racerTypeId,
    names: inputs.names,
    racePlanSeed: inputs.racePlanSeed,
    raceActionStage: inputs.raceActionStage,
    targetLaps: inputs.targetLaps ?? undefined,
    targetDurationSec: inputs.targetDurationSec ?? undefined,
    racePlanEnabled: inputs.racePlanEnabled,
    world: {
      schemaVersion: inputs.worldSchemaVersion,
      configs: inputs.worldConfigs,
      racerTypeOverrides: inputs.racerTypeOverrides,
      effectiveRacerTypes: inputs.effectiveRacerTypes,
    },
    defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
    // The identifier is stamped with the build the RACE ran under, not this one. That is what makes
    // it decodable against the recorded defaults below.
    buildId: inputs.buildId,
  });
}

/**
 * Arm a repeat: put the race's identifier in the seed field and leave a one-shot note asking the
 * setup screen to start it.
 *
 * The seed field is written through `KEYS.RACE_SEED` — the SAME store the field reads itself
 * (`SetupScreen.jsx:130`), so the value is there whether the screen is mounted yet or not, and the
 * field shows what is about to run rather than starting something invisible.
 *
 * @param {object} inputs a stored race's inputs
 * @returns {{identifier: string, buildId: string}}
 * @throws when the inputs cannot be encoded — the caller reports it; nothing is armed.
 */
export function armRepeat(inputs) {
  const identifier = identifierForStoredInputs(inputs);
  storageSet(KEYS.RACE_SEED, identifier);
  sessionStorage.setItem(ARMED_KEY, JSON.stringify({ identifier, buildId: inputs.buildId }));
  return { identifier, buildId: inputs.buildId };
}

/**
 * Take the armed repeat, if there is one. ONE-SHOT: it is removed as it is read, so returning to
 * the setup screen later does not start a race the person did not ask for again.
 *
 * @returns {{identifier: string, buildId: string}|null}
 */
export function takeArmedRepeat() {
  const raw = sessionStorage.getItem(ARMED_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(ARMED_KEY);
  try {
    const armed = JSON.parse(raw);
    return typeof armed?.identifier === 'string' ? armed : null;
  } catch {
    return null;
  }
}
