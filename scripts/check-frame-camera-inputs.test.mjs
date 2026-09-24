// ============================================================
// File:        scripts/check-frame-camera-inputs.test.mjs
// Project:     RaceArena — FRAME-CAMERA-GUARD-1
// Description: The sabotage — a hand-written literal in a fixture makes the guard RED. If it does
//              not, the guard is decoration. Also proves the loud-failure case (empty tree =
//              FAIL), and that the exemptions do NOT get scanned so the legitimate homes remain
//              silent even though they carry the marker keys.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, 'check-frame-camera-inputs.mjs');

const scratch = () => mkdtempSync(join(tmpdir(), 'ra-fci-'));

function seedInputs(root) {
  const dir = join(root, 'client/src/screens/RaceScreen');
  mkdirSync(dir, { recursive: true });
  // A copy of FRAME_CAMERA_FIELDS the guard reads. The four values match the shipped list; the
  // guard restricts to the three UNIQUE-enough names internally.
  writeFileSync(
    join(dir, 'frameCameraInputs.js'),
    "export const FRAME_CAMERA_FIELDS = ['state','anchorRacerIndex','comebackLockedRacerIndex','hudState','runInArrived'];\nexport function frameCameraInputs(){return{};}\n"
  );
}

function runGuard(root) {
  return spawnSync(process.execPath, [GUARD, `--root=${root}`], { encoding: 'utf8' });
}

test('SABOTAGE — a hand-written literal in a fixture makes the guard RED', () => {
  const root = scratch();
  try {
    seedInputs(root);
    const dir = join(root, 'client/src/some/place');
    mkdirSync(dir, { recursive: true });
    // A file that reintroduces the exact defect the 2026-09-05 repair removed.
    writeFileSync(
      join(dir, 'liveFrame.js'),
      "export const cam = { state: 'FOO', anchorRacerIndex: 3 };\n"
    );

    const { status, stderr } = runGuard(root);
    assert.equal(status, 1, `expected exit 1 but got ${status}. stderr: ${stderr}`);
    assert.match(stderr, /anchorRacerIndex/);
    assert.match(stderr, /liveFrame\.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a clean fixture (only the definition site) passes', () => {
  const root = scratch();
  try {
    seedInputs(root);
    const dir = join(root, 'client/src/screens/RaceScreen');
    // A legitimate consumer — uses the function, does not spell the key.
    writeFileSync(
      join(dir, 'index.jsx'),
      "import { frameCameraInputs } from './frameCameraInputs.js';\nexport const x = frameCameraInputs(null);\n"
    );
    const { status, stdout } = runGuard(root);
    assert.equal(status, 0, `expected exit 0 but got ${status}. stdout: ${stdout}`);
    assert.match(stdout, /no hand-written literals found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('LOUD FAILURE — an empty tree FAILS rather than silently passing', () => {
  const root = scratch();
  try {
    seedInputs(root);
    // No .js/.jsx files under client/src except the ones seedInputs put there? Actually it
    // seeded frameCameraInputs.js which is EXEMPT. The walk still finds it, so scanned > 0.
    // For the true zero-scanned case, point --root at a directory with no client/src at all.
    const empty = scratch();
    try {
      const { status, stderr } = runGuard(empty);
      assert.equal(status, 1);
      assert.match(stderr, /cannot read|scanned nothing/i);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('exempt files carry the marker keys but do NOT trigger the guard', () => {
  const root = scratch();
  try {
    seedInputs(root);
    // The director's OWN source spells `_anchorRacerIndex:` — the negative-lookbehind on `_`
    // stops that from matching. A test file on the exemption list gets to spell the marker as
    // an object-literal key too.
    const dir = join(root, 'client/src/modules/camera');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'CameraDirector.js'),
      "class D { constructor(){ this._anchorRacerIndex = null; } get anchorRacerIndex(){ return this._anchorRacerIndex; } }\nconst literal = { anchorRacerIndex: 1 };\nexport { D, literal };\n"
    );
    const { status, stdout } = runGuard(root);
    assert.equal(status, 0, `expected exit 0 but got ${status}. stdout: ${stdout}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a property READ on an object does NOT trigger the guard (only literal keys do)', () => {
  const root = scratch();
  try {
    seedInputs(root);
    const dir = join(root, 'client/src/somewhere');
    mkdirSync(dir, { recursive: true });
    // `camera.anchorRacerIndex:` in a ternary context is a READ, not a key. But it does not
    // match the `<key>:` shape after a lookbehind that excludes `.`. Include one to prove.
    writeFileSync(
      join(dir, 'reader.js'),
      "export const x = (cam) => cam.anchorRacerIndex ?? 'none';\n"
    );
    const { status, stdout } = runGuard(root);
    assert.equal(status, 0, `expected exit 0 but got ${status}. stdout: ${stdout}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
