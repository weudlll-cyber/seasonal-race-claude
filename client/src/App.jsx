// ============================================================
// File:        App.jsx
// Path:        client/src/App.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Root application component — wires up client-side routing
// ============================================================

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen/SetupScreen.jsx';
import DevScreen from './screens/DevScreen/DevScreen.jsx';
import RaceScreen from './screens/RaceScreen/index.jsx';
import ResultScreen from './screens/ResultScreen/index.jsx';
import TrackEditor from './screens/TrackEditor/TrackEditor.jsx';
import RacerEditor from './screens/RacerEditor/RacerEditor.jsx';
import DistributionDiagnostics from './screens/DistributionDiagnostics/DistributionDiagnostics.jsx';
import LoginScreen from './screens/Auth/LoginScreen.jsx';
import SetupAdminScreen from './screens/Auth/SetupAdminScreen.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { TransitionProvider } from './contexts/TransitionContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useActiveBrandProfile } from './modules/branding/useActiveBrandProfile.js';
import BrandingSyncOnAuth from './components/BrandingSyncOnAuth.jsx';
import RacerSyncOnAuth from './components/RacerSyncOnAuth.jsx';
import TestAidsSyncOnAuth from './components/TestAidsSyncOnAuth.jsx';
import RacersReadyGate from './components/RacersReadyGate.jsx';
import ServerStatusBanner from './components/ServerStatusBanner.jsx';
import PendingRaceSync from './components/PendingRaceSync.jsx';
import { useTestAidsState } from './modules/testAids.js';

const DEFAULT_TITLE = 'RaceArena';

/**
 * TEST-AIDS-1, item 27: a page that only exists while the test-aids switch is ON. It waits for the
 * server's answer rather than turning an admin away while that answer is on its way.
 */
function TestAidsOnly({ children }) {
  const aids = useTestAidsState();
  if (aids === 'unknown') return null;
  return aids === 'on' ? children : <Navigate to="/" replace />;
}

function App() {
  const brandEventName = useActiveBrandProfile()?.eventName ?? null;

  useEffect(() => {
    document.title = brandEventName ? `${brandEventName} — RaceArena` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [brandEventName]);

  useEffect(() => {
    // One-time purge (BEHAVIOUR step 2): the race-zones feature was removed. Delete any stale stored
    // raceZoneConfig so a future export, migration or debugging session can never surface a control for
    // a feature that no longer exists. Removing the KEYS entry alone would leave the value in the browser.
    try {
      localStorage.removeItem('racearena:raceZoneConfig');
    } catch {
      /* localStorage unavailable (SSR/private mode) — nothing to purge */
    }
  }, []);

  // react-router v7: startTransition + relativeSplatPath are the DEFAULT behavior now, so the v6
  // `future` opt-in flags are removed (the app was already running with them enabled).
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* SERVER-GONE-1: above the router, so the one message about the server does not depend on
            which screen the player happens to be on. It renders nothing unless a request has
            actually failed to get an answer. */}
        <ServerStatusBanner />
        {/* RACE-SAVE-3: sends races that could not go up when they finished. Renders nothing. */}
        <PendingRaceSync />
        <BrandingSyncOnAuth />
        <RacerSyncOnAuth />
        <TestAidsSyncOnAuth />
        <TransitionProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route
              path="/setup"
              element={
                <ProtectedRoute allowOffline>
                  <RacersReadyGate>
                    <SetupScreen />
                  </RacersReadyGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/race"
              element={
                <ProtectedRoute allowOffline>
                  <RacersReadyGate>
                    <RaceScreen />
                  </RacersReadyGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute allowOffline>
                  <ResultScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev"
              element={
                <ProtectedRoute>
                  <DevScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/track-editor"
              element={
                <ProtectedRoute>
                  <TrackEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/racer-editor"
              element={
                <ProtectedRoute>
                  <RacerEditor />
                </ProtectedRoute>
              }
            />
            {/* INTERNAL: URL-only diagnose route. Not linked in UI — access intentionally only
              via /diagnose-verteilung in the address bar. Headless simulator for distribution
              analysis. Do not delete. TEST-AIDS-1: admins only AND only while the test-aids switch
              is ON (item 27 of DEV-DISPLAYS-1). The URL keeps its old German spelling ON PURPOSE:
              a URL is visible and bookmarked, so renaming the component (AUDIT-1 A2-27) did not
              move it. */}
            <Route
              path="/diagnose-verteilung"
              element={
                <ProtectedRoute requiredRole="admin">
                  <TestAidsOnly>
                    <DistributionDiagnostics />
                  </TestAidsOnly>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/setup-admin" element={<SetupAdminScreen />} />
          </Routes>
        </TransitionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
