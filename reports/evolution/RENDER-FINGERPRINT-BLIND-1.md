# RENDER-FINGERPRINT-BLIND-1 — the fingerprint still carries the literal that FRAME-INPUTS-1 was built to delete

**Date:** 2026-08-26 · **Branch:** `diag/render-fingerprint-blind-1` (off `master`) · **Piece 7 of
NIGHT-2026-08-25** · **Verdict:** DIAGNOSE AND DESIGN ONLY. Nothing repaired, no hash re-minted.

---

## 1. THE DEFECT, IN ONE COMPARISON

**The one place that owns the frame's `camera` object** — `frameCameraInputs.js:38`, six members:

```js
export const FRAME_CAMERA_FIELDS = [
  'state', 'anchorRacerIndex', 'comebackLockedRacerIndex', 'hudState', 'runInArrived',
];
// plus out.detectBattleGroup, bound as a closure (:66)
```

**What `render-fingerprint.mjs:445` builds instead** — a hand-written literal, three members:

```js
camera: {
  hudState: cd.hudState,
  comebackLockedRacerIndex: cd.comebackLockedRacerIndex,
  detectBattleGroup: (racers) => cd.detectBattleGroup(racers),
},
```

**Missing: `state`, `anchorRacerIndex`, `runInArrived`** — all three `undefined` inside the
instrument.

**The irony is exact, and it is written in the header of the file being ignored.** FRAME-INPUTS-1
exists precisely because `RaceScreen/index.jsx` *"used to assemble that object as a LITERAL at the
call site, listing three fields by hand"*, which made `anchorRacerIndex` undefined on every frame of
every live race and `camera.state` undefined so the photo-finish exemption *"had never fired at all —
a second defect nobody had seen, because it fails by doing nothing."*

**The game was repaired. The instrument that is supposed to catch exactly this class of defect kept
the bug, in the same shape, with the same three fields.**

---

## 2. WHAT IS THEREFORE INVISIBLE — two live blindnesses, not three

I traced each missing field into `renderRaceFrame.js` rather than assuming all three matter.

### `anchorRacerIndex` → **LABEL-FOCUS-1 has never been exercised** (`renderRaceFrame.js:212`)

```js
let focusRacerIndex = camera?.anchorRacerIndex ?? null;
if (focusRacerIndex == null && st.racers?.length) { /* fall back to the leader */ }
```

Undefined inside the fingerprint, so **the leader fallback fires on every fingerprint frame**. The
whole subject mechanism — *"who the camera is on. The director's own answer first; the leader only
where it genuinely has none"* — is never taken. **Every frame the render fingerprint has ever hashed
labelled the leader, whoever the camera was actually following.**

### `runInArrived` → **RUNIN-NAMES-1 has never been exercised** (`:220`, `:311`)

```js
const namesFromArrival = !!camera?.runInArrived;   // :220
…
exemptAll: namesFromArrival,                        // :311
```

Undefined → `false` on every frame. So the fingerprint always renders the **pre-arrival** label form
— numbers, never names — and `exemptAll` is permanently off. **RUNIN-NAMES-1's entire visible change
is a state the instrument cannot enter.**

**So the brief's reading is right and the mechanism is now named: it came back unmoved for
RUNIN-NAMES-1 because the input that feature reads is `undefined` inside it. That was not evidence of
no change. It was not evidence of anything.**

### `state` → **on the list, but inert TODAY** — and this corrects the expected reading

`camera.state` is on `FRAME_CAMERA_FIELDS` and **the renderer no longer reads it.** The photo-finish
exemption that used to key on it was deliberately re-pointed: `renderRaceFrame.js:284-311` records
that `exemptAll: camera?.state === 'PHOTO_FINISH'` **left**, and is now `exemptAll: namesFromArrival`,
*"so it cannot drift the way `state === 'PHOTO_FINISH'` did"*.

**So the fingerprint's third missing field costs nothing at present.** It is still a defect in
waiting: `state` is a declared member of the contract, and the day anything reads it again the
instrument is blind to that too, silently. **Reported as two live blindnesses and one latent, rather
than three, because the difference is checkable and a report that inflated it would be wrong.**

