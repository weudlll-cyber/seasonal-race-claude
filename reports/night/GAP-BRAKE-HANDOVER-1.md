# GAP-BRAKE-HANDOVER-1 — the answer is (B): while he could be reached his lead was too small, and by the time it was large the race was past the window

**Read-only.** No source file was changed, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `204dd30c`. Date: 2026-09-14. The owner's store was not opened.

**Case:** space-sprint seed 2, 40 racers, the owner's roster, `wild`, allowance 124 px, window end
0.95. Window start resolved by the engine to **0.600**.

---

## THE ANSWER IN ONE LINE

**(B).** Racer 18 led for 165 steps inside the brake's window and his gap never once reached the
allowance — his biggest reachable lead was **95.8 px, 28.2 px short of 124**. His gap first crossed
124 px at **progress 0.966, past the 0.95 window end**, and from there he led 176 more steps up to
181.1 px where the brake cannot act at all.

**(C) is excluded**, structurally and by measurement: 0 of 326 firing steps acted on a non-leader,
and after the hand-over the brake selected 18 on **341 of 341** steps and racer 20 on **0**.

**(A) is excluded**: the brake never pulled on 18 at all — **0 steps**. There is no strength question
to answer here, because no force was applied.

---

## A NOTE ON WHERE THIS WAS MEASURED

The repository working tree currently carries **three uncommitted lines** in `defaults.js` — the
eye-test build from the previous block (`gapBrakeEnabled: true`, 124, 0.95). An OFF arm that
inherited that default would not be off. This block therefore ran against a **scratch checkout of the
committed HEAD** and stated `gapBrakeEnabled` explicitly on **both** arms. The owner's running build
was left untouched.

---

## STEP 1 — THE MECHANISM, READ BEFORE ANYTHING WAS MEASURED

