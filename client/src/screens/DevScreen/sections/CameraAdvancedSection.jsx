// ============================================================
// File:        CameraAdvancedSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx
// Project:     RaceArena
// Created:     2026-05-24
// Description: Unified camera tuning UI — all controls merged and ordered
//              by race timeline (Start → MID → Endgame → Finish → Profiles).
//              DEVSCREEN-CHAPTERS-1: rendered as PARTS — the camera chapter's sub-groups,
//              plus the drawing floor, track labels and overlay texts (placed in Look) and the
//              diagnostics switches and logs (placed in Diagnostics). One config, one setter.
// ============================================================

import {
  // MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
  DEFAULT_CAMERA_CONFIG,
  loadCameraConfig,
  saveCameraConfig,
} from '../../../modules/cameraConfig.js';
import { Ctl, Info } from './ControlInfo.jsx';
import { useTestAids, TEST_AID_CAMERA_KEYS } from '../../../modules/testAids.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { useSyncedConfig } from './useSyncedConfig.js';
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

// The comeback state has no inner-frame or minimum-hold field: neither reaches its camera — the
// frame is global and the hold is `comebackMinDuration` (COMEBACK-SETTINGS-SURVEY-1).
const STATES_EXCEPT_COMEBACK = CAM_STATES_FOR_PROFILES.filter((st) => st !== 'COMEBACK_ZOOM');

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
  },
  {
    key: 'trackingTC',
    label: 'Tracking TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
  },
  {
    key: 'entryTC',
    label: 'Entry TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
  },
  {
    key: 'leadInDuration',
    label: 'Lead-in duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: 'leadOutDuration',
    label: 'Lead-out duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: 'innerFramePct',
    label: 'Inner frame %',
    onlyFor: STATES_EXCEPT_COMEBACK,
    min: 0.3,
    max: 1,
    step: 0.05,
  },
  {
    key: 'maxStateDuration',
    label: 'Max state duration (ms)',
    min: 1000,
    // The largest shipped `maxStateDuration` (COMEBACK_ZOOM's since COMEBACK-HOLD-2, `defaults.js`)
    // must fit: a max below a shipped value would clamp it the moment the card opens
    // (check-config-keys RULE C).
    max: 20000,
    step: 500,
  },
  {
    key: 'minStateHold',
    label: 'Min state hold (ms)',
    onlyFor: STATES_EXCEPT_COMEBACK,
    min: 1000,
    max: 10000,
    step: 500,
  },
  {
    key: 'maxEntryDurationMs',
    label: 'Max entry duration (ms)',
    min: 500,
    max: 30000,
    step: 500,
  },
  {
    key: 'leadAheadEnabled',
    label: 'Lead-Ahead active',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
  },
  {
    key: 'leadOutEnabled',
    label: 'Lead-Out active',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
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
        <Ctl id="CameraAdvancedSection:resetProfileState" style={{ marginLeft: 'auto' }}>
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
            }}
          >
            Reset state
          </button>
        </Ctl>
      </summary>
      <div className={s.formGrid} style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
        {PROFILE_FIELDS.filter(
          ({ onlyFor }) =>
            !onlyFor ||
            (Array.isArray(onlyFor) ? onlyFor.includes(stateName) : onlyFor === stateName)
        ).map(({ key, label, min, max, step, type }) => {
          const val = profile[key] ?? defaults[key];
          return (
            <div key={key} className={s.formGroup} data-control-id={`CameraAdvancedSection:${key}`}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {label}
                <Info id={`CameraAdvancedSection:${key}`} />
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

function SliderRow({ label, testId, min, max, step, value, onChange, display, controlId }) {
  return (
    <label
      data-control-id={controlId}
      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
    >
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
      <Info id={controlId} />
    </label>
  );
}

// ── Diagnostics switches, in the design's order (DEVSCREEN-CHAPTERS-1) ─────────────────────────
// On-screen overlays first, then the logs written out afterwards. Their info texts live in
// controlInfo.js under "CameraAdvancedSection:<key>".

const ON_SCREEN_DIAGNOSTICS = [
  { key: 'showCameraStateHud', testId: 'cam-hud-toggle', label: 'Show camera state HUD' },
  {
    key: 'showCameraDiagnostics',
    testId: 'cam-diagnostics-toggle',
    label: 'Show camera diagnostics',
  },
  { key: 'showRpDiag', testId: 'rp-diag-toggle', label: 'Show Race Plan diagnostics' },
  { key: 'showRpWinnerList', testId: 'rp-winner-list-toggle', label: 'Show B1 Winner List' },
  { key: 'showRpMinimapBadges', testId: 'rp-minimap-badges-toggle', label: 'Show Minimap Badges' },
  { key: 'showRpStartRow', testId: 'rp-startrow-toggle', label: 'Show Start-Row in Name Tags' },
  {
    key: 'showTop10SpeedMonitor',
    testId: 'top10-speed-monitor-toggle',
    label: 'Show Top-10 Speed Monitor',
  },
  { key: 'showBattleDiag', testId: 'battle-diag-toggle', label: 'Show BATTLE diagnostics' },
  {
    key: 'showLeadChangeDiag',
    testId: 'lead-change-diag-toggle',
    label: 'Show LEAD_CHANGE diagnostics',
  },
  { key: 'showComebackDiag', testId: 'comeback-diag-toggle', label: 'Show COMEBACK diagnostics' },
  { key: 'showGovernorDiag', testId: 'governor-diag-toggle', label: 'Show GOVERNOR diagnostics' },
];

const LOG_TOGGLES = [
  { key: 'enableFrameLog', testId: 'cam-frame-log-toggle', label: 'Enable frame log' },
  {
    key: 'cameraDetourLog',
    testId: 'cam-detour-log-toggle',
    label: 'Enable detour frame log (CAMERA-DETOUR-1)',
  },
  { key: 'enablePerfLog', testId: 'perf-log-toggle', label: 'Enable perf log' },
];

// ── Main component ────────────────────────────────────────────────────────────

function CameraAdvancedSection({ part }) {
  // Kept in step with every other mounted camera part (useSyncedConfig).
  const [config, setConfig] = useSyncedConfig(
    KEYS.CAMERA_CONFIG,
    loadCameraConfig,
    saveCameraConfig
  );

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
  // Which parts this mount shows (DEVSCREEN-CHAPTERS-1); without `part` it shows them all, in the
  // order of the camera chapter, then the parts placed in Look and in Diagnostics.
  const show = (name) => !part || part === name;
  // TEST-AIDS-1: while the test-aids switch is OFF the diagnostic switches below are locked — exactly
  // the keys the race forces off (`TEST_AID_CAMERA_KEYS`), so the camera-state pill (item 5), which
  // is not on the switch, stays free.
  const aids = useTestAids();

  // One diagnostics switch: a checkbox over a camera-config key, its id and its info icon.
  function renderDiagToggle({ key, testId, label }) {
    return (
      <label
        key={key}
        data-control-id={`CameraAdvancedSection:${key}`}
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
          disabled={!aids && TEST_AID_CAMERA_KEYS.includes(key)}
          onChange={(e) => set(key, e.target.checked)}
        />
        <span>{label}</span>
        <Info id={`CameraAdvancedSection:${key}`} />
      </label>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {show('framing') && (
        <>
          {/* ── Framing — all race long ── */}
          <div className={s.card}>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-muted)',
                margin: '0.75rem 0 0.4rem',
              }}
            >
              <strong>Transition grammar</strong> — how the camera changes shots (CAMERA-GRAMMAR-1).
              Glide eases pan+zoom together; Cut snaps them. Forward-framing places the leader ahead
              in frame so the pack behind (the action) is visible.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                controlId="CameraAdvancedSection:referenceCorridorPx"
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
                controlId="CameraAdvancedSection:minRacersVisible"
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.88rem',
                }}
                data-control-id="CameraAdvancedSection:cameraTransitionGrammar"
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
                <Info id="CameraAdvancedSection:cameraTransitionGrammar" />
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
                controlId="CameraAdvancedSection:glideDurationMs"
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
                    : (config.leaderForwardFrac ?? DEFAULT_CAMERA_CONFIG.leaderForwardFrac).toFixed(
                        2
                      )
                }
                controlId="CameraAdvancedSection:leaderForwardFrac"
              />
              {/* ── AIM-ROOM-1: SHIPPED at 360 px since 2026-09-02. The key stays so it is revertible. ── */}
              <SliderRow
                label="Aim room floor (px)"
                testId="regie-leader-aim-room-floor"
                min={0}
                max={480}
                step={20}
                value={config.leaderAimRoomFloorPx ?? DEFAULT_CAMERA_CONFIG.leaderAimRoomFloorPx}
                onChange={(e) => set('leaderAimRoomFloorPx', parseInt(e.target.value, 10))}
                display={
                  (config.leaderAimRoomFloorPx ?? DEFAULT_CAMERA_CONFIG.leaderAimRoomFloorPx) > 0
                    ? `${config.leaderAimRoomFloorPx ?? DEFAULT_CAMERA_CONFIG.leaderAimRoomFloorPx} px`
                    : 'Off (pre-2026-09-02 behaviour)'
                }
                controlId="CameraAdvancedSection:leaderAimRoomFloorPx"
              />
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
                controlId="CameraAdvancedSection:focalSmoothTc"
              />
            </div>
          </div>
        </>
      )}
      {show('shot') && (
        <>
          {/* ── Choosing the shot — the director weights and OVERVIEW ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
              Each weight is the accept probability for that one event on the offer — a per-offer
              coin flip on a single candidate, not a share of a pool. A declined offer falls through
              to LEADER. Every offered event goes through this check, including the endgame&apos;s
              LEAD_CHANGE exception. Eligibility (whether an event is offered at all) decides most
              selections; a weight moves the outcome only among the offers that fire.
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
                controlId="CameraAdvancedSection:battleWeight"
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
                display={(
                  config.leadChangeWeight ?? DEFAULT_CAMERA_CONFIG.leadChangeWeight
                ).toFixed(2)}
                controlId="CameraAdvancedSection:leadChangeWeight"
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
                controlId="CameraAdvancedSection:comebackWeight"
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
                controlId="CameraAdvancedSection:overviewWeight"
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
                controlId="CameraAdvancedSection:overviewCooldownMs"
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
                controlId="CameraAdvancedSection:overviewTargetCount"
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
                controlId="CameraAdvancedSection:overviewStartDelay"
              />
            </div>
          </div>
        </>
      )}
      {show('start') && (
        <>
          {/* ── Start — the ceremony beats in the order they play, then the start window ── */}
          <div className={s.card}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.6rem',
              }}
              data-control-id="CameraAdvancedSection:ceremonySkipOnClick"
            >
              <input
                type="checkbox"
                data-testid="ceremony-skip-on-click"
                checked={config.ceremonySkipOnClick ?? DEFAULT_CAMERA_CONFIG.ceremonySkipOnClick}
                onChange={(e) => set('ceremonySkipOnClick', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Click to end the current start beat</span>
              <Info id="CameraAdvancedSection:ceremonySkipOnClick" />
            </label>
            <div className={s.formGrid}>
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:ceremonyBrandMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  1 · Brand screen (ms)
                  <Info id="CameraAdvancedSection:ceremonyBrandMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:ceremonyVenueMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  2 · Track overview (ms)
                  <Info id="CameraAdvancedSection:ceremonyVenueMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:ceremonyPushMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  · Push-in travel (ms)
                  <Info id="CameraAdvancedSection:ceremonyPushMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:ceremonyEasing">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Push Easing
                  <Info id="CameraAdvancedSection:ceremonyEasing" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:startBoardFloorMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  3 · Starters board — floor (ms)
                  <Info id="CameraAdvancedSection:startBoardFloorMs" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:startBoardMsPerName"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  3 · Starters board — per name (ms)
                  <Info id="CameraAdvancedSection:startBoardMsPerName" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:ceremonySettledMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  4 · Starting formation (ms)
                  <Info id="CameraAdvancedSection:ceremonySettledMs" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:countdownDigitsMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  5 · Countdown digits (ms)
                  <Info id="CameraAdvancedSection:countdownDigitsMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:startWindowMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Start Window (ms)
                  <Info id="CameraAdvancedSection:startWindowMs" />
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
            </div>
          </div>
        </>
      )}
      {show('battles') && (
        <>
          {/* ── Middle — battles: the trigger, the hold, the slow motion ── */}
          <div className={s.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                controlId="CameraAdvancedSection:battlePulkThresholdT"
              />
              <SliderRow
                label="Isolation (lap %)"
                testId="battle-isolation-threshold-t"
                min={0}
                max={0.02}
                step={0.001}
                value={
                  config.battleIsolationThresholdT ??
                  DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0 && v <= 0.02) set('battleIsolationThresholdT', v);
                }}
                display={`${((config.battleIsolationThresholdT ?? DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT) * 100).toFixed(1)}%`}
                controlId="CameraAdvancedSection:battleIsolationThresholdT"
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
                controlId="CameraAdvancedSection:battleMaxGroupSize"
              />
              <SliderRow
                label="Max. Rank-Span (Expansion)"
                testId="battle-max-group-rank-span"
                min={2}
                max={10}
                step={1}
                value={
                  config.battleMaxGroupRankSpan ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupRankSpan
                }
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 2 && v <= 10) set('battleMaxGroupRankSpan', v);
                }}
                display={`${config.battleMaxGroupRankSpan ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupRankSpan}`}
                controlId="CameraAdvancedSection:battleMaxGroupRankSpan"
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
                controlId="CameraAdvancedSection:battleMinTopN"
              />
            </div>
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:battleMinDurationMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  BATTLE Min Hold (ms)
                  <Info id="CameraAdvancedSection:battleMinDurationMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:battleCooldownMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  BATTLE Cooldown (ms)
                  <Info id="CameraAdvancedSection:battleCooldownMs" />
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
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
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
                controlId="CameraAdvancedSection:battleSlowmoFactor"
              />
              <SliderRow
                label="Min. duration (s)"
                testId="battle-slowmo-min-duration"
                min={1.0}
                max={5.0}
                step={0.5}
                value={
                  config.battleSlowmoMinDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoMinDuration
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 1.0 && v <= 5.0) set('battleSlowmoMinDuration', v);
                }}
                display={`${(config.battleSlowmoMinDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoMinDuration).toFixed(1)}s`}
                controlId="CameraAdvancedSection:battleSlowmoMinDuration"
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
                controlId="CameraAdvancedSection:battleSlowmoFadeDuration"
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
                controlId="CameraAdvancedSection:battleFocusDarkening"
              />
            </div>
          </div>
        </>
      )}
      {show('leadChanges') && (
        <>
          {/* ── Middle — lead changes ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
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
                display={(
                  config.leadChangeMinGap ?? DEFAULT_CAMERA_CONFIG.leadChangeMinGap
                ).toFixed(3)}
                controlId="CameraAdvancedSection:leadChangeMinGap"
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
                controlId="CameraAdvancedSection:leadChangeDebounceMs"
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
                controlId="CameraAdvancedSection:leadChangeMinDuration"
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
                controlId="CameraAdvancedSection:leadChangeCooldownMs"
              />
            </div>
          </div>
        </>
      )}
      {show('comebacks') && (
        <>
          {/* ── Middle — comebacks ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
              Detects B1 racers (targetRank 1–5) actively gaining positions. Requires Race Plan
              (open track ≥ 60 s only). Outcome phase activates internally above the leader-progress
              threshold, independent of the external flag from RaceScreen.
            </p>
            {/* COMEBACK-CONNECT-1 — the plan already writes when each comeback peaks, and the camera
            has been re-deriving that moment from rank history. OFF is today's behaviour exactly. */}
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}
              data-control-id="CameraAdvancedSection:comebackUseBeats"
            >
              <input
                type="checkbox"
                checked={config.comebackUseBeats ?? DEFAULT_CAMERA_CONFIG.comebackUseBeats}
                onChange={(e) => set('comebackUseBeats', e.target.checked)}
                data-testid="comeback-use-beats-toggle"
              />
              Let the race plan say WHEN a comeback is shown — a named comebacker is not offered
              before the plan’s peak beat. The gates above still decide whether the gain is real;
              this decides only the moment. Off = today’s behaviour.
              <Info id="CameraAdvancedSection:comebackUseBeats" />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <SliderRow
                label="Min. positions gained"
                testId="comeback-min-positions"
                min={2}
                max={10}
                step={1}
                value={
                  config.comebackMinPositionsGained ??
                  DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained
                }
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 2 && v <= 10) set('comebackMinPositionsGained', v);
                }}
                display={`${config.comebackMinPositionsGained ?? DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained}`}
                controlId="CameraAdvancedSection:comebackMinPositionsGained"
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
                controlId="CameraAdvancedSection:comebackWindowSec"
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
                controlId="CameraAdvancedSection:comebackMinStartGap"
              />
              <SliderRow
                label="Max. current rank (lead-group filter)"
                testId="comeback-max-current-rank-pct"
                min={0.05}
                max={0.5}
                step={0.05}
                value={
                  config.comebackMaxCurrentRankPct ??
                  DEFAULT_CAMERA_CONFIG.comebackMaxCurrentRankPct
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0.05 && v <= 0.5) set('comebackMaxCurrentRankPct', v);
                }}
                display={`${((config.comebackMaxCurrentRankPct ?? DEFAULT_CAMERA_CONFIG.comebackMaxCurrentRankPct) * 100).toFixed(0)}%`}
                controlId="CameraAdvancedSection:comebackMaxCurrentRankPct"
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
                controlId="CameraAdvancedSection:outcomePhaseThreshold"
              />
              <SliderRow
                label="Min. observation duration (s)"
                testId="comeback-min-duration"
                min={1}
                max={10}
                step={0.5}
                value={config.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 1 && v <= 10) set('comebackMinDuration', v);
                }}
                display={`${(config.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration).toFixed(1)}s`}
                controlId="CameraAdvancedSection:comebackMinDuration"
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
                controlId="CameraAdvancedSection:comebackCooldownMs"
              />
            </div>
          </div>
        </>
      )}
      {show('endgame') && (
        <>
          {/* ── Endgame and run-in ── */}
          <div className={s.card}>
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:endgameThreshold">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Endgame Focus Threshold
                  <Info id="CameraAdvancedSection:endgameThreshold" />
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
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.6rem',
              }}
              data-control-id="CameraAdvancedSection:runInShot"
            >
              <input
                type="checkbox"
                data-testid="run-in-shot"
                checked={config.runInShot ?? DEFAULT_CAMERA_CONFIG.runInShot}
                onChange={(e) => set('runInShot', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Frame the finish through the run-in</span>
              <Info id="CameraAdvancedSection:runInShot" />
            </label>
            <div className={s.formGrid}>
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:runInOpenMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Run-in opening (ms)
                  <Info id="CameraAdvancedSection:runInOpenMs" />
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
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.6rem',
              }}
              data-control-id="CameraAdvancedSection:contentionWatch"
            >
              <input
                type="checkbox"
                data-testid="contention-watch"
                checked={config.contentionWatch ?? DEFAULT_CAMERA_CONFIG.contentionWatch}
                onChange={(e) => set('contentionWatch', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Drop racers who can no longer win</span>
              <Info id="CameraAdvancedSection:contentionWatch" />
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.6rem',
              }}
              data-control-id="CameraAdvancedSection:bandFloor"
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
              <Info id="CameraAdvancedSection:bandFloor" />
            </label>
          </div>
        </>
      )}
      {show('finish') && (
        <>
          {/* ── Finish and photo finish ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
              When the first two finishers cross essentially together, show a tight top-2 group shot
              with slow-motion instead of the single-winner drama pulse. Camera-only. Off =
              today&apos;s behaviour exactly.
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
              data-control-id="CameraAdvancedSection:photoFinishEnabled"
            >
              <input
                type="checkbox"
                data-testid="photo-finish-enabled"
                checked={config.photoFinishEnabled ?? DEFAULT_CAMERA_CONFIG.photoFinishEnabled}
                onChange={(e) => set('photoFinishEnabled', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Enable photo-finish shot</span>
              <Info id="CameraAdvancedSection:photoFinishEnabled" />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <SliderRow
                label="Lead-progress gate"
                testId="photo-finish-lead-progress"
                min={0.85}
                max={0.999}
                step={0.001}
                value={
                  config.photoFinishLeadProgress ?? DEFAULT_CAMERA_CONFIG.photoFinishLeadProgress
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0.85 && v <= 0.999) set('photoFinishLeadProgress', v);
                }}
                display={(
                  config.photoFinishLeadProgress ?? DEFAULT_CAMERA_CONFIG.photoFinishLeadProgress
                ).toFixed(3)}
                controlId="CameraAdvancedSection:photoFinishLeadProgress"
              />
              <SliderRow
                label="Closeness threshold (t)"
                testId="photo-finish-threshold"
                min={0.005}
                max={0.15}
                step={0.005}
                value={
                  config.photoFinishCloseThresholdT ??
                  DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0.005 && v <= 0.15) set('photoFinishCloseThresholdT', v);
                }}
                display={(
                  config.photoFinishCloseThresholdT ??
                  DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT
                ).toFixed(3)}
                controlId="CameraAdvancedSection:photoFinishCloseThresholdT"
              />
              <SliderRow
                label="Slowmo factor"
                testId="photo-finish-slowmo-factor"
                min={0.1}
                max={1.0}
                step={0.05}
                value={
                  config.photoFinishSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.photoFinishSlowmoFactor
                }
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0.1 && v <= 1.0) set('photoFinishSlowmoFactor', v);
                }}
                display={(
                  config.photoFinishSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.photoFinishSlowmoFactor
                ).toFixed(2)}
                controlId="CameraAdvancedSection:photoFinishSlowmoFactor"
              />
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                fontSize: '0.88rem',
                marginBottom: '0.6rem',
              }}
              data-control-id="CameraAdvancedSection:photoFinishContenderFraming"
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
              <Info id="CameraAdvancedSection:photoFinishContenderFraming" />
            </label>
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
              data-control-id="CameraAdvancedSection:contenderZoom"
            >
              <input
                type="checkbox"
                checked={config.contenderZoom ?? DEFAULT_CAMERA_CONFIG.contenderZoom}
                onChange={(e) => set('contenderZoom', e.target.checked)}
                data-testid="contender-zoom-toggle"
              />
              Photo finish frames everyone still abreast
              <Info id="CameraAdvancedSection:contenderZoom" />
            </label>
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:corridorCapArriveMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Lane-cap arrival (ms)
                  <Info id="CameraAdvancedSection:corridorCapArriveMs" />
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
            </div>
          </div>
        </>
      )}
      {show('ending') && (
        <>
          {/* ── Ending — after the line, its phases in the order they play ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
              The controls below are in the order the phases happen. <strong>1</strong> and{' '}
              <strong>2</strong> are measured from the FIRST crossing; <strong>3</strong>,{' '}
              <strong>4</strong> and <strong>5</strong> from the LAST. The winner card is a tenant
              of <strong>4</strong> and can never lengthen the ending.
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
              data-control-id="CameraAdvancedSection:endingKeepsFinishShot"
            >
              <input
                type="checkbox"
                data-testid="ending-keeps-finish-shot"
                checked={
                  config.endingKeepsFinishShot ?? DEFAULT_CAMERA_CONFIG.endingKeepsFinishShot
                }
                onChange={(e) => set('endingKeepsFinishShot', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>The ending keeps the finish shot</span>
              <Info id="CameraAdvancedSection:endingKeepsFinishShot" />
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
              {config.podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs}. Phases 1 and
              2 are not in this total: they happen before the last racer is home.
            </p>
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:finishDramaDurationMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  1 · Hold on the winner, before the zoom-out (ms)
                  <Info id="CameraAdvancedSection:finishDramaDurationMs" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  // FINISH-WINDOW-1: the floor is 0, and it lived in TWO places here — this attribute
                  // and the guard below. Opening only one would have let his 0 be silently ignored.
                  min={0}
                  max={5000}
                  step={100}
                  value={
                    config.finishDramaDurationMs ?? DEFAULT_CAMERA_CONFIG.finishDramaDurationMs
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 0 && v <= 5000) set('finishDramaDurationMs', v);
                  }}
                />
              </div>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:finishOverviewZoomOutDurationMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  2 · Zoom-out duration (ms)
                  <Info id="CameraAdvancedSection:finishOverviewZoomOutDurationMs" />
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
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                controlId="CameraAdvancedSection:finishOverviewLookbackPx"
              />
            </div>
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:finishHoldAfterLastMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  3 · Hold on the finish picture, after the LAST crossing (ms)
                  <Info id="CameraAdvancedSection:finishHoldAfterLastMs" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  min={0}
                  max={10000}
                  step={250}
                  value={
                    config.finishHoldAfterLastMs ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 0 && v <= 10000) set('finishHoldAfterLastMs', v);
                  }}
                />
              </div>
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:finishPauseMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  4 · Pause before the result screen (ms)
                  <Info id="CameraAdvancedSection:finishPauseMs" />
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
              <div className={s.formGroup} data-control-id="CameraAdvancedSection:winnerCardMs">
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Winner card (ms) — a tenant of 4, never its own phase
                  <Info id="CameraAdvancedSection:winnerCardMs" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:podiumRevealBeatMs"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  5 · Podium build-up beat (ms)
                  <Info id="CameraAdvancedSection:podiumRevealBeatMs" />
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
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                fontSize: '0.88rem',
                marginBottom: '0.75rem',
              }}
              data-control-id="CameraAdvancedSection:finishedSplashEnabled"
            >
              <input
                type="checkbox"
                data-testid="finished-splash-enabled"
                checked={
                  config.finishedSplashEnabled ?? DEFAULT_CAMERA_CONFIG.finishedSplashEnabled
                }
                onChange={(e) => set('finishedSplashEnabled', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>
                Show the old &quot;RACE FINISHED!&quot; splash
              </span>
              <Info id="CameraAdvancedSection:finishedSplashEnabled" />
            </label>
          </div>
        </>
      )}
      {show('zoomProfiles') && (
        <>
          {/* ── Zoom profiles per camera state, then the global convergence thresholds ── */}
          <div className={s.card}>
            <p
              style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
            >
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
            <div className={s.formGrid}>
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:entryConvergenceZoom"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Convergence Zoom Threshold
                  <Info id="CameraAdvancedSection:entryConvergenceZoom" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:entryConvergencePx"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Convergence Px Threshold
                  <Info id="CameraAdvancedSection:entryConvergencePx" />
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
              <div
                className={s.formGroup}
                data-control-id="CameraAdvancedSection:transitionTConvergence"
              >
                <label
                  className={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  T-Space Convergence Threshold
                  <Info id="CameraAdvancedSection:transitionTConvergence" />
                </label>
                <input
                  type="number"
                  className={s.input}
                  min={0.005}
                  max={0.2}
                  step={0.005}
                  value={
                    config.transitionTConvergence ?? DEFAULT_CAMERA_CONFIG.transitionTConvergence
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 0.005 && v <= 0.2) set('transitionTConvergence', v);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {show('drawFloor') && (
        <>
          {/* ── Look — the drawing floor for racer size ── */}
          <div className={s.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                controlId="CameraAdvancedSection:minDrawnFrameFrac"
              />
            </div>
          </div>
        </>
      )}
      {show('trackLabels') && (
        <>
          {/* ── Look — track labels ── */}
          <div className={s.card}>
            {/* LABEL-OCCLUSION-1 — the name on the track when it covers nothing. The KEY and the OFF
            default are LABEL-DEGRADE-1's and are deliberately unchanged; what the switch DOES is
            not, so its text is. See reports/night/LABEL-OCCLUSION-1.md. */}
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              data-control-id="CameraAdvancedSection:labelNamesWhenRoom"
            >
              <input
                type="checkbox"
                checked={config.labelNamesWhenRoom ?? DEFAULT_CAMERA_CONFIG.labelNamesWhenRoom}
                onChange={(e) => set('labelNamesWhenRoom', e.target.checked)}
                data-testid="label-names-when-room-toggle"
              />
              Track labels show the NAME when it covers nothing
              <Info id="CameraAdvancedSection:labelNamesWhenRoom" />
            </label>
            {/* LABEL-HOLD-1 — how long a name must be EARNED for. Only the promotion; the withdrawal is
            immediate by design and is deliberately not settable. */}
            <div
              className={s.formGroup}
              style={{ marginTop: '0.5rem' }}
              data-control-id="CameraAdvancedSection:labelFormHoldMs"
            >
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Track labels — wait before a name (ms)
                <Info id="CameraAdvancedSection:labelFormHoldMs" />
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
        </>
      )}
      {show('overlays') && (
        <>
          {/* ── Look — overlay texts ── */}
          <div className={s.card}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                fontSize: '0.88rem',
                marginBottom: '0.4rem',
              }}
              data-control-id="CameraAdvancedSection:stateOverlayEnabled"
            >
              <input
                type="checkbox"
                data-testid="state-overlay-toggle"
                checked={config.stateOverlayEnabled ?? DEFAULT_CAMERA_CONFIG.stateOverlayEnabled}
                onChange={(e) => set('stateOverlayEnabled', e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Enable overlay texts</span>
              <Info id="CameraAdvancedSection:stateOverlayEnabled" />
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
              data-control-id="CameraAdvancedSection:stateOverlayDurationMs"
            >
              <span style={{ minWidth: '10rem' }}>Overlay duration (ms)</span>
              <input
                type="number"
                data-testid="state-overlay-duration"
                min={500}
                max={10000}
                step={100}
                value={
                  config.stateOverlayDurationMs ?? DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs
                }
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 500 && v <= 10000) set('stateOverlayDurationMs', v);
                }}
                style={{ width: '5rem' }}
              />
              <Info id="CameraAdvancedSection:stateOverlayDurationMs" />
            </label>
          </div>
        </>
      )}
      {show('diagnostics') && (
        <>
          {/* ── Diagnostics — on screen ── */}
          <div className={s.card}>
            {!aids && (
              <p className={s.sectionDesc} data-testid="test-aids-off-diagnostics">
                {
                  'The test-aids switch is off, so these diagnostics — all but the camera-state pill, which is not a test aid — stay off in every race and cannot be switched on here. An admin turns it on at the top of Diagnostics and verification. The hero rings are not drawn either.'
                }
              </p>
            )}
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              data-control-id="CameraAdvancedSection:highlightHeroes"
            >
              <input
                type="checkbox"
                checked={config.highlightHeroes ?? DEFAULT_CAMERA_CONFIG.highlightHeroes}
                onChange={(e) => set('highlightHeroes', e.target.checked)}
                data-testid="highlight-heroes-toggle"
              />
              Highlight heroes — <span style={{ color: '#34c759' }}>green ring = normal hero</span>,{' '}
              <span style={{ color: '#ff3b30' }}>red ring = B2-attacker</span>
              <Info id="CameraAdvancedSection:highlightHeroes" />
            </label>
            {ON_SCREEN_DIAGNOSTICS.map(renderDiagToggle)}
          </div>
        </>
      )}
      {show('logs') && (
        <>
          {/* ── Diagnostics — logs ── */}
          <div className={s.card}>
            {!aids && (
              <p className={s.sectionDesc} data-testid="test-aids-off-logs">
                {
                  'The test-aids switch is off, so these stay off in every race and cannot be switched on here. An admin turns it on at the top of Diagnostics and verification.'
                }
              </p>
            )}
            {LOG_TOGGLES.map(renderDiagToggle)}
          </div>
        </>
      )}
    </div>
  );
}

export default CameraAdvancedSection;
