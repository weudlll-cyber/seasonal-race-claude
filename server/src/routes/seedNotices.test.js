// ============================================================
// File:        seedNotices.test.js
// Path:        server/src/routes/seedNotices.test.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: Integration tests for the two redelivery-warning endpoints.
//
//              The point of these is not CRUD coverage — it is the two properties the warning
//              has to have: it is behind auth (so an anonymous visitor cannot clear a warning the
//              operator never saw), and dismissal is what makes it stop coming back.
// ============================================================

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { adminAgent } from '../../test/authAgent.js';
import { createApp } from '../app.js';
import { appendNotices, dismissNotices } from '../seedNotices.js';

const app = createApp();

let api;
beforeAll(async () => {
  api = await adminAgent(app);
});

afterEach(() => {
  dismissNotices();
});

const ONE = [{ unit: 'tracks/garden-path', kind: 'track', name: 'Garden Path', from: 1, to: 2 }];

describe('GET /api/seed-notices', () => {
  it('requires auth — an anonymous visitor cannot read the record names', async () => {
    const res = await request(app).get('/api/seed-notices');
    expect(res.status).toBe(401);
  });

  it('returns nothing when the install is owed nothing', async () => {
    const res = await api.get('/api/seed-notices');
    expect(res.status).toBe(200);
    expect(res.body.notices).toEqual([]);
  });

  it('returns the pending warning, naming the record', async () => {
    appendNotices(ONE);
    const res = await api.get('/api/seed-notices');
    expect(res.status).toBe(200);
    expect(res.body.notices).toHaveLength(1);
    expect(res.body.notices[0].name).toBe('Garden Path');
    expect(res.body.notices[0].kind).toBe('track');
  });
});

describe('POST /api/seed-notices/dismiss', () => {
  it('requires auth — nobody anonymous can clear a warning the operator has not seen', async () => {
    appendNotices(ONE);
    const res = await request(app).post('/api/seed-notices/dismiss');
    expect(res.status).toBe(401);
    // And the warning is still owed.
    const after = await api.get('/api/seed-notices');
    expect(after.body.notices).toHaveLength(1);
  });

  it('clears every pending warning, and it stays cleared', async () => {
    appendNotices(ONE);
    const res = await api.post('/api/seed-notices/dismiss');
    expect(res.status).toBe(200);
    expect(res.body.cleared).toBe(1);
    const after = await api.get('/api/seed-notices');
    expect(after.body.notices).toEqual([]);
  });
});
