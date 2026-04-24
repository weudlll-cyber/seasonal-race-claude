import { listEffects, getEffect, getDefaultConfig } from '../../modules/track-effects/index.js';
import s from './EffectConfig.module.css';

export default function EffectConfig({ effects, onChange, max = 3 }) {
  const allEffects = listEffects();
  const usedIds = effects.map((e) => e.id).filter(Boolean);

  function handleIdChange(idx, newId) {
    onChange(
      effects.map((e, i) =>
        i === idx ? { id: newId || null, config: newId ? (getDefaultConfig(newId) ?? {}) : {} } : e
      )
    );
  }

  function handleFieldChange(idx, key, value) {
    onChange(
      effects.map((e, i) => (i === idx ? { ...e, config: { ...e.config, [key]: value } } : e))
    );
  }

  function handleRemove(idx) {
    onChange(effects.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    if (effects.length >= max) return;
    onChange([...effects, { id: null, config: {} }]);
  }

  function renderField(entry, idx, field) {
    const value = entry.config[field.key] ?? field.default;
    switch (field.type) {
      case 'range':
        return (
          <div key={field.key} className={s.field}>
            <label className={s.label}>
              {field.label} <span className={s.value}>{value}</span>
            </label>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              className={s.range}
              onChange={(e) => handleFieldChange(idx, field.key, parseFloat(e.target.value))}
            />
          </div>
        );
      case 'color':
        return (
          <div key={field.key} className={s.field}>
            <label className={s.label}>{field.label}</label>
            <input
              type="color"
              value={value}
              className={s.color}
              onChange={(e) => handleFieldChange(idx, field.key, e.target.value)}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.key} className={s.field}>
            <label className={s.label}>{field.label}</label>
            <select
              className={s.select}
              value={value}
              onChange={(e) => handleFieldChange(idx, field.key, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      default:
        console.warn(`[EffectConfig] Unknown field type: ${field.type}`);
        return null;
    }
  }

  return (
    <div className={s.root}>
      {effects.map((entry, idx) => {
        const schema = entry.id ? (getEffect(entry.id)?.configSchema ?? []) : [];
        const available = allEffects.filter((e) => !usedIds.includes(e.id) || e.id === entry.id);
        return (
          <div key={idx} className={s.block}>
            <div className={s.blockHeader}>
              <span className={s.blockLabel}>Effect {idx + 1}</span>
              <select
                className={s.select}
                value={entry.id ?? ''}
                onChange={(e) => handleIdChange(idx, e.target.value)}
              >
                <option value="">None</option>
                {available.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
              <button className={s.removeBtn} onClick={() => handleRemove(idx)} title="Remove">
                ×
              </button>
            </div>
            {entry.id && (
              <div className={s.fields}>{schema.map((f) => renderField(entry, idx, f))}</div>
            )}
          </div>
        );
      })}
      {effects.length < max && (
        <button className={s.addBtn} onClick={handleAdd}>
          + Add Effect
        </button>
      )}
    </div>
  );
}
