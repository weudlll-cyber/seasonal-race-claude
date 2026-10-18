// ============================================================
// File:        eslint.config.js
// Path:        client/eslint.config.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: ESLint v10 flat config — React + hooks rules, Prettier compat
// ============================================================

import { createRequire } from 'node:module';
import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

// ★ THE REACT VERSION IS READ HERE, NOT DETECTED BY THE PLUGIN (ESLint 10, 2026-10-18).
// eslint-plugin-react's `version: 'detect'` calls `context.getFilename()`, which ESLint 10 removed
// (its migration guide, "Removed deprecated rule context methods"); 7.37.5, the newest release,
// still does, and every rule that consults the version crashed on the first file. Reading the
// installed react's own package.json gives the plugin the same answer `detect` would have, with no
// number written here to go stale when React moves. The same release declares ESLint only up to 9
// as its peer, so `client/package.json` carries `overrides["eslint-plugin-react"].eslint =
// "$eslint"` (npm's documented way to accept it); the rules this config uses were each proven to
// still report under 10. When a release supports 10, both go.
const { version: reactVersion } = createRequire(import.meta.url)('react/package.json');

export default [
  // Ignore generated/dependency directories
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  // Base JS + React config for all source files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        // Vite transforms process.env references at build time; tell ESLint it exists
        process: 'readonly',
        // Vite `define` injects the short commit at build time (CAMERA-FOCUS-4 LIVE TRUTH line).
        __RA_COMMIT__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: reactVersion },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      // New JSX transform — no need for React to be in scope
      ...reactPlugin.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // Warn on unused vars; ignore convention-prefixed names
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // console.log is noise in production; allow warn/error for intentional logging
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // No PropTypes in this project
      'react/prop-types': 'off',
      // HMR: flag components that break fast-refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Calling setState inside an effect body is fine for initialization patterns;
      // the rule is overly aggressive — disable in favour of code review
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Test-file override: expose Vitest globals so ESLint knows describe/it/expect/vi
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      // Test files intentionally import testing utilities without using them as vars
      'no-unused-vars': 'warn',
      'no-console': 'off', // diagnostic/test files legitimately print
    },
  },

  // e2e/spec files: Playwright specs legitimately log diagnostic output
  {
    files: ['**/e2e/**', '**/*.spec.{js,jsx}'],
    rules: { 'no-console': 'off' },
  },

  // Prettier must be last — disables all formatting rules that conflict
  prettierConfig,
];
