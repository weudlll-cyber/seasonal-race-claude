// ============================================================
// File:        HorseRacerType.js
// Path:        client/src/modules/racer-types/HorseRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Horse racer — extended manifest with sprite-based render.
//              D2.3: pivot from procedural Canvas geometry to sprite blit
//              using a 4-frame top-down trot animation sheet.
// ============================================================

import { loadSprite, getCachedSprite } from './spriteLoader.js';

const SPRITE_URL = '/assets/racers/horse-trot.png';

export class HorseRacerType {
  constructor() {
    /** @type {import('./index.js').RacerStyle} */
    this.style = {
      primaryColor: '#E8DCC4',
      accentColor: '#2A1F18',
      silhouetteScale: 1.0,
      sprite: {
        url: SPRITE_URL,
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 4,
        basePeriodMs: 500,
        // Sprite faces up (−Y in canvas). Race engine forward = +X (east).
        // Rotate by +π/2 so sprite visual forward aligns with engine forward.
        baseRotationOffset: Math.PI / 2,
        displaySize: 40,
      },
    };

    /** @type {import('./index.js').RacerRender} */
    this.render = {
      drawBody: (ctx, racer, frame) => this._drawBody(ctx, racer, frame),
      getDimensions: () => ({ width: 40, height: 40 }),
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
    return '🐴';
  }

  getSpeedMultiplier() {
    return 1.0;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isLeader) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    this.render.drawBody(ctx, racer, frame);
    ctx.restore();
  }

  getTrailParticles(x, y, speed, angle, _frame) {
    if (Math.random() > 0.45) return [];
    return [
      {
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
        vy: Math.sin(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
        alpha: 0.55,
        r: 3 + Math.random() * 3,
        color: '#c4a060',
      },
    ];
  }

  // ── Extended manifest — private implementations ───────────────────────────

  /**
   * Pure deterministic function. Returns sprite frame index 0..(frameCount-1).
   * Period scales from 200ms (fast) to 1500ms (slow) with racer speed.
   *
   * @param {number} frame  - rAF timestamp in ms
   * @param {number} speed  - Racer speed
   * @returns {number} integer frame index
   */
  _getFrameIndex(frame, speed) {
    const safeSpeed = Math.max(speed, 0.1);
    const period = Math.min(1500, Math.max(200, this.style.sprite.basePeriodMs / safeSpeed));
    const t = (frame % period) / period;
    return Math.floor(t * this.style.sprite.frameCount) % this.style.sprite.frameCount;
  }

  /**
   * Blit the current animation frame onto the canvas.
   * Falls back to a filled circle (primaryColor) while the sprite loads.
   * Caller (drawRacer) has already applied translate(x,y) + rotate(angle).
   * The inner ctx.rotate(baseRotationOffset) corrects for sprite orientation.
   *
   * @debug Set window.__racerDebug = { displaySize: 120 } in browser console
   *        to override sprite size for visual inspection. Remove this hook
   *        before merging to master.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ speed?: number }} racer
   * @param {number} frame - rAF timestamp in ms
   */
  _drawBody(ctx, racer, frame) {
    const sprite = this.style.sprite;
    const img = getCachedSprite(sprite.url);

    if (!img) {
      ctx.fillStyle = this.style.primaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, sprite.displaySize / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const idx = this._getFrameIndex(frame, racer.speed ?? 1);
    const sx = idx * sprite.frameWidth;
    // Temporary debug hook — set window.__racerDebug = { displaySize: N } in console to override
    const debugSize = typeof window !== 'undefined' && window.__racerDebug?.displaySize;
    const effectiveSize = debugSize || sprite.displaySize;
    const scale = (effectiveSize / sprite.frameHeight) * (this.style.silhouetteScale ?? 1);
    const dw = sprite.frameWidth * scale;
    const dh = sprite.frameHeight * scale;

    ctx.save();
    ctx.rotate(sprite.baseRotationOffset);
    ctx.drawImage(img, sx, 0, sprite.frameWidth, sprite.frameHeight, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  /**
   * Factory: returns a per-racer dust-trail particle system.
   * All particle state lives inside the closure — no shared pool.
   *
   * Spawn rate: 2 particles/frame at baseSpeed ≥ 5, linear scale below.
   * Particle lifetime: 30 frames.  Alpha fades, radius expands slightly.
   *
   * @param {object} _racer - The racer this trail belongs to (unused in factory,
   *                          spawn() receives the live racer each frame)
   * @returns {{ spawn(racer, dt): void, update(dt): void, render(ctx): void }}
   */
  _createTrail(_racer) {
    const particles = [];

    return {
      spawn(racer, _dt) {
        const speed = racer.baseSpeed ?? 2;
        const spawnRate = (2 * Math.min(speed, 5)) / 5;
        const frac = spawnRate % 1;
        const count = Math.floor(spawnRate) + (Math.random() < frac ? 1 : 0);
        if (count === 0) return;

        const angle = racer.angle ?? 0;
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpY = Math.sin(angle + Math.PI / 2);
        const backX = racer.x + Math.cos(angle + Math.PI) * 12;
        const backY = racer.y + Math.sin(angle + Math.PI) * 12;

        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          particles.push({
            x: backX + perpX * side * 5 + (Math.random() - 0.5) * 3,
            y: backY + perpY * side * 5 + (Math.random() - 0.5) * 3,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            ttl: 30,
            maxTtl: 30,
            r: 3 + Math.random() * 2,
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
          p.r += 0.05; // slight expansion
        }
      },

      render(ctx) {
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = '#c4a060';
          ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  }
}

// Preload sprite at module load so it's cached before the first race frame.
loadSprite(SPRITE_URL).catch(() => {});
