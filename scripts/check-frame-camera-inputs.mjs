// ============================================================
// File:        scripts/check-frame-camera-inputs.mjs
// Project:     RaceArena — FRAME-CAMERA-GUARD-1
//
// THE FRAME'S `camera` INPUT OBJECT HAS ONE HOME. NOBODY MAY HAND-BUILD ANOTHER.
//
// ── THE REPAIR THIS GUARDS ──────────────────────────────────────────────────────────────────────
// On 2026-09-05 (`d2f10ab2`), a hand-written literal in `RaceScreen/index.jsx` was replaced with a
// call to `frameCameraInputs()`. The literal had listed three fields by hand while the director
// exposed more, so `anchorRacerIndex` was `undefined` on every live frame — the leader fallback
// fired always and the comebacker's name never appeared. The photo-finish exemption failed the
// same way, because `camera.state` was `undefined`. Both bugs had gone unseen for the same
// reason: forgetting to list a field is silent.
//
// The REPAIR made `frameCameraInputs()` the single builder; this GUARD is the mechanism that keeps
// it single. Without it, a NEW hand-written literal could reintroduce the same class of defect,
// and there was nothing on the tree that would notice.
//
// ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
// Any tracked `.js` or `.jsx` file under `client/src/` that contains one of the marker keys
// `anchorRacerIndex`, `comebackLockedRacerIndex`, or `runInArrived` AS AN OBJECT-LITERAL KEY —
// i.e. matching `<key>:` — is a hand-written frame camera literal and FAILS.
//
// These three names are chosen because they are unique to the frame's camera input in this
// codebase. `state` and `hudState` are too generic to key on and would produce false positives.
//
// Legitimate homes are on an exception list, stated with reason:
//   - `client/src/screens/RaceScreen/frameCameraInputs.js` — the definition itself.
//   - `client/src/screens/RaceScreen/frameCameraInputs.test.js` — the test that grep-checks the
//     renderer against the declared field list.
//   - `client/src/modules/camera/CameraDirector.js` — the director owns the underlying fields
//     (`_anchorRacerIndex`, `_runInArrived`) and their getters, and a test grep in
//     `runInArrival.test.js` matches literal source.
//   - `client/src/modules/camera/CameraDirector.test.js`, `runInArrival.test.js` — director tests
//     that read these fields off a real director instance.
//
// ── LOUD-FAILURE RULE (Lesson 187) ──────────────────────────────────────────────────────────────
// Zero files scanned, zero marker names discovered, or an unreadable frameCameraInputs source
// all FAIL. A guard that passes because it found nothing to check is a no-op.
//
// ── SABOTAGE PROOF ──────────────────────────────────────────────────────────────────────────────
// `scripts/check-frame-camera-inputs.test.mjs` puts a hand-written literal into a fixture and
// asserts the guard fires. If the sabotage cannot make the guard red, the guard is decoration
// and the test says so out loud.
//
// Usage:
//   node scripts/check-frame-camera-inputs.mjs
//   node scripts/check-frame-camera-inputs.mjs --root=<dir>   # scan a fixture (used by its test)
// ============================================================

export const GUARD = {
  id: 'check-frame-camera-inputs',
  covers:
    "a hand-written literal that reconstructs the frame's camera-input object outside frameCameraInputs.js — the defect class the 2026-09-05 repair (d2f10ab2) removed",
  blind: [
    "a literal that spells the marker keys via computed property names or via a spread that omits them",
    "a literal that only carries `state` or `hudState` — those names are too generic to key on, and were not the fields whose absence caused the reported defect",
    "code that builds the object OUTSIDE client/src/ — the sim harnesses live elsewhere and build their own camera stubs, deliberately",
  ],
  dirs: ['client/src/'],
  files: [],
};
if (process.argv.includes('--declare')) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');

const ROOT = argOf('root') ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_REL = 'client/src';
const INPUTS_REL = 'client/src/screens/RaceScreen/frameCameraInputs.js';

