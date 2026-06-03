// ============================================================
// File:        MinSpriteSizePreview.jsx
// Path:        client/src/screens/DevScreen/sections/MinSpriteSizePreview.jsx
// Project:     RaceArena
// Created:     2026-04-28
// Description: Animated canvas preview showing a racer sprite at exactly
//              minTargetScreenPx size. Used in the RacerEditModal min-size
//              slider section (D7a-Plus).
// ============================================================

import { useEffect, useRef } from 'react';
import { getCoatVariants } from '../../../modules/racer-types/spriteTinter.js';
import { getCachedSprite } from '../../../modules/racer-types/spriteLoader.js';

/**
 * Renders an animated sprite canvas at the given sizePx.
 * Uses requestAnimationFrame; starts/stops with component mount/unmount.
 *
 * @param {{ racerType: import('../../../modules/racer-types/SpriteRacerType.js').SpriteRacerType, sizePx: number }} props
 */
export function MinSpriteSizePreview({ racerType, sizePx }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let running = true;
    let rafId;
    let lastTime = 0;
    let elapsed = 0;

    function tick(timestamp) {
      if (!running) return;

      const dt = lastTime ? Math.min(timestamp - lastTime, 100) : 0;
      lastTime = timestamp;

      const cfg = racerType.config;
      elapsed = (elapsed + dt) % cfg.basePeriodMs;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, sizePx, sizePx);

      const variants = getCoatVariants.cached(cfg.spriteUrl, cfg.tintMode ?? 'multiply');
      let drawable = variants?.get(cfg.defaultCoatId) ?? variants?.values().next().value ?? null;

      // Mask-mode types (buggy, motorbike, plane, koi, turtle, manta, dolphin, …) are not
      // pre-baked into getCoatVariants — use the raw base sprite for shape/animation preview.
      if (!drawable && cfg.tintMode === 'mask') {
        drawable = getCachedSprite(cfg.spriteUrl) ?? null;
      }

      if (!drawable) {
        const r = sizePx / 2;
        ctx.fillStyle = cfg.fallbackColor ?? cfg.primaryColor ?? '#888888';
        ctx.beginPath();
        ctx.arc(r, r, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const frameIdx = Math.floor((elapsed / cfg.basePeriodMs) * cfg.frameCount) % cfg.frameCount;
        const sx = frameIdx * cfg.frameWidth;
        const scale = (sizePx / cfg.frameHeight) * (cfg.silhouetteScale ?? 1);
        const dw = cfg.frameWidth * scale;
        const dh = cfg.frameHeight * scale;

        ctx.save();
        ctx.translate(sizePx / 2, sizePx / 2);
        ctx.rotate(cfg.baseRotationOffset ?? Math.PI / 2);
        ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [racerType, sizePx]);

  return (
    <canvas
      ref={canvasRef}
      width={sizePx}
      height={sizePx}
      aria-label={`${racerType.config.id} preview at ${sizePx}px`}
      style={{ display: 'block', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

export default MinSpriteSizePreview;
