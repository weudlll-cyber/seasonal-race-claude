// ============================================================
// File:        vite.config.js
// Path:        client/vite.config.js
// Project:     RaceArena
// Description: Vite build configuration for the React client
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { raBuildInfo } from './vite-plugin-ra-build.js';

// BUILD-TRUTH-1 / CAMERA-COMPANY-ONLY-3: there is no `__RA_COMMIT__` define any more, and there must
// not be one again. It was resolved ONCE when Vite loaded its config — i.e. when the dev server
// started — so in a long-running dev server it was structurally unable to stay true. The HUD pill was
// moved to `virtual:ra-build` (read live, force-reloaded when the identity changes); the LIVE TRUTH
// console line was not, and kept printing the frozen value for two more days until it halted a ship.
// One value, one source: everything reads the virtual module.
export default defineConfig({
  plugins: [react(), raBuildInfo()],
  server: {
    port: 5173,
    allowedHosts: 'all',
  },
});
