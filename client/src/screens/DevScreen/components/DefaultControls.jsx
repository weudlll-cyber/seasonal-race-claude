// ============================================================
// File:        DefaultControls.jsx
// Path:        client/src/screens/DevScreen/components/DefaultControls.jsx
// Project:     RaceArena
// Description: Shared admin-only row controls: set/clear default + export seed.
//              Used by TrackManager, BrandingProfiles, PlayerGroupsManager (L129).
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import s from '../DevScreen.module.css';

/**
 * @param {{ id: string, isDefault: boolean, onChanged: () => void,
 *            setDefault: (id: string) => Promise<unknown>,
 *            clearDefault: (id: string) => Promise<unknown>,
 *            exportSeed: (id: string) => Promise<unknown>,
 *            seedFilename?: string }} props
 */
export function DefaultControls({
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
      {isDefault ? (
        <button
          className={`${s.btn} ${s.btnGhost}`}
          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
          disabled={busy}
          onClick={handleClearDefault}
        >
          Default entfernen
        </button>
      ) : (
        <button
          className={`${s.btn} ${s.btnGhost}`}
          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
          disabled={busy}
          onClick={handleSetDefault}
        >
          Als Default setzen
        </button>
      )}
      <button
        className={`${s.btn} ${s.btnGhost}`}
        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
        disabled={busy}
        onClick={handleExportSeed}
      >
        Als Seed exportieren
      </button>
      {actionError && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{actionError}</span>}
    </>
  );
}
