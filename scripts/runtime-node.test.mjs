// ============================================================
// File:        runtime-node.test.mjs
// Path:        scripts/runtime-node.test.mjs
// Project:     RaceArena — AUDIT-1 A7 (2026-10-09)
// Description: The shipped image and CI run ONE supported Node major, the same one.
//
// AUDIT-1 found both on Node 20 five months after its end of life (2026-04-30), because nothing
// tied them to anything: the image's base is pinned by digest (a manual bump, TIDY-C-1) and CI's
// `node-version` is a literal. Two facts are pinned here:
//   1. every `FROM node:<major>` in server/Dockerfile and every `node-version:` in the live
//      workflows name the SAME major — the image must ship what CI tested;
//   2. that major is not below FLOOR. FLOOR is the oldest Node line still receiving security fixes
//      when this was written; raise it when that line reaches its end of life.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Node 22 is in maintenance until 2027-04-30; 20 ended 2026-04-30. */
const FLOOR = 22;

const imageMajors = [...readFileSync(join(ROOT, 'server/Dockerfile'), 'utf8').matchAll(/^FROM node:(\d+)-/gm)].map((m) => Number(m[1]));
const WF = join(ROOT, '.github', 'workflows');
const ciMajors = readdirSync(WF)
  .filter((f) => /\.ya?ml$/.test(f))
  .flatMap((f) => [...readFileSync(join(WF, f), 'utf8').matchAll(/node-version:\s*'?(\d+)/g)].map((m) => Number(m[1])));

test('the image and CI name a Node major at all — a check that reads nothing proves nothing', () => {
  assert.equal(imageMajors.length, 2, `expected the two FROM lines, found ${imageMajors.length}`);
  assert.ok(ciMajors.length >= 1, 'expected node-version in the live workflows');
});

test('the image ships the Node major CI tests', () => {
  const all = new Set([...imageMajors, ...ciMajors]);
  assert.equal(all.size, 1, `image ${imageMajors.join(',')} vs CI ${ciMajors.join(',')}`);
});

test(`that major still receives security fixes (>= ${FLOOR})`, () => {
  assert.ok(imageMajors[0] >= FLOOR, `Node ${imageMajors[0]} is past its end of life`);
});