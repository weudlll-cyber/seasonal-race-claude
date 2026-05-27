// ============================================================
// File:        RacerMetadataPanel.jsx
// Path:        client/src/screens/RacerEditor/RacerMetadataPanel.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Right column of the Racer Editor — name, emoji, speed,
//              display size, trail style, surface classes, and coat color.
//              Pure presentation — all state lifted to RacerEditor.
// ============================================================

import { useSurfaceClasses } from '../../modules/surface-effects/useSurfaceClasses.js';
import { listTrailStyles } from '../../modules/racer-types/trailStyles.js';
import s from './RacerEditor.module.css';

const TRAIL_LABELS = {
  none: 'None',
  dust: 'Dust',
  sparkle: 'Sparkle',
  bubbles: 'Bubbles',
  exhaust: 'Exhaust',
};

export function RacerMetadataPanel({ metadata, onMetadataChange, editId }) {
  const { classes: surfaceClasses } = useSurfaceClasses();
  const trailStyles = listTrailStyles();

  function set(key, val) {
    onMetadataChange({ ...metadata, [key]: val });
  }

  function toggleSurface(id) {
    const next = metadata.surfaceClasses.includes(id)
      ? metadata.surfaceClasses.filter((c) => c !== id)
      : [...metadata.surfaceClasses, id];
    set('surfaceClasses', next);
  }

  return (
    <div className={s.panel}>
      <h2 className={s.panelTitle}>Racer Metadata</h2>

      <div className={s.formGrid}>
        {/* Name */}
        <div className={s.formGroupFull}>
          <label className={s.label} htmlFor="re-name">
            Name
          </label>
          <input
            id="re-name"
            className={s.input}
            placeholder="e.g. Space Cat"
            maxLength={40}
            value={metadata.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        {/* Emoji */}
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="re-emoji">
            Emoji
          </label>
          <input
            id="re-emoji"
            className={s.input}
            placeholder="🐱"
            maxLength={4}
            value={metadata.emoji}
            onChange={(e) => set('emoji', e.target.value)}
          />
        </div>

        {/* Primary color */}
        <div className={s.formGroup}>
          <label className={s.label}>Primary color</label>
          <div className={s.colorRow}>
            <input
              type="color"
              value={metadata.primaryColor}
              onChange={(e) => set('primaryColor', e.target.value)}
              style={{
                width: '2rem',
                height: '2rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            />
            <input
              className={s.input}
              value={metadata.primaryColor}
              maxLength={7}
              onChange={(e) => set('primaryColor', e.target.value)}
            />
          </div>
        </div>

        {/* Speed multiplier */}
        <div className={s.formGroupFull}>
          <label className={s.label}>
            Speed multiplier <span className={s.labelNote}>horse = 1.0</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.3}
              max={2.0}
              step={0.05}
              value={metadata.speedMultiplier}
              onChange={(e) => set('speedMultiplier', parseFloat(e.target.value))}
            />
            <span className={s.sliderValue}>×{metadata.speedMultiplier.toFixed(2)}</span>
          </div>
        </div>

        {/* Display size */}
        <div className={s.formGroupFull}>
          <label className={s.label}>
            Display size <span className={s.labelNote}>horse = 40 px</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={16}
              max={80}
              step={1}
              value={metadata.displaySize}
              onChange={(e) => set('displaySize', parseInt(e.target.value, 10))}
            />
            <span className={s.sliderValue}>{metadata.displaySize} px</span>
          </div>
        </div>

        {/* Trail style */}
        <div className={s.formGroupFull}>
          <label className={s.label} htmlFor="re-trail">
            Trail style
          </label>
          <select
            id="re-trail"
            className={s.select}
            value={metadata.trailStyle}
            onChange={(e) => set('trailStyle', e.target.value)}
          >
            {trailStyles.map((id) => (
              <option key={id} value={id}>
                {TRAIL_LABELS[id] ?? id}
              </option>
            ))}
          </select>
        </div>

        {/* Surface classes */}
        <div className={s.formGroupFull}>
          <div className={s.label}>
            Surface classes <span className={s.labelNote}>empty = works on all surfaces</span>
          </div>
          {surfaceClasses.length === 0 ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              No surface classes defined yet — configure them in Dev Panel → Surface Classes
            </span>
          ) : (
            <div className={s.surfacePills}>
              {surfaceClasses.map((cls) => {
                const active = metadata.surfaceClasses.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    aria-pressed={active}
                    className={`${s.surfacePill} ${active ? s.surfacePillActive : ''}`}
                    onClick={() => toggleSurface(cls.id)}
                  >
                    {cls.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editId && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          Editing type <strong>{editId}</strong>. Re-upload a PNG to regenerate the sprite.
        </p>
      )}
    </div>
  );
}
