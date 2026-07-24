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

// The reset target for every race-relevant block, keyed by its world-config block name. This is the
// authoritative list the reset setters spread from, so a block can never silently drop out of the reset.
export const RACE_RELEVANT_DEFAULTS = {
  raceDynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
  raceBehaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
  rowLayoutConfig: DEFAULT_ROW_LAYOUT_CONFIG,
  baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
  autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
};

// autoScale has its own DevScreen tab (separate React state), so the master reset persists its default
// straight to storage — the world the race reads is on-default even if that tab is never opened. The tab's
// own local state re-syncs from storage on its next mount.
export function resetAutoScaleToDefault() {
  saveAutoScaleConfig({ ...DEFAULT_AUTO_SCALE_CONFIG });
}
