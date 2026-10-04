// ============================================================
// File:        BehaviorTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: DevScreen section — UI controls for racer behavior tuning
//              (avoidance, drafting, and priority mode config).
// ============================================================

import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  // MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../../modules/raceBehaviorConfig.js';
import { Info } from './ControlInfo.jsx';
import { KEYS } from '../../../modules/storage/storage.js';
import { useSyncedConfig } from './useSyncedConfig.js';
import { SubCard } from './SubCard.jsx';
import s from '../DevScreen.module.css';

function BehaviorTuningSection({ part }) {
  // Through its own loader and saver, kept in step with every other mounted part (useSyncedConfig).
  const [behaviorConfig, setBehaviorConfig, saveFailed] = useSyncedConfig(
    KEYS.RACE_BEHAVIOR_CONFIG,
    loadRaceBehaviorConfig,
    saveRaceBehaviorConfig
  );
  const storageError = saveFailed ? 'Settings could not be saved — storage is full.' : null;
  // DEVSCREEN-CHAPTERS-1: two parts, both in The race — how racers act among each other, and the
  // start layout (placed with the start). Without `part` both render.
  const show = (name) => !part || part === name;

  function setBehavior(key, val) {
    setBehaviorConfig((prev) => ({ ...prev, [key]: val }));
  }

  function resetStartLayout() {
    setBehaviorConfig((prev) => ({
      ...prev,
      startSpreadRange: DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange,
      runoutZone: DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone,
    }));
  }

  function resetDrafting() {
    setBehaviorConfig((prev) => ({
      ...prev,
      draftingMaxDistance: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingMaxDistance,
      draftingConeAngle: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingConeAngle,
      draftingBoost: DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoost,
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
      avoidanceBufferPct: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceBufferPct,
      maxLateral: DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateral,
    }));
  }

  function resetSpeedBrake() {
    setBehaviorConfig((prev) => ({
      ...prev,
      avoidanceWarmupMs: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceWarmupMs,
    }));
  }

  function resetLookBeforeBrake() {
    setBehaviorConfig((prev) => ({
      ...prev,
      lookBeforeBrakeEnabled: DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeEnabled,
      lookBeforeBrakePassStrength: DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakePassStrength,
      lookBeforeBrakeReengageTMultiplier:
        DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeReengageTMultiplier,
      lookBeforeBrakeLagFrames: DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeLagFrames,
      lookBeforeBrakeRequireSlowerLeader:
        DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeRequireSlowerLeader,
      lookBeforeBrakeMinDifferential: DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeMinDifferential,
      maxLateralSpeedPerStep: DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateralSpeedPerStep,
    }));
  }

  function resetSoftSteering() {
    setBehaviorConfig((prev) => ({
      ...prev,
      softSteeringSymmetric: DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringSymmetric,
      softSteeringStrength: DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringStrength,
      softSteeringClearancePct: DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringClearancePct,
      softSteeringHysteresisY: DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringHysteresisY,
    }));
  }

  return (
    <>
      {storageError && (
        <p style={{ color: 'var(--color-error, #e55)', margin: 0, fontSize: '0.85rem' }}>
          ⚠ {storageError}
        </p>
      )}

      {show('interaction') && (
        <>
          {/* Race Behavior toggle — the master switch, first: everything below it in this group stops acting when it is off. */}
          <div className={s.card}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              data-control-id="BehaviorTuningSection:enabled"
            >
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
                <Info id="BehaviorTuningSection:enabled" />
              </label>
            </div>
          </div>
          {/* ── Block 5: Drafting / Slipstream ── */}
          <SubCard
            title="Drafting / Slipstream"
            onReset={resetDrafting}
            resetTestId="reset-drafting"
            resetControlId="BehaviorTuningSection:reset-drafting"
            subtitle="When a racer follows closely behind another racer, they get a small speed boost from the slipstream — just like in real-world cycling or motor sports. This makes overtaking on straight sections possible. Without drafting, slow racers would never catch up; with too much, racers chain together in dense pelotons."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:draftingMaxDistance"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Max Distance (world px)
                  <Info id="BehaviorTuningSection:draftingMaxDistance" />
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
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:draftingConeAngle"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Cone Angle (°)
                  <Info id="BehaviorTuningSection:draftingConeAngle" />
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
              <div className={s.formGroup} data-control-id="BehaviorTuningSection:draftingBoost">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Boost Factor
                  <Info id="BehaviorTuningSection:draftingBoost" />
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
              At defaults: follower within <strong>{behaviorConfig.draftingMaxDistance} px</strong>{' '}
              and within a <strong>{behaviorConfig.draftingConeAngle}°</strong> cone receives a{' '}
              <strong style={{ color: 'var(--color-accent)' }}>
                +{((behaviorConfig.draftingBoost - 1) * 100).toFixed(0)}%
              </strong>{' '}
              speed boost.
            </p>
          </SubCard>

          {/* ── Block 6: Comfort Zone ── */}
          <SubCard
            title="Comfort Zone"
            onReset={resetComfortZone}
            resetTestId="reset-comfort-zone"
            resetControlId="BehaviorTuningSection:reset-comfort-zone"
            subtitle="Racers have a personal space bubble — when another racer gets too close, they automatically push apart to keep some breathing room. This block controls how big the bubble is and how forcefully racers react when crowded. Looser values create open spacious races; tighter values let racers form dense packs."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="BehaviorTuningSection:comfortThreshold">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Comfort Threshold
                  <Info id="BehaviorTuningSection:comfortThreshold" />
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
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:softRepulsionStrength"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Soft Repulsion Strength
                  <Info id="BehaviorTuningSection:softRepulsionStrength" />
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
            resetControlId="BehaviorTuningSection:reset-soft-avoidance"
            subtitle="When racers are about to collide, they steer around each other instead of overlapping. The buffer controls how early avoidance forces engage — a small lead time before bodies actually touch so forces can push racers apart smoothly."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:avoidanceBufferPct"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Avoidance Buffer (% of body size)
                  <Info id="BehaviorTuningSection:avoidanceBufferPct" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Avoidance Buffer"
                  min={0}
                  max={2.0}
                  step={0.05}
                  value={
                    behaviorConfig.avoidanceBufferPct ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceBufferPct
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0) setBehavior('avoidanceBufferPct', v);
                  }}
                />
              </div>
              <div className={s.formGroup} data-control-id="BehaviorTuningSection:maxLateral">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Max Lateral
                  <Info id="BehaviorTuningSection:maxLateral" />
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
            resetControlId="BehaviorTuningSection:reset-speed-brake"
            subtitle="When a racer ends up directly behind another racer with no clear way to overtake, they slow down a bit instead of rear-ending them. This block controls when the brake kicks in (how close, how directly behind) and how strongly they slow down. Prevents visual collisions in tight packs."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:avoidanceWarmupMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Avoidance Warmup (ms)
                  <Info id="BehaviorTuningSection:avoidanceWarmupMs" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Avoidance Warmup Ms"
                  min={0}
                  max={8000}
                  step={100}
                  value={behaviorConfig.avoidanceWarmupMs}
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0) setBehavior('avoidanceWarmupMs', v);
                  }}
                />
              </div>
            </div>
          </SubCard>

          {/* ── Look Before You Brake ── */}
          <SubCard
            title="Look Before You Brake"
            onReset={resetLookBeforeBrake}
            resetTestId="reset-look-before-brake"
            resetControlId="BehaviorTuningSection:reset-look-before-brake"
            subtitle="When a racer catches a slower racer directly ahead and there is a free lane to the side, it commits to that lane early and passes at speed — instead of braking first and only steering aside once it has caught up. If both sides are blocked it still brakes exactly as before, so racers never overlap."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakeEnabled"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Enabled
                  <Info id="BehaviorTuningSection:lookBeforeBrakeEnabled" />
                </label>
                <input
                  type="checkbox"
                  aria-label="Look Before Brake Enabled"
                  checked={
                    behaviorConfig.lookBeforeBrakeEnabled ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeEnabled
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => setBehavior('lookBeforeBrakeEnabled', e.target.checked)}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakePassStrength"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Pass Strength
                  <Info id="BehaviorTuningSection:lookBeforeBrakePassStrength" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Look Before Brake Pass Strength"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={
                    behaviorConfig.lookBeforeBrakePassStrength ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakePassStrength
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v > 0) setBehavior('lookBeforeBrakePassStrength', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakeReengageTMultiplier"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Re-engage Margin
                  <Info id="BehaviorTuningSection:lookBeforeBrakeReengageTMultiplier" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Look Before Brake Reengage Multiplier"
                  min={1.0}
                  max={1.5}
                  step={0.05}
                  value={
                    behaviorConfig.lookBeforeBrakeReengageTMultiplier ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeReengageTMultiplier
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 1) setBehavior('lookBeforeBrakeReengageTMultiplier', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:maxLateralSpeedPerStep"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Max Lateral Speed
                  <Info id="BehaviorTuningSection:maxLateralSpeedPerStep" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Max Lateral Speed Per Step"
                  min={0.005}
                  max={1.0}
                  step={0.005}
                  value={
                    behaviorConfig.maxLateralSpeedPerStep ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateralSpeedPerStep
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v > 0) setBehavior('maxLateralSpeedPerStep', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakeLagFrames"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Lag-Safety Frames
                  <Info id="BehaviorTuningSection:lookBeforeBrakeLagFrames" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Look Before Brake Lag Frames"
                  min={1}
                  max={5}
                  step={1}
                  value={
                    behaviorConfig.lookBeforeBrakeLagFrames ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeLagFrames
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 1) setBehavior('lookBeforeBrakeLagFrames', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakeRequireSlowerLeader"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Only Pass Slower Racers
                  <Info id="BehaviorTuningSection:lookBeforeBrakeRequireSlowerLeader" />
                </label>
                <input
                  type="checkbox"
                  aria-label="Look Before Brake Require Slower Leader"
                  checked={
                    behaviorConfig.lookBeforeBrakeRequireSlowerLeader ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeRequireSlowerLeader
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) =>
                    setBehavior('lookBeforeBrakeRequireSlowerLeader', e.target.checked)
                  }
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:lookBeforeBrakeMinDifferential"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Min Overtake Differential
                  <Info id="BehaviorTuningSection:lookBeforeBrakeMinDifferential" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Look Before Brake Min Differential"
                  min={0.001}
                  max={0.1}
                  step={0.005}
                  value={
                    behaviorConfig.lookBeforeBrakeMinDifferential ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeMinDifferential
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v > 0) setBehavior('lookBeforeBrakeMinDifferential', v);
                  }}
                />
              </div>
            </div>
          </SubCard>

          {/* ── Layer 1 — Soft Steering ── */}
          <SubCard
            title="Layer 1 — Soft Steering"
            onReset={resetSoftSteering}
            resetTestId="reset-soft-steering"
            resetControlId="BehaviorTuningSection:reset-soft-steering"
            subtitle="The lateral steering model: each racer is pulled toward a single target position by one spring (replaces the former home + avoidance + free-lane + commit + gap forces). The hard-separation backstop and the sustained-overlap escape stay active."
            disabled={!behaviorConfig.enabled}
          >
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:softSteeringSymmetric"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Symmetric (both yield)
                  <Info id="BehaviorTuningSection:softSteeringSymmetric" />
                </label>
                <input
                  type="checkbox"
                  aria-label="Soft Steering Symmetric"
                  checked={
                    behaviorConfig.softSteeringSymmetric ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringSymmetric
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => setBehavior('softSteeringSymmetric', e.target.checked)}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:softSteeringStrength"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Strength
                  <Info id="BehaviorTuningSection:softSteeringStrength" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Soft Steering Strength"
                  min={0.005}
                  max={0.2}
                  step={0.005}
                  value={
                    behaviorConfig.softSteeringStrength ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringStrength
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v > 0) setBehavior('softSteeringStrength', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:softSteeringClearancePct"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Clearance (% of body)
                  <Info id="BehaviorTuningSection:softSteeringClearancePct" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Soft Steering Clearance Pct"
                  min={0.0}
                  max={0.5}
                  step={0.05}
                  value={
                    behaviorConfig.softSteeringClearancePct ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringClearancePct
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0) setBehavior('softSteeringClearancePct', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="BehaviorTuningSection:softSteeringHysteresisY"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Hysteresis Y
                  <Info id="BehaviorTuningSection:softSteeringHysteresisY" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Soft Steering Hysteresis Y"
                  min={0.0}
                  max={0.1}
                  step={0.005}
                  value={
                    behaviorConfig.softSteeringHysteresisY ??
                    DEFAULT_RACE_BEHAVIOR_CONFIG.softSteeringHysteresisY
                  }
                  disabled={!behaviorConfig.enabled}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0) setBehavior('softSteeringHysteresisY', v);
                  }}
                />
              </div>
            </div>
          </SubCard>
        </>
      )}
      {show('startLayout') && (
        <>
          {/* ── Block 2: Start Layout ── */}
          <SubCard
            title="Start Layout"
            onReset={resetStartLayout}
            resetTestId="reset-start-layout"
            resetControlId="BehaviorTuningSection:reset-start-layout"
            subtitle="How racers are positioned at the start and how the finish area is laid out. Affects whether racers begin tightly packed or spread out, and how much space there is to celebrate the finish before they leave the screen."
          >
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="BehaviorTuningSection:startSpreadRange">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Start Spread Range
                  <Info id="BehaviorTuningSection:startSpreadRange" />
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
              <div className={s.formGroup} data-control-id="BehaviorTuningSection:runoutZone">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Runout Zone
                  <Info id="BehaviorTuningSection:runoutZone" />
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
        </>
      )}
    </>
  );
}

export default BehaviorTuningSection;
