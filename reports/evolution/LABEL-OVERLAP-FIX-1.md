# LABEL-OVERLAP-FIX-1 — a label that was admitted stays readable

**2026-08-22 · branch `fix/label-overlap` off master `845b97d0` · NOT MERGED, NOTHING MINTED — this
changes the picture and the owner judges it first**

## The two fixes, in one line each

**A — an admitted NAME is no longer a box the incumbent budget may be spent against.**
`fits` still forgives a tenured label up to `yieldOverlapFrac` of its own area, but any overlap with
a box holding a name now refuses it outright (`nameTagLayout.js`, inside `fits`).

> **Which shape, and why the other was worse.** The alternative was to re-check every admitted name
> after the pass and withdraw the ones that got overrun; that is *itself* the churn the budget exists
> to prevent — a name would appear and vanish within one frame — and it cascades, because freeing a
> slot changes every later decision. Protecting the name at the point of intrusion is one condition
> inside the loop that already runs.

**B — the photo-finish blanket exemption is gone.** `renderRaceFrame.js` passes `exemptAll: false`.

> **What it was FOR, from where it lives.** The commit that added it (`42d51b69`) justifies the
> *detection* — "the finish is cleanly detectable at the label layer" — and the surviving comment
> justifies the *safety*: "at that zoom every racer stays recognisable even when the labels overlap".
> **Only the safety premise is refuted**, and decisively: that shot measured **1951 world px, the
> widest of the entire race**, wider than OVERVIEW's 800. **No new zoom threshold is invented** — a
> second number calibrated against today's shot would rot exactly as the first did. What the reason
> genuinely needs survives without the flag: **the racer the camera is on still keeps its name
> unconditionally** through `exempt`, which is untouched.

**Nothing else changed:** not `labelNamesWhenRoom`, not the focus exemption, not fonts, not box
sizes, not `YIELD_OVERLAP_FRAC` itself, not a default.

---

## The acceptance — from the drawn boxes, on real browser fonts

Every number below is computed from the geometry the renderer actually draws, with **real Chrome
`measureText` widths at `bold 15.84px sans-serif`** — captured once into
`scripts/fixtures/label-metrics-chrome.json` (172 strings: the whole roster and every race number)
and fed to **both** the layout and the audit, so the layout decides what the browser's layout would
decide. A string the table lacks falls back to an estimate **and is counted**, so a gap cannot pass
as a measurement; the runs below report **0 misses**.

space-sprint, seed 9, his eleven config values, roster `QUICK_TEST_NAMES`.

### 60 racers

| frame | | before | after |
| --- | --- | --- | --- |
| **wide OVERVIEW mid-race** (t 20 s, 800 px, 60 on screen) | names | 11 | 11 |
| | **names overlapping (non-exempt)** | **3** | **0** |
| | labels drawn | 57 | 51 |
| | **labels dropped** (of 60 eligible) | 3 | **9** |
| **before the run-in** (t 53.5 s, 832 px) | names / overlapping | 2 / 0 | 2 / 0 |
| | labels dropped | 1 | 1 |
| **racing shot** (median LEADER_ZOOM, 400 px) | names | 9 | 8 |
| | overlapping / dropped | 0 / 0 | 0 / 0 |
| **PHOTO_FINISH** (t 57 s, **1951 px**) | names | 41 | **1** |
| | **names overlapping** | **41** (40 non-exempt) | **0 non-exempt** |
| | labels drawn | 41 | 17 |
| **worst frame anywhere in the race** | non-exempt overlaps | **40** | **0** |

### 20 racers

| frame | | before | after |
| --- | --- | --- | --- |
| wide OVERVIEW mid-race (t 43 s, 800 px) | names / overlapping / dropped | 9 / 0 / 0 | 9 / 0 / 0 |
| **racing shot** (median LEADER_ZOOM, 494 px) | names / overlapping / dropped | 7 / 1 / 0 | **7 / 1 / 0 — identical** |
| PHOTO_FINISH (t 57 s, 1896 px) | names overlapping | 11 (10 non-exempt) | **0 non-exempt** |
| worst frame anywhere | non-exempt overlaps | **10** | **0** |

**The racing shot at 20 racers is unchanged, to the label.** Seven on screen, seven labelled, none
dropped, seven names, and the one overlap is the camera's own subject — the design exemption, which
this block does not touch.

### The cost, stated rather than discovered

- **His frame loses 6 more labels**: 3 dropped → 9, of 60 eligible. **51 labels are still drawn.**
- **The photo finish loses most of its names**: 41 → 1, and 41 labels → 17. **This is the big one and
  it is the reason this branch is not merged.** What it replaces is 41 names of which 40 overlapped
  and 9 ran off the canvas edge — a smear, not a roll call. Whether 17 readable labels beat 41
  unreadable ones is his call, not a measurement.
- **The racing shot at 60 racers loses one name** (9 → 8) and drops no labels.

---

## RENDER did not move — and that is the finding, not an oversight

**`7d553406f41ff176` before and after**, confirmed twice (standalone and inside `npm run verify`).
The brief expected it to move. It cannot, and the reason is exact:

**`labelNamesWhenRoom` ships `false`.** `renderRaceFrame` passes `wideLabelOf` only when that key is
true, so under the shipped configuration `e.wide` is null for every racer, no box is ever placed
holding a name, and **both fixes are unreachable**: fix A protects a box that never exists, and fix
B's `exemptAll` branch is gated on `e.wide` too. The render fingerprint runs `DEFAULT_CAMERA_CONFIG`,
so it exercises neither path — which LABEL-NAMES-2's leave-one-out already established from the other
side (reverting that one key takes names to zero).

