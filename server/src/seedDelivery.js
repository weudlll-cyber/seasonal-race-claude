// ============================================================
// File:        seedDelivery.js
// Path:        server/src/seedDelivery.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: Boot-time REDELIVERY of shipped records. Reads the versions declared in
//              server/seeds/versions.json, compares each unit against what this install
//              recorded it was last seeded at, and overwrites the operator's copy WHOLE
//              when — and only when — the shipped version is higher.
//
//              THE RULE THE OWNER DECIDED, and it is deliberately the simple one:
//                · A shipped record is delivered WHOLE. Laps, default racer, winners, max
//                  racers, everything. NO field-level merge and no exceptions. He chose the
//                  rule an operator can understand over the one that is right in every case.
//                · The operator is WARNED, by name, and the warning persists until dismissed.
//                  This module only RECORDS the notice (seedNotices.js); showing it is the
//                  client's job, because a line in a boot log is a warning nobody reads.
//                · A unit is a track WITH its background, or a brand WITH its logo. The
//                  player group has no second half. All five seeded types, one rule.
//                · A record with no unit in the manifest is NEVER a target. That is
//                  structural: the loop walks the manifest, so it never visits one.
//
//              WHY VERSIONS AND NOT CONTENT: server/seeds/versions.json states it in full and
//              is the one home for that argument. In one line — the moment an operator edits
//              anything, content differs forever, so content can only say "different", never
//              "we meant this".
//
//              WHAT IS DELIBERATELY NOT BUILT, because he considered each and chose against it:
//              no restore, no backup copy of the replaced record, no field-by-field keep-mine.
//              If the small form ever stops being tenable that is a decision to bring back to
//              him, not to grow here.
//
//              Imports only node fs/path/url + DATA_ROOT + seedNotices — no route/auth imports,
//              so it can run before any router builds its in-memory map.
// ============================================================

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  renameSync,
} from 'node:fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DATA_ROOT } from './dataPaths.js';
import { appendNotices } from './seedNotices.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_ROOT = resolve(__dirname, '../seeds');
const MANIFEST_PATH = join(SEEDS_ROOT, 'versions.json');

/** Where an install records which version it last received for each unit. */
export const VERSIONS_STATE_FILE = '.seed-versions.json';

/** Read the shipped manifest. Returns {} when it is absent or unreadable — never throws. */
export function readManifest(path = MANIFEST_PATH) {
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    return doc && typeof doc.units === 'object' && doc.units ? doc.units : {};
  } catch {
    return {};
  }
}

function readState(dataRoot) {
  try {
    const s = JSON.parse(readFileSync(join(dataRoot, VERSIONS_STATE_FILE), 'utf8'));
    return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  } catch {
    return {};
  }
}

