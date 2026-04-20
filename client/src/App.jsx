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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/race" element={<RaceScreen />} />
        <Route path="/results" element={<ResultScreen />} />
        <Route path="/dev" element={<DevScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
