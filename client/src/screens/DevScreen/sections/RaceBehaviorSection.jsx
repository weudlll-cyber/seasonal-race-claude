// ============================================================
// File:        RaceBehaviorSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceBehaviorSection.jsx
// Project:     RaceArena
// Created:     2026-04-27
// Description: Dev-Screen tuning UI for D11 race behavior (soft avoidance
//              + drafting). Follows the SpeedScaleSection / BaseSpeedSection
//              live-apply pattern (D3.5.5 idiom).
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../../modules/raceBehaviorConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function RaceBehaviorSection() {
  const [config, setConfig] = useState(() => loadRaceBehaviorConfig());

  useEffect(() => {
    saveRaceBehaviorConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_RACE_BEHAVIOR_CONFIG });
  }

  const off = !config.enabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Toggle + Reset ── */}
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Race Behavior</span>
          <InfoTooltip text="Enables soft avoidance (racers nudge apart when close) and drafting (trailing racer gets a speed boost while in the slipstream). Both mechanics are applied every frame and respect the tunable values below." />
          <span className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={handleReset}
            style={{ fontSize: '0.75rem' }}
          >
            Reset Defaults
          </button>
        </div>

        <div className={s.formGrid}>
          <div className={s.formGroupFull}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
                aria-label="Enabled"
              />
              Enabled
              <InfoTooltip text="When off, racers run independently with no avoidance or drafting. Lane offsets are static (pre-D11 behaviour)." />
            </label>
          </div>
        </div>
      </div>

      {/* ── Avoidance ── */}
      <div className={s.card} style={{ opacity: off ? 0.45 : 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Soft Avoidance
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Avoidance Distance (px)
              <InfoTooltip text="World-pixel radius within which two racers start avoiding each other. Larger = racers start shifting further apart earlier. Default 80." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Avoidance Distance (px)"
              min={10}
              max={300}
              step={5}
              value={config.avoidanceDistance}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('avoidanceDistance', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lateral Force (per frame)
              <InfoTooltip text="How fast a racer shifts sideways when avoiding. Value is normalized track-offset change per frame at 60 fps. Default 0.004." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Lateral Force (per frame)"
              min={0.0005}
              max={0.05}
              step={0.0005}
              value={config.avoidanceLateralForce}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('avoidanceLateralForce', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Lateral Offset
              <InfoTooltip text="Maximum normalized offset deviation from a racer's home lane during avoidance (0 = centre, 0.5 = track edge). Default 0.18." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Max Lateral Offset"
              min={0.01}
              max={0.45}
              step={0.01}
              value={config.avoidanceMaxLateral}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 0.45) set('avoidanceMaxLateral', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Speed Brake
              <InfoTooltip text="Speed multiplier applied when a racer is actively avoiding another. 0.95 = 5% slower. Prevents racers tunnelling through each other at high speed. Default 0.95." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Speed Brake"
              min={0.5}
              max={1}
              step={0.01}
              value={config.avoidanceSpeedBrake}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) set('avoidanceSpeedBrake', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Return Speed
              <InfoTooltip text="Interpolation fraction per frame for returning to home lane after avoidance ends. 0.05 = smooth return over ~20 frames. Default 0.05." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Return Speed"
              min={0.005}
              max={0.5}
              step={0.005}
              value={config.avoidanceReturnSpeed}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 1) set('avoidanceReturnSpeed', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Drafting ── */}
      <div className={s.card} style={{ opacity: off ? 0.45 : 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Drafting / Slipstream
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Drafting Distance (t)
              <InfoTooltip text="How close in track fraction (t) a follower must be to the racer ahead to get a slipstream boost. 0.02 ≈ 2% of one lap. Default 0.02." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Drafting Distance (t)"
              min={0.001}
              max={0.2}
              step={0.001}
              value={config.draftingDistanceT}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('draftingDistanceT', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lane Threshold
              <InfoTooltip text="Maximum normalized lane-offset difference for drafting to apply. 0.15 means follower must be within ~15% of the leader's lane offset. Default 0.15." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Lane Threshold"
              min={0.01}
              max={0.5}
              step={0.01}
              value={config.draftingLaneThreshold}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('draftingLaneThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Boost Factor
              <InfoTooltip text="Speed multiplier applied to the drafting racer's base speed. 1.10 = 10% faster while in the slipstream. Default 1.10." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Boost Factor"
              min={1}
              max={2}
              step={0.01}
              value={config.draftingBoostFactor}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) set('draftingBoostFactor', v);
              }}
            />
          </div>
        </div>

        {/* Quick summary */}
        <p
          data-testid="drafting-summary"
          style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}
        >
          At defaults: follower within{' '}
          <strong>{(config.draftingDistanceT * 100).toFixed(1)}%</strong> of a lap and within{' '}
          <strong>{(config.draftingLaneThreshold * 100).toFixed(0)}%</strong> lane offset receives a{' '}
          <strong style={{ color: 'var(--color-accent)' }}>
            +{((config.draftingBoostFactor - 1) * 100).toFixed(0)}%
          </strong>{' '}
          speed boost.
        </p>
      </div>
    </div>
  );
}

export default RaceBehaviorSection;
