// ============================================================
// File:        RacersReadyGate.jsx
// Path:        client/src/components/RacersReadyGate.jsx
// Project:     RaceArena
// Description: Blocks rendering of Setup/Race screens until server-side racer
//              types have loaded. Shows a plain loading state while waiting.
//              Prevents getRacerType() from being called before ready (D6a gate).
// ============================================================

import { useRacersReady } from '../modules/racer-types/useRacersReady.js';

export default function RacersReadyGate({ children }) {
  const ready = useRacersReady();
  if (!ready) return <div>Loading racers…</div>;
  return children;
}
