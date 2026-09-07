// ============================================================
// File:        teams.test.js
// Path:        server/src/auth/teams.test.js
// Project:     RaceArena
// Created:     2026-09-06
// Description: The team on a user (TEAMS-1) — the required field, the typo gate, and the backfill.
//
//              WHAT THESE TESTS ARE FOR. The team is a JOIN KEY: a later piece shows a stored race
//              to everyone whose team matches. A key that can be mistyped into a second key fails
//              SILENTLY and stays silent for months, so the tests that matter here are the ones
//              that prove a wrong spelling is never accepted quietly — not the ones that prove a
//              right one works.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createUsersStore } from './usersStore.js';
import { normalizeTeam, isWellFormedTeam, FOUNDING_TEAM } from './teams.js';
import { migrateTeams } from './migrateTeams.js';

function makeTempPath() {
  return join(os.tmpdir(), `teams-test-${randomUUID()}.json`);
}

let filePath;
let store;

beforeEach(() => {
  filePath = makeTempPath();
  store = createUsersStore(filePath);
});

afterEach(() => {
  if (existsSync(filePath)) unlinkSync(filePath);
});

/** The first user in a fresh store — the only create entitled to found a team. */
async function seedFounder(team = FOUNDING_TEAM) {
  return store.createUser({
    username: `founder-${randomUUID().slice(0, 8)}`,
    password: 'pw-123456',
    role: 'admin',
    team,
    allowNewTeam: true,
    createdBy: 'test',
  });
}

// ── normalizeTeam ─────────────────────────────────────────────────────────────

describe('normalizeTeam', () => {
  it('folds case, surrounding whitespace and repeated inner whitespace to one key', () => {
    const key = normalizeTeam('Seasonal Entertainment');
    expect(normalizeTeam('seasonal entertainment')).toBe(key);
    expect(normalizeTeam('  SEASONAL   Entertainment  ')).toBe(key);
    expect(normalizeTeam('Seasonal Entertainment')).toBe(key); // pasted non-breaking space
  });

  it('treats NFC and NFD spellings of the same name as one key', () => {
    // These two look IDENTICAL in any editor and are not the same string — which is the whole
    // hazard. `not.toBe` below is what proves this test is testing something: if a later edit
    // normalised the file and made both spellings composed, that assertion goes red rather than
    // the test quietly passing on two copies of one string.
    const nfc = 'Équipe Rouge'; // composed: one codepoint for E-acute
    const nfd = 'Équipe Rouge'; // decomposed: E + combining acute
    expect(nfc).not.toBe(nfd); // genuinely different strings
    expect(normalizeTeam(nfc)).toBe(normalizeTeam(nfd)); // and one team all the same
  });

  it('does NOT fold a misspelling — which is exactly why the closed set exists', () => {
    // If this ever passes, normalisation has started guessing, and the UNKNOWN_TEAM gate below is
    // no longer the thing standing between a typo and a split team.
    expect(normalizeTeam('Seasonal entertainmnet')).not.toBe(
      normalizeTeam('Seasonal Entertainment')
    );
  });
});

describe('isWellFormedTeam', () => {
  it('rejects everything that is not a non-empty string', () => {
    for (const bad of ['', '   ', null, undefined, 42, {}, []]) {
      expect(isWellFormedTeam(bad)).toBe(false);
    }
    expect(isWellFormedTeam('Seasonal Entertainment')).toBe(true);
  });
});

// ── The required field ────────────────────────────────────────────────────────

describe('createUser — the team is required', () => {
  it('REFUSES a create with no team at all', async () => {
    await expect(
      store.createUser({
        username: 'a',
        password: 'pw-123456',
        role: 'operator',
        allowNewTeam: true,
      })
    ).rejects.toMatchObject({ code: 'INVALID_TEAM' });
    expect(store.countUsers()).toBe(0); // and writes nothing
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['null', null],
  ])('REFUSES a create whose team is %s', async (_label, team) => {
    await expect(
      store.createUser({
        username: 'a',
        password: 'pw-123456',
        role: 'operator',
        team,
        allowNewTeam: true,
      })
    ).rejects.toMatchObject({ code: 'INVALID_TEAM' });
    expect(store.countUsers()).toBe(0);
  });

  it('stores the team and its key on the created record', async () => {
    const user = await seedFounder();
    expect(user.team).toBe(FOUNDING_TEAM);
    expect(user.teamNormalized).toBe(normalizeTeam(FOUNDING_TEAM));
  });

  it('never returns a passwordHash alongside the new team field', async () => {
    const user = await seedFounder();
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('sessionEpoch');
  });
});

