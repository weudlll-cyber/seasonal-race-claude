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
import { RACE_RELEVANT_DEFAULTS } from './raceRelevantReset.js';
import { SubCard, SubHeading } from './SubCard.jsx';
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

  function resetNormalSpeed() {
    setSpeedConfig((prev) => ({
      ...prev,
      normalSpeedPxPerSec: DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec,
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

  // Gap-cap re-roll — the SHIPPED cohesion mechanism, grouped with the other re-roll controls
  // (it loads the same periodic dice). Turning the toggle OFF restores the pre-feature world,
  // which is the world every committed baseline was measured in.
  function resetGapReroll() {
    setDynamicsConfig((prev) => ({
      ...prev,
      gapRerollEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled,
      gapRerollThresholdLengths: DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths,
      gapRerollStrength: DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength,
      gapRerollMode: DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollMode,
      gapRerollDevMarker: DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollDevMarker,
    }));
  }

  // Finale front-compression (Evolution Act 2) — its own reset. Toggling the flag back OFF restores the
  // shipped byte-identical world; the four knobs return to their committed first-dose values.
  function resetFinaleCompression() {
    setDynamicsConfig((prev) => ({
      ...prev,
      finaleFrontCompression: DEFAULT_RACE_DYNAMICS_CONFIG.finaleFrontCompression,
      finaleContestWindowStart: DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowStart,
      finaleContestWindowEnd: DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowEnd,
      finaleCatchupGateLengths: DEFAULT_RACE_DYNAMICS_CONFIG.finaleCatchupGateLengths,
      finaleLeaderBleedGateLengths: DEFAULT_RACE_DYNAMICS_CONFIG.finaleLeaderBleedGateLengths,
      finaleCompressStrength: DEFAULT_RACE_DYNAMICS_CONFIG.finaleCompressStrength,
    }));
  }

  // B2 attackers — their own group: the cast count and the release hysteresis are one mechanism.
  function resetB2Attackers() {
    setDynamicsConfig((prev) => ({
      ...prev,
      b2AttackHeroes: DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes,
      packReSteerThreshold: DEFAULT_RACE_DYNAMICS_CONFIG.packReSteerThreshold,
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

  // The PULK Phase card: reset only the 5 card-level controls. The B2-attacker pair has its own
  // group Reset, and the pinned internals (envelope/safety + rotation internals + choreo
  // fine-tuning) keep their config defaults — they have no DevScreen control, so they are not
  // user-resettable here.
  function resetPulk() {
    setDynamicsConfig((prev) => ({
      ...prev,
      choreoOutcomeStart: DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart,
      pulkLeaderBrake: DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake,
      pulkChallengerBoost: DEFAULT_RACE_DYNAMICS_CONFIG.pulkChallengerBoost,
      pulkLeadRotationDropDepthLengths:
        DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDropDepthLengths,
      choreoIntensity: DEFAULT_RACE_DYNAMICS_CONFIG.choreoIntensity,
    }));
  }

  function resetPhaseSplit() {
    // EARLY + POST only — the PULK-phase bonuses live in their own section (resetPulkBonuses).
    setDynamicsConfig((prev) => ({
      ...prev,
      phaseSplitBonusEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.phaseSplitBonusEnabled,
      areaBonusEarly: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusEarly,
      areaBonusPost: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPost,
      rowBonusEarly: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusEarly,
      rowBonusPost: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusPost,
    }));
  }

  // The PULK-window phase-split bonuses + cohesion bias — their own subsystem (not the rotation),
  // deliberately 0/2.0 for the flat shipped PULK. Left in place; reset independently.
  function resetPulkBonuses() {
    setDynamicsConfig((prev) => ({
      ...prev,
      areaBonusPulk: DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPulk,
      rowBonusPulk: DEFAULT_RACE_DYNAMICS_CONFIG.rowBonusPulk,
      pulkBiasGain: DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain,
    }));
  }

  function resetFrameTiming() {
    setFrameTimingConfig({ ...DEFAULT_FRAME_TIMING_CONFIG });
  }

  // The card-level "Reset All Defaults" restores only the RACE-RELEVANT blocks this section owns (baseSpeed,
  // rowLayout, raceDynamics), spread from the shared source of truth. frameTiming is COSMETIC and is left
  // untouched here on purpose — its dedicated "Frame Timing" Reset link still resets it explicitly.
  function resetAll() {
    setSpeedConfig({ ...RACE_RELEVANT_DEFAULTS.baseSpeedConfig });
    setRowConfig({ ...RACE_RELEVANT_DEFAULTS.rowLayoutConfig });
    setDynamicsConfig({ ...RACE_RELEVANT_DEFAULTS.raceDynamicsConfig });
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

      {/* ══ DevScreen order: race timeline — global/technical first, then phases in temporal order ══ */}

      {/* ── Section 1: Frame Timing (global/technical — nothing to do with the race itself) ── */}
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

      {/* ── Section 2: Speed (Speed Range + Speed Re-Roll) ── */}
      <SubCard
        title="Speed"
        subtitle="Each racer's base speed and how it is re-rolled during the race."
      >
        <SubHeading
          label="Normal Track Speed"
          note="THE pace of the game: how fast a normal racer travels, in track pixels per second. One number for every track and every racer class. Everything else follows from it — a closed race's duration is laps × track length ÷ this speed, and an open track's finish line is wherever a normal racer is after the chosen time. Raise it and every race gets shorter; lower it and every race gets longer."
          onReset={resetNormalSpeed}
          resetTestId="reset-normal-speed"
        />
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Normal Speed (px/s)
              <InfoTooltip text="World pixels a normal racer covers per second. This is the single pace control: it applies identically to every track and every racer class, and every race duration in the game is derived from it." />
            </label>
            <input
              type="number"
              data-testid="normal-speed-input"
              className={s.input}
              min={10}
              max={2000}
              step={5}
              value={speedConfig.normalSpeedPxPerSec}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) setSpeed('normalSpeedPxPerSec', v);
              }}
            />
          </div>
        </div>
        <SubHeading
          label="Speed Range"
          note="How far individual racers deviate from the normal speed. At the start of each race, every racer gets a random base speed somewhere in this range. A wider range creates more dramatic differences between racers — clear leaders and stragglers. A narrower range keeps races close and competitive. This is the SPREAD only; the absolute pace is Normal Track Speed above."
          onReset={resetSpeedRange}
          resetTestId="reset-speed-range"
        />
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
        <SubHeading
          label="Speed Re-Roll"
          note="During a race, each racer's speed gets re-rolled periodically — meaning their speed changes from time to time, creating dramatic shifts. This is what makes leads change and prevents predictable outcomes. Without this, the fastest racer at the start would just stay in front the whole race."
          onReset={resetSpeedReRoll}
          resetTestId="reset-speed-reroll"
        />
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
        {/* ── Gap-cap re-roll bias (docs/CONCEPT-COHESION.md) — SHIPPED ON. Lives here because it
            loads the very dice the Speed Re-Roll block above schedules. ── */}
        <SubHeading
          label="Gap-Cap Re-Roll"
          note="The shipped cohesion mechanism — it loads the periodic re-roll dice above. A racer that has opened a hole behind itself draws SLOWER at its next scheduled roll; in symmetric mode a dropped racer draws FASTER. Always inside the honest speed band, scheduled rolls only, cadence untouched — so it tightens the field without ever giving anyone speed they could not have drawn."
          onReset={resetGapReroll}
          resetTestId="reset-gap-reroll"
        />
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={dynamicsConfig.gapRerollEnabled ?? false}
                onChange={(e) => setDynamics('gapRerollEnabled', e.target.checked)}
                data-testid="gap-reroll-toggle"
              />
              Gap-Reroll enabled
              <InfoTooltip text="Master switch for the gap-cap re-roll bias. ON = shipped (symmetric, G=0.75, strength=0.5): runaway winners 23% → 8.3% with band-reach and Holm unchanged. OFF restores the pre-feature game byte-identically — that is the world every committed baseline was measured in, so turn it off to compare against one." />
            </label>
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Gap-Reroll G (lengths)
              <InfoTooltip text="Gap cap G in racer-lengths: the bias engages only once a racer's arc gap to its neighbour exceeds G. Lower = engages sooner = tighter field. 0.75 = shipped." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Gap-Reroll G (lengths)"
              min={0.5}
              max={4.0}
              step={0.25}
              value={
                dynamicsConfig.gapRerollThresholdLengths ??
                DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0.5 && v <= 4.0)
                  setDynamics('gapRerollThresholdLengths', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Gap-Reroll strength
              <InfoTooltip text="How hard a single correction pulls: fraction-to-band-edge = min(1, strength·(gap−G)) per excess length. Higher = individual corrections hit harder and saturate at the band edge sooner (visible braking); lower = many gentle nudges. 0.5 = shipped — it halved the share of saturated corrections without costing fairness." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Gap-Reroll strength"
              min={0}
              max={1.5}
              step={0.25}
              value={
                dynamicsConfig.gapRerollStrength ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0 && v <= 1.5) setDynamics('gapRerollStrength', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Gap-Reroll mode
              <InfoTooltip text="symmetric = also lift a dropped racer faster, pulling both ends toward the pack; down-only = just slow the escapee. symmetric = shipped." />
            </label>
            <select
              className={s.input}
              aria-label="Gap-Reroll mode"
              data-testid="gap-reroll-mode"
              value={dynamicsConfig.gapRerollMode ?? 'symmetric'}
              onChange={(e) => setDynamics('gapRerollMode', e.target.value)}
            >
              <option value="symmetric">symmetric</option>
              <option value="down">down-only</option>
            </select>
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={dynamicsConfig.gapRerollDevMarker ?? false}
                onChange={(e) => setDynamics('gapRerollDevMarker', e.target.checked)}
                data-testid="gap-reroll-devmarker-toggle"
              />
              Gap-Reroll dev marker
              <InfoTooltip text="Rendering-only dev aid: flashes a cyan ring on a racer the instant its re-roll was biased, so you can SEE where the mechanism fires before judging naturalness with it off. Zero effect on the race itself. OFF = shipped." />
            </label>
          </div>
        </div>
        {/* ── Finale front-compression (Evolution Act 2) — a flag-gated dice overlay on the gap-cap
            re-roll above; never touches the servo/target. Default OFF → shipped byte-identical. ── */}
        <SubHeading
          label="Finale Front-Compression"
          note="Act 2 (default OFF, eye-test toggle). A finale-window, front-band-only dice tilt layered on the gap-cap re-roll — it NEVER touches the servo target. In the finale window it pulls the front favourites together: a pursuer more than G_c behind the live leader draws FASTER (catch-up), and a runaway leader whose lead over P2 exceeds the LARGER G_b draws SLOWER (bleed backstop). Honest speed band, scheduled rolls only. Turning it ON makes the race NOT apples-to-apples with a defaults sim run — the badge goes red (R 1), which is the intended warning."
          onReset={resetFinaleCompression}
          resetTestId="reset-finale-compression"
        />
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={dynamicsConfig.finaleFrontCompression ?? false}
                onChange={(e) => setDynamics('finaleFrontCompression', e.target.checked)}
                data-testid="finale-front-compression-toggle"
              />
              Finale front-compression
              <InfoTooltip text="Master switch for the Act 2 finale overlay. OFF = shipped (byte-identical). ON = compress the front band in the finale window (catch-up + capped leader-bleed backstop), on the scheduled re-roll draw only. UI toggle for the owner eye-test; run a same-seed A/B with it ON vs OFF." />
            </label>
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Finale window start
              <InfoTooltip text="Progress fraction where the overlay begins. Must be below the window end. 0.80 = committed. [windowEnd, 1.0] is left physics-live." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Finale window start"
              min={0.5}
              max={0.99}
              step={0.05}
              value={
                dynamicsConfig.finaleContestWindowStart ??
                DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowStart
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                const end =
                  dynamicsConfig.finaleContestWindowEnd ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowEnd;
                if (isFinite(v) && v > 0 && v < end) setDynamics('finaleContestWindowStart', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Finale window end
              <InfoTooltip text="Progress fraction where the overlay stops (must be above the start). 0.90 = committed — the last stretch stays physics-live." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Finale window end"
              min={0.51}
              max={1.0}
              step={0.05}
              value={
                dynamicsConfig.finaleContestWindowEnd ??
                DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowEnd
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                const start =
                  dynamicsConfig.finaleContestWindowStart ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowStart;
                if (isFinite(v) && v <= 1 && v > start) setDynamics('finaleContestWindowEnd', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Catch-up gate G_c (lengths)
              <InfoTooltip text="A front pursuer more than G_c racer-lengths behind the live leader gets a catch-up FASTER tilt. Lower = arms sooner = tighter front. Must stay below the leader-bleed gate G_b. 1.0 = committed." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Catch-up gate G_c (lengths)"
              min={0}
              max={10}
              step={0.25}
              value={
                dynamicsConfig.finaleCatchupGateLengths ??
                DEFAULT_RACE_DYNAMICS_CONFIG.finaleCatchupGateLengths
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                const gb =
                  dynamicsConfig.finaleLeaderBleedGateLengths ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.finaleLeaderBleedGateLengths;
                // HARD invariant G_b > G_c: reject a G_c that would meet/exceed the bleed gate.
                if (isFinite(v) && v >= 0 && v < gb) setDynamics('finaleCatchupGateLengths', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Leader-bleed gate G_b (lengths)
              <InfoTooltip text="The runaway backstop: the live leader draws SLOWER only when its lead over P2 exceeds G_b. Must stay ABOVE the catch-up gate G_c (so the bleed can never arm without the catch-up). 2.0 = committed." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Leader-bleed gate G_b (lengths)"
              min={0.25}
              max={10}
              step={0.25}
              value={
                dynamicsConfig.finaleLeaderBleedGateLengths ??
                DEFAULT_RACE_DYNAMICS_CONFIG.finaleLeaderBleedGateLengths
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                const gc =
                  dynamicsConfig.finaleCatchupGateLengths ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.finaleCatchupGateLengths;
                // HARD invariant G_b > G_c: reject a G_b that would not strictly exceed the catch-up gate.
                if (isFinite(v) && v > gc && v <= 10)
                  setDynamics('finaleLeaderBleedGateLengths', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Finale compress strength
              <InfoTooltip text="How hard each finale tilt pulls: fraction-to-band-edge = min(1, strength·(gap−gate)). Higher = firmer compression. Honest band always caps it. 1.0 = committed." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Finale compress strength"
              min={0}
              max={3}
              step={0.25}
              value={
                dynamicsConfig.finaleCompressStrength ??
                DEFAULT_RACE_DYNAMICS_CONFIG.finaleCompressStrength
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0 && v <= 3) setDynamics('finaleCompressStrength', v);
              }}
            />
          </div>
        </div>
      </SubCard>

      {/* ── Section 3: Bonus (Race Plan Bonus + Phase-Split Bonuses) ── */}
      <SubCard
        title="Bonus"
        subtitle="The Race-Plan area bonuses and their per-phase (EARLY / POST) gating."
      >
        <SubHeading
          label="Race Plan Bonus"
          note="Scales the Race Plan area bonuses and controls the timing of the bonus fade and P-controller window."
          onReset={resetRacePlanBonus}
          resetTestId="reset-race-plan-bonus"
        />
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
        <SubHeading
          label="Phase-Split Bonuses"
          note="Gates the area bonus (target-band speed nudge) and the start-row catch-up bonus by race phase — EARLY (chaos) and POST — via the master switch below (it also gates the PULK-phase area/row bonuses, which live in the PULK Phase section). Area strengths are in the same units as the Race Plan bonus multiplier (2.0 = full, 0 = off); row strengths are fractions (1 = full, 0 = off). Shipped: EARLY + POST full."
          onReset={resetPhaseSplit}
          resetTestId="reset-phase-split"
        />
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
              tip: 'Area-bonus strength after PULK, into the OUTCOME window. 1.0 = shipped. (The PULK-phase area bonus lives in the PULK Phase section.)',
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

      {/* ── Section 4: Start (the race's starting grid) ── */}
      <SubCard
        title="Start"
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

      {/* ── Section 5: PULK Phase — the 5 rotation controls + the PULK bonuses (Weg B, one card) ── */}
      <SubCard
        title="PULK Phase"
        onReset={resetPulk}
        resetTestId="reset-pulk"
        subtitle="The PULK phase — the mid-race window [0.25, PULK end] where the lead rotation stages a real front contest (always live). The boundary sets where PULK hands off to OUTCOME; the leader brake + challenger boost set the front-action strength; the drop depth is the depth lever (how far a dethroned leader falls before release); intensity sets the overall choreography drama. Advanced envelope + rotation internals are pinned to their tuned defaults."
      >
        <div className={s.formGrid}>
          {[
            {
              key: 'choreoOutcomeStart',
              label: 'PULK end / OUTCOME begins (0.25–0.55)',
              min: 0.25,
              max: 0.55,
              step: 0.05,
              tip: "Where the PULK window ends and OUTCOME (the pack's band-steering) begins — one boundary, no TRANSITION phase. PULK runs [0.25, this] with the lead rotation live throughout; raising it lengthens the PULK contest and hands OUTCOME off later. 0.5 = shipped.",
            },
            {
              key: 'pulkLeaderBrake',
              label: 'Leader brake',
              min: 0,
              max: 0.15,
              step: 0.01,
              tip: 'How hard the live leader is slowed so a chaser can close. Only slows; never speeds anyone up. 0.10 = shipped.',
            },
            {
              key: 'pulkChallengerBoost',
              label: 'Challenger boost (cap)',
              min: 0,
              max: 0.12,
              step: 0.01,
              tip: 'Maximum forward boost given to a catching challenger to close on the leader (capped by the realism envelope). 0.06 = shipped.',
            },
            {
              key: 'pulkLeadRotationDropDepthLengths',
              label: 'Ex-leader drop depth (lengths)',
              min: 1,
              max: 8,
              step: 1,
              tip: 'How far (racer lengths) the just-dethroned leader is braked back before release — the DEPTH LEVER. Small = tight top-group rotation; large = the ex-leader leaves the front and the rotation migrates through the field. 8 = shipped.',
            },
            {
              key: 'choreoIntensity',
              label: 'Choreography intensity (0–1)',
              min: 0,
              max: 1,
              step: 0.05,
              tip: 'Overall drama intensity of the hero choreography curves. Low = calm; high = deeper comebacks, more duels, later reveals. Auto-clamped per race so it can never break fairness. 0.6 = shipped.',
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
        <SubHeading
          label="PULK bonuses"
          note="Phase-split bonuses + cohesion bias that act ONLY inside the PULK window [0.25, PULK end]. The area/row bonuses are gated by the Phase-Split master switch in the Bonus section above; the cohesion bias pulls the pulk racers’ re-roll draws toward the pack centroid. All ship flat (bonuses 0, bias 2.0) for the shipped PULK."
          onReset={resetPulkBonuses}
          resetTestId="reset-pulk-bonuses"
        />
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Area bonus — PULK
              <InfoTooltip text="Area-bonus strength inside the PULK window (target-band speed nudge). Gated by the Phase-Split master switch. Acts only inside the PULK window [0.25, PULK end]. 0 = shipped." />
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
              <InfoTooltip text="Start-row catch-up bonus fraction inside the PULK window. Gated by the Phase-Split master switch. Acts only inside the PULK window [0.25, PULK end]. 0 = shipped." />
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
              <InfoTooltip text="How strongly the pulk racers' re-roll draws are pulled back toward the pack centroid, so the field stays together and does not string out before the contest. Acts only inside the PULK window [0.25, PULK end]. 0 = no cohesion; higher = tighter pack. 2.0 = shipped." />
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
        {/* ── B2 Attackers — last in the card because they resolve latest: cast at the choreo
            boundary, peak mid-race, released into OUTCOME. ── */}
        <SubHeading
          label="B2 Attackers"
          note="Extra choreographed heroes cast from the front of the B2 field. Each climbs to about rank 5 mid-race, then falls back and is RELEASED to reorder freely the moment it re-enters B2 — the scripted duel at the front-of-B2 boundary is what registers as top-5 action. Shipped ON at 3; the two knobs are how many are cast and how far a released one may drift before the servo takes it back."
          onReset={resetB2Attackers}
          resetTestId="reset-b2-attackers"
        />
        <div className={s.formGrid}>
          {[
            {
              key: 'b2AttackHeroes',
              label: 'B2-attacker count (0–5)',
              min: 0,
              max: 5,
              step: 1,
              tip: 'How many B2-attacker heroes are cast per race. 3 = shipped (sim: ≈ +20% top-5 OUTCOME action with B1/B2 band-reach ≥70% and no Holm regression). 0 casts none and restores the pre-feature game byte-identically.',
            },
            {
              key: 'packReSteerThreshold',
              label: 'Attacker re-steer threshold (0.5–3.0)',
              min: 0.5,
              max: 3.0,
              step: 0.1,
              tip: 'Release hysteresis for a FREED attacker: how far (ranks) it may drift past its band edge before the servo re-engages at full pinning and steers it back; it is freed again only once fully inside. Integer rank error ⇒ 0.5 ≈ re-steer at ≥1 rank out, 1.5 ≈ ≥2 ranks. Larger = more freedom, more endgame leak. 1.0 = shipped.',
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
    </>
  );
});

export default DynamicsTuningSection;
