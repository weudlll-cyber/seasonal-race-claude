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

// one-time cleanup: obsolete background cache removed (images 4-10 MB exceeded localStorage limit)
try {
  localStorage.removeItem('racearena:cache:backgrounds');
  localStorage.removeItem('racearena:cache:backgroundsMeta');
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
