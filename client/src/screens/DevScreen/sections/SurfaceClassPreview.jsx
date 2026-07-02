// ============================================================
// File:        SurfaceClassPreview.jsx
// Path:        client/src/screens/DevScreen/sections/SurfaceClassPreview.jsx
// Project:     RaceArena
// Description: Animated canvas preview for a surface-effect generator.
//              A neutral racer circle moves left→right across the canvas.
//              The selected generator emits particles in world coordinates
//              (no camera zoom applied — effZoom=1 for preview simplicity).
//              Config changes are reflected live without restarting the loop.
//              rAF loop starts on mount, stops on unmount (no memory leak).
// ============================================================

import { useEffect, useLayoutEffect, useRef } from 'react';
import { GENERATORS } from '../../../modules/surface-effects/registry.js';

const CANVAS_W = 440;
const CANVAS_H = 130;
const RACER_Y = CANVAS_H / 2;
const RACER_R = 7;
const RACER_COLOR = '#888888';
const SPEED_PX_PER_S = 70;
const BG_COLOR = '#0d0d0f';

/**
 * @param {{ generatorId: string, config: object }} props
 */
export function SurfaceClassPreview({ generatorId, config }) {
  const canvasRef = useRef(null);
  // configRef is updated every render so the animation loop always sees current config
  const configRef = useRef(config);

  // Keep ref current after every render so the rAF loop always reads the latest config
  // without restarting. useLayoutEffect runs synchronously before the browser paint,
  // so the loop sees the updated ref on the very next frame.
  useLayoutEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const gen = GENERATORS[generatorId];
    if (!gen) return;

    // Local animation state — created fresh on each generatorId change
    const state = {
      rafId: null,
      inst: gen.create(configRef.current),
      pool: [],
      x: -20,
      lastTime: null,
      // Track which config was used to create inst so we can recreate on change
      configSnapshot: JSON.stringify(configRef.current),
    };

    function tick(now) {
      // dt in animation-frame units (1.0 = one 60fps frame)
      const dtMs = state.lastTime === null ? 16.67 : now - state.lastTime;
      state.lastTime = now;
      const dt = Math.min(dtMs / 16.67, 3); // cap at 3× to avoid big jumps after tab-switch

      // Live config change detection: recreate inst in-frame without clearing the pool
      // (line generator pools are cleared since they carry positional state)
      const currentConfig = configRef.current;
      const newSnapshot = JSON.stringify(currentConfig);
      if (newSnapshot !== state.configSnapshot) {
        state.inst = gen.create(currentConfig);
        state.configSnapshot = newSnapshot;
        if (generatorId === 'line') state.pool = [];
      }

      // Move racer (wraps from right back to left)
      state.x += (SPEED_PX_PER_S / 60) * dt;
      if (state.x > CANVAS_W + 20) state.x = -20;

      // Angle 0 = moving right; particles drift backwards (angle + π handled inside generators)
      const angle = 0;
      // In-place emitter contract: spawn appends into the pool, update advances/compacts it.
      state.inst.spawn(state.pool, state.x, RACER_Y, SPEED_PX_PER_S, angle);
      state.inst.update(state.pool, dt);

      // Render
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      state.inst.render(ctx, state.pool);

      // Draw racer circle on top
      ctx.globalAlpha = 1;
      ctx.fillStyle = RACER_COLOR;
      ctx.beginPath();
      ctx.arc(state.x, RACER_Y, RACER_R, 0, Math.PI * 2);
      ctx.fill();

      state.rafId = requestAnimationFrame(tick);
    }

    state.rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(state.rafId);
    };
  }, [generatorId]); // Only full-restart when generator type changes

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      aria-label="Surface effect live preview"
      style={{ display: 'block', borderRadius: 6, background: BG_COLOR, maxWidth: '100%' }}
    />
  );
}

export default SurfaceClassPreview;
