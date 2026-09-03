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
    const scale = this._frameScale(displaySizeScale);
    if (!Number.isFinite(scale) || scale <= 0) return;
    const dw = cfg.frameWidth * scale;
    const dh = cfg.frameHeight * scale;

    ctx.save();
    ctx.rotate(cfg.baseRotationOffset);
    ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  /**
   * The effective body-narrow denominator, with the sleeping long-axis guard applied.
   *
   * ONE HOME (BOARD-PORTRAIT-FIT-1). `_drawBody` computed this inline and it was the only thing
   * that knew it; `getBodyBox` below has to agree with it exactly, and two copies of a formula
   * whose whole job is "how big is this drawn" is how a caller comes to believe a size it is not
   * getting. That belief is the defect this method was extracted for — see `getPortraitFitScale`.
   *
   * Sleeping long-axis guard (Stage 5): a racer whose visible-body aspect exceeds
   * BODY_LONG_AXIS_MAX_RATIO gets a larger denominator, capping its long axis at RATIO × narrow.
   * INERT for all 20 current types — the maximum is 2.88:1 (rocket, 0.801/0.278).
   */
  _guardedFillNarrow() {
    const cfg = this.config;
    const raw = Math.min(cfg.bodyFillX, cfg.bodyFillY);
    const narrow = Number.isFinite(raw) && raw > 0 ? raw : 1.0;
    const long = Math.max(cfg.bodyFillX, cfg.bodyFillY);
    const aspect = long / narrow;
    return aspect > BODY_LONG_AXIS_MAX_RATIO
      ? narrow * (aspect / BODY_LONG_AXIS_MAX_RATIO)
      : narrow;
  }

  /**
   * The sheet-to-canvas scale for a given `displaySizeScale`.
   *
   * `displaySizeScale` is the body-narrow reference divided by displaySize. Dividing by the body
   * fill converts from body-narrow units to FRAME units, so the visible NARROW body ends up
   * `displaySize × displaySizeScale` px. **The other axis is not bounded by this** and follows the
   * sprite's own proportions — which is correct on the track and is exactly what a caller drawing
   * into a fixed box must not assume away.
   */
  _frameScale(displaySizeScale = 1) {
    const cfg = this.config;
    return (
      ((cfg.displaySize * displaySizeScale) / cfg.frameHeight / this._guardedFillNarrow()) *
      cfg.silhouetteScale
    );
  }

  /**
   * The VISIBLE BODY's on-screen bounding box at a given `displaySizeScale`, in canvas px.
   *
   * ★ WHY THIS EXISTS. `displaySizeScale` sizes ONE axis — the narrow one. Every caller that wanted
   * a portrait in a fixed box has assumed it sized both, and the STARTERS board's own comment said
   * so in as many words ("the drawn portrait is 94 % of it, so it goes … to ~26.3 px"). It is 26.3
   * px on the narrow axis and up to **75.8 px** on the other, because `baseRotationOffset` is 90°
   * for every shipped type and lays the long axis across the screen. Measured 2026-09-04: 14 of the
   * 20 types put opaque pixels on the number chip beside them.
   *
   * The rotation is applied as an axis-aligned bounding box of the rotated body rectangle, so the
   * answer is right for the 90° every type uses and honest for anything in between.
   *
   * @param {number} [displaySizeScale=1]
   * @returns {{w: number, h: number}} the drawn body's width and height on screen
   */
  getBodyBox(displaySizeScale = 1) {
    const cfg = this.config;
    const scale = this._frameScale(displaySizeScale);
    if (!Number.isFinite(scale) || scale <= 0) return { w: 0, h: 0 };
    const bx = cfg.frameWidth * scale * cfg.bodyFillX;
    const by = cfg.frameHeight * scale * cfg.bodyFillY;
    const rot = cfg.baseRotationOffset ?? 0;
    const c = Math.abs(Math.cos(rot));
    const s = Math.abs(Math.sin(rot));
    return { w: bx * c + by * s, h: bx * s + by * c };
  }

  /**
   * The `displaySizeScale` that makes this type's VISIBLE BODY fit inside a `boxW × boxH` box.
   *
   * ★ THIS IS THE FIX FOR THE BOARD, AND IT IS NOT A FIX FOR ONE SPRITE. A caller drawing portraits
   * into a column wants a box, not a narrow axis. Asking the TYPE for the scale keeps the geometry
   * — body fill, rotation, silhouette scale — in the one place that owns it, so a caller cannot get
   * it subtly wrong the way the board did, and any future portrait column gets the right answer
   * without re-deriving anything.
   *
   * NOTHING ON THE TRACK USES THIS. The race sizes racers by the narrow axis deliberately: body
   * fill feeds row layout and contact braking, and a racer that shrank to fit a box would change
   * the race. This is for fixed-box UI only.
   *
   * @param {number} boxW  the box's width in canvas px
   * @param {number} boxH  the box's height in canvas px
   * @returns {number} the scale to pass to `drawRacer`; 0 if the type cannot be measured
   */
  getPortraitFitScale(boxW, boxH) {
    const unit = this.getBodyBox(1);
    if (!(unit.w > 0) || !(unit.h > 0)) return 0;
    // The box grows linearly with the scale, so one measurement at 1 answers it.
    return Math.min(boxW / unit.w, boxH / unit.h);
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
