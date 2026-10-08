// ============================================================
// File:        TestAidsSyncOnAuth.jsx
// Path:        client/src/components/TestAidsSyncOnAuth.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: Reads the test-aids switch from the server once the user is signed in, and puts it
//              back to OFF when nobody is. Must render inside AuthProvider (uses useAuth). Returns
//              null — no visible output. The same shape as BrandingSyncOnAuth.jsx.
// ============================================================

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { clearTestAids, refreshTestAids } from '../modules/testAids.js';

export default function TestAidsSyncOnAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) refreshTestAids();
    else clearTestAids();
  }, [user, loading]);

  return null;
}
