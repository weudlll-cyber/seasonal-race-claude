// ============================================================
// File:        DynamicsTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: DevScreen section — UI controls for race dynamics: base speed,
//              start row layout, race dynamics, and frame timing config.
// ============================================================

import {
  loadBaseSpeedConfig,
  saveBaseSpeedConfig,
  // MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
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
// GAP-BRAKE-1: read `referenceCorridorPx` from the shipped camera defaults rather than copying
// the number, so the canvas-width conversion follows the yardstick if the owner ever moves it.
import { DEFAULT_CAMERA_CONFIG } from '../../../modules/storage/defaults.js';
import {
  loadFrameTimingConfig,
  saveFrameTimingConfig,
  DEFAULT_FRAME_TIMING_CONFIG,
  SCOREBOARD_INTERVAL_MIN_MS,
  SCOREBOARD_INTERVAL_MAX_MS,
} from '../../../modules/frameTimingConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { Info } from './ControlInfo.jsx';
import { useTestAids } from '../../../modules/testAids.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { useSyncedConfig } from './useSyncedConfig.js';
import { SubCard, SubHeading } from './SubCard.jsx';
import s from '../DevScreen.module.css';

// ── GAP-BRAKE-1: the owner's unit, and the one place that converts it ─────────────────────────
//
// He judges a lead in CANVAS WIDTHS (his photographed breakaway was 0.698 corrected). The engine
// cannot use that unit: a canvas width is `canvasH / (camZoom * axisY)` (camera/zoomUnit.js:119),
// so it follows the LIVE camera zoom, which is not deterministic from the race seed and must
// never reach the physics. The stored key is therefore world px and the conversion lives HERE.
//
// ★ THE YARDSTICK IS THE LEADER SHOT. `visibleWorldPx = corridors * referenceWidthPx` by
// construction (zoomUnit.js:44, where the world size cancels), so a canvas width is only a fixed
// distance once a shot is named. The one to name is LEADER_ZOOM, which defaults.js calls "the
// reference shot, the owner's own eye" — LEADER_ZOOM.visibleCorridors x referenceCorridorPx world
// px (0.75 x 300 = 225 when this was written; the LEADER default moved on 2026-10-01, which is
// exactly why it is read and not restated). Both halves are READ from the
// shipped camera defaults rather than restated (MIRRORS-BY-REFERENCE, L207), so the conversion
// follows the picture if either ever moves.
//
// Converting against the bare referenceCorridorPx (300) instead would make every allowance 33%
// too permissive. Inside the brake's window the camera actually runs 0.4–1.5 corridors, and at
// the moment a race reaches its biggest lead the measured median shot is 165 px, not 225 — so the
// hint under the field says the yardstick is a yardstick and not a promise.
const GAP_BRAKE_REFERENCE_PX = Math.round(
  DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors *
    DEFAULT_CAMERA_CONFIG.referenceCorridorPx
);
const gapWidthsFromPx = (px) =>
  Math.round(((Number(px) || 0) / GAP_BRAKE_REFERENCE_PX) * 100) / 100;
const gapPxFromWidths = (w) => Math.round((Number(w) || 0) * GAP_BRAKE_REFERENCE_PX);

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

function DynamicsTuningSection({ part }) {
  // TEST-AIDS-1: the gap re-roll marker (item 25) is locked while the test-aids switch is OFF.
  const aids = useTestAids();
  // Each block through its own loader and saver, kept in step with every other mounted part of
  // this section (useSyncedConfig) — the chapters mount several at once.
  const [speedConfig, setSpeedConfig] = useSyncedConfig(
    KEYS.BASE_SPEED_CONFIG,
    loadBaseSpeedConfig,
    saveBaseSpeedConfig
  );
  const [rowConfig, setRowConfig, rowSaveFailed] = useSyncedConfig(
    KEYS.ROW_LAYOUT_CONFIG,
    loadRowLayoutConfig,
    saveRowLayoutConfig
  );
  const [dynamicsConfig, setDynamicsConfig] = useSyncedConfig(
    KEYS.RACE_DYNAMICS_CONFIG,
    loadRaceDynamicsConfig,
    saveRaceDynamicsConfig
  );
  const [frameTimingConfig, setFrameTimingConfig] = useSyncedConfig(
    KEYS.FRAME_TIMING_CONFIG,
    loadFrameTimingConfig,
    saveFrameTimingConfig
  );
  const storageError = rowSaveFailed ? 'Settings could not be saved — storage is full.' : null;
  // Which blocks this mount shows; without `part` (the section's own tests) it shows them all.
  const show = (name) => !part || part === name;
  // SCOREBOARD-CADENCE-1: the fallback covers a config saved before this key existed, so the control
  // shows the value the race will actually use rather than an empty box.
  const scoreboardIntervalMs =
    frameTimingConfig.scoreboardIntervalMs ?? DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs;

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

  // Gap-based leader brake (GAP-BRAKE-1) — its own group: the switch, the allowance and the
  // window end are one mechanism. Resetting returns it to SHIPPED, which is ON (decided 2026-09-16).
  function resetGapBrake() {
    setDynamicsConfig((prev) => ({
      ...prev,
      gapBrakeEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeEnabled,
      gapBrakeAllowedGapPx: DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeAllowedGapPx,
      gapBrakeWindowEnd: DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeWindowEnd,
      gapBrakeMaxAuthority: DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority,
      // V1 sits in this group's reset because the pair is what must not be on together: one press
      // returns BOTH to shipped, which is both OFF.
      servoNoiseBlindEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.servoNoiseBlindEnabled,
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

  // The PULK Phase card: reset only the 6 card-level controls. The B2-attacker pair has its own
  // group Reset, and the pinned internals (envelope/safety + rotation internals + choreo
  // fine-tuning) keep their config defaults — they have no DevScreen control, so they are not
  // user-resettable here.
  function resetPulk() {
    setDynamicsConfig((prev) => ({
      ...prev,
      racePlanPulkStart: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart,
      choreoOutcomeStart: DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart,
      pulkLeaderBrake: DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake,
      pulkChallengerBoost: DEFAULT_RACE_DYNAMICS_CONFIG.pulkChallengerBoost,
      pulkLeadRotationDropDepthLengths:
        DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDropDepthLengths,
      choreoIntensity: DEFAULT_RACE_DYNAMICS_CONFIG.choreoIntensity,
      // CHASE-AFTER-OUTCOME lives in this group because it IS the PULK governor, just past its
      // boundary — one press returns all three to shipped, which is the extension ON.
      chaseAfterOutcomeEnabled: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeEnabled,
      chaseAfterOutcomeSelection: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSelection,
      chaseAfterOutcomeSlots: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSlots,
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

      {/* ══ DevScreen order (DEVSCREEN-CHAPTERS-1): each block is one PART, placed in the chapter
          the design gives it — the race-timeline order of The race, Frame Timing in Look. ══ */}
      {show('pace') && (
        <>
          {/* ── Pace: Normal Track Speed + Speed Range ── */}
          <div className={s.card}>
            <SubHeading
              label="Normal Track Speed"
              note="THE pace of the game: how fast a normal racer travels, in track pixels per second. One number for every track and every racer class. Everything else follows from it — a closed race's duration is laps × track length ÷ this speed, and an open track's finish line is wherever a normal racer is after the chosen time. Raise it and every race gets shorter; lower it and every race gets longer."
              onReset={resetNormalSpeed}
              resetTestId="reset-normal-speed"
              resetControlId="DynamicsTuningSection:reset-normal-speed"
            />
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:normalSpeedPxPerSec"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Normal Speed (px/s)
                  <Info id="DynamicsTuningSection:normalSpeedPxPerSec" />
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
              resetControlId="DynamicsTuningSection:reset-speed-range"
            />
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:min">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Min Speed
                  <Info id="DynamicsTuningSection:min" />
                </label>
                {/* E2E-STALE-2: named, like `normal-speed-input` above it. The browser suite used to
                    reach these two by POSITION — `input[type=number]`.first()/.nth(1) inside a section
                    called "Base Speed" — and both halves of that broke when the section was folded into
                    Race Tuning. A name is the only thing that makes those tests a repair rather than a
                    rewrite every time this screen is rearranged. */}
                <input
                  type="number"
                  data-testid="min-speed-input"
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
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:max">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Max Speed
                  <Info id="DynamicsTuningSection:max" />
                </label>
                <input
                  type="number"
                  data-testid="max-speed-input"
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
                <p
                  data-testid="speed-spread-preview"
                  style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}
                >
                  Mean: <strong style={{ color: 'var(--color-accent)' }}>{mean}</strong>
                  {'  ·  '}
                  Spread:{' '}
                  <strong
                    data-testid="speed-spread-percent"
                    style={{
                      color:
                        spread > 20 ? '#f59e0b' : spread > 15 ? '#fb923c' : 'var(--color-accent)',
                    }}
                  >
                    ±{spread.toFixed(1)}%
                  </strong>{' '}
                  from mean ({(spread * 2).toFixed(0)}% total range)
                  {'  ·  '}
                  On a 2-lap race: leader finishes ~
                  <strong>
                    {(2 * (1 - speedConfig.min / speedConfig.max)).toFixed(2)} laps
                  </strong>{' '}
                  ahead of last
                  <InfoTooltip text="gap = 2 × (1 − min/max). When the leader crosses 2 laps, the slowest racer is at 2 × (min/max) laps. Jitter adds per-racer oscillation on top. This is a closed-track estimate — open tracks end differently." />
                </p>
              ) : (
                <p style={{ fontSize: '0.82rem', color: '#ef4444' }}>
                  Invalid: min must be &gt; 0 and &lt; max.
                </p>
              )}
            </div>
          </div>
        </>
      )}
      {show('start') && (
        <>
          {/* ── Section 4: Start (the race's starting grid) ── */}
          <SubCard
            title="Start"
            onReset={resetRowStart}
            resetTestId="reset-row-start"
            resetControlId="DynamicsTuningSection:reset-row-start"
            subtitle="With many racers, they don't all fit in one starting row — they line up in multiple rows, like cars at a Grand Prix. This block controls the row spacing, how many racers fit per row, and how to compensate back-row racers so they aren't doomed by their starting position."
          >
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:rowGapMultiplier">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Row Gap Multiplier
                  <Info id="DynamicsTuningSection:rowGapMultiplier" />
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
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:speedBonusFactor">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Speed Bonus Factor
                  <Info id="DynamicsTuningSection:speedBonusFactor" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:maxCapacityFactor"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Max Capacity Factor
                  <Info id="DynamicsTuningSection:maxCapacityFactor" />
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
        </>
      )}
      {show('speedChanges') && (
        <>
          {/* ── Speed changes during the race: Speed Re-Roll + Gap-Cap Re-Roll ── */}
          <div className={s.card}>
            <SubHeading
              label="Speed Re-Roll"
              note="During a race, each racer's speed gets re-rolled periodically — meaning their speed changes from time to time, creating dramatic shifts. This is what makes leads change and prevents predictable outcomes. Without this, the fastest racer at the start would just stay in front the whole race."
              onReset={resetSpeedReRoll}
              resetTestId="reset-speed-reroll"
              resetControlId="DynamicsTuningSection:reset-speed-reroll"
            />
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:reRollVariationPercent"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Variation Width (%)
                  <Info id="DynamicsTuningSection:reRollVariationPercent" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:reRollTransitionDuration"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Transition Smoothness (s)
                  <Info id="DynamicsTuningSection:reRollTransitionDuration" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:trajectoryTransitionDuration"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Trajectory Transition Duration (s)
                  <Info id="DynamicsTuningSection:trajectoryTransitionDuration" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:reRollIntervalDivisor"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Re-Roll Frequency (÷ interval)
                  <Info id="DynamicsTuningSection:reRollIntervalDivisor" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:reRollLastPositionPercent"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Last Roll Position (%)
                  <Info id="DynamicsTuningSection:reRollLastPositionPercent" />
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
                <strong style={{ color: 'var(--color-accent)' }}>
                  {previewTimes.length} re-rolls
                </strong>
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
                  {Math.round(
                    PREVIEW_DURATION * (1 - dynamicsConfig.reRollLastPositionPercent / 100)
                  )}
                  s
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
              resetControlId="DynamicsTuningSection:reset-gap-reroll"
            />
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:gapRerollEnabled">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    checked={
                      dynamicsConfig.gapRerollEnabled ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled
                    }
                    onChange={(e) => setDynamics('gapRerollEnabled', e.target.checked)}
                    data-testid="gap-reroll-toggle"
                  />
                  Gap-Reroll enabled
                  {/* CITATIONS-1, 2026-09-03: this tip read "ON = shipped (symmetric, G=0.75,
                      strength=0.5): runaway winners 23% → 8.3%". Those are the values and the
                      measurement of the 2026-07-23 RETUNE, which the owner FLIPPED on 2026-07-26 to the
                      confirm-gate candidate. The two numbers are not restated here at all: G and
                      strength have their own controls immediately below and their one home is
                      defaults.js, which is how they came to be wrong here for 39 days. */}
                  <Info id="DynamicsTuningSection:gapRerollEnabled" />
                </label>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapRerollThresholdLengths"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Gap-Reroll G (lengths)
                  <Info id="DynamicsTuningSection:gapRerollThresholdLengths" />
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
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapRerollStrength"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Gap-Reroll strength
                  <Info id="DynamicsTuningSection:gapRerollStrength" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Gap-Reroll strength"
                  min={0}
                  max={1.5}
                  step={0.25}
                  value={
                    dynamicsConfig.gapRerollStrength ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0 && v <= 1.5) setDynamics('gapRerollStrength', v);
                  }}
                />
              </div>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:gapRerollMode">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Gap-Reroll mode
                  <Info id="DynamicsTuningSection:gapRerollMode" />
                </label>
                <select
                  className={s.input}
                  aria-label="Gap-Reroll mode"
                  data-testid="gap-reroll-mode"
                  value={dynamicsConfig.gapRerollMode ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollMode}
                  onChange={(e) => setDynamics('gapRerollMode', e.target.value)}
                >
                  <option value="symmetric">symmetric</option>
                  <option value="down">down-only</option>
                </select>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapRerollDevMarker"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    checked={
                      dynamicsConfig.gapRerollDevMarker ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollDevMarker
                    }
                    disabled={!aids}
                    onChange={(e) => setDynamics('gapRerollDevMarker', e.target.checked)}
                    data-testid="gap-reroll-devmarker-toggle"
                  />
                  Gap-Reroll dev marker
                  <Info id="DynamicsTuningSection:gapRerollDevMarker" />
                </label>
                {!aids && (
                  <p className={s.sectionDesc} data-testid="test-aids-off-reroll-marker">
                    {
                      'The test-aids switch is off, so this stays off in every race and cannot be switched on here. An admin turns it on at the top of Diagnostics and verification.'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {show('racePlan') && (
        <>
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
              resetControlId="DynamicsTuningSection:reset-race-plan-bonus"
            />
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanBonusStrengthMultiplier"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Race Plan Bonus Strength
                  <Info id="DynamicsTuningSection:racePlanBonusStrengthMultiplier" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Race Plan Bonus Strength Multiplier"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={
                    dynamicsConfig.racePlanBonusStrengthMultiplier ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 0.5 && v <= 3.0) setDynamics('racePlanBonusStrengthMultiplier', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanBonusTransitionEnd"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Bonus active until (% race)
                  <Info id="DynamicsTuningSection:racePlanBonusTransitionEnd" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Race Plan Bonus active until percent"
                  min={30}
                  max={95}
                  step={5}
                  value={Math.round(
                    (dynamicsConfig.racePlanBonusTransitionEnd ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd) * 100
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 30 && v <= 95) setDynamics('racePlanBonusTransitionEnd', v / 100);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanBonusFadeDuration"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Bonus fade duration (ms)
                  <Info id="DynamicsTuningSection:racePlanBonusFadeDuration" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Race Plan Bonus fade duration ms"
                  min={500}
                  max={5000}
                  step={500}
                  value={
                    dynamicsConfig.racePlanBonusFadeDuration ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusFadeDuration
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 500 && v <= 5000) setDynamics('racePlanBonusFadeDuration', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanCorridorStart"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  P-Controller starts (% race)
                  <Info id="DynamicsTuningSection:racePlanCorridorStart" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Race Plan P-Controller starts percent"
                  min={50}
                  max={100}
                  step={5}
                  value={Math.round(
                    (dynamicsConfig.racePlanCorridorStart ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart) * 100
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const end =
                      (dynamicsConfig.racePlanCorridorEnd ??
                        DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd) * 100;
                    if (v >= 50 && v <= end) setDynamics('racePlanCorridorStart', v / 100);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanCorridorEnd"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  P-Controller ends (% race)
                  <Info id="DynamicsTuningSection:racePlanCorridorEnd" />
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
                      const curStart =
                        dynamicsConfig.racePlanCorridorStart ??
                        DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart;
                      setDynamicsConfig((prev) => ({
                        ...prev,
                        racePlanCorridorEnd: newEnd,
                        racePlanCorridorStart: Math.min(curStart, newEnd),
                      }));
                    }
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:racePlanMinDurationSec"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Race Plan min duration (s)
                  <Info id="DynamicsTuningSection:racePlanMinDurationSec" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Race Plan minimum duration seconds"
                  min={0}
                  max={120}
                  step={5}
                  value={
                    dynamicsConfig.racePlanMinDurationSec ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanMinDurationSec
                  }
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
                {(
                  dynamicsConfig.racePlanBonusStrengthMultiplier ??
                  DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier
                ).toFixed(1)}
                ×
              </strong>
              {': '}
              B1={' '}
              <strong>
                {(
                  1.0 +
                  0.03 *
                    (dynamicsConfig.racePlanBonusStrengthMultiplier ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier)
                ).toFixed(3)}
              </strong>
              {'  '}
              B5={' '}
              <strong>
                {(
                  1.0 -
                  0.01 *
                    (dynamicsConfig.racePlanBonusStrengthMultiplier ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier)
                ).toFixed(3)}
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
              <strong>
                {Math.round(
                  (dynamicsConfig.racePlanBonusTransitionEnd ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd) * 100
                )}
                %
              </strong>
              {'  |  Controller: '}
              <strong>
                {Math.round(
                  (dynamicsConfig.racePlanCorridorStart ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart) * 100
                )}
                %
              </strong>
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
              resetControlId="DynamicsTuningSection:reset-phase-split"
            />
            <div
              style={{ marginBottom: '0.75rem' }}
              data-control-id="DynamicsTuningSection:phaseSplitBonusEnabled"
            >
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
              >
                <input
                  type="checkbox"
                  aria-label="Phase-Split Bonuses Enabled"
                  checked={
                    dynamicsConfig.phaseSplitBonusEnabled ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.phaseSplitBonusEnabled
                  }
                  onChange={(e) => setDynamics('phaseSplitBonusEnabled', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Enable phase-split bonuses
                <Info id="DynamicsTuningSection:phaseSplitBonusEnabled" />
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
                },
                {
                  key: 'areaBonusPost',
                  label: 'Area bonus — POST',
                  min: 0,
                  max: 3,
                  step: 0.5,
                },
                {
                  key: 'rowBonusEarly',
                  label: 'Row bonus — EARLY',
                  min: 0,
                  max: 1,
                  step: 0.1,
                },
                {
                  key: 'rowBonusPost',
                  label: 'Row bonus — POST',
                  min: 0,
                  max: 1,
                  step: 0.1,
                },
              ].map(({ key, label, min, max, step }) => (
                <div
                  className={s.formGroup}
                  key={key}
                  data-control-id={`DynamicsTuningSection:${key}`}
                >
                  <label
                    className={s.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {label}
                    <Info id={`DynamicsTuningSection:${key}`} />
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
      )}
      {show('pulk') && (
        <>
          {/* ── Section 5: PULK Phase — the 7 controls in the list below + the PULK bonuses (Weg B, one card) ── */}
          <SubCard
            title="PULK Phase"
            onReset={resetPulk}
            resetTestId="reset-pulk"
            resetControlId="DynamicsTuningSection:reset-pulk"
            subtitle="The PULK phase — the mid-race window [PULK begin, PULK end] where the lead rotation stages a real front contest (always live). PULK begin is the CHAOS→PULK boundary (the chaos window is [0, PULK begin]); PULK end sets where PULK hands off to OUTCOME; the leader brake + challenger boost set the front-action strength; the drop depth is the depth lever (how far a dethroned leader falls before release); intensity sets the overall choreography drama. Advanced envelope + rotation internals are pinned to their tuned defaults."
          >
            <div className={s.formGrid}>
              {[
                {
                  key: 'racePlanPulkStart',
                  label: 'PULK begin / CHAOS ends (0.10–0.60)',
                  min: 0.1,
                  max: 0.6,
                  step: 0.05,
                },
                {
                  key: 'choreoOutcomeStart',
                  label: 'PULK end / OUTCOME begins (0.25–0.60)',
                  // CONTROL-BOUNDS-1 (2026-09-03): max was 0.55 while the shipped value is 0.60, so the
                  // control CLAMPED TO 0.55 ON OPEN — touching it lost the shipped value with no way back,
                  // while the card's own Reset restored a value the slider could not display.
                  //
                  // ★★ THE TOP IS 0.60 BECAUSE THAT IS THE EDGE OF WHAT HAS BEEN MEASURED — NOT BECAUSE
                  // THE MECHANISM STOPS THERE. It is the one line that matters here, and its absence is
                  // why this bound has now moved twice.
                  //
                  // The MECHANISM's wall is 0.70: `choreoResolveB3` is a fixed 0.70, so B3's OUTCOME
                  // settling window is `[this, 0.70]` and is ZERO wide at 0.70, and SWEEP 2 (2026-07-17)
                  // measured 0.50/0.60/0.70/0.80 with the gate holding on 3 of 4 tracks at both 0.60 and
                  // 0.70. SLIDER-HEADROOM-1 (2026-09-03) took that as licence and raised the top to 0.70.
                  //
                  // THE OWNER REVERSED IT ON 2026-09-04, and the reason is not the mechanism: SWEEP 2 is
                  // from a world that no longer exists — the speed-150 re-baseline, COMBO15, gap-reroll's
                  // flip and the B2 attackers at count 3 all landed after it. **Nothing above 0.60 has
                  // been measured on the tree that ships**, so the widening let an operator tune into a
                  // range where no evidence exists, and a slider that reaches further than the evidence
                  // is a slider that invites a value nobody can defend.
                  //
                  // ★ SO: DO NOT RAISE THIS WITHOUT A MEASUREMENT ON TODAY'S TREE. Re-running SWEEP 2 is
                  // 16 configs x 100 races. If it says 0.70 still holds, the bound may move and this
                  // comment moves with it. Reading `choreoResolveB3` and concluding 0.70 is exactly the
                  // step that was taken and reversed.
                  min: 0.25,
                  max: 0.6,
                  step: 0.05,
                },
                {
                  key: 'pulkLeaderBrake',
                  label: 'Leader brake',
                  min: 0,
                  max: 0.15,
                  step: 0.01,
                },
                {
                  key: 'pulkChallengerBoost',
                  label: 'Challenger boost (cap)',
                  min: 0,
                  max: 0.12,
                  step: 0.01,
                },
                {
                  key: 'pulkLeadRotationDropDepthLengths',
                  label: 'Ex-leader drop depth (lengths)',
                  min: 1,
                  max: 8,
                  step: 1,
                },
                {
                  key: 'chaseAfterOutcomeSlots',
                  label: 'Chase: racers accelerated past 0.6',
                  min: 1,
                  max: 8,
                  step: 1,
                },
                {
                  key: 'choreoIntensity',
                  label: 'Choreography intensity (0–1)',
                  min: 0,
                  max: 1,
                  step: 0.05,
                },
              ].map(({ key, label, min, max, step }) => (
                <div
                  className={s.formGroup}
                  key={key}
                  data-control-id={`DynamicsTuningSection:${key}`}
                >
                  <label
                    className={s.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {label}
                    <Info id={`DynamicsTuningSection:${key}`} />
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
              {/* ★★ CHASE-AFTER-OUTCOME — NIGHT-2026-09-23. The switch and the selection rule; the COUNT
                  is the slider above. It lives in the PULK group because it IS the PULK governor, run
                  past its own boundary — nothing else about the phase moves.
                  ★ SHIPPED ON since 2026-09-23. The parity claim that once stood here — that the sim
                  arm does not carry the extension — was REFUTED (CHASE-PARITY-DIAG-1.md); the arms are
                  byte-identical with this on. */}
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:chaseAfterOutcomeEnabled"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    aria-label="Chase after the outcome phase"
                    checked={
                      dynamicsConfig.chaseAfterOutcomeEnabled ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeEnabled
                    }
                    onChange={(e) => setDynamics('chaseAfterOutcomeEnabled', e.target.checked)}
                    data-testid="chase-after-outcome-toggle"
                    style={{ cursor: 'pointer' }}
                  />
                  Chase past the outcome start
                  <Info id="DynamicsTuningSection:chaseAfterOutcomeEnabled" />
                </label>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:chaseAfterOutcomeSelection"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Chase: who is accelerated
                  <Info id="DynamicsTuningSection:chaseAfterOutcomeSelection" />
                </label>
                <select
                  className={s.input}
                  aria-label="Chase: who is accelerated"
                  data-testid="chase-after-outcome-selection"
                  value={
                    dynamicsConfig.chaseAfterOutcomeSelection ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSelection
                  }
                  onChange={(e) => setDynamics('chaseAfterOutcomeSelection', e.target.value)}
                >
                  <option value="gap">
                    From the gap — the front of the chasing field (shipped)
                  </option>
                  <option value="leader">Behind the leader (legacy)</option>
                </select>
              </div>
            </div>
            <SubHeading
              label="PULK bonuses"
              note="Phase-split bonuses + cohesion bias that act ONLY inside the PULK window [0.15, PULK end]. The area/row bonuses are gated by the Phase-Split master switch in the Bonus section above; the cohesion bias pulls the pulk racers’ re-roll draws toward the pack centroid. All ship flat (bonuses 0, bias 2.0) for the shipped PULK."
              onReset={resetPulkBonuses}
              resetTestId="reset-pulk-bonuses"
              resetControlId="DynamicsTuningSection:reset-pulk-bonuses"
            />
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:areaBonusPulk">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Area bonus — PULK
                  <Info id="DynamicsTuningSection:areaBonusPulk" />
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
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:rowBonusPulk">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Row bonus — PULK
                  <Info id="DynamicsTuningSection:rowBonusPulk" />
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
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:pulkBiasGain">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Cohesion bias gain
                  <Info id="DynamicsTuningSection:pulkBiasGain" />
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
              resetControlId="DynamicsTuningSection:reset-b2-attackers"
            />
            <div className={s.formGrid}>
              {[
                {
                  key: 'b2AttackHeroes',
                  label: 'B2-attacker count (0–5)',
                  min: 0,
                  max: 5,
                  step: 1,
                },
                {
                  key: 'packReSteerThreshold',
                  label: 'Attacker re-steer threshold (0.5–3.0)',
                  min: 0.5,
                  max: 3.0,
                  step: 0.1,
                },
              ].map(({ key, label, min, max, step }) => (
                <div
                  className={s.formGroup}
                  key={key}
                  data-control-id={`DynamicsTuningSection:${key}`}
                >
                  <label
                    className={s.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {label}
                    <Info id={`DynamicsTuningSection:${key}`} />
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
      )}
      {show('gapBrake') && (
        <>
          {/* ── Gap-based leader brake (GAP-BRAKE-1) — its own SubCard because it is not a re-roll
              mechanism: it acts every frame through the trajectory controller, not on the periodic
              dice. Placed straight after Gap-Cap Re-Roll because they are the two GAP mechanisms and
              an operator comparing them should not have to hunt for the second one. ── */}
          <SubCard
            title="Gap Leader Brake"
            subtitle="The outcome-phase brake on a runaway lead. Acts on the GAP, never on rank. SHIPPED OFF."
          >
            <SubHeading
              label="Gap Leader Brake"
              note="Once the PULK window closes, nothing in the engine slows a racer for leading — the outcome controller steers every racer toward his DRAWN rank and cannot see a gap at all. This is the fallback brake for that range. It engages only when the leader's lead exceeds the allowance below; its strength then follows the gap's CHANGE, rising while the gap grows and fading with it as it closes, so the leader is never released with a snap. It can never command a speed the steering could not already produce. SHIPPED ON since 2026-09-16, at 56 px allowance and 13% authority. Turning it off reproduces the race as it was before that date."
              onReset={resetGapBrake}
              resetTestId="reset-gap-brake"
              resetControlId="DynamicsTuningSection:reset-gap-brake"
            />
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:gapBrakeEnabled">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    checked={
                      dynamicsConfig.gapBrakeEnabled ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeEnabled
                    }
                    onChange={(e) => setDynamics('gapBrakeEnabled', e.target.checked)}
                    data-testid="gap-brake-toggle"
                  />
                  Gap leader brake enabled
                  <Info id="DynamicsTuningSection:gapBrakeEnabled" />
                </label>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:servoNoiseBlindEnabled"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    checked={
                      dynamicsConfig.servoNoiseBlindEnabled ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.servoNoiseBlindEnabled
                    }
                    onChange={(e) => setDynamics('servoNoiseBlindEnabled', e.target.checked)}
                    data-testid="servo-noise-blind-toggle"
                  />
                  Servo ignores its own noise (V1)
                  <Info id="DynamicsTuningSection:servoNoiseBlindEnabled" />
                </label>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapBrakeAllowedGapPx"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Allowed lead (canvas widths)
                  <Info id="DynamicsTuningSection:gapBrakeAllowedGapPx" />
                </label>
                {/* ★ THE UNIT HE JUDGES IN, AND WHY THE CONVERSION IS HERE AND NOT IN THE ENGINE.
                    The stored key is WORLD PX. A canvas width is canvasH / (camZoom * axisY)
                    (camera/zoomUnit.js:119) — it depends on the LIVE camera zoom, which is not
                    deterministic from the race seed and must never reach the physics. So the engine
                    compares world px and this control does the conversion, against the LEADER shot
                    (GAP_BRAKE_REFERENCE_PX: LEADER_ZOOM.visibleCorridors x referenceCorridorPx). The world-px value
                    actually stored is printed underneath, so the knob hides nothing. */}
                <input
                  type="number"
                  className={s.input}
                  aria-label="Allowed lead (canvas widths)"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={gapWidthsFromPx(
                    dynamicsConfig.gapBrakeAllowedGapPx ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeAllowedGapPx
                  )}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    if (isFinite(w) && w >= 0.1 && w <= 3)
                      setDynamics('gapBrakeAllowedGapPx', gapPxFromWidths(w));
                  }}
                />
                <p className={s.hint}>
                  stored as{' '}
                  <strong>
                    {Math.round(
                      dynamicsConfig.gapBrakeAllowedGapPx ??
                        DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeAllowedGapPx
                    )}{' '}
                    world px
                  </strong>{' '}
                  at {GAP_BRAKE_REFERENCE_PX} px per canvas width — the LEADER shot, the one the
                  owner judged against. The camera is not always in it: inside this window it runs
                  0.4–1.5 corridors, and at the moment a race reaches its biggest lead the measured
                  median shot is 165 px. So a race can LOOK like a bigger runaway than the braked
                  distance says, or the reverse — the distance actually braked is the world px.
                </p>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapBrakeWindowEnd"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Brake window end
                  <Info id="DynamicsTuningSection:gapBrakeWindowEnd" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Brake window end"
                  min={0.6}
                  max={1}
                  step={0.01}
                  value={
                    dynamicsConfig.gapBrakeWindowEnd ??
                    DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeWindowEnd
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 0.6 && v <= 1) setDynamics('gapBrakeWindowEnd', v);
                  }}
                />
                <p className={s.hint}>
                  Window: <strong>where OUTCOME begins</strong> →{' '}
                  <strong>
                    {dynamicsConfig.gapBrakeWindowEnd ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeWindowEnd}
                  </strong>{' '}
                  — the start follows the PULK/OUTCOME seam and is not settable here.
                </p>
              </div>
              <div
                className={s.formGroup}
                data-control-id="DynamicsTuningSection:gapBrakeMaxAuthority"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Maximum authority (%)
                  <Info id="DynamicsTuningSection:gapBrakeMaxAuthority" />
                </label>
                {/* Stored as a FRACTION, shown as a percent: the owner judges in percent and the
                    engine multiplies a speed. One conversion, here, the same as the allowance above. */}
                <input
                  type="number"
                  className={s.input}
                  aria-label="Maximum authority (%)"
                  min={1}
                  max={30}
                  step={1}
                  value={Math.round(
                    (dynamicsConfig.gapBrakeMaxAuthority ??
                      DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority) * 100
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isFinite(v) && v >= 1 && v <= 30)
                      setDynamics('gapBrakeMaxAuthority', v / 100);
                  }}
                />
                <p className={s.hint}>
                  Speed floor{' '}
                  <strong>
                    {(
                      1 -
                      (dynamicsConfig.gapBrakeMaxAuthority ??
                        DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority)
                    ).toFixed(2)}
                  </strong>{' '}
                  of natural speed — the slowest the leader can ever be asked to run because of a
                  gap.
                </p>
              </div>
            </div>
          </SubCard>
        </>
      )}
      {show('frameTiming') && (
        <>
          {/* ── Section 1: Frame Timing (global/technical — nothing to do with the race itself) ── */}
          <SubCard
            title="Frame Timing"
            onReset={resetFrameTiming}
            resetTestId="reset-frame-timing"
            resetControlId="DynamicsTuningSection:reset-frame-timing"
            subtitle="Controls how browser frame-time variation is smoothed before being applied to camera movement and visual effects. Physics is always fixed at 16ms steps and is not affected by this setting."
          >
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="DynamicsTuningSection:dtSmoothingAlpha">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  dt-Smoothing (EMA-Alpha)
                  <Info id="DynamicsTuningSection:dtSmoothingAlpha" />
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
            <div
              style={{ marginTop: '0.75rem' }}
              data-control-id="DynamicsTuningSection:renderInterpolation"
            >
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
              >
                <input
                  type="checkbox"
                  aria-label="Render Interpolation"
                  checked={
                    frameTimingConfig.renderInterpolation ??
                    DEFAULT_FRAME_TIMING_CONFIG.renderInterpolation
                  }
                  onChange={(e) => setFrameTiming('renderInterpolation', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Render Interpolation
                <Info id="DynamicsTuningSection:renderInterpolation" />
              </label>
            </div>
            <div
              style={{ marginTop: '0.75rem' }}
              data-control-id="DynamicsTuningSection:scoreboardIntervalMs"
            >
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Live Standings update every
                <Info id="DynamicsTuningSection:scoreboardIntervalMs" />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  aria-label="Live Standings update interval"
                  className={s.input}
                  min={SCOREBOARD_INTERVAL_MIN_MS}
                  max={SCOREBOARD_INTERVAL_MAX_MS}
                  step={50}
                  value={scoreboardIntervalMs}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= SCOREBOARD_INTERVAL_MIN_MS && v <= SCOREBOARD_INTERVAL_MAX_MS)
                      setFrameTiming('scoreboardIntervalMs', v);
                  }}
                  style={{ width: '6rem' }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>ms</span>
                {/* The three the owner is choosing between, one click each — the point of the control. */}
                {[250, 500, 1000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFrameTiming('scoreboardIntervalMs', v)}
                    style={{
                      padding: '0.15rem 0.5rem',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius)',
                      border:
                        scoreboardIntervalMs === v
                          ? '1px solid var(--color-accent)'
                          : '1px solid #444',
                      background:
                        scoreboardIntervalMs === v ? 'rgba(0,200,255,0.12)' : 'transparent',
                      color: scoreboardIntervalMs === v ? 'var(--color-accent)' : '#bbb',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.4rem' }}>
                {(1000 / scoreboardIntervalMs).toFixed(1)} updates per race second
                {scoreboardIntervalMs === DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs
                  ? ' · shipped default'
                  : ''}
              </p>
            </div>
          </SubCard>
        </>
      )}
    </>
  );
}

export default DynamicsTuningSection;
