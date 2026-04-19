// ============================================================
// File:        vite.config.js
// Path:        client/vite.config.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Vite build configuration for the React client
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to the Express server during development
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
});
