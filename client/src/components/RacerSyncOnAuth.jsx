// ============================================================
// File:        RacerSyncOnAuth.jsx
// Path:        client/src/components/RacerSyncOnAuth.jsx
// Project:     RaceArena
// Description: Triggers loadServerRacerTypes() once the user is authenticated
//              OR when the app is in offline-hint state (server down, hint stored).
//              In the offline-hint case the fetch fails fast (ECONNREFUSED) →
//              catch → _markRacersReady() → RacersReadyGate resolves with the
//              21 built-in racer types instead of hanging on "Loading racers…".
//              On reconnect (offline-hint → online) user becomes non-null and the
//              effect re-runs, loading any server-side racer types.
//              Must render inside AuthProvider (uses useAuth). Returns null —
//              no visible output. Mirrors BrandingSyncOnAuth pattern (D6a).
// ============================================================

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { loadServerRacerTypes } from '../modules/racer-types/index.js';

export default function RacerSyncOnAuth() {
  const { user, loading, authState } = useAuth();

  useEffect(() => {
    if (!loading && (user || authState === 'offline-hint')) loadServerRacerTypes();
  }, [user, loading, authState]);

  return null;
}
