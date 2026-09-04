# ACCEPTED-FINISH-1 — items 9 and 10 encode an ideal he rejected, and the three exclusions do not mean the same thing

> **His decision: the finish sequence stays exactly as it is.** Judged on the picture over several
> days two weeks ago. The closing zoom **need not** have arrived by the moment the leader crosses,
> and a battle shot **may** take the frame near the finish.
>
> **So items 9 and 10 are not finding a defect.** The decision is now recorded **beside the items**,
> in the gate's own file — and **in the sheet's printed output**, where a person meeting a FAIL will
> actually be standing.
>
> ★ **The note names a CAUSE, not an item** — a blanket "9 and 10 may fail" would disarm them, which
> is the same defect in a different coat. §2.
> ★ **The three excluded tracks are NOT in the same case, and the difference matters**: one of them
> is hiding something that is *not* accepted behaviour. §4.

---

## 1. WHAT WAS RECORDED, AND WHERE

Three places, chosen so that the decision is met **before** the failure is interpreted:

| where | what it carries |
| --- | --- |
| **`scripts/endgame-sheet.mjs`, head of file** | the acceptance in full: both behaviours, why the items stay, and the accepted **cause** for each |
| **beside items 2, 9 and 10 at their computations** | three or four lines each, naming the accepted cause and what would still be a finding |
| **the sheet's printed legend** | two lines under `FAILING RACES per item`, so it reaches a person who never opens the source |

**Nothing was changed.** No threshold moved, no item removed, no behaviour touched.

---

## 2. ★ WHY THE NOTE NAMES A CAUSE AND NOT AN ITEM

This is the whole design of it. *"Items 9 and 10 may fail"* would be simpler and would **disarm them
completely** — after which the gate could never again tell you that the winner left the frame for a
reason nobody has accepted. That is the same failure as widening a threshold, reached by a different
route.

So what is accepted is **a failure with a named cause**, readable off the crossing row:

| item | what it measures | ACCEPTED cause | STILL a finding |
| --- | --- | --- | --- |
| **9** | where the **winner** sits in the frame, at the crossing and for 1250 ms after, against the subject's inner region | the camera still on the `level` binding with the photo-finish zoom **in flight** — it tightens *under* the winner and he drifts to the edge | the winner leaving the inner region while the shot is **settled** (`binding: "state"`, zoom arrived). Nothing has been accepted about that |
| **10** | whether the leader is **ever** behind frame centre in the endgame window — a **presence** test for the run-in's walk-back | a `BATTLE_ZOOM` in the window: a battle shot frames the battle, so the leader is held forward | the walk absent with **no** battle shot in the window — which is what this item was written to catch |

---

## 3. ★ ITEM 2 MEASURES THE SAME ACCEPTED BEHAVIOUR — REPORTED, NOT DECIDED

His acceptance names two behaviours and two items. **A third item measures behaviour (i)
directly:** item 2 asks whether the shot is at one of the director's two named factors **at the
crossing**, and *"the closing zoom has not arrived yet"* is exactly how that question gets the answer
no.

Item 2 is therefore flagged at its own computation, so a reader meeting a FAIL there has the same
context — but the flag says plainly that **his acceptance did not name it and whether it reaches
this item is his.** Nothing about item 2 was changed, and no proposal is made.

This matters because of §4: **two of the three excluded tracks fail item 2 and neither of the two
items he named.**

---

## 4. ★ WHERE EACH EXCLUDED TRACK ACTUALLY STANDS — THREE DIFFERENT ANSWERS

Measured over 16 races: all ten tracks at seed 9 (twice, agreeing row for row), plus garden-path and
dirt-oval at seeds 1, 2 and 3.

| track | what it fails | does its exclusion rest on the **two named items** alone? |
| --- | --- | --- |
| **garden-path** | seed 9: **items 9 and 10, and nothing else**. Seeds 1–2 also item 2; seed 3 clean | **YES** — at the seed this gate runs. And everything it fails across all four seeds is accepted behaviour |
| **luger-hill** | seed 9: **item 2 only** *(the only seed measured for this track)* | **NO** — item 2 is not one of the two he named. Same behaviour, a different item |
| **dirt-oval** | seed 9: **item 2**. Seed 3: **item 7** — a contender off canvas on **78 frames** | **NO**, and it is the one that matters: **item 7 is not accepted behaviour and is not one of the two items** |

**SO THE THREE ARE NOT INTERCHANGEABLE, and a reader working from memory will get this wrong.**

- **For garden-path**, the exclusion is no longer justified by a defect. It is justified by items that
  object to something wanted — a **different and weaker reason** than the one recorded in the gate's
  own comment, which is now corrected there.
- **For luger-hill**, the same is true in substance, by a different item.
- **For dirt-oval**, it is **not** true. Item 7 at seed 3 — one racer still in with a chance, off the
  canvas for 78 frames of the endgame window — is a real, unaccepted failure that the exclusion
  hides. *(It sits outside the seed-9 set, which is why it did not appear in GATE-GARDEN-PATH-1: that
  piece measured dirt-oval across four seeds for a different reason and this fell out of the same
  data on re-reading.)*

**Nothing is proposed.** Widening the gate now would make it red on day one for behaviour he has
accepted — the trap the last piece avoided — and the dirt-oval finding is a picture question of its
own, not an argument for a gate change.

---

## 5. WHAT WAS RUN

| | |
| --- | --- |
| `npm run verify --base=master` | **PASS / FAIL as recorded in the commit** |
| the sheet's printed legend | rendered from the recorded ten-track run and confirmed to appear under `FAILING RACES per item` |
| `viewer-invariants --declare` | still declares correctly; both files syntax-checked |
| minted | **nothing. No minting permission was given and none was needed** — no production file was touched |

---

## 6. WHAT THIS DOES NOT COVER

- **luger-hill has been measured at ONE seed.** Its "item 2 only" is a seed-9 statement, not a track
  property.
- **The dirt-oval item-7 failure is reported, not diagnosed.** How a contender leaves the canvas for
  78 frames is unexamined; only that it does.
- **The acceptance covers two named causes.** If a future failure of item 9 or 10 has a *different*
  cause, this note deliberately does not excuse it — and nothing automatically checks which cause a
  given failure had. A reader must look at the crossing row.
- **Item 2 is left unresolved on purpose** (§3). It is his call.
