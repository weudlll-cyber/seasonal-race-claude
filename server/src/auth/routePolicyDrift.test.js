// ============================================================
// File:        routePolicyDrift.test.js
// Path:        server/src/auth/routePolicyDrift.test.js
// Project:     RaceArena
// Description: Route-surface drift guard — fails when a new mutating /api route
//              is added without an explicit role decision.
//
//              HOW IT WORKS
//              ─────────────
//              1. Walk the real router stack (per-router import + mount prefix from app.js)
//                 to enumerate every mutating route (POST/PUT/DELETE/PATCH).
//              2. For each route, check it is EITHER:
//                 a) admin-classified: requiredRole(method, canonicalPath) === 'admin', OR
//                 b) in the explicit OPERATOR_PLUS_ALLOWLIST (operator+ — default role).
//              3. Any route that fails both checks makes the suite RED with a diagnostic.
//
//              ADDING A NEW ROUTE
//              ─────────────────
//              If you add a mutating route and the test fails, you MUST add an entry to
//              OPERATOR_PLUS_ALLOWLIST (if operator+ is correct) or extend ROUTE_POLICY in
//              guards.js (if admin-only is correct). Do not disable this test.
// ============================================================

import { describe, it, expect } from 'vitest';
import { requiredRole } from './guards.js';

// ── Router imports + mount map (mirrors app.js) ───────────────────────────────

import authRouter from './authRouter.js';
import usersRouter from './usersRouter.js';
import tracksRouter from '../routes/tracks.js';
import surfaceClassesRouter from '../routes/surfaceClasses.js';
import playerGroupsRouter from '../routes/playerGroups.js';
import brandsRouter from '../routes/brands.js';
import racersRouter from '../routes/racers.js';
import seedNoticesRouter from '../routes/seedNotices.js';
import racesRouter from '../routes/races.js';

const MOUNT_MAP = [
  { prefix: '/api/auth', router: authRouter },
  { prefix: '/api/users', router: usersRouter },
  { prefix: '/api/tracks', router: tracksRouter },
  { prefix: '/api/surface-classes', router: surfaceClassesRouter },
  { prefix: '/api/player-groups', router: playerGroupsRouter },
  { prefix: '/api/brands', router: brandsRouter },
  { prefix: '/api/racers', router: racersRouter },
  { prefix: '/api/seed-notices', router: seedNoticesRouter },
  { prefix: '/api/races', router: racesRouter },
];

// ── Operator-plus allowlist (these do NOT require admin) ──────────────────────
//
// Every entry is { method, pathPattern } where pathPattern is a string that
// the actual discovered path must startWith (covers param variants like /:id).
//
// Auth sub-routes (setup, login, logout) are public — they pass requireAuth
// on the PUBLIC_PATHS list — but are still operator+ by role classification
// (they don't require admin). We list them here to avoid false-positives.

const OPERATOR_PLUS_ALLOWLIST = [
  // /api/auth — public bootstrap/session routes (no admin required)
  { method: 'POST', pathPattern: '/api/auth/setup' },
  { method: 'POST', pathPattern: '/api/auth/login' },
  { method: 'POST', pathPattern: '/api/auth/logout' },
  // Self-service password change: authenticated, ANY role, and the target is always the
  // requesting session's own user (never the body) — so operator+ is the correct classification.
  { method: 'POST', pathPattern: '/api/auth/change-password' },
  // /api/tracks CRUD + background asset (set-default/clear-default are admin via ROUTE_POLICY)
  { method: 'POST', pathPattern: '/api/tracks' },
  { method: 'PUT', pathPattern: '/api/tracks' },
  { method: 'DELETE', pathPattern: '/api/tracks' },
  // /api/player-groups CRUD (set-default/clear-default/export-seed are admin via ROUTE_POLICY)
  { method: 'POST', pathPattern: '/api/player-groups' },
  { method: 'PUT', pathPattern: '/api/player-groups' },
  { method: 'DELETE', pathPattern: '/api/player-groups' },
  // /api/brands CRUD + logo asset (set-default/clear-default/export-seed are admin via ROUTE_POLICY)
  { method: 'POST', pathPattern: '/api/brands' },
  { method: 'PUT', pathPattern: '/api/brands' },
  { method: 'DELETE', pathPattern: '/api/brands' },
  // /api/racers CRUD + sprite asset (no admin sub-routes)
  { method: 'POST', pathPattern: '/api/racers' },
  { method: 'PUT', pathPattern: '/api/racers' },
  { method: 'DELETE', pathPattern: '/api/racers' },
  // /api/seed-notices/dismiss — SEED-REDELIVERY-1. Operator+ on purpose: EVERY operator is owed
  // the redelivery warning, so an operator-only install must be able to clear its own banner.
  // It writes nothing but the dismissal and reads nothing but record names already visible to
  // any signed-in user through /api/tracks.
  { method: 'POST', pathPattern: '/api/seed-notices/dismiss' },
  // /api/races — RACE-SAVE-3. Operator+ ON PURPOSE: every operator runs races and every operator's
  // races must be kept, so an operator-only install must be able to store its own. It is still
  // authenticated (not on PUBLIC_PATHS), and the TEAM it is filed under comes from the session, not
  // from the body — so being able to call it does not let anyone choose whose history they join.
  { method: 'POST', pathPattern: '/api/races' },
];

