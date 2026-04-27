// ============================================================
// File:        RaceSettings.jsx
// Path:        client/src/screens/SetupScreen/RaceSettings.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Race configuration controls — duration, winner count, event name
// ============================================================

import styles from './SetupScreen.module.css';

const DURATION_OPTIONS = [
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
  { value: 90, label: '90 s' },
  { value: 120, label: '120 s' },
];

const MIN_WINNERS = 1;
const MAX_WINNERS = 20;

function RaceSettings({ settings, onChange }) {
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
