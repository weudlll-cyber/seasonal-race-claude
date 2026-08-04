// ============================================================
// File:        api.js
// Path:        client/src/services/api.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Single-export config — exposes API_BASE_URL read from
//              VITE_API_URL env var (set in .env to override; fallback localhost:4000).
//              Single place to update when the server host changes.
//
//              The `import.meta.env` guard is for Node: plain `node scripts/*.mjs` has no Vite env
//              object, and without the guard this line throws at IMPORT time — which took down any
//              script that reached a client module importing it (racer-types → here). Same value
//              under Vite; the fallback is the only path Node ever takes.
// ============================================================

export const API_BASE_URL =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : undefined) ??
  'http://localhost:4000';
