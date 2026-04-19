// ============================================================
// File:        eslint.config.js
// Path:        client/eslint.config.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: ESLint v9 flat config — React + hooks rules, Prettier compat
// ============================================================

import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

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
      react: { version: 'detect' },
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
    },
  },

  // Prettier must be last — disables all formatting rules that conflict
  prettierConfig,
];
