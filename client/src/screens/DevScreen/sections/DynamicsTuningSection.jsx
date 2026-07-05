// ============================================================
// File:        DynamicsTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: DevScreen section — UI controls for race dynamics: base speed,
//              start row layout, race dynamics, and frame timing config.
// ============================================================

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  loadBaseSpeedConfig,
  saveBaseSpeedConfig,
  DEFAULT_BASE_SPEED_CONFIG,
  spreadPercent,
} from '../../../modules/baseSpeedConfig.js';
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
import {
  loadFrameTimingConfig,
  saveFrameTimingConfig,
  DEFAULT_FRAME_TIMING_CONFIG,
} from '../../../modules/frameTimingConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { SubCard } from './SubCard.jsx';
import s from '../DevScreen.module.css';

const RACE_PLAN_TIMING_WARNING_STYLE = {
  fontSize: '0.75rem',
  color: '#f59e0b',
  background: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.28)',
  borderRadius: '4px',
  padding: '0.3rem 0.5rem',
  marginTop: '0.5rem',
  lineHeight: 1.4,
};

const DynamicsTuningSection = forwardRef(function DynamicsTuningSection(_, ref) {
  const [speedConfig, setSpeedConfig] = useState(() => loadBaseSpeedConfig());
  const [rowConfig, setRowConfig] = useState(() => loadRowLayoutConfig());
  const [dynamicsConfig, setDynamicsConfig] = useState(() => loadRaceDynamicsConfig());
  const [frameTimingConfig, setFrameTimingConfig] = useState(() => loadFrameTimingConfig());
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    saveBaseSpeedConfig(speedConfig);
  }, [speedConfig]);

  useEffect(() => {
    const ok = saveRowLayoutConfig(rowConfig);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [rowConfig]);

  useEffect(() => {
    saveRaceDynamicsConfig(dynamicsConfig);
  }, [dynamicsConfig]);

  useEffect(() => {
    saveFrameTimingConfig(frameTimingConfig);
  }, [frameTimingConfig]);

  function setSpeed(key, val) {
    setSpeedConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setRow(key, val) {
    setRowConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setDynamics(key, val) {
    setDynamicsConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setFrameTiming(key, val) {
    setFrameTimingConfig((prev) => ({ ...prev, [key]: val }));
  }

  function resetSpeedRange() {
    setSpeedConfig((prev) => ({
      ...prev,
      min: DEFAULT_BASE_SPEED_CONFIG.min,
      max: DEFAULT_BASE_SPEED_CONFIG.max,
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
    setDynamicsConfig((prev) => ({
      ...prev,
      reRollVariationPercent: DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent,
      reRollTransitionDuration: DEFAULT_RACE_DYNAMICS_CONFIG.reRollTransitionDuration,
      reRollIntervalDivisor: DEFAULT_RACE_DYNAMICS_CONFIG.reRollIntervalDivisor,
      reRollLastPositionPercent: DEFAULT_RACE_DYNAMICS_CONFIG.reRollLastPositionPercent,
      trajectoryTransitionDuration: DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryTransitionDuration,
    }));
  }

  function resetRacePlanBonus() {
    setDynamicsConfig((prev) => ({
      ...prev,
      racePlanBonusStrengthMultiplier: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier,
      racePlanBonusTransitionEnd: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd,
      racePlanBonusFadeDuration: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusFadeDuration,
      racePlanCorridorStart: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart,
      racePlanCorridorEnd: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd,
      racePlanMinDurationSec: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanMinDurationSec,
    }));
  }

  function resetPulkSurge() {
    setDynamicsConfig((prev) => ({
      ...prev,
      pulkSurgeEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeEnabled,
      pulkSurgeFraction: DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeFraction,
      pulkSurgeBonus: DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeBonus,
      pulkSurgeRampInMs: DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeRampInMs,
      pulkSurgeRampOutMs: DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeRampOutMs,
      pulkBrakeExemptStrength: DEFAULT_RACE_DYNAMICS_CONFIG.pulkBrakeExemptStrength,
    }));
  }

  function resetGovernor() {
    setDynamicsConfig((prev) => ({
      ...prev,
      governorEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.governorEnabled,
      governorDrama: DEFAULT_RACE_DYNAMICS_CONFIG.governorDrama,
      governorK0: DEFAULT_RACE_DYNAMICS_CONFIG.governorK0,
      governorLengthMin: DEFAULT_RACE_DYNAMICS_CONFIG.governorLengthMin,
      governorLengthMax: DEFAULT_RACE_DYNAMICS_CONFIG.governorLengthMax,
      governorLengthFloor: DEFAULT_RACE_DYNAMICS_CONFIG.governorLengthFloor,
      governorRampWidth: DEFAULT_RACE_DYNAMICS_CONFIG.governorRampWidth,
      governorAMin: DEFAULT_RACE_DYNAMICS_CONFIG.governorAMin,
      governorAMax: DEFAULT_RACE_DYNAMICS_CONFIG.governorAMax,
      governorFrequency: DEFAULT_RACE_DYNAMICS_CONFIG.governorFrequency,
      governorMaxEffect: DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxEffect,
      governorMaxStepPerFrame: DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxStepPerFrame,
      governorDirectorEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorEnabled,
      governorDirectorCastSize: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorCastSize,
      governorDirectorDwell: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorDwell,
      governorDirectorAnchorOffset: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorAnchorOffset,
      governorDirectorPullStrength: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorPullStrength,
      governorDirectorSettling: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorSettling,
    }));
  }

  function resetFrameTiming() {
    setFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG });
  }

  function resetAll() {
    setSpeedConfig({ ...DEFAULT_BASE_SPEED_CONFIG });
    setRowConfig({ ...DEFAULT_ROW_LAYOUT_CONFIG });
    setDynamicsConfig({ ...DEFAULT_RACE_DYNAMICS_CONFIG });
    setFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG });
  }

  useImperativeHandle(ref, () => ({ resetAll }));

  const spread = spreadPercent(speedConfig.min, speedConfig.max);
  const mean = ((speedConfig.min + speedConfig.max) / 2).toFixed(5);
  const speedValid = speedConfig.min > 0 && speedConfig.min < speedConfig.max;

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
    <>
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
              Trajectory Transition Duration (s)
              <InfoTooltip text="How smoothly Race Plan changes speed (controller transitions). Lower = snappier corrections, higher = gentler but slower rank adjustments." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Trajectory Transition Duration"
              min={0.5}
              max={5.0}
              step={0.5}
              value={dynamicsConfig.trajectoryTransitionDuration}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 5.0) setDynamics('trajectoryTransitionDuration', v);
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

      {/* ── Block 4b: Race Plan Bonus + Timing ── */}
      <SubCard
        title="Race Plan Bonus"
        onReset={resetRacePlanBonus}
        resetTestId="reset-race-plan-bonus"
        subtitle="Scales the Race Plan area bonuses and controls the timing of the bonus fade and P-controller window."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Race Plan Bonus Strength
              <InfoTooltip text="Multiplier for Race Plan area bonuses. 1.0=default (B1=+3%), 2.0=double (B1=+6%), 0.5=half (B1=+1.5%)" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan Bonus Strength Multiplier"
              min={0.5}
              max={3.0}
              step={0.1}
              value={dynamicsConfig.racePlanBonusStrengthMultiplier ?? 1.0}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 3.0) setDynamics('racePlanBonusStrengthMultiplier', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Bonus active until (% race)
              <InfoTooltip text="The area speed bonus (B1=+6%, B5=−2%) is applied at full strength from race start until this point, then fades out over the Bonus fade duration. Default: 67%" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan Bonus active until percent"
              min={30}
              max={95}
              step={5}
              value={Math.round((dynamicsConfig.racePlanBonusTransitionEnd ?? 0.75) * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 30 && v <= 95) setDynamics('racePlanBonusTransitionEnd', v / 100);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Bonus fade duration (ms)
              <InfoTooltip text="How long the area bonus takes to fade from full strength to 1.0 after Bonus active until. Default: 1500ms" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan Bonus fade duration ms"
              min={500}
              max={5000}
              step={500}
              value={dynamicsConfig.racePlanBonusFadeDuration ?? 1500}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 500 && v <= 5000) setDynamics('racePlanBonusFadeDuration', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              P-Controller starts (% race)
              <InfoTooltip text="The trajectory P-controller (OUTCOME phase) becomes active at this point and pushes each racer toward their assigned target rank. Default: 67%" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan P-Controller starts percent"
              min={50}
              max={100}
              step={5}
              value={Math.round((dynamicsConfig.racePlanCorridorStart ?? 0.55) * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                const end =
                  (dynamicsConfig.racePlanCorridorEnd ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd) * 100;
                if (v >= 50 && v <= end) setDynamics('racePlanCorridorStart', v / 100);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              P-Controller ends (% race)
              <InfoTooltip text="The trajectory P-controller deactivates at this point (FINAL phase begins). Must be >= P-Controller starts. Default: 100%" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan P-Controller ends percent"
              min={50}
              max={100}
              step={5}
              value={Math.round(
                (dynamicsConfig.racePlanCorridorEnd ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd) * 100
              )}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 50 && v <= 100) {
                  const newEnd = v / 100;
                  const curStart = dynamicsConfig.racePlanCorridorStart ?? 0.55;
                  setDynamicsConfig((prev) => ({
                    ...prev,
                    racePlanCorridorEnd: newEnd,
                    racePlanCorridorStart: Math.min(curStart, newEnd),
                  }));
                }
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Race Plan min duration (s)
              <InfoTooltip text="Minimum race duration for the Race Plan controller. Below this, races run on raw physics (no fairness sorting)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Race Plan minimum duration seconds"
              min={0}
              max={120}
              step={5}
              value={dynamicsConfig.racePlanMinDurationSec ?? 30}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 120) setDynamics('racePlanMinDurationSec', v);
              }}
            />
          </div>
        </div>
        <p style={RACE_PLAN_TIMING_WARNING_STYLE} data-testid="race-plan-timing-warning">
          {
            '⚠️ These timing values interact closely with the 8 physics parameters (lateralForce, lateralDamping, etc.) and with the Race Plan bonus/malus strength. Changing them may require re-tuning the physics parameters. Use the simulation sweep to validate any changes.'
          }
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
          At{' '}
          <strong style={{ color: 'var(--color-accent)' }}>
            {(dynamicsConfig.racePlanBonusStrengthMultiplier ?? 1.0).toFixed(1)}×
          </strong>
          {': '}
          B1={' '}
          <strong>
            {(1.0 + 0.03 * (dynamicsConfig.racePlanBonusStrengthMultiplier ?? 1.0)).toFixed(3)}
          </strong>
          {'  '}
          B5={' '}
          <strong>
            {(1.0 - 0.01 * (dynamicsConfig.racePlanBonusStrengthMultiplier ?? 1.0)).toFixed(3)}
          </strong>
        </p>
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-muted)',
            marginTop: '0.4rem',
            fontFamily: 'monospace',
          }}
          data-testid="race-plan-timeline-hint"
        >
          {'Bonus: 0%→'}
          <strong>{Math.round((dynamicsConfig.racePlanBonusTransitionEnd ?? 0.75) * 100)}%</strong>
          {'  |  Controller: '}
          <strong>{Math.round((dynamicsConfig.racePlanCorridorStart ?? 0.55) * 100)}%</strong>
          {'→'}
          <strong>
            {Math.round(
              (dynamicsConfig.racePlanCorridorEnd ??
                DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd) * 100
            )}
            %
          </strong>
          {'  |  Final: '}
          <strong>
            {Math.round(
              (dynamicsConfig.racePlanCorridorEnd ??
                DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd) * 100
            )}
            %
          </strong>
          {'→100%'}
        </p>
      </SubCard>

      {/* ── Block 4c: PULK Surge ── */}
      <SubCard
        title="PULK Surge"
        onReset={resetPulkSurge}
        resetTestId="reset-pulk-surge"
        subtitle="Optional PULK-phase action mechanic (default OFF). When enabled, it REPLACES the cohesion PULK bias: a random subset of racers (including the winner) briefly surges forward during the PULK phase, then the P-controller reels non-winners back to their target ranks — so who wins is unchanged, only the mid-race action differs."
      >
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="PULK Surge Enabled"
              checked={dynamicsConfig.pulkSurgeEnabled ?? false}
              onChange={(e) => setDynamics('pulkSurgeEnabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Enable PULK Surge
            <InfoTooltip text="Replace the cohesion PULK bias with the surge mechanic: a random subset (incl. the winner) briefly surges forward during PULK, then the controller reels non-winners back." />
          </label>
        </div>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Surge fraction
              <InfoTooltip text="Fraction of the field selected to surge (uniform, includes the winner)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Surge fraction"
              min={0}
              max={0.5}
              step={0.05}
              value={
                dynamicsConfig.pulkSurgeFraction ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeFraction
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 0.5) setDynamics('pulkSurgeFraction', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Surge bonus
              <InfoTooltip text="Forward speed bonus applied to surgers during PULK (capped at 0.12 for fairness/naturalness)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Surge bonus"
              min={0}
              max={0.12}
              step={0.01}
              value={dynamicsConfig.pulkSurgeBonus ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeBonus}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 0.12) setDynamics('pulkSurgeBonus', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Surge ramp-in (ms)
              <InfoTooltip text="Ease-in duration when a surger enters the PULK phase." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Surge ramp-in"
              min={0}
              max={2000}
              step={100}
              value={
                dynamicsConfig.pulkSurgeRampInMs ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeRampInMs
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 2000) setDynamics('pulkSurgeRampInMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Surge ramp-out (ms)
              <InfoTooltip text="Ease-out duration as the PULK phase ends and the surge fades back to normal." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Surge ramp-out"
              min={0}
              max={2000}
              step={100}
              value={
                dynamicsConfig.pulkSurgeRampOutMs ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeRampOutMs
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 2000) setDynamics('pulkSurgeRampOutMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Surge brake-exempt
              <InfoTooltip text="0 = surgers fully braked by rubber-band, 1 = fully exempt during PULK (0.5 default)." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Surge brake-exempt"
              min={0}
              max={1}
              step={0.1}
              value={
                dynamicsConfig.pulkBrakeExemptStrength ??
                DEFAULT_RACE_DYNAMICS_CONFIG.pulkBrakeExemptStrength
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setDynamics('pulkBrakeExemptStrength', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 4d: Pre-OUTCOME Field Governor (Stage B) ── */}
      <SubCard
        title="Field Governor (pre-OUTCOME)"
        onReset={resetGovernor}
        resetTestId="reset-governor"
        subtitle="Pre-OUTCOME edge-limiter (default OFF): a DEAD ZONE leaves the middle of the field FREE (re-roll makes natural groups/battles) and only clamps the EDGES — a leader too far ahead of the median or a tail too far behind. One symmetric rule; the bound is in TRUE racer-lengths (arc-distance / body length — lap-count- and track-independent). Faded to nothing before OUTCOME so the finish order (fairness) is untouched. Front-pack bias + comeback are later stages. ‘Action’ is the one owner knob (wider dead zone + more shuffle); the rest are expert/sweep knobs."
      >
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="Governor Enabled"
              checked={dynamicsConfig.governorEnabled ?? false}
              onChange={(e) => setDynamics('governorEnabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Enable Field Governor
            <InfoTooltip text="Master switch (default OFF). When on, the tail-lift runs in PRE_PULK+PULK and fades to 1.0 by OUTCOME. Does not touch target ranks or the OUTCOME controller." />
          </label>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="Governor Director Enabled"
              checked={dynamicsConfig.governorDirectorEnabled ?? false}
              onChange={(e) => setDynamics('governorDirectorEnabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Enable Director (contest injector)
            <InfoTooltip text="Own master switch (default OFF), independent of the tail-lift so it can be eye-tested alone. Rotates a small rank-blind cast through the front band so the lead visibly changes. Fades to 1.0 by OUTCOME; never touches target ranks." />
          </label>
        </div>
        <div className={s.formGroup} style={{ marginBottom: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Action ({Math.round((dynamicsConfig.governorDrama ?? 0.5) * 100)}%)
            <InfoTooltip text="The single owner control. Left = tighter tail (stragglers lifted sooner, less shuffle). Right = livelier (wider tail dead-zone, more shuffle overtakes). The tail-lift keeps stragglers in the picture; it never brakes the leader." />
          </label>
          <input
            type="range"
            aria-label="Governor Action (drama)"
            min={0}
            max={1}
            step={0.05}
            value={dynamicsConfig.governorDrama ?? DEFAULT_RACE_DYNAMICS_CONFIG.governorDrama}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 0 && v <= 1) setDynamics('governorDrama', v);
            }}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
        <div className={s.formGrid}>
          {[
            {
              key: 'governorK0',
              label: 'Edge softness k0',
              min: 0.005,
              max: 0.15,
              step: 0.005,
              tip: 'Slope of the barrier just past the bound. Higher = stiffer edge. Zero inside the dead zone regardless. Fixed (not scaled by Action).',
            },
            {
              key: 'governorLengthMin',
              label: 'Bound @ Action 0 (racer-lengths)',
              min: 0.5,
              max: 10,
              step: 0.5,
              tip: 'Dead-zone bound (how far a racer may fall behind the median before the tail-lift engages) at min Action, in TRUE racer-lengths (arc-distance / body length — lap-count- and track-independent). Tighter tail. Must be ≤ the Action-100 bound.',
            },
            {
              key: 'governorLengthMax',
              label: 'Bound @ Action 100 (racer-lengths)',
              min: 0.5,
              max: 12,
              step: 0.5,
              tip: 'Dead-zone bound at max Action, in racer-lengths (wider dead zone → field spreads more, still bounded). Must be ≥ the Action-0 bound.',
            },
            {
              key: 'governorLengthFloor',
              label: 'Bound floor (racer-lengths)',
              min: 0.5,
              max: 5,
              step: 0.5,
              tip: 'Absolute floor on the bound in racer-lengths, so a degenerate tiny field can’t make the dead zone vanish.',
            },
            {
              key: 'governorRampWidth',
              label: 'Edge ramp width',
              min: 0.1,
              max: 2.0,
              step: 0.1,
              tip: 'How many bound-widths past the edge the barrier takes to reach full lift (maxEffect). Larger = softer edge.',
            },
            {
              key: 'governorAMin',
              label: 'A min (min-Action shuffle)',
              min: 0,
              max: 0.2,
              step: 0.005,
              tip: 'Shuffle amplitude at min Action. Keep > 0 so there is always some movement (no dead train).',
            },
            {
              key: 'governorAMax',
              label: 'A max (max-Action shuffle)',
              min: 0,
              max: 0.2,
              step: 0.005,
              tip: 'Shuffle amplitude at max Action. More in-field overtakes/drop-backs.',
            },
            {
              key: 'governorFrequency',
              label: 'Shuffle frequency',
              min: 0.5,
              max: 12,
              step: 0.5,
              tip: 'Oscillation cycles across the race — INDEPENDENT of Action (expert). Higher = quicker weave.',
            },
            {
              key: 'governorMaxEffect',
              label: 'Max effect (±)',
              min: 0.02,
              max: 0.2,
              step: 0.01,
              tip: 'Outer clamp on the per-racer speed effect — the realism guarantee (±). Governor never exceeds this.',
            },
            {
              key: 'governorMaxStepPerFrame',
              label: 'Max step / frame',
              min: 0.001,
              max: 0.05,
              step: 0.001,
              tip: 'Slew limit: how fast governorMult may change per step. Lower = smoother speed changes.',
            },
            {
              key: 'governorDirectorCastSize',
              label: 'Director: cast size',
              min: 1,
              max: 8,
              step: 1,
              tip: 'How many racers are featured (held in the front band) at once. ~2–3 gives a close, contested front. Director must be enabled below.',
            },
            {
              key: 'governorDirectorDwell',
              label: 'Director: spotlight dwell',
              min: 0.02,
              max: 0.3,
              step: 0.01,
              tip: 'How long a featured cast holds before it turns over, as a fraction of race progress. Smaller = the front cast changes more often (more lead changes).',
            },
            {
              key: 'governorDirectorAnchorOffset',
              label: 'Director: anchor offset (lengths)',
              min: 0,
              max: 6,
              step: 0.5,
              tip: 'The front anchor the featured cast is pulled toward = field median + this many racer-lengths ahead. Larger = the contested front sits further ahead of the pack.',
            },
            {
              key: 'governorDirectorPullStrength',
              label: 'Director: pull strength',
              min: 0.01,
              max: 0.12,
              step: 0.01,
              tip: 'Speed force per racer-length of gap to the anchor (before the ±max-effect clamp). Higher = the cast is dragged into the front band faster (bigger comebacks).',
            },
            {
              key: 'governorDirectorSettling',
              label: 'Director: settling window',
              min: 0,
              max: 0.2,
              step: 0.01,
              tip: 'How long before the OUTCOME fade (in race progress) the spotlight stops featuring new casts, so the field relaxes toward its natural order before the controller imposes the result.',
            },
          ].map(({ key, label, min, max, step, tip }) => (
            <div className={s.formGroup} key={key}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {label}
                <InfoTooltip text={tip} />
              </label>
              <input
                type="number"
                className={s.input}
                aria-label={label}
                min={min}
                max={max}
                step={step}
                value={dynamicsConfig[key] ?? DEFAULT_RACE_DYNAMICS_CONFIG[key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (isFinite(v) && v >= min && v <= max) setDynamics(key, v);
                }}
              />
            </div>
          ))}
        </div>
      </SubCard>

      {/* ── Block 10: Frame Timing ── */}
      <SubCard
        title="Frame Timing"
        onReset={resetFrameTiming}
        resetTestId="reset-frame-timing"
        subtitle="Controls how browser frame-time variation is smoothed before being applied to camera movement and visual effects. Physics is always fixed at 16ms steps and is not affected by this setting."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              dt-Smoothing (EMA-Alpha)
              <InfoTooltip text="Smooths browser frame-time variation for camera and effects. 0.0 = no smoothing (raw dt used directly). 0.95 = very strong smoothing. Higher = smoother camera but slower response to real frame-rate changes. Physics is unaffected — it always runs in fixed 16 ms steps. Takes effect on the next race start." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={0.95}
              step={0.01}
              value={frameTimingConfig.dtSmoothingAlpha}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 0.95) setFrameTiming('dtSmoothingAlpha', v);
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
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Current alpha:{' '}
            <strong style={{ color: 'var(--color-accent)' }}>
              {frameTimingConfig.dtSmoothingAlpha.toFixed(2)}
            </strong>
            {'  ·  '}
            {frameTimingConfig.dtSmoothingAlpha === 0
              ? 'No smoothing — raw frame dt used directly'
              : frameTimingConfig.dtSmoothingAlpha < 0.5
                ? 'Light smoothing — fast response'
                : frameTimingConfig.dtSmoothingAlpha < 0.8
                  ? 'Moderate smoothing — balanced (recommended)'
                  : 'Strong smoothing — very stable camera, slow adaptation'}
          </p>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="Render Interpolation"
              checked={frameTimingConfig.renderInterpolation ?? true}
              onChange={(e) => setFrameTiming('renderInterpolation', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Render Interpolation
            <InfoTooltip text="Smooths sprite and camera movement between physics steps. Eliminates rhythmic jitter at variable browser frame rates. Off = pre-interpolation behavior (comparison mode). Takes effect immediately." />
          </label>
        </div>
      </SubCard>
    </>
  );
});

export default DynamicsTuningSection;
