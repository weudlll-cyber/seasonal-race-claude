// ============================================================
// File:        settingsApi.js
// Path:        client/src/services/settingsApi.js
// Project:     RaceArena — TEST-AIDS-1
// Description: The installation-wide settings on the server — today the test-aids switch. Read by
//              every signed-in user, written by admins (the server's `ROUTE_POLICY` refuses anyone
//              else). Callers go through `modules/testAids.js`, which owns what an answer means.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/settings`;

/** @returns {Promise<{enabled: boolean}>} */
export async function fetchTestAids() {
  const res = await apiCall(`${BASE_URL}/test-aids`, { _skipAuthRedirect: true });
  if (!res.ok) throw new Error(`test-aids: ${res.status}`);
  return res.json();
}

/**
 * @param {boolean} enabled
 * @returns {Promise<{enabled: boolean}>} the value as stored
 */
export async function saveTestAids(enabled) {
  const res = await apiCall(`${BASE_URL}/test-aids`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
    _skipAuthRedirect: true,
  });
  if (!res.ok) throw new Error(`test-aids: ${res.status}`);
  return res.json();
}
