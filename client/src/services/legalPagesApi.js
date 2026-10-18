// ============================================================
// File:        legalPagesApi.js
// Path:        client/src/services/legalPagesApi.js
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The operator's legal pages on the server (`server/src/routes/settings.js`).
//              Reading is PUBLIC — the start screen's footer and the two legal pages ask before
//              anyone signs in — so a 401 never redirects (`_skipAuthRedirect`). Writing is
//              admin-only; the server's `ROUTE_POLICY` refuses anyone else. A refusal throws with the
//              server's own sentence (`apiCall`, services/apiClient.js).
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const URL_PATH = `${API_BASE_URL}/api/settings/legal-pages`;

/**
 * @typedef {{ legalNotice: string, privacyPolicy: string, maxChars: number,
 *             sourceUrl: string|null }} LegalPages
 */

/** @returns {Promise<LegalPages>} */
export async function fetchLegalPages() {
  const res = await apiCall(URL_PATH, { _skipAuthRedirect: true });
  return res.json();
}

/**
 * @param {{ legalNotice?: string, privacyPolicy?: string }} texts
 * @returns {Promise<LegalPages>} the texts as stored
 */
export async function saveLegalPages(texts) {
  const res = await apiCall(URL_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(texts),
    _skipAuthRedirect: true,
  });
  return res.json();
}
