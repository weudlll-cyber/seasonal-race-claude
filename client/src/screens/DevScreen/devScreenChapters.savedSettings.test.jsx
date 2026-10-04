// ============================================================
// File:        devScreenChapters.savedSettings.test.jsx
// Path:        client/src/screens/DevScreen/devScreenChapters.savedSettings.test.jsx
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: A SAVED CONFIGURATION SURVIVES THE CHAPTERS. The chapter layout moves controls
//              between headings and mounts one section's parts in several places at once; it must
//              not change what is stored. This test puts a realistic saved configuration into
//              localStorage under the existing keys — written by the app's own savers, so the
//              bytes are exactly what a browser holds after an operator tuned these values — then
//              renders the Dev Screen as an admin and walks every chapter. It asserts:
//                1. the controls SHOW the saved values (race defaults, race dynamics and
//                   behaviour, frame timing, auto-scale, camera, sprite size and name tags);
//                2. every stored JSON string is BYTE-IDENTICAL after mounting and navigating all
//                   seven chapters — nothing is rewritten on load;
//                3. two parts that hold ONE block (two camera parts in Look, two race-dynamics
//                   parts in The race) do not overwrite each other's edits.
// ============================================================

import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { username: 'admin', role: 'admin' },
    logout: () => {},
    changePassword: async () => {},
  }),
}));
// The server-backed lists stay empty: this test is about what THIS browser stores.
vi.mock('../../services/playerGroupApi.js', () => ({ fetchPlayerGroups: async () => [] }));
vi.mock('../../modules/storage/playerGroupMigration.js', () => ({
  migrateLocalPlayerGroupsToServer: async () => true,
}));
vi.mock('../../services/brandApi.js', () => ({ fetchBrands: async () => [] }));
vi.mock('../../modules/branding/brandingSync.js', () => ({ syncBrandingMirror: async () => {} }));
vi.mock('../../modules/storage/useServerTracks.js', () => ({
  useServerTracksControl: () => ({ tracks: [], refresh: async () => {} }),
  useServerTracks: () => [],
}));
vi.mock('../../modules/surface-effects/useSurfaceClasses.js', () => ({
  useSurfaceClasses: () => ({
    classes: [],
    refresh: async () => {},
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../services/racesApi.js', () => ({
  fetchRacesPage: async () => ({ races: [], hasMore: false, offset: 0, limit: 20, team: 'T' }),
  fetchPointsRule: async () => ({ pointsEnabled: false, pointsPerPlace: [] }),
}));
vi.mock('../../services/usersApi.js', () => ({ fetchUsers: async () => [] }));

import DevScreen from './DevScreen.jsx';
import { CHAPTERS } from './devScreenChapters.js';
import { KEYS } from '../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import { DEFAULT_CAMERA_CONFIG, saveCameraConfig } from '../../modules/cameraConfig.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  saveRaceDynamicsConfig,
} from '../../modules/raceDynamicsConfig.js';
import {
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  saveRaceBehaviorConfig,
} from '../../modules/raceBehaviorConfig.js';
import { DEFAULT_BASE_SPEED_CONFIG, saveBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { DEFAULT_ROW_LAYOUT_CONFIG, saveRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import {
  DEFAULT_FRAME_TIMING_CONFIG,
  saveFrameTimingConfig,
} from '../../modules/frameTimingConfig.js';
import { DEFAULT_AUTO_SCALE_CONFIG, saveAutoScaleConfig } from '../../modules/autoSpriteScale.js';

// ── The saved configuration: non-default values in every block the chapters show ──
function storeSavedConfiguration() {
  localStorage.clear();
  // Race defaults are stored whole (useStorage), as Race Setup reads them.
  localStorage.setItem(
    KEYS.RACE_DEFAULTS,
    JSON.stringify({
      ...DEFAULT_RACE_DEFAULTS,
      raceActionStage: 'wild',
      winners: 5,
      maxPlayersClosed: 33,
      autoAdvance: false,
      soundEffects: false,
    })
  );
  saveBaseSpeedConfig({ ...DEFAULT_BASE_SPEED_CONFIG, normalSpeedPxPerSec: 175 });
  saveRowLayoutConfig({ ...DEFAULT_ROW_LAYOUT_CONFIG, rowGapMultiplier: 2.2 });
  saveRaceDynamicsConfig({
    ...DEFAULT_RACE_DYNAMICS_CONFIG,
    reRollVariationPercent: 60,
    gapRerollMode: 'down',
    pulkLeaderBrake: 0.07,
  });
  saveRaceBehaviorConfig({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, draftingBoost: 1.2 });
  saveFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG, scoreboardIntervalMs: 1000 });
  saveAutoScaleConfig({ ...DEFAULT_AUTO_SCALE_CONFIG, referenceValue: 55, minTargetScreenPx: 44 });
  saveCameraConfig({
    ...DEFAULT_CAMERA_CONFIG,
    battleWeight: 0.35,
    maxTargetScreenPx: 128,
    nameTagMarginPx: 9,
    cameraStateProfiles: {
      ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
      LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM, entryTC: 1.25 },
    },
  });
}

