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
  // CAMERA-FRAMING-1: PHOTO_FINISH has its own row at last. It borrowed BATTLE's numbers, so the
  // closest shot in the race was never closer than an ordinary battle.
  'PHOTO_FINISH',
];

const STATE_LABELS = {
  OVERVIEW: 'Overview',
  LEADER_ZOOM: 'Leader Zoom',
  BATTLE_ZOOM: 'Battle Zoom',
  COMEBACK_ZOOM: 'Comeback Zoom',
  LEAD_CHANGE: 'Lead Change',
  PHOTO_FINISH: 'Photo Finish',
};

const PROFILE_FIELDS = [
  {
    key: 'visibleCorridors',
    label: 'World in shot (corridors)',
    // CAMERA-REFERENCE-WIDTH-1 range, derived from measurement rather than inherited:
    //  min 0.25 — at 0.25 the largest creature (the luge, 59 px) already fills 79% of the frame
    //             height; below that a racer is a portrait rather than a shot.
    //  max 13   — the widest track needs 12.55 corridors to be fully in frame (Seatrack).
    //  step 0.05 — 7% of the shot at the LEADER default, 3% at OVERVIEW; roughly the smallest
    //             change the eye separates. The old min of 1.0 was the full-track-width guarantee's
    //             threshold and is gone with it: the guarantee now computes on its own.
    min: 0.25,
    max: 13,
    step: 0.05,
    tip: (v, n) =>
      `How much world ${n} shows: ${v.toFixed(2)} standard corridors across the frame, i.e. ` +
      `${Math.round(v * 300)} world pixels at the default 300 px reference. HIGHER = WIDER. ` +
      `The same number now shows the SAME AMOUNT OF WORLD on every track — a narrow track no ` +
      `longer gets a tighter shot just for being narrow. It is not measured in this track's own ` +
      `width any more, so it is not the same scale as the old "track widths" number: 0.75 here is ` +
      `roughly what 2 used to be on a wide track. Racers still differ in size between tracks ` +
      `because the animals differ — a manta is bigger than a horse, and that part is deliberate.`,
  },
  {
    key: 'trackingTC',
    label: 'Tracking TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
    // Renders the LIVE value, so it cannot drift from the shipped default the way a quoted
    // constant can. What it was missing is the MEANING: measured in percentage points of frame,
    // OVERVIEW at 1.5 left its subject 13.78 pp from where the framing rule put him against 3.78 pp
    // everywhere else; 0.25 (now the default on every state) halves that. See defaults.js.
    tip: (v) =>
      `Lerp time-constant during stable tracking. ${v.toFixed(2)}s. Higher = the subject drifts ` +
      `further from its framed position before the camera catches up; every state ships 0.25s.`,
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
      {/* ── 0. Eye-test hero highlight (render-time diagnostic; default OFF, no effect on races) ── */}
      <div className={s.card}>
        <SectionHeading>0 · Eye-test</SectionHeading>
        <label className={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={config.highlightHeroes ?? false}
            onChange={(e) => set('highlightHeroes', e.target.checked)}
            data-testid="highlight-heroes-toggle"
          />
          Highlight heroes — <span style={{ color: '#34c759' }}>green ring = normal hero</span>,{' '}
          <span style={{ color: '#ff3b30' }}>red ring = B2-attacker</span>
        </label>
        {/* LABEL-OCCLUSION-1 — the name on the track when it covers nothing. The KEY and the OFF
            default are LABEL-DEGRADE-1's and are deliberately unchanged; what the switch DOES is
            not, so its text is. See reports/night/LABEL-OCCLUSION-1.md. */}
        <label
          className={s.label}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
        >
          <input
            type="checkbox"
            checked={config.labelNamesWhenRoom ?? false}
            onChange={(e) => set('labelNamesWhenRoom', e.target.checked)}
            data-testid="label-names-when-room-toggle"
          />
          Track labels show the NAME when it covers nothing
          <InfoTooltip
            text={
              'During the race, a label shows the racer’s NAME when the name would cover ' +
              'neither another label nor another racer, and the NUMBER otherwise. A name is ' +
              'EARNED by 2 s of clear geometry and given up the instant it stops being clear, so ' +
              'a name is never drawn on a racer. Two exceptions: the racer the camera is ON keeps ' +
              'its name throughout, and at the photo finish every racer in frame carries one. ' +
              'Measured at 100 racers: 17.2% of labels show a name on searound and 9.5% on ' +
              'river-run, changing form 7.8 and 4.8 times per label per race. OFF by default — ' +
              'your eye decides whether that share is worth that much switching.'
            }
          />
        </label>
      </div>
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
          {/* START-BOARD-2 — THE RUNNERS' BOARD'S OWN DURATION.
              `max(floor, msPerName × racers)`. The countdown's total is now the SUM of the beats
              plus whatever the board still needs after the push, so there is no "countdown
              duration" box any more: its length follows these numbers instead of capping them. */}
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Runners&apos; board — floor (ms)
              <InfoTooltip
                text={
                  `The SHORTEST the starters' board is ever shown, however small the field. ` +
                  `The board is up for max(this, per-name × racers). Currently: ` +
                  `${config.startBoardFloorMs ?? 6000}ms.`
                }
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={20000}
              step={250}
              value={config.startBoardFloorMs ?? 6000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 20000) set('startBoardFloorMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Runners&apos; board — per name (ms)
              <InfoTooltip
                text={
                  `Reading time allowed per racer. The board is up for ` +
                  `max(floor, this × racers), and the camera HOLDS on the formation until it is ` +
                  `done — the push keeps its own speed. At ${config.startBoardMsPerName ?? 120}ms ` +
                  `that is ${(((config.startBoardMsPerName ?? 120) * 40) / 1000).toFixed(1)}s at 40 ` +
                  `racers and ${(((config.startBoardMsPerName ?? 120) * 100) / 1000).toFixed(1)}s at 100.`
                }
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={500}
              step={10}
              value={config.startBoardMsPerName ?? 120}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 500) set('startBoardMsPerName', v);
              }}
            />
          </div>
          {/* START-CEREMONY-CAMERA-1 — the RHYTHM of the opening. Both ENDS of the move are
              geometry (the track's extent, the field's extent) and are deliberately not settings. */}
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Venue Shot (ms)
              <InfoTooltip
                text={`How long the opening shot of the whole track is held STILL before the camera begins to move. It means exactly what it says: since START-BOARD-2 the opening's total length is the SUM of these beats, so raising this makes the opening longer and changes no other beat. Currently: ${config.ceremonyVenueMs ?? 1400}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-venue-ms"
              min={0}
              max={6000}
              step={100}
              value={config.ceremonyVenueMs ?? 1400}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 6000) set('ceremonyVenueMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Push In (ms)
              <InfoTooltip
                text={`How long the camera takes to ease from the venue shot in to the starting formation. Where it ARRIVES is not a setting: it is the largest zoom at which every racer is still in frame, measured from the formation itself, so it is right on every track and at every field size. Currently: ${config.ceremonyPushMs ?? 2000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-push-ms"
              min={0}
              max={6000}
              step={100}
              value={config.ceremonyPushMs ?? 2000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 6000) set('ceremonyPushMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Settled Hold — the searching time (ms)
              <InfoTooltip
                text={`THE BEAT THAT MAKES THE BOARD WORTH SHOWING: the formation held still, board gone and no digits yet, so a viewer can take the number the board just taught them and FIND it on the track. Raised from 600 to 4000 after the searound eye test, where the race began almost the moment the board vanished. It is ADDED to the opening, never taken out of it. Currently: ${config.ceremonySettledMs ?? 4000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-settled-ms"
              min={0}
              max={15000}
              step={100}
              value={config.ceremonySettledMs ?? 4000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 15000) set('ceremonySettledMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Countdown digits (ms)
              <InfoTooltip
                text={`How long the 3-2-1 digits are on screen, at the very END of the opening. Before this window there are no digits at all — that is what gives the searching time above a stretch with no clock on it. NOT a cap: it is added to the opening like every other beat, and the count still reaches zero exactly at the gun. Currently: ${config.countdownDigitsMs ?? 3000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="countdown-digits-ms"
              min={0}
              max={10000}
              step={250}
              value={config.countdownDigitsMs ?? 3000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('countdownDigitsMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Push Easing
              <InfoTooltip
                text={`The SHAPE of the push in. Ease in-out begins at rest, gathers, and arrives at rest — the ceremonial shape. Ease out cubic is what the countdown did before this block: it starts at full speed, which reads as the camera catching up to something rather than as ceremony. Quint is the same shape held longer at both ends, the most deliberate of the four.`}
              />
            </label>
            <select
              className={s.input}
              data-testid="ceremony-easing"
              value={config.ceremonyEasing ?? 'easeInOutCubic'}
              onChange={(e) => set('ceremonyEasing', e.target.value)}
            >
              <option value="easeInOutCubic">Ease in-out (cubic) — ceremonial</option>
              <option value="easeInOutQuint">Ease in-out (quint) — most deliberate</option>
              <option value="easeOutCubic">Ease out (cubic) — the old feel</option>
              <option value="linear">Linear — constant speed</option>
            </select>
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
            min={0.001}
            max={0.02}
            step={0.001}
            value={config.battlePulkThresholdT ?? 0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.001 && v <= 0.02) set('battlePulkThresholdT', v);
            }}
            display={`${((config.battlePulkThresholdT ?? 0.05) * 100).toFixed(1)}%`}
            tip="How close (as a fraction of a lap) ≥3 top-10 racers must be to trigger BATTLE. Scale-independent — same on every track. Lower = tighter duel, higher = fires more often. Fine-grained for the dense COMBO15 field: range 0.1%–2.0%, step 0.1%. Default 0.05 (5% of a lap) — above the slider max, so the thumb pins at 2.0% until you move it (the stored value is preserved)."
          />
          <SliderRow
            label="Isolation (lap %)"
            testId="battle-isolation-threshold-t"
            min={0}
            max={0.02}
            step={0.001}
            value={config.battleIsolationThresholdT ?? 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 0.02) set('battleIsolationThresholdT', v);
            }}
            display={`${((config.battleIsolationThresholdT ?? 0) * 100).toFixed(1)}%`}
            tip="Reject a battle if any non-group racer is within this lap fraction of a group member. 0 = disabled. Recommendation ≈ 1.5 × Pulk Closeness. Fine-grained: range 0.0%–2.0%, step 0.1%. Ships disabled (default 0)."
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
            label="Minimum racer size (% of frame)"
            testId="regie-min-drawn-frame-frac"
            // 0 .. 10% of frame height. Above ~6% the floor starts binding on most tracks and
            // stops being a floor; step 0.5% is ~3.6 screen px, about the smallest change that
            // reads on a racer this size.
            min={0}
            max={10}
            step={0.5}
            value={Math.round((config.minDrawnFrameFrac ?? 0.045) * 1000) / 10}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 0 && v <= 10) set('minDrawnFrameFrac', v / 100);
            }}
            display={
              (config.minDrawnFrameFrac ?? 0.045) <= 0
                ? 'Off'
                : `${((config.minDrawnFrameFrac ?? 0.045) * 100).toFixed(1)}%`
            }
            tip="A readability floor: a racer is never DRAWN smaller than this share of the frame height, so it stays recognisable when the camera is far out. It affects the drawing only — it does not change the zoom, it cannot override your 'World in shot' setting, and it never moves the camera. Default 4.5%: before this floor existed the Space Sprint start formation drew its rockets at 4.44% and the owner was happy with it; without any floor they are 3.17% and the formation stops overlapping. At the default it only bites in Overview, on the tracks whose racers are drawn smallest. 0 turns it off."
          />
          <SliderRow
            label="Standard corridor (world px)"
            testId="regie-reference-corridor-px"
            // Range from measurement: 100 px is below the narrowest corridor shipped (131) and is
            // where a shot stops holding a start row; 600 is double the widest. Step 10 because a
            // 10 px change is 3% of the shot — about the smallest that reads on screen.
            min={100}
            max={600}
            step={10}
            value={config.referenceCorridorPx ?? 300}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 100 && v <= 600) set('referenceCorridorPx', v);
            }}
            display={`${config.referenceCorridorPx ?? 300} px`}
            tip="The width, in world pixels, that ONE corridor means for every camera setting. Every state's 'World in shot' number is measured in these, so changing this rescales EVERY shot on EVERY track at once — raise it and the whole game pulls back, lower it and everything moves in. It is what makes one number mean the same picture on a narrow track and a wide one. Default 300: the widest corridor drawn so far, so today every track is judged against the same yardstick. A track wider than this keeps its own width instead, so its corridor is never cropped."
          />
          <SliderRow
            label="Company: min racers in frame"
            testId="regie-min-racers-visible"
            min={0}
            max={12}
            step={1}
            value={config.minRacersVisible ?? 3}
            onChange={(e) => set('minRacersVisible', parseInt(e.target.value, 10))}
            display={
              (config.minRacersVisible ?? 3) <= 1 ? 'Off' : `${config.minRacersVisible ?? 3}`
            }
            tip="The DRAMATURGICAL guarantee — 'do not show emptiness'. At least this many racers stay in frame, counting the subject, so a tight LEADER shot never goes empty: leader alone, no reference, no tension. It is a LIMIT, not a correction — the camera does not zoom in and then back out, it simply does not go that far. 0 or 1 turns it off. Applies to the single-subject shots (LEADER, COMEBACK, OVERVIEW); BATTLE, LEAD_CHANGE and PHOTO_FINISH already guarantee their pair. Default 3: measured to halve the frames where the leader is alone at a LEADER setting of 1, at almost no cost in restlessness."
          />
        </div>

        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-muted)',
            margin: '0.75rem 0 0.4rem',
          }}
        >
          <strong>Transition grammar</strong> — how the camera changes shots (CAMERA-GRAMMAR-1).
          Glide eases pan+zoom together; Cut snaps them. Forward-framing places the leader ahead in
          frame so the pack behind (the action) is visible.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '11rem' }}>Transition style</span>
            <select
              data-testid="regie-transition-grammar"
              value={config.cameraTransitionGrammar ?? 'glide'}
              onChange={(e) => set('cameraTransitionGrammar', e.target.value)}
              style={{ padding: '0.2rem 0.4rem' }}
            >
              <option value="glide">Glide (smooth)</option>
              <option value="cut">Cut (crisp)</option>
            </select>
          </label>
          <SliderRow
            label="Glide duration (ms)"
            testId="regie-glide-duration-ms"
            min={300}
            max={900}
            step={50}
            value={config.glideDurationMs ?? 500}
            onChange={(e) => set('glideDurationMs', parseInt(e.target.value, 10))}
            display={`${config.glideDurationMs ?? 500} ms`}
            tip="How long a Glide transition takes to ease pan+zoom from the old shot to the new subject's framing. Only used when Transition style = Glide. Range 300–900 ms. Default 500."
          />
          <SliderRow
            label="Leader forward-frame"
            testId="regie-leader-forward-frac"
            min={0.5}
            max={0.8}
            step={0.02}
            value={config.leaderForwardFrac ?? 0.66}
            onChange={(e) => set('leaderForwardFrac', parseFloat(e.target.value))}
            display={
              (config.leaderForwardFrac ?? 0.66) <= 0.5
                ? 'Centre'
                : (config.leaderForwardFrac ?? 0.66).toFixed(2)
            }
            tip="Where the leader sits along the motion axis. 0.50 = dead centre; 0.66 = about two-thirds forward toward the leading edge so most of the frame shows the pack behind (the action). Range 0.50–0.80. Default 0.66."
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
            tip="Leader progress from which COMEBACK is considered active internally (independent of the external isOutcomePhase flag). Default 65%."
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
            tip="The racer must have had at least this normalised gap to P1 at the start of the observation window (field fraction). 0.25 = must have been in the back 75% of the field. Default 25%."
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
            tip="Racer must not have a better normalised rank than this at trigger time. 0.20 = top 20% excluded (e.g. P1–P8 with 40 racers). Default 20%."
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
              Finish pause (ms)
              <InfoTooltip
                text={`How long the camera HOLDS before the zoom-out to the finish overview begins. It applies to both endings and it is the same dial for both: after an ordinary finish it holds on the winner from the moment he crosses; after a PHOTO FINISH it holds the pair shot from the moment BOTH contenders are home — not merely when two racers have crossed, since the second across is often neither of them. 0 means no pause at all: the zoom-out starts on the same frame, with no held shot. Currently: ${config.finishDramaDurationMs ?? 1500}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              // FINISH-WINDOW-1: the floor is 0, and it lived in TWO places here — this attribute
              // and the guard below. Opening only one would have let his 0 be silently ignored.
              min={0}
              max={5000}
              step={100}
              value={config.finishDramaDurationMs ?? 1500}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 5000) set('finishDramaDurationMs', v);
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
            key: 'cameraDetourLog',
            testId: 'cam-detour-log-toggle',
            label: 'Enable detour frame log (CAMERA-DETOUR-1)',
            tip: 'Read-only diagnosis of the wrong-direction move: logs 3 frames before + ~30 after each view change to the console as "[RA CAMERA DETOUR]" lines. Alters no camera value. Run a race, then copy the console lines.',
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
          {
            key: 'showGovernorDiag',
            testId: 'governor-diag-toggle',
            label: 'Show GOVERNOR diagnostics',
            tip: 'Pre-OUTCOME field governor: resolved phase fade (pulkEnd → corrStart), Action/k/A, and leader/straggler gap + cohesion/shuffle/mult. Top-center.',
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
