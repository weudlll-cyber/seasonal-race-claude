// ============================================================
// File:        trackApi.js
// Path:        client/src/services/trackApi.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Frontend API client for track write operations.
//              All functions throw on server errors so callers can show
//              a retry UI without knowing HTTP internals.
// ============================================================

import { API_BASE_URL } from './api.js';

const TIMEOUT_MS = 8000;

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
 * Create a new track on the server.
 * @param {object} trackData — geometry + metadata (no backgroundImage)
 * @returns {Promise<{id: string, geometryId: string, ...}>}
 */
export async function createTrackOnServer(trackData) {
  const res = await apiCall(`${API_BASE_URL}/api/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackData),
  });
  return res.json();
}

/**
 * Update an existing track on the server.
 * @param {string} id — server track ID
 * @param {object} trackData — geometry + metadata (no backgroundImage)
 * @returns {Promise<object>}
 */
export async function updateTrackOnServer(id, trackData) {
  const res = await apiCall(`${API_BASE_URL}/api/tracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackData),
  });
  return res.json();
}

/**
 * Delete a track from the server.
 * @param {string} id — server track ID
 * @returns {Promise<void>}
 */
export async function deleteTrackFromServer(id) {
  await apiCall(`${API_BASE_URL}/api/tracks/${id}`, { method: 'DELETE' });
}

/**
 * Remove the background image from a track.
 * @param {string} trackId — server track ID
 * @returns {Promise<void>}
 */
export async function removeTrackBackground(trackId) {
  await apiCall(`${API_BASE_URL}/api/tracks/${trackId}/background`, { method: 'DELETE' });
}

/**
 * Upload a background image for a track.
 * @param {string} trackId — server track ID
 * @param {File|Blob} fileOrBlob — image file (jpeg/png/webp)
 * @returns {Promise<{backgroundImageFile: string}>}
 */
export async function uploadTrackBackground(trackId, fileOrBlob) {
  const form = new FormData();
  if (fileOrBlob instanceof File) {
    form.append('background', fileOrBlob);
  } else {
    form.append('background', fileOrBlob, 'track.jpg');
  }
  const res = await apiCall(`${API_BASE_URL}/api/tracks/${trackId}/background`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}
