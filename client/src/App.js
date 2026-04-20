// ============================================================
// File:        App.js
// Path:        client/src/App.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Root application component with routing setup
// ============================================================

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen/SetupScreen';
import RaceScreen from './screens/RaceScreen';
import ResultScreen from './screens/ResultScreen';
import DevScreen from './screens/DevScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/race" element={<RaceScreen />} />
        <Route path="/results" element={<ResultScreen />} />
        <Route path="/dev" element={<DevScreen />} />
        <Route path="/" element={<SetupScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
