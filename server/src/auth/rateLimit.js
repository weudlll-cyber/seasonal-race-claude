// ============================================================
// File:        rateLimit.js
// Path:        server/src/auth/rateLimit.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Per-IP rate limiters for login + setup endpoints (§7.1)
//              Uses express-rate-limit v8 (option: `limit`, not `max`).
// ============================================================

import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

// ── Login limiter ─────────────────────────────────────────────────────────────

export function createLoginLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? Number(process.env.RA_LOGIN_RL_WINDOW_MS ?? 15 * 60 * 1000),
    limit: opts.limit ?? Number(process.env.RA_LOGIN_RL_MAX ?? 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? true, // only failed logins count
    skip: opts.skip ?? (() => isTest), // off in test (shared-IP buckets)
    validate: { trustProxy: false }, // app.set('trust proxy', 1) is deliberate — suppress warning
    handler: (_req, res) =>
      res.status(429).json({ error: 'too many attempts, please try again later' }),
  });
}

// ── Setup limiter ─────────────────────────────────────────────────────────────

export function createSetupLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? Number(process.env.RA_SETUP_RL_WINDOW_MS ?? 60 * 60 * 1000),
    limit: opts.limit ?? Number(process.env.RA_SETUP_RL_MAX ?? 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false, // setup is one-time; count all
    skip: opts.skip ?? (() => isTest),
    validate: { trustProxy: false },
    handler: (_req, res) =>
      res.status(429).json({ error: 'too many attempts, please try again later' }),
  });
}

// ── Change-password limiter ───────────────────────────────────────────────────

/**
 * THE OWNER'S DECISION, 2026-08-19: `POST /api/auth/change-password` is limited to FIVE.
 *
 * WHY IT KEYS ON THE USER AND NOT THE IP, which is the one way it differs from the two above.
 * Login and setup are ANONYMOUS routes — there is no caller identity to key on, so the IP is the
 * only bucket available, and its known cost is that everyone behind one address shares it. This
 * route is AUTHENTICATED: the guard has already resolved `req.authUser` from the session cookie, so
 * the actual subject is known. Keying on the IP here would mean one operator exhausting the budget
 * of every colleague on the same office address, which on a per-install tool is the normal case
 * rather than the exception. `ipKeyGenerator` remains the fallback so an unauthenticated caller —
 * which the guard stack should already have rejected — still lands in an IPv6-safe bucket rather
 * than a single shared one.
 *
 * NO NEW ENV KEY. The window is the LOGIN window, read from the same variable, because inventing a
 * second window was explicitly out of scope and this is the same kind of guess against the same
 * kind of secret. Only the count is this route's own, and it is the owner's number, not a chosen
 * one.
 *
 * FAILED ATTEMPTS ONLY (`skipSuccessfulRequests`), so changing your password successfully five
 * times in a row is never punished — what is being limited is guessing the CURRENT password.
 *
 * The 429 body is the same sentence the other two use, so a limited caller learns nothing the login
 * path would not tell them.
 */
export function createChangePasswordLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? Number(process.env.RA_LOGIN_RL_WINDOW_MS ?? 15 * 60 * 1000),
    limit: opts.limit ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? true,
    keyGenerator: opts.keyGenerator ?? ((req) => req.authUser?.id ?? ipKeyGenerator(req.ip)),
    skip: opts.skip ?? (() => isTest),
    validate: { trustProxy: false },
    handler: (_req, res) =>
      res.status(429).json({ error: 'too many attempts, please try again later' }),
  });
}

// ── Default singleton instances (skip in test env) ────────────────────────────

export const loginLimiter = createLoginLimiter();
export const setupLimiter = createSetupLimiter();
export const changePasswordLimiter = createChangePasswordLimiter();
