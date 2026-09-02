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
  // MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
  DEFAULT_CAMERA_CONFIG,
  loadCameraConfig,
  saveCameraConfig,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
// CEREMONY-OPENING-2: the total is READ from the same function the race uses, never re-added here.
// A second sum beside the schedule is precisely how the countdown once became invisible.
import { ceremonyTotalMs } from '../../../modules/camera/startCeremony.js';
// ENDING-HOLD-1: the ending's arithmetic has ONE home, and this read-out shares it with the race
// screen's timers rather than adding the terms up a second time here.
import { endingTotalMs, SCREEN_TRANSITION_MS } from '../../RaceScreen/endingSchedule.js';
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
            checked={config.highlightHeroes ?? DEFAULT_CAMERA_CONFIG.highlightHeroes}
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
            checked={config.labelNamesWhenRoom ?? DEFAULT_CAMERA_CONFIG.labelNamesWhenRoom}
            onChange={(e) => set('labelNamesWhenRoom', e.target.checked)}
            data-testid="label-names-when-room-toggle"
          />
          Track labels show the NAME when it covers nothing
          <InfoTooltip
            text={
              'During the race, a label shows the racer’s NAME when the name would cover ' +
              'neither another label nor another racer, and the NUMBER otherwise. A name is ' +
              'EARNED by a stretch of clear geometry (the slider below) and given up the instant ' +
              'it stops being clear, so ' +
              'a name is never drawn on a racer. Two exceptions: the racer the camera is ON keeps ' +
              'its name throughout, and at the photo finish every racer in frame carries one. ' +
              'Measured at 100 racers: 17.2% of labels show a name on searound and 9.5% on ' +
              'river-run, changing form 7.8 and 4.8 times per label per race. OFF by default — ' +
              'your eye decides whether that share is worth that much switching.'
            }
          />
        </label>
        {/* LABEL-HOLD-1 — how long a name must be EARNED for. Only the promotion; the withdrawal is
            immediate by design and is deliberately not settable. */}
        <div className={s.formGroup} style={{ marginTop: '0.5rem' }}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Track labels — wait before a name (ms)
            <InfoTooltip
              text={
                'How long a label’s name must be completely clear — of every other label and every ' +
                'other racer — before it is shown. It is given up the INSTANT it stops being clear, ' +
                'and that half is not settable: a name over a racer is the defect the feature ' +
                'removes. Lower means names appear sooner and change form more often. 2000 was the ' +
                'calmest value on the measurement; 1200 is what your eye asked for. Currently: ' +
                `${config.labelFormHoldMs ?? DEFAULT_CAMERA_CONFIG.labelFormHoldMs}ms.`
              }
            />
          </label>
          <input
            type="number"
            className={s.input}
            data-testid="label-form-hold-ms"
            min={0}
            max={10000}
            step={100}
            value={config.labelFormHoldMs ?? DEFAULT_CAMERA_CONFIG.labelFormHoldMs}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 0 && v <= 10000) set('labelFormHoldMs', v);
            }}
          />
        </div>
      </div>
      {/* ── 1. Start & Post-Start ── */}
      <div className={s.card}>
        <SectionHeading>1 · Start &amp; Post-Start</SectionHeading>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.6rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="ceremony-skip-on-click"
            checked={config.ceremonySkipOnClick ?? DEFAULT_CAMERA_CONFIG.ceremonySkipOnClick}
            onChange={(e) => set('ceremonySkipOnClick', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Click to end the current start beat</span>
          <InfoTooltip text="A TEST AID, off by default. With this on, a left click anywhere on the race picture during the start sequence ends the beat you are watching and opens the next one — and on the last click the gun fires. It moves the ceremony's single clock backwards by the remainder of the current beat, so nothing is cancelled and every part of the opening follows by itself. It changes no ceremony length: with it off, or on and unclicked, the opening is exactly what it is today." />
        </label>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Start Window (ms)
              <InfoTooltip
                text={`How long the START owns the picture: no BATTLE, no COMEBACK, no LEAD_CHANGE until it ends. ONE number now — it replaces a hard-coded 3 s of forced overview PLUS a post-start hold counted on top of it, and its shipped value is that same sum. Inside it the shot opens where it stands without panning, and the camera begins to follow the leader the moment he reaches the place in frame he holds for the rest of the race (Leader Forward Fraction, section 9). Currently: ${((config.startWindowMs ?? DEFAULT_CAMERA_CONFIG.startWindowMs) / 1000).toFixed(1)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="start-window-ms"
              min={0}
              max={30000}
              step={500}
              value={config.startWindowMs ?? DEFAULT_CAMERA_CONFIG.startWindowMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 30000) set('startWindowMs', v);
              }}
            />
          </div>
          {/* ── CEREMONY-OPENING-2 — THE START CEREMONY, ONE SLIDER PER BEAT ────────────────
              The owner's shape: *"each of the points has its own slider for how long; a total
              results from it, but that is not really important."* So they are gathered here in the
              order they happen, numbered as he numbered them, and THE TOTAL IS DERIVED AND
              READ-ONLY — it is an outcome, not a control. There is nothing left in this ceremony
              that squeezes: `ceremonyTotalMs` is the plain sum of the beats, so every box below
              means exactly the beat it names and moves the total by exactly its own amount.

              THE PUSH-IN IS IN HERE THOUGH HE DID NOT LIST IT, labelled as the travel rather than
              as a beat, because it is a MOVEMENT and not a display. It already had its own value;
              what it did not have was a place beside the rest of the rhythm. Both ENDS of that
              move remain geometry (the track's extent, the field's extent) and are deliberately
              not settings at all. */}
          <div
            className={s.subBlockTitle ?? undefined}
            style={{
              marginTop: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              opacity: 0.75,
            }}
          >
            The start ceremony — one slider per beat
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              1 · Brand screen (ms)
              <InfoTooltip
                text={`The opening card: the brand's logo, large, with the race name. IT ONLY EXISTS IF A BRAND IS ACTIVE — with none chosen this beat is zero and the ceremony begins directly on the track, with no gap and no blank hold. Currently: ${config.ceremonyBrandMs ?? DEFAULT_CAMERA_CONFIG.ceremonyBrandMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-brand-ms"
              min={0}
              max={10000}
              step={100}
              value={config.ceremonyBrandMs ?? DEFAULT_CAMERA_CONFIG.ceremonyBrandMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('ceremonyBrandMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              2 · Track overview (ms)
              <InfoTooltip
                text={`How long the opening shot of the whole track is held STILL before the camera begins to move. It means exactly what it says: since START-BOARD-2 the opening's total length is the SUM of these beats, so raising this makes the opening longer and changes no other beat. Currently: ${config.ceremonyVenueMs ?? DEFAULT_CAMERA_CONFIG.ceremonyVenueMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-venue-ms"
              min={0}
              max={6000}
              step={100}
              value={config.ceremonyVenueMs ?? DEFAULT_CAMERA_CONFIG.ceremonyVenueMs}
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
              · Push-in travel (ms)
              <InfoTooltip
                text={`How long the camera takes to ease from the venue shot in to the starting formation. Where it ARRIVES is not a setting: it is the largest zoom at which every racer is still in frame, measured from the formation itself, so it is right on every track and at every field size. Currently: ${config.ceremonyPushMs ?? DEFAULT_CAMERA_CONFIG.ceremonyPushMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-push-ms"
              min={0}
              max={6000}
              step={100}
              value={config.ceremonyPushMs ?? DEFAULT_CAMERA_CONFIG.ceremonyPushMs}
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
              3 · Starters board — floor (ms)
              <InfoTooltip
                text={
                  `The SHORTEST the starters' board is ever shown, however small the field. ` +
                  `The board is up for max(this, per-name × racers). Currently: ` +
                  `${config.startBoardFloorMs ?? DEFAULT_CAMERA_CONFIG.startBoardFloorMs}ms.`
                }
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={20000}
              step={250}
              value={config.startBoardFloorMs ?? DEFAULT_CAMERA_CONFIG.startBoardFloorMs}
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
              3 · Starters board — per name (ms)
              <InfoTooltip
                text={
                  `Reading time allowed per racer. The board is up for ` +
                  `max(floor, this × racers), and the camera HOLDS on the formation until it is ` +
                  `done — the push keeps its own speed. At ${config.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName}ms ` +
                  `that is ${(((config.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName) * 40) / 1000).toFixed(1)}s at 40 ` +
                  `racers and ${(((config.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName) * 100) / 1000).toFixed(1)}s at 100.`
                }
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={500}
              step={10}
              value={config.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 500) set('startBoardMsPerName', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              4 · Starting formation (ms)
              <InfoTooltip
                text={`THE BEAT THAT MAKES THE BOARD WORTH SHOWING: the formation held still, board gone and no digits yet, so a viewer can take the number the board just taught them and FIND it on the track. Raised from 600 to 4000 after the searound eye test, where the race began almost the moment the board vanished. It is ADDED to the opening, never taken out of it. Currently: ${config.ceremonySettledMs ?? DEFAULT_CAMERA_CONFIG.ceremonySettledMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="ceremony-settled-ms"
              min={0}
              max={15000}
              step={100}
              value={config.ceremonySettledMs ?? DEFAULT_CAMERA_CONFIG.ceremonySettledMs}
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
              5 · Countdown digits (ms)
              <InfoTooltip
                text={`How long the 3-2-1 digits are on screen, at the very END of the opening. Before this window there are no digits at all — that is what gives the searching time above a stretch with no clock on it. NOT a cap: it is added to the opening like every other beat, and the count still reaches zero exactly at the gun. Currently: ${config.countdownDigitsMs ?? DEFAULT_CAMERA_CONFIG.countdownDigitsMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="countdown-digits-ms"
              min={0}
              max={10000}
              step={250}
              value={config.countdownDigitsMs ?? DEFAULT_CAMERA_CONFIG.countdownDigitsMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('countdownDigitsMs', v);
              }}
            />
          </div>
          {/* DERIVED, never steered. Shown at three field sizes because the board's length scales
              with the field, so a single number would be true for one race and wrong for the next. */}
          <div
            className={s.formGroup}
            data-testid="ceremony-total"
            style={{ opacity: 0.85, fontSize: '0.78rem', lineHeight: 1.6 }}
          >
            <span className={s.label}>Total opening (derived)</span>
            {(() => {
              const cfgNow = { ...DEFAULT_CAMERA_CONFIG, ...config };
              const withBrand = (n) => ceremonyTotalMs(cfgNow, n, true) / 1000;
              const noBrand = (n) => ceremonyTotalMs(cfgNow, n, false) / 1000;
              return (
                <span>
                  {[8, 40, 100].map((n) => (
                    <span key={n} style={{ display: 'block' }}>
                      {n} racers: <strong>{noBrand(n).toFixed(1)}s</strong> without a brand ·{' '}
                      <strong>{withBrand(n).toFixed(1)}s</strong> with one
                    </span>
                  ))}
                </span>
              );
            })()}
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
              value={config.ceremonyEasing ?? DEFAULT_CAMERA_CONFIG.ceremonyEasing}
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
                text={`Minimum BATTLE duration after entry, even if the cluster dissolves. Currently: ${config.battleMinDurationMs ?? DEFAULT_CAMERA_CONFIG.battleMinDurationMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={500}
              max={10000}
              step={500}
              value={config.battleMinDurationMs ?? DEFAULT_CAMERA_CONFIG.battleMinDurationMs}
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
              value={config.battleCooldownMs ?? DEFAULT_CAMERA_CONFIG.battleCooldownMs}
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
            value={config.battlePulkThresholdT ?? DEFAULT_CAMERA_CONFIG.battlePulkThresholdT}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.001 && v <= 0.02) set('battlePulkThresholdT', v);
            }}
            display={`${((config.battlePulkThresholdT ?? DEFAULT_CAMERA_CONFIG.battlePulkThresholdT) * 100).toFixed(1)}%`}
            tip="How close (as a fraction of a lap) ≥3 top-10 racers must be to trigger BATTLE. Scale-independent — same on every track. Lower = tighter duel, higher = fires more often. Fine-grained for the dense COMBO15 field: range 0.1%–2.0%, step 0.1%. Default 0.05 (5% of a lap) — above the slider max, so the thumb pins at 2.0% until you move it (the stored value is preserved)."
          />
          <SliderRow
            label="Isolation (lap %)"
            testId="battle-isolation-threshold-t"
            min={0}
            max={0.02}
            step={0.001}
            value={
              config.battleIsolationThresholdT ?? DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 0.02) set('battleIsolationThresholdT', v);
            }}
            display={`${((config.battleIsolationThresholdT ?? DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT) * 100).toFixed(1)}%`}
            tip="Reject a battle if any non-group racer is within this lap fraction of a group member. 0 = disabled. Recommendation ≈ 1.5 × Pulk Closeness. Fine-grained: range 0.0%–2.0%, step 0.1%. Ships disabled (default 0)."
          />
          <SliderRow
            label="Max. group size"
            testId="battle-max-group-size"
            min={3}
            max={6}
            step={1}
            value={config.battleMaxGroupSize ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupSize}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 3 && v <= 6) set('battleMaxGroupSize', v);
            }}
            display={`${config.battleMaxGroupSize ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupSize}`}
            tip="Maximum number of racers in the BATTLE group (3–6). Default 6."
          />
          <SliderRow
            label="Max. Rank-Span (Expansion)"
            testId="battle-max-group-rank-span"
            min={2}
            max={10}
            step={1}
            value={config.battleMaxGroupRankSpan ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupRankSpan}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 2 && v <= 10) set('battleMaxGroupRankSpan', v);
            }}
            display={`${config.battleMaxGroupRankSpan ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupRankSpan}`}
            tip="Maximum rank span (highest minus lowest rank) of the BATTLE group after greedy expansion. Default 5 → P3–P8 when seed is at P3. Prevents P3-to-P11 clusters."
          />
          <SliderRow
            label="Top-N Required (minimum rank)"
            testId="battle-min-top-n"
            min={3}
            max={20}
            step={1}
            value={config.battleMinTopN ?? DEFAULT_CAMERA_CONFIG.battleMinTopN}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 3 && v <= 20) set('battleMinTopN', v);
            }}
            display={`Top-${config.battleMinTopN ?? DEFAULT_CAMERA_CONFIG.battleMinTopN}`}
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
            value={config.battleWeight ?? DEFAULT_CAMERA_CONFIG.battleWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('battleWeight', v);
            }}
            display={(config.battleWeight ?? DEFAULT_CAMERA_CONFIG.battleWeight).toFixed(2)}
            tip="Selection weight for BATTLE_ZOOM in the candidate pool. Default 0.80."
          />
          <SliderRow
            label="LEAD_CHANGE weight"
            testId="regie-lead-change-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.leadChangeWeight ?? DEFAULT_CAMERA_CONFIG.leadChangeWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('leadChangeWeight', v);
            }}
            display={(config.leadChangeWeight ?? DEFAULT_CAMERA_CONFIG.leadChangeWeight).toFixed(2)}
            tip="Selection weight for LEAD_CHANGE in the candidate pool. Default 0.70."
          />
          <SliderRow
            label="COMEBACK weight"
            testId="regie-comeback-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.comebackWeight ?? DEFAULT_CAMERA_CONFIG.comebackWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('comebackWeight', v);
            }}
            display={(config.comebackWeight ?? DEFAULT_CAMERA_CONFIG.comebackWeight).toFixed(2)}
            tip="Selection weight for COMEBACK_ZOOM in the candidate pool. Default 0.60."
          />
          <SliderRow
            label="OVERVIEW weight"
            testId="regie-overview-weight"
            min={0}
            max={1}
            step={0.05}
            value={config.overviewWeight ?? DEFAULT_CAMERA_CONFIG.overviewWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1) set('overviewWeight', v);
            }}
            display={(config.overviewWeight ?? DEFAULT_CAMERA_CONFIG.overviewWeight).toFixed(2)}
            tip="Selection weight for OVERVIEW in the candidate pool. Default 0.30."
          />
          <SliderRow
            label="OVERVIEW cooldown (ms)"
            testId="regie-overview-cooldown-ms"
            min={5000}
            max={60000}
            step={1000}
            value={config.overviewCooldownMs ?? DEFAULT_CAMERA_CONFIG.overviewCooldownMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 5000 && v <= 60000) set('overviewCooldownMs', v);
            }}
            display={`${((config.overviewCooldownMs ?? DEFAULT_CAMERA_CONFIG.overviewCooldownMs) / 1000).toFixed(0)}s`}
            tip="Minimum pause after OVERVIEW before OVERVIEW may appear again. Default 15 s."
          />
          <SliderRow
            label="OVERVIEW target count"
            testId="regie-overview-target-count"
            min={1}
            max={5}
            step={1}
            value={config.overviewTargetCount ?? DEFAULT_CAMERA_CONFIG.overviewTargetCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= 5) set('overviewTargetCount', v);
            }}
            display={`${config.overviewTargetCount ?? DEFAULT_CAMERA_CONFIG.overviewTargetCount}`}
            tip="Target number of OVERVIEW cuts per race. Default 2."
          />
          <SliderRow
            label="OVERVIEW start delay (s)"
            testId="regie-overview-start-delay"
            min={5}
            max={30}
            step={1}
            value={config.overviewStartDelay ?? DEFAULT_CAMERA_CONFIG.overviewStartDelay}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 5 && v <= 30) set('overviewStartDelay', v);
            }}
            display={`${config.overviewStartDelay ?? DEFAULT_CAMERA_CONFIG.overviewStartDelay}s`}
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
            value={
              Math.round(
                (config.minDrawnFrameFrac ?? DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac) * 1000
              ) / 10
            }
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 0 && v <= 10) set('minDrawnFrameFrac', v / 100);
            }}
            display={
              (config.minDrawnFrameFrac ?? DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac) <= 0
                ? 'Off'
                : `${((config.minDrawnFrameFrac ?? DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac) * 100).toFixed(1)}%`
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
            value={config.referenceCorridorPx ?? DEFAULT_CAMERA_CONFIG.referenceCorridorPx}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 100 && v <= 600) set('referenceCorridorPx', v);
            }}
            display={`${config.referenceCorridorPx ?? DEFAULT_CAMERA_CONFIG.referenceCorridorPx} px`}
            tip="The width, in world pixels, that ONE corridor means for every camera setting. Every state's 'World in shot' number is measured in these, so changing this rescales EVERY shot on EVERY track at once — raise it and the whole game pulls back, lower it and everything moves in. It is what makes one number mean the same picture on a narrow track and a wide one. Default 300: the widest corridor drawn so far, so today every track is judged against the same yardstick. A track wider than this keeps its own width instead, so its corridor is never cropped."
          />
          <SliderRow
            label="Company: min racers in frame"
            testId="regie-min-racers-visible"
            min={0}
            max={12}
            step={1}
            // MIN-RACERS-5: reads the DEFAULTS rather than carrying a literal. The control the owner
            // uses to judge this number must not disagree with the number being judged — it said 3
            // while the default said 5, so an untouched slider showed a value the game was not using.
            value={config.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.minRacersVisible}
            onChange={(e) => set('minRacersVisible', parseInt(e.target.value, 10))}
            display={
              (config.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.minRacersVisible) <= 1
                ? 'Off'
                : `${config.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.minRacersVisible}`
            }
            tip="The DRAMATURGICAL guarantee — 'do not show emptiness'. At least this many racers stay in frame, counting the subject, so a tight LEADER shot never goes empty: leader alone, no reference, no tension. It is a LIMIT, not a correction — the camera does not zoom in and then back out, it simply does not go that far. 0 or 1 turns it off. Applies to the single-subject shots (LEADER, COMEBACK, OVERVIEW); BATTLE, LEAD_CHANGE and PHOTO_FINISH already guarantee their pair. Default 5: the owner's verdict, taken on a SPREAD field where the guarantee actually binds. The earlier measurement preferred 3, but it was taken on a PACK field where company is close by and the guarantee rarely does anything — see docs/CAMERA_DIRECTOR.md §8.1. It also decides when the finish overview stops widening for stragglers: that happens once the leader plus this many are home."
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
              value={
                config.cameraTransitionGrammar ?? DEFAULT_CAMERA_CONFIG.cameraTransitionGrammar
              }
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
            value={config.glideDurationMs ?? DEFAULT_CAMERA_CONFIG.glideDurationMs}
            onChange={(e) => set('glideDurationMs', parseInt(e.target.value, 10))}
            display={`${config.glideDurationMs ?? DEFAULT_CAMERA_CONFIG.glideDurationMs} ms`}
            tip="How long a Glide transition takes to ease pan+zoom from the old shot to the new subject's framing. Only used when Transition style = Glide. Range 300–900 ms. Default 500."
          />
          <SliderRow
            label="Leader forward-frame"
            testId="regie-leader-forward-frac"
            min={0.5}
            max={0.8}
            step={0.02}
            value={config.leaderForwardFrac ?? DEFAULT_CAMERA_CONFIG.leaderForwardFrac}
            onChange={(e) => set('leaderForwardFrac', parseFloat(e.target.value))}
            display={
              (config.leaderForwardFrac ?? DEFAULT_CAMERA_CONFIG.leaderForwardFrac) <= 0.5
                ? 'Centre'
                : (config.leaderForwardFrac ?? DEFAULT_CAMERA_CONFIG.leaderForwardFrac).toFixed(2)
            }
            tip="Where the leader sits along the motion axis. 0.50 = dead centre; 0.66 = about two-thirds forward toward the leading edge so most of the frame shows the pack behind (the action). Range 0.50–0.80. Default 0.66."
          />
          {/* ── AIM-ROOM-1 / ASPECT-CAP-1: the two candidates, OFF by default, live-switchable ── */}
          <SliderRow
            label="Aim room floor (px)  [candidate B]"
            testId="regie-leader-aim-room-floor"
            min={0}
            max={480}
            step={20}
            value={config.leaderAimRoomFloorPx ?? DEFAULT_CAMERA_CONFIG.leaderAimRoomFloorPx}
            onChange={(e) => set('leaderAimRoomFloorPx', parseInt(e.target.value, 10))}
            display={
              (config.leaderAimRoomFloorPx ?? DEFAULT_CAMERA_CONFIG.leaderAimRoomFloorPx) > 0
                ? `${config.leaderAimRoomFloorPx} px`
                : 'Off (shipped)'
            }
            tip="CANDIDATE B, off by default. Guarantees at least this many screen px of road AHEAD of the leader by easing him back toward centre — but only where the frame is short in his direction. Inert on shallow headings (river-run leaves 447 px already); binds on steep ones (space-sprint leaves 262). The cost is seeing less of the road ahead. Takes effect on the NEXT race. 0 = shipped behaviour."
          />
          <SliderRow
            label="Body aspect cap  [candidate A]"
            testId="regie-leader-body-aspect-max"
            min={0}
            max={4}
            step={0.1}
            value={config.leaderBodyAspectMax ?? 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              set('leaderBodyAspectMax', v > 0 ? v : null);
            }}
            display={
              config.leaderBodyAspectMax > 0
                ? `${config.leaderBodyAspectMax.toFixed(1)} : 1`
                : 'Off (shipped)'
            }
            tip="CANDIDATE A, off by default. Caps how many times longer than wide a racer may be drawn. Only rocket (2.88) and giraffe (2.83) exceed 2.5 — every other racer is untouched. The rocket is drawn SMALLER in both axes, not squashed. Takes effect on the NEXT race. 0 = shipped behaviour."
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
            value={config.leadChangeMinGap ?? DEFAULT_CAMERA_CONFIG.leadChangeMinGap}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.001 && v <= 0.01) set('leadChangeMinGap', v);
            }}
            display={(config.leadChangeMinGap ?? DEFAULT_CAMERA_CONFIG.leadChangeMinGap).toFixed(3)}
            tip="Minimum T-space gap between P1 and P2 for a stable lead reading. Default 0.002."
          />
          <SliderRow
            label="Debounce (ms)"
            testId="lead-change-debounce-ms"
            min={200}
            max={2000}
            step={50}
            value={config.leadChangeDebounceMs ?? DEFAULT_CAMERA_CONFIG.leadChangeDebounceMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 200 && v <= 2000) set('leadChangeDebounceMs', v);
            }}
            display={`${config.leadChangeDebounceMs ?? DEFAULT_CAMERA_CONFIG.leadChangeDebounceMs}ms`}
            tip="Duration in ms the new leader must hold before the change is confirmed. Default 800 ms."
          />
          <SliderRow
            label="Min. observation duration (s)"
            testId="lead-change-min-duration"
            min={1}
            max={5}
            step={0.5}
            value={config.leadChangeMinDuration ?? DEFAULT_CAMERA_CONFIG.leadChangeMinDuration}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 5) set('leadChangeMinDuration', v);
            }}
            display={`${(config.leadChangeMinDuration ?? DEFAULT_CAMERA_CONFIG.leadChangeMinDuration).toFixed(1)}s`}
            tip="Minimum time the camera stays on the new leader after LEAD_CHANGE entry. Default 1.5 s."
          />
          <SliderRow
            label="LEAD_CHANGE-Cooldown (ms)"
            testId="regie-lead-change-cooldown-ms"
            min={1000}
            max={30000}
            step={1000}
            value={config.leadChangeCooldownMs ?? DEFAULT_CAMERA_CONFIG.leadChangeCooldownMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1000 && v <= 30000) set('leadChangeCooldownMs', v);
            }}
            display={`${((config.leadChangeCooldownMs ?? DEFAULT_CAMERA_CONFIG.leadChangeCooldownMs) / 1000).toFixed(0)}s`}
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
            value={config.focalSmoothTc ?? DEFAULT_CAMERA_CONFIG.focalSmoothTc}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 0.2) set('focalSmoothTc', v);
            }}
            display={
              (config.focalSmoothTc ?? DEFAULT_CAMERA_CONFIG.focalSmoothTc) > 0
                ? `${Math.round((config.focalSmoothTc ?? DEFAULT_CAMERA_CONFIG.focalSmoothTc) * 1000)}ms`
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
            value={
              config.comebackMinPositionsGained ?? DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained
            }
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 2 && v <= 10) set('comebackMinPositionsGained', v);
            }}
            display={`${config.comebackMinPositionsGained ?? DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained}`}
            tip="Minimum positions gained within the time window to trigger COMEBACK. Default 2."
          />
          <SliderRow
            label="Time window (s)"
            testId="comeback-window-sec"
            min={1}
            max={10}
            step={0.5}
            value={config.comebackWindowSec ?? DEFAULT_CAMERA_CONFIG.comebackWindowSec}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 10) set('comebackWindowSec', v);
            }}
            display={`${(config.comebackWindowSec ?? DEFAULT_CAMERA_CONFIG.comebackWindowSec).toFixed(1)}s`}
            tip="Look-back window for rank history. Positions gained = rank N seconds ago minus current rank. Default 4 s."
          />
          <SliderRow
            label="Min. observation duration (s)"
            testId="comeback-min-duration"
            min={1}
            max={5}
            step={0.5}
            value={config.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1 && v <= 5) set('comebackMinDuration', v);
            }}
            display={`${(config.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration).toFixed(1)}s`}
            tip="Minimum duration after COMEBACK entry on the comeback racer. Default 3 s."
          />
          <SliderRow
            label="COMEBACK-Cooldown (ms)"
            testId="regie-comeback-cooldown-ms"
            min={1000}
            max={30000}
            step={1000}
            value={config.comebackCooldownMs ?? DEFAULT_CAMERA_CONFIG.comebackCooldownMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1000 && v <= 30000) set('comebackCooldownMs', v);
            }}
            display={`${((config.comebackCooldownMs ?? DEFAULT_CAMERA_CONFIG.comebackCooldownMs) / 1000).toFixed(0)}s`}
            tip="Minimum pause after COMEBACK before re-triggering is possible. Default 10 s."
          />
          <SliderRow
            label="Outcome phase threshold"
            testId="comeback-outcome-phase-threshold"
            min={0.5}
            max={0.95}
            step={0.05}
            value={config.outcomePhaseThreshold ?? DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.5 && v <= 0.95) set('outcomePhaseThreshold', v);
            }}
            display={`${((config.outcomePhaseThreshold ?? DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold) * 100).toFixed(0)}%`}
            tip={`Leader progress from which COMEBACK is considered active internally (independent of the external isOutcomePhase flag). Default ${(DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold * 100).toFixed(0)}%.`}
          />
          <SliderRow
            label="Min. starting gap"
            testId="comeback-min-start-gap"
            min={0.1}
            max={0.9}
            step={0.05}
            // FALLBACK-MIRRORS-1: read the default rather than copy it. This slider and the one
            // below carried 0.4 and 0.1, the same two wrong numbers as the engine's own fallbacks —
            // so the two files corroborated each other instead of disagreeing, which is how the
            // drift survived. `config` is loader-resolved here, so neither `??` ever fired and the
            // sliders always showed the real value; the literals were wrong text, not a wrong UI.
            value={config.comebackMinStartGap ?? DEFAULT_CAMERA_CONFIG.comebackMinStartGap}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.1 && v <= 0.9) set('comebackMinStartGap', v);
            }}
            display={`${((config.comebackMinStartGap ?? DEFAULT_CAMERA_CONFIG.comebackMinStartGap) * 100).toFixed(0)}%`}
            tip="The racer must have had at least this normalised gap to P1 at the start of the observation window (field fraction). 0.25 = must have been in the back 75% of the field. Default 25%."
          />
          <SliderRow
            label="Max. current rank (lead-group filter)"
            testId="comeback-max-current-rank-pct"
            min={0.05}
            max={0.5}
            step={0.05}
            value={
              config.comebackMaxCurrentRankPct ?? DEFAULT_CAMERA_CONFIG.comebackMaxCurrentRankPct
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.05 && v <= 0.5) set('comebackMaxCurrentRankPct', v);
            }}
            display={`${((config.comebackMaxCurrentRankPct ?? DEFAULT_CAMERA_CONFIG.comebackMaxCurrentRankPct) * 100).toFixed(0)}%`}
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
            value={config.battleSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFactor}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.2 && v <= 1.0) set('battleSlowmoFactor', v);
            }}
            display={(
              config.battleSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFactor
            ).toFixed(2)}
            tip="Physics speed during BATTLE_ZOOM. 1.0 = normal, 0.5 = half speed. Default 0.5."
          />
          <SliderRow
            label="Min. duration (s)"
            testId="battle-slowmo-min-duration"
            min={1.0}
            max={5.0}
            step={0.5}
            value={config.battleSlowmoMinDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoMinDuration}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 1.0 && v <= 5.0) set('battleSlowmoMinDuration', v);
            }}
            display={`${(config.battleSlowmoMinDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoMinDuration).toFixed(1)}s`}
            tip="Minimum duration of the slowmo effect after BATTLE_ZOOM ends. Default 2.0s."
          />
          <SliderRow
            label="Fade duration (s)"
            testId="battle-slowmo-fade-duration"
            min={0.0}
            max={1.0}
            step={0.05}
            value={
              config.battleSlowmoFadeDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFadeDuration
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.0 && v <= 1.0) set('battleSlowmoFadeDuration', v);
            }}
            display={`${(config.battleSlowmoFadeDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFadeDuration).toFixed(2)}s`}
            tip="Duration of slowmo effect fade-in and fade-out. 0 = instant switch. Default 0.3s."
          />
          <SliderRow
            label="Focus darkening"
            testId="battle-focus-darkening"
            min={0.0}
            max={1.0}
            step={0.05}
            value={config.battleFocusDarkening ?? DEFAULT_CAMERA_CONFIG.battleFocusDarkening}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.0 && v <= 1.0) set('battleFocusDarkening', v);
            }}
            display={(
              config.battleFocusDarkening ?? DEFAULT_CAMERA_CONFIG.battleFocusDarkening
            ).toFixed(2)}
            tip="Dimming of non-BATTLE racers. 0 = no effect, 1 = completely black. Default 0.4."
          />
        </div>
      </div>

      {/* ── 7. Endgame ── */}
      <div className={s.card}>
        <SectionHeading>7 · Endgame</SectionHeading>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.6rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="run-in-shot"
            checked={config.runInShot ?? DEFAULT_CAMERA_CONFIG.runInShot}
            onChange={(e) => set('runInShot', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Frame the finish through the run-in</span>
          <InfoTooltip text="On (default): once the finish line can be framed without opening wider than the OVERVIEW shot, the camera keeps it in frame until the first racer crosses — opening only as far as the line needs and tightening by itself as the leader closes. It does not change WHICH shot is running; it bounds whatever shot is, and never tightens past that shot's own zoom. While it composes, the leader is centred rather than framed forward, because the thing worth seeing is now ahead of him. Off is the pre-2026-08-12 behaviour." />
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.6rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="contention-watch"
            checked={config.contentionWatch ?? DEFAULT_CAMERA_CONFIG.contentionWatch}
            onChange={(e) => set('contentionWatch', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Drop racers who can no longer win</span>
          <InfoTooltip text="Off (default) is today's behaviour. On: from the endgame threshold the camera keeps asking whether each racer can still WIN — from the gap and the speed difference visible on track, never from the race plan — and eases the framing off anyone the race has decided, over the run-in's own opening span. The verdict is one-way, so a racer cannot flicker in and out. It is what stops the shot being anchored on a racer who finished fifth, a second down." />
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.6rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="band-floor"
            checked={config.bandFloor ?? DEFAULT_CAMERA_CONFIG.bandFloor}
            onChange={(e) => set('bandFloor', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>
            Hold the finish line in the subject&apos;s own region
          </span>
          <InfoTooltip text="Off (default) is today's behaviour: the endgame's width floor keeps the finish inside the COMPANY margin, the region a companion may sit near the edge of. On: it keeps the finish inside the SUBJECT's region instead, which is tighter and therefore asks for a wider shot — measured, that is what puts the band back on screen where it was leaving it. It costs width, so it trades against 'never open as wide as today'." />
        </label>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Endgame Focus Threshold
              <InfoTooltip
                text={`From this leader-progress value the camera locks to LEADER_ZOOM (except during LEAD_CHANGE), and it is also where the run-in framing above begins. Currently: ${((config.endgameThreshold ?? DEFAULT_CAMERA_CONFIG.endgameThreshold) * 100).toFixed(0)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.5}
              max={1.0}
              // RUNIN-AHEAD-1: 1% steps, not 5%. The owner settled the run-in's shape at 0.95 and is
              // tuning around it; a 5% step cannot express 0.93 or 0.96 at all, so the control was
              // coarser than the decision it exists for. Range and clamping are unchanged — the
              // guard below still refuses anything outside 0.5–1.0.
              step={0.01}
              value={config.endgameThreshold ?? DEFAULT_CAMERA_CONFIG.endgameThreshold}
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
          The controls below are in the order the phases happen. <strong>1</strong> and{' '}
          <strong>2</strong> are measured from the FIRST crossing; <strong>3</strong>,{' '}
          <strong>4</strong> and <strong>5</strong> from the LAST. The winner card is a tenant of{' '}
          <strong>4</strong> and can never lengthen the ending.
        </p>
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
            data-testid="ending-keeps-finish-shot"
            checked={config.endingKeepsFinishShot ?? DEFAULT_CAMERA_CONFIG.endingKeepsFinishShot}
            onChange={(e) => set('endingKeepsFinishShot', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>The ending keeps the finish shot</span>
          <InfoTooltip text="On (default): the camera director keeps composing while the ending runs, so phases 3-4 hold the settled finish picture. Off: the pre-2026-08-12 behaviour — the transform is replaced by zoom 1 / offset 0 the moment the last racer crosses, which on a closed track shrinks the whole world into the canvas and on an open track shows an 853x480 window at world (0,0) with no racers in it at all." />
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
            marginBottom: '0.75rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="finished-splash-enabled"
            checked={config.finishedSplashEnabled ?? DEFAULT_CAMERA_CONFIG.finishedSplashEnabled}
            onChange={(e) => set('finishedSplashEnabled', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Show the old &quot;RACE FINISHED!&quot; splash</span>
          <InfoTooltip text="Off (default). On: restores the pre-2026-08-12 full-canvas black scrim with RACE FINISHED! and 'Loading results…', drawn over every frame of the ending. It is off because nothing is loading — the results are written on the same frame it appeared — and because it covered the winner card, the held picture and the podium build-up alike." />
        </label>
        {/* ENDING-HOLD-1: the total, computed by the SAME function the race screen's timers are
            built from (endingSchedule.js), so this read-out and the behaviour cannot disagree.
            It was previously a number a reader had to add up by hand from four sliders in two
            cards. Read-only on purpose — every term has its own control below. */}
        <p
          data-testid="ending-total"
          style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
        >
          <strong>From the last crossing to a settled result screen:</strong>{' '}
          {endingTotalMs({
            holdMs: config.finishHoldAfterLastMs ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs,
            pauseMs: config.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs,
            podiumBeatMs: config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs,
            transitionMs: SCREEN_TRANSITION_MS,
          })}
          {' ms'} — hold{' '}
          {config.finishHoldAfterLastMs ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs} + pause{' '}
          {config.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs} + screen transition{' '}
          {SCREEN_TRANSITION_MS} + podium 4×
          {config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs}. Phases 1 and 2
          are not in this total: they happen before the last racer is home.
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              1 · Hold on the winner, before the zoom-out (ms)
              <InfoTooltip
                text={`THE FIRST PHASE OF THE ENDING, and it is measured from the FIRST crossing, not the last. RELABELLED 2026-08-12: this control read "Finish pause (ms)" while writing finishDramaDurationMs, so it collided with phase 4 below, which really is the pause — two different keys reading as the same control, one of them by the other's name. How long the camera HOLDS before the zoom-out to the finish overview begins. It applies to both endings and it is the same dial for both: after an ordinary finish it holds on the winner from the moment he crosses; after a PHOTO FINISH it holds the pair shot from the moment BOTH contenders are home — not merely when two racers have crossed, since the second across is often neither of them. 0 means no pause at all: the zoom-out starts on the same frame, with no held shot. Currently: ${config.finishDramaDurationMs ?? DEFAULT_CAMERA_CONFIG.finishDramaDurationMs}ms.`}
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
              value={config.finishDramaDurationMs ?? DEFAULT_CAMERA_CONFIG.finishDramaDurationMs}
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
              2 · Zoom-out duration (ms)
              <InfoTooltip
                text={`Target duration for the smooth zoom-out to OVERVIEW level after the drama pulse. Currently: ${config.finishOverviewZoomOutDurationMs ?? DEFAULT_CAMERA_CONFIG.finishOverviewZoomOutDurationMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={500}
              max={8000}
              step={250}
              value={
                config.finishOverviewZoomOutDurationMs ??
                DEFAULT_CAMERA_CONFIG.finishOverviewZoomOutDurationMs
              }
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
              Run-in opening (ms)
              <InfoTooltip
                text={`How long the camera takes to open the shot when the run-in begins, BEFORE the crossing. Its own control: it used to share the zoom-out duration above, which meant tuning either moved the other. Faster shows the finish line sooner; slower is calmer but the camera trails its subject more while it moves. Currently: ${config.runInOpenMs ?? DEFAULT_CAMERA_CONFIG.runInOpenMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={6000}
              step={250}
              value={config.runInOpenMs ?? DEFAULT_CAMERA_CONFIG.runInOpenMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 6000) set('runInOpenMs', v);
              }}
            />
          </div>
          {/* CONTENDER-ZOOM-1 shipped default ON and had NO control until DOC-AUDIT-1. It gates the
              framed SET and the lane cap together — one key, two mechanisms — which is exactly why
              the owner needs a switch: the arrival slider below can only pace the cap, it cannot
              answer whether the pair or the set is the right shot. */}
          <label
            className={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <input
              type="checkbox"
              checked={config.contenderZoom ?? DEFAULT_CAMERA_CONFIG.contenderZoom}
              onChange={(e) => set('contenderZoom', e.target.checked)}
              data-testid="contender-zoom-toggle"
            />
            Photo finish frames everyone still abreast
            <InfoTooltip
              text={`ON: the photo-finish shot is sized to every racer who is still ABREAST — nearly level with the leader AND on a free lane, both conditions, no new threshold. The set is captured once at entry and is 2, 3 or 4 racers in practice. OFF: the shot frames the top two only, which is what shipped before 2026-08-14. This key also gates the lane cap (never wider than the road); the slider below paces that cap but cannot switch it. Currently: ${(config.contenderZoom ?? DEFAULT_CAMERA_CONFIG.contenderZoom) ? 'ON' : 'OFF'}.`}
            />
          </label>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Lane-cap arrival (ms)
              <InfoTooltip
                text={`How long the shot takes to accept the lane-width limit once the photo finish begins. The limit itself is not new — the shot is never wider than the road — but its SCOPE is the photo-finish state, and a state change is instant, so it used to appear in a single frame and take the target from 2.47 to 10.02. That jump is what read as the camera leaping. Spreading it over this duration turns the same limit into a move. 0 restores the jump. Currently: ${config.corridorCapArriveMs ?? DEFAULT_CAMERA_CONFIG.corridorCapArriveMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={5000}
              step={250}
              value={config.corridorCapArriveMs ?? DEFAULT_CAMERA_CONFIG.corridorCapArriveMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 5000) set('corridorCapArriveMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              3 · Hold on the finish picture, after the LAST crossing (ms)
              <InfoTooltip
                text={`Extra time on the settled finish shot AFTER the LAST racer is home, before the pause below starts. The two ADD. What actually grows is the CARD-FREE tail: the winner card is capped at min(card, pause) and does not inherit this, so at the shipped numbers the picture stands card-free for 500ms + this. It buys a longer look at a SETTLED picture and cannot put arrivals back — the zoom-out starts when the FIRST finishers are home (phase 1 above), so by the last crossing the pull-back is long over. ZERO means no hold at all and schedules no timer. Currently: ${config.finishHoldAfterLastMs ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={10000}
              step={250}
              value={config.finishHoldAfterLastMs ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('finishHoldAfterLastMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              4 · Pause before the result screen (ms)
              <InfoTooltip
                text={`THE SECOND PHASE OF THE ENDING, and the room the winner card is a tenant of. It starts when the hold above ends and runs until the screen changes. Relabelled from "Pause before leaderboard": it sat beside a "hold after the last finisher" and the two read as the same thing — this one is the pause BEFORE THE SCREEN CHANGES, that one is time on the RACE PICTURE. Currently: ${config.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={10000}
              step={250}
              value={config.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('finishPauseMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              5 · Podium build-up beat (ms)
              <InfoTooltip
                text={`ONE beat, and the whole result screen is built from multiples of it: 3rd place, then 2nd a beat later, then the WINNER a beat after that — held for TWO beats, because that is the moment — and then the ranking and everything below it settle in. Total = four beats. ZERO SWITCHES IT OFF: the screen appears complete and instantly, exactly as it did before. A click or any key completes it early, and a system asking for reduced motion never starts it. Currently: ${config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs}ms (total ${4 * (config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs)}ms).`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={3000}
              step={50}
              value={config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 3000) set('podiumRevealBeatMs', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Winner card (ms) — a tenant of 4, never its own phase
              <InfoTooltip
                text={`The counterpart to the opening's brand card: at the end of the race a card in the lower-left names the winner — his race number, his name, his colour — in the brand's accent where a brand is chosen. IT LIVES INSIDE THE PAUSE ABOVE AND CANNOT MAKE THE ENDING LONGER: the card gets min(this, pause), so setting the pause to 0 removes the card whatever this says, and raising this past the pause buys nothing — the pause is the lever for a longer read. ZERO MEANS NO CARD AT ALL. Currently: ${config.winnerCardMs ?? DEFAULT_CAMERA_CONFIG.winnerCardMs}ms, of which ${Math.min(config.winnerCardMs ?? DEFAULT_CAMERA_CONFIG.winnerCardMs, config.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs)}ms fits in the pause.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={10000}
              step={100}
              value={config.winnerCardMs ?? DEFAULT_CAMERA_CONFIG.winnerCardMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 10000) set('winnerCardMs', v);
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
            value={
              config.finishOverviewLookbackPx ?? DEFAULT_CAMERA_CONFIG.finishOverviewLookbackPx
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0 && v <= 1000) set('finishOverviewLookbackPx', v);
            }}
            display={String(
              config.finishOverviewLookbackPx ?? DEFAULT_CAMERA_CONFIG.finishOverviewLookbackPx
            )}
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
            checked={config.photoFinishEnabled ?? DEFAULT_CAMERA_CONFIG.photoFinishEnabled}
            onChange={(e) => set('photoFinishEnabled', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Enable photo-finish shot</span>
          <InfoTooltip text="When off, a close finish uses the classic single-winner drama pulse (today's behaviour)." />
        </label>
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
            data-testid="photo-finish-contender-framing"
            checked={
              config.photoFinishContenderFraming ??
              DEFAULT_CAMERA_CONFIG.photoFinishContenderFraming
            }
            onChange={(e) => set('photoFinishContenderFraming', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Frame the shot&apos;s own contenders</span>
          <InfoTooltip text="On (default): the shot keeps the two racers it started on in frame. Off: it keeps whoever is top-2 right now — which after the line means already-finished racers coasting past each other, and the picture lurches every time they swap. Off is the pre-2026-08-11 behaviour." />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SliderRow
            label="Lead-progress gate"
            testId="photo-finish-lead-progress"
            min={0.85}
            max={0.999}
            step={0.001}
            value={config.photoFinishLeadProgress ?? DEFAULT_CAMERA_CONFIG.photoFinishLeadProgress}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.85 && v <= 0.999) set('photoFinishLeadProgress', v);
            }}
            display={(
              config.photoFinishLeadProgress ?? DEFAULT_CAMERA_CONFIG.photoFinishLeadProgress
            ).toFixed(3)}
            tip="Predictive gate: leader progress (fraction of the finish, 0–1) at which the one-shot close-check fires BEFORE the line. Higher = later/closer to the line. Default 0.97."
          />
          <SliderRow
            label="Closeness threshold (t)"
            testId="photo-finish-threshold"
            min={0.005}
            max={0.15}
            step={0.005}
            value={
              config.photoFinishCloseThresholdT ?? DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.005 && v <= 0.15) set('photoFinishCloseThresholdT', v);
            }}
            display={(
              config.photoFinishCloseThresholdT ?? DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT
            ).toFixed(3)}
            tip="Max lap-normalised t-gap between the top-2 finishers to trigger the photo-finish shot (same unit family as the BATTLE temporal threshold). Larger = triggers more often. Default 0.03."
          />
          <SliderRow
            label="Slowmo factor"
            testId="photo-finish-slowmo-factor"
            min={0.1}
            max={1.0}
            step={0.05}
            value={config.photoFinishSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.photoFinishSlowmoFactor}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 0.1 && v <= 1.0) set('photoFinishSlowmoFactor', v);
            }}
            display={(
              config.photoFinishSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.photoFinishSlowmoFactor
            ).toFixed(2)}
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
                text={`Entry→Tracking when zoom delta falls below this value. Currently: ${config.entryConvergenceZoom ?? DEFAULT_CAMERA_CONFIG.entryConvergenceZoom}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.001}
              max={0.5}
              step={0.005}
              value={config.entryConvergenceZoom ?? DEFAULT_CAMERA_CONFIG.entryConvergenceZoom}
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
                text={`Entry→Tracking when offset delta falls below this pixel value. Currently: ${config.entryConvergencePx ?? DEFAULT_CAMERA_CONFIG.entryConvergencePx}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={100}
              step={1}
              value={config.entryConvergencePx ?? DEFAULT_CAMERA_CONFIG.entryConvergencePx}
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
                text={`Entry→Tracking when |camT − targetT| falls below this value (track-parameter units). Steady-state gap ≈ 0.026; threshold must be above that. Currently: ${(config.transitionTConvergence ?? DEFAULT_CAMERA_CONFIG.transitionTConvergence).toFixed(3)}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.005}
              max={0.2}
              step={0.005}
              value={config.transitionTConvergence ?? DEFAULT_CAMERA_CONFIG.transitionTConvergence}
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
              checked={config.stateOverlayEnabled ?? DEFAULT_CAMERA_CONFIG.stateOverlayEnabled}
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
              value={config.stateOverlayDurationMs ?? DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs}
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
