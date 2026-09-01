// ============================================================
// File:        SpriteRacerType.js
// Path:        client/src/modules/racer-types/SpriteRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// ============================================================

/**
 * SpriteRacerType — configuration-driven base for all sprite-rendered racer types.
 *
 * Replaced the per-type class duplication of HorseRacerType / DuckRacerType /
 * SnailRacerType (D3.5 refactor), and D3.5 part 2 then migrated those three — each of them says so
 * in its own header ("Migrated from class to config object in D3.5 part 2").
 *
 * THIS CLASS IS THE REGISTRY'S BACKBONE: every racer type the game ships is a
 * `new SpriteRacerType({…})`, and `racer-types/index.js` exports twenty of them.
 *
 * The three sentences above replace three that were written on 2026-04-26 and had been false ever
 * since D3.5 part 2 landed — that the three classes were "NOT migrated", that migration was "the
 * next PR", and that "SpriteRacerType is not yet wired into the registry". Recorded rather than
 * quietly corrected (NIGHT-2026-08-18): a reader who believed the last one would conclude the whole
 * sprite path was dead code, and it is the most-used class in this directory.
 *
 * Reserved for future phases:
 * - rteDefinitions: Array of Racer-Track-Effect specs. Schema TBD in phase D6.
 *   This class accepts and stores the array but does NOT process it. RaceScreen
 *   will introduce an RteManager that consumes these definitions.
 */

import { getCachedSprite } from './spriteLoader.js';
import {
  getCoatVariants,
  tintSprite,
  tintSpriteWithMask,
  tintSpriteBodyAndMask,
  tintSpriteWithDualMask,
  detectTintMode,
  getPatternedVariant,
} from './spriteTinter.js';
import { ensureRacerTypeWarm } from './racerWarmup.js';

// Sleeping long-axis guard threshold (Stage 5). Inert for all 20 current racer types
// (max ratio 2.88:1). Exported so tests can verify it never fires for current racers.
export const BODY_LONG_AXIS_MAX_RATIO = 5.0;

// ── ASPECT-CAP-1 (LEVER A): the same guard, woken deliberately. OFF unless something sets it. ────
//
// The threshold above is a CONSTANT and was written to sleep. `leaderBodyAspectMax` lets a race set
// it lower so the guard actually fires — at 2.5 that is rocket (2.881) and giraffe (2.830) and
// nothing else. It is module state rather than a parameter because `_drawBody` is called from the
// render loop with no config in hand, and threading one through every call site would be a much
// larger change than the lever is worth.
//
// `null` restores the sleeping constant exactly, which is what `resetBodyLongAxisMaxRatio` is for —
// a test or a race that does not set it must see the shipped behaviour, and OFF must mean OFF.
let _bodyLongAxisMaxRatio = BODY_LONG_AXIS_MAX_RATIO;

/** ASPECT-CAP-1: set the live cap. `null`/invalid restores the shipped sleeping threshold. */
export function setBodyLongAxisMaxRatio(ratio) {
  _bodyLongAxisMaxRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : BODY_LONG_AXIS_MAX_RATIO;
}

/** ASPECT-CAP-1: the cap in force. Read by the sim and the race core so all three agree. */
export function getBodyLongAxisMaxRatio() {
  return _bodyLongAxisMaxRatio;
}

/** ASPECT-CAP-1: back to the shipped sleeping threshold. */
export function resetBodyLongAxisMaxRatio() {
  _bodyLongAxisMaxRatio = BODY_LONG_AXIS_MAX_RATIO;
}

/**
 * ASPECT-CAP-1: the drawn body's long axis, capped. ONE definition, used by `_drawBody` here and by
 * `raceCore`/`headlessRaceSimulator` for `drawnBodyLengthPx`.
 *
 * **This is the line that makes the lever honest.** The two paths are independent: the sprite is
 * drawn from `bodyFill*` and `displaySize`, while the physics and the framing rule reason about a
 * separately derived `drawnBodyLengthPx`. Capping only the second would shrink the MEASURED clipping
 * without shrinking the clipping — the check would stop checking. Both call this.
 *
 * @param {number} bodyFillNarrow  min(bodyFillX, bodyFillY)
 * @param {number} bodyFillLong    max(bodyFillX, bodyFillY)
 * @returns {number} the effective narrow fill; the long axis is then narrow x cap
 */
