// ============================================================
// File:        PendingRaceSync.jsx
// Path:        client/src/components/PendingRaceSync.jsx
// Project:     RaceArena — RACE-SAVE-3
// Description: Mounts the pending-race flush for the life of the application. Renders NOTHING.
//
//              WHY A COMPONENT AND NOT A CALL IN A MODULE. The subscription has to be torn down
//              when the application unmounts — in a test, that is between files, and a listener
//              that outlived its test would flush against the next one's store. `useEffect`'s
//              cleanup is the mechanism React already has for exactly that, and mounting it beside
//              `ServerStatusBanner` puts it where the other server-status consumer already lives.
//
//              IT DOES NOT POLL. `startPendingRaceSync` subscribes to `serverStatus.js`, which
//              never makes a request of its own — see pendingRaces.js for why that is the whole
//              design and not an optimisation.
// ============================================================

import { useEffect } from 'react';
import { startPendingRaceSync } from '../modules/pendingRaces.js';

export default function PendingRaceSync() {
  useEffect(() => startPendingRaceSync(), []);
  return null;
}
