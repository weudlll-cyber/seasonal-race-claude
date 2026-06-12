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
import { TransitionProvider } from './contexts/TransitionContext.jsx';
import { storageGet, storageSet, KEYS } from './modules/storage/storage.js';
import {
  DEFAULT_TRACKS,
  DEFAULT_BRANDING,
  DEFAULT_ACTIVE_SESSION,
} from './modules/storage/defaults.js';
import { useStorage } from './modules/storage/useStorage.js';

const CURRENT_DATA_VERSION = 5;

// Removes localStorage track entries whose name case-insensitively matches a
// DEFAULT_TRACKS entry but whose id is a legacy hash (track was promoted to default).
function removeStalePromotedDefaults() {
  const defaultNames = new Map(DEFAULT_TRACKS.map((t) => [t.name.toLowerCase(), t.id]));
  const existing = storageGet(KEYS.TRACKS, []);
  if (!Array.isArray(existing)) return;
  const cleaned = existing.filter((t) => {
    const canonicalId = defaultNames.get((t.name ?? '').toLowerCase());
    return !(canonicalId && t.id !== canonicalId);
  });
  if (cleaned.length !== existing.length) {
    storageSet(KEYS.TRACKS, cleaned);
  }
}

(function migrateStorage() {
  const version = storageGet(KEYS.DATA_VERSION, 0);
  if (version >= CURRENT_DATA_VERSION) return;

  if (version < 1) {
    // v0 → v1: seed defaults on first install — never overwrite existing tracks.
    const existing = storageGet(KEYS.TRACKS, null);
    if (!Array.isArray(existing) || existing.length === 0) {
      storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    }
  }

  if (version < 3) {
    // v1/v2 → v3: remove stale promoted-default entries (Mountainstreet).
    removeStalePromotedDefaults();
  }

  if (version < 4) {
    // v3 → v4: remove stale promoted-default entries (Ice Track).
    removeStalePromotedDefaults();
  }

  if (version < 5) {
    // v4 → v5: remove stale promoted-default entries (Seatrack, Searound).
    removeStalePromotedDefaults();
  }

  storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
  console.warn('[RaceArena] Storage migrated to v' + CURRENT_DATA_VERSION);
})();

const DEFAULT_TITLE = 'RaceArena';

function App() {
  const [brandingProfiles] = useStorage(KEYS.BRANDING, DEFAULT_BRANDING);
  const [activeSession] = useStorage(KEYS.ACTIVE_SESSION, DEFAULT_ACTIVE_SESSION);

  useEffect(() => {
    const id = activeSession?.activeBrandingProfileId;
    const profile = id ? (brandingProfiles.find((p) => p.id === id) ?? null) : null;
    document.title = profile?.eventName ? `${profile.eventName} — RaceArena` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [activeSession?.activeBrandingProfileId, brandingProfiles]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    </BrowserRouter>
  );
}

export default App;
