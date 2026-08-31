// ============================================================
// File:        seedNotices.js
// Path:        server/src/seedNotices.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: The pending-warning store. When a shipped record is redelivered, the operator's
//              copy is gone and they are owed a warning that NAMES the record.
//
//              WHY THIS IS A FILE AND NOT A LOG LINE. The requirement is that the warning
//              PERSISTS UNTIL DISMISSED. A boot-time console line is read by nobody and is gone
//              by the time an operator opens the app; browser storage is per-browser, so the
//              same install would warn again on a second machine and never on the first after a
//              cache clear. The install is what was overwritten, so the install is what carries
//              the warning until somebody clears it.
//
//              Append-only until dismissed, and dismissal clears ALL of them at once. That is
//              the small form on purpose: one banner, one button, no per-record bookkeeping.
//
//              Imports only node fs/path + DATA_ROOT, so seedDelivery.js can use it before any
//              router exists.
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'path';
import { DATA_ROOT } from './dataPaths.js';

export const NOTICES_FILE = '.seed-notices.json';

function pathFor(dataRoot) {
  return join(dataRoot, NOTICES_FILE);
}

function write(dataRoot, list) {
  mkdirSync(dataRoot, { recursive: true });
  const path = pathFor(dataRoot);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

/**
 * Every pending notice, oldest first. Absent or unreadable reads as none — a warning store that
 * cannot be parsed must not take the app down.
 * @returns {object[]}
 */
export function readNotices(dataRoot = DATA_ROOT) {
  try {
    const list = JSON.parse(readFileSync(pathFor(dataRoot), 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Record one notice per redelivered unit. A unit already pending is REPLACED rather than
 * duplicated, so two redeliveries before a dismissal leave one line naming the newer version.
 * @param {{unit: string, kind: string, name: string, from: number, to: number}[]} entries
 */
export function appendNotices(entries, dataRoot = DATA_ROOT) {
  if (!entries?.length) return readNotices(dataRoot);
  const at = new Date().toISOString();
  const byUnit = new Map(readNotices(dataRoot).map((n) => [n.unit, n]));
  for (const e of entries) byUnit.set(e.unit, { ...e, at });
  const list = [...byUnit.values()];
  write(dataRoot, list);
  return list;
}

/** Clear every pending notice. Returns how many were cleared. */
export function dismissNotices(dataRoot = DATA_ROOT) {
  const n = readNotices(dataRoot).length;
  if (existsSync(pathFor(dataRoot)) || n) write(dataRoot, []);
  return n;
}
