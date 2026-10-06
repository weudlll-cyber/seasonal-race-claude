// ============================================================
// File:        RaceDefaults.jsx
// Path:        client/src/screens/DevScreen/sections/RaceDefaults.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Configure global race defaults — duration, countdown,
//              auto-advance, and sound effects. Rendered as three parts placed in three
//              chapters (DEVSCREEN-CHAPTERS-1); `part` picks one, none renders all three.
//
// ★ STAY-ON-THE-FINISH-1 (2026-09-25): the auto-advance switch DOES SOMETHING NOW — off, the finish
//   picture stays until the operator clicks it. Its "Delay (seconds)" companion is GONE: it was a
//   second number for a wait the camera ending already owns, and by the owner's decision one value
//   decides that. Three controls in this file were found SUSPECTED DEAD by the 2026-09-25 stock-take;
//   this repairs one, deletes one, and `soundEffects` is RESERVED by his decision, not dead.
// ============================================================

import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import { RACE_ACTION_STAGE_IDS } from '../../../modules/storage/defaults.js';
import { normalizeRaceActionStage } from '../../../modules/raceActionStage.js';
import { Ctl, Info } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];

// RACE-ACTION-CONTROL-1. Labels and blurbs only — the STAGE IDS come from defaults.js and the values
// they stand for live there too, so this file states no config value and cannot go stale against it.
const RACE_ACTION_LABELS = {
  quiet: { label: 'Quiet', hint: 'The shipped race.' },
  medium: { label: 'Medium', hint: 'A livelier front fight.' },
  wild: { label: 'Wild', hint: 'The most eventful race.' },
};

function RaceDefaults({ part }) {
  const [defaults, setDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  function set(patch) {
    setDefaults((prev) => ({ ...prev, ...patch }));
  }

  function handleReset() {
    setDefaults({ ...DEFAULT_RACE_DEFAULTS });
  }

  // DEVSCREEN-CHAPTERS-1: three parts, placed in three chapters — the race-setup defaults (The
  // race), the auto-advance switch (Camera, Ending) and the sound switch (Look, Sound). One store,
  // one setter and one Reset for all three, exactly as before; without `part` all three render.
  const show = (name) => !part || part === name;

  return (
    <>
      {show('raceSetup') && (
        <div className={s.card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.35rem',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Race Settings</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
            Default settings applied to every new race. These are the values that pre-fill when an
            operator sets up a new race — they can always be changed per race during setup.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Race Action — RACE-ACTION-CONTROL-1 */}
            <div
              className={s.formGroup}
              data-testid="race-action-control"
              data-control-id="RaceDefaults:raceActionStage"
            >
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Race Action
                <Info id="RaceDefaults:raceActionStage" />
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
            <div className={s.formGroup} data-control-id="RaceDefaults:duration">
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Default Race Duration
                <Info id="RaceDefaults:duration" />
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

            {/* Max Players — Closed Tracks */}
            <div className={s.formGroup} data-control-id="RaceDefaults:maxPlayersClosed">
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Max Players — Closed Tracks
                <Info id="RaceDefaults:maxPlayersClosed" />
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
            <div className={s.formGroup} data-control-id="RaceDefaults:maxPlayersOpen">
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Max Players — Open Tracks
                <Info id="RaceDefaults:maxPlayersOpen" />
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

            {/* Last, after the values: its scope also reaches the two switches placed in other
                chapters (auto-advance, sound), which its info text names. */}
            <div>
              <Ctl id="RaceDefaults:handleReset">
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  onClick={handleReset}
                  style={{ fontSize: '0.75rem' }}
                >
                  Reset Defaults
                </button>
              </Ctl>
            </div>
          </div>
        </div>
      )}

      {/* ★★ STAY ON THE FINISH — the owner's decision, 2026-09-25 (STAY-ON-THE-FINISH-1).
          The switch used to offer to turn on something that was always on: nothing read the key,
          the app always advanced, and the toggle sat at OFF while it did. It decides now.

          THE "Delay (seconds)" STEPPER THAT STOOD HERE IS GONE, and it was not a feature that was
          removed — it was a SECOND number for a wait the camera ending already owns. Nothing read
          it either. One value decides how long the picture stands, by his decision, and it is the
          camera ending he already adjusts. */}
      {show('autoAdvance') && (
        <div className={s.card}>
          <div className={s.formGroup} data-control-id="RaceDefaults:autoAdvance">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label className={s.toggle}>
                <input
                  type="checkbox"
                  data-testid="auto-advance-toggle"
                  checked={defaults.autoAdvance ?? DEFAULT_RACE_DEFAULTS.autoAdvance}
                  onChange={(e) => set({ autoAdvance: e.target.checked })}
                />
                <span className={s.toggleSlider} />
              </label>
              <span style={{ fontSize: '0.875rem' }}>Go to the results on its own</span>
              {/* ★ NO CONFIG VALUE IN THIS TEXT. It says WHERE the length is set, never what it is. */}
              <Info id="RaceDefaults:autoAdvance" />
            </div>
            {!(defaults.autoAdvance ?? DEFAULT_RACE_DEFAULTS.autoAdvance) && (
              <p
                data-testid="auto-advance-off-hint"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-muted)',
                  margin: '0.4rem 0 0 3.2rem',
                }}
              >
                Click the race picture to go to the results.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sound effects — RESERVED by decision: stored, read by nothing yet (its text says so). */}
      {show('sound') && (
        <div className={s.card}>
          <div className={s.formGroup} data-control-id="RaceDefaults:soundEffects">
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
              <Info id="RaceDefaults:soundEffects" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RaceDefaults;
