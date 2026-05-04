// ============================================================
// File:        RaceDefaults.jsx
// Path:        client/src/screens/DevScreen/sections/RaceDefaults.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Configure global race defaults — duration, winners, countdown,
//              auto-advance, and sound effects
// ============================================================

import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];
const COUNTDOWNS = [3, 5, 10];

function RaceDefaults() {
  const [defaults, setDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  function set(patch) {
    setDefaults((prev) => ({ ...prev, ...patch }));
  }

  function handleReset() {
    setDefaults({ ...DEFAULT_RACE_DEFAULTS });
  }

  return (
    <div className={s.card}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
      >
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Race Settings</span>
        <span className={s.spacer} />
        <button
          className={`${s.btn} ${s.btnGhost}`}
          onClick={handleReset}
          style={{ fontSize: '0.75rem' }}
        >
          Reset Defaults
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        Default settings applied to every new race. Operators can override individual values per
        race during setup.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Duration */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Default Race Duration
            <InfoTooltip text="Default race duration in seconds applied to new races. Operators can override this per race during setup." />
          </label>
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
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Default Number of Winners (Podium Spots)
            <InfoTooltip text="How many top finishers are highlighted as winners on the result screen. Default 3 shows podium-style top three." />
          </label>
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
              disabled={defaults.winners >= 20}
              onClick={() => set({ winners: defaults.winners + 1 })}
            >
              +
            </button>
          </div>
        </div>

        {/* Max Players */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Max Players per Race
            <InfoTooltip text="Maximum number of racers allowed in a single race. Higher counts may impact visual clarity at race start and finish." />
          </label>
          <div className={s.stepper}>
            <button
              className={s.stepperBtn}
              disabled={defaults.maxPlayers <= 1}
              onClick={() => set({ maxPlayers: defaults.maxPlayers - 1 })}
            >
              −
            </button>
            <span className={s.stepperValue}>{defaults.maxPlayers ?? 20}</span>
            <button
              className={s.stepperBtn}
              disabled={(defaults.maxPlayers ?? 20) >= 30}
              onClick={() => set({ maxPlayers: (defaults.maxPlayers ?? 20) + 1 })}
            >
              +
            </button>
          </div>
        </div>

        {/* Countdown */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Countdown Duration
            <InfoTooltip text="Length of the pre-race countdown in seconds. Gives operators time to grab attention before the start." />
          </label>
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
            <InfoTooltip text="When enabled, the result screen automatically appears after a race ends. Useful for fully automated event runs." />
          </div>
          {defaults.autoAdvance && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                Delay (seconds):
              </span>
              <InfoTooltip text="Seconds to wait after race end before showing results. Only applies when Auto-advance is enabled." />
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
            <InfoTooltip text="Whether to play sound effects during races (start, finish, etc.). Disable for silent operation." />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaceDefaults;
