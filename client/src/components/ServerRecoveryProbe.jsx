// ============================================================
// File:        ServerRecoveryProbe.jsx
// Path:        client/src/components/ServerRecoveryProbe.jsx
// Project:     RaceArena — OFFLINE-1 F2
// Description: Mounts the recovery probe for the life of the application. Renders NOTHING.
//              A component for the same reason as PendingRaceSync.jsx beside it: `useEffect`'s
//              cleanup tears the probe's timer and listeners down when the app unmounts (in a test,
//              between files). What the probe does, and why only while the server is not answering,
//              is in modules/serverRecoveryProbe.js.
// ============================================================

import { useEffect } from 'react';
import { startServerRecoveryProbe } from '../modules/serverRecoveryProbe.js';

export default function ServerRecoveryProbe() {
  useEffect(() => startServerRecoveryProbe(), []);
  return null;
}
