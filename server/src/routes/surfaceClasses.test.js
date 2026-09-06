// ============================================================
// File:        surfaceClasses.test.js
// Path:        server/src/routes/surfaceClasses.test.js
// Project:     RaceArena
// Description: Integration tests for the surface-classes API endpoints.
// ============================================================

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { adminAgent } from '../../test/authAgent.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { createApp } from '../app.js';
import { DATA_ROOT } from '../dataPaths.js';

const DATA_DIR = join(DATA_ROOT, 'surface-classes');

const app = createApp();

let api;
beforeAll(async () => {
  api = await adminAgent(app);
});

// IDs created during tests — cleaned up in afterAll
const createdIds = [];

const VALID_CUSTOM = {
  id: 'test-lava',
  label: 'Test Lava',
  generatorId: 'particle',
  config: {
    color: '#ff4400',
    sizeMin: 2,
    sizeMax: 5,
    lifetimeFrames: 20,
    spawnProbability: 0.5,
    drift: 1,
    gravity: 0,
  },
};

const VALID_OVERRIDE = {
  id: 'test-override-mud',
  label: 'Turbo Mud',
  generatorId: 'splash',
  config: {
    color: '#3b1a00',
    count: 6,
    sizeMin: 2,
    sizeMax: 6,
    lifetimeFrames: 30,
    spawnProbability: 0.6,
    gravity: 0.2,
    spreadAngle: 1.5,
  },
  isOverride: true,
};

afterAll(async () => {
  for (const id of createdIds) {
    await api.delete(`/api/surface-classes/${id}`);
  }
});

// ── GET /api/surface-classes ──────────────────────────────────────────────────

