// ============================================================
// File:        SnailRacerType.js
// Path:        client/src/modules/racer-types/SnailRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Snail racer — sprite-based render with 4-frame crawl animation
//              and slime-trail particles. D3.2 mirrors the horse/duck pattern.
// ============================================================

import { getCachedSprite } from './spriteLoader.js';
import { getCoatVariants } from './spriteTinter.js';

const SPRITE_URL = '/assets/racers/snail-crawl.png';

export const SNAIL_COATS = [
  { id: 'garden', name: 'Garden Snail', tint: null },
  { id: 'roman', name: 'Roman Snail', tint: '#A89060' },
  { id: 'banded', name: 'Banded', tint: '#7A6238' },
  { id: 'glass', name: 'Glass Snail', tint: '#B5C3C9' },
  { id: 'stripe', name: 'Striped', tint: '#5D4A2D' },
  { id: 'amber', name: 'Amber', tint: '#C49A5C' },
  { id: 'leopard', name: 'Leopard Slug', tint: '#3A2E1F' },
  { id: 'rosy', name: 'Rosy Wolf', tint: '#B57870' },
  { id: 'mossy', name: 'Moss Snail', tint: '#7A8B5F' },
  { id: 'shell', name: 'Shell White', tint: '#E5DCC9' },
  { id: 'ebony', name: 'Ebony', tint: '#2A2520' },
];

export class SnailRacerType {
  constructor() {
    /** @type {import('./index.js').RacerStyle} */
    this.style = {
      primaryColor: '#E8DCC4',
      accentColor: '#3A2E1F',
      silhouetteScale: 1.0,
      sprite: {
        url: SPRITE_URL,
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 4,
        basePeriodMs: 1500,
        // Sprite faces up (−Y in canvas). Rotate +π/2 to align with engine forward (+X).
        baseRotationOffset: Math.PI / 2,
        displaySize: 35,
      },
      coats: SNAIL_COATS,
      defaultCoatId: 'garden',
    };

    /** @type {import('./index.js').RacerRender} */
    this.render = {
      drawBody: (ctx, racer, frame) => this._drawBody(ctx, racer, frame),
      getDimensions: () => ({ width: 35, height: 35 }),
    };

    /** @type {import('./index.js').RacerAnimation} */
    this.animation = {
      getFrameIndex: (frame, speed) => this._getFrameIndex(frame, speed),
    };

    /** @type {import('./index.js').RacerTrail} */
    this.trail = {
      createTrail: (racer) => this._createTrail(racer),
    };
  }

  // ── Existing interface ─────────────────────────────────────────────────────

  getEmoji() {
    return '🐌';
  }

  getSpeedMultiplier() {
    return 0.3;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isLeader) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#88ff44';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#88ff44';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    this.render.drawBody(ctx, racer, frame);
    ctx.restore();
  }

  getTrailParticles(x, y, _speed, _angle, _frame) {
    if (Math.random() > 0.35) return [];
    return [
      {
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: 0.45,
        r: 4 + Math.random() * 5,
        color: '#7ddc60',
      },
    ];
  }

  // ── Extended manifest — private implementations ───────────────────────────

  _getFrameIndex(frame, speed) {
    const safeSpeed = Math.max(speed, 0.1);
    const period = Math.min(1500, Math.max(200, this.style.sprite.basePeriodMs / safeSpeed));
    const t = (frame % period) / period;
    return Math.floor(t * this.style.sprite.frameCount) % this.style.sprite.frameCount;
  }

  _drawBody(ctx, racer, frame) {
    const sprite = this.style.sprite;

    const variants = getCoatVariants.cached(sprite.url);
    const coatId = racer.coatId ?? this.style.defaultCoatId;
    let drawable;
    if (variants) {
      drawable = variants.get(coatId) ?? variants.get(this.style.defaultCoatId);
    }
    if (!drawable) {
      drawable = getCachedSprite(sprite.url);
    }

    if (!drawable) {
      ctx.fillStyle = this.style.accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, sprite.displaySize / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const idx = this._getFrameIndex(frame, racer.speed ?? 1);
    const sx = idx * sprite.frameWidth;
    const scale = (sprite.displaySize / sprite.frameHeight) * (this.style.silhouetteScale ?? 1);
    const dw = sprite.frameWidth * scale;
    const dh = sprite.frameHeight * scale;

    ctx.save();
    ctx.rotate(sprite.baseRotationOffset);
    ctx.drawImage(drawable, sx, 0, sprite.frameWidth, sprite.frameHeight, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  _createTrail(_racer) {
    const particles = [];

    return {
      spawn(racer, _dt) {
        if (Math.random() > 0.35) return;
        particles.push({
          x: (racer.x ?? 0) + (Math.random() - 0.5) * 4,
          y: (racer.y ?? 0) + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          ttl: 30,
          maxTtl: 30,
          r: 4 + Math.random() * 5,
        });
      },

      update(_dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.ttl--;
          if (p.ttl <= 0) {
            particles.splice(i, 1);
            continue;
          }
          p.x += p.vx;
          p.y += p.vy;
        }
      },

      render(ctx) {
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = '#7ddc60';
          ctx.globalAlpha = 0.45 * (p.ttl / p.maxTtl);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  }
}

// Prime the coat variant cache at module load so tinting is done before the first race frame.
getCoatVariants(SPRITE_URL, SNAIL_COATS).catch(() => {});