// ── The typo gate ─────────────────────────────────────────────────────────────

describe('createUser — two users cannot land in different teams by typo', () => {
  it('REFUSES a team that matches nothing, and names the teams that exist', async () => {
    await seedFounder();

    const err = await store
      .createUser({
        username: 'bob',
        password: 'pw-123456',
        role: 'operator',
        team: 'Seasonal entertainmnet',
      })
      .catch((e) => e);

    expect(err.code).toBe('UNKNOWN_TEAM');
    expect(err.knownTeams).toEqual([FOUNDING_TEAM]);
    // The admin who mistyped is shown what they meant, not only that they were wrong.
    expect(err.message).toContain(FOUNDING_TEAM);
    expect(store.countUsers()).toBe(1); // the typo user was NOT written
  });

  it('ADOPTS the existing spelling when the key matches, so one team keeps one display form', async () => {
    await seedFounder(); // "Seasonal Entertainment"

    const bob = await store.createUser({
      username: 'bob',
      password: 'pw-123456',
      role: 'operator',
      team: '  seasonal   ENTERTAINMENT ', // the same team, typed carelessly
      createdBy: 'test',
    });

    expect(bob.team).toBe(FOUNDING_TEAM); // not the carelessly typed form
    expect(store.listTeams()).toHaveLength(1); // and no second team appeared
  });

  it('allows a new team only when the caller says so EXPLICITLY', async () => {
    await seedFounder();

    await expect(
      store.createUser({
        username: 'c',
        password: 'pw-123456',
        role: 'operator',
        team: 'Other Team',
      })
    ).rejects.toMatchObject({ code: 'UNKNOWN_TEAM' });

    const made = await store.createUser({
      username: 'c',
      password: 'pw-123456',
      role: 'operator',
      team: 'Other Team',
      allowNewTeam: true,
    });
    expect(made.team).toBe('Other Team');
    expect(
      store
        .listTeams()
        .map((t) => t.name)
        .sort()
    ).toEqual(['Other Team', 'Seasonal Entertainment']);
  });

  it('refuses even the FIRST team when the caller did not say it was founding one', async () => {
    await expect(
      store.createUser({ username: 'a', password: 'pw-123456', role: 'operator', team: 'Anything' })
    ).rejects.toMatchObject({ code: 'UNKNOWN_TEAM' });
  });
});

describe('updateUser — the same gate applies to an edit', () => {
  it('REFUSES moving a user to a team that matches nothing', async () => {
    const founder = await seedFounder();
    await expect(
      store.updateUser(founder.id, { team: 'Seasonal entertainmnet' })
    ).rejects.toMatchObject({ code: 'UNKNOWN_TEAM' });
    expect(store.findAuthRecordById(founder.id).team).toBe(FOUNDING_TEAM);
  });

  it('moves a user to an existing team, adopting its spelling', async () => {
    const founder = await seedFounder();
    await store.createUser({
      username: 'b',
      password: 'pw-123456',
      role: 'operator',
      team: 'Other Team',
      allowNewTeam: true,
    });

    const moved = await store.updateUser(founder.id, { team: 'other   team' });
    expect(moved.team).toBe('Other Team');
  });

  it('does NOT bump sessionEpoch — moving teams must not log anybody out', async () => {
    const founder = await seedFounder();
    await store.createUser({
      username: 'b',
      password: 'pw-123456',
      role: 'operator',
      team: 'Other Team',
      allowNewTeam: true,
    });

    const before = store.findAuthRecordById(founder.id).sessionEpoch;
    await store.updateUser(founder.id, { team: 'Other Team' });
    expect(store.findAuthRecordById(founder.id).sessionEpoch).toBe(before);
  });

  it('a team-only update is not an EMPTY_UPDATE', async () => {
    const founder = await seedFounder();
    await expect(store.updateUser(founder.id, { team: FOUNDING_TEAM })).resolves.toBeTruthy();
    await expect(store.updateUser(founder.id, {})).rejects.toMatchObject({ code: 'EMPTY_UPDATE' });
  });
});

