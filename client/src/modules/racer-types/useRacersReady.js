// ============================================================
// File:        useRacersReady.js
// Path:        client/src/modules/racer-types/useRacersReady.js
// Project:     RaceArena
// Description: React hook — returns true when loadServerRacerTypes() has
//              completed (success or error). Used by RacersReadyGate (D6a).
// ============================================================

import { useState, useEffect } from 'react';
import { areRacersReady, waitForRacersReady } from './index.js';

export function useRacersReady() {
  const [ready, setReady] = useState(areRacersReady());

  useEffect(() => {
    if (areRacersReady()) return;
    let cancelled = false;
    waitForRacersReady().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
