// ============================================================
// File:        doubledNames.test.js
// Path:        server/src/races/doubledNames.test.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (the owner's decisions of 2026-10-04)
// Description: THE SAME NAME TWICE IN ONE RACE IS NOT ALLOWED, names compared ignoring case and
//              surrounding or repeated spaces. The shared rule, and the server's two doors that
//              take a roster: a race upload and a saved player group.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { playerNameKey, doubledNames, doubledNamesMessage } from '../../../shared/playerNames.mjs';
import { createRaceStore } from './raceStore.js';
import { createRacesRouter } from '../routes/races.js';
import { validateBody } from '../routes/playerGroups.js';

describe('the rule (shared/playerNames.mjs)', () => {
  it('ignores case and surrounding or repeated spaces — and nothing else', () => {
    expect(playerNameKey('  Ada   Lovelace ')).toBe(playerNameKey('ada lovelace'));
    expect(playerNameKey('ADA')).toBe(playerNameKey('ada'));
    expect(playerNameKey('Ada')).not.toBe(playerNameKey('Ada L'));
    expect(playerNameKey('AdaLovelace')).not.toBe(playerNameKey('Ada Lovelace'));
  });

  it('names each doubled name once, as first written', () => {
    expect(doubledNames(['Ada', 'Bob', ' ada ', 'BOB', 'ADA', 'Cy'])).toEqual(['Ada', 'Bob']);
    expect(doubledNames(['Ada', 'Bob'])).toEqual([]);
  });

  it('the refusal says which name, and why capitals do not help', () => {
    expect(doubledNamesMessage(['Ada'])).toBe(
      'The name "Ada" is in this race twice. Every racer needs a different name ' +
        '(capitals and extra spaces do not make a name different).'
    );
    expect(doubledNamesMessage(['Ada', 'Bob'], 'group')).toMatch(
      /^These names are in this group twice: "Ada", "Bob"\./
    );
  });
});

// ── a race upload ───────────────────────────────────────────────────────────────────────────
let filePath;
let store;
beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-test-doubled-${randomUUID()}.sqlite`);
  store = createRaceStore(filePath);
});
afterEach(() => {
  store.close();
  for (const suffix of ['', '-wal', '-shm'])
    if (existsSync(filePath + suffix)) unlinkSync(filePath + suffix);
});

const raceWith = (names) => ({
  clientRaceId: randomUUID(),
  finishedAt: '2026-10-04T10:00:00.000Z',
  identifierVersion: 1,
  buildId: 'abc1234',
  geometryId: 'garden-path',
  racerTypeId: 'beetle',
  racePlanSeed: 1,
  raceActionStage: 'quiet',
  names,
  worldConfigs: {},
  results: names.map((name, i) => ({ name, finishTimeMs: 60_000 + i })),
  winners: [names[0]],
  raceSource: 'race',
});

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/races', (req, _res, next) => {
    req.authUser = { username: 'u', role: 'operator', team: 'Team A' };
    next();
  });
  a.use('/api/races', createRacesRouter({ store }));
  return a;
}

describe('POST /api/races — the server half of the refusal', () => {
  it('a roster with the same name twice is answered 400, naming it, and nothing is stored', async () => {
    const res = await request(app())
      .post('/api/races')
      .send(raceWith(['Ada', 'Bob', 'ADA ']));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ROSTER');
    expect(res.body.error).toMatch(/^The name "Ada" is in this race twice\./);
    expect(store.listRacesPage('Team A', { limit: 10, offset: 0 }).races).toEqual([]);
  });

  it('a roster of different names is stored as before', async () => {
    const res = await request(app())
      .post('/api/races')
      .send(raceWith(['Ada', 'Bob']));
    expect(res.status).toBe(201);
  });
});

describe('a saved player group — the server half of the refusal', () => {
  it('a group with the same name twice is refused, naming it', () => {
    const errors = validateBody({ name: 'Friday', players: ['Ada', 'Bob', ' ada'] });
    expect(errors).toEqual([doubledNamesMessage(['Ada'], 'group')]);
  });

  it('a group of different names passes', () => {
    expect(validateBody({ name: 'Friday', players: ['Ada', 'Bob'] })).toEqual([]);
  });
});
