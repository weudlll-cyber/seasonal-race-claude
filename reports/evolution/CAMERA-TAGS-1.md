# CAMERA-TAGS-1 — the unit, and readability before count

Branch `camera-refactor`, one commit. Return tag `pre/tags` (`77a7812d`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step. **Mint tripwire applied** (the diff touches
`storage/defaults.js`): `dc4647be0f55ebdb`, **unchanged**.

Stage 1 of three. Stages 2 and 3 are named in the module header so nobody has to guess whether they
were forgotten: **priority from the director's anchor + guarantee set** (stage 2), and **multi-slot
placement plus sprite avoidance** (stage 3).

---

## 1. THE NUMBER HE WILL NOTICE FIRST — and I predicted it wrong

In the consultation I said the label count would go **down** and the readable count up. **The
measurement says the count goes UP.** Over ten tracks, 40 racers, full seeded races:

| | labels drawn | of those, **readable** |
|---|---:|---:|
| **old rule** (top 10 by position) | 10.0 | **9.0** |
| **new rule** | **19.9** | **17.0** |

The cap was the binding constraint, not the clutter. "Top 10" was throwing away names that had
nowhere to collide.

**Where he complained, OVERVIEW, the gap is widest:**

| state | old: drawn / readable | new: drawn / readable |
|---|---:|---:|
| **OVERVIEW** | 10.0 / **6.6** | **29.0 / 21.0** |
| LEADER_ZOOM | 10.0 / 9.3 | 23.3 / 20.3 |
| LEAD_CHANGE | 10.0 / 9.9 | 13.9 / 13.8 |
| BATTLE_ZOOM | 10.0 / 10.0 | 13.1 / 12.7 |
| COMEBACK_ZOOM | 10.0 / 9.8 | 27.4 / 26.0 |
| **PHOTO_FINISH** | 10.0 / 10.0 | **6.4 / 6.4** |

**PHOTO_FINISH is the one place the count drops**, and it is correct: only ~6 racers are on canvas in
a tight finish, and the old rule was labelling four who were not there.

**Naming breadth** — the point of "as many names as possible". Every racer now carries a label at some
point on every track (**40/40**), where the old rule gave P11–P40 nothing all race. Median share of
race time labelled: 21–58% depending on track.

## 2. THE UNIT

`fontPx = Math.max(8, Math.round(11 * inv))` is gone. The `11 * inv` was right — dividing by the zoom
is what keeps a world-drawn label still. The damage was the other two operations: `round()` collapses
the world size at high zoom, and the `max(8, …)` added to catch that then **clamped**, so above
effZoom 1.375 the label started growing again.

| effZoom | old label on screen |
|---:|---:|
| 1.0 | 11.0 px — as intended |
| 1.6 (OVERVIEW) | 12.8 px |
| 3.2 (LEADER) | **25.6 px** |

**2.3× on one setting.** It also **squashed the label vertically by up to 16%** on closed tracks,
whose world→screen scale is anisotropic — nobody had noticed that one.

Both go away by undoing the camera transform for the label alone: translate to the racer, scale by
`(1/effX, 1/effY)`, and from there one unit is one screen pixel. No rounding, no clamp, no squash.
`nameTagFrameFrac` default **0.022** = 15.8 px at 720, and a 1440-tall frame gets exactly twice that
(pinned by a test).

## 3. THE START-FORMATION EXCEPTION — and when to hand over

His requirement, with his reason: **every name visible during the start formation, so a spectator can
find their racer once.** Not a fallback — decluttering would otherwise have taken the roll call away
the moment it shipped.

**When to hand over, measured.** Share of eligible labels that survive decluttering, by second after
the gun, pooled over all ten tracks:

| s | 0 | 2 | **4** | 6 | 7 | **8** | 10 | 14 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| survive | 0.90 | 0.84 | **0.78** | 0.94 | 0.95 | **1.00** | 1.00 | 1.00 |

The field is *densest around 4 s in*, not at the gun — the row starts spread across the corridor and
then funnels. **By 8 s decluttering drops nothing**, so the exception costs names before 8 s and costs
nothing after it. Default `nameTagAllUntilMs: 8000`.

**Note the camera's own start hold ends at 3 s.** Handing over when the camera does would have taken
~20% of the names away at the densest moment — the obvious choice was the wrong one.

**What the handover looks like: nothing, and that is the design.** Because at 8 s decluttering drops
essentially zero labels, the switch is invisible by construction. No transition needed, so none was
built — and this is not the persistent fade I rejected in the consultation, it is the absence of any
event to smooth.

## 4. STABILITY — the part that was harder than I expected

A first-fit layout recomputed every frame **churned at 12.06 label changes per second.** A name that
appears and vanishes twice a second cannot be read at all, so this had to be solved inside stage 1.

The churn split almost evenly, and that split chose the fix:

| cause | changes/s |
|---|---:|
| racers crossing the canvas **edge** | 5.40 |
| labels crossing **each other** | 6.66 |

Three mechanisms, **none of them a timer** (Lesson 190 is explicit):

1. **Incumbency** — a label already on screen is offered its pixels first. Alone: 12.06 → **9.15**.
2. **Edge hysteresis** — a racer must be 2% of the frame *inside* to gain a label and keeps it until
   it is that far *outside*. → **8.27**.
3. **Yield threshold** — a newcomer must be completely clear; an incumbent tolerates an intrusion of
   up to 35% of its own box before giving up. Asymmetric, so the boundary is decisive rather than a
   coin flip. → **5.45**.

**5.45/s over ~20 labels is one change per label every 3.7 s.** The cost is in the measurement rather
than hidden: readable labels fall 18.7 → 17.0, because a tolerated intrusion is a small overlap.

## 5. HYGIENE AND TESTS

**Deleted with its rule:** `nameTagVisibility.js` and its test, `tagVisibleMaxCount` (key, control,
label, tooltip, and the Dev Screen number input). Zero references remain.

**Replaced:** the Dev Screen section now carries **"Name size (% of frame)"** and **"Show all names
for (s)"**, and its blurb says what the rule now is.

| file | before | after |
|---|---:|---:|
| `RaceScreen/nameTagLayout.js` | — | **221** (new) |
| `RaceScreen/nameTagLayout.test.js` | — | **239** (new) |
| `RaceScreen/nameTagVisibility.js` | 23 | **deleted** |
| `RaceScreen/nameTagVisibility.test.js` | 60 | **deleted** |
| `RaceScreen/drawing/racerRendering.js` | 187 | 208 |
| `RaceScreen/index.jsx` | 1626 | 1668 |
| `storage/defaults.js` | 756 | 776 |
| `DevScreen/…/NameTagVisibilitySection.jsx` | 92 | 120 |

**21 new tests, three failure proofs.** The old size rule's 2.3× spread computed from the same
inputs; the old top-N rule drawing ten labels on a twelve-pixel clump; and the eligibility inversion
(a leader off-frame got a name, an on-screen back-marker did not). Plus: a 1440 frame gets exactly
twice the label; every surviving label is provably non-overlapping across a 40-racer grid; a bigger
font fits fewer labels, so the trade is visible; and the three stability mechanisms each pinned
separately. **3449 green.**

## 6. THE OWNER'S EYE

1. **The start formation — all names, exactly as before.** This is the requirement, not a nicety.
   They now stay for **8 seconds after the gun**, which is longer than before, because that is when
   the field stops being dense enough to matter.
2. **A crowded mid-race moment in OVERVIEW — are the names readable now?**

**Before you look: you will see MORE names, not fewer.** I predicted the opposite in the consultation
and the measurement corrected me. In OVERVIEW the old rule drew 10 and about 6.6 were readable; the
new one draws ~29 and about 21 are readable. The only place you will see fewer is a photo finish, and
there the missing ones were names of racers who were not on screen.

If it now feels like too many names, the lever is **"Name size (% of frame)"** — a bigger label
collides sooner, so raising it *reduces* the count while making each one easier to read. That is the
honest dial for your two goals, and it is one number.

Press **M** and send the **whole** line.
