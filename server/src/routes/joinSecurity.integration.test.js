// ============================================================
// File:        joinSecurity.integration.test.js
// Path:        server/src/routes/joinSecurity.integration.test.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: The public join link and the integration seam behind the REAL app (createApp): the
//              whole player path, the device cookie, the capacity against parallel requests, what
//              the public view never reveals, which path variants the public pattern admits and
//              which it must not, HEAD only where a GET is public, the body limit, the join limiter,
//              and the integration key (unset → 404, wrong → 401, right → an integration entry).
// ============================================================

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { operatorAgent } from '../../test/authAgent.js';
import { createJoinLimiter } from '../auth/rateLimit.js';

const app = createApp();
const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();

let director;
beforeAll(async () => {
  director = await operatorAgent(app);
});

/** A fresh registration, opened by the director; returns the director's view. */
async function openRegistration(body = {}) {
  const res = await director.post('/api/registrations').send({
    trackId: 'dirt-oval',
    capacity: 5,
    eventName: 'Night cup',
    closesAt: inMinutes(10),
    ...body,
  });
  expect(res.status).toBe(201);
  return res.body;
}

const joinAs = (agent, code, name) => agent.post(`/api/join/${code}`).send({ name });

describe('the player path', () => {
  it('reads the public view, registers, is told the number, and is remembered on this device', async () => {
    const r = await openRegistration();
    const phone = request.agent(app);
    const info = await phone.get(`/api/join/${r.code}`);
    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({
      eventName: 'Night cup',
      trackName: 'Dirt Oval',
      capacity: 5,
      placesLeft: 5,
      state: 'open',
      you: null,
    });

    const joined = await joinAs(phone, r.code, 'Ada');
    expect(joined.status).toBe(201);
    expect(joined.body.you).toMatchObject({ name: 'Ada', number: 1, capacity: 5 });
    expect(joined.body.you.message).toBe("You're in! You are number 1 of 5.");
    const cookie = joined.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/ra_join=/);
    expect(cookie).toMatch(new RegExp(`Path=/api/join/${r.code}`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    // The same device again: refused, by name; and the revisit shows the same sentence.
    const again = await joinAs(phone, r.code, 'Ada Two');
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('You are already registered as Ada.');
    expect((await phone.get(`/api/join/${r.code}`)).body.you.message).toBe(
      "You're in! You are number 1 of 5."
    );

    // Another device, the same name in another case: refused with the clash named.
    const other = await joinAs(request.agent(app), r.code, '  ADA ');
    expect(other.status).toBe(409);
    expect(other.body.error).toMatch(/"Ada" is already registered/);
  });

  it('a removed name frees the device to register again', async () => {
    const r = await openRegistration();
    const phone = request.agent(app);
    await joinAs(phone, r.code, 'Bob');
    const entry = (await director.get(`/api/registrations/${r.id}`)).body.entries[0];
    await director.delete(`/api/registrations/${r.id}/entries/${entry.id}`);
    expect((await phone.get(`/api/join/${r.code}`)).body.you).toBeNull();
    expect((await joinAs(phone, r.code, 'Bobby')).status).toBe(201);
  });

  it('"This race is full", "Registration is closed", and an unknown code', async () => {
    const r = await openRegistration({ capacity: 1 });
    await joinAs(request.agent(app), r.code, 'One');
    const full = await joinAs(request.agent(app), r.code, 'Two');
    expect([full.status, full.body.error]).toEqual([409, 'This race is full.']);
    await director.post(`/api/registrations/${r.id}/close`);
    const closed = await joinAs(request.agent(app), r.code, 'Three');
    expect([closed.status, closed.body.error]).toEqual([409, 'Registration is closed.']);
    const unknown = await request(app).get(`/api/join/${'a'.repeat(22)}`);
    expect(unknown.status).toBe(404);
  });
});

// ★ PARALLEL REQUESTS CANNOT OVER-FILL: 30 phones at once on 10 places.
describe('capacity under parallel requests', () => {
  it('exactly 10 of 30 simultaneous registrations land', async () => {
    const r = await openRegistration({ capacity: 10 });
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => joinAs(request.agent(app), r.code, `Racer ${i}`))
    );
    const statuses = results.map((res) => res.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(10);
    expect(statuses.filter((s) => s === 409)).toHaveLength(20);
    expect(
      results.filter((res) => res.status === 409).every((res) => res.body.code === 'FULL')
    ).toBe(true);
    const after = (await director.get(`/api/registrations/${r.id}`)).body;
    expect([after.taken, after.placesLeft]).toEqual([10, 0]);
    expect(after.entries.map((e) => e.name).sort()).toEqual(
      results
        .filter((res) => res.status === 201)
        .map((res) => res.body.you.name)
        .sort()
    );
  });
});

// ★ THE PUBLIC VIEW NEVER LEAKS: not another player's name, the director, the team, the id.
describe('what the public routes never reveal', () => {
  it('no other name, no director, no team, no registration id — on GET, on success, on refusal', async () => {
    const r = await openRegistration({ capacity: 2 });
    await joinAs(request.agent(app), r.code, 'Secret Sam');
    const phone = request.agent(app);
    const bodies = [
      (await phone.get(`/api/join/${r.code}`)).body,
      (await joinAs(phone, r.code, 'Visible Vi')).body,
      (await joinAs(request.agent(app), r.code, 'Third')).body, // full
      (await phone.get(`/api/join/${r.code}`)).body,
    ];
    const secrets = ['Secret Sam', director.raUser.username, director.raUser.team, r.id];
    for (const body of bodies) {
      const text = JSON.stringify(body);
      for (const secret of secrets) expect(text, `leaked ${secret}`).not.toContain(secret);
    }
  });
});

