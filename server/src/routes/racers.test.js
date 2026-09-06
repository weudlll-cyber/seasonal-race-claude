// ============================================================
// File:        racers.test.js
// Path:        server/src/routes/racers.test.js
// Project:     RaceArena
// Description: Integration tests for /api/racers (D5).
//              Covers: CRUD, sprite upload/serve/delete,
//              magic-byte honesty proof, built-in ID collision guard,
//              operator gating, validation, and corrupt-file-at-boot skip.
//
//              Honesty proofs (L126 — RED without / GREEN with):
//                - POST/PUT with built-in ID "horse" → 400/409
//                - Sprite upload with fake non-image (header image/*) → 400
//                - coats:[] → 400
//                - id with whitespace → 400
//                - DELETE removes record + sprite file from disk
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';
import { validateBody, loadAll, DATA_DIR, SPRITE_DIR } from './racers.js';

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
    await admin.delete(`/api/racers/${id}`).catch(() => {});
  }
});

// ── Minimal valid image buffers ───────────────────────────────────────────────

// 1×1 white JPEG (smallest valid JPEG)
const JPEG_MAGIC = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

// PNG signature bytes (8 bytes) + enough padding for the 12-byte magic-byte check
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

// Non-image content with a valid filename/MIME header — used for the honesty proof
const FAKE_IMAGE_BYTES = Buffer.from('This is not an image, just plain text.');

// ── Minimal valid racer body ──────────────────────────────────────────────────

const BASE_RACER = {
  name: 'Test Racer',
  emoji: '🏇',
  frameCount: 4,
  basePeriodMs: 500,
  displaySize: 60,
  trailStyle: 'dust',
  coats: ['black'],
  primaryColor: '#ff0000',
};

// ── Unit: validateBody ────────────────────────────────────────────────────────

describe('validateBody', () => {
  it('accepts a minimal valid body (no id check)', () => {
    expect(validateBody(BASE_RACER)).toEqual([]);
  });

  it('rejects empty name', () => {
    const errs = validateBody({ ...BASE_RACER, name: '' });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/name/i);
  });

  it('rejects whitespace-only name', () => {
    const errs = validateBody({ ...BASE_RACER, name: '   ' });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects missing emoji', () => {
    const { emoji: _emoji, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/emoji/i);
  });

  it('rejects missing frameCount', () => {
    const { frameCount: _frameCount, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/frameCount/i);
  });

  it('rejects missing basePeriodMs', () => {
    const { basePeriodMs: _basePeriodMs, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/basePeriodMs/i);
  });

  it('rejects missing displaySize', () => {
    const { displaySize: _displaySize, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/displaySize/i);
  });

  it('rejects missing trailStyle', () => {
    const { trailStyle: _trailStyle, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/trailStyle/i);
  });

  it('rejects coats:[] (empty array)', () => {
    const errs = validateBody({ ...BASE_RACER, coats: [] });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/coats/i);
  });

  it('rejects coats that is not an array', () => {
    const errs = validateBody({ ...BASE_RACER, coats: 'black' });
    expect(errs.join(' ')).toMatch(/coats/i);
  });

  it('rejects missing primaryColor', () => {
    const { primaryColor: _primaryColor, ...rest } = BASE_RACER;
    const errs = validateBody(rest);
    expect(errs.join(' ')).toMatch(/primaryColor/i);
  });

  it('rejects id with whitespace (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, 'my racer');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects id with path separators "../../evil" (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, '../../evil');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects id with slash "a/b" (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, 'a/b');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects id with ".." (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, '..');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects id with uppercase letters (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, 'MyRacer');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects built-in id "horse" (bodyId param)', () => {
    const errs = validateBody(BASE_RACER, 'horse');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/built-in/i);
  });

  it('accepts a valid user id with hyphens and underscore (bodyId param)', () => {
    expect(validateBody(BASE_RACER, 'my-racer_2')).toEqual([]);
  });

  it('accepts a valid user id (bodyId param)', () => {
    expect(validateBody(BASE_RACER, 'my-custom-racer')).toEqual([]);
  });
});

