// ============================================================
// File:        App.jsx
// Path:        client/src/App.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Root application component — wires up client-side routing
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen/SetupScreen.jsx';
import DevScreen from './screens/DevScreen/DevScreen.jsx';
import RaceScreen from './screens/RaceScreen/index.jsx';
import ResultScreen from './screens/ResultScreen/index.jsx';
import TrackEditor from './screens/TrackEditor/TrackEditor.jsx';
import { TransitionProvider } from './contexts/TransitionContext.jsx';
import { storageGet, storageSet, KEYS } from './modules/storage/storage.js';
import { DEFAULT_TRACKS } from './modules/storage/defaults.js';

// Bump this when DEFAULT_TRACKS schema changes to force a one-time reset of stale localStorage data.
const CURRENT_DATA_VERSION = 1;

(function migrateStorage() {
  if (storageGet(KEYS.DATA_VERSION, 0) < CURRENT_DATA_VERSION) {
    storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    console.log('[RaceArena] Storage migrated to v' + CURRENT_DATA_VERSION);
  }
})();

function App() {
  return (
    <BrowserRouter>
      <TransitionProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<SetupScreen />} />
          <Route path="/race" element={<RaceScreen />} />
          <Route path="/results" element={<ResultScreen />} />
          <Route path="/dev" element={<DevScreen />} />
          <Route path="/track-editor" element={<TrackEditor />} />
        </Routes>
      </TransitionProvider>
    </BrowserRouter>
  );
}

export default App;
