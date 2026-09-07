// ============================================================
// File:        api.js
// Path:        client/src/services/api.js
// Project:     RaceArena — RUNTIME-API-URL-1
// Created:     2026-04-29
// Description: THE ONE HOME for the address of the API. Everything that talks to the server imports
//              `API_BASE_URL` from here — 24 modules do — and nothing else resolves it.
//
// ── WHAT CHANGED, AND WHY IT HAD TO ─────────────────────────────────────────────────────────────
//
// This file used to read `import.meta.env.VITE_API_URL`, which Vite substitutes **when the client is
// BUILT**. The address was therefore part of the artefact: a bundle built for one host could not be
// installed on another, and DEPLOYMENT.md had to tell every operator to rebuild the client with
// their own domain before deploying.
//
// ★ THE OWNER'S REQUIREMENT, 2026-09-07: the built package must contain NO deployment address at
// all, so the SAME package can be installed on any server, and whoever installs it is asked for the
// address. That is impossible with a build-time value by construction — a build-time value is baked
// in, which is the definition of the thing being removed.
//
// ── THE THREE SOURCES, IN PRECEDENCE ORDER ──────────────────────────────────────────────────────
//
//   1. RUNTIME — `window.__RA_RUNTIME_CONFIG__.apiBaseUrl`, injected into the served `index.html`
//      by the server that serves this bundle (`server/src/runtimeConfig.js`). This is the
//      deployment answer and it wins, because it is the only one that can differ per install
//      without a rebuild.
//   2. BUILD-TIME — `import.meta.env.VITE_API_URL`, KEPT, and kept deliberately: the e2e harness
//      (`playwright.config.js:82`) and `scripts/viewer-invariants.mjs:581` both start a client
//      pointed at a throwaway API on a random port, and they do it through this variable. Those are
//      HARNESSES, not packages. ★ It is NOT set when the shipped client is built, and
//      `scripts/check-bundle-address.mjs` is what stops it being set by accident.
//   3. FALLBACK — `http://localhost:4000`, unchanged. With nothing configured the client talks to
//      exactly what it talked to before this piece, so the owner's dev server and his 4173 preview
//      are untouched.
//
// ── WHY NOT `virtual:ra-build`, WHICH ALREADY STAMPS THE CLIENT ─────────────────────────────────
//
// `vite-plugin-ra-build` resolves a virtual module in `resolveId`/`load` — at BUILD time, by
// construction, because the build identity IS a build-time fact and the plugin exists to make it
// honest. It cannot carry a value that must differ per installation of one artefact. Reusing it
// here would re-create the very defect this file removes.
//
// ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────
//
// It does not fetch anything, and it does not default to same-origin. Same-origin would be correct
// for the standalone image and WRONG for both of the owner's flows — dev on 5173 and the preview on
// 4173 both talk to an API on 4000 — which PUBLISH-STEPS-1 measured and is why that step stayed
// open. The runtime value is supplied by the server that serves the bundle; when no server does,
// the fallback is today's behaviour and nothing is guessed.
// ============================================================

/** Where the server puts the values it wants this bundle to read. One name, used in two files. */
export const RUNTIME_CONFIG_GLOBAL = '__RA_RUNTIME_CONFIG__';

/**
 * The address the SERVER told this bundle to use, or `undefined`.
 *
 * Tolerant on purpose about the shape it finds: the global is written by another process into HTML,
 * so "absent", "not an object" and "empty string" are all ordinary states meaning *not configured*,
 * and each must fall through to the next source rather than throw. A trailing slash is stripped so
 * that `https://host/` and `https://host` cannot produce two different request URLs.
 */
function runtimeApiBaseUrl() {
  if (typeof globalThis === 'undefined') return undefined;
  const value = globalThis[RUNTIME_CONFIG_GLOBAL]?.apiBaseUrl;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed === '' ? undefined : trimmed;
}

/**
 * The address baked in at BUILD time, or `undefined`. Harnesses only — see the header.
 *
 * The `typeof` guard is for Node: plain `node scripts/*.mjs` has no Vite env object, and without it
 * this line throws at IMPORT time, which once took down any script that reached a client module
 * importing this one (racer-types → here, START-BISECT-1 `a12b6ab7`).
 */
function buildTimeApiBaseUrl() {
  const value = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : undefined;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** What the client falls back to when nothing is configured. Today's behaviour, exactly. */
export const DEFAULT_API_BASE_URL = 'http://localhost:4000';

export const API_BASE_URL = runtimeApiBaseUrl() ?? buildTimeApiBaseUrl() ?? DEFAULT_API_BASE_URL;
