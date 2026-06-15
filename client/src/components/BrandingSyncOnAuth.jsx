// ============================================================
// File:        BrandingSyncOnAuth.jsx
// Path:        client/src/components/BrandingSyncOnAuth.jsx
// Project:     RaceArena
// Description: Triggers syncBrandingMirror() once the user is authenticated.
//              Must render inside AuthProvider (uses useAuth). Returns null —
//              no visible output. Replaces the blind App.jsx useEffect that fired
//              before auth was confirmed (D4 fix, Ursache 2).
// ============================================================

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { syncBrandingMirror } from '../modules/branding/brandingSync.js';

export default function BrandingSyncOnAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) syncBrandingMirror();
  }, [user, loading]);

  return null;
}
