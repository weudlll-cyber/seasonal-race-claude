// ============================================================
// File:        racerWarmup.js
// Path:        client/src/modules/racer-types/racerWarmup.js
// Project:     RaceArena
// Description: Shared sprite warm-up for racer type configs.
//              Single definition used by all three call sites:
//              warmUpAllRacerTypes (index.js), _runLoad server path
//              (index.js), and lazy-draw kick (SpriteRacerType.js).
//              Isolated here so changes to spriteTinter.js do not
//              break the ~28 test files that mock that module.
// ============================================================

import { loadSprite } from './spriteLoader.js';
import { getCoatVariants } from './spriteTinter.js';

/**
 * Kick off sprite warm-up for a racer type config. Idempotent per URL — calls
 * that hit an already-cached sprite resolve instantly from cache.
 *
 * Mask mode loads the base sprite, the shared maskUrl (if any), and all
 * per-coat patternMask / borderMask URLs. Non-mask mode pre-bakes coat
 * variant canvases via getCoatVariants.
 *
 * @param {object} cfg  SpriteRacerType config object.
 */
export function ensureRacerTypeWarm(cfg) {
  if (!cfg) return;
  if (cfg.tintMode === 'mask') {
    loadSprite(cfg.spriteUrl).catch((e) =>
      console.error(`[warmup] ${cfg.id} FAILED: ${e.message}`)
    );
    if (cfg.maskUrl)
      loadSprite(cfg.maskUrl).catch((e) =>
        console.error(`[warmup] ${cfg.id} mask FAILED: ${e.message}`)
      );
    const coatMasks = new Set([
      ...(cfg.coats?.map((c) => c.patternMask).filter(Boolean) ?? []),
      ...(cfg.coats?.map((c) => c.borderMask).filter(Boolean) ?? []),
    ]);
    for (const url of coatMasks)
      loadSprite(url).catch((e) =>
        console.error(`[warmup] ${cfg.id} coatMask FAILED: ${e.message}`)
      );
  } else {
    const blendMode = cfg.tintMode && cfg.tintMode !== 'mask' ? cfg.tintMode : 'multiply';
    getCoatVariants(cfg.spriteUrl, cfg.coats, blendMode).catch((e) =>
      console.error(`[warmup] ${cfg.id} FAILED: ${e.message}`)
    );
  }
}
