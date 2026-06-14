// ============================================================
// File:        guards.js
// Path:        server/src/auth/guards.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: deny-by-default auth guard — requireAuth + PUBLIC_PATHS + requireAdmin/ROUTE_POLICY
// ============================================================

import defaultStore from './usersStore.js';

// ── Allow-list (no auth required) ────────────────────────────────────────────

export const PUBLIC_PATHS = [
  { method: 'GET',  path: '/api/health' },
  { method: 'GET',  path: '/api/auth/setup-needed' },
  { method: 'POST', path: '/api/auth/setup' },
  { method: 'POST', path: '/api/auth/login' },
];

// ── Role-elevation policy (operator+ by default; explicit entries raise to admin) ─

export const ROUTE_POLICY = [
  // All /api/users methods are admin-only — operator cannot list or manage users (AUTH.md §2).
  {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    test: (p) => /^\/api\/users(\/.*)?$/.test(p),
    role: 'admin',
    desc: 'user management — admin only (AUTH.md §2/§9)',
  },
  // Mutating surface-classes routes are ADVANCED → admin only (§7). GET stays operator+.
  {
    methods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    test: (p) => /^\/api\/surface-classes(\/.*)?$/.test(p),
    role: 'admin',
    desc: 'surface-classes mutations (ADVANCED §7)',
  },
  // player-groups promote/demote/export-seed are admin-only (D1 §10b).
  // Regex matches ONLY the three sub-paths — NOT the general CRUD paths (role-leak guard).
  {
    methods: ['GET', 'POST'],
    test: (p) => /^\/api\/player-groups\/[^/]+(\/set-default|\/clear-default|\/export-seed)$/.test(p),
    role: 'admin',
    desc: 'player-groups promote/demote/export-seed — admin only (D1)',
  },
];

// ── Path / method normalizers (exported for unit tests) ──────────────────────

export function normalizeMethod(m) {
  return String(m).toUpperCase();
}

export function normalizePath(p) {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

export function isPublicPath(method, path) {
  const m = normalizeMethod(method);
  const p = normalizePath(path);
  return PUBLIC_PATHS.some(
    (e) => normalizeMethod(e.method) === m && normalizePath(e.path) === p
  );
}

export function requiredRole(method, path) {
  const m = normalizeMethod(method);
  const p = normalizePath(path);
  const entry = ROUTE_POLICY.find(
    (e) => e.methods.map(normalizeMethod).includes(m) && e.test(p)
  );
  return entry?.role ?? null;
}

// ── Guard factories ───────────────────────────────────────────────────────────

export function createRequireAuth({ publicPaths = PUBLIC_PATHS, store = defaultStore } = {}) {
  return function requireAuth(req, res, next) {
    const path = normalizePath(req.path);
    const method = normalizeMethod(req.method);

    // Scope: this guard only governs /api/*. Non-/api requests pass through.
    // This is scoping, NOT an auth wildcard — the allowlist is still exact-match.
    if (path !== '/api' && !path.startsWith('/api/')) return next();

    if (publicPaths.some((e) => normalizeMethod(e.method) === method && normalizePath(e.path) === path)) {
      return next();
    }

    if (!req.session?.userId) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    const user = store.findAuthRecordById(req.session.userId);
    if (!user) {
      // User deleted while session was alive — fail closed.
      return req.session.destroy(() => res.status(401).json({ error: 'not authenticated' }));
    }

    // Session-epoch check: password reset bumps the epoch on the record; sessions that
    // predate the reset carry the old epoch and are rejected. Missing epoch on either side
    // defaults to 0 so existing sessions/records are never invalidated on deploy.
    if ((req.session.sessionEpoch ?? 0) !== (user.sessionEpoch ?? 0)) {
      return req.session.destroy(() => res.status(401).json({ error: 'not authenticated' }));
    }

    req.authUser = { id: user.id, username: user.username, role: user.role };  // no hash
    next();
  };
}

export function createRequireAdmin({ routePolicy = ROUTE_POLICY } = {}) {
  return function requireAdmin(req, res, next) {
    const path = normalizePath(req.path);
    const method = normalizeMethod(req.method);
    const entry = routePolicy.find(
      (e) => e.methods.map(normalizeMethod).includes(method) && e.test(path)
    );
    if (entry?.role === 'admin' && req.authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// ── Default singleton instances ───────────────────────────────────────────────

export const requireAuth = createRequireAuth();
export const requireAdmin = createRequireAdmin();
