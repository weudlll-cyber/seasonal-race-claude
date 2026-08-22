# ENDGAME-REWRITE-1 — the endgame, written as it should have been written

**2026-08-22 · branch `exp/endgame-rewrite` off master `e94cf26d` · A CLEAN IMPLEMENTATION OF WHAT IS
ALREADY BUILT. No behaviour change, and the proof is that all four fingerprints come out
byte-identical.**

> **The owner's ask, 2026-08-25.** Not a tidy-up of dead levers — a clean implementation of what is
> now built. The endgame reached its behaviour through twenty rounds of attempts, so the code has the
> SHAPE of fix upon fix: five separate stroboscope corrections, a narrowly scoped pivot exception, a
> carried ramp, ceilings that no longer author what they used to. He believes a cleaner solution
> exists now that the target behaviour is known, instead of building further on failed attempts.
>
> **He is right, and the clearest evidence is not any of the things he listed.** It is that
> `_lineCeiling` — the function carrying the endgame's width rule — had NO documentation at all,
> while a 40-line specification of it sat immediately above a DEAD method that never runs. A reader
> looking up how the endgame sizes its shot found a description of an attempt that was measured
> backwards and removed. That is what fix-upon-fix does to a file: not wrong lines, but meaning
> detached from the code it describes.

---

> **This page is reproduced here as the deliverable, as written on 2026-08-22 before any code was
> touched. Its living home is [docs/CAMERA_DIRECTOR.md](../../docs/CAMERA_DIRECTOR.md) §3b** — a
> report is append-only history, so if the endgame ever changes, the doc is what moves and this copy
> stays as the record of what was designed today.

## THE DESIGN PAGE — the endgame as ONE mechanism

*Written before the implementation, deliberately. A stranger should be able to follow it without
reading a line of the director, and it should be possible to say what any frame of the endgame does
by pointing at a sentence here.*

### What the endgame IS

**One authored camera move that runs from shortly before the endgame threshold to the winner's
crossing, and hands back nothing.** It is not a bound the shot settles against; a bound has no
opinion about motion, and the picture stands still whenever the bound does. It is a POSITION FOR
EVERY FRAME.

It is a PHASE, not a per-frame test. It latches on once and stays on. Every flicker between a wide
shot and a tight one this camera has ever produced came from asking a per-frame question about
something that should have been asked once.

### When it opens

Two conditions, and it needs both:

1. **The leader is within one opening-span of the threshold** — the widen must FINISH at the
   threshold, so it must START one span before it. The span is `runInOpenMs`, the key that already
   paces the opening; the rate is observed over that same span, so the estimator introduces no
   second number.
2. **The finish can actually be framed** — the width the line needs is a finite number this frame.

The second condition exists because the first one alone latched the phase on frames where there was
nothing to widen to: the ramp then ran on the clock while the segment was inert, and arrived
part-way up a curve it had never travelled.

The opening is a GLIDE, because two quantities change discontinuously at that instant: the width
opens by whatever the line requires, and the leader's place in frame flips to its mirror. Pan and
zoom must move on ONE ease or the frame empties between them.

### What sets the width at each moment

**The SCHEDULE, and nothing else.** For the whole phase the schedule is the sole author of the zoom.
It is written in log space — a scale change is perceived logarithmically — and eased with a
smoothstep, which is continuous in rate and bounded in acceleration by construction.

It has two segments that meet at the threshold:

| | from | to | parameterised by |
| --- | --- | --- | --- |
| **WIDEN** | the width the camera stands at when the phase latches | the width the finish needs | its own span, carried |
| **CLOSE** | the width delivered at the turn | the active state's own factor | the leader's progress to the line |

The widen ends either at the threshold or the moment the shot is already as wide as the line needs,
whichever comes first — waiting for the clock after the shot has arrived is dead time, and it
compresses the whole close into the last twentieth of the race.

The close is parameterised by progress rather than by wall clock **so that it lands exactly at the
crossing** however the field paces itself.

### Who is framed

The active state chooses its subject; the endgame does not take the state's slot. What the endgame
adds is WHERE that subject sits and WHO counts as present:

