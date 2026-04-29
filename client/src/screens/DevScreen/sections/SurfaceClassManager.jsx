// ============================================================
// File:        SurfaceClassManager.jsx
// Path:        client/src/screens/DevScreen/sections/SurfaceClassManager.jsx
// Project:     RaceArena
// Description: Surface-Class Editor — Dev-Screen section (VRE-2).
//              Master-Detail layout: left list of all classes (Default /
//              Modified / Custom badges), right editor + live canvas preview.
//              Save: POST for new custom classes, PUT for existing (isOverride:true
//              when editing a code-default). Reset-to-Default: DELETE the override.
//              No race integration — purely for class management.
// ============================================================

import { useState, useEffect } from 'react';
import { useSurfaceClasses } from '../../../modules/surface-effects/useSurfaceClasses.js';
import { GENERATORS } from '../../../modules/surface-effects/registry.js';
import {
  createSurfaceClass,
  updateSurfaceClass,
  deleteSurfaceClass,
} from '../../../services/surfaceClassApi.js';
import { SurfaceClassPreview } from './SurfaceClassPreview.jsx';
import s from '../DevScreen.module.css';

const ID_RE = /^[a-z0-9_-]+$/;

const GENERATOR_OPTIONS = Object.values(GENERATORS).map((g) => ({ id: g.id, label: g.label }));

// ── Badge helpers ─────────────────────────────────────────────────────────────

function classKind(cls) {
  if (cls.isOverride) return 'modified';
  if (cls.isDefault) return 'default';
  return 'custom';
}

function KindBadge({ kind }) {
  const styles = {
    default: { color: 'var(--color-muted)', border: '1px solid #2a2a35' },
    modified: {
      color: '#f4a261',
      border: '1px solid #f4a261',
      background: 'rgba(244,162,97,0.08)',
    },
    custom: { color: '#4cc9f0', border: '1px solid #4cc9f0', background: 'rgba(76,201,240,0.08)' },
  };
  const labels = { default: 'Default', modified: 'Modified', custom: 'Custom' };
  return (
    <span
      style={{
        fontSize: '0.62rem',
        fontWeight: 700,
        padding: '0.1rem 0.4rem',
        borderRadius: 99,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        ...styles[kind],
      }}
    >
      {labels[kind]}
    </span>
  );
}

// ── Config field editor ───────────────────────────────────────────────────────