// ── The derived set ───────────────────────────────────────────────────────────

describe('listTeams', () => {
  it('is empty on an empty store', () => {
    expect(store.listTeams()).toEqual([]);
  });

  it('counts members per team and ignores users still awaiting the backfill', async () => {
    await seedFounder();
    await store.createUser({
      username: 'b',
      password: 'pw-123456',
      role: 'operator',
      team: FOUNDING_TEAM,
      createdBy: 'test',
    });

    expect(store.listTeams()).toEqual([
      { name: FOUNDING_TEAM, key: normalizeTeam(FOUNDING_TEAM), memberCount: 2 },
    ]);
  });
});

// ── The backfill ──────────────────────────────────────────────────────────────

describe('migrateTeams — the one-time backfill', () => {
  /** Write users the way they existed BEFORE teams: no team field at all. */
  async function seedTeamlessUsers(n) {
    for (let i = 0; i < n; i++) {
      await store.createUser({
        username: `old-${i}`,
        password: 'pw-123456',
        role: i === 0 ? 'admin' : 'operator',
        team: 'placeholder',
        allowNewTeam: true,
        createdBy: 'test',
      });
    }
    // Strip the team back off, which is exactly the shape a pre-TEAMS-1 users.json has.
    const raw = store.readUsers().map(({ team: _t, teamNormalized: _tn, ...rest }) => rest);
    writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');
  }

  it('puts every teamless user in the founding team and reports the count', async () => {
    await seedTeamlessUsers(3);

    const result = await migrateTeams({ store });

    expect(result.changed).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(3);
    expect(result.team).toBe(FOUNDING_TEAM);
    for (const u of store.readUsers()) {
      expect(u.team).toBe(FOUNDING_TEAM);
      expect(u.teamNormalized).toBe(normalizeTeam(FOUNDING_TEAM));
    }
  });

  it('lands everybody on ONE team — the whole point of the backfill', async () => {
    await seedTeamlessUsers(4);
    await migrateTeams({ store });
    expect(store.listTeams()).toHaveLength(1);
  });

  it('is idempotent: a second run changes nothing', async () => {
    await seedTeamlessUsers(2);
    await migrateTeams({ store });

    const second = await migrateTeams({ store });
    expect(second.changed).toBe(0);
    expect(second.skipped).toBe(2);
  });

  it('does not drag a user who already has a DIFFERENT team into the founding team', async () => {
    await seedTeamlessUsers(2);
    await migrateTeams({ store });
    const outsider = await store.createUser({
      username: 'outsider',
      password: 'pw-123456',
      role: 'operator',
      team: 'Other Team',
      allowNewTeam: true,
      createdBy: 'test',
    });

    const again = await migrateTeams({ store });
    expect(again.changed).toBe(0);
    expect(store.findAuthRecordById(outsider.id).team).toBe('Other Team');
  });

  it('--dry-run reports what would change and writes nothing', async () => {
    await seedTeamlessUsers(2);

    const result = await migrateTeams({ store, dryRun: true });
    expect(result.changed).toBe(2);
    expect(result.dryRun).toBe(true);
    for (const u of store.readUsers()) expect(u.team).toBeUndefined();
  });

  it('logs nobody out: sessionEpoch is untouched for every migrated user', async () => {
    await seedTeamlessUsers(2);
    const before = store.readUsers().map((u) => [u.id, u.sessionEpoch ?? 0]);

    await migrateTeams({ store });

    for (const [id, epoch] of before) {
      expect(store.findAuthRecordById(id).sessionEpoch ?? 0).toBe(epoch);
    }
  });
});
