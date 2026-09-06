// ============================================================
// File:        playerGroups.test.js
// Path:        server/src/routes/playerGroups.test.js
// Project:     RaceArena
// Description: Integration tests for /api/player-groups (D1).
//              Covers: CRUD, isDefault enforcement (Invariant 2 honesty proof),
//              default seed, admin promote/export, operator gating, validation,
//              and corrupt-file-at-boot skip.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';
import { validateBody, loadAll, DATA_DIR } from './playerGroups.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = createApp();
let admin;
let operator;

beforeAll(async () => {
  [admin, operator] = await Promise.all([adminAgent(app), operatorAgent(app)]);
});

const createdIds = [];

afterAll(async () => {
  for (const id of createdIds) {
    // Demote first in case the test promoted the group to isDefault:true.
    await admin.post(`/api/player-groups/${id}/clear-default`).catch(() => {});
    await admin.delete(`/api/player-groups/${id}`).catch(() => {});
  }
});

// ── Unit: validateBody ────────────────────────────────────────────────────────

describe('validateBody', () => {
  it('accepts a valid body', () => {
    expect(validateBody({ name: 'Class A', players: ['Alice', 'Bob'] })).toEqual([]);
  });

  it('rejects empty name', () => {
    const errs = validateBody({ name: '', players: ['Alice'] });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/name/i);
  });

  it('rejects whitespace-only name', () => {
    const errs = validateBody({ name: '   ', players: ['Alice'] });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects name longer than 100 characters', () => {
    const errs = validateBody({ name: 'X'.repeat(101), players: ['Alice'] });
    expect(errs.join(' ')).toMatch(/name/i);
  });

  it('rejects empty players array', () => {
    const errs = validateBody({ name: 'Group', players: [] });
    expect(errs.join(' ')).toMatch(/players/i);
  });

  it('rejects non-array players', () => {
    const errs = validateBody({ name: 'Group', players: 'Alice,Bob' });
    expect(errs.join(' ')).toMatch(/players/i);
  });

  it('rejects players with more than 200 entries', () => {
    const errs = validateBody({
      name: 'Group',
      players: Array.from({ length: 201 }, (_, i) => `P${i}`),
    });
    expect(errs.join(' ')).toMatch(/200/);
  });

  it('rejects players containing empty strings', () => {
    const errs = validateBody({ name: 'Group', players: ['Alice', ''] });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects players containing whitespace-only strings', () => {
    const errs = validateBody({ name: 'Group', players: ['Alice', '  '] });
    expect(errs.length).toBeGreaterThan(0);
  });
});

// ── Unit: loadAll skips corrupt files ────────────────────────────────────────

