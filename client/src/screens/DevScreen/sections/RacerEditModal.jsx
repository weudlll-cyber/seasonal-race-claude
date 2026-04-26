// ============================================================
// File:        RacerEditModal.jsx
// Path:        client/src/screens/DevScreen/sections/RacerEditModal.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Per-type tuning modal for D3.5.5. Live-apply: every field
//              change writes to localStorage and mutates the live config
//              immediately. No save button — reset restores code defaults.
// ============================================================

import { useState, useEffect } from 'react';
import { InfoTooltip } from '../../../components/InfoTooltip/InfoTooltip.jsx';
import {
  RACER_TYPES,
  TUNABLE_FIELDS,
  CONFIG_SNAPSHOT,
  applyTunableOverride,
  restoreTunableDefault,
  normalizeOverrideMap,
} from '../../../modules/racer-types/index.js';
import s from './RacerEditModal.module.css';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const FIELD_META = {
  speedMultiplier: {
    label: 'Speed Multiplier',
    type: 'number',
    min: 0.1,
    max: 2.0,
    step: 0.05,
    tooltip:
      'How fast this racer moves in a race. 1.0 = Horse baseline. Below 1 is slower, above 1 is faster. Range 0.3 (Snail) to 1.25 (Rocket) is well-balanced.',
  },
  displaySize: {
    label: 'Display Size (px)',
    type: 'number',
    min: 16,
    max: 80,
    step: 2,
    tooltip:
      'Rendered sprite size in pixels. Affects visual scale only, not gameplay speed. Default range is 35–50 px.',
  },
  basePeriodMs: {
    label: 'Anim Period (ms)',
    type: 'number',
    min: 100,
    max: 3000,
    step: 50,
    tooltip:
      'Duration of one full animation cycle in milliseconds. Low = fast flicker, high = slow and calm. Default range 400–1500 ms.',
  },
  leaderRingColor: {
    label: 'Leader Ring Color',
    type: 'color',
    tooltip: 'Color of the glow ring drawn around the leading racer. Enter a hex code (#rrggbb).',
  },
  leaderEllipseRx: {
    label: 'Leader Ring Width (rx)',
    type: 'number',
    min: 8,
    max: 40,
    step: 1,
    tooltip: 'Horizontal radius of the leader ring ellipse in pixels. Increase for wider sprites.',
  },
  leaderEllipseRy: {
    label: 'Leader Ring Height (ry)',
    type: 'number',
    min: 5,
    max: 30,
    step: 1,
    tooltip:
      'Vertical radius of the leader ring ellipse in pixels. Smaller values give a flatter ring.',
  },
};

function validateField(fieldName, raw) {
  const meta = FIELD_META[fieldName];
  if (meta.type === 'color') {
    return HEX_RE.test(raw) ? null : 'Must be a hex color (#rrggbb)';
  }
  const n = parseFloat(raw);
  if (isNaN(n)) return 'Must be a number';
  if (n < meta.min || n > meta.max) return `Range: ${meta.min} – ${meta.max}`;
  return null;
}

function coerceField(fieldName, raw) {
  const meta = FIELD_META[fieldName];
  if (meta.type === 'color') return raw;
  return parseFloat(raw);
}

/**
 * @param {object} props
 * @param {string}   props.typeId      - racer type id to edit
 * @param {object}   props.overrides   - current full override map (normalized)
 * @param {function} props.setOverrides - useStorage setter (writes to React state + localStorage)
 * @param {function} props.onClose
 */