// ★ THE PATTERN ADMITS EXACTLY ONE SHAPE.
describe('path variants', () => {
  it('admits /api/join/<code> in any letter case and with a trailing slash', async () => {
    const r = await openRegistration();
    for (const path of [`/api/join/${r.code}`, `/API/JOIN/${r.code}`, `/api/join/${r.code}/`]) {
      expect((await request(app).get(path)).status, path).toBe(200);
    }
  });

  it('refuses everything under, beside or around it without a session', async () => {
    const r = await openRegistration();
    const refused = [
      ['get', '/api/join'],
      ['get', `/api/join/${r.code}/entries`],
      ['get', `/api/join/${r.code}/../../registrations`],
      ['get', `/api/join/${r.code.slice(1)}`],
      ['get', `/api/join/${r.code}x`],
      ['get', `/api/joinx/${r.code}`],
      ['get', `/api/join/%2e%2e%2fregistrations${'a'.repeat(4)}`],
      ['put', `/api/join/${r.code}`],
      ['delete', `/api/join/${r.code}`],
      ['patch', `/api/join/${r.code}`],
      ['get', '/api/registrations'],
      ['get', `/api/registrations/${r.id}`],
      ['get', '/API/REGISTRATIONS'],
    ];
    for (const [method, path] of refused) {
      const res = await request(app)[method](path);
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});

describe('HEAD inherits GET only where a GET is public', () => {
  it('HEAD /api/join/<code> is public; HEAD on a POST-only public path and on a director route is not', async () => {
    const r = await openRegistration();
    expect((await request(app).head(`/api/join/${r.code}`)).status).toBe(200);
    expect((await request(app).head('/api/auth/login')).status).toBe(401);
    expect((await request(app).head(`/api/registrations/${r.id}`)).status).toBe(401);
  });
});

describe('the limits in front', () => {
  it('a body over 1 KB is refused before it is read', async () => {
    const r = await openRegistration();
    const res = await request(app)
      .post(`/api/join/${r.code}`)
      .send({ name: 'x'.repeat(2000) });
    expect(res.status).toBe(413);
  });

  it('the join limiter lets 60 a minute through from one address and refuses the 61st', async () => {
    const a = express();
    a.post('/', createJoinLimiter({ skip: () => false }), (_req, res) => res.status(201).end());
    for (let i = 0; i < 60; i++) expect((await request(a).post('/')).status).toBe(201);
    const limited = await request(a).post('/');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatch(/Too many attempts/);
  });
});

describe('the integration seam', () => {
  const KEY = 'integration-test-key-0123456789';
  const entryPath = (code) => `/api/integrations/registrations/${code}/entries`;
  afterEach(() => {
    delete process.env.RA_INTEGRATION_KEY;
  });

  it('answers 404 as if it did not exist while RA_INTEGRATION_KEY is unset', async () => {
    const r = await openRegistration();
    const res = await request(app)
      .post(entryPath(r.code))
      .set('Authorization', `Bearer ${KEY}`)
      .send({ name: 'Ada', externalId: 'u1' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: `no such API route: POST ${entryPath(r.code)}` });
  });

  it('401 with a wrong key, a missing key, or another scheme', async () => {
    process.env.RA_INTEGRATION_KEY = KEY;
    const r = await openRegistration();
    for (const auth of [
      `Bearer ${KEY}x`,
      `Bearer ${KEY.slice(1)}`,
      null,
      `Basic ${KEY}`,
      'Bearer ',
    ]) {
      const req = request(app).post(entryPath(r.code));
      if (auth !== null) req.set('Authorization', auth);
      const res = await req.send({ name: 'Ada', externalId: 'u1' });
      expect(res.status, String(auth)).toBe(401);
    }
    expect((await director.get(`/api/registrations/${r.id}`)).body.taken).toBe(0);
  });

  it('the right key adds an entry with source "integration"; the same external id cannot twice', async () => {
    process.env.RA_INTEGRATION_KEY = KEY;
    const r = await openRegistration({ capacity: 2 });
    const add = (name, externalId) =>
      request(app)
        .post(entryPath(r.code))
        .set('Authorization', `Bearer ${KEY}`)
        .send({ name, externalId });
    const ok = await add('Ada', 'site-7');
    expect(ok.status).toBe(201);
    // What a site needs to say "You're in, number N of M": the number, the capacity, places left.
    expect(ok.body).toMatchObject({
      entry: { name: 'Ada', externalId: 'site-7' },
      number: 1,
      capacity: 2,
      placesLeft: 1,
    });
    expect((await add('Other Name', 'site-7')).status).toBe(409);
    expect((await add('ada', 'site-8')).body.code).toBe('DUPLICATE_NAME');
    const second = await add('Bob', 'site-9');
    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ number: 2, capacity: 2, placesLeft: 0 });
    expect((await add('Cy', 'site-10')).body.code).toBe('FULL');
    const entries = (await director.get(`/api/registrations/${r.id}`)).body.entries;
    expect(entries.map((e) => [e.name, e.source, e.externalId])).toEqual([
      ['Ada', 'integration', 'site-7'],
      ['Bob', 'integration', 'site-9'],
    ]);
  });
});
