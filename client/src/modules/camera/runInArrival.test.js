// ============================================================
// File:        runInArrival.test.js
// Path:        client/src/modules/camera/runInArrival.test.js
// Project:     RaceArena — RUNIN-NAMES-1
//
// WHAT THIS GUARDS: `runInArrived`, the director's one-way statement that the run-in's CLOSING ZOOM
// has reached the width it was closing to. Nothing in the camera reads it; the RENDERER does, to
// decide whether a label says a name or a number. So the properties that matter are the ones a
// label switch needs — it fires, it fires in BOTH races, and it never un-fires.
//
// WHY THE LATCH IS `_runInAfterDeadline && leaderProgress >= 1` AND NOT `_runInProgress >= 1`, which
// is the same sentence in the schedule's own units: MEASURED over ten tracks x two seeds, the
// schedule's parameter reaches 1 on 6 of 18 finishing races AND ALL SIX ARE PHOTO FINISHES. The
// photo-finish shot keeps the schedule composing past the line; every other race stops composing on
// the crossing frame and freezes the parameter at 0.9969-0.9994. The rejected candidates and their
// numbers are in reports/evolution/RUNIN-NAMES-1.md.
//
// Sabotages recorded in that report:
//   1. it is OFF before the arrival     — sabotage: initialise the latch to true
//   2. it fires when the close has run  — sabotage: require the photo-finish state
//   3. it fires in BOTH races           — sabotage: latch on `_runInProgress >= 1` instead
//   4. it NEVER un-fires                — sabotage: assign the condition instead of latching
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CameraDirector } from './CameraDirector.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const directorSrc = readFileSync(join(HERE, 'CameraDirector.js'), 'utf8');

/**
 * Drive the latch directly through the two quantities it is made of.
 *
 * The latch lives in `update()`, which needs a canvas, a geometry and a race to reach. These tests
 * are about the LATCH, not about the schedule that sets `_runInAfterDeadline` — that is the
 * endgame's own coverage — so they set the two inputs and step the rule, which is exactly what the
 * production line does and nothing more.
 */
function step(cd, { closing, leaderProgress }) {
  cd._runInAfterDeadline = closing;
  cd._diagLeaderProgress = leaderProgress;
  // The production statement, verbatim from update().
  if (cd._runInAfterDeadline && cd._diagLeaderProgress >= 1) cd._runInArrived = true;
  return cd.runInArrived;
}

