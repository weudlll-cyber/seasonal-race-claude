// ============================================================
// File:        useServerTracks.js
// Path:        client/src/modules/storage/useServerTracks.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: React hook — returns server-side custom tracks, initially from
//              cache and refreshed async on mount. Used alongside useStorage
//              to build the combined track list for display.
// ============================================================

import { useState, useEffect } from 'react';
import { getCachedServerTracks, fetchServerTracks } from './trackLoader.js';

/**
 * Returns server custom tracks. Synchronous initial value from localStorage
 * cache; updates once the background fetch completes (or silently on failure).
 * @returns {object[]}
 */
export function useServerTracks() {
  const [serverTracks, setServerTracks] = useState(() => getCachedServerTracks());

  useEffect(() => {
    let cancelled = false;
    fetchServerTracks().then((tracks) => {
      if (!cancelled) setServerTracks(tracks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return serverTracks;
}