- **The leader starts behind frame centre and walks back to his ordinary place**, on the same
  parameter the zoom closes on — one move, not two. Starting at the mirror of his ordinary position
  puts two thirds of the frame ahead of him instead of one third, which is most of the width the
  design saves.
- **Racers the race has decided are eased out of the framing.** The judgement is made from what is
  visible on track — the gap and the closing rate — never from the race plan. It is ONE-WAY and
  needs two consecutive checks, so it cannot flicker; the easing moves every field the framing reads,
  not just the screen position.

### What closes it, and where it arrives

**The crossing closes it.** Both the close's parameter and the leader's walk back reach 1 exactly at
the line, so the endgame arrives rather than being switched off: the shot is at `_leaderZoom` or
`_photoFinishZoom` — whichever is running — with the leader at his ordinary framing position and the
state's own composition underneath. **There is no seam and nothing to hand over.**

### The invariants — what must be true of every frame

1. **ONE AUTHOR.** While the schedule composes, nothing else writes the zoom. Not a state's entry
   snap, not a stand-down, not a glide, not a hold.
2. **MONOTONE AND CONTINUOUS.** The width never reverses inside a segment and never steps between
   frames.
3. **THE RAMP ADVANCES ONLY ON FRAMES IT CAN RUN.** A frame with no computable target holds the
   width it last placed; the parameter does not move. A held width does not move the anchor, which
   is what stops the demand and the delivery feeding each other.
4. **RE-ANCHOR, NEVER STEP.** When the target moves for a reason outside the schedule — the state
   changes, the endpoint factor flips, the segment resumes — the ramp starts again from where the
   camera IS and eases to the new target over what remains. It never jumps to the new curve.
5. **THE LINE STAYS FINDABLE.** The close may not go tighter than the width at which the finish is
   inside the subject's own region. It is a FLOOR under the schedule, not a second author: it cannot
   make the shot jump, because the close starts at or wider than it and it shrinks monotonically,
   and it releases exactly at the crossing.
6. **THE PAN IS EXPRESSED AT THE ZOOM THE FRAME IS DRAWN WITH.** An offset is a product taken from
   the world origin, so a zoom the pan was not resolved at is multiplied by the anchor's distance
   from that origin. The correction re-expresses the resolved answer; it never re-decides it.

### What the endgame deliberately does NOT do

It does not choose the state, pick the subject, or steer. The geometric guarantees still widen the
shot if a subject would be cut — **a guarantee widens, it never steers**. The endgame replaces the
STATE's width authority for the duration of the phase and nothing else's.

---

## 1 · WHAT CHANGED, AND WHAT DID NOT

**Nothing the viewer sees changed.** All four fingerprints are byte-identical, on the committed tree,
after the pre-commit formatting pass:

| Role | Required | Measured |
| --- | --- | --- |
| CAMERA | `0434cd0385eacc7b` | `0434cd0385eacc7b` |
| RENDER | `57b2eb101d806b22` | `57b2eb101d806b22` |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |

### The endgame path, before and after

| | before | after |
| --- | --- | --- |
| `_updateRunInScheduled` | **375** | **120** |
| `_scheduleEngaged` — when it opens | — | 65 |
| `_scheduleFittedProgress` — the ramp's parameter | — | 22 |
| `_scheduleWiden` — the first segment | — | 103 |
| `_scheduleClose` — the second segment | — | 76 |
| `_scheduleComposing` — who owns the zoom | — | 3 |
| `_lineCeiling` | 49 | 54 |
| `_finishBandNearestPoint` | 21 | **0 — removed** |

The file grows by 89 lines and the largest function shrinks by 255. That trade is the point: the
executable body of the schedule is now about forty lines that read as a sequence — guards, progress,
trail, latch, fit, demand, endpoint, segment — and four of the design page's five headings are
findable in the code by name.

### The five changes

