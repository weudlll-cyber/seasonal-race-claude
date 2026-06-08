// ============================================================
// File:        surfaceClassApi.js
// Path:        client/src/services/surfaceClassApi.js
// Project:     RaceArena
// Description: Frontend API client for surface-class CRUD operations.
//              Mirrors the pattern of trackApi.js. All functions throw on
//              server errors; callers handle retry UI independently.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/surface-classes`;

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
