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
import { apiCall } from './apiClient.js';

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
