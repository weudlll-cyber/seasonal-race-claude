// ============================================================
// File:        RaceDefaults.jsx
// Path:        client/src/screens/DevScreen/sections/RaceDefaults.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Configure global race defaults — duration, winners, countdown,
//              auto-advance, sound effects, and language
// ============================================================

import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];
const COUNTDOWNS = [3, 5, 10];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
];

function RaceDefaults() {
  const [defaults, setDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  function set(patch) {
    setDefaults((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className={s.card}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Duration */}
        <div className={s.formGroup}>
          <label className={s.label}>Default Race Duration</label>
          <div className={s.optionPills}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                className={`${s.optionPill} ${defaults.duration === d ? s.optionPillActive : ''}`}
                onClick={() => set({ duration: d })}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Winners */}
        <div className={s.formGroup}>
          <label className={s.label}>Default Number of Winners (Podium Spots)</label>
          <div className={s.stepper}>
            <button
              className={s.stepperBtn}
              disabled={defaults.winners <= 1}
              onClick={() => set({ winners: defaults.winners - 1 })}
            >
              −
            </button>
            <span className={s.stepperValue}>{defaults.winners}</span>
            <button
              className={s.stepperBtn}
              disabled={defaults.winners >= 5}
              onClick={() => set({ winners: defaults.winners + 1 })}
            >
              +
            </button>
          </div>
        </div>

        {/* Countdown */}
        <div className={s.formGroup}>
          <label className={s.label}>Countdown Duration</label>
          <div className={s.optionPills}>
            {COUNTDOWNS.map((c) => (
              <button
                key={c}
                className={`${s.optionPill} ${defaults.countdownDuration === c ? s.optionPillActive : ''}`}
                onClick={() => set({ countdownDuration: c })}
              >
                {c}s
              </button>
            ))}
          </div>
        </div>

        <hr className={s.divider} />

        {/* Auto-advance */}
        <div className={s.formGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={defaults.autoAdvance}
                onChange={(e) => set({ autoAdvance: e.target.checked })}
              />
              <span className={s.toggleSlider} />
            </label>
            <span style={{ fontSize: '0.875rem' }}>Auto-advance to Result Screen after race</span>
          </div>
          {defaults.autoAdvance && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                Delay (seconds):
              </span>
              <div className={s.stepper}>
                <button
                  className={s.stepperBtn}
                  disabled={defaults.autoAdvanceDelay <= 1}
                  onClick={() => set({ autoAdvanceDelay: defaults.autoAdvanceDelay - 1 })}
                >
                  −
                </button>
                <span className={s.stepperValue}>{defaults.autoAdvanceDelay}</span>
                <button
                  className={s.stepperBtn}
                  disabled={defaults.autoAdvanceDelay >= 30}
                  onClick={() => set({ autoAdvanceDelay: defaults.autoAdvanceDelay + 1 })}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sound effects */}
        <div className={s.formGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={defaults.soundEffects}
                onChange={(e) => set({ soundEffects: e.target.checked })}
              />
              <span className={s.toggleSlider} />
            </label>
            <span style={{ fontSize: '0.875rem' }}>Sound effects</span>
          </div>
        </div>

        {/* Language */}
        <div className={s.formGroup}>
          <label className={s.label}>Language</label>
          <div className={s.optionPills}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                className={`${s.optionPill} ${defaults.language === lang.value ? s.optionPillActive : ''}`}
                onClick={() => set({ language: lang.value })}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
            Note: full translations are applied in a later phase.
          </span>
        </div>
      </div>
    </div>
  );
}

export default RaceDefaults;
