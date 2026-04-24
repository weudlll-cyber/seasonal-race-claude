// ============================================================
// File:        HorseRacerType.js
// Path:        client/src/modules/racer-types/HorseRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Horse racer — extended manifest pilot for D1.
//              Implements render/animation/trail/style in addition to
//              the existing emoji fallback and getTrailParticles API.
// ============================================================

export class HorseRacerType {
  constructor() {
    /** @type {import('./index.js').RacerStyle} */
    this.style = {
      primaryColor: '#E8DCC4',
      accentColor: '#2A1F18',
      silhouetteScale: 1.0,
    };

    /** @type {import('./index.js').RacerRender} */
    this.render = {
      drawBody: (ctx, racer, frame) => {
        const offset = this._getAnimationOffset(frame, racer.baseSpeed ?? 2);
        this._drawBody(ctx, racer, frame, offset);
      },
      getDimensions: () => ({ width: 32, height: 18 }),
    };

    /** @type {import('./index.js').RacerAnimation} */
    this.animation = {
      getAnimationOffset: (frame, speed) => this._getAnimationOffset(frame, speed),
    };

    /** @type {import('./index.js').RacerTrail} */
    this.trail = {
      createTrail: (racer) => this._createTrail(racer),
    };
  }

  // ── Existing interface (unchanged) ─────────────────────────────��──────────

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

  getTrailParticles(x, y, speed, angle, frame) {
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
   * Pure deterministic function of (frame, speed).
   * frame is a ms timestamp. period scales from 200ms (fast) to 1500ms (slow).
   * Diagonal trot: legFrontLeft === legBackRight, legFrontRight === legBackLeft.
   *
   * @param {number} frame  - rAF timestamp in ms
   * @param {number} speed  - Racer speed (0..∞, clamped to safe range internally)
   * @returns {{ legFrontLeft, legFrontRight, legBackLeft, legBackRight,
   *             manePhase, tailPhase, bodyBob }}
   */
  _getAnimationOffset(frame, speed) {
    const safeSpeed = Math.max(speed, 0.1);
    const period = Math.min(1500, Math.max(200, 500 / safeSpeed));
    const phaseA = ((frame % period) / period) * 2 * Math.PI;
    const phaseB = phaseA + Math.PI;
    return {
      legFrontLeft: Math.sin(phaseA) * 1.5,
      legBackRight: Math.sin(phaseA) * 1.5,
      legFrontRight: Math.sin(phaseB) * 1.5,
      legBackLeft: Math.sin(phaseB) * 1.5,
      manePhase: Math.sin(phaseA + Math.PI / 4) * 0.5,
      tailPhase: Math.sin(phaseA + Math.PI / 2) * 1.0,
      bodyBob: Math.abs(Math.sin(phaseA * 2)) * 0.5,
    };
  }

  /**
   * Top-down horse silhouette.
   * Drawn relative to (0, 0); caller handles translate + rotate.
   * All color values read from this.style at the top — D2.2 can swap
   * those sources for a coat-palette lookup without touching drawing code.
   *
   * Draw order (back to front): tail → body → legs → neck → mane → head → snout
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} _racer - unused; kept for API symmetry
   * @param {number} _frame - unused; animation comes from offset
   * @param {{ legFrontLeft, legFrontRight, legBackLeft, legBackRight,
   *           manePhase, tailPhase, bodyBob }} offset
   */
  _drawBody(ctx, _racer, _frame, offset) {
    const primary = this.style.primaryColor;
    const accent = this.style.accentColor;
    const snout = HorseRacerType._lighten(primary, 0.15);
    const {
      legFrontLeft,
      legFrontRight,
      legBackLeft,
      legBackRight,
      manePhase,
      tailPhase,
      bodyBob,
    } = offset;

    ctx.save();

    // ── Tail — dark teardrop polygon, no bodyBob ──────────────────────────
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-14 + tailPhase * 0.5, -1.5);
    ctx.lineTo(-17 + tailPhase * 0.5, tailPhase);
    ctx.lineTo(-14 + tailPhase * 0.5, 1.5);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();

    // ── Body — ellipse 22 × 14, follows bodyBob ──────────────────────────
    ctx.beginPath();
    ctx.ellipse(0, bodyBob, 11, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.5;
    ctx.fill();
    ctx.stroke();

    // ── Legs — 4 rectangles 2 × 4, X-offset by trot phase, no bodyBob ───
    ctx.fillStyle = accent;
    ctx.fillRect(6 + legFrontLeft - 1, -4 - 2, 2, 4); // front-left
    ctx.fillRect(6 + legFrontRight - 1, 4 - 2, 2, 4); // front-right
    ctx.fillRect(-6 + legBackLeft - 1, -4 - 2, 2, 4); // back-left
    ctx.fillRect(-6 + legBackRight - 1, 4 - 2, 2, 4); // back-right

    // ── Neck — trapezoid bridging body and head ───────────────────────────
    ctx.beginPath();
    ctx.moveTo(10, bodyBob - 4);
    ctx.lineTo(10, bodyBob + 4);
    ctx.lineTo(13, bodyBob + 3);
    ctx.lineTo(13, bodyBob - 3);
    ctx.closePath();
    ctx.fillStyle = primary;
    ctx.fill();

    // ── Mane — dark polygon along neck/head spine ─────────────────────────
    const mY = manePhase * 0.3;
    ctx.beginPath();
    ctx.moveTo(9, bodyBob - 4 + mY);
    ctx.lineTo(13, bodyBob - 3 + mY);
    ctx.lineTo(18, bodyBob - 4 + mY);
    ctx.lineTo(19, bodyBob - 2);
    ctx.lineTo(15, bodyBob - 2);
    ctx.lineTo(10, bodyBob - 3);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();

    // ── Head — ellipse 10 × 8, follows bodyBob ───────────────────────────
    ctx.beginPath();
    ctx.ellipse(18, bodyBob, 5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.5;
    ctx.fill();
    ctx.stroke();

    // ── Snout — trapezoid at head front, lightened primary ────────────────
    ctx.beginPath();
    ctx.moveTo(22, bodyBob - 2);
    ctx.lineTo(22, bodyBob + 2);
    ctx.lineTo(24, bodyBob + 1.5);
    ctx.lineTo(24, bodyBob - 1.5);
    ctx.closePath();
    ctx.fillStyle = snout;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Shifts a 6-digit hex color toward white by `amount` ∈ [0, 1].
   * Returns a valid lowercase 6-char hex string.
   */
  static _lighten(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lerp = (v) => Math.round(v + (255 - v) * amount);
    return `#${[lerp(r), lerp(g), lerp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
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
