// ============================================================
// File:        registrations.test.js
// Path:        server/src/routes/registrations.test.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: The director's routes, /api/registrations: open, list, read, close, extend, remove a
//              name, delete — and the team boundary, asked by doing: a member of another team gets
//              NOT FOUND from every route and changes nothing. Mounted the way races.test.js and
//              crossTeamAccess.audit.test.js mount races: a stamped `req.authUser`, an injected store
//              on a scratch file and injected track records. The guard in front (signed in or 401)
//              is tested against the real app in registrationsSecurity.integration.test.js.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { createRegistrationStore } from '../registrations/registrationStore.js';
import { createRegistrationsRouter } from './registrations.js';

const TRACKS = [
  { id: 'dirt-oval', name: 'Dirt Oval' },
  { id: 'garden-path', name: 'Garden Path' },
];
const userA = { id: 'ua', username: 'ada', role: 'operator', team: 'Alpha Racing' };
const userB = { id: 'ub', username: 'bob', role: 'operator', team: 'Beta Racing' };
const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();

let dir, store;
beforeEach(() => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-registrations-routes-'));
  store = createRegistrationStore(join(dir, 'registrations.sqlite'));
});
afterEach(() => {
  store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

function appAs(authUser) {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.body ??= {};
    req.authUser = authUser;
    next();
  });
  a.use('/api/registrations', createRegistrationsRouter({ store, tracks: TRACKS }));
  return a;
}

const openAs = (user, body = {}) =>
  request(appAs(user))
    .post('/api/registrations')
    .send({
      trackId: 'dirt-oval',
      capacity: 5,
      eventName: 'Cup',
      closesAt: inMinutes(15),
      ...body,
    });

describe('opening a registration', () => {
  it('201 with the code, the track name, the capacity and no names', async () => {
    const res = await openAs(userA);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      trackId: 'dirt-oval',
      trackName: 'Dirt Oval',
      capacity: 5,
      eventName: 'Cup',
      team: 'Alpha Racing',
      createdBy: 'ada',
      state: 'open',
      taken: 0,
      entries: [],
    });
    expect(res.body.code).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('400 for an unknown track, a bad capacity, a bad deadline, a long event name', async () => {
    for (const body of [
      { trackId: 'no-such-track' },
      { capacity: 0 },
      { capacity: 101 },
      { closesAt: inMinutes(0.5) },
      { closesAt: inMinutes(31 * 24 * 60) },
      { eventName: 'x'.repeat(101) },
    ]) {
      const res = await openAs(userA, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  it('refuses an unknown field — including a team, which only the session decides', async () => {
    const res = await openAs(userA, { team: 'Beta Racing' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/"team"/);
  });

  it('503 for a user without a team, as a race upload answers', async () => {
    const res = await openAs({ ...userA, team: null });
    expect(res.status).toBe(503);
  });
});

describe('the director watches and changes it', () => {
  it('lists the team’s registrations and reads one with its names', async () => {
    const { body: r } = await openAs(userA);
    store.addEntry(r.code, { name: 'Ada', source: 'public' });
    const list = await request(appAs(userA)).get('/api/registrations');
    expect(list.body.registrations.map((x) => [x.id, x.taken])).toEqual([[r.id, 1]]);
    expect(list.body.registrations[0].entries).toBeUndefined();
    const one = await request(appAs(userA)).get(`/api/registrations/${r.id}`);
    expect(one.body.entries.map((e) => [e.name, e.source])).toEqual([['Ada', 'public']]);
  });

  it('closes now; extends only to a later deadline and only while open', async () => {
    const { body: r } = await openAs(userA);
    const app = appAs(userA);
    const longer = await request(app)
      .post(`/api/registrations/${r.id}/extend`)
      .send({ closesAt: inMinutes(60) });
    expect(longer.status).toBe(200);
    const earlier = await request(app)
      .post(`/api/registrations/${r.id}/extend`)
      .send({ closesAt: inMinutes(30) });
    expect(earlier.status).toBe(400);
    const closed = await request(app).post(`/api/registrations/${r.id}/close`);
    expect(closed.body.state).toBe('closed');
    const afterClose = await request(app)
      .post(`/api/registrations/${r.id}/extend`)
      .send({ closesAt: inMinutes(90) });
    expect(afterClose.status).toBe(409);
  });

  it('removes one name, then deletes the registration', async () => {
    const { body: r } = await openAs(userA);
    store.addEntry(r.code, { name: 'Ada', source: 'public' });
    store.addEntry(r.code, { name: 'Bob', source: 'public' });
    const app = appAs(userA);
    const ada = (await request(app).get(`/api/registrations/${r.id}`)).body.entries[0];
    const after = await request(app).delete(`/api/registrations/${r.id}/entries/${ada.id}`);
    expect(after.body.entries.map((e) => e.name)).toEqual(['Bob']);
    expect((await request(app).delete(`/api/registrations/${r.id}/entries/${ada.id}`)).status).toBe(
      404
    );
    expect((await request(app).delete(`/api/registrations/${r.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/registrations/${r.id}`)).status).toBe(404);
  });
});

// ★ THE TEAM BOUNDARY, ASKED BY DOING. Every route, as a member of another team: NOT FOUND, and the
// registration is exactly as it was afterwards.
describe('another team can neither see nor change it', () => {
  it('404 from every route, and nothing changed', async () => {
    const { body: r } = await openAs(userA);
    store.addEntry(r.code, { name: 'Ada', source: 'public' });
    const entryId = store.get(r.id, userA.team).entries[0].id;
    const b = appAs(userB);
    expect((await request(b).get('/api/registrations')).body.registrations).toEqual([]);
    const attempts = [
      request(b).get(`/api/registrations/${r.id}`),
      request(b).post(`/api/registrations/${r.id}/close`),
      request(b)
        .post(`/api/registrations/${r.id}/extend`)
        .send({ closesAt: inMinutes(60) }),
      request(b).delete(`/api/registrations/${r.id}/entries/${entryId}`),
      request(b).delete(`/api/registrations/${r.id}`),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status, `${res.req.method} ${res.req.path}`).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('Ada');
    }
    const unchanged = store.get(r.id, userA.team);
    expect(unchanged).toMatchObject({ state: 'open', taken: 1, closesAt: r.closesAt });
  });
});
