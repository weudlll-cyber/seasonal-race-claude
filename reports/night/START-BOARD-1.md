# START-BOARD-1 — the runners' board

**Branch** `feat/start-board-1` off `feat/ceremony-hold-target-1` · 2026-08-08 ·
**built, measured, NOT minted, NOT merged**

---

## 1. Conformity, element by element — before any numbers

| the spec asked | done | where |
| --- | --- | --- |
| STEP 0: merge master into the chain, merge commit | yes | `151cecbd` — the nanoid lockfile bump, three lines |
| Branch `feat/start-board-1` off `feat/ceremony-hold-target-1` | yes | §9 |
| (a) During the push in — every racer's NAME with its NUMBER and its own SPRITE | yes | §2 |
| (b) Alphabetical, a BLOCK IN COLUMNS, all at once, holds 100 | yes | §3 — measured at 8/20/40/100/140 |
| (c) It ends before the gun; the countdown runs as it does now | yes | §2, and §5 asserts it as a frame |
| The sprite is drawn through the SHIPPED drawing function, not a copy | yes | §4 |
| Say BEFORE building if the still pose is more than a small change | **it was no change at all** | §4 |
| Countdown digits derived from `countdownDurationMs`; 4000 → 4-3-2-1, GO! at zero | yes | §6 |
| Do not touch: the numbers, the label offset, the venue shot, the push, the hold, the release | held | §8 — nothing in the camera, the label layout or `raceNumbers.js` was edited |
| RENDER expected to move | **moved, and attributed in two parts** | §7 |
| CAMERA must NOT move | **unchanged** | §7 |
| WORLD must not move | **unchanged** | §7 |
| `engine-reach --check` on the actual diff, run what it says is owed | yes | §7 — it named `defaults.js`, so the world fingerprint was run |
| DO NOT mint, DO NOT merge | held | §7 |
| Tests: each racer once · 40 and 100 without overlap or clipping · digits at two settings | yes | §5 |
| Source hygiene | yes | §8 |
| 5173 on this branch, report the pill | yes | §9 |
| Two proposals of my own | yes | §11 (the planner's two are answered in §10) |

---

## 2. What was built

Every racer, exactly once, during the **push** — the beat where the camera travels from the venue
shot down to the formation. Alphabetical by name, a block of columns read **down and then across**,
all of it on screen at once so it can be scanned rather than read. Each entry is the racer's
portrait, its start number and its name.

It fades in as the camera leaves the venue shot and is **gone before the push ends**, so the settled
beat holds the formation clean and the gun fires on a picture with nothing over it.

**The beat comes from `ceremonyAt`** — the same pure function the camera asks — rather than a second
schedule computed in the renderer. Two homes for "how long is the push" is the defect the ceremony
work spent a night removing; the board asks the rhythm module the same question the camera does.

---

## 3. The layout, measured

| field | columns × rows | block, px | scale |
| --- | --- | --- | --- |
| 8 | 2 × 6 | 472 × 156 | 1.000 |
| 20 | 4 × 6 | 944 × 156 | 1.000 |
| **40** (his open field) | **5 × 8** | 1180 × 208 | 1.000 |
| **100** (the ask) | **5 × 20** | 1180 × 520 | 1.000 |
| 140 | 7 × 20 | 1200 × 378 | 0.726 |

**Rows are chosen first and columns follow.** It is the row count that decides whether a block reads
as a list, and a rule that picks columns first turns a small field into a strip across the screen —
eight racers in five columns of two. A floor of six rows stops that; a cap of twenty stops the
hundred-racer block from running off the bottom.

**Past 100 it shrinks rather than clipping.** "No overlap, no clipping" then holds for any field
size rather than for the ones somebody tried. The shrink does not engage at 40 or at 100 — both are
full size — which is the property the test pins, because a fit-to-canvas rule that quietly shrinks
the type at the sizes that matter would be trading one defect for a worse one.

The layout is a **pure function**, separate from the drawing. "Do two entries overlap at n = 100" is
a question about arithmetic, and a test that rasterised a canvas to answer it would be measuring the
rasteriser.

---

## 4. The sprite pose — what I chose, and why it cost nothing

The spec asked me to say before building whether a still portrait needs more than a small change.
**It needed no change to any drawing code, and the reason is exact rather than lucky.**

`SpriteRacerType._getFrameIndex(frame, speed)` is

```js
const period = clamp(basePeriodMs / max(speed, 0.1), 200, 1500);
return Math.floor(((frame % period) / period) * frameCount) % frameCount;
```

At `frame = 0` the expression is `floor(0 × frameCount) = 0` **for any period and therefore for any
speed and any racer type**. So passing `0` as the frame argument is a neutral, deterministic portrait
pose, available today, with no racer type having to learn what "standing still" means.

So the board calls the shipped `racerType.drawRacer(ctx, x, y, 0, racer, false, 0, scale, false)`:
angle 0, `isLeader = false` and `isComeback = false` so neither ring is drawn — **nobody is leading
before the gun** — and the REAL racer object, so the coat and pattern it draws are the ones derived
from the player's name and used in every race. That pairing is the whole point of the board.

One consequence I did not choose and should name: the render fingerprint cannot see the coat. `Image`
does not exist in Node, so every portrait in the harness takes `drawRacer`'s procedural fallback. The
instrument covers the board's geometry, text and layer order; the coats are the owner's eye. The
harness now says so in its own output.

---

## 5. Tests

**Added: 13** (`startBoardRendering.test.js`, new). **Rewritten: 5** (`overlayRendering.test.js`,
was 5 tests). **Deleted: 5** — the old countdown tests.

**Why the old five were deleted rather than adapted.** They pinned `drawCountdownOverlay(ctx, 0) === 3`
against elapsed time with **no duration argument at all** — which is precisely the defect: the
overlay owned a count while the phase owned a length and nothing compared them. Asserting those
numbers harder would have made the bug permanent. What replaces them asserts the RELATION, at more
than one setting, because a single setting cannot distinguish "derived" from "hard-coded to the
number that setting happens to produce".

| test | what breaks if deleted | what goes unnoticed if it is missing |
| --- | --- | --- |
| every racer appears exactly once, at 40 and 100 | the board's only real promise | a viewer cannot tell "not on the board" from "I missed it", so a dropped racer is invisible |
| the layout has a distinct cell per racer | the test above would pass with 100 names in one cell | every racer present and unreadable |
| alphabetical, case-insensitive, deterministic | the order that makes a name findable | an order that differs between machines — `localeCompare` reads host ICU data, and this ordering is hashed by the render fingerprint |
| no two entries overlap, at 40 and 100 | the second promise | overlapping entries are worse than a missing one: they look like data |
| every entry inside the canvas, at 1/40/100/140 | clipping | it only appears at the largest field, the one nobody eye-tests |
| a small field gets a small block | the case he explicitly asked to see | eight racers laid out like a spreadsheet |
| no shrink at 40 or 100 | a fit rule that trades clipping for illegibility | he would rather lengthen a beat than shrink the type — a silent shrink takes that decision from him |
| invisible outside the push; gone by its end | "(c) it ends before the gun" | a board over the start, or a one-frame flicker |
| alpha clamps | a nonsense alpha at a beat boundary | a frame that paints nothing, or paints over everything |
| draws nothing when invisible | the cheap exit | a full-screen fill every one of ~2400 countdown frames |
| `drawRacer` called once per racer, frame 0, no rings | the requirement that the portrait be the real thing | a portrait right today and wrong after the next sprite change |
| survives a racer type that cannot draw yet | the frame | a blank screen instead of a list |
| digits: 4000 → 4-3-2-1, GO! at zero | the whole repair | dead air at the one moment the race is supposed to start |
| digits: a DIFFERENT setting, 6000 and 2000 | the claim that they are derived | the owner changing the setting and the digits ignoring him |
| digits: never negative or non-finite | a `NaN` painted on screen | a caller that forgets the argument fails silently |
| digits: a countdown longer than the palette | an index past the end of `CD_COLORS` | a crash the moment somebody sets 10 s |

Full client suite: **186 files, 3738 tests, all passing.** `npm run verify`: **PASS 7, FAIL 0.**

---

## 6. The countdown digits

The overlay counted from a hard-coded `3` while the phase lasted `countdownDurationMs` — so at the
shipped 4000 ms it read 3-2-1-GO! and **"GO!" stood for an extra second before anything moved.** Two
statements of one length, and the one nobody could see was the right one.

It owns no count now. `countdownDigit(elapsed, durationMs)` is seconds remaining, rounded **up**:
4000 ms gives 4-3-2-1 with GO! exactly at zero, 6000 gives 6-…-1, 2000 gives 2-1. `ceil` rather than
`floor` is what makes the final second read "1" — with `floor` it would already say GO!.

The colour palette has four entries and is now indexed by `min(n, 3)`: the last three seconds keep
the shipped colours exactly, and anything above holds the calmest one. Without the clamp a five-second
countdown would have indexed past the end.

The `STILL OPEN, deliberately` note in `defaults.js` that recorded this as an open defect is
replaced by a note saying it is closed and where the derivation lives.

---

## 7. Fingerprints

`node scripts/engine-reach.mjs --check` on the five changed paths:

```
ENGINE REACH: 1 of 5 path(s) can change the race:
  client/src/modules/storage/defaults.js
```

So the world fingerprint was **owed and run** — the `defaults.js` edit is a comment, and the number
proves it rather than the sentence.

| role | before | after | expected? |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **must not move — it did not** |
| camera | `220d84db279db268` | `220d84db279db268` | **must not move — it did not.** The board is drawn over the existing framing and changes no camera decision |
| render | `f2e170d17ccf84e9` | **`ffe568e27991c297`** | moves — and the move is split below |

**The render move is attributed in two parts, deliberately, because otherwise it could not be read.**

| step | hash | what moved it |
| --- | --- | --- |
| master | `f2e170d17ccf84e9` | — |
| harness window extended to the countdown, **client tree untouched** | `bc56f1117db2e5d9` | **instrument only** — the new frames |
| board + digits on top | `ffe568e27991c297` | **content** |

The middle row was measured by stashing the two client files and re-running, so the first move is
attributable entirely to the new sample points and none of it to the new overlay.

**The instrument had to be extended, and that was a decision made alone (§9).** The harness set
`st.phase = RACING` and rendered its first frame AT the gun, so it had **never drawn a countdown
frame in its life**. A full-screen overlay that draws for three seconds of every race could have
shipped without moving this hash by one bit — the same blindness FINISH-WINDOW-1 repaired at the
other end of the race. Five fixed elapsed times now cover the venue shot, two points inside the push,
the end of the push and the settled beat; the summary prints the window (`5+16 frames` per track) and
states its new limit.

**NOT MINTED, NOT MERGED.** It is visible; his eye decides (L191).

---

## 8. Hygiene

**Lines.** `overlayRendering.js` 157 → 184 · `renderRaceFrame.js` 371 → 398 ·
`overlayRendering.test.js` 59 → 101 · `render-fingerprint.mjs` 583 → 633. New:
`startBoardRendering.js` 253, `startBoardRendering.test.js` 272. `defaults.js` −7/+7, comment only.

**Removed, because this change orphaned it:**

- **The two-argument `drawCountdownOverlay(ctx, elapsed)` signature** and the hard-coded `3` inside
  it. One call site, updated.
- **The `STILL OPEN, deliberately` paragraph in `defaults.js`** — it recorded exactly this defect as
  outstanding and is false the moment the digits are derived. Replaced with what closed it.
- **Five countdown tests** that asserted the removed count (§5).
- **The inline frame-argument object in `render-fingerprint.mjs`** — orphaned by there being two
  render passes now; it became one `frameArgs(cam)` used by both.

**Moved out:** nothing. No source moved into a tool or out of one.

**Added no setting, and that is a decision.** The board has no slider, no config key, no label and no
tooltip. Its timing comes from the ceremony beats the owner already has, and its layout from the
field size. A new key would be a fourth thing to tune for a board that is on screen for two seconds.

**Noticed and deliberately left:**

- **`CameraDirector._ceremonyBeat` is still written every countdown frame and read by nothing.** I
  considered reading it here instead of calling `ceremonyAt`, and did not: the renderer does not
  receive the director (it gets a three-field projection of it), and widening that projection to
  reach a field is a bigger change than asking a pure function. It was dead before this block and is
  dead after it, so it is not mine to take — but it is now the *second* block to walk past it.
- **The board's own numbers are literals in its module** (cell 236 × 26, five columns, twenty rows).
  They are layout, not taste, and they have one home; if the owner wants to tune them they should
  become settings, and that is a different block.
- **`clampCamZoom(Infinity)` and the duplicated `postStartHoldMs`** — carried forward from the
  previous block, unchanged, still true.

---

## 9. Decisions made alone

**1. The board lives in the PUSH only.** The spec says "during the push in, while the camera
travels", and I read that literally rather than extending it into the venue shot to buy reading
time. §10.1 reports what that costs, with numbers, instead of quietly taking the decision.

**2. I extended the render fingerprint's window to before the gun.** Without it "RENDER expected to
move" is unsatisfiable — the instrument could not see a countdown overlay at all. Reporting "RENDER
did not move because the instrument is blind" would have been honest and useless. It is a separate
commit, measured separately, so the two moves can be read apart.

**3. Alphabetical sort by lowercased name, NOT `localeCompare`.** Its result depends on host ICU
data, and this ordering is drawn into a frame the render fingerprint hashes — an order that differs
between two machines would make that instrument report a difference that is not a change. Ties break
on racer index, so the sort is total.

**4. The name is CLIPPED to its cell.** A long name that overflows turns one entry into two
unreadable ones. Clipping loses the tail of one name; overflow loses two whole rows.

**5. A scrim behind the board.** The camera is travelling underneath it; without a dimmed backdrop
the board is legible on the venue shot and illegible by the end of the push.

**6. A heading, `STARTERS · N`.** Not asked for. It costs one line, it tells the viewer what they
are looking at, and it puts the field size where the eye already is. Easy to remove.

**7. Rows before columns, with a floor of six.** §3.

---

## 10. The planner's two proposals — both TAKEN, and answered

**10.1 — How long is the board actually readable, and can 100 be scanned in it? MEASURED, and the
answer is no.**

With the shipped rhythm (venue 1400, push 2000, settled 600 inside a 4000 ms countdown):

| | |
| --- | --- |
| board at FULL alpha | **1460 ms** |
| board at alpha ≥ 0.5 | 1730 ms |
| per entry at n = 40 | 37 ms |
| per entry at n = 100 | **15 ms** |

Finding a KNOWN name in a sorted list is a jump, not a read — a viewer goes to the letter and scans a
handful of entries — so this is not 100 × 15 ms. But it is still a jump plus a scan plus carrying a
two-digit number away, and 1.46 s is not enough for it at a hundred entries. At 40 it is tight but
plausible; at 100 it is not.

**What would have to give, in the owner's preferred direction — lengthen a beat, do not shrink the
type.** `ceremonyPushMs` is his slider and it is the only thing that needs to move: at **4000 ms** the
board holds full alpha for 2.9 s, at **5000 ms** for 3.65 s. Both fit inside the countdown only if
`countdownDurationMs` grows with them — the three beats are scaled proportionally when they ask for
more than the countdown has, so raising the push alone would silently shorten the venue shot and the
settled beat instead. **The honest change is both numbers together**, and it is two slider moves, not
code. I did not make it: the beats are settled and accepted, and this is exactly the kind of taste
decision the spec says not to take.

**10.2 — Should anything else show the same pairing? Yes, one place, and I did not build it.**

The board is where a viewer learns that a coat belongs to them. **The standings panel is where they
lose it.** It already shows the number beside the name (step one of this design), but not the racer —
so the moment the field spreads and the viewer looks away from the track to the standings, the visual
identity they just learned is not there to reconnect them. A portrait in the standings row would be
the same `drawRacer` call at the same frame 0, at about 18 px.

The second candidate is the results screen, and I would argue **against** it: by then the race has
been run and the number has done its job.

Not built, as instructed.

---

## 11. Two proposals of my own

**11.1 — The board should be the thing that decides how long the push is, not the other way round.**
Today the push is a camera beat with a taste value, and the board borrows it; §10.1 shows the borrow
does not fit at 100 racers. The push's job is to travel from the venue shot to the formation, and
that is a fixed distance regardless of field size — but the board's job scales with the number of
names, and 8 racers and 100 racers plainly do not need the same seconds. **I would make the ceremony
ask for `max(pushMs, boardMs(n))`**, where `boardMs` is a per-entry allowance with a floor, and let
the push simply take longer at a big field. It needs no new taste decision from the owner beyond one
number ("how long per name"), and it removes the only way the board can fail: being right and
unreadable.

**11.2 — `renderRaceFrame` now decides three things about the ceremony and reads five config keys to
do it, and it is not the ceremony's file.** The board's beat, the digits' length and the ceremony
schedule are all resolved inside the render function, from `cameraConfig`, alongside track lights and
minimaps. It works, and the rhythm still has one home in `startCeremony.js` — but the renderer is
becoming a second place where somebody would look for "what happens during the countdown". **I would
give the ceremony a single `ceremonyFrame(elapsed, config)` that returns `{ beat, progress, digit,
boardAlpha }`**, so the renderer asks one question instead of assembling four answers. It is a
refactor with no behaviour change and no fingerprint move, and it is worth doing before a third thing
is added to that beat.

---

## 12. What I did NOT do, and why

- **Did not lengthen the push**, though §10.1 shows 100 racers cannot be scanned in it. The beats are
  settled and accepted; the number is his.
- **Did not build the standings portrait.** §10.2 — asked not to.
- **Did not touch** the numbers, the label offset, the venue shot, the push, the hold or the release.
- **Did not give the board a setting.** §8.
- **Did not remove `_ceremonyBeat`.** Dead before this change, not orphaned by it.
- **Did not mint. Did not merge.**

---

## 13. How to see it

**5173 is on this branch**, with one backend on 4000 and one Vite on 5173. The build pill reads:

```
[ra-build] start-up: serving build <HEAD> · feat/start-board-1
```

The SHA is whatever HEAD was when Vite started; the branch name is the part that matters.

**What to look at:** river-run at your open field size, end to end — the board comes up as the camera
starts down towards the grid, and should be gone before the formation settles. Can you find a name
and carry its number into the race? Then a small field (8–12), to see the block shrink to fit rather
than spread out.

**The two things I would watch for:** whether 1.46 s is enough at your field size (§10.1), and
whether the portraits read at 21 px — they are the shipped sprites at the shipped coats, but smaller
than they have ever been drawn.
