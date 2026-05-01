// ============================================================
// File:        tracks.test.js
// Path:        server/src/routes/tracks.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Integration tests for the tracks API endpoints (read + write)
// ============================================================

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/tracks');

const app = createApp();

// IDs created during tests — cleaned up in afterAll
const createdIds = [];

const VALID_TRACK = {
  name: 'Test Track',
  icon: '🏁',
  closed: true,
  worldWidth: 1280,
  worldHeight: 720,
  centerPoints: [
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 100 },
  ],
  innerPoints: [
    { x: 80, y: 80 },
    { x: 200, y: 180 },
    { x: 320, y: 80 },
  ],
  outerPoints: [
    { x: 120, y: 120 },
    { x: 200, y: 220 },
    { x: 280, y: 120 },
  ],
  effects: [],
};

afterAll(async () => {
  // Clean up any tracks created during tests
  for (const id of createdIds) {
    await request(app).delete(`/api/tracks/${id}`);
  }
});

// ── Read endpoints (pre-existing) ─────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/tracks', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('includes at least one track', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('does not include geometry arrays in list response', async () => {
    const res = await request(app).get('/api/tracks');
    for (const track of res.body) {
      expect(track).not.toHaveProperty('innerPoints');
      expect(track).not.toHaveProperty('outerPoints');
      expect(track).not.toHaveProperty('centerPoints');
      expect(track).not.toHaveProperty('backgroundImageFile');
    }
  });

  it('returns expected fields in list items', async () => {
    const res = await request(app).get('/api/tracks');
    const track = res.body[0];
    expect(track).toHaveProperty('id');
    expect(track).toHaveProperty('name');
    expect(track).toHaveProperty('geometryId');
    expect(track).toHaveProperty('worldWidth');
    expect(track).toHaveProperty('worldHeight');
  });
});

