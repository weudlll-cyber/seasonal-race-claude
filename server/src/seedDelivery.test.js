// ============================================================
// File:        seedDelivery.test.js
// Path:        server/src/seedDelivery.test.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: The delivery rule, proven on a temp data root.
//
//              THE TWO TESTS THAT MUST BE ABLE TO GO RED, because a test that cannot is not a
//              test. Both were run against a sabotaged source and both failed, which is recorded
//              in reports/evolution/SEED-REDELIVERY-1.md:
//                · "leaves an edited record alone when the version is EQUAL" — delete the
//                  `shipped > recorded` comparison so every unit overwrites, and this goes red.
//                · "raises a notice naming the record" — the same sabotage makes it raise notices
//                  for units that were not redelivered.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { deliverSeeds, readManifest, VERSIONS_STATE_FILE } from './seedDelivery.js';
import { readNotices, dismissNotices, NOTICES_FILE } from './seedNotices.js';

// The real shipped units, so these tests cannot drift away from what actually ships.
const REAL = readManifest();
const TRACK_UNIT = 'tracks/garden-path';
const TRACK_FILES = REAL[TRACK_UNIT].files;
const TRACK_JSON = TRACK_FILES[0];

let root;

beforeEach(() => {
  root = mkdtempSync(join(os.tmpdir(), 'ra-delivery-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Put an install in the state "already seeded at version N, then edited by the operator". */
function installedAt(version, bodyPatch = {}) {
  for (const rel of TRACK_FILES) {
    mkdirSync(join(root, rel.slice(0, rel.lastIndexOf('/'))), { recursive: true });
    writeFileSync(join(root, rel), rel.endsWith('.json') ? '{}' : 'binary-placeholder');
  }
  const rec = { id: 'garden-path', name: 'Operator Edited', defaultLaps: 99, ...bodyPatch };
  writeFileSync(join(root, TRACK_JSON), JSON.stringify(rec));
  writeFileSync(
    join(root, VERSIONS_STATE_FILE),
    JSON.stringify({ [TRACK_UNIT]: version }, null, 2)
  );
}

const unit = (version) => ({ [TRACK_UNIT]: { version, files: TRACK_FILES } });

describe('deliverSeeds — the manifest is real', () => {
  it('ships every seed file in exactly one unit', () => {
    const seen = new Set();
    for (const u of Object.values(REAL)) {
      for (const f of u.files) {
        expect(seen.has(f), `${f} claimed twice`).toBe(false);
        seen.add(f);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('starts every shipped unit at the same version', () => {
    const versions = new Set(Object.values(REAL).map((u) => u.version));
    expect([...versions]).toEqual([1]);
  });
});

describe('deliverSeeds — ADOPT (no recorded version)', () => {
  it('copies a fresh install and warns about nothing', () => {
    const out = deliverSeeds(root, unit(1));
    expect(out.adopted).toEqual([TRACK_UNIT]);
    expect(out.redelivered).toEqual([]);
    expect(readNotices(root)).toEqual([]);
    for (const f of TRACK_FILES) expect(existsSync(join(root, f))).toBe(true);
    expect(JSON.parse(readFileSync(join(root, VERSIONS_STATE_FILE), 'utf8'))[TRACK_UNIT]).toBe(1);
  });

  it('does NOT overwrite an install that predates versioning', () => {
    // Records present, no recorded version — an operator upgrading. Adopting must not cost them
    // their edits: this is exactly the boot the owner's own install takes.
    mkdirSync(join(root, 'tracks'), { recursive: true });
    mkdirSync(join(root, 'backgrounds'), { recursive: true });
    for (const rel of TRACK_FILES) writeFileSync(join(root, rel), 'mine');
    const out = deliverSeeds(root, unit(1));
    expect(out.adopted).toEqual([TRACK_UNIT]);
    for (const f of TRACK_FILES) expect(readFileSync(join(root, f), 'utf8')).toBe('mine');
    expect(readNotices(root)).toEqual([]);
  });
});

describe('deliverSeeds — the version comparison', () => {
  it('leaves an edited record alone when the version is EQUAL', () => {
    installedAt(1);
    const out = deliverSeeds(root, unit(1));
    expect(out.redelivered).toEqual([]);
    expect(JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8')).name).toBe('Operator Edited');
    expect(readNotices(root)).toEqual([]);
  });

  it('leaves an edited record alone when the shipped version is LOWER', () => {
    installedAt(5);
    const out = deliverSeeds(root, unit(2));
    expect(out.redelivered).toEqual([]);
    expect(JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8')).name).toBe('Operator Edited');
  });

  it('leaves it alone when the shipped version is ABSENT or not an integer', () => {
    installedAt(1);
    for (const bad of [undefined, null, '2', 1.5]) {
      const out = deliverSeeds(root, { [TRACK_UNIT]: { version: bad, files: TRACK_FILES } });
      expect(out.skipped).toEqual([TRACK_UNIT]);
      expect(JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8')).name).toBe('Operator Edited');
    }
  });

  it('OVERWRITES the whole record when the shipped version is HIGHER', () => {
    installedAt(1);
    const out = deliverSeeds(root, unit(2));
    expect(out.redelivered).toEqual([TRACK_UNIT]);
    const after = JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8'));
    // Delivered WHOLE: the operator's name and their lap count are both gone, not merged.
    expect(after.name).not.toBe('Operator Edited');
    expect(after.defaultLaps).not.toBe(99);
    expect(after.id).toBe('garden-path');
    expect(JSON.parse(readFileSync(join(root, VERSIONS_STATE_FILE), 'utf8'))[TRACK_UNIT]).toBe(2);
  });

  it('delivers the BINARY half of the unit too', () => {
    installedAt(1);
    const bg = TRACK_FILES[1];
    expect(readFileSync(join(root, bg), 'utf8')).toBe('binary-placeholder');
    deliverSeeds(root, unit(2));
    expect(readFileSync(join(root, bg)).length).toBeGreaterThan(1000);
  });

  it('is idempotent — a second boot at the same version changes nothing', () => {
    installedAt(1);
    deliverSeeds(root, unit(2));
    dismissNotices(root);
    const out = deliverSeeds(root, unit(2));
    expect(out.redelivered).toEqual([]);
    expect(readNotices(root)).toEqual([]);
  });
});

describe('deliverSeeds — the warning', () => {
  it('raises a notice naming the record', () => {
    installedAt(1);
    deliverSeeds(root, unit(2));
    const notices = readNotices(root);
    expect(notices).toHaveLength(1);
    expect(notices[0].unit).toBe(TRACK_UNIT);
    expect(notices[0].kind).toBe('track');
    // The NAME comes from the delivered record, not from the manifest.
    expect(notices[0].name).toBe(JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8')).name);
    expect(notices[0].from).toBe(1);
    expect(notices[0].to).toBe(2);
  });

  it('persists until dismissed, and dismissal is what clears it', () => {
    installedAt(1);
    deliverSeeds(root, unit(2));
    expect(readNotices(root)).toHaveLength(1);
    // Any number of further boots must not lose the warning.
    deliverSeeds(root, unit(2));
    deliverSeeds(root, unit(2));
    expect(readNotices(root)).toHaveLength(1);
    expect(dismissNotices(root)).toBe(1);
    expect(readNotices(root)).toEqual([]);
    expect(existsSync(join(root, NOTICES_FILE))).toBe(true);
  });

  it('does not duplicate a unit redelivered twice before a dismissal', () => {
    installedAt(1);
    deliverSeeds(root, unit(2));
    deliverSeeds(root, unit(3));
    const notices = readNotices(root);
    expect(notices).toHaveLength(1);
    expect(notices[0].to).toBe(3);
  });
});

describe('deliverSeeds — what it must never touch', () => {
  it('never visits a record with no unit in the manifest', () => {
    installedAt(1);
    mkdirSync(join(root, 'player-groups'), { recursive: true });
    const mine = join(root, 'player-groups', 'my-own-group.json');
    writeFileSync(mine, JSON.stringify({ id: 'my-own-group', name: 'Mine' }));
    deliverSeeds(root, unit(2));
    expect(JSON.parse(readFileSync(mine, 'utf8')).name).toBe('Mine');
    // And the real shipment cannot reach it either.
    deliverSeeds(root, REAL);
    expect(existsSync(mine)).toBe(true);
    expect(JSON.parse(readFileSync(mine, 'utf8')).name).toBe('Mine');
  });

  it('restores a file the install lost, without touching the version or warning', () => {
    installedAt(1);
    rmSync(join(root, TRACK_FILES[1]));
    const out = deliverSeeds(root, unit(1));
    expect(out.restored).toEqual([TRACK_UNIT]);
    expect(existsSync(join(root, TRACK_FILES[1]))).toBe(true);
    expect(JSON.parse(readFileSync(join(root, TRACK_JSON), 'utf8')).name).toBe('Operator Edited');
    expect(readNotices(root)).toEqual([]);
  });
});
