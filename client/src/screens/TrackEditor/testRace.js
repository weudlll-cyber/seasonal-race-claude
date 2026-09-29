// ============================================================
// File:        testRace.js
// Path:        client/src/screens/TrackEditor/testRace.js
// Project:     RaceArena — PARTICLES-VISIBILITY-12
// Description: The Track Editor's test race: a real race on the track being edited, in the normal
//              race screen, with the editor's current UNSAVED effects — and the round trip back.
//              The owner's decisions of 2026-09-29: nothing is stored until he presses Save; the
//              field is 40 racers of the track's own racer type; the length is the track's own.
//
//              THE RACE is Quick Test's (SetupScreen/quickTestRace.js), started the way every race
//              is started — the `activeRace` hand-off in sessionStorage and the /race route. The
//              unsaved effects travel in that payload as `testRace.effects`; the race screen reads
//              them there and, for a test race, returns here instead of reaching the result screen,
//              which is where a race is recorded. So nothing is written to the track, the race
//              history (local or server) or any stored config.
//
//              THE ROUND TRIP. The editor's unsaved state is carried in ONE sessionStorage key for
//              the length of the race and read back when the editor mounts again. sessionStorage is
//              the same tab-scoped hand-off the race itself travels in; it is not a store.
// ============================================================

import { buildQuickTestRace } from '../SetupScreen/quickTestRace.js';
import { resolveQuickTestSeed } from '../SetupScreen/quickTestSeed.js';
import { fieldCapFor } from '../SetupScreen/fieldCap.js';
import { resolveNameSet, DEFAULT_NAME_SET } from '../../modules/racerNames.js';

/** The test race's field: 40 racers, the owner's usual field (the decision of 2026-09-29). */
export const TEST_RACE_FIELD_SIZE = 40;

/** The sessionStorage key the editor's unsaved state travels in, for the length of one race. */
export const EDITOR_RETURN_KEY = 'trackEditorTestRaceReturn';

/**
 * Why the test race cannot start right now, or null when it can. The button shows the reason.
 *
 * @param {object} p
 * @param {object|null} p.serverTrack  the loaded track as the server holds it
 * @param {object|null} p.geom         its stored geometry (`getTrack(loadedGeometryId)`)
 * @param {boolean} p.hasUnsavedBackgroundFile  a newly uploaded background waits for Save
 * @param {object} p.raceDefaults
 */
export function testRaceBlockedReason({
  serverTrack,
  geom,
  hasUnsavedBackgroundFile,
  raceDefaults,
}) {
  if (!serverTrack || !geom) return 'Save the track first — a test race runs a saved track.';
  // A File cannot travel through the page change, so the new background would be lost on return.
  if (hasUnsavedBackgroundFile) return 'Save the new background first.';
  // Quick Test refuses a field above the host's cap (fieldCap.js); so does the test race.
  if (fieldCapFor(!geom.closed, raceDefaults) < TEST_RACE_FIELD_SIZE) {
    return `This track allows fewer than ${TEST_RACE_FIELD_SIZE} racers.`;
  }
  return null;
}

/**
 * The test race's payload: Quick Test's race for this track, with 40 racers named from the default
 * name set, the track's racer type (Setup's rule: `defaultRacerTypeId`, else horse), a freshly drawn
 * seed — and the editor's unsaved effects in `testRace`.
 */
export function buildTestRace({
  serverTrack,
  geom,
  effects,
  raceDefaults,
  normalSpeedPxPerSec,
  runoutZone,
  racePlanMinDur,
}) {
  const race = buildQuickTestRace({
    track: serverTrack,
    geom,
    racers: resolveNameSet(DEFAULT_NAME_SET)
      .slice(0, TEST_RACE_FIELD_SIZE)
      .map((name) => ({ name })),
    racerTypeId: serverTrack.defaultRacerTypeId || 'horse',
    raceDefaults,
    normalSpeedPxPerSec,
    runoutZone,
    racePlanMinDur,
    racePlanSeed: resolveQuickTestSeed('').seed,
  });
  return { ...race, eventName: 'Test race', testRace: { effects } };
}

/**
 * Start the test race: carry the editor's state, hand the race over the way Setup does, go.
 *
 * @param {object} race         from buildTestRace
 * @param {object} editorState  everything the editor needs to come back exactly as it was
 * @param {(path:string)=>void} navigate
 */
export function startTestRace(race, editorState, navigate) {
  sessionStorage.setItem(EDITOR_RETURN_KEY, JSON.stringify(editorState));
  sessionStorage.setItem('activeRace', JSON.stringify(race));
  navigate('/race');
}

/**
 * The editor's carried state, or null. Reading does NOT remove it: a React initializer may run twice,
 * and the second run must find the same state. `clearEditorReturn` removes it once it is applied.
 */
export function peekEditorReturn() {
  const raw = sessionStorage.getItem(EDITOR_RETURN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearEditorReturn() {
  sessionStorage.removeItem(EDITOR_RETURN_KEY);
}
