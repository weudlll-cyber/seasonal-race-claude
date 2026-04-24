import { listEffects, getEffect, getDefaultConfig } from '../../modules/track-effects/index.js';
import s from './EffectConfig.module.css';

export default function EffectConfig({ effectId, config, onChange }) {
  const effects = listEffects();

  function renderControl(field) {
    const value = config[field.key] ?? field.default;
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
              onChange={(e) =>
                onChange(effectId, { ...config, [field.key]: parseFloat(e.target.value) })
              }
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
              onChange={(e) => onChange(effectId, { ...config, [field.key]: e.target.value })}
            />
          </div>
        );
      default:
        console.warn(`[EffectConfig] Unknown field type: ${field.type}`);
        return null;
    }
  }

  const schema = effectId ? (getEffect(effectId)?.configSchema ?? []) : [];

  return (
    <div className={s.root}>
      <select
        className={s.select}
        value={effectId ?? ''}
        onChange={(e) => {
          const newId = e.target.value || null;
          onChange(newId, getDefaultConfig(newId) ?? {});
        }}
      >
        <option value="">None</option>
        {effects.map((effect) => (
          <option key={effect.id} value={effect.id}>
            {effect.label}
          </option>
        ))}
      </select>
      {effectId && schema.map(renderControl)}
    </div>
  );
}