const STORED_KEYS = [
  KEYS.RACE_DEFAULTS,
  KEYS.BASE_SPEED_CONFIG,
  KEYS.ROW_LAYOUT_CONFIG,
  KEYS.RACE_DYNAMICS_CONFIG,
  KEYS.RACE_BEHAVIOR_CONFIG,
  KEYS.FRAME_TIMING_CONFIG,
  KEYS.AUTO_SCALE_CONFIG,
  KEYS.CAMERA_CONFIG,
];
const readStored = () => Object.fromEntries(STORED_KEYS.map((k) => [k, localStorage.getItem(k)]));

/** The value-bearing element inside a control's row. */
const field = (id, selector = 'input, select') =>
  document.querySelector(`[data-control-id="${id}"]`).querySelector(selector);

function openChapter(title) {
  fireEvent.click(screen.getByRole('button', { name: (name) => name.includes(title) }));
}

let before;
const seen = {};

beforeAll(async () => {
  storeSavedConfiguration();
  before = readStored();
  render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
  // Walk every chapter; read what the controls show while each is open.
  for (const chapter of CHAPTERS) {
    openChapter(chapter.title);
    await act(async () => {});
    if (chapter.id === 'race') {
      seen.wild = screen.getByTestId('race-action-wild').getAttribute('aria-pressed');
      seen.maxPlayersClosed = field('RaceDefaults:maxPlayersClosed').value;
      seen.normalSpeed = screen.getByTestId('normal-speed-input').value;
      seen.rowGap = field('DynamicsTuningSection:rowGapMultiplier').value;
      seen.variation = field('DynamicsTuningSection:reRollVariationPercent').value;
      seen.gapMode = screen.getByTestId('gap-reroll-mode').value;
      seen.leaderBrake = field('DynamicsTuningSection:pulkLeaderBrake').value;
      seen.draftingBoost = field('BehaviorTuningSection:draftingBoost').value;
      seen.referenceValue = field('AutoScaleSection:referenceValue').value;
      seen.sizeFloor = screen.getByLabelText('Size floor — every racer type').value;
    }
    if (chapter.id === 'camera') {
      seen.battleWeight = screen.getByTestId('regie-battle-weight').value;
      seen.autoAdvance = screen.getByTestId('auto-advance-toggle').checked;
    }
    if (chapter.id === 'look') {
      seen.maxSprite = field('SpriteSizeRangeSection:maxTargetScreenPx').value;
      seen.nameTagMargin = screen.getByTestId('nametag-margin-px').value;
      seen.scoreboard = screen.getByLabelText('Live Standings update interval').value;
      seen.sound = field('RaceDefaults:soundEffects').checked;
    }
  }
});

describe('DEVSCREEN-CHAPTERS-1 — a saved configuration survives the chapter layout', () => {
  it('the controls show the saved values', () => {
    expect(seen).toEqual({
      wild: 'true',
      maxPlayersClosed: '33',
      normalSpeed: '175',
      rowGap: '2.2',
      variation: '60',
      gapMode: 'down',
      leaderBrake: '0.07',
      draftingBoost: '1.2',
      referenceValue: '55',
      sizeFloor: '44',
      battleWeight: '0.35',
      autoAdvance: false,
      maxSprite: '128',
      nameTagMargin: '9',
      scoreboard: '1000',
      sound: false,
    });
  });

  it('every stored config is byte-identical after mounting and walking all seven chapters', () => {
    for (const key of STORED_KEYS) expect(before[key]).not.toBeNull();
    expect(readStored()).toEqual(before);
  });

  it('two parts of one stored block keep each other edits', async () => {
    storeSavedConfiguration();
    render(
      <MemoryRouter>
        <DevScreen />
      </MemoryRouter>
    );
    openChapter('Look, labels and effects');
    await act(async () => {});
    fireEvent.change(field('SpriteSizeRangeSection:maxTargetScreenPx'), {
      target: { value: '132' },
    });
    fireEvent.change(screen.getByTestId('nametag-margin-px'), { target: { value: '11' } });
    const camera = JSON.parse(localStorage.getItem(KEYS.CAMERA_CONFIG));
    expect([camera.maxTargetScreenPx, camera.nameTagMarginPx, camera.battleWeight]).toEqual([
      132, 11, 0.35,
    ]);

    openChapter('The race');
    await act(async () => {});
    fireEvent.change(field('DynamicsTuningSection:reRollVariationPercent'), {
      target: { value: '65' },
    });
    fireEvent.change(field('DynamicsTuningSection:pulkLeaderBrake'), { target: { value: '0.05' } });
    const dynamics = JSON.parse(localStorage.getItem(KEYS.RACE_DYNAMICS_CONFIG));
    expect([
      dynamics.reRollVariationPercent,
      dynamics.pulkLeaderBrake,
      dynamics.gapRerollMode,
    ]).toEqual([65, 0.05, 'down']);
  });
});
