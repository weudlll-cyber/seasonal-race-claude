// ============================================================
// File:        BehaviorTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: DevScreen section — UI controls for racer behavior tuning
//              (avoidance, drafting, and priority mode config).
// ============================================================

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../../modules/raceBehaviorConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { SubCard } from './SubCard.jsx';
import s from '../DevScreen.module.css';

const BehaviorTuningSection = forwardRef(function BehaviorTuningSection(_, ref) {
  const [behaviorConfig, setBehaviorConfig] = useState(() => loadRaceBehaviorConfig());
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    const ok = saveRaceBehaviorConfig(behaviorConfig);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [behaviorConfig]);

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

  function resetAll() {
    setBehaviorConfig({ ...DEFAULT_RACE_BEHAVIOR_CONFIG });
  }

  useImperativeHandle(ref, () => ({ resetAll }));

  return (
    <>
      {storageError && (
        <p style={{ color: 'var(--color-error, #e55)', margin: 0, fontSize: '0.85rem' }}>
          ⚠ {storageError}
        </p>
      )}

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
        subtitle="When racers are about to collide, they steer around each other instead of overlapping. The buffer controls how early avoidance forces engage — a small lead time before bodies actually touch so forces can push racers apart smoothly."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Avoidance Buffer (% of body size)
              <InfoTooltip text="How early avoidance forces engage before bodies actually touch. 20% means forces start when centers are within 120% of the contact distance. Higher = forces engage earlier, more space between racers. Lower = racers get very close before forces start. Tune live; re-run a sweep after settling on a value." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Avoidance Buffer"
              min={0}
              max={2.0}
              step={0.05}
              value={behaviorConfig.avoidanceBufferPct ?? 0.2}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v) && v >= 0) setBehavior('avoidanceBufferPct', v);
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
              Avoidance Warmup (ms)
              <InfoTooltip text="Open tracks only. Eases in the speed-brake over this many milliseconds from race start, giving rear-row racers a window to overtake in t-space. 0 = no ramp (full braking immediately). 3000 = 3-second ease-in." />
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
        subtitle="When a racer catches a slower racer directly ahead and there is a free lane to the side, it commits to that lane early and passes at speed — instead of braking first and only steering aside once it has caught up. If both sides are blocked it still brakes exactly as before, so racers never overlap."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Enabled
              <InfoTooltip text="On = take a free lane and pass at speed when one exists. Off = pre-feature behavior (always brake behind a slower racer in the same lane, even with a free lane). The fairness sweep verifies overlap does not increase either way." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Pass Strength
              <InfoTooltip text="How decisively a racer swerves into the free lane while passing. Higher = snappier, clears the slower racer sooner (more likely to pass at speed). Lower = gentler, and if it cannot clear in time the brake re-engages. Much stronger than the general Soft Steering spring by design." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Re-engage Margin
              <InfoTooltip text="How much longitudinal room (as a multiple of the two bodies' contact length) a racer keeps before the brake comes back if it has not yet cleared into the free lane. Higher = brake re-engages earlier (safer, fewer passes). Lower = commits longer to the pass. Must sit between 1.0 and the Speed Brake zone multiplier (1.5)." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Lateral Speed
              <InfoTooltip text="Uniform cap on how far a racer moves sideways per physics step (dodge-out and return alike) — stops the instant sideways 'jump'. Lower = smoother glide, but the dodge must start earlier (racers may brake and wait more, and the pack can fan out a little). Very large = no cap (near-instant dodge, prior behavior). Sweet-spot is tuned with the governor sweep." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lag-Safety Frames
              <InfoTooltip text="The brake takes effect one frame after it is decided. This reserves that many frames of worst-case closing as extra lead before the brake re-engages, so a racer that fails to clear still brakes in time and never overlaps — the anti-overlap guarantee, not the last-resort separation. 2 = one lag frame plus one frame of margin. Higher = safer / passes a touch less aggressively." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Only Pass Slower Racers
              <InfoTooltip text="On = only take a free lane when the racer ahead is genuinely slower (a real overtake), so racers don't weave around same-speed traffic for no gain. Off = take a free lane behind any same-lane racer in the brake zone." />
            </label>
            <input
              type="checkbox"
              aria-label="Look Before Brake Require Slower Leader"
              checked={
                behaviorConfig.lookBeforeBrakeRequireSlowerLeader ??
                DEFAULT_RACE_BEHAVIOR_CONFIG.lookBeforeBrakeRequireSlowerLeader
              }
              disabled={!behaviorConfig.enabled}
              onChange={(e) => setBehavior('lookBeforeBrakeRequireSlowerLeader', e.target.checked)}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Overtake Differential
              <InfoTooltip text="How much faster (as a fraction of speed) a racer must be than the one ahead before it will take a free lane and pass. Dedicated to look-before-brake — independent of the brake-to-match threshold. Higher = only clearly faster racers pass, so the mid-field weaves less. 0.005 = 0.5% (default, matches the previous shared threshold); 0.02 = 2%." />
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
        subtitle="The lateral steering model: each racer is pulled toward a single target position by one spring (replaces the former home + avoidance + free-lane + commit + gap forces). The hard-separation backstop and the sustained-overlap escape stay active."
        disabled={!behaviorConfig.enabled}
      >
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Symmetric (both yield)
              <InfoTooltip text="Off = asymmetric: only the trailer (rear racer) steers around the obstacle, the leader holds its line (matches the legacy avoidance design). On = both racers of a pair steer around each other. The fairness sweep decides which is better." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Strength
              <InfoTooltip text="Spring constant: each frame the racer moves a fraction of the way toward its target (delta += (target − position) × strength). Higher = snappier steering, lower = gentler. Not calibrated — sweep first." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Clearance (% of body)
              <InfoTooltip text="Extra gap to the obstacle beyond one contact width, as a fraction of that width. 0 = aim exactly at the contact distance; 0.5 = aim 50% further out. A tuning lever for the sweep." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Hysteresis Y
              <InfoTooltip text="Dead-zone around the obstacle's centerline within which the chosen side stays fixed, preventing a left/right pendulum when a racer sits near the obstacle's line. Analogous to the commit dead-zone." />
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

      {/* Race Behavior toggle */}
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
    </>
  );
});

export default BehaviorTuningSection;