**1 · The dead helper goes.** `_finishBandNearestPoint` was ENDGAME-COMPLETE-1's attempt A1: size the
width floor on the band's NEAREST point. It measured backwards — less width, so less band, seatrack
61.7% → 9.0% — and was replaced by the region swap that ships as `bandFloor`. The call was removed;
the method and its 26 lines of documentation describing it as the shipped design were not.
**Proof it was inert: 0 call sites in the whole repository.**

**2 · `_lineCeiling` gets its own documentation back.** Inserting that dead helper had stranded the
endgame width rule's 40-line specification ABOVE it. So the function that carries the rule had no
documentation at all, and the doc a reader met above it described a method that never runs. This is
the clearest single instance of the shape the owner is describing: not a wrong line, but a fix
inserted where it broke the meaning of what was already there.

**3 · One name for "the schedule owns the zoom this frame".** Five call sites, four spellings, each
re-deriving the condition inline. **That is not a tidiness point — it is the mechanism by which the
endgame acquired five authors of the zoom.** There was no name to consult, so every repair invented
its own test and the next repair could not see the others. `_scheduleComposing()` is the base
question; the three sites that need a refinement — is the schedule what actually set the width, does
it have a width to place, is the close running — state that refinement beside their own call.

**4 · The 385-line schedule becomes a sequence**, with the fit and the two segments as named methods.

**5 · "When it opens" becomes a step with a name**, carrying the latch and its two conditions.

---

## 2 · WHAT WAS REMOVED, AND THE PROOF IT WAS INERT

The brief asks that each removal be proved inert by the fingerprints rather than by reading. One
removal qualifies, and the honest answer for the other three is that **the fingerprint is the wrong
instrument for them, and saying so is the finding.**

| Candidate | Verdict | The proof |
| --- | --- | --- |
| `_finishBandNearestPoint` | **REMOVED** | 0 call sites; and all four fingerprints unmoved after removal |
| the hold ceiling | **KEPT — see §3** | unreachable in the shipped product, but the fingerprint cannot see the arm that reaches it |
| `_lfEntryByState` | **KEPT — it is live** | all six states differ from the tracking map; not vestigial, and not in the endgame path |
| the `framePct` argument | **KEPT — simplified** | overridden on every shipped call, but a switch still reaches the other branch |

**`_lfEntryByState` is not vestigial and the reading that said so was about something else.** At the
shipped defaults the entry map differs from the tracking map on EVERY state — OVERVIEW 0.0253 against
0.1423, and the other five 0.0468 against 0.1423, a factor of three. It is read in three places, none
of them in the endgame path, so it is out of this block's scope in any case; but "measured
effectively vestigial" should not be carried forward as "does nothing", because the values plainly
do differ.

**The `framePct` argument is overridden on every shipped call.** Both callers pass
`COMPANY_FRAME_PCT`, and `bandFloor` — which ships on — swaps it back to the subject's own region. So
at the shipped defaults the region is ALWAYS the subject's. It had accumulated four comment blocks
from four blocks of work, each describing a different answer as the live one; a reader meets them in
order and cannot tell which runs. It now says what it does once, with the same value on every branch,
and the argument stays because the switch's other arm still uses it.

---

## 3 · FOUND BUT NOT TOUCHED — three things, and one of them is a rule this project already has

The brief forbids fixing what the rewrite reveals, because then the fingerprint no longer separates
the rewrite from the fix. All three are reported and left alone.

**3.1 · `runInSchedule` has no Dev Screen control, and it gates a whole second mechanism.** The key
ships `true`; `_updateRunIn` hands straight to the scheduled path; and the OFF arm — the hold
ceiling, `_runInShouldRelease`, and the second branch of `_runInSweepU`, 17 mentions in all — is
therefore **unreachable in the shipped product and unreachable from the UI**. Its sibling `runInShot`
does have a control.

That collides with this project's own rule that every behaviour is settable from the UI. It is an
owner decision with two clean answers — give it a control, or retire the arm and the RUNIN-HOLD-1
shape with it — and it is not one this block may take, because retiring it would change behaviour for
a hand-edited config while every fingerprint stayed green. **That is exactly why "prove it inert with
the fingerprints" cannot settle this one: the fingerprints run the default config, so they cannot
fail on code the default config never reaches.** A guard that cannot fail is not evidence (Lesson
209).

