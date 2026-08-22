# CEREMONY-SKIP-1 — end the current ceremony beat with a click

**2026-08-22 · branch `feat/ceremony-skip-1` off master `42b46184` · A TEST AID, DEFAULT OFF.
NOT MERGED, NOTHING MINTED — the merge waits for the owner's eye on the running build.**

**SERVED FOR HIS EYE: `index-B5rAtZzc.js`, on 4173, built from this branch.** The bundle was read
rather than trusted: `ceremonySkipOnClick` compiles to `!1` — false, the shipped default — so the
served build is today's behaviour until the switch is turned on in the Dev Screen.

---

## 0 · THE MECHANISM — one number moves

The ceremony has exactly one clock: `st.countdownStart`. Every consumer derives
`elapsed = ts - st.countdownStart` — the DOM beats, the gun, the countdown digits, the board alpha,
the drawn beat. **So a click does not cancel a beat and never needs to know which beat it is in:** it
moves that origin BACKWARDS by the remainder of the current beat, `elapsed` lands on the first
millisecond of the next, and every consumer follows by construction.

No second clock, no skip counter, no per-beat state, and **no `switch` over beats anywhere.**

**The boundary maths lives beside `ceremonyAt`** in `camera/startCeremony.js`, reading the same
schedule fields it reads — a second list of boundaries anywhere else is the defect CEREMONY-TRUTH-1
was written about. `nextBeatStart` walks the same cumulative sums and returns the first strictly
greater than the elapsed.

**Zero-length beats fall out rather than being special-cased.** A zero-length beat makes its boundary
EQUAL to the previous one, so "strictly greater" steps straight over it. A skip therefore cannot land
inside a beat that does not exist — which would put a card on screen for one frame — and no branch
anywhere says so.

**The handler is on `.race-canvas-wrapper`, not on a canvas.** During the brand beat a DOM card
covers the canvas, so a canvas handler would be dead exactly where the first skip is wanted. The card
is a child of that wrapper, so one handler catches both by bubbling.

---

## 1 · THE FIVE TESTS — and what each is holding up

| test | what breaks if deleted | what would go unnoticed |
| --- | --- | --- |
| lands on the first ms of the next beat | a skip could land anywhere and **every consumer would follow it there without complaint**, because they all derive from the one clock | a skip landing mid-beat — the picture would jump to an arbitrary point of the opening and look like a glitch, not a skip |
| the last beat returns `totalMs` | the final click opens a beat instead of firing the gun | the one moment the aid exists to reach — the owner's last click would not start the race |
| never lands inside a zero-length beat | nothing else checks it, and **it cannot be caught by reading the code**: the boundaries simply coincide | a brand card on screen for one frame when no brand is active — a card that must not exist at all |
| agrees with `ceremonyAt` | the two drift apart and a skip lands on a boundary the renderer does not agree is one | exactly CEREMONY-TRUTH-1's defect returning: a second list of beats beside the first |
| a nonsense input still returns a number | a malformed schedule returns NaN, the caller sets `countdownStart` to NaN | **the ceremony stops dead with no error anywhere** — no throw, no log, just a frozen opening |

### The fixture error the suite caught, and why it is worth keeping

`ceremonySchedule` is **POSITIONAL** — `(venueMs, pushMs, settledMs, boardMs, countdownMs, brandMs)`
— and my first three fixtures passed it a single object. **JavaScript accepted it silently:** the
object became `venueMs`, every other length defaulted to 0, and the schedule was empty. The
"agrees with `ceremonyAt`" test failed with `expected undefined to be 'brand'` — the loop had never
run, because `totalMs` was 0.

**A fixture that builds an empty object passes tests for the wrong reason.** Two of the five tests
would have gone green against that empty schedule: `nextBeatStart(0, empty)` returns 0 and the
zero-length assertions are trivially satisfied when everything is zero. **The only test that caught
it was the one that walks the whole ceremony and asserts what it SAW** — which is why a test that
checks a sequence is worth more than one that checks a value.

---

## 2 · WHAT THE DIFF CONTAINS THAT THE BRIEF'S DESCRIPTION DID NOT

Read before anything else, as instructed. Three things:

1. **It is `onMouseDown`, not `onClick`.** It fires on press rather than release. That is defensible
   for a test aid — the beat ends the instant the button goes down — but it is not what "a click"
   literally says, and it means a press-and-drag off the wrapper still skips. **Recorded, not
   changed.**
2. **A `data-testid="race-canvas-wrapper"` hook** was added to the wrapper. Nothing reads it yet.
3. **All five tests cover the pure function. The click HANDLER has no test at all.** The original
   spec also asked for *a click with the switch off does nothing*, *a click outside COUNTDOWN does
   nothing*, and *prove it with a test that skips the brand beat*. Those three do not exist. **The
   handler's guards are written but unproven** — see §6.

---

## 3 · THE DELIBERATE RE-STAMP

`check-measured-stamps` refuses the commit: `startCeremony.js` is inside the tracking-lag stamp's
`depends=` directory. **It was re-stamped, not re-measured, and not bypassed.**

**The measurement cannot have moved.** The switch ships OFF, so no drawn frame changes without a
click; nothing in any harness clicks; and **a ceremony beat boundary is not an input to that
measurement at all** — it measures how far the camera sits behind its subject during the TRACKING
phase, which begins after the ceremony is over. A measurement whose answer cannot have changed is not
run. The reason is in the commit body and beside the stamp.

Stamped at the parent per the guard's two-step, then corrected to `d46fd443`.

---

