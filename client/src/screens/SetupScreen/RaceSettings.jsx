// ============================================================
// File:        RaceSettings.jsx
// Path:        client/src/screens/SetupScreen/RaceSettings.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Race configuration controls — duration, winner count, event name, race seed
// ============================================================

import styles from './SetupScreen.module.css';
import {
  sanitizeQuickTestSeedInput,
  QUICK_TEST_SEED_MIN,
  QUICK_TEST_SEED_MAX,
} from './quickTestSeed.js';

const DURATION_OPTIONS = [
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
  { value: 90, label: '90 s' },
  { value: 120, label: '120 s' },
];

const MIN_WINNERS = 1;
const MAX_WINNERS = 20;

function RaceSettings({
  settings,
  onChange,
  seed = '',
  onSeedChange,
  lastRaceSeed = null,
  // RACE-IDENTIFIER-1
  identifierError = null,
  raceIdentifier = null,
}) {
  const { duration, winners, eventName } = settings;

  function set(patch) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div className={styles.settingsGrid}>
      {/* Race duration */}
      <div className={styles.settingGroup}>
        <span className={styles.settingLabel}>Race Duration</span>
        <div className={styles.optionRow}>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.optionBtn} ${
                duration === opt.value ? styles.optionBtnActive : ''
              }`}
              onClick={() => set({ duration: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Number of winners */}
      <div className={styles.settingGroup}>
        <span className={styles.settingLabel}>Number of Winners (Podium Spots)</span>
        <div className={styles.winnersRow}>
          <button
            className={styles.stepperBtn}
            disabled={winners <= MIN_WINNERS}
            onClick={() => set({ winners: winners - 1 })}
          >
            −
          </button>
          <span className={styles.stepperValue}>{winners}</span>
          <button
            className={styles.stepperBtn}
            disabled={winners >= MAX_WINNERS}
            onClick={() => set({ winners: winners + 1 })}
          >
            +
          </button>
        </div>
      </div>

      {/* Race seed / race identifier — SEED-REAL-RACE-1, then RACE-IDENTIFIER-1.
          Text + numeric keypad rather than type="number": an empty field is a real, meaningful
          state here ("draw a fresh one"), and number inputs make emptiness awkward. Same reasoning,
          and the same sanitizer, as the Quick-Test field. */}
      <div className={styles.settingGroup}>
        <span className={styles.settingLabel}>Race Seed or Identifier (optional)</span>
        <input
          className={styles.textInput}
          type="text"
          placeholder="random"
          aria-label="Race seed or identifier"
          data-testid="race-seed-input"
          title={`Leave empty and every race draws its own seed — the race screen shows it, and this panel remembers the last one. Type ${QUICK_TEST_SEED_MIN}–${QUICK_TEST_SEED_MAX} to run that exact race again on THIS machine. Paste a race identifier to run that exact race here, whatever this machine's own settings are.`}
          value={seed}
          onChange={(e) => onSeedChange?.(sanitizeQuickTestSeedInput(e.target.value))}
        />
        {/* RACE-IDENTIFIER-1: a refused identifier says why, beside the field. Without this a
            refusal is indistinguishable from a Start button that does nothing. */}
        {identifierError && (
          <div className={styles.settingHint} role="alert" data-testid="identifier-error">
            <strong>{identifierError}</strong>
          </div>
        )}
        {/* The other direction: the identifier for the race this screen would start now. A seed
            names a race only on the machine that ran it — this names it anywhere. It needs a TYPED
            seed, because an empty field means "draw one at press time" and there is no race to
            name yet. */}
        {raceIdentifier && (
          <div className={styles.settingHint} data-testid="race-identifier-row">
            <button
              type="button"
              className={styles.linkBtn}
              data-testid="copy-race-identifier"
              onClick={() => navigator.clipboard?.writeText?.(raceIdentifier)}
              title="Copy the identifier for the race this screen would start. Pasting it into this field on another machine runs the same race."
            >
              copy this race&rsquo;s identifier
            </button>{' '}
            <span style={{ opacity: 0.7 }}>({raceIdentifier.length} characters)</span>
          </div>
        )}
        {lastRaceSeed != null && (
          <div className={styles.settingHint}>
            Last race: <strong>{lastRaceSeed}</strong>{' '}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => onSeedChange?.(String(lastRaceSeed))}
            >
              run it again
            </button>
          </div>
        )}
      </div>

      {/* Optional event / branding name */}
      <div className={styles.settingGroup}>
        <span className={styles.settingLabel}>Event Name (optional)</span>
        <input
          className={styles.textInput}
          type="text"
          placeholder="e.g. Summer Sprint Championship"
          maxLength={60}
          value={eventName}
          onChange={(e) => set({ eventName: e.target.value })}
        />
      </div>
    </div>
  );
}

export default RaceSettings;
