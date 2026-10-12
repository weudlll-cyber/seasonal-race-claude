// ============================================================
// File:        adminStatusApi.js
// Path:        client/src/services/adminStatusApi.js
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: Reads `GET /api/admin/status` — the build, the newest backup, the install's status
//              checks and whether a newer release exists. Admin-only on the server (`ROUTE_POLICY`);
//              read-only, so there is nothing here to write. Throws on any failure, like every
//              service module; the status box says the status could not be read.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

/**
 * @returns {Promise<{
 *   build: { commit: string, branch: string, dirty?: boolean, reason?: string },
 *   backup: { newest: string|null, visible: boolean },
 *   status: { ok: boolean, checks: { name: string, ok: boolean, detail: string }[] },
 *   release: { newest: string|null, current: string|null, newer: boolean|null,
 *              checkedAt: string, state: 'ok'|'unknown' },
 * }>}
 */
export async function fetchAdminStatus() {
  const res = await apiCall(`${API_BASE_URL}/api/admin/status`);
  return res.json();
}
