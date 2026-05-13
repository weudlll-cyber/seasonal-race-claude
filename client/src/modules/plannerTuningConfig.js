// ============================================================
// File:        plannerTuningConfig.js
// Path:        client/src/modules/plannerTuningConfig.js
// Project:     RaceArena
// Created:     2026-05-13
// Description: Storage CRUD for Constraints-First Planner tuning config.
//              Exposes kinematic limits, safety buffers, planning horizon,
//              and objective weights as DevScreen-configurable values.
//              Follows the raceDynamicsConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_PLANNER_TUNING_CONFIG } from './storage/defaults.js';

export { DEFAULT_PLANNER_TUNING_CONFIG };

export function loadPlannerTuningConfig() {
  const stored = storageGet(KEYS.PLANNER_TUNING_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PLANNER_TUNING_CONFIG };
  return { ...DEFAULT_PLANNER_TUNING_CONFIG, ...stored };
}

export function savePlannerTuningConfig(config) {
  return storageSet(KEYS.PLANNER_TUNING_CONFIG, config);
}