---

## 3. WHY NO GUARD CAUGHT IT

There **is** a guard, and it is a good one — `frameCameraInputs.test.js:66`:

> *greps the renderer's source for every `camera.<field>` it reads, and fails if any of them is
> missing from the assembly.*

**It checks one direction only: the LIST against the RENDERER.** It does not check that *callers* of
`renderRaceFrame` build their camera object through `frameCameraInputs`. **`render-fingerprint.mjs` is
such a caller, and it is invisible to that test.**

The list's own header names the failure it was built to prevent — *"'Remember to add it in two places'
is what failed"* — and there are still two places. The second one is a `.mjs` under `scripts/`, which
is why it fell outside a client test's reach.

**This is the same shape as PIECE 6's finding, one layer down:** a guard that answers its own question
correctly and completely, being read as though it answered a wider one.

---

## 4. WHAT A REPAIR WOULD COST

**The repair itself is two lines.** `render-fingerprint.mjs` already imports from the same directory
(`:140` pulls `renderRaceFrame.js`, `:144` `renderState.js`), so importing `frameCameraInputs` costs
nothing structurally, and the literal becomes `camera: frameCameraInputs(cd)`.

**The cost is the hash.** Supplying `anchorRacerIndex` and `runInArrived` changes what is drawn on
every frame where the camera's subject is not the leader, and on every frame after the run-in's
arrival. **The render fingerprint would move — that is the point of doing it — so it is a MINT and it
needs the owner's word.** Nothing here re-mints anything.

**Two things make the mint harder than an ordinary one, and both should be said before he is asked:**

1. **The new value cannot be compared to the old.** Every recorded render-fingerprint value was taken
   with these fields absent. After the repair the number means something different; the history does
   not become wrong, it becomes *incommensurable*. That is a one-time break in a series the project
   uses to detect drift.
2. **The repair will reveal whatever it was hiding, all at once.** LABEL-FOCUS-1 and RUNIN-NAMES-1
   both shipped without this instrument's evidence. When it starts seeing them, any defect either of
   them carries surfaces in the same commit as the mint — **so the mint and the first honest reading
   should not be the same act**, or a real regression will be indistinguishable from the expected
   move.

---

## 5. WHAT IT WOULD HAVE CAUGHT HAD IT BEEN RIGHT

- **RUNIN-NAMES-1** — the change from numbers to names at the run-in's arrival. Its whole visible
  effect lives behind `runInArrived`. The fingerprint reported unmoved and that report was empty.
- **LABEL-FOCUS-1** — labelling the camera's actual subject rather than the leader. Never exercised,
  so never confirmed by the instrument that exists to confirm drawing changes.
- **The original FRAME-INPUTS-1 defect itself.** The owner reported *"the comebacker shows no name"*
  by eye. **A render fingerprint that built its camera object the way the game does would have moved
  when that defect was introduced** — the leader fallback firing where it should not is exactly a
  change in drawn output. **The instrument was blind to the bug in the same way, at the same time, for
  the same reason.**

---

## 6. PROPOSALS — none ordered, nothing built

### A — MINE: `camera: frameCameraInputs(cd)`, and mint it as its own deliberate step

The one-line repair, plus his word on the mint, **plus one thing §4 argues for: land the repair and
the new value in a commit that does nothing else**, so the next reading of the fingerprint is against
a baseline nobody is simultaneously changing.

**Cost:** a mint, an incommensurable break in the recorded series, and the risk in §4.2.
**What it buys:** the render fingerprint starts covering the two features it currently cannot see.

### B — MINE: make the existing guard check the OTHER direction too

`frameCameraInputs.test.js` proves the list covers the renderer. **Add the converse: every caller that
builds a `camera` object for `renderRaceFrame` must build it through `frameCameraInputs`** — greppable,
because there are few callers and the literal `camera: {` at a call site is the signature.

