// ============================================================
// File:        vitest.config.js
// Path:        client/vitest.config.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Vitest configuration — jsdom environment, global APIs,
//              coverage via V8, CSS module support
// ============================================================

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Expose describe/it/expect/vi globally so tests don't need to import them
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Let Vite's CSS pipeline process .module.css files in tests
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}'],
    },
  },
});
