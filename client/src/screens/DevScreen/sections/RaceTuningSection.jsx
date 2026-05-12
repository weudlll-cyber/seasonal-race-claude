// ============================================================
// File:        RaceTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Consolidated Race Tuning section — 10 blocks in storyline order:
//              Speed Range, Start Layout, Row Start, Speed Re-Roll,
//              Drafting, Comfort Zone, Soft Avoidance, Speed Brake, Home Force,
//              Avoidance Advanced (strictness + hidden constants + start phase).
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
function SubCard({ title, subtitle, children, disabled, onReset, resetTestId }) {
  return (
    <div className={s.card} style={{ opacity: disabled ? 0.45 : 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: subtitle ? '0.2rem' : '0.75rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</span>
        <span className={s.spacer} />
        {onReset && (
          <button
            onClick={onReset}
            data-testid={resetTestId}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: '0.1rem 0.2rem',
              opacity: 0.7,
            }}
          >
            Reset
          </button>
        )}
      </div>
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

  function resetSpeedRange() {
    setSpeedConfig((prev) => ({
      ...prev,
      min: DEFAULT_BASE_SPEED_CONFIG.min,
      max: DEFAULT_BASE_SPEED_CONFIG.max,
    }));
  }

  function resetStartLayout() {
    setBehaviorConfig((prev) => ({
      ...prev,
      startSpreadRange: DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange,
      runoutZone: DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone,
    }));
  }

  function resetRowStart() {
    setRowConfig((prev) => ({
      ...prev,
      rowGapMultiplier: DEFAULT_ROW_LAYOUT_CONFIG.rowGapMultiplier,
      speedBonusFactor: DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor,
      maxCapacityFactor: DEFAULT_ROW_LAYOUT_CONFIG.maxCapacityFactor,
    }));
  }

  function resetSpeedReRoll() {
    setDynamicsConfig({ ...DEFAULT_RACE_DYNAMICS_CONFIG });
  }

  function resetDrafting() {
    setBehaviorConfig((prev) => ({
      ...prev,
      draftingMaxDistance: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingMaxDistance,
      draftingConeAngle: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingConeAngle,
      draftingBoost: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoost,
      draftingMaxTargets: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingMaxTargets,
    }));
  }

  function resetAvoidanceAdvanced() {
    setBehaviorConfig((prev) => ({
      ...prev,
      avoidanceStrictness: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceStrictness,
      symmetricAvoidance: DEFAULT_RACE_BEHAVIOR_CONFIG.symmetricAvoidance,
      minLateralEpsilon: DEFAULT_RACE_BEHAVIOR_CONFIG.minLateralEpsilon,
      crowdNormalizationExponent: DEFAULT_RACE_BEHAVIOR_CONFIG.crowdNormalizationExponent,
      startPhaseSpreadThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.startPhaseSpreadThreshold,
      startPhaseAvoidanceFactor: DEFAULT_RACE_BEHAVIOR_CONFIG.startPhaseAvoidanceFactor,
      startPhaseHomeForceFactor: DEFAULT_RACE_BEHAVIOR_CONFIG.startPhaseHomeForceFactor,
    }));
  }

  function resetComfortZone() {
    setBehaviorConfig((prev) => ({
      ...prev,
      comfortThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.comfortThreshold,
      softRepulsionStrength: DEFAULT_RACE_BEHAVIOR_CONFIG.softRepulsionStrength,
    }));
  }

  function resetSoftAvoidance() {
    setBehaviorConfig((prev) => ({
      ...prev,
      avoidanceDistance: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance,
      tWeight: DEFAULT_RACE_BEHAVIOR_CONFIG.tWeight,
      yWeight: DEFAULT_RACE_BEHAVIOR_CONFIG.yWeight,
      lateralForce: DEFAULT_RACE_BEHAVIOR_CONFIG.lateralForce,
      maxLateral: DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateral,
    }));
  }

  function resetSpeedBrake() {
    setBehaviorConfig((prev) => ({
      ...prev,
      speedBrakeYThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeYThreshold,
      speedBrakeTThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTThreshold,
      speedBrakeFactor: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor,
    }));
  }

  function resetHomeForce() {
    setBehaviorConfig((prev) => ({
      ...prev,
      homeForceStrength: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength,
    }));
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
          Fine-tune how races feel and play out. These settings control race physics — how racers
          move, how they react to each other, and how exciting or predictable the action is.
          You&rsquo;ll usually set these once during initial calibration and only revisit them if
          races feel wrong.
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
        onReset={resetSpeedRange}
        resetTestId="reset-speed-range"
        subtitle="The slowest and fastest base speeds racers can have. At the start of each race, every racer gets a random base speed somewhere in this range. A wider range creates more dramatic differences between racers — clear leaders and stragglers. A narrower range keeps races close and competitive."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Speed
              <InfoTooltip text="The slowest possible base speed for a racer. Lower values mean some racers can fall well behind." />
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
              <InfoTooltip text="The fastest possible base speed for a racer. Higher values mean some racers can pull far ahead." />
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
        onReset={resetStartLayout}
        resetTestId="reset-start-layout"
        subtitle="How racers are positioned at the start and how the finish area is laid out. Affects whether racers begin tightly packed or spread out, and how much space there is to celebrate the finish before they leave the screen."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Start Spread Range
              <InfoTooltip text="How spread out racers are at the starting line, relative to the track. Higher = racers start more spread out across the track. Lower = racers start in a tighter cluster." />
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
              <InfoTooltip text="How much track space is reserved beyond the finish line for celebration. Higher = more room for finishers to coast and celebrate. Lower = race ends more abruptly at the line." />
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
        onReset={resetRowStart}
        resetTestId="reset-row-start"
        subtitle="With many racers, they don't all fit in one starting row — they line up in multiple rows, like cars at a Grand Prix. This block controls the row spacing, how many racers fit per row, and how to compensate back-row racers so they aren't doomed by their starting position."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Row Gap Multiplier
              <InfoTooltip text="How much space is between starting rows. Higher = rows further apart, more spread out start. Lower = rows tightly packed, more compact start." />
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
              <InfoTooltip text="How much extra speed is given to back-row racers to compensate for starting further back. 1.0 = full compensation, they have a fair chance. 0 = no compensation, front row has a big advantage." />
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
              <InfoTooltip text="How wide the starting rows are — controls how many racers fit in each row before adding another row. Higher = wider rows, fewer rows total. Lower = narrower rows, more rows." />
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
        onReset={resetSpeedReRoll}
        resetTestId="reset-speed-reroll"
        subtitle="During a race, each racer's speed gets re-rolled periodically — meaning their speed changes from time to time, creating dramatic shifts. This is what makes leads change and prevents predictable outcomes. Without this, the fastest racer at the start would just stay in front the whole race."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Variation Width (%)
              <InfoTooltip text="How much a racer's speed can change per re-roll. Higher = dramatic position changes, faster races and slower races mix things up. Lower = subtle shifts, more predictable order." />
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
              <InfoTooltip text="How smoothly the speed change happens (in seconds). Higher = cinematic slow shifts, looks dramatic. Lower = snappy reactive changes, feels more dynamic." />
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
              <InfoTooltip text="Roughly how many seconds between re-rolls. Lower = more frequent shifts, very chaotic races. Higher = fewer shifts, calmer races." />
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
              <InfoTooltip text="When during the race the last re-roll happens, as percentage of race duration. Higher = action keeps changing right until near the end. Lower = a calm final stretch where the leader can hold their position." />
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
        onReset={resetDrafting}
        resetTestId="reset-drafting"
        subtitle="When a racer follows closely behind another racer, they get a small speed boost from the slipstream — just like in real-world cycling or motor sports. This makes overtaking on straight sections possible. Without drafting, slow racers would never catch up; with too much, racers chain together in dense pelotons."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Distance (world px)
              <InfoTooltip text="How close behind another racer you need to be to get the boost (in pixels on screen). Higher = drafting works from further away, easier to use. Lower = you have to follow very closely to get the benefit." />
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
              <InfoTooltip text="How wide the slipstream zone is behind each racer (in degrees). Wider = drafting works even when not directly behind, easier on curves. Narrower = you have to be straight behind to get the boost." />
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
              <InfoTooltip text="How much of a speed boost a drafting racer gets. 1.10 = +10%. Higher = stronger boost makes overtaking easier but can cause whole packs of racers to bunch together. Lower = subtle boost, less peloton risk." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Slipstream Targets
              <InfoTooltip text="How many racers ahead can grant a drafting boost at the same time. 1 = only the nearest leader helps. Higher = dense packs chain together — every racer in the slipstream benefits, creating peloton-like clusters." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Max Slipstream Targets"
              min={1}
              max={5}
              step={1}
              value={behaviorConfig.draftingMaxTargets}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isInteger(v) && v >= 1 && v <= 5) setBehavior('draftingMaxTargets', v);
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
          speed boost · up to <strong>{behaviorConfig.draftingMaxTargets}</strong> leader
          {behaviorConfig.draftingMaxTargets === 1 ? '' : 's'} at a time.
        </p>
      </SubCard>

      {/* ── Block 6: Comfort Zone ── */}
      <SubCard
        title="Comfort Zone"
        onReset={resetComfortZone}
        resetTestId="reset-comfort-zone"
        subtitle="Racers have a personal space bubble — when another racer gets too close, they automatically push apart to keep some breathing room. This block controls how big the bubble is and how forcefully racers react when crowded. Looser values create open spacious races; tighter values let racers form dense packs."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Comfort Threshold
              <InfoTooltip text="How early a racer reacts when another racer comes close. Higher = racers stay further apart, more spacious feel. Lower = racers tolerate close racing, denser packs." />
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
              <InfoTooltip text="How forcefully racers move away when crowded. Higher = visible swerve when crowded. Lower = subtle drift, racers barely react." />
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
        onReset={resetSoftAvoidance}
        resetTestId="reset-soft-avoidance"
        subtitle="When racers are about to collide, they steer around each other instead of overlapping. This block fine-tunes how they detect and avoid each other — how far ahead they look, whether they prioritize racers in front or to the side, and how strong their evasive maneuvers are. Affects the smoothness and realism of close racing."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Avoidance Distance
              <InfoTooltip text="How far ahead racers look to detect collision risk. Higher = early smooth steering, races look graceful. Lower = last-second corrections, looks more chaotic." />
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
              <InfoTooltip text="How much racers care about avoiding collisions with someone directly in front. Higher = strong reaction to racers ahead, prefers to swerve around. Lower = less concerned with what's directly ahead." />
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
              <InfoTooltip text="How much racers care about avoiding collisions with someone to the side. Higher = strong reaction to racers next to them. Lower = less concerned with sideways neighbors." />
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
              <InfoTooltip text="How forcefully racers steer sideways to avoid collisions. Higher = decisive sharp steering. Lower = gentle subtle drifts." />
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
              <InfoTooltip text="Maximum sideways position deviation allowed during avoidance. Caps how far a racer can swerve from their lane to dodge another." />
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
        onReset={resetSpeedBrake}
        resetTestId="reset-speed-brake"
        subtitle="When a racer ends up directly behind another racer with no clear way to overtake, they slow down a bit instead of rear-ending them. This block controls when the brake kicks in (how close, how directly behind) and how strongly they slow down. Prevents visual collisions in tight packs."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Adjacent Y Threshold
              <InfoTooltip text="How sideways-aligned racers have to be for the brake to activate. Lower = only directly-behind racers brake. Higher = racers brake even when slightly off to the side." />
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
              <InfoTooltip text="How close behind another racer triggers the brake. Higher = brakes activate earlier from further behind. Lower = only very close trailing racers brake." />
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
              <InfoTooltip text="How much a braking racer slows down. 0.95 = -5% speed. Lower = stronger braking, racer falls back more. Higher = subtle braking, barely noticeable." />
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
        onReset={resetHomeForce}
        resetTestId="reset-home-force"
        subtitle="The track has a centerline that racers naturally follow. After they swerve off-line (to avoid collisions, drafting, or just by chance), this force gently pulls them back to the center. Without it, racers would drift off forever; with too much, they snap back unrealistically."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Home Force Strength
              <InfoTooltip text="How strongly racers return to the track centerline after deviating. Higher = quick return, tight racing lines. Lower = racers drift longer before recentering, more wandering feel." />
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

      {/* ── Block 10: Avoidance Advanced ── */}
      <SubCard
        title="Avoidance Advanced"
        onReset={resetAvoidanceAdvanced}
        resetTestId="reset-avoidance-advanced"
        subtitle="Expert controls for racer separation behaviour. Avoidance Strictness is the main dial — it proportionally amplifies both force and detection range. The other parameters expose physical constants that were previously hard-coded and are only worth touching when Strictness alone does not give the result you need."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Avoidance Strictness
              <InfoTooltip text="Master scaler for how strongly racers separate from each other. 0 = minimal avoidance (racers may overlap), 0.5 = balanced default, 1 = strict separation with strong forces and wide detection range. Scales both lateral force and avoidance distance proportionally." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Avoidance Strictness"
              min={0}
              max={1}
              step={0.05}
              value={behaviorConfig.avoidanceStrictness}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setBehavior('avoidanceStrictness', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Crowd Normalization Exponent
              <InfoTooltip text="Reduces avoidance force when a racer is surrounded by many neighbors. 0 = no reduction (each pair pushes full force), 0.5 = force divided by √neighbors (default), 1 = force divided by neighbor count (strong damping in crowds)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Crowd Normalization Exponent"
              min={0}
              max={1}
              step={0.05}
              value={behaviorConfig.crowdNormalizationExponent}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setBehavior('crowdNormalizationExponent', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Lateral Epsilon
              <InfoTooltip text="Minimum lateral distance difference before avoidance direction is determined from position. Below this threshold, tie-breaking by racer index is used instead. Prevents flip-flopping when two racers are at nearly the same lateral position." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Min Lateral Epsilon"
              min={0.001}
              max={0.1}
              step={0.001}
              value={behaviorConfig.minLateralEpsilon}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 0.1) setBehavior('minLateralEpsilon', v);
              }}
            />
          </div>
          <div className={s.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={behaviorConfig.symmetricAvoidance}
                disabled={!behaviorConfig.enabled}
                onChange={(e) => setBehavior('symmetricAvoidance', e.target.checked)}
                style={{ cursor: 'pointer' }}
                aria-label="Symmetric Avoidance"
              />
              Symmetric Avoidance
              <InfoTooltip text="When on, both racers share the avoidance push (each gets half force). When off, only the trailing racer yields. Symmetric avoidance prevents the leader from staying glued to the centerline while the trailer tries to escape." />
            </label>
          </div>
        </div>

        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <p
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--color-muted)',
              marginBottom: '0.6rem',
            }}
          >
            Start Phase
          </p>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Spread Threshold
                <InfoTooltip text="Field spread (max t − min t) at which start-phase damping ends and normal race forces apply. Once the pack spreads beyond this, the transition is permanent. Lower = phase ends sooner. Higher = damped forces last longer into the race." />
              </label>
              <input
                type="number"
                className={s.input}
                aria-label="Start Phase Spread Threshold"
                min={0.01}
                max={0.2}
                step={0.01}
                value={behaviorConfig.startPhaseSpreadThreshold}
                disabled={!behaviorConfig.enabled}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0 && v <= 0.2) setBehavior('startPhaseSpreadThreshold', v);
                }}
              />
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Avoidance Factor (start)
                <InfoTooltip text="Multiplier on avoidance force during the start phase. Lower = racers stay packed at the start without being pushed apart. Higher = avoidance acts at full strength from the gun. 0 = no separation at all during start phase." />
              </label>
              <input
                type="number"
                className={s.input}
                aria-label="Start Phase Avoidance Factor"
                min={0}
                max={1}
                step={0.05}
                value={behaviorConfig.startPhaseAvoidanceFactor}
                disabled={!behaviorConfig.enabled}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 0 && v <= 1) setBehavior('startPhaseAvoidanceFactor', v);
                }}
              />
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Home Force Factor (start)
                <InfoTooltip text="Multiplier on home force during the start phase. Lower = pack doesn't collapse to the centerline before racers have spread out. Higher = racers immediately pull toward center even in the start pack." />
              </label>
              <input
                type="number"
                className={s.input}
                aria-label="Start Phase Home Force Factor"
                min={0}
                max={1}
                step={0.05}
                value={behaviorConfig.startPhaseHomeForceFactor}
                disabled={!behaviorConfig.enabled}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 0 && v <= 1) setBehavior('startPhaseHomeForceFactor', v);
                }}
              />
            </div>
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
