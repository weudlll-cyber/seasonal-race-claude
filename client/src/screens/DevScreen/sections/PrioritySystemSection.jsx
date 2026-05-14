// ============================================================
// File:        PrioritySystemSection.jsx
// Path:        client/src/screens/DevScreen/sections/PrioritySystemSection.jsx
// Project:     RaceArena
// Description: DevScreen block for the Priority System (Phase 2).
//              Controls lookaheadFrames and cooldownMs for the 4-mode
//              home-force priority logic in raceBehavior.js.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadPrioritySystemConfig,
  savePrioritySystemConfig,
  DEFAULT_PRIORITY_SYSTEM_CONFIG,
} from '../../../modules/prioritySystemConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function PrioritySystemSection() {
  const [config, setConfig] = useState(() => loadPrioritySystemConfig());

  useEffect(() => {
    savePrioritySystemConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_PRIORITY_SYSTEM_CONFIG });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Priority System</span>
          <span className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={handleReset}
            style={{ fontSize: '0.75rem' }}
            data-testid="reset-priority-system"
          >
            Reset Defaults
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Controls when racers are allowed to return to the track centerline. A racer in active
          sprite-overlap, still cooling down after overlap, or with a blocked path to center will
          not apply home force — giving other forces (free-lane separation, avoidance) room to
          resolve the collision first. Press <strong>M</strong> during a race to see a live color
          overlay of each racer&apos;s current mode.
        </p>
      </div>

      <div className={s.card}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Path Lookahead
        </div>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lookahead Frames
              <InfoTooltip text="How many frames ahead the path-clear corridor check looks when deciding if home force is safe to apply. Higher = more conservative, blocks home force earlier when another racer is on the converging path. Lower = more reactive, home force kicks in sooner." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Lookahead Frames"
              min={10}
              max={60}
              step={5}
              value={config.lookaheadFrames}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 10 && v <= 60) set('lookaheadFrames', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Post-Overlap Cooldown (ms)
              <InfoTooltip text="How long home force stays off after two racers stop overlapping. Gives them time to fully separate before the centerline pull re-activates. 0 = no cooldown. 500ms = ~30 frames at 60fps." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Post-Overlap Cooldown ms"
              min={0}
              max={2000}
              step={50}
              value={config.cooldownMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 2000) set('cooldownMs', v);
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#0d0d0f',
            borderRadius: 'var(--radius)',
          }}
        >
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', margin: 0 }}>
            Mode overlay (press <strong>M</strong> during race):{' '}
            <span style={{ color: 'transparent', textShadow: '0 0 0 #444' }}>◼</span> NORMAL (none){' '}
            <span style={{ color: '#ef4444' }}>◼</span> OVERLAP{' '}
            <span style={{ color: '#f97316' }}>◼</span> COOLDOWN{' '}
            <span style={{ color: '#eab308' }}>◼</span> BLOCKED — number above ring = consecutive
            frames in mode
          </p>
        </div>
      </div>

      <div className={s.card}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          BLOCKED Escape Hatch
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          In high-density racing the path-to-center corridor is often permanently occupied, causing
          racers to stay BLOCKED indefinitely and drift to the track edge. After the timeout below,
          a reduced home force is applied so racers can exit the deadlock. Set timeout to 0 to
          disable the escape hatch entirely.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BLOCKED Timeout (frames)
              <InfoTooltip text="After this many consecutive frames in BLOCKED mode, the escape hatch activates and a reduced home force is applied. 0 = disabled (home force stays off for the full BLOCKED duration). At 60fps, 60 frames ≈ 1 second." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="BLOCKED Timeout Frames"
              min={0}
              max={180}
              step={10}
              value={config.blockedTimeoutFrames}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 180) set('blockedTimeoutFrames', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Escape Force (fraction)
              <InfoTooltip text="Fraction of homeForceStrength applied during the escape hatch phase. 0.3 = 30% of normal home force. Higher values pull racers back to center more aggressively but may increase collision risk." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="BLOCKED Escape Force"
              min={0}
              max={1}
              step={0.1}
              value={config.blockedEscapeForce}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) set('blockedEscapeForce', v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrioritySystemSection;