**So this change is invisible to anyone on the shipped defaults and visible only to someone who has
turned names on — which is the owner.** Closure walk, from each instrument's declared reach:

| instrument | closure | contains a changed file? |
| --- | --- | --- |
| world / world-off | 22 | **no** — cannot move, not run |
| camera | 38 | **no** — cannot move, not run |
| **render** | 58 | **yes** — `renderRaceFrame.js`, `nameTagLayout.js` → **MEASURED, unmoved** |
| tracking-lag | 8 | no |

**NOTHING IS MINTED.** A mint records a movement and there was none.

---

## Tests — and how they measure

`client/src/screens/RaceScreen/nameTagLayout.test.js`, five new tests. **They do not share a
measurement function with the layout.** Each racer is given an **exact stipulated width** through a
lookup table rather than a ruler, so every box coordinate is known by construction, and the verdict
is plain rectangle arithmetic written out in the test. If the layout's idea of a width were wrong
these tests would still be right — which is precisely what the audit that reported "0 overlaps" could
not say.

| test | what breaks if deleted |
| --- | --- |
| a tenured NUMBER may not land on an admitted NAME | the defect returns exactly as it was; nothing else in the file looks at what happens to a name *after* it is admitted |
| two NUMBERS still yield to each other | the fix could become "set `YIELD_OVERLAP_FRAC` to 0", which fixes his frame and reintroduces the churn the budget was measured into existence to stop |
| with room, name and number are both drawn and do not touch | the fix could become "never draw a number near a name", which empties the picture |
| `exemptAll: true` puts both names on 30 px | nothing records what the flag does, so a later reader cannot tell whether the caller's `false` is a decision or an accident |
| `exemptAll: false` admits only what fits | the repair is unpinned — the flag could go back and only the ten-track harness would notice |

**Sabotage-proved, both defects, each restored in turn:**

- **A** — deleting `if (p.holdsName) return false;` → *a tenured NUMBER may not land on an admitted
  NAME* goes red, 25 of 26 still pass.
- **B** — restoring `exemptAll: camera?.state === 'PHOTO_FINISH'` → the harness reports
  **41 of 41 overlapping at t 57 s** again, exactly the pre-fix figure.

**One honest gap:** B's caller-level pin is the harness, not a unit test — the flag is computed in
`renderRaceFrame`, and pinning it there means driving a whole frame. The unit tests document the
flag's two arms; nothing yet fails if a future edit flips the caller back. Named as PROPOSAL 2.

## A correction to LABEL-OVERLAP-3's headline number

That report's browser pass used `BOX_PAD_X = 10`; the module's value is **8**. Every box it built was
2 px too wide, which inflated the count. Its **"7 of 12"** should read **3 of 11**, measured here
with the real `labelBoxWidth`. **The finding is unaffected** — the defect, its mechanism, the
name-vs-number signature and the PHOTO_FINISH figures all stand, and 3 is still not 0. The test
fixture caught the same mistake in this block: the first draft of the overlap test used 10, its
`expect(overlaps(...)).toBe(true)` guard failed, and that is what the guard is for.

## What he should look at, on 4173

1. **The wide OVERVIEW on space-sprint at 60 racers.** Before: names cutting into the numbers around
   them. Now: the same eleven names, none of them touching anything — at the price of six more
   racers carrying no label at all in that frame (51 labels rather than 57).
2. **A photo finish.** Before: every racer named, forty of them overlapping and nine sliding off the
   edge of the screen. Now: the leader named and the rest numbered — seventeen labels instead of
   forty-one. **This is the change to judge.** If he wants more names at the finish, the honest lever
   is to name the contenders rather than everyone, and that is a new block.

## PROPOSALS

**1. Name the contenders at the photo finish, rather than everyone or almost no one.** The exemption
was reaching for "say who is finishing" and delivered a smear; the clearance test delivers one name.
The director already knows the pinned pair (`_photoFinishContenders`). Passing those two indices into
`exempt` would give the finish its two names with the clearance test intact. **Cost:** one field on
`FRAME_CAMERA_FIELDS` and one set union. **What he would see:** both contenders named at the line.

**2. Pin the caller-level flag.** `exemptAll` is decided in `renderRaceFrame` and only the ten-track
harness would notice it changing. A focused test that drives one PHOTO_FINISH frame and asserts no
non-exempt name overlaps would close it. **Cost:** one test on the frame path. **What it prevents:**
the fix being undone by an edit that looks unrelated.

**3. Wire `label-names-truth.mjs` into `npm run verify` as a threshold guard.** It measures one
number that must stay at zero — non-exempt overlapping names — on the configuration that actually
exhibits the defect. Left unwired, the next label change gets the same hand-measurement this one did.
**Cost:** a `GUARD` declaration and one assertion. **What it prevents:** the fourth report in this
series.

## Reproducing

```
node scripts/label-names-truth.mjs --roster=current --racers=60   # his config, his roster
node scripts/label-names-truth.mjs --roster=current --racers=20
node scripts/render-fingerprint.mjs --quiet                       # 7d553406f41ff176, unmoved
cd client && npx vitest run src/screens/RaceScreen/nameTagLayout.test.js
```
