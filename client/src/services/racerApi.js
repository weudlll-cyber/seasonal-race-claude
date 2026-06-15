// ============================================================
// File:        racerApi.js
// Path:        client/src/services/racerApi.js
// Project:     RaceArena
// Description: Frontend API client for racer CRUD + sprite operations (D5/D6a).
//              Mirrors brandApi.js. In D6a only fetchRacers is wired to the load
//              path; the remainder is provided for D6b (write path).
//              All functions throw on server errors; callers handle error UI.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/racers`;

// ── Operator+ CRUD ────────────────────────────────────────────────────────────

/** @returns {Promise<object[]>} */
export async function fetchRacers() {
  const res = await apiCall(BASE_URL);
  return res.json();
}

/**
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createRacer(data) {
  const res = await apiCall(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateRacer(id, data) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteRacer(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Sprite ────────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 * @param {File} file
 * @returns {Promise<{ spriteFile: string }>}
 */
export async function uploadRacerSprite(id, file) {
  const body = new FormData();
  body.append('sprite', file);
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/sprite`, {
    method: 'POST',
    body,
  });
  return res.json();
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteRacerSprite(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/sprite`, { method: 'DELETE' });
}
