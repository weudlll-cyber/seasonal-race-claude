// ============================================================
// File:        surfaceClassApi.js
// Path:        client/src/services/surfaceClassApi.js
// Project:     RaceArena
// Description: Frontend API client for surface-class CRUD operations.
//              Mirrors the pattern of trackApi.js. All functions throw on
//              server errors; callers handle retry UI independently.
// ============================================================

import { API_BASE_URL } from './api.js';

const TIMEOUT_MS = 8000;
const BASE_URL = `${API_BASE_URL}/api/surface-classes`;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'Server nicht erreichbar. Bitte prüfe ob der Backend-Server läuft (docker-compose up im Repo-Verzeichnis), dann erneut versuchen.'
            )
          ),
        ms
      )
    ),
  ]);
}

async function apiCall(url, options = {}) {
  let res;
  try {
    res = await withTimeout(fetch(url, options), TIMEOUT_MS);
  } catch (err) {
    throw new Error(
      err.message.includes('docker-compose')
        ? err.message
        : 'Server nicht erreichbar. Bitte prüfe ob der Backend-Server läuft (docker-compose up im Repo-Verzeichnis), dann erneut versuchen.'
    );
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errMsg = body.error;
    } catch {
      // ignore parse failure
    }
    throw new Error(errMsg);
  }
  return res;
}

/**
 * Fetch all backend-stored surface classes (custom + default overrides).
 * Code defaults are NOT included — they live in defaults.js.
 * @returns {Promise<object[]>}
 */
export async function fetchSurfaceClasses() {
  const res = await apiCall(BASE_URL);
  return res.json();
}

/**
 * Create a new custom surface class.
 * @param {object} data — { id, label, generatorId, config }
 * @returns {Promise<object>}
 */
export async function createSurfaceClass(data) {
  const res = await apiCall(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Update an existing surface class (custom or default override).
 * @param {string} id
 * @param {object} data — partial or full class fields
 * @returns {Promise<object>}
 */
export async function updateSurfaceClass(id, data) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Delete a surface class.
 * Custom classes: removed permanently.
 * Default overrides: deleting the override resets the class to its code default.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteSurfaceClass(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