export function guardedBodyFillNarrow(bodyFillNarrow, bodyFillLong) {
  if (!(bodyFillNarrow > 0) || !(bodyFillLong > 0)) return bodyFillNarrow;
  const aspect = bodyFillLong / bodyFillNarrow;
  return aspect > _bodyLongAxisMaxRatio
    ? bodyFillNarrow * (aspect / _bodyLongAxisMaxRatio)
    : bodyFillNarrow;
}

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

    if (
      config.tintMode === 'mask' &&
      !config.maskUrl &&
      !config.coats?.some((c) => c.patternMask)
    ) {
      throw new Error(
        'SpriteRacerType: tintMode "mask" requires maskUrl or per-coat patternMask to be set'
      );
    }

    if (config.rteDefinitions !== undefined && !Array.isArray(config.rteDefinitions)) {
      throw new TypeError('SpriteRacerType: rteDefinitions must be an Array');
    }

    if (config.surfaceClasses !== undefined && !Array.isArray(config.surfaceClasses)) {
      throw new TypeError('SpriteRacerType: surfaceClasses must be an Array');
    }

    this.config = {
      frameWidth: 128,
      frameHeight: 128,
      silhouetteScale: 1.0,
      speedMultiplier: 1.0,
      baseRotationOffset: Math.PI / 2,
      tintMode: 'multiply',
      rteDefinitions: [],
      surfaceClasses: [],
      ...config,
    };

    // Post-spread defaults that depend on other config values.
    this.config.fallbackColor ??= this.config.primaryColor;
    this.config.defaultCoatId ??= this.config.coats[0]?.id;
    this.config.bodyFillX ??= 1.0;
    this.config.bodyFillY ??= 1.0;

    // Tracks which spriteUrls have had a lazy-load kicked from the draw path.
    // Instance-level so each racer type manages its own kick independently.
    this._lazyKicked = new Set();
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
    const patternId = racer.patternId ?? 'solid';

    // 1. Fast path: pre-warmed coat variant cache.
    const variants = getCoatVariants.cached(cfg.spriteUrl, cfg.tintMode ?? 'multiply');
    let drawable;
    if (variants) {
      const resolvedCoatId = variants.has(rawCoatId) ? rawCoatId : cfg.defaultCoatId;
      if (patternId === 'solid') {
        drawable = variants.get(resolvedCoatId);
      } else {
        // Lazy-bake patterned variant on first call; subsequent calls hit cache.
        drawable =
          getPatternedVariant(
            cfg.spriteUrl,
            cfg.tintMode ?? 'multiply',
            resolvedCoatId,
            patternId
          ) ?? variants.get(resolvedCoatId);
      }
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
          if (coat.borderMask) {
            // Turtle dual-mask: plate centers (patternMask+tint) + borders (borderMask+borderTint).
            const mask1 = getCachedSprite(coat.patternMask);
            const mask2 = getCachedSprite(coat.borderMask);
            if (mask1 && mask2)
              drawable = tintSpriteWithDualMask(baseImg, mask1, coat.tint, mask2, coat.borderTint);
          } else if (coat.patchTint) {
            // Manta/dolphin: whole-body multiply tint + screen patch in masked region.
            const maskUrl = coat.patternMask ?? cfg.maskUrl;
            const maskImg = maskUrl ? getCachedSprite(maskUrl) : null;
            if (maskImg)
              drawable = tintSpriteBodyAndMask(baseImg, coat.tint, maskImg, coat.patchTint);
          } else {
            // Koi etc: single mask tint.
            const maskUrl = coat.patternMask ?? cfg.maskUrl;
            const maskImg = maskUrl ? getCachedSprite(maskUrl) : null;
            if (maskImg) drawable = tintSpriteWithMask(baseImg, maskImg, coat.tint);
          }
        } else {
          let blendMode;
          if (cfg.tintMode === 'auto') {
            if (!cfg._resolvedTintMode) {
              const w = baseImg.naturalWidth || baseImg.width;
              const h = baseImg.naturalHeight || baseImg.height;
              const off = document.createElement('canvas');
              off.width = w;
              off.height = h;
              const oCtx = off.getContext('2d');
              if (oCtx) {
                oCtx.drawImage(baseImg, 0, 0);
                cfg._resolvedTintMode = detectTintMode(oCtx.getImageData(0, 0, w, h));
              } else {
                cfg._resolvedTintMode = 'multiply';
              }
            }
            blendMode = cfg._resolvedTintMode;
          } else {
            blendMode = cfg.tintMode ?? 'multiply';
          }
          drawable = tintSprite(baseImg, coat.tint, blendMode, patternId);
        }
      }
    }

    // 3. Fallback: colored circle while sprite loads.
    if (!drawable) {
      // Fire-and-forget lazy load on the first cache miss for this spriteUrl.
      // The next frame will pick up the sprite automatically once it is cached.
      if (!this._lazyKicked.has(cfg.spriteUrl)) {
        this._lazyKicked.add(cfg.spriteUrl);
        ensureRacerTypeWarm(cfg);
      }
      ctx.fillStyle = cfg.fallbackColor;
      ctx.beginPath();
      ctx.arc(0, 0, (cfg.displaySize * displaySizeScale) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const idx = this._getFrameIndex(frame, racer.speed ?? 1);
    const sx = idx * cfg.frameWidth;
    const _bfNarrowRaw = Math.min(cfg.bodyFillX, cfg.bodyFillY);
    const bodyFillNarrow = Number.isFinite(_bfNarrowRaw) && _bfNarrowRaw > 0 ? _bfNarrowRaw : 1.0;
    const bodyFillLong = Math.max(cfg.bodyFillX, cfg.bodyFillY);
    // displaySizeScale is now the body-narrow world-px reference divided by displaySize.
    // Dividing by bodyFillNarrow converts from body-narrow units to frame units so the
    // visible narrow body equals displaySize × displaySizeScale in world pixels.
    //
    // Sleeping long-axis guard (Stage 5): if a future racer has a visible-body aspect
    // ratio exceeding BODY_LONG_AXIS_MAX_RATIO, scale up the effective bodyFillNarrow
    // denominator so the long axis is capped at RATIO × narrow. INERT for all 20 current
    // racer types — max ratio is 2.88:1 (rocket, bodyFillLong/bodyFillNarrow=0.801/0.278).
    // Threshold: 5.0. Activate by adding a racer where max(bFX,bFY)/min(bFX,bFY) > 5.0.
    const guardedFillNarrow = guardedBodyFillNarrow(bodyFillNarrow, bodyFillLong);
    const scale =
      ((cfg.displaySize * displaySizeScale) / cfg.frameHeight / guardedFillNarrow) *
      cfg.silhouetteScale;
    if (!Number.isFinite(scale) || scale <= 0) return;
    const dw = cfg.frameWidth * scale;
    const dh = cfg.frameHeight * scale;

    ctx.save();
    ctx.rotate(cfg.baseRotationOffset);
    ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame, displaySizeScale = 1, isComeback = false) {
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
    } else if (isComeback) {
      ctx.beginPath();
      ctx.ellipse(0, 0, cfg.leaderEllipseRx, cfg.leaderEllipseRy, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#00dd55';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00dd55';
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
   * Returns the surfaceClasses array — the Surface-Class IDs this racer type
   * is compatible with. An empty array means the racer always uses its
   * native trail (trailFactory) regardless of track surface classes.
   */
  getSurfaceClasses() {
    return this.config.surfaceClasses ?? [];
  }

  /**
   * Returns the rteDefinitions array (reserved for D6 Racer-Track-Effects).
   * Not processed in this PR.
   */
  getRteDefinitions() {
    return this.config.rteDefinitions;
  }
}
