// ============================================================
// File:        SpriteRacerType.js
// Path:        client/src/modules/racer-types/SpriteRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// ============================================================

/**
 * SpriteRacerType — configuration-driven base for all sprite-rendered racer types.
 *
 * Replaces the per-type class duplication of HorseRacerType / DuckRacerType /
 * SnailRacerType (D3.5 refactor). The three existing classes are NOT migrated in this
 * PR — they remain unchanged. Migration is the next PR (D3.5 part 2).
 *
 * In this first PR, SpriteRacerType is not yet wired into the registry.
 *
 * Reserved for future phases:
 * - rteDefinitions: Array of Racer-Track-Effect specs. Schema TBD in phase D6.
 *   This class accepts and stores the array but does NOT process it. RaceScreen
 *   will introduce an RteManager that consumes these definitions.
 */

import { getCachedSprite } from './spriteLoader.js';
import { getCoatVariants, tintSprite, tintSpriteWithMask } from './spriteTinter.js';

const REQUIRED_FIELDS = [
  'id',
  'spriteUrl',
  'frameCount',
  'basePeriodMs',
  'displaySize',
  'coats',
  'trailFactory',
];

export class SpriteRacerType {
  constructor(config) {
    for (const field of REQUIRED_FIELDS) {
      if (config[field] == null) {
        throw new Error(`SpriteRacerType: required config field "${field}" is missing`);
      }
    }

    if (config.tintMode === 'mask' && !config.maskUrl) {
      throw new Error('SpriteRacerType: tintMode "mask" requires maskUrl to be set');
    }

    if (config.rteDefinitions !== undefined && !Array.isArray(config.rteDefinitions)) {
      throw new TypeError('SpriteRacerType: rteDefinitions must be an Array');
    }

    this.config = {
      frameWidth: 128,
      frameHeight: 128,
      silhouetteScale: 1.0,
      speedMultiplier: 1.0,
      baseRotationOffset: Math.PI / 2,
      tintMode: 'multiply',
      rteDefinitions: [],
      ...config,
    };

    // Post-spread defaults that depend on other config values.
    this.config.fallbackColor ??= this.config.primaryColor;
    this.config.defaultCoatId ??= this.config.coats[0]?.id;
  }

  getEmoji() {
    return this.config.emoji;
  }

  getSpeedMultiplier() {
    return this.config.speedMultiplier;
  }

  /**
   * Pure deterministic function. Returns sprite frame index 0..(frameCount-1).
   * Period scales from 200ms (fast) to 1500ms (slow) with racer speed.
   */
  _getFrameIndex(frame, speed) {
    const safeSpeed = Math.max(speed, 0.1);
    const period = Math.min(1500, Math.max(200, this.config.basePeriodMs / safeSpeed));
    const t = (frame % period) / period;
    return Math.floor(t * this.config.frameCount) % this.config.frameCount;
  }

  /**
   * Blit the current animation frame onto the canvas using the racer's coat variant.
   *
   * Resolution order:
   *   1. Pre-warmed coat variant cache (getCoatVariants.cached) — fast path.
   *   2. Lazy tinting: base sprite loaded but variants cache cold. Calls tintSprite or
   *      tintSpriteWithMask depending on tintMode.
   *   3. Fallback colored circle while the sprite is still loading.
   *
   * Caller (drawRacer) has already applied translate(x,y) + rotate(angle).
   */
  _drawBody(ctx, racer, frame, displaySizeScale = 1) {
    const cfg = this.config;
    const rawCoatId = racer.coatId ?? cfg.defaultCoatId;

    // 1. Fast path: pre-warmed coat variant cache.
    const variants = getCoatVariants.cached(cfg.spriteUrl);
    let drawable;
    if (variants) {
      drawable = variants.get(rawCoatId) ?? variants.get(cfg.defaultCoatId);
    }

    // 2. Lazy tinting: base sprite loaded but variants not yet cached.
    if (!drawable) {
      const baseImg = getCachedSprite(cfg.spriteUrl);
      if (baseImg) {
        const resolvedId = cfg.coats.some((c) => c.id === rawCoatId)
          ? rawCoatId
          : cfg.defaultCoatId;
        const coat = cfg.coats.find((c) => c.id === resolvedId);
        if (!coat || coat.tint === null) {
          drawable = baseImg;
        } else if (cfg.tintMode === 'mask') {
          const maskImg = getCachedSprite(cfg.maskUrl);
          if (maskImg) drawable = tintSpriteWithMask(baseImg, maskImg, coat.tint);
        } else {
          drawable = tintSprite(baseImg, coat.tint);
        }
      }
    }

    // 3. Fallback: colored circle while sprite loads.
    if (!drawable) {
      ctx.fillStyle = cfg.fallbackColor;
      ctx.beginPath();
      ctx.arc(0, 0, (cfg.displaySize * displaySizeScale) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const idx = this._getFrameIndex(frame, racer.speed ?? 1);
    const sx = idx * cfg.frameWidth;
    const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight) * cfg.silhouetteScale;
    const dw = cfg.frameWidth * scale;
    const dh = cfg.frameHeight * scale;

    ctx.save();
    ctx.rotate(cfg.baseRotationOffset);
    ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame, displaySizeScale = 1) {
    const cfg = this.config;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isLeader) {
      ctx.beginPath();
      ctx.ellipse(0, 0, cfg.leaderEllipseRx, cfg.leaderEllipseRy, 0, 0, Math.PI * 2);
      ctx.strokeStyle = cfg.leaderRingColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = cfg.leaderRingColor;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    this._drawBody(ctx, racer, frame, displaySizeScale);
    ctx.restore();
  }

  /**
   * Delegates to config.trailFactory. Stateless — returns an array of particle objects
   * for the current frame. RaceScreen accumulates them into its dustParticles pool.
   */
  getTrailParticles(x, y, speed, angle, frame) {
    return this.config.trailFactory(x, y, speed, angle, frame, undefined);
  }

  /**
   * Returns the rteDefinitions array (reserved for D6 Racer-Track-Effects).
   * Not processed in this PR.
   */
  getRteDefinitions() {
    return this.config.rteDefinitions;
  }
}