// ── Unit: loadAll skips corrupt files ─────────────────────────────────────────

describe('loadAll: corrupt file is skipped (boot safety)', () => {
  it('does not throw and returns a Map when a file contains invalid JSON', () => {
    const tmpDir = join(DATA_DIR, '__test-corrupt__');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'broken.json'), 'NOT JSON {{{', 'utf8');
    writeFileSync(
      join(tmpDir, 'valid.json'),
      JSON.stringify({ id: 'valid-racer', name: 'ok' }),
      'utf8'
    );

    let map;
    expect(() => {
      map = loadAll(tmpDir);
    }).not.toThrow();
    expect(map).toBeInstanceOf(Map);
    expect(map.has('valid-racer')).toBe(true);
    expect(map.size).toBe(1);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/racers', () => {
  it('returns 200 with an array', async () => {
    const res = await admin.get('/api/racers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

describe('GET /api/racers/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await admin.get('/api/racers/nonexistent-xyz-abc');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns the racer by id', async () => {
    const id = 'test-racer-get-by-id';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin.get(`/api/racers/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe(BASE_RACER.name);
  });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /api/racers', () => {
  it('creates a racer and returns 201', async () => {
    const id = 'test-racer-post-basic';
    const res = await admin.post('/api/racers').send({ id, ...BASE_RACER });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe(BASE_RACER.name);
    expect(res.body.spriteFile).toBeNull();
    expect(typeof res.body.createdAt).toBe('string');
    expect(typeof res.body.updatedAt).toBe('string');
    createdIds.push(id);
  });

  it('auto-generates id when none is provided', async () => {
    const res = await admin.post('/api/racers').send(BASE_RACER);
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    createdIds.push(res.body.id);
  });

  it('returns 409 when id already exists', async () => {
    const id = 'test-racer-post-dup';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await admin.post('/api/racers').send({ id, ...BASE_RACER });
    expect(res.status).toBe(409);
  });

  it('returns 400 for missing name', async () => {
    const { name: _name, ...rest } = BASE_RACER;
    const res = await admin.post('/api/racers').send(rest);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for coats:[]', async () => {
    const res = await admin
      .post('/api/racers')
      .send({ id: 'test-racer-empty-coats', ...BASE_RACER, coats: [] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('created racer appears in GET /', async () => {
    const id = 'test-racer-post-in-list';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await admin.get('/api/racers');
    expect(res.body.some((r) => r.id === id)).toBe(true);
  });
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────

describe('PUT /api/racers/:id', () => {
  it('updates fields and returns 200', async () => {
    const id = 'test-racer-put-basic';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin.put(`/api/racers/${id}`).send({ ...BASE_RACER, name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('preserves createdAt on update', async () => {
    const id = 'test-racer-put-createdat';
    const created = await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const updated = await admin.put(`/api/racers/${id}`).send({ ...BASE_RACER, name: 'Updated' });
    expect(updated.body.createdAt).toBe(created.body.createdAt);
  });

  it('preserves spriteFile on update', async () => {
    const id = 'test-racer-put-sprite-preserve';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'r.jpg', contentType: 'image/jpeg' });

    const updated = await admin
      .put(`/api/racers/${id}`)
      .send({ ...BASE_RACER, name: 'Updated With Sprite' });
    expect(updated.status).toBe(200);
    expect(updated.body.spriteFile).toBeTruthy();
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin.put('/api/racers/nonexistent-put-xyz').send(BASE_RACER);
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty name on update', async () => {
    const id = 'test-racer-put-badname';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await admin.put(`/api/racers/${id}`).send({ ...BASE_RACER, name: '' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /api/racers/:id', () => {
  it('deletes a racer and returns 204', async () => {
    const id = 'test-racer-delete-ok';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });

    const res = await admin.delete(`/api/racers/${id}`);
    expect(res.status).toBe(204);

    const get = await admin.get(`/api/racers/${id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin.delete('/api/racers/nonexistent-del-xyz');
    expect(res.status).toBe(404);
  });

  it('deleted racer no longer appears in GET /', async () => {
    const id = 'test-racer-delete-from-list';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    await admin.delete(`/api/racers/${id}`);
    const res = await admin.get('/api/racers');
    expect(res.body.some((r) => r.id === id)).toBe(false);
  });
});

// ── Sprite routes ─────────────────────────────────────────────────────────────

describe('Sprite: POST /:id/sprite', () => {
  it('returns 404 for unknown racer', async () => {
    const res = await admin
      .post('/api/racers/nonexistent-sprite/sprite')
      .attach('sprite', JPEG_MAGIC, { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no file is uploaded', async () => {
    const id = 'test-racer-sprite-nofile';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin.post(`/api/racers/${id}/sprite`).send();
    expect(res.status).toBe(400);
  });

  it('updates spriteFile on the racer record', async () => {
    const id = 'test-racer-sprite-record';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'r.jpg', contentType: 'image/jpeg' });

    const get = await admin.get(`/api/racers/${id}`);
    expect(get.body.spriteFile).toBeTruthy();
    expect(get.body.spriteFile).toMatch(/\.jpg$/);
  });

  it('accepts real JPEG magic bytes', async () => {
    const id = 'test-racer-sprite-real-jpeg';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'real.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('spriteFile');
    expect(res.body.spriteFile).toMatch(/\.jpg$/);
  });

  it('accepts real PNG magic bytes', async () => {
    const id = 'test-racer-sprite-real-png';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', PNG_MAGIC, { filename: 'real.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.spriteFile).toMatch(/\.png$/);
  });
});

describe('Sprite: GET /:id/sprite', () => {
  it('returns 404 when racer has no sprite', async () => {
    const id = 'test-racer-sprite-get-nosprite';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin.get(`/api/racers/${id}/sprite`);
    expect(res.status).toBe(404);
  });

  it('serves the sprite with nosniff header after upload', async () => {
    const id = 'test-racer-sprite-serve';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 's.jpg', contentType: 'image/jpeg' });

    const res = await admin.get(`/api/racers/${id}/sprite`);
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('Sprite: DELETE /:id/sprite', () => {
  it('removes sprite and sets spriteFile to null', async () => {
    const id = 'test-racer-sprite-delete';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'd.jpg', contentType: 'image/jpeg' });

    const del = await admin.delete(`/api/racers/${id}/sprite`);
    expect(del.status).toBe(204);

    const get = await admin.get(`/api/racers/${id}`);
    expect(get.body.spriteFile).toBeNull();
  });

  it('GET /:id/sprite returns 404 after sprite delete', async () => {
    const id = 'test-racer-sprite-delete-get';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', PNG_MAGIC, { filename: 'p.png', contentType: 'image/png' });
    await admin.delete(`/api/racers/${id}/sprite`);

    const res = await admin.get(`/api/racers/${id}/sprite`);
    expect(res.status).toBe(404);
  });
});

// ── HONESTY PROOF — Built-in ID collision guard (L126) ────────────────────────
//
// These tests are RED without the BUILTIN_SET collision check in POST/PUT.
// With the check they are GREEN.
//
// POST: id in body matches a built-in ID → validateBody returns an error → 400
// PUT:  id in URL matches a built-in ID → explicit BUILTIN_SET guard → 409

describe('Honesty proof — Built-in ID collision guard (L126)', () => {
  it('[POST] body id:"horse" is rejected with 400', async () => {
    const res = await admin.post('/api/racers').send({ id: 'horse', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST] body id:"snowmobile" is rejected with 400', async () => {
    const res = await admin.post('/api/racers').send({ id: 'snowmobile', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[PUT] url id "horse" is rejected with 409 (not 404)', async () => {
    const res = await admin.put('/api/racers/horse').send(BASE_RACER);
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('[PUT] url id "f1" is rejected with 409 (not 404)', async () => {
    const res = await admin.put('/api/racers/f1').send(BASE_RACER);
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

// ── HONESTY PROOF — strict id allowlist blocks traversal + invalid chars (L126) ─
//
// RED with old /\s/ check: "../../evil", "a/b", ".." all pass through and
// atomicWriteJson writes a file outside DATA_DIR.
// GREEN with /^[a-z0-9_-]+$/: all rejected → no file written.

describe('Honesty proof — strict id allowlist: path traversal + invalid chars → 400 (L126)', () => {
  it('[POST] id:"../../evil" → 400, no file written outside DATA_DIR', async () => {
    const traversalId = '../../evil';
    const res = await admin.post('/api/racers').send({ id: traversalId, ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    // No record file written at traversal target
    const { join: pathJoin } = await import('path');
    expect(existsSync(pathJoin(DATA_DIR, `${traversalId}.json`))).toBe(false);
  });

  it('[POST] id:"a/b" (slash) → 400', async () => {
    const res = await admin.post('/api/racers').send({ id: 'a/b', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST] id:".." → 400', async () => {
    const res = await admin.post('/api/racers').send({ id: '..', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST] id:"my racer" (space) → 400', async () => {
    const res = await admin.post('/api/racers').send({ id: 'my racer', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST] id:"MyRacer" (uppercase) → 400', async () => {
    const res = await admin.post('/api/racers').send({ id: 'MyRacer', ...BASE_RACER });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST] id:"my-racer_2" (valid allowlist id) → 201', async () => {
    const id = 'my-racer-2';
    const res = await admin.post('/api/racers').send({ id, ...BASE_RACER });
    expect(res.status).toBe(201);
    createdIds.push(id);
  });
});

// ── HONESTY PROOF — coats:[] → 400 ───────────────────────────────────────────

describe('Honesty proof — coats:[] → 400 (L126)', () => {
  it('[POST] coats:[] is rejected with 400', async () => {
    const res = await admin.post('/api/racers').send({ ...BASE_RACER, coats: [] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('[PUT] coats:[] on existing racer is rejected with 400', async () => {
    const id = 'test-racer-put-empty-coats';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin.put(`/api/racers/${id}`).send({ ...BASE_RACER, coats: [] });
    expect(res.status).toBe(400);
  });
});

// ── HONESTY PROOF — Magic-byte sprite upload → 400 ───────────────────────────
//
// A non-image buffer sent as Content-Type: image/jpeg must be rejected.
// RED if the route trusts req.file.mimetype; GREEN when detectMagicType() is authoritative.

describe('Honesty proof — Magic-byte authoritative: fake sprite rejected (L126)', () => {
  it('[POST /:id/sprite] non-image buffer sent as image/jpeg → 400', async () => {
    const id = 'test-racer-sprite-magic';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);

    const res = await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', FAKE_IMAGE_BYTES, { filename: 'fake.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ── HONESTY PROOF — DELETE removes record + sprite file from disk ─────────────
//
// RED if DELETE only removes the in-memory record; GREEN when the sprite file
// is also deleted from disk before the record is removed.

describe('Honesty proof — DELETE removes record and sprite file from disk (L126)', () => {
  it('sprite file is absent from disk after DELETE /:id', async () => {
    const id = 'test-racer-delete-sprite-cleanup';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });

    const uploadRes = await admin
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'cleanup.jpg', contentType: 'image/jpeg' });
    expect(uploadRes.status).toBe(200);

    const { spriteFile } = uploadRes.body;
    const spriteOnDisk = join(SPRITE_DIR, spriteFile);
    expect(existsSync(spriteOnDisk)).toBe(true);

    const del = await admin.delete(`/api/racers/${id}`);
    expect(del.status).toBe(204);

    // Record gone
    const getRecord = await admin.get(`/api/racers/${id}`);
    expect(getRecord.status).toBe(404);

    // Sprite file gone from disk
    expect(existsSync(spriteOnDisk)).toBe(false);
  });
});

// ── Operator gating: all CRUD is operator+ (no admin-only sub-routes) ─────────

describe('Operator: can perform normal CRUD (operator+)', () => {
  it('operator GET / returns 200', async () => {
    const res = await operator.get('/api/racers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('operator POST / creates a racer', async () => {
    const id = 'test-racer-operator-create';
    const res = await operator.post('/api/racers').send({ id, ...BASE_RACER });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(id);
    createdIds.push(id);
  });

  it('operator PUT /:id updates a racer', async () => {
    const id = 'test-racer-operator-put';
    await operator.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await operator.put(`/api/racers/${id}`).send({ ...BASE_RACER, name: 'Op Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Op Updated');
  });

  it('operator DELETE /:id returns 204', async () => {
    const id = 'test-racer-operator-delete';
    await operator.post('/api/racers').send({ id, ...BASE_RACER });
    const res = await operator.delete(`/api/racers/${id}`);
    expect(res.status).toBe(204);
  });

  it('operator POST /:id/sprite uploads a sprite', async () => {
    const id = 'test-racer-operator-sprite';
    await operator.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await operator
      .post(`/api/racers/${id}/sprite`)
      .attach('sprite', JPEG_MAGIC, { filename: 'op.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
  });
});

// ── Honesty proof (C-persist) — extended config fields persisted (D6b-finalize) ─
//
// POST / PUT with bodyFillX, bodyFillY, frameWidth, frameHeight, tintMode,
// defaultCoatId, speedMultiplier, baseRotationOffset, surfaceClasses →
// saved record CONTAINS those fields.
// spriteDataUrl must NOT appear in the saved record.
//
// RED: old narrow whitelist silently drops all extended fields.
// GREEN: extended fields present in returned record.

describe('Honesty proof (C-persist) — extended config fields persisted (D6b-finalize)', () => {
  it('POST with extended fields → returned record contains them', async () => {
    const id = 'test-racer-c-persist-post';
    const body = {
      ...BASE_RACER,
      id,
      bodyFillX: 0.398,
      bodyFillY: 0.672,
      frameWidth: 128,
      frameHeight: 128,
      tintMode: 'multiply',
      defaultCoatId: 'black',
      speedMultiplier: 1.2,
      baseRotationOffset: 1.5707,
      surfaceClasses: ['sand'],
      spriteDataUrl: 'data:image/png;base64,abc', // must NOT appear in record
    };
    const res = await admin.post('/api/racers').send(body);
    expect(res.status).toBe(201);
    createdIds.push(id);
    expect(res.body.bodyFillX).toBe(0.398);
    expect(res.body.bodyFillY).toBe(0.672);
    expect(res.body.frameWidth).toBe(128);
    expect(res.body.frameHeight).toBe(128);
    expect(res.body.tintMode).toBe('multiply');
    expect(res.body.defaultCoatId).toBe('black');
    expect(res.body.speedMultiplier).toBe(1.2);
    expect(res.body.baseRotationOffset).toBe(1.5707);
    expect(res.body.surfaceClasses).toEqual(['sand']);
    expect(res.body.spriteDataUrl).toBeUndefined();
  });

  it('PUT with extended fields → updated record contains them', async () => {
    const id = 'test-racer-c-persist-put';
    await admin.post('/api/racers').send({ id, ...BASE_RACER });
    createdIds.push(id);
    const res = await admin.put(`/api/racers/${id}`).send({
      ...BASE_RACER,
      bodyFillX: 0.5,
      bodyFillY: 0.8,
      tintMode: 'screen',
    });
    expect(res.status).toBe(200);
    expect(res.body.bodyFillX).toBe(0.5);
    expect(res.body.bodyFillY).toBe(0.8);
    expect(res.body.tintMode).toBe('screen');
  });

  it('POST without extended fields → omitted from record (no undefined entries)', async () => {
    const id = 'test-racer-c-persist-minimal';
    const res = await admin.post('/api/racers').send({ id, ...BASE_RACER });
    expect(res.status).toBe(201);
    createdIds.push(id);
    // Extended fields absent from body must not appear in record
    expect(res.body.bodyFillX).toBeUndefined();
    expect(res.body.tintMode).toBeUndefined();
  });
});
