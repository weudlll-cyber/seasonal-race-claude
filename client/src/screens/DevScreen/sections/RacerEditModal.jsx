// ============================================================
// File:        RacerEditModal.jsx
// Path:        client/src/screens/DevScreen/sections/RacerEditModal.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Per-type tuning modal for D3.5.5. Live-apply: every field
//              change writes to localStorage and mutates the live config
//              immediately. No save button — reset restores code defaults.
//              D7a-Plus: adds per-type minTargetScreenPx slider with
//              animated sprite preview.
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
import {
  loadAutoScaleConfig,
  DEFAULT_AUTO_SCALE_CONFIG,
} from '../../../modules/autoSpriteScale.js';
import { MinSpriteSizePreview } from './MinSpriteSizePreview.jsx';
import s from './RacerEditModal.module.css';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Fields rendered in the standard loop. minTargetScreenPx has its own section.
const STANDARD_FIELDS = TUNABLE_FIELDS.filter((f) => f !== 'minTargetScreenPx');

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
    tooltip: 'Sprite size in pixels. Default range 35–50 px.',
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

  // Local text state for each standard field (drives the inputs)
  const initialText = () =>
    Object.fromEntries(
      STANDARD_FIELDS.map((f) => {
        const raw = f in typeOverrides ? typeOverrides[f] : RACER_TYPES[typeId].config[f];
        return [f, raw !== undefined ? String(raw) : ''];
      })
    );

  const [text, setText] = useState(initialText);
  const [errors, setErrors] = useState({});

  // Per-type minTargetScreenPx override: undefined = use global default
  const [minSizeOverride, setMinSizeOverride] = useState(() =>
    'minTargetScreenPx' in typeOverrides ? typeOverrides.minTargetScreenPx : undefined
  );

  // Keep local state in sync if parent overrides change externally (e.g. reset-all)
  useEffect(() => {
    setText(initialText());
    setErrors({});
    const freshOverrides = normalizeOverrideMap(overrides)[typeId] ?? {};
    setMinSizeOverride(
      'minTargetScreenPx' in freshOverrides ? freshOverrides.minTargetScreenPx : undefined
    );
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
    const defaultStr = defaultVal !== undefined ? String(defaultVal) : '';
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

  function handleMinSizeChange(newPx) {
    setMinSizeOverride(newPx);
    applyTunableOverride(typeId, 'minTargetScreenPx', newPx);
    setOverrides((prev) => {
      const all = normalizeOverrideMap(prev);
      const typeOvr = { ...(all[typeId] ?? {}) };
      typeOvr.minTargetScreenPx = newPx;
      return { ...all, [typeId]: typeOvr };
    });
  }

  function handleMinSizeReset() {
    setMinSizeOverride(undefined);
    restoreTunableDefault(typeId, 'minTargetScreenPx');
    setOverrides((prev) => {
      const all = normalizeOverrideMap(prev);
      const typeOvr = { ...(all[typeId] ?? {}) };
      delete typeOvr.minTargetScreenPx;
      const next = { ...all };
      if (Object.keys(typeOvr).length === 0) delete next[typeId];
      else next[typeId] = typeOvr;
      return next;
    });
  }

  function handleResetAll() {
    // Restore all tunable fields from snapshot
    for (const f of TUNABLE_FIELDS) restoreTunableDefault(typeId, f);
    // Reset min size state
    setMinSizeOverride(undefined);
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
    setText(
      Object.fromEntries(
        STANDARD_FIELDS.map((f) => {
          const val = CONFIG_SNAPSHOT[typeId][f];
          return [f, val !== undefined ? String(val) : ''];
        })
      )
    );
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

  const globalDefault =
    loadAutoScaleConfig().minTargetScreenPx ?? DEFAULT_AUTO_SCALE_CONFIG.minTargetScreenPx;
  const effectiveMinSize = minSizeOverride ?? globalDefault;
  const minSizeModified = minSizeOverride !== undefined;

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
          {STANDARD_FIELDS.map((fieldName) => {
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
                  <InfoTooltip text={meta.tooltip} />
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

          {/* ── Min Sprite Screen Size ── */}
          <div className={`${s.fieldRow}${minSizeModified ? ` ${s.fieldRowModified}` : ''}`}>
            <div className={s.labelRow}>
              <span className={s.fieldLabel}>Min Sprite Screen Size</span>
              <InfoTooltip text="Minimum on-screen diameter for this racer in pixels. On very large tracks the camera zooms out; this floor keeps the sprite visible. Camera zoom still makes it larger when nearby." />
              {minSizeModified && <span className={s.modifiedBadge}>modified</span>}
            </div>

            <div className={s.minSizeRow}>
              <input
                type="range"
                className={s.slider}
                min={8}
                max={120}
                step={4}
                value={effectiveMinSize}
                onChange={(e) => handleMinSizeChange(parseInt(e.target.value, 10))}
                aria-label="Min Sprite Screen Size"
              />
              <span className={s.sliderValue}>{effectiveMinSize}px</span>
              {minSizeModified && (
                <button
                  className={s.resetFieldBtn}
                  onClick={handleMinSizeReset}
                  title="Reset Min Sprite Screen Size to global default"
                >
                  Reset
                </button>
              )}
            </div>

            {!minSizeModified && (
              <span className={s.minSizeHint}>global default ({globalDefault}px)</span>
            )}

            <div className={s.minSizePreviewRow}>
              <MinSpriteSizePreview racerType={RACER_TYPES[typeId]} sizePx={effectiveMinSize} />
              <p className={s.minSizeDesc}>
                This is how small this racer will be on a busy track. Camera zoom makes it bigger
                during the race.
              </p>
            </div>
          </div>
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
