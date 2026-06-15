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
import DiagnoseVerteilung from './screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx';
import LoginScreen from './screens/Auth/LoginScreen.jsx';
import SetupAdminScreen from './screens/Auth/SetupAdminScreen.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { TransitionProvider } from './contexts/TransitionContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useActiveBrandProfile } from './modules/branding/useActiveBrandProfile.js';
import BrandingSyncOnAuth from './components/BrandingSyncOnAuth.jsx';

const DEFAULT_TITLE = 'RaceArena';

function App() {
  const brandEventName = useActiveBrandProfile()?.eventName ?? null;

  useEffect(() => {
    document.title = brandEventName ? `${brandEventName} — RaceArena` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [brandEventName]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <BrandingSyncOnAuth />
        <TransitionProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <SetupScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/race"
              element={
                <ProtectedRoute>
                  <RaceScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute>
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
              analysis. Do not delete. */}
            <Route
              path="/diagnose-verteilung"
              element={
                <ProtectedRoute requiredRole="admin">
                  <DiagnoseVerteilung />
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
