// ============================================================
// File:        useNow.js
// Path:        client/src/screens/SetupScreen/useNow.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1)
// Description: This device's clock as React state, ticking every `intervalMs`. For the registration
//              panel's live text ("in 1 day 2 h", the countdown, whether a chosen time is still in
//              the future): reading `Date.now()` during render would be impure, so the time a render
//              sees is state that an interval moves forward.
// ============================================================

import { useEffect, useState } from 'react';

/** @param {number} [intervalMs] @returns {number} the current time in ms, updated every interval */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
