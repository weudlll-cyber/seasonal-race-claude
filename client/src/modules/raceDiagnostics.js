// ============================================================
// File:        raceDiagnostics.js
// Path:        client/src/modules/raceDiagnostics.js
// Project:     RaceArena
// Description: DEV-ONLY cache + DOM/heap leak diagnostic.
//              TEMPORARY — revert after H-05 measurement.
//              Guards: import.meta.env.DEV; no prod impact.
//
//              Exposes on window (dev only):
//                window.__raceDiag()       → current snapshot object
//                window.__raceDiagTable()  → array of all captured rows
//                window.__raceDiagCapture(phase) → capture a row now
// ============================================================

import { _spriteLoaderCacheSize } from './racer-types/spriteLoader.js';
import { _bgImageCacheSize } from './track-effects/bgImageCache.js';
import {
  _variantCacheSize,
  _patternTileCacheSize,
  _patternedVariantCacheSize,
  _maskedVariantCacheSize,
} from './racer-types/spriteTinter.js';

const _rows = [];
let _cycleCounter = 0;

function _snapshot(cycle, phase) {
  return {
    cycle,
    phase,
    spriteLoader: _spriteLoaderCacheSize(),
    bgImageCache: _bgImageCacheSize(),
    variant: _variantCacheSize(),
    patternTile: _patternTileCacheSize(),
    patternedVariant: _patternedVariantCacheSize(),
    maskedVariant: _maskedVariantCacheSize(),
    domNodes: document.querySelectorAll('*').length,
    heapMB:
      typeof performance !== 'undefined' && performance.memory
        ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(2)
        : null,
  };
}

function captureTransition(phase) {
  if (phase === 'setup→race') _cycleCounter++;
  const row = _snapshot(_cycleCounter, phase);
  _rows.push(row);
  return row;
}

if (import.meta.env.DEV) {
  window.__raceDiag = function () {
    return _snapshot(_cycleCounter, 'manual');
  };
  window.__raceDiagTable = function () {
    return [..._rows];
  };
  window.__raceDiagCapture = captureTransition;
}
