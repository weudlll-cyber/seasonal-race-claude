// ============================================================
// File:        testRace.test.js
// Path:        client/src/screens/TrackEditor/testRace.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-12
// Description: The Track Editor's test race: Quick Test's race for the track with 40 racers of the
//              track's own type, the track's own length and the editor's unsaved effects; when it
//              cannot start; and that starting it writes the two tab-scoped hand-offs and nothing
//              else — no localStorage at all.
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEST_RACE_FIELD_SIZE,
  EDITOR_RETURN_KEY,
  testRaceBlockedReason,
  buildTestRace,
  startTestRace,
  peekEditorReturn,
  clearEditorReturn,
} from './testRace.js';
import { buildQuickTestRace } from '../SetupScreen/quickTestRace.js';
import {
  trackDefaultLaps,
  trackDefaultSeconds,
  paceSpeedPxPerSec,
} from '../../modules/durationModel.js';
import { getRacerType } from '../../racer-types/index.js';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const seed = (id) =>
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', '..', 'server', 'seeds', 'tracks', `${id}.json`),
      'utf8'
    )
  );
const DIRT = seed('dirt-oval'); // closed, horses
const SEA = seed('seatrack'); // open, dolphins

const EFFECTS = [
  { id: 'bubbles', config: { count: 36000, size: 2.6, color: '#aaddff', opacity: 0.45 } },
];
const INPUTS = {
  raceDefaults: DEFAULT_RACE_DEFAULTS,
  normalSpeedPxPerSec: 150,
  runoutZone: 0.1,
  racePlanMinDur: 30,
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('buildTestRace', () => {
  it.each([
    ['Dirt Oval (closed)', DIRT],
    ['Seatrack (open)', SEA],
  ])(
    '%s: 40 racers of the track’s type, the unsaved effects, and Quick Test’s own race',
    (_, track) => {
      const race = buildTestRace({ serverTrack: track, geom: track, effects: EFFECTS, ...INPUTS });
      expect(race.racers).toHaveLength(TEST_RACE_FIELD_SIZE);
      expect(new Set(race.racers.map((r) => r.name)).size).toBe(TEST_RACE_FIELD_SIZE);
      expect(race.racerTypeId).toBe(track.defaultRacerTypeId);
      expect(race.testRace).toEqual({ effects: EFFECTS });
      expect(race.raceSource).toBe('quick-test');
      // Everything else is Quick Test's builder with the same inputs (the seed is drawn fresh).
      const quick = buildQuickTestRace({
        track,
        geom: track,
        racers: race.racers,
        racerTypeId: race.racerTypeId,
        ...INPUTS,
        racePlanSeed: race.racePlanSeed,
      });
      const strip = ({ timestamp, eventName, testRace, ...rest }) => (
        void timestamp,
        void eventName,
        void testRace,
        rest
      );
      expect(strip(race)).toEqual(strip(quick));
    }
  );

  it('runs the track’s own length: its laps when closed, its default seconds when open', () => {
    const closed = buildTestRace({ serverTrack: DIRT, geom: DIRT, effects: EFFECTS, ...INPUTS });
    expect(closed.raceMode).toBe('laps');
    expect(closed.targetLaps).toBe(trackDefaultLaps(DIRT));
    const open = buildTestRace({ serverTrack: SEA, geom: SEA, effects: EFFECTS, ...INPUTS });
    expect(open.raceMode).toBe('time');
    const pace = paceSpeedPxPerSec(150, getRacerType('dolphin').getSpeedMultiplier());
    expect(open.targetDurationSec).toBe(trackDefaultSeconds(SEA, SEA.pathLengthPx, pace, 0.1));
  });

  it('a track without a racer type races horses, as Setup does', () => {
    const track = { ...DIRT, defaultRacerTypeId: undefined };
    expect(
      buildTestRace({ serverTrack: track, geom: DIRT, effects: [], ...INPUTS }).racerTypeId
    ).toBe('horse');
  });
});

describe('testRaceBlockedReason', () => {
  const ok = {
    serverTrack: DIRT,
    geom: DIRT,
    hasUnsavedBackgroundFile: false,
    raceDefaults: DEFAULT_RACE_DEFAULTS,
  };
  it('allows a saved track', () => expect(testRaceBlockedReason(ok)).toBeNull());
  it('refuses an unsaved track', () =>
    expect(testRaceBlockedReason({ ...ok, serverTrack: null })).toMatch(/Save the track/));
  it('refuses while a new background waits for Save', () =>
    expect(testRaceBlockedReason({ ...ok, hasUnsavedBackgroundFile: true })).toMatch(/background/));
  it('refuses where the host allows fewer than 40 racers', () =>
    expect(
      testRaceBlockedReason({
        ...ok,
        raceDefaults: { ...DEFAULT_RACE_DEFAULTS, maxPlayersClosed: 20 },
      })
    ).toMatch(/fewer than 40/));
});

describe('startTestRace — writes the two tab-scoped hand-offs and nothing else', () => {
  it('sets activeRace and the editor state in sessionStorage, nothing in localStorage, and goes to /race', () => {
    const navigate = vi.fn();
    const race = buildTestRace({ serverTrack: DIRT, geom: DIRT, effects: EFFECTS, ...INPUTS });
    const state = { snapshot: { effects: EFFECTS }, view: 'race' };
    startTestRace(race, state, navigate);
    expect(navigate).toHaveBeenCalledWith('/race');
    expect(Object.keys(sessionStorage).sort()).toEqual(['activeRace', EDITOR_RETURN_KEY].sort());
    expect(JSON.parse(sessionStorage.getItem('activeRace')).testRace.effects).toEqual(EFFECTS);
    expect(localStorage.length).toBe(0);
    // Reading back does not remove it (an initializer may run twice); clearing does.
    expect(peekEditorReturn()).toEqual(state);
    expect(peekEditorReturn()).toEqual(state);
    clearEditorReturn();
    expect(peekEditorReturn()).toBeNull();
  });
});