const EXEMPT = new Map([
  [
    'client/src/screens/RaceScreen/frameCameraInputs.js',
    'the definition itself — it OWNS the field list',
  ],
  [
    'client/src/screens/RaceScreen/frameCameraInputs.test.js',
    "the test that checks the renderer against the declared list",
  ],
  [
    'client/src/modules/camera/CameraDirector.js',
    "the director owns the underlying private fields and their getters",
  ],
  [
    'client/src/modules/camera/CameraDirector.test.js',
    "director tests read these fields off a real director instance",
  ],
  [
    'client/src/modules/camera/runInArrival.test.js',
    "a runInArrived grep test on the director's own source",
  ],
]);

// ── The marker keys, read from the ONE home ───────────────────────────────────
let markers;
try {
  const src = readFileSync(join(ROOT, INPUTS_REL), 'utf8');
  // Parse FRAME_CAMERA_FIELDS = [ ... ] by string search rather than eval — the source is a
  // static list of quoted strings, so a lexical scan is enough.
  const block = src.match(/FRAME_CAMERA_FIELDS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error('FRAME_CAMERA_FIELDS array not found');
  const names = [...block[1].matchAll(/'([a-zA-Z_$][\w$]*)'/g)].map((m) => m[1]);
  // Restrict to the UNIQUE-enough names. The bugs the repair fixed were about anchorRacerIndex
  // (leader-fallback firing always) and state (photo-finish exemption never firing); we keep
  // anchorRacerIndex and add comebackLockedRacerIndex and runInArrived, which are project-unique
  // strings, but drop `state` and `hudState` because they collide with common code.
  const UNIQUE_ENOUGH = new Set(['anchorRacerIndex', 'comebackLockedRacerIndex', 'runInArrived']);
  markers = names.filter((n) => UNIQUE_ENOUGH.has(n));
  if (markers.length === 0) {
    console.error('FAIL: no unique-enough marker keys discovered in FRAME_CAMERA_FIELDS.');
    process.exit(1);
  }
} catch (e) {
  console.error(`FAIL: cannot read ${INPUTS_REL} — ${e.message}`);
  process.exit(1);
}

// ── Walk client/src/ for .js/.jsx files ───────────────────────────────────────
const SRC_ABS = join(ROOT, SRC_REL);
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js') || name.endsWith('.jsx')) out.push(p);
  }
  return out;
};

let scanned = 0;
const offenders = [];
for (const abs of walk(SRC_ABS)) {
  scanned += 1;
  const rel = relative(ROOT, abs).replace(/\\/g, '/');
  if (EXEMPT.has(rel)) continue;
  const src = readFileSync(abs, 'utf8');
  for (const marker of markers) {
    // Match the marker as an OBJECT KEY: `anchorRacerIndex:` (with optional whitespace before `:`).
    // The negative-lookbehind on `.` rules out property READS like `director.anchorRacerIndex:`
    // — which are not literal keys — and on `_` rules out the director's private field
    // `_anchorRacerIndex:`. Rules of thumb, not lexers; the exception list carries the sites
    // where a lexer would matter.
    const re = new RegExp(`(?<![.\\w])${marker}\\s*:`);
    if (re.test(src)) {
      offenders.push({ rel, marker });
      break; // one offence per file is enough — the caller reads the message and fixes
    }
  }
}

// ── LOUD-FAILURE RULE: zero scans, zero markers ──────────────────────────────
if (scanned === 0) {
  console.error(`FAIL: no .js/.jsx files under ${SRC_REL} — the guard scanned nothing.`);
  process.exit(1);
}

if (offenders.length === 0) {
  console.log(
    `check-frame-camera-inputs: ${scanned} file(s) scanned; ${markers.length} marker key(s) checked; no hand-written literals found.`
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

console.error(
  `FAIL: ${offenders.length} file(s) contain a hand-written literal spelling a frame-camera marker key. Use frameCameraInputs() (client/src/screens/RaceScreen/frameCameraInputs.js) instead.`
);
for (const o of offenders) console.error(`   ${o.rel}: object key '${o.marker}:'`);
console.error(`[ra-elapsed-ms ${Date.now() - started}]`);
process.exit(1);
