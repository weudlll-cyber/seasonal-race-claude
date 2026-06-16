// ============================================================
// File:        useServerTracks.js
// Path:        client/src/modules/storage/useServerTracks.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: React hook — returns server-side custom tracks, initially from
//              cache and refreshed async on mount.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { getCachedServerTracks, fetchServerTracks } from './trackLoader.js';

async function fetchAndMigrate(setTracks) {
  const tracks = await fetchServerTracks();
  setTracks(tracks);
}

/**
 * Returns server custom tracks array.
 * Synchronous initial value from localStorage cache; updates once the
 * background fetch completes (or silently on failure).
 * @returns {object[]}
 */
export function useServerTracks() {
  const [serverTracks, setServerTracks] = useState(() => getCachedServerTracks());

  useEffect(() => {
    let cancelled = false;
    fetchAndMigrate((tracks) => {
      if (!cancelled) setServerTracks(tracks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return serverTracks;
}

/**
 * Returns server custom tracks with a refresh function.
 * Use in components that need to trigger a manual re-fetch (e.g. after delete).
 * @returns {{ tracks: object[], refresh: () => Promise<void> }}
 */
export function useServerTracksControl() {
  const [serverTracks, setServerTracks] = useState(() => getCachedServerTracks());

  const refresh = useCallback(async () => {
    const tracks = await fetchServerTracks();
    setServerTracks(tracks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAndMigrate((tracks) => {
      if (!cancelled) setServerTracks(tracks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tracks: serverTracks, refresh };
}