describe('loadAll: corrupt file is skipped (boot safety)', () => {
  it('does not throw and returns a Map when a file contains invalid JSON', () => {
    const tmpDir = join(DATA_DIR, '__test-corrupt__');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'broken.json'), 'NOT JSON {{{', 'utf8');
    writeFileSync(
      join(tmpDir, 'valid.json'),
      JSON.stringify({ id: 'ok', name: 'ok', players: ['X'], isDefault: false }),
      'utf8'
    );

    let map;
    expect(() => {
      map = loadAll(tmpDir);
    }).not.toThrow();
    expect(map).toBeInstanceOf(Map);
    expect(map.has('ok')).toBe(true); // valid file loaded
    expect(map.size).toBe(1); // corrupt file was skipped

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── Default seed ──────────────────────────────────────────────────────────────

describe('Default seed', () => {
  it('GET / includes at least one isDefault:true group at boot', async () => {
    const res = await admin.get('/api/player-groups');
    expect(res.status).toBe(200);
    const defaults = res.body.filter((g) => g.isDefault);
    expect(defaults.length).toBeGreaterThanOrEqual(1);
  });

  it('default seed group has non-empty name and players', async () => {
    const res = await admin.get('/api/player-groups');
    const def = res.body.find((g) => g.isDefault);
    expect(typeof def.name).toBe('string');
    expect(def.name.length).toBeGreaterThan(0);
    expect(Array.isArray(def.players)).toBe(true);
    expect(def.players.length).toBeGreaterThan(0);
  });

  it('second GET / does not duplicate the seed (idempotent)', async () => {
    const r1 = await admin.get('/api/player-groups');
    const r2 = await admin.get('/api/player-groups');
    const defaultIds1 = r1.body.filter((g) => g.id === 'default-example-group').map((g) => g.id);
    const defaultIds2 = r2.body.filter((g) => g.id === 'default-example-group').map((g) => g.id);
    expect(defaultIds1.length).toBe(1);
    expect(defaultIds2.length).toBe(1);
  });
});

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/player-groups', () => {
  it('returns 200 with an array', async () => {
    const res = await admin.get('/api/player-groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

describe('GET /api/player-groups/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await admin.get('/api/player-groups/nonexistent-xyz-abc');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns the group by id', async () => {
    const id = 'test-get-by-id';
    await admin.post('/api/player-groups').send({ id, name: 'Get By Id', players: ['Alice'] });
    createdIds.push(id);

    const res = await admin.get(`/api/player-groups/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Get By Id');
  });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /api/player-groups', () => {
  it('creates a group and returns 201', async () => {
    const id = 'test-post-basic';
    const res = await admin.post('/api/player-groups').send({
      id,
      name: 'Basic Group',
      players: ['Alice', 'Bob'],
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Basic Group');
    expect(res.body.players).toEqual(['Alice', 'Bob']);
    expect(typeof res.body.createdAt).toBe('string');
    expect(typeof res.body.updatedAt).toBe('string');
    createdIds.push(id);
  });

  it('auto-generates id when none is provided', async () => {
    const res = await admin.post('/api/player-groups').send({
      name: 'Auto ID Group',
      players: ['X'],
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    createdIds.push(res.body.id);
  });

  it('returns 409 when id already exists', async () => {
    const id = 'test-post-dup';
    await admin.post('/api/player-groups').send({ id, name: 'Dup', players: ['X'] });
    createdIds.push(id);
    const res = await admin.post('/api/player-groups').send({ id, name: 'Dup2', players: ['Y'] });
    expect(res.status).toBe(409);
  });

  it('returns 400 for missing name', async () => {
    const res = await admin.post('/api/player-groups').send({ id: 'test-no-name', players: ['X'] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for empty players array', async () => {
    const res = await admin
      .post('/api/player-groups')
      .send({ id: 'test-empty-players', name: 'G', players: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for too many players', async () => {
    const res = await admin.post('/api/player-groups').send({
      id: 'test-toomany',
      name: 'Big',
      players: Array.from({ length: 201 }, (_, i) => `P${i}`),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid id format (uppercase)', async () => {
    const res = await admin.post('/api/player-groups').send({
      id: 'InvalidID',
      name: 'G',
      players: ['X'],
    });
    expect(res.status).toBe(400);
  });

  it('created group appears in GET /', async () => {
    const id = 'test-post-in-list';
    await admin.post('/api/player-groups').send({ id, name: 'In List', players: ['X'] });
    createdIds.push(id);
    const res = await admin.get('/api/player-groups');
    expect(res.body.some((g) => g.id === id)).toBe(true);
  });
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────

describe('PUT /api/player-groups/:id', () => {
  it('updates name and players, returns 200', async () => {
    const id = 'test-put-basic';
    await admin.post('/api/player-groups').send({ id, name: 'Original', players: ['A'] });
    createdIds.push(id);

    const res = await admin
      .put(`/api/player-groups/${id}`)
      .send({ name: 'Updated', players: ['A', 'B'] });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
    expect(res.body.players).toEqual(['A', 'B']);
  });

  it('preserves createdAt on update', async () => {
    const id = 'test-put-createdat';
    const created = await admin
      .post('/api/player-groups')
      .send({ id, name: 'Preserve', players: ['A'] });
    createdIds.push(id);

    const updated = await admin
      .put(`/api/player-groups/${id}`)
      .send({ name: 'Preserve2', players: ['A'] });
    expect(updated.body.createdAt).toBe(created.body.createdAt);
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin
      .put('/api/player-groups/nonexistent-put-xyz')
      .send({ name: 'X', players: ['Y'] });
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty name on update', async () => {
    const id = 'test-put-badname';
    await admin.post('/api/player-groups').send({ id, name: 'Valid', players: ['A'] });
    createdIds.push(id);
    const res = await admin.put(`/api/player-groups/${id}`).send({ name: '', players: ['A'] });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /api/player-groups/:id', () => {
  it('deletes a non-default group and returns 204', async () => {
    const id = 'test-delete-ok';
    await admin.post('/api/player-groups').send({ id, name: 'Delete Me', players: ['X'] });

    const res = await admin.delete(`/api/player-groups/${id}`);
    expect(res.status).toBe(204);

    const get = await admin.get(`/api/player-groups/${id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin.delete('/api/player-groups/nonexistent-del-xyz');
    expect(res.status).toBe(404);
  });

  it('deleted group no longer appears in GET /', async () => {
    const id = 'test-delete-from-list';
    await admin.post('/api/player-groups').send({ id, name: 'Transient', players: ['X'] });
    await admin.delete(`/api/player-groups/${id}`);
    const res = await admin.get('/api/player-groups');
    expect(res.body.some((g) => g.id === id)).toBe(false);
  });
});

// ── HONESTY PROOF — Invariant 2 (isDefault never inherited from body) ─────────
//
// These tests are RED without the explicit `isDefault: false` / `isDefault: existing.isDefault`
// lines in POST and PUT handlers — a naïve spread of req.body would leak the field.
// WITH the protection they are GREEN.

describe('Honesty proof — Invariant 2: isDefault never inherited from POST/PUT body', () => {
  it('[POST] body isDefault:true is ignored — stored record has isDefault:false', async () => {
    const id = 'test-inv2-post-proof';
    const res = await admin.post('/api/player-groups').send({
      id,
      name: 'Proof POST',
      players: ['X'],
      isDefault: true, // attacker sends isDefault:true
    });
    expect(res.status).toBe(201);
    expect(res.body.isDefault).toBe(false); // protection: body.isDefault is never used in POST
    createdIds.push(id);
  });

  it('[PUT] body isDefault:true on a non-default group — stored record stays false', async () => {
    const id = 'test-inv2-put-promote';
    await admin.post('/api/player-groups').send({ id, name: 'PUT Proof', players: ['X'] });
    createdIds.push(id);

    const res = await admin.put(`/api/player-groups/${id}`).send({
      name: 'PUT Proof Updated',
      players: ['X', 'Y'],
      isDefault: true, // attacker tries to promote
    });
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(false); // protection: existing.isDefault (false) is kept
  });

  it('[PUT] body isDefault:false on an actual default — stored record stays true', async () => {
    const listRes = await admin.get('/api/player-groups');
    const def = listRes.body.find((g) => g.isDefault);
    expect(def).toBeDefined();

    const res = await admin.put(`/api/player-groups/${def.id}`).send({
      name: def.name,
      players: def.players,
      isDefault: false, // attacker tries to demote
    });
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true); // protection: existing.isDefault (true) is kept
  });
});

// ── HONESTY PROOF — Invariant 3: DELETE on default → 403 ─────────────────────

describe('Honesty proof — Invariant 3: DELETE on isDefault:true returns 403', () => {
  it('DELETE on the seeded default group returns 403 (not 204)', async () => {
    const res = await admin.delete('/api/player-groups/default-example-group');
    expect(res.status).toBe(403); // without protection: 204 (deleted); with: 403
    expect(res.body).toHaveProperty('error');
  });

  it('default group still exists after rejected DELETE', async () => {
    const res = await admin.get('/api/player-groups/default-example-group');
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);
  });
});

// ── Admin promote / demote / export-seed ─────────────────────────────────────

describe('Admin: POST /:id/set-default and POST /:id/clear-default', () => {
  it('admin can promote a non-default group to isDefault:true', async () => {
    const id = 'test-admin-promote';
    await admin.post('/api/player-groups').send({ id, name: 'Promote Me', players: ['X'] });
    createdIds.push(id);

    const res = await admin.post(`/api/player-groups/${id}/set-default`);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);

    // Verify persisted
    const get = await admin.get(`/api/player-groups/${id}`);
    expect(get.body.isDefault).toBe(true);
  });

  it('admin can demote a default group to isDefault:false', async () => {
    const id = 'test-admin-demote';
    await admin.post('/api/player-groups').send({ id, name: 'Demote Me', players: ['X'] });
    createdIds.push(id);
    await admin.post(`/api/player-groups/${id}/set-default`);

    const res = await admin.post(`/api/player-groups/${id}/clear-default`);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(false);
  });

  it('demoted group can then be deleted', async () => {
    const id = 'test-admin-demote-delete';
    await admin.post('/api/player-groups').send({ id, name: 'Demote Delete', players: ['X'] });
    await admin.post(`/api/player-groups/${id}/set-default`);
    await admin.post(`/api/player-groups/${id}/clear-default`);

    const res = await admin.delete(`/api/player-groups/${id}`);
    expect(res.status).toBe(204);
  });

  it('set-default returns 404 for unknown id', async () => {
    const res = await admin.post('/api/player-groups/nonexistent-xyz/set-default');
    expect(res.status).toBe(404);
  });
});

describe('Admin: GET /:id/export-seed', () => {
  it('returns the full record as seed-ready JSON', async () => {
    const id = 'test-admin-export';
    const created = await admin
      .post('/api/player-groups')
      .send({ id, name: 'Export Me', players: ['A', 'B'] });
    createdIds.push(id);

    const res = await admin.get(`/api/player-groups/${id}/export-seed`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Export Me');
    expect(res.body.players).toEqual(['A', 'B']);
    expect(res.body.isDefault).toBe(created.body.isDefault);
  });

  it('export-seed returns 404 for unknown id', async () => {
    const res = await admin.get('/api/player-groups/nonexistent-xyz/export-seed');
    expect(res.status).toBe(404);
  });
});

// ── Operator gating ───────────────────────────────────────────────────────────

describe('Operator gating: admin-only sub-routes return 403 for operator', () => {
  it('operator POST /set-default → 403', async () => {
    const res = await operator.post('/api/player-groups/default-example-group/set-default');
    expect(res.status).toBe(403);
  });

  it('operator POST /clear-default → 403', async () => {
    const res = await operator.post('/api/player-groups/default-example-group/clear-default');
    expect(res.status).toBe(403);
  });

  it('operator GET /export-seed → 403', async () => {
    const res = await operator.get('/api/player-groups/default-example-group/export-seed');
    expect(res.status).toBe(403);
  });
});

describe('Operator: can perform normal CRUD (operator+)', () => {
  it('operator GET / returns 200', async () => {
    const res = await operator.get('/api/player-groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('operator POST / creates a group', async () => {
    const id = 'test-operator-create';
    const res = await operator
      .post('/api/player-groups')
      .send({ id, name: 'Op Group', players: ['X'] });
    expect(res.status).toBe(201);
    expect(res.body.isDefault).toBe(false);
    createdIds.push(id);
  });

  it('operator PUT /:id updates a group', async () => {
    const id = 'test-operator-put';
    await operator.post('/api/player-groups').send({ id, name: 'Op Put', players: ['X'] });
    createdIds.push(id);
    const res = await operator
      .put(`/api/player-groups/${id}`)
      .send({ name: 'Op Put Updated', players: ['X', 'Y'] });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Op Put Updated');
  });

  it('operator DELETE /:id (non-default) returns 204', async () => {
    const id = 'test-operator-delete';
    await operator.post('/api/player-groups').send({ id, name: 'Op Delete', players: ['X'] });
    const res = await operator.delete(`/api/player-groups/${id}`);
    expect(res.status).toBe(204);
  });
});
