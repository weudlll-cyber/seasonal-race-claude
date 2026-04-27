// ============================================================
// File:        speedScale.js
// Path:        client/src/modules/speedScale.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Speed-scale factor derived from track path length (B-17).
//              Longer tracks get a lower t-speed so racers cover roughly the
//              same visual distance per second regardless of world size.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_SPEED_SCALE_CONFIG } from './storage/defaults.js';

/**
 * Computes the speed-scale divisor for a track.
 * effectiveBaseSpeed = configuredBaseSpeed / computeSpeedScaleFactor(...)
 *
 * Returns 1 when disabled or pathLengthPx is missing/zero.
 * @param {number|null|undefined} pathLengthPx
 * @param {{ enabled: boolean, referencePathLength: number, minScale: number, maxScale: number }} config
 * @returns {number}
 */
export function computeSpeedScaleFactor(pathLengthPx, config) {
  if (!config.enabled || !pathLengthPx || pathLengthPx <= 0) return 1;
  const raw = pathLengthPx / config.referencePathLength;
  return Math.max(config.minScale, Math.min(config.maxScale, raw));
}

export function loadSpeedScaleConfig() {
  return { ...DEFAULT_SPEED_SCALE_CONFIG, ...storageGet(KEYS.SPEED_SCALE_CONFIG, {}) };
}

export function saveSpeedScaleConfig(config) {
  storageSet(KEYS.SPEED_SCALE_CONFIG, config);
}
