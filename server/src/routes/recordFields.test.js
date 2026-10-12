// ============================================================
// File:        recordFields.test.js
// Path:        server/src/routes/recordFields.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A5M-13)
// Description: The field allow-lists and number bounds of the tracks, racers, brands and
//              player-groups routes. THE HALF THAT MATTERS MOST IS THE FIRST: every shipped seed,
//              and records shaped exactly as the editors build them (at their limits), round-trip
//              through PUT unchanged — re-saving what an operator already has is never refused.
//              Then the refusals: an unknown field, and a number outside its bound, are a 400 with a
//              plain-English message. Fixtures are built from what the editors produce; no
//              operator's data is read.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { adminAgent } from '../../test/authAgent.js';
import { DATA_ROOT } from '../dataPaths.js';
import { unknownFields, checkNumber, checkNestedNumbers } from '../../utils/recordFields.js';

const SEEDS = fileURLToPath(new URL('../../seeds/', import.meta.url));
const readSeeds = (type) =>
  readdirSync(join(SEEDS, type))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(SEEDS, type, f), 'utf8')));

const app = createApp();
let api;
const cleanup = [];
beforeAll(async () => {
  api = await adminAgent(app);
});
afterAll(async () => {
  for (const path of cleanup) await api.delete(path).catch(() => {});
});

/** Fields the server pins from the stored record on a PUT, whatever the body says. */
const PINNED = [
  'updatedAt',
  'createdAt',
  'isDefault',
  'backgroundImageFile',
  'logoFile',
  'spriteFile',
];
const without = (rec, keys) =>
  Object.fromEntries(Object.entries(rec).filter(([k]) => !keys.includes(k)));
const storedTrack = (id) =>
  JSON.parse(readFileSync(join(DATA_ROOT, 'tracks', `${id}.json`), 'utf8'));

// ── What the editors build ──────────────────────────────────────────────────────────────────

/** A Track Editor centre-mode body (trackEditorSave.js `buildTrackFromEditorState`), at its limits. */
function editorTrack(effects) {
  const ring = (r, n) =>
    Array.from({ length: n }, (_, i) => ({
      x: Math.round(4000 + r * Math.cos((2 * Math.PI * i) / n)),
      y: Math.round(2000 + r * Math.sin((2 * Math.PI * i) / n)),
    }));
  return {
    name: 'Editor Track at the limits — forty chars',
    closed: true,
    sourceMode: 'center',
    centerPoints: [...ring(1900, 38), { x: -150, y: 4200 }],
    width: 300,
    innerPoints: ring(1750, 200),
    outerPoints: ring(2050, 200),
    effects,
    trackLights: { color: '#3951c6', style: 'random_flash', speed: 3 },
    worldWidth: 8000,
    worldHeight: 4096,
    pathLengthPx: 19772.460802210535,
  };
}

// Every effect at the top of every slider (track-effects/effects/*.js configSchema), three per
// track as the editor allows, and the empty slot the editor saves when no effect was picked.
const EFFECT_SETS = [
  [
    { id: 'bubbles', config: { count: 240000, size: 3, color: '#aaddff', opacity: 1 } },
    { id: 'mud', config: { count: 80000, size: 3, color: '#5a3a1a', opacity: 1, lifespan: 4 } },
    {
      id: 'fireflies',
      config: {
        count: 250,
        size: 5,
        color: '#ffee88',
        opacity: 1,
        drift: 1,
        pulseSpeed: 3,
        glow: 1,
      },
    },
  ],
  [
    {
      id: 'dust',
      config: { count: 4000, size: 5, color: '#c2a06b', opacity: 1, drift: 1, direction: 'random' },
    },
    {
      id: 'stars',
      config: { count: 8000, twinkleSpeed: 3, color: '#ffffff', opacity: 1, size: 3 },
    },
    { id: null, config: {} },
  ],
  [
    { id: 'wave', config: { count: 1000, size: 3, color: '#88aaff', opacity: 1, speed: 2 } },
    { id: 'rain', config: { count: 4000, size: 0.5, color: '#88aaff', opacity: 0 } },
  ],
];

/** The Dev Screen Track Manager's body (TrackManager.jsx), at its limits. */
function managerTrack(geometryId) {
  return {
    name: 'Manager-edited track name, forty chars!',
    icon: '🏁🏁',
    description: 'd'.repeat(100),
    defaultRacerTypeId: 'beetle',
    geometryId,
    color: '#e63946',
    defaultLaps: 10,
    defaultDurationSec: 120,
    worldWidth: 8000,
    worldHeight: 4096,
    maxRacers: 501, // the input says max 500, but its onChange lets a larger value through
    surfaceClasses: ['earth', 'grass'],
    isDefault: false,
  };
}

