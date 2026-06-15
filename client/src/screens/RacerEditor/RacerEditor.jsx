// ============================================================
// File:        RacerEditor.jsx
// Path:        client/src/screens/RacerEditor/RacerEditor.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Full-screen racer type editor. Left column: sprite generator
//              (PNG upload + animation preview + controls). Right column:
//              racer metadata (name, speed, trail, etc.).
//              On save: calls registerRacerType() and navigates to SetupScreen.
//              Edit mode: ?id=<typeId> pre-fills fields from stored config.
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  registerRacerType,
  RACER_TYPE_IDS,
  listAllRacerTypes,
  getRacerType,
} from '../../modules/racer-types/index.js';
import { STANDARD_COAT_PALETTE } from '../../modules/racer-types/standardCoats.js';
import { slugify, uniqueSlug } from '../../utils/slugify.js';
import { SpriteGeneratorPanel } from './SpriteGeneratorPanel.jsx';
import { RacerMetadataPanel } from './RacerMetadataPanel.jsx';
import s from './RacerEditor.module.css';

const DEFAULT_ANIM = {
  primaryType: 'bounce',
  wobbleAmplitude: 0.12,
  bounceAmplitude: 0.5,
  breathingAmplitude: 0.05,
  spinAmplitude: 0.1,
  pulseAmplitude: 0.15,
  driftAmplitude: 6,
  rumbleAmplitude: 3,
  addons: { tailWiggle: false, shadowPulse: false },
  tailAmplitude: 0.12,
  frameCount: 8,
  basePeriodMs: 600,
  baseRotationOffset: 0,
};

const DEFAULT_METADATA = {
  name: '',
  emoji: '',
  speedMultiplier: 1.0,
  displaySize: 40,
  trailStyle: 'dust',
  surfaceClasses: [],
  primaryColor: '#4488ff',
};

function loadEditState(editId) {
  if (!editId) return null;
  if (RACER_TYPE_IDS.includes(editId)) return null;
  const type = getRacerType(editId);
  if (!type || type.config.id !== editId) return null;
  const cfg = type.config;
  return {
    anim: {
      ...DEFAULT_ANIM,
      frameCount: cfg.frameCount ?? DEFAULT_ANIM.frameCount,
      basePeriodMs: cfg.basePeriodMs ?? DEFAULT_ANIM.basePeriodMs,
      baseRotationOffset: cfg.baseRotationOffset ?? 0,
    },
    metadata: {
      name: cfg.name ?? '',
      emoji: cfg.emoji ?? '',
      speedMultiplier: cfg.speedMultiplier ?? 1.0,
      displaySize: cfg.displaySize ?? 40,
      trailStyle: cfg.trailStyle ?? 'dust',
      surfaceClasses: Array.isArray(cfg.surfaceClasses) ? cfg.surfaceClasses : [],
      primaryColor: cfg.primaryColor ?? '#4488ff',
    },
    spriteDataUrl: cfg.spriteUrl ?? null,
    tintMode: cfg.tintMode ?? 'auto',
  };
}

function RacerEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id') ?? null;

  const editState = useCallback(() => loadEditState(editId), [editId])();

  const [animConfig, setAnimConfig] = useState(editState?.anim ?? DEFAULT_ANIM);
  const [metadata, setMetadata] = useState(editState?.metadata ?? DEFAULT_METADATA);
  const [spriteDataUrl, setSpriteDataUrl] = useState(editState?.spriteDataUrl ?? null);
  const [tintMode, setTintMode] = useState(editState?.tintMode ?? 'auto');
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = !!spriteDataUrl && !!metadata.name.trim();

  const handleSpriteDataUrl = useCallback((url) => {
    setSpriteDataUrl(url);
  }, []);

  const handleTintModeChange = useCallback((mode) => {
    setTintMode(mode);
  }, []);

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);

    let id;
    if (editId) {
      id = editId;
    } else {
      const base = slugify(metadata.name.trim()) || 'racer';
      const existingIds = new Set(listAllRacerTypes().map((t) => t.id));
      id = uniqueSlug(base, existingIds);
    }

    try {
      await registerRacerType({
        id,
        name: metadata.name.trim(),
        emoji: metadata.emoji,
        spriteDataUrl,
        frameCount: animConfig.frameCount,
        basePeriodMs: animConfig.basePeriodMs,
        displaySize: metadata.displaySize,
        trailStyle: metadata.trailStyle,
        coats: [...STANDARD_COAT_PALETTE],
        defaultCoatId: STANDARD_COAT_PALETTE[0].id,
        primaryColor: metadata.primaryColor,
        speedMultiplier: metadata.speedMultiplier,
        baseRotationOffset: animConfig.baseRotationOffset,
        surfaceClasses: metadata.surfaceClasses,
        tintMode,
      });
      navigate('/setup');
    } catch (err) {
      setSaveError(err.message);
      setIsSaving(false);
    }
  }

  return (
    <div className={s.screen}>
      <header className={s.header}>
        <h1 className={s.title}>🐾 Racer Editor</h1>
        <p className={s.subtitle}>
          {editId
            ? `Editing type "${editId}"`
            : 'Design a new racer type with custom sprite animation'}
        </p>
      </header>

      <div className={s.columns}>
        <SpriteGeneratorPanel
          animConfig={animConfig}
          onAnimConfigChange={setAnimConfig}
          onSpriteDataUrl={handleSpriteDataUrl}
          initialSpriteDataUrl={editState?.spriteDataUrl ?? null}
          tintMode={tintMode}
          onTintModeChange={handleTintModeChange}
        />
        <RacerMetadataPanel metadata={metadata} onMetadataChange={setMetadata} editId={editId} />
      </div>

      {saveError && <p className={s.error}>{saveError}</p>}

      <footer className={s.footer}>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={!canSave || isSaving}
          onClick={handleSave}
          title={!canSave ? 'Upload a sprite and enter a name first' : undefined}
        >
          {isSaving ? 'Saving…' : editId ? 'Update Racer' : 'Save Racer'}
        </button>
        <button className={`${s.btn} ${s.btnGhost}`} onClick={() => navigate(-1)}>
          Cancel
        </button>
      </footer>
    </div>
  );
}

export default RacerEditor;
