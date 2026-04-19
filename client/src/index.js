// ============================================================
// File:        index.js
// Path:        client/src/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: React application entry point — mounts App to the DOM
// ============================================================

import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
