// ============================================================
// File:        SystemSettings.jsx
// Path:        client/src/screens/DevScreen/sections/SystemSettings.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Export/import/reset of the settings THIS BROWSER stores, and app version info.
//              Not a data backup: the server's data is backed up by `npm run backup`.
// ============================================================

import { useRef, version as reactVersion } from 'react';
import {
  exportAllStorage,
  exportDiagnosticSnapshot,
  importAllStorage,
  clearAllStorage,
} from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS, DEFAULT_RACE_HISTORY } from '../../../modules/storage/defaults.js';
import { KEYS, storageSet } from '../../../modules/storage/storage.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { Ctl } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

const APP_VERSION = '0.1.0';

function SystemSettings() {
  const importRef = useRef(null);

  function handleExport() {
    const data = exportAllStorage();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `racearena-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importAllStorage(data);
        window.alert('Settings imported successfully. The page will reload.');
        window.location.reload();
      } catch {
        window.alert('Invalid backup file — could not parse JSON.');
      }
    };
    // A READ THAT FAILS MUST NOT BE SILENT. Without this the promise simply never resolves: no
    // alert, no reload, no error — the operator clicks Import and nothing whatever happens, which
    // is indistinguishable from the button being broken. The message names the READ rather than the
    // content, because the parse failure above already owns "invalid backup file".
    reader.onerror = () => {
      window.alert('Could not read the backup file — the file could not be opened.');
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  }

  function handleDiagnosticExport() {
    const snap = exportDiagnosticSnapshot();
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `racearena-snapshot-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (
      !window.confirm(
        'Reset all settings stored in this browser to factory defaults? This deletes this browser’s tuning, camera settings, race defaults, race history list and racer-type settings. Tracks, racers, player groups and brands live on the server and are not deleted. This cannot be undone.'
      )
    )
      return;
    clearAllStorage();
    // Re-seed defaults so the app is usable immediately after reset.
    // Racer type overrides are intentionally not re-seeded — all types
    // are active by default when no override map is present.
    // TRACKS live on the server — no local re-seeding (server-only after step 1).
    storageSet(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
    // PLAYER_GROUPS intentionally omitted — groups live on the server after D2.
    // A local reset must not re-activate the old localStorage source.
    // BRANDING intentionally omitted — brands live on the server after D4.
    storageSet(KEYS.RACE_HISTORY, DEFAULT_RACE_HISTORY);
    window.alert('All settings stored in this browser reset to defaults. The page will reload.');
    window.location.reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Backup */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Backup &amp; Restore</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Export the settings this browser stores — tuning, camera, race defaults, the race history
          list and racer-type settings — to a JSON file, or import one back. This file does not back
          up tracks, racers, player groups or brands: they live on the server, and importing the
          file does not bring them back. Back them up on the server with{' '}
          <code style={{ fontSize: '0.75rem' }}>npm run backup</code> (source install) or{' '}
          <code style={{ fontSize: '0.75rem' }}>racearena backup</code> (VPS install); the operator
          guide, docs/OPERATOR-GUIDE.md, section “Daily operation”, part “Backups”, covers every
          install path.
        </p>
        <div className={s.btnRow}>
          <Ctl id="SystemSettings:handleExport">
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleExport}>
              ⬇ Export Settings JSON
            </button>
          </Ctl>
          <Ctl id="SystemSettings:importRef.current?.click">
            <button
              className={`${s.btn} ${s.btnSecondary}`}
              onClick={() => importRef.current?.click()}
            >
              ⬆ Import Settings JSON
            </button>
          </Ctl>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Diagnostic Snapshot */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Diagnostic Snapshot</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Exports all localStorage data including track geometries (
          <code style={{ fontSize: '0.75rem' }}>racearena:trackGeometries:*</code>) and all tuning
          configs. Use when reporting a bug that depends on browser configuration — place the
          downloaded file at{' '}
          <code style={{ fontSize: '0.75rem' }}>docs/internal/current-config-snapshot.json</code>.
        </p>
        <Ctl id="SystemSettings:handleDiagnosticExport">
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleDiagnosticExport}>
            🔬 Export Diagnostic Snapshot
          </button>
        </Ctl>
      </div>

      {/* Reset */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Factory Reset</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Wipes the settings this browser stores and starts again from the shipped values: the race
          defaults are written back and the race history list starts empty. Tracks, racers, player
          groups and brands live on the server — the reset neither deletes nor restores them; back
          them up with <code style={{ fontSize: '0.75rem' }}>npm run backup</code> or{' '}
          <code style={{ fontSize: '0.75rem' }}>racearena backup</code>. Track shapes this browser
          keeps are left alone. Use with caution.
        </p>
        <Ctl id="SystemSettings:handleReset">
          <button className={`${s.btn} ${s.btnDanger}`} onClick={handleReset}>
            Reset All Settings to Defaults
          </button>
        </Ctl>
      </div>

      {/* Version */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
          About{' '}
          <InfoTooltip text="Read-only build facts: the app name, the version string this file holds, the client framework, and the storage backend the browser uses for settings." />
        </p>
        <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['App', 'RaceArena'],
              ['Version', APP_VERSION],
              // The running React's own version (major), so the row cannot go stale on an upgrade —
              // it said "React 18" as a literal until A7-03 piece 5 (2026-10-19).
              ['Client build', `Vite + React ${reactVersion.split('.')[0]}`],
              ['Storage', 'localStorage'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td
                  style={{
                    color: 'var(--color-muted)',
                    paddingRight: '1.5rem',
                    paddingBottom: '0.3rem',
                  }}
                >
                  {k}
                </td>
                <td style={{ fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SystemSettings;
