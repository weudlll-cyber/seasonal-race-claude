# FIELD-RETIRED-1 — the retirement is now visible from outside, and all four fingerprints are byte-identical

> **Two lines of published state. No check was built.** `verify` **PASS 14 FAIL 0**, camera director
> **388/388**, and **all four fingerprints run against the record and all four match**.

---

## 1. WHAT WAS ACTUALLY MISSING — and it was not `ceilings.field`

MOTION-CONTINUITY-1 asked for `fieldRetired`/`ceilings.field` to be published. **`ceilings.field` was
already on the probe.** The gap was narrower and more awkward than that:

`_fieldCeiling` returns `Infinity` **both before the guarantee is armed and after it retires**. So
from outside the class, "retired on this frame" and "was never armed" are the same value. The
retirement — **the largest single-frame picture move of a real race, 14.8× the local median pan and
the largest zoom step of the race on city-circuit seed 9** — was invisible as an *event*, and an
instrument watching for a motion fault sees it and cannot tell it from one.

**Two days went into a single-frame camera step this week before it was identified by hand.**

## 2. WHAT WAS PUBLISHED

Two fields on `_framingProbe`, both of which the class **already kept**:

```js
fieldActive: this._fieldGuaranteeActive,
fieldRetiredAt: this._fieldGuaranteeRetiredAt,
```

**Nothing is computed and no threshold is chosen.** An instrument can now find the retirement frame as
the one where `fieldActive` goes true → false, and `fieldRetiredAt` names the track T it happened at.
Whether to build a motion-continuity check on that is the owner's to order; MOTION-CONTINUITY-1 sets
out what it would cost, and **this piece deliberately stops here.**

---

## 3. THE PROOF THAT IT CHANGES NOTHING

| claim | how established |
| --- | --- |
| the probe is diagnostic only | `git grep` for `_framingProbe` outside `CameraDirector.js`: **tests only**. Nothing in the camera reads it, the same standing as `corridorCap` beside it |
| outside the engine hull | `engine-reach --check` on `CameraDirector.js` → *"outside the hull (cannot reach the engine at all)"*, exit 1 |
| **the camera hash cannot move** | `camera-fingerprint.mjs` hashes **ten named fields** — state, lerpPhase, anchorRacerLabel, zoom, offsetX/Y, targetZoom, targetOffsetX/Y, camT. A new probe field is not among them **by construction**, not by luck |
| camera | `check: CAMERA matches the record (152cf295c4c9ff54)` |
| render | `check: RENDER matches the record (485b73d527602a0e)` |
| world | `check: WORLD matches the record (8a1977187e9c99b4)` |
| world-off | `check: WORLD matches the record for role "world-off" (aa09ed97a3a32689)` |
| behaviour | camera director suite **388/388**, including its existing framing-probe tests |

**Render was run as well as camera, deliberately.** SHIP-CEREMONY records that a camera-only diff has
moved the render hash before — the director decides the transform on every drawn frame — so checking
only the camera would have been the plausible-looking half of the proof.

**These checks could not have said this yesterday.** Both camera and render only gained `--check`
hours earlier, in FP-COMPARE-2; before that they printed a hash and exited 0 whatever it was, and
"the fingerprint did not move" would have rested on my reading two numbers.

---

## 4. THREE TESTS, PINNING THE PUBLICATION AND NOT A THRESHOLD

Added beside the existing probe tests: that the two fields are present and `fieldActive` is a boolean;
that a director which never armed the guarantee does **not** look like one that retired — the exact
distinction these fields add; and that the published values **are** the class state rather than a
recomputation of it.

---

## Limits

**Nothing consumes these fields yet.** They are published and nothing reads them, which is a state
this project is right to be suspicious of — an unread field is how a stale one survives. It is
deliberate: the brief asked for the field and forbade the instrument, and the alternative was to build
a check carrying a false-positive budget nobody has ordered.

**The retirement's SIZE is not published, only its occurrence.** An instrument still has to measure the
pan and zoom step itself; these fields tell it whether the step it just saw was a deliberate one.

**`fieldRetiredAt` is a track T, not a frame index.** It is what the class already stores. An
instrument correlating it with frames must map T to frames itself, and nothing here does that for it.

**No claim is made that this is sufficient for a motion check.** MOTION-CONTINUITY-1 named the cut
grammar (not shipped), `LEAD_CHANGE`'s snap and `OVERVIEW`'s (both already marked by state and
lerpPhase, both already hashed) and the field retirement (this piece) as the deliberate cuts it found.
**Whether that enumeration is complete was not re-established here.**
