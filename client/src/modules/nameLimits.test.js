// ============================================================
// File:        nameLimits.test.js
// Path:        client/src/modules/nameLimits.test.js
// Project:     RaceArena — NAME-LIMIT-1
//
// WHAT THIS GUARDS: that the name limit has ONE home, and that no wired entry point can be got past.
//
// It lives under client/ because that is where the test runner is, but it reaches ACROSS to the
// shared module and to the SERVER route — deliberately. A test that only checked the client would
// pass while the server disagreed, which is precisely the state this block was created to end.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PLAYER_NAME_MAX_LENGTH,
  isNameLengthValid,
  tooLongNames,
  nameTooLongMessage,
} from '../../../shared/nameLimits.mjs';

const REPO = join(process.cwd(), '..');
const read = (p) => readFileSync(join(REPO, p), 'utf8');

describe('the limit has ONE home (NAME-LIMIT-1)', () => {
  // What breaks if deleted: a second copy of the number could appear and drift.
  // What goes unnoticed: exactly what happened before this block — three files each believing a
  // different limit, and the effective answer being whichever one was checked last.
  it('is the value the owner chose', () => {
    expect(PLAYER_NAME_MAX_LENGTH).toBe(32);
  });

  it('is not re-typed as a literal in any file that validates or displays a name', () => {
    // The server route and both client entry points must READ the constant, never restate it.
    const sources = [
      'server/src/routes/playerGroups.js',
      'client/src/screens/SetupScreen/PlayerSetup.jsx',
      'client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx',
    ];
    for (const f of sources) {
      const src = read(f);
      expect(src, `${f} must import the shared limit`).toMatch(/shared\/nameLimits\.mjs/);
      // Scoped to the PLAYER name limit deliberately. `NAME_MAX` in the server route is the
      // GROUP's name, a different object that is never drawn as a racer label — see the report's
      // scope note. A literal PLAYER limit anywhere is the drift this test exists to catch.
      const offending = src.match(/PLAYER_NAME_MAX[_A-Z]*\s*=\s*\d+/g) ?? [];
      expect(offending, `${f} restates the player name limit: ${offending.join(', ')}`).toEqual([]);
    }
  });

  it('is gone from the server as a hard-coded 100', () => {
    const src = read('server/src/routes/playerGroups.js');
    expect(src).not.toMatch(/PLAYER_NAME_MAX\s*=\s*100/);
  });
});

describe('no wired entry point accepts an over-length name (NAME-LIMIT-1)', () => {
  // What breaks if deleted: the check could be inverted, or dropped from one path.
  // What goes unnoticed: a name that is too long being stored, then drawn at full width — the
  // renderer has no guard, so the first symptom is a label across half the screen at an event.
  const atLimit = 'x'.repeat(PLAYER_NAME_MAX_LENGTH);
  const overLimit = 'x'.repeat(PLAYER_NAME_MAX_LENGTH + 1);

  it('accepts exactly at the limit and rejects one character past it', () => {
    expect(isNameLengthValid(atLimit)).toBe(true);
    expect(isNameLengthValid(overLimit)).toBe(false);
  });

  it('measures the TRIMMED name, so whitespace cannot be used to smuggle length', () => {
    expect(isNameLengthValid(`   ${atLimit}   `)).toBe(true);
    expect(isNameLengthValid(` ${overLimit} `)).toBe(false);
  });

  it('rejects a non-string outright rather than coercing it', () => {
    // The server takes arbitrary JSON. Coercion here puts "[object Object]" on the starting grid.
    for (const bad of [undefined, null, 42, {}, [], true]) {
      expect(isNameLengthValid(bad)).toBe(false);
    }
  });

  it('names the offenders, because the operator has to know WHICH one to shorten', () => {
    const offenders = tooLongNames(['ok', overLimit, atLimit, `${overLimit}y`]);
    expect(offenders).toHaveLength(2);
    const msg = nameTooLongMessage(offenders);
    expect(msg).toContain(String(PLAYER_NAME_MAX_LENGTH));
    expect(msg.length).toBeGreaterThan(0);
    // And it says nothing when there is nothing to say.
    expect(nameTooLongMessage([])).toBe('');
  });

  it('every wired entry point REJECTS rather than trims', () => {
    // The rule is consistency: no path may silently shorten a name. A `.slice(` on a name in any
    // of these files would be a trim, which is the behaviour this block deliberately did not choose.
    const setup = read('client/src/screens/SetupScreen/PlayerSetup.jsx');
    const groups = read('client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx');
    const server = read('server/src/routes/playerGroups.js');
    expect(setup).toMatch(/isNameLengthValid\(name\)/);
    expect(groups).toMatch(/tooLongNames\(names\)/);
    expect(server).toMatch(/tooLongNames\(body\.players\)/);
    // Each one returns/pushes an error instead of mutating the name.
    expect(setup).toMatch(/setNameError\(/);
    expect(groups).toMatch(/setActionError\(/);
    expect(server).toMatch(/errors\.push\(nameTooLongMessage/);
  });
});