/** A Racer Editor body (RacerEditor.jsx), with a new sprite, at the top of every slider. */
function editorRacer(id) {
  return {
    id,
    name: 'Racer at the limits',
    emoji: '🐞',
    frameCount: 16,
    basePeriodMs: 2000,
    displaySize: 80,
    trailStyle: 'exhaust',
    coats: Array.from({ length: 20 }, (_, i) =>
      i === 0
        ? { id: 'base', name: 'Base', tint: null }
        : { id: `coat-${i}`, name: `Coat ${i}`, tint: '#a1b2c3' }
    ),
    defaultCoatId: 'base',
    primaryColor: '#e63946',
    speedMultiplier: 2,
    baseRotationOffset: -Math.PI,
    surfaceClasses: ['earth'],
    tintMode: 'screen',
    bodyFillX: 1,
    bodyFillY: 0.37,
    frameWidth: 128,
    frameHeight: 128,
  };
}

// ── The round trips ─────────────────────────────────────────────────────────────────────────

describe('every shipped seed round-trips through PUT unchanged', () => {
  it.each(readSeeds('tracks').map((s) => [s.id, s]))('track %s', async (id, seed) => {
    const before = storedTrack(id);
    const res = await api.put(`/api/tracks/${id}`).send(seed);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const after = storedTrack(id);
    expect(without(after, PINNED)).toEqual(without({ ...before, ...seed }, PINNED));
    for (const k of PINNED.filter((k) => k !== 'updatedAt')) expect(after[k]).toEqual(before[k]);
  });

  it.each(readSeeds('brands').map((s) => [s.id, s]))('brand %s', async (id, seed) => {
    const res = await api.put(`/api/brands/${id}`).send(seed);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(without(res.body, PINNED)).toEqual(without(seed, PINNED));
  });

  it.each(readSeeds('player-groups').map((s) => [s.id, s]))('player group %s', async (id, seed) => {
    const res = await api.put(`/api/player-groups/${id}`).send(seed);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(without(res.body, PINNED)).toEqual(without(seed, PINNED));
  });
});

describe('records shaped like an operator’s, as the editors build them, round-trip unchanged', () => {
  it.each(EFFECT_SETS.map((e, i) => [i, e]))(
    'a Track Editor track (effect set %i)',
    async (_, effects) => {
      const body = editorTrack(effects);
      const created = await api.post('/api/tracks').send(body);
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      const { id, geometryId } = created.body;
      cleanup.push(`/api/tracks/${id}`);

      const resave = await api.put(`/api/tracks/${id}`).send({ ...body, geometryId });
      expect(resave.status, JSON.stringify(resave.body)).toBe(200);
      expect(without(storedTrack(id), PINNED)).toEqual(
        without({ ...storedTrack(id), ...body }, PINNED)
      );
      expect(storedTrack(id).effects).toEqual(effects);

      const edit = await api.put(`/api/tracks/${id}`).send(managerTrack(geometryId));
      expect(edit.status, JSON.stringify(edit.body)).toBe(200);
      expect(storedTrack(id)).toMatchObject(without(managerTrack(geometryId), ['isDefault']));
    }
  );

  it('a Racer Editor racer: created, then the stored record sent back whole', async () => {
    const id = `limits-${Date.now()}`;
    const created = await api.post('/api/racers').send(editorRacer(id));
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    cleanup.push(`/api/racers/${id}`);
    const stored = (await api.get(`/api/racers/${id}`)).body;
    const resave = await api.put(`/api/racers/${id}`).send(stored);
    expect(resave.status, JSON.stringify(resave.body)).toBe(200);
    expect(without(resave.body, PINNED)).toEqual(without(stored, PINNED));
    // edit mode without a new sprite sends no sprite fields
    const {
      bodyFillX: _x,
      bodyFillY: _y,
      frameWidth: _w,
      frameHeight: _h,
      ...editBody
    } = editorRacer(id);
    expect((await api.put(`/api/racers/${id}`).send(editBody)).status).toBe(200);
  });

  it('a branding profile at the sliders’ ends: created, then re-saved', async () => {
    const body = {
      name: 'Brand name of forty characters exactly!!',
      eventName: 'e'.repeat(60),
      subtitle: 's'.repeat(80),
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      sponsorText: 'p'.repeat(80),
      logoMaxHeight: 160,
      logoOpacity: 0,
      logoCorner: 'bottom-right',
    };
    const created = await api.post('/api/brands').send(body);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    cleanup.push(`/api/brands/${created.body.id}`);
    const resave = await api.put(`/api/brands/${created.body.id}`).send(body);
    expect(resave.status).toBe(200);
    expect(resave.body).toMatchObject(body);
  });

  it('a player group from the localStorage migration (id, name, 100 players), then re-saved', async () => {
    const body = {
      id: `migrated-${Date.now()}`,
      name: 'Migrated group',
      players: Array.from({ length: 100 }, (_, i) => `Player ${i + 1}`),
    };
    const created = await api.post('/api/player-groups').send(body);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    cleanup.push(`/api/player-groups/${body.id}`);
    const resave = await api
      .put(`/api/player-groups/${body.id}`)
      .send({ name: body.name, players: body.players });
    expect(resave.status).toBe(200);
    expect(resave.body).toMatchObject({ name: body.name, players: body.players });
  });
});

