# LABEL-NAMES-2 — which key produces the names

**2026-08-22 · branch `invest/label-names-2` off master `7e522af9` · MEASUREMENT ONLY — no fix, no
key, no default changed · nothing changes, so no fingerprint can move and none was run · 4173
untouched**

## The three answers

**1. `labelNamesWhenRoom: true` produces the names, alone — it is both necessary and sufficient, and
no other key of his is involved.**

**2. The room test is behaving CORRECTLY.** Of the six names drawn in his crowded frame, exactly one
overlaps anything, and that one is the racer the camera is on — drawn regardless of clearance by
design (LABEL-FOCUS-1). Every non-exempt name has the clearance the rule asks for: **0 of 8**
across both frames.

**3. So this is his setting, not a defect** — and that turns the wide shot's unreadability back onto
the sprites. See the correction below, which changes an earlier conclusion.

---

## A correction first, because two earlier reports rest on the thing it fixes

**SPRITE-SIZE-OVERVIEW-1 and LABELS-AND-FLOOR-1 both state that `labelNamesWhenRoom: true` yields
zero names across 125 frames. That is WRONG. It was a defect in my harness, not a fact about the
game.** With the same config and the same race it yields **670**.

`renderRaceFrame` decides the start-formation roll call from two fields of race state:

```
showAllTags = st.phase !== PHASE.RACING || (ts - st.raceStart) < nameTagAllUntilMs
```

`scripts/lib/raceDriver.mjs` — the shared driver both harnesses use — keeps `raceStart` as a **local
variable and never assigns either field to the state.** Only the live `RaceScreen` does
(`index.jsx:891`). So on that driver `st.phase` is not `RACING` and `st.raceStart` is null, the first
term is true on every frame, and `computeTagLayout` takes its START-FORMATION early return **for the
whole race** — which labels everyone, does no decluttering, and returns `wide` **empty**. Zero names
was the harness reporting the roll call, forever.

**What survives and what does not:**

| earlier claim | status |
| --- | --- |
| every sprite size, gap, overlap and floor number in both reports | **STANDS** — none depends on the label layout |
| label *widths* (number 8.0 px, name 60.3 px) and the 6.1× ratio | **STANDS** — arithmetic on text, not layout output |
| "`labelNamesWhenRoom: true` yields zero names" | **WITHDRAWN** — it yields 670 |
| the *label counts* quoted in those reports | **WITHDRAWN** — they were the roll call's, which does not declutter |
| "labelling dominates, so the floor may not be worth touching" | **REVERSED** — see the last section |

**`scripts/render-fingerprint.mjs` is unaffected**: it runs its own loop and sets `st.raceStart`
(line 522), so the shipped instrument has always exercised the real label path. The gap is in the
shared driver, and it is reported below rather than fixed.

---

## His picture, reproduced

space-sprint, seed 9, 60 racers, 1280×720, his eleven values. `node scripts/label-names-truth.mjs`.

| frame | t | prog | world | drawn | on screen | labels | **NAMES** | numbers | nn-spacing | overlapping names |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wide OVERVIEW mid-race | 20 s | 0.36 | 800 px | 32.4 px | 60 | 59 | **6** | 53 | 29.2 px | **1** — the exempt one |
| wide shot before the run-in | 55 s | 0.95 | 800 px | 32.4 px | 9 | 9 | **2** | 7 | 42.2 px | **0** |

**670 name-labels across 125 sampled frames; 54 of them in OVERVIEW.** His screenshots reproduce.

## Which key — leave-one-out

His config, with **one** key returned to its shipped value at a time:

| reverted key | shipped | names (total) | in OVERVIEW | Δ |
| --- | --- | --- | --- | --- |
| **`labelNamesWhenRoom`** | `false` | **0** | **0** | **−670** |
| `minRacersVisible` | `5` | 664 | 53 | −6 |
| `cameraStateProfiles.OVERVIEW.trackingTC` | `0.25` | 666 | 50 | −4 |
| `highlightHeroes` | `false` | 670 | 54 | 0 |
| `battlePulkThresholdT` | `0.05` | 670 | 54 | 0 |
| `battleCooldownMs` | `8000` | 670 | 54 | 0 |
| `finishPauseMs` | `3500` | 670 | 54 | 0 |
| `winnerCardMs` | `3000` | 670 | 54 | 0 |
| `corridorCapArriveMs` | `1500` | 670 | 54 | 0 |
| `outcomePhaseThreshold` | `0.75` | 805 | 80 | +135 |
| `battleWeight` | `0.8` | 818 | 78 | +148 |

**One key takes it to zero. No pair is needed.** The two large positives are the opposite effect and
worth naming: reverting `battleWeight` to 0.8 or `outcomePhaseThreshold` to 0.75 gives the camera
*more* tight shots, and a tight shot has room for names — so **his settings are already suppressing
names relative to the shipped camera**, not producing them.

### `minRacersVisible: 8` — measured, and it is not the cause

At the mid-race frame the two arms are **identical**: 800 world px, 60 racers on screen, nn-spacing
29.2 px, drawn 32.4 px, 6 names — at 8 and at 5 alike. The guarantee is simply not binding there; the
shot is already wide enough to hold eight. Over the whole race it is worth **−6 names of 670 (0.9%)**,
and in the direction that a wider shot gives slightly *more* names, not fewer.