export function RacerEditModal({ typeId, overrides, setOverrides, onClose }) {
  const typeOverrides = normalizeOverrideMap(overrides)[typeId] ?? {};

  // Local text state for each field (drives the inputs)
  const initialText = () =>
    Object.fromEntries(
      TUNABLE_FIELDS.map((f) => [
        f,
        String(f in typeOverrides ? typeOverrides[f] : RACER_TYPES[typeId].config[f]),
      ])
    );

  const [text, setText] = useState(initialText);
  const [errors, setErrors] = useState({});

  // Keep local text in sync if parent overrides change externally (e.g. reset-all)
  useEffect(() => {
    setText(initialText());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const label = `${RACER_TYPES[typeId]?.getEmoji?.()} ${typeId.charAt(0).toUpperCase() + typeId.slice(1)}`;

  function handleChange(fieldName, raw) {
    setText((prev) => ({ ...prev, [fieldName]: raw }));

    const err = validateField(fieldName, raw);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[fieldName] = err;
      else delete next[fieldName];
      return next;
    });

    if (!err) {
      const value = coerceField(fieldName, raw);
      // Live-apply config mutation
      applyTunableOverride(typeId, fieldName, value);
      // Persist via React state → localStorage
      setOverrides((prev) => {
        const all = normalizeOverrideMap(prev);
        const typeOvr = { ...(all[typeId] ?? {}) };
        typeOvr[fieldName] = value;
        return { ...all, [typeId]: typeOvr };
      });
    }
  }

  function handleColorTextChange(fieldName, raw) {
    // Normalize: ensure leading # for 6-char hex input
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    handleChange(fieldName, normalized);
  }

  function handleFieldReset(fieldName) {
    const snap = CONFIG_SNAPSHOT[typeId];
    const defaultVal = snap[fieldName];
    const defaultStr = String(defaultVal);
    setText((prev) => ({ ...prev, [fieldName]: defaultStr }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    // Restore live config
    restoreTunableDefault(typeId, fieldName);
    // Remove from storage
    setOverrides((prev) => {
      const all = normalizeOverrideMap(prev);
      const typeOvr = { ...(all[typeId] ?? {}) };
      delete typeOvr[fieldName];
      const next = { ...all };
      if (Object.keys(typeOvr).length === 0) delete next[typeId];
      else next[typeId] = typeOvr;
      return next;
    });
  }

  function handleResetAll() {
    // Restore all tunable fields from snapshot
    for (const f of TUNABLE_FIELDS) restoreTunableDefault(typeId, f);
    // Remove all tunable overrides from storage (keep isActive if set)
    setOverrides((prev) => {
      const all = normalizeOverrideMap(prev);
      const typeOvr = { ...(all[typeId] ?? {}) };
      for (const f of TUNABLE_FIELDS) delete typeOvr[f];
      const next = { ...all };
      if (Object.keys(typeOvr).length === 0) delete next[typeId];
      else next[typeId] = typeOvr;
      return next;
    });
    // Reset local text to code defaults
    setText(Object.fromEntries(TUNABLE_FIELDS.map((f) => [f, String(CONFIG_SNAPSHOT[typeId][f])])));
    setErrors({});
  }

  function hasAnyTunableOverride() {
    const typeOvr = normalizeOverrideMap(overrides)[typeId] ?? {};
    return TUNABLE_FIELDS.some((f) => f in typeOvr);
  }

  function isFieldOverridden(fieldName) {
    const typeOvr = normalizeOverrideMap(overrides)[typeId] ?? {};
    return fieldName in typeOvr;
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label={`Edit ${label}`}>
      <div className={s.modal}>
        <div className={s.header}>
          <span className={s.headerTitle}>{label}</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={s.body}>
          {TUNABLE_FIELDS.map((fieldName) => {
            const meta = FIELD_META[fieldName];
            const modified = isFieldOverridden(fieldName);
            const err = errors[fieldName];
            return (
              <div
                key={fieldName}
                className={`${s.fieldRow}${modified ? ` ${s.fieldRowModified}` : ''}${err ? ` ${s.fieldRowError}` : ''}`}
              >
                <div className={s.labelRow}>
                  <span className={s.fieldLabel}>{meta.label}</span>
                  <InfoTooltip text={meta.tooltip} alignRight />
                  {modified && <span className={s.modifiedBadge}>modified</span>}
                </div>

                <div className={s.inputRow}>
                  {meta.type === 'color' ? (
                    <>
                      <input
                        type="color"
                        className={s.colorInput}
                        value={HEX_RE.test(text[fieldName]) ? text[fieldName] : '#000000'}
                        onChange={(e) => handleChange(fieldName, e.target.value)}
                        aria-label={`${meta.label} color picker`}
                      />
                      <input
                        type="text"
                        className={`${s.colorText}${err ? ` ${s.inputError}` : ''}`}
                        value={text[fieldName]}
                        onChange={(e) => handleColorTextChange(fieldName, e.target.value)}
                        maxLength={7}
                        aria-label={`${meta.label} hex value`}
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      className={`${s.input}${err ? ` ${s.inputError}` : ''}`}
                      value={text[fieldName]}
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      onChange={(e) => handleChange(fieldName, e.target.value)}
                      aria-label={meta.label}
                    />
                  )}

                  {modified && (
                    <button
                      className={s.resetFieldBtn}
                      onClick={() => handleFieldReset(fieldName)}
                      title={`Reset ${meta.label} to default`}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {err && <span className={s.errorMsg}>{err}</span>}
              </div>
            );
          })}
        </div>

        <div className={s.footer}>
          <button
            className={s.resetAllBtn}
            onClick={handleResetAll}
            disabled={!hasAnyTunableOverride()}
            title="Reset all fields for this type to code defaults"
          >
            Reset all to defaults
          </button>
          <span className={s.spacer} />
          <button className={s.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default RacerEditModal;