// ── Route extraction ──────────────────────────────────────────────────────────

const MUTATING = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function extractRoutes(router, mountPrefix) {
  const routes = [];
  for (const layer of router.stack ?? []) {
    if (layer.route) {
      const routePath = layer.route.path === '/' ? '' : layer.route.path;
      const fullPath = mountPrefix + routePath;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ method: method.toUpperCase(), path: fullPath });
      }
    } else if (layer.handle?.stack) {
      // Nested sub-router — derive sub-prefix from the regexp source heuristic.
      // Express compiles '/prefix' to ^\/prefix\/?(?=\/|$)/i; we extract the
      // literal prefix by stripping regexp metacharacters from the source.
      const src = layer.regexp?.source ?? '';
      const m = src.match(/^\^\\\/([^\\()?$*+[\]{}|]+)/);
      const subPrefix = m ? '/' + m[1].replace(/\\\//g, '/') : '';
      routes.push(...extractRoutes(layer.handle, mountPrefix + subPrefix));
    }
  }
  return routes;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('route-surface drift guard', () => {
  const allMutating = MOUNT_MAP.flatMap(({ prefix, router }) =>
    extractRoutes(router, prefix).filter(({ method }) => MUTATING.has(method))
  );

  it('discovers at least 20 mutating routes (sanity: enumeration is working)', () => {
    expect(allMutating.length).toBeGreaterThanOrEqual(20);
  });

  it('every mutating /api route is either admin-classified or in the operator+ allowlist', () => {
    const unclassified = [];
    for (const { method, path } of allMutating) {
      const isAdmin = requiredRole(method, path) === 'admin';
      const isAllowlisted = OPERATOR_PLUS_ALLOWLIST.some(
        (e) => e.method === method && path.startsWith(e.pathPattern)
      );
      if (!isAdmin && !isAllowlisted) {
        unclassified.push(`${method} ${path}`);
      }
    }
    expect(
      unclassified,
      `Unclassified mutating routes found — add each to OPERATOR_PLUS_ALLOWLIST ` +
        `(operator+) or ROUTE_POLICY in guards.js (admin): ${unclassified.join(', ')}`
    ).toEqual([]);
  });

  it('all /api/users mutating routes are admin-classified', () => {
    const usersMutating = allMutating.filter(({ path }) => path.startsWith('/api/users'));
    expect(usersMutating.length).toBeGreaterThan(0);
    for (const { method, path } of usersMutating) {
      expect(requiredRole(method, path), `${method} ${path} must be admin-only`).toBe('admin');
    }
  });

  it('all /api/surface-classes mutating routes are admin-classified', () => {
    const scMutating = allMutating.filter(({ path }) => path.startsWith('/api/surface-classes'));
    expect(scMutating.length).toBeGreaterThan(0);
    for (const { method, path } of scMutating) {
      expect(requiredRole(method, path), `${method} ${path} must be admin-only`).toBe('admin');
    }
  });
});
