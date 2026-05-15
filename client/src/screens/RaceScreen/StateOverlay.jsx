// ============================================================
// File:        StateOverlay.jsx
// Path:        client/src/screens/RaceScreen/StateOverlay.jsx
// Project:     RaceArena
// Description: Narrative text overlay shown during the first few seconds
//              of an OVERVIEW / BATTLE / COMEBACK camera state.
//              Position: bottom centre, pill-shaped semi-transparent banner.
//              Fade-in on mount, fade-out when text is cleared.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import './StateOverlay.css';

const FADE_OUT_MS = 400;

/**
 * @param {string | null} text  Text to display. null = fade out and hide.
 */
export default function StateOverlay({ text }) {
  const [displayText, setDisplayText] = useState(text);
  const [visible, setVisible] = useState(!!text);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    clearTimeout(clearTimerRef.current);

    if (text) {
      setDisplayText(text);
      setVisible(true);
    } else {
      setVisible(false);
      clearTimerRef.current = setTimeout(() => setDisplayText(null), FADE_OUT_MS);
    }

    return () => clearTimeout(clearTimerRef.current);
  }, [text]);

  if (!displayText) return null;

  return (
    <div className="state-overlay" style={{ opacity: visible ? 1 : 0 }} data-testid="state-overlay">
      {displayText}
    </div>
  );
}
