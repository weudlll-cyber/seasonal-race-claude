// ============================================================
// File:        trustProxy.test.js
// Path:        server/src/trustProxy.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A5M-07)
//
// The claim is about whose address `req.ip` is, so the setting is tested through a real Express
// app and a real `X-Forwarded-For` header, not only by reading the variable.
// ============================================================

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { resolveTrustProxy, applyTrustProxy, trustProxyNotice } from './trustProxy.js';

function ipSeenBy(env) {
  const app = express();
  applyTrustProxy(app, env);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  return request(app)
    .get('/ip')
    .set('X-Forwarded-For', '203.0.113.9')
    .then((res) => res.body.ip);
}

describe('resolveTrustProxy — reading the setting', () => {
  it.each([[undefined], [''], ['  ']])('unset or blank (%j) keeps the NODE_ENV rule', (v) => {
    expect(resolveTrustProxy({ RA_TRUST_PROXY: v, NODE_ENV: 'production' })).toBe(1);
    expect(resolveTrustProxy({ RA_TRUST_PROXY: v })).toBe(0);
    expect(resolveTrustProxy({ RA_TRUST_PROXY: v, NODE_ENV: 'test' })).toBe(0);
  });
  it('a whole number is the hop count, trimmed, and beats NODE_ENV', () => {
    expect(resolveTrustProxy({ RA_TRUST_PROXY: ' 2 ', NODE_ENV: 'development' })).toBe(2);
    expect(resolveTrustProxy({ RA_TRUST_PROXY: '0', NODE_ENV: 'production' })).toBe(0);
  });
  it.each([['true'], ['-1'], ['1.5'], ['loopback'], ['1e3']])(
    'refuses %s, naming the variable',
    (v) => {
      expect(() => resolveTrustProxy({ RA_TRUST_PROXY: v })).toThrow(/RA_TRUST_PROXY/);
    }
  );
});

describe('applyTrustProxy — whose address req.ip is', () => {
  it('unset in production trusts one hop, exactly as before (the forwarded address wins)', async () => {
    expect(await ipSeenBy({ NODE_ENV: 'production' })).toBe('203.0.113.9');
  });
  it('unset outside production trusts nothing, exactly as before', async () => {
    expect(await ipSeenBy({})).not.toBe('203.0.113.9');
  });
  it('RA_TRUST_PROXY=0 in production ignores X-Forwarded-For — the A5M-07 case', async () => {
    expect(await ipSeenBy({ NODE_ENV: 'production', RA_TRUST_PROXY: '0' })).not.toBe('203.0.113.9');
  });
  it('RA_TRUST_PROXY=1 outside production trusts the one proxy', async () => {
    expect(await ipSeenBy({ RA_TRUST_PROXY: '1' })).toBe('203.0.113.9');
  });
});

describe('trustProxyNotice — the one startup line', () => {
  it('names the setting while it is unset, in and out of production', () => {
    expect(trustProxyNotice({ NODE_ENV: 'production' })).toMatch(/RA_TRUST_PROXY is not set.*ONE/);
    expect(trustProxyNotice({})).toMatch(/RA_TRUST_PROXY is not set.*NO proxy/);
  });
  it('is silent once the setting is given, even as 0', () => {
    expect(trustProxyNotice({ RA_TRUST_PROXY: '0' })).toBeNull();
    expect(trustProxyNotice({ RA_TRUST_PROXY: '1', NODE_ENV: 'production' })).toBeNull();
  });
});
