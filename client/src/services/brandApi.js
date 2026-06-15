// ============================================================
// File:        brandApi.js
// Path:        client/src/services/brandApi.js
// Project:     RaceArena
// Description: Frontend API client for brand CRUD + logo + admin operations.
//              Mirrors playerGroupApi.js. All functions throw on server errors;
//              callers handle error UI independently.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/brands`;

// ── Operator+ CRUD ────────────────────────────────────────────────────────────

/** @returns {Promise<object[]>} */
export async function fetchBrands() {
  const res = await apiCall(BASE_URL);
  return res.json();
}

/**
 * @param {{ name: string, eventName: string, [key: string]: unknown }} data
 * @returns {Promise<object>}
 */
export async function createBrand(data) {
  const res = await apiCall(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * @param {string} id
 * @param {{ name: string, eventName: string, [key: string]: unknown }} data
 * @returns {Promise<object>}
 */
export async function updateBrand(id, data) {
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
export async function deleteBrand(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Logo ──────────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 * @param {File} file
 * @returns {Promise<{ logoFile: string }>}
 */
export async function uploadBrandLogo(id, file) {
  const body = new FormData();
  body.append('logo', file);
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/logo`, {
    method: 'POST',
    body,
  });
  return res.json();
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteBrandLogo(id) {
  await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/logo`, { method: 'DELETE' });
}

// ── Admin promote/demote/export (not wired in D4 UI — available for D4b) ─────

/** @returns {Promise<object>} */
export async function setBrandDefault(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/set-default`, {
    method: 'POST',
  });
  return res.json();
}

/** @returns {Promise<object>} */
export async function clearBrandDefault(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/clear-default`, {
    method: 'POST',
  });
  return res.json();
}

/** @returns {Promise<object>} */
export async function exportBrandSeed(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}/export-seed`);
  return res.json();
}