The brake identifies its racer with one expression, at
[racePlanner.js:761](../../client/src/modules/racePlanner.js#L761):

```js
const leader = active[0];
```

`active` is not carried between steps. It is rebuilt on every call at
[racePlanner.js:887-889](../../client/src/modules/racePlanner.js#L887-L889):

```js
const active = racers
  .filter((r) => !r.finished)
  .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
```

and `_computeGapLeaderBrake` is invoked fresh each step at
[racePlanner.js:1021](../../client/src/modules/racePlanner.js#L1021). **The selection is therefore a
pure function of live `t` on the current step** — it cannot be stale.

There is exactly one piece of held state, `_gapBrakeBindingIdx`
([racePlanner.js:635](../../client/src/modules/racePlanner.js#L635)), added by GAP-BRAKE-ARRIVAL-1.
It is read at [racePlanner.js:1257](../../client/src/modules/racePlanner.js#L1257) **only** to choose
between two write paths (restart the ease, or retarget it in flight) for a racer the fresh selection
has *already* chosen, and it is overwritten every step at
[racePlanner.js:1283](../../client/src/modules/racePlanner.js#L1283) from that same step's selection.
It can delay a smooth onset by one step; it cannot make the brake act on the wrong racer.

**So (C) is structurally excluded.** Per the brief, it was measured anyway — the last two blocks each
overturned a claim about this code that had been argued from its design, including one of mine. The
measurement is in Step 3 and agrees.

---

## STEP 2 — FRAME BY FRAME THROUGH THE HAND-OVER

Instrument: `stepRacePhysics` driven directly, one observation per physics step. **Control: 40/40
positions and 40/40 finishing times against `runRace` on both arms.** The reproduced selection was
validated against the mechanism's own `gapsAtFire` — **326 firing steps seen, 326 reported, 0 gap
disagreements**.

| | OFF | ON |
|---|---|---|
| 0.600→finish maximum | **170.3 px** at p=0.783, held by racer **20** (step 2831) | **181.1 px** at p=**1.000**, held by racer **18** (step 3639) |

★ **Leadership passes 20 → 18 at step 3299, progress 0.903, with a gap of 0.1 px.** They were level.
This is an ordinary overtake, not a leader collapsing under the brake.

Only three changes of rank 1 occur inside the window on the ON arm: step 2384 (→17), step 2592
(→20), step 3299 (→18).

### Through the hand-over

| step | p | OFF r1/r2 gap | ON r1/r2 gap | brake selected | commanded | held for him | his advance |
|---|---|---|---|---|---|---|---|
| 3296 | 0.902 | 20/18 4.1 | 20/18 1.3 | 20 | did not fire | 0.949887 | 2.6626e-4 |
| 3297 | 0.902 | 20/18 3.7 | 20/18 0.8 | 20 | did not fire | 0.949887 | 2.6626e-4 |
| 3298 | 0.903 | 20/18 3.2 | 20/18 0.4 | 20 | did not fire | 0.949887 | 2.6626e-4 |
| **3299** | **0.903** | 20/18 2.8 | **18/20 0.1** | **18** | did not fire | 1.000083 | 3.2090e-4 |
| 3300 | 0.903 | 20/18 2.3 | 18/20 0.9 | 18 | did not fire | 1.000083 | 3.2997e-4 |
| 3302 | 0.904 | 20/18 1.4 | 18/20 2.4 | 18 | did not fire | 1.000079 | 3.2997e-4 |
| 3305 | 0.905 | 20/18 0.1 | 18/20 4.7 | 18 | did not fire | 1.000076 | 3.2997e-4 |
| 3307 | 0.905 | 18/20 1.1 | 18/20 6.3 | 18 | did not fire | 1.000054 | 3.2997e-4 |

**The brake's selection switches to 18 on the very step leadership changes** — step 3299, no lag.

### Around the ON maximum

| step | p | OFF r1/r2 gap | ON r1/r2 gap | brake selected | commanded | held for him |
|---|---|---|---|---|---|---|
| 3637 | 0.999 | 18/20 157.8 | 18/20 180.2 | 18 | did not fire | 0.975216 |
| 3638 | 0.999 | 18/20 158.2 | 18/20 180.6 | 18 | did not fire | 0.975216 |
| **3639** | **1.000** | 18/20 158.7 | **18/20 181.1** | 18 | **did not fire** | 0.975216 |
| 3640 | 1.000 | 18/20 159.1 | 18/20 181.6 | 18 | did not fire | 0.975216 |

★ **Racer 18 leads on BOTH arms at the end.** The OFF arm has him 158.7 px clear at the same step.
The "change of holder" the sweep reported is about which racer holds the *maximum*, not about who
leads: on the OFF arm racer 20's mid-race peak of 170.3 px was the biggest figure in the race; on the
ON arm that peak was successfully suppressed, so 18's late lead became the maximum instead.

---

## STEP 3 — THE THREE CANDIDATES, ANSWERED WITH NUMBERS

### (C) — the latch: **NO**

| | |
|---|---|
| firing steps in the race (N) | **326** |
| steps where the racer pulled was not the pre-step rank 1 | **0** |
| after the hand-over (N = 341 steps before the first finish) — selected 18 | **341** |
| — selected 20 | **0** |
| — selected anyone else | **0** |
| — actually pulled | **0** |

The brake follows the change of leadership immediately and completely. There is no latch.

### (A) — too weak: **NOT APPLICABLE**

**The brake never pulled on racer 18 on a single step.** It cannot have been too weak; it never
acted. Nothing reached the 0.85 floor for him because nothing was commanded.

### (B) — his gap was never big enough while the brake could act: **THIS IS THE ANSWER**

Racer 18 led on **341 steps** in [0.600, finish]; **165 of them inside the window** (p ≤ 0.95).

| his gap while leading, inside the window (N = 165 steps) | |
|---|---|
| min | 0.1 px |
| median | 57.3 px |
| **maximum** | **95.8 px** |
| the allowance | **124 px** |
| shortfall | **28.2 px** |
| steps over the allowance | **0** |

He led in-window from p=0.903 (step 3299) to p=0.950 (step 3463) — the window end cut him off. **His
gap first exceeded 124 px at step 3521, progress 0.966 — past the window end.** He then led for
**176 more steps** outside the window with a gap running **96.3 → 181.1 px**, where the brake has no
authority at all.

★ **The bite threshold is NOT what kept it silent here, and the distinction matters.** The previous
block established that the brake only binds once its command falls below the servo's own, which for a
leader one rank ahead of his drawn place needs a gap above 124 × (1 + 0.05/0.15) = **165.3 px**. That
never became relevant: his in-window gap never even reached the **124 px allowance**, let alone 165.
The brake was silent at the earlier of the two gates.

### Which dominates

**(B), alone.** (C) is 0 of 326 and (A) is 0 of 341. There is nothing to apportion.

---

## WHY THE ON LEAD IS BIGGER — and it is the ex-leader, not the new one

At the ON maximum (step 3639, p=1.000), racer 18 leads racer 20 by **181.1 px** on the ON arm and
**158.7 px** on the OFF arm — a difference of **22.4 px**. Decomposed against the OFF arm at the same
step:

| racer | displacement ON vs OFF |
|---|---|
| **20** (the one the brake pulled) | **−21.6 world px** — he is behind where he was |
| **18** (the new leader) | **+0.9 world px** — essentially where he was |

★ **The wider lead is almost entirely racer 20 having been slowed, not racer 18 having sped up.** The
brake did its job on 20 — it pulled him for 326 steps — and the arithmetic consequence is that the
racer who then passed him holds a proportionally larger margin over him. That margin is measured
where the brake cannot reach it.

---

## STEP 4 — IS IT A PATTERN

Counted across GAP-BRAKE-ARRIVAL-1's 300 race pairs (the post-fix sweep), by whether the
0.600→finish maximum is held by a different racer on the two arms:

| track | pairs | maximum held by a DIFFERENT racer | of those, rose | fell |
|---|---|---|---|---|
| city-circuit | 30 | 0 | 0 | 0 |
| dirt-oval | 30 | 0 | 0 | 0 |
| garden-path | 30 | 0 | 0 | 0 |
| ice-track | 30 | 0 | 0 | 0 |
| luger-hill | 30 | 0 | 0 | 0 |
| mountainstreet | 30 | 0 | 0 | 0 |
| river-run | 30 | 0 | 0 | 0 |
| searound | 30 | 0 | 0 | 0 |
| seatrack | 30 | 0 | 0 | 0 |
| **space-sprint** | 30 | **1** | **1** | 0 |

**1 of 300 race pairs (0.3%).** The only one is space-sprint seed 2:
170.3 → 181.6 px, holder 20 → 18, peak progress 0.783 → 1.000, brake fired 326 frames.

**This is a single case, not a pattern.** It is also, on the numbers above, not really a hand-over in
the sense the word implies: the same racer leads at the end on both arms, and what changed is which
figure in the race happens to be the largest.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **The two instruments still sample differently**, as recorded last block: the step instrument reads
  a pre-step gap on every physics step and gives **181.1 px**; the sweep reads a post-step gap on
  render frames ([raceDriver.mjs:565-569](../../scripts/lib/raceDriver.mjs#L565-L569) can step
  physics twice per render frame) and gives **181.6 px**. Both are in this report, each labelled with
  the instrument that produced it. Unifying them would break comparability with the reports already
  written.
- **The working tree's three uncommitted eye-test lines** are still in place and the three services
  from the previous block are still serving that build. Untouched, and worked around rather than
  reverted.
- The standing items from earlier blocks are unchanged: the dead front leash, `raceCore.js:679-683`
  omitting `governorMult` from the diagnostic `vt`, the "SIM-ONLY" and "default OFF" stale comments,
  `docs/FORCE-MAP.md`'s four stale windows, and `sim-fairness.mjs` being unable to exercise the brake.

**No repair.** The cause is named with its address — the window end at 0.95, against a gap that
crossed the allowance at progress 0.966 — and nothing was changed.
