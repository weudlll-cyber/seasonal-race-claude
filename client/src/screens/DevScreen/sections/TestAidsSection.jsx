// ============================================================
// File:        TestAidsSection.jsx
// Path:        client/src/screens/DevScreen/sections/TestAidsSection.jsx
// Project:     RaceArena — TEST-AIDS-1 (the owner's decision of 2026-10-04)
// Description: THE TEST-AIDS SWITCH — one toggle for the whole installation, at the top of the
//              Dev Screen chapter "Diagnostics and verification". Admins only: the chapter is in
//              the All view alone, and the server refuses anyone else's change (`ROUTE_POLICY`).
//
// The value lives on the server and is read through `modules/testAids.js`, the one place every gate
// asks. This control only shows it and asks the server to change it; it never decides a gate itself.
// ============================================================

import { useState } from 'react';
import { storeTestAids, useTestAids } from '../../../modules/testAids.js';
import { Ctl } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

function TestAidsSection() {
  const aids = useTestAids();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function change(next) {
    setBusy(true);
    setError(null);
    try {
      await storeTestAids(next);
    } catch {
      setError('The server did not store the change. Nothing changed; try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.card}>
      <Ctl id="TestAidsSection:test-aids-switch">
        <label className={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            data-testid="test-aids-switch"
            checked={aids}
            disabled={busy}
            onChange={(e) => change(e.target.checked)}
          />
          Test aids for the whole installation — {aids ? 'ON' : 'OFF'}
        </label>
      </Ctl>
      {error && (
        <p className={s.sectionDesc} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default TestAidsSection;
