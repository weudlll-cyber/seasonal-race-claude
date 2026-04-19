// ============================================================
// File:        App.jsx
// Path:        client/src/App.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Root application component — wires up client-side routing
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen/SetupScreen.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Setup is the default entry point before a race starts */}
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<SetupScreen />} />
        {/* Future routes: /race, /results */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
