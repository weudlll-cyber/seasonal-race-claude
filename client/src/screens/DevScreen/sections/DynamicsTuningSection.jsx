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

  function resetGovernor() {
    setDynamicsConfig((prev) => ({
      ...prev,
      governorMaxEffect: DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxEffect,
      governorMaxStepPerFrame: DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxStepPerFrame,
      governorDirectorLeaderBrake: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorLeaderBrake,
      governorDirectorChallengerBoost: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorChallengerBoost,
      governorDirectorFrontPool: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFrontPool,
      governorDirectorCeilingCap: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorCeilingCap,
      governorDirectorBoostHeadroom: DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorBoostHeadroom,
    }));
  }

  function resetPhaseSplit() {
    // EARLY + POST only — the PULK-phase bonuses moved to the PULK group (resetPulk).
    setDynamicsConfig((prev) => ({
      ...prev,
      phaseSplitBonusEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.phaseSplitBonusEnabled,
      areaBonusEarly: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusEarly,
      areaBonusPost: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPost,
      rowBonusEarly: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusEarly,
      rowBonusPost: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusPost,
    }));
  }

  // The PULK group: the phase boundaries that open/close the PULK window (begin + end) and the three
  // mechanisms that act ONLY inside it. All inert when the window has zero width (begin == end).
  function resetPulk() {
    setDynamicsConfig((prev) => ({
      ...prev,
      racePlanPulkStart: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart,
      choreoOutcomeStart: DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart,
      areaBonusPulk: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPulk,
      rowBonusPulk: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusPulk,
      pulkBiasGain: DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain,
    }));
  }

  function resetPulkLeadRotation() {
    setDynamicsConfig((prev) => ({
      ...prev,
      pulkLeadRotationAttackerSlots: DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationAttackerSlots,
      pulkLeadRotationDropDepthLengths:
        DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDropDepthLengths,
      pulkLeadRotationOutsiderMaxReachLengths:
        DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationOutsiderMaxReachLengths,
      pulkLeadRotationDeadlockTimeoutMs:
        DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDeadlockTimeoutMs,
      pulkLeadRotationMinHoldMs: DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationMinHoldMs,
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

      {/* ── Block 4d: Shared PULK-director contest strengths + realism envelope ── */}
      <SubCard
        title="Director contest strengths (PULK)"
        onReset={resetGovernor}
        resetTestId="reset-governor"
        subtitle="The realism-bounded speed knobs the PULK-phase director (lead rotation) rides: a leader brake, a challenger boost cap, and the front-group pool. Faded to nothing before OUTCOME so the finish order (fairness) is delegated to the OUTCOME controller + the ceiling cap. Max effect + max step per frame are the shared realism envelope (±clamp + slew) every term rides."
      >
        <div className={s.formGrid}>
          {[
            {
              key: 'governorMaxEffect',
              label: 'Max effect (±)',
              min: 0.02,
              max: 0.2,
              step: 0.01,
              tip: 'Outer clamp on the per-racer speed effect — the realism guarantee (±). The director never exceeds this.',
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
              key: 'governorDirectorLeaderBrake',
              label: 'Leader brake',
              min: 0,
              max: 0.15,
              step: 0.01,
              tip: 'How hard the live leader is slowed so a chaser can close. Only slows; never speeds anyone up. 0.10 = shipped.',
            },
            {
              key: 'governorDirectorChallengerBoost',
              label: 'Challenger boost (cap)',
              min: 0,
              max: 0.12,
              step: 0.01,
              tip: 'Maximum forward boost given to a catching challenger to close on the leader (capped by max effect). 0.06 = shipped.',
            },
            {
              key: 'governorDirectorBoostHeadroom',
              label: 'Boost headroom (pts above natural)',
              min: 0,
              max: 0.15,
              step: 0.01,
              tip: 'How much faster than the fastest natural racer a boosted challenger may go. 0 = capped at the field; higher = catch-ups can burst forward. Auto-limited so total speed stays within ±20%. 0 = shipped.',
            },
            {
              key: 'governorDirectorFrontPool',
              label: 'Front-group pool (N)',
              min: 1,
              max: 30,
              step: 1,
              tip: 'Challengers are drawn from the front N on-track positions (leader excluded), so the boost only aims at a racer that can actually reach the front. 8 = shipped.',
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
        <div style={{ marginTop: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="Director Ceiling Cap"
              checked={dynamicsConfig.governorDirectorCeilingCap ?? false}
              onChange={(e) => setDynamics('governorDirectorCeilingCap', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Naturalness ceiling cap
            <InfoTooltip text="Caps a boosted challenger's resulting speed at the fastest natural re-roll draw, so the boost can never make a racer look unnaturally fast. Only limits the upside; the brakes are unaffected. ON = shipped." />
          </label>
        </div>
      </SubCard>

      {/* ── Block 4d2: Hero Choreography — two tuning knobs (fields defined in defaults.js) ── */}
      <SubCard
        title="Hero Choreography"
        onReset={() => {
          setDynamics('choreoIntensity', DEFAULT_RACE_DYNAMICS_CONFIG.choreoIntensity);
          setDynamics(
            'choreoPackBandStrictness',
            DEFAULT_RACE_DYNAMICS_CONFIG.choreoPackBandStrictness
          );
          setDynamics('choreoReleaseProgress', DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress);
          setDynamics('choreoResolveB2', DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB2);
          setDynamics('choreoResolveB3', DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB3);
          setDynamics('choreoResolveB4', DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB4);
          setDynamics('choreoResolveB5', DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB5);
          // choreoOutcomeStart (PULK end) now lives in the PULK group — reset by resetPulk.
        }}
        resetTestId="reset-choreo"
        subtitle="Hero choreography (always on): at ~25% race progress a generator casts 2–4 hero racers that follow authored position-curves (comebacks, duels, a charge to the line) for dramatic BUT fair finishes; the rest of the field runs normally. The knobs below tune it."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Action intensity (0–1)
              <InfoTooltip text="Drama intensity of the hero curves. Low = calm; high = deeper comebacks, more duels, later reveals. Auto-clamped per race so it can never break fairness." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Choreo Intensity"
              min={0}
              max={1}
              step={0.05}
              value={dynamicsConfig.choreoIntensity}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setDynamics('choreoIntensity', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Pack band strictness (0–1)
              <InfoTooltip text="How tightly the non-hero pack holds its band. Higher = tighter/fairer pack; lower = looser pack so heroes can weave through. 0.5 is the tested default." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Choreo Pack Band Strictness"
              min={0}
              max={1}
              step={0.05}
              value={dynamicsConfig.choreoPackBandStrictness}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setDynamics('choreoPackBandStrictness', v);
              }}
            />
          </div>
          {/* PULK end / OUTCOME start (choreoOutcomeStart) moved to the PULK group below. */}
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              B1 release progress (0–1]
              <InfoTooltip text="How late the leading (B1) heroes are held in a tight front cluster before the follower RELEASES them to natural speed for the final contest. Higher = a longer fight to the line. 0.97 default." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Choreo Release Progress"
              min={0}
              max={1}
              step={0.01}
              value={dynamicsConfig.choreoReleaseProgress}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v <= 1) setDynamics('choreoReleaseProgress', v);
              }}
            />
          </div>
          {[
            [
              'choreoResolveB2',
              'B2 resolve progress (0–1]',
              'By when a B2 (mid-pack) hero must settle into its band. Deeper bands resolve EARLIER so the rear locks in first. 0.80 default.',
            ],
            [
              'choreoResolveB3',
              'B3 resolve progress (0–1]',
              'By when a B3 hero must settle into its band. Earlier than B2. 0.70 default.',
            ],
            [
              'choreoResolveB4',
              'B4 resolve progress (0–1]',
              'By when a B4 hero must settle into its band. Earlier than B3. 0.65 default.',
            ],
            [
              'choreoResolveB5',
              'B5 resolve progress (0–1]',
              'By when a B5 (rear) hero must settle into its band — the earliest resolve, so the tail is locked while the front still fights. 0.60 default.',
            ],
          ].map(([key, label, tip]) => (
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
                aria-label={`Choreo ${key.replace('choreo', '')}`}
                min={0}
                max={1}
                step={0.05}
                value={dynamicsConfig[key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0 && v <= 1) setDynamics(key, v);
                }}
              />
            </div>
          ))}
        </div>
      </SubCard>

      {/* ── Block 4e: Phase-Split Bonuses ── */}
      <SubCard
        title="Phase-Split Bonuses"
        onReset={resetPhaseSplit}
        resetTestId="reset-phase-split"
        subtitle="Gates the area bonus (target-band speed nudge) and the start-row catch-up bonus by race phase — EARLY (chaos) and POST — via the master switch below (it also gates the PULK-phase bonuses, which live in the PULK group). Area strengths are in the same units as the Race Plan bonus multiplier (2.0 = full, 0 = off); row strengths are fractions (1 = full, 0 = off). Shipped: EARLY + POST full."
      >
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
          >
            <input
              type="checkbox"
              aria-label="Phase-Split Bonuses Enabled"
              checked={dynamicsConfig.phaseSplitBonusEnabled ?? false}
              onChange={(e) => setDynamics('phaseSplitBonusEnabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Enable phase-split bonuses
            <InfoTooltip text="When off, the area + row bonuses run at full strength the whole race. When on, their strength follows the per-phase values below. ON = shipped." />
          </label>
        </div>
        <div className={s.formGrid}>
          {[
            {
              key: 'areaBonusEarly',
              label: 'Area bonus — EARLY',
              min: 0,
              max: 3,
              step: 0.5,
              tip: 'Area-bonus strength in the EARLY (chaos) phase, before PULK. 1.0 = shipped.',
            },
            {
              key: 'areaBonusPost',
              label: 'Area bonus — POST',
              min: 0,
              max: 3,
              step: 0.5,
              tip: 'Area-bonus strength after PULK, into the OUTCOME window. 1.0 = shipped. (The PULK-phase area bonus lives in the PULK group.)',
            },
            {
              key: 'rowBonusEarly',
              label: 'Row bonus — EARLY',
              min: 0,
              max: 1,
              step: 0.1,
              tip: 'Start-row catch-up bonus fraction in the EARLY phase. 1 = full (shipped).',
            },
            {
              key: 'rowBonusPost',
              label: 'Row bonus — POST',
              min: 0,
              max: 1,
              step: 0.1,
              tip: 'Start-row catch-up bonus fraction after PULK. 1 = full (shipped).',
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

      {/* ── Block 4f: PULK ── the phase window + the three mechanisms that act only inside it ── */}
      <SubCard
        title="PULK"
        onReset={resetPulk}
        resetTestId="reset-pulk"
        subtitle="The PULK window [begin, end] and the three mechanisms that act ONLY inside it. OUTCOME (band-steering) begins exactly where PULK ends, and the director (hero choreography) is anchored at PULK begin. At the shipped defaults PULK begin == PULK end (0.25) → the window has ZERO width, so the three PULK mechanisms below are inert; widen the window (raise PULK end above PULK begin) to bring them to life."
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              PULK begin (0.05–0.50)
              <InfoTooltip text="PULK begins here; the director (hero choreography) starts with it. This is the CHAOS→PULK boundary and the hero-curve anchor — moving it moves the director start. Clamped to sit at or before PULK end. 0.25 default." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="PULK Begin"
              min={0.05}
              max={0.5}
              step={0.05}
              value={
                dynamicsConfig.racePlanPulkStart ?? DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0.05 && v <= 0.5) setDynamics('racePlanPulkStart', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              PULK end / OUTCOME begins (0.25–0.55)
              <InfoTooltip text="PULK ends here, and OUTCOME (the pack's band-steering) begins here — one boundary, no TRANSITION phase in between. At the default 0.25 (== PULK begin) the PULK window is zero-width and the field is steered from the chaos boundary, exactly as shipped; raising it reopens the PULK window and hands OUTCOME off later. 0.25 default." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="PULK End / Outcome Start"
              min={0.25}
              max={0.55}
              step={0.05}
              value={dynamicsConfig.choreoOutcomeStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.25 && v <= 0.55) setDynamics('choreoOutcomeStart', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Area bonus — PULK
              <InfoTooltip text="Area-bonus strength inside the PULK window (target-band speed nudge). Gated by the Phase-Split master switch. ONLY acts inside the PULK window — inert when the window has zero width (PULK begin == PULK end). 0 = shipped." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Area bonus — PULK"
              min={0}
              max={3}
              step={0.5}
              value={dynamicsConfig.areaBonusPulk ?? DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPulk}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0 && v <= 3) setDynamics('areaBonusPulk', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Row bonus — PULK
              <InfoTooltip text="Start-row catch-up bonus fraction inside the PULK window. Gated by the Phase-Split master switch. ONLY acts inside the PULK window — inert when the window has zero width (PULK begin == PULK end). 0 = shipped." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Row bonus — PULK"
              min={0}
              max={1}
              step={0.1}
              value={dynamicsConfig.rowBonusPulk ?? DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusPulk}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0 && v <= 1) setDynamics('rowBonusPulk', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Cohesion bias gain
              <InfoTooltip text="How strongly the pulk racers' re-roll draws are pulled back toward the pack centroid, so the field stays together and does not string out before the contest. ONLY acts inside the PULK window — inert when the window has zero width (PULK begin == PULK end). 0 = no cohesion; higher = tighter pack. 2.0 = shipped." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Cohesion bias gain"
              min={0}
              max={10}
              step={0.5}
              value={dynamicsConfig.pulkBiasGain ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0 && v <= 10) setDynamics('pulkBiasGain', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Block 4g: PULK Lead Rotation (the PULK-phase lead-rotation core loop) ── */}
      <SubCard
        title="PULK Lead Rotation"
        onReset={resetPulkLeadRotation}
        resetTestId="reset-pulk-lead-rotation"
        subtitle="THE pulk-phase mechanism (always on): instead of herding the front it COMPLETES lead changes. Inside the PULK window, 1–2 attacker slots boost the current live P2/P3 UNTIL it takes the lead, a permanent outsider slot brings a fresh racer up from deeper in the field, and the dethroned leader is braked until it has fallen the drop-depth behind. A fresh P1 is guaranteed 750 ms before it can be re-passed (no flicker). Strengths come from the Director section above; the four knobs here shape the rotation."
      >
        <div className={s.formGrid}>
          {[
            {
              key: 'pulkLeadRotationAttackerSlots',
              label: 'Attacker slots (1–2)',
              min: 1,
              max: 2,
              step: 1,
              tip: 'How many front challengers are boosted toward P1 at once. 1 = one clean pass at a time (most legible); 2 = denser front fight. 2 = default.',
            },
            {
              key: 'pulkLeadRotationDropDepthLengths',
              label: 'Ex-leader drop depth (lengths)',
              min: 1,
              max: 8,
              step: 1,
              tip: 'How far (racer lengths) the just-dethroned leader is braked back before release — the DEPTH LEVER. Small (2) = tight top-group rotation; large (6–8) = the ex-leader leaves the front and the rotation migrates through the field (for long races). 2 = default.',
            },
            {
              key: 'pulkLeadRotationOutsiderMaxReachLengths',
              label: 'Outsider max reach (lengths)',
              min: 3,
              max: 40,
              step: 1,
              tip: 'The deepest a fresh-blood outsider may sit behind the leader and still be boosted to P1 (racer lengths). Beyond this it cannot reach the front inside the ±speed envelope, so it is not picked. 15 = default.',
            },
            {
              key: 'pulkLeadRotationDeadlockTimeoutMs',
              label: 'Deadlock timeout (ms)',
              min: 3000,
              max: 30000,
              step: 500,
              tip: 'Safety net only (never the normal path): a boost that cannot complete (blocked by traffic — the lateral rule brakes a blocked racer) is released after this long so the rotation never freezes. 12000 = default.',
            },
            {
              key: 'pulkLeadRotationMinHoldMs',
              label: 'Leader onset grace (ms)',
              min: 0,
              max: 1500,
              step: 50,
              tip: 'Grace before a NEW leader is braked (visual smoothing of the takeover). 0 = brake engages immediately on taking the lead. NOT a flicker guard — the settle brake already makes rapid place-swaps impossible. 750 = default.',
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
