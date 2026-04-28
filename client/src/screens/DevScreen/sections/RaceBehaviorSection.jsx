// ============================================================
// File:        RaceBehaviorSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceBehaviorSection.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Dev-Screen tuning UI for D7b lane-free race behavior.
//              Exposes all physicalY-based parameters for home force,
//              comfort zone, anisotropic avoidance, speed brake, and
//              cone-based drafting. Follows live-apply pattern (D3.5.5).
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
          <InfoTooltip text="Enables lane-free racer behavior (D7b): home force pulls racers toward centerline, anisotropic avoidance keeps them apart, and cone-based drafting gives a slipstream boost. All parameters are tunable below." />
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
              <InfoTooltip text="When off, racers run independently with no avoidance or drafting. physicalY stays at 0 (centerline)." />
            </label>
          </div>
        </div>
      </div>

      {/* ── Home Force ── */}
      <div className={s.card} style={{ opacity: off ? 0.45 : 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Home Force</p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Home Force Strength
              <InfoTooltip text="Spring constant pulling each racer back toward the centerline (physicalY = 0). Applied every frame as Δy = −physicalY × strength. Higher = faster return. At default 0.018 a racer at the boundary converges ~80% within 1.5 s at 60 fps. Range 0.005 (very slow) to 0.1 (very fast)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Home Force Strength"
              min={0.005}
              max={0.1}
              step={0.002}
              value={config.homeForceStrength}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('homeForceStrength', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Comfort Zone & Boundary ── */}
      <div className={s.card} style={{ opacity: off ? 0.45 : 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Comfort Zone &amp; Boundary
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Comfort Threshold
              <InfoTooltip text="Normalized physicalY fraction beyond which soft repulsion kicks in. 0.70 means the inner 70% of each half-width is 'comfortable' — no extra force. Beyond that, a quadratic push steers the racer back. Range 0.3 (repulsion starts early) to 0.95 (almost no repulsion zone)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Comfort Threshold"
              min={0.3}
              max={0.95}
              step={0.05}
              value={config.comfortThreshold}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 1) set('comfortThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Soft Repulsion Strength
              <InfoTooltip text="Multiplier for the quadratic push away from the track boundary. Applied when |physicalY| ≥ comfortThreshold. Higher = stronger wall. Hard clamp at ±1.0 always applies regardless. Range 0.01 (gentle) to 0.3 (firm)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Soft Repulsion Strength"
              min={0.01}
              max={0.3}
              step={0.01}
              value={config.softRepulsionStrength}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('softRepulsionStrength', v);
              }}
            />
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
              Avoidance Distance
              <InfoTooltip text="Threshold in the anisotropic (t, physicalY) distance metric. Two racers interact when sqrt((ΔT×tWeight)² + (ΔY×yWeight)²) is below this value. Default 0.35. Increase to make racers start avoiding each other sooner." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Avoidance Distance"
              min={0.05}
              max={1.0}
              step={0.05}
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
              T Weight
              <InfoTooltip text="Weight applied to the race-progress difference (ΔT) in the anisotropic distance metric. Higher tWeight = a racer directly ahead triggers avoidance sooner than a racer beside you. Default 2.0." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="T Weight"
              min={0.1}
              max={10}
              step={0.1}
              value={config.tWeight}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('tWeight', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Y Weight
              <InfoTooltip text="Weight applied to the physicalY difference (ΔY) in the anisotropic distance metric. Higher yWeight = racers next to you (same t) trigger avoidance sooner. Default 1.0." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Y Weight"
              min={0.1}
              max={10}
              step={0.1}
              value={config.yWeight}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('yWeight', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lateral Force
              <InfoTooltip text="How fast the trailing racer shifts sideways when avoiding. Value is physicalY change per frame at full proximity. At half proximity the force is halved. Default 0.015." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Lateral Force"
              min={0.001}
              max={0.1}
              step={0.001}
              value={config.lateralForce}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('lateralForce', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Lateral
              <InfoTooltip text="Maximum |physicalY| avoidance and home force combined can push a racer to. Hard boundary at ±1.0 always applies. Default 0.95 allows racers to use almost the full track width." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Max Lateral"
              min={0.1}
              max={1.0}
              step={0.05}
              value={config.maxLateral}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) set('maxLateral', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Speed Brake ── */}
      <div className={s.card} style={{ opacity: off ? 0.45 : 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Speed Brake</p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Adjacent Y Threshold
              <InfoTooltip text="|physicalY| difference below which two racers are considered side-by-side (adjacent). The trailing racer then receives a speed penalty. Default 0.20 = within 20% of half-track-width." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Adjacent Y Threshold"
              min={0.01}
              max={0.5}
              step={0.01}
              value={config.speedBrakeYThreshold}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('speedBrakeYThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Adjacent T Threshold
              <InfoTooltip text="|deltaT| (race progress) below which two racers are considered side-by-side. Together with the Y threshold this defines the adjacency zone. Default 0.015 ≈ 1.5% of a lap." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Adjacent T Threshold"
              min={0.001}
              max={0.1}
              step={0.001}
              value={config.speedBrakeTThreshold}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('speedBrakeTThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Speed Brake Factor
              <InfoTooltip text="Speed multiplier applied to the trailing racer when adjacent to another racer. 0.95 = 5% slower. Prevents tunnelling at high speed. Default 0.95." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Speed Brake Factor"
              min={0.5}
              max={1.0}
              step={0.01}
              value={config.speedBrakeFactor}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) set('speedBrakeFactor', v);
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
              Max Distance (world px)
              <InfoTooltip text="World-pixel distance within which a follower can enter the leader's slipstream. Measured from leader to follower in world space. Default 110 px." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Drafting Max Distance (world px)"
              min={10}
              max={300}
              step={5}
              value={config.draftingMaxDistance}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('draftingMaxDistance', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Cone Angle (°)
              <InfoTooltip text="Half-opening angle of the slipstream cone behind the leader, in degrees. The cone opens opposite to the leader's direction of movement. 30° means ±30° from directly behind. Narrower = follower must be more precisely aligned. Default 30°." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Drafting Cone Angle"
              min={5}
              max={89}
              step={5}
              value={config.draftingConeAngle}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 180) set('draftingConeAngle', v);
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
              value={config.draftingBoost}
              disabled={off}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) set('draftingBoost', v);
              }}
            />
          </div>
        </div>

        <p
          data-testid="drafting-summary"
          style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}
        >
          At defaults: follower within <strong>{config.draftingMaxDistance} px</strong> and within a{' '}
          <strong>{config.draftingConeAngle}°</strong> cone receives a{' '}
          <strong style={{ color: 'var(--color-accent)' }}>
            +{((config.draftingBoost - 1) * 100).toFixed(0)}%
          </strong>{' '}
          speed boost.
        </p>
      </div>
    </div>
  );
}

export default RaceBehaviorSection;
