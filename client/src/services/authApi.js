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

/**
 * Create the first admin.
 *
 * THE BOOTSTRAP TOKEN TRAVELS IN THE `x-bootstrap-token` HEADER, NEVER IN THE BODY, and that is the
 * whole content of this function. `POST /api/auth/setup` reads it with `req.get('x-bootstrap-token')`
 * and from nowhere else — its own comment says "header only, never body" and a server test asserts
 * the rejection of a body-only token. Until 2026-08-18 this function sent it as a body field, so the
 * server saw an empty token, `constantTimeEqual` failed, and every first-admin setup answered
 * **403 `setup not available`** — the same message it gives when no token is configured at all, so
 * the operator was told the wrong cause. Both suites were green over it: the server test asserted
 * the rejection, and the client test mocked `fetch` and asserted the parsed response, which cannot
 * see which channel anything travelled on.
 *
 * The token is deliberately NOT also placed in the body. The server would ignore it, and a secret
 * duplicated into a payload is one more place for it to be logged.
 *
 * A custom request header makes this a non-simple CORS request, so the browser sends a preflight
 * first. That is handled: `cors` is the second middleware in `server/src/app.js`, ahead of every
 * guard, and `corsOptions` sets no `allowedHeaders`, which makes the package reflect
 * `Access-Control-Request-Headers` back. Verified against a running server, not assumed — see
 * `reports/evolution/SETUP-TOKEN-CHANNEL-1.md`.
 */
export async function setup(username, password, token) {
  const res = await apiCall(`${base}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bootstrap-token': token },
    body: JSON.stringify({ username, password }),
    _skipAuthRedirect: true,
  });
  return await res.json();
}
