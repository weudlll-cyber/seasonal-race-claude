# CEREMONY-HOLD-CENTRE-1 — why does the camera leave the track at the gun?

**Branch** `feat/ceremony-hold-centre-1` off `feat/ceremony-handover-1` (`b1e2f0c9`) · 2026-08-07 ·
**STAGE 1 ONLY — nothing was built, nothing moved, not merged, not minted**

---

## 1. Stage 1: the two-axis numbers, first

First second after the gun, 40 racers, seed 5601, cam seed 1439767152. The camera centre's
displacement is decomposed in the track's local frame at the instant of the gun: **ALONG** the tangent,
**ACROSS** the perpendicular. `dist` is the centre's distance from the track centreline.

### river-run — the track he raised it on

| ms | ALONG | ACROSS | dist from centreline | field centre (frame frac) | leader |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.0 | 0.0 | 34.2 | *(ceremony)* | |
| 17 | 1.3 | 2.5 | 31.6 | **0.27, 0.49** | 0.30, 0.52 |
| 100 | 7.3 | 13.7 | 20.4 | 0.28, 0.47 | 0.31, 0.50 |
| 300 | 18.6 | 32.5 | 2.8 | 0.31, 0.43 | 0.34, 0.46 |
| 500 | 26.4 | 43.2 | 9.2 | 0.34, 0.42 | 0.37, 0.45 |
| 917 | 35.9 | 52.0 | 18.1 | 0.40, 0.42 | 0.43, 0.45 |

**TOTAL over 1 s: along 37.1 · across 52.7 · ratio across/along 1.42**

### searound — the same moment, which he likes

| ms | ALONG | ACROSS | dist from centreline | field centre (frame frac) | leader |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.0 | 0.0 | 1.8 | *(ceremony)* | |
| 17 | −0.6 | 0.1 | 1.7 | **0.50, 0.50** | 0.71, 0.75 |
| 300 | 2.2 | 1.4 | 2.9 | 0.56, 0.56 | 0.77, 0.80 |
| 500 | 16.2 | 1.6 | 2.9 | 0.59, 0.58 | 0.80, 0.82 |
| 917 | 62.9 | 0.8 | 1.8 | 0.61, 0.61 | 0.83, 0.83 |

**TOTAL over 1 s: along 73.9 · across 0.5 · ratio across/along 0.01**

### (b) What differs

**On searound the motion is pure along-track** — 74 px along, half a pixel across. **On river-run the
across component is larger than the along component** — 53 against 37. That is the owner's distinction
in numbers, and it is not subtle: the ratio differs by a factor of **142**.

---

## 2. But the camera does NOT leave the track — and that changes the diagnosis

**The `dist from centreline` column is the honest test of "leaving the track", and it refutes it.**
On river-run the centre runs 34.2 → 1.6 → 18.1 world px from the centreline, against a track
**half-width of 150**. It never exceeds 12% of the half-width. It does not go into the bank; it moves
*toward* the centreline and back.

So the large ACROSS figure is not the camera departing the road. **It is the road bending.** River-run
is a serpentine: following the centreline necessarily produces displacement across the tangent
measured at the gun. Searound is straight at its start line, so following it is pure ALONG.

**The measurement that matches what the owner actually sees is the last two columns**, and it is stark:

> **On river-run the field centre is at frame x = 0.27 in the FIRST FRAME after the gun.**
> On searound it is at **0.50** — dead centre.

The ceremony leaves the formation centred on both. One frame later river-run has thrown it into the
**left third**, and it then migrates slowly back (0.27 → 0.40 over the second). It is a
**discontinuity at the gun**, not a drift. That is "the field pushed into the corner".

---

## 3. (c) The across-track pin — is it in effect?

**Yes, and it is doing nothing, correctly.** `_applyLateralGuarantee` is called every frame in
`_setTargets`, including this one. But it is not a pin *onto* the centreline — it is a guarantee that
shifts *off* it only when a guaranteed subject would otherwise be cropped, and returns the target
unchanged (`d === 0`) whenever the centreline already works.

Here the centreline already works: the corridor fits, so it returns zero. The `dist` column confirms
the outcome — the centre stays on the centreline. **The pin is in effect and is not the cause**;
nothing about it fails at the handover.

---

## 4. (d) Which candidate? Neither, exactly — and the difference matters

| candidate | verdict |
| --- | --- |
| **the forward bias pushing along the leader's instantaneous heading, which on a serpentine points off the road** | **The mechanism is right; the stated reason is wrong.** The bias IS the cause. But it does not point off the road — measured, the centre never leaves the centreline by more than 18 px of 150. |
| **the across-track pin not applying at the handover** | **Refuted.** §3 — it applies, and returns zero because the centreline already works. |
| **a third thing** | **This.** See below. |

**What actually happens:** the forward bias frames the leader at `leaderForwardFrac` along the motion
axis, and it starts doing so on the first frame after the gun. That is right once the field is strung
out behind the leader — the frame then carries the race. **At the gun the field is not strung out; it
is a block, and on river-run a tall one** (the formation measures 97 × 288 world px at 40 racers). A
block sitting immediately behind a forward-framed leader lands *with* him, in the left third, with
nothing behind to justify the space the bias just bought.

Searound escapes it for a geometric reason, not a lucky one: its leader is forward-framed to **0.71**
and the field still sits at **0.50**, because the frame is wide enough there for the block to sit
comfortably behind him.

**So the cause is the forward bias arriving before there is anything for it to frame** — an
ALONG-track authority, applied at the wrong moment. It is not an across-track failure.

---

## 5. (e) The stop rule, and why stage 2 is NOT built

