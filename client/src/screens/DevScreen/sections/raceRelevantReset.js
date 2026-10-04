// ============================================================
// File:        raceRelevantReset.js
// Path:        client/src/screens/DevScreen/sections/raceRelevantReset.js
// Project:     RaceArena
// Description: Single source of truth for the Race Tuning card's "Reset All Defaults" button. It restores
//              EXACTLY the five RACE-RELEVANT config blocks (raceDynamics, raceBehavior, rowLayout,
//              baseSpeed, autoScale — the blocks the HUD badge's race count is computed over) to their
//              shipped defaults, and deliberately leaves the two COSMETIC blocks (camera, frameTiming)
//              untouched so an operator's dev camera overlays / frame-timing tweaks survive a race-tuning
//              reset. Because the badge's race count = splitConfigDiffs(...).race over these same five
//              blocks, resetting all of them to DEFAULT_* makes the badge read "0 race" by construction —
//              the button and the badge can never disagree (pinned in raceRelevantReset.test.js).
// ============================================================

import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
} from '../../../modules/storage/defaults.js';
import {
  DEFAULT_AUTO_SCALE_CONFIG,
  saveAutoScaleConfig,
} from '../../../modules/autoSpriteScale.js';
import { saveRaceDynamicsConfig } from '../../../modules/raceDynamicsConfig.js';
import { saveRaceBehaviorConfig } from '../../../modules/raceBehaviorConfig.js';
import { saveRowLayoutConfig } from '../../../modules/rowLayoutConfig.js';
import { saveBaseSpeedConfig } from '../../../modules/baseSpeedConfig.js';

// The reset target for every race-relevant block, keyed by its world-config block name. This is the
// authoritative list the reset setters spread from, so a block can never silently drop out of the reset.
export const RACE_RELEVANT_DEFAULTS = {
  raceDynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
  raceBehaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
  rowLayoutConfig: DEFAULT_ROW_LAYOUT_CONFIG,
  baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
  autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
};

// The master reset itself. DEVSCREEN-CHAPTERS-1: it writes all five blocks straight to storage, each
// through its own saver — the same values the per-section resets used to set — because the parts that
// show these blocks are spread over the race chapter and are not this button's children any more.
// Every mounted part re-reads its block from storage (useSyncedConfig), so the screen follows at once.
export function resetRaceRelevantToDefault() {
  saveBaseSpeedConfig({ ...RACE_RELEVANT_DEFAULTS.baseSpeedConfig });
  saveRowLayoutConfig({ ...RACE_RELEVANT_DEFAULTS.rowLayoutConfig });
  saveRaceDynamicsConfig({ ...RACE_RELEVANT_DEFAULTS.raceDynamicsConfig });
  saveRaceBehaviorConfig({ ...RACE_RELEVANT_DEFAULTS.raceBehaviorConfig });
  saveAutoScaleConfig({ ...RACE_RELEVANT_DEFAULTS.autoScaleConfig });
}