## 4 · VERIFICATION — all four fingerprints unchanged

`npm run verify` chose what ran; its routing was the authority.

| role | recorded | measured | |
| --- | --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unchanged** |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unchanged** |
| CAMERA | `0434cd0385eacc7b` | `0434cd0385eacc7b` | **unchanged** |
| RENDER | `57b2eb101d806b22` | `57b2eb101d806b22` | **unchanged** |

`PASS 18 · SKIP 5`, plus `check-runin-frame` and the client suite green. WORLD was selected because
`storage/defaults.js` is in the engine-reach hull as a whole file; CAMERA and RENDER because the
ceremony module is in their reach — exactly as the brief predicted, and confirmed rather than assumed.
**WORLD-OFF is not in verify's set and was run by hand** to complete the four.

**SKIPPED and what determined it:** the browser gate and the race sweep — the drawn ceremony is
unchanged without a click, no instrument clicks, and both fingerprints that cover the picture came
back byte-identical.

### The `engine-reach --check` observation — a tool-trust finding, NOT fixed here

`node scripts/engine-reach.mjs --check` reported **"none of 0 path(s)"** while the change was staged
and uncommitted. The pre-commit hook's own invocation, on the same tree seconds later, reported
**"1 of 6 path(s) can change the race: `client/src/modules/storage/defaults.js`"** — the correct
answer.

**So `--check` did not see a staged-but-uncommitted diff, while the hook's path did.** On a clean tree
afterwards it again says "0 paths", which is correct there. The honest statement is that **`--check`'s
selection cannot be trusted for uncommitted work**, and anyone using it to decide what to measure
would have measured nothing. Recorded, not fixed — that is its own block.

---

## 5 · SOURCE HYGIENE

| file | before | after | what changed |
| --- | --- | --- | --- |
| `camera/startCeremony.js` | 362 | 406 | `nextBeatStart` + its doc |
| `camera/startCeremony.test.js` | 562 | 635 | five tests |
| `storage/defaults.js` | 1316 | 1331 | one key + why |
| `DevScreen/.../CameraAdvancedSection.jsx` | 2066 | 2083 | one control + tooltip |
| `RaceScreen/index.jsx` | 1878 | 1907 | the config read, the handler, the wrapper prop |
| `docs/CAMERA_DIRECTOR.md` | — | +13 | the deliberate re-stamp |

**Removed: nothing. Extracted: nothing.** This change orphans no value, control, key, label or
tooltip — it is purely additive, which is what a default-off test aid should be.

**Noticed but left:**

- `onMouseDown` vs `onClick` (§2.1).
- The unused `data-testid` (§2.2).
- `engine-reach --check`'s blindness to staged work (§4).

---

## 6 · BUILD VERSUS SPEC

| the spec asked | what happened |
| --- | --- |
| one exported boundary function beside `ceremonyAt`, same schedule fields | **done** |
| moves `countdownStart` backwards; no second clock, no counter, no per-beat state, no `switch` | **done** |
| last beat returns `totalMs` so the final click fires the gun | **done**, and tested |
| a skip never lands inside a zero-length beat, tested directly | **done**, and it falls out of the design rather than being branched on |
| handler catches the canvas AND the brand card | **done** — on the wrapper, which is the card's parent |
| **prove it with a test that skips the brand beat** | **NOT DONE** — no DOM-level test exists |
| a click with the switch off does nothing | **NOT TESTED** — the guard is written |
| a click outside COUNTDOWN does nothing | **NOT TESTED** — the guard is written |
| new key, default = today's behaviour, Dev Screen control + tooltip | **done** |
| with the switch off, every drawn frame is what it is today | **confirmed** — all four fingerprints byte-identical |
| client suite yes; no browser gate, no race sweep | **followed** |
| serve a production build, report the badge | **done** — `index-B5rAtZzc.js` on 4173 |

**Three of the spec's own test cases are missing.** They are the three that need a rendered component
rather than a pure function, and they are the difference between "the handler is guarded" and "the
guards are proven". That gap is the honest state of this branch.

---

## 7 · PROPOSALS

**P1 — the three missing tests should be written before this merges, and they need a component
test, not a unit test.** `CameraAdvancedSection.test.jsx` already renders a Dev Screen section, so the
pattern exists in this repo; the same shape against `RaceScreen`'s wrapper would cover all three at
once — switch off, wrong phase, and a brand-beat skip. **Cost: RaceScreen is 1907 lines and mounting
it in jsdom may need more scaffolding than the three assertions are worth, in which case the honest
answer is to extract the handler's decision into a pure function** — `shouldSkip(phase, key, button)`
— and test that instead, leaving only the wiring untested. **I would do the extraction.**

**P2 — `onMouseDown` should probably become `onClick`, and the reason is the owner's own use.** He
will click through the sequence repeatedly; a press-and-drag that starts on the picture and ends off
it currently skips a beat, which reads as a phantom skip. `onClick` fires only on a completed
press-release over the same element. **Cost: one beat's end moves from press to release, roughly one
frame later — invisible, and it removes a class of accidental skip.** Not changed here because the
spec said left click and this is a behaviour choice for him.

**P3 — the aid wants a keyboard binding more than it wants a click.** Clicking means moving a hand to
the mouse and aiming at the picture; a spacebar press does the same job without leaving the keyboard,
and it cannot be confused with an accidental drag. **Cost: a key handler needs a focus target and
must not fire while a Dev Screen input has focus, which is more care than the click needed** — but
for a test aid used repeatedly it is the better ergonomics. Recorded as an idea, not built.
