// ============================================================
// File:        RacePlanHUD.jsx
// Path:        client/src/screens/RaceScreen/RacePlanHUD.jsx
// Project:     RaceArena
// Description: Race-Plan debug overlays: winner-list panel and top-10 speed monitor.
//              Reads live data from diagDataRef every 100ms.
//              Two independent panels; each shown only when its flag is true.
// ============================================================

import { useState, useEffect, useRef } from 'react';

const POLL_MS = 100;

function deltaColor(delta) {
  const abs = Math.abs(delta);
  if (abs <= 1) return '#4cff91';
  if (abs <= 5) return '#ffd700';
  return '#ff6b35';
}

function multColor(tm, min5s, max5s) {
  const delta = max5s - min5s;
  if (delta > 0.18) return '#ff6b35';
  if (delta > 0.1) return '#ffd700';
  return '#4cff91';
}

/**
 * @param {{ diagRef: React.RefObject, showWinnerList: boolean, showSpeedMonitor: boolean }} props
 */
export default function RacePlanHUD({ diagRef, showWinnerList, showSpeedMonitor }) {
  const [snap, setSnap] = useState({ rpEnabled: false, rpB1Racers: [], rpTop10: [] });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!showWinnerList && !showSpeedMonitor) return;
    intervalRef.current = setInterval(() => {
      const d = diagRef?.current;
      if (!d?.rpEnabled) return;
      setSnap({
        rpEnabled: true,
        rpB1Racers: d.rpB1Racers ? [...d.rpB1Racers] : [],
        rpTop10: d.rpTop10 ? [...d.rpTop10] : [],
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [showWinnerList, showSpeedMonitor, diagRef]);

  if (!snap.rpEnabled) return null;

  const panelBase = {
    background: 'rgba(0,0,0,0.76)',
    color: '#b0e0ff',
    fontFamily: 'monospace',
    fontSize: '0.70rem',
    lineHeight: 1.55,
    padding: '5px 8px',
    borderRadius: 4,
    pointerEvents: 'none',
    minWidth: 200,
  };

  const hasAnyPanel =
    (showWinnerList && snap.rpB1Racers.length > 0) || (showSpeedMonitor && snap.rpTop10.length > 0);

  if (!hasAnyPanel) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        zIndex: 31,
      }}
    >
      {showWinnerList && snap.rpB1Racers.length > 0 && (
        <div
          style={{
            ...panelBase,
            border: '1px solid rgba(80,200,80,0.4)',
          }}
          data-testid="rp-winner-list-hud"
        >
          <div style={{ color: '#4cff91', fontWeight: 700, marginBottom: 2 }}>B1 WINNER LIST</div>
          <div style={{ color: '#666', fontSize: '0.60rem', marginBottom: 3, whiteSpace: 'pre' }}>
            {'Name         Target Now   Δ  Row'}
          </div>
          {snap.rpB1Racers.map((r) => (
            <div key={r.index} style={{ color: deltaColor(r.delta), whiteSpace: 'pre' }}>
              {r.name.padEnd(12).slice(0, 12)} {'#' + r.targetRank}
              {' → '}
              {'#' + String(r.currentRank).padStart(2)} {(r.delta >= 0 ? '+' : '') + r.delta}
              {'  '}
              {'R' + r.startRow}
            </div>
          ))}
        </div>
      )}
      {showSpeedMonitor && snap.rpTop10.length > 0 && (
        <div
          style={{
            ...panelBase,
            border: '1px solid rgba(255,180,50,0.4)',
          }}
          data-testid="rp-speed-monitor-hud"
        >
          <div style={{ color: '#ffd700', fontWeight: 700, marginBottom: 2 }}>
            TOP-10 SPEED (5s)
          </div>
          <div style={{ color: '#666', fontSize: '0.60rem', marginBottom: 3, whiteSpace: 'pre' }}>
            {'#  Name         tm    [min–max]  Δ5s'}
          </div>
          {snap.rpTop10.map((r) => {
            const delta5s = r.tmMax5s - r.tmMin5s;
            return (
              <div
                key={r.rank}
                style={{ color: multColor(r.tm, r.tmMin5s, r.tmMax5s), whiteSpace: 'pre' }}
              >
                {String(r.rank).padStart(2)} {r.name.padEnd(12).slice(0, 12)} {r.tm.toFixed(3)}{' '}
                {'[' + r.tmMin5s.toFixed(2) + '–' + r.tmMax5s.toFixed(2) + ']'} {delta5s.toFixed(3)}
                {r.isOscillating ? ' ⚠' : '  '}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
