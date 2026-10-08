// ============================================================
// File:        trackBackupRetention.test.js
// Path:        server/utils/trackBackupRetention.test.js
// Project:     RaceArena — TRACK-BACKUP-RETENTION-1 (2026-10-08)
// Description: The newest 20 backups of a track stay, its older ones go, and nothing else is touched.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  existsSync,
  rmSync,
  utimesSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pruneTrackBackups, TRACK_BACKUPS_KEPT } from './trackBackupRetention.js';

let root;
let dir;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ra-track-backups-'));
  dir = join(root, 'tracks-backups');
  mkdirSync(dir);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** A backup named the way `writeTrackBackup` names it; `minute` orders them. */
function backup(trackId, day, minute) {
  const d = join(dir, day);
  mkdirSync(d, { recursive: true });
  const p = join(d, `10-${String(minute).padStart(2, '0')}-00-000-${trackId}.json`);
  writeFileSync(p, JSON.stringify({ id: trackId, minute }));
  return p;
}
const all = () =>
  readdirSync(dir)
    .flatMap((day) => readdirSync(join(dir, day)).map((f) => `${day}/${f}`))
    .sort();

describe('pruneTrackBackups — TRACK-BACKUP-RETENTION-1', () => {
  it('25 backups of one track over two days: the newest 20 remain, by NAME not by mtime', () => {
    const made = [];
    for (let i = 0; i < 10; i++) made.push(backup('oval', '2026-10-07', i));
    for (let i = 0; i < 15; i++) made.push(backup('oval', '2026-10-08', i));
    // Reverse the mtimes, so ordering by mtime would keep the OLDEST twenty instead.
    made.forEach((p, i) => utimesSync(p, 2_000_000_000 - i * 60, 2_000_000_000 - i * 60));
    const r = pruneTrackBackups({ dir, trackId: 'oval', keepPath: made.at(-1) });
    expect(TRACK_BACKUPS_KEPT).toBe(20);
    expect(r.found).toBe(25);
    expect(r.removed).toHaveLength(5);
    const left = all();
    expect(left).toHaveLength(20);
    // The five oldest — 2026-10-07 minutes 0 to 4 — are the ones gone.
    for (let i = 0; i < 5; i++) expect(left).not.toContain(`2026-10-07/10-0${i}-00-000-oval.json`);
    expect(left).toContain('2026-10-07/10-05-00-000-oval.json');
    expect(left).toContain('2026-10-08/10-14-00-000-oval.json');
  });

  it("another track's backups are untouched — including one whose id starts with this one's", () => {
    for (let i = 0; i < 25; i++) backup('oval', '2026-10-08', i);
    for (let i = 0; i < 25; i++) backup('oval-2', '2026-10-08', i);
    for (let i = 0; i < 3; i++) backup('river-run', '2026-10-08', i);
    pruneTrackBackups({ dir, trackId: 'oval' });
    const left = all();
    expect(left.filter((f) => f.endsWith('-oval.json'))).toHaveLength(20);
    expect(left.filter((f) => f.endsWith('-oval-2.json'))).toHaveLength(25);
    expect(left.filter((f) => f.endsWith('-river-run.json'))).toHaveLength(3);
  });

  it('the live track file is untouched — it lives outside the backup folder', () => {
    mkdirSync(join(root, 'tracks'));
    const live = join(root, 'tracks', 'oval.json');
    writeFileSync(live, '{"id":"oval"}');
    for (let i = 0; i < 25; i++) backup('oval', '2026-10-08', i);
    pruneTrackBackups({ dir, trackId: 'oval' });
    expect(existsSync(live)).toBe(true);
  });

  it('a track with fewer than 20 backups is unchanged', () => {
    for (let i = 0; i < 7; i++) backup('oval', '2026-10-08', i);
    const before = all();
    const r = pruneTrackBackups({ dir, trackId: 'oval' });
    expect(r.removed).toHaveLength(0);
    expect(all()).toEqual(before);
  });

  it('the backup just written is never removed, even if its name sorted it out', () => {
    for (let i = 10; i < 35; i++) backup('oval', '2026-10-08', i);
    const justWritten = backup('oval', '2026-10-08', 0); // the oldest NAME of all
    pruneTrackBackups({ dir, trackId: 'oval', keepPath: justWritten });
    expect(existsSync(justWritten)).toBe(true);
  });

  it('never throws: a missing backup folder is reported, not raised', () => {
    const r = pruneTrackBackups({ dir: join(root, 'nope'), trackId: 'oval' });
    expect(r.removed).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
  });
});
