// ============================================================
// File:        CameraStateHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraStateHUD.jsx
// Project:     RaceArena
// Created:     2026-05-05
// Description: Camera-state indicator overlay for the Race Screen.
//              Shows the current TV-camera state (OVERVIEW / FOLLOWING LEADER /
//              BATTLE / COMEBACK / FINISH) with state-specific colors and a
//              fade transition between states.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import './CameraStateHUD.css';

const STATE_CONFIG = {
  OVERVIEW: {
    label: 'OVERVIEW',
    icon: '👁',
    color: '#c8c8c8',
    glow: 'rgba(200,200,200,0.35)',
    tooltip: 'Wide view of the full field',
  },
  LEADER_ZOOM: {
    label: 'FOLLOWING LEADER',
    icon: '👑',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.45)',
    tooltip: 'Camera follows the front-runner',
  },
  BATTLE_ZOOM: {
    label: 'BATTLE',
    icon: '⚔️',
    color: '#ff6b35',
    glow: 'rgba(255,80,20,0.45)',
    tooltip: 'Top racers are neck and neck',
  },
  COMEBACK_ZOOM: {
    label: 'COMEBACK',
    icon: '🌊',
    color: '#00d4e8',
    glow: 'rgba(0,200,230,0.40)',
    tooltip: 'Watching a racer fight back',
  },
  FINISH: {
    label: 'FINISH',
    icon: '🏆',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.60)',
    tooltip: 'A winner has crossed the line!',
  },
};

/**
 * @param {string}  camState  Current hudState from CameraDirector
 * @param {boolean} visible   Whether the HUD should render (from dev-panel toggle)
 */
export default function CameraStateHUD({ camState, visible }) {
  const [displayState, setDisplayState] = useState(camState);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (camState === displayState) return;
    // Fade out, swap label, fade in
    setFadeOpacity(0);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDisplayState(camState);
      setFadeOpacity(1);
    }, 150);
    return () => clearTimeout(timerRef.current);
  }, [camState, displayState]);

  if (!visible || !displayState) return null;

  const cfg = STATE_CONFIG[displayState] ?? STATE_CONFIG.OVERVIEW;
  const stateKey = displayState.toLowerCase().replace(/_/g, '-');

  return (
    <div
      className={`cam-state-hud cam-state-hud--${stateKey}`}
      style={{
        opacity: fadeOpacity,
        '--hud-color': cfg.color,
        '--hud-glow': cfg.glow,
      }}
      title={cfg.tooltip}
      data-testid="camera-state-hud"
      data-state={displayState}
    >
      <span className="cam-hud-icon" aria-hidden="true">
        {cfg.icon}
      </span>
      <span className="cam-hud-label">{cfg.label}</span>
    </div>
  );
}