function ConfigFields({ schema, config, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {schema.map((field) => {
        const value = config[field.key] ?? field.default;
        return (
          <div key={field.key} className={s.formGroup}>
            <label className={s.label}>{field.label}</label>

            {field.type === 'color' && (
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={typeof value === 'string' && value.startsWith('#') ? value : '#888888'}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  aria-label={`${field.label} color picker`}
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
                  value={value}
                  maxLength={7}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  aria-label={`${field.label} hex`}
                />
              </div>
            )}

            {field.type === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={value}
                  onChange={(e) => onChange(field.key, parseFloat(e.target.value))}
                  aria-label={field.label}
                  style={{ flex: 1 }}
                />
                <span
                  style={{
                    minWidth: '3.2rem',
                    textAlign: 'right',
                    fontSize: '0.82rem',
                    color: 'var(--color-text)',
                  }}
                >
                  {value}
                </span>
              </div>
            )}

            {field.type === 'select' && (
              <select
                className={s.select}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                aria-label={field.label}
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

function SurfaceClassManager() {
  const { classes, refresh, isLoading, error: fetchError } = useSurfaceClasses();

  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  // draft: { label, id, generatorId, config }
  const [draft, setDraft] = useState(null);
  const [idError, setIdError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first class once classes are loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedId && !isNew) {
      openClass(classes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length]);

  function openClass(cls) {
    setSelectedId(cls.id);
    setIsNew(false);
    setDraft({
      label: cls.label,
      id: cls.id,
      generatorId: cls.generatorId,
      config: { ...cls.config },
    });
    setSaveError(null);
    setIdError(null);
  }

  function handleNewClass() {
    const defaultGen = GENERATORS.particle;
    setIsNew(true);
    setSelectedId(null);
    setDraft({
      label: '',
      id: '',
      generatorId: 'particle',
      config: { ...defaultGen.defaultConfig },
    });
    setSaveError(null);
    setIdError(null);
  }

  function handleCancel() {
    setSaveError(null);
    setIdError(null);
    if (isNew) {
      setIsNew(false);
      const fallback = classes[0];
      if (fallback) openClass(fallback);
      else setDraft(null);
    } else if (selectedId) {
      const cls = classes.find((c) => c.id === selectedId);
      if (cls) openClass(cls);
    }
  }

  function handleGeneratorChange(newGenId) {
    const gen = GENERATORS[newGenId];
    if (!gen) return;
    setDraft((prev) => ({ ...prev, generatorId: newGenId, config: { ...gen.defaultConfig } }));
  }

  function handleConfigChange(key, value) {
    setDraft((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  }

  async function handleSave() {
    if (!draft || isSaving) return;
    setSaveError(null);
    setIdError(null);

    // Validate label
    if (!draft.label.trim()) {
      setSaveError('Label is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        // Validate ID
        if (!draft.id || !ID_RE.test(draft.id)) {
          setIdError('ID must be lowercase letters, digits, hyphens or underscores');
          setIsSaving(false);
          return;
        }
        const allIds = new Set(classes.map((c) => c.id));
        if (allIds.has(draft.id)) {
          setIdError('ID already exists');
          setIsSaving(false);
          return;
        }
        await createSurfaceClass({
          id: draft.id,
          label: draft.label.trim(),
          generatorId: draft.generatorId,
          config: draft.config,
          isOverride: false,
        });
        const newId = draft.id;
        await refresh();
        setIsNew(false);
        setSelectedId(newId);
      } else {
        // Editing existing: for code-defaults and existing overrides, PUT with isOverride:true
        const cls = classes.find((c) => c.id === selectedId);
        const isOverride = cls?.isDefault === true || cls?.isOverride === true;
        await updateSurfaceClass(selectedId, {
          id: selectedId,
          label: draft.label.trim(),
          generatorId: draft.generatorId,
          config: draft.config,
          isOverride,
        });
        await refresh();
      }
    } catch (e) {
      setSaveError(e.message ?? 'Server not reachable — make sure docker compose is running');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || isSaving) return;
    const cls = classes.find((c) => c.id === selectedId);
    if (!cls || classKind(cls) !== 'custom') return;
    if (!window.confirm(`Delete custom class "${cls.label}"? This cannot be undone.`)) return;

    try {
      await deleteSurfaceClass(selectedId);
      await refresh();
      setSelectedId(null);
      setDraft(null);
    } catch (e) {
      setSaveError(e.message ?? 'Server error');
    }
  }

  async function handleResetToDefault() {
    if (!selectedId || isSaving) return;
    const cls = classes.find((c) => c.id === selectedId);
    if (!cls || classKind(cls) !== 'modified') return;
    if (!window.confirm(`Reset "${cls.label}" to code default? The override will be removed.`))
      return;

    try {
      await deleteSurfaceClass(selectedId);
      await refresh();
      // Class still exists as code-default — reselect it
      const fresh = listAllSurfaceClassesAfterRefresh(selectedId);
      if (fresh) openClass(fresh);
    } catch (e) {
      setSaveError(e.message ?? 'Server error');
    }
  }

  // Helper: after refresh, get the current state of a class by id
  function listAllSurfaceClassesAfterRefresh(_id) {
    // classes state hasn't updated yet (it'll update async via refresh).
    // Return null; the useEffect above will auto-select after re-render.
    return null;
  }

  // Derived state
  const selectedClass = selectedId ? classes.find((c) => c.id === selectedId) : null;
  const kind = selectedClass ? classKind(selectedClass) : null;

  const configSchema = draft ? (GENERATORS[draft.generatorId]?.configSchema ?? []) : [];

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
      {/* ── Left column: class list ── */}
      <div
        style={{
          width: 210,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div className={s.card} style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Classes <span className={s.badge}>{classes.length}</span>
            </span>
          </div>

          {isLoading && classes.length === 0 && (
            <p className={s.emptyState} style={{ padding: '1rem 0' }}>
              Loading…
            </p>
          )}

          {fetchError && (
            <p style={{ fontSize: '0.75rem', color: '#e63946', marginBottom: '0.5rem' }}>
              {fetchError}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {classes.map((cls) => {
              const active = !isNew && selectedId === cls.id;
              const kind = classKind(cls);
              return (
                <button
                  key={cls.id}
                  onClick={() => openClass(cls)}
                  aria-pressed={active}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.45rem 0.65rem',
                    background: active ? 'rgba(230,57,70,0.12)' : '#0d0d0f',
                    border: `1px solid ${active ? 'var(--color-primary)' : '#2a2a35'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    {cls.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{ fontSize: '0.68rem', color: 'var(--color-muted)', flexShrink: 0 }}
                    >
                      {cls.id}
                    </span>
                    <KindBadge kind={kind} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className={`${s.btn} ${isNew ? s.btnPrimary : s.btnGhost}`}
          onClick={handleNewClass}
          style={{ width: '100%' }}
          aria-label="New Surface Class"
        >
          + New Surface Class
        </button>
      </div>

      {/* ── Right column: preview + editor ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {draft ? (
          <>
            {/* Live Preview */}
            <div className={s.card}>
              <div className={s.label} style={{ marginBottom: '0.5rem' }}>
                Live Preview
                <span
                  style={{
                    marginLeft: '0.5rem',
                    color: 'var(--color-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  — effect updates as you change settings below
                </span>
              </div>
              <SurfaceClassPreview generatorId={draft.generatorId} config={draft.config} />
            </div>

            {/* Editor */}
            <div className={s.card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {isNew ? 'New Surface Class' : draft.label || selectedId}
                </span>
                {kind && <KindBadge kind={kind} />}
              </div>

              <div className={s.formGrid}>
                {/* Label */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="sc-label">
                    Label
                  </label>
                  <input
                    id="sc-label"
                    className={s.input}
                    placeholder="e.g. Lava"
                    maxLength={40}
                    value={draft.label}
                    onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                  />
                </div>

                {/* ID */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="sc-id">
                    ID
                    {!isNew && (
                      <span
                        style={{
                          marginLeft: '0.35rem',
                          color: 'var(--color-muted)',
                          fontWeight: 400,
                          textTransform: 'none',
                          letterSpacing: 0,
                        }}
                      >
                        (read-only)
                      </span>
                    )}
                  </label>
                  <input
                    id="sc-id"
                    className={`${s.input}${idError ? ' ' + s.inputError : ''}`}
                    placeholder="e.g. lava"
                    maxLength={40}
                    value={draft.id}
                    readOnly={!isNew}
                    onChange={
                      isNew
                        ? (e) => {
                            setIdError(null);
                            setDraft((p) => ({ ...p, id: e.target.value }));
                          }
                        : undefined
                    }
                    style={!isNew ? { opacity: 0.5, cursor: 'default' } : undefined}
                    aria-label="Surface class ID"
                  />
                  {idError && (
                    <span style={{ fontSize: '0.72rem', color: '#e63946', marginTop: '0.1rem' }}>
                      {idError}
                    </span>
                  )}
                </div>

                {/* Generator */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="sc-generator">
                    Generator
                  </label>
                  <select
                    id="sc-generator"
                    className={s.select}
                    value={draft.generatorId}
                    onChange={(e) => handleGeneratorChange(e.target.value)}
                    aria-label="Generator type"
                  >
                    {GENERATOR_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generator config fields */}
              {configSchema.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div className={s.label} style={{ marginBottom: '0.6rem' }}>
                    Generator Settings
                  </div>
                  <ConfigFields
                    schema={configSchema}
                    config={draft.config}
                    onChange={handleConfigChange}
                  />
                </div>
              )}

              {/* Actions */}
              <div className={s.btnRow} style={{ marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-label="Save surface class"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                {kind === 'custom' && (
                  <button
                    className={`${s.btn} ${s.btnDanger}`}
                    onClick={handleDelete}
                    disabled={isSaving}
                    aria-label="Delete surface class"
                  >
                    Delete
                  </button>
                )}
                {kind === 'modified' && (
                  <button
                    className={`${s.btn} ${s.btnGhost}`}
                    onClick={handleResetToDefault}
                    disabled={isSaving}
                    title="Remove the backend override — class reverts to code default"
                    aria-label="Reset to default"
                  >
                    Reset to Default
                  </button>
                )}
              </div>

              {saveError && (
                <p
                  role="alert"
                  style={{ fontSize: '0.78rem', color: '#e63946', marginTop: '0.65rem' }}
                >
                  {saveError}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className={s.card}>
            <p className={s.emptyState}>
              {isLoading
                ? 'Loading surface classes…'
                : 'Select a class from the list or create a new one.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SurfaceClassManager;
