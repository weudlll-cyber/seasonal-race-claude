// ============================================================
// File:        RacerSyncOnAuth.jsx
// Path:        client/src/components/RacerSyncOnAuth.jsx
// Project:     RaceArena
// Description: Triggers loadServerRacerTypes() once the user is authenticated.
//              Must render inside AuthProvider (uses useAuth). Returns null —
//              no visible output. Mirrors BrandingSyncOnAuth pattern (D6a).
// ============================================================

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { loadServerRacerTypes } from '../modules/racer-types/index.js';

export default function RacerSyncOnAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) loadServerRacerTypes();
  }, [user, loading]);

  return null;
}