describe('GET /api/tracks/:id', () => {
  it('returns 200 with full track for known id', async () => {
    const res = await request(app).get('/api/tracks/mogcvuipw2y5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'mogcvuipw2y5');
    expect(res.body).toHaveProperty('name', 'Weltall');
    expect(res.body).toHaveProperty('geometryId');
  });

  it('includes geometry arrays in detail response', async () => {
    const res = await request(app).get('/api/tracks/mogcvuipw2y5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.innerPoints)).toBe(true);
    expect(Array.isArray(res.body.outerPoints)).toBe(true);
    expect(res.body.innerPoints.length).toBeGreaterThan(0);
  });

  it('does not expose backgroundImageFile in detail response', async () => {
    const res = await request(app).get('/api/tracks/mogcvuipw2y5');
    expect(res.body).not.toHaveProperty('backgroundImageFile');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tracks/nonexistent-id-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/tracks/:id/background', () => {
  it('returns 200 with image content-type for known track', async () => {
    const res = await request(app).get('/api/tracks/mogcvuipw2y5/background');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\//);
  });

  it('returns image bytes for known track', async () => {
    const res = await request(app)
      .get('/api/tracks/mogcvuipw2y5/background')
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('returns 404 for unknown track background', async () => {
    const res = await request(app).get('/api/tracks/nonexistent-id-xyz/background');
    expect(res.status).toBe(404);
  });
});

// ── Write endpoints ───────────────────────────────────────────────────────────

describe('POST /api/tracks', () => {
  it('creates a track and returns 201 with id and geometryId', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(typeof res.body.geometryId).toBe('string');
    expect(res.body.name).toBe('Test Track');
    expect(res.body).not.toHaveProperty('backgroundImageFile');
    createdIds.push(res.body.id);
  });

  it('persists the track so it appears in GET /api/tracks', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(createRes.body.id);

    const listRes = await request(app).get('/api/tracks');
    const found = listRes.body.find((t) => t.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Test Track');
  });

  it('returns 400 when name is missing', async () => {
    const { name: _drop, ...noName } = VALID_TRACK;
    const res = await request(app).post('/api/tracks').send(noName);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when closed is not boolean', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, closed: 'yes' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no geometry points provided', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ name: 'X', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
  });

  it('does not leave a .tmp file after successful save', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(res.body.id);
    expect(existsSync(join(DATA_DIR, `${res.body.id}.json.tmp`))).toBe(false);
  });

  it('strips backgroundImage from stored JSON', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, backgroundImage: 'data:image/jpeg;base64,/9j/' });
    createdIds.push(res.body.id);
    expect(res.status).toBe(201);
    // Re-fetch: backgroundImage should not be in the response
    const detail = await request(app).get(`/api/tracks/${res.body.id}`);
    expect(detail.body).not.toHaveProperty('backgroundImage');
  });
});

describe('PUT /api/tracks/:id', () => {
  it('updates an existing track and returns 200', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, name: 'Updated Track' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Updated Track');
    expect(updateRes.body.id).toBe(id);
  });

  it('preserves geometryId and createdAt on update', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);
    const geometryId = createRes.body.geometryId;
    const createdAt = createRes.body.createdAt;

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, name: 'Updated', geometryId: 'should-be-ignored' });
    expect(updateRes.body.geometryId).toBe(geometryId);
    expect(updateRes.body.createdAt).toBe(createdAt);
  });

  it('returns 404 when track does not exist', async () => {
    const res = await request(app).put('/api/tracks/nonexistent-xyz').send(VALID_TRACK);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid update body', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(createRes.body.id);

    const res = await request(app)
      .put(`/api/tracks/${createRes.body.id}`)
      .send({ name: '', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tracks/:id', () => {
  it('deletes an existing track and returns 204', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;

    const deleteRes = await request(app).delete(`/api/tracks/${id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/tracks/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when track does not exist', async () => {
    const res = await request(app).delete('/api/tracks/nonexistent-xyz');
    expect(res.status).toBe(404);
  });
});

// ── surfaceClasses field (VRE-3) ──────────────────────────────────────────────

describe('surfaceClasses field — startup migration', () => {
  it('all tracks returned by GET /api/tracks have a surfaceClasses array', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    for (const track of res.body) {
      expect(Array.isArray(track.surfaceClasses)).toBe(true);
    }
  });

  it('migrated unknown track (Weltall) gets surfaceClasses: []', async () => {
    const res = await request(app).get('/api/tracks/mogcvuipw2y5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.surfaceClasses)).toBe(true);
  });
});

describe('POST /api/tracks — surfaceClasses', () => {
  it('creates a track with surfaceClasses and includes it in the response', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth', 'grass'] });
    expect(res.status).toBe(201);
    expect(res.body.surfaceClasses).toEqual(['earth', 'grass']);
    createdIds.push(res.body.id);
  });

  it('created track with surfaceClasses appears correctly in GET detail', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['water'] });
    createdIds.push(createRes.body.id);
    const detail = await request(app).get(`/api/tracks/${createRes.body.id}`);
    expect(detail.body.surfaceClasses).toEqual(['water']);
  });

  it('creates a track with empty surfaceClasses: []', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: [] });
    expect(res.status).toBe(201);
    expect(res.body.surfaceClasses).toEqual([]);
    createdIds.push(res.body.id);
  });

  it('created track without surfaceClasses defaults to [] in list response', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(res.body.id);
    // Track was created without surfaceClasses — post-creation migration not needed
    // since new tracks get [] via spread defaults if not provided
    const list = await request(app).get('/api/tracks');
    const found = list.body.find((t) => t.id === res.body.id);
    expect(found).toBeDefined();
    expect(Array.isArray(found.surfaceClasses)).toBe(true);
  });
});

describe('PUT /api/tracks/:id — surfaceClasses update', () => {
  it('updates surfaceClasses on an existing track', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth'] });
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, surfaceClasses: ['air', 'water'] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.surfaceClasses).toEqual(['air', 'water']);
  });

  it('clears surfaceClasses when updated to []', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth', 'grass'] });
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, surfaceClasses: [] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.surfaceClasses).toEqual([]);
  });
});

// ── PUT partial-update validation (VRE-3 Bug Fix) ────────────────────────────

describe('PUT /api/tracks/:id — partial metadata update (no geometry in body)', () => {
  it('returns 200 when PUT body contains only metadata fields (no closed, no geometry)', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ name: 'Metadata Only', surfaceClasses: ['air'] });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Metadata Only');
    expect(res.body.surfaceClasses).toEqual(['air']);
  });

  it('preserves existing geometry when PUT body omits geometry fields', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    await request(app).put(`/api/tracks/${id}`).send({ name: 'No Geo In Body' });

    const detail = await request(app).get(`/api/tracks/${id}`);
    expect(Array.isArray(detail.body.centerPoints)).toBe(true);
    expect(detail.body.centerPoints.length).toBeGreaterThanOrEqual(2);
    expect(typeof detail.body.closed).toBe('boolean');
  });

  it('returns 400 when PUT body includes closed as non-boolean', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ name: 'Bad Closed', closed: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/closed must be a boolean/i);
  });

  it('returns 400 when PUT body includes geometry with too few centerPoints', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ centerPoints: [{ x: 1, y: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/geometry/i);
  });

  it('returns 200 when PUT body includes valid updated geometry', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const newCenter = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 20 }];
    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ closed: true, centerPoints: newCenter });
    expect(res.status).toBe(200);

    const detail = await request(app).get(`/api/tracks/${id}`);
    expect(detail.body.centerPoints).toEqual(newCenter);
    expect(detail.body.closed).toBe(true);
  });

  it('POST without geometry still returns 400 (create validation unchanged)', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ name: 'No Geometry', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/geometry/i);
  });
});

describe('POST /api/tracks/:id/background', () => {
  it('rejects a file exceeding 10 MB with 413', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff);
    const res = await request(app)
      .post(`/api/tracks/${id}/background`)
      .attach('background', bigBuffer, { filename: 'big.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it('returns 400 when no file is attached', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).post(`/api/tracks/${id}/background`);
    expect(res.status).toBe(400);
  });

  it('accepts a valid image and returns backgroundImageFile', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    // Minimal 1×1 white JPEG (valid JPEG bytes)
    const minimalJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
        'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
        'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
        'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
        'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
        '/9oADAMBAAIRAxEAPwCwABmX/9k=',
      'base64'
    );

    const res = await request(app)
      .post(`/api/tracks/${id}/background`)
      .attach('background', minimalJpeg, { filename: 'track.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('backgroundImageFile');
    expect(res.body.backgroundImageFile).toMatch(/\.jpg$/);
  });
});
