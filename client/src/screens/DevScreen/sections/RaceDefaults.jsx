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
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import { RACE_ACTION_STAGE_IDS } from '../../../modules/storage/defaults.js';
import { normalizeRaceActionStage } from '../../../modules/raceActionStage.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];

// RACE-ACTION-CONTROL-1. Labels and blurbs only — the STAGE IDS come from defaults.js and the values
// they stand for live there too, so this file states no config value and cannot go stale against it.
const RACE_ACTION_LABELS = {
  quiet: { label: 'Quiet', hint: 'The shipped race.' },
  medium: { label: 'Medium', hint: 'A livelier front fight.' },
  wild: { label: 'Wild', hint: 'The most eventful race.' },
};

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
        Default settings applied to every new race. These are the values that pre-fill when an
        operator sets up a new race — they can always be changed per race during setup.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Race Action — RACE-ACTION-CONTROL-1 */}
        <div className={s.formGroup} data-testid="race-action-control">
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Race Action
            <InfoTooltip text="How eventful the racing is. Quiet is the shipped race. Medium and Wild push the front fight harder — the same fair finish, more of a contest getting there. The stage you pick here is stored with each race, so the result screen can tell you which one ran." />
          </label>
          <div className={s.optionPills}>
            {RACE_ACTION_STAGE_IDS.map((id) => {
              const active = normalizeRaceActionStage(defaults.raceActionStage) === id;
              return (
                <button
                  key={id}
                  data-testid={`race-action-${id}`}
                  aria-pressed={active}
                  className={`${s.optionPill} ${active ? s.optionPillActive : ''}`}
                  onClick={() => set({ raceActionStage: id })}
                >
                  {RACE_ACTION_LABELS[id].label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', margin: '0.4rem 0 0' }}>
            {RACE_ACTION_LABELS[normalizeRaceActionStage(defaults.raceActionStage)].hint}
          </p>
        </div>

        {/* Duration */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Default Race Duration
            <InfoTooltip text="Default length of a race in seconds. The actual race duration may vary slightly because racers finish at different speeds. Operators can override this for any individual race." />
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
            <InfoTooltip text="How many top finishers are highlighted as winners on the result screen. 3 shows a classic podium (gold, silver, bronze). Higher values include more racers in the celebration." />
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

        {/* Max Players — Closed Tracks */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Max Players — Closed Tracks
            <InfoTooltip text="Hard cap on how many player names the game operator may enter for closed-loop tracks (oval, circuit, etc.). Track geometry limits meaningful capacity; 40 is a safe ceiling." />
          </label>
          <input
            type="number"
            className={s.input}
            min={1}
            max={100}
            step={1}
            value={defaults.maxPlayersClosed ?? DEFAULT_RACE_DEFAULTS.maxPlayersClosed}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isInteger(v) && v >= 1 && v <= 100) set({ maxPlayersClosed: v });
            }}
          />
        </div>

        {/* Max Players — Open Tracks */}
        <div className={s.formGroup}>
          <label
            className={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Max Players — Open Tracks
            <InfoTooltip text="Hard cap on how many player names the game operator may enter for open (point-to-point) tracks. Open tracks accommodate larger fields; 100 is the validated ceiling." />
          </label>
          <input
            type="number"
            className={s.input}
            min={1}
            max={100}
            step={1}
            value={defaults.maxPlayersOpen ?? DEFAULT_RACE_DEFAULTS.maxPlayersOpen}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isInteger(v) && v >= 1 && v <= 100) set({ maxPlayersOpen: v });
            }}
          />
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
            <InfoTooltip text="When turned on, the result screen appears automatically after a race ends. Useful for events where the operator wants a hands-off, automated flow." />
          </div>
          {defaults.autoAdvance && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                Delay (seconds):
              </span>
              <InfoTooltip text="How many seconds to wait after the race ends before showing results. Gives the audience a moment to react to the finish before the screen changes." />
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
            <InfoTooltip text="Whether to play sound effects during races (start, finish, etc.). Turn off for silent operation in noise-sensitive venues." />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaceDefaults;
