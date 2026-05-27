// ============================================================
// File:        AnimationControls.jsx
// Path:        client/src/screens/RacerEditor/AnimationControls.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Animation type selector (primary + add-ons), per-animation
//              intensity sliders, frame count, basePeriodMs, and rotation
//              offset. Pure presentation — all state lifted to parent.
// ============================================================

import {
  PRIMARY_TYPES,
  FRAME_COUNT_OPTIONS,
  PRIMARY_PERIOD_DEFAULTS,
} from '../../modules/racer-types/spriteAnimations.js';
import s from './RacerEditor.module.css';

const PRIMARY_LABELS = {
  wobble: 'Lateral wobble',
  bounce: 'Bounce',
  breathing: 'Breathing',
  spin: 'Subtle spin',
  pulse: 'Pulse',
  drift: 'Drift',
  rumble: 'Rumble',
};

export function AnimationControls({ animConfig, onChange }) {
  function set(patch) {
    onChange({ ...animConfig, ...patch });
  }

  function setPrimary(type) {
    onChange({
      ...animConfig,
      primaryType: type,
      basePeriodMs: PRIMARY_PERIOD_DEFAULTS[type] ?? 700,
    });
  }

  function setAddon(key, value) {
    set({ addons: { ...animConfig.addons, [key]: value } });
  }

  const { primaryType, addons = {} } = animConfig;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Primary animation type */}
      <div>
        <div className={s.sectionLabel}>Primary Animation</div>
        <div className={s.animPills}>
          {PRIMARY_TYPES.map((type) => (
            <button
              key={type}
              className={`${s.animPill} ${primaryType === type ? s.animPillActive : ''}`}
              onClick={() => setPrimary(type)}
            >
              {PRIMARY_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Per-type amplitude sliders */}
      {primaryType === 'wobble' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>0.05 – 0.25 rad</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.05}
              max={0.25}
              step={0.01}
              value={animConfig.wobbleAmplitude ?? 0.12}
              onChange={(e) => set({ wobbleAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.wobbleAmplitude ?? 0.12).toFixed(2)}</span>
          </div>
        </div>
      )}

      {primaryType === 'bounce' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>0.1 – 1.0</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.1}
              max={1.0}
              step={0.05}
              value={animConfig.bounceAmplitude ?? 0.5}
              onChange={(e) => set({ bounceAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.bounceAmplitude ?? 0.5).toFixed(2)}</span>
          </div>
        </div>
      )}

      {primaryType === 'pulse' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>0.05 – 0.30</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.05}
              max={0.3}
              step={0.01}
              value={animConfig.pulseAmplitude ?? 0.15}
              onChange={(e) => set({ pulseAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.pulseAmplitude ?? 0.15).toFixed(2)}</span>
          </div>
        </div>
      )}

      {primaryType === 'drift' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>2 – 16 px</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={2}
              max={16}
              step={1}
              value={animConfig.driftAmplitude ?? 6}
              onChange={(e) => set({ driftAmplitude: parseInt(e.target.value, 10) })}
            />
            <span className={s.sliderValue}>{animConfig.driftAmplitude ?? 6} px</span>
          </div>
        </div>
      )}

      {primaryType === 'rumble' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>1 – 8 px</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={1}
              max={8}
              step={0.5}
              value={animConfig.rumbleAmplitude ?? 3}
              onChange={(e) => set({ rumbleAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.rumbleAmplitude ?? 3).toFixed(1)} px</span>
          </div>
        </div>
      )}

      {primaryType === 'breathing' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>0.02 – 0.10</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.02}
              max={0.1}
              step={0.01}
              value={animConfig.breathingAmplitude ?? 0.05}
              onChange={(e) => set({ breathingAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>
              {(animConfig.breathingAmplitude ?? 0.05).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {primaryType === 'spin' && (
        <div className={s.formGroup}>
          <label className={s.label}>
            Amplitude <span className={s.labelNote}>0.05 – 0.15 rad</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={0.05}
              max={0.15}
              step={0.01}
              value={animConfig.spinAmplitude ?? 0.1}
              onChange={(e) => set({ spinAmplitude: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.spinAmplitude ?? 0.1).toFixed(2)}</span>
          </div>
        </div>
      )}

      <hr className={s.divider} />

      {/* Add-ons */}
      <div>
        <div className={s.sectionLabel}>Add-ons</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className={s.addonRow}>
            <div>
              <div className={s.addonLabel}>Tail / leg wiggle</div>
              <div className={s.addonDesc}>Bottom 35% shears horizontally</div>
            </div>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={!!addons.tailWiggle}
                onChange={(e) => setAddon('tailWiggle', e.target.checked)}
              />
              <span className={s.toggleSlider} />
            </label>
          </div>

          {addons.tailWiggle && (
            <div className={s.formGroup} style={{ paddingLeft: '0.5rem' }}>
              <label className={s.label}>
                Wiggle amplitude <span className={s.labelNote}>0.05 – 0.20</span>
              </label>
              <div className={s.sliderRow}>
                <input
                  type="range"
                  className={s.slider}
                  min={0.05}
                  max={0.2}
                  step={0.01}
                  value={animConfig.tailAmplitude ?? 0.12}
                  onChange={(e) => set({ tailAmplitude: parseFloat(e.target.value) })}
                />
                <span className={s.sliderValue}>
                  {(animConfig.tailAmplitude ?? 0.12).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className={s.addonRow}>
            <div>
              <div className={s.addonLabel}>Shadow pulse</div>
              <div className={s.addonDesc}>Ellipse under sprite, synced to animation</div>
            </div>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={!!addons.shadowPulse}
                onChange={(e) => setAddon('shadowPulse', e.target.checked)}
              />
              <span className={s.toggleSlider} />
            </label>
          </div>
        </div>
      </div>

      <hr className={s.divider} />

      {/* Frame count + speed */}
      <div className={s.formGrid}>
        <div className={s.formGroup}>
          <div className={s.sectionLabel}>Frames</div>
          <div className={s.framePills}>
            {FRAME_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                className={`${s.framePill} ${animConfig.frameCount === n ? s.framePillActive : ''}`}
                onClick={() => set({ frameCount: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className={s.formGroup}>
          <label className={s.label}>
            Cycle speed <span className={s.labelNote}>ms</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={200}
              max={2000}
              step={50}
              value={animConfig.basePeriodMs ?? 700}
              onChange={(e) => set({ basePeriodMs: parseInt(e.target.value, 10) })}
            />
            <span className={s.sliderValue}>{animConfig.basePeriodMs ?? 700}</span>
          </div>
        </div>

        <div className={`${s.formGroup} ${s.formGroupFull}`}>
          <label className={s.label}>
            Rotation offset <span className={s.labelNote}>−π to π (0 = sprite faces right)</span>
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={-Math.PI}
              max={Math.PI}
              step={0.05}
              value={animConfig.baseRotationOffset ?? 0}
              onChange={(e) => set({ baseRotationOffset: parseFloat(e.target.value) })}
            />
            <span className={s.sliderValue}>{(animConfig.baseRotationOffset ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
