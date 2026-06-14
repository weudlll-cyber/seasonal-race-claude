// ============================================================
// File:        usersApi.js
// Path:        client/src/services/usersApi.js
// Project:     RaceArena
// Description: Frontend API client for race-director (user) CRUD operations.
//              Mirrors the pattern of surfaceClassApi.js. All functions throw
//              on server errors; callers handle retry UI independently.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/users`;

export async function fetchUsers() {
  const res = await apiCall(BASE_URL);
  return res.json();
}

export async function createUser(data) {
  const res = await apiCall(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateUser(id, data) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteUser(id) {
  const res = await apiCall(`${BASE_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res.json();
}