function writeState(dataRoot, state) {
  // The data root normally exists by now because copyOne created a type directory inside it. It
  // would NOT on a root whose every seed file is missing — a state check-seed-versions refuses to
  // let ship, but this must not depend on another guard having been run.
  mkdirSync(dataRoot, { recursive: true });
  const path = join(dataRoot, VERSIONS_STATE_FILE);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

/** Binary-safe copy through a temp name, so a half-written record is never visible. */
function copyOne(relFile, dataRoot) {
  const src = join(SEEDS_ROOT, relFile);
  if (!existsSync(src)) return false;
  const dest = join(dataRoot, relFile);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  copyFileSync(src, tmp);
  renameSync(tmp, dest);
  return true;
}

/**
 * The DISPLAY NAME for the warning, read from the record that was just delivered rather than
 * restated in the manifest — the record already owns its name. Falls back to the id, which is
 * always available because it is half of the unit key.
 */
function labelFor(unitKey, dataRoot) {
  const [type, id] = [
    unitKey.slice(0, unitKey.indexOf('/')),
    unitKey.slice(unitKey.indexOf('/') + 1),
  ];
  const KIND = { tracks: 'track', brands: 'brand', 'player-groups': 'player group' };
  let name = id;
  try {
    const rec = JSON.parse(readFileSync(join(dataRoot, type, `${id}.json`), 'utf8'));
    if (typeof rec?.name === 'string' && rec.name.trim()) name = rec.name.trim();
  } catch {
    /* no readable record — the id is a truthful name */
  }
  return { kind: KIND[type] ?? type, name };
}

/**
 * Deliver every unit the manifest declares.
 *
 * Per unit, exactly one of four things happens:
 *   · NOT AN INTEGER / ABSENT version  -> nothing at all. Silence is the safe default.
 *   · NO RECORDED VERSION on this install (a fresh install, or one that predates versioning)
 *     -> ADOPT: copy only files that are MISSING, record the version, warn about NOTHING.
 *        An install adopting the current shipment has not had anything replaced.
 *   · SHIPPED HIGHER than recorded -> REDELIVER: overwrite every file of the unit, record the
 *        new version, and raise one notice naming the record.
 *   · SHIPPED EQUAL OR LOWER -> copy only files that are MISSING (so a deleted background comes
 *        back) and leave the version and the operator's record alone.
 *
 * @param {string} [dataRoot] - override for DATA_ROOT (tests only)
 * @param {object} [manifest] - override for the shipped manifest (tests only)
 * @returns {{adopted: string[], redelivered: string[], restored: string[], skipped: string[]}}
 */
export function deliverSeeds(dataRoot = DATA_ROOT, manifest = readManifest()) {
  const state = readState(dataRoot);
  const notices = [];
  const out = { adopted: [], redelivered: [], restored: [], skipped: [] };
  let stateChanged = false;

  for (const [unitKey, unit] of Object.entries(manifest)) {
    const shipped = unit?.version;
    const files = Array.isArray(unit?.files) ? unit.files : [];
    if (!Number.isInteger(shipped) || !files.length) {
      out.skipped.push(unitKey);
      continue;
    }

    const recorded = state[unitKey];

    if (!Number.isInteger(recorded)) {
      // ADOPT. Never overwrite here: an install that already has these records has them for a
      // reason, and this branch cannot tell a fresh install from one that predates versioning.
      for (const f of files) if (!existsSync(join(dataRoot, f))) copyOne(f, dataRoot);
      state[unitKey] = shipped;
      stateChanged = true;
      out.adopted.push(unitKey);
      continue;
    }

    if (shipped > recorded) {
      // REDELIVER — the whole unit, unconditionally. This is the only branch that overwrites.
      for (const f of files) copyOne(f, dataRoot);
      state[unitKey] = shipped;
      stateChanged = true;
      out.redelivered.push(unitKey);
      const { kind, name } = labelFor(unitKey, dataRoot);
      notices.push({ unit: unitKey, kind, name, from: recorded, to: shipped });
      continue;
    }

    // EQUAL or LOWER. Restore anything the install has lost; touch nothing it still has.
    let restoredOne = false;
    for (const f of files) {
      if (!existsSync(join(dataRoot, f))) restoredOne = copyOne(f, dataRoot) || restoredOne;
    }
    if (restoredOne) out.restored.push(unitKey);
  }

  if (stateChanged) writeState(dataRoot, state);
  if (notices.length) appendNotices(notices, dataRoot);
  return out;
}

// ── The once-per-process wrapper the routers use ──────────────────────────────────────────────
//
// Delivery MUST finish before any router builds its in-memory map, and three routers each seed
// their own types at import time. They all import this module, so the first of them to reach its
// seeding line does the work for all five types and the other two are no-ops. `deliverSeeds`
// itself stays unguarded so the tests can call it as many times as they need.
let _done = false;

export function deliverSeedsOnce(dataRoot = DATA_ROOT) {
  if (_done) return null;
  _done = true;
  return deliverSeeds(dataRoot);
}

/** Tests only — forget that delivery has run in this process. */
export function _resetDeliveryForTests() {
  _done = false;
}
