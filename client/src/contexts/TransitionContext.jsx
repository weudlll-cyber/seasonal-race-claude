// ============================================================
// File:        TransitionContext.jsx
// Path:        client/src/contexts/TransitionContext.jsx
// Project:     RaceArena
// Created:     2026-04-22
// Description: Screen-transition fade-to-black. Wrap <BrowserRouter> children
//              with <TransitionProvider>; call useFadeNavigate() instead of
//              useNavigate() to get smooth crossfades between screens.
// ============================================================

import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TransitionOverlay.css';

const TransitionContext = createContext(null);

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  const fadeNavigate = useCallback(
    (path) => {
      setVisible(true);
      setTimeout(() => {
        navigate(path);
        // Give the new screen one tick to mount before fading out
        setTimeout(() => setVisible(false), 50);
      }, 320);
    },
    [navigate]
  );

  return (
    <TransitionContext.Provider value={{ fadeNavigate }}>
      {children}
      <div
        className={`transition-overlay${visible ? ' transition-overlay--visible' : ''}`}
        aria-hidden="true"
      />
    </TransitionContext.Provider>
  );
}

export function useFadeNavigate() {
  const ctx = useContext(TransitionContext);
  const fallback = useNavigate();
  return ctx?.fadeNavigate ?? fallback;
}
