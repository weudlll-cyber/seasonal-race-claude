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
      primaryColor: '#8B4513',
      accentColor: '#3E2723',
      silhouetteScale: 1.0,
    };

    /** @type {import('./index.js').RacerRender} */
    this.render = {
      drawBody: (ctx, racer, frame) => this._drawBody(ctx, racer, frame),
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
    const bob = Math.sin(frame * 0.012 + (racer.index ?? 0) * 1.2) * 3;
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ffd700';
    }
    ctx.fillText('🐴', x, y + bob);
    ctx.shadowBlur = 0;
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
   * Pure function: deterministic for any (frame, speed) pair.
   * All output values are bounded; no unbounded accumulation.
   *
   * @param {number} frame  - Current animation frame counter
   * @param {number} speed  - Racer speed (clamped internally to [0, 5])
   * @returns {{ legPhaseA: number, legPhaseB: number, manePhase: number, tailPhase: number }}
   */
  _getAnimationOffset(frame, speed) {
    const clampedSpeed = Math.max(0, Math.min(speed, 5));
    // Rate scales from 0.04/frame (idle) to 0.16/frame (full speed)
    const rate = 0.04 + 0.12 * (clampedSpeed / 5);
    const legCycle = frame * rate;
    const legPhaseA = Math.sin(legCycle); // front-left, rear-right
    const legPhaseB = Math.sin(legCycle + Math.PI); // front-right, rear-left (opposite)
    const manePhase = Math.sin(frame * 0.08) * 0.3; // subtle wave, bounded ±0.3
    const tailPhase = Math.sin(frame * 0.05 + 0.5) * 0.4; // lags body, bounded ±0.4
    return { legPhaseA, legPhaseB, manePhase, tailPhase };
  }

  /**
   * Top-down flat horse silhouette.
   * Drawn relative to (0, 0); caller is responsible for translate + rotate.
   * Uses 2 colours from this.style.  Body is ~24×14 px at silhouetteScale 1.0.
   *
   * Draw order (back to front): tail → legs → body → head → muzzle → mane
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ baseSpeed?: number, index?: number }} racer
   * @param {number} frame
   */
  _drawBody(ctx, racer, frame) {
    const { primaryColor, accentColor } = this.style;
    const speed = racer.baseSpeed ?? 2;
    const { legPhaseA, legPhaseB, manePhase, tailPhase } = this._getAnimationOffset(frame, speed);

    ctx.save();

    // ── Tail — swept polygon behind the body ──────────────────────────────
    const tSway = tailPhase * 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-16 + tSway, -3);
    ctx.lineTo(-19 + tSway * 0.6, tailPhase * 1.5);
    ctx.lineTo(-16 + tSway, 3);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();

    // ── Legs — 4 small ovals, animated along x-axis ───────────────────────
    // Pairs: (front-left + rear-right) share legPhaseA;
    //        (front-right + rear-left) share legPhaseB (opposite phase)
    ctx.fillStyle = accentColor;
    const drawLeg = (cx, cy, phase) => {
      ctx.beginPath();
      ctx.ellipse(cx + phase * 2, cy, 2.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawLeg(7, -8, legPhaseA); // front-left
    drawLeg(7, 8, legPhaseB); // front-right
    drawLeg(-5, -8, legPhaseB); // rear-left
    drawLeg(-5, 8, legPhaseA); // rear-right

    // ── Body — main ellipse ─────────────────────────────────���─────────────
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();

    // ── Head — smaller ellipse, overlapping body front ────────────────────
    ctx.beginPath();
    ctx.ellipse(15, 0, 6, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();

    // ── Muzzle — triangle pointing forward ──────────────────────────────���
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(18, -2);
    ctx.lineTo(18, 2);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();

    // ── Mane — dark strip along spine from head to mid-body ──────────────
    const mY = manePhase * 2;
    ctx.beginPath();
    ctx.moveTo(16, mY - 1);
    ctx.lineTo(-3, mY - 0.5);
    ctx.lineTo(-3, mY - 3.5);
    ctx.lineTo(16, mY - 3);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();

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
