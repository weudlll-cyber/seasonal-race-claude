# WINNER-AFTER-CROSSING-1 — where the shot actually ends, measured

**2026-09-24. Measurement only. Nothing is proposed here and nothing was changed in what the gate
grades.** The owner ruled on 2026-09-24 that the framing of the frames AFTER the finish is not
something he judges. That answers invariant 6's question and does not clear its red: every one of
the 17 violations falls after the crossing, so what is now in question is the guard's SCOPE. This
report supplies the numbers that question needs, and stops there.

## The question

After the winner crosses, is there a NATURAL boundary in the ending — a point where the shot that
owned the crossing hands over — or is there only an arbitrary number of frames?

## How it was measured, and what was reused rather than built

**No instrument was built.** `client/src/modules/viewerProbe.js` already records the winner's
position on every frame after the crossing — `crossing.after`, up to 260 frames, each carrying the
frame index, the timestamp, the camera state, the framing binding and the winner's normalised x and
y. `scripts/viewer-invariants.mjs` already runs past the crossing and already waits for at least 255
of those frames before it stops. The data was collected all along and simply never printed per frame.

What this block added is **reporting, behind an opt-in flag**:

```
node scripts/viewer-invariants.mjs --gate --after-crossing
```

★ **The flag grades nothing.** The run above exits 1 with the same `17 crossing violation(s)` as a
run without it. The gate's own output is untouched.

Both races the gate covers, on the shipped arm: `city-circuit` quick-test seed 9 (all 17 violations)
and `space-sprint` quick-test seed 9 (the control, 0). 184 s.

## The four answers

### `city-circuit` seed 9 — crossing at frame 6525, `PHOTO_FINISH` / binding `level`, winner at 0.369, 0.275 (inside the box)

255 after-frames retained, spanning 0–4233 ms.

| | frame | ms after the crossing | what |
| --- | --- | --- | --- |
| **1. winner FIRST leaves the box** | **6584** | **983** | on the **y** axis — he sinks to 0.149, under the 0.15 floor. x never leaves it |
| **2. ownership CHANGES** | **6600** | **1250** | binding `level` → `state` |
| | **6652** | **2117** | state `PHOTO_FINISH` → `OVERVIEW` |

**3. They do not coincide.** The winner is out of the box **267 ms (17 frames) before** the first
ownership change of any kind, and **1134 ms (68 frames) before** the shot itself hands over.

### `space-sprint` seed 9 — crossing at frame 5614, `PHOTO_FINISH` / binding `state`, winner at 0.456, 0.782 (inside the box)

256 after-frames retained, spanning 0–4250 ms.

| | frame | ms after the crossing | what |
| --- | --- | --- | --- |
| **ownership CHANGES** | **5734** | **2000** | state `PHOTO_FINISH` → `OVERVIEW`. The binding never changes; it is `state` from the crossing on |
| **winner FIRST leaves the box** | **5799** | **3084** | on the **y** axis — he rises to 0.854, over the 0.85 ceiling |

**4. BOTH differ, and the ORDER is what matters.** The winner stays in the box far longer — 3084 ms
against 983 ms — and the shot hands over marginally sooner, 2000 ms against 2117 ms. The decisive
difference is that here **the shot hands over BEFORE the winner leaves the box**, by 1084 ms, where
on `city-circuit` the winner leaves the box before anything hands over. That, and not a difference
in the guard, is why one race scores 17 and the other 0.

## Two things the numbers say that the question did not ask

★★ **The scope's "for as long as the shot that owned the crossing is still running" clause never
binds in either race.** The graded window is closed by its duration cap in both — the state handover
comes at 2117 ms and 2000 ms, both well past it. In practice the current scope is a fixed duration,
not the shot's own life.

★★ **A natural boundary DOES exist, and following it would make the red WORSE, not better.** The
product's own handover is `PHOTO_FINISH` → `OVERVIEW`, and it is present in both races. But it lands
*later* than the window the guard uses today, so grading to it takes `city-circuit` from **17
violations to 68**, with `space-sprint` still at **0**.

## The one sentence, and then nothing

A natural boundary exists — the handover to `OVERVIEW` — but it is later than the scope in force
today, so adopting it would multiply the red rather than clear it; what the numbers do not contain
is any reason to prefer one boundary over another, and that choice is the owner's.
