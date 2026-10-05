// ============================================================
// File:        AutoScaleSection.jsx
// Path:        client/src/screens/DevScreen/sections/AutoScaleSection.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Dev-Screen tuning UI for the auto-sprite-scale feature (D10).
//              Follows the D3.5.5 pattern: live-apply on valid change, reset
//              to defaults, InfoTooltip for non-obvious fields.
// ============================================================

import { useState } from 'react';
import RangeRejectionNotice from './RangeRejectionNotice.jsx';
import {
  loadAutoScaleConfig,
  saveAutoScaleConfig,
  DEFAULT_AUTO_SCALE_CONFIG,
  computeAutoScaleFactor,
} from '../../../modules/autoSpriteScale.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { Ctl, Info } from './ControlInfo.jsx';
import { KEYS } from '../../../modules/storage/storage.js';
import { useSyncedConfig } from './useSyncedConfig.js';
import s from '../DevScreen.module.css';

function AutoScaleSection() {
  // ★ POLISH-3f: what was rejected, so a typed value that does nothing says why.
  const [rejected, setRejected] = useState(null);
  // Synced, so the race chapter's master reset (which writes storage directly) shows here at once.
  const [config, setConfig] = useSyncedConfig(
    KEYS.AUTO_SCALE_CONFIG,
    loadAutoScaleConfig,
    saveAutoScaleConfig
  );
  const [previewRacers, setPreviewRacers] = useState(6);
  const [previewWidth, setPreviewWidth] = useState(140);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_AUTO_SCALE_CONFIG });
  }

  const previewFactor = config.enabled
    ? computeAutoScaleFactor(previewWidth, previewRacers, config)
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Auto-Sprite-Scaling</span>
          <InfoTooltip text="When enabled, racer display size is automatically scaled based on track width and racer count. Formula: clamp((trackWidth / racerCount) / referenceValue, minScale, maxScale). Operator overrides from the Racer Types editor always take priority." />
          <span className={s.spacer} />
          <Ctl id="AutoScaleSection:handleReset">
            <button
              className={`${s.btn} ${s.btnGhost}`}
              onClick={handleReset}
              style={{ fontSize: '0.75rem' }}
            >
              Reset Defaults
            </button>
          </Ctl>
        </div>

        <div className={s.formGrid}>
          <div className={s.formGroupFull} data-control-id="AutoScaleSection:enabled">
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Enabled
              <Info id="AutoScaleSection:enabled" />
            </label>
          </div>

          <div
            className={s.formGroup}
            style={{ opacity: config.enabled ? 1 : 0.45 }}
            data-control-id="AutoScaleSection:referenceValue"
          >
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Reference Value
              <Info id="AutoScaleSection:referenceValue" />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={200}
              step={1}
              value={config.referenceValue}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('referenceValue', v);
              }}
            />
          </div>

          <div
            className={s.formGroup}
            style={{ opacity: config.enabled ? 1 : 0.45 }}
            data-control-id="AutoScaleSection:minScale"
          >
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Scale
              <Info id="AutoScaleSection:minScale" />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.1}
              max={1}
              step={0.05}
              value={config.minScale}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < config.maxScale) {
                  set('minScale', v);
                  setRejected(null);
                } else {
                  setRejected(
                    `Minimum scale ${v} was not applied — it must be above 0 and below the maximum (${config.maxScale}).`
                  );
                }
              }}
            />
          </div>

          <div
            className={s.formGroup}
            style={{ opacity: config.enabled ? 1 : 0.45 }}
            data-control-id="AutoScaleSection:maxScale"
          >
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Scale
              <Info id="AutoScaleSection:maxScale" />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={5}
              step={0.1}
              value={config.maxScale}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > config.minScale) {
                  set('maxScale', v);
                  setRejected(null);
                } else {
                  setRejected(
                    `Maximum scale ${v} was not applied — it must be above the minimum (${config.minScale}).`
                  );
                }
              }}
            />
          </div>
          <div
            className={s.formGroup}
            style={{ opacity: config.enabled ? 1 : 0.45 }}
            data-control-id="AutoScaleSection:minTargetScreenPx"
          >
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Size floor — every racer type
              <Info id="AutoScaleSection:minTargetScreenPx" />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Size floor — every racer type"
              min={8}
              max={120}
              step={4}
              value={config.minTargetScreenPx}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('minTargetScreenPx', v);
              }}
            />
          </div>
        </div>
        <RangeRejectionNotice message={rejected} testId="autoscale-range-rejection" />
      </div>

      {/* Live preview */}
      <div className={s.card} style={{ opacity: config.enabled ? 1 : 0.45 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Formula Preview
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup} data-control-id="AutoScaleSection:setPreviewWidth">
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Track Width (px)
              <Info id="AutoScaleSection:setPreviewWidth" />
            </label>
            <input
              type="number"
              className={s.input}
              min={50}
              max={2000}
              step={10}
              value={previewWidth}
              onChange={(e) => setPreviewWidth(Number(e.target.value))}
            />
          </div>
          <div className={s.formGroup} data-control-id="AutoScaleSection:setPreviewRacers">
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Racer Count
              <Info id="AutoScaleSection:setPreviewRacers" />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={50}
              step={1}
              value={previewRacers}
              onChange={(e) => setPreviewRacers(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
          clamp({previewWidth} / {previewRacers} / {config.referenceValue}, {config.minScale},{' '}
          {config.maxScale}) ={' '}
          <strong
            style={{ color: previewFactor === 1 ? 'var(--color-muted)' : 'var(--color-accent)' }}
          >
            {previewFactor.toFixed(3)}×
          </strong>
        </p>
      </div>
    </div>
  );
}

export default AutoScaleSection;
