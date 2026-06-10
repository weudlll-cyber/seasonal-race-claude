// ============================================================
// File:        api.js
// Path:        client/src/services/api.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Single-export config — exposes API_BASE_URL read from
//              VITE_API_URL env var (set in .env to override; fallback localhost:4000).
//              Single place to update when the server host changes.
// ============================================================

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
