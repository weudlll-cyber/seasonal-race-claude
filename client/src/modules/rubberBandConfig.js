// ============================================================
// File:        rubberBandConfig.js
// Path:        client/src/modules/rubberBandConfig.js
// Project:     RaceArena
// Created:     2026-05-31
// Description: Storage CRUD for rubber-band catch-up config.
//              Follows the raceDynamicsConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_RUBBER_BAND_CONFIG } from './storage/defaults.js';

export { DEFAULT_RUBBER_BAND_CONFIG };

export function loadRubberBandConfig() {
  const stored = storageGet(KEYS.RUBBER_BAND_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RUBBER_BAND_CONFIG };
  const merged = { ...DEFAULT_RUBBER_BAND_CONFIG, ...stored };
  if (
    merged.brakeThreshold < 0 ||
    merged.brakeThreshold >= 1 ||
    !(merged.gapScale > 0) ||
    merged.maxBrake < 0 ||
    // Brake-1: ceiling widened 0.15 → 0.18 so the tip-focus sweep can explore up to −18%
    // (the −15% that reels in the worst permanent breakaway, plus headroom). Default stays 0.10.
    merged.maxBrake > 0.18 ||
    merged.boostRampMs <= 0 ||
    !(merged.rubberBandEndgameThreshold > 0) ||
    merged.rubberBandEndgameThreshold > 1 ||
    // Tip-focus dead-zone (fraction of finishT); 0 = off (legacy). Finite and in [0, 1).
    !(merged.rubberBandTipThreshold >= 0) ||
    merged.rubberBandTipThreshold >= 1
  ) {
    return { ...DEFAULT_RUBBER_BAND_CONFIG };
  }
  return merged;
}

export function saveRubberBandConfig(config) {
  return storageSet(KEYS.RUBBER_BAND_CONFIG, config);
}
