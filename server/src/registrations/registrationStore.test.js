// ============================================================
// File:        registrationStore.test.js
// Path:        server/src/registrations/registrationStore.test.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: The registration store against a real SQLite file: the deadline decided by the
//              clock, the bounds on capacity and window, close and extend, the name rules, the
//              capacity held against concurrent writers on separate connections (worker threads),
//              a registration surviving a reopen of the file, and team scoping.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import {
  createRegistrationStore,
  CAPACITY_MAX,
  MAX_WINDOW_MS,
  MIN_WINDOW_MS,
} from './registrationStore.js';

const TEAM = 'Alpha Racing';
const OTHER = 'Beta Racing';
// The real time, to the second: the concurrency test's workers run on the real clock, and the
// registration they fill must be open by it.
const T0 = Math.floor(Date.now() / 1000) * 1000;
const MIN = 60 * 1000;

let dir, file, clock, store;
const at = (ms) => new Date(ms).toISOString();

beforeEach(() => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-registrations-'));
  file = join(dir, 'registrations.sqlite');
  clock = T0;
  store = createRegistrationStore(file, { now: () => clock });
});

afterEach(() => {
  store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

function open(overrides = {}) {
  return store.create({
    team: TEAM,
    createdBy: 'ada',
    trackId: 'dirt-oval',
    trackName: 'Dirt Oval',
    capacity: 3,
    eventName: 'Friday cup',
    closesAt: at(T0 + 15 * MIN),
    ...overrides,
  });
}

const join_ = (code, name) => store.addEntry(code, { name, source: 'public' });

describe('opening a registration', () => {
  it('opens now, with a 128-bit URL-safe code, and is open until its deadline', () => {
    const r = open();
    expect(r.code).toMatch(/^[A-Za-z0-9_-]{22}$/); // 16 bytes, base64url
    expect(r.opensAt).toBe(at(T0));
    expect(r.state).toBe('open');
    expect(r).toMatchObject({ capacity: 3, taken: 0, placesLeft: 3, entries: [] });
    clock = T0 + 15 * MIN - 1;
    expect(store.get(r.id, TEAM).state).toBe('open');
    clock = T0 + 15 * MIN; // now >= closes-at: closed, with nothing having run at the deadline
    expect(store.get(r.id, TEAM).state).toBe('closed');
  });

  it('two registrations never share a code', () => {
    const codes = new Set(Array.from({ length: 50 }, () => open().code));
    expect(codes.size).toBe(50);
  });

  it(`bounds the capacity to 1..${CAPACITY_MAX}, whole numbers only`, () => {
    for (const capacity of [0, -1, CAPACITY_MAX + 1, 2.5, '3', null]) {
      expect(() => open({ capacity }), String(capacity)).toThrow(/capacity/);
    }
    expect(open({ capacity: 1 }).capacity).toBe(1);
    expect(open({ capacity: CAPACITY_MAX }).capacity).toBe(CAPACITY_MAX);
  });

  it('refuses a window shorter than 1 minute or longer than 30 days', () => {
    expect(() => open({ closesAt: at(T0 + MIN_WINDOW_MS - 1) })).toThrow(/at least 1 minute/);
    expect(() => open({ closesAt: at(T0 + MAX_WINDOW_MS + 1) })).toThrow(/at most 30 days/);
    expect(() => open({ closesAt: 'next friday' })).toThrow(/date and time/);
    expect(open({ closesAt: at(T0 + MIN_WINDOW_MS) }).state).toBe('open');
    expect(open({ closesAt: at(T0 + MAX_WINDOW_MS) }).state).toBe('open');
  });

  it('keeps the event name optional', () => {
    expect(open({ eventName: null }).eventName).toBeNull();
    expect(open({ eventName: '   ' }).eventName).toBeNull();
  });
});

describe('closing and extending', () => {
  it('closes at once, and closing again changes nothing', () => {
    const r = open();
    clock += MIN;
    const closed = store.close(r.id, TEAM);
    expect(closed.state).toBe('closed');
    expect(closed.closedEarlyAt).toBe(at(T0 + MIN));
    clock += MIN;
    expect(store.close(r.id, TEAM).closedEarlyAt).toBe(at(T0 + MIN));
  });

  it('extends to a later deadline, at most 30 days from creation', () => {
    const r = open();
    clock += 10 * MIN;
    expect(store.extend(r.id, TEAM, at(T0 + 60 * MIN)).closesAt).toBe(at(T0 + 60 * MIN));
    expect(() => store.extend(r.id, TEAM, at(T0 + 30 * MIN))).toThrow(/later than the current/);
    expect(() => store.extend(r.id, TEAM, at(T0 + MAX_WINDOW_MS + 1))).toThrow(/30 days/);
    expect(store.extend(r.id, TEAM, at(T0 + MAX_WINDOW_MS)).closesAt).toBe(at(T0 + MAX_WINDOW_MS));
  });

  it('does not extend a closed registration, whether closed early or by time', () => {
    const early = open();
    store.close(early.id, TEAM);
    expect(() => store.extend(early.id, TEAM, at(T0 + 60 * MIN))).toThrow(/closed/);
    const lapsed = open();
    clock = T0 + 16 * MIN;
    expect(() => store.extend(lapsed.id, TEAM, at(T0 + 60 * MIN))).toThrow(/closed/);
  });
});

describe('adding names', () => {
  it('numbers the names in the order they arrive, and frees a place when one is removed', () => {
    const r = open();
    expect(join_(r.code, ' Ada ')).toMatchObject({
      entry: { name: 'Ada' },
      number: 1,
      capacity: 3,
    });
    const bob = join_(r.code, 'Bob');
    expect(bob.number).toBe(2);
    expect(store.ownEntry(r.code, bob.entry.id)).toEqual({ name: 'Bob', number: 2, capacity: 3 });
    const removed = store.removeEntry(r.id, TEAM, store.get(r.id, TEAM).entries[0].id);
    expect(removed.entries.map((e) => e.name)).toEqual(['Bob']);
    expect(store.ownEntry(r.code, bob.entry.id).number).toBe(1);
    expect(removed.placesLeft).toBe(2);
  });

  it('refuses the same name in another case or spacing, and names the clash', () => {
    const r = open();
    join_(r.code, 'Ada Lovelace');
    expect(() => join_(r.code, '  ada   LOVELACE ')).toThrow(
      /"Ada Lovelace" is already registered/
    );
  });

  it('applies the player-name rules: not empty, not over the length limit', () => {
    const r = open();
    expect(() => join_(r.code, '   ')).toThrow(/enter your name/);
    expect(() => join_(r.code, 42)).toThrow(/enter your name/);
    expect(() => join_(r.code, 'x'.repeat(33))).toThrow(/longer than 32 characters/);
  });

  it('refuses when full, when closed, and for an unknown code', () => {
    const r = open();
    for (const n of ['A', 'B', 'C']) join_(r.code, n);
    expect(() => join_(r.code, 'D')).toThrow(/This race is full/);
    const other = open();
    store.close(other.id, TEAM);
    expect(() => join_(other.code, 'A')).toThrow(/Registration is closed/);
    expect(() => join_('no-such-code', 'A')).toThrow(/no registration/i);
  });

  it('an integration entry needs an external id, and the same id cannot register twice', () => {
    const r = open();
    const add = (name, externalId) =>
      store.addEntry(r.code, { name, source: 'integration', externalId });
    expect(() => add('Ada')).toThrow(/externalId/);
    add('Ada', 'site-user-7');
    expect(() => add('Ada Two', 'site-user-7')).toThrow(/already registered/);
    expect(store.get(r.id, TEAM).entries[0]).toMatchObject({
      source: 'integration',
      externalId: 'site-user-7',
    });
  });
});

describe('the public view', () => {
  it('carries places, state and deadline — never a name, the director, the team or the id', () => {
    const r = open();
    join_(r.code, 'Secret Sam');
    const info = store.publicInfo(r.code);
    expect(info).toEqual({
      eventName: 'Friday cup',
      trackName: 'Dirt Oval',
      capacity: 3,
      placesLeft: 2,
      state: 'open',
      closesAt: at(T0 + 15 * MIN),
    });
    const text = JSON.stringify(info);
    for (const secret of ['Secret Sam', 'ada', TEAM, r.id]) expect(text).not.toContain(secret);
  });
});

describe('team scoping', () => {
  it('another team can neither see nor change a registration', () => {
    const r = open();
    expect(store.get(r.id, OTHER)).toBeNull();
    expect(store.list(OTHER)).toEqual([]);
    expect(store.close(r.id, OTHER)).toBeNull();
    expect(store.extend(r.id, OTHER, at(T0 + 60 * MIN))).toBeNull();
    join_(r.code, 'Ada');
    const entryId = store.get(r.id, TEAM).entries[0].id;
    expect(store.removeEntry(r.id, OTHER, entryId)).toBeNull();
    expect(store.remove(r.id, OTHER)).toBe(false);
    // ...and nothing about it changed.
    expect(store.get(r.id, TEAM)).toMatchObject({ state: 'open', taken: 1 });
    expect(store.list(TEAM).map((x) => x.id)).toEqual([r.id]);
  });
});

describe('deleting', () => {
  it('deletes the registration and every name in it', () => {
    const r = open();
    join_(r.code, 'Ada');
    expect(store.remove(r.id, TEAM)).toBe(true);
    expect(store.get(r.id, TEAM)).toBeNull();
    expect(store.publicInfo(r.code)).toBeNull();
    expect(store.remove(r.id, TEAM)).toBe(false);
  });
});

describe('restart survival', () => {
  it('a registration and its names survive closing and reopening the file; the deadline still holds', () => {
    const r = open();
    join_(r.code, 'Ada');
    store.closeDatabase();
    clock = T0 + 20 * MIN; // the deadline passed while the "server" was down
    store = createRegistrationStore(file, { now: () => clock });
    const back = store.get(r.id, TEAM);
    expect(back).toMatchObject({ code: r.code, state: 'closed', taken: 1 });
    expect(back.entries.map((e) => e.name)).toEqual(['Ada']);
    expect(() => join_(r.code, 'Bob')).toThrow(/closed/);
  });
});

// ★ THE CAPACITY AGAINST CONCURRENT WRITERS. Four worker threads, each with ITS OWN connection to the
// same file, race to add 30 names each to a registration with 50 places. Exactly 50 must land, every
// other attempt must be refused as FULL, and nothing else may go wrong (a deferred transaction here
// answers SQLITE_BUSY instead of waiting — the reason `addEntry` is immediate).
describe('capacity under concurrent writers', () => {
  it('cannot be over-filled by four connections at once', async () => {
    const r = open({ capacity: 50 });
    const storeUrl = pathToFileURL(join(import.meta.dirname, 'registrationStore.js')).href;
    const code = `
      const { workerData, parentPort } = require('node:worker_threads');
      import(workerData.storeUrl).then(({ createRegistrationStore }) => {
        const store = createRegistrationStore(workerData.file);
        const outcome = { ok: 0, full: 0, other: [] };
        for (let i = 0; i < 30; i++) {
          try {
            store.addEntry(workerData.code, { name: 'w' + workerData.w + '-' + i, source: 'public' });
            outcome.ok++;
          } catch (e) {
            if (e.code === 'FULL') outcome.full++;
            else outcome.other.push(e.code || e.message);
          }
        }
        store.closeDatabase();
        parentPort.postMessage(outcome);
      });`;
    const runs = [0, 1, 2, 3].map(
      (w) =>
        new Promise((resolve, reject) => {
          const worker = new Worker(code, {
            eval: true,
            workerData: { storeUrl, file, code: r.code, w },
          });
          worker.once('message', resolve);
          worker.once('error', reject);
        })
    );
    const outcomes = await Promise.all(runs);
    expect(outcomes.flatMap((o) => o.other)).toEqual([]);
    expect(outcomes.reduce((s, o) => s + o.ok, 0)).toBe(50);
    expect(outcomes.reduce((s, o) => s + o.full, 0)).toBe(70);
    expect(store.get(r.id, TEAM)).toMatchObject({ taken: 50, placesLeft: 0 });
  }, 30_000);
});
