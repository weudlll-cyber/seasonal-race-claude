// ============================================================
// File:        api.js
// Path:        client/src/services/api.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Axios HTTP client wrapper for all REST API calls
// ============================================================

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
};
