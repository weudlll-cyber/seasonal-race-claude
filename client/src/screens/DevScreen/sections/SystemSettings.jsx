// ============================================================
// File:        SystemSettings.jsx
// Path:        client/src/screens/DevScreen/sections/SystemSettings.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: System-level controls — export/import full JSON backup, reset
//              to factory defaults, and app version info
// ============================================================

import { useRef } from 'react';
import {
  exportAllStorage,
  importAllStorage,
  clearAllStorage,
} from '../../../modules/storage/storage.js';
import {
  DEFAULT_RACERS,
  DEFAULT_TRACKS,
  DEFAULT_RACE_DEFAULTS,
  DEFAULT_PLAYER_GROUPS,
  DEFAULT_BRANDING,
  DEFAULT_RACE_HISTORY,
} from '../../../modules/storage/defaults.js';
import { KEYS, storageSet } from '../../../modules/storage/storage.js';
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
    reader.readAsText(file);
    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  }

  function handleReset() {
    if (
      !window.confirm(
        'Reset ALL settings to factory defaults? This deletes all custom tracks, racers, groups, and branding. This cannot be undone.'
      )
    )
      return;
    clearAllStorage();
    // Re-seed defaults so the app is usable immediately after reset
    storageSet(KEYS.RACERS, DEFAULT_RACERS);
    storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    storageSet(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
    storageSet(KEYS.PLAYER_GROUPS, DEFAULT_PLAYER_GROUPS);
    storageSet(KEYS.BRANDING, DEFAULT_BRANDING);
    storageSet(KEYS.RACE_HISTORY, DEFAULT_RACE_HISTORY);
    window.alert('All settings reset to defaults. The page will reload.');
    window.location.reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Backup */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Backup &amp; Restore</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Export all settings (tracks, racers, groups, branding, history) to a JSON file, or restore
          from a previous backup.
        </p>
        <div className={s.btnRow}>
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleExport}>
            ⬇ Export Settings JSON
          </button>
          <button
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={() => importRef.current?.click()}
          >
            ⬆ Import Settings JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Reset */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Factory Reset</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Wipes all saved settings and restores the 5 built-in tracks, 5 built-in racers, and all
          default values. Use with caution.
        </p>
        <button className={`${s.btn} ${s.btnDanger}`} onClick={handleReset}>
          Reset All Settings to Defaults
        </button>
      </div>

      {/* Version */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>About</p>
        <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['App', 'RaceArena'],
              ['Version', APP_VERSION],
              ['Client build', 'Vite + React 18'],
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
