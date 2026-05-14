// ============================================================
// File:        prioritySystemConfig.js
// Path:        client/src/modules/prioritySystemConfig.js
// Project:     RaceArena
// Description: Storage CRUD for the priority-system tuning config (Phase 2).
//              Follows the raceBehaviorConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_PRIORITY_SYSTEM_CONFIG } from './storage/defaults.js';

export { DEFAULT_PRIORITY_SYSTEM_CONFIG };

export function loadPrioritySystemConfig() {
  const stored = storageGet(KEYS.PRIORITY_SYSTEM_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PRIORITY_SYSTEM_CONFIG };
  const merged = { ...DEFAULT_PRIORITY_SYSTEM_CONFIG, ...stored };
  if (
    !Number.isFinite(merged.lookaheadFrames) ||
    merged.lookaheadFrames < 1 ||
    !Number.isFinite(merged.cooldownMs) ||
    merged.cooldownMs < 0 ||
    !Number.isFinite(merged.blockedTimeoutFrames) ||
    merged.blockedTimeoutFrames < 0 ||
    !Number.isFinite(merged.blockedEscapeForce) ||
    merged.blockedEscapeForce < 0 ||
    merged.blockedEscapeForce > 1
  ) {
    return { ...DEFAULT_PRIORITY_SYSTEM_CONFIG };
  }
  return merged;
}

export function savePrioritySystemConfig(config) {
  return storageSet(KEYS.PRIORITY_SYSTEM_CONFIG, config);
}
