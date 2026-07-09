// ============================================================
// File:        ConfigExportSection.jsx
// Path:        client/src/screens/DevScreen/sections/ConfigExportSection.jsx
// Project:     RaceArena
// Description: Stage 0 — "Export race config". Downloads world.json (the browser's ACTUAL race-path
//              config), shows the content hash, and names any deviation from defaults so the owner
//              never has to remember whether he changed a setting. Read-only; no race behaviour.
// ============================================================

import { useState } from 'react';
import { buildWorldConfig, worldStatus } from '../../../modules/exportRaceConfig.js';

function ConfigExportSection() {
  const [status, setStatus] = useState(() => worldStatus());
  const [copied, setCopied] = useState(false);

  function refresh() {
    setStatus(worldStatus());
    setCopied(false);
  }

  function exportWorld() {
    const world = buildWorldConfig();
    const text = JSON.stringify(world, null, 2);
    // Download world.json
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'world.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Also copy to clipboard (best-effort)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => setCopied(true))
        .catch(() => setCopied(false));
    }
    setStatus(worldStatus(world));
  }

  const { hashShort, deviations, unsimulatable } = status;
  const chip = {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    background: '#2b2b3a',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <p style={{ fontSize: '0.88rem', color: '#bbb', marginTop: 0 }}>
        Exports the config the game actually reads when a race starts — so a sim run can be checked
        against <em>your</em> world, not an assumed one. Nothing here changes the race.
      </p>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}
      >
        <button
          data-testid="export-race-config"
          onClick={exportWorld}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem' }}
        >
          Export race config
        </button>
        <span style={chip} data-testid="world-hash">
          world: {hashShort}
        </span>
        <button
          onClick={refresh}
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          title="Recompute after changing settings"
        >
          ↻ refresh
        </button>
        {copied && <span style={{ color: '#6c6', fontSize: '0.82rem' }}>copied to clipboard</span>}
      </div>

      {unsimulatable.length > 0 && (
        <div
          data-testid="unsimulatable-banner"
          style={{
            background: '#4a1f1f',
            border: '1px solid #a33',
            borderRadius: '4px',
            padding: '0.5rem 0.7rem',
            marginBottom: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          ⛔ <strong>The sim cannot run this world.</strong>{' '}
          {unsimulatable.map((r) => r.code).join(', ')} — the sim will ABORT rather than produce a
          misleading number.
        </div>
      )}

      {deviations.length > 0 ? (
        <div
          data-testid="deviation-banner"
          style={{
            background: '#4a3f1f',
            border: '1px solid #aa3',
            borderRadius: '4px',
            padding: '0.5rem 0.7rem',
            fontSize: '0.85rem',
          }}
        >
          ⚠ non-default: {deviations.join(', ')}
        </div>
      ) : (
        <div style={{ color: '#6c6', fontSize: '0.85rem' }}>✓ all settings at defaults</div>
      )}
    </div>
  );
}

export default ConfigExportSection;
