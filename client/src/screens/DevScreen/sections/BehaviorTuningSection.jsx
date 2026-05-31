import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../../modules/raceBehaviorConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { SubCard } from './SubCard.jsx';
import s from '../DevScreen.module.css';

const INTERDEP_WARNING_STYLE = {
  fontSize: '0.75rem',
  color: '#f59e0b',
  background: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.28)',
  borderRadius: '4px',
  padding: '0.3rem 0.5rem',
  marginTop: '0.35rem',
  lineHeight: 1.4,
};
const INTERDEP_WARNING =
  '⚠️ These 8 parameters were optimized together via simulation. ' +
  'Changing any one requires reviewing all others. Change with caution.';

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
      avoidanceDistance: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance,
      tWeight: DEFAULT_RACE_BEHAVIOR_CONFIG.tWeight,
      yWeight: DEFAULT_RACE_BEHAVIOR_CONFIG.yWeight,
      lateralForce: DEFAULT_RACE_BEHAVIOR_CONFIG.lateralForce,
      lateralDamping: DEFAULT_RACE_BEHAVIOR_CONFIG.lateralDamping,
      maxLateral: DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateral,
    }));
  }

  function resetSpeedBrake() {
    setBehaviorConfig((prev) => ({
      ...prev,
      speedBrakeYThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeYThreshold,
      speedBrakeTThreshold: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTThreshold,
      speedBrakeFactor: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor,
      avoidanceWarmupMs: DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceWarmupMs,
    }));
  }

  function resetHomeForce() {
    setBehaviorConfig((prev) => ({
      ...prev,
      homeForceStrength: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength,
      homeForceReductionOnOverlap: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceReductionOnOverlap,
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lateral Damping
              <InfoTooltip text="Fraction of lateral velocity retained each frame (0–1, must stay below 0.5). Higher = faster separation, smoother overlap resolution. Too high (≥0.5) causes oscillation. Optimized value: 0.45." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Lateral Damping"
              min={0.05}
              max={0.49}
              step={0.01}
              value={behaviorConfig.lateralDamping}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < 0.5) setBehavior('lateralDamping', v);
              }}
            />
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
          </div>
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
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Home Force Reduction On Overlap
              <InfoTooltip text="How much of its normal home force a racer keeps while in geometric overlap with another racer. 1.0 = full home force (no reduction). 0.0 = home force off during overlap. Lower values give free-lane separation more room to push overlapping racers apart." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Home Force Reduction On Overlap"
              min={0.0}
              max={1.0}
              step={0.05}
              value={behaviorConfig.homeForceReductionOnOverlap}
              disabled={!behaviorConfig.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 1) setBehavior('homeForceReductionOnOverlap', v);
              }}
            />
            <p style={INTERDEP_WARNING_STYLE}>{INTERDEP_WARNING}</p>
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
