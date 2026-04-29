// ============================================================
// File:        tracks.test.js
// Path:        server/src/routes/tracks.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Integration tests for the tracks API endpoints
// ============================================================

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

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
