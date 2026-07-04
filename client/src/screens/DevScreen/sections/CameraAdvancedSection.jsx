// ============================================================
// File:        CameraAdvancedSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx
// Project:     RaceArena
// Created:     2026-05-24
// Description: Unified camera tuning UI — all controls merged and ordered
//              by race timeline (Start → MID → Endgame → Finish → Profiles).
// ============================================================

import { useEffect, useState } from 'react';
import {
  DEFAULT_CAMERA_CONFIG,
  loadCameraConfig,
  saveCameraConfig,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

// ── Per-state profile accordion ───────────────────────────────────────────────

const CAM_STATES_FOR_PROFILES = [
  'OVERVIEW',
  'LEADER_ZOOM',
  'BATTLE_ZOOM',
  'COMEBACK_ZOOM',
  'LEAD_CHANGE',
];

const STATE_LABELS = {
  OVERVIEW: 'Overview',
  LEADER_ZOOM: 'Leader Zoom',
  BATTLE_ZOOM: 'Battle Zoom',
  COMEBACK_ZOOM: 'Comeback Zoom',
  LEAD_CHANGE: 'Lead Change',
};

const PROFILE_FIELDS = [
  {
    key: 'spriteScale',
    label: 'Sprite scale (×)',
    min: 0.5,
    max: 5.0,
    step: 0.05,
    tip: (v, n) =>
      `Sprite zoom factor for ${n}. ${v.toFixed(2)}× — relative to natural density-scaled size. 1.0 = natural size, 2.0 = twice as large.`,
  },
  {
    key: 'trackingTC',
    label: 'Tracking TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
    tip: (v) => `Lerp time-constant during stable tracking. ${v.toFixed(2)}s.`,
  },
  {
    key: 'entryTC',
    label: 'Entry TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
    tip: (v) => `Slower lerp TC right after state entry until camera converges. ${v.toFixed(2)}s.`,
  },
  {
    key: 'leadInDuration',
    label: 'Lead-in duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
    tip: (v) =>
      `Camera shows the track ahead for this many seconds at state start. ${v.toFixed(1)}s.`,
  },
  {
    key: 'leadOutDuration',
    label: 'Lead-out duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
    tip: (v) =>
      `Camera decelerates to a stop this many seconds before the state ends. ${v.toFixed(1)}s.`,
  },
  {
    key: 'innerFramePct',
    label: 'Inner frame %',
    min: 0.3,
    max: 1,
    step: 0.05,
    tip: (v) => `Target must land within this fraction of the canvas. ${(v * 100).toFixed(0)}%.`,
  },
  {
    key: 'maxStateDuration',
    label: 'Max state duration (ms)',
    min: 1000,
    max: 15000,
    step: 500,
    tip: (v) => `Hard cap on time in this state. ${v}ms.`,
  },
  {
    key: 'minStateHold',
    label: 'Min state hold (ms)',
    min: 1000,
    max: 10000,
    step: 500,
    tip: (v) => `Minimum time locked in this state. ${v}ms.`,
  },
  {
    key: 'maxEntryDurationMs',
    label: 'Max entry duration (ms)',
    min: 500,
    max: 30000,
    step: 500,
    tip: (v) =>
      `Forces entry→tracking after this many ms even if T-space gap is above threshold. ${v}ms.`,
  },
  {
    key: 'overviewOffsetPx',
    label: 'Overview radial offset (px)',
    min: 0,
    max: 400,
    step: 10,
    onlyFor: 'OVERVIEW',
    tip: (v) =>
      `Camera shifts toward field so leader appears at outer viewport edge. 0 = centered. ${v}px.`,
  },
  {
    key: 'leadAheadEnabled',
    label: 'Lead-Ahead active',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Camera shows the track ahead of the racer (leading into the frame). Currently: ${v ? 'ON' : 'OFF'}.`,
  },
  {
    key: 'leadOutEnabled',
    label: 'Lead-Out active',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Camera decelerates exponentially in the final leadOutDuration seconds before state end. Currently: ${v ? 'ON' : 'OFF'}.`,
  },
];

function StateProfileBlock({ stateName, profile, defaults, onChangeField, onReset }) {
  return (
    <details style={{ marginBottom: '0.4rem' }}>
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          padding: '0.25rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          userSelect: 'none',
          listStyle: 'none',
        }}
      >
        <span>{STATE_LABELS[stateName]}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset(stateName);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            padding: '0.1rem 0.2rem',
            opacity: 0.7,
            marginLeft: 'auto',
          }}
        >
          Reset state
        </button>
      </summary>
      <div className={s.formGrid} style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
        {PROFILE_FIELDS.filter(
          ({ onlyFor }) =>
            !onlyFor ||
            (Array.isArray(onlyFor) ? onlyFor.includes(stateName) : onlyFor === stateName)
        ).map(({ key, label, min, max, step, tip, type }) => {
          const val = profile[key] ?? defaults[key];
          return (
            <div key={key} className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {label}
                <InfoTooltip text={tip(val, STATE_LABELS[stateName])} />
              </label>
              {type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChangeField(stateName, key, e.target.checked)}
                />
              ) : (
                <input
                  type="number"
                  className={s.input}
                  min={min}
                  max={max}
                  step={step}
                  value={val}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= min && v <= max) onChangeField(stateName, key, v);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// ── Slider row helper ─────────────────────────────────────────────────────────

function SliderRow({ label, testId, min, max, step, value, onChange, display, tip }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
      <span style={{ minWidth: '14rem' }}>{label}</span>
      <input
        type="range"
        data-testid={testId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: '8rem' }}
      />
      <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      {tip && <InfoTooltip text={tip} />}
    </label>
  );
}

// ── Section heading helper ────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: '0.88rem',
        marginBottom: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        paddingBottom: '0.25rem',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        color: 'var(--color-muted)',
      }}
    >
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function CameraAdvancedSection() {
  const [config, setConfig] = useState(() => loadCameraConfig());

  useEffect(() => {
    saveCameraConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setProfileField(stateName, field, val) {
    setConfig((prev) => {
      const prevProfiles = prev.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      return {
        ...prev,
        cameraStateProfiles: {
          ...prevProfiles,
          [stateName]: { ...prevProfiles[stateName], [field]: val },
        },
      };
    });
  }

  function resetProfileState(stateName) {
    setConfig((prev) => {
      const prevProfiles = prev.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      return {
        ...prev,
        cameraStateProfiles: {
          ...prevProfiles,
          [stateName]: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles[stateName] },
        },
      };
    });
  }

  const profiles = config.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── 1. Start & Post-Start ── */}
      <div className={s.card}>
        <SectionHeading>1 · Start &amp; Post-Start</SectionHeading>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Post-Start LEADER Hold (ms)
              <InfoTooltip
                text={`After the 3s start overview the camera holds LEADER_ZOOM for this duration before BATTLE can trigger. Currently: ${(config.postStartHoldMs / 1000).toFixed(1)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={15000}
              step={500}
              value={config.postStartHoldMs ?? 7000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 15000) set('postStartHoldMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Countdown Start Zoom (px)
              <InfoTooltip
                text={`Sprite height at countdown start. Very small values are clamped to minimum zoom (full track visible). Currently: ${config.countdownStartZoomSpritePx ?? 1}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={200}
              step={1}
              value={config.countdownStartZoomSpritePx ?? 1}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 200) set('countdownStartZoomSpritePx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Countdown Duration (ms)
              <InfoTooltip
                text={`Duration of the pre-race countdown. Currently: ${config.countdownDurationMs ?? 4000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1000}
              max={8000}
              step={500}
              value={config.countdownDurationMs ?? 4000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1000 && v <= 8000) set('countdownDurationMs', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. MID — BATTLE Trigger ── */}
      <div className={s.card}>
        <SectionHeading>2 · MID — BATTLE Trigger</SectionHeading>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BATTLE Min Hold (ms)
              <InfoTooltip
                text={`Minimum BATTLE duration after entry, even if the cluster dissolves. Currently: ${config.battleMinDurationMs ?? 3000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={500}
              max={10000}
              step={500}
              value={config.battleMinDurationMs ?? 3000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 500 && v <= 10000) set('battleMinDurationMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BATTLE Cooldown (ms)
              <InfoTooltip
                text={`Minimum pause after BATTLE before re-triggering is possible. Currently: ${(config.battleCooldownMs / 1000).toFixed(1)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={20000}
              step={500}
              value={config.battleCooldownMs ?? 8000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 20000) set('battleCooldownMs', v);
              }}
            />
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}
        >
          <SliderRow
            label="Pulk Closeness (lap %)"
            testId="battle-pulk-threshold-t"
            min={0.01}
            max={0.15}
            step={0.005}
            value={config.battlePulkThresholdT ?? 0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.01 && v <= 0.15) set('battlePulkThresholdT', v);
            }}
            display={`${((config.battlePulkThresholdT ?? 0.05) * 100).toFixed(1)}%`}
            tip="How close (as a fraction of a lap) ≥3 top-10 racers must be to trigger BATTLE. Scale-independent — same on every track. Lower = tighter duel, higher = fires more often. Default 0.05 (5% of a lap)."
          />
          <SliderRow
            label="Isolation (lap %)"
            testId="battle-isolation-threshold-t"
            min={0}
            max={0.2}
            step={0.005}
            value={config.battleIsolationThresholdT ?? 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 0.2) set('battleIsolationThresholdT', v);
            }}
            display={`${((config.battleIsolationThresholdT ?? 0) * 100).toFixed(1)}%`}
            tip="Reject a battle if any non-group racer is within this lap fraction of a group member. 0 = disabled. Recommendation ≈ 1.5 × Pulk Closeness. Ships disabled (default 0)."
          />
          <SliderRow
            label="Max. group size"
            testId="battle-max-group-size"
            min={3}
            max={6}
            step={1}
            value={config.battleMaxGroupSize ?? 6}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 3 && v <= 6) set('battleMaxGroupSize', v);
            }}
            display={`${config.battleMaxGroupSize ?? 6}`}
            tip="Maximum number of racers in the BATTLE group (3–6). Default 6."
          />
          <SliderRow
            label="Max. Rank-Span (Expansion)"
            testId="battle-max-group-rank-span"
            min={2}
            max={10}
            step={1}
            value={config.battleMaxGroupRankSpan ?? 5}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 2 && v <= 10) set('battleMaxGroupRankSpan', v);
            }}
            display={`${config.battleMaxGroupRankSpan ?? 5}`}
            tip="Maximum rank span (highest minus lowest rank) of the BATTLE group after greedy expansion. Default 5 → P3–P8 when seed is at P3. Prevents P3-to-P11 clusters."
          />
          <SliderRow
            label="Top-N Required (minimum rank)"
            testId="battle-min-top-n"
            min={3}
            max={20}
            step={1}
            value={config.battleMinTopN ?? 10}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 3 && v <= 20) set('battleMinTopN', v);
            }}
            display={`Top-${config.battleMinTopN ?? 10}`}
            tip="At least one racer in the pulk must be at position ≤ N. Default 10 → battles only when at least one top-10 racer is involved."
          />
        </div>
      </div>

      {/* ── 3. MID — Regie-Gewichte & OVERVIEW ── */}
      <div className={s.card}>
        <SectionHeading>3 · MID — Director Weights &amp; OVERVIEW</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Weighted random director: all active events enter the pool with their weights. Mandatory
          states (Start, Endgame, Finish) are not in the pool.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="BATTLE weight"
            testId="regie-battle-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.battleWeight ?? 0.8}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('battleWeight', v);
            }}
            display={(config.battleWeight ?? 0.8).toFixed(2)}
            tip="Selection weight for BATTLE_ZOOM in the candidate pool. Default 0.80."
          />
          <SliderRow
            label="LEAD_CHANGE weight"
            testId="regie-lead-change-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.leadChangeWeight ?? 0.7}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('leadChangeWeight', v);
            }}
            display={(config.leadChangeWeight ?? 0.7).toFixed(2)}
            tip="Selection weight for LEAD_CHANGE in the candidate pool. Default 0.70."
          />
          <SliderRow
            label="COMEBACK weight"
            testId="regie-comeback-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.comebackWeight ?? 0.6}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('comebackWeight', v);
            }}
            display={(config.comebackWeight ?? 0.6).toFixed(2)}
            tip="Selection weight for COMEBACK_ZOOM in the candidate pool. Default 0.60."
          />
          <SliderRow
            label="OVERVIEW weight"
            testId="regie-overview-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.overviewWeight ?? 0.3}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('overviewWeight', v);
            }}
            display={(config.overviewWeight ?? 0.3).toFixed(2)}
            tip="Selection weight for OVERVIEW in the candidate pool. Default 0.30."
          />
          <SliderRow
            label="OVERVIEW cooldown (ms)"
            testId="regie-overview-cooldown-ms"
            min={5000}
            max={60000}
            step={1000}
            value={config.overviewCooldownMs ?? 15000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 5000 && v <= 60000) set('overviewCooldownMs', v);
            }}
            display={`${((config.overviewCooldownMs ?? 15000) / 1000).toFixed(0)}s`}
            tip="Minimum pause after OVERVIEW before OVERVIEW may appear again. Default 15 s."
          />
          <SliderRow
            label="OVERVIEW target count"
            testId="regie-overview-target-count"
            min={1}
            max={5}
            step={1}
            value={config.overviewTargetCount ?? 2}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= 5) set('overviewTargetCount', v);
            }}
            display={`${config.overviewTargetCount ?? 2}`}
            tip="Target number of OVERVIEW cuts per race. Default 2."
          />
          <SliderRow
            label="OVERVIEW start delay (s)"
            testId="regie-overview-start-delay"
            min={5}
            max={30}
            step={1}
            value={config.overviewStartDelay ?? 15}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 5 && v <= 30) set('overviewStartDelay', v);
            }}
            display={`${config.overviewStartDelay ?? 15}s`}
            tip="Seconds after race start before OVERVIEW may appear in the pool for the first time. Default 15 s."
          />
          <SliderRow
            label="OVERVIEW Closed Zoom"
            testId="regie-overview-closed-track-zoom"
            min={1.0}
            max={2.0}
            step={0.05}
            value={config.overviewClosedTrackZoom ?? 1.3}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1.0 && v <= 2.0) set('overviewClosedTrackZoom', v);
            }}
            display={(config.overviewClosedTrackZoom ?? 1.3).toFixed(2)}
            tip="Zoom multiplier for OVERVIEW on closed tracks. 1.0 = no pan (camera frozen), 1.3 = 30% zoom-in giving pan room. Only affects closed tracks. Default 1.30."
          />
          <SliderRow
            label="OVERVIEW target sprite size (px)"
            testId="regie-overview-target-screen-px"
            min={16}
            max={48}
            step={1}
            value={config.overviewTargetScreenPx ?? 18}
            onChange={(e) => set('overviewTargetScreenPx', parseInt(e.target.value, 10))}
            display={`${config.overviewTargetScreenPx ?? 18}px`}
            tip="Target sprite screen size during OVERVIEW on open tracks. Camera zoom is chosen so sprites appear at this size regardless of racer count. Smaller = more zoomed out (more track visible). Only affects open tracks. Default 18 px."
          />
          <SliderRow
            label="OVERVIEW zoom floor (effZoom)"
            testId="regie-overview-min-eff-zoom"
            min={0}
            max={0.9}
            step={0.05}
            value={config.overviewMinEffZoom ?? 0}
            onChange={(e) => set('overviewMinEffZoom', parseFloat(e.target.value))}
            display={
              (config.overviewMinEffZoom ?? 0) === 0
                ? 'Off'
                : (config.overviewMinEffZoom ?? 0).toFixed(2) + '×'
            }
            tip="Minimum effective zoom (effZoom) during OVERVIEW on open tracks. 0 = off (current behavior — camera zooms out as far as racer count demands). Higher = less zoom-out, fewer GPU stutter frames. Suggested range: 0.5–0.7. Only affects open tracks. Default: off."
          />
        </div>

        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-muted)',
            margin: '0.75rem 0 0.4rem',
          }}
        >
          <strong>Adaptive Zoom Floor</strong> — during LEADER_ZOOM and LEAD_CHANGE, if fewer than
          Min racers visible are on screen the camera pulls back each frame until enough appear or
          the floor is reached. 0 = disabled.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Min racers visible"
            testId="regie-min-racers-visible"
            min={0}
            max={15}
            step={1}
            value={config.minRacersVisible ?? 8}
            onChange={(e) => set('minRacersVisible', parseInt(e.target.value, 10))}
            display={`${config.minRacersVisible ?? 8}`}
            tip="Minimum non-finished racers that must be visible in LEADER_ZOOM / LEAD_CHANGE. Camera zooms out until this count is met or the floor is hit. 0 = disabled. Default 8."
          />
          <SliderRow
            label="Leader min zoom fraction"
            testId="regie-leader-min-zoom-fraction"
            min={0.1}
            max={1.0}
            step={0.05}
            value={config.leaderMinZoomFraction ?? 0.6}
            onChange={(e) => set('leaderMinZoomFraction', parseFloat(e.target.value))}
            display={(config.leaderMinZoomFraction ?? 0.6).toFixed(2)}
            tip="Minimum zoom as a fraction of leader zoom. 1.0 = camera stays pinned at leader zoom (no zoom-out). 0.6 = camera may zoom out to 60% of leader zoom. Low values approach whole-world zoom on large tracks. Default 0.60."
          />
          <SliderRow
            label="Leader min zoom (floor)"
            testId="regie-leader-min-zoom"
            min={0.1}
            max={1.0}
            step={0.05}
            value={config.leaderMinZoom ?? 0.4}
            onChange={(e) => set('leaderMinZoom', parseFloat(e.target.value))}
            display={(config.leaderMinZoom ?? 0.4).toFixed(2)}
            tip="Hard zoom-out floor for LEADER_ZOOM and LEAD_CHANGE. Camera will not zoom past this value even if too few racers are visible. Default 0.40."
          />
          <SliderRow
            label="Zoom-out speed (per frame)"
            testId="regie-zoom-out-step"
            min={0.001}
            max={0.02}
            step={0.001}
            value={config.zoomOutStepPerFrame ?? 0.005}
            onChange={(e) => set('zoomOutStepPerFrame', parseFloat(e.target.value))}
            display={`${((config.zoomOutStepPerFrame ?? 0.005) * 100).toFixed(1)}%`}
            tip="Zoom reduction per frame when too few racers are visible. 0.005 = ~0.5% per frame at 60 fps. Higher = faster pull-back. Default 0.005."
          />
        </div>
      </div>

      {/* ── 4. LEAD_CHANGE ── */}
      <div className={s.card}>
        <SectionHeading>4 · LEAD_CHANGE</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Detects stable lead changes (double hysteresis: gap + debounce).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Min. gap (T-space)"
            testId="lead-change-min-gap"
            min={0.001}
            max={0.01}
            step={0.001}
            value={config.leadChangeMinGap ?? 0.002}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.001 && v <= 0.01) set('leadChangeMinGap', v);
            }}
            display={(config.leadChangeMinGap ?? 0.002).toFixed(3)}
            tip="Minimum T-space gap between P1 and P2 for a stable lead reading. Default 0.002."
          />
          <SliderRow
            label="Debounce (ms)"
            testId="lead-change-debounce-ms"
            min={200}
            max={2000}
            step={50}
            value={config.leadChangeDebounceMs ?? 800}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 200 && v <= 2000) set('leadChangeDebounceMs', v);
            }}
            display={`${config.leadChangeDebounceMs ?? 800}ms`}
            tip="Duration in ms the new leader must hold before the change is confirmed. Default 800 ms."
          />
          <SliderRow
            label="Min. observation duration (s)"
            testId="lead-change-min-duration"
            min={1}
            max={5}
            step={0.5}
            value={config.leadChangeMinDuration ?? 1.5}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 5) set('leadChangeMinDuration', v);
            }}
            display={`${(config.leadChangeMinDuration ?? 1.5).toFixed(1)}s`}
            tip="Minimum time the camera stays on the new leader after LEAD_CHANGE entry. Default 1.5 s."
          />
          <SliderRow
            label="LEAD_CHANGE-Cooldown (ms)"
            testId="regie-lead-change-cooldown-ms"
            min={1000}
            max={30000}
            step={1000}
            value={config.leadChangeCooldownMs ?? 5000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1000 && v <= 30000) set('leadChangeCooldownMs', v);
            }}
            display={`${((config.leadChangeCooldownMs ?? 5000) / 1000).toFixed(0)}s`}
            tip="Minimum pause after LEAD_CHANGE before re-triggering is possible. Default 5 s."
          />
        </div>
      </div>

      {/* ── 5. COMEBACK ── */}
      <div className={s.card}>
        <SectionHeading>5 · COMEBACK</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Detects B1 racers (targetRank 1–5) actively gaining positions. Requires Race Plan (open
          track ≥ 60 s only). Outcome phase activates internally above the leader-progress
          threshold, independent of the external flag from RaceScreen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Focal smooth TC"
            testId="focal-smooth-tc"
            min={0}
            max={0.2}
            step={0.005}
            value={config.focalSmoothTc ?? 0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 0.2) set('focalSmoothTc', v);
            }}
            display={
              (config.focalSmoothTc ?? 0.05) > 0
                ? `${Math.round((config.focalSmoothTc ?? 0.05) * 1000)}ms`
                : 'Off'
            }
            tip="EMA time-constant applied to the pan target in COMEBACK and LEADER_ZOOM follow phase. Removes comeback-braking oscillation and per-physics-step jitter. 0 = disabled. Higher = smoother but the camera trails the racer more. Default 50 ms."
          />
          <SliderRow
            label="Min. positions gained"
            testId="comeback-min-positions"
            min={2}
            max={10}
            step={1}
            value={config.comebackMinPositionsGained ?? 2}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 2 && v <= 10) set('comebackMinPositionsGained', v);
            }}
            display={`${config.comebackMinPositionsGained ?? 2}`}
            tip="Minimum positions gained within the time window to trigger COMEBACK. Default 2."
          />
          <SliderRow
            label="Time window (s)"
            testId="comeback-window-sec"
            min={1}
            max={10}
            step={0.5}
            value={config.comebackWindowSec ?? 4}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 10) set('comebackWindowSec', v);
            }}
            display={`${(config.comebackWindowSec ?? 4).toFixed(1)}s`}
            tip="Look-back window for rank history. Positions gained = rank N seconds ago minus current rank. Default 4 s."
          />
          <SliderRow
            label="Min. observation duration (s)"
            testId="comeback-min-duration"
            min={1}
            max={5}
            step={0.5}
            value={config.comebackMinDuration ?? 3}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 5) set('comebackMinDuration', v);
            }}
            display={`${(config.comebackMinDuration ?? 3).toFixed(1)}s`}
            tip="Minimum duration after COMEBACK entry on the comeback racer. Default 3 s."
          />
          <SliderRow
            label="COMEBACK-Cooldown (ms)"
            testId="regie-comeback-cooldown-ms"
            min={1000}
            max={30000}
            step={1000}
            value={config.comebackCooldownMs ?? 10000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1000 && v <= 30000) set('comebackCooldownMs', v);
            }}
            display={`${((config.comebackCooldownMs ?? 10000) / 1000).toFixed(0)}s`}
            tip="Minimum pause after COMEBACK before re-triggering is possible. Default 10 s."
          />
          <SliderRow
            label="Outcome phase threshold"
            testId="comeback-outcome-phase-threshold"
            min={0.5}
            max={0.95}
            step={0.05}
            value={config.outcomePhaseThreshold ?? 0.75}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.5 && v <= 0.95) set('outcomePhaseThreshold', v);
            }}
            display={`${((config.outcomePhaseThreshold ?? 0.75) * 100).toFixed(0)}%`}
            tip="Leader progress from which COMEBACK is considered active internally (independent of the external isOutcomePhase flag). Default 75%."
          />
          <SliderRow
            label="Min. starting gap"
            testId="comeback-min-start-gap"
            min={0.1}
            max={0.9}
            step={0.05}
            value={config.comebackMinStartGap ?? 0.4}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.1 && v <= 0.9) set('comebackMinStartGap', v);
            }}
            display={`${((config.comebackMinStartGap ?? 0.4) * 100).toFixed(0)}%`}
            tip="The racer must have had at least this normalised gap to P1 at the start of the observation window (field fraction). 0.40 = must have been in the back 60% of the field. Default 40%."
          />
          <SliderRow
            label="Max. current rank (lead-group filter)"
            testId="comeback-max-current-rank-pct"
            min={0.05}
            max={0.5}
            step={0.05}
            value={config.comebackMaxCurrentRankPct ?? 0.1}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.05 && v <= 0.5) set('comebackMaxCurrentRankPct', v);
            }}
            display={`${((config.comebackMaxCurrentRankPct ?? 0.1) * 100).toFixed(0)}%`}
            tip="Racer must not have a better normalised rank than this at trigger time. 0.10 = top 10% excluded (e.g. P1–P4 with 40 racers). Default 10%."
          />
        </div>
      </div>

      {/* ── 6. BATTLE Slowmo ── */}
      <div className={s.card}>
        <SectionHeading>6 · BATTLE Slowmotion</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Slows physics (not the camera) during BATTLE_ZOOM. Non-BATTLE racers are dimmed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Slowmo factor"
            testId="battle-slowmo-factor"
            min={0.2}
            max={1.0}
            step={0.05}
            value={config.battleSlowmoFactor ?? 0.5}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.2 && v <= 1.0) set('battleSlowmoFactor', v);
            }}
            display={(config.battleSlowmoFactor ?? 0.5).toFixed(2)}
            tip="Physics speed during BATTLE_ZOOM. 1.0 = normal, 0.5 = half speed. Default 0.5."
          />
          <SliderRow
            label="Min. duration (s)"
            testId="battle-slowmo-min-duration"
            min={1.0}
            max={5.0}
            step={0.5}
            value={config.battleSlowmoMinDuration ?? 2.0}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1.0 && v <= 5.0) set('battleSlowmoMinDuration', v);
            }}
            display={`${(config.battleSlowmoMinDuration ?? 2.0).toFixed(1)}s`}
            tip="Minimum duration of the slowmo effect after BATTLE_ZOOM ends. Default 2.0s."
          />
          <SliderRow
            label="Fade duration (s)"
            testId="battle-slowmo-fade-duration"
            min={0.0}
            max={1.0}
            step={0.05}
            value={config.battleSlowmoFadeDuration ?? 0.3}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.0 && v <= 1.0) set('battleSlowmoFadeDuration', v);
            }}
            display={`${(config.battleSlowmoFadeDuration ?? 0.3).toFixed(2)}s`}
            tip="Duration of slowmo effect fade-in and fade-out. 0 = instant switch. Default 0.3s."
          />
          <SliderRow
            label="Focus darkening"
            testId="battle-focus-darkening"
            min={0.0}
            max={1.0}
            step={0.05}
            value={config.battleFocusDarkening ?? 0.4}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.0 && v <= 1.0) set('battleFocusDarkening', v);
            }}
            display={(config.battleFocusDarkening ?? 0.4).toFixed(2)}
            tip="Dimming of non-BATTLE racers. 0 = no effect, 1 = completely black. Default 0.4."
          />
        </div>
      </div>

      {/* ── 7. Endgame ── */}
      <div className={s.card}>
        <SectionHeading>7 · Endgame</SectionHeading>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Endgame Focus Threshold
              <InfoTooltip
                text={`From this leader-progress value the camera locks to LEADER_ZOOM (except during LEAD_CHANGE). Currently: ${((config.endgameThreshold ?? 0.9) * 100).toFixed(0)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.5}
              max={1.0}
              step={0.05}
              value={config.endgameThreshold ?? 0.9}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 1.0) set('endgameThreshold', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 8. Finish ── */}
      <div className={s.card}>
        <SectionHeading>8 · Finish</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          After first finish crossing: drama pulse on leader → smooth FINISH_OVERVIEW zoom-out until
          the last racer finishes → pause → leaderboard.
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Drama pulse duration (ms)
              <InfoTooltip
                text={`Duration of the LEADER_ZOOM pulse at the first finish crossing before FINISH_OVERVIEW begins. Currently: ${config.finishDramaDurationMs ?? 1500}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={100}
              max={5000}
              step={100}
              value={config.finishDramaDurationMs ?? 1500}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 100 && v <= 5000) set('finishDramaDurationMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Zoom-out duration (ms)
              <InfoTooltip
                text={`Target duration for the smooth zoom-out to OVERVIEW level after the drama pulse. Currently: ${config.finishOverviewZoomOutDurationMs ?? 3000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={500}
              max={8000}
              step={250}
              value={config.finishOverviewZoomOutDurationMs ?? 3000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 500 && v <= 8000) set('finishOverviewZoomOutDurationMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Pause before leaderboard (ms)
              <InfoTooltip
                text={`Pause after last finisher before the leaderboard appears. Currently: ${config.finishPauseMs ?? 2500}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={10000}
              step={250}
              value={config.finishPauseMs ?? 2500}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('finishPauseMs', v);
              }}
            />
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}
        >
          <SliderRow
            label="Lookback before finish (px)"
            testId="finish-overview-lookback"
            min={0}
            max={1000}
            step={25}
            value={config.finishOverviewLookbackPx ?? 300}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1000) set('finishOverviewLookbackPx', v);
            }}
            display={String(config.finishOverviewLookbackPx ?? 300)}
            tip="FINISH_OVERVIEW: How far before the finish line (in world pixels) the camera target sits. 0 = centred on finish line, 300 = 300 px before the finish (track-independent). Default 300."
          />
        </div>
      </div>

      {/* ── 8b. Photo-Finish (15a) ── */}
      <div className={s.card}>
        <SectionHeading>8b · Photo-Finish</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          When the first two finishers cross essentially together, show a tight top-2 group shot
          with slow-motion instead of the single-winner drama pulse. Camera-only. Off = today&apos;s
          behaviour exactly.
        </p>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
            marginBottom: '0.6rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="photo-finish-enabled"
            checked={config.photoFinishEnabled ?? true}
            onChange={(e) => set('photoFinishEnabled', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Enable photo-finish shot</span>
          <InfoTooltip text="When off, a close finish uses the classic single-winner drama pulse (today's behaviour)." />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Lead-progress gate"
            testId="photo-finish-lead-progress"
            min={0.85}
            max={0.999}
            step={0.001}
            value={config.photoFinishLeadProgress ?? 0.97}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.85 && v <= 0.999) set('photoFinishLeadProgress', v);
            }}
            display={(config.photoFinishLeadProgress ?? 0.97).toFixed(3)}
            tip="Predictive gate: leader progress (fraction of the finish, 0–1) at which the one-shot close-check fires BEFORE the line. Higher = later/closer to the line. Default 0.97."
          />
          <SliderRow
            label="Closeness threshold (t)"
            testId="photo-finish-threshold"
            min={0.005}
            max={0.15}
            step={0.005}
            value={config.photoFinishCloseThresholdT ?? 0.03}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.005 && v <= 0.15) set('photoFinishCloseThresholdT', v);
            }}
            display={(config.photoFinishCloseThresholdT ?? 0.03).toFixed(3)}
            tip="Max lap-normalised t-gap between the top-2 finishers to trigger the photo-finish shot (same unit family as the BATTLE temporal threshold). Larger = triggers more often. Default 0.03."
          />
          <SliderRow
            label="Slowmo factor"
            testId="photo-finish-slowmo-factor"
            min={0.1}
            max={1.0}
            step={0.05}
            value={config.photoFinishSlowmoFactor ?? 0.5}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.1 && v <= 1.0) set('photoFinishSlowmoFactor', v);
            }}
            display={(config.photoFinishSlowmoFactor ?? 0.5).toFixed(2)}
            tip="Physics slow-motion during the photo-finish shot. 1.0 = normal, 0.5 = half speed. Default 0.5."
          />
        </div>
      </div>

      {/* ── 9. Zoom-Profile pro State ── */}
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <SectionHeading>9 · Zoom Profiles per State</SectionHeading>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Per state: sprite size, lerp time constants, lead-in/out duration, framing, and time
          limits. Expand the accordion to adjust.
        </p>
        {CAM_STATES_FOR_PROFILES.map((stateName) => (
          <StateProfileBlock
            key={stateName}
            stateName={stateName}
            profile={profiles[stateName] ?? defProfiles[stateName]}
            defaults={defProfiles[stateName]}
            onChangeField={setProfileField}
            onReset={resetProfileState}
          />
        ))}
      </div>

      {/* ── 10. Globale Konvergenzschwellen ── */}
      <div className={s.card}>
        <SectionHeading>10 · Global Convergence Thresholds</SectionHeading>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Convergence Zoom Threshold
              <InfoTooltip
                text={`Entry→Tracking when zoom delta falls below this value. Currently: ${config.entryConvergenceZoom ?? 0.05}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.001}
              max={0.5}
              step={0.005}
              value={config.entryConvergenceZoom ?? 0.05}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.001 && v <= 0.5) set('entryConvergenceZoom', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Convergence Px Threshold
              <InfoTooltip
                text={`Entry→Tracking when offset delta falls below this pixel value. Currently: ${config.entryConvergencePx ?? 10}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={100}
              step={1}
              value={config.entryConvergencePx ?? 10}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 100) set('entryConvergencePx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              T-Space Convergence Threshold
              <InfoTooltip
                text={`Entry→Tracking when |camT − targetT| falls below this value (track-parameter units). Steady-state gap ≈ 0.026; threshold must be above that. Currently: ${(config.transitionTConvergence ?? 0.03).toFixed(3)}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.005}
              max={0.2}
              step={0.005}
              value={config.transitionTConvergence ?? 0.03}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.005 && v <= 0.2) set('transitionTConvergence', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Diagnose & Sichtbarkeit ── */}
      <div className={s.card}>
        <SectionHeading>Diagnostics &amp; Visibility</SectionHeading>

        {/* State overlay */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              fontSize: '0.88rem',
              marginBottom: '0.4rem',
            }}
          >
            <input
              type="checkbox"
              data-testid="state-overlay-toggle"
              checked={config.stateOverlayEnabled ?? true}
              onChange={(e) => set('stateOverlayEnabled', e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>Enable overlay texts</span>
            <InfoTooltip text="Shows short overlay texts (e.g. 'Currently leading: Max') on entry into OVERVIEW, BATTLE and COMEBACK." />
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '10rem' }}>Overlay duration (ms)</span>
            <input
              type="number"
              data-testid="state-overlay-duration"
              min={500}
              max={10000}
              step={100}
              value={config.stateOverlayDurationMs ?? 3500}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 500 && v <= 10000) set('stateOverlayDurationMs', v);
              }}
              style={{ width: '5rem' }}
            />
            <InfoTooltip text="Duration in ms the overlay text remains visible. Default: 3500 ms." />
          </label>
        </div>

        {/* Toggle group */}
        {[
          {
            key: 'showCameraStateHud',
            testId: 'cam-hud-toggle',
            label: 'Show camera state HUD',
            tip: 'Shows the camera state indicator (OVERVIEW / BATTLE / etc.) in the top-left of the race canvas.',
          },
          {
            key: 'showCameraDiagnostics',
            testId: 'cam-diagnostics-toggle',
            label: 'Show camera diagnostics',
            tip: 'Diagnostics panel bottom-left: live zoom values. Logs state transitions to the browser console.',
          },
          {
            key: 'showRpDiag',
            testId: 'rp-diag-toggle',
            label: 'Show Race Plan diagnostics',
            tip: 'Race plan diagnostics panel top-right: phase, re-roll status, spreadFactor. Only when Race Plan is active.',
          },
          {
            key: 'showRpWinnerList',
            testId: 'rp-winner-list-toggle',
            label: 'Show B1 Winner List',
            tip: 'Shows the 5 race-plan favourites (targetRank 1–5) with current rank and delta.',
          },
          {
            key: 'showRpMinimapBadges',
            testId: 'rp-minimap-badges-toggle',
            label: 'Show Minimap Badges',
            tip: 'Marks the 5 race-plan favourites in the minimap with a gold ring.',
          },
          {
            key: 'showRpStartRow',
            testId: 'rp-startrow-toggle',
            label: 'Show Start-Row in Name Tags',
            tip: "Appends the start row to the name tag (e.g. 'Max (R2)').",
          },
          {
            key: 'showTop10SpeedMonitor',
            testId: 'top10-speed-monitor-toggle',
            label: 'Show Top-10 Speed Monitor',
            tip: 'Shows trajectoryMult values for the top-10 racers. Warning indicator on oscillation.',
          },
          {
            key: 'enableFrameLog',
            testId: 'cam-frame-log-toggle',
            label: 'Enable frame log',
            tip: 'Enables the per-frame camera ring buffer. An export button appears on the race screen.',
          },
          {
            key: 'enablePerfLog',
            testId: 'perf-log-toggle',
            label: 'Enable perf log',
            tip: 'Per-frame phase timing (physics/camera/render/other ms). Shows live P50/P90/P99/max + worst-50 spikes top-left. Takes effect on the next race.',
          },
          {
            key: 'showBattleDiag',
            testId: 'battle-diag-toggle',
            label: 'Show BATTLE diagnostics',
            tip: 'BATTLE status, involved racers, and pulk validity live in the canvas.',
          },
          {
            key: 'showComebackDiag',
            testId: 'comeback-diag-toggle',
            label: 'Show COMEBACK diagnostics',
            tip: 'OUTCOME phase, B1 racers with rank gain, and the actively locked comeback racer.',
          },
          {
            key: 'showLeadChangeDiag',
            testId: 'lead-change-diag-toggle',
            label: 'Show LEAD_CHANGE diagnostics',
            tip: 'Current and previous leader, pending status, minGap and debounce.',
          },
        ].map(({ key, testId, label, tip }) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              fontSize: '0.88rem',
              marginBottom: '0.4rem',
            }}
          >
            <input
              type="checkbox"
              data-testid={testId}
              checked={config[key] ?? false}
              onChange={(e) => set(key, e.target.checked)}
            />
            <span>{label}</span>
            <InfoTooltip text={tip} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default CameraAdvancedSection;