**3.2 · `eslint` does not catch an undefined variable in this file.** The extraction of
`_scheduleEngaged` went in missing a `raceState` parameter. `eslint` reported only the two
pre-existing unused-variable warnings; the CAMERA fingerprint caught it, as a `ReferenceError` on the
first frame of the endgame. Whatever the reason for the rule's configuration, the practical fact is
worth writing down: **in this file, a free variable is caught by a 25-second fingerprint run and by
nothing cheaper.**

**3.3 · Two pre-existing unused bindings** — `pairGuarantee` (imported, never used) and a `framing`
local — both outside the endgame path, both left alone.

---

## 4 · HOW THE REWRITE WAS KEPT HONEST — and it caught two real losses

Behaviour-preserving is a claim, and the brief sets byte equality as the standard rather than
algebraic equivalence. Every step was measured; two steps were wrong.

**The first loss: a dropped `return z;`.** The extraction of the close carved it out with a slice
that was off by one, and dropped the segment's final statement. **Its own check could not see it,
because the check was written from the SAME slice expression** — it compared the extracted block
against itself. CAMERA came back `97ac244217504908` and the cause was found rather than argued away.

The check is now independent of the carve-up: it takes the WHOLE original function body, straight
from the untouched source, and requires every one of its 100 statement lines to survive somewhere in
the output, with an explicit list of the two wrapper lines the extraction is allowed to replace.

**The second loss: a missing parameter**, §3.2 above.

**The lesson is one this project already owns and this is a fresh instance of it.** A verification
derived from the thing it verifies proves nothing; both of these were caught by an instrument that
knows nothing about the edit. Two of the five scripted edits also failed their own assertions before
writing anything — a sixth call site the swap list did not know about, and a fourth `return Infinity`
where three were expected — and in both cases the assertion was right and my count was wrong.

---

## 5 · THE THREE-WAY VERIFICATION

**5.1 · The four fingerprints** — §1. Byte-identical, measured on the committed tree.

**5.2 · The browser gate at ship-ceremony step 0a**, on the production bundle in Chromium:

```
── VIOLATIONS PER INVARIANT ──
  1-course          0 frame(s) in   0 race(s)
  2-leader          0 frame(s) in   0 race(s)
  3-line            0 frame(s) in   0 race(s)
  4-widthstep       0 frame(s) in   0 race(s)
  4-panstep         0 frame(s) in   0 race(s)
  5-tootight        0 frame(s) in   0 race(s)
  5-toowide         0 frame(s) in   0 race(s)
  POOLED — worst single frame 0.0339 ln | widest 10.89 corridors | frames with NO band 0 | winner cut on 0 race(s)
  winner OFF CANVAS at the crossing: 0 of 9  |  states owning the crossing: PHOTO_FINISH 9

viewer-invariants: 10 race(s) in 885s — 0 window violation(s) in 0 race(s), 0 crossing violation(s)
Every frame of every race swept satisfied all five invariants. PASS
```

**Every pooled figure is identical to the pre-rewrite gate** — 0.0339 ln, 10.89 corridors, 0 frames
with no band, PHOTO_FINISH owning all nine crossings. On an instrument that does not reproduce itself
digit for digit, that is a stronger agreement than it looks.

**5.3 · The twelve-item sheet — 960 of 960 verdicts identical.** 80 races: ten tracks, both field
sizes, both configs, seeds 1/2/3/9, on the production bundle in Chromium with the browser's own
camera seed. 4473 s.

```
races matched: 80   verdict comparisons: 960
VERDICTS THAT DIFFER: 0
```

The pooled line is identical to the pre-rewrite run, item for item:

```
  FAILING RACES per item —  1:1  2:0  4:2  5:1  6:0  7:12  9:0  10:3  11:0   of 76 races
  POOLED — worst single frame 0.0371 ln | widest 13.57 corridors | frames with NO band 3 | winner cut on 0 race(s)
  viewer-invariants: 80 race(s) — 8 window violation(s) in 2 race(s), 0 crossing violation(s)
```

