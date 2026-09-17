# SCREENSHOT-VS-NUMBERS-1 — the screenshot is right; my "leader→pack" column was the wrong reference

**Read-only.** No source file was changed, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `ec42c8ce` (engine identical to the served `204dd30c`). Date: 2026-09-14.
The owner's store was not opened at all this block.

---

## THE CONSEQUENCE, AT THE TOP WHERE IT BELONGS

**Candidate (C). One figure is wrong, and it is mine.** The "leader→pack 518.5 px" column in
QUICKTEST-ICE-3 measured the leader against the **MEDIAN of the live field — rank ~20 of 40**. That is
not what a viewer calls "the field". At the moment in question the field *begins* at rank 3, and rank
3 is **0.0 px behind Raven**.

**The owner's ordering is correct and the replay agrees with it.** At the widest moment with Flare
1st and Raven 2nd:

| | OFF | ON |
|---|---|---|
| Flare → Raven | **196.6 px** | **169.0 px** |
| Raven → 3rd (Bolt) | **0.0 px** | **0.0 px** |
| Flare → median (rank ~20) | 520.3 px | 492.6 px ← *the mislabelled column* |

**Flare→Raven is larger than Raven→field on both arms**, exactly as he says. My reported "ratio of
about 1:3" compared leader→2nd against leader→**median**, which is not a pair anyone looks at.

**Scope of the error, checked rather than assumed:** the "pack/median" figure appears in
**QUICKTEST-ICE-3 and nowhere else** in this week's work. GAP-BRAKE-SWEEP-1, GAP-BRAKE-WINDOW-1,
GAP-BRAKE-PARADOX-1, GAP-BRAKE-ARRIVAL-1 and GAP-BRAKE-HANDOVER-1 contain **zero** mentions — every
gap number in them is leader→2nd, which is validated below. **No other report rests on it.**

★ **And the conclusion I drew from it in QUICKTEST-ICE-3 is wrong and is withdrawn here.** That
report said his screenshot "is not showing that gap" and that the brake "does not act on it". The
opposite is true: **the gap he photographed IS the gap the brake measures**, and the brake cut it from
196.6 px to 169.0 px. The corrected answer to his question is at the end of this report.

---

## STEP 1 — I COULD NOT READ THE SCREENSHOT

**The image is not reachable from this machine.** Every path tried, verbatim:

| searched | result |
|---|---|
| `/mnt/user-data/uploads/1789412490594_image.png` | does not exist |
| `/mnt/user-data/uploads` | does not exist |
| `/c/mnt/user-data/uploads` | does not exist |
| `find /c/Users/weudl -maxdepth 4 -name '1789412490594_image.png'` | 0 hits |
| `find /c/tmp /c/Users/weudl/{Downloads,Pictures} -iname '*1789412490594*'` | 0 hits |
| any `.png` newer than 1 day in Downloads / Desktop / Pictures | 0 hits |
| `find /c/Users /c/tmp -name '1789412490594_image.png'` | 0 hits |

So **Step 1 could not be done**: I have no on-screen pixel positions, no standings panel, no HUD
line, no minimap and no camera state read from the image. Everything below rests on **his stated
description** — Flare leading, Raven between him and the field, lap 2, roughly the widest moment —
and on the replay's own geometry. That is enough to settle the contradiction, because the two
candidate orderings are qualitatively different and the replay produces one of them unambiguously;
but it is *not* a measurement of his image, and nothing here should be read as one.

---

## STEP 2 — THE MATCHING MOMENT

The configuration he describes — **Flare 1st, Raven 2nd, lap 2** — holds for **773 steps on each
arm**. Its widest points:

| arm | progress | camera at that frame |
|---|---|---|
| OFF | 0.926 | 323.6 world px per canvas width |
| ON | **0.923** | **273.0** world px per canvas width |

The race reproduces: Flare wins on both arms, Raven is 2nd at these moments, lap 2, and the moment is
before 0.95 as he states. **Candidate (A) is excluded** — and it was already excluded in
QUICKTEST-ICE-3 by four independent details of the field (N=20 does not even contain Raven).

---

## STEP 3 — THE TWO ORDERINGS, SIDE BY SIDE

The front of the field at the ON arm's widest Flare/Raven moment (progress 0.923, 40 still running):

| rank | name | gap to leader | gap to the one ahead |
|---|---|---|---|
| 1 | Flare | 0.0 px | — |
| 2 | Raven | **169.0 px** | **169.0 px** |
| 3 | Bolt | 169.0 px | **0.0 px** |
| 4 | Atlas | 207.0 px | 37.9 px |
| 5 | Apex | 209.9 px | 3.0 px |
| 6 | Breeze | 237.1 px | 27.2 px |
| 7 | Pixel | 245.2 px | 8.1 px |
| 8 | Surge | 248.6 px | 3.4 px |

Consecutive spacing, ranks 2–12: **169, 0, 38, 3, 27, 8, 3, 36, 50, 17, 51 px.**

**One 169 px hole, and then the bunch, immediately.** In canvas widths at that frame: Flare→Raven
**0.619 widths**, Raven→3rd **0.000 widths**, Flare→median **1.805 widths** (off-screen).

