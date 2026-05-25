// ============================================================
// File:        CameraAdvancedSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx
// Project:     RaceArena
// Created:     2026-05-24
// Description: Unified camera tuning UI — all controls merged and ordered
//              by race timeline (Start → MID → Endgame → Finish → Profiles).
//              Replaces the separate CameraZoomTuningSection + CameraStateHudSection
//              entries in DevScreen.
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
    label: 'Lead-Ahead aktiv',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Kamera zeigt Track vor dem Racer (führt ins Bild rein). Aktuell: ${v ? 'ON' : 'OFF'}.`,
  },
  {
    key: 'leadOutEnabled',
    label: 'Lead-Out aktiv',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Kamera verlangsamt sich exponentiell in den letzten leadOutDuration Sekunden vor State-Ende. Aktuell: ${v ? 'ON' : 'OFF'}.`,
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
                text={`Nach der 3s Start-OVERVIEW hält die Kamera LEADER_ZOOM für diese Dauer bevor BATTLE triggern kann. Aktuell: ${(config.postStartHoldMs / 1000).toFixed(1)}s.`}
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
              Countdown Start-Zoom (px)
              <InfoTooltip
                text={`Sprite-Höhe am Countdown-Start. Sehr kleine Werte werden auf Minimalzoom geclamppt (ganzer Track sichtbar). Aktuell: ${config.countdownStartZoomSpritePx ?? 1}px.`}
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
              Countdown Dauer (ms)
              <InfoTooltip
                text={`Dauer des Pre-Race Countdowns. Aktuell: ${config.countdownDurationMs ?? 4000}ms.`}
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
              Pulk Threshold (px)
              <InfoTooltip
                text={`BATTLE triggert wenn ≥3 der Top-10 Racer innerhalb dieses Abstands beieinander sind. Aktuell: ${config.battlePulkThresholdPx ?? 200}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={20}
              max={500}
              step={10}
              value={config.battlePulkThresholdPx ?? 200}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 20 && v <= 500) set('battlePulkThresholdPx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BATTLE Min Hold (ms)
              <InfoTooltip
                text={`Mindestdauer BATTLE nach Eintritt, auch wenn Cluster sich auflöst. Aktuell: ${config.battleMinDurationMs ?? 3000}ms.`}
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
                text={`Mindestpause nach BATTLE bevor erneutes Triggern möglich. Aktuell: ${(config.battleCooldownMs / 1000).toFixed(1)}s.`}
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
            label="Isolation (px)"
            testId="battle-isolation-threshold-px"
            min={0}
            max={500}
            step={10}
            value={config.battleIsolationThresholdPx ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 0 && v <= 500) set('battleIsolationThresholdPx', v);
            }}
            display={`${config.battleIsolationThresholdPx ?? 0}px`}
            tip="Mindestabstand zwischen Gruppen-Racer und Nicht-Gruppen-Racer. 0 = deaktiviert. Empfehlung: 1.5 × Pulk-Threshold."
          />
          <SliderRow
            label="Max. Gruppengröße"
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
            tip="Maximale Anzahl Racer in der BATTLE-Gruppe (3–6). Default 6."
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
            tip="Maximaler Rang-Span (höchster minus niedrigster Rang) der BATTLE-Gruppe nach greedy Expansion. Default 5 → P3–P8 wenn Seed bei P3. Verhindert P3-bis-P11-Cluster."
          />
          <SliderRow
            label="Top-N Pflicht (Mindest-Rang)"
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
            tip="Mindestens ein Racer im Pulk muss auf Platz ≤ N sein. Default 10 → Battles nur wenn zumindest ein Top-10-Racer beteiligt ist."
          />
        </div>
      </div>

      {/* ── 3. MID — Regie-Gewichte & OVERVIEW ── */}
      <div className={s.card}>
        <SectionHeading>3 · MID — Regie-Gewichte &amp; OVERVIEW</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Gewichteter Zufalls-Regisseur: alle aktiven Events kommen mit ihren Gewichten in den Pool.
          Pflicht-States (Start, Endgame, Finish) sind nicht im Pool.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="BATTLE-Gewicht"
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
            tip="Selektionsgewicht für BATTLE_ZOOM im Kandidaten-Pool. Default 0.80."
          />
          <SliderRow
            label="LEAD_CHANGE-Gewicht"
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
            tip="Selektionsgewicht für LEAD_CHANGE im Kandidaten-Pool. Default 0.70."
          />
          <SliderRow
            label="COMEBACK-Gewicht"
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
            tip="Selektionsgewicht für COMEBACK_ZOOM im Kandidaten-Pool. Default 0.60."
          />
          <SliderRow
            label="OVERVIEW-Gewicht"
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
            tip="Selektionsgewicht für OVERVIEW im Kandidaten-Pool. Default 0.30."
          />
          <SliderRow
            label="OVERVIEW-Cooldown (ms)"
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
            tip="Mindest-Pause nach OVERVIEW bevor OVERVIEW erneut erscheinen darf. Default 15 s."
          />
          <SliderRow
            label="OVERVIEW-Ziel-Anzahl"
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
            tip="Ziel-Anzahl von OVERVIEW-Schnitten pro Rennen. Default 2."
          />
          <SliderRow
            label="OVERVIEW-Startverzögerung (s)"
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
            tip="Sekunden nach Rennstart bevor OVERVIEW das erste Mal im Pool erscheinen darf. Default 15 s."
          />
        </div>
      </div>

      {/* ── 4. LEAD_CHANGE ── */}
      <div className={s.card}>
        <SectionHeading>4 · LEAD_CHANGE</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Erkennt stabile Führungswechsel (Doppel-Hysterese: Abstand + Debounce).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Min. Abstand (T-Space)"
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
            tip="Mindest-T-Space-Abstand zwischen P1 und P2 für einen stabilen Führungslesewert. Default 0.002."
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
            tip="Dauer in ms, die der neue Anführer halten muss bevor der Wechsel bestätigt wird. Default 800 ms."
          />
          <SliderRow
            label="Min. Beobachtungsdauer (s)"
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
            tip="Mindestdauer, die die Kamera nach LEAD_CHANGE-Eintritt auf dem neuen Anführer bleibt. Default 1.5 s."
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
            tip="Mindest-Pause nach LEAD_CHANGE bevor erneutes Triggern möglich. Default 5 s."
          />
        </div>
      </div>

      {/* ── 5. COMEBACK ── */}
      <div className={s.card}>
        <SectionHeading>5 · COMEBACK</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Erkennt B1-Racer (sollRank 1–5) die aktiv Plätze gutmachen. Benötigt Race Plan (nur
          Open-Track ≥ 60 s). Outcome-Phase wird intern ab Leader-Progress-Schwelle aktiv,
          unabhängig vom externen Flag aus RaceScreen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Min. Platzgewinn"
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
            tip="Mindest-Platzgewinn innerhalb des Zeitfensters um COMEBACK auszulösen. Default 2."
          />
          <SliderRow
            label="Zeitfenster (s)"
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
            tip="Rückblick-Fenster für Rang-History. Platzgewinn = Rang vor N Sekunden minus aktueller Rang. Default 4 s."
          />
          <SliderRow
            label="Min. Beobachtungsdauer (s)"
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
            tip="Mindestdauer nach COMEBACK-Eintritt auf dem Comeback-Racer. Default 3 s."
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
            tip="Mindest-Pause nach COMEBACK bevor erneutes Triggern möglich. Default 10 s."
          />
          <SliderRow
            label="Outcome-Phase Schwelle"
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
            tip="Leader-Fortschritt ab dem COMEBACK intern als aktiv gilt (unabhängig vom externen isOutcomePhase-Flag). Default 75%."
          />
          <SliderRow
            label="Min. Ausgangsabstand (Start-Gap)"
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
            tip="Der Fahrer muss zu Beginn des Beobachtungsfensters mindestens diesen normierten Rückstand auf P1 gehabt haben (Feldanteil). 0.40 = muss in den hinteren 60% des Feldes gewesen sein. Default 40%."
          />
          <SliderRow
            label="Max. Aktueller Rang (Lead-Group-Filter)"
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
            tip="Fahrer darf beim Trigger-Zeitpunkt nicht besser als diesen normierten Rang haben. 0.10 = Top-10% ausgeschlossen (z.B. P1–P4 bei 40 Racern). Default 10%."
          />
        </div>
      </div>

      {/* ── 6. BATTLE Slowmo ── */}
      <div className={s.card}>
        <SectionHeading>6 · BATTLE Slowmotion</SectionHeading>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Verlangsamt die Physik (nicht die Kamera) während BATTLE_ZOOM. Nicht-BATTLE-Racer werden
          abgedunkelt.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Slowmo-Faktor"
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
            tip="Physik-Geschwindigkeit während BATTLE_ZOOM. 1.0 = normal, 0.5 = halb so schnell. Default 0.5."
          />
          <SliderRow
            label="Mindest-Dauer (s)"
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
            tip="Mindestdauer des Slowmo-Effekts nach Ende von BATTLE_ZOOM. Default 2.0s."
          />
          <SliderRow
            label="Fade-Dauer (s)"
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
            tip="Dauer des Ein- und Ausblendens des Slowmo-Effekts. 0 = sofortiger Wechsel. Default 0.3s."
          />
          <SliderRow
            label="Fokus-Abdunkelung"
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
            tip="Abdunkelung der Nicht-BATTLE-Racer. 0 = kein Effekt, 1 = komplett schwarz. Default 0.4."
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
                text={`Ab diesem Leader-Fortschritt erzwingt die Kamera LEADER_ZOOM (außer bei LEAD_CHANGE). Aktuell: ${((config.endgameThreshold ?? 0.9) * 100).toFixed(0)}%.`}
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
          Nach erster Zieldurchfahrt: Drama-Pulse auf Leader → sanfter FINISH_OVERVIEW Zoom-Out bis
          letzter Fahrer im Ziel → Pause → Leaderboard.
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Drama-Pulse Dauer (ms)
              <InfoTooltip
                text={`Dauer des LEADER_ZOOM-Pulses beim ersten Zieldurchlauf bevor FINISH_OVERVIEW beginnt. Aktuell: ${config.finishDramaDurationMs ?? 1500}ms.`}
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
              Zoom-Out Dauer (ms)
              <InfoTooltip
                text={`Zieldauer für den sanften Zoom-Out auf OVERVIEW-Niveau nach dem Drama-Pulse. Aktuell: ${config.finishOverviewZoomOutDurationMs ?? 3000}ms.`}
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
              Pause vor Leaderboard (ms)
              <InfoTooltip
                text={`Pause nach letztem Zieleinlauf bevor das Leaderboard erscheint. Aktuell: ${config.finishPauseMs ?? 2500}ms.`}
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
            label="Pan-Blend Richtung Ziel"
            testId="finish-overview-pan-blend"
            min={0}
            max={1}
            step={0.05}
            value={config.finishOverviewPanBlend ?? 0.5}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('finishOverviewPanBlend', v);
            }}
            display={(config.finishOverviewPanBlend ?? 0.5).toFixed(2)}
            tip="FINISH_OVERVIEW: Kamera schwenkt von Leader Richtung Ziellinie. 0 = Leader zentriert (kein Schwenk), 0.5 = Kameramitte auf halbem Weg (Leader am Bildrand), 1 = Ziellinie zentriert. Default 0.5."
          />
          <SliderRow
            label="Lookback vor Ziel (px)"
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
            tip="FINISH_OVERVIEW: Wie weit vor der Ziellinie (in Weltpixeln) das Kameraziel liegt. 0 = zentriert auf Ziellinie, 300 = 300 px vor dem Ziel (streckenunabhängig). Default 300."
          />
        </div>
      </div>

      {/* ── 9. Zoom-Profile pro State ── */}
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <SectionHeading>9 · Zoom-Profile pro State</SectionHeading>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Pro State: Sprite-Größe, Lerp-Zeitkonstanten, Lead-in/out-Dauer, Framing und Zeitgrenzen.
          Accordion aufklappen zum Anpassen.
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
        <SectionHeading>10 · Globale Konvergenzschwellen</SectionHeading>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Convergence Zoom Threshold
              <InfoTooltip
                text={`Entry→Tracking wenn Zoom-Delta unter diesen Wert fällt. Aktuell: ${config.entryConvergenceZoom ?? 0.05}.`}
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
                text={`Entry→Tracking wenn Offset-Delta unter diesen Pixelwert fällt. Aktuell: ${config.entryConvergencePx ?? 10}px.`}
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
                text={`Entry→Tracking wenn |camT − targetT| unter diesen Wert fällt (Track-Param-Einheiten). Steady-state-Gap ≈ 0.026; Schwelle muss darüber liegen. Aktuell: ${(config.transitionTConvergence ?? 0.03).toFixed(3)}.`}
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
        <SectionHeading>Diagnose &amp; Sichtbarkeit</SectionHeading>

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
            <span style={{ fontWeight: 600 }}>Einblende-Texte aktivieren</span>
            <InfoTooltip text="Blendet kurze Texte (z.B. 'Aktuell führt Max') beim Eintritt in OVERVIEW, BATTLE und COMEBACK ein." />
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '10rem' }}>Einblende-Dauer (ms)</span>
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
            <InfoTooltip text="Dauer in ms, wie lange der Einblende-Text sichtbar bleibt. Default: 3500 ms." />
          </label>
        </div>

        {/* Toggle group */}
        {[
          {
            key: 'showCameraStateHud',
            testId: 'cam-hud-toggle',
            label: 'Show camera state HUD',
            tip: 'Zeigt den Kamera-State-Indikator (OVERVIEW / BATTLE / etc.) oben links im Renn-Canvas.',
          },
          {
            key: 'showCameraDiagnostics',
            testId: 'cam-diagnostics-toggle',
            label: 'Show camera diagnostics',
            tip: 'Diagnostik-Panel unten links: live zoom-Werte. Loggt State-Transitions in die Browser-Konsole.',
          },
          {
            key: 'showRpDiag',
            testId: 'rp-diag-toggle',
            label: 'Show Race Plan diagnostics',
            tip: 'Race-Plan-Diagnose-Panel oben rechts: Phase, Re-Roll-Status, spreadFactor. Nur wenn Race Plan aktiv.',
          },
          {
            key: 'showRpWinnerList',
            testId: 'rp-winner-list-toggle',
            label: 'Show B1 Winner List',
            tip: 'Zeigt die 5 Race-Plan-Favoriten (sollRank 1–5) mit aktuellem Rang und Delta.',
          },
          {
            key: 'showRpMinimapBadges',
            testId: 'rp-minimap-badges-toggle',
            label: 'Show Minimap Badges',
            tip: 'Markiert die 5 Race-Plan-Favoriten in der Minimap mit einem goldenen Ring.',
          },
          {
            key: 'showRpStartRow',
            testId: 'rp-startrow-toggle',
            label: 'Show Start-Row in Name Tags',
            tip: "Hängt die Startreihe an den Namen-Tag an (z.B. 'Max (R2)').",
          },
          {
            key: 'showTop10SpeedMonitor',
            testId: 'top10-speed-monitor-toggle',
            label: 'Show Top-10 Speed Monitor',
            tip: 'Zeigt trajectoryMult-Werte der Top-10 Fahrer. Warnsymbol bei Oszillation.',
          },
          {
            key: 'enableFrameLog',
            testId: 'cam-frame-log-toggle',
            label: 'Enable frame log',
            tip: 'Aktiviert den Per-Frame-Kamera-Ringpuffer. Export-Button erscheint auf dem Race-Screen.',
          },
          {
            key: 'showBattleDiag',
            testId: 'battle-diag-toggle',
            label: 'Show BATTLE diagnostics',
            tip: 'BATTLE-Status, beteiligte Racer und Pulk-Validität live im Canvas.',
          },
          {
            key: 'showComebackDiag',
            testId: 'comeback-diag-toggle',
            label: 'Show COMEBACK diagnostics',
            tip: 'OUTCOME-Phase, B1-Racer mit Rang-Gewinn und aktiv gesperrter Comeback-Racer.',
          },
          {
            key: 'showLeadChangeDiag',
            testId: 'lead-change-diag-toggle',
            label: 'Show LEAD_CHANGE diagnostics',
            tip: 'Aktueller und vorheriger Anführer, Pending-Status, minGap und Debounce.',
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
