// ============================================================
// File:        frameCameraInputs.test.js
// Path:        client/src/screens/RaceScreen/frameCameraInputs.test.js
// Project:     RaceArena — FRAME-INPUTS-1
//
// WHAT THIS GUARDS: that the renderer is HANDED what it reads. Every test of the label rules passed
// while the live game was broken, because they all construct their own inputs — the rule was right
// and the input never arrived. So these tests assert the seam, not the rule.
//
// THE DRIFT GUARD IS THE ONE THAT LASTS. It reads `renderRaceFrame.js` as text, extracts every
// `camera.<field>` it reads, and fails if any of them is missing from the assembly. A function can
// go stale exactly as the literal it replaced did; what cannot go stale is a test that derives the
// requirement from the consumer.
//
// WHAT IT DOES NOT CHECK, because a guard that does not say so is trusted for more than it does: it
// matches the LITERAL `camera.<field>` spelling only. A destructured read (`const { state } =
// camera`), an aliased one (`const cam = camera; cam.state`), a computed one (`camera[key]`), and
// any read in a file other than `renderRaceFrame.js` all pass it unseen. It catches the mistake this
// project actually made — a field added to the renderer and forgotten in the assembly, written the
// ordinary way — and it catches nothing clever.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { frameCameraInputs, FRAME_CAMERA_FIELDS } from './frameCameraInputs.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** A stand-in director with a distinct value per field, so a mix-up is visible. */
const fakeDirector = (over = {}) => ({
  state: 'COMEBACK_ZOOM',
  anchorRacerIndex: 59,
  comebackLockedRacerIndex: 59,
  hudState: { some: 'diag' },
  detectBattleGroup: vi.fn(() => ['group']),
  ...over,
});

describe('THE SEAM — the renderer is handed what it reads (FRAME-INPUTS-1)', () => {
  // WHAT BREAKS IF DELETED: the defect itself. `anchorRacerIndex` was absent from the hand-written
  // literal, so it was undefined on every frame of every live race and the leader fallback fired
  // always — the racer the camera was on never carried his name.
  // WHAT GOES UNNOTICED: a subject mechanism that is fully built, fully tested, and never reached.
  it('carries the director’s SUBJECT and its STATE', () => {
    const cam = frameCameraInputs(fakeDirector());
    expect(cam.anchorRacerIndex).toBe(59);
    expect(cam.state).toBe('COMEBACK_ZOOM');
  });

  // WHAT BREAKS IF DELETED: the guard that makes this a fix rather than a patch. The function can go
  // stale exactly as the literal did; this derives the requirement from the CONSUMER instead.
  // WHAT GOES UNNOTICED: the next field added to the renderer and forgotten here — which is this
  // block's entire defect, repeating.
  it('supplies every camera field renderRaceFrame actually reads', () => {
    const src = readFileSync(join(HERE, 'renderRaceFrame.js'), 'utf8');
    const read = new Set(
      [...src.matchAll(/\bcamera\s*\??\.\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
    );
    expect(read.size, 'the regex found the reads at all').toBeGreaterThan(0);
    const supplied = new Set(Object.keys(frameCameraInputs(fakeDirector())));
    for (const field of read) {
      expect(
        supplied.has(field),
        `renderRaceFrame reads camera.${field} — add it to the assembly`
      ).toBe(true);
    }
  });

  it('never returns null, and degrades to nulls before a director exists', () => {
    const cam = frameCameraInputs(null);
    expect(cam).toBeTruthy();
    for (const f of FRAME_CAMERA_FIELDS) expect(cam[f]).toBeNull();
    expect(cam.detectBattleGroup([])).toBeNull();
  });

  it('keeps detectBattleGroup bound to the director rather than copying it off', () => {
    const d = fakeDirector();
    const cam = frameCameraInputs(d);
    expect(cam.detectBattleGroup(['r'])).toEqual(['group']);
    expect(d.detectBattleGroup).toHaveBeenCalledWith(['r']);
  });
});

describe('THE CONSEQUENCES the owner reported (FRAME-INPUTS-1)', () => {
  // WHAT BREAKS IF DELETED: his exact report — in a COMEBACK shot on Ana (#59), the leader carried
  // a name and the comebacker carried a number.
  // WHAT GOES UNNOTICED: the fallback silently standing in for the subject on every frame.
  it('in COMEBACK_ZOOM the exempt racer is the DIRECTOR’s subject, not the leader', () => {
    const cam = frameCameraInputs(fakeDirector({ anchorRacerIndex: 59 }));
    // This is the renderer's own expression, and it is the line that was reading undefined.
    const focusRacerIndex = cam?.anchorRacerIndex ?? null;
    expect(focusRacerIndex).toBe(59);
    // …so the fallback that picks the leader must NOT be taken.
    expect(focusRacerIndex == null).toBe(false);
  });

  // WHAT BREAKS IF DELETED: the second defect, which he has not seen because it fails by doing
  // nothing — `camera.state` was undefined, so this was false on every frame ever drawn.
  // WHAT GOES UNNOTICED: the photo-finish exemption never firing, for as long as it exists.
  it('in PHOTO_FINISH, exemptAll is true', () => {
    const at = (state) => frameCameraInputs(fakeDirector({ state }))?.state === 'PHOTO_FINISH';
    expect(at('PHOTO_FINISH')).toBe(true);
    expect(at('LEADER_ZOOM')).toBe(false);
  });
});