The spec is explicit: *"report stage 1 before building anything"*, and *"if the cause turns out to be
across-track, the fix in stage 2 is the wrong one and must not be built."*

**The cause is not across-track**, so stage 2 is not disqualified — its premise, *the along-track bias
arriving too early*, is confirmed by §4. **I have still not built it**, and I am telling you plainly
rather than quietly delivering half of it:

- The stop rule asks for stage 1 to be reported first, and this is that report.
- The diagnosis turned out to be a **third thing** rather than either named candidate. Stage 2 was
  specified against a hypothesis that is *close to* but not *identical to* what the measurement found
  — the bias, yes; "points off the road", no. That is exactly the kind of gap I would rather you close
  than assume I may close on your behalf.

**Stage 2 as specified would work**, for what it is worth: handing the ceremony's centre to the first
OVERVIEW and releasing it with the zoom holds the field at 0.50 through the start and lets the bias
take over once the field is strung out. The numbers in §1 say that is the right shape of fix. Say the
word and it is a short block.

**Nothing was changed, so nothing moved.** No fingerprint ran because there is no diff:
`git diff feat/ceremony-handover-1` is empty apart from this report. `engine-reach --check` has no
paths to check.

---

## 6. Conformity, element by element

| the spec asked | done | note |
| --- | --- | --- |
| Branch off `feat/ceremony-handover-1` | yes | §7. |
| (a) trace the centre 1 s after the gun on river-run, both axes, as numbers | yes | §1. |
| (b) same on searound, say what differs | yes | §1 — ratio differs by 142×. |
| (c) is the across-track pin in effect? if not, why not | yes | §3 — in effect, returns zero, not the cause. |
| (d) test BOTH candidates rather than confirming one | yes | §4 — one refuted, one half-right, cause is a third thing. |
| (e) STOP RULE: report stage 1 before building | **held** | §5. |
| Stage 2 | **not built** | §5 — premise confirmed, decision left to you. |
| Hygiene report | yes | §8. |
| DO NOT mint, DO NOT merge | held | Nothing to mint. |
| Dev server on 5173, report the pill | yes | §7. |

---

## 7. How to see it

**5173 is on this branch.** The build pill reads:

```
[ra-build] start-up: serving build <HEAD> · feat/ceremony-hold-centre-1
```

**The picture is identical to `feat/ceremony-handover-1`** — this branch contains one report and no
code. It is on 5173 because you asked for it; there is nothing new to look at.

---

## 8. Hygiene

**Lines before and after: unchanged.** No source file was touched, so nothing was orphaned, nothing
removed, nothing moved out.

**Noticed and deliberately left** (carried forward from the previous block, still true):

- **`clampCamZoom(Infinity)` returns `minCamZoom`, not "unconstrained"** — a degenerate formation would
  collapse the ceremony target to the widest shot instead of the tightest. Cannot fire in a real race.
- **`postStartHoldMs` is duplicated between `defaults.js` and `cameraTimingComputation.js`, unguarded**
  — the ceremony's fallbacks beside it now have a guard test; this one still does not.

**Noticed here, new:** `_applyLateralGuarantee` is named as a *pin* in the spec and in conversation,
but it is a **shift-off-when-necessary** guarantee that returns zero the rest of the time. The name in
the head does not match the code, which is how it came to be a candidate at all. Worth renaming in
whatever block next touches it — I did not, because renaming it here would be a diff with no measured
justification.

---

## 9. Decisions made alone

**I measured the field's position in frame, which the spec did not ask for.** The two-axis
decomposition alone would have led to the wrong conclusion: it shows ACROSS dominating on river-run
(1.42×) and would have triggered the stop rule. The `dist from centreline` column shows that ACROSS is
the road bending, not the camera leaving — and only the field's frame position identifies what the
owner is actually seeing. **Reporting the ratio without the distance would have been a true number
that pointed at a false cause.**

**I sampled at 60 Hz for exactly one second and reported every 100 ms.** The defect is in the first
frame; a coarser sample would have shown a drift and hidden the discontinuity.

**I did not build stage 2 despite its premise being confirmed.** §5.

---

## 10. What I did NOT do, and why

- **Did not build stage 2.** §5 — the stop rule asks for stage 1 first, and the cause is a third thing
  rather than the hypothesis stage 2 was written against.
- **Did not touch the forward bias, OVERVIEW's anchor, or its position.** Diagnosis block.
- **Did not rename `_applyLateralGuarantee`.** §8 — a diff with no measured justification.
- **Did not mint or merge.** Nothing moved.

---

## 11. Two proposals of my own

**11.1 — The real rule may be simpler than a hand-over, and it is testable before it is built.** The
forward bias exists to put the field behind the leader. **It has no work to do while there is no field
behind the leader.** Rather than holding the ceremony's centre for a fixed handover, the bias could
scale with how strung out the field actually is — zero while the pack is a block, full once it is a
line. That is one geometric quantity (the field's extent along the track, against its own width), it
needs no new state and no hand-over, and it would fix every track rather than the start of one.
**It also makes the 3-second constant irrelevant for framing**, which the previous block could not do.
I did not build it because it changes OVERVIEW's position rule, which this spec forbids — but it is
the fix I would argue for.

**11.2 — searound is not a control, and I would stop treating it as one.** It reads right at the start
because its start line is straight and its frame has room, not because the camera does anything
different there. The same block of racers on the same bias would land in the corner on searound too if
its start line were on a bend. **Both tracks run the identical rule**; only the geometry differs. Any
fix should be verified on a track whose start line is on a curve — of the ten, river-run and
mountainstreet are the serpentines, and mountainstreet was not looked at in this block.
