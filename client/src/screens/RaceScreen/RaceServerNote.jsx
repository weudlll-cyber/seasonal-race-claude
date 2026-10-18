// ============================================================
// File:        RaceServerNote.jsx
// Path:        client/src/screens/RaceScreen/RaceServerNote.jsx
// Project:     RaceArena — OFFLINE-1 F3 (the owner's decision of 2026-10-18)
// Description: A small note IN THE STANDINGS COLUMN while the server is not answering — never over
//              the race picture. The app-wide red banner stands down in fullscreen and sits above
//              the race; this says the one thing a viewer of a running race needs: the result is not
//              lost. In the app's fullscreen the column is the drawer, so the note is there when the
//              drawer is opened. It disappears when the server answers again. (The placement is a
//              proposal; the owner judges it when he looks.)
//
// WHY EVENTS AND NOT modules/serverStatus.js: this file is imported by RaceScreen/index.jsx, which is
// inside raceCore.js's import closure (scripts/engine-reach.mjs). Importing the status module would
// pull it into that hull; serverStatus.js answers `racearena:server-status-query` with the same
// `racearena:server-status-changed` event it sends on every change, synchronously.
// ============================================================

import { useEffect, useState } from 'react';

/** The note's words — exported so the tests read the same string the screen shows. */
export const RACE_SERVER_NOTE = 'Server not reachable — results are kept and sent later';

export default function RaceServerNote() {
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    const onChange = (e) => setUnreachable(e?.detail?.status === 'unreachable');
    window.addEventListener('racearena:server-status-changed', onChange);
    // The current value, in case the outage began before this screen mounted.
    window.dispatchEvent(new CustomEvent('racearena:server-status-query'));
    return () => window.removeEventListener('racearena:server-status-changed', onChange);
  }, []);

  if (!unreachable) return null;
  return (
    <div className="race-server-note" role="status" data-testid="race-server-note">
      {RACE_SERVER_NOTE}
    </div>
  );
}