| | his screenshot (as described) | the replay | agree? |
|---|---|---|---|
| Flare→Raven vs Raven→field | Flare→Raven is **larger** | Flare→Raven 169.0 px, Raven→3rd **0.0 px** | ★ **yes** |
| the "1:3" ratio QUICKTEST-ICE-3 reported | not what he sees | 169.0 : 492.6 — leader→2nd against leader→**median** | it is a different pair |

**The ratios do not disagree — they were never the same two quantities.** There is no reading error
to state, because the replay's own ordering reproduces his without needing the image measured.

---

## STEP 4 — WHERE THE WRONG FIGURE COMES FROM

### The arithmetic of both columns

**Leader→2nd**, in my instrument: `const gap2 = r1 && r2 ? (r1.t - r2.t) * PATH_PX : null`. That is
character-for-character the engine's own trigger at
[racePlanner.js:762](../../client/src/modules/racePlanner.js#L762):
`const gapPx = (leader.t - active[1].t) * pathPx;`. It was validated against the mechanism's own
`gapsAtFire` over **513 firing steps with 0 disagreements** (GAP-BRAKE-HANDOVER-1 did the same check
on a second race: 326 steps, 0 disagreements). **Candidate (D) is excluded.**

**Leader→pack**, in my instrument:

```js
const ts = live.map((r) => r.t).sort((a, b) => a - b);
const med = ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
gapPack = (r1.t - med) * PATH_PX;
```

The reference is the **median `t` of the live field**. With 40 running that is **about 20th place** —
half the field back, 1.8 canvas widths away, off the screen entirely. **That is the error**: not the
projection, not the units, but the choice of reference racer, and the sentence in QUICKTEST-ICE-3 that
called it "the distance his eye reads".

### The checks the brief asked for, each answered

| check | result |
|---|---|
| which racer is the "pack" reference | the **median of the live field**, rank ~20 of 40 — **not** what a viewer sees as the field |
| same unit on both figures | **yes** — both are `Δt × pathLengthPx`, world px |
| same path-length basis | **yes** — both use `geo.pathLengthPx` = 6065.5 |
| does either divide or multiply by a lap count | **no** — neither figure contains a lap term |
| does either use `finishT` | **no** — `finishT` is 2 for this race and appears in neither expression |
| same projection from `t` to world px | **yes**, identical |

★ **The lap-count error the brief warned about did not recur.** Sanity check on the projection: `t`
counts path lengths, so a racer exactly one lap back has `Δt = 1.0`, which reads as **6065.5 px — one
full lap of track**. Correct by construction. Had either figure been out by the lap count the leader
and a lapped racer would have read as half a lap apart.

### Which figure is wrong, and by how much

**Only the leader→pack figure, and it is not "out by a factor" — it answers a different question.**
As a leader-to-median distance, 492.6 px is *correct*. As "the distance his eye reads", it is wrong by
the whole width of the field: the quantity he is looking at is **169.0 px**, and the one I printed
beside it was **492.6 px**, 2.9× larger and measured to a racer he cannot see.

---

## THE CORRECTED ANSWER TO HIS ORIGINAL QUESTION

QUICKTEST-ICE-3 asked why the picture looked unchanged when the numbers said the brake worked. The
corrected answer:

**The brake acts on exactly the gap he is looking at.** It fired on 513 steps, from progress 0.839 to
0.941, all on Flare, and cut Flare→Raven from **196.6 px to 169.0 px — a 14% reduction, 27.6 px.** At
the frame he photographed that is **0.608 → 0.619 canvas widths** — because the camera zoomed in by
almost exactly the amount the gap shrank (323.6 → 273.0 px per width), **the reduction is invisible on
screen.**

That is the honest finding: the brake did what it was asked to do, to the right quantity, by 14%, and
**the camera cancelled it out in the picture**. Not "he is looking at the wrong gap" — that was my
error, and it pointed the previous report's conclusion in the wrong direction.

---

## NO REPAIR

The wrong reference is named with its address — the median-of-the-live-field expression in the
QUICKTEST-ICE-3 instrument, against the engine's own leader→2nd at
[racePlanner.js:762](../../client/src/modules/racePlanner.js#L762). Nothing was changed, no key was
adjusted, and QUICKTEST-ICE-3 itself is left standing with this report as its correction rather than
being rewritten — the reports are an append-only record.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **Step 1 is genuinely missing**, not worked around. If the image can be put somewhere reachable I
  can do the pixel reading, the standings panel, the HUD and the minimap, and check the camera state
  against `visibleWorldPx` at that frame — that would let me confirm the frame rather than infer it
  from his description.
- **The camera cancelling the improvement** is the fourth time in this week's work that the
  canvas-width conversion has reversed or erased a world-px movement. It is stated again here rather
  than treated as known.
- The three uncommitted eye-test lines in `defaults.js` are still in the working tree and the three
  services are still serving that build. Untouched; this block measured from a scratch checkout of
  the committed HEAD with both arms set explicitly.
- The standing items are unchanged: the dead front leash, `raceCore.js:679-683` omitting
  `governorMult` from the diagnostic `vt`, the "SIM-ONLY" and "default OFF" stale comments,
  `docs/FORCE-MAP.md`'s four stale windows, and `sim-fairness.mjs` being unable to exercise the brake.