### `highlightHeroes: true` — no, it does not label heroes

It draws a coloured ring around choreographed heroes and touches no label at all
(`racerRendering.js:190`: a `ctx.arc` stroke, green or red). Leave-one-out agrees: Δ 0.

---

## Is the room test right? — the numbers that decide it

The audit reconstructs each drawn label's box **from the drawn geometry** — where the renderer puts
it, at the width it draws — and tests it against every other drawn label box and every drawn racer
body. Asking the layout would have answered nothing; the question is whether its decision agrees
with the picture.

| frame | names drawn | overlapping | of which exempt | **non-exempt overlapping** |
| --- | --- | --- | --- | --- |
| wide OVERVIEW mid-race | 6 | 1 | 1 | **0** |
| before the run-in | 2 | 0 | 0 | **0** |

**Every name the room test admitted genuinely has the room.** The single overlap is the racer the
camera is on, which `nameTagLayout.js:440` draws regardless of clearance — the documented
LABEL-FOCUS-1 exemption, working as specified.

**And the clearance is computed on what is drawn**, checked rather than assumed: the layout measures
with `ctx.font = bold ${tagFontPx}px sans-serif` (`renderRaceFrame.js:219`) and `drawNameTag` draws
with the same string at the same font and the same `labelBoxWidth` — one measurement, one box, no
second home. That was the obvious way for this to be a defect and it is not.

**So: his setting, not a defect.**

---

## What this changes about the wide shot — the conclusion that reverses

LABELS-AND-FLOOR-1 concluded that labelling dominates by 6.1× and therefore "the floor may not be
worth touching at all". **That reasoning was about names that would overlap if drawn — and the room
test refuses exactly those.** In his actual frame only 6 of 59 labels are names, they fit, and the
other 53 are 8.0 px numbers with 29.2 px of room.

**What is left unreadable in his wide shot is the SPRITES.** Drawn at 32.4 px into 29.2 px of
nearest-neighbour spacing, they overlap by **3.2 px** — and that is `minDrawnFrameFrac` alone, which
LABELS-AND-FLOOR-1 measured as binding on 79 of 125 frames at 60 racers and calibrated at twenty.

**The floor is the live problem, and the labels are not.** That is the opposite of the earlier
report's closing line, and it follows from the room test working rather than from any new measurement
of the floor.

---

## What the owner must decide

**1. Keep `labelNamesWhenRoom: true`, or turn it off?** It is his setting and it is working as
designed. Turning it off costs him: **the 6 names in a crowded frame and the 2 in a thin one become
start numbers** — the ~5 of 59 labels that identify a racer by name rather than by a number he has to
look up. It gains nothing measurable, because those names are not what makes the shot crowded. **What
else the key does: nothing.** It is read in exactly one place — `renderRaceFrame.js:248`, where it
decides whether the wide form is offered to the layout at all — and it reaches no other behaviour.

**2. The floor decision from LABELS-AND-FLOOR-1 is now the one that matters**, and it is unchanged:
is a racer drawn at 15–25 px in a wide sixty-racer shot still recognisable? Only his eye can answer
it.

## PROPOSALS

**1. `scripts/lib/raceDriver.mjs` should set `st.phase` and `st.raceStart` the way the game does.**
Every harness on that driver silently renders the start-formation roll call for the whole race, so
any measurement of the label layout taken through it is wrong in the same way mine were — and it
fails *comfortably*, producing plausible numbers rather than an error. `render-fingerprint.mjs`
avoids it only by having its own loop. **Cost:** two lines in `runRace`, plus a re-check of any
harness whose numbers depend on the label layout. **What it prevents:** exactly the two withdrawn
claims above, which were published twice before anyone doubted them.

**2. Give `computeTagLayout` a test that the roll-call branch and the decluttering branch produce
different `wide` sets.** The defect above was invisible because the roll-call branch returns a
plausible `shown` set and an empty `wide` set, which reads as "no names fit". A single test that the
two branches differ under identical geometry would have named it. **Cost:** one test. **What it
prevents:** the branch being entered by accident and looking like a result.

**3. Decide what the roll call is FOR, since it draws numbers.** SPRITE-SIZE-OVERVIEW-1 found the
`showAll` branch returns `wide` empty, so the start formation shows NUMBERS while the comment inside
it says it shows every NAME. With `labelNamesWhenRoom` on — his configuration — that means his roll
call is the one part of his race where names are *not* shown. **Cost:** one line to populate `wide`
in that branch; RENDER moves; countdown and first 8 s only. **What he would see:** names during the
start formation, which is what the exception was written for.

## Reproducing

```
node scripts/label-names-truth.mjs                       # his config, the two frames, the audit
node scripts/label-names-truth.mjs --leave-one-out       # one race per reverted key
node scripts/label-names-truth.mjs --only=minRacersVisible
```

**His stored snapshot is not in this repository and was not read beyond the eleven values quoted in
the brief that commissioned this** — the export contains his race history, which is his browser's
business and not the repository's. The harness carries those eleven values and nothing else.

**One caveat, unchanged:** node has no font, so the recording context measures text synthetically
(`length × px × 0.55`). The layout *mechanism* and the overlap audit are exact; the label *widths*
are that approximation, and a real browser's metrics would move the admit/refuse boundary a little
either way.
