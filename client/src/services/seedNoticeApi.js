// ============================================================
// File:        seedNoticeApi.js
// Path:        client/src/services/seedNoticeApi.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: Frontend API client for the redelivery warning. Two calls, matching the two
//              routes: what is pending, and clear it.
//
//              The warning lives on the SERVER on purpose — the install is what had its records
//              replaced, so the install is what remembers being owed a warning. Nothing here
//              writes to localStorage; a dismissal that only this browser knows about would go
//              silent here and re-warn on the next machine.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/seed-notices`;

/**
 * Pending redelivery warnings, oldest first.
 * @returns {Promise<object[]>}
 */
export async function fetchSeedNotices() {
  const res = await apiCall(BASE_URL);
  const body = await res.json();
  return Array.isArray(body?.notices) ? body.notices : [];
}

/**
 * Clear every pending warning. The operator has seen it.
 * @returns {Promise<number>} how many were cleared
 */
export async function dismissSeedNotices() {
  const res = await apiCall(`${BASE_URL}/dismiss`, { method: 'POST' });
  const body = await res.json();
  return typeof body?.cleared === 'number' ? body.cleared : 0;
}