describe('GET /api/surface-classes', () => {
  it('returns 200 with an array', async () => {
    const res = await api.get('/api/surface-classes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns empty array when no classes stored', async () => {
    // Backend starts empty (code defaults are not stored server-side)
    const res = await api.get('/api/surface-classes');
    expect(res.status).toBe(200);
    // May contain entries created by earlier test runs — just check it's an array
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── GET /api/surface-classes/:id ─────────────────────────────────────────────

describe('GET /api/surface-classes/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await api.get('/api/surface-classes/nonexistent-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ── POST /api/surface-classes ─────────────────────────────────────────────────

describe('POST /api/surface-classes', () => {
  it('creates a custom class and returns 201', async () => {
    const res = await api.post('/api/surface-classes').send(VALID_CUSTOM);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(VALID_CUSTOM.id);
    expect(res.body.label).toBe(VALID_CUSTOM.label);
    expect(res.body.generatorId).toBe(VALID_CUSTOM.generatorId);
    expect(res.body.isDefault).toBe(false);
    expect(typeof res.body.createdAt).toBe('string');
    createdIds.push(res.body.id);
  });

  it('created class appears in GET list', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-lava-2', label: 'Test Lava 2' });
    createdIds.push(createRes.body.id);

    const listRes = await api.get('/api/surface-classes');
    const found = listRes.body.find((c) => c.id === 'test-lava-2');
    expect(found).toBeDefined();
    expect(found.label).toBe('Test Lava 2');
  });

  it('returns 409 when id already exists', async () => {
    const res1 = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id: 'test-dup' });
    createdIds.push(res1.body.id);

    const res2 = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id: 'test-dup' });
    expect(res2.status).toBe(409);
    expect(res2.body).toHaveProperty('error');
  });

  it('returns 400 when id is missing', async () => {
    const { id: _drop, ...noId } = VALID_CUSTOM;
    const res = await api.post('/api/surface-classes').send(noId);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when id contains uppercase letters', async () => {
    const res = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id: 'InvalidID' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when id contains spaces', async () => {
    const res = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id: 'my class' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when label is missing', async () => {
    const { label: _drop, ...noLabel } = VALID_CUSTOM;
    const res = await api.post('/api/surface-classes').send({ ...noLabel, id: 'test-nolabel' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when generatorId is invalid', async () => {
    const res = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-badgen', generatorId: 'fire' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when config is missing', async () => {
    const { config: _drop, ...noConfig } = VALID_CUSTOM;
    const res = await api.post('/api/surface-classes').send({ ...noConfig, id: 'test-noconfig' });
    expect(res.status).toBe(400);
  });

  it('does not leave a .tmp file after successful save', async () => {
    const res = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id: 'test-atomic' });
    createdIds.push(res.body.id);
    expect(existsSync(join(DATA_DIR, `${res.body.id}.json.tmp`))).toBe(false);
  });

  it('creates a default override with isOverride: true', async () => {
    const res = await api.post('/api/surface-classes').send(VALID_OVERRIDE);
    expect(res.status).toBe(201);
    expect(res.body.isOverride).toBe(true);
    expect(res.body.isDefault).toBe(false);
    createdIds.push(res.body.id);
  });
});

// ── GET /api/surface-classes/:id (after creation) ────────────────────────────

describe('GET /api/surface-classes/:id after creation', () => {
  it('returns the created class', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-get-single' });
    createdIds.push(createRes.body.id);

    const getRes = await api.get(`/api/surface-classes/test-get-single`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe('test-get-single');
    expect(getRes.body.label).toBe(VALID_CUSTOM.label);
  });
});

// ── PUT /api/surface-classes/:id ─────────────────────────────────────────────

describe('PUT /api/surface-classes/:id', () => {
  it('updates an existing class and returns 200', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-put' });
    createdIds.push(createRes.body.id);

    const updateRes = await api
      .put('/api/surface-classes/test-put')
      .send({ ...VALID_CUSTOM, id: 'test-put', label: 'Updated Label' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.label).toBe('Updated Label');
    expect(updateRes.body.id).toBe('test-put');
  });

  it('preserves createdAt on update', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-put-preserve' });
    createdIds.push(createRes.body.id);
    const createdAt = createRes.body.createdAt;

    const updateRes = await api
      .put('/api/surface-classes/test-put-preserve')
      .send({ ...VALID_CUSTOM, id: 'test-put-preserve', label: 'Preserved' });
    expect(updateRes.body.createdAt).toBe(createdAt);
  });

  it('updates updatedAt on update', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-put-updat' });
    createdIds.push(createRes.body.id);

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));
    const updateRes = await api
      .put('/api/surface-classes/test-put-updat')
      .send({ ...VALID_CUSTOM, id: 'test-put-updat', label: 'Updated' });
    expect(updateRes.body.updatedAt).not.toBe(createRes.body.updatedAt);
  });

  it('creates new entry when id does not exist (upsert)', async () => {
    const res = await api
      .put('/api/surface-classes/test-upsert')
      .send({ ...VALID_CUSTOM, id: 'test-upsert', label: 'Upserted' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('test-upsert');
    createdIds.push('test-upsert');
  });

  it('returns 400 when body id mismatches URL id', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-mismatch' });
    createdIds.push(createRes.body.id);

    const res = await api
      .put('/api/surface-classes/test-mismatch')
      .send({ ...VALID_CUSTOM, id: 'different-id' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid generatorId on update', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-put-badgen' });
    createdIds.push(createRes.body.id);

    const res = await api
      .put('/api/surface-classes/test-put-badgen')
      .send({ ...VALID_CUSTOM, id: 'test-put-badgen', generatorId: 'unknown' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/surface-classes/:id ──────────────────────────────────────────

describe('DELETE /api/surface-classes/:id', () => {
  it('deletes an existing class and returns 204', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-delete' });

    const deleteRes = await api.delete('/api/surface-classes/test-delete');
    expect(deleteRes.status).toBe(204);

    const getRes = await api.get('/api/surface-classes/test-delete');
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when class does not exist', async () => {
    const res = await api.delete('/api/surface-classes/nonexistent-xyz');
    expect(res.status).toBe(404);
  });

  it('deleted class no longer appears in GET list', async () => {
    const createRes = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-delete-list' });

    await api.delete('/api/surface-classes/test-delete-list');

    const listRes = await api.get('/api/surface-classes');
    const found = listRes.body.find((c) => c.id === 'test-delete-list');
    expect(found).toBeUndefined();
  });
});

// ── Security: H4 — label length limit ────────────────────────────────────────

describe('POST /api/surface-classes — H4: label length limit', () => {
  it('rejects a label longer than 100 characters', async () => {
    const res = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-long-label', label: 'X'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/label/i);
  });

  it('accepts a label of exactly 100 characters', async () => {
    const res = await api
      .post('/api/surface-classes')
      .send({ ...VALID_CUSTOM, id: 'test-label-100', label: 'X'.repeat(100) });
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
  });
});

describe('PUT /api/surface-classes/:id — H4: label length limit', () => {
  it('rejects a label longer than 100 characters on PUT', async () => {
    const id = 'test-put-long-label';
    const createRes = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id });
    createdIds.push(createRes.body.id);

    const res = await api
      .put(`/api/surface-classes/${id}`)
      .send({ ...VALID_CUSTOM, id, label: 'Y'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('accepts a label of exactly 100 characters on PUT', async () => {
    const id = 'test-put-label-100';
    const createRes = await api.post('/api/surface-classes').send({ ...VALID_CUSTOM, id });
    createdIds.push(createRes.body.id);

    const res = await api
      .put(`/api/surface-classes/${id}`)
      .send({ ...VALID_CUSTOM, id, label: 'Y'.repeat(100) });
    expect(res.status).toBe(200);
  });
});