**Cost:** a grep-based test is a lexical guard and inherits every weakness `check-config-claims.mjs`
lists about its own kind. It would not catch a caller that spreads an object built elsewhere.
**What it buys:** it closes the specific hole that let this survive — and it is the only proposal here
that prevents recurrence rather than fixing one instance. **It is also independent of the mint**, so it
can land while the owner is still deciding about A.

### C — MINE: state the instrument's blindness in its own declaration

`fingerprint-default.mjs --declare` already carries a `blind` array — the world fingerprint's says
*"anything the CAMERA decides and anything DRAWN — those are the camera and render fingerprints"*.
**The render fingerprint should declare that it does not exercise `anchorRacerIndex` or `runInArrived`
until it does.**

**Cost: one line, no behaviour, no mint.** **What it buys:** the next person who reads "render
fingerprint unmoved" for a labelling change is told, by the instrument, that this proves nothing.
**Cheapest item in the report and the only one safe to do tonight** — which is why it is worth
separating from A.

### D — do NOT hand the renderer the director

Named to be refused, because it is the obvious shortcut and `frameCameraInputs.js:20` already refused
it with a reason worth preserving: *"the renderer's inputs are the thing tests and harnesses construct,
and a contract of 'anything a CameraDirector has' cannot be constructed without one."* **The
fingerprint is exactly such a harness.** Passing the director would fix this instance and destroy the
property that makes the contract testable.

---

## 7. SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

Every claim is read at source with a line number: the canonical list (`frameCameraInputs.js:38`), the
instrument's literal (`render-fingerprint.mjs:445-449`), the three consumers
(`renderRaceFrame.js:212`, `:220`, `:311`), the guard (`frameCameraInputs.test.js:66`), and the
re-pointing of `exemptAll` (`renderRaceFrame.js:284-311`).

**One expectation of mine was wrong and is corrected in place.** I expected `camera.state` to be a
third live blindness, because `frameCameraInputs.js`'s header describes the photo-finish exemption
reading it. **The renderer no longer does** — that reading was deliberately retired. §2 reports two
live blindnesses and one latent rather than three. **Checked because the header describing the defect
is older than the code that fixed half of it.**

**Nothing was changed.** No instrument, no guard, no fingerprint value. This branch adds one report.

**Not run, and why:** no fingerprints — **deliberately, and this is the R15 judgement that matters
here.** Running `render-fingerprint` would produce the same value it always produces, because nothing
was changed; running it *repaired* would produce the new value, which is a mint and is his to
authorise. Neither would have told me anything §2 does not establish at source. No browser gate, no
client suite, no server suite: docs-only.

**One thing I did not do.** I did not build the repaired instrument in a scratch copy to measure how
far the hash moves. That number would be useful to him when deciding the mint — but producing it means
running a modified fingerprint, and a fingerprint that changes in the same act as the thing it
measures is the circularity `raceDriver.mjs`'s own header warns about. **It is named in proposal A as
the first thing the repair should report, not as something already known.**

---

## 8. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| DIAGNOSE AND DESIGN, DO NOT REPAIR | Yes — nothing changed, nothing minted |
| what else the literal leaves undefined | §1 — **`state`, `anchorRacerIndex`, `runInArrived`**, against a canonical list of six |
| which shipped behaviour is therefore invisible | §2 — **LABEL-FOCUS-1 and RUNIN-NAMES-1**, traced to the exact lines that read them; **`state` is inert today**, corrected in §7 |
| what a repair would cost — it would move the hash, so it is a mint and needs his word | §4 — plus two consequences that make this mint harder than an ordinary one |
| what it would have caught had it been right | §5 — both features, **and the original FRAME-INPUTS-1 defect itself** |
| PROPOSALS with at least two of your own | §6 — three are mine (A, B, C); D is named to be refused with the reason already in the tree |

**One thing the brief did not ask for and this report adds:** §3. There is a guard for exactly this
contract and it checks only one direction — list against renderer, never caller against list. **That
is why the instrument kept a bug the game had already had fixed**, and it is the only part of this
that can be closed without the owner's word.
