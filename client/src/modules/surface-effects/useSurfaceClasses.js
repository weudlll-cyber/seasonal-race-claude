// ============================================================
// File:        useSurfaceClasses.js
// Path:        client/src/modules/surface-effects/useSurfaceClasses.js
// Project:     RaceArena
// Description: React hook — combined surface-class list (code defaults +
//              backend overrides + custom classes). Provides refresh(), isLoading,
//              and error state. Used by SurfaceClassManager (VRE-2).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { listAllSurfaceClasses } from './registry.js';
import { fetchServerSurfaceClasses } from '../storage/surfaceClassLoader.js';

/**
 * Returns the merged surface-class list (code defaults + backend overrides/custom),
 * a refresh function, loading state, and fetch error.
 *
 * On mount: fetches from backend and updates the registry (same as app startup).
 * After Save/Delete: call refresh() to re-sync.
 *
 * @returns {{ classes: object[], refresh: function, isLoading: boolean, error: string|null }}
 */
export function useSurfaceClasses() {
  const [classes, setClasses] = useState(() => listAllSurfaceClasses());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchServerSurfaceClasses();
      setClasses(listAllSurfaceClasses());
    } catch (e) {
      setError(e.message ?? 'Failed to load surface classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { classes, refresh, isLoading, error };
}

export default useSurfaceClasses;
