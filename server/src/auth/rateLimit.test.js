// ============================================================
// File:        rateLimit.test.js
// Path:        server/src/auth/rateLimit.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Tests for per-IP rate limiters (login + setup)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createLoginLimiter, createSetupLimiter } from './rateLimit.js';

// Each test gets a fresh app + fresh limiter so per-IP buckets never bleed between cases.

function makeLoginApp({ limit, responseStatus = 401, skipSuccessfulRequests }) {
  const limiter = createLoginLimiter({
    limit,
    windowMs: 60_000,
    skip: () => false,  // force ON in test env
    ...(skipSuccessfulRequests !== undefined ? { skipSuccessfulRequests } : {}),
  });
  const app = express();
  app.use(limiter);
  app.post('/api/auth/login', (_req, res) => res.status(responseStatus).json({ ok: true }));
  return app;
}

function makeSetupApp({ limit, responseStatus = 200 }) {
  const limiter = createSetupLimiter({
    limit,
    windowMs: 60_000,
    skip: () => false,
  });
  const app = express();
  app.use(limiter);
  app.post('/api/auth/setup', (_req, res) => res.status(responseStatus).json({ ok: true }));
  return app;
}

describe('loginLimiter', () => {
  let app;

  it('blocks after the cap on FAILED attempts → [401, 401, 429]', async () => {
    app = makeLoginApp({ limit: 2, responseStatus: 401 });
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/login');
      statuses.push(res.status);
    }
    expect(statuses).toEqual([401, 401, 429]);
    const last = await request(app).post('/api/auth/login');
    expect(last.body.error).toBe('too many attempts, please try again later');
  });

  it('does NOT count successful logins (skipSuccessfulRequests default true) → all 200', async () => {
    app = makeLoginApp({ limit: 2, responseStatus: 200 });
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login');
      statuses.push(res.status);
    }
    // Successes must not consume the budget — all four should be 200.
    expect(statuses).toEqual([200, 200, 200, 200]);
  });

  it('default skip in test env: limiter off → 5 failed attempts never 429', async () => {
    // createLoginLimiter() with no overrides — uses the default skip: () => isTest.
    const limiter = createLoginLimiter({ limit: 2, windowMs: 60_000 });
    const defaultApp = express();
    defaultApp.use(limiter);
    defaultApp.post('/api/auth/login', (_req, res) => res.status(401).json({ ok: true }));

    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(defaultApp).post('/api/auth/login');
      statuses.push(res.status);
    }
    expect(statuses.every((s) => s === 401)).toBe(true);
  });

  it('standard RateLimit headers present on a rate-limited route', async () => {
    app = makeLoginApp({ limit: 5, responseStatus: 401 });
    const res = await request(app).post('/api/auth/login');
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});

describe('setupLimiter', () => {
  it('counts ALL attempts including successes → 3rd request is 429', async () => {
    const app = makeSetupApp({ limit: 2, responseStatus: 200 });
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/setup');
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 429]);
  });
});
