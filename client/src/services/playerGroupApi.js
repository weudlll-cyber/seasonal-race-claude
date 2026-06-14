// ============================================================
// File:        playerGroupApi.js
// Path:        client/src/services/playerGroupApi.js
// Project:     RaceArena
// Description: Frontend API client for player-group CRUD + admin operations.
//              Mirrors surfaceClassApi.js. All functions throw on server errors;
//              callers handle error UI independently.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/player-groups`;

// ── Operator+ CRUD ────────────────────────────────────────────────────────────

/** @returns {Promise<object[]>} */
export async function fetchPlayerGroups() {
  const res = await apiCall(BASE_URL);
  return res.json();
}

/**
 * @param {{ name: string, players: string[], id?: string }} data
 * @returns {Promise<object>}
 */
export async function createPlayerGroup(data) {
  const res = await apiCall(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * @param {string} id
 * @param {{ name: string, players: string[] }} data
 * @returns {Promise<object>}
 */
export async function updatePlayerGroup(id, data) {
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
export async function deletePlayerGroup(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Admin promote/demote/export (not wired in D2 UI — available for D2b) ─────

/** @returns {Promise<object>} */
export async function setPlayerGroupDefault(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/set-default`, {
    method: 'POST',
  });
  return res.json();
}

/** @returns {Promise<object>} */
export async function clearPlayerGroupDefault(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/clear-default`, {
    method: 'POST',
  });
  return res.json();
}

/** @returns {Promise<object>} */
export async function exportPlayerGroupSeed(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/export-seed`);
  return res.json();
}
