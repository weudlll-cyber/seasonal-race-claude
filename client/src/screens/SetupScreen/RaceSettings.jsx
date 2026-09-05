// ============================================================
// File:        RaceSettings.jsx
// Path:        client/src/screens/SetupScreen/RaceSettings.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Race configuration controls — duration, winner count, event name, race seed
// ============================================================

import { useState } from 'react';
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
  // IDENTIFIER-SPEAKS-1: why there is no identifier, when there is none. Shown in the row's place.
  raceIdentifierNote = null,
  // RUN-IT-AGAIN-1: the whole last race. Null = only its seed was recorded, which the row says.
  lastRaceIdentifier = null,
}) {
  // COPY-FEEDBACK-1
  const [copied, setCopied] = useState(false);
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
        {/* IDENTIFIER-SPEAKS-1: the row's place is never simply empty. Either the identifier is
            here, or one line says why it is not — a blank space where a control should be is what
            sent the owner looking for a field that was working as designed. */}
        {!raceIdentifier && raceIdentifierNote && (
          <div className={styles.settingHint} data-testid="race-identifier-note">
            {raceIdentifierNote}
          </div>
        )}
        {raceIdentifier && (
          <div className={styles.settingHint} data-testid="race-identifier-row">
            <button
              type="button"
              className={styles.linkBtn}
              data-testid="copy-race-identifier"
              onClick={() => {
                // COPY-FEEDBACK-1: the smallest confirmation there is — the link says so itself for
                // a moment. No toast, no component, no new state machine: one boolean that resets.
                try {
                  navigator.clipboard?.writeText?.(raceIdentifier);
                } catch {
                  /* a refused clipboard must not look like a successful copy */
                  return;
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy the identifier for the race this screen would start. Pasting it into this field on another machine runs the same race."
            >
              {copied ? 'copied ✓' : 'copy this race’s identifier'}
            </button>{' '}
            <span style={{ opacity: 0.7 }}>({raceIdentifier.length} characters)</span>
          </div>
        )}
        {lastRaceSeed != null && (
          <div className={styles.settingHint}>
            {/* RUN-IT-AGAIN-1 — THE LABEL IS THE SEED, WHAT THE BUTTON FILLS IN IS THE RACE.
                The number stays because it is the short human name for the race and it is what he
                reads off the race screen. But putting that number back in the field repeats a race
                by SEED, and a seed does not reproduce a race — the config would come from whatever
                this machine is set to now. So the button fills in the recorded IDENTIFIER, which
                carries the whole race.
                ★ WHEN THERE IS NO IDENTIFIER — a race from before this existed, or one that could
                not be encoded — it falls back to the seed and SAYS SO. Offering the weaker thing
                silently, in the place the stronger one used to be, is the failure this avoids. */}
            Last race: <strong>{lastRaceSeed}</strong>{' '}
            <button
              type="button"
              className={styles.linkBtn}
              data-testid="run-it-again"
              title={
                lastRaceIdentifier
                  ? 'Fills in that race’s identifier — the whole race, so it runs the same here whatever this machine is set to now.'
                  : 'Fills in that race’s seed. Only the seed was recorded for it, so the race will use THIS machine’s current settings.'
              }
              onClick={() => onSeedChange?.(lastRaceIdentifier ?? String(lastRaceSeed))}
            >
              run it again
            </button>
            {!lastRaceIdentifier && (
              <span data-testid="run-it-again-seed-only">
                {' '}
                — by seed only, so this machine&rsquo;s current settings will apply
              </span>
            )}
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
