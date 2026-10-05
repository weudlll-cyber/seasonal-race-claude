// ============================================================
// File:        DefaultControls.jsx
// Path:        client/src/screens/DevScreen/components/DefaultControls.jsx
// Project:     RaceArena
// Description: Shared admin-only row controls: set/clear default + export seed. Labels in
//              English since DEVSCREEN-CHAPTERS-1 (they were German).
//              Used by TrackManager, BrandingProfiles, PlayerGroupsManager (L129).
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { Ctl } from '../sections/ControlInfo.jsx';
import s from '../DevScreen.module.css';

/**
 * @param {{ id: string, isDefault: boolean, onChanged: () => void,
 *            setDefault: (id: string) => Promise<unknown>,
 *            clearDefault: (id: string) => Promise<unknown>,
 *            exportSeed: (id: string) => Promise<unknown>,
 *            seedFilename?: string, controlSection: string }} props
 *   controlSection — the section file these buttons sit in (control ids "<section>:handleSetDefault"
 *   and "<section>:handleExportSeed", DEVSCREEN-CHAPTERS-1); each section has its own info texts.
 */
export function DefaultControls({
  controlSection,
  id,
  isDefault,
  onChanged,
  setDefault,
  clearDefault,
  exportSeed,
  seedFilename,
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (user?.role !== 'admin') return null;

  async function handleSetDefault() {
    setBusy(true);
    setActionError(null);
    try {
      await setDefault(id);
      await onChanged();
    } catch (err) {
      setActionError(err.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearDefault() {
    setBusy(true);
    setActionError(null);
    try {
      await clearDefault(id);
      await onChanged();
    } catch (err) {
      setActionError(err.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleExportSeed() {
    setBusy(true);
    setActionError(null);
    try {
      const seed = await exportSeed(id);
      const blob = new Blob([JSON.stringify(seed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = seedFilename || `seed-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err.message ?? 'Failed to export');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Set and remove are one control: the button shows whichever applies to this entry. */}
      <Ctl id={`${controlSection}:handleSetDefault`}>
        {isDefault ? (
          <button
            className={`${s.btn} ${s.btnGhost}`}
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            disabled={busy}
            onClick={handleClearDefault}
          >
            Remove default
          </button>
        ) : (
          <button
            className={`${s.btn} ${s.btnGhost}`}
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            disabled={busy}
            onClick={handleSetDefault}
          >
            Set as default
          </button>
        )}
      </Ctl>
      <Ctl id={`${controlSection}:handleExportSeed`}>
        <button
          className={`${s.btn} ${s.btnGhost}`}
          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
          disabled={busy}
          onClick={handleExportSeed}
        >
          Export as seed
        </button>
      </Ctl>
      {actionError && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{actionError}</span>}
    </>
  );
}
