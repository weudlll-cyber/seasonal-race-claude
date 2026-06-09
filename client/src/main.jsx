// ============================================================
// File:        main.jsx
// Path:        client/src/main.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Vite entry point — mounts the React app to the DOM
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx';
import './styles/main.css';
// TEMPORARY diag — remove after H-05 measurement
import './modules/raceDiagnostics.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