// ── The refusals ────────────────────────────────────────────────────────────────────────────

describe('an unknown field or an out-of-range number is a 400 with a plain-English message', () => {
  it('tracks: worldWidth 1e9, an unknown field, an effect setting of 1e9 — nothing stored', async () => {
    const created = await api.post('/api/tracks').send(editorTrack([]));
    const { id } = created.body;
    cleanup.push(`/api/tracks/${id}`);
    const before = storedTrack(id);

    const huge = await api.put(`/api/tracks/${id}`).send({ worldWidth: 1e9 });
    expect([huge.status, huge.body.error]).toEqual([
      400,
      'worldWidth must be a number from 1 to 10000',
    ]);

    const extra = await api.put(`/api/tracks/${id}`).send({ name: 'x', hacked: true });
    expect(extra.status).toBe(400);
    expect(extra.body.error).toBe('A track has no field "hacked" — remove it and save again');

    const effect = await api
      .put(`/api/tracks/${id}`)
      .send({ effects: [{ id: 'rain', config: { size: 1e9 } }] });
    expect([effect.status, effect.body.error]).toEqual([
      400,
      'effects[0].config.size must be a number from -480000 to 480000',
    ]);

    expect(storedTrack(id)).toEqual(before);
    expect((await api.post('/api/tracks').send({ ...editorTrack([]), junk: 1 })).status).toBe(400);
  });

  it('racers: an unknown field and speedMultiplier 1e9', async () => {
    const id = `refused-${Date.now()}`;
    const bad = await api
      .post('/api/racers')
      .send({ ...editorRacer(id), speedMultiplier: 1e9, extra: 1 });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toEqual([
      'A racer has no field "extra" — remove it and save again',
      'speedMultiplier must be a number from 0 to 10',
    ]);
  });

  it('brands and player groups: an unknown field', async () => {
    const brand = await api
      .put('/api/brands/seasonal-entertainment')
      .send({ name: 'n', eventName: 'e', colour: '#000000' });
    expect([brand.status, brand.body.error]).toEqual([
      400,
      'A brand has no field "colour" — remove it and save again',
    ]);
    const group = await api
      .put('/api/player-groups/default-example-group')
      .send({ name: 'n', players: ['a'], members: ['a'] });
    expect([group.status, group.body.error]).toEqual([
      400,
      'A player group has no field "members" — remove it and save again',
    ]);
  });
});

describe('the rule for doubt (server/utils/recordFields.js)', () => {
  it('on an update, a key the stored record already has is never unknown', () => {
    const allowed = new Set(['name']);
    expect(unknownFields({ name: 'a', legacy: 1 }, allowed, { legacy: 0 })).toEqual([]);
    expect(unknownFields({ name: 'a', legacy: 1 }, allowed, null)).toEqual(['legacy']);
  });
  it('on an update, a number equal to the stored one is never out of range', () => {
    const bound = { min: 0, max: 10 };
    expect(checkNumber({ n: 99 }, 'n', bound, { n: 99 })).toBeNull();
    expect(checkNumber({ n: 99 }, 'n', bound, { n: 98 })).toBe('n must be a number from 0 to 10');
    expect(checkNumber({ n: 99 }, 'n', bound, null)).toBe('n must be a number from 0 to 10');
  });
  it('nested numbers: finite and within the bound, the path named', () => {
    expect(checkNestedNumbers([{ a: { b: 5 } }], 'x', 10)).toBeNull();
    expect(checkNestedNumbers([{ a: { b: Infinity } }], 'x', 10)).toBe(
      'x[0].a.b must be a number from -10 to 10'
    );
  });
});
