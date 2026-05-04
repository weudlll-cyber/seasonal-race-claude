// ============================================================
// File:        RaceTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Consolidated Race Tuning section — 9 blocks in storyline order:
//              Speed Range, Start Layout, Row Start, Speed Re-Roll,
//              Drafting, Comfort Zone, Soft Avoidance, Speed Brake, Home Force.
//              Combines content from former BaseSpeedSection + RaceBehaviorSection
//              + new raceDynamicsConfig (PR-A2.6 re-roll values).
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadBaseSpeedConfig,
  saveBaseSpeedConfig,
  DEFAULT_BASE_SPEED_CONFIG,
  spreadPercent,
} from '../../../modules/baseSpeedConfig.js';
import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../../modules/raceBehaviorConfig.js';
import {
  loadRowLayoutConfig,
  saveRowLayoutConfig,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../../../modules/rowLayoutConfig.js';
import {
  loadRaceDynamicsConfig,
  saveRaceDynamicsConfig,
  DEFAULT_RACE_DYNAMICS_CONFIG,
} from '../../../modules/raceDynamicsConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

// ── Sub-Card wrapper ──────────────────────────────────────────────────────────
function SubCard({ title, subtitle, children, disabled }) {
  return (
    <div className={s.card} style={{ opacity: disabled ? 0.45 : 1 }}>
      <p
        style={{
          fontWeight: 600,
          fontSize: '0.9rem',
          marginBottom: subtitle ? '0.2rem' : '0.75rem',
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

function RaceTuningSection() {
  const [speedConfig, setSpeedConfig] = useState(() => loadBaseSpeedConfig());
  const [behaviorConfig, setBehaviorConfig] = useState(() => loadRaceBehaviorConfig());
  const [rowConfig, setRowConfig] = useState(() => loadRowLayoutConfig());
  const [dynamicsConfig, setDynamicsConfig] = useState(() => loadRaceDynamicsConfig());
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    saveBaseSpeedConfig(speedConfig);
  }, [speedConfig]);

  useEffect(() => {
    const ok = saveRaceBehaviorConfig(behaviorConfig);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [behaviorConfig]);

  useEffect(() => {
    const ok = saveRowLayoutConfig(rowConfig);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [rowConfig]);

  useEffect(() => {
    saveRaceDynamicsConfig(dynamicsConfig);
  }, [dynamicsConfig]);

  function setSpeed(key, val) {
    setSpeedConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setBehavior(key, val) {
    setBehaviorConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setRow(key, val) {
    setRowConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setDynamics(key, val) {
    setDynamicsConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setSpeedConfig({ ...DEFAULT_BASE_SPEED_CONFIG });
    setBehaviorConfig({ ...DEFAULT_RACE_BEHAVIOR_CONFIG });
    setRowConfig({ ...DEFAULT_ROW_LAYOUT_CONFIG });
    setDynamicsConfig({ ...DEFAULT_RACE_DYNAMICS_CONFIG });
  }

  // Speed Range preview
  const spread = spreadPercent(speedConfig.min, speedConfig.max);
  const mean = ((speedConfig.min + speedConfig.max) / 2).toFixed(5);
  const speedValid = speedConfig.min > 0 && speedConfig.min < speedConfig.max;

  // Re-Roll preview
  const rollCount = (duration) =>
    Math.max(2, Math.floor(duration / dynamicsConfig.reRollIntervalDivisor));
  const rollTimes = (duration) => {
    const n = rollCount(duration);
    const interval = ((dynamicsConfig.reRollLastPositionPercent / 100) * duration) / n;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * interval));
  };
  const PREVIEW_DURATION = 60;
  const previewTimes = rollTimes(PREVIEW_DURATION);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Section header */}
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Race Tuning</span>
          <span className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={handleReset}
            style={{ fontSize: '0.75rem' }}
          >
            Reset All Defaults
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Fine-tune race physics and dynamics. These values are typically set once during initial
          calibration and rarely changed during regular operation.
        </p>
      </div>

      {storageError && (
        <p style={{ color: 'var(--color-error, #e55)', margin: 0, fontSize: '0.85rem' }}>
          ⚠ {storageError}
        </p>
      )}

      {/* ── Block 1: Speed Range ── */}
      <SubCard
        title="Speed Range"
        subtitle="Defines the slowest and fastest possible base speeds for racers. Tune min/max range — wider = more drama, narrower = closer races."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Speed
              <InfoTooltip text="Minimum base speed any racer can have. Defines the lower bound of the spread distribution at race start." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.0001}
              max={0.005}
              step={0.00001}
              value={speedConfig.min}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < speedConfig.max) setSpeed('min', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Speed
              <InfoTooltip text="Maximum base speed any racer can have. Defines the upper bound of the spread distribution at race start." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.0001}
              max={0.005}
              step={0.00001}
              value={speedConfig.max}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > speedConfig.min) setSpeed('max', v);
              }}
            />
          </div>
        </div>
        {/* Spread preview */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#0d0d0f',
            borderRadius: 'var(--radius)',
          }}
        >
          <p
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--color-muted)',
              marginBottom: '0.4rem',
            }}
          >
            Spread Preview
          </p>
          {speedValid ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              Mean: <strong style={{ color: 'var(--color-accent)' }}>{mean}</strong>
              {'  ·  '}
              Spread:{' '}
              <strong
                style={{
                  color: spread > 20 ? '#f59e0b' : spread > 15 ? '#fb923c' : 'var(--color-accent)',
                }}
              >
                ±{spread.toFixed(1)}%
              </strong>{' '}
              from mean ({(spread * 2).toFixed(0)}% total range)
              {'  ·  '}
              On a 2-lap race: leader finishes ~
              <strong>{(2 * (1 - speedConfig.min / speedConfig.max)).toFixed(2)} laps</strong> ahead
              of last
              <InfoTooltip text="gap = 2 × (1 − min/max). When the leader crosses 2 laps, the slowest racer is at 2 × (min/max) laps. Jitter adds per-racer oscillation on top. This is a closed-track estimate — open tracks end differently." />
            </p>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#ef4444' }}>
              Invalid: min must be &gt; 0 and &lt; max.
            </p>
          )}
        </div>
      </SubCard>

      {/* ── Block 2: Start Layout ── */}
      <SubCard
        title="Start Layout"
        subtitle="How racers are distributed at the starting line and beyond the finish."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Start Spread Range
              <InfoTooltip text="Half-width of the initial lateral spread at race start, in normalized track-width units. Racers are placed evenly from −range to +range across the start line (like real-race grid positions). 0.95 uses 95% of each half-width — the formula uses this as effectiveWidth so the packing calculation matches actual placement. Range 0.1 (narrow pack) to 1.0 (edge-to-edge)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Start Spread Range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={behaviorConfig.startSpreadRange}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) setBehavior('startSpreadRange', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Runout Zone
              <InfoTooltip text="Fraction of the track path reserved for run-out after the finish line, on open tracks only. At 0.05 (5%) the finish line sits at 95% of the track — racers cross it then coast to the end. Closed tracks are unaffected (they use the runoutDecay system). Range 0.0–0.20." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Runout Zone"
              min={0.0}
              max={0.2}
              step={0.01}
              value={behaviorConfig.runoutZone}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 0.2) setBehavior('runoutZone', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 3: Row Start ── */}
      <SubCard
        title="Row Start"
        subtitle="How racers are arranged in starting rows and how back-row racers are compensated for starting further back."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Row Gap Multiplier
              <InfoTooltip text="Distance between rows expressed as a multiple of the rendered sprite size. At 1.5× the rows are 1.5 sprite-heights apart at race start. Lower values compress rows closer together (can look crowded); higher values spread them further back (longer stagger). Range 0.5–4.0." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Row Gap Multiplier"
              min={0.5}
              max={4.0}
              step={0.1}
              value={rowConfig.rowGapMultiplier}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 4.0) setRow('rowGapMultiplier', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Speed Bonus Factor
              <InfoTooltip text="Controls how much of the physical start-distance disadvantage rear rows get back as a permanent speed bonus. 1.0 = full compensation (pole position has zero mathematical advantage). 0.0 = no compensation (front row always wins on average). Values above 1.0 over-compensate, giving rear rows a net advantage. Range 0.0–2.0." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Speed Bonus Factor"
              min={0.0}
              max={2.0}
              step={0.1}
              value={rowConfig.speedBonusFactor}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 2.0) setRow('speedBonusFactor', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Capacity Factor
              <InfoTooltip text="Fraction of the total track path length that the rearmost starting row may occupy. 0.3 means the last row can be at most 30% of the track length behind the start line. Used to auto-calculate the recommended max-racers value on each track. Too high and the last row wraps almost back to the finish line. Range 0.1–0.6." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Max Capacity Factor"
              min={0.1}
              max={0.6}
              step={0.05}
              value={rowConfig.maxCapacityFactor}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.1 && v <= 0.6) setRow('maxCapacityFactor', v);
              }}
            />
          </div>
        </div>
        <p
          data-testid="row-start-summary"
          style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}
        >
          Racers per row auto-computed from track geometry · gap{' '}
          <strong>{rowConfig.rowGapMultiplier}×</strong> sprite size ·{' '}
          <strong>
            {rowConfig.speedBonusFactor === 1.0
              ? 'full'
              : rowConfig.speedBonusFactor === 0
                ? 'no'
                : `${Math.round(rowConfig.speedBonusFactor * 100)}%`}
          </strong>{' '}
          speed compensation.
        </p>
      </SubCard>

      {/* ── Block 4: Speed Re-Roll ── */}
      <SubCard
        title="Speed Re-Roll"
        subtitle="Periodically re-rolls each racer's speed during the race. Creates lead changes and prevents predictable outcomes."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Variation Width (%)
              <InfoTooltip text="How much each racer's speed can shift per re-roll, as percentage of the full speed range. Higher values create more dramatic position changes; lower values feel more predictable." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Re-Roll Variation Percent"
              min={10}
              max={150}
              step={5}
              value={dynamicsConfig.reRollVariationPercent}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 10 && v <= 150) setDynamics('reRollVariationPercent', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Transition Smoothness (s)
              <InfoTooltip text="How long the smooth transition lasts when a racer's speed changes during a re-roll. Higher values create more cinematic shifts, lower values feel snappier." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Re-Roll Transition Duration"
              min={0.5}
              max={10.0}
              step={0.5}
              value={dynamicsConfig.reRollTransitionDuration}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 10) setDynamics('reRollTransitionDuration', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Re-Roll Frequency (÷ interval)
              <InfoTooltip text="Approximate seconds between re-rolls. Race duration determines exact roll count: count = max(2, floor(duration ÷ this value)). Lower values create more frequent shifts." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Re-Roll Interval Divisor"
              min={5}
              max={30}
              step={1}
              value={dynamicsConfig.reRollIntervalDivisor}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 5 && v <= 30) setDynamics('reRollIntervalDivisor', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Last Roll Position (%)
              <InfoTooltip text="When the last re-roll happens, as percentage of race duration. Higher values keep the race dynamic until near the end; lower values create a calmer final stretch." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Re-Roll Last Position Percent"
              min={50}
              max={95}
              step={5}
              value={dynamicsConfig.reRollLastPositionPercent}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 50 && v <= 95) setDynamics('reRollLastPositionPercent', v);
              }}
            />
          </div>
        </div>
        {/* Re-Roll Live Preview */}
        <div
          data-testid="reroll-preview"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#0d0d0f',
            borderRadius: 'var(--radius)',
          }}
        >
          <p
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--color-muted)',
              marginBottom: '0.4rem',
            }}
          >
            Re-Roll Preview — {PREVIEW_DURATION}s race
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            <strong style={{ color: 'var(--color-accent)' }}>{previewTimes.length} re-rolls</strong>
            {' at '}
            {previewTimes.map((t, i) => (
              <span key={i}>
                <strong style={{ color: 'var(--color-text)' }}>{t}s</strong>
                {i < previewTimes.length - 1 ? ', ' : ''}
              </span>
            ))}
            {'  ·  '}
            Final stretch:{' '}
            <strong>
              {Math.round(PREVIEW_DURATION * (1 - dynamicsConfig.reRollLastPositionPercent / 100))}s
            </strong>
            {'  ·  '}
            Transition: <strong>{dynamicsConfig.reRollTransitionDuration}s</strong>
          </p>
        </div>
      </SubCard>

      {/* ── Block 5: Drafting / Slipstream ── */}
      <SubCard
        title="Drafting / Slipstream"
        subtitle="Slipstream effect — racers behind another racer get a small speed boost. Enables overtaking on straights."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Distance (world px)
              <InfoTooltip text="Maximum distance in world pixels at which a trailing racer can benefit from another racer's slipstream. Smaller values require closer following to enable drafting." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Drafting Max Distance (world px)"
              min={10}
              max={300}
              step={5}
              value={behaviorConfig.draftingMaxDistance}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('draftingMaxDistance', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Cone Angle (°)
              <InfoTooltip text="Angular width of the slipstream zone behind each racer, in degrees. Wider cones make drafting easier on curves; narrower cones require more direct following." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Drafting Cone Angle"
              min={5}
              max={89}
              step={5}
              value={behaviorConfig.draftingConeAngle}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 180) setBehavior('draftingConeAngle', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Boost Factor
              <InfoTooltip text="Speed multiplier applied to a drafting racer. 1.10 = 10% boost. Higher values create stronger pelotons but can cause chain effects where everyone bunches together." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Boost Factor"
              min={1}
              max={2}
              step={0.01}
              value={behaviorConfig.draftingBoost}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) setBehavior('draftingBoost', v);
              }}
            />
          </div>
        </div>
        <p
          data-testid="drafting-summary"
          style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}
        >
          At defaults: follower within <strong>{behaviorConfig.draftingMaxDistance} px</strong> and
          within a <strong>{behaviorConfig.draftingConeAngle}°</strong> cone receives a{' '}
          <strong style={{ color: 'var(--color-accent)' }}>
            +{((behaviorConfig.draftingBoost - 1) * 100).toFixed(0)}%
          </strong>{' '}
          speed boost.
        </p>
      </SubCard>

      {/* ── Block 6: Comfort Zone ── */}
      <SubCard
        title="Comfort Zone"
        subtitle="How close racers can get to each other before they automatically adjust position."
        disabled={!behaviorConfig.enabled}
      >
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
              value={behaviorConfig.comfortThreshold}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 1) setBehavior('comfortThreshold', v);
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
              value={behaviorConfig.softRepulsionStrength}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('softRepulsionStrength', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 7: Soft Avoidance ── */}
      <SubCard
        title="Soft Avoidance"
        subtitle="How racers steer around each other to avoid collisions, and how strong the avoidance force is."
        disabled={!behaviorConfig.enabled}
      >
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
              value={behaviorConfig.avoidanceDistance}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('avoidanceDistance', v);
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
              value={behaviorConfig.tWeight}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('tWeight', v);
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
              value={behaviorConfig.yWeight}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('yWeight', v);
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
              value={behaviorConfig.lateralForce}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('lateralForce', v);
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
              value={behaviorConfig.maxLateral}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) setBehavior('maxLateral', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 8: Speed Brake ── */}
      <SubCard
        title="Speed Brake"
        subtitle="When and how strongly racers brake when another racer is directly ahead."
        disabled={!behaviorConfig.enabled}
      >
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
              value={behaviorConfig.speedBrakeYThreshold}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('speedBrakeYThreshold', v);
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
              value={behaviorConfig.speedBrakeTThreshold}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('speedBrakeTThreshold', v);
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
              value={behaviorConfig.speedBrakeFactor}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) setBehavior('speedBrakeFactor', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 9: Home Force ── */}
      <SubCard
        title="Home Force"
        subtitle="How strongly racers return to the track centerline after deviating."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Home Force Strength
              <InfoTooltip text="Spring constant pulling each racer back toward the centerline (physicalY = 0). Applied every frame as Δy = −physicalY × strength. Higher = faster return. At default 0.04 a racer at the boundary converges ~95% within 1.5 s at 60 fps. Range 0.005 (very slow) to 0.1 (very fast)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Home Force Strength"
              min={0.005}
              max={0.1}
              step={0.002}
              value={behaviorConfig.homeForceStrength}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setBehavior('homeForceStrength', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* Race Behavior toggle (hidden but functional — keeps the enabled flag accessible) */}
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              checked={behaviorConfig.enabled}
              onChange={(e) => setBehavior('enabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
              aria-label="Race Behavior Enabled"
            />
            Race Behavior Enabled
            <InfoTooltip text="When off, racers run independently with no avoidance or drafting. physicalY stays at 0 (centerline). Blocks 5–9 above are disabled when this is off." />
          </label>
        </div>
      </div>
    </div>
  );
}

export default RaceTuningSection;
