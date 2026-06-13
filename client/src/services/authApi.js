// ============================================================
// File:        authApi.js
// Path:        client/src/services/authApi.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Auth API service — thin wrappers around /api/auth/* endpoints
// ============================================================

import { apiCall } from './apiClient.js';
import { API_BASE_URL } from './api.js';

const base = `${API_BASE_URL}/api/auth`;

export async function getMe() {
  try {
    const res = await apiCall(`${base}/me`, { _skipAuthRedirect: true });
    return await res.json();
  } catch (e) {
    if (e.status === 401) return null;
    throw e;
  }
}

export async function login(username, password) {
  const res = await apiCall(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    _skipAuthRedirect: true,
  });
  return await res.json();
}

export async function logout() {
  await apiCall(`${base}/logout`, { method: 'POST', _skipAuthRedirect: true });
}

export async function getSetupNeeded() {
  const res = await apiCall(`${base}/setup-needed`, { _skipAuthRedirect: true });
  const b = await res.json();
  return !!b.setupNeeded;
}

export async function setup(username, password, token) {
  const res = await apiCall(`${base}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, token }),
    _skipAuthRedirect: true,
  });
  return await res.json();
}
