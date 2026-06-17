// TEMPORARY debug component — to be reverted after offline diagnosis.
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getRacerLoadDebug, getRacerSyncDebug } from '../modules/racer-types/index.js';

export default function DebugOverlay() {
  const { authState, loading, user } = useAuth();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  let marker = 'no';
  try {
    marker = localStorage.getItem('racearena:lastUser') ? 'yes' : 'no';
  } catch {
    marker = 'err';
  }
  const d = getRacerLoadDebug();
  const s = getRacerSyncDebug();
  const path = typeof window !== 'undefined' ? window.location.pathname : '?';
  const text =
    `DBG path=${path} auth=${authState} loading=${String(loading)} user=${user ? 'yes' : 'no'} marker=${marker} | ` +
    `sync.ran=${String(s.ran)} sync.called=${String(s.called)} sync.auth=${s.authState} sync.loading=${String(s.loading)} | ` +
    `racersReady=${String(d.ready)} calls=${d.calls} outcome=${d.outcome} inFlight=${String(d.inFlight)} waiters=${d.waiters}`;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: '#b91c1c',
        color: '#fff',
        font: '11px/1.35 monospace',
        padding: '2px 6px',
        pointerEvents: 'none',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </div>
  );
}
