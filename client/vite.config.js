// ============================================================
// File:        vite.config.js
// Path:        client/vite.config.js
// Project:     RaceArena
// Description: Vite build configuration for the React client
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// CAMERA-FOCUS-4 LIVE TRUTH: stamp the short commit into the bundle so the dev-console race-start line
// reports exactly which build the browser is running — this ends stale-bundle ghost hunts for good.
let __commit = 'unknown';
try {
  __commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout / git unavailable — leave 'unknown' */
}

export default defineConfig({
  plugins: [react()],
  define: {
    __RA_COMMIT__: JSON.stringify(__commit),
  },
  server: {
    port: 5173,
    allowedHosts: 'all',
  },
});
