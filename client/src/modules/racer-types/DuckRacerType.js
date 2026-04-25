// ============================================================
// File:        DuckRacerType.js
// Path:        client/src/modules/racer-types/DuckRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Duck racer — sprite-based render with 8-frame walk animation
//              and water-splash trail. D3.1 mirrors the horse sprite manifest.
// ============================================================

import { getCachedSprite } from './spriteLoader.js';
import { getCoatVariants } from './spriteTinter.js';

const SPRITE_URL = '/assets/racers/duck-walk.png';

export const DUCK_COATS = [
  { id: 'yellow', name: 'Yellow', tint: null },
  { id: 'white', name: 'White', tint: '#E8E0D0' },
  { id: 'mallard', name: 'Mallard', tint: '#6B4423' },
  { id: 'gray', name: 'Gray', tint: '#7A7A80' },
  { id: 'black', name: 'Black', tint: '#1C1C1C' },
  { id: 'blue', name: 'Blue Swedish', tint: '#3A5A78' },
  { id: 'brown', name: 'Brown', tint: '#8B5A2A' },
  { id: 'teal', name: 'Teal', tint: '#2A6B50' },
  { id: 'orange', name: 'Orange', tint: '#D06010' },
  { id: 'rouen', name: 'Rouen', tint: '#4A3020' },
  { id: 'pink', name: 'Pink', tint: '#D04070' },
];

export class DuckRacerType {
  constructor() {
    /** @type {import('./index.js').RacerStyle} */
    this.style = {
      primaryColor: '#F5D020',
      accentColor: '#E06800',
      silhouetteScale: 1.0,
      sprite: {
        url: SPRITE_URL,
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 8,
        basePeriodMs: 700,
        // Sprite faces up (−Y in canvas). Rotate +π/2 to align with engine forward (+X).
        baseRotationOffset: Math.PI / 2,
        displaySize: 36,
      },
      coats: DUCK_COATS,
      defaultCoatId: 'yellow',
    };

    /** @type {import('./index.js').RacerRender} */
    this.render = {
      drawBody: (ctx, racer, frame) => this._drawBody(ctx, racer, frame),
      getDimensions: () => ({ width: 36, height: 36 }),
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
    return '🦆';
  }

  getSpeedMultiplier() {
    return 0.85;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isLeader) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ccff';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    this.render.drawBody(ctx, racer, frame);
    ctx.restore();
  }

  getTrailParticles(x, y, _speed, angle, _frame) {
    if (Math.random() > 0.4) return [];
    const perp = angle + Math.PI / 2;
    return [-1, 1].map((side) => ({
      x: x + Math.cos(perp) * side * 5,
      y: y + Math.sin(perp) * side * 5,
      vx: Math.cos(angle + Math.PI) * 1.5 + Math.cos(perp) * side * 0.8,
      vy: Math.sin(angle + Math.PI) * 1.5 + Math.sin(perp) * side * 0.8 - 1,
      alpha: 0.5,
      r: 2 + Math.random() * 2,
      color: '#7be0f8',
    }));
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
      ctx.fillStyle = this.style.primaryColor;
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
        if (Math.random() > 0.4) return;
        const angle = racer.angle ?? 0;
        const perp = angle + Math.PI / 2;
        const px = racer.x ?? 0;
        const py = racer.y ?? 0;
        for (const side of [-1, 1]) {
          particles.push({
            x: px + Math.cos(perp) * side * 5,
            y: py + Math.sin(perp) * side * 5,
            vx: Math.cos(angle + Math.PI) * 1.5 + Math.cos(perp) * side * 0.8,
            vy: Math.sin(angle + Math.PI) * 1.5 + Math.sin(perp) * side * 0.8 - 1,
            ttl: 20,
            maxTtl: 20,
            r: 2 + Math.random() * 2,
          });
        }
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
          ctx.fillStyle = '#7be0f8';
          ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  }
}

// Prime the coat variant cache at module load so tinting is done before the first race frame.
getCoatVariants(SPRITE_URL, DUCK_COATS).catch(() => {});
