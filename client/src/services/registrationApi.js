// ============================================================
// File:        registrationApi.js
// Path:        client/src/services/registrationApi.js
// Project:     RaceArena — REGISTRATION-1
// Description: Player registration on the server. Two halves:
//                · the PUBLIC join link (`server/src/routes/join.js`) — read by the join page before
//                  anyone signs in, so a 401 never redirects (`_skipAuthRedirect`);
//                · the DIRECTOR's routes (`server/src/routes/registrations.js`) — signed in.
//              A refusal throws with the server's own sentence and its status (`apiCall`,
//              services/apiClient.js).
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const JOIN = `${API_BASE_URL}/api/join`;
const REGISTRATIONS = `${API_BASE_URL}/api/registrations`;

const json = (body) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ── The public join link ────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ eventName: string|null, trackName: string, capacity: number, placesLeft: number,
 *             state: 'open'|'closed', closesAt: string,
 *             you: null | { name: string, number: number, capacity: number, message: string } }} JoinInfo
 */

/** @returns {Promise<JoinInfo>} */
export async function fetchJoinInfo(code) {
  const res = await apiCall(`${JOIN}/${encodeURIComponent(code)}`, { _skipAuthRedirect: true });
  return res.json();
}

/** @returns {Promise<{ you: JoinInfo['you'] }>} */
export async function joinRegistration(code, name) {
  const res = await apiCall(`${JOIN}/${encodeURIComponent(code)}`, {
    method: 'POST',
    ...json({ name }),
    _skipAuthRedirect: true,
  });
  return res.json();
}

// ── The director's routes ───────────────────────────────────────────────────────────────────────

export async function createRegistration({ trackId, capacity, eventName, closesAt }) {
  const res = await apiCall(REGISTRATIONS, {
    method: 'POST',
    ...json({ trackId, capacity, eventName: eventName || null, closesAt }),
  });
  return res.json();
}

/** The team's registrations, newest first, without their names. */
export async function listRegistrations() {
  const res = await apiCall(REGISTRATIONS);
  return (await res.json()).registrations;
}

/** One registration with its names. */
export async function fetchRegistration(id) {
  const res = await apiCall(`${REGISTRATIONS}/${encodeURIComponent(id)}`);
  return res.json();
}

export async function closeRegistration(id) {
  const res = await apiCall(`${REGISTRATIONS}/${encodeURIComponent(id)}/close`, { method: 'POST' });
  return res.json();
}

export async function extendRegistration(id, closesAt) {
  const res = await apiCall(`${REGISTRATIONS}/${encodeURIComponent(id)}/extend`, {
    method: 'POST',
    ...json({ closesAt }),
  });
  return res.json();
}

export async function removeRegistrationEntry(id, entryId) {
  const res = await apiCall(
    `${REGISTRATIONS}/${encodeURIComponent(id)}/entries/${encodeURIComponent(entryId)}`,
    { method: 'DELETE' }
  );
  return res.json();
}

export async function deleteRegistration(id) {
  await apiCall(`${REGISTRATIONS}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
