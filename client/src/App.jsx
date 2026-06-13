// ============================================================
// File:        App.jsx
// Path:        client/src/App.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Root application component — wires up client-side routing
// ============================================================

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen/SetupScreen.jsx';
import DevScreen from './screens/DevScreen/DevScreen.jsx';
import RaceScreen from './screens/RaceScreen/index.jsx';
import ResultScreen from './screens/ResultScreen/index.jsx';
import TrackEditor from './screens/TrackEditor/TrackEditor.jsx';
import RacerEditor from './screens/RacerEditor/RacerEditor.jsx';
import DiagnoseVerteilung from './screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx';
import { TransitionProvider } from './contexts/TransitionContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { storageGet, KEYS } from './modules/storage/storage.js';
import { resolveActiveBrandProfile } from './modules/branding/useActiveBrandProfile.js';

const DEFAULT_TITLE = 'RaceArena';

function App() {
  // Read the active brand event name directly from localStorage at mount.
  // This covers page loads where a profile was already active.
  const [brandEventName, setBrandEventName] = useState(
    () =>
      resolveActiveBrandProfile(
        storageGet(KEYS.BRANDING, []),
        storageGet(KEYS.ACTIVE_SESSION, null)
      )?.eventName ?? null
  );

  useEffect(() => {
    document.title = brandEventName ? `${brandEventName} — RaceArena` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [brandEventName]);

  // Update the title when the user selects a profile in SetupScreen (same-tab, no
  // navigation). SetupScreen dispatches 'racearena:brand-active' from the selector
  // onChange — the only place that changes KEYS.ACTIVE_SESSION.
  useEffect(() => {
    function onBrandActive(e) {
      setBrandEventName(e.detail?.eventName ?? null);
    }
    window.addEventListener('racearena:brand-active', onBrandActive);
    return () => window.removeEventListener('racearena:brand-active', onBrandActive);
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TransitionProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route path="/setup" element={<SetupScreen />} />
            <Route path="/race" element={<RaceScreen />} />
            <Route path="/results" element={<ResultScreen />} />
            <Route path="/dev" element={<DevScreen />} />
            <Route path="/track-editor" element={<TrackEditor />} />
            <Route path="/racer-editor" element={<RacerEditor />} />
            {/* INTERNAL: URL-only diagnose route. Not linked in UI — access intentionally only
              via /diagnose-verteilung in the address bar. Headless simulator for distribution
              analysis. Do not delete. */}
            <Route path="/diagnose-verteilung" element={<DiagnoseVerteilung />} />
          </Routes>
        </TransitionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
