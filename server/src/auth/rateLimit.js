// ============================================================
// File:        rateLimit.js
// Path:        server/src/auth/rateLimit.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Per-IP rate limiters for login + setup endpoints (§7.1)
//              Uses express-rate-limit v8 (option: `limit`, not `max`).
// ============================================================

import { rateLimit } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

// ── Login limiter ─────────────────────────────────────────────────────────────

export function createLoginLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? Number(process.env.RA_LOGIN_RL_WINDOW_MS ?? 15 * 60 * 1000),
    limit:    opts.limit    ?? Number(process.env.RA_LOGIN_RL_MAX        ?? 10),
    standardHeaders: true,
    legacyHeaders:   false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? true,  // only failed logins count
    skip: opts.skip ?? (() => isTest),                             // off in test (shared-IP buckets)
    validate: { trustProxy: false },  // app.set('trust proxy', 1) is deliberate — suppress warning
    handler: (_req, res) =>
      res.status(429).json({ error: 'too many attempts, please try again later' }),
  });
}

// ── Setup limiter ─────────────────────────────────────────────────────────────

export function createSetupLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? Number(process.env.RA_SETUP_RL_WINDOW_MS ?? 60 * 60 * 1000),
    limit:    opts.limit    ?? Number(process.env.RA_SETUP_RL_MAX        ?? 10),
    standardHeaders: true,
    legacyHeaders:   false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false,  // setup is one-time; count all
    skip: opts.skip ?? (() => isTest),
    validate: { trustProxy: false },
    handler: (_req, res) =>
      res.status(429).json({ error: 'too many attempts, please try again later' }),
  });
}

// ── Default singleton instances (skip in test env) ────────────────────────────

export const loginLimiter = createLoginLimiter();
export const setupLimiter = createSetupLimiter();
