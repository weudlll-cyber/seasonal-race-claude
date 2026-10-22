// ============================================================
// File:        bcryptCost.test.js
// Path:        server/src/auth/bcryptCost.test.js
// Project:     RaceArena — fix/test-bcrypt-cost
// Created:     2026-10-22
// Description: The three things the tests' low bcrypt cost (test/env-setup.js) must never touch.
//              (a) Outside NODE_ENV=test the production cost is used even with the switch set —
//                  proved in a CHILD PROCESS, a real `NODE_ENV=production` node, not by calling
//                  the function with a hand-built environment alone.
//              (b) A hash made at the production cost still verifies — every existing user keeps
//                  signing in.
//              (c) The password minimum length and the rate limits are what they were.
//              Each was broken once on purpose when written (docs/VERIFY-RULES.md).
// ============================================================

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import express from 'express';
import request from 'supertest';
import {
  BCRYPT_COST,
  bcryptCost,
  hashPassword,
  verifyPassword,
  timingDummyHash,
  assertNewPassword,
  PASSWORD_MIN_LENGTH,
} from './usersStore.js';
import {
  createLoginLimiter,
  createSetupLimiter,
  createChangePasswordLimiter,
  createJoinLimiter,
} from './rateLimit.js';

const USERS_STORE_URL = new URL('./usersStore.js', import.meta.url).href;
const costOf = (hash) => Number(hash.split('$')[2]);

describe('(a) the production cost outside the test environment', () => {
  it('a NODE_ENV=production process hashes at 12 although RA_BCRYPT_COST_FOR_TESTS=4 is set', () => {
    const script = `
      const m = await import(${JSON.stringify(USERS_STORE_URL)});
      const hash = await m.hashPassword('child-process-password');
      console.log(JSON.stringify({ cost: m.bcryptCost(), hash, dummy: m.timingDummyHash() }));
    `;
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, NODE_ENV: 'production', RA_BCRYPT_COST_FOR_TESTS: '4' },
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
      encoding: 'utf8',
    });
    const { cost, hash, dummy } = JSON.parse(out.trim().split('\n').pop());
    expect(cost).toBe(12);
    expect(costOf(hash)).toBe(12);
    expect(costOf(dummy)).toBe(12);
  });

  it('the switch is ignored without NODE_ENV=test, and a value out of range falls back to 12', () => {
    expect(BCRYPT_COST).toBe(12);
    expect(bcryptCost({ RA_BCRYPT_COST_FOR_TESTS: '4' })).toBe(12);
    expect(bcryptCost({ NODE_ENV: 'development', RA_BCRYPT_COST_FOR_TESTS: '4' })).toBe(12);
    expect(bcryptCost({ NODE_ENV: 'test', RA_BCRYPT_COST_FOR_TESTS: '4' })).toBe(4);
    for (const bad of ['3', '13', '4.5', 'four', '']) {
      expect(bcryptCost({ NODE_ENV: 'test', RA_BCRYPT_COST_FOR_TESTS: bad })).toBe(12);
    }
  });

  it('this suite does run at the low cost, and the timing dummy hash matches it', async () => {
    expect(costOf(await hashPassword('suite-password'))).toBe(4);
    expect(costOf(timingDummyHash())).toBe(4);
  });
});

describe('(b) a hash at the production cost still verifies', () => {
  it('a cost-12 hash, as every existing user has, verifies — and a wrong password does not', async () => {
    const stored = await bcrypt.hash('existing-user-password', BCRYPT_COST);
    expect(costOf(stored)).toBe(12);
    expect(await verifyPassword('existing-user-password', stored)).toBe(true);
    expect(await verifyPassword('not-the-password', stored)).toBe(false);
  });
});

describe('(c) password length and rate limits unchanged', () => {
  it('the minimum is ten characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(() => assertNewPassword('x'.repeat(9))).toThrow();
    expect(() => assertNewPassword('x'.repeat(10))).not.toThrow();
  });

  // The limiters announce their own limit and window in the RateLimit-Policy header, so the
  // DEFAULTS are read from one request each — `skip` is the only option overridden.
  async function policyOf(createLimiter) {
    const app = express();
    app.use(createLimiter({ skip: () => false }));
    app.post('/probe', (_req, res) => res.status(401).json({}));
    const res = await request(app).post('/probe');
    return res.headers['ratelimit-policy'];
  }

  it('login 10 per 15 min, setup 10 per hour, change-password 5 per 15 min, join 60 per minute', async () => {
    expect(await policyOf(createLoginLimiter)).toBe('10;w=900');
    expect(await policyOf(createSetupLimiter)).toBe('10;w=3600');
    expect(await policyOf(createChangePasswordLimiter)).toBe('5;w=900');
    expect(await policyOf(createJoinLimiter)).toBe('60;w=60');
  });
});
