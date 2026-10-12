// ============================================================
// File:        sessionRecovery.test.js
// Path:        server/src/auth/sessionRecovery.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A10-07)
// Description: A damaged `sessions.sqlite` is moved aside with a timestamp, a fresh one is started,
//              and one line says so — instead of the server refusing to start. A healthy file is
//              left exactly as it was.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { openSessionDatabase, createSessionMiddleware } from './session.js';

const dirs = [];
const open = [];
afterEach(() => {
  for (const db of open.splice(0)) if (db.open) db.close();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
function tempDir() {
  const d = mkdtempSync(join(os.tmpdir(), 'ra-sessions-'));
  dirs.push(d);
  return d;
}
const FIXED_NOW = () => new Date('2026-10-12T08:30:15.123Z');
const GARBAGE = 'garbage'.repeat(200);

describe('openSessionDatabase — a damaged file', () => {
  it('is moved aside with a timestamp, a fresh database is opened, and ONE line says so', () => {
    const dir = tempDir();
    const path = join(dir, 'sessions.sqlite');
    writeFileSync(path, GARBAGE);
    const lines = [];

    const db = openSessionDatabase(path, { log: (l) => lines.push(l), now: FIXED_NOW });
    open.push(db);

    const aside = `${path}.damaged-2026-10-12T08-30-15-123Z`;
    expect(readFileSync(aside, 'utf8')).toBe(GARBAGE); // kept, never deleted
    expect(db.prepare('SELECT count(*) AS n FROM sqlite_master').get().n).toBe(0); // fresh
    expect(existsSync(path)).toBe(true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/session database was damaged \(SQLITE_NOTADB\)/);
    expect(lines[0]).toContain(aside);
    expect(lines[0]).toMatch(/everyone has to sign in again/);
  });

  it('the session middleware starts on a damaged file instead of throwing', () => {
    const dir = tempDir();
    const path = join(dir, 'sessions.sqlite');
    writeFileSync(path, GARBAGE);
    const mw = createSessionMiddleware({ dbPath: path, secret: 'test-secret', enableSweep: false });
    open.push(mw._db);
    expect(mw._db.prepare("SELECT name FROM sqlite_master WHERE name = 'sessions'").get()).toEqual({
      name: 'sessions',
    });
    expect(readdirSync(dir).some((f) => f.startsWith('sessions.sqlite.damaged-'))).toBe(true);
  });
});

describe('openSessionDatabase — a healthy file is left alone', () => {
  it('keeps its sessions, moves nothing and logs nothing', () => {
    const dir = tempDir();
    const path = join(dir, 'sessions.sqlite');
    const seed = new Database(path);
    seed.exec('CREATE TABLE sessions (sid TEXT PRIMARY KEY, sess JSON, expire TEXT)');
    seed.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run('sid-1', '{}', '2099-01-01');
    seed.close();
    const lines = [];

    const db = openSessionDatabase(path, { log: (l) => lines.push(l), now: FIXED_NOW });
    open.push(db);

    expect(db.prepare('SELECT sid FROM sessions').all()).toEqual([{ sid: 'sid-1' }]);
    expect(readdirSync(dir)).toEqual(['sessions.sqlite']);
    expect(lines).toEqual([]);
  });

  it('a missing file is simply created, as before', () => {
    const dir = tempDir();
    const path = join(dir, 'sessions.sqlite');
    const lines = [];
    open.push(openSessionDatabase(path, { log: (l) => lines.push(l) }));
    expect(readdirSync(dir)).toEqual(['sessions.sqlite']);
    expect(lines).toEqual([]);
  });
});
