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
import { createLoginLimiter, createSetupLimiter, createChangePasswordLimiter } from './rateLimit.js';

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


// ── Change-password limiter (START: PIECE 1, the owner's FIVE) ─────────────────────────────────
//
// It keys on the SESSION'S USER, not the IP, so these apps stamp `req.authUser` the way the guard
// stack does before the limiter runs in `app.js`.

function makeChangePwApp({ limit = 5, responseStatus = 401, userId = 'u1' } = {}) {
  const limiter = createChangePasswordLimiter({ limit, windowMs: 60_000, skip: () => false });
  const app = express();
  app.use((req, _res, next) => {
    req.authUser = { id: req.get('x-test-user') ?? userId };
    next();
  });
  app.use(limiter);
  app.post('/api/auth/change-password', (_req, res) => res.status(responseStatus).json({ ok: true }));
  return app;
}

describe('changePasswordLimiter', () => {
  // DELETE THIS and the route goes back to unlimited guessing of the CURRENT password by whoever
  // holds a session — the whole reason the owner asked for a limit.
  it('five failures answer normally and the SIXTH is limited', async () => {
    const app = makeChangePwApp({ limit: 5, responseStatus: 401 });
    const seen = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/api/auth/change-password').send({});
      seen.push(res.status);
    }
    expect(seen).toEqual([401, 401, 401, 401, 401, 429]);
  });

  // DELETE THIS and the five rejections could start differing from one another — a caller could
  // learn from the SHAPE of the answer how close to the cap they are, which the login path would
  // never tell them.
  it('every one of the five is rejected the same way as the first', async () => {
    const app = makeChangePwApp({ limit: 5, responseStatus: 401 });
    const bodies = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/change-password').send({});
      bodies.push(JSON.stringify(res.body));
    }
    expect(new Set(bodies).size).toBe(1);
  });

  // DELETE THIS and a user who keeps changing their password successfully could be locked out of
  // doing so — punishing the exact behaviour this feature exists to allow.
  it('a SUCCESSFUL change is never counted', async () => {
    const app = makeChangePwApp({ limit: 5, responseStatus: 200 });
    const seen = [];
    for (let i = 0; i < 8; i++) {
      const res = await request(app).post('/api/auth/change-password').send({});
      seen.push(res.status);
    }
    expect(seen.every((s) => s === 200)).toBe(true);
  });

  // DELETE THIS and the counter could silently go back to keying on the IP, where one operator
  // exhausts the budget of everyone at the same address — the normal case on a per-install tool,
  // not the exception.
  it('the limit does not leak across users', async () => {
    const app = makeChangePwApp({ limit: 5, responseStatus: 401 });
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/change-password').set('x-test-user', 'alice').send({});
    }
    const aliceNext = await request(app)
      .post('/api/auth/change-password').set('x-test-user', 'alice').send({});
    const bobFirst = await request(app)
      .post('/api/auth/change-password').set('x-test-user', 'bob').send({});

    expect(aliceNext.status).toBe(429);   // alice is spent
    expect(bobFirst.status).toBe(401);    // bob is untouched
  });

  // DELETE THIS and a limited caller could start being told something the login path would not
  // say — that the account exists, or that the limit is per-user.
  it('a limited caller is told exactly what the login limiter says', async () => {
    const cpApp = makeChangePwApp({ limit: 1, responseStatus: 401 });
    await request(cpApp).post('/api/auth/change-password').send({});
    const limited = await request(cpApp).post('/api/auth/change-password').send({});

    const loginLimited = createLoginLimiter({ limit: 1, windowMs: 60_000, skip: () => false });
    const lApp = express();
    lApp.use(loginLimited);
    lApp.post('/api/auth/login', (_req, res) => res.status(401).json({ ok: true }));
    await request(lApp).post('/api/auth/login').send({});
    const loginRes = await request(lApp).post('/api/auth/login').send({});

    expect(limited.status).toBe(loginRes.status);
    expect(limited.body).toEqual(loginRes.body);
  });
});
