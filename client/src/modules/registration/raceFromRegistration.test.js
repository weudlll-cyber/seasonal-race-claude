// ============================================================
// File:        raceFromRegistration.test.js
// Path:        client/src/modules/registration/raceFromRegistration.test.js
// Project:     RaceArena — REGISTRATION-1 follow-up 2 (the owner's decisions of 2026-10-22)
// Description: The two rules a race takes from its registration: the composed event name, and which
//              registration a started race marks "Raced". WHAT BREAKS IF THIS FILE IS DELETED: a
//              second registration could stack its name onto the first, an unnamed one could wipe
//              the event name, and a race could mark a registration whose players are gone.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  composeEventName,
  EVENT_NAME_SEPARATOR,
  nextRegistrationToMark,
  websiteIdsByName,
  websiteRacersFor,
} from './raceFromRegistration.js';

describe('composeEventName — "<brand profile> – <registration>"', () => {
  it('joins both parts with an en dash and spaces', () => {
    expect(EVENT_NAME_SEPARATOR).toBe(' – ');
    expect(composeEventName('Summer Fair', 'Round 1')).toBe('Summer Fair – Round 1');
  });

  it("is the registration's name alone when the profile has none", () => {
    expect(composeEventName('', 'Round 1')).toBe('Round 1');
    expect(composeEventName(undefined, 'Round 1')).toBe('Round 1');
    expect(composeEventName('   ', 'Round 1')).toBe('Round 1');
  });

  it('changes nothing for a registration without an event name', () => {
    expect(composeEventName('Summer Fair', null)).toBeNull();
    expect(composeEventName('Summer Fair', '')).toBeNull();
    expect(composeEventName('Summer Fair', '  ')).toBeNull();
  });

  it("a second registration REPLACES the first one's part, because the base is the profile's", () => {
    const first = composeEventName('Summer Fair', 'Round 1');
    const second = composeEventName('Summer Fair', 'Round 2');
    expect(first).toBe('Summer Fair – Round 1');
    expect(second).toBe('Summer Fair – Round 2');
    expect(second).not.toContain('Round 1');
  });
});

describe('nextRegistrationToMark — the registration a started race marks "Raced"', () => {
  it('remembers the registration whose players are taken; another one replaces it', () => {
    const a = nextRegistrationToMark(null, { type: 'take', id: 'reg-a' });
    expect(a).toBe('reg-a');
    expect(nextRegistrationToMark(a, { type: 'take', id: 'reg-b' })).toBe('reg-b');
  });

  it('forgets it when a player group changes the roster', () => {
    expect(nextRegistrationToMark('reg-a', { type: 'group' })).toBeNull();
  });

  it('keeps it while single names are edited, forgets it when the roster is emptied', () => {
    expect(nextRegistrationToMark('reg-a', { type: 'names', count: 3 })).toBe('reg-a');
    expect(nextRegistrationToMark('reg-a', { type: 'names', count: 0 })).toBeNull();
  });

  it('forgets it once the race has started, so it is marked only once', () => {
    expect(nextRegistrationToMark('reg-a', { type: 'started' })).toBeNull();
  });

  it('taking the players and changing nothing else leaves it remembered — not yet marked', () => {
    let id = nextRegistrationToMark(null, { type: 'take', id: 'reg-a' });
    id = nextRegistrationToMark(id, { type: 'names', count: 1 });
    expect(id).toBe('reg-a');
  });
});

// WEBSITE-EMBED-1 piece 6: which racers are website members — only the website's own entries, by
// name, and nothing at all when there is none (every standalone registration).
describe('websiteIdsByName / websiteRacersFor (WEBSITE-EMBED-1 piece 6)', () => {
  const entries = [
    { name: 'Mia Member', source: 'website', externalId: 'mia-1' },
    { name: 'Walk-in', source: 'public', externalId: null },
    { name: 'Hugo Host', source: 'website', externalId: 'hugo-1' },
  ];

  it('takes the website entries by name, and only them', () => {
    expect(websiteIdsByName(entries)).toEqual({ 'Mia Member': 'mia-1', 'Hugo Host': 'hugo-1' });
  });

  it('★ a registration without website entries carries nothing — standalone sends no mapping', () => {
    expect(websiteIdsByName([{ name: 'Ada', source: 'public' }])).toBeNull();
    expect(websiteRacersFor([{ name: 'Ada' }], null)).toBeNull();
  });

  it("gives each member the racer's index in the roster; an edited-away name carries no id", () => {
    const ids = websiteIdsByName(entries);
    const roster = [{ name: 'Walk-in' }, { name: 'Hugo Host' }, { name: 'Mia Membr' }];
    expect(websiteRacersFor(roster, ids)).toEqual([{ index: 1, websiteUserId: 'hugo-1' }]);
  });
});
