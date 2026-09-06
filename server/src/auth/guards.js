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
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/auth/setup-needed' },
  { method: 'POST', path: '/api/auth/setup' },
  { method: 'POST', path: '/api/auth/login' },
];

// ── Role-elevation policy (operator+ by default; explicit entries raise to admin) ─

const ROUTE_POLICY = [
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
    test: (p) =>
      /^\/api\/player-groups\/[^/]+(\/set-default|\/clear-default|\/export-seed)$/.test(p),
    role: 'admin',
    desc: 'player-groups promote/demote/export-seed — admin only (D1)',
  },
  // brands promote/demote/export-seed are admin-only (D3 §10b).
  // Regex matches ONLY the three admin sub-paths — NOT /logo or CRUD (role-leak guard).
  {
    methods: ['GET', 'POST'],
    test: (p) => /^\/api\/brands\/[^/]+(\/set-default|\/clear-default|\/export-seed)$/.test(p),
    role: 'admin',
    desc: 'brands promote/demote/export-seed — admin only (D3)',
  },
  // tracks promote/demote/export-seed are admin-only (D7 §10b/§9).
  // Regex matches ONLY the three admin sub-paths — NOT /background or CRUD (role-leak guard).
  {
    methods: ['GET', 'POST'],
    test: (p) => /^\/api\/tracks\/[^/]+(\/set-default|\/clear-default|\/export-seed)$/.test(p),
    role: 'admin',
    desc: 'tracks promote/demote/export-seed — admin only (D7)',
  },
];

// ── Path / method normalizers (exported for unit tests) ──────────────────────

function normalizeMethod(m) {
  return String(m).toUpperCase();
}

function normalizePath(p) {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

// HEAD → GET: Express routes HEAD requests to the matching GET handler, so HEAD
// must inherit the same role policy as GET. All other methods pass through as-is.
function policyMethod(m) {
  const upper = normalizeMethod(m);
  return upper === 'HEAD' ? 'GET' : upper;
}

// Single policy lookup used by both requiredRole and createRequireAdmin — ensures
// HEAD normalisation is applied identically in both callers.
function findPolicyEntry(routePolicy, method, path) {
  const m = policyMethod(method);
  const p = normalizePath(path);
  return routePolicy.find((e) => e.methods.map(normalizeMethod).includes(m) && e.test(p));
}

export function isPublicPath(method, path) {
  const m = normalizeMethod(method);
  const p = normalizePath(path);
  return PUBLIC_PATHS.some((e) => normalizeMethod(e.method) === m && normalizePath(e.path) === p);
}

export function requiredRole(method, path) {
  const entry = findPolicyEntry(ROUTE_POLICY, method, path);
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

    if (
      publicPaths.some(
        (e) => normalizeMethod(e.method) === method && normalizePath(e.path) === path
      )
    ) {
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

    // ── THE TEAM RIDES ON THE REQUEST, THE SAME WAY THE ROLE DOES ──────────────────────────────
    // A later piece filters stored races by team; it reads `req.authUser.team` and needs no second
    // lookup, which is what "the session carries the team" has to mean to be useful.
    //
    // IT IS DERIVED HERE, NOT FROZEN INTO THE SESSION AT LOGIN, and that is a decision rather than
    // an omission. `role` is already done exactly this way and `sessionEpoch` is the only user fact
    // stamped into the session — because the epoch's whole job is to be the OLD value, compared
    // against the record to detect staleness. A team stamped at login would be stale in the same
    // way with nothing to detect it: an admin moves a user to another team, and until that user
    // happens to log out and back in, the server keeps filing and showing their races under the
    // team they left. Reading it from the record per request costs nothing extra — requireAuth
    // already has the record in hand for the epoch check — and cannot go stale.
    //
    // A MISSING TEAM IS REPORTED, NEVER A REFUSAL. A user who predates the backfill has no team;
    // they still authenticate, and `team` is null. Turning a missing team into a 401 would lock
    // the owner out of his own only admin account if the migration had not been run, which is the
    // one outcome this piece must not be able to produce.
    if (!user.team) {
      console.warn(
        `[auth] user ${user.username} has no team — see scripts/migrate-teams.mjs. ` +
          'Sign-in is unaffected; anything filtered by team will not find this user.'
      );
    }

    req.authUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      team: user.team ?? null,
      teamNormalized: user.teamNormalized ?? null,
    }; // no hash
    next();
  };
}

export function createRequireAdmin({ routePolicy = ROUTE_POLICY } = {}) {
  return function requireAdmin(req, res, next) {
    const entry = findPolicyEntry(routePolicy, req.method, req.path);
    if (entry?.role === 'admin' && req.authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// ── Default singleton instances ───────────────────────────────────────────────

export const requireAuth = createRequireAuth();
export const requireAdmin = createRequireAdmin();