Item 7's twelve are the conflict this thread proved and did not hide; the eight window violations sit
in the same two races as before, and city-circuit seed 2 reports the same seven line frames at the
same 6969-frame race length.

**Of the sheet's 2968 recorded fields, 51 differ — every one of them a FIGURE, none a verdict.** That
is the browser instrument's own noise, whose floor was established last block by running the SAME
build twice: it does not reproduce itself digit for digit, at about one frame per race. The count is
lower here than the 201 that comparison produced, and the two figures that would betray a real change
— frames with no band, and the invariant event count — are identical at 3 and 8. **The brief says not
to chase those digits, and they were not chased; they were counted, and the count is consistent with
an instrument, not with a behaviour change.**

**5.4 · The five FOUND fixes still exist, and each has a test that proves it.** They were written
BEFORE the rewrite, against the old code, precisely so they could prove the new one — and each was
verified by removing its fix and watching the test go red:

| The fix | The test goes red when the fix is removed |
| --- | --- |
| the stroboscope authors standing down | RED — proved |
| the pan re-expressed at the drawn zoom | RED — proved |
| the carried ramp holding on frames it cannot run | RED — proved |
| `contentionWatch`'s two-check one-way release | RED — proved |
| `bandFloor` | RED — proved |

Four of the five had no test at all before this block and the fifth had one mention. The other four
fixes the brief names were already pinned: the schedule as sole zoom author, the leader's walk back
(RUNIN-BACK-1), the winner's placement (sheet item 9) and the camera seed from the race seed
(`cameraSeed.test.js`).

Two of the new fixtures were wrong in a way that would have passed for the wrong reason, and both are
worth naming because they are the same class of error twice: `_framingSubjects` takes the FOCUS list
rather than the frame, and a frame passed there yields a subject with no point and an `Infinity`
ceiling on both arms; and the contention watch is scoped to the endgame window, so a fixture whose
leader starts before the threshold never runs a single check.


**5.5 · `npm run verify`, green for the right reason** — measured against everything this branch puts
on master:

```
  PASS  client-suite        171.2s  (ran alone)
  PASS  check-runin-frame   107.8s
  PASS  camera-fingerprint  62.5s     CAMERA 0434cd0385eacc7b
  PASS  render-fingerprint  59.2s     RENDER 57b2eb101d806b22
  ... 11 more
  PASS 15   FAIL 0   SKIP 9
```

**An earlier run of this said `FAIL 1` on `client-suite`, and it was my own doing rather than a
finding.** I started the 80-race browser sweep and `verify` at the same time; the sweep's Chromium
was killed mid-run (`Target page, context or browser has been closed`, 10 races lost) and vitest's
workers timed out under the same saturation. Both runs were discarded and re-run **sequentially**,
which is the only reading that separates a failure from a flake — Lesson 211, and I had written the
same warning into this repository's own notes before making the mistake.

---

## 6 · WHAT THIS BLOCK DELIBERATELY DID NOT DO

No behaviour change, no new key, no default change, no new mechanism, nothing outside the endgame
path. Two candidates were live temptations and both were left alone:

- **The `runInSchedule` OFF arm** — §3.1. Retiring it is the obvious tidy-up and it is the owner's
  call, not this block's.
- **`eslint`'s undefined-variable blindness in this file** — §3.2. Changing the lint configuration
  is a repository-wide decision and would not be separable from this rewrite by any fingerprint.

**Nothing is minted.** A mint records a movement of the picture and there was none; `docs/fingerprints.json`
is untouched, and the four values it already carries are the four this branch measures.

---

## 7 · THE SHIP

Per `SHIP-CEREMONY.md`. Steps 1, 1a, 2, 3, 4, 5, 6 and 9 do not apply and are named rather than
skipped: they concern a change to the shipped WORLD or a new default, and this block has neither —
which §1 measures rather than asserts. Step 10, the owner's eye, is not owed either: **the picture he
accepted on 2026-08-24 is the picture this ships, to the byte.**