describe('RUNIN-NAMES-1 — the closing zoom announces its own arrival', () => {
  // PROPERTY 1 — before the arrival, nothing has happened. This is what makes "every label before
  // the arrival is exactly what it is today" true at the source rather than by inspection.
  it('is OFF on a fresh director', () => {
    expect(new CameraDirector().runInArrived).toBe(false);
  });

  it('stays off through the whole race until the close has run AND the leader is at the line', () => {
    const cd = new CameraDirector();
    // mid-race: no endgame at all
    expect(step(cd, { closing: false, leaderProgress: 0.5 })).toBe(false);
    // endgame open, close not yet running
    expect(step(cd, { closing: false, leaderProgress: 0.95 })).toBe(false);
    // close running, leader not yet at the line — the whole closing sweep is still numbers
    expect(step(cd, { closing: true, leaderProgress: 0.96 })).toBe(false);
    expect(step(cd, { closing: true, leaderProgress: 0.999 })).toBe(false);
  });

  // PROPERTY 2 — it fires. The arrival is where the close reaches its endpoint, which §3b puts
  // exactly at the line.
  it('fires when the close has run and the leader reaches the line', () => {
    const cd = new CameraDirector();
    expect(step(cd, { closing: true, leaderProgress: 0.99 })).toBe(false);
    expect(step(cd, { closing: true, leaderProgress: 1 })).toBe(true);
  });

  // PROPERTY 3 — BOTH races. The arrival EVENT is the same one; what differs is the WIDTH arrived
  // at, and that difference lives in the schedule's endpoint, not in this latch. So the latch is
  // asserted to be blind to the photo finish — which is precisely why it fires in both.
  it('fires identically whether or not the race is a photo finish', () => {
    const pf = new CameraDirector();
    pf._inPhotoFinish = true;
    const plain = new CameraDirector();
    plain._inPhotoFinish = false;

    expect(step(pf, { closing: true, leaderProgress: 1 })).toBe(true);
    expect(step(plain, { closing: true, leaderProgress: 1 })).toBe(true);
  });

  it('the two arrival WIDTHS are the schedule’s endpoints, and they differ', () => {
    const cd = new CameraDirector(1280, 720, false, {});
    // The endpoint the close aims at, exactly as `_scheduleClose` selects it.
    cd._inPhotoFinish = true;
    const pfEnd = cd._inPhotoFinish ? cd._photoFinishZoom : cd._leaderZoom;
    cd._inPhotoFinish = false;
    const plainEnd = cd._inPhotoFinish ? cd._photoFinishZoom : cd._leaderZoom;

    expect(Number.isFinite(pfEnd)).toBe(true);
    expect(Number.isFinite(plainEnd)).toBe(true);
    // "tighter when it is a photo finish, wider when it is not" — stated as a RELATION so this file
    // states no config value.
    expect(pfEnd).not.toBe(plainEnd);
  });

  // PROPERTY 4 — the monotonicity the owner's "once names are on, they stay on" depends on. Every
  // flicker this camera has produced came from a per-frame question asked of something decided once.
  it('never un-fires — not when the close stops, not when the leader’s progress dips', () => {
    const cd = new CameraDirector();
    expect(step(cd, { closing: true, leaderProgress: 1 })).toBe(true);
    // the schedule stops composing after the crossing
    expect(step(cd, { closing: false, leaderProgress: 1.01 })).toBe(true);
    // a progress measure that dips (the raw leader progress jitters frame to frame)
    expect(step(cd, { closing: false, leaderProgress: 0.4 })).toBe(true);
    expect(step(cd, { closing: true, leaderProgress: 0 })).toBe(true);
  });

  it('a fresh race starts over — the latch is per-director, not global', () => {
    const first = new CameraDirector();
    step(first, { closing: true, leaderProgress: 1 });
    expect(first.runInArrived).toBe(true);
    expect(new CameraDirector().runInArrived).toBe(false);
  });
});

// ── THE STATEMENT ITSELF, PINNED AS SOURCE ────────────────────────────────────────────────────
//
// WHY THIS IS HERE, stated rather than left to be noticed: the behavioural tests above drive the
// two INPUTS and step the rule, because the latch lives inside `update()`, which needs a canvas, a
// geometry and a live race to reach. That makes them tests of the RULE and not of the line of
// production code — sabotage the line and they stay green, which is the one thing a test must not
// do. This pins the line, following the precedent `modules/engineInputs.test.js` set in this tree.
//
// It cannot tell you the camera looks right; only the fingerprints and the eye do that. It can tell
// you the latch is still one-way and still made of the two quantities that were measured.
describe('RUNIN-NAMES-1 — the production latch, pinned', () => {
  it('latches ONE WAY — it assigns true, it never assigns the condition', () => {
    expect(directorSrc).toMatch(
      /if \(this\._runInAfterDeadline && this\._diagLeaderProgress >= 1\) this\._runInArrived = true;/
    );
    // The failure this forbids: `this._runInArrived = <condition>`, which un-fires the moment the
    // schedule stops composing after the crossing — every label back to numbers mid-ending.
    expect(directorSrc).not.toMatch(/_runInArrived\s*=\s*this\._runInAfterDeadline/);
  });

  it('is initialised false, so a race starts on numbers', () => {
    expect(directorSrc).toMatch(/this\._runInArrived = false;/);
  });

  it('is blind to the photo finish - the arrival EVENT is one, the WIDTH is what differs', () => {
    const i = directorSrc.indexOf('this._runInArrived = true;');
    expect(i).toBeGreaterThan(-1);
    // The statement, taken from the start of the line it sits on.
    const nl = String.fromCharCode(10);
    const line = directorSrc.slice(directorSrc.lastIndexOf(nl, i) + 1, i + 30);
    expect(line).toContain('_runInAfterDeadline');
    expect(line).not.toContain('_inPhotoFinish');
    expect(line).not.toContain('PHOTO_FINISH');
  });

  it('is published to the renderer through a getter, not read as a private field', () => {
    expect(directorSrc).toMatch(/get runInArrived\(\)\s*\{\s*return this\._runInArrived;\s*\}/);
  });
});
