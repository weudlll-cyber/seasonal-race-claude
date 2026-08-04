// ============================================================
// File:        vite.config.js
// Path:        client/vite.config.js
// Project:     RaceArena
// Description: Vite build configuration for the React client
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { raBuildInfo } from './vite-plugin-ra-build.js';

// CAMERA-FOCUS-4 LIVE TRUTH: stamp the short commit into the bundle so the dev-console race-start line
// reports exactly which build the browser is running — this ends stale-bundle ghost hunts for good.
//
// BUILD-TRUTH-1: this `define` is resolved ONCE, when Vite loads its config — i.e. when the dev
// server starts. It is therefore correct for `vite build` (constant and bundle made together) and
// STRUCTURALLY UNABLE to stay true in a long-running dev server. It is kept only for the dev-console
// line; the HUD badge reads `virtual:ra-build` instead, which is re-read and force-reloaded whenever
// the identity changes. Do not add new readers of __RA_COMMIT__.
let __commit = 'unknown';
try {
  __commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout / git unavailable — leave 'unknown' */
}

export default defineConfig({
  plugins: [react(), raBuildInfo()],
  define: {
    __RA_COMMIT__: JSON.stringify(__commit),
  },
  server: {
    port: 5173,
    allowedHosts: 'all',
  },
});
