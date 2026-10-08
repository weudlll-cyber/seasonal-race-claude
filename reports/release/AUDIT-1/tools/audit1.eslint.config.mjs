// AUDIT-1 A1 — audit-only ESLint config (lives in the audit clone, never committed).
// The project's own client config, plus: no-unused-vars with EVERY option at its strictest,
// no-unreachable as an error, and complexity reported over 25. Applied to client, server, shared
// and scripts so one run covers the whole tree. The base config's `files` globs are relative to
// client/, so they are re-rooted here by prefixing `client/`.
import base from './client/eslint.config.js';
import globals from './client/node_modules/globals/index.js';

const rerooted = base.map((c) =>
  c.files ? { ...c, files: c.files.map((f) => (f.startsWith('**/') ? f : `client/${f}`)) } : c
);

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'reports/**', 'exp-runaway-leader-results/**'] },
  ...rerooted,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          caughtErrors: 'all',
          ignoreRestSiblings: false,
          reportUsedIgnorePattern: true,
        },
      ],
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-constant-condition': 'error',
      complexity: ['warn', 25],
      'no-console': 'off',
    },
  },
];
